# Plan: UI/UX Overhaul — Reduce Chaos, Improve Readability

## Overview

The current UI displays too many competing visual elements: redundant cards
showing the same financial data, bright colors everywhere, duplicated
component code, and no clear information hierarchy. This plan removes the
redundancies, restructures the layout into a logical flow, extracts shared
components to eliminate code duplication, and applies a restrained visual
treatment so the user can parse the computation at a glance.

Three specific user complaints drove this:
1. Upload area collapses after the first document, blocking further uploads
2. Financial data needs tabular (column-aligned) formatting, not loose flex rows
3. Too many bright colors competing for attention

## Goals

- Eliminate all duplicate data presentation (one authoritative place per value)
- Extract shared components to reduce page.tsx from ~1944 lines to a
  manageable layout orchestrator
- Fix the upload auto-collapse bug
- Apply CSS grid alignment so monetary values form a proper column
- Reduce the color palette to 1-2 muted accent colors, grayscale for everything else
- Simplify TaxRegimeComparisonCard from its current 490 lines of heavy decoration
- Make ComputationWorksheet sections collapsible on ALL screen sizes
- Deduplicate chat UI (desktop + mobile currently copied verbatim)

## Non-goals

- No changes to the tax computation logic, reconciliation engine, or data model
- No changes to the dark mode toggle or its behavior
- No new features or user-facing functionality changes
- No removal of SourceBadge itself (just its color treatment)
- No changes to the document upload flow (formats, parsing, etc.)
- No test removal — existing tests must continue to pass, new tests for new components

## Key decisions

- **Decision**: Remove Taxpayer Summary Card entirely.
  Rationale: Every value it displays (GTI, taxable income, tax payable, prepaid
  credits, net result) already appears in the ComputationWorksheet's
  TaxComputation section. Keeping both forces the user to mentally reconcile
  two presentations of the same numbers.

- **Decision**: Supplementary Income Sources becomes a sub-section inside
  IncomeDetails, not a standalone card.
  Rationale: It's an edge case that currently gets equal visual weight to
  primary income data.

- **Decision**: Upload area stays open until the user collapses it.
  Rationale: The current behavior collapses after one upload, preventing batch
  upload. Simple state default change.

- **Decision**: LineRow uses CSS grid (`grid-template-columns: 1fr auto auto`)
  instead of flexbox for tabular alignment.
  Rationale: All monetary values must share a vertical column for
  spreadsheet-like readability, which flexbox cannot guarantee when labels
  vary in length.

- **Decision**: SourceBadge becomes gray outline (no fill). All other colors
  become grayscale or very muted.
  Rationale: Color should signal importance, not identify source. Source
  identification belongs in the label text and icon shape.

- **Decision**: 3 phases (Foundation, Architecture, Polish) to keep each
  session focused and small enough for one agent context.
  Rationale: Phase 1 is pure extraction with tests. Phase 2 is structural
  with behavioral fixes. Phase 3 is cosmetic. Each can be verified independently.

## Phase status

| Phase | Title | Status | Notes |
|---|---|---|---|
| 1 | Foundation — Extract shared components | done | LineRow, SectionTitle, ChatPanel, DocumentUpload |
| 2 | Architecture — Remove redundancy, restructure flow | pending | Depends on Phase 1's shared components |
| 3 | Polish — Tabular layout & color reduction | pending | Depends on Phase 1's LineRow |

Status values: `pending`, `in-progress`, `done`.

## Phase files

- `phase-1-foundation.md`
- `phase-2-architecture.md`
- `phase-3-polish.md`

## Shared notes

See `NOTES.md` in this directory for running findings/decisions from execution
sessions.
