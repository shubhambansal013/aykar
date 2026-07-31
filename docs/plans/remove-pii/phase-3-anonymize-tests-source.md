# Phase 3: Anonymize tests, source comments, proto/generated files

## Objective

Replace the real PII tokens that remain in test files, source comments, proto
definitions, and generated TypeScript comments, using the same canonical
mapping. Also extend the existing "no user-specific hardcoding" guard test
and update the single `CESPB` regex hint in `extractionConfig.ts`.

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
  - `src/lib/form16/extractionConfig.ts` (single `CESPB` regex lookahead)
  - `proto/sources/form16.proto`, `proto/common/common.proto` (comments)
  - `src/generated/sources/form16.ts`, `src/generated/common/common.ts`
    (hand-mirror the proto comment edits — do not rely on `protoc`)
- **Do not** touch testdata, parser logic beyond the regex hint, or
  `mock_form16_mapper_input.textproto`.
- **Do not** change public entity names, ISINs, CIT addresses, place names,
  or designations in test fixtures.

## Todos

- [ ] `src/lib/form16/parser.test.ts` (the Google/Shubham block, lines ~280-390,
      660-740, and line 386):
  - [ ] SHUBHAM BANSAL → ROHAN VERMA (also SHUBHAM, BANSAL tokens)
  - [ ] Suresh Bansal → Vijay Verma
  - [ ] GOOGLE IT SERVICES INDIA PRIVATE LIMITED → INNOVENTA SYSTEMS INDIA
        PRIVATE LIMITED; `Google IT Services Pvt Ltd` → `Innoventa Systems Pvt Ltd`
  - [ ] CESPB7152N → AROHV1234F; BLRG25952D → BLRV56789F; AAICG1919K → AABBI7890C
  - [ ] +(91)91-9063835619 → +(91)98-76543210; apac-psp-ops@google.com →
        hr@innoventa.in
  - [ ] `11th-12th Floor, Carina-West tower, Bagmane constellation, Business
        park, BANGALORE - 560048 Karnataka` → `21st Floor, Skyline Tower,
        Sector 62, NOIDA - 201309 Uttar Pradesh` (also update the two
        assertions that embed this string)
  - [ ] `T2-703 Pareena Coban, Dhankot Sector 99A, Dhankot(49), Gurgaon -
        122505 Haryana` → `A-101, Maple Residency, Sector 49, Gurugram -
        122018 Haryana` (also the `extractNameFromBlock` assertion at line 386)
  - [ ] Extend `forbiddenPatterns` (line ~780) with: GOOGLE IT SERVICES,
        OPTUM GLOBAL, TARUSH ARORA, MANAK JEET SINGH, SHUBHAM BANSAL,
        NIKHIL GOSWAMI, CESPB7152N, BLRG25952D, AAICG1919K, AFNPS1912F,
        CYXPA6852K, MUMI04584G, BLRP15144D (keep existing entries)
- [ ] `src/lib/ais/parser.test.ts`: THOMSON REUTERS block → HORIZON TECH
      (+MUMI04584G→DELM12345F), PARAMETRIC block → BRIDGE SOFTWARE
      (+BLRP15144D→BLRM22334F), download ID + `CYXPA6852K  TARUSH ARORA`
      header (lines ~172-175) → ABJPA1234F / ARJUN SHARMA, bank PAN
      `AAACC6233A` in the SFT test → ABCDK1005A
- [ ] `src/lib/tis/parser.test.ts`: `Salary from Optum` → `Salary from Nexus`
- [ ] `src/lib/form26as/parser.test.ts`: OPTUM GLOBAL → NEXUS HEALTHCARE,
      `OPTUM GLOBAL SOLUTIONS INDIA PRIVATE LIMITED` → `NEXUS HEALTHCARE
      INDIA PRIVATE LIMITED`, HYDQ00152F → HYDN44556F
- [ ] `src/lib/itr/reconciliation.test.ts`: OPTUM GLOBAL → NEXUS HEALTHCARE,
      HYDQ00152F → HYDN44556F, AAACQ2188G → AABBN2233C, MANAK/JEET/SINGH →
      PRIYA/DEVI/PATEL, AFNPS1912F → AEPPA1234F
- [ ] `src/lib/itr/validator.test.ts`: OPTUM → NEXUS, HYDQ00152F → HYDN44556F,
      AAACQ2188G → AABBN2233C
- [ ] `src/lib/itr/taxEngine.test.ts`: test names "Tarush Arora scenario"
      (lines ~593, 646) → "Arjun Sharma scenario"; `tarushData` var →
      `arjunData`
- [ ] `src/lib/form16/CompletenessReporter.test.ts`: MUMI04584G → DELM12345F,
      AABCI0605H → AABCH1234F, CYXPA6852K → ABJPA1234F
- [ ] `src/lib/form16/FormatDetector.test.ts`: `Employer: THOMSON REUTERS` →
      `Employer: HORIZON TECH`
- [ ] `src/lib/form16/DetailedForm16Parser.ts` (~lines 104-109): comment
      `TARUSH ARORA` → `ARJUN SHARMA`, `CYXPA6852K` → `ABJPA1234F`
- [ ] `src/lib/form16/extractionConfig.ts:167`: regex lookahead `CESPB` →
      `AROHV`
- [ ] `proto/sources/form16.proto` comments: certificate example
      `"UXBGJYA" or "SFOLYRA"` → `"XZQWBN" or "LVKMPR"`, name
      `"PARAMETRIC TECHNOLOGY..."` → `"BRIDGE SOFTWARE..."`, email
      `"shchoudhary@ptc.com"` → `"hr@bridgesoft.com"`, phone
      `"+(91)80-8197124546"` → `"+(91)80-23456789"`
- [ ] `proto/common/common.proto` comments: `"CYXPA6852K202607050242"` →
      `"ABJPA1234F202607050242"`; `"XXXX XXXX 0899"` → `"XXXX XXXX 4321"`
- [ ] `src/generated/sources/form16.ts` and `src/generated/common/common.ts`:
      apply the identical comment edits by hand (they mirror the proto
      comments); if `protoc`/`npm run proto:generate` is available, verify
      regeneration produces no diff beyond these lines, otherwise skip
- [ ] `rg` sweep over `src/ proto/` (exclude testdata) for every real token
      in the PLAN.md table → zero hits
- [ ] Run `npx vitest run src/lib` — must pass (including the extended guard
      test)
- [ ] Commit: `test: scrub real PII from tests and source comments`

## Acceptance criteria

- Zero real-token hits across `src/` (excluding `testdata/`) and `proto/`
- `npm run test` green
- Guard test still scans the parser sources and passes
