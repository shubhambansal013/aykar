# ITR Filing Assistant — Architecture & State Pipeline

## Goal
Take Form-16, AIS, TIS, 26AS and produce a schema-valid ITR JSON that can be uploaded to the Income Tax portal, with zero silent errors and full traceability of every number back to its source document.

## Core Principle
**Deterministic logic owns the numbers and the final JSON. AI is only used where the input is genuinely unstructured (e.g., chat interaction, explaining discrepancies, proposing updates) and no fixed schema exists to parse against.**

Tax filing needs reproducibility and auditability. Given the same inputs, the pipeline must produce the same output every time, and every value in the final JSON must be traceable to a specific line in a specific source document. An LLM making the final call on numbers breaks both properties — it can misread tables, mishandle sign conventions (credit vs debit, TDS sections), and its reasoning isn't guaranteed to be identical on rerun.

---

## Technical Architecture Overview

The Aykar application is a Next.js (App Router) client-centric application engineered to run at the edge on Cloudflare Workers (using the OpenNext adapter).

For ultimate precision, security, and type safety, the application defines and maintains its key domain data structures using **Protocol Buffers (proto3)**.

### State Flow and The Protocol Buffer Pipeline
The heart of the application runs on a strongly-typed pipeline mapped directly from and to compiled Protobuf structures:

```
┌─────────────────┐
│ Uploaded PDFs   │ Form-16, AIS, TIS, 26AS
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Dynamic Parser Engines  │
│ - PDF.js Extraction     │ Centralized configs (`extractionConfig.ts`) and
│ - Visual Line Grouping  │ modular sub-parsers (Salary, Deductions, etc.)
└────────┬────────────────┘
         │
         ▼ (JSON domain models)
┌─────────────────────────┐
│ Protobuf Mappers        │ Translate parsed domain models into compiled
│ (src/lib/proto/mappers) │ Protobuf objects: `Form16Bundle`, `AisData`, etc.
└────────┬────────────────┘
         │
         ▼ (Protobuf models)
┌─────────────────────────┐
│ Reconciliation &        │
│ Tax Engines             │ Runs fully deterministic tax logic (e.g., standard
│ (src/lib/itr/...)       │ deduction capping, Sec 80 deduction limits,
│                         │ OLD/NEW regime tax comparison calculations).
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ EngineReconciliation-   │ Contains the final outputs, audit trails, field cues,
│ Result (Protobuf Model) │ and visual diff warning structures.
└────────┬────────────────┘
         │
         ├─────────────────────────────────────────┐
         ▼ (Direct Protobuf rendering)             ▼ (JSON mapping)
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│ Client UI Components                  │ │ Portal-Ready ITR-1 JSON           │
│ - FieldCues, SectionAuditTrail,       │ │ Generated deterministically based │
│   TaxRegimeComparisonCard             │ │ on selected regime (OLD/NEW) via  │
│ - Real-time resizable split-panel     │ │ `src/lib/itr/mapper.ts`.          │
└───────────────────────────────────────┘ └───────────────────────────────────┘
```

---

## Parser Architecture

### 1. Robust Layout Reconstruction
Standard PDF parsers often scramble tabular alignment because character streams are output out of order. Aykar's PDF text extractor (`src/lib/form16/extractor.ts`) resolves this by:
1. Re-grouping text elements vertically by their Y-coordinates (within a small tolerance).
2. Sorting them horizontally by their X-coordinates before joining them into visual lines.
3. This preserves table-column alignment, allowing multi-column parsers to operate reliably.

### 2. Centralized Configuration (`extractionConfig.ts`)
Parser rules, regexes, boundaries (e.g., salary blocks, deduction blocks), and column offsets (`numericTokenIndex`) are isolated from procedural parsing code. Human maintainers can tune and adapt patterns for different employer templates without editing execution loops.

### 3. Modular Parsers
Instead of one monolithic parser, parsing tasks are split among specialized modular classes inside `src/lib/form16/`:
- `BasicInfoParser`: Extracts PANs, TANs, employer/employee names, and preserves exact assessment year formats (e.g., `2026-27`).
- `SalaryParser`: Extracts salaries, perquisites, and parses Section 10 exempt allowances line-by-line (`nature`, optional `code`, `amount`).
- `OtherIncomeParser`: Extracts external income and handles negative numbers (such as house property losses).
- `DeductionsParser`: Isolates Chapter VI-A blocks and extracts deduction amounts.
- `TaxComputationParser`: Extract gross tax, tax payable, and ensures mathematical correctness.

---

## Non-Negotiables
- **No Silent Changes**: Every correction or override is accompanied by clear UI badges (`FieldCues`) and recorded explicitly in the `SectionAuditTrail` of the reconciled Protobuf.
- **AI as an Assistant, Not an Owner**: AI reviews documents and proposes updates. Any suggested change renders a prompt card with "Accept/Reject/Undo" actions. No change is made to the tax state without the user's explicit consent.
- **State Immutability**: All state updates in the Next.js page perform deep copy state clones (`JSON.parse(JSON.stringify(prev))`) to maintain strict react reconciliation and avoid infinite render loops or test timeouts.
