-- Phase 1: Data Model Updates for CN Clarification Portal

-- 1. Create enum for user roles (for future RBAC)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table for RBAC
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 6. RLS policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 7. Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Also assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Rename teater to tester column
ALTER TABLE public.clarifications RENAME COLUMN teater TO tester;

-- 9. Add new columns to clarifications
ALTER TABLE public.clarifications
  ADD COLUMN IF NOT EXISTS drop_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS legacy_fields JSONB,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 10. Migrate Status field: merge reason, open, status into single status with proper values
-- Store original values in legacy_fields first
UPDATE public.clarifications
SET legacy_fields = jsonb_build_object(
  'original_status', status,
  'original_open', open,
  'original_reason', reason
)
WHERE legacy_fields IS NULL;

-- Normalize status values based on the merge rules
-- If open column indicates 'open from offshore' or similar, set to 'Open from Offshore'
-- If open column says 'closed', set to 'Closed'
-- Otherwise if open column says 'open', set to 'Open'
UPDATE public.clarifications
SET status = CASE
  WHEN lower(trim(open)) LIKE '%offshore%' THEN 'Open from Offshore'
  WHEN lower(trim(open)) = 'closed' THEN 'Closed'
  WHEN lower(trim(open)) = 'open' OR lower(trim(status)) = 'open' THEN 'Open'
  WHEN lower(trim(status)) = 'closed' THEN 'Closed'
  ELSE 'Closed'
END;

-- 11. Normalize priority to P1/P2 only
UPDATE public.clarifications
SET priority = CASE
  WHEN lower(trim(priority)) IN ('high', 'p1', '1', 'critical', 'urgent') THEN 'P1'
  WHEN lower(trim(priority)) IN ('medium', 'p2', '2', 'normal', 'low', 'p3', 'p4') THEN 'P2'
  WHEN priority = '' THEN ''
  ELSE 'P2'
END
WHERE priority != '';

-- 12. Create index for faster status/priority filtering
CREATE INDEX IF NOT EXISTS idx_clarifications_status ON public.clarifications(status);
CREATE INDEX IF NOT EXISTS idx_clarifications_priority ON public.clarifications(priority);
CREATE INDEX IF NOT EXISTS idx_clarifications_drop_name ON public.clarifications(drop_name);

-- 13. Create app_settings table for RBAC toggle
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Insert default RBAC setting (OFF by default)
INSERT INTO public.app_settings (key, value) 
VALUES ('rbac_enabled', '{"enabled": false}'::jsonb);

-- RLS for app_settings
CREATE POLICY "Anyone can read settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can update settings"
ON public.app_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 14. Create audit_log table for tracking changes
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log"
ON public.audit_log FOR INSERT
WITH CHECK (true);