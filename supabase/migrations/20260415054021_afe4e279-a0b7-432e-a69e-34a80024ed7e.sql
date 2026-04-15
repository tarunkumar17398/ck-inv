
-- Create subcategory_images table
CREATE TABLE public.subcategory_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Default',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcategory_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view subcategory_images"
ON public.subcategory_images FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert subcategory_images"
ON public.subcategory_images FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subcategory_images"
ON public.subcategory_images FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subcategory_images"
ON public.subcategory_images FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_subcategory_images_subcategory_id ON public.subcategory_images(subcategory_id);

-- Migrate existing images from subcategories table
INSERT INTO public.subcategory_images (subcategory_id, image_url, label, sort_order)
SELECT id, image_url, 'Default', 0
FROM public.subcategories
WHERE image_url IS NOT NULL AND image_url != '';
