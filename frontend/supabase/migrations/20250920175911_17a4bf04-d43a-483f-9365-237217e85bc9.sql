-- Update the handle_new_user function to set onboarding_completed to false by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'client',
    false  -- Ensure new users start with onboarding_completed as false
  );
  RETURN NEW;
END;
$$;