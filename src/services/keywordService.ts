import keyword_extractor from 'keyword-extractor';

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
  
  const keywords = extractKeywords(text);
  
  // Remove duplicates and return comma-separated
  const uniqueKeywords = [...new Set(keywords)];
  return uniqueKeywords.join(', ');
}
