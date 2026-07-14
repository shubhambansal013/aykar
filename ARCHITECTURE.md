# ITR Filing Assistant — Architecture

## Goal
Take Form-16, AIS, TIS, 26AS (and optionally supplementary documents like capital
gains statements from brokers, property sale deeds, etc.) and produce a
schema-valid ITR JSON that can be uploaded to the Income Tax portal, with zero
silent errors and full traceability of every number back to its source document.

## Core Principle
**Deterministic logic owns the numbers and the final JSON. AI is only used where
the input is genuinely unstructured and no fixed schema exists to parse against.**

Tax filing needs reproducibility and auditability. Given the same inputs, the
pipeline must produce the same output every time, and every value in the final
JSON must be traceable to a specific line in a specific source document. An LLM
making the final call on numbers breaks both properties — it can misread tables,
mishandle sign conventions (credit vs debit, TDS sections), and its reasoning
isn't guaranteed to be identical on rerun.

## Why not "upload everything to an AI agent and act on its output"
- No fixed extraction schema per document → higher chance of misread values, especially
  around negative amounts, netting of gains/losses, multiple TDS entries under
  different sections, and OCR'd tables.
- Non-reproducible: same input, ambiguous prompt drift → different output on
  rerun. Bad property for a legal filing with penalty exposure.
- Hard to audit: "the AI decided this" is not an acceptable trail if the return
  is picked up for scrutiny.
- ITR JSON schemas are strict, versioned, and validated by the portal on
  upload — free-form LLM output is unlikely to conform without a rules layer
  checking it anyway, at which point the rules layer might as well own the
  process.

## Where AI is actually useful
- **Unstructured document extraction**: broker contract notes / capital gains
  statements, property sale agreements, foreign income documents — anything
  without a fixed government schema, where formats vary across issuers.
- **Human-readable explanations**: once the deterministic engine has flagged a
  discrepancy, use AI to explain it in plain language to the user.
- **Form/schedule suggestion**: given the detected income types, suggest which
  ITR form (1/2/3/4) and which schedules likely apply — as a suggestion,
  always confirmed against actual rules before being acted on.

In all of the above, **anything the AI extracts or suggests is treated as
untrusted input** and re-validated by the deterministic layer before it can
affect the final JSON.

## Pipeline

```
┌─────────────────┐
│ Source Documents │  Form-16, AIS, TIS, 26AS (structured/semi-structured)
│                  │  + optional unstructured docs (broker P&L, sale deeds)
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────┐
│ 1. Parsers (per doc type)   │  Deterministic parsers for Form-16/AIS/TIS/26AS
│    + AI-assisted extraction │  (fixed layouts / govt schemas).
│    for unstructured inputs  │  AI extraction only for free-form documents,
│                              │  output immediately validated against expected
│                              │  types/ranges before use.
└────────┬─────────────────────┘
         │  normalized records (PAN, TAN, section, amount, head, source doc ref)
         ▼
┌─────────────────────────────┐
│ 2. Reconciliation Engine    │  Deterministic joins/diffs across documents:
│                              │  - TDS in Form-16 vs 26AS vs AIS
│                              │  - Income reported vs AIS/TIS entries
│                              │  - Duplicate or missing entries
└────────┬─────────────────────┘
         │  discrepancy list (flagged to user, nothing auto-resolved silently)
         ▼
┌─────────────────────────────┐
│ 3. User Review              │  User confirms/corrects flagged items.
│                              │  Every resolution logged with source reference.
└────────┬─────────────────────┘
         │  reconciled, confirmed figures
         ▼
┌─────────────────────────────┐
│ 4. Cross-check vs Portal    │  Compare final figures against what the Income
│                              │  Tax portal itself shows (prefilled data) before
│                              │  generating JSON — catch anything the source
│                              │  docs didn't have but the portal does.
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 5. ITR JSON Builder         │  Deterministic, schema-validated construction of
│                              │  the ITR JSON against the official schema for the
│                              │  applicable assessment year/form.
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 6. Validation                │  Validate against official JSON schema +
│                              │  business rules (e.g. total income ties out,
│                              │  TDS claimed ≤ TDS reported) before upload.
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────┐
│ Upload to Portal │
└─────────────────┘
```

## Non-negotiables
- No number reaches the final JSON without a traceable source (document + line/field).
- Every discrepancy is surfaced to the user — nothing is silently auto-corrected.
- AI-extracted values are always re-validated by deterministic checks (type,
  range, cross-document consistency) before use.
- The JSON builder validates against the official schema before any upload is
  attempted.
- Pipeline is idempotent: rerunning on the same inputs produces the same output.

## Open items / to define
- Exact source for official ITR JSON schema per assessment year and form type.
- Parser implementation per document (Form-16 PDF structure, AIS/TIS/26AS
  formats — these may change year to year and need version handling).
- Interface/method for cross-checking against the portal (manual export vs
  automated access, subject to portal's own constraints).
- Business rule set for step 6 validation (beyond schema — e.g. deduction caps,
  head-of-income specific rules).
