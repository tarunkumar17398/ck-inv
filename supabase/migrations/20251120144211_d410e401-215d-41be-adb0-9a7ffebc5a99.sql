-- Create subcategories table (only for Panchaloha Idols category)
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  subcategory_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, subcategory_name)
);

-- Create item_pieces table for individual pieces under subcategories
CREATE TABLE public.item_pieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  piece_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_sold TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_pieces ENABLE ROW LEVEL SECURITY;

-- Create policies for subcategories
CREATE POLICY "Admin can view subcategories" 
ON public.subcategories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can insert subcategories" 
ON public.subcategories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update subcategories" 
ON public.subcategories 
FOR UPDATE 
USING (true);

CREATE POLICY "Admin can delete subcategories" 
ON public.subcategories 
FOR DELETE 
USING (true);

-- Create policies for item_pieces
CREATE POLICY "Admin can view item_pieces" 
ON public.item_pieces 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can insert item_pieces" 
ON public.item_pieces 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update item_pieces" 
ON public.item_pieces 
FOR UPDATE 
USING (true);

CREATE POLICY "Admin can delete item_pieces" 
ON public.item_pieces 
FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX idx_item_pieces_subcategory_id ON public.item_pieces(subcategory_id);
CREATE INDEX idx_item_pieces_status ON public.item_pieces(status);