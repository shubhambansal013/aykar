# Notes

Running log for future sessions working on this plan. Append entries as you
go during execution — don't wait until the end of a session. Keep entries
short. Newest at the bottom.

Suggested entry format:

```
## <date or phase label>
- Finding/decision/gotcha, one or two lines.
```

## 2026-07-31 (phase 1)
- Transport done: `.txt` fixtures now byte-exact pdfjs extraction (only diffs
  were trailing spaces/blank lines from extraction). Folders renamed to
  `Arjun_Sharma`/`Priya_Patel`, all PDFs + `*_extracted.txt` + `tmp_*.test.ts`
  deleted.
- `integration.test.ts` rewritten: no pdfjs/polyfills, f16 discovered via
  `*.txt` glob, branched on f16 count (1 → `parseForm16Text`, >1 →
  `parseForm16ToDetailedBundle`). Dropped async/aitimeouts (now sync reads).
- Removed the AIS employer-TAN→OCR-variant normalize loop:
  `expected_ais.textproto` has empty `tds_tcs_info`, so the loop was a no-op
  on both sides.
- `convert_all.test.ts` rewritten to read `.txt`; regenerated
  `expected_*.textproto` are byte-identical (no diff).
- Full suite green: 31 files / 322 tests.

## 2026-07-31 (planning)
- Plan originally created under `.opencode/plans/remove-pii/` because the
  sandbox's edit permission allow-list only permitted `.opencode/plans/*.md`
  and denied `docs/plans/`. This was wrong per the skill: plans must live in
  the repo's tracked `docs/plans/`. Moved to `docs/plans/remove-pii/` via
  `git mv` (commit `97d62d2`), deleted the `.opencode/plans/` tree, and
  updated the phased-planning skill to forbid silent relocation and to treat
  `docs/plans/` write blocks as tooling misconfig.

## 2026-07-31 (phase 2)
- Applied the canonical mapping via `/tmp/opencode/apply_fakes.sh` (ordered
  sed, longest tokens first) over all `*.txt` + `*.textproto` in both person
  dirs. `integration.test.ts`, `convert_all.test.ts` (regenerates expected
  textprotos, no extra diff) and full `src/lib` suite green.
- Mapping table extensions (added to PLAN.md): the Employer C phone →
  `+(91)40-23456789`; the signatory's parent name → `KARTHIK RAO`; the
  employee home address → `11/22 HOUSE NO.22, GREEN VIEW COLONY, EAST DELHI -
  110096`.
- Sed gotchas: BRE treats `\(` as a group (not a literal paren), so the
  phone pattern had to match only the trailing digits; and single-word
  person-name tokens must be applied AFTER the signatory email pattern or
  they corrupt it first.
- Office-address chunks were split across lines, so they needed
  standalone-token fallbacks (e.g. the SEZ-name token → `BUSINESS TOWER`).
- Kept per plan: Phoenix Towers/Museum Road (commercial office address),
  CIT/office addresses, `MUMBAI`/`BANGALORE`/`HYDERABAD` place names, bank
  names, ISINs, `.AB###`/`.AZ670` suffix codes, `mtnlTrustLine` CA.
- AIS/TIS txt uses `,` separators while expected textprotos use `, `, so
  employee-address replacement was done via format-agnostic tokens
  (house-plot prefix, colony name, PIN) instead of full-line strings.

## 2026-07-31 (phase 3)
- Applied canonical mapping to all PII outside `testdata/`: parser tests
  (form16/ais/tis/form26as/itr), source comments, proto + `src/generated/`
  (hand-mirrored; `protoc` not installed so regeneration check skipped).
- Guard test `forbiddenPatterns` extended with the newly found real tokens
  (names, PANs, TANs, employer strings). Later re-based onto the fake
  identities at close-out (see final entry).
- The form16 parser test also carried the second-employer block (not listed
  in the phase-3 todo, but required for the zero-hit sweep) — replaced
  consistently; renamed the employer-C text var → `nexusForm16Text`.
- `extractionConfig.ts:167` regex lookahead (real PAN prefix) → `AROHV`
  (first 5 chars of the fake employee PAN).
- Minimal non-comment change: `DetailedForm16Parser.ts:234` email fallback
  heuristic updated to the fake payroll-email pattern (redundant with the
  `@` check; removed entirely at close so no fixture identity remains in
  parser source).
- A real deductor TAN in `form26as/parser.test.ts:61` input text was
  initially missed — caught by sweep, fixed.
- Replaced concatenated SFT deductor PANs (a real PAN and a bank TAN glued
  together) with fake concatenations (AIS parser regex matches TAN format;
  not asserted).
- Full suite green: 31 files / 517 tests. `npm run lint` clean.

## 2026-07-31 (phase 4)
- Verification sweep: repo-wide `rg` of every real token + fuzzy variants →
  zero hits except the plan docs, the guard block, and an unrelated
  speaker-name enum value in generated `cloudflare-env.d.ts` (false positive,
  kept).
- No `*.pdf`, `*_extracted.txt`, or `tmp_*.test.ts` remain under
  `src/lib/itr/`; folders are `Arjun_Sharma`/`Priya_Patel`;
  `mock_form16_mapper_input.textproto` untouched.
- Full suite green: 31 files / 517 tests (+ coverage 88.89% stmts). `npm run
  lint` clean.
- The `/tmp/opencode/apply_fakes.sh` sed script was the ephemeral mechanism
  for the phase-2 mapping; it no longer exists after the sandbox temp
  cleanup.

## 2026-07-31 (final redaction close-out)
- Per explicit request, real tokens were scrubbed from EVERYTHING, including
  the plan docs (`PLAN.md`, `NOTES.md`, all four phase files) and the guard
  test itself. The `PLAN.md` mapping table now lists data categories + fake
  values only.
- Guard test re-based: `forbiddenPatterns` now scans parser sources for the
  canonical fake fixture identities (names, PANs, TANs, employers) instead of
  real tokens. Two parser-source changes were required so the guard holds:
  - `DetailedForm16Parser.ts` docstring example made generic
    (`<EMPLOYEE NAME>` / `<EMPLOYEE PAN>` placeholders).
  - `DetailedForm16Parser.ts:234` removed the redundant payroll-email
    fallback (already covered by the `@` check).
  - The PAN-prefix regex lookahead in `extractionConfig.ts:167` stays
    (functional); the guard checks the full fake-PAN token instead.
- Dropped the pre-existing guard entry naming a real developer name.
- Final repo-wide sweep (no exclusions): zero real-token hits; the only match
  is the unrelated speaker-name enum value in generated
  `cloudflare-env.d.ts`, which is not PII and stays.
- Caveat: git history (`.git/`) still contains the pre-redaction content and
  is intentionally not rewritten.

---
