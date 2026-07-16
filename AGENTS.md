# Agent Instructions for Aykar

This project is a Next.js application designed to run on Cloudflare Workers using the OpenNext adapter. Refer ARCHITECTURE.md on the high level architecture and the working of this app.

## Clean Code & Readability Guidelines

All code modifications and refactoring in this repository must strictly adhere to the guidelines outlined in [READABILITY.md](READABILITY.md). Ensure that:
- Any React page or component remains small and adheres to the Single Responsibility Principle (SRP).
- Deeply nested or bloated helper logic is broken down into separate modular utilities and components.
- Functions are clean, minimal, and do exactly one thing.
- Full test coverage is maintained (minimum 80% threshold).


## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext)

## Project Structure and Configuration

- `wrangler.jsonc`: Cloudflare Workers configuration. Note the `main` entry point is `.open-next/worker.js` and assets are in `.open-next/assets`.
- `open-next.config.ts`: Configuration for the OpenNext adapter.
- `next.config.ts`: Standard Next.js config, including `initOpenNextCloudflareForDev()` for local development integration.
- `.github/workflows/deploy.yml`: GitHub Actions workflow for automated deployment.

## Key Commands

- `npm run dev`: Standard Next.js development.
- `npm run preview`: Builds and runs the app in a local `workerd` environment (Wrangler).
- `npm run build`: Standard Next.js build.
- `npx opennextjs-cloudflare build`: Builds the Cloudflare-compatible bundle.
- `npm run deploy`: Builds and deploys to Cloudflare.

## Maintenance Notes

- When adding new Cloudflare bindings (KV, D1, etc.), update `wrangler.jsonc`.
- The OpenNext build output is stored in `.open-next/` and is ignored by git.
- If linting issues occur in `.open-next/`, ensure `eslint.config.mjs` continues to ignore that directory.
