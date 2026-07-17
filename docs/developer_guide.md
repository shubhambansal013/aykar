# Aykar Developer Guide & Codebase Context

Welcome to the Aykar developer guide! This document compiles critical context, architecture patterns, and technical guidelines for both human developers and AI agents contributing to this project.

---

## 1. Technical Stack & Environment

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling & Components:** Material UI (MUI v6) with Emotion (`@emotion/react`, `@emotion/styled`), Tailwind CSS
- **Runtime Target:** Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext)
- **Testing:** Vitest with JSDOM
- **Code Linting:** ESLint 8.57.x and `eslint-config-next` (utilizing `FlatCompat` to avoid circular dependencies with Next.js 15+)
- **System Constraints:** The development environment clock may be set in the future (e.g., 2026), affecting Wrangler `compatibility_date` configurations. Node.js >= 22.0.0 is required.

---

## 2. Core Architecture & Design Principles

### A. Protocol Buffer-Driven Architecture
- **Compilation:** Schema definitions in `proto3` are compiled into strongly-typed TypeScript files in `src/generated/` using `ts-proto` (`npm run proto:generate`).
- **Protobuf Domination:** React components (e.g., `page.tsx`, `FieldCues.tsx`, `TaxRegimeComparisonCard.tsx`, `SectionAuditTrail.tsx`, `DebugInfoSection.tsx`, `AssistantMessage.tsx`) render and operate directly on Protocol Buffer structures (such as `EngineReconciliationResult` and `Form16Bundle`) rather than raw JSON models.
- **Exclusion:** To prevent generated schemas from skewing quality metrics, `src/generated/**` is excluded from Vitest coverage thresholds in `vitest.config.ts`.

### B. Decoupled & Strongly-Typed Mappers
- **Single Responsibility:** Direct mapping between JSON/domain models and Protobuf definitions is strictly separated into standalone mapper classes under `src/lib/proto/mappers/` (e.g., `AisMapper.ts`, `TisMapper.ts`, `Form16Mapper.ts`, `ItrMapper.ts`, etc.).
- **Purpose:** Translation layers preserve core taxpayer details (such as names, PAN, address, metadata) during transformations.

### C. Uncle Bob's Clean Code Guidelines
- Refer to [readability.md](readability.md) for full compliance.
- Keep UI components small and separated from computational logic.
- Avoid inline arrow functions inside JSX elements. Use single, shared event handlers (e.g., `handleChange`) mapped to input names to reduce statement count and avoid coverage holes.

---

## 3. Important Implementation & Testing Guidelines

### A. PDF Parsing via `pdfjs-dist`
- **Dynamic Import Required:** Due to Cloudflare Worker runtime limits and bundle optimizations, `pdfjs-dist` (v6.1.200) **must be imported dynamically**.
- **Worker Configuration:** The PDF worker source must point to the ESM version on unpkg:
  ```typescript
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  ```
- **Params Omission:** Avoid using `isEvalSupported` or `useWorkerFetch` in `getDocument` parameters, as they are unsupported and will throw runtime errors.

### B. Defensive Color Modes
- MUI's `ThemeProvider` and `CssBaseline` handle dark/light modes.
- **SSR/JSDOM Precaution:** To ensure compatibility with JSDOM and server-side rendering, resolve color modes on mounting via defensive checks on the existence of `window.matchMedia`.

### C. Testing Library and Vitest Guidelines
- **Explicit Test Imports:** You must explicitly import test-runner hooks/methods (such as `describe`, `it`, `expect`, `vi`) from `vitest` in every test file. Globals are not automatically declared under the current tsconfig profile.
- **Collapsible Elements:** For testability, toggle collapsible elements (e.g., large upload boxes, validation warnings) using style-based visibility (e.g., `display: expanded ? 'block' : 'none'`) instead of conditional mounting. This allows Testing Library selectors to query hidden DOM nodes without manual click simulations.
- **State Deep-Copies:** React state updates (e.g., `setExtractedData`) must perform a deep copy (e.g., `JSON.parse(JSON.stringify(prev))`) rather than mutating nested objects in-place to prevent infinite render loops and test runner timeouts.
- **Mocking PDF Parser:** In Vitest tests that mock `@/lib/form16/parser` (such as `src/app/page.test.tsx`), use `vi.importActual` to preserve real helpers (like `mergeForm16Data`) while selectively mocking only `parseForm16Text` to avoid page crashes.
- **Anchor Element Mocking:** When mocking downloads, avoid globally spying on `document.createElement` (as it breaks internal JSDOM cleanups). Mock `HTMLAnchorElement.prototype.click` instead.
- **Execution Timeouts:** Asynchronous file upload or heavy reconciliation tests in Vitest can suffer from JSDOM execution lags. Use explicit timeouts (e.g., `45000ms`) inside tests if necessary.

---

## 4. UI Navigation & Right-Panel Behavior

- **Resizable Split-Screen:** The main dashboard features a resizable right panel taking up 50% width.
- **Tabs:** The panel uses tabs to switch between 'AI Assistant' (chat mode) and 'Verify Documents' (document inspection mode).
- **Explicit Tab State:** All entry points that open the right panel (chat icons, floating action buttons, 'AI Review' buttons, 'View Extracted Data' links, success badges) must explicitly set the active tab state to `'chat'` or `'inspect'` to avoid context mismatch or blank states.

---

## 5. Centralized Configuration & Parser Modularization

### A. Extraction Config
- Extraction regexes, boundaries, and column column preferences are decoupled from procedural parser code into `src/lib/form16/extractionConfig.ts` (documented in [extraction_config.md](./extraction_config.md)).

### B. Modular Parsers
- The Form-16 parser is modularized into specialized, highly cohesive classes under `src/lib/form16/`:
  - `BasicInfoParser` (Extracts PANs, TANs, assessment years, and side-by-side employer/employee details. Broken down into tiny, focused private parsing routines).
  - `SalaryParser` (Extracts Section 17 salary parts, Section 10 exempt allowances, and Section 16 deductions. Structured into small, logical sub-parsing methods).
  - `OtherIncomeParser`
  - `DeductionsParser`
  - `TaxComputationParser`
  - `DetailedForm16Parser` (High-fidelity detailed parser extracting full quarterly summaries, challan deposits, and verifications. Methods are extremely modular).
  - `Form16Merger` (Unifies and merges multiple Form-16 models for multi-employer / job change scenarios, capping standard deductions and validating arithmetic totals).

### C. File Re-upload Prevention Trick
- To support immediate re-upload of the same file after deletion, always clear the file input DOM value by resetting `e.target.value = ''` in the `onChange` event handler.

---

## 6. Deployment & Environment Strategy

- Multi-environment setup (staging and production) is controlled in `wrangler.jsonc` using an `env` block.
- Deployment relies on `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
- Dynamic environment keys such as `GEMINI_API_KEY` are retrieved in the Cloudflare runtime context via `getCloudflareContext().env.GEMINI_API_KEY`. See [gemini_setup.md](./gemini_setup.md) for detailed configuration commands.
