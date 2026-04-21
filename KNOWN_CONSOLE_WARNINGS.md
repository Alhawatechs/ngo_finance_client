# Known harmless console warnings

You can ignore these. They are not from this app and cannot be fixed in this repo.

## “Define @import rules at the top” (one-google-bar)

- **Message:** *An @import rule was ignored because it wasn't defined at the top of the stylesheet…*
- **Source:** `one-google-bar?paramsencoded=...`

**Cause:** Google’s “One Google Bar” stylesheet is injected by the browser or an extension (e.g. when signed into Google). We do not load it; our CSS in `src/app/globals.css` has no invalid `@import`.

**Action:** Ignore. To hide it in Chrome/Edge: open Console → filter box, type `-one-google-bar` or add a filter to exclude messages containing `@import` / `one-google-bar`.
