import { describe, expect, test } from "bun:test"
import {
  BASE_PATH,
  FIRST_RESPONSE_BUDGET,
  buildDocument,
  findStylesheetHref,
  insertMarkup,
  resolveAssetPath,
} from "../../scripts/prerender-document"

/** The repository root, for a subprocess that reads the build config. */
const ROOT = new URL("../../", import.meta.url).pathname

const SHELL =
  '<!doctype html><html><head>' +
  '<link rel="stylesheet" crossorigin href="/assets/index-abc.css">' +
  '</head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>'

/** Counts bytes, standing in for gzip so the tests stay deterministic. */
const byteSize = (text: string) => text.length

describe("findStylesheetHref", () => {
  test("finds the stylesheet the build links", () => {
    expect(findStylesheetHref(SHELL)).toBe("/assets/index-abc.css")
  })

  test("returns null when there is no stylesheet", () => {
    expect(findStylesheetHref("<html><head></head><body></body></html>")).toBeNull()
  })
})

describe("insertMarkup", () => {
  test("puts the markup in the root element", () => {
    expect(insertMarkup(SHELL, "<main>hi</main>")).toContain('<div id="root"><main>hi</main></div>')
  })

  test("accepts whitespace inside the root element", () => {
    expect(insertMarkup('<div id="root">\n  </div>', "<p>x</p>")).toBe('<div id="root"><p>x</p></div>')
  })

  test("throws when the root element is missing", () => {
    // A silent miss here would ship an empty page.
    expect(() => insertMarkup("<html><body></body></html>", "<p>x</p>")).toThrow(/root/)
  })

  test("throws when the root element already holds markup", () => {
    expect(() => insertMarkup('<div id="root"><p>old</p></div>', "<p>new</p>")).toThrow(/root/)
  })
})

describe("buildDocument", () => {
  test("includes the stylesheet when the document fits", () => {
    const result = buildDocument({
      html: SHELL,
      markup: "<main>hi</main>",
      css: ".a{color:red}",
      measure: byteSize,
      budget: 10_000,
    })
    expect(result.cssInlined).toBe(true)
    expect(result.html).toContain("<style>.a{color:red}</style>")
    expect(result.html).not.toContain("<link rel=\"stylesheet\"")
    expect(result.html).toContain("<main>hi</main>")
  })

  test("keeps the stylesheet external when the document would not fit", () => {
    const result = buildDocument({
      html: SHELL,
      markup: "<main>hi</main>",
      css: "x".repeat(5_000),
      measure: byteSize,
      budget: 500,
    })
    expect(result.cssInlined).toBe(false)
    expect(result.html).toContain('<link rel="stylesheet"')
    // The markup still goes in. Only the stylesheet is conditional.
    expect(result.html).toContain("<main>hi</main>")
  })

  test("reports the size of the document it returns", () => {
    const tooBig = buildDocument({
      html: SHELL,
      markup: "<main>hi</main>",
      css: "x".repeat(5_000),
      measure: byteSize,
      budget: 500,
    })
    expect(tooBig.gzipSize).toBe(tooBig.html.length)
  })

  test("keeps the link when there is no stylesheet", () => {
    const result = buildDocument({
      html: SHELL,
      markup: "<main>hi</main>",
      css: null,
      measure: byteSize,
    })
    expect(result.cssInlined).toBe(false)
    expect(result.html).toContain('<link rel="stylesheet"')
  })

  test("uses the 14KB budget by default", () => {
    expect(FIRST_RESPONSE_BUDGET).toBe(14 * 1024)
  })

  test("a document exactly at the budget still includes the stylesheet", () => {
    const css = "y"
    const expected = SHELL.replace(
      /<link rel="stylesheet"[^>]*href="[^"]+"[^>]*>/,
      `<style>${css}</style>`
    ).replace(/<div id="root">\s*<\/div>/, '<div id="root"><main>hi</main></div>')

    const result = buildDocument({
      html: SHELL,
      markup: "<main>hi</main>",
      css,
      measure: byteSize,
      budget: expected.length,
    })
    expect(result.cssInlined).toBe(true)
  })
})

describe("BASE_PATH", () => {
  /**
   * Reads both bases from a build that thinks it runs on GitHub Pages.
   *
   * The values come from the environment at import time, so a subprocess is
   * the only way to see the Pages case from here.
   *
   * @returns The shared constant and the base that Vite would use.
   */
  function readPagesBases(): { BASE_PATH: string; base: string } {
    // Step 1.1: import both modules with the Pages variables set.
    const source =
      'const { BASE_PATH } = await import("./scripts/prerender-document.ts");' +
      'const config = (await import("./vite.config.ts")).default;' +
      "console.log(JSON.stringify({ BASE_PATH, base: config.base }))"
    const run = Bun.spawnSync(["bun", "-e", source], {
      cwd: ROOT,
      env: { ...process.env, GITHUB_PAGES: "true", GITHUB_REPO: "aichat-url-maker" },
    })

    // Step 1.2: read the last line, so a warning above it does not break it.
    const out = run.stdout.toString().trim().split("\n").at(-1) ?? ""
    return JSON.parse(out)
  }

  test("Vite deploys under the path that the prerender step removes", () => {
    // The two once disagreed. Vite wrote `/aichat-url-maker/assets/index.css`
    // while the prerender step looked under `dist/` for that whole path, so
    // the deploy failed with ENOENT and no local build saw it.
    const { BASE_PATH: shared, base } = readPagesBases()
    expect(shared).toBe("/aichat-url-maker/")
    expect(base).toBe(shared)
  })

  test("a local build deploys from the root", () => {
    expect(BASE_PATH).toBe("")
  })
})

describe("resolveAssetPath", () => {
  test("it removes the deploy base", () => {
    // GitHub Pages serves from a subdirectory, so the href carries the
    // repository name. The file has no such directory inside `dist/`.
    expect(resolveAssetPath("/aichat-url-maker/assets/index.css", "/aichat-url-maker/")).toBe(
      "assets/index.css"
    )
  })

  test("it makes a root path relative", () => {
    expect(resolveAssetPath("/assets/index.css", "")).toBe("assets/index.css")
  })

  test("it keeps a path that is already relative", () => {
    expect(resolveAssetPath("assets/index.css", "")).toBe("assets/index.css")
  })

  test("it leaves a path that does not carry the base", () => {
    expect(resolveAssetPath("/assets/index.css", "/other/")).toBe("assets/index.css")
  })
})
