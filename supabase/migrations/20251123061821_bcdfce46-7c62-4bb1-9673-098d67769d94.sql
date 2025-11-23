-- Drop and recreate the item code generation function to check all items
CREATE OR REPLACE FUNCTION public.generate_next_item_code(p_category_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix TEXT;
  v_highest_code TEXT;
  v_current_number INT;
  v_current_letter TEXT;
  v_new_code TEXT;
BEGIN
  -- Get category prefix
  SELECT prefix INTO v_prefix FROM categories WHERE id = p_category_id;
  
  -- Find the highest item code from ALL items (in_stock and sold)
  SELECT item_code INTO v_highest_code
  FROM items
  WHERE category_id = p_category_id
  ORDER BY item_code DESC
  LIMIT 1;
  
  -- If no items exist, start from 0001
  IF v_highest_code IS NULL THEN
    v_current_number := 1;
    v_current_letter := NULL;
  ELSE
    -- Parse the highest code to extract number and letter
    -- Remove 'CK' prefix and category prefix to get the number part
    DECLARE
      v_code_suffix TEXT;
    BEGIN
      v_code_suffix := SUBSTRING(v_highest_code FROM LENGTH('CK' || v_prefix) + 1);
      
      -- Check if there's a letter (e.g., 'A001' or just '0001')
      IF v_code_suffix ~ '^[A-Z]' THEN
        v_current_letter := SUBSTRING(v_code_suffix FROM 1 FOR 1);
        v_current_number := CAST(SUBSTRING(v_code_suffix FROM 2) AS INT) + 1;
      ELSE
        v_current_letter := NULL;
        v_current_number := CAST(v_code_suffix AS INT) + 1;
      END IF;
      
      -- Handle rollover to letter series
      IF v_current_letter IS NULL AND v_current_number > 9999 THEN
        v_current_letter := 'A';
        v_current_number := 1;
      ELSIF v_current_letter IS NOT NULL AND v_current_number > 999 THEN
        v_current_letter := CHR(ASCII(v_current_letter) + 1);
        v_current_number := 1;
      END IF;
    END;
  END IF;
  
  -- Generate the new code
  IF v_current_letter IS NULL THEN
    v_new_code := 'CK' || v_prefix || LPAD(v_current_number::TEXT, 4, '0');
  ELSE
    v_new_code := 'CK' || v_prefix || v_current_letter || LPAD(v_current_number::TEXT, 3, '0');
  END IF;
  
  -- Update counter table for reference (optional, just for tracking)
  UPDATE item_code_counters 
  SET current_number = v_current_number, current_letter = v_current_letter
  WHERE category_id = p_category_id;
  
  RETURN v_new_code;
END;
$function$;