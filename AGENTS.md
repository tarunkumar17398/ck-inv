# Architecture rules

- Keep rate-revision calculations in pure functions under `src/lib` and keep the rate-revision and rate-sticker workflows in separate protected pages, so pricing rules can be tested independently and barcode printing remains unchanged.
- Keep shared list-ordering rules in a pure `src/lib` helper so screens use consistent, independently testable sorts.