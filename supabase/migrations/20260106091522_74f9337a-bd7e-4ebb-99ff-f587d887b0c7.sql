-- Create bot_search_logs table for audit logging
CREATE TABLE public.bot_search_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    search_term TEXT NOT NULL,
    match_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bot_search_logs
ALTER TABLE public.bot_search_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert their own search logs"
ON public.bot_search_logs
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own logs
CREATE POLICY "Users can read their own search logs"
ON public.bot_search_logs
FOR SELECT
USING (true);

-- Create GIN index for full-text search on clarifications
CREATE INDEX IF NOT EXISTS idx_clarifications_fts ON public.clarifications 
USING GIN (to_tsvector('english', 
    coalesce(module, '') || ' ' || 
    coalesce(scenario_steps, '') || ' ' || 
    coalesce(status, '') || ' ' || 
    coalesce(offshore_comments, '') || ' ' ||
    coalesce(onsite_comments, '') || ' ' ||
    coalesce(keywords, '') || ' ' ||
    coalesce(assigned_to, '') || ' ' ||
    coalesce(reason, '')
));

-- Enable pg_trgm extension for trigram matching (partial text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for partial matching on key fields
CREATE INDEX IF NOT EXISTS idx_clarifications_scenario_trgm 
ON public.clarifications USING GIN (scenario_steps gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clarifications_module_trgm 
ON public.clarifications USING GIN (module gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clarifications_keywords_trgm 
ON public.clarifications USING GIN (keywords gin_trgm_ops);