-- Create table to store Google Drive OAuth tokens
CREATE TABLE public.google_drive_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage tokens
CREATE POLICY "Admins can view tokens" 
ON public.google_drive_tokens 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert tokens" 
ON public.google_drive_tokens 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tokens" 
ON public.google_drive_tokens 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tokens" 
ON public.google_drive_tokens 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow service role to manage tokens (for edge functions)
CREATE POLICY "Service role can manage tokens"
ON public.google_drive_tokens
FOR ALL
USING (true)
WITH CHECK (true);