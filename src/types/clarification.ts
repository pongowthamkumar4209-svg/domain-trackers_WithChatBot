// Clarification data structure matching Excel columns
export interface Clarification {
  id: string;
  s_no: number | null;
  module: string;
  scenario_steps: string; // "Scenario/Steps to be Reproduce"
  status: string; // "Open" | "Open from Offshore" | "Closed"
  offshore_comments: string;
  onsite_comments: string;
  date: string; // ISO format
  tester: string; // Renamed from teater
  offshore_reviewer: string;
  addressed_by: string;
  defect_should_be_raised: string;
  priority: string; // "P1" | "P2"
  assigned_to: string;
  drop_name: string; // New field for additional details
  keywords: string; // Auto-extracted keywords from long text fields
  row_hash: string;
  first_seen_at: string;
  source_upload_id: string;
  // Audit fields
  created_by?: string;
  updated_by?: string;
  updated_at?: string;
  legacy_fields?: Record<string, unknown>; // Stores original reason, open, status values
}

// Status dropdown values
export const STATUS_VALUES = ['Open', 'Open from Offshore', 'Closed'] as const;
export type StatusValue = typeof STATUS_VALUES[number];

// Priority dropdown values
export const PRIORITY_VALUES = ['P1', 'P2'] as const;
export type PriorityValue = typeof PRIORITY_VALUES[number];

// Column mapping from Excel headers to field names
export const COLUMN_MAPPING: Record<string, keyof Clarification> = {
  'S.no': 's_no',
  'Module': 'module',
  'Scenario/Steps to be Reproduce': 'scenario_steps',
  'Status': 'status',
  'Offshore Comments': 'offshore_comments',
  'Onsite Comments': 'onsite_comments',
  'Date': 'date',
  'tester': 'tester',
  'Tester': 'tester',
  'teater': 'tester', // Legacy mapping
  'Offshore Reviewer': 'offshore_reviewer',
  'Addressed by': 'addressed_by',
  'Defect should be raised': 'defect_should_be_raised',
  'Priority': 'priority',
  'Assigned To': 'assigned_to',
  'Drop Name': 'drop_name',
};

// Display labels for table headers
export const COLUMN_LABELS: Record<keyof Omit<Clarification, 'id' | 'row_hash' | 'first_seen_at' | 'source_upload_id' | 'created_by' | 'updated_by' | 'updated_at' | 'legacy_fields'>, string> = {
  s_no: 'S.No',
  module: 'Module',
  scenario_steps: 'Scenario/Steps to be Reproduce',
  status: 'Status',
  offshore_comments: 'Offshore Comments',
  onsite_comments: 'Onsite Comments',
  date: 'Date',
  tester: 'Tester',
  offshore_reviewer: 'Offshore Reviewer',
  addressed_by: 'Addressed by',
  defect_should_be_raised: 'Defect should be raised',
  priority: 'Priority',
  assigned_to: 'Assigned To',
  drop_name: 'Drop Name',
  keywords: 'Keywords',
};

// Upload record
export interface Upload {
  id: string;
  filename: string;
  sheet_name: string;
  uploaded_at: string;
  total_rows_in_file: number;
  added_count: number;
  duplicates_skipped: number;
}

// Search result with highlights
export interface SearchResult {
  id: string;
  score: number;
  row: Clarification;
  highlights: Partial<Record<keyof Clarification, string>>;
}

// Search response
export interface SearchResponse {
  results: SearchResult[];
  suggestions: string[];
  stats: {
    fuzzyMs: number;
    totalMs: number;
  };
}

// Dashboard stats
export interface ClarificationStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byModule: Record<string, number>;
  openCount: number;
  resolvedCount: number;
  recentUploads: Upload[];
}

// Upload result
export interface UploadResult {
  success: boolean;
  upload_id: string;
  added_count: number;
  duplicates_skipped: number;
  total_rows: number;
  error?: string;
  available_sheets?: string[];
}

// Calculate ageing in days for open items
export function calculateAgeing(dateStr: string, status: string): number | null {
  if (!['Open', 'Open from Offshore'].includes(status)) {
    return null;
  }
  if (!dateStr) return null;
  
  try {
    const createdDate = new Date(dateStr);
    if (isNaN(createdDate.getTime())) return null;
    
    const today = new Date();
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return null;
  }
}

// Get ageing badge color class
export function getAgeingBadgeClass(days: number | null): string {
  if (days === null) return '';
  if (days <= 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (days <= 7) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}
