-- Add business-related fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN business_name TEXT,
ADD COLUMN business_type TEXT,
ADD COLUMN service_fee DECIMAL(10,2),
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN phone_number TEXT;

-- Add constraint for business_type (make it unchangeable after first set)
CREATE OR REPLACE FUNCTION prevent_business_type_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow setting business_type if it's currently NULL
  IF OLD.business_type IS NOT NULL AND OLD.business_type != NEW.business_type THEN
    RAISE EXCEPTION 'Business type cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent business_type changes
CREATE TRIGGER prevent_business_type_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_business_type_change();