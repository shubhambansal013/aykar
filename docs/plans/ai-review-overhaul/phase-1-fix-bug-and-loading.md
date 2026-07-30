# Phase 1: Fix bug + button loading state

## Objective

Fix the primary "not working" issue: right panel tab not switching to 'chat'
on AI Review click. Add loading state to the button to prevent duplicate
submissions. This is the minimum viable fix.

## Dependencies

- None — standalone phase.

## Responsibilities

This phase touches:
- `src/app/page.tsx` — add `setRightPanelTab('chat')` in `handleSendMessage`
  when `isReviewRequest` is true; pass `chatLoading` to `ComputationWorksheet`
- `src/app/components/ComputationWorksheet.tsx` — accept `chatLoading` prop,
  show disabled+spinner state on the AI Review button
- `src/app/page.test.tsx` — add test for tab state after AI Review click;
  verify button is disabled while loading

This phase does NOT touch:
- AI prompts (`src/lib/ai/config.ts`)
- `AssistantMessage.tsx` or `ChatPanel.tsx`
- Any routing logic or server-side code

## Todos

- [x] In `handleSendMessage` (page.tsx:626), add `setRightPanelTab('chat')`
      when `isReviewRequest` is true (after `setChatOpen(true)`)
- [x] Add `chatLoading` prop to `ComputationWorksheet` interface
- [x] In `ComputationWorksheet` button (lines 84-94), show disabled state
      + `CircularProgress` spinner when `chatLoading` is true; label "Reviewing…"
- [x] Wire `chatLoading` from `page.tsx` into `<ComputationWorksheet>`
- [x] Update test at `page.test.tsx:174` to verify `rightPanelTab` switches
      to `'chat'` after clicking AI Review
- [x] Add test that AI Review button is disabled while `chatLoading` is true

## Acceptance criteria

- Clicking AI Review opens right panel AND switches to chat tab (even if
  user was on Inspect tab)
- AI Review button shows spinner + "Reviewing…" while request is in flight
- Button is non-clickable during loading (prevents duplicate submissions)
- All existing tests pass
- New tests cover tab state and disabled state
