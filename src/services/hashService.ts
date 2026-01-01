// Normalize text for hashing: trim, collapse whitespace, lowercase
export function normalize(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Generate SHA256 hash for deduplication
export async function generateRowHash(row: {
  s_no?: number | null;
  module?: string;
  scenario_steps?: string;
  status?: string;
  date?: string;
  assigned_to?: string;
  priority?: string;
  reason?: string;
}): Promise<string> {
  const parts = [
    normalize(row.s_no),
    normalize(row.module),
    normalize(row.scenario_steps),
    normalize(row.status),
    normalize(row.date),
    normalize(row.assigned_to),
    normalize(row.priority),
    normalize(row.reason),
  ];
  
  const text = parts.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
