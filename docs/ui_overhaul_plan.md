# UI Overhaul Plan — Computation Worksheet Paradigm

---

## Status

| Phase | Status | Session |
|-------|--------|---------|
| Phase 1: Computation Worksheet Foundation | 📋 Planned | `2026-07-29` — Plan drafted |
| Phase 2: Verification / Reconciliation Section | 📋 Planned | `2026-07-29` — Plan drafted |
| Phase 3: Source Badges & Document Viewer | 📋 Planned | `2026-07-29` — Plan drafted |
| Phase 4: Slab Visuals & Responsive Polish | 📋 Planned | `2026-07-29` — Plan drafted |

---

## Motivation

The current UI presents a flat grid of `CueTextField` fields organized by ITR schedule. A user cannot verify the computation at a glance — they must scan dozens of fields and mentally trace the arithmetic. The CA computation sheet (e.g., CompuTax output) demonstrates a superior pattern:

- **Linear computation flow**: Personal info → Salary → Other income → Tax computation → Credits → Net result
- **Semantic grouping**: Related data is visually nested (employer-level salary under each employer)
- **Source attribution**: Every number is traceable to a document/schedule
- **At-a-glance verification**: The math flows top-to-bottom; discrepancies pop visually
- **Hierarchical detail**: Summary → Detailed computation → Supporting schedules
- **Dedicated reconciliation**: A separate statement comparing values across sources (Form 16 vs 26AS vs AIS)

## Design Principles

1. **Computation-first, form-second**: The main view is a read-only computation worksheet. Editing is a secondary mode (pen icon per field or section).
2. **Linear top-to-bottom flow**: Four clear sections — Identity → Income Details → Tax Computation → Verification.
3. **Every number is anchored**: Each displayed value shows a source badge (Form 16 / 26AS / AIS / TIS / Derived) on hover or inline.
4. **Verification is a dedicated section**: Cross-source comparisons live in their own reconciliation table below the computation, not scattered as inline alerts.
5. **Document-first verification**: The right panel becomes a true document viewer (highlighted extracted text) that cross-highlights with the computation fields on the left.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Navbar: ITR Assist    [Doc Status Bar]  [🌙] [🤖]         │
├──────────────────────────────────┬──────────────────────────┤
│  LEFT: Computation Worksheet     │ RIGHT: Document Viewer   │
│                                  │ (resizable, 40%)         │
│  ┌─ SECTION 1: TAXPAYER ──────┐ │                          │
│  │ Identity Card (compact)     │ │  Tabs:                   │
│  │ Name · PAN · AY · DOB       │ │  ┌────┬────┬────┬────┐  │
│  │ Ward · Status               │ │  │F16 │AIS │TIS │26AS│  │
│  └────────────────────────────┘ │  └────┴────┴────┴────┘  │
│  ┌─ SECTION 2: INCOME ───────┐ │                          │
│  │ Salary (by employer)       │ │  ┌────────────────────┐  │
│  │   Gross Salary: ₹18,33,722 │ │  │ Extracted text     │  │
│  │   - Std Deduction: ₹75,000 │ │  │ with highlights    │  │
│  │   = Income from Salary     │ │  │ matching left-side │  │
│  │ Other Incomes              │ │  │ fields             │  │
│  │   + Capital Gains: ₹17,515 │ │  └────────────────────┘  │
│  │   + Other Sources: ₹4,449  │ │                          │
│  │   = Gross Total Income     │ │                          │
│  ├─ SECTION 3: TAX COMP. ────┤ │                          │
│  │ Deductions → Total Income  │ │                          │
│  │ Tax Slab (visual bar)      │ │                          │
│  │ + Cess → Gross Tax Liab.   │ │                          │
│  │ - TDS/Avance Tax/SAT       │ │                          │
│  │ ± Interest u/s 234B/C      │ │                          │
│  │ = Net Tax Payable / Refund │ │                          │
│  └────────────────────────────┘ │                          │
│  ┌─ SECTION 4: VERIFICATION ──┐│                          │
│  │ Cross-source table         ││                          │
│  │ Field     │F16│26AS│AIS│TIS││                          │
│  │ Gross Sal │X  │--  │Y  │Z  ││                          │
│  │ TDS u/s192│X  │X   │X  │-- ││                          │
│  │ ...       │   │    │   │   ││                          │
│  └────────────────────────────┘│                          │
│  [Download ITR] [AI Review]    │                          │
└──────────────────────────────────┴──────────────────────────┘
```

## Sections (detail)

### Section 1: Taxpayer Identity
A compact card at the top showing: Name, PAN, Date of Birth, Assessment Year, Status, Ward/Circle, Residential Status, Filing Status. Same as the current taxpayer summary card but more compact — takes ~3 lines, not a full card.

### Section 2: Income Details
Two sub-blocks:
- **Salary & Employer**: For each employer, show Gross Salary → Less: Standard Deduction → Income from Salary. If multiple employers, show one per row in a sub-table with a consolidated total line. Match the CA sheet's employer-level granularity.
- **Other Incomes**: Capital Gains (STCG + LTCG 112A), House Property, Interest (Savings + FDR), Other Sources. Each with its own amount. Total at bottom.

### Section 3: Tax Computation
A single linear flow:
- Gross Total Income (carry-in from Section 2)
- Less: Chapter VI-A Deductions (80C, 80D, etc.)
- = **Total Income**
- Tax on Normal Income (visual slab breakdown with ₹ amounts per bracket)
- + Tax on Special Rates (STCG @ 20%, LTCG @ 0% if within limit, etc.)
- + Health & Education Cess @ 4%
- = **Gross Tax Liability**
- Less: TDS on Salary + TDS on Other Income + Advance Tax + Self Assessment Tax + TCS
- = **Total Prepaid Credits**
- ± Interest u/s 234A/B/C
- = **Net Tax Payable / Refund Due**

### Section 4: Verification / Reconciliation
A comparison table with one row per key field, and columns for each source document:

| Field | Form-16 | 26AS | AIS | TIS | Derived |
|-------|---------|------|-----|-----|---------|
| Gross Salary | ₹18,33,722 | — | ₹18,33,722 | ₹18,33,722 | ✓ Match |
| TDS u/s 192 | ₹51,290 | ₹51,290 | ₹51,290 | — | ✓ Match |
| Interest Savings | ₹1,829 | — | ₹1,829 | ₹1,829 | ✓ Match |
| STCG | — | — | ₹10,025 | — | ⚠ Only in AIS |

Each row shows whether values match across sources. Mismatched rows are highlighted. This section replaces the current generic `Alert`-based discrepancy boxes.

---

## Phases

### Phase 1: Computation Worksheet Foundation

**Goal**: Build the read-only worksheet with Sections 1–3 (Identity, Income, Tax Computation). This is the core structural change.

- Build `ComputationWorksheet` component with three clear sections:
  - **Section 1 — TaxpayerIdentityCard**: compact read-only card showing name, PAN, AY, DOB, status. Reuses existing `extractedDataDomain.employee` etc.
  - **Section 2 — IncomeDetails**: employer-by-employer salary breakdown with subtotals, plus other incomes (CG, HP, OS) with a Gross Total Income line
  - **Section 3 — TaxComputation**: linear flow from Gross Total Income → Deductions → Total Income → Slab → Cess → Gross Tax → Credits → Interest → Net Result
- Each numeric line shows the arithmetic operator visually (e.g. `+ ₹17,515` with a plus icon, `− ₹75,000` with a minus icon)
- Replace the current `Review & Edit Extracted Information` card section in `page.tsx`
- Keep identity card, regime comparison card, and result callout as-is for now
- Read-only initially; editing is not wired yet

**Files to create**: `src/app/components/ComputationWorksheet.tsx`, `src/app/components/IncomeDetails.tsx`, `src/app/components/TaxComputation.tsx`, `src/app/components/TaxpayerIdentityCard.tsx`
**Files to modify**: `src/app/page.tsx`
**Tests**: renders Section 1 with correct taxpayer info from fixture; Section 2 shows correct employer breakdown and GTI; Section 3 arithmetic matches expected values for known fixture; multi-employer list renders each employer row

---

### Phase 2: Verification / Reconciliation Section

**Goal**: Add a dedicated cross-source comparison table (Section 4) below the computation worksheet.

- Build `ReconciliationTable` component — a matrix with field rows and source columns (Form-16, 26AS, AIS, TIS, Derived)
- For each key field, extract the value from each available source document in the engine result:
  - Salary amounts: Form-16 salary vs AIS salary-derived vs TIS salary-derived
  - TDS u/s 192: Form-16 `totalTdsDeducted` vs 26AS `tdsSalary[]` vs AIS `tdsDetails[]`
  - Interest: Form-16 vs AIS vs TIS
  - Capital Gains: Form-16 vs AIS vs TIS
- Add a "Status" column: ✓ Match (all sources agree), ⚠ Partial (some sources missing), ✗ Mismatch (values differ)
- Highlight mismatched rows with a gold background and expandable diff detail
- Remove the three generic `Alert` boxes (salary discrepancies, TDS discrepancies, other discrepancies) from `page.tsx`
- Keep `SectionAuditTrail` components for now — they show different info (audit history vs source comparison)

**Files to create**: `src/app/components/ReconciliationTable.tsx`
**Files to modify**: `src/app/page.tsx`
**Tests**: renders table with correct sources for known fixture; matching fields show ✓ status; mismatched fields show ✗ with diff detail; missing source shows —; no generic Alert boxes render when table is present

---

### Phase 3: Source Badges & Document Viewer

**Goal**: Add source attribution badges to computation values, and upgrade the right panel for document cross-referencing.

- Build `SourceBadge` component: small colored chip (`Form16`, `26AS`, `AIS`, `TIS`, `Derived`, `Manual`) shown inline next to computation values
- Integrate `SourceBadge` into the Phase 1 StepCards — every displayed amount gets a badge
- Build `DocumentViewer` component to replace `DebugInfoSection`:
  - Tabs for each uploaded document (Form 16, AIS, TIS, 26AS)
  - Shows extracted raw text, scrollable and searchable
  - Clicking a computation value on the left scrolls the document viewer to the relevant extracted lines
  - Selecting text in the viewer doesn't need to cross-highlight fields (keeping this simple)
- Remove `DebugInfoSection.tsx`

**Files to create**: `src/app/components/SourceBadge.tsx`, `src/app/components/DocumentViewer.tsx`
**Files to modify**: `src/app/page.tsx`, delete `src/app/components/DebugInfoSection.tsx`
**Tests**: SourceBadge shows correct source for salary, TDS, deduction fields; DocumentViewer renders text for each uploaded doc; clicking a computation field scrolls viewer to matching line

---

### Phase 4: Slab Visuals & Responsive Polish

**Goal**: Replace the accordion-based slab breakdown with visual tax bars, and make the entire layout work on mobile.

- Build `TaxSlabVisual` component: horizontal stacked bar where each slab is a colored segment (`₹0–4L @ 0%` grey, `₹4L–8L @ 5%` light green, `₹8L–12L @ 10%` medium green, etc.). The taxpayer's income level is marked with a pointer/arrow. Below the bar, each slab's tax amount is listed in a compact row.
- Replace the `TaxComputationBreakdown` accordion in `TaxRegimeComparisonCard` with the visual bar — only for the active regime; the comparison card can still show both regimes side by side
- Mobile pass: on screens < 768px, the document viewer side panel hides; add a toolbar button to open it as a bottom sheet or modal; ensure all sections are still collapsible; keep the Net Result callout sticky at top

**Files to create**: `src/app/components/TaxSlabVisual.tsx`
**Files to modify**: `src/app/components/TaxRegimeComparisonCard.tsx`, `src/app/page.tsx`
**Tests**: TaxSlabVisual renders correct segment widths and tax amounts for known income; mobile breakpoint hides side panel and shows bottom sheet trigger; all sections collapsible at mobile viewport

---

## Data Flow (unchanged)

```
EngineReconciliationResult (same proto)
         ⇣
ComputationWorksheet
  ├─ TaxpayerIdentityCard
  ├─ IncomeDetails
  │    └─ SalaryBreakdown (per employer)
  ├─ TaxComputation
  │    └─ TaxSlabVisual
  └─ ReconciliationTable
         ⇣
EditSheet (future: overlay for field editing)
```

---

## Phase Workflow

When completing a phase from this plan:

1. Update the status table at the top of this document — set the phase to ✅ Done, add the date and a brief summary of changes in the Session column.
2. Add a new entry under Session Notes documenting the key files changed and why.
3. Commit the changes to git with a descriptive message referencing the phase.
