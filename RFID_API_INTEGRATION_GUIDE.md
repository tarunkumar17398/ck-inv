# RFID API Integration Guide

## API Endpoint
```
https://eucxuuepfsrbgktlqyqx.supabase.co/functions/v1/rfid-export
```

## Response Format
The API returns a JSON object with this structure:
```json
{
  "success": true,
  "count": 1955,
  "data": [
    {
      "ITEM CODE": "CKWD0353",
      "PARTICULARS": "",
      "SIZE": "7\"",
      "Weight": "0",
      "RFID-EPC": ""
    },
    ...
  ]
}
```

## ⚠️ IMPORTANT: Correct Parsing

The API response includes a `success` field, but you should **NOT** check it. Always use `result.data` directly.

### ❌ WRONG - Do NOT use this:
```typescript
const response = await fetch(apiUrl);
const result = await response.json();

// DON'T DO THIS - checking success field is wrong
if (result.success) {
  const items = result.data;
}
```

### ✅ CORRECT - Use this instead:
```typescript
const response = await fetch(apiUrl);
const result = await response.json();

// Always use result.data directly
const items = result.data || [];
console.log("Items loaded:", items.length); // Should show: 1955
```

## Complete Implementation for RFID Scanner App

### File: `src/services/inventoryApi.ts`
```typescript
export interface InventoryItem {
  "ITEM CODE": string;
  "PARTICULARS": string;
  "SIZE": string;
  "Weight": string;
  "RFID-EPC": string;
}

export const fetchInventoryFromAPI = async (): Promise<InventoryItem[]> => {
  try {
    const apiUrl = "https://eucxuuepfsrbgktlqyqx.supabase.co/functions/v1/rfid-export";
    
    console.log("Fetching from CK Inventory API...");
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // CRITICAL: Use result.data directly, don't check result.success
    const items = result.data || [];
    
    console.log(`✓ Successfully fetched ${items.length} items from API`);
    console.log(`API reported count: ${result.count}`);
    
    return items;
  } catch (error) {
    console.error("Error fetching inventory from API:", error);
    throw error;
  }
};
```

### Usage in React Component
```typescript
import { fetchInventoryFromAPI } from "@/services/inventoryApi";
import { useState } from "react";
import { toast } from "sonner";

const ImportInventoryPage = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const handleFetchFromAPI = async () => {
    setLoading(true);
    try {
      const fetchedItems = await fetchInventoryFromAPI();
      setItems(fetchedItems);
      setLastSynced(new Date());
      toast.success(`Synced ${fetchedItems.length} items from CK Inventory`);
    } catch (error) {
      toast.error("Failed to fetch inventory from API");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleFetchFromAPI} disabled={loading}>
        {loading ? "Syncing..." : "Fetch from CK Inventory"}
      </button>
      
      {lastSynced && (
        <p>Last synced: {lastSynced.toLocaleString()}</p>
      )}
      
      <p>Total items: {items.length}</p>
      
      {/* Your table/list display here */}
    </div>
  );
};
```

## Testing the Integration

1. Open your browser's DevTools Console
2. Run the fetch and check the logs:
   ```javascript
   fetch("https://eucxuuepfsrbgktlqyqx.supabase.co/functions/v1/rfid-export")
     .then(r => r.json())
     .then(result => {
       console.log("Count:", result.count);
       console.log("Data length:", result.data.length);
       console.log("First item:", result.data[0]);
     });
   ```

You should see:
- Count: 1955
- Data length: 1955
- First item: Object with ITEM CODE, PARTICULARS, SIZE, Weight, RFID-EPC

## Common Issues

### Issue: Shows "0 items fetched"
**Cause:** Checking `result.success` and using wrong parsing logic
**Solution:** Use `result.data` directly without any conditional checks

### Issue: TypeScript errors about field names
**Cause:** Field names have spaces (e.g., "ITEM CODE")
**Solution:** Use bracket notation: `item["ITEM CODE"]` instead of `item.ITEM_CODE`

## Data Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| ITEM CODE | string | Unique item identifier | "CKWD0353" |
| PARTICULARS | string | Item description (can be empty) | "Wooden Box" |
| SIZE | string | Item dimensions with inch symbol | "12\"x15\"" |
| Weight | string | Weight in grams | "350" |
| RFID-EPC | string | RFID tag identifier (can be empty) | "A7B7000000023303" |

## Categories Included

The API exports items from these categories that are currently in stock:
- BR (Brass)
- IR (Iron)
- TP (Terracotta/Pottery)
- WD (Wood)

Total items: ~1,955 in-stock items
