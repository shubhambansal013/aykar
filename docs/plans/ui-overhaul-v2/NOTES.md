# Notes

Running log for future sessions working on this plan. Append entries as you
go during execution — don't wait until the end of a session. Keep entries
short. Newest at the bottom.

Suggested entry format:

```
## Phase 1 — 2026-07-30
- Extracted LineRow + SectionTitle from IncomeDetails.tsx and TaxComputation.tsx into shared `src/app/components/LineRow.tsx`. Combined props (IncomeDetails lacked `isNegative`; TaxComputation had it). All 293 tests passed.
- Extracted ChatPanel from page.tsx (both desktop and mobile variants, ~260 lines saved). Desktop variant includes model selector, sendOnlyRawData checkbox, context file badges, attachment upload. Mobile variant is simpler (no badges/attachment). All 297 tests passed.
- Extracted DocumentUpload from page.tsx (~268 lines saved). Handles compact status bar + full upload grid with 4 document slots. All 301 tests passed.
- page.tsx reduced from ~1944 to ~1424 lines (520-line reduction, exceeding 400-line target).
- Cleaned up unused imports: SmartToyIcon, SendIcon, CodeIcon, AttachFileIcon, InputAdornment, FormControl, Select, MenuItem, FormControlLabel, Checkbox, CloudUploadIcon, AssistantMessage.
- 301 tests pass, build passes.
```

---
