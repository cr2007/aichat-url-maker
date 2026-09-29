# AI Chat Prompt URL Generator

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/cr2007/aichat-url-maker)

A small web app built in [Vite](https://vite.dev) that builds shareable AI Chat URLs with prefilled prompts and optional feature hints.

You can try out the app now at https://cr2007.github.io/aichat-url-maker

Why this helps
- Create, copy, and open URLs that prefill prompts in your favourite AI chat app for sharing or quick reuse.
- Adds optional flags (features, temporary chat) to the URL so workflows can be shared precisely.
- Falls back to copying the prompt and opening the provider directly when it is too long to fit in a link.
- Follows your system light and dark appearance. There is no second setting to keep in sync.
- Lets you tap a provider or drag between providers. The drag works with a mouse, a pen and a touch screen.
- Shows the page from the first response, so it appears quickly on a slow connection.
- Shows the link grammar in a table if you have JavaScript off, so you can build a link by hand.

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
bun test          # Runs the unit tests
bun run lint      # Runs ESLint
bun run build     # Type-checks, builds to dist/, then prerenders the page
bun run build:nossg  # Builds without the prerender step
```

## Node.js

If you wish to run the application via [Node.js](https://nodejs.org), you can do so using the following steps:

```sh
# Clone the repository
git clone https://github.com/cr2007/aichat-url-maker
cd aichat-url-maker

npm i       # Installs the dependencies
npm run dev # Starts the development server
```

And then you can access the web app at http://localhost:5173
