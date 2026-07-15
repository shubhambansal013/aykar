# Configuring GEMINI_API_KEY for Aykar ITR Filing Assistant

This guide explains how to properly configure your `GEMINI_API_KEY` for different environments (local development, local preview, staging, and production).

If you are seeing the message `"Gemini AI Assistant is not available because the GEMINI_API_KEY is not configured."` despite adding it as a GitHub Secret or a Cloudflare Secret, read the **Troubleshooting** section below to understand why this occurs and how to fix it.

---

## How the Code Resolves the Key

The API handler at `src/app/api/chat/route.ts` is designed to be environment-agnostic. It attempts to resolve `GEMINI_API_KEY` in two ways:

1. **Standard Environment Variables (`process.env.GEMINI_API_KEY`):**
   Used in standard Node.js/Vercel/local development setups.
2. **Cloudflare Context Bindings (`getCloudflareContext().env.GEMINI_API_KEY`):**
   Used when running on the Cloudflare Workers runtime, where dynamic variables must be fetched from the context environment object.

---

## 1. Local Development (`npm run dev`)

To configure the API key for local Next.js development:

1. Copy the `.env.example` file to create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your actual API key:
   ```env
   GEMINI_API_KEY=AIzaSy...YourActualGeminiKey
   ```
This file is excluded from git via `.gitignore` to prevent leaking keys.

---

## 2. Local Preview/Testing (`npm run preview`)

Local preview runs your built application inside a local Cloudflare Workers (`workerd`) environment using Wrangler. Wrangler simulates bindings and secrets using a local `.dev.vars` file.

1. Copy the `.dev.vars.example` file to create a `.dev.vars` file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
2. Open `.dev.vars` and add your actual API key:
   ```env
   GEMINI_API_KEY=AIzaSy...YourActualGeminiKey
   ```
This file is excluded from git via `.gitignore`.

---

## 3. Cloudflare Environments: Why Your Key Wasn't Found (Troubleshooting)

There are two common pitfalls when deploying a Next.js/OpenNext application to Cloudflare Workers:

### Pitfall A: GitHub Secrets vs. Cloudflare Runtime Secrets
Adding `GEMINI_API_KEY` as a GitHub secret **does not automatically inject it into Cloudflare Workers**.
* GitHub Secrets are only available to the **GitHub Actions runner** while building or deploying.
* The deploy workflow in `.github/workflows/deploy.yml` only passes `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to the deploy command.
* Because Cloudflare Workers persist their secrets across subsequent deployments, **you only need to configure the secret once directly on Cloudflare (CLI or Dashboard)**.

### Pitfall B: Wrangler Environment Scopes (`--env`)
This project defines explicit environments in `wrangler.jsonc` (`staging` and `prod`):
```jsonc
"env": {
  "staging": { "name": "aykar-staging", ... },
  "prod": { "name": "aykar", ... }
}
```
When deploying, the workflow uses the environment flags:
* Production: `opennextjs-cloudflare deploy --env prod`
* Staging: `opennextjs-cloudflare deploy --env staging`

**Crucial Rule:** In Wrangler, secrets and variables are scoped **per environment**. If you run `npx wrangler secret put GEMINI_API_KEY` without specifying the `--env` flag, the secret is only assigned to the default worker environment, which is completely isolated from the `prod` and `staging` environments.

---

## 4. How to Set the Key Correctly on Cloudflare

To make the key available to the deployed application, use either the Wrangler CLI or the Cloudflare Dashboard.

### Method A: Using the Wrangler CLI (Recommended)

Run the following commands from your terminal (ensure you are authenticated with Wrangler or have set the correct environment variables):

* **For the Production Environment:**
  ```bash
  npx wrangler secret put GEMINI_API_KEY --env prod
  ```
  *(When prompted, paste your Gemini API key)*

* **For the Staging Environment:**
  ```bash
  npx wrangler secret put GEMINI_API_KEY --env staging
  ```
  *(When prompted, paste your Gemini API key)*

### Method B: Using the Cloudflare Dashboard

If you prefer using the Cloudflare UI:

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** in the left sidebar.
3. Select your production worker (**`aykar`**) or staging worker (**`aykar-staging`**).
4. Go to the **Settings** tab.
5. Click on **Variables** in the sub-menu.
6. Under **Environment Variables**, click **Add variable**.
7. Enter the following details:
   - **Name:** `GEMINI_API_KEY`
   - **Type:** Select **Secret / Encrypt** (do not leave as Plaintext)
   - **Value:** Paste your Gemini API key.
8. Click **Save and deploy** (or **Deploy**).

*Note: You must do this for both `aykar` (production) and `aykar-staging` (staging) if you want the feature to work in both environments.*
