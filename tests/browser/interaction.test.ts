import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { fillPrompt, generatedUrl, openPage, startHarness, stopHarness, OVERSIZED_PROMPT, settle } from "./harness"

beforeAll(startHarness)
afterAll(stopHarness)

describe("the feature pills", () => {
  test("they are toggle buttons, not radios", async () => {
    // A radio cannot be unchecked, and a second press on a pill clears the
    // feature. The pills must therefore not claim to be radios.
    const opened = await openPage()
    const state = await opened.page.evaluate(() => {
      const pills = [...document.querySelectorAll("#feature-picker button")]
      return {
        count: pills.length,
        // A plain button has its role with no attribute.
        roles: [...new Set(pills.map((p) => p.getAttribute("role") ?? p.localName))],
        checked: [...new Set(pills.map((p) => p.getAttribute("aria-checked")))],
        pressed: pills.filter((p) => p.getAttribute("aria-pressed") === "true").length,
      }
    })
    expect(state.count).toBe(7)
    expect(state.roles).toEqual(["button"])
    expect(state.checked).toEqual([null])
    expect(state.pressed).toBe(0)
    await opened.close()
  })

  test("a second press clears the feature", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    await opened.page.click('#feature-picker button:has-text("Deep Research")')
    await settle(opened.page)
    expect(await generatedUrl(opened.page)).toContain("hints=research")

    await opened.page.click('#feature-picker button:has-text("Deep Research")')
    await settle(opened.page)
    expect(await generatedUrl(opened.page)).not.toContain("hints=")
    await opened.close()
  })

  test("only one feature is selected at a time", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.click('#feature-picker button:has-text("Canvas")')
    await opened.page.click('#feature-picker button:has-text("Search")')
    await settle(opened.page)

    const pressed = await opened.page.evaluate(() =>
      [...document.querySelectorAll("#feature-picker button")]
        .filter((p) => p.getAttribute("aria-pressed") === "true")
        .map((p) => p.textContent?.trim())
    )
    expect(pressed).toEqual(["Search"])
    await opened.close()
  })

  test("each pill describes itself in a tooltip", async () => {
    const opened = await openPage()
    const pill = opened.page.locator("#feature-picker button", { hasText: "Deep Research" })
    await pill.hover()
    await opened.page.waitForTimeout(700)

    const tip = await opened.page.evaluate(
      () => document.querySelector("[role=tooltip]")?.textContent?.trim() ?? null
    )
    expect(tip).toBeTruthy()
    // The same text must reach a screen reader, not only a pointer.
    expect(await pill.getAttribute("aria-describedby")).toBeTruthy()
    await opened.close()
  })
})

describe("the temporary chat row", () => {
  test("a press anywhere in the row toggles the setting", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    const box = (await opened.page.locator("#temporary-chat-section").boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)

    // Press the description, which is the furthest point from any icon.
    await opened.page.mouse.click(box.x + 60, box.y + box.height - 12)
    await settle(opened.page)
    expect(await generatedUrl(opened.page)).toContain("temporary-chat=true")

    await opened.page.mouse.click(box.x + 60, box.y + box.height - 12)
    await settle(opened.page)
    expect(await generatedUrl(opened.page)).not.toContain("temporary-chat=true")
    await opened.close()
  })
})

describe("the provider control", () => {
  test("a drag moves the selection", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    const first = (await opened.page.locator('#provider-picker [role="radio"]').first().boundingBox())!
    const last = (await opened.page.locator('#provider-picker [role="radio"]').last().boundingBox())!

    await opened.page.mouse.move(first.x + first.width / 2, first.y + first.height / 2)
    await opened.page.mouse.down()
    await opened.page.mouse.move(last.x + last.width / 2, first.y + first.height / 2, { steps: 12 })
    await opened.page.mouse.up()
    await settle(opened.page)

    expect(await generatedUrl(opened.page)).toContain("perplexity.ai")
    await opened.close()
  })

  test("a tap still selects a segment", async () => {
    // Capturing the pointer on pointerdown once sent the click to the track,
    // and a tap then selected nothing.
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.click('#provider-picker [role="radio"]:has-text("Claude")')
    await settle(opened.page)
    expect(await generatedUrl(opened.page)).toContain("claude.ai")
    await opened.close()
  })

  test("a drag that stops short returns to the segment it started on", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)
    const first = (await opened.page.locator('#provider-picker [role="radio"]').first().boundingBox())!

    await opened.page.mouse.move(first.x + first.width / 2, first.y + first.height / 2)
    await opened.page.mouse.down()
    await opened.page.mouse.move(first.x + first.width / 2 + 30, first.y + first.height / 2, { steps: 6 })
    await opened.page.mouse.up()
    await settle(opened.page)

    expect(await generatedUrl(opened.page)).toContain("chatgpt.com")
    await opened.close()
  })

  test("the arrow keys move the selection and keep one tab stop", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    await opened.page.focus('#provider-picker [role="radio"][aria-checked="true"]')
    await opened.page.keyboard.press("ArrowRight")
    await settle(opened.page)
    expect(await generatedUrl(opened.page)).toContain("claude.ai")

    // One tab stop: Tab leaves the group rather than moving inside it.
    await opened.page.keyboard.press("Tab")
    const next = await opened.page.evaluate(() => document.activeElement?.id)
    expect(next).toBe("prompt-input")
    await opened.close()
  })
})

describe("provider settings survive a provider change", () => {
  test("moving away and back keeps the feature and the temporary chat", async () => {
    // Clearing the state here once destroyed the choice, and the segmented
    // control changes provider on focus, so an arrow key was enough.
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.click('#feature-picker button:has-text("Deep Research")')
    await opened.page.click("#temporary-chat-section")
    await settle(opened.page)

    await opened.page.click('#provider-picker [role="radio"]:has-text("Perplexity")')
    await settle(opened.page)
    const away = await generatedUrl(opened.page)
    expect(away).not.toContain("hints=")
    expect(away).not.toContain("temporary-chat=true")

    await opened.page.click('#provider-picker [role="radio"]:has-text("ChatGPT")')
    await settle(opened.page)
    const back = await generatedUrl(opened.page)
    expect(back).toContain("hints=research")
    expect(back).toContain("temporary-chat=true")
    await opened.close()
  })
})

describe("the copy button", () => {
  test("a failed copy tells the person", async () => {
    // The catch block once discarded the error, and the button did nothing.
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("denied")) },
        configurable: true,
      })
      // The copy command is the fallback. It fails too in this test.
      document.execCommand = () => false
    })

    await opened.page.click('#url-preview button:has-text("Copy")')
    await opened.page.waitForTimeout(300)

    const status = await opened.page.evaluate(() =>
      [...document.querySelectorAll("[aria-live]")]
        .map((element) => (element.textContent ?? "").trim())
        .join(" ")
    )
    expect(status).toMatch(/could not copy/i)
    await opened.close()
  })
})

describe("a page with no Clipboard API", () => {
  test("it still copies, with the copy command", async () => {
    // A page on plain http, such as the dev server on a LAN address, has no
    // Clipboard API. Every copy failed there.
    const opened = await openPage()
    await opened.page.evaluate(() => {
      Object.defineProperty(Navigator.prototype, "clipboard", { get: () => undefined, configurable: true })
      const w = window as unknown as { __copied: string }
      document.addEventListener("copy", () => {
        w.__copied = String(document.getSelection())
      })
    })
    await fillPrompt(opened.page)
    await opened.page.click('#url-preview button[aria-label="Copy link"]')
    await opened.page.waitForFunction(() =>
      [...document.querySelectorAll("[aria-live]")].some((e) => e.textContent === "Link copied")
    )
    expect(await opened.page.evaluate(() => (window as unknown as { __copied: string }).__copied)).toBe(
      await generatedUrl(opened.page)
    )
    await opened.close()
  })
})

describe("the open button without a clipboard", () => {
  test("it still opens the provider", async () => {
    // A browser gives no clipboard on an insecure origin. Reading
    // `navigator.clipboard.writeText` then threw at once, the handler died,
    // and the tab never opened. The person saw nothing happen at all.
    const opened = await openPage()
    await opened.page.evaluate(() => {
      // `clipboard` is a getter on the prototype, so `delete` on the instance
      // does nothing. Redefine the getter to take it away.
      Object.defineProperty(Navigator.prototype, "clipboard", {
        get: () => undefined,
        configurable: true,
      })
      // The copy command is the fallback. It fails too in this test.
      document.execCommand = () => false
      const w = window as unknown as { __opened: string[] }
      w.__opened = []
      window.open = (url) => {
        w.__opened.push(String(url))
        return {} as Window
      }
    })
    await fillPrompt(opened.page, OVERSIZED_PROMPT)
    await opened.page.click("#open-in-provider")
    await opened.page.waitForTimeout(400)

    const result = await opened.page.evaluate(() => ({
      opened: (window as unknown as { __opened: string[] }).__opened,
      notice: document.getElementById("copy-failed-notice")?.textContent ?? "",
    }))
    expect(result.opened).toEqual(["https://chatgpt.com/"])
    // The failure has to reach the person, because the prompt was supposed to
    // travel on the clipboard.
    expect(result.notice).toContain("clipboard")
    await opened.close()
  })
})

describe("the opened tab", () => {
  test("it has no handle back to this tab, and a blocked popup still shows its message", async () => {
    // window.open gave the AI app window.opener, a handle that can send this
    // tab to another address. "noopener" would hide a blocked popup, because
    // window.open then returns null, so the handle is cut after the open.
    const opened = await openPage()
    await opened.context.route("https://chatgpt.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>stub</title>" })
    )
    await fillPrompt(opened.page)
    const [popup] = await Promise.all([opened.context.waitForEvent("page"), opened.page.click("#open-in-provider")])
    await popup.waitForLoadState()
    expect(await popup.evaluate(() => window.opener)).toBeNull()
    await popup.close()

    await opened.page.evaluate(() => {
      window.open = () => null
    })
    await opened.page.click("#open-in-provider")
    expect(await opened.page.isVisible("#popup-blocked-notice")).toBe(true)
    await opened.close()
  })

  test("a blocked tab gets a link that opens the app, and an undo does not bring the notice back", async () => {
    // The notice once said only "allow pop-ups". It came back after an undo
    // to the same prompt, because it matched the link, not the click.
    const opened = await openPage()
    await opened.context.route("https://chatgpt.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>stub</title>" })
    )
    await opened.page.evaluate(() => {
      window.open = () => null
    })
    await fillPrompt(opened.page)
    await opened.page.click("#open-in-provider")
    const link = opened.page.locator("#popup-blocked-notice a")
    expect(await link.getAttribute("href")).toBe(await generatedUrl(opened.page))
    expect(await link.getAttribute("target")).toBe("_blank")
    // A click on a real link is not a pop-up, so it opens the app.
    const [tab] = await Promise.all([opened.context.waitForEvent("page"), link.click()])
    await tab.waitForLoadState()
    expect(tab.url()).toContain("chatgpt.com")
    await tab.close()

    await fillPrompt(opened.page, "Summarize this paper!")
    expect(await opened.page.isVisible("#popup-blocked-notice")).toBe(false)
    await fillPrompt(opened.page)
    expect(await opened.page.isVisible("#popup-blocked-notice")).toBe(false)
    await opened.close()
  })
})

describe("the description of a pill", () => {
  test("it reaches a screen reader while the tooltip is closed", async () => {
    // The pills once pointed `aria-describedby` at the tooltip, which is in
    // the page only while it is open. At rest the id matched nothing.
    const opened = await openPage()
    const missing = await opened.page.evaluate(() =>
      [...document.querySelectorAll("#feature-picker button")]
        .filter((pill) => {
          const target = document.getElementById(pill.getAttribute("aria-describedby") ?? "")
          return !target || !(target.textContent ?? "").trim()
        })
        .map((pill) => (pill.textContent ?? "").trim())
    )
    expect(missing).toEqual([])
    await opened.close()
  })
})

describe("the prompt counter", () => {
  test("it is not a live region, and the warning is announced once", async () => {
    // The counter changes on every key. A live region then spoke the count
    // after each key press.
    const opened = await openPage()
    const meta = await opened.page.evaluate(() => {
      const element = document.getElementById("prompt-meta")!
      return { role: element.getAttribute("role"), live: element.getAttribute("aria-live") }
    })
    expect(meta).toEqual({ role: null, live: null })

    const status = () =>
      opened.page.evaluate(
        () => document.querySelector("#prompt-section [aria-live]")?.textContent?.trim() ?? ""
      )
    await fillPrompt(opened.page)
    expect(await status()).toBe("")
    await fillPrompt(opened.page, OVERSIZED_PROMPT)
    expect(await status()).toMatch(/too long/i)
    await opened.close()
  })

  test("it counts what a person sees", async () => {
    // A family emoji is 11 UTF-16 units and one character on the screen.
    const opened = await openPage()
    await fillPrompt(opened.page, "\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}")
    // Anchored: "11 characters" also contains "1 character".
    expect(await opened.page.textContent("#prompt-meta")).toMatch(/^1 character\b/)
    await opened.close()
  })

  test("it stays empty for a prompt of spaces only", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page, "       ")
    expect((await opened.page.textContent("#prompt-meta"))?.trim()).toBe("")
    await opened.close()
  })
})

describe("motion that a person meets often", () => {
  const indicatorDurations = (page: import("playwright").Page) =>
    page.evaluate(() => getComputedStyle(document.querySelector(".segment-indicator")!).transitionDuration)

  test("a keyboard selection does not slide the indicator", async () => {
    // An arrow key can repeat many times. The slide then trails behind the
    // keys, so a keyboard selection has no motion.
    const opened = await openPage()
    await opened.page.click("#prompt-input")
    await opened.page.keyboard.press("Shift+Tab")
    await opened.page.keyboard.press("ArrowRight")
    await opened.page.waitForTimeout(100)
    expect(await indicatorDurations(opened.page)).toBe("0s")
    await opened.close()
  })

  test("a click still slides the indicator", async () => {
    const opened = await openPage()
    await opened.page.click('#provider-picker [role="radio"]:has-text("Claude")')
    expect(await indicatorDurations(opened.page)).toContain("0.26s")
    await opened.close()
  })

  test("a tooltip that opens inside the skip delay has no animation", async () => {
    // Radix sets data-state="instant-open" on a tooltip that opens while
    // another one is open or just closed. The rule must remove its animation.
    // The test reads the rule, because the pointer path that triggers the state
    // is not stable in a script.
    const opened = await openPage()
    const rule = await opened.page.evaluate(() => {
      // The utilities sit inside a cascade layer, so the search goes down
      // through the nested rules.
      const find = (rules: CSSRuleList): string | null => {
        for (const item of rules) {
          if (item instanceof CSSStyleRule && item.selectorText.includes("instant-open")) {
            return item.style.animationName || item.style.animation
          }
          if ("cssRules" in item) {
            const found = find((item as CSSGroupingRule).cssRules)
            if (found) return found
          }
        }
        return null
      }
      for (const sheet of document.styleSheets) {
        const found = find(sheet.cssRules)
        if (found) return found
      }
      return null
    })
    expect(rule).toBe("none")
    await opened.close()
  })

  test("the tooltip is inside the main landmark", async () => {
    const opened = await openPage()
    await opened.page.locator("#feature-picker button", { hasText: /^Search$/ }).hover()
    await opened.page.waitForTimeout(700)
    const inside = await opened.page.evaluate(
      () => document.querySelector("[data-slot=tooltip-content]")?.closest("#app") !== null
    )
    expect(inside).toBe(true)
    await opened.close()
  })

  test("the open button eases when the prompt makes it ready", async () => {
    const opened = await openPage()
    const property = await opened.page.evaluate(
      () => getComputedStyle(document.getElementById("open-in-provider")!).transitionProperty
    )
    expect(property).toContain("opacity")
    await opened.close()
  })
})

describe("a phone", () => {
  test("the prompt field is 16px, so iOS does not zoom on focus", async () => {
    const phone = await openPage({ touch: true, width: 390, height: 844 })
    const size = (page: import("playwright").Page) =>
      page.evaluate(() => Number.parseFloat(getComputedStyle(document.getElementById("prompt-input")!).fontSize))
    expect(await size(phone.page)).toBeGreaterThanOrEqual(16)
    await phone.close()

    const desktop = await openPage()
    expect(await size(desktop.page)).toBeLessThan(16)
    await desktop.close()
  })

  test("a control is not selectable and has no double tap delay", async () => {
    const opened = await openPage({ touch: true, width: 390, height: 844 })
    const styles = await opened.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#feature-picker button, #open-in-provider, #how-it-works-toggle")].map((el) => {
        const style = getComputedStyle(el)
        return { userSelect: style.userSelect, touchAction: style.touchAction }
      })
    )
    expect(styles.length).toBeGreaterThan(3)
    expect(new Set(styles.map((s) => s.userSelect))).toEqual(new Set(["none"]))
    expect(new Set(styles.map((s) => s.touchAction))).toEqual(new Set(["manipulation"]))
    await opened.close()
  })

  test("the keyboard shrinks the layout, so the pinned button rises with it", async () => {
    const opened = await openPage()
    const content = await opened.page.getAttribute('meta[name="viewport"]', "content")
    expect(content).toContain("interactive-widget=resizes-content")
    await opened.close()
  })
})

describe("the tooltips for each kind of input", () => {
  const PHONE = { touch: true, width: 390, height: 844 } as const
  type TestPage = import("playwright").Page

  /** The centre of the Search pill. */
  async function searchPill(page: TestPage) {
    const pill = page.getByRole("button", { name: /^Search$/ })
    const box = (await pill.boundingBox())!
    return { pill, x: box.x + box.width / 2, y: box.y + box.height / 2, top: box.y }
  }

  const tooltipCount = (page: TestPage) => page.locator("[data-slot=tooltip-content]").count()

  /**
   * Opens a finger that a test can hold down. Playwright can only tap, so
   * this sends raw touch events. One session keeps the touch state between
   * the events.
   */
  async function openFinger(opened: Awaited<ReturnType<typeof openPage>>) {
    const session = await opened.context.newCDPSession(opened.page)
    const send = (type: "touchStart" | "touchMove" | "touchEnd", points: { x: number; y: number }[]) =>
      session.send("Input.dispatchTouchEvent", { type, touchPoints: points })
    return {
      down: (x: number, y: number) => send("touchStart", [{ x, y }]),
      move: (x: number, y: number) => send("touchMove", [{ x, y }]),
      up: () => send("touchEnd", []),
    }
  }

  test("a tap toggles the pill and opens no tooltip", async () => {
    // Radix opens a tooltip on focus, and a tap focuses the pill after the
    // finger lifts. The tooltip then covered the pill after every tap.
    const phone = await openPage(PHONE)
    const { pill, x, y } = await searchPill(phone.page)
    // The click after the tap closes the tooltip again within a few
    // milliseconds, so a check later would miss it. Watch for any insertion.
    await phone.page.evaluate(() => {
      const w = window as unknown as { tooltipsSeen: number }
      w.tooltipsSeen = 0
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof Element && node.querySelector("[data-slot=tooltip-content]")) w.tooltipsSeen++
            if (node instanceof Element && node.matches("[data-slot=tooltip-content]")) w.tooltipsSeen++
          }
        }
      }).observe(document.body, { childList: true, subtree: true })
    })
    await phone.page.touchscreen.tap(x, y)
    await phone.page.waitForTimeout(700)
    expect(await phone.page.evaluate(() => (window as unknown as { tooltipsSeen: number }).tooltipsSeen)).toBe(0)
    expect(await pill.getAttribute("aria-pressed")).toBe("true")
    await phone.close()
  })

  test("a long press opens the tooltip above the finger and does not toggle", async () => {
    const phone = await openPage(PHONE)
    const { pill, x, y, top } = await searchPill(phone.page)
    const finger = await openFinger(phone)
    await finger.down(x, y)
    await phone.page.waitForTimeout(300)
    expect(await tooltipCount(phone.page)).toBe(0)
    await phone.page.waitForTimeout(400)
    expect(await tooltipCount(phone.page)).toBe(1)
    const tooltipBottom = await phone.page.evaluate(
      () => document.querySelector("[data-slot=tooltip-content]")!.getBoundingClientRect().bottom
    )
    expect(tooltipBottom).toBeLessThanOrEqual(top)

    await finger.up()
    await phone.page.waitForTimeout(300)
    expect(await tooltipCount(phone.page)).toBe(1)
    expect(await pill.getAttribute("aria-pressed")).toBe("false")
    await phone.page.waitForTimeout(1600)
    expect(await tooltipCount(phone.page)).toBe(0)
    await phone.close()
  })

  test("a swipe that starts on a pill opens no tooltip", async () => {
    const phone = await openPage(PHONE)
    const { x, y } = await searchPill(phone.page)
    const finger = await openFinger(phone)
    await finger.down(x, y)
    await finger.move(x + 30, y)
    await phone.page.waitForTimeout(700)
    expect(await tooltipCount(phone.page)).toBe(0)
    await finger.up()
    await phone.close()
  })

  test("a mouse that hovers on a phone gets the tooltip at once", async () => {
    const phone = await openPage(PHONE)
    const { x, y } = await searchPill(phone.page)
    await phone.page.mouse.move(x, y)
    await phone.page.waitForTimeout(100)
    expect(await tooltipCount(phone.page)).toBe(1)
    await phone.close()
  })

  test("a pen that leaves the screen closes the tooltip", async () => {
    // Chromium on Android drops the hover exit of a pen, so the page gets no
    // leave event. A hovering pen moves about every 16ms, so silence means
    // the pen has left. The tooltip stayed on screen before this rule.
    const phone = await openPage(PHONE)
    const { x, y } = await searchPill(phone.page)
    const session = await phone.context.newCDPSession(phone.page)
    const hover = (dx: number) =>
      session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + dx, y, pointerType: "pen" })
    for (let i = 0; i < 12; i++) {
      await hover(i % 2)
      await phone.page.waitForTimeout(50)
    }
    expect(await tooltipCount(phone.page)).toBe(1)
    await phone.page.waitForTimeout(600)
    expect(await tooltipCount(phone.page)).toBe(0)
    // The pen comes back to the same pill.
    await hover(0)
    await phone.page.waitForTimeout(100)
    expect(await tooltipCount(phone.page)).toBe(1)
    await phone.close()
  })

  test("a pen tip opens nothing at the press, and a long press opens the tooltip", async () => {
    // On a phone the pen tip opened the tooltip at the instant of the press.
    // The tip is a touch on the glass, so it follows the finger rules.
    const phone = await openPage(PHONE)
    const { pill, x, y } = await searchPill(phone.page)
    const session = await phone.context.newCDPSession(phone.page)
    const pen = (type: "mousePressed" | "mouseReleased") =>
      session.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1, pointerType: "pen" })

    await pen("mousePressed")
    await phone.page.waitForTimeout(250)
    expect(await tooltipCount(phone.page)).toBe(0)
    await phone.page.waitForTimeout(450)
    expect(await tooltipCount(phone.page)).toBe(1)
    await pen("mouseReleased")
    await phone.page.waitForTimeout(200)
    expect(await pill.getAttribute("aria-pressed")).toBe("false")
    await phone.close()
  })

  test("a sweep across the pills never shows two tooltips", async () => {
    // On close the enter animation started again, so Radix kept the old
    // tooltip in the page beside the new one for 125ms. The sweep crosses
    // three pills, because the fault needs a tooltip that opened at once.
    const desktop = await openPage({ width: 1280, height: 800 })
    const pills = desktop.page.locator("#feature-picker button")
    const [a, c] = [(await pills.nth(0).boundingBox())!, (await pills.nth(2).boundingBox())!]
    const y = a.y + a.height / 2
    await desktop.page.mouse.move(a.x + a.width / 2, y)
    await desktop.page.waitForTimeout(500)
    const counts: number[] = []
    for (let x = a.x + a.width / 2; x <= c.x + c.width / 2; x += 2) {
      await desktop.page.mouse.move(x, y)
      counts.push(await tooltipCount(desktop.page))
    }
    expect(counts.filter((n) => n > 1)).toEqual([])
    await desktop.close()
  })

  test("a mouse on a desktop still waits before the tooltip opens", async () => {
    const desktop = await openPage({ width: 1280, height: 800 })
    const { x, y } = await searchPill(desktop.page)
    await desktop.page.mouse.move(x, y)
    await desktop.page.waitForTimeout(100)
    expect(await tooltipCount(desktop.page)).toBe(0)
    await desktop.page.waitForTimeout(500)
    expect(await tooltipCount(desktop.page)).toBe(1)
    await desktop.close()
  })

  test("the keyboard opens the tooltip, also after a tap", async () => {
    const phone = await openPage(PHONE)
    const { pill, x, y } = await searchPill(phone.page)
    await phone.page.touchscreen.tap(x, y)
    await phone.page.touchscreen.tap(5, 300)
    await pill.focus()
    await phone.page.waitForTimeout(100)
    expect(await tooltipCount(phone.page)).toBe(1)
    await phone.close()
  })

  test("only a touch screen shows the hint about the long press", async () => {
    const hidden = async (opened: Awaited<ReturnType<typeof openPage>>) =>
      opened.page.evaluate(() => getComputedStyle(document.getElementById("feature-hint")!).display === "none")
    const phone = await openPage(PHONE)
    expect(await hidden(phone)).toBe(false)
    await phone.close()
    const desktop = await openPage({ width: 1280, height: 800 })
    expect(await hidden(desktop)).toBe(true)
    await desktop.close()
  })
})

describe("text selection", () => {
  test("no text outside the two fields can be selected", async () => {
    // A long press on a label or a count opened the cut and copy bar on a
    // phone. Only the fields hold content that a person may select.
    const phone = await openPage({ touch: true, width: 390, height: 844 })
    await fillPrompt(phone.page)
    const selectable = await phone.page.evaluate(() => {
      const found: string[] = []
      const walker = document.createTreeWalker(document.getElementById("app")!, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement!
        if (!node.textContent?.trim() || element.closest("textarea")) continue
        if (getComputedStyle(element).userSelect !== "none") found.push(node.textContent.trim())
      }
      return found
    })
    expect(selectable).toEqual([])
    const fields = await phone.page.evaluate(() =>
      ["prompt-input", "generated-url"].map((id) => getComputedStyle(document.getElementById(id)!).userSelect)
    )
    expect(fields).toEqual(["text", "text"])
    await phone.close()
  })
})

describe("the home screen icons", () => {
  test("the page and the manifest point at files that exist", async () => {
    const opened = await openPage()
    const links = await opened.page.evaluate(async () => {
      const touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
      const manifestUrl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href
      const manifest = manifestUrl ? await (await fetch(manifestUrl)).json() : { icons: [] }
      const urls = [touchIcon?.href, ...manifest.icons.map((icon: { src: string }) => new URL(icon.src, manifestUrl).href)]
      const checks = await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url as string)
          return { ok: response.ok, type: response.headers.get("content-type") }
        })
      )
      return { icons: manifest.icons as { sizes: string; purpose: string; type: string }[], checks, hasTouchIcon: !!touchIcon }
    })
    expect(links.hasTouchIcon).toBe(true)
    expect(links.checks.every((check) => check.ok)).toBe(true)
    // Android asks for a 192 and a 512 icon, and a separate maskable one.
    const has = (sizes: string, purpose: string) =>
      links.icons.some((icon) => icon.sizes === sizes && icon.purpose === purpose && icon.type === "image/png")
    expect(has("192x192", "any")).toBe(true)
    expect(has("512x512", "any")).toBe(true)
    expect(has("512x512", "maskable")).toBe(true)
    await opened.close()
  })
})

describe("plain use for every reader", () => {
  test("every label, counter and description is a single stop for a screen reader", async () => {
    // TalkBack on a real phone read the temporary chat name and description
    // twice, the field labels twice, and the counter twice. A probe page on
    // the phone showed the markup that reads once.
    const phone = await openPage({ touch: true, width: 412, height: 740 })
    await fillPrompt(phone.page)
    const tree = await phone.page.locator("main").ariaSnapshot()
    for (const stray of ["text: AI app", "text: Prompt", "text: Features (optional)", "characters", "text: Keeps this chat", "Press and hold", "text: Makes a picture from the prompt."]) {
      expect(tree).not.toContain(stray)
    }
    // An empty role="status" was a stop too: TalkBack said "status".
    expect(tree).not.toMatch(/^\s*- status/m)
    expect(tree).toContain('textbox "Prompt"')
    expect(tree).toContain('radiogroup "AI app"')
    expect(tree).toContain('group "Features (optional)"')
    const description = await phone.page.evaluate(() => {
      const row = document.getElementById("temporary-chat-section")!
      return document.getElementById(row.getAttribute("aria-describedby")!)?.textContent
    })
    expect(description).toContain("Keeps this chat out of your")
    // Each pill still has its description, read once with the pill.
    const pillDescription = await phone.page.evaluate(() => {
      const id = document.querySelector("#feature-picker button")!.getAttribute("aria-describedby")!
      return document.getElementById(id)?.textContent
    })
    expect(pillDescription).toBeTruthy()
    expect(tree).toContain('button "Temporary chat"')
    await phone.close()
  })

  test("Ctrl+Enter in the prompt opens the provider", async () => {
    const opened = await openPage({ initScript: "window.open = (u) => { window.__opened = String(u); return window }" })
    await fillPrompt(opened.page)
    await opened.page.focus("#prompt-input")
    await opened.page.keyboard.press("Control+Enter")
    expect(await opened.page.evaluate(() => (window as unknown as { __opened?: string }).__opened)).toContain("chatgpt.com")
    await opened.close()
  })

  test("a hovering pen on a touch screen gets the hover style, and a finger tap clears it", async () => {
    // Android reports any-hover: none for a pen, so the hover styles never
    // showed, though the browser sets :hover while the pen hovers.
    const phone = await openPage({ touch: true, width: 412, height: 800 })
    await fillPrompt(phone.page)
    const fill = () => phone.page.evaluate(() => getComputedStyle(document.getElementById("open-in-provider")!).backgroundColor)
    const rest = await fill()
    const box = (await phone.page.locator("#open-in-provider").boundingBox())!
    const session = await phone.context.newCDPSession(phone.page)
    await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x + box.width / 2, y: box.y + box.height / 2, pointerType: "pen" })
    await settle(phone.page)
    expect(await fill()).not.toBe(rest)
    await phone.page.touchscreen.tap(20, 20)
    await settle(phone.page)
    expect(await phone.page.evaluate(() => document.documentElement.hasAttribute("data-pen-hover"))).toBe(false)
    await phone.close()
  })

  test("the keys show for a mouse at any width, and on a touch screen after a physical key", async () => {
    // The keys showed only from 1024px, so a narrow desktop window lost them,
    // and a phone with a keyboard never got them. Width says nothing about input.
    const shown = (page: import("playwright").Page) =>
      page.evaluate(() => getComputedStyle(document.querySelector("#open-in-provider > kbd")!).display !== "none")
    const desktop = await openPage({ width: 700, height: 800 })
    expect(await shown(desktop.page)).toBe(true)
    await desktop.close()

    const phone = await openPage({ touch: true, width: 320, height: 640 })
    await fillPrompt(phone.page)
    const dock = () => phone.page.evaluate(() => Math.round(document.getElementById("open-action-section")!.getBoundingClientRect().height))
    const before = await dock()
    expect(await shown(phone.page)).toBe(false)
    // An on-screen keyboard sends no key code. It is no proof of a keyboard.
    await phone.page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Unidentified" })))
    expect(await shown(phone.page)).toBe(false)
    await phone.page.keyboard.press("Shift")
    expect(await shown(phone.page)).toBe(true)
    // The keys fit in the open button, so the dock keeps its height.
    expect(await dock()).toBe(before)
    await phone.close()
  })

  test("a held key shows as pressed on its keycap, and a blur clears it", async () => {
    const opened = await openPage({ width: 1280, height: 800 })
    const pressed = () =>
      opened.page.$$eval("#open-in-provider kbd kbd", (keys) => keys.map((key) => key.getAttribute("data-pressed")))
    expect(await pressed()).toEqual(["false", "false"])
    await opened.page.keyboard.down("Control")
    expect(await pressed()).toEqual(["true", "false"])
    await opened.page.keyboard.down("Enter")
    expect(await pressed()).toEqual(["true", "true"])
    await opened.page.keyboard.up("Enter")
    await opened.page.keyboard.up("Control")
    expect(await pressed()).toEqual(["false", "false"])
    // A new tab takes the focus, and the key-up never comes.
    await opened.page.keyboard.down("Control")
    await opened.page.evaluate(() => window.dispatchEvent(new Event("blur")))
    expect(await pressed()).toEqual(["false", "false"])
    await opened.close()
  })

  test("the example prompt matches the placeholder and leaves on the first letter", async () => {
    // The example is an overlay so a new one can fade in. A screen reader
    // still reads the real placeholder.
    const opened = await openPage()
    const read = () =>
      opened.page.evaluate(() => {
        const overlay = document.querySelector("#prompt-section > div > span[aria-hidden]")
        return {
          overlay: overlay?.textContent ?? null,
          placeholder: document.getElementById("prompt-input")!.getAttribute("placeholder"),
        }
      })
    const empty = await read()
    expect(empty.overlay).toBe(empty.placeholder)
    await opened.page.fill("#prompt-input", "a")
    expect((await read()).overlay).toBeNull()
    await opened.close()
  })

  test("Arabic in the prompt runs from the right", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page, "\u0644\u062e\u0635 \u0647\u0630\u0627 \u0627\u0644\u0628\u062d\u062b")
    expect(await opened.page.evaluate(() => getComputedStyle(document.getElementById("prompt-input")!).direction)).toBe("rtl")
    await opened.close()
  })

  test("spaces at the ends of the prompt stay out of the link and the count", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page, "\n  Summarize this paper.  \n")
    expect(await generatedUrl(opened.page)).toBe("https://chatgpt.com/?q=Summarize+this+paper.")
    expect(await opened.page.textContent("#prompt-meta")).toMatch(/^21 characters/)
    await opened.close()
  })

  test("a link that is too long cannot be copied or shared", async () => {
    // The page called the link too long, but Copy still copied it.
    for (const options of [{ touch: true, width: 412, height: 740 }, { width: 1280, height: 800 }]) {
      const opened = await openPage(options)
      await fillPrompt(opened.page, OVERSIZED_PROMPT)
      const enabled = await opened.page.evaluate(() =>
        [...document.querySelectorAll<HTMLButtonElement>("#generated-url-section button, #url-preview button")]
          .filter((b) => b.offsetParent !== null && /copy|share/i.test(b.textContent + (b.getAttribute("aria-label") ?? "")))
          .map((b) => !b.disabled)
      )
      expect(enabled.length).toBeGreaterThan(0)
      expect(enabled.every((on) => !on)).toBe(true)
      await opened.close()
    }
  })
})
