# Rate Revision and Stickers

## Build
- Add the three nullable rate-revision timestamps/prices to `items` and a partial index for revised rows, then regenerate the app's database types.
- Implement and test pure pricing helpers: infer legacy kg versus gram weights, skip unsafe/above-threshold prices, calculate capped and rounded prices, and describe each result.
- Add `/rate-revision` for category-scoped, paginated in-stock review; editable settings persist in local storage. Include summaries, searchable/filterable rows, CSV preview download, confirmed batch updates with progress, and undo for the latest batch.
- Add `/rate-sticker-print` for pending revised stickers or all in-stock items, two products per 110 × 28 mm label, with the specified rate-side layout, preview, print, and confirmed printed marking.
- Register both protected pages and add the two Dashboard shortcuts beside Barcode Printer. Leave `BarcodePrint.tsx` and existing pages unchanged beyond route/link wiring.

## Technical details
- Default the selected category by the Brass (`BR`) prefix and fetch items in `.range()` batches of 1,000.
- Share the existing `formatPriceLabel` and `formatSizeWithInches` utilities for stickers; keep barcodes unchanged.
- Apply price changes in chunks of 20 and print timestamps in chunks of 200; report partial failures and progress rather than hiding them.
- Verify helper rules with focused tests, inspect the latest preview build log, and exercise the new screens in the browser where the signed-in preview allows.
