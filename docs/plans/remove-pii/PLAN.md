# Plan: Remove Real PII from Fixtures & Tests

## Overview

The repo's test fixtures and tests contain real personal data belonging to
real people: employee names (TARUSH ARORA, MANAK JEET SINGH, SHUBHAM BANSAL),
employer names (THOMSON REUTERS, PARAMETRIC TECHNOLOGY, OPTUM GLOBAL,
GOOGLE IT SERVICES), real PANs, TANs, bank PANs, emails, mobile numbers,
aadhaar digits, DOBs, addresses, serial/certificate numbers, and signatory
names. The 10 binary PDF fixtures under `src/lib/itr/testdata/` also carry
this data. This plan replaces every real token with fake identity data,
switches the two PDF-reading tests to `.txt` extracted-text fixtures (verified
byte-compatible with the PDFs' parse output), deletes the real PDFs, renames
the person folders to fake identities, and strengthens the existing
"no user-specific hardcoding" guard test.

## Goals

- Remove all real personal PII and employer identifiers from the repo
- Keep the full test suite green with the exact same parse coverage
- Replace PDF fixtures with `.txt` extracted-text fixtures (PDFs deleted)
- Rename `Tarush_Arora`/`Manak_Jeet_Singh` fixture folders to fake identities
- Extend the guard test so these real tokens stay out of source in future

## Non-goals

- Regenerating PDF fixtures (layout cannot be reproduced faithfully)
- Touching `mock_form16_mapper_input.textproto` (already fake: `ABCDE1234F`,
  `John Doe`, `Test Corp`) or `regimeComparison.test.tsx` (`ABCDE1234F`)
- Replacing non-personal data: public bank/company names (HDFC, ICICI, SBI…),
  stock ISINs (`INE377N01017`…), CIT/government office addresses, place
  names, job designations, generic keywords
- Editing `docs/` (verified clean of PII)
- Any change to parser logic except the single `CESPB` regex hint in
  `extractionConfig.ts`

## Key decisions

- **txt fixtures replace PDFs**: `integration.test.ts` and
  `convert_all.test.ts` read `.txt` files (exact current PDF extraction)
  instead of pdfjs-extracting PDFs. PDFs are deleted. Verified earlier:
  parsing the `.txt` files produces identical results to the PDFs.
- **Folder renames**: `Tarush_Arora` → `Arjun_Sharma`,
  `Manak_Jeet_Singh` → `Priya_Patel`.
- **Generalize integration branching**: replace the
  `if (person === 'Manak_Jeet_Singh') / else if (person === 'Tarush_Arora')`
  special-casing with a branch on count of f16 `.txt` files (1 → standard
  `parseForm16Text`, >1 → detailed `parseForm16ToDetailedBundle`).
- **Fake identity mapping** (canonical — the single source of truth for all
  phases; see table below).
- **Keep non-personal data**: public company/bank names and ISINs stay;
  the numeric PAN/TAN identifiers attached to banks are replaced; CIT office
  addresses, place names, and designations stay.
- **Guard test extension**: `parser.test.ts:780` keeps its existing forbidden
  patterns and gains the newly found real tokens.
- **Generated files hand-mirrored**: edit `proto/*.proto` comments, then apply
  the same edits to `src/generated/*.ts` by hand (avoids `protoc` dependency
  and regeneration noise).
- **sed ordering**: in every replacement batch, longest/full tokens first
  (e.g. full company name before "THOMSON REUTERS", full person name before
  first-name token). Script is ephemeral (`/tmp/opencode/apply_fakes.sh`);
  the mapping lives here so it is reproducible.

## Fake identity mapping

| Real | Fake |
|---|---|
| TARUSH ARORA (tokens: TARUSH, ARORA) | ARJUN SHARMA (ARJUN, SHARMA) |
| CYXPA6852K | ABJPA1234F |
| XXXX XXXX 0899 (aadhaar) | XXXX XXXX 4321 |
| 28/09/1996 (DOB) | 15/03/1993 |
| 9711174075 | 9834567890 |
| tarusharora77@gmail.com | arjun.sharma@example.com |
| 6126833 (serial / control no.) | 1009876 |
| CYXPA6852K202607050242 / …050531 (download IDs) | ABJPA1234F202607050242 / ABJPA1234F202607050531 |
| SFOLYRA / UXBGJYA (certs) | LVKMPR / XZQWBN |
| THOMSON REUTERS INTERNATIONAL SERVICES PRIVATE LIMITED | HORIZON TECH SOLUTIONS PRIVATE LIMITED |
| THOMSON REUTERS | HORIZON TECH |
| MUMI04584G (TAN) | DELM12345F |
| AABCI0605H (PAN) | AABCH1234F |
| Payrollhelpdesk.India@thomsonreuters.com | payroll.helpdesk@horizontech.in |
| 8197124546 (phone, PTC) | 9910112233 |
| Office No. B101, Level 15, WeWork Enam Sambhav, G Block C-20, Bandra Kurla Complex, MUMBAI - 400051 Maharashtra | Level 8, Tower B, Cyber Park, Sector 62, NOIDA - 201309 Uttar Pradesh |
| PARAMETRIC TECHNOLOGY (INDIA) PRIVATE LIMITED | BRIDGE SOFTWARE (INDIA) PRIVATE LIMITED |
| PARAMETRIC TECHNOLOGY | BRIDGE SOFTWARE |
| BLRP15144D (and OCR variant BLRP151440) | BLRM22334F |
| AABCP2629J (PAN) | AABCB4567C |
| SHCHOUDHARY@PTC.COM | HR@BRIDGESOFT.COM |
| KUMAR VIJETA (signatory) / UMESH PRASAD (parent) / UMESH OJHA PRASAD | VIJAY NAMBIAR / RAMESH KRISHNAN |
| ARVIND LAXMAN BODGAL / LAXMAN RAMCHANDRA BODGAL | SANDEEP KULKARNI / GOPAL KULKARNI |
| MANAK JEET SINGH (MANAK, JEET, SINGH) | PRIYA DEVI PATEL (PRIYA, DEVI, PATEL) |
| AFNPS1912F | AEPPA1234F |
| 001526061 (employee code) | 007890123 |
| SUTACXA | TPDMVF |
| OPTUM GLOBAL SOLUTIONS (INDIA) PRIVATE LIMITED | NEXUS HEALTHCARE (INDIA) PRIVATE LIMITED |
| OPTUM GLOBAL SOLUTIONS INDIA PRIVATE LIMITED | NEXUS HEALTHCARE INDIA PRIVATE LIMITED |
| OPTUM GLOBAL / OPTUM / Optum | NEXUS HEALTHCARE / NEXUS / Nexus |
| HYDQ00152F | HYDN44556F |
| AAACQ2188G | AABBN2233C |
| NIKHIL GOSWAMI (NIKHIL, GOSWAMI) | ANITA IYER (ANITA, IYER) |
| NIKHIL_GOSWAMI@UHG.COM | ANITA.IYER@NEXUSHEALTH.IN |
| 1101, GURGAON CITIZEN CGHS, PLOT NO 4, SECTOR 47, SUBHASH CHOWK, GURGAON - 122002 Haryana | D-14, GREEN PARK, SECTOR 15, NOIDA - 201301 Uttar Pradesh |
| 5TH 6TH 7TH OFFICE LEVEL, SUNDEW PROPERTIES SEZ, APIIC LAYOUT,SURVEY NO.64, HITECH CITY, MADHAPUR, HYDERABAD - 500081, Telangana | 4TH 5TH FLOOR, BUSINESS TOWER, INFORMATICS PARK, SECTOR 62, NOIDA - 201309, Uttar Pradesh |
| SHUBHAM BANSAL (SHUBHAM, BANSAL) / Suresh Bansal | ROHAN VERMA (ROHAN, VERMA) / Vijay Verma |
| CESPB7152N | AROHV1234F |
| GOOGLE IT SERVICES INDIA PRIVATE LIMITED / Google IT Services Pvt Ltd | INNOVENTA SYSTEMS INDIA PRIVATE LIMITED / Innoventa Systems Pvt Ltd |
| BLRG25952D | BLRV56789F |
| AAICG1919K | AABBI7890C |
| +(91)91-9063835619 | +(91)98-76543210 |
| apac-psp-ops@google.com | hr@innoventa.in |
| 11th-12th Floor, Carina-West tower, Bagmane constellation, Business park, BANGALORE - 560048 Karnataka | 21st Floor, Skyline Tower, Sector 62, NOIDA - 201309 Uttar Pradesh |
| T2-703 Pareena Coban, Dhankot Sector 99A, Dhankot(49), Gurgaon - 122505 Haryana | A-101, Maple Residency, Sector 49, Gurugram - 122018 Haryana |
| AAACH2702H / AAACS8577K / AAACB1534F / AAACP1206G (bank PANs) | ABCDF1001A / ABCDG1002A / ABCDH1003A / ABCDJ1004A |
| AAACC6233A / AAACC3035G / MUMC09975A | ABCDK1005A / ABCDL1006A / MUMF07777A |

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
- `extractionConfig.ts:167` regex lookahead `CESPB` becomes `AROHV` (first 5
  chars of the new fake employee PAN) so no real token remains in source.

## Phase status

| Phase | Title | Status | Notes |
|---|---|---|---|
| 1 | Fixture transport: PDF → txt, folder renames, rewire tests | done | 2026-07-31 |
| 2 | Anonymize testdata fixtures (txt + textproto) | pending | |
| 3 | Anonymize tests, source comments, proto/generated files | pending | |
| 4 | Verify & close: full suite, lint, PII sweep, NOTES | pending | |

Status values: `pending`, `in-progress`, `done`.

## Phase files

- `phase-1-fixture-transport.md`
- `phase-2-anonymize-testdata.md`
- `phase-3-anonymize-tests-source.md`
- `phase-4-verify-close.md`

## Shared notes

See `NOTES.md` in this directory for running findings/decisions from
execution sessions.
