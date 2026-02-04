-- Allow admins to update any profile (for mobile number editing)
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user roles (for user removal)
-- Note: Admins can already delete roles based on existing policy

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete any profile" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));