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

## Phase 2 — 2026-07-30
- **2a**: Changed `showUploadArea` default to `true`, removed `hasUploadedDocs &&` from `isUploadCollapsed` — upload stays open after first doc.
- **2b**: Deleted Taxpayer Summary Card (~180 lines) from page.tsx. Removed unused imports: `Grid`, `CheckCircleIcon`, `computeAllInterest`.
- **2c**: Removed Supplementary Income card from page.tsx. Added compact sub-section inside IncomeDetails (under "Other Incomes") using existing `data.detectedIncomeSources`. No new prop needed.
- **2d**: Reordered left panel: DocumentUpload → ComputationWorksheet → TaxRegimeComparisonCard → ReconciliationTable → Validation/Alerts.
- **2e**: Made ComputationWorksheet always collapsible — removed `collapsible` prop. Identity defaults to collapsed, Income & Tax expanded.
- **2f**: Elevated net result box in TaxComputation: `py: 2, px: 2`, `borderTop: 3`, font `1.1rem`.
- **2g**: Removed chat IconButton from AppBar (only FAB remains). Cleaned unused MUI imports from page.tsx.
- **2h**: Updated 12 tests referencing removed AppBar chat button → FAB's `'open ai chat window'`. Removed `selected-itr-form-badge-summary` assertion. Fixed `getByText` → `getAllByText` for section titles duplicated by Accordion.
- 301 tests pass, build passes, page.tsx reduced from ~1424 to ~1183 lines.
