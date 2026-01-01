-- Fix item code generation to also consider piece codes (item_pieces) for categories that use subcategories.
-- This prevents duplicate codes for Panchaloha Idols and keeps sequencing consistent.

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
  v_code_suffix TEXT;
  v_rows_updated INT;
BEGIN
  -- Get category prefix
  SELECT prefix INTO v_prefix
  FROM categories
  WHERE id = p_category_id;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Unknown category_id: %', p_category_id;
  END IF;

  -- Find the highest code across:
  -- 1) items.item_code for this category
  -- 2) item_pieces.piece_code that belongs to this category via subcategories
  SELECT code
  INTO v_highest_code
  FROM (
    SELECT i.item_code AS code
    FROM items i
    WHERE i.category_id = p_category_id

    UNION ALL

    SELECT ip.piece_code AS code
    FROM item_pieces ip
    JOIN subcategories s ON s.id = ip.subcategory_id
    WHERE s.category_id = p_category_id
  ) t
  ORDER BY code DESC
  LIMIT 1;

  -- If no codes exist, start from 0001
  IF v_highest_code IS NULL THEN
    v_current_number := 1;
    v_current_letter := NULL;
  ELSE
    -- Parse highest code to extract number and letter
    v_code_suffix := SUBSTRING(v_highest_code FROM LENGTH('CK' || v_prefix) + 1);

    IF v_code_suffix ~ '^[A-Z]' THEN
      v_current_letter := SUBSTRING(v_code_suffix FROM 1 FOR 1);
      v_current_number := CAST(SUBSTRING(v_code_suffix FROM 2) AS INT) + 1;
    ELSE
      v_current_letter := NULL;
      v_current_number := CAST(v_code_suffix AS INT) + 1;
    END IF;

    -- Handle rollover
    IF v_current_letter IS NULL AND v_current_number > 9999 THEN
      v_current_letter := 'A';
      v_current_number := 1;
    ELSIF v_current_letter IS NOT NULL AND v_current_number > 999 THEN
      v_current_letter := CHR(ASCII(v_current_letter) + 1);
      v_current_number := 1;
    END IF;
  END IF;

  -- Generate the new code
  IF v_current_letter IS NULL THEN
    v_new_code := 'CK' || v_prefix || LPAD(v_current_number::TEXT, 4, '0');
  ELSE
    v_new_code := 'CK' || v_prefix || v_current_letter || LPAD(v_current_number::TEXT, 3, '0');
  END IF;

  -- Update counter table for reference/tracking
  UPDATE item_code_counters
  SET current_number = v_current_number,
      current_letter = v_current_letter
  WHERE category_id = p_category_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- If there's no counter row yet, create it (covers older categories)
  IF v_rows_updated = 0 THEN
    INSERT INTO item_code_counters (category_id, current_number, current_letter)
    VALUES (p_category_id, v_current_number, v_current_letter);
  END IF;

  RETURN v_new_code;
END;
$function$;