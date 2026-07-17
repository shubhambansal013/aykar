# Clean Code & Readability Guidelines (Uncle Bob's Principles)

This repository adheres to standard "Clean Code" engineering principles, largely inspired by Robert C. Martin ("Uncle Bob"). All developers and AI agents working on this project must follow these principles to keep the codebase highly readable, maintainable, and robust.

---

## Core Clean Code Principles

### 1. Single Responsibility Principle (SRP)
*   **Definition:** Every module, class, or function should have exactly *one reason to change*.
*   **Application:**
    *   Do not combine UI rendering, data validation, parsing, and AI communication in a single file (like the original `page.tsx`).
    *   Break down large components into highly-focused sub-components and pure utility functions.
    *   Functions must do *one thing*, do it well, and do it only.

### 2. Use Meaningful Names
*   **Intent-Revealing:** Names of variables, functions, and classes should tell you why it exists, what it does, and how it is used. If a name requires a comment, then the name does not reveal its intent.
*   **Pronounceable & Searchable:** Avoid arbitrary abbreviations (e.g., use `reconciledTaxData` instead of `recTxDt`). Use easily searchable names for variables that are used in multiple places.
*   **Consistent Vocabulary:** Use the same term across the app for the same concept (e.g., do not mix `retrieve`, `get`, and `fetch` arbitrarily for identical operations).

### 3. Small Functions
*   **Rule of Thumb:** Functions should be very small (typically under 20 lines, rarely more than 50).
*   **Single Level of Abstraction:** Do not mix high-level business logic with low-level details (like regex or DOM manipulation) in the same function.
*   **Block & Indenting:** The indent level of a function should not be greater than one or two. This makes functions incredibly easy to read and understand.

### 4. Minimize Function Arguments
*   **Monadic/Dyadic is Best:** The ideal number of arguments for a function is zero (niladic). Next is one (monadic), followed closely by two (dyadic).
*   **Triadic/Polyadic:** Three arguments (triadic) should be avoided where possible, and more than three (polyadic) requires a very strong justification and should usually be wrapped in an options object.

### 5. No Side Effects (Favor Pure Functions)
*   **Definition:** A function should not make hidden, unexpected modifications to state or variables outside its scope.
*   **Application:**
    *   In React/Next.js, state mutation must be avoided. Perform deep copies of nested state (e.g., `JSON.parse(JSON.stringify(prev))`) rather than mutating references in-place.
    *   Ensure helper functions are pure: they take input and return a new value without modifying the inputs or global variables.

### 6. Don't Repeat Yourself (DRY)
*   **Rule:** Duplication is the root of all software evils. If you find the same logic repeated in multiple places, extract it into a shared function or component.
*   **Benefit:** Reduces the surface area for bugs, as any future modifications only need to be done in one place.

### 7. Express Yourself in Code, Not Comments
*   **Philosophy:** Comments are often "lies in disguise" because code changes but comments are rarely updated.
*   **Rule:** Before writing a comment, ask yourself: *"How can I rewrite this code so that it is self-documenting?"*
*   **Exceptions:** Use comments only for explaining the "why" (business intent or non-obvious workarounds), never the "what" or "how" (which the code itself should show).

### 8. Formatting & Layout
*   **Vertical Openness:** Use blank lines to separate concepts (such as imports, variable declarations, and logic blocks).
*   **Vertical Density:** Code that is closely related should be kept vertically dense (e.g., consecutive declarations).
*   **Horizontal Alignment:** Keep lines of code reasonably short to avoid horizontal scrolling. Let the code flow naturally down the page.

---

## Readability Checklist for Pull Requests
Before submitting a pull request, ensure your code answers **YES** to:
- [ ] Is `page.tsx` kept as a high-level router/orchestrator free of bloated helper components?
- [ ] Are UI components separated from computational logic/utilities?
- [ ] Do all functions do exactly one thing?
- [ ] Are variable and function names self-documenting?
- [ ] Is there zero copy-pasted/duplicated code?
- [ ] Are all state changes clean and free of mutation side-effects?
