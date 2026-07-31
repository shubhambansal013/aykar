# Phase 2: Anonymize testdata fixtures (txt + textproto)

## Objective

Apply the canonical fake-identity mapping (PLAN.md table) to every fixture
file under `src/lib/itr/testdata/Arjun_Sharma/` and
`src/lib/itr/testdata/Priya_Patel/` — both `*.txt` and `*.textproto`.
The integration tests must still pass, proving the fake text fixtures parse to
the fake expected textprotos exactly like the real ones did.

## Dependencies

- Requires Phase 1 `done` (folders renamed, fixtures are `.txt`).
- Read first: `PLAN.md` (the mapping table is the single source of truth).

## Responsibilities

- Apply replacements to `*.txt` and `*.textproto` in the two person dirs only.
- **Do not** touch `mock_form16_mapper_input.textproto`.
- **Do not** touch any file under `src/lib/` outside testdata (that's Phase 3).
- Keep non-personal tokens (bank names, ISINs, `.AB###` suffixes, CIT
  addresses, place names, designations, `mtnlTrustLine...`).

## Todos

- [ ] Write `/tmp/opencode/apply_fakes.sh` — an ordered `sed -i` batch.
  Ordering rule: longest/full token first (see PLAN.md decisions). Build it
  with `#!/usr/bin/env bash` + `sed -i -e 's/FULL TOKEN/FAKE/g' ...` pairs.
- [ ] Run it over every `*.txt` and `*.textproto` under both person dirs
- [ ] Manually verify a sample: `f16_1.txt` header block, `expected_form16.textproto`
      taxpayer/employer/signatory blocks, `ais.txt` bank-PAN lines
- [ ] `rg` the two dirs for a spot-check of real tokens (should be zero):
      `TARUSH|ARORA|MANAK|JEET|SINGH|NIKHIL|GOSWAMI|VIJETA|UMESH|BODGAL|THOMSON|REUTERS|PARAMETRIC|OPTUM|CYXPA6852K|AFNPS|AAACQ2188G|MUMI04584G|BLRP15144|HYDQ00152F|CESPB|BLRG25952D|AAICG1919K|SHCHOUDHARY|UHG.COM|Payrollhelpdesk|tarusharora77|9711174075|8197124546|9063835619|6126833|001526061|0899|SFOLYRA|UXBGJYA|SUTACXA`
- [ ] Run `npx vitest run src/lib/itr/integration.test.ts` — must pass (fake
      txt → fake expected textproto)
- [ ] Commit: `test: replace real PII in fixture data with fake identities`

## Acceptance criteria

- Zero real-token hits in both person dirs (rg sweep above)
- `integration.test.ts` passes
- `mock_form16_mapper_input.textproto` untouched (git diff excludes it)
