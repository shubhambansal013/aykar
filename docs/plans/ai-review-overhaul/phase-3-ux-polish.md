# Phase 3: Review results UX polish

## Objective

Add post-review feedback to the AI Review button (completed badge, stale-data
indicator) and improve the `AssistantMessage` results display with a summary
header showing finding counts.

## Dependencies

- Phase 2 must be done (prompts produce a human-readable summary, so the
  results display has something useful to show).

## Responsibilities

This phase touches:
- `src/app/page.tsx` — add `reviewCompleted` state, track data version for
  stale indicator, wire to `ComputationWorksheet`
- `src/app/components/ComputationWorksheet.tsx` — show checkmark badge after
  review, show amber "Re-review" when data changed
- `src/app/components/AssistantMessage.tsx` — add summary header card with
  counts of errors/warnings/info findings

This phase does NOT touch:
- Prompts in `config.ts` (phase 2)
- API route
- Loading state on button (phase 1)

## Todos

- [ ] Add `reviewCompleted` state to `page.tsx` (boolean, initially `false`)
- [ ] After successful AI review response in `handleSendMessage` (after
      `setMessages` at line 672), set `reviewCompleted = true`
- [ ] Reset `reviewCompleted` to `false` when:
      - New files are uploaded
      - User Accepts & Applies AI suggestions
      - New upload in upload section
- [ ] Track data version: add `dataVersion` counter that increments on
      data mutations. Pass to `ComputationWorksheet`.
- [ ] In `ComputationWorksheet`:
      - Show "✓ Reviewed" text or green badge when `reviewCompleted` is true
      - Show amber "Re-review" when data has changed since last review
- [ ] In `AssistantMessage.tsx`:
      - Add summary card at top of recommendations: "Review Summary —
        X errors, Y warnings, Z suggestions"
      - When `recommendations` is empty, show green "✅ All checks passed"
- [ ] Update tests for new states (`reviewCompleted`, data version tracking,
      summary header)

## Acceptance criteria

- After AI review completes, button shows "✓ Reviewed" state
- If user edits data post-review, button switches to amber "Re-review"
- AssistantMessage shows summary header with finding counts
- Empty findings show "✅ All checks passed" visually
- All tests pass
