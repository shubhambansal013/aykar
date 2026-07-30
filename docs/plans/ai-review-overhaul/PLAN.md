# Plan: AI Review Overhaul

## Overview

The AI Review button on the ComputationWorksheet triggers a structured review
of extracted Form-16 data via Gemini. It has a critical UX bug (right panel
tab not switching) and the prompts that drive the review are poorly structured
(duplicate injection, no human-readable summary, rigid JSON-only output).
This plan fixes the bug, rewrites the prompts to produce genuinely useful
reviews, and polishes the UX around the button and review results display.

## Goals

- Fix the AI Review button so it reliably opens the right panel on the chat tab
- Prevent duplicate review submissions (loading state on button)
- Rewrite `reviewPrompt` and `systemPrompt` so the AI outputs a readable
  summary first, followed by structured JSON
- Remove duplicate prompt injection (currently `reviewPrompt` is appended to
  both the system instruction AND sent as a user message)
- Add review-completed badge and stale-data re-review indicator on the button
- Add a summary header in `AssistantMessage` showing finding counts

## Non-goals

- Streaming AI responses (SSE from API route)
- Keyboard shortcuts
- Auto-trigger review on file upload
- Model selector improvements or model list cleanup

## Key decisions

- **Single injection of reviewPrompt**: The `reviewPrompt` will only be sent
  as the user message, NOT appended to the system instruction.
- **Summary-first format**: Rewrite `reviewPrompt` to ask the AI to output a
  brief human-readable summary before the structured JSON block.
- **Button loading via `chatLoading` prop**: Pass existing `chatLoading` state
  downstream rather than adding a new state.
- **Review completed state in `page.tsx`**: Track whether a review has been run
  on the current data; resets on new upload or data mutation.

## Phase status

| Phase | Title | Status | Notes |
|---|---|---|---|
| 1 | Fix bug + button loading state | ✅ Done | 2026-07-30 — Added setRightPanelTab('chat') in handleSendMessage for AI Review; wired chatLoading prop through ComputationWorksheet with disabled+spinner state |
| 2 | Rewrite AI review prompts | pending | Depends on phase 1 |
| 3 | Review results UX polish | pending | Depends on phase 2 |

## Phase files

- `ai-review-overhaul-phase-1.md`
- `ai-review-overhaul-phase-2.md`
- `ai-review-overhaul-phase-3.md`

## Shared notes

See `ai-review-overhaul-NOTES.md` in this directory for running findings.
