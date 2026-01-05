import keyword_extractor from 'keyword-extractor';

// Fields to extract keywords from
const KEYWORD_FIELDS: (keyof import('@/types/clarification').Clarification)[] = [
  'scenario_steps',
  'offshore_comments',
  'onsite_comments',
  'reason',
];

// Extract keywords from text using keyword-extractor library
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

// Extract keywords from a clarification row
export function extractKeywordsFromRow(row: Partial<import('@/types/clarification').Clarification>): string {
  const allText = KEYWORD_FIELDS
    .map(field => row[field] || '')
    .join(' ');
  
  const keywords = extractKeywords(allText);
  
  // Remove duplicates and return comma-separated
  const uniqueKeywords = [...new Set(keywords)];
  return uniqueKeywords.join(', ');
}
