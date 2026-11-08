# AI Chat Prompt URL Generator

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/cr2007/aichat-url-maker)

Type a question. Get a link that opens ChatGPT, Claude or Perplexity with it
ready to send.

**Try it:** https://cr2007.github.io/aichat-url-maker

<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/demo-dark.gif">
  <img src="docs/demo-light.gif" width="800" alt="Demo: a person types a prompt, turns on Search and Temporary chat, copies the link, and clicks Open in ChatGPT. The link updates with each choice.">
</picture>
</p>

## What it does

- Makes a link that opens your AI chat app with the prompt already typed in.
  Share it, or keep it to reuse a prompt.
- Adds a feature (such as Search or Deep Research) and a temporary chat to the
  link, so the person who opens it gets the same setup.
- Copies the prompt and opens the app with the same settings when the prompt is
  too long for a link.
- Works on a phone, with a pen or a mouse, offline after the first visit, and
  with JavaScript off, where it shows the link format in a table.
- Stores nothing and sends nothing. The link is the only output.

To build a link by hand, see the link format in [`public/llms.txt`](public/llms.txt).

---

# Quick start

## Bun (recommended)

This application was built in [Bun](https://bun.sh), so it is recommended that you use Bun if possible.

### Install and run

```sh
# Clone the repository
git clone https://github.com/cr2007/aichat-url-maker
cd aichat-url-maker

bun i   # Installs the dependencies
bun dev # Starts the development server
```

And then you can access the web app at http://localhost:5173

### Other commands

```sh
bun run test         # Runs the unit tests
bun run test:browser # Builds, then runs the browser tests in Chromium
bun run test:all     # Runs both suites
bun run lint         # Runs ESLint
bun run build        # Type-checks, builds to dist/, then prerenders the page
bun run build:nossg  # Builds without the prerender step
```

Every test is in `tests/`: `tests/unit/` for the pure functions and
`tests/browser/` for the built site. The browser suite needs Chromium once:

```sh
bunx --bun playwright install chromium
```

## Without Bun (Node.js)

Bun is the recommended setup. If you cannot install it, [Node.js](https://nodejs.org)
can run the app for development:

```sh
git clone https://github.com/cr2007/aichat-url-maker
cd aichat-url-maker

npm i                  # Installs the dependencies
npm run dev            # Starts the development server at http://localhost:5173
npm run build:nossg    # Builds to dist/, without the prerender step
npm run lint           # Runs ESLint
```

These scripts need Bun and do not run under Node: `build` (its prerender step
runs with Bun), `test`, `test:browser` and `test:all` (they use `bun test`).
