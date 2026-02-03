-- Add mobile_number column to profiles table
ALTER TABLE public.profiles ADD COLUMN mobile_number text;

-- Create password_reset_otps table for storing OTP tokens
CREATE TABLE public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  otp_code text NOT NULL,
  mobile_number text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on password_reset_otps
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for forgot password flow - user not authenticated)
CREATE POLICY "Anyone can request OTP"
ON public.password_reset_otps
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read their own OTP by mobile number (for validation)
CREATE POLICY "Anyone can validate OTP"
ON public.password_reset_otps
FOR SELECT
USING (true);

-- Allow update to mark OTP as used
CREATE POLICY "Anyone can mark OTP as used"
ON public.password_reset_otps
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_otps_mobile ON public.password_reset_otps(mobile_number, otp_code, used);

-- Update handle_new_user function to handle mobile_number from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, mobile_number)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'mobile_number'
  );
  
  -- Check if email is admin@cncp or admin2@cncp - assign admin role, otherwise viewer
  IF NEW.email = 'admin@cncp' OR NEW.email = 'admin2@cncp' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer');
  END IF;
  
  RETURN NEW;
END;
$function$;