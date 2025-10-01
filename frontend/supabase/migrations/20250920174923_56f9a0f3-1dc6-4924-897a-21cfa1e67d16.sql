-- Add additional business fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN business_hours TEXT,
ADD COLUMN business_address TEXT,
ADD COLUMN services_offered TEXT,
ADD COLUMN service_area TEXT,
ADD COLUMN emergency_fee DECIMAL(10,2);