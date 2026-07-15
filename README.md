# Aykar Hello World

A simple Next.js TypeScript application adapted for Cloudflare using OpenNext.

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

### Installation

```bash
npm install
```

### Local Development

Run the Next.js development server:

```bash
npm run dev
```

Preview the application in the Cloudflare Workers runtime locally:

```bash
npm run preview
```

## Deployment

### CI/CD Pipeline

The application is automatically deployed to Cloudflare Workers on every push to the `main` branch via GitHub Actions.

### Configuration

The following GitHub Secrets must be configured in the repository for the deployment to work:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API Token with Workers deployment permissions.
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID.

### AI Features & API Keys Configuration

The AI ITR Filing Assistant uses Gemini for unstructured document parsing and recommendations. This requires configuring a `GEMINI_API_KEY`.

For complete step-by-step instructions on setting up your API key for local development, local preview, staging, and production on Cloudflare, see the [Gemini API Key Configuration Guide](docs/gemini_setup.md).

#### Quick Setup Cheat Sheet:
- **Local Dev:** Copy `.env.example` to `.env.local` and add `GEMINI_API_KEY`.
- **Local Preview:** Copy `.dev.vars.example` to `.dev.vars` and add `GEMINI_API_KEY`.
- **Cloudflare (Prod):** Run `npx wrangler secret put GEMINI_API_KEY --env prod`
- **Cloudflare (Staging):** Run `npx wrangler secret put GEMINI_API_KEY --env staging`

### Manual Deployment

To deploy manually from your local machine:

```bash
npm run deploy
```

(Note: You will need to be authenticated with Wrangler.)
