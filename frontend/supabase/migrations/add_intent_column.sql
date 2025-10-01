-- Add intent column to call_sessions table for SMB categorization
ALTER TABLE public.call_sessions
ADD COLUMN intent TEXT DEFAULT 'General Inquiry' CHECK (intent IN (
  'Emergency Service',
  'Appointment Booking',
  'Quote Request',
  'General Inquiry',
  'Complaint',
  'Follow-up',
  'Cancellation'
));

-- Create index for better performance
CREATE INDEX idx_call_sessions_intent ON public.call_sessions(intent);