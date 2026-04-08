

## Add Column Toggle Feature to Export Page

**What**: Add toggle switches for each column in the Export & Backup Data page. When a toggle is OFF, the column header still shows but the cell content becomes empty -- so when copied, the column structure is preserved but data is blank.

**Columns to toggle** (9 total): ITEM CODE, ITEM NAME, SIZE, Weight1, Weight (CKBR format), Sno, Barcode, Price, O

### Implementation

**Single file change**: `src/pages/ExportData.tsx`

1. **Add state** for column visibility -- an object like `{ itemCode: true, itemName: true, size: true, ... }` defaulting all to `true`.

2. **Add toggle UI** below the filter/search bar -- a row of labeled Switch toggles (from `@/components/ui/switch`) for each column. Compact layout using `flex-wrap`.

3. **Update table rendering** -- each `<TableCell>` checks its toggle state. If OFF, render empty string instead of the value. The column and header remain visible.

4. **Update copy/CSV functions** -- `copySelectedToClipboard`, `copyTableToClipboard`, `downloadFilteredAsCSV` all respect the toggles. When a column is toggled OFF, output empty string for that column's data but keep the column position.

