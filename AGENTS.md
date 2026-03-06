# AI Agent Instructions (AGENTS.md)

This document provides essential context, architecture details, and working conventions for AI coding agents contributing to this repository.

---

## Project Overview

**Project name:** ChatGPT Prompt URL Generator

**Purpose:**
A small frontend-only web application that generates shareable URLs which open ChatGPT with a prefilled prompt and optional feature flags (search, image generation, research, canvas, temporary chat).

**Live site:**
https://cr2007.github.io/chatgpt-url-maker

---

## Tech Stack

- React 19
- Vite
- TypeScript (strict mode)
- Bun (preferred runtime and package manager)
- Tailwind CSS v4 + CSS variables
- Radix UI primitives
- Lucide icons
- ESLint (flat config)
- GitHub Pages deployment via GitHub Actions

---

## Core Behavior

### What the app does
- Accepts a user prompt.
- Encodes it into a ChatGPT-compatible URL using query parameters.
- Optionally adds:
  - a single feature hint (e.g. search, image, research, canvas)
  - a temporary chat flag
- Outputs a URL that can be copied or opened directly.

### What the app does not do
- No backend or server logic.
- No API calls.
- No authentication.
- No persistence or analytics.
- No OpenAI SDK usage.

---

## Project Structure

```
src/
├─ App.tsx                 # Main UI and URL generation logic
├─ main.tsx                # React entry point
├─ index.css               # Tailwind setup and theme variables
├─ components/
│  ├─ copyable-input.tsx   # Read-only textarea with copy UX
│  ├─ theme-provider.tsx   # Dark/light/system theme handling
│  └─ ui/                  # shadcn-style Radix wrappers
│     ├─ button.tsx
│     ├─ checkbox.tsx
│     ├─ toggle.tsx
│     └─ toggle-group.tsx
└─ lib/
└─ utils.ts             # cn() helper (clsx + tailwind-merge)
```

---

## Development Workflow

### Recommended (Bun)

```sh
bun i
bun dev
```

Runs the app at `http://localhost:5173`.

### Alternative (Node.js)

```
npm install
npm run dev
```

---

## Build & Deployment

- Production build:

```sh
bun run build
```

- Output directory: `dist/`
- Deployment handled by `.github/workflows/deploy.yml`
- When deployed to GitHub Pages, the Vite base path is set dynamically via environment variables.

Do not hardcode or change the base path logic in `vite.config.ts`.

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

## URL Generation Rules (Critical)

When modifying URL logic:

- Base URL must remain:

```
[https://chatgpt.com/](https://chatgpt.com/)
```

- Query parameters:
- `q` → prompt text (required)
- `hints` → single feature value (optional)
- `temporary-chat=true` → optional flag
- Use `URL` and `URLSearchParams`.
- Do not manually encode query strings.

Breaking these rules may silently invalidate generated URLs.

---

## Things AI Agents Should Avoid

- Adding a backend or server.
- Introducing analytics, cookies, or tracking.
- Adding OpenAI SDKs or API keys.
- Changing deployment strategy without explicit instruction.
- Overengineering abstractions or state management.

---

## Good Contribution Examples

- Adding a new ChatGPT feature toggle.
- Improving accessibility or keyboard navigation.
- Enhancing copy or feedback UX.
- Fixing URL encoding edge cases.
- Minor visual polish aligned with existing design.

---

## Guiding Principle

Keep the app simple and focused.

The primary goal is fast, shareable prompt URLs.
If a change does not directly support that goal, reconsider whether it belongs.

---
