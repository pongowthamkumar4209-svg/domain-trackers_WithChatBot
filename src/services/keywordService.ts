import keyword_extractor from 'keyword-extractor';

// Pattern to match bug/defect IDs (e.g., BUG-123, DEFECT-456, DEF123, BUG_100, #12345)
const BUG_ID_PATTERN = /\b(?:BUG|DEFECT|DEF|ISSUE|TICKET|INC|CR|SR|PRB)[-_]?\d+\b|#\d{4,}/gi;

// Extract bug IDs from text
function extractBugIds(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  const matches = text.match(BUG_ID_PATTERN);
  return matches ? [...new Set(matches.map(id => id.toUpperCase()))] : [];
}

// Extract keywords only from scenario_steps field
export function extractKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  try {
    const keywords = keyword_extractor.extract(text, {
      language: 'english',
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
    });
    
    // Filter out very short words and limit to meaningful keywords
    return keywords
      .filter(kw => kw.length >= 3)
      .slice(0, 20);
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return [];
  }
}

// Extract keywords from a clarification row (only from scenario_steps)
export function extractKeywordsFromRow(row: Partial<import('@/types/clarification').Clarification>): string {
  const text = row.scenario_steps || '';
  
  // Extract bug IDs first
  const bugIds = extractBugIds(text);
  
  // Extract regular keywords
  const keywords = extractKeywords(text);
  
  // Combine bug IDs and keywords, remove duplicates
  const allKeywords = [...bugIds, ...keywords];
  const uniqueKeywords = [...new Set(allKeywords)];
  
  return uniqueKeywords.join(', ');
}
