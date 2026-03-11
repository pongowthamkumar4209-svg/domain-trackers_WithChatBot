export interface Clarification {
  id: string;
  s_no: number | null;
  module: string;
  scenario_steps: string;
  status: string;
  offshore_comments: string;
  onsite_comments: string;
  date: string;
  tester: string;
  offshore_reviewer: string;
  addressed_by: string;
  defect_should_be_raised: string;
  priority: string;
  assigned_to: string;
  drop_name: string;
  keywords: string;
  reason: string;
  open: string;
  created_at?: string;
  updated_at?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  row: Clarification;
  highlights: {
    scenario_steps?: string;
    offshore_comments?: string;
    onsite_comments?: string;
  };
}

export const COLUMN_LABELS: Record<string, string> = {
  s_no: "S.No",
  module: "Module",
  scenario_steps: "Scenario / Steps",
  status: "Status",
  priority: "Priority",
  assigned_to: "Assigned To",
  date: "Date",
  keywords: "Keywords",
  open: "Open",
  offshore_comments: "Offshore Comments",
  onsite_comments: "Onsite Comments",
  reason: "Reason",
  addressed_by: "Addressed By",
  tester: "Tester",
  teater: "Teater",
  offshore_reviewer: "Offshore Reviewer",
  defect_should_be_raised: "Defect Should Be Raised",
  drop_name: "Drop Name",
};

export const STATUS_VALUES = ["Open", "Open from Offshore", "Closed"] as const;
export const PRIORITY_VALUES = ["P1", "P2"] as const;
