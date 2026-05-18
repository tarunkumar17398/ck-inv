CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_enabled boolean NOT NULL DEFAULT false,
  discount_type text NOT NULL DEFAULT 'amount',
  discount_value numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  extra_enabled boolean NOT NULL DEFAULT false,
  extra_label text,
  extra_amount numeric NOT NULL DEFAULT 0,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read estimates"   ON public.estimates FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert estimates" ON public.estimates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update estimates" ON public.estimates FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete estimates" ON public.estimates FOR DELETE TO anon USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS estimates_set_updated_at ON public.estimates;
CREATE TRIGGER estimates_set_updated_at
BEFORE UPDATE ON public.estimates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();