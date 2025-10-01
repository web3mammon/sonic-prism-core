-- Update the default role for new users to be 'client'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'client';

-- Update the handle_new_user function to set clients as default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'client'  -- Changed from 'team_member' to 'client'
  );
  RETURN NEW;
END;
$$;