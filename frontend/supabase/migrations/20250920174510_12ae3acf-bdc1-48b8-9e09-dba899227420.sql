-- Fix the function to have proper search_path
CREATE OR REPLACE FUNCTION prevent_business_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow setting business_type if it's currently NULL
  IF OLD.business_type IS NOT NULL AND OLD.business_type != NEW.business_type THEN
    RAISE EXCEPTION 'Business type cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;