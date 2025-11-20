-- Add Panchaloha Idols category
INSERT INTO public.categories (name, prefix)
VALUES ('Panchaloha Idols', 'PI');

-- Create item_code_counter for Panchaloha Idols category
INSERT INTO public.item_code_counters (category_id, current_number, current_letter)
SELECT id, 1, NULL FROM public.categories WHERE name = 'Panchaloha Idols';