-- Add cost_price column to items table
ALTER TABLE public.items 
ADD COLUMN cost_price numeric;