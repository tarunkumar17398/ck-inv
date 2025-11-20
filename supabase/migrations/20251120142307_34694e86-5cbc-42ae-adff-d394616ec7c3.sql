-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false);

-- Create RLS policies for backups bucket
CREATE POLICY "Admin can view backups"
ON storage.objects FOR SELECT
USING (bucket_id = 'backups' AND true);

CREATE POLICY "Admin can upload backups"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'backups' AND true);

CREATE POLICY "Admin can delete backups"
ON storage.objects FOR DELETE
USING (bucket_id = 'backups' AND true);

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;