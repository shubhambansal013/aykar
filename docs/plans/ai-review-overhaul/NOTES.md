# Notes

Running log for future sessions working on this plan. Append entries as you
go during execution. Newest at the bottom.

---

## 2026-07-30 — Phase 2 complete

- Removed `if (isReview)` block (lines 77-79) from `route.ts` that appended `reviewPrompt` to `contextPrompt` — now only injects as user message
- Changed `systemPrompt` in `config.ts`: "For ANY subsequent chat message" → "When you identify corrections or discrepancies"
- Rewrote `reviewPrompt` in `config.ts`:
  - Added instruction for human-readable summary first (1-3 sentences)
  - Removed strict "Do NOT return raw markdown text" constraint
  - Added severity grouping order (critical errors → warnings → tax-saving opportunities)
- `AssistantMessage.tsx`: Shows green "✅ All checks passed" card when recommendations is empty; suppresses "AI Suggested Updates" card when both recommendations and diffs are empty
- Added 2 new tests in `AssistantMessage.test.tsx`: empty recommendations success card, suppressed card when both empty
- Added 1 new test in `route.test.ts`: verifies reviewPrompt is sent as user message only, not in systemInstruction

## 2026-07-30 — Phase 3 complete

- Added `reviewCompleted`, `reviewDataVersion`, `dataVersion` states to `page.tsx`
- After successful AI review response, `reviewCompleted` set to true, `reviewDataVersion` captured at `dataVersion`
- `dataVersion` incremented in `reRunReconciliation`, `handleAcceptProposal`, and `updateNestedValue`
- `reviewCompleted` only reset in `handleAcceptProposal` (not on uploads — re-review state handles that via version comparison)
- ComputationWorksheet: new `reviewCompleted`, `reviewDataVersion`, `dataVersion` props
- Button section shows:
  - `dataVersion === reviewDataVersion` → green "✓ Reviewed" Chip
  - `dataVersion > reviewDataVersion` → amber "Re-review" button
  - `!reviewCompleted` → normal "AI Review" button
- AssistantMessage: summary header card with severity counts (errors/warnings/suggestions) — shown before recommendations
- Updated existing page test (`disables AI Review button` now checks for `review-completed-badge`)
- Two new page tests: `shows ✓ Reviewed badge after AI Review completes`, `shows Re-review button when data changes after review`
- One new AssistantMessage test: `shows summary header with correct severity counts`
- Total: 35 tests pass

## 2026-07-30 — Phase 1 complete

- Added `setRightPanelTab('chat')` in `handleSendMessage` when `isReviewRequest` is true (line 647 in page.tsx)
- Added `chatLoading` prop to `ComputationWorksheet` interface, wired from `page.tsx`
- AI Review button shows `CircularProgress` spinner + "Reviewing…" text when `chatLoading` is true; button is disabled
- Existing AI Review test updated to verify tab switches to 'chat' (first opens right panel on 'inspect', then clicks AI Review)
- New test: `disables AI Review button while request is in flight` — uses hanging fetch promise to check disabled state mid-flight
- Note: `toBeDisabled` matcher from `@testing-library/jest-dom` is NOT available (package not installed), used raw `.disabled` property checks instead
- Also verified with `.getAttribute('aria-selected')` for tab state (same constraint)
