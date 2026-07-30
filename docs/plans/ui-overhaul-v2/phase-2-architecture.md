# Phase 2: Architecture — Remove Redundancy & Restructure Flow

## Objective

Eliminate duplicate data presentation and reorder the left panel into a
logical flow. The biggest change: removing the Taxpayer Summary Card (which
repeats every number already in ComputationWorksheet) and merging the
Supplementary Income Sources card into IncomeDetails. Also fixes the upload
auto-collapse bug.

## Dependencies

- Requires Phase 1 to be `done` (uses shared LineRow, DocumentUpload, ChatPanel)

## Responsibilities

What this phase owns:

1. **Fix upload auto-collapse** — Change `showUploadArea` default from
   `false` to `true` so uploads don't collapse after the first document.
   Remove the auto-collapse logic that triggers on `hasUploadedDocs`.

2. **Delete the Taxpayer Summary Card** from page.tsx (lines 1178-1357).
   Every value it displays is already in ComputationWorksheet →
   TaxComputation section. This eliminates ~180 lines of competing UI.

3. **Merge Supplementary Income Sources** — Move the content of the
   standalone card (page.tsx lines 1145-1176) into IncomeDetails.tsx as a
   sub-section under "Other Incomes". Show it only when supplementary
   incomes exist, with a compact inline presentation instead of a full card.

4. **Reorder left panel sections** — The new order:
   ```
   1. DocumentUpload
   2. ComputationWorksheet
      - TaxpayerIdentity (collapsed by default)
      - IncomeDetails (expanded)
      - TaxComputation (expanded, net result elevated)
   3. TaxRegimeComparisonCard (simplified — Phase 3 handles colors)
   4. ReconciliationTable
   Validation/Alerts (kept as-is at bottom)
   ```
   Note: Taxpayer Summary Card is gone. Supplementary Income is inside
   IncomeDetails. ComputationWorksheet comes before Regime Comparison.

5. **Make ComputationWorksheet collapsible on all sizes** — Currently
   `collapsible={isMobile}`. Change to always collapse with `defaultExpanded`
   controlling each section independently (Identity collapsed, Income
   expanded, Tax expanded).

6. **Elevate Net Result** — The final tax/refund line in TaxComputation
   already has a colored background box. Make it more prominent: increase
   padding, add a subtle top border accent, ensure it's visually distinct
   as the ultimate output of the worksheet.

7. **Simplify AppBar** — Remove the standalone chat toggle button from
   the AppBar. Keep the FAB as the sole chat trigger. This reduces toolbar
   density. Keep dark mode toggle.

8. **Update tests** — Update any tests that:
   - Select the removed Taxpayer Summary Card (testid `selected-itr-form-badge-summary`)
   - Expect the old section order
   - Expect Supplementary Income as a standalone card

What this phase does **not** touch:
- No color palette changes (that's Phase 3)
- No tabular alignment (CSS grid) — that's Phase 3
- No changes to SourceBadge, TaxSlabVisual, ReconciliationTable visuals
- No changes to the DocumentUpload component itself (created in Phase 1)
- No changes to the chat system

## Todos

### 2a. Fix upload auto-collapse
- [ ] In page.tsx, change `useState(false)` for `showUploadArea` to
      `useState(true)`
- [ ] Remove or simplify the auto-collapse logic:
      `const isUploadCollapsed = !showUploadArea;` (was `hasUploadedDocs && !showUploadArea`)
- [ ] The user now must explicitly click "Collapse" to hide the upload area;
      it stays open across multiple document uploads

### 2b. Delete Taxpayer Summary Card
- [ ] Remove lines 1178-1357 from page.tsx (the entire card from
      `{extractedData && extractedDataDomain && (` to its closing brace)
- [ ] Remove any imports that were only used by this card (check carefully)
- [ ] Verify the card's data (GTI, taxable, credits, net result) is still
      visible in TaxComputation component

### 2c. Merge Supplementary Income into IncomeDetails
- [ ] Read page.tsx lines 1145-1176 (Supplementary Income card)
- [ ] Read IncomeDetails.tsx to find the "Other Incomes" section (around lines 168-185)
- [ ] Add a `detectedIncomeSources` prop to IncomeDetails (type:
      `Array<{category: string; amount: number; source: string}>`)
- [ ] Inside IncomeDetails, after the "Other Incomes" section, add a compact
      sub-section for supplementary incomes when present. Use a subtle inset
      style (smaller text, left padding, no card wrapper)
- [ ] Remove the standalone Supplementary Income card from page.tsx
- [ ] Pass `detectedIncomeSources` from page.tsx to IncomeDetails via
      ComputationWorksheet

### 2d. Reorder sections in page.tsx
- [ ] The page.tsx left panel should now have this order:
  ```
  <DocumentUpload ... />
  {extractedData && (
    <>
      <ComputationWorksheet collapsible ... />
      <TaxRegimeComparisonCard ... />
      <ReconciliationTable ... />
      {/* Validation Alerts */}
    </>
  )}
  ```
- [ ] Remove the old `{extractedData && extractedDataDomain && (` wrapper
      that surrounded the deleted Taxpayer Summary Card, ensuring the
      remaining sections still gate on extractedData

### 2e. Universal collapsible
- [ ] In ComputationWorksheet.tsx, remove the `collapsible` prop — make it
      always collapsible
- [ ] Change CollapsibleSection defaultExpanded: Identity false, Income true,
      Tax true
- [ ] Update page.tsx to pass `collapsible` unconditionally (or remove the prop)

### 2f. Elevate Net Result
- [ ] In TaxComputation.tsx, increase the net result box padding (py: 2,
      px: 2 instead of current py: 1, px: 1.5)
- [ ] Add a 3px top border accent in `primary.main`
- [ ] Increase font size slightly for the amount

### 2g. Simplify AppBar
- [ ] Remove the chat IconButton from the AppBar (around lines 833-850 in page.tsx)
- [ ] Remove the Tooltip wrapper around it
- [ ] Keep: dark mode toggle, document inspect button (if any). Keep FAB.

### 2h. Update tests
- [ ] Run `npm run test` to see what breaks
- [ ] Fix any tests that selected the removed card or old section order
- [ ] Add/update tests for IncomeDetails to cover supplementary income rendering

## Acceptance criteria

- `npm run test` passes (all existing + updated tests)
- `npm run build` passes
- Upload stays open after first document upload
- Taxpayer Summary Card is gone from the page
- Supplementary Income appears as a compact sub-section inside IncomeDetails
- Section order follows: Upload → ComputationWorksheet → Regime Comparison → Recon Table
- ComputationWorksheet sections are collapsible on desktop too
- Net result callout is visually larger/more prominent
- AppBar has one fewer button (chat trigger removed, only FAB remains)
