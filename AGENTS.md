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

- React 19.2, pinned with `~`: 19.3 adds about 8 kB to the gzipped bundle and fixes nothing the app needs
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
├─ sw.ts                       # Workbox service worker (vite-plugin-pwa, injectManifest). The page is network-first, the hashed files are precached
├─ index.css                   # Tailwind setup, design tokens, the font, appearance, reduced motion
├─ assets/fonts/               # Instrument Sans, self-hosted: latin and latin-ext woff2
├─ components/
│  ├─ copyable-input.tsx       # CopyButton, and the read-only URL field that uses it
│  ├─ provider-icons.tsx       # The brand marks of the AI apps
│  ├─ link-preview.tsx         # The link box in the phone dock: one line that grows in place
│  └─ ui/                      # shadcn-style Radix wrappers
│     ├─ button.tsx
│     ├─ segmented-control.tsx # Provider picker: one track, sliding indicator
│     ├─ toggle.tsx            # Toggle, ToggleGroup and ToggleGroupItem
│     └─ tooltip.tsx           # Feature descriptions on hover and focus
└─ lib/
   ├─ console-banner.ts        # The greeting that the browser console shows
   ├─ prompt-ideas.ts          # Example prompts for the empty prompt field, and the picker
   ├─ providers.tsx            # Provider configs, URL builders, oversized-URL fallback
   ├─ segmented-control.ts     # Pure indicator geometry for the segmented control
   └─ utils.ts                 # cn() helper, countCharacters(), countWords(), copyText()
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
│  ├─ console-banner.test.ts
│  ├─ prompt-ideas.test.ts
│  ├─ providers.test.ts
│  ├─ segmented-control.test.ts
│  ├─ utils.test.ts
│  └─ prerender-document.test.ts
└─ browser/       # The built site in Chromium
   ├─ harness.ts             # Static server, browser, and the page helpers (initScript stubs an API before load)
   ├─ measure.ts             # Contrast and target size, read from the pixels
   ├─ accessibility.test.ts
   ├─ interaction.test.ts
   └─ rendering.test.ts
```

### The unit tests

| File | Covers |
|------|--------|
| `tests/unit/providers.test.ts` | `buildURL` for every provider, param encoding, feature flags, temporary chat, the URL length threshold, and the `isUrlTooLong`/`resolveOpenAction` fallback, which drops only the prompt and keeps every setting |
| `tests/unit/segmented-control.test.ts` | The indicator position and the drag gesture: `resolveActiveIndex`, `clampPosition`, `getSegmentWidth`, `positionFromDrag`, `snapToIndex`, `getDragTension` and `getIndicatorGeometry`, with the guards for unknown, empty, out-of-range and non-finite input |
| `tests/unit/prompt-ideas.test.ts` | `dealIdeas` deals every other idea once, in an order that changes, and every idea is unique, short and plain |
| `tests/unit/utils.test.ts` | `countWords` whitespace handling and scripts without spaces, `countCharacters` for emoji, flags and skin tones and its ASCII fast path, `cn` class merging, and `copyText` with a working, a rejecting and a missing clipboard |
| `tests/unit/prerender-document.test.ts` | `insertMarkup` and `buildDocument`: the root element, the stylesheet, and the 14KB budget. Also `resolveAssetPath`, which takes the deploy base off a stylesheet URL |
| `tests/unit/console-banner.test.ts` | The console art: one style for each `%c`, the row count, rows of equal width, no row wider than 80 columns, the ink and the paper, no emoji or em dash, no sentence, no `url()`, and a console that throws |

There is no DOM test suite for a component in isolation. Move the pure parts
of a component into `src/lib/` instead, as `segmented-control.ts` does for the
indicator position. The unit tests can then use them.

### The browser tests

Some behaviour exists only in a browser: the size of a target, the ARIA
attributes, the layout at each width, the contrast and the drag gesture.

| File | Covers |
|------|--------|
| `tests/browser/accessibility.test.ts` | Contrast in both appearances, the 24px WCAG target and the 44px HIG target, the 13px text floor, one `h1`, an accessible name on every control and group, hidden decorative icons, the same focus indicator on every control, reduced motion, the selected states in forced colors, a hover on the open button that raises the contrast with no glow, and a prompt field edge of 3:1 in both appearances |
| `tests/browser/interaction.test.ts` | A copy with no Clipboard API, the example prompt that matches the placeholder and leaves on the first letter, an opened tab with no `window.opener` and the blocked popup message, a blocked tab with a link that opens the app and no notice after an undo, the pills as toggle buttons, a second press to clear, one feature at a time, the tooltip text, the tooltip for a tap, a long press, a swipe, a mouse, a pen that hovers and leaves, a pen tip, a sweep that never shows two tooltips and the keyboard, the text that cannot be selected, the home screen icons, the description that a pill has at rest, the counter that is not a live region, a press anywhere in the temporary chat row, drag and tap and arrow keys on the provider control, settings that survive a provider change, the copy failure message, and the open button on an origin with no clipboard, every label, counter and description as a single screen reader stop, a short name for the temporary chat row, Ctrl+Enter to open, a held key shown as pressed on its keycap, Arabic from the right, a trimmed prompt, and no copy of a link that is too long |
| `tests/browser/rendering.test.ts` | The rounded corners on every pill, the layout from 320px to 1024px, one column and two columns with the first controls on one line, a page that does not move on the first character, the open button in view on a short screen, every feature above the dock on a phone, the link line that grows into a panel with the full link and closes on a tap outside, the "How it works" steps that fold open into view, the fold of the rows that a provider does not support, text at 200 percent, the page without JavaScript, the prerendered markup, hydration without a mismatch, a page that fetches no more code as a person uses it, the console art, a reload that asks the network for the page after a deploy, and a full pass that stores nothing, a box that grows upward with the buttons fixed in the corner and turns back on a second tap, a close that starts gently with the text at full width, no scrollbar in the link box, a copy or a failed copy that moves nothing in the link box, a link line in readable letters, Share on a phone only, a one-line oversize message, and a prompt field the keyboard does not hide under the dock |

Rules for a browser test:

- They drive `dist/`, not the dev server, so they also cover the prerender
  step. `bun run test:browser` builds first.
- Contrast comes from the pixels that the browser paints, in `measure.ts`. A
  token says nothing about a translucent surface over a gradient.
- Each test opens its own context, so no test sees the storage of another.
- `openPage` collects every console error. A test can then assert that a flow
  reported none.
- Wait on a state, not on a time. `fillPrompt` waits until the link holds
  the prompt, and `settle` waits until no transition runs. A fixed
  `waitForTimeout` raced the deferred render on a slow machine. Keep a fixed
  wait only where the time is the behaviour: a tooltip delay, a long press,
  or a sample in the middle of a motion.
- Keep `--timeout 30000` on `test:browser`. A browser test needs more than the
  5 second default of `bun test`. When one test passes that default, it takes
  the shared browser down with it, and every test after it fails with
  `Target page, context or browser has been closed`. The real fault then hides
  behind nine misleading failures.

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
| `test.yml` | push to `main`, all PRs | `unit` runs lint and the unit tests, `browser` runs the browser tests, and on `main` `deploy` publishes to Pages only after both pass |
| `deploy.yml` | manual | Deploys to GitHub Pages by hand |
| `assign-issue.yml` | issue comment | Handles `.take` / `.release` / `.assign` / `.unassign` commands |

`deploy.yml` and `assign-issue.yml` delegate to reusable actions in `cr2007/actions@v1`. When updating CI, check that repository first before writing inline steps.

---

## Coding Conventions (Important)

### Linting

`bun run lint` passes, and CI runs it before the unit tests. The brand icons
live in `src/components/provider-icons.tsx` and the toggles in one
`toggle.tsx`, so no file mixes components with other exports.

Hallmark checks the design. Run it with Bun:

```sh
bun .agents/skills/hallmark/scripts/sloplint.mjs src index.html --scope app
```

Add `--render --url http://localhost:5173/` for the render tier. It needs
`puppeteer-core` (`HALLMARK_PUPPETEER`) and a browser that runs its sandbox
(`CHROME_PATH`, for example Brave). Delete the `.hallmark/` folder it writes.
One FAIL is known: 10a, the link box animates `height` on purpose. The
waivers sit in the stamp at the top of `index.css`.

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
- Hover is one signal, and it raises contrast. The open button fill takes one step toward `--foreground` with `color-mix`: darker in light mode, lighter in dark mode. Do not add a glow or a second signal. A fill at 90 percent with a glow in the button colour was the old hover: the fade lowered the contrast in both appearances, and the glow looked generated.
- Hover must not fade a control. A fade dims the label with the background, and the control then looks disabled.

### Focus

Every control that can take the focus gets the `focus-ring` class from `index.css`. It draws a 2px outline in `--focus-ring` with a 2px offset.

- Do not use `--ring` for a focus indicator. `--ring` is the accent colour, and it disappears on a control that the accent colour fills, such as the primary button or a selected pill.
- Do not add `outline-none` next to `focus-ring`. Tailwind utilities rank above the components layer, so `outline-none` removes the indicator.
- Keep the offset. The outline is then next to the page background, not next to the fill of the control.

### Words

The page must work for a person who has never heard "URL" or "prompt", and
for an expert who makes ten links in a row.

- One word for one meaning: "link", never "URL", in the UI. The provider
  control is labelled "AI app", because "Provider" reads as an internet or
  phone company.
- Keep every sentence at grade 8 or below (Flesch-Kincaid). Pill names stay
  as ChatGPT names them, so a person finds the same words there.
- The prompt placeholder is an example, not an instruction. It defines the
  word better than a definition does. It moves to a new example from
  `PROMPT_IDEAS` every 3.5 seconds, only while the field is empty, not
  focused, and on a visible tab. The prerendered page shows the first idea,
  so hydration agrees; then a random idea fades in. `dealIdeas` deals a
  shuffled deck, so no idea repeats until all have shown.
- The example is an `aria-hidden` overlay with the same padding and font as
  the field. The old idea fades out over 120ms, then the new one fades in
  from a 2px blur over 280ms with `ease-in-out`. The even curve makes the
  fade-in visible; a strong ease-out finished it before the eye saw it.
  Only the idea fades; "For example:" stays. The real placeholder stays in a clear colour
  for screen readers.
- A button label starts with a verb, in sentence case.
- An icon goes next to a label, never alone, unless the action is universal.
  The open button has a trailing arrow, because it opens a new tab.
- Ctrl or Command with Enter in the prompt opens the link. A wide screen with
  a mouse shows the shortcut in the open button, one keycap per key. A held
  key shows as pressed. The keycaps are `aria-hidden`: `aria-keyshortcuts` gives the shortcut to a
  screen reader.
- The prompt has `dir="auto"`, so Arabic and Hebrew run from the right.
- The link and the counts use the prompt without spaces and new lines at the
  ends.

### Screen readers

TalkBack on a real phone read some controls two or three times. A probe page
of the candidate markup, read with the TalkBack setting "Display speech
output" on and recorded, showed which markup reads once. Keep these patterns:

- A visible label of a control is `aria-hidden`, and the control takes its
  name from it with `aria-labelledby`, or the group has the same
  `aria-label`. Otherwise TalkBack stops on the label, then reads it again
  with the control.
- A button whose visible text is a name and a description (the temporary chat
  row) has both lines `aria-hidden`, and points `aria-labelledby` and
  `aria-describedby` at them. Hidden text still counts when an ARIA
  attribute points at it. Without `aria-hidden` the lines were read as the
  content of the button and again as its name and hint.
- A line that is the description of a field (the counter) is `aria-hidden`.
- A live region has `aria-live` and no role. An empty `role="status"` was
  a stop, and TalkBack said "status".
- Copy and Share keep the names "Copy link" and "Share link", so the narrow
  layout can show their icons only.

### Font

The font is Instrument Sans, self-hosted in `src/assets/fonts/`. There is no
request to another origin. One variable woff2 file per subset holds the
weights 400 to 700. `index.css` declares it with `font-display: swap`, and
`index.html` preloads the latin file, so the text does not swap after the
first paint. The service worker precaches the woff2 files for offline use.
The `<noscript>` page names the same family. `--font-sans` holds the stack,
so the `font-sans` class also gives Instrument Sans.

### Appearance

The appearance follows the system. The app has no light or dark control, no theme context and no `localStorage` value.

- The Tailwind `dark` variant is `@custom-variant dark (@media (prefers-color-scheme: dark))`. There is no `.dark` class. Do not add a class-based control.
- The dark values are in a `@media (prefers-color-scheme: dark) { :root { ... } }` block in `index.css`. Give each token in `:root` a value in that block.
- Every neutral has a faint indigo tint (chroma 0.005, hue 264), so the greys belong to the accent. Keep new neutrals tinted the same way.
- `--input` is the edge of a text field. It is 3:1 against the page in both appearances (WCAG 1.4.11). Pills use `--border`, which may be lighter.
- Selection, the caret and the scrollbar take the palette. `html` and `body` have `overflow-x: clip`, not `hidden`, so the sticky dock still works.
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
- The primary color tints the glass during the drag only: a deep indigo, hue 264, the hue of `--primary`. At rest the indicator is neutral. HIG color.md keeps a tinted background on one control, and the "Open in" button is that control.
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

The pills use flex wrap with `justify-center` (`justify-start` from 1024px,
where the label above is left aligned), not a grid. A grid keeps its
columns, so a part-filled last row stays on the left. Flex centres every row.

### Motion

- Name `scale` in a transition, not only `transform`. Tailwind v4 compiles
  `scale-*` to the independent `scale` property, and a transform transition
  does not cover it. The `transition-transform` shorthand does cover it.
- An element enters from `scale-90` or higher with opacity. Nothing appears
  out of nothing. Never start from `scale-0`.
- A press scales a control to 0.97, in every control. Use one value.
- `--ease-out` is also `--default-transition-timing-function`, so a
  transition with no easing class does not use the slower Tailwind curve.
  The app has one custom curve. Do not add a second `cubic-bezier`. The link
  box close uses the Tailwind `ease-in-out` keyword, not a new curve.
- Use `ease-out` for an element that enters. Keep a UI transition at or below
  300ms. `--ease-out` in `index.css` is a strong curve, so every `ease-out`
  utility uses it. Write `var(--ease-out)` in plain CSS, not the keyword.
- A keyboard action has no motion. An arrow key selects a provider with no
  slide. A click still slides the indicator.
- A tooltip that opens inside the skip delay has no animation. Radix marks it
  `data-state="instant-open"`.
- A control that a person meets many times a day has no entrance animation. The
  URL field and the open button have none.

### Speed

A key press must paint the letter at once, also after a long paste.
Measured on a real Android phone over adb with the Event Timing API (the
basis of INP), on the production build:

| Prompt | Before | After |
|---|---|---|
| 72 characters | 40ms | 40ms |
| 100,000 characters, mixed scripts | 112 to 120ms | 32ms |
| 100,000 characters, English | 40ms | 32ms |

- The counter (`PromptMeta` in `App.tsx`), `LinkPreview` and
  `CopyableInput` read deferred copies of the prompt and the link
  (`useDeferredValue`) and are wrapped in `memo`. The urgent render of a
  key press skips them. The open button uses the current link.
- `countCharacters` skips the segmenter for plain ASCII text. It counts in a
  loop, not with `Array.from`, so a long paste does not feed the garbage
  collector.
- Every regex and `Intl.Segmenter` is made once, at module level.
- Not changed, with the reason: `new URL()` in `buildURL` runs once a
  render and costs about 1 microsecond; the encoding is the cost. There is no
  chain of `await`s on a hot path. `PROVIDERS` has three entries, so an
  array of structures is right. The app has no spinner.

### Element IDs

Give each important container and control a readable `id`. Name it for its function, for example `provider-picker`, `open-in-provider` or `how-it-works-toggle`. Do not name it for its style. These ids identify elements in a review. They are also targets for `aria-labelledby` and `aria-controls`. A wrapper component must accept an `id` prop and pass it on.

### Comments

- Give each exported function, component and interface a TSDoc block. Add `@param` and `@returns`.
- Number the steps in a function body as `Step X.Y`.
- Write the reason for the code, not the operation of the code. Delete a comment that is not correct.
- Use ASD-STE100 Simplified Technical English. Write short sentences. Use the active voice. Use one word for one meaning.
- Do not use an em dash. Do not use an emoji.

### Service worker

`src/sw.ts` keeps the app working offline, and a deploy must still show at
once.

- The page is network-first, with `cache: "no-cache"`. GitHub Pages sends
  `max-age=600`, so a plain fetch could get a 10 minute old page from the
  browser cache. Offline, or after 3 seconds, the precached page answers.
- Cache-first for the page showed the old build on the first visit after
  every deploy. A test of two builds served in turn showed it: the old
  worker gave v1, then v2; this one gives v2 at once and still loads offline.
- The scripts, the styles and the fonts have a hash in their names, so they
  stay precached and cache-first.
- `skipWaiting` and `clientsClaim` let a new worker take over without a
  closed window. The worker never reloads an open page, so a typed prompt
  is safe.
- Import `workbox-*` packages only from the direct dev dependencies.

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
  when the stylesheet loads and keeps the palette when it does not. The
  `--ns-*` values sit in `:root` blocks inside that style, so no colour
  literal sits in a rule.
- `public/llms.txt` holds the same grammar for an agent. Change both together.

### Layout

The page is one column on a phone and two columns from 1024px: the inputs on the
left, the result on the right.

- Do not tie the two columns together with `subgrid`. The result column is
  sticky and has two rows to the four on the left, so shared rows would
  break the sticky column. The first controls already share one line, and a
  test checks it.
- `#inputs-column` and `#result-column` use `contents` below 1024px, so their
  children join the one column. The column uses `flex gap-5`, not `space-y`,
  because `space-y` does not reach through `display: contents`.
- The dock with the open button sticks to the bottom edge on a phone. It must
  be a child of a tall box. A sticky element cannot leave its parent, so do not move it into a
  short wrapper. From 1024px the result column is sticky and the button is static.
- The page must not move when the state changes. The URL field, the link line
  in the dock and the counter line are always in the page and hold their size. The open button is disabled
  when there is no prompt. A test measures this.
- A control that a provider does not support folds away with `Collapse` in
  `App.tsx`, over 200ms. The content stays mounted and has `inert`. The row
  keeps the text of the last provider while it folds.
- The "How it works" steps use the same fold. They open at the end of the
  page, below the screen, so after the fold the page scrolls just enough to
  show them. With reduced motion the scroll is a jump, not a glide.
- A control that can take text size must reflow. The provider control reads its
  own width in `rem`, so it stacks when the text grows. A label breaks inside a
  word before it overflows.

### Mobile

- `html` has `-webkit-tap-highlight-color: transparent`. Every control has its
  own press scale, so the grey flash on a tap adds nothing.
- The prompt field is 16px on a coarse pointer, so iOS does not zoom on focus.
  Never use `maximum-scale` or `user-scalable=no`.
- `main` uses `min-h-dvh`, not `min-h-screen`. The browser bars change the
  height of `100vh`.
- `index.css` makes everything in `main` not selectable, so a long press on a
  label, a count or a control does not open the cut and copy bar. The two
  `textarea` fields are the content and stay selectable. They have an explicit
  rule, because iOS can make a field read-only inside a parent with no
  selection. A control also gets no callout and no double tap zoom delay.
- The viewport has `interactive-widget=resizes-content`, so the Android
  keyboard shrinks the layout and the pinned button rises with it. iOS does not
  shrink the layout. Check the keyboard on a real phone.
- The shrunk layout moves the pinned dock up over the prompt field. A resize
  scrolls the focused field back into view, and the scroll padding keeps it
  clear of the dock. TalkBack on a real phone showed this fault.
- The viewport has no `viewport-fit=cover`. The browser keeps the page inside
  the safe area. Do not add `viewport-fit=cover` without safe-area padding on
  `main` and on the pinned bar.
- A tap on a pill opens no tooltip. A press of 400ms does. See **Tooltips**.
  A line under the pills tells a touch user about the long press. It shows
  only on a coarse pointer. Do not put information in a tooltip alone.
- On a phone the pinned dock (`#open-action-section`) holds the result: the
  link on one line (`#url-preview-toggle`), a Copy button with a text label,
  and the open button. The URL field (`#generated-url-section`) shows from
  1024px only. The features are then on the first screen.
- The link line shows the link decoded: no scheme, spaces for plus signs, and
  the letters of any script instead of percent codes. Copy and Open use the
  real link. A link icon marks the line.
- A phone or a tablet with the system share sheet also gets a Share button.
  The test is `(pointer: coarse)` and `navigator.share`: the device type,
  not the screen width. The share sheet needs a secure origin, so a page on
  plain http gets Copy only.
- The link, Copy and Share are one box, `LinkPreview` in `link-preview.tsx`.
  Closed, the box shows one line of the link, with a fade at its end, and the
  text stops before the buttons. A tap on the text (`#url-preview-toggle`)
  opens it: the text uses the full width and grows to its natural height
  (`height: auto` with `interpolate-size`), and the box grows upward. A
  second tap, Escape, or a tap outside closes it. The focus stays on the
  toggle. Copy and Share never move: they are pinned to the bottom right
  corner, and the closed text keeps clear of their measured width.
- The motion must go unnoticed: 250ms each way, one element, no swap and
  no crossfade. The open uses `--ease-out`. The close uses Tailwind's
  `ease-in-out`, because `--ease-out` did most of the shrink in the first
  80ms and read as rushed. The room for the buttons is `padding-bottom`, so
  it is in the transition with the height. Without it the close dropped 44px
  in the first frame. On close the text keeps the full width until the box
  has shrunk: the padding for the buttons comes back after 250ms. With Share
  the closed column is narrow, and on a real phone an early change made the
  text jump into a tall column of five lines. The text hides its scrollbar: it is taller than the box
  while the box grows, and a touch still scrolls a long link. On open the text settles out of a 2px
  blur (`link-settle` in `index.css`), which hides the jump of the reflow. A
  CSS transition turns around from where it is, so a tap during the motion
  reverses it. A View Transitions morph was tried and dropped: it showed two
  copies of the link at once, and a tap during it reached `<html>`, not the
  box. A browser without
  `interpolate-size` opens the box at once. Frame strips at 10 percent speed
  (CDP `Animation.setPlaybackRate`) are the check. Every copy button is
  `CopyButton` in `copyable-input.tsx`.
- "Copy" and "Copied" share one grid cell, so the wider word sets the button
  width and a copy moves nothing. The box measures that width for the link
  text, so a label that grew made the text jump on the copy and 2.5 seconds
  later. The shown word fades in from a 2px blur over 150ms. A failed copy
  shows "Failed" and a warning icon in the button, and the status line is for
  screen readers only: shown, the long line widened the bar over the link.
- While the link is too long to open, Copy and Share are off. The open button
  copies the prompt instead.
- With large text the link line would make the dock too tall. `#app` is a
  container. Below a column of 16rem the link line leaves the dock, the URL
  field shows in the page again, and the dock is no longer pinned. Only large
  text makes the column that narrow in `rem`.

### Forced colors

`@media (forced-colors: active)` in `index.css` is outside every layer. A
Tailwind utility is in the utilities layer and would outrank it. The browser
removes fills and shadows in this mode, so each selected control has a cue that
survives: an outline on the indicator, a `Highlight` fill on a selected pill, and
a border on the buttons. Add a cue here for a new control that shows a state by
colour.

### Tooltips

A feature pill has a tooltip that describes the feature. The text is in
`providers.tsx` next to the feature, not in `App.tsx`.

- A tooltip repeats what `aria-describedby` gives a screen reader. Never put
  information in a tooltip alone.
- The description of each pill is in a span with the `hidden` attribute that
  is always in the page. `aria-describedby` reads hidden text, so a screen
  reader hears the description once, with the pill. An `sr-only` span was
  also in the reading order, and a line-by-line reader heard it twice. The
  tooltip is in the page only while it is open, so a pill must not point
  `aria-describedby` at it.
- A tooltip fades in and leaves at once. It has no zoom, no slide and no exit.
  The fade is the native `tooltip-in` keyframe in `index.css`, so the app needs
  no animation library. The tooltip is `@radix-ui/react-tooltip`, not the
  `radix-ui` package of every primitive.
  The closed state has `animate-none`. Without it the enter animation starts
  again on close, and Radix keeps the old tooltip in the page beside the new
  one. The box fits its text: `text-pretty`, not `text-balance`, because a
  balanced box keeps its full width and leaves space on the right.
- Touch and a pen tip: a tap opens nothing. Radix opens a tooltip on focus,
  and a tap focuses the pill after the finger lifts, so `Tooltip` in
  `tooltip.tsx` controls the open state and drops an open that comes from a
  press that is not a mouse button. A press of 400ms opens the tooltip above
  the finger. The click after that press does nothing. The tooltip stays 1.5
  seconds after the finger lifts. A swipe of more than 10px cancels the press.
- A pen on a touch device: Chromium on Android drops the hover exit of a pen
  (crbug.com/715114), so the page gets no leave event. A hovering pen sends a
  move about every 16ms, even when held still. `Tooltip` opens on a pen hover
  move and closes after 300ms with no move. After a pen tap the hover does
  not reopen it until the pen leaves the trigger, as with a mouse click. Brave on Android (Chromium 156)
  sends no pen hover at all. Chrome 158 does. Verified over adb on a real
  Android phone.
- Hover with a mouse or a pen: Radix opens the tooltip. A hover is a move with
  no button down. When the main pointer is
  coarse, `TooltipProvider` sets the delay to 0, so a mouse or an S Pen on a
  phone gets the tooltip at once. A desktop waits 200ms.
- Keyboard: focus opens the tooltip. `onBlur` resets the touch flag, so a tab
  after a tap still works.
- `TooltipTrigger asChild` writes `data-state` onto its child. Do not style a
  trigger from `data-state`.

### Console Greeting

`src/lib/console-banner.ts` shows one picture in the browser console.
`main.tsx` calls it after the app mounts. It prints no text. The page already
explains itself, and the console is not a second place to do that.

**The picture is text, not an image file.** Chrome does not load a background
image from a console style. The row draws at the right size, and the picture
never arrives. Verified against a served file, HTTP 200, with no Content
Security Policy: the browser never requests it. Do not put `url()` in a
console style. A test guards this.

- Each cell was matched by glyph shape, not by brightness alone. Every
  candidate character was drawn, reduced to a grid of segments, and compared
  against the same grid taken from the picture. Box drawing characters then
  land on the edges, which a brightness ramp cannot do.
- Keep every row at or below 80 columns. A console wraps a longer row, and a
  wrapped row breaks the picture. A test measures this.
- The style sets both the ink and the paper. A console has its own theme that
  the page cannot read, so art that takes the console colour is right on one
  theme and a negative on the other. Fixed colours look the same on both. Do
  not remove either one, and do not use a tint: a tint flattens the shading
  that carries the face.
- A solid character means a dark part of the picture, which is correct
  because the ink is dark. Do not invert the tones to suit a dark console.
  The paper already fixes the polarity.
- Every row is padded to the same width. The paper is the background of the
  text, so a short row leaves a notch in the rectangle. A test measures this.
- `printBanner` catches its own errors. An extension can replace
  `console.log`, and a greeting must never stop the app.
- The art ships in the JS bundle, not in the document, so it does not count
  against the 14KB first response.

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
characters, `resolveOpenAction` drops only the `q` parameter and returns
`shouldCopyPrompt: true`. The other parameters stay, so the feature and the
temporary chat setting still apply; `App.tsx`'s `handleOpenInProvider` then copies the
trimmed prompt to the clipboard and opens that URL instead of the full one.
The UI reflects this up front: the button label changes to "Copy prompt and
open {provider}", and a persistent (non-hover) message in the counter line,
"Too long for a link.", says why, so it is visible on touch devices too. The
message is short so it stays one line on a 320px phone, and it is not in the
pinned bar, which must stay small. Copy and Share are off while the link is
too long. This mirrors the approach used by
`resend/react-email` (PR #3404) and avoids HTTP 431 errors from servers that
cap request line length.

`handleOpenInProvider` also handles a blocked new tab: if `window.open`
returns `null`, the notice says so and gives a link to the same address. A
link that the person clicks is never blocked as a pop-up. Each notice keeps
the link it was raised for, and any change of the link clears it, so an undo
back to the same prompt does not bring an old notice back.

The opened tab must not get `window.opener`, a handle that can send this tab
to another address. `"noopener"` would make `window.open` return `null` and
hide a blocked popup, so the handler sets `opener` to `null` after the open.

**Critical guidelines:**
- Do not manually encode query strings - always use `URLSearchParams`.
- Copy through `copyText` in `src/lib/utils.ts`. Never call `navigator.clipboard.writeText` directly. It falls back to `document.execCommand("copy")` through a hidden read-only field, because a page on plain http, such as the dev server on a LAN address, has no Clipboard API. An insecure origin has no clipboard, so reading `writeText` throws at once, and a `.catch()` on the call never sees it. In `handleOpenInProvider` that killed the handler before `window.open`, and nothing happened at all.
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
| `public/apple-touch-icon.png` | 180 × 180 | iOS home screen icon. No rounded corners and no transparency: iOS rounds it and fills a transparent corner with black |
| `public/icon-192.png`, `public/icon-512.png` | 192, 512 | Android and PWA icons, rounded, purpose `any` |
| `public/icon-maskable-512.png` | 512 × 512 | Purpose `maskable`. No rounded corners. The mark stays inside the central 80 percent circle, so a launcher can cut any shape |

If `og-image.png` is missing, the build will still succeed but social previews
will degrade gracefully. The PNG icons are drawn from the same mark as the
favicon, the chat link: a flat chain link whose left half is a chat bubble,
with a stroke of 1.5 in a 32 grid. If the mark changes, make all five files
again.

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
