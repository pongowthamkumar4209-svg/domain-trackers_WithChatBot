-- Update the handle_new_user function to assign 'viewer' as default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Check if email is admin@cncp - assign admin role, otherwise viewer
  IF NEW.email = 'admin@cncp' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update RLS policies for clarifications based on roles
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public update access to clarifications" ON public.clarifications;
DROP POLICY IF EXISTS "Allow public insert access to clarifications" ON public.clarifications;
DROP POLICY IF EXISTS "Allow public delete access to clarifications" ON public.clarifications;

-- Create role-based policies for clarifications
-- Admins and Editors can insert
CREATE POLICY "Admins and Editors can insert clarifications"
ON public.clarifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role)
);

-- Admins and Editors can update
CREATE POLICY "Admins and Editors can update clarifications"
ON public.clarifications
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role)
);

-- Only Admins can delete
CREATE POLICY "Only Admins can delete clarifications"
ON public.clarifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update user_roles policies to allow admins to update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));