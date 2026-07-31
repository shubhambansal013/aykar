# Phase 1: Fixture transport — PDF → txt, folder renames, rewire tests

## Objective

Move the integration test fixtures off the real PDFs onto `.txt` extracted
text (byte-exact current PDF extraction), rename the person folders to fake
identities, and rewire the two PDF-reading tests. At the end of this phase the
suite is green with the real data still present — but stored only as `.txt`.
No PII replacement happens here; that's Phase 2.

## Dependencies

- Requires Phase: none.
- Read first: `PLAN.md` (mapping + decisions) and `NOTES.md`.
- Files to read before starting:
  - `src/lib/itr/integration.test.ts` (current PDF flow, polyfills, hardcoded
    person-name branching at lines 117/123, OCR normalize hack at 150-159)
  - `src/lib/proto/convert_all.test.ts` (hardcoded PDF paths)
  - `src/lib/itr/testdata/` layout (both person dirs)

## Responsibilities

- Create/replace `.txt` fixtures from the `*_extracted.txt` files already in
  the tree (untracked temp copies of the current PDF extraction).
- `git mv` the original person folder → `Arjun_Sharma`, the second original
  person folder → `Priya_Patel`.
- Rewrite `integration.test.ts` to read `.txt` (no pdfjs), generalize person
  branching by f16-file count, and drop the now-unneeded polyfills and the
  AIS employer-TAN→OCR-variant normalize block.
- Rewrite `convert_all.test.ts` to read `.txt` with the new folder names.
- Delete all `*.pdf`, all `*_extracted.txt`, `src/lib/itr/tmp_dump.test.ts`,
  and `src/lib/itr/tmp_verify.test.ts`.
- Do **not** change any fixture data values or any other test file.

## Todos

- [ ] `cp` each `{first person dir}/{f16_1,f16_2,f16_3,ais,tis,f26as}_extracted.txt`
      over its `.txt` sibling; `cp` `{second person dir}/f16_1_extracted.txt`
      → `{second person dir}/f16_1.txt`
- [ ] `git mv` the first original person folder → `Arjun_Sharma`, the second
      original person folder → `Priya_Patel`
- [ ] Rewrite `integration.test.ts`:
  - [ ] Drop `extractTextFromPDF` import and the `webcrypto`/`DOMMatrix`/
        `Promise.try` polyfills (they existed only for pdfjs)
  - [ ] f16: discover `*.txt` files starting with `f16` (or `sample_form16` /
        containing `form16`); `fs.readFileSync(...)` each
  - [ ] AIS/TIS/26AS: read `ais.txt` / `tis.txt` / `f26as.txt`
  - [ ] Branch on f16 count: `=== 1` → `parseForm16Text(texts[0])`, `> 1` →
        `parseForm16ToDetailedBundle(texts)` (no folder-name checks)
  - [ ] Remove the AIS employer-TAN→OCR-variant normalize loop
  - [ ] Keep the `person.replace(/_/g, ' ')` describe labels and dynamic
        folder discovery as-is
- [ ] Rewrite `convert_all.test.ts`: read `.txt` files, use
      `Arjun_Sharma`/`Priya_Patel` paths, drop `extractTextFromPDF`
- [ ] `rm` all `*.pdf` and `*_extracted.txt` under both person dirs; `rm`
      `src/lib/itr/tmp_dump.test.ts` `src/lib/itr/tmp_verify.test.ts`
- [ ] Run `npx vitest run src/lib/itr/integration.test.ts src/lib/proto/convert_all.test.ts`
      — should pass (real data still in fixtures)
- [ ] Run `convert_all.test.ts` once and confirm it regenerates
      `expected_*.textproto` without meaningful diff (canonicalize fixtures)
- [ ] Run full `npm run test`; fix any fallout
- [ ] Commit: `fix: switch integration fixtures from PDF to txt and rename person folders`

## Acceptance criteria

- No `.pdf`, `*_extracted.txt`, or `tmp_*.test.ts` files remain under
  `src/lib/itr/`
- Folders are `Arjun_Sharma` and `Priya_Patel` (plus `mock_form16_mapper_input.textproto`)
- `integration.test.ts` / `convert_all.test.ts` contain no pdfjs usage and no
  hardcoded person-folder names in logic
- `npm run test` green
