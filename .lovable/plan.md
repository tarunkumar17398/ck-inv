

# Download Panchaloha Product List

## What It Does
Adds a **"Download List"** button on the Panchaloha Idols Subcategories page that exports a CSV file containing all subcategory names with their available quantity.

## CSV Format
The downloaded file will contain:

```text
S.No, Subcategory Name, Available Qty
1, Nataraja, 12
2, Lakshmi, 3
3, Hanuman, 8
...
```

## Changes

### File: `src/pages/SubcategoryManagement.tsx`

1. **Add a `Download` icon** import from `lucide-react`
2. **Add a `handleDownloadList` function** that:
   - Takes the current `subcategories` array (already has `available_count`)
   - Builds a CSV string with columns: S.No, Subcategory Name, Available Qty
   - Creates a Blob and triggers a browser download as `Panchaloha_Stock_List.csv`
   - Respects the current search filter (only downloads filtered results)
3. **Add a "Download List" button** next to the "Add Subcategory" button in the header area

No database changes needed -- all data is already loaded on the page.

