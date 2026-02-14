

# Plan: Persistent "Recycle Stock" for Stock Print

## What You Want
Right now, the "Recycle Stock" button only hides sold items temporarily -- when you reload the page, they come back. You want it to work like your old manual process:

1. Print the stock list and use it for months
2. As items sell, they show with a strikethrough but stay on the list
3. Every 3-6 months, click **"Recycle Stock"** to permanently remove all sold items from the printed list
4. Take a fresh printout and use it for the next period
5. Sold items remain in the database for history -- they're just removed from the Stock Print view

## How It Will Work

- A new column `stock_print_hidden` will be added to the items table
- **Normal view**: All items show. Sold items appear with strikethrough styling
- **When you click "Recycle Stock"**: All sold items get marked as `stock_print_hidden = true` in the database. They disappear from Stock Print permanently
- **New items** added after recycling appear normally
- **Items sold after recycling** show with strikethrough until the next recycle

This means your page layout stays consistent between printouts -- no shifting around.

## Technical Details

### 1. Database Migration
Add a boolean column to the `items` table:

```sql
ALTER TABLE public.items 
ADD COLUMN stock_print_hidden boolean DEFAULT false;
```

### 2. File: `src/pages/StockPrint.tsx`

**Query change**: Filter out `stock_print_hidden = true` items instead of using client-side toggle:

```typescript
let query = supabase
  .from("items")
  .select("*, categories(name, prefix)")
  .eq("category_id", selectedCategory)
  .eq("stock_print_hidden", false);  // Never show recycled items
```

**Recycle Stock button**: Instead of toggling a state variable, update the database:

```typescript
const handleRecycle = async () => {
  await supabase
    .from("items")
    .update({ stock_print_hidden: true })
    .eq("status", "sold")
    .eq("category_id", selectedCategory)
    .eq("stock_print_hidden", false);
  
  // Reload the data
  loadStockData();
};
```

**Remove the `showSoldItems` state toggle** -- it's no longer needed. The "Show Sold Items" button will also be removed since recycled items should stay hidden until a fresh list is needed.

**Confirmation dialog** will be updated to clearly warn: "This will permanently remove all sold items from this category's stock print list. This cannot be undone (items remain in the database for records)."

