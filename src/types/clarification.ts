// Clarification data structure matching Excel columns
export interface Clarification {
  id: string;
  s_no: number | null;
  module: string;
  scenario_steps: string; // "Scenario/Steps to be Reproduce"
  status: string;
  offshore_comments: string;
  onsite_comments: string;
  date: string; // ISO format
  teater: string;
  offshore_reviewer: string;
  open: string;
  addressed_by: string;
  defect_should_be_raised: string;
  priority: string;
  assigned_to: string;
  reason: string;
  keywords: string; // Auto-extracted keywords from long text fields
  row_hash: string;
  first_seen_at: string;
  source_upload_id: string;
}

// Column mapping from Excel headers to field names
export const COLUMN_MAPPING: Record<string, keyof Clarification> = {
  'S.no': 's_no',
  'Module': 'module',
  'Scenario/Steps to be Reproduce': 'scenario_steps',
  'Status': 'status',
  'Offshore Comments': 'offshore_comments',
  'Onsite Comments': 'onsite_comments',
  'Date': 'date',
  'teater': 'teater',
  'Offshore Reviewer': 'offshore_reviewer',
  'Open': 'open',
  'Addressed by': 'addressed_by',
  'Defect should be raised': 'defect_should_be_raised',
  'Priority': 'priority',
  'Assigned To': 'assigned_to',
  'Reason': 'reason',
};

// Display labels for table headers
export const COLUMN_LABELS: Record<keyof Omit<Clarification, 'id' | 'row_hash' | 'first_seen_at' | 'source_upload_id'>, string> = {
  s_no: 'S.No',
  module: 'Module',
  scenario_steps: 'Scenario/Steps to be Reproduce',
  status: 'Status',
  offshore_comments: 'Offshore Comments',
  onsite_comments: 'Onsite Comments',
  date: 'Date',
  teater: 'Teater',
  offshore_reviewer: 'Offshore Reviewer',
  open: 'Open',
  addressed_by: 'Addressed by',
  defect_should_be_raised: 'Defect should be raised',
  priority: 'Priority',
  assigned_to: 'Assigned To',
  reason: 'Reason',
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
