# AI Agent Instructions (AGENTS.md)

This document gives the context and the working conventions for an AI agent
that contributes to this repository. Read **Read This First** before you start
and again before you report that a change is complete. The sections after it
give the detail.

---

## Read This First

These rules get missed most often. A change that breaks one of them is not
complete, even when it works.

### Always

| Rule | Detail |
|------|--------|
| Bun only | `bun`, `bunx --bun`. Never npm, npx, yarn, pnpm or node. Translate a command from any README that uses them |
| No em dash, no emoji | In code, comments, UI text, documents, and commit messages |
| ASD-STE100 Simplified Technical English | Short sentences. Active voice. One word for one meaning. Do not overexplain |
| TSDoc on every export | Each exported function, component and interface gets a block with `@param` and `@returns` |
| `Step X.Y` inside a function | Number the steps in a function body. Write the reason, not the operation |
| Use what exists | Do not add a file, a dependency, an abstraction or a state manager that the task does not need. Put a new constant in a file that already fits |
| Never commit `.claude/` | Personal tooling. It is gitignored. Keep it that way |

### Before you say a change is complete

1. `bun run test` and `bun run test:browser` pass.
2. `bun run build` passes, **and** the Pages build passes:
   `GITHUB_PAGES=true GITHUB_REPO=aichat-url-maker bun run build`.
   A local build uses an empty base and hides a whole class of fault.
3. A regression test covers each defect that the change fixes. Run that test
   against the code from before the fix and watch it fail. A test that passes
   both ways proves nothing.
4. No dead code, no unused export, no file left over from an earlier approach.
5. The documents below match the code.

### Change one, change the others

| When you change | Also change |
|-----------------|-------------|
| A provider, a feature value, or `MAX_SAFE_URL_LENGTH` in `providers.tsx` | The `<noscript>` tables in `index.html` **and** `public/llms.txt` |
| The file tree, a script in `package.json`, or a test | The **Project Structure** and **Testing** sections here, and `README.md` |
| A `theme-color` tag in `index.html` | The other `theme-color` tag |
| A token in `:root` in `index.css` | The same token in the `prefers-color-scheme: dark` block |

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
- No analytics.
- No persistence. The app stores nothing.
- No direct usage of AI provider SDKs.

---

## Project Structure

```
public/
└─ llms.txt                    # The link grammar, for an agent that finds the site
scripts/
├─ prerender.tsx               # Build step: renders the app into dist/index.html
└─ prerender-document.ts       # Pure document assembly, the deploy base, the 14KB budget
tests/
├─ unit/                       # Pure functions. See Testing
└─ browser/                    # The built site in Chromium. See Testing
src/
├─ App.tsx                     # Main UI, form state, and URL generation wiring
├─ main.tsx                    # React entry point. Hydrates the prerendered markup
├─ sw.ts                       # Workbox service worker (vite-plugin-pwa, injectManifest)
├─ index.css                   # Tailwind setup, design tokens, appearance, reduced motion
├─ components/
│  ├─ copyable-input.tsx       # Read-only textarea with copy UX
│  └─ ui/                      # shadcn-style Radix wrappers
│     ├─ button.tsx
│     ├─ segmented-control.tsx # Provider picker: one track, sliding indicator
│     ├─ toggle.tsx            # Feature pills and the temporary chat row
│     ├─ toggle-group.tsx
│     └─ tooltip.tsx           # Feature descriptions on hover and focus
└─ lib/
   ├─ providers.tsx            # Provider configs, URL builders, oversized-URL fallback
   ├─ segmented-control.ts     # Pure indicator geometry for the segmented control
   └─ utils.ts                 # cn() helper and countWords()
```

There is no theme provider or appearance toggle. See **Appearance** below.

---

## Development Workflow

```sh
bun i
bun dev
```

Runs the app at `http://localhost:5173`.

---

## Testing

Every test is in `tests/`, away from the source.

```sh
bun run test          # the unit tests. Fast, and needs no build
bun run test:browser  # builds, then drives the build in Chromium
bun run test:all      # both
```

Use `bun:test` for any new test. Test files are outside the TypeScript
production build.

```
tests/
├─ unit/          # Pure functions. No DOM, no browser
│  ├─ providers.test.ts
│  ├─ segmented-control.test.ts
│  ├─ utils.test.ts
│  └─ prerender-document.test.ts
└─ browser/       # The built site in Chromium
   ├─ harness.ts             # Static server, browser, and the page helpers
   ├─ measure.ts             # Contrast and target size, read from the pixels
   ├─ accessibility.test.ts
   ├─ interaction.test.ts
   └─ rendering.test.ts
```

### The unit tests

| File | Covers |
|------|--------|
| `tests/unit/providers.test.ts` | `buildURL` for every provider, param encoding, feature flags, temporary chat, the URL length threshold, and the `isUrlTooLong`/`resolveOpenAction` fallback logic |
| `tests/unit/segmented-control.test.ts` | The indicator position and the drag gesture: `resolveActiveIndex`, `clampPosition`, `getSegmentWidth`, `positionFromDrag`, `snapToIndex`, `getDragTension` and `getIndicatorGeometry`, with the guards for unknown, empty, out-of-range and non-finite input |
| `tests/unit/utils.test.ts` | `countWords` whitespace handling, `cn` class merging, and `copyText` with a working, a rejecting and a missing clipboard |
| `tests/unit/prerender-document.test.ts` | `insertMarkup` and `buildDocument`: the root element, the stylesheet, and the 14KB budget. Also `resolveAssetPath`, which takes the deploy base off a stylesheet URL |

There is no DOM test suite for a component in isolation. Move the pure parts
of a component into `src/lib/` instead, as `segmented-control.ts` does for the
indicator position. The unit tests can then use them.

### The browser tests

Some behaviour exists only in a browser: the size of a target, the ARIA
attributes, the layout at each width, the contrast and the drag gesture.

| File | Covers |
|------|--------|
| `tests/browser/accessibility.test.ts` | Contrast in both appearances, the 24px WCAG target and the 44px HIG target, the 13px text floor, one `h1`, an accessible name on every control and group, hidden decorative icons, the same focus indicator on every control, and reduced motion |
| `tests/browser/interaction.test.ts` | The pills as toggle buttons, a second press to clear, one feature at a time, the tooltip text and `aria-describedby`, a press anywhere in the temporary chat row, drag and tap and arrow keys on the provider control, settings that survive a provider change, the copy failure message, and the open button on an origin with no clipboard |
| `tests/browser/rendering.test.ts` | The rounded corners on every pill, the layout from 320px to 1024px, text at 200 percent, the page without JavaScript, the prerendered markup, hydration without a mismatch, a page that fetches no more code as a person uses it, and a full pass that stores nothing |

Rules for a browser test:

- They drive `dist/`, not the dev server, so they also cover the prerender
  step. `bun run test:browser` builds first.
- Contrast comes from the pixels that the browser paints, in `measure.ts`. A
  token says nothing about a translucent surface over a gradient.
- Each test opens its own context, so no test sees the storage of another.
- `openPage` collects every console error. A test can then assert that a flow
  reported none.

---

## Build & Deployment

- Production build:

```sh
bun run build
```

- Output directory: `dist/`
- `bun run build` runs `vite build` and then `scripts/prerender.tsx`. Use `bun run build:nossg` to skip the prerender.
- When deployed to GitHub Pages, the Vite base path comes from the `GITHUB_PAGES` and `GITHUB_REPO` environment variables. `BASE_PATH` in `scripts/prerender-document.ts` holds that logic. `vite.config.ts` sets the Vite base from it, and the prerender step takes it off again with `resolveAssetPath`. Do not hardcode the value and do not copy the logic into a second file. Pages serves the site from a subdirectory, so every absolute asset URL carries the repository name while the file sits at the root of `dist/`. That module imports nothing, so the config can read it without loading the build tools.

Three workflows live in `.github/workflows/`:

| File | Trigger | What it does |
|------|---------|--------------|
| `test.yml` | push to `main`, all PRs | Two jobs: `unit` runs the unit tests, `browser` builds and runs the browser tests in Chromium |
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
- `hover:` is redefined in `index.css` to gate on `(any-hover: hover)` instead of Tailwind's default `(hover: hover)`, so stylus input (S Pen, Apple Pencil) can trigger hover styles on primarily-touch devices. Don't reintroduce plain `(hover: hover)` gating locally.
- An attribute selector outranks a plain utility class. `ToggleGroupItem` once carried `data-spacing="0"` at all times, which compiled to `[data-spacing="0"]{border-radius:0}` and squared five of the seven feature pills, because that selector beats `rounded-md`. The joined-group classes are gone. Do not bring them back: the pills wrap onto more than one row, and a joined bar cannot wrap.
- Size text in `rem`, not `px`, so it follows the browser's font-size setting. Do not go below `0.8125rem` (13px) for any text.
- Every motion must survive `prefers-reduced-motion`. `index.css` has a blanket floor in `@layer base`; prefer a local `motion-reduce:` variant where a component needs something more specific than "near-instant".
- A hover shadow goes below the control, in the colour of that control. Do not use a symmetric shadow, and do not use a colour from a different part of the palette. Both make a halo.
- Hover must not fade a control. A fade dims the label with the background, and the control then looks disabled.

### Focus

Every control that can take the focus gets the `focus-ring` class from `index.css`. It draws a 2px outline in `--focus-ring` with a 2px offset.

- Do not use `--ring` for a focus indicator. `--ring` is the accent colour, and it disappears on a control that the accent colour fills, such as the primary button or a selected pill.
- Do not add `outline-none` next to `focus-ring`. Tailwind utilities rank above the components layer, so `outline-none` removes the indicator.
- Keep the offset. The outline is then next to the page background, not next to the fill of the control.

### Appearance

The appearance follows the system. The app has no light or dark control, no theme context and no `localStorage` value.

- The Tailwind `dark` variant is `@custom-variant dark (@media (prefers-color-scheme: dark))`. There is no `.dark` class. Do not add a class-based control.
- The dark values are in a `@media (prefers-color-scheme: dark) { :root { ... } }` block in `index.css`. Give each token in `:root` a value in that block.
- `:root` sets `color-scheme: light dark`. The browser then draws the scrollbars and the form controls in the system appearance.
- `index.html` has two `theme-color` tags, one for each appearance. Change both tags together.
- In dark mode an elevated surface must be lighter than the surface below it. The ladder is `--segment-thumb` (0.32) above `--segment-track` (0.21) above `--background` (0.145). Do not use `--background` for an elevated surface. That value is correct in light mode only.

### Segmented Control

`src/components/ui/segmented-control.tsx` is the provider control. It changes three Radix defaults. Keep all three.

- The track has `role="radiogroup"`. Radix gives it `role="group"`. The items already have `role="radio"` and `aria-checked`.
- Selection follows the arrow keys through `onFocus`. Radix only moves the focus.
- `onFocus` does not select while a pointer is down. A person can then press one segment and drag to a different segment.

A person can drag the indicator with a mouse, a pen or a finger. Rules for that gesture:

- Capture the pointer in the move handler, not in the down handler. A capture sends the `click` event to the track, and a tap then selects nothing.
- Keep `touch-pan-y` on the track. The page can then still scroll vertically on a touch screen.
- Block the `click` after a drag. Without that the segment below the pointer selects itself.
- During a drag the track has `data-dragging="true"`, and the segment that a release selects has `data-candidate="true"`. The CSS makes that label brighter and its icon larger. A person can then see the result before the release. Keep both cues. Color alone does not show a state.

The indicator gets a Liquid Glass surface during a press only. See `.segment-indicator` in `index.css`. Do not apply glass at rest, and do not apply it to another element. HIG keeps glass out of the content layer. The one exception is a "transient interactive element", which this indicator is.

More rules for the glass:

- Keep `--segment-track` translucent. The page gradient is then behind the glass, and `backdrop-filter` has an image to blur. A solid track gives no glass effect.
- The primary color tints the glass during the drag only. At rest the indicator is neutral. HIG color.md keeps a tinted background on one control, and the "Open in" button is that control.
- Do not put a text color utility on a segment. Tailwind utilities rank above the components layer, so a utility stops the drag rules. The `.segment-item` rules in `index.css` own the label color.

`src/lib/segmented-control.ts` holds the position maths as pure functions, so the tests can use them. `TRACK_PADDING_REM` must agree with the `p-1` class on the track.

### Toggles

The feature pills and the temporary chat row are toggle buttons, not radios
and not switches. HIG toggles.md: outside a list, use a button that behaves
like a toggle, not a switch.

- A pill has `role="button"` and `aria-pressed`. Radix marks an item in a
  single group as `role="radio"`, but a radio cannot be unchecked, and a
  second press on a pill clears the feature. `aria-checked` is cleared.
- The whole temporary chat row is one control. A press anywhere in it toggles
  the setting.
- A selected control shows a tick or a fill, not colour alone.
- The pills style from `aria-pressed`, not `data-state`. A tooltip wraps each
  pill, and `TooltipTrigger asChild` writes its own `data-state` over the
  toggle's. The temporary chat row has no tooltip, so it reads `data-state`.

The pills use flex wrap with `justify-center`, not a grid. A grid keeps its
columns, so a part-filled last row stays on the left. Flex centres every row.

### Motion

- Name `scale` in a transition, not only `transform`. Tailwind v4 compiles
  `scale-*` to the independent `scale` property, and a transform transition
  does not cover it. The `transition-transform` shorthand does cover it.
- An element enters from `scale-75` or higher with opacity. Nothing appears
  out of nothing.
- Use `ease-out` for an element that enters. Keep a UI transition at or below
  300ms.

### Element IDs

Give each important container and control a readable `id`. Name it for its function, for example `provider-picker`, `open-in-provider` or `how-it-works-toggle`. Do not name it for its style. These ids identify elements in a review. They are also targets for `aria-labelledby` and `aria-controls`. A wrapper component must accept an `id` prop and pass it on.

### Comments

- Give each exported function, component and interface a TSDoc block. Add `@param` and `@returns`.
- Number the steps in a function body as `Step X.Y`.
- Write the reason for the code, not the operation of the code. Delete a comment that is not correct.
- Use ASD-STE100 Simplified Technical English. Write short sentences. Use the active voice. Use one word for one meaning.
- Do not use an em dash. Do not use an emoji.

### First Response

The build prerenders the page into `dist/index.html` and puts the stylesheet
in the document. The first response therefore carries the markup and the
styles, and the browser paints without a second request. Before this step the
document held an empty root, and nothing painted for about 3 seconds on a slow
connection.

- Keep the document at or below 14KB gzipped. A server sends about that much
  in the first round trip. `buildDocument` keeps the stylesheet external when
  the document would go over, and the build prints the size.
- The markup comes from `react-dom/server`. Do not take it from a browser. A
  browser snapshot also holds what a component writes to the DOM after it
  mounts, such as the roving `tabindex` from Radix. React then reports a
  hydration mismatch and discards the markup.
- The first client render must match the prerender. Do not read `localStorage`
  or `window` during a render. Use `useSyncExternalStore` with a server
  snapshot if a value has to come from outside React.
- `main.tsx` hydrates when the root holds markup and renders when it is empty,
  so `bun dev` needs no prerender.

### No JavaScript

`index.html` holds a `<noscript>` block. The build prerenders the app into
`#root`, so a browser with JavaScript off would otherwise show a form that
looks ready and answers nothing. The block hides that form and gives the link
grammar in tables instead.

- Keep the rules for that page inside the `<noscript>` block, not in
  `index.css`. A browser with JavaScript off may also block the stylesheet,
  and the page must still look right. The rule that hides `#root` must be
  there in any case, because it has to apply only when JavaScript is off.
- Each colour reads an app token and falls back to the same value written
  out, for example `var(--foreground, var(--ns-fg))`. The page matches the app
  when the stylesheet loads and keeps the palette when it does not.
- `public/llms.txt` holds the same grammar for an agent. Change both together.

### Tooltips

A feature pill has a tooltip that describes the feature. The text is in
`providers.tsx` next to the feature, not in `App.tsx`.

- A tooltip repeats what `aria-describedby` gives a screen reader. Never put
  information in a tooltip alone.
- `TooltipTrigger asChild` writes `data-state` onto its child. Do not style a
  trigger from `data-state`.

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
`isUrlTooLong` and `resolveOpenAction` in `src/lib/providers.tsx` decide what
"Open in {provider}" should do. When the generated URL exceeds 7500
characters, `resolveOpenAction` returns the provider's bare `baseURL` and
`shouldCopyPrompt: true`; `App.tsx`'s `handleOpenInProvider` then copies the
raw prompt to the clipboard and opens that URL instead of the full one. The
UI reflects this up front: the button label changes to "Copy Prompt & Open
{provider}", and a persistent (non-hover) message explains the fallback, so
it's visible on touch devices too. This mirrors the approach used by
`resend/react-email` (PR #3404) and avoids HTTP 431 errors from servers that
cap request line length.

`handleOpenInProvider` also handles a blocked popup: if `window.open` returns
`null`, App.tsx shows a message asking the user to allow popups and retry.
The notice is derived state (the URL it was raised for, compared against the
current URL) rather than a value that needs manual resetting, so it clears
itself automatically once the prompt, provider, feature, or temporary-chat
setting changes.

**Critical guidelines:**
- Do not manually encode query strings - always use `URLSearchParams`.
- Copy through `copyText` in `src/lib/utils.ts`. Never call `navigator.clipboard.writeText` directly. An insecure origin has no clipboard, so reading `writeText` throws at once, and a `.catch()` on the call never sees it. In `handleOpenInProvider` that killed the handler before `window.open`, and nothing happened at all.
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
social-sharing and PWA support. They are not generated, so place them there
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

See also the **Always** table in **Read This First**.

- Using Node.js, npm, or npx. Always use Bun (`bun`, `bunx --bun`).
- Adding a backend or server.
- Introducing analytics, cookies, or tracking. The app stores nothing.
- Adding AI provider SDKs or API keys.
- Changing deployment strategy without explicit instruction.
- Overengineering. Do not add a file for one constant, an abstraction with one
  caller, or a state manager. Put the code in a file that already fits.
- Making provider-specific changes that break the abstraction layer.
- Hardcoding URLs or query parameters outside of provider configurations.
- Committing local Claude Code tooling under `.claude/`. These are personal
  workflow helpers, not project conventions, and they are gitignored.

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
