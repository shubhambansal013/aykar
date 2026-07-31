# Plan: Remove Real PII from Fixtures & Tests

## Overview

The repo's test fixtures and tests contain real personal data belonging to
real people: the three employees' names, their employers' names, real PANs,
TANs, bank PANs, emails, mobile numbers, aadhaar digits, DOBs, addresses,
serial/certificate numbers, and signatory names. The 10 binary PDF fixtures
under `src/lib/itr/testdata/` also carry this data. This plan replaces every
real token with fake identity data, switches the two PDF-reading tests to
`.txt` extracted-text fixtures (verified byte-compatible with the PDFs' parse
output), deletes the real PDFs, renames the person folders to fake identities,
and strengthens the existing "no user-specific hardcoding" guard test.

## Goals

- Remove all real personal PII and employer identifiers from the repo
- Keep the full test suite green with the exact same parse coverage
- Replace PDF fixtures with `.txt` extracted-text fixtures (PDFs deleted)
- Rename the original person fixture folders to fake identities
- Extend the guard test so specific identities stay out of parser source

## Non-goals

- Regenerating PDF fixtures (layout cannot be reproduced faithfully)
- Touching `mock_form16_mapper_input.textproto` (already fake: `ABCDE1234F`,
  `John Doe`, `Test Corp`) or `regimeComparison.test.tsx` (`ABCDE1234F`)
- Replacing non-personal data: public bank/company names (HDFC, ICICI, SBI…),
  stock ISINs (`INE377N01017`…), CIT/government office addresses, place
  names, job designations, generic keywords
- Editing `docs/` (verified clean of PII at planning time)
- Any change to parser logic except the single PAN-prefix regex hint in
  `extractionConfig.ts`

## Key decisions

- **txt fixtures replace PDFs**: `integration.test.ts` and
  `convert_all.test.ts` read `.txt` files (exact current PDF extraction)
  instead of pdfjs-extracting PDFs. PDFs are deleted. Verified earlier:
  parsing the `.txt` files produces identical results to the PDFs.
- **Folder renames**: the original person folders → `Arjun_Sharma`,
  `Priya_Patel`.
- **Generalize integration branching**: replace the person-folder-name
  special-casing with a branch on count of f16 `.txt` files (1 → standard
  `parseForm16Text`, >1 → detailed `parseForm16ToDetailedBundle`).
- **Fake identity mapping** (canonical — the single source of truth for all
  phases; see table below; real values are redacted from this document).
- **Keep non-personal data**: public company/bank names and ISINs stay;
  the numeric PAN/TAN identifiers attached to banks are replaced; CIT office
  addresses, place names, and designations stay.
- **Guard test extension**: `parser.test.ts:780` keeps its existing forbidden
  patterns and gains the newly found real tokens. At close-out the guard was
  re-based onto the canonical fake identities so the guard itself carries no
  real tokens.
- **Generated files hand-mirrored**: edit `proto/*.proto` comments, then apply
  the same edits to `src/generated/*.ts` by hand (avoids `protoc` dependency
  and regeneration noise).
- **sed ordering**: in every replacement batch, longest/full tokens first
  (e.g. full company name before its short form, full person name before
  first-name token). Script is ephemeral (`/tmp/opencode/apply_fakes.sh`);
  the mapping lives here so it is reproducible.

## Fake identity mapping

Each row lists the data category and its replacement value. The real values
are redacted; the positional ordering mirrors the original real→fake pairing.

| Data category | Fake value |
|---|---|
| Employee 1 — full name (first, last tokens) | ARJUN SHARMA (ARJUN, SHARMA) |
| Employee 1 — PAN | ABJPA1234F |
| Employee 1 — aadhaar last four digits | XXXX XXXX 4321 |
| Employee 1 — date of birth | 15/03/1993 |
| Employee 1 — mobile number | 9834567890 |
| Employee 1 — email | arjun.sharma@example.com |
| Employee 1 — serial / control number | 1009876 |
| Employee 1 — download IDs (two suffixes) | ABJPA1234F202607050242 / ABJPA1234F202607050531 |
| Employee 1 — certificate numbers (pair) | LVKMPR / XZQWBN |
| Employer A — registered name | HORIZON TECH SOLUTIONS PRIVATE LIMITED |
| Employer A — short name | HORIZON TECH |
| Employer A — TAN | DELM12345F |
| Employer A — PAN | AABCH1234F |
| Employer A — payroll email | payroll.helpdesk@horizontech.in |
| Employer B — phone | 9910112233 |
| Employer C — phone | +(91)40-23456789 |
| Employer A — office address | Level 8, Tower B, Cyber Park, Sector 62, NOIDA - 201309 Uttar Pradesh |
| Employer B — registered name | BRIDGE SOFTWARE (INDIA) PRIVATE LIMITED |
| Employer B — short name | BRIDGE SOFTWARE |
| Employer B — TAN (incl. OCR variant) | BLRM22334F |
| Employer B — PAN | AABCB4567C |
| Employer B — contact email | HR@BRIDGESOFT.COM |
| Signatory / parent (pair 1) | VIJAY NAMBIAR / RAMESH KRISHNAN |
| Signatory / parent (pair 2) | SANDEEP KULKARNI / GOPAL KULKARNI |
| Employee 2 — full name (first, middle, last tokens) | PRIYA DEVI PATEL (PRIYA, DEVI, PATEL) |
| Employee 2 — PAN | AEPPA1234F |
| Employee 2 — employee code | 007890123 |
| Employee 2 — PF/UAN-style code | TPDMVF |
| Employer C — registered name (variant 1) | NEXUS HEALTHCARE (INDIA) PRIVATE LIMITED |
| Employer C — registered name (variant 2) | NEXUS HEALTHCARE INDIA PRIVATE LIMITED |
| Employer C — short forms | NEXUS HEALTHCARE / NEXUS / Nexus |
| Employer C — TAN | HYDN44556F |
| Employer C — PAN | AABBN2233C |
| Employer C — signatory (name tokens) | ANITA IYER (ANITA, IYER) |
| Employer C — signatory's parent | KARTHIK RAO |
| Employer C — signatory email | ANITA.IYER@NEXUSHEALTH.IN |
| Bank CIT branch address | D-14, GREEN PARK, SECTOR 15, NOIDA - 201301 Uttar Pradesh |
| Employee 2 — home address | 11/22 HOUSE NO.22, GREEN VIEW COLONY, EAST DELHI - 110096 Delhi |
| Employer C — office address | 4TH 5TH FLOOR, BUSINESS TOWER, INFORMATICS PARK, SECTOR 62, NOIDA - 201309, Uttar Pradesh |
| Employee 3 — full name (first, last tokens) / father | ROHAN VERMA (ROHAN, VERMA) / Vijay Verma |
| Employee 3 — PAN | AROHV1234F |
| Employer D — registered / short name | INNOVENTA SYSTEMS INDIA PRIVATE LIMITED / Innoventa Systems Pvt Ltd |
| Employer D — TAN | BLRV56789F |
| Employer D — PAN | AABBI7890C |
| Employee 3 — mobile | +(91)98-76543210 |
| Employer D — contact email | hr@innoventa.in |
| Employer D — office address | 21st Floor, Skyline Tower, Sector 62, NOIDA - 201309 Uttar Pradesh |
| Employee 3 — home address | A-101, Maple Residency, Sector 49, Gurugram - 122018 Haryana |
| Bank PANs (set of 4) | ABCDF1001A / ABCDG1002A / ABCDH1003A / ABCDJ1004A |
| Bank PANs (set of 3) | ABCDK1005A / ABCDL1006A / MUMF07777A |

Notes on the mapping:
- Tokens listed in parentheses are single-word replacements needed for
  structured `firstName`/`middleName`/`lastName` proto fields.
- `.AB772` / `.AB703` / `.AB566` / `.AB770` / `.AZ670` branch-code suffixes
  attached to bank PANs are kept (not personal).
- `mtnlTrustLine Class 2 Individual Subscriber Sub CA G1` (DSC issuer) is a
  public CA name — kept.
- CIT (TDS) office addresses (e.g. "Room No. 900A, 9th Floor, K.G. Mittal
  Ayurvedic Hospital Building, Charni Road, Mumbai - 400002") are government
  buildings, not personal data — kept.
- `extractionConfig.ts:167` regex lookahead (originally the first 5 chars of a
  real employee PAN) becomes `AROHV` (first 5 chars of the fake employee PAN)
  so no real token remains in source.

## Phase status

| Phase | Title | Status | Notes |
|---|---|---|---|
| 1 | Fixture transport: PDF → txt, folder renames, rewire tests | done | 2026-07-31 |
| 2 | Anonymize testdata fixtures (txt + textproto) | done | 2026-07-31 — sed-applied canonical mapping to both dirs; integration + full src/lib suite green; sweep clean |
| 3 | Anonymize tests, source comments, proto/generated files | done | 2026-07-31 — scrubbed real employer/employee blocks across 11 test files; extended guard `forbiddenPatterns`; PAN-prefix regex hint → `AROHV`; proto + generated comment hand-mirror; DetailedForm16Parser comment + payroll-email heuristic; full suite (31 files/517 tests) + lint green |
| 4 | Verify & close: full suite, lint, PII sweep, NOTES | done | 2026-07-31 — repo-wide PII sweep clean (only false positive: unrelated speaker-name enum in generated `cloudflare-env.d.ts`); no PDF/extracted/tmp debris; full suite 31 files/517 tests + coverage green, lint clean; NOTES appended. Close-out: plan docs and guard test fully redacted of every real token (guard re-based onto fake fixture identities); final repo-wide sweep zero hits |

Status values: `pending`, `in-progress`, `done`.

## Phase files

- `phase-1-fixture-transport.md`
- `phase-2-anonymize-testdata.md`
- `phase-3-anonymize-tests-source.md`
- `phase-4-verify-close.md`

## Shared notes

See `NOTES.md` in this directory for running findings/decisions from
execution sessions.
