
-- Update the handle_new_user function to include admin2@cncp as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
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

-- Also update existing admin2@cncp user to admin if they exist
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'admin2@cncp'
);
