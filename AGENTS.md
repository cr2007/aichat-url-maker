# AI Agent Instructions (AGENTS.md)

This document provides essential context, architecture details, and working conventions for AI coding agents contributing to this repository.

---

## Project Overview

**Project name:** AI Chat Prompt URL Generator

**Purpose:**
A small frontend-only web application that generates shareable URLs which open various AI chat platforms (ChatGPT, Claude, Perplexity, etc.) with a prefilled prompt and optional feature flags.

**Live site:**
https://cr2007.github.io/aichat-url-maker

---

## Tech Stack

- React 19
- Vite
- TypeScript (strict mode)
- Bun (required runtime and package manager -- do not use Node.js or npm)
- Tailwind CSS v4 + CSS variables
- Radix UI primitives
- Lucide icons
- ESLint (flat config)
- GitHub Pages deployment via GitHub Actions

---

## Core Behavior

### What the app does
- Accepts a user prompt.
- Lets user select an AI provider (ChatGPT, Claude, Perplexity, etc.).
- Encodes the prompt into a provider-specific URL using query parameters.
- Optionally adds provider-specific feature flags (where supported).
- Optionally adds temporary chat/incognito flags (where supported).
- Outputs a URL that can be copied or opened directly.

### What the app does not do
- No backend or server logic.
- No API calls to AI providers.
- No authentication.
- No persistence or analytics.
- No direct usage of AI provider SDKs.

---

## Project Structure

```
src/
├─ App.tsx                 # Main UI and URL generation logic
├─ main.tsx                # React entry point
├─ index.css               # Tailwind setup and theme variables
├─ components/
│  ├─ copyable-input.tsx   # Read-only textarea with copy UX
│  ├─ mode-toggle.tsx      # Light/Dark/System theme dropdown
│  ├─ theme-provider.tsx   # Theme context and localStorage persistence
│  └─ ui/                  # shadcn-style Radix wrappers
│     ├─ button.tsx
│     ├─ checkbox.tsx
│     ├─ dropdown-menu.tsx
│     ├─ toggle.tsx
│     └─ toggle-group.tsx
└─ lib/
   ├─ providers.tsx        # AI provider configs and URL builders
   ├─ providers.test.ts    # Unit tests for URL generation logic
   └─ utils.ts             # cn() helper (clsx + tailwind-merge)
```

---

## Development Workflow

```sh
bun i
bun dev
```

Runs the app at `http://localhost:5173`.

---

## Testing

```sh
bun test
```

Tests live in `src/lib/providers.test.ts` and cover `buildURL` for every provider, param encoding, feature flags, temporary chat, and the URL length threshold. Use `bun:test` for any new tests. Test files are excluded from the TypeScript production build via `tsconfig.app.json`.

---

## Build & Deployment

- Production build:

```sh
bun run build
```

- Output directory: `dist/`
- When deployed to GitHub Pages, the Vite base path is set via the `GITHUB_PAGES` and `GITHUB_REPO` environment variables read in `vite.config.ts`. Do not hardcode or change that logic.

Three workflows live in `.github/workflows/`:

| File | Trigger | What it does |
|------|---------|--------------|
| `test.yml` | push to `main`, all PRs | Installs deps and runs `bun test` |
| `deploy.yml` | push to `main`, manual | Builds and deploys to GitHub Pages |
| `assign-issue.yml` | issue comment | Handles `.take` / `.release` / `.assign` / `.unassign` commands |

`deploy.yml` and `assign-issue.yml` delegate to reusable actions in `cr2007/actions@v1`. When updating CI, check that repository first before writing inline steps.

---

## Coding Conventions (Important)

### TypeScript
- Strict mode is enabled.
- Do not introduce `any`.
- Avoid unused variables, parameters, or imports.
- Prefer explicit union types for feature flags.

### React
- Functional components only.
- Follow the Rules of Hooks.
- Use `useCallback` where memoization is meaningful.
- Keep state local unless sharing is required.

### Styling
- Use Tailwind utility classes.
- Do not add new global CSS files.
- Respect existing design tokens and CSS variables.
- Prefer composition over custom styling.

### UI Components
- Reuse components in `src/components/ui/`.
- Follow Radix + shadcn patterns.
- Always merge class names using `cn()`.

---

## URL Generation Rules (Important)

Each AI provider has its own URL structure and parameters:

### ChatGPT
- Base URL: `https://chatgpt.com/`
- Query parameters:
  - `q` → prompt text (required)
  - `hints` → single feature value (optional, e.g., "search", "image", etc.)
  - `temporary-chat=true` → optional flag
- Uses `URL` and `URLSearchParams` for proper encoding.

### Claude
- Base URL: `https://claude.ai/new`
- Query parameters:
  - `q` → prompt text (required)
  - `incognito` → added to query string when temporary chat is enabled (no value)
- Uses `URL` and `URLSearchParams` for proper encoding.

### Perplexity
- Base URL: `https://www.perplexity.ai/search`
- Query parameters:
  - `q` → prompt text (required)
- Uses `URL` and `URLSearchParams` for proper encoding.

**Oversized URL fallback (`MAX_SAFE_URL_LENGTH = 7500`):**
When the generated URL exceeds 7500 characters, `handleOpenInProvider` in `App.tsx` copies the raw prompt to the clipboard and opens the provider's `baseURL` instead. A hover tooltip on the Open button informs the user to paste once the chat loads. This mirrors the approach used by `resend/react-email` (PR #3404) and avoids HTTP 431 errors from servers that cap request line length.

**Critical guidelines:**
- Do not manually encode query strings - always use `URLSearchParams`.
- Each provider's `buildURL` function handles its specific format.
- When adding new providers, follow the existing pattern in `src/lib/providers.tsx`.
- Breaking these rules may silently invalidate generated URLs.

---

## Social Metadata and Favicons

`index.html` contains the full set of social sharing and SEO meta tags. The
canonical URL, Open Graph block, and Twitter Card block all point to the
production site `https://cr2007.github.io/aichat-url-maker`. Do not change
these URLs without a corresponding domain change.

The following static image assets must be present in `public/` for full
social-sharing and PWA support. They are not generated — place them there
manually:

| File | Size | Purpose |
|------|------|---------|
| `public/og-image.png` | 1774 × 887 | `og:image` / `twitter:image` |
| `public/favicon.svg` | any (32 × 32 viewBox) | SVG favicon + PWA icon (already committed) |

If `og-image.png` is missing, the build will still succeed but social previews
will degrade gracefully. The SVG favicon doubles as the PWA manifest icon via
`sizes: "any"`, so no separate PNG icon files are required.

---

## Things AI Agents Should Avoid

- Using Node.js, npm, or npx -- always use Bun (`bun`, `bunx`).
- Adding a backend or server.
- Introducing analytics, cookies, or tracking.
- Adding AI provider SDKs or API keys.
- Changing deployment strategy without explicit instruction.
- Overengineering abstractions or state management.
- Making provider-specific changes that break the abstraction layer.
- Hardcoding URLs or query parameters outside of provider configurations.

---

## Good Contribution Examples

- Adding a new AI provider (following the pattern in `providers.tsx`).
- Adding new feature flags for an existing provider (where supported).
- Improving accessibility or keyboard navigation.
- Enhancing copy or feedback UX.
- Fixing URL encoding edge cases.
- Minor visual polish aligned with existing design.
- Updating dependencies or CI/CD configurations.

---

## Guiding Principle

Keep the app simple and focused.

The primary goal is fast, shareable prompt URLs across multiple AI chat platforms.
If a change does not directly support that goal, reconsider whether it belongs.
