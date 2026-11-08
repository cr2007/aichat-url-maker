import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { fillPrompt, openPage, startHarness, stopHarness, OVERSIZED_PROMPT, settle } from "./harness"

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
      await settle(opened.page)

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

    const result = await opened.page.evaluate(() => ({
      scrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      button: document.getElementById("open-in-provider")?.getBoundingClientRect().height ?? 0,
    }))
    expect(result.scrolls).toBe(false)
    expect(result.button).toBeGreaterThan(44)
    await opened.close()
  })

  test("the open button never covers most of the screen", async () => {
    // A long notice once sat in the pinned bar, and at large text it covered
    // more than half of a small screen. At large text the dock now stops
    // being pinned, so the page can scroll it out of the way.
    const opened = await openPage({ width: 320, height: 700 })
    await opened.page.evaluate(() => {
      document.documentElement.style.fontSize = "32px"
    })
    await fillPrompt(opened.page, OVERSIZED_PROMPT)
    const covered = await opened.page.evaluate(() => {
      const dock = document.getElementById("open-action-section")!
      const pinned = getComputedStyle(dock).position === "sticky"
      return pinned ? dock.getBoundingClientRect().height / innerHeight : 0
    })
    expect(covered).toBeLessThan(0.4)
    expect(await opened.page.evaluate(() => getComputedStyle(document.getElementById("open-action-section")!).position)).toBe("static")
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

describe("after a deploy", () => {
  test("a reload asks the network for the page, so a new build shows at once", async () => {
    // The worker answered the page from its cache, so the first visit after
    // a deploy showed the old build. A cache-first worker makes no request.
    const opened = await openPage()
    await opened.page.evaluate(() => navigator.serviceWorker.ready)
    await opened.page.reload({ waitUntil: "networkidle" })
    expect(await opened.page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    const fromWorker: string[] = []
    opened.context.on("request", (request) => {
      // The worker reports its own request for the page as a fetch.
      if (request.serviceWorker() && request.url() === opened.page.url()) fromWorker.push(request.url())
    })
    await opened.page.reload({ waitUntil: "networkidle" })
    expect(fromWorker.length).toBeGreaterThan(0)
    await opened.close()
  })
})

describe("a full pass", () => {
  test("it fetches no more code, stores nothing and reports no errors", async () => {
    const opened = await openPage()
    const fetched: string[] = []
    opened.page.on("request", (request) => fetched.push(request.url()))
    await fillPrompt(opened.page)
    await opened.page.click('#feature-picker button:has-text("Search")')
    await opened.page.click("#temporary-chat-section")
    await opened.page.click("#how-it-works-toggle")
    await settle(opened.page)

    // Everything the page needs arrives with the first load. No control may
    // reach for another script when a person uses it.
    expect(fetched.filter((url) => url.endsWith(".js"))).toEqual([])
    // The app keeps no state between visits and sets no cookie. See
    // `AGENTS.md > Core Behavior`.
    const stored = await opened.page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      cookie: document.cookie,
    }))
    expect(stored).toEqual({ local: [], session: [], cookie: "" })
    expect(opened.errors).toEqual([])
    await opened.close()
  })
})

describe("the console greeting", () => {
  test("it prints the art once and fetches nothing of its own", async () => {
    const opened = await openPage()
    const messages: { text: string; args: number }[] = []
    const fetched: string[] = []
    opened.page.on("console", (message) =>
      messages.push({ text: message.text(), args: message.args().length })
    )
    opened.page.on("request", (request) => fetched.push(request.url()))
    await opened.page.reload({ waitUntil: "networkidle" })
    await opened.page.waitForTimeout(400)

    const banner = messages.filter((message) => message.text.includes("▒"))
    expect(banner).toHaveLength(1)
    // One format string and one style.
    expect(banner[0].args).toBe(2)
    // The greeting must not raise an error of its own.
    expect(opened.errors).toEqual([])
    // The art is text in the bundle. Chrome does not load a background image
    // from a console style, so a picture file would only add a dead request.
    expect(fetched.filter((url) => /\.(webp|png|jpe?g|gif)$/.test(url))).toEqual([])
    await opened.close()
  })
})

describe("the oversized prompt", () => {
  test("the button says what it will do before it is pressed", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page, OVERSIZED_PROMPT)

    const label = await opened.page.evaluate(
      () => document.getElementById("open-in-provider")?.textContent ?? ""
    )
    expect(label).toContain("Copy prompt")
    // The reason stays on the page, so a touch device sees it too. It is one
    // message, in the counter line, and not a second one in the pinned bar.
    const notice = await opened.page.evaluate(
      () => document.getElementById("prompt-meta")?.textContent ?? ""
    )
    expect(notice).toContain("Too long for a link.")
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
    // The first control of each column starts on the same line.
    const firsts = await wide.page.evaluate(() =>
      ["provider-picker", "generated-url"].map((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().top))
    )
    expect(firsts[0]).toBe(firsts[1])
    await wide.close()
  })
})

describe("a provider without a control", () => {
  test("the row folds away, leaves the tab order, and comes back", async () => {
    const opened = await openPage({ width: 760 })
    await opened.page.click('#provider-picker [role="radio"]:has-text("Perplexity")')
    await settle(opened.page)

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
    await settle(opened.page)
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
    await settle(opened.page)
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

  test("a tap on the link line grows the box upward, and a second tap closes it", async () => {
    // The text grows to its full length and the buttons stay in the corner.
    // The focus stays on the toggle, and the page does not scroll.
    const phone = await openPage({ touch: true, width: 412, height: 740 })
    await fillPrompt(phone.page)
    const toggle = phone.page.locator("#url-preview-toggle")
    const rects = () =>
      phone.page.evaluate(() => ({
        box: document.getElementById("url-preview")!.getBoundingClientRect().top,
        bar: document.querySelector('#url-preview button[aria-label="Copy link"]')!.getBoundingClientRect().top,
        text: document.getElementById("url-full")!.getBoundingClientRect().height,
        scroll: scrollY,
      }))
    const closed = await rects()
    expect(closed.text).toBeLessThan(25)
    const line = (await toggle.boundingBox())!
    const tap = () => phone.page.touchscreen.tap(line.x + 40, line.y + line.height / 2)

    await tap()
    await settle(phone.page)
    const open = await rects()
    expect(await toggle.getAttribute("aria-expanded")).toBe("true")
    expect(await phone.page.textContent("#url-full")).toContain("Summarize this paper.")
    expect(open.box).toBeLessThan(closed.box - 20)
    expect(open.bar).toBe(closed.bar)
    expect(open.scroll).toBe(closed.scroll)
    expect(await phone.page.evaluate(() => document.activeElement?.id)).toBe("url-preview-toggle")

    await tap()
    await settle(phone.page)
    expect(await toggle.getAttribute("aria-expanded")).toBe("false")
    expect((await rects()).text).toBeLessThan(25)

    await tap()
    await settle(phone.page)
    await phone.page.keyboard.press("Escape")
    await settle(phone.page)
    expect(await toggle.getAttribute("aria-expanded")).toBe("false")
    await phone.close()
  })

  test("a tap outside closes the panel", async () => {
    // The open panel covers the pills above the dock, and a tap on the page
    // did not close it.
    const phone = await openPage({ touch: true, width: 412, height: 740 })
    await fillPrompt(phone.page)
    const toggle = phone.page.locator("#url-preview-toggle")
    const line = (await toggle.boundingBox())!
    await phone.page.touchscreen.tap(line.x + 40, line.y + line.height / 2)
    await settle(phone.page)
    expect(await toggle.getAttribute("aria-expanded")).toBe("true")
    await phone.page.touchscreen.tap(200, 40)
    await settle(phone.page)
    expect(await toggle.getAttribute("aria-expanded")).toBe("false")
    await phone.close()
  })
})

describe("how it works", () => {
  test("the steps fold open into view, and leave the tab order when closed", async () => {
    // The steps opened below the screen, so a person saw nothing happen.
    const phone = await openPage({ touch: true, width: 412, height: 740 })
    const inView = () =>
      phone.page.evaluate(() => {
        const r = document.querySelector("#how-it-works-panel li:last-child")!.getBoundingClientRect()
        return r.bottom <= innerHeight && r.top >= 0
      })
    expect(await phone.page.getAttribute("#how-it-works-panel", "inert")).not.toBeNull()
    await phone.page.click("#how-it-works-toggle")
    await phone.page.waitForTimeout(800)
    expect(await phone.page.getAttribute("#how-it-works-toggle", "aria-expanded")).toBe("true")
    expect(await phone.page.getAttribute("#how-it-works-panel", "inert")).toBeNull()
    expect(await inView()).toBe(true)
    await phone.close()
  })
})

describe("the dock on a phone, worst cases", () => {
  const PHONE = { touch: true, width: 320, height: 640 } as const
  const SHARE_STUB = "navigator.share = async () => {}"

  test("the box is one element, and a tap during the close opens it again", async () => {
    // The open panel was a second box over the row, with a second set of
    // buttons. At the end of the close the row swapped back in.
    const phone = await openPage(PHONE)
    await fillPrompt(phone.page)
    expect(await phone.page.locator("#url-preview button", { hasText: "Copy" }).count()).toBe(1)
    const line = (await phone.page.locator("#url-preview-toggle").boundingBox())!
    const tap = () => phone.page.touchscreen.tap(line.x + 30, line.y + line.height / 2)
    await tap()
    await settle(phone.page)
    await tap()
    await phone.page.waitForTimeout(60)
    await tap()
    await settle(phone.page)
    expect(await phone.page.getAttribute("#url-preview-toggle", "aria-expanded")).toBe("true")
    expect(await phone.page.evaluate(() => document.getElementById("url-full")!.getBoundingClientRect().height)).toBeGreaterThan(40)
    await phone.close()
  })

  test("the link line shows the letters of the prompt, not percent codes", async () => {
    const phone = await openPage(PHONE)
    await fillPrompt(phone.page, "\u0644\u062e\u0635 \u0647\u0630\u0627 1+1")
    const line = await phone.page.textContent("#url-preview-toggle")
    expect(line).toContain("\u0644\u062e\u0635 \u0647\u0630\u0627 1+1")
    expect(line).not.toContain("%")
    await phone.close()
  })

  test("the close starts gently, the text keeps its lines, and no scrollbar shows", async () => {
    // A real phone showed three faults: the room for the buttons left in the
    // first frame of the close (44px at once), the text fell into a narrow
    // column of five lines, and a scrollbar showed while the box grew.
    const phone = await openPage({ touch: true, width: 412, height: 915, initScript: SHARE_STUB })
    await fillPrompt(phone.page, "Plan a 3-day trip to Goa with a budget for two people.")
    const toggle = phone.page.locator("#url-preview-toggle")
    const line = (await toggle.boundingBox())!
    const sizes = () =>
      phone.page.evaluate(() => {
        const text = document.getElementById("url-full")!
        return {
          box: document.getElementById("url-preview")!.getBoundingClientRect().height,
          width: Math.round(text.getBoundingClientRect().width),
          bar: getComputedStyle(text).scrollbarWidth,
        }
      })
    await phone.page.touchscreen.tap(line.x + 30, line.y + line.height / 2)
    await phone.page.waitForTimeout(40)
    expect((await sizes()).bar).toBe("none")
    await settle(phone.page)
    const open = await sizes()
    await phone.page.keyboard.press("Escape")
    await phone.page.waitForTimeout(30)
    const early = await sizes()
    expect(open.box - early.box).toBeLessThan(20)
    expect(early.width).toBe(open.width)
    await phone.close()
  })

  test("a copy changes the label but moves nothing in the link box", async () => {
    // "Copied" is wider than "Copy". The button grew, the box measured it,
    // and the link text jumped on the copy and again 2.5 seconds later.
    const phone = await openPage({
      touch: true,
      width: 412,
      height: 915,
      initScript: SHARE_STUB + ";Object.defineProperty(navigator, \"clipboard\", { value: { writeText: async () => {} }, configurable: true })",
    })
    await fillPrompt(phone.page)
    const widths = () =>
      phone.page.evaluate(() => ({
        button: Math.round(document.querySelector("#url-preview button[aria-label=\"Copy link\"]")!.getBoundingClientRect().width),
        text: Math.round(document.getElementById("url-full")!.getBoundingClientRect().width),
      }))
    const before = await widths()
    await phone.page.click("#url-preview button[aria-label=\"Copy link\"]")
    // The live region says "Link copied" while the label shows "Copied".
    const status = "#url-preview ~ p[aria-live], #url-preview p[aria-live]"
    await phone.page.waitForFunction((sel) => document.querySelector(sel)?.textContent === "Link copied", status)
    await settle(phone.page)
    expect(await widths()).toEqual(before)
    await phone.page.waitForFunction((sel) => document.querySelector(sel)?.textContent === "", status, { timeout: 4000 })
    await settle(phone.page)
    expect(await widths()).toEqual(before)

    // A failure once printed a long line inside the bar, which covered the link.
    await phone.page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } })
      document.execCommand = () => false
    })
    await phone.page.click("#url-preview button[aria-label=\"Copy link\"]")
    await phone.page.waitForFunction((sel) => document.querySelector(sel)?.textContent !== "", status)
    await settle(phone.page)
    expect(await widths()).toEqual(before)
    expect(await phone.page.textContent("#url-preview [data-shown=true]")).toBe("Failed")
    await phone.close()
  })

  test("Share shows on a phone with the share sheet, and never on a desktop", async () => {
    const phone = await openPage({ ...PHONE, initScript: SHARE_STUB })
    expect(await phone.page.locator("#url-preview button", { hasText: "Share" }).count()).toBeGreaterThan(0)
    await phone.close()
    const desktop = await openPage({ width: 1280, height: 800, initScript: SHARE_STUB })
    expect(await desktop.page.locator("button", { hasText: "Share" }).count()).toBe(0)
    await desktop.close()
  })

  test("the keyboard does not hide the prompt field under the dock", async () => {
    // TalkBack on a real phone showed it: the keyboard shrinks the layout, the
    // pinned dock moves up, and it covered the field that had the focus.
    const phone = await openPage({ touch: true, width: 412, height: 740 })
    await phone.page.focus("#prompt-input")
    await phone.page.setViewportSize({ width: 412, height: 420 })
    await phone.page.waitForTimeout(400)
    const [field, dock] = await phone.page.evaluate(() =>
      ["prompt-input", "open-action-section"].map((id) => document.getElementById(id)!.getBoundingClientRect())
    )
    expect(field.bottom).toBeLessThanOrEqual(dock.top)
    expect(field.top).toBeGreaterThanOrEqual(0)
    await phone.close()
  })

  test("the oversize message is one line, so the page does not move", async () => {
    // The long message wrapped on a phone and pushed the page down 38px.
    const phone = await openPage(PHONE)
    await fillPrompt(phone.page, OVERSIZED_PROMPT)
    const lines = await phone.page.evaluate(() => {
      const meta = document.getElementById("prompt-meta")!
      return Math.round(meta.getBoundingClientRect().height / parseFloat(getComputedStyle(meta).lineHeight))
    })
    expect(lines).toBe(2)
    await phone.close()
  })
})
