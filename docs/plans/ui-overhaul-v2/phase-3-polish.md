# Phase 3: Polish — Tabular Layout & Color Reduction

## Objective

Apply the final visual polish: CSS grid alignment for tabular readability,
and a drastic reduction in color usage across all components. After this
phase, the UI uses at most 2 accent colors (primary blue + muted red/green
for critical signals only) with everything else in grayscale.

## Dependencies

- Requires Phase 1 to be `done` (uses shared LineRow component)
- Requires Phase 2 to be `done` (section layout is finalized)
- Does **not** require Phase 2 tests to pass if starting fresh from Phase 3
  (but code must compile)

## Responsibilities

What this phase owns:

1. **CSS grid LineRow** — Convert LineRow from flexbox to a 3-column CSS
   grid: `[icon+label] [amount, right-aligned, monospace] [source badge]`.
   This ensures all ₹ values share a vertical column regardless of label
   length, mimicking a spreadsheet.

2. **SourceBadge → neutral outline** — Change all SourceBadge variants from
   colored chips (primary/green/warning/info) to a single gray outline style.
   Distinguish sources by label text and icon only, not by color.

3. **Desaturate ReconciliationTable** — Replace green/yellow/red status
   chips with gray outline chips. Replace the yellow background on mismatch
   rows with a subtle gray left border. Keep the status icons but in
   `text.secondary` gray.

4. **Simplify TaxRegimeComparisonCard** — Remove "Optimal" badges inside
   each regime card (keep the recommendation banner only). Remove colored
   borders on selection (use subtle gray outline instead). Remove
   `success.main` text coloring on optimal values — use bold gray instead.

5. **Mute TaxSlabVisual** — Replace the green gradient (new regime) and
   blue gradient (old regime) with a single-hue opacity gradient using
   `primary.main` at varying alpha levels. Remove the `error.main` red
   arrow — use a simple gray inverted triangle.

6. **Neutralize operator icons** — In LineRow, change add icon from
   `success.main` (green) and subtract icon from `error.main` (red) to
   `text.secondary` (gray). The operator shape (+ / −) is sufficient to
   convey meaning.

7. **Standardize card spacing** — All card-like sections use `mb: 2`
   consistently (currently mixed 2/2.5). Interior padding unified to `p: 2`.

8. **Reduce section title decoration** — Remove the `primary.main`-colored
   bottom border from SectionTitle. Use a light gray divider below instead.
   Keep bold weight for hierarchy.

9. **Update tests** — Component tests that assert specific colors
   (`success.main`, `error.main`, hex values) need updating.

What this phase does **not** touch:
- No structural changes (section order, which components exist)
- No changes to page.tsx layout orchestration
- No changes to the computation/reconciliation logic
- No changes to dark mode colors (only light mode treatment)

## Todos

### 3a. CSS grid LineRow
- [ ] Open `src/app/components/LineRow.tsx`
- [ ] Change the outer Box `sx` from flexbox to:
  ```jsx
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: 1,
  alignItems: 'center',
  ```
- [ ] First column: icon + label (left-aligned)
- [ ] Second column: value (right-aligned, monospace) — use `justifySelf: 'end'`
- [ ] Third column: SourceBadge (when present)
- [ ] Ensure `isTotal` rows still get the gray background
- [ ] Ensure onClick still works

### 3b. Neutralize SourceBadge
- [ ] Open `src/app/components/SourceBadge.tsx`
- [ ] Change all entries in `SOURCE_CONFIG` to use one color:
  ```typescript
  const SOURCE_CONFIG: Record<SourceType, { label: string; color: 'default'; icon: React.ReactElement }> = {
    Form16: { label: 'Form-16', color: 'default', icon: ... },
    '26AS': { label: '26AS', color: 'default', icon: ... },
    AIS: { label: 'AIS', color: 'default', icon: ... },
    TIS: { label: 'TIS', color: 'default', icon: ... },
    Derived: { label: 'Derived', color: 'default', icon: ... },
    Manual: { label: 'Manual', color: 'default', icon: ... },
  };
  ```
- [ ] The chip should use `variant="outlined"` with default gray styling
- [ ] Keep the icons as-is (they already differentiate sources by shape)

### 3c. Desaturate ReconciliationTable
- [ ] Open `src/app/components/ReconciliationTable.tsx`
- [ ] Change `STATUS_STYLE`:
  ```
  match: { bgcolor: 'action.hover', color: 'text.secondary', icon: ... }
  partial: { bgcolor: 'action.hover', color: 'text.secondary', icon: ... }
  mismatch: { bgcolor: 'action.hover', color: 'text.secondary', icon: ... }
  ```
- [ ] Remove the yellow `warning.light` background from mismatch rows
      (lines 206-208). Instead add:
      ```jsx
      borderLeft: isMismatch ? '3px solid' : 'none',
      borderColor: isMismatch ? 'text.secondary' : 'none',
      ```
- [ ] Status text: keep the label text (✓ Match, ⚠ Partial, ✗ Mismatch)
      but remove the colored chip fill

### 3d. Simplify TaxRegimeComparisonCard
- [ ] Open `src/app/components/TaxRegimeComparisonCard.tsx`
- [ ] Remove the "Optimal" badge Paper elements inside each regime card
      (lines 222-234 and 371-383)
- [ ] Remove the `comparison.optimalRegime === 'X' ? 'success.light' : 'divider'`
      border color logic — use `divider` for all non-selected states
- [ ] Remove `success.main` text coloring on the total tax payable values
      (lines 252 and 401) — use `text.primary` with bold instead
- [ ] Keep the recommendation banner at the top (it's the primary signal)
      but consider if its green background can be neutral (gray) in this phase
      — defer to 3d if too risky
- [ ] Reduce the `boxShadow` on recommendation banner from 1 to 0

### 3e. Mute TaxSlabVisual
- [ ] Open `src/app/components/TaxSlabVisual.tsx`
- [ ] Replace `NEW_COLORS` array with a single-hue opacity gradient:
  ```typescript
  const NEW_COLORS = [
    'rgba(37, 99, 235, 0.08)',
    'rgba(37, 99, 235, 0.15)',
    'rgba(37, 99, 235, 0.22)',
    'rgba(37, 99, 235, 0.30)',
    'rgba(37, 99, 235, 0.38)',
    'rgba(37, 99, 235, 0.46)',
    'rgba(37, 99, 235, 0.55)',
  ];
  ```
  (Use the theme's primary color — hex `#2563eb` for light mode, or pull
  from theme.primary.main)
- [ ] Same treatment for `OLD_COLORS` (use same primary blue, or keep a
      distinct but equally muted hue)
- [ ] Remove `error.main` from the total income arrow marker (lines 93-103).
      Use `text.secondary` instead
- [ ] Update the section title line (line 50) to not use `primary.main` color

### 3f. Neutralize operator icons
- [ ] Open `src/app/components/LineRow.tsx`
- [ ] Change `opColor` from:
  ```typescript
  const opColor = operator === 'add' ? 'success.main' : operator === 'subtract' ? 'error.main' : 'text.primary';
  ```
  to:
  ```typescript
  const opColor = 'text.secondary';
  ```

### 3g. Standardize spacing
- [ ] Search all component files for `mb: 2.5` — change to `mb: 2`
- [ ] Search for inconsistent `p: 2` vs `p: 3` — unify to `p: 2`
- [ ] Check page.tsx for any remaining `mb: 2.5`

### 3h. Reduce section title decoration
- [ ] Open `src/app/components/LineRow.tsx` (SectionTitle)
- [ ] Change from:
  ```jsx
  color: 'primary.main',
  borderBottom: 2,
  borderColor: 'primary.main',
  ```
  to:
  ```jsx
  borderBottom: 1,
  borderColor: 'divider',
  pb: 0.5,
  ```
- [ ] Keep `fontWeight: 'bold'` — hierarchy comes from weight, not color

### 3i. Update tests
- [ ] Run `npm run test` after all changes
- [ ] Fix any tests that assert specific colors:
  - `success.main`, `error.main`, `warning.main` in component assertions
  - Hardcoded hex colors from TaxSlabVisual tests
  - SourceBadge color assertions
- [ ] Tests should assert presence/absence of elements, not specific color values

## Acceptance criteria

- `npm run test` passes
- `npm run build` passes
- All monetary values in IncomeDetails and TaxComputation right-align in a
  single column (visual check)
- SourceBadge shows all sources in gray outline (no green/blue/orange chips)
- ReconciliationTable has no colored chips or yellow row backgrounds
- TaxRegimeComparisonCard has no "Optimal" green badges inside regime cards
- TaxSlabVisual uses muted blue opacity gradient, no red arrow
- Add/subtract icons are gray (not green/red)
- Section titles have gray dividers, not colored borders
- Card spacing is consistent throughout
