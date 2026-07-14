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

### Manual Deployment

To deploy manually from your local machine:

```bash
npm run deploy
```

(Note: You will need to be authenticated with Wrangler.)
