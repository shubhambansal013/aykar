# Phase 2: Rewrite AI review prompts

## Objective

Rewrite `reviewPrompt` and `systemPrompt` in `src/lib/ai/config.ts` and fix
the duplicate injection in `src/app/api/chat/route.ts` so the AI review
produces genuinely useful output: a human-readable summary first, followed
by structured JSON.

## Dependencies

- Phase 1 must be done (so the button reliably opens the right panel on the
  correct tab before we improve what the AI says).

## Responsibilities

This phase touches:
- `src/lib/ai/config.ts` — rewrite `reviewPrompt` and adjust `systemPrompt`
- `src/app/api/chat/route.ts` — remove duplicate injection of `reviewPrompt`
  from system context (lines 77-79)
- `src/app/components/AssistantMessage.tsx` — handle empty recommendations
  with "✅ No issues found" state; suppress empty "AI Suggested Updates" card
- Test files: update any prompt-related assertions

This phase does NOT touch:
- Button loading or disabled state (phase 1)
- Review badges or stale indicators (phase 3)
- New states in `page.tsx` beyond what phase 1 added

## Todos

- [x] Fix duplicate injection: Remove lines 77-79 from `route.ts` (appending
      `reviewPrompt` to `contextPrompt`)
- [x] Rewrite `reviewPrompt` in `config.ts`:
      - Add instruction: "First provide a brief human-readable summary of
        your findings (1-3 sentences about what you checked and what you
        found). Then output the structured JSON block."
      - Remove the strict "Do NOT return raw markdown text" constraint
      - Add: "Group recommendations by severity: critical errors first,
        then warnings, then tax-saving opportunities."
- [x] Adjust `systemPrompt` in `config.ts`:
      - Change "For ANY subsequent chat message" to "When you identify
        corrections or discrepancies, output a structured JSON block..."
      - Keep the JSON schema definition as-is
- [x] In `AssistantMessage.tsx`: when `recommendations` is empty, show
      green "✅ All checks passed" card instead of nothing
- [x] In `AssistantMessage.tsx`: when `diffs.length === 0` AND `recommendations.length === 0`, suppress the "AI Suggested Updates" card entirely
- [x] Update tests in `page.test.tsx` and `route.test.ts` that assert on
      prompt content or response format
- [x] Run `npm run test` to verify everything passes

## Acceptance criteria

- `reviewPrompt` is injected exactly once (as the user message, not in system context)
- AI response includes a human-readable summary before the JSON block
- Empty recommendations show "✅ No issues found" instead of blank state
- No empty "AI Suggested Updates" card when there are no differences
- All tests pass
