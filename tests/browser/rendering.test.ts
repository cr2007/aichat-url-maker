import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { fillPrompt, generatedUrl, openPage, startHarness, stopHarness, OVERSIZED_PROMPT } from "./harness"

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

  test("the pinned open button leaves most of the screen to the content", async () => {
    // A long notice once sat in the bar, and at large text it covered more
    // than half of a small screen.
    const opened = await openPage({ width: 320, height: 700 })
    await opened.page.evaluate(() => {
      document.documentElement.style.fontSize = "32px"
    })
    await fillPrompt(opened.page, OVERSIZED_PROMPT)
    const share = await opened.page.evaluate(
      () => document.getElementById("open-action-section")!.getBoundingClientRect().height / innerHeight
    )
    expect(share).toBeLessThan(0.4)
    // The link is still in the page, in the field above the dock.
    expect(await opened.page.isVisible("#generated-url")).toBe(true)
    await opened.close()
  })

  for (const width of [320, 390]) {
    test(`the provider labels and the open button hold at ${width}px`, async () => {
      // The labels once overlapped and the button text was cut at both ends,
      // because the layout switched on the width of the screen in pixels.
      const opened = await openPage({ width })
      await opened.page.evaluate(() => {
        document.documentElement.style.fontSize = "32px"
      })
      await fillPrompt(opened.page, OVERSIZED_PROMPT)

      const result = await opened.page.evaluate(() => ({
        scrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        cut: [...document.querySelectorAll<HTMLElement>("#provider-picker [role=radio], #open-in-provider")]
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.id || (el.textContent ?? "").trim()),
      }))
      expect(result.cut).toEqual([])
      expect(result.scrolls).toBe(false)
      await opened.close()
    })
  }
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

describe("the console greeting", () => {
  test("it prints the art once", async () => {
    const opened = await openPage()
    const messages: { text: string; args: number }[] = []
    opened.page.on("console", (message) =>
      messages.push({ text: message.text(), args: message.args().length })
    )
    await opened.page.reload({ waitUntil: "networkidle" })
    await opened.page.waitForTimeout(400)

    const banner = messages.filter((message) => message.text.includes("▒"))
    expect(banner).toHaveLength(1)
    // One format string and one style.
    expect(banner[0].args).toBe(2)
    // The greeting must not raise an error of its own.
    expect(opened.errors).toEqual([])
    await opened.close()
  })

  test("it fetches nothing of its own", async () => {
    // The art is text in the bundle. Chrome does not load a background image
    // from a console style, so a picture file would only add a dead request.
    const opened = await openPage()
    const fetched: string[] = []
    opened.page.on("request", (request) => fetched.push(request.url()))
    await opened.page.reload({ waitUntil: "networkidle" })
    await fillPrompt(opened.page)
    await opened.page.waitForTimeout(400)

    expect(fetched.filter((url) => /\.(webp|png|jpe?g|gif)$/.test(url))).toEqual([])
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
    // The reason stays on the page, so a touch device sees it too. It is one
    // message, in the counter line, and not a second one in the pinned bar.
    const notice = await opened.page.evaluate(
      () => document.getElementById("prompt-meta")?.textContent ?? ""
    )
    expect(notice).toContain("copies the prompt")
    expect(await opened.page.locator("#oversize-notice").count()).toBe(0)
    await opened.close()
  })
})

describe("the page does not move", () => {
  test("the first character leaves every block where it was", async () => {
    // The URL box and the open button once appeared with the first
    // character, and the page below them moved down by 161px.
    const opened = await openPage({ width: 760, height: 1400 })
    const read = () =>
      opened.page.evaluate(() => ({
        open: document.getElementById("open-in-provider")!.getBoundingClientRect().top,
        url: document.getElementById("generated-url")!.getBoundingClientRect().top,
        how: document.getElementById("how-it-works-toggle")!.getBoundingClientRect().top,
        height: document.documentElement.scrollHeight,
      }))
    const before = await read()
    await fillPrompt(opened.page)
    expect(await read()).toEqual(before)
    await opened.close()
  })

  test("the open button stays in view on a phone in landscape", async () => {
    // At 568 x 320 the button once sat two screens below the first view.
    const opened = await openPage({ width: 568, height: 320 })
    await fillPrompt(opened.page)
    const bottom = await opened.page.evaluate(
      () => document.getElementById("open-in-provider")!.getBoundingClientRect().bottom
    )
    expect(bottom).toBeLessThanOrEqual(320)
    await opened.close()
  })

  test("it has one column below 1024px and two from 1024px", async () => {
    const stacked = await openPage({ width: 768 })
    const narrow = await stacked.page.evaluate(() => ({
      prompt: document.getElementById("prompt-input")!.getBoundingClientRect(),
      url: document.getElementById("url-preview-toggle")!.getBoundingClientRect(),
    }))
    expect(narrow.url.top).toBeGreaterThan(narrow.prompt.bottom)
    await stacked.close()

    const wide = await openPage({ width: 1024 })
    const columns = await wide.page.evaluate(() => ({
      prompt: document.getElementById("prompt-input")!.getBoundingClientRect(),
      url: document.getElementById("generated-url")!.getBoundingClientRect(),
    }))
    expect(columns.url.left).toBeGreaterThanOrEqual(columns.prompt.right)
    await wide.close()
  })
})

describe("a provider without a control", () => {
  test("the row folds away, leaves the tab order, and comes back", async () => {
    const opened = await openPage({ width: 760 })
    await opened.page.click('#provider-picker [role="radio"]:has-text("Perplexity")')
    await opened.page.waitForTimeout(450)

    const folded = await opened.page.evaluate(() => ({
      features: document.getElementById("feature-collapse")!.getBoundingClientRect().height,
      temporary: document.getElementById("temporary-chat-collapse")!.getBoundingClientRect().height,
      featuresInert: document.getElementById("feature-collapse")!.hasAttribute("inert"),
      temporaryInert: document.getElementById("temporary-chat-collapse")!.hasAttribute("inert"),
    }))
    expect(folded.features).toBeLessThanOrEqual(1)
    expect(folded.temporary).toBeLessThanOrEqual(1)
    expect(folded.featuresInert && folded.temporaryInert).toBe(true)

    await opened.page.click('#provider-picker [role="radio"]:has-text("ChatGPT")')
    await opened.page.waitForTimeout(450)
    const open = await opened.page.evaluate(() => ({
      features: document.getElementById("feature-collapse")!.getBoundingClientRect().height,
      inert: document.getElementById("feature-collapse")!.hasAttribute("inert"),
    }))
    expect(open.features).toBeGreaterThan(100)
    expect(open.inert).toBe(false)
    await opened.close()
  })

  test("the row keeps the text of the last provider while it folds", async () => {
    // The name and the icon once changed to Perplexity in the middle of the
    // fold, because the row read the current provider.
    const opened = await openPage({ width: 760 })
    await opened.page.click('#provider-picker [role="radio"]:has-text("Perplexity")')
    await opened.page.waitForTimeout(450)
    const text = await opened.page.evaluate(
      () => document.getElementById("temporary-chat-section")!.textContent
    )
    expect(text).toContain("ChatGPT")
    expect(text).not.toContain("Perplexity")
    await opened.close()
  })
})

describe("the dock on a phone", () => {
  test("every feature is on the first screen, above the dock with the link", async () => {
    // The URL field and the pinned button took the first screen, and the
    // features started under the button. The link now lives in the dock.
    const phone = await openPage({ touch: true, width: 412, height: 740 })
    await fillPrompt(phone.page)
    const r = await phone.page.evaluate(() => ({
      pills: [...document.querySelectorAll("#feature-picker button")].map((b) => b.getBoundingClientRect().bottom),
      dock: document.getElementById("open-action-section")!.getBoundingClientRect().top,
      line: document.getElementById("url-preview-toggle")!.textContent ?? "",
      field: getComputedStyle(document.getElementById("generated-url-section")!).display,
    }))
    expect(r.pills.length).toBeGreaterThan(0)
    for (const bottom of r.pills) expect(bottom).toBeLessThanOrEqual(r.dock)
    expect(r.line).toContain("chatgpt.com/?q=")
    expect(r.field).toBe("none")
    await phone.close()
  })

  test("a tap on the link line grows it into a panel with the whole link", async () => {
    const phone = await openPage({ touch: true, width: 412, height: 740 })
    await fillPrompt(phone.page)
    const toggle = phone.page.locator("#url-preview-toggle")
    expect(await toggle.getAttribute("aria-expanded")).toBe("false")
    expect(await phone.page.isVisible("#url-full-panel")).toBe(false)
    // The focus move once scrolled the page on every open and close.
    const scrollY = () => phone.page.evaluate(() => scrollY)
    const before = await scrollY()

    // A raw tap. A locator tap scrolls the element into view first.
    const line = (await toggle.boundingBox())!
    await phone.page.touchscreen.tap(line.x + 40, line.y + line.height / 2)
    await phone.page.waitForTimeout(400)
    expect(await toggle.getAttribute("aria-expanded")).toBe("true")
    const open = await phone.page.evaluate(() => {
      const panel = document.getElementById("url-full-panel")!.getBoundingClientRect()
      const line = document.getElementById("url-preview-toggle")!.getBoundingClientRect()
      return {
        text: document.getElementById("url-full")!.textContent,
        focus: document.activeElement?.id,
        grewUp: panel.top < line.top - 20,
        sameBottom: Math.abs(panel.bottom - line.bottom) < 1,
      }
    })
    expect(open.text).toBe(await generatedUrl(phone.page))
    expect(open).toMatchObject({ focus: "url-full-close", grewUp: true, sameBottom: true })
    expect(await scrollY()).toBe(before)

    await phone.page.keyboard.press("Escape")
    await phone.page.waitForTimeout(400)
    expect(await toggle.getAttribute("aria-expanded")).toBe("false")
    expect(await phone.page.evaluate(() => document.activeElement?.id)).toBe("url-preview-toggle")
    expect(await scrollY()).toBe(before)
    expect(await phone.page.isVisible("#url-full-panel")).toBe(false)
    await phone.close()
  })
})
