CREATE POLICY "anon read items" ON public.items FOR SELECT TO anon USING (true);
CREATE POLICY "anon read categories" ON public.categories FOR SELECT TO anon USING (true);