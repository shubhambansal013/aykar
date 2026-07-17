# Agent Instructions for Aykar

This project is a Next.js application designed to run on Cloudflare Workers using the OpenNext adapter. Refer to the documents below to understand the high-level architecture, working principles, and deep technical details of this application.

## 🧭 Critical Documentation Directory

Before modifying any file, please read and familiarize yourself with:

1. **[Developer Guide](docs/developer_guide.md)** — Consolidates critical implementation details, including **Protocol Buffer-driven rendering**, **Vitest custom configurations/workarounds**, **JSDOM/SSR-safe MUI color modes**, **right-panel state synchronizations**, and parser modularization logic. **Always consult this file before writing or updating tests.**
2. **[Architecture & Core Principles](ARCHITECTURE.md)** — Explains the deterministic reconciliation pipelines, untrusted AI extraction paradigms, and ITR JSON mapping lifecycle.
3. **[Clean Code & Readability Guidelines](READABILITY.md)** — Defines strict compliance rules based on Uncle Bob's principles. All components must remain highly focused and adhere strictly to the Single Responsibility Principle (SRP).
4. **[Form-16 Centralized Extraction Configuration](docs/extraction_config.md)** — Details how regexes, boundary definitions, and column indices are decoupled into `extractionConfig.ts`.
5. **[Gemini API Key Setup Guide](docs/gemini_setup.md)** — Contains explicit instructions for configuring local variables and Cloudflare Worker runtime secrets.

---

## 🏗️ Technical Stack & Framework

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling & Components:** Material UI (MUI v6) with Emotion & Tailwind CSS
- **Deployment:** Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext)

## 🛠️ Key Developer Commands

- `npm run dev`: Standard Next.js development.
- `npm run preview`: Builds and runs the app in a local `workerd` environment (Wrangler).
- `npm run build`: Standard Next.js build.
- `npx opennextjs-cloudflare build`: Builds the Cloudflare-compatible bundle.
- `npm run deploy`: Builds and deploys to Cloudflare.
- `npm run test`: Run the Vitest test suite.
- `npm run proto:generate`: Re-compiles `proto3` definitions into TypeScript interfaces.
