-- Add cost_price column to item_pieces table
ALTER TABLE public.item_pieces
ADD COLUMN cost_price numeric;