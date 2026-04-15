
CREATE TABLE public.saved_catalogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view saved_catalogs" ON public.saved_catalogs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert saved_catalogs" ON public.saved_catalogs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update saved_catalogs" ON public.saved_catalogs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete saved_catalogs" ON public.saved_catalogs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
