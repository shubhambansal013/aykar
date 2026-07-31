# Phase 3: Anonymize tests, source comments, proto/generated files

## Objective

Replace the real PII tokens that remain in test files, source comments, proto
definitions, and generated TypeScript comments, using the same canonical
mapping. Also extend the existing "no user-specific hardcoding" guard test
and update the single PAN-prefix regex hint in `extractionConfig.ts`.

## Dependencies

- Requires Phase 2 `done` (fixtures clean; testdata not touched here).
- Read first: `PLAN.md` mapping table.
- Read the full current content of `src/lib/form16/parser.test.ts` before
  editing (it is the biggest file; several assertions embed real tokens).

## Responsibilities

- All PII outside `testdata/`. Files:
  - `src/lib/form16/parser.test.ts`
  - `src/lib/ais/parser.test.ts`
  - `src/lib/tis/parser.test.ts`
  - `src/lib/form26as/parser.test.ts`
  - `src/lib/itr/reconciliation.test.ts`
  - `src/lib/itr/validator.test.ts`
  - `src/lib/itr/taxEngine.test.ts`
  - `src/lib/form16/CompletenessReporter.test.ts`
  - `src/lib/form16/FormatDetector.test.ts`
  - `src/lib/form16/DetailedForm16Parser.ts` (comments only)
  - `src/lib/form16/extractionConfig.ts` (single PAN-prefix regex lookahead)
  - `proto/sources/form16.proto`, `proto/common/common.proto` (comments)
  - `src/generated/sources/form16.ts`, `src/generated/common/common.ts`
    (hand-mirror the proto comment edits — do not rely on `protoc`)
- **Do not** touch testdata, parser logic beyond the regex hint, or
  `mock_form16_mapper_input.textproto`.
- **Do not** change public entity names, ISINs, CIT addresses, place names,
  or designations in test fixtures.

## Todos

- [ ] `src/lib/form16/parser.test.ts` (the third-employee block, lines ~280-390,
      660-740, and line 386):
  - [ ] third-employee full name → ROHAN VERMA (also first/last name tokens)
  - [ ] father name → Vijay Verma
  - [ ] Employer D registered/short name → INNOVENTA SYSTEMS INDIA PRIVATE
        LIMITED / Innoventa Systems Pvt Ltd
  - [ ] employee PAN → AROHV1234F; employer TAN → BLRV56789F; employer PAN →
        AABBI7890C
  - [ ] employee mobile → +(91)98-76543210; employer contact email →
        hr@innoventa.in
  - [ ] the Bangalore office address → `21st Floor, Skyline Tower, Sector 62,
        NOIDA - 201309 Uttar Pradesh` (also update the two assertions that
        embed this string)
  - [ ] the Gurgaon home address → `A-101, Maple Residency, Sector 49,
        Gurugram - 122018 Haryana` (also the `extractNameFromBlock` assertion
        at line 386)
  - [ ] Extend `forbiddenPatterns` (line ~780) with the real employer names,
        person names, PANs and TANs found across the mapping (keep existing
        entries)
- [ ] `src/lib/ais/parser.test.ts`: Employer A block → HORIZON TECH
      (+TAN→DELM12345F), Employer B block → BRIDGE SOFTWARE
      (+TAN→BLRM22334F), download ID + employee header (lines ~172-175) →
      ABJPA1234F / ARJUN SHARMA, bank PAN in the SFT test → ABCDK1005A
- [ ] `src/lib/tis/parser.test.ts`: `Salary from <Employer C short name>` →
      `Salary from Nexus`
- [ ] `src/lib/form26as/parser.test.ts`: Employer C names → NEXUS HEALTHCARE,
      `NEXUS HEALTHCARE INDIA PRIVATE LIMITED`, TAN → HYDN44556F
- [ ] `src/lib/itr/reconciliation.test.ts`: Employer C → NEXUS HEALTHCARE,
      TAN → HYDN44556F, PAN → AABBN2233C, employee name tokens →
      PRIYA/DEVI/PATEL, PAN → AEPPA1234F
- [ ] `src/lib/itr/validator.test.ts`: Employer C → NEXUS, TAN → HYDN44556F,
      PAN → AABBN2233C
- [ ] `src/lib/itr/taxEngine.test.ts`: test names for the first employee
      scenario (lines ~593, 646) → "Arjun Sharma scenario"; the employee
      data var → `arjunData`
- [ ] `src/lib/form16/CompletenessReporter.test.ts`: Employer A TAN →
      DELM12345F, PAN → AABCH1234F, employee PAN → ABJPA1234F
- [ ] `src/lib/form16/FormatDetector.test.ts`: `Employer: <Employer A short
      name>` → `Employer: HORIZON TECH`
- [ ] `src/lib/form16/DetailedForm16Parser.ts` (~lines 104-109): docstring
      employee name/PAN example → generic `<EMPLOYEE NAME>`/`<EMPLOYEE PAN>`
      placeholders (at close, so the guard can cover all fixture identities)
- [ ] `src/lib/form16/extractionConfig.ts:167`: regex lookahead (real PAN
      prefix) → `AROHV`
- [ ] `proto/sources/form16.proto` comments: certificate example pair →
      `"XZQWBN" or "LVKMPR"`, employer name → `"BRIDGE SOFTWARE..."`, contact
      email → `"hr@bridgesoft.com"`, phone → `"+(91)80-23456789"`
- [ ] `proto/common/common.proto` comments: download ID →
      `"ABJPA1234F202607050242"`; aadhaar → `"XXXX XXXX 4321"`
- [ ] `src/generated/sources/form16.ts` and `src/generated/common/common.ts`:
      apply the identical comment edits by hand (they mirror the proto
      comments); if `protoc`/`npm run proto:generate` is available, verify
      regeneration produces no diff beyond these lines, otherwise skip
- [ ] `rg` sweep over `src/ proto/` (exclude testdata) for every real token
      replaced by the mapping → zero hits
- [ ] Run `npx vitest run src/lib` — must pass (including the extended guard
      test)
- [ ] Commit: `test: scrub real PII from tests and source comments`

## Acceptance criteria

- Zero real-token hits across `src/` (excluding `testdata/`) and `proto/`
- `npm run test` green
- Guard test still scans the parser sources and passes
