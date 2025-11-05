-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create item_code_counters table to track next available code per category
CREATE TABLE public.item_code_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  current_number INT NOT NULL DEFAULT 1,
  current_letter TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id)
);

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT NOT NULL,
  item_name TEXT NOT NULL,
  particulars TEXT,
  size TEXT,
  weight TEXT,
  color_code TEXT,
  price DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold')),
  sold_price DECIMAL(10, 2),
  sold_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table for PIN authentication
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_code_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only access)
CREATE POLICY "Admin can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Admin can delete categories" ON public.categories FOR DELETE USING (true);

CREATE POLICY "Admin can view counters" ON public.item_code_counters FOR SELECT USING (true);
CREATE POLICY "Admin can insert counters" ON public.item_code_counters FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update counters" ON public.item_code_counters FOR UPDATE USING (true);

CREATE POLICY "Admin can view items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Admin can insert items" ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update items" ON public.items FOR UPDATE USING (true);
CREATE POLICY "Admin can delete items" ON public.items FOR DELETE USING (true);

CREATE POLICY "Admin can view admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Admin can insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);

-- Insert default categories
INSERT INTO public.categories (name, prefix) VALUES
  ('Brass', 'BR'),
  ('Iron', 'IR'),
  ('Wood', 'WD'),
  ('Terracotta', 'TP'),
  ('Gift Items', 'GT');

-- Initialize counters for each category
INSERT INTO public.item_code_counters (category_id, current_number, current_letter)
SELECT id, 1, NULL FROM public.categories;

-- Function to generate next item code
CREATE OR REPLACE FUNCTION public.generate_next_item_code(p_category_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_current_number INT;
  v_current_letter TEXT;
  v_new_code TEXT;
BEGIN
  -- Get category prefix
  SELECT prefix INTO v_prefix FROM categories WHERE id = p_category_id;
  
  -- Get and lock current counter
  SELECT current_number, current_letter 
  INTO v_current_number, v_current_letter
  FROM item_code_counters 
  WHERE category_id = p_category_id
  FOR UPDATE;
  
  -- Generate code based on pattern
  IF v_current_letter IS NULL THEN
    v_new_code := 'CK' || v_prefix || LPAD(v_current_number::TEXT, 4, '0');
  ELSE
    v_new_code := 'CK' || v_prefix || v_current_letter || LPAD(v_current_number::TEXT, 3, '0');
  END IF;
  
  -- Update counter for next time
  IF v_current_number >= 999 THEN
    -- Move to next letter series
    IF v_current_letter IS NULL THEN
      v_current_letter := 'A';
    ELSE
      v_current_letter := CHR(ASCII(v_current_letter) + 1);
    END IF;
    v_current_number := 1;
  ELSE
    v_current_number := v_current_number + 1;
  END IF;
  
  UPDATE item_code_counters 
  SET current_number = v_current_number, current_letter = v_current_letter
  WHERE category_id = p_category_id;
  
  RETURN v_new_code;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_items_status ON public.items(status);
CREATE INDEX idx_items_category ON public.items(category_id);
CREATE INDEX idx_items_code ON public.items(item_code);