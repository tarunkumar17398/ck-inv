
# Plan: Standardize Print Queue Format Across All Pages

## Problem Identified
The print queue in the Inventory page uses a **completely different label format** compared to the Barcode Print page and Add Item "Print after adding" feature:

| Feature | Label Size | Layout | Barcode |
|---------|-----------|--------|---------|
| Barcode Print Page | 110mm x 28mm | Horizontal | Right side, horizontal |
| Add Item + Print | 110mm x 28mm | Horizontal | Right side, horizontal |
| Inventory Print Queue | 55mm x 30mm | Vertical | Left side, rotated vertical |

## Solution
Update the Inventory page print queue to use the **same 110mm x 28mm horizontal format** used by Barcode Print and Add Item pages.

---

## Files to Modify

### `src/pages/Inventory.tsx`

**Changes to the `printAllLabels` function (lines 320-482):**

1. **Update page size** from `55mm 30mm` to `110mm 28mm`

2. **Update label CSS structure** to match BarcodePrint.tsx:
   - Remove vertical barcode rotation
   - Add "O" logo element
   - Add "S.No: {itemCode}" at top
   - Reposition particulars to left side (48mm width)
   - Add price and size fields below particulars
   - Move barcode to right side (horizontal, not rotated)
   - Position weight below barcode

3. **Update barcode generation** to horizontal format:
   - Remove `rotate: "L"` parameter
   - Match dimensions from BarcodePrint (height: 12, includetext: true)

---

## Technical Details

### Current Inventory Print Queue Format (to be replaced):
```css
@page { size: 55mm 30mm; }
.label { width: 55mm; height: 30mm; }
/* Rotated barcode on left, text on right */
```

### New Format (matching BarcodePrint.tsx):
```css
@page { size: 110mm 28mm; }
.label-page { width: 110mm; height: 28mm; }
/* O logo, S.No at top, barcode horizontal on right */
```

### Label Layout Elements (matching exact positions from BarcodePrint.tsx):
- **O logo**: left: 6.9mm, top: 6mm
- **S.No**: left: 12mm, top: -1mm
- **Particulars**: left: 11mm, top: 4mm, width: 48mm
- **Price**: left: 12mm, top: 12mm
- **Size**: left: 38mm, top: 12mm  
- **Barcode**: left: 62mm, top: -1mm, width: 38mm, height: 16mm (horizontal)
- **Weight**: left: 62mm, top: 13mm, centered

---

## Expected Result
After this change, labels printed from:
- Barcode Print page
- Add Item "Print after adding" 
- Inventory page Print Queue

Will all produce **identical label formats** (110mm x 28mm horizontal labels with consistent element positioning).
