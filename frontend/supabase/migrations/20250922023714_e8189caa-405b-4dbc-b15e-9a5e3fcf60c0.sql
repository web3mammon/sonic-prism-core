-- Create a trigger function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, onboarding_completed)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'client'::app_role,
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();