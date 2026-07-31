# Phase 4: Verify & close — full suite, lint, PII sweep, NOTES

## Objective

Final verification that the repo is free of the real PII tokens, that the
whole suite and lint pass, that no fixture/PDF/temp debris remains, and that
the plan is marked complete with NOTES recorded for posterity.

## Dependencies

- Requires Phases 1-3 `done`.

## Responsibilities

- Read-only verification plus NOTES/PLAN bookkeeping. No further PII edits
  unless the sweep finds stragglers (then fix and re-run).
- Do not change unrelated files.

## Todos

- [ ] `rg` the whole repo (excluding `.git`, `node_modules`, `.next`) for
      every real token replaced by the mapping → zero hits. Also sweep fuzzy
      variants (company short forms, office-address landmarks, email
      usernames/domains, person-name tokens, certificate codes)
- [ ] Confirm no `*.pdf`, `*_extracted.txt`, or `tmp_*.test.ts` under
      `src/lib/itr/`; confirm folders are `Arjun_Sharma`/`Priya_Patel`
- [ ] `npm run test` (full suite + coverage) — green
- [ ] `npm run lint` — clean
- [ ] `git status` clean except intended changes; `git log --oneline -6`
      shows the per-phase commits
- [ ] Append NOTES.md entries for all four phases (what changed, the sed
      script location, any gotchas)
- [ ] Mark Phases 1-4 `done` in `PLAN.md` status table with dates/summaries
- [ ] Final commit: `docs: plan remove-pii — completed`

## Acceptance criteria

- PII sweep is clean repo-wide
- Full suite + lint pass
- `PLAN.md` shows all phases `done`; NOTES.md documents the session(s)
