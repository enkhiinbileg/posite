-- Add video columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS access_type TEXT;

-- Update RLS if needed (usually payments are private)
