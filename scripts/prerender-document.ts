/**
 * Document assembly for the prerender step.
 *
 * These functions are pure, so the tests can use them without a build. This
 * module imports nothing, so `vite.config.ts` can read {@link BASE_PATH} from
 * it without loading the build tools.
 */

/**
 * The path that the site deploys under.
 *
 * GitHub Pages serves the site from a subdirectory named after the
 * repository. A local build and a preview serve from the root.
 *
 * `vite.config.ts` sets the Vite base from this value, and the prerender step
 * takes it off again with {@link resolveAssetPath}. Both must agree. If they
 * do not, the prerender step looks for the stylesheet in a directory that the
 * build never made.
 */
export const BASE_PATH =
  process.env.GITHUB_PAGES === "true" ? `/${process.env.GITHUB_REPO || ""}/` : ""

/**
 * The first-response budget, in gzipped bytes.
 *
 * A server can send about 14KB in the first round trip, before it has to wait
 * for an acknowledgement. A document that carries its markup and its styles
 * within that window paints without a second trip.
 */
export const FIRST_RESPONSE_BUDGET = 14 * 1024

/** Matches the empty root element that Vite writes. */
const ROOT_PATTERN = /<div id="root">\s*<\/div>/

/** Matches the stylesheet link that Vite writes. */
const STYLESHEET_PATTERN = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/

/** What {@link buildDocument} produced. */
export interface BuiltDocument {
  /** The document to write. */
  html: string
  /** Whether the stylesheet went into the document. */
  cssInlined: boolean
  /** The size of the document, in gzipped bytes. */
  gzipSize: number
}

/**
 * Finds the stylesheet that the document links to.
 *
 * @param html - The document from the build.
 * @returns The `href`, or null when the document links to no stylesheet.
 */
export function findStylesheetHref(html: string): string | null {
  return html.match(STYLESHEET_PATTERN)?.[1] ?? null
}

/**
 * Turns a stylesheet URL from the document into a path inside `dist/`.
 *
 * The build writes an absolute URL that carries the deploy base, for example
 * `/aichat-url-maker/assets/index.css`. The file itself sits at
 * `dist/assets/index.css`, so the base has to come off before the path can
 * join to `dist/`.
 *
 * @param href - The URL from the `<link>` tag.
 * @param base - The deploy base. Use an empty string for the root.
 * @returns The path, relative to `dist/`.
 *
 * @example
 * ```ts
 * resolveAssetPath("/repo/assets/a.css", "/repo/") // "assets/a.css"
 * ```
 */
export function resolveAssetPath(href: string, base: string): string {
  // Step 1.1: remove the deploy base, which `dist/` does not contain.
  const withoutBase = base && href.startsWith(base) ? href.slice(base.length) : href

  // Step 1.2: make the path relative, so it can join to `dist/`.
  return withoutBase.replace(/^\//, "")
}

/**
 * Puts the markup into the root element.
 *
 * @param html - The document from the build.
 * @param markup - The HTML for the root element.
 * @returns The document with the markup in place.
 * @throws If the document has no empty root element.
 */
export function insertMarkup(html: string, markup: string): string {
  // Step 1.1: refuse a document that the build did not produce. A silent miss
  // here would ship an empty page.
  if (!ROOT_PATTERN.test(html)) {
    throw new Error('could not find an empty <div id="root"> in the document')
  }

  // Step 1.2: place the markup.
  return html.replace(ROOT_PATTERN, `<div id="root">${markup}</div>`)
}

/**
 * Builds the document that the server sends.
 *
 * The stylesheet goes into the document only while the result stays inside
 * the budget. An external sheet is a second round trip, and it blocks
 * painting, which is the delay this step removes.
 *
 * @param options.html - The document from the build.
 * @param options.markup - The HTML for the root element.
 * @param options.css - The stylesheet, or null to keep the link.
 * @param options.measure - Returns the gzipped size of a string.
 * @param options.budget - The limit in gzipped bytes.
 * @returns The document, whether the CSS went in, and the final size.
 */
export function buildDocument({
  html,
  markup,
  css,
  measure,
  budget = FIRST_RESPONSE_BUDGET,
}: {
  html: string
  markup: string
  css: string | null
  measure: (text: string) => number
  budget?: number
}): BuiltDocument {
  // Step 1.1: place the markup first. It is always included.
  const withMarkup = insertMarkup(html, markup)

  // Step 1.2: keep the link when there is no stylesheet to put in.
  if (css === null || !STYLESHEET_PATTERN.test(withMarkup)) {
    return { html: withMarkup, cssInlined: false, gzipSize: measure(withMarkup) }
  }

  // Step 1.3: include the stylesheet only while the document fits.
  const withCss = withMarkup.replace(STYLESHEET_PATTERN, `<style>${css}</style>`)
  const size = measure(withCss)
  if (size <= budget) {
    return { html: withCss, cssInlined: true, gzipSize: size }
  }

  return { html: withMarkup, cssInlined: false, gzipSize: measure(withMarkup) }
}
