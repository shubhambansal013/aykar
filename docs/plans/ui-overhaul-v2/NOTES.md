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

---

## Phase 3 — 2026-07-30

- **3a**: LineRow converted from flexbox to CSS grid (`1fr auto auto`). Value column uses `justifySelf: 'end'` for right-alignment. SourceBadge in third column.
- **3b**: SourceBadge SOURCE_CONFIG all colors changed to `'default'`. All chips now gray outline.
- **3c**: ReconciliationTable STATUS_STYLE changed to all `action.hover` background + `text.secondary`. Mismatch rows use gray left border instead of yellow background.
- **3d**: TaxRegimeComparisonCard — "Optimal" badges inside cards changed to gray outline. Border color logic simplified (selected=primary.main, else=divider). Total tax payable uses `text.primary` instead of `success.main`. Recommendation banner `boxShadow` set to 0.
- **3e**: TaxSlabVisual — NEW_COLORS and OLD_COLORS replaced with primary blue opacity gradients. Arrow marker uses `text.secondary` instead of `error.main`. Section title color removed.
- **3f**: Operator icons (add/subtract) in LineRow changed from green/red to `text.secondary`.
- **3g**: All `mb: 2.5` occurrences changed to `mb: 2` across TaxRegimeComparisonCard, DocumentUpload, page.tsx.
- **3h**: SectionTitle in LineRow changed from colored bottom border (`primary.main`, width 2) to gray divider (`divider`, width 1).
- **3i**: All 301 tests pass, build passes.
