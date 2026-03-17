

# Price Update for Panchaloha Subcategories

## What It Does
Adds a **"Price Update"** button on the Panchaloha subcategories page that opens a dialog listing all subcategory (idol) names with their current `default_price`. You can edit any price inline, and when saved, it updates:
1. The `default_price` on the `subcategories` table for that idol
2. The `cost_price` on **all** `item_pieces` belonging to that subcategory -- so every piece reflects the new price

## How It Will Work
- Click **"Price Update"** button (next to Low Stock / Download List)
- A full-screen dialog opens with a table: **Idol Name | Current Price | New Price**
- Each row has an editable input for the new price, pre-filled with the current `default_price`
- Change any prices you want, then click **"Save All"**
- The system updates `subcategories.default_price` and bulk-updates `item_pieces.cost_price` for all pieces under each changed subcategory
- A toast confirms how many subcategories were updated

## Changes

### File: `src/pages/SubcategoryManagement.tsx`

1. **Add `default_price` to the Subcategory interface** and include it in the loaded data
2. **Add `IndianRupee` icon** import from lucide-react
3. **Add state**: `showPriceDialog` (boolean), `priceUpdates` (record of subcategory ID to new price string)
4. **Add "Price Update" button** in the header button row
5. **Add Price Update Dialog** containing:
   - A scrollable table with columns: S.No, Idol Name, Current Price (read-only), New Price (input)
   - "Save All" button that loops through changed prices and:
     - Updates `subcategories.default_price` for each changed subcategory
     - Updates `item_pieces.cost_price` for all pieces under that subcategory
   - Shows a loading state during save
6. **Reload subcategories** after saving to reflect new prices

No database schema changes needed -- `subcategories.default_price` and `item_pieces.cost_price` columns already exist.

