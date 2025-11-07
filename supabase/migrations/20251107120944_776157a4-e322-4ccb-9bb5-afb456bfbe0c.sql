-- Add RFID EPC column to items table
ALTER TABLE public.items 
ADD COLUMN rfid_epc TEXT;