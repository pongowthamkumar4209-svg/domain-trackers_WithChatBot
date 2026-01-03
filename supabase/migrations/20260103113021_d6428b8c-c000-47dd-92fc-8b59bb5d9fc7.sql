-- Create clarifications table
CREATE TABLE public.clarifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  s_no INTEGER,
  module TEXT NOT NULL DEFAULT '',
  scenario_steps TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  offshore_comments TEXT NOT NULL DEFAULT '',
  onsite_comments TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  teater TEXT NOT NULL DEFAULT '',
  offshore_reviewer TEXT NOT NULL DEFAULT '',
  open TEXT NOT NULL DEFAULT '',
  addressed_by TEXT NOT NULL DEFAULT '',
  defect_should_be_raised TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  row_hash TEXT NOT NULL UNIQUE,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_upload_id UUID
);

-- Create uploads table
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_rows_in_file INTEGER NOT NULL DEFAULT 0,
  added_count INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for better query performance
CREATE INDEX idx_clarifications_status ON public.clarifications(status);
CREATE INDEX idx_clarifications_priority ON public.clarifications(priority);
CREATE INDEX idx_clarifications_module ON public.clarifications(module);
CREATE INDEX idx_clarifications_date ON public.clarifications(date);
CREATE INDEX idx_clarifications_row_hash ON public.clarifications(row_hash);
CREATE INDEX idx_uploads_uploaded_at ON public.uploads(uploaded_at DESC);

-- Enable RLS but allow public access (no auth required for this app)
ALTER TABLE public.clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since app uses simple login, not Supabase auth)
CREATE POLICY "Allow public read access to clarifications"
ON public.clarifications FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to clarifications"
ON public.clarifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public read access to uploads"
ON public.uploads FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to uploads"
ON public.uploads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete access to clarifications"
ON public.clarifications FOR DELETE
USING (true);

CREATE POLICY "Allow public delete access to uploads"
ON public.uploads FOR DELETE
USING (true);