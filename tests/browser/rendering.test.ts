import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { fillPrompt, openPage, startHarness, stopHarness, OVERSIZED_PROMPT } from "./harness"

/** The widths that the layout must hold, in pixels. */
const WIDTHS = [320, 375, 414, 768, 1024]

/** The build that the browser tests serve. */
const DIST = new URL("../../dist/", import.meta.url).pathname

beforeAll(startHarness)
afterAll(stopHarness)

describe("layout", () => {
  for (const width of WIDTHS) {
    test(`it fits at ${width}px`, async () => {
      const opened = await openPage({ width })
      await fillPrompt(opened.page)
      await opened.page.click('#feature-picker button:has-text("Deep Research")')
      await opened.page.waitForTimeout(300)

      const overflow = await opened.page.evaluate(() => {
        const wide: string[] = []
        for (const element of document.querySelectorAll<HTMLElement>("body *")) {
          const rect = element.getBoundingClientRect()
          if (rect.width > 0 && rect.right > document.documentElement.clientWidth + 1) {
            wide.push(element.id || element.tagName.toLowerCase())
          }
        }
        return {
          wide,
          scrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        }
      })

      expect(overflow.wide).toEqual([])
      expect(overflow.scrolls).toBe(false)
      await opened.close()
    })
  }

  test("every pill keeps its own rounded corners", async () => {
    // `ToggleGroupItem` once wrote data-spacing="0" at all times, which
    // compiled to [data-spacing="0"]{border-radius:0}. That attribute
    // selector outranks `rounded-md`, so five of the seven pills rendered
    // square and the row looked like a broken segmented bar.
    const opened = await openPage()
    const radii = await opened.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#feature-picker button")].map(
        (pill) => getComputedStyle(pill).borderRadius
      )
    )
    expect(radii.length).toBe(7)
    expect(radii.filter((radius) => Number.parseFloat(radius) > 0)).toHaveLength(7)
    expect([...new Set(radii)]).toHaveLength(1)
    await opened.close()
  })

  test("the text stays on the buttons at the narrowest width", async () => {
    // The pills wrap their text rather than clip it, so a long label must
    // make the button taller and never leave the border.
    const opened = await openPage({ width: 320 })
    const clipped = await opened.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#feature-picker button")]
        .filter((pill) => pill.scrollWidth > pill.clientWidth + 1)
        .map((pill) => (pill.textContent ?? "").trim())
    )
    expect(clipped).toEqual([])
    await opened.close()
  })
})

describe("text at 200 percent", () => {
  test("the page holds together", async () => {
    // WCAG 1.4.4 asks for 200 percent without loss of content.
    const opened = await openPage({ width: 375 })
    await opened.page.evaluate(() => {
      document.documentElement.style.fontSize = "32px"
    })
    await fillPrompt(opened.page)
    await opened.page.waitForTimeout(300)

    const result = await opened.page.evaluate(() => ({
      scrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      button: document.getElementById("open-in-provider")?.getBoundingClientRect().height ?? 0,
    }))
    expect(result.scrolls).toBe(false)
    expect(result.button).toBeGreaterThan(44)
    await opened.close()
  })
})

describe("the page without JavaScript", () => {
  test("it explains how to build a link", async () => {
    const opened = await openPage({ javaScript: false })
    const result = await opened.page.evaluate(() => ({
      tables: document.querySelectorAll("noscript table").length,
      visible: (document.body.innerText ?? "").length,
    }))
    // The tables live inside <noscript>, which a parser keeps as text until
    // scripting is off. The browser here has scripting off, so they parse.
    expect(result.tables).toBeGreaterThanOrEqual(3)
    expect(result.visible).toBeGreaterThan(200)
    await opened.close()
  })

  test("it names every provider and every base URL", async () => {
    const opened = await openPage({ javaScript: false })
    // The grammar sits inside a disclosure, which a browser opens without
    // any script. Open it, then read what a person can see.
    const text = await opened.page.evaluate(() => {
      for (const details of document.querySelectorAll("details")) details.open = true
      return document.body.innerText
    })
    for (const fact of [
      "ChatGPT",
      "Claude",
      "Perplexity",
      "https://chatgpt.com/",
      "https://claude.ai/new",
      "https://www.perplexity.ai/search",
    ]) {
      expect(text).toContain(fact)
    }
    await opened.close()
  })

  test("it carries its own style rules", async () => {
    // The stylesheet can arrive late or not at all. The block must look
    // finished on its own.
    const html = await Bun.file(`${DIST}index.html`).text()
    const noscript = html.slice(html.indexOf("<noscript"))
    expect(noscript).toContain("<style>")
    // The app is hidden from a reader without JavaScript by this one rule.
    // It must stay inside the block. In the stylesheet it hides the app from
    // everyone.
    expect(noscript).toContain("#root")
    expect(html.slice(0, html.indexOf("<noscript"))).not.toContain("#root{display:none")
  })
})

describe("the prerendered document", () => {
  test("it holds the first controls as markup", async () => {
    // A person on a slow link sees these before any script arrives.
    const html = await Bun.file(`${DIST}index.html`).text()
    for (const id of ["app-title", "provider-picker", "prompt-input"]) {
      expect(html).toContain(`id="${id}"`)
    }
  })

  test("it hydrates without a mismatch", async () => {
    // React reports a mismatch as error 418 or 423 on the console.
    const opened = await openPage()
    await opened.page.waitForTimeout(500)
    expect(opened.errors.filter((error) => /Minified React error #4(18|23|25)/.test(error))).toEqual([])
    await opened.close()
  })
})

describe("the first load", () => {
  test("using the page fetches no more code", async () => {
    // Everything the page needs arrives with the first load. No control may
    // reach for another script when a person uses it.
    const opened = await openPage()
    const fetched: string[] = []
    opened.page.on("request", (request) => fetched.push(request.url()))

    await fillPrompt(opened.page)
    await opened.page.click('#feature-picker button:has-text("Search")')
    await opened.page.click("#temporary-chat-section")
    await opened.page.click("#how-it-works-toggle")
    await opened.page.waitForTimeout(400)

    expect(fetched.filter((url) => url.endsWith(".js"))).toEqual([])
    await opened.close()
  })
})

describe("storage", () => {
  test("a full pass stores nothing", async () => {
    // The app keeps no state between visits and sets no cookie. See
    // `AGENTS.md > Core Behavior`.
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.click('#feature-picker button:has-text("Search")')
    await opened.page.click("#temporary-chat-section")
    await opened.page.click("#how-it-works-toggle")
    await opened.page.waitForTimeout(300)

    const stored = await opened.page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      cookie: document.cookie,
    }))
    expect(stored.local).toEqual([])
    expect(stored.session).toEqual([])
    expect(stored.cookie).toBe("")
    await opened.close()
  })
})

describe("the oversized prompt", () => {
  test("the button says what it will do before it is pressed", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page, OVERSIZED_PROMPT)
    await opened.page.waitForTimeout(400)

    const label = await opened.page.evaluate(
      () => document.getElementById("open-in-provider")?.textContent ?? ""
    )
    expect(label).toContain("Copy Prompt")
    // The reason stays on the page, so a touch device sees it too.
    const notice = await opened.page.evaluate(
      () => document.getElementById("oversize-notice")?.textContent ?? ""
    )
    expect(notice.length).toBeGreaterThan(20)
    await opened.close()
  })
})
