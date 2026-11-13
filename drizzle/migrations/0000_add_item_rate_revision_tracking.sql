ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS old_price numeric NULL,
  ADD COLUMN IF NOT EXISTS price_revised_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS rate_label_printed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS items_price_revised_at_idx
  ON public.items (price_revised_at)
  WHERE price_revised_at IS NOT NULL;