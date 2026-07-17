# Aykar ITR Filing Assistant

A highly-deterministic, schema-validated Next.js TypeScript application designed to parse tax documents (Form-16, AIS, TIS, 26AS) and reconcile them to produce a compliant, portal-ready Indian Income Tax Return (ITR) JSON. Optimized for Cloudflare Workers using the OpenNext adapter.

---

## 📚 Technical & Developer Documentation

To contribute effectively or understand the design of the Aykar codebase, please review the following documentation:

- **[Developer Guide (docs/developer_guide.md)](docs/developer_guide.md)** — **Start here!** This document describes core tech stacks, Protobuf architecture, dynamic imports for PDF.js, Vitest/Testing Library test patterns, Resizable right-panel states, and troubleshooting tips.
- **[Architecture & Reconciliation (docs/architecture.md)](docs/architecture.md)** — Describes the core design principle: *Deterministic logic owns the numbers; AI is only used for genuinely unstructured inputs.*
- **[Clean Code & Readability Guidelines (docs/readability.md)](docs/readability.md)** — Outlines coding standards inspired by Robert C. Martin ("Uncle Bob"), highlighting Single Responsibility components, proper naming, pure functions, and avoiding nested state mutation side effects.
- **[Form-16 Parser Configuration (docs/extraction_config.md)](docs/extraction_config.md)** — Shows how Form-16 visual layout boundaries, column numeric tokens, and regexes are fully decoupled from processing code.
- **[Form-16 & ITR Mapping Logic (docs/logic.md)](docs/logic.md)** — Explains the heuristic mappings, validation rules, and deduction limit caps enforced during translation.
- **[Gemini API Key Configuration (docs/gemini_setup.md)](docs/gemini_setup.md)** — Practical guide on adding your API keys across dev, preview, and Cloudflare Worker staging/production environments.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v22.0.0 or later (required for compatibility with newer Wrangler versions)
- **Package Manager:** npm

### Installation

```bash
npm install
```

### Local Development

Run the standard Next.js development server:

```bash
npm run dev
```

### Protocol Buffers

If you update any schemas under `/proto`, regenerate the TypeScript types:

```bash
npm run proto:generate
```

---

## 🧪 Testing and Verification

The test suite is built on Vitest and uses JSDOM to render and test components.

```bash
# Run tests locally (interactive watch mode)
npx vitest

# Run all tests once
npm run test
```

*Note: Code coverage is strictly monitored in the CI pipeline with an **80% threshold** across statements, branches, functions, and lines.*

---

## 🌐 Deployment & CI/CD

### CI/CD Pipeline

The application triggers automated builds and deployments via GitHub Actions (`.github/workflows/deploy.yml` & `ci.yml`) on pull requests and pushes to `main` (Production) and `staging` (Staging).

The following secrets must be configured in your repository for deployment:
- `CLOUDFLARE_API_TOKEN`: Worker deployment token with appropriate permissions.
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account identifier.

### Local Preview

To preview the built application inside the local Cloudflare Workers environment (`workerd` via Wrangler):

```bash
npm run preview
```

### Manual Deployment

If you are authenticated with Wrangler and want to manually trigger a local deploy:

```bash
npm run deploy
```
