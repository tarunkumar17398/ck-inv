

# Panchaloha Catalog with Image Upload (Updated)

## What You Get

1. **Image upload on each subcategory card** -- upload a photo of each idol, displayed directly on the card
2. **Catalog Generator page** -- configure and preview a printable product catalog
3. **Available quantity shown next to each product name** in the catalog configuration table, e.g. "Nataraja (12)" so you know current stock before adding to catalog

## Catalog Features
- Toggle each product on/off (exclude from catalog)
- **Product name shows available qty in brackets** -- e.g. "Nataraja (12)", "Lakshmi (3)"
- Show/hide price column via toggle
- Selling price = cost price × multiplier (you enter the multiplier, e.g. 1.9, 2.0, 2.5)
- Editable cost price per item inline before generating
- Height field displayed for each product
- Clean printable layout with product image, name, height, and optional price

## Database Changes

1. `ALTER TABLE public.subcategories ADD COLUMN image_url text NULL;`
2. `ALTER TABLE public.subcategories ADD COLUMN height text NULL;`
3. Create storage bucket `subcategory-images` for idol photos

## Code Changes

### Step 1: SubcategoryManagement.tsx -- Image Upload & Height

- Add image upload button on each card; upload to `subcategory-images` bucket, save URL to `image_url`
- Display image thumbnail on card if available
- Add "Height" input in Add/Edit subcategory dialogs, saved to `height` column

### Step 2: PanchalohaCatalog.tsx -- New Page

Configuration table columns:
- **Toggle** (on/off for catalog inclusion)
- **Image** thumbnail
- **Name (Available Qty)** -- e.g. "Nataraja (12)" -- qty comes from the same piece count logic used on the subcategory page
- **Height**
- **Cost Price** (editable inline)
- **Selling Price** (auto-calculated = cost price × multiplier)

Global controls:
- Multiplier input (default 2.0)
- Show/hide prices toggle

Print view:
- Grid of product cards (2-3 per row) with image, name, height, and optionally selling price
- Available qty is shown only in the config table, NOT in the printed catalog

### Step 3: Route & Navigation

- Add `/panchaloha-catalog` route in `App.tsx`
- Add "Create Catalog" button on the subcategories page header

```text
Catalog Config Table:
┌────┬───────┬──────────────────┬────────┬───────┬──────────┐
│ ✓  │ Image │ Name (Avail Qty) │ Height │ Cost  │ Sell     │
├────┼───────┼──────────────────┼────────┼───────┼──────────┤
│ [✓]│ 📷    │ Nataraja (12)    │ 6 inch │ ₹800  │ ₹1,600   │
│ [✓]│ 📷    │ Lakshmi (3)      │ 4 inch │ ₹900  │ ₹1,800   │
│ [ ]│ 📷    │ Hanuman (0)      │ 8 inch │ ₹700  │ ₹1,400   │
└────┴───────┴──────────────────┴────────┴───────┴──────────┘
         Multiplier: [2.0x]    Show Prices: [✓]
                    [Generate Catalog]
```

No changes to existing pricing logic or piece management.

