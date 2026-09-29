/**
 * Prerenders the built page into `dist/index.html`.
 *
 * A client-rendered page sends a document with an empty root, so nothing
 * paints until the bundle downloads, parses and runs. On a slow connection
 * that is several seconds of blank screen.
 *
 * This step renders the app to a string and writes it into the document,
 * with the stylesheet. The browser then paints from the first response
 * alone, and `main.tsx` hydrates that markup when the bundle arrives.
 *
 * The markup comes from `react-dom/server`, not from a browser snapshot. A
 * snapshot also captures what a component writes to the DOM after it mounts,
 * such as the roving `tabindex` that Radix manages. React then reports a
 * hydration mismatch and discards the markup.
 *
 * `bun run build` runs this after `vite build`.
 */
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"

import App from "../src/App"
import {
  BASE_PATH,
  FIRST_RESPONSE_BUDGET,
  buildDocument,
  findStylesheetHref,
  resolveAssetPath,
} from "./prerender-document"

const DIST = new URL("../dist/", import.meta.url).pathname
const INDEX = `${DIST}index.html`

/** Measures a string the way the server sends it. */
const gzipSize = (text: string) => Bun.gzipSync(new TextEncoder().encode(text)).length

// Step 1.1: render the same tree that `main.tsx` mounts, so the markup and
// the first client render agree.
const markup = renderToString(
  <StrictMode>
    <App />
  </StrictMode>
)

// Step 1.2: read the document and its stylesheet.
const html = await Bun.file(INDEX).text()
const href = findStylesheetHref(html)
const css = href ? await Bun.file(DIST + resolveAssetPath(href, BASE_PATH)).text() : null

// Step 1.3: assemble the document and write it back.
const result = buildDocument({ html, markup, css, measure: gzipSize })
await Bun.write(INDEX, result.html)

console.log(
  `prerendered dist/index.html: ${result.html.length} bytes, ${result.gzipSize} gzip` +
    (result.cssInlined ? ", stylesheet included" : ", stylesheet left external")
)
if (result.gzipSize > FIRST_RESPONSE_BUDGET) {
  console.warn(`  above the budget by ${result.gzipSize - FIRST_RESPONSE_BUDGET} bytes`)
}
