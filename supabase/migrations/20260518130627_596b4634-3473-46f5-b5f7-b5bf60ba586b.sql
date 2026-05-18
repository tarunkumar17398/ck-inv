ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS extra_charges_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_charges_label text,
ADD COLUMN IF NOT EXISTS extra_charges_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'amount',
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS gst_percentage numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS gst_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_charges_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS store_snapshot jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

NOTIFY pgrst, 'reload schema';