
ALTER TABLE public.subcategories ADD COLUMN image_url text NULL;
ALTER TABLE public.subcategories ADD COLUMN height text NULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('subcategory-images', 'subcategory-images', true);

CREATE POLICY "Admins can upload subcategory images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'subcategory-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update subcategory images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'subcategory-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete subcategory images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'subcategory-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Public can view subcategory images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'subcategory-images');
