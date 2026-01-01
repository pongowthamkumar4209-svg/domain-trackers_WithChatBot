import Fuse from 'fuse.js';
import { Clarification, SearchResult, SearchResponse } from '@/types/clarification';
import { getClarifications } from './storageService';

// Synonym mappings for normalization
const SYNONYMS: Record<string, string[]> = {
  'milepost': ['mile post', 'mile-post'],
  'authority': ['auth'],
  'signal': ['sig'],
  'conflict': ['conflicts', 'conflicting'],
  'display': ['displayed', 'displaying', 'shows', 'shown'],
};

// Common phrase corrections
const PHRASE_CORRECTIONS: Record<string, string> = {
  'displayed of': 'displayed instead of',
  'authority conflict': 'authority conflicts with',
  'signal request': 'signal request',
};

// Normalize query for better matching
function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim();
  
  // Apply phrase corrections
  for (const [pattern, replacement] of Object.entries(PHRASE_CORRECTIONS)) {
    if (normalized.includes(pattern)) {
      normalized = normalized.replace(pattern, replacement);
    }
  }
  
  return normalized;
}

// Generate suggestions based on query
function generateSuggestions(query: string, results: SearchResult[]): string[] {
  const suggestions: string[] = [];
  const normalized = normalizeQuery(query);
  
  // Check if we can suggest a phrase correction
  for (const [pattern, replacement] of Object.entries(PHRASE_CORRECTIONS)) {
    if (query.toLowerCase().includes(pattern) && pattern !== replacement) {
      suggestions.push(replacement);
    }
  }
  
  // Extract relevant phrases from top results
  if (results.length > 0) {
    const topResult = results[0];
    const words = query.toLowerCase().split(/\s+/);
    
    // Find matching phrases in scenario_steps
    const scenarioLower = topResult.row.scenario_steps.toLowerCase();
    for (const word of words) {
      const idx = scenarioLower.indexOf(word);
      if (idx !== -1) {
        // Extract surrounding context
        const start = Math.max(0, idx - 20);
        const end = Math.min(scenarioLower.length, idx + word.length + 30);
        const context = topResult.row.scenario_steps.slice(start, end).trim();
        if (context && !suggestions.includes(context) && context.length > query.length) {
          suggestions.push(context);
        }
      }
    }
  }
  
  return suggestions.slice(0, 3);
}

// Highlight matching text
function highlightMatches(text: string, query: string): string {
  if (!text || !query) return text;
  
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  let highlighted = text;
  
  for (const word of words) {
    // Escape special regex characters
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  }
  
  return highlighted;
}

// Truncate text around highlights
function truncateWithContext(text: string, query: string, maxLength = 200): string {
  if (!text || text.length <= maxLength) return text;
  
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const textLower = text.toLowerCase();
  
  // Find first occurrence of any query word
  let firstMatchIdx = -1;
  for (const word of words) {
    const idx = textLower.indexOf(word);
    if (idx !== -1 && (firstMatchIdx === -1 || idx < firstMatchIdx)) {
      firstMatchIdx = idx;
    }
  }
  
  if (firstMatchIdx === -1) {
    return text.slice(0, maxLength) + '...';
  }
  
  // Extract context around match
  const start = Math.max(0, firstMatchIdx - 50);
  const end = Math.min(text.length, firstMatchIdx + maxLength - 50);
  
  let truncated = text.slice(start, end);
  if (start > 0) truncated = '...' + truncated;
  if (end < text.length) truncated = truncated + '...';
  
  return truncated;
}

// Perform hybrid search
export async function searchClarifications(
  query: string,
  topK = 20
): Promise<SearchResponse> {
  const startTime = performance.now();
  
  if (!query.trim()) {
    return {
      results: [],
      suggestions: [],
      stats: { fuzzyMs: 0, totalMs: 0 },
    };
  }
  
  const clarifications = await getClarifications();
  const normalizedQuery = normalizeQuery(query);
  
  const fuzzyStartTime = performance.now();
  
  // Configure Fuse.js for fuzzy search
  const fuse = new Fuse(clarifications, {
    keys: [
      { name: 'scenario_steps', weight: 0.4 },
      { name: 'offshore_comments', weight: 0.15 },
      { name: 'onsite_comments', weight: 0.15 },
      { name: 'reason', weight: 0.1 },
      { name: 'module', weight: 0.08 },
      { name: 'status', weight: 0.05 },
      { name: 'priority', weight: 0.04 },
      { name: 'assigned_to', weight: 0.03 },
    ],
    threshold: 0.4, // Allow fuzzy matching
    distance: 200,
    minMatchCharLength: 2,
    includeScore: true,
    ignoreLocation: true,
    useExtendedSearch: true,
  });
  
  // Search with normalized query
  const fuseResults = fuse.search(normalizedQuery, { limit: topK });
  
  const fuzzyMs = performance.now() - fuzzyStartTime;
  
  // Convert to SearchResult format
  const results: SearchResult[] = fuseResults.map(result => {
    const row = result.item;
    const score = 1 - (result.score || 0);
    
    // Generate highlights
    const highlights: Partial<Record<keyof Clarification, string>> = {};
    
    if (row.scenario_steps) {
      const truncated = truncateWithContext(row.scenario_steps, query);
      highlights.scenario_steps = highlightMatches(truncated, query);
    }
    if (row.reason) {
      highlights.reason = highlightMatches(row.reason, query);
    }
    if (row.offshore_comments) {
      const truncated = truncateWithContext(row.offshore_comments, query);
      highlights.offshore_comments = highlightMatches(truncated, query);
    }
    
    return {
      id: row.id,
      score,
      row,
      highlights,
    };
  });
  
  // Generate suggestions
  const suggestions = generateSuggestions(query, results);
  
  const totalMs = performance.now() - startTime;
  
  return {
    results,
    suggestions,
    stats: {
      fuzzyMs: Math.round(fuzzyMs),
      totalMs: Math.round(totalMs),
    },
  };
}
