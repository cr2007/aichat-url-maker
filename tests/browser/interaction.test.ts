import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { fillPrompt, generatedUrl, openPage, startHarness, stopHarness, OVERSIZED_PROMPT } from "./harness"

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
        roles: [...new Set(pills.map((p) => p.getAttribute("role")))],
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
    await opened.page.waitForTimeout(200)
    expect(await generatedUrl(opened.page)).toContain("hints=research")

    await opened.page.click('#feature-picker button:has-text("Deep Research")')
    await opened.page.waitForTimeout(200)
    expect(await generatedUrl(opened.page)).not.toContain("hints=")
    await opened.close()
  })

  test("only one feature is selected at a time", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.click('#feature-picker button:has-text("Canvas")')
    await opened.page.click('#feature-picker button:has-text("Search")')
    await opened.page.waitForTimeout(200)

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
    await opened.page.waitForTimeout(250)
    expect(await generatedUrl(opened.page)).toContain("temporary-chat=true")

    await opened.page.mouse.click(box.x + 60, box.y + box.height - 12)
    await opened.page.waitForTimeout(250)
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
    await opened.page.waitForTimeout(350)

    expect(await generatedUrl(opened.page)).toContain("perplexity.ai")
    await opened.close()
  })

  test("a tap still selects a segment", async () => {
    // Capturing the pointer on pointerdown once sent the click to the track,
    // and a tap then selected nothing.
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.click('#provider-picker [role="radio"]:has-text("Claude")')
    await opened.page.waitForTimeout(250)
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
    await opened.page.waitForTimeout(350)

    expect(await generatedUrl(opened.page)).toContain("chatgpt.com")
    await opened.close()
  })

  test("the arrow keys move the selection and keep one tab stop", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    await opened.page.focus('#provider-picker [role="radio"][aria-checked="true"]')
    await opened.page.keyboard.press("ArrowRight")
    await opened.page.waitForTimeout(200)
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
    await opened.page.waitForTimeout(250)

    await opened.page.click('#provider-picker [role="radio"]:has-text("Perplexity")')
    await opened.page.waitForTimeout(250)
    const away = await generatedUrl(opened.page)
    expect(away).not.toContain("hints=")
    expect(away).not.toContain("temporary-chat=true")

    await opened.page.click('#provider-picker [role="radio"]:has-text("ChatGPT")')
    await opened.page.waitForTimeout(250)
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
    })

    await opened.page.click('[aria-label="Copy link"]')
    await opened.page.waitForTimeout(300)

    const status = await opened.page.evaluate(() =>
      [...document.querySelectorAll("[role=status]")]
        .map((element) => (element.textContent ?? "").trim())
        .join(" ")
    )
    expect(status).toMatch(/could not copy/i)
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

describe("the whole page", () => {
  test("it reports no errors during a full pass", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)
    await opened.page.click('#feature-picker button:has-text("Search")')
    await opened.page.click("#temporary-chat-section")
    await opened.page.click("#how-it-works-toggle")
    await opened.page.waitForTimeout(400)
    expect(opened.errors).toEqual([])
    await opened.close()
  })
})
