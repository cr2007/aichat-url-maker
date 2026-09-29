import { chromium, type Browser, type BrowserContext, type Page } from "playwright"

/**
 * Shared setup for the browser tests.
 *
 * These tests drive the production build, not the dev server, so they also
 * cover the prerender step. `bun run build` must run first. The CI workflow
 * does that.
 */

/** The directory that holds the build. */
const DIST = new URL("../../dist/", import.meta.url).pathname

/** The port for the test server. It must not clash with `bun dev`. */
const PORT = 4321

/** The address that a test opens. */
export const SITE = `http://localhost:${PORT}/`

/** A long prompt that crosses the 7500 character URL limit. */
export const OVERSIZED_PROMPT = "word ".repeat(1700)

/** A normal prompt. */
export const SAMPLE_PROMPT = "Summarize this paper."

let server: ReturnType<typeof Bun.serve> | null = null
let browser: Browser | null = null

/**
 * Starts the static server and the browser.
 *
 * Call this once per test file, in `beforeAll`.
 *
 * @throws If `dist/` holds no build.
 */
export async function startHarness(): Promise<void> {
  // Step 1.1: refuse to run against a missing build. A test that silently
  // gets a 404 reports a confusing failure.
  if (!(await Bun.file(`${DIST}index.html`).exists())) {
    throw new Error("dist/index.html is missing. Run `bun run build` first.")
  }

  // Step 1.2: serve the build.
  server = Bun.serve({
    port: PORT,
    async fetch(request) {
      const path = new URL(request.url).pathname
      const file = Bun.file(DIST + (path === "/" ? "index.html" : path.slice(1)))
      return (await file.exists())
        ? new Response(file)
        : new Response("not found", { status: 404 })
    },
  })

  // Step 1.3: one browser serves every test in the file.
  browser = await chromium.launch()
}

/** Stops the browser and the server. Call this in `afterAll`. */
export async function stopHarness(): Promise<void> {
  await browser?.close()
  browser = null
  server?.stop(true)
  server = null
}

/** How a test wants the page set up. */
export interface PageOptions {
  /** The appearance to emulate. The default is light. */
  colorScheme?: "light" | "dark"
  /** The viewport width in pixels. The default is 760. */
  width?: number
  /** The viewport height in pixels. The default is 1200. */
  height?: number
  /** Set false to test the page without JavaScript. */
  javaScript?: boolean
  /** Set "reduce" to test the reduced motion rules. */
  reducedMotion?: "reduce" | "no-preference"
}

/** A page, its context, and the errors it reported. */
export interface OpenPage {
  page: Page
  context: BrowserContext
  /** Every page error and console error since the page opened. */
  errors: string[]
  /** Closes the context. */
  close: () => Promise<void>
}

/**
 * Opens the built site in a new context.
 *
 * Each test gets its own context, so no test sees another test's storage or
 * its state.
 *
 * @param options - See {@link PageOptions}.
 * @returns The page, and the errors it collects.
 */
export async function openPage(options: PageOptions = {}): Promise<OpenPage> {
  if (!browser) throw new Error("startHarness() did not run")

  // Step 1.1: build a context that matches what the test asks for.
  const context = await browser.newContext({
    colorScheme: options.colorScheme ?? "light",
    viewport: { width: options.width ?? 760, height: options.height ?? 1200 },
    javaScriptEnabled: options.javaScript ?? true,
    reducedMotion: options.reducedMotion,
    deviceScaleFactor: 1,
  })

  // Step 1.2: collect every error. A test then asserts that there were none.
  const errors: string[] = []
  const page = await context.newPage()
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  // Step 1.3: wait for the network, so the page has finished loading.
  await page.goto(SITE, { waitUntil: options.javaScript === false ? "load" : "networkidle" })

  return { page, context, errors, close: () => context.close() }
}

/**
 * Types a prompt, which makes the URL and the open button appear.
 *
 * @param page - The page to type into.
 * @param prompt - The text for the prompt field.
 */
export async function fillPrompt(page: Page, prompt = SAMPLE_PROMPT): Promise<void> {
  await page.fill("#prompt-input", prompt)
  await page.waitForTimeout(250)
}

/**
 * Reads the generated URL.
 *
 * @param page - The page to read from.
 * @returns The URL, or an empty string before a prompt exists.
 */
export async function generatedUrl(page: Page): Promise<string> {
  return page.evaluate(
    () => (document.getElementById("generated-url") as HTMLTextAreaElement | null)?.value ?? ""
  )
}
