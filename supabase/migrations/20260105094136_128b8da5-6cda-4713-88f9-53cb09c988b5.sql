-- Add keywords column to clarifications table
ALTER TABLE public.clarifications ADD COLUMN IF NOT EXISTS keywords text DEFAULT '';

-- Add RLS policy for update on clarifications (needed for manual edit feature)
CREATE POLICY "Allow public update access to clarifications" 
ON public.clarifications 
FOR UPDATE 
USING (true);