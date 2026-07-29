# Parser Improvement Plan — Phases & Architecture

---

## Status

| Phase | Status | Session |
|-------|--------|---------|
| Phase 0: Eliminate hardcoded parser data | ✅ Done | `2026-07-29` — commit `4234635` |
| Phase 1: Fix data models and mappings | ✅ Done | `2026-07-29` — commit `dadc139` |
| Phase 2: Fix reconciliation logic | ✅ Done | `2026-07-29` — fallback: totalTdsDeducted→tdsSalary; cross-verify vs actual TDS; AIS-only fallback; reconciliation tests updated |
| Phase 3: Wire Part A into simple parser | ⬜ Pending | |
| Phase 4: Multi-employer / cross-source TDS | ⬜ Pending | |

---

## Session Notes

### 2026-07-29 — Hardcoding removal + audit
- Removed company/user-specific fallbacks from form16, ais, tis, form26as parsers
- Moved keyword/classification data to `extractionConfig.ts`
- Added hardcoding-prevention unit test (96 parser tests total)
- Audited TDS/salary data flow end-to-end
- Identified: `compatibilityProxy.ts:367-368` maps `taxPayable` (liability) → `totalTdsDeducted`/`totalTdsDeposited`
- Identified: `reconciliation.ts:174` falls back to `taxPayable` as `tdsSalary` — conceptually wrong
- Identified: `reconciliation.ts:159,162` cross-verifies 26AS TDS against `taxPayable` — false discrepancies
- Identified: simple parser pipeline never reads Part A TDS
- Created this plan document

---

## Core Principles

1. **Form 16 is employer-specific** — Part A's `totalTdsDeducted` is only TDS deducted by *that* employer (u/s 192). It does NOT capture TDS from other sources (interest, rent, professional fees, etc.).
2. **26AS is the source of truth for TDS** — It aggregates TDS across all deductors (salary + non-salary). When present, reconciliation should prefer 26AS.
3. **AIS supplements 26AS** — May contain TDS entries not yet reflected in 26AS.
4. **Form 16 Part B's `taxPayable` is a liability** — It's the gross tax computed (after rebate/cess), NOT a TDS amount. Using it as `tdsSalary` is semantically wrong, even if numerically coincidental.

---

## TDS Data Sources & What They Contain

| Source | What TDS data | Coverage |
|--------|--------------|----------|
| Form 16 Part A | `totalTdsDeducted` | TDS u/s 192 by this employer only |
| Form 16 Part B | `netTaxPayable` | Balance payable after TDS/TCS (NOT TDS) |
| Form 26AS | `tdsSalary[]`, `tdsOther[]`, `advanceTax[]`, `selfAssessmentTax[]` | All deductors, all sections |
| AIS | `tdsDetails[]` (with section/TAN) | All deductors, may include not-yet-in-26AS |
| TIS | `salaryDerived` | Derived salary estimate (no TDS breakdown) |

---

## Current Bugs

### Bug 1: `totalTdsDeducted` / `totalTdsDeposited` mapped to `taxPayable`
- **File**: `compatibilityProxy.ts:367-368`
- `mapFlatToBundle` sets `totalTdsDeducted = data.taxPayable` — maps a liability amount to a TDS field
- `totalTdsDeposited` has the same problem
- **Fix**: Add real fields to `Form16Data`, map them correctly

### Bug 2: Reconciliation fallback uses `taxPayable` as `tdsSalary`
- **File**: `reconciliation.ts:174`
- When 26AS is absent: `credits.tdsSalary = form16.taxPayable`
- Wrong: Form 16 Part B `taxPayable` is the computed tax, not TDS
- Even if it were TDS, it's only one employer — total TDS may be higher
- **Fix**: Use `form16.totalTdsDeducted` (from Part A) when available; else 0

### Bug 3: Cross-verification compares 26AS TDS against `taxPayable`
- **File**: `reconciliation.ts:159,162`
- `form16Tds = form16.taxPayable` then compared against `matchingTds26as.amount`
- If employer TDS ≠ computed tax liability, this produces false discrepancies
- **Fix**: Compare 26AS TDS against Form 16 Part A's actual TDS

### Bug 4: Simple parser pipeline skips Part A entirely
- `parseForm16Text` (simple pipeline) never extracts TDS from Part A
- Only `DetailedForm16Parser` handles Part A
- **Fix**: Wire Part A extraction into the standard pipeline, or at minimum extract `totalTdsDeducted`

---

## Flat `Form16Data` Interface — Missing Fields

Current (line 65 ends at `taxPayable`). Needs:

```typescript
// From Part A:
totalTdsDeducted: number;    // actual TDS by this employer
totalTdsDeposited: number;   // actual TDS deposited to govt

// From Part B (needed for reconciliation accuracy):
netTaxPayable: number;       // balance payable after TDS credits
```

---

## Phases

### Phase 1: Fix data models and mappings
- [ ] Add TDS/net fields to `Form16Data` interface
- [ ] Fix `mapFlatToBundle` to map them correctly (not reuse `taxPayable`)
- [ ] Update `createEmptyForm16` / test fixtures
- [ ] **Test**: verify bundle TDS fields are populated correctly from flat data

### Phase 2: Fix reconciliation logic
- [ ] Fallback: use `form16.totalTdsDeducted` instead of `form16.taxPayable` as `tdsSalary`
- [ ] Cross-verification: compare against actual TDS, not `taxPayable`
- [ ] Add AIS-only fallback: if 26AS absent but AIS has TDS u/s 192 entries with matching TAN, use those
- [ ] **Test**: reconciliation produces correct `tdsSalary` when 26AS is absent

### Phase 3: Wire Part A extraction into simple parser
- [ ] Add "Total Tax Deducted at Source" / "Total Tax Deposited" label extraction to `TaxComputationParser` or a new sub-parser
- [ ] This populates `totalTdsDeducted` / `totalTdsDeposited` in the simple pipeline
- [ ] **Test**: verify simple pipeline extracts TDS from sample forms with Part A

### Phase 4: Multi-employer / cross-source TDS aggregation
- [ ] When multiple Form 16 certificates exist, sum `totalTdsDeducted` across all
- [ ] Already partially handled: AIS TDS entries not in 26AS are added (line 178-192)
- [ ] Ensure `tdsOther` from 26AS/AIS correctly captures non-salary TDS (interest, rent, etc.)
- [ ] Ensure AIS-only path (no 26AS, no Form 16) still produces `tdsSalary` from AIS TDS u/s 192
- [ ] **Test**: multi-employer scenario with combined TDS

---

## Architecture Notes

### Data flow
```
Form 16 text
  ├─ parseForm16Text() (simple) → Form16Data (flat, no TDS currently)
  └─ DetailedForm16Parser    → PartA { totalTdsDeducted, totalTdsDeposited }
                                      ⇣
  mapFlatToBundle()          → Form16Bundle.certificates[].partA
                                      ⇣
  reconcileAllDocuments()    → ReconciledTaxData.taxCredits.tdsSalary
                                      ⇣
  taxEngine.ts / mapper.ts   → ITR JSON
```

### Key: 26AS is preferred for TDS
When 26AS IS available:
- `tdsSalary` = sum of `form26as.tdsSalary[].amount` (all employers, section 192) + AIS supplement
- `tdsOther` = sum of `form26as.tdsOther[].amount` (all sections) + AIS supplement
- Form 16 Part A TDS is only used for cross-verification (discrepancy detection)

When 26AS is NOT available:
- `tdsSalary` = Form 16 Part A `totalTdsDeducted` (one employer only) — fallback
- `tdsOther` = 0 (no fallback source for non-salary TDS)
- AIS TDS entries can supplement both

---

## Testing Strategy

- Add TDS-aware reconciliation tests: with 26AS, without 26AS, without both
- Test cross-verification with matching and mismatching TDS
- Test multi-employer scenario
- Test simple parser extraction of Part A TDS
- Unit tests for `mapFlatToBundle` mapping correctness
