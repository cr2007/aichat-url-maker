import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { fillPrompt, openPage, startHarness, stopHarness, OVERSIZED_PROMPT } from "./harness"
import { readContrast, readTargets } from "./measure"

/** The smallest target that WCAG 2.2 AA accepts, in pixels. */
const WCAG_TARGET = 24

/** The target that HIG asks for, in pixels. */
const HIG_TARGET = 44

beforeAll(startHarness)
afterAll(stopHarness)

for (const colourScheme of ["light", "dark"] as const) {
  describe(`contrast in the ${colourScheme} appearance`, () => {
    test("every text element meets WCAG AA", async () => {
      const opened = await openPage({ colorScheme: colourScheme })
      await fillPrompt(opened.page)
      await opened.page.click('#feature-picker button:has-text("Search")')
      await opened.page.waitForTimeout(300)

      const readings = await readContrast(opened.page)
      const failures = readings.filter((r) => r.ratio < r.required)

      expect(readings.length).toBeGreaterThan(5)
      expect(
        failures.map((f) => `${f.what}: ${f.ratio.toFixed(2)} < ${f.required} (${f.colour} on ${f.background} at ${f.size}px)`)
      ).toEqual([])
      await opened.close()
    })

    test("the oversized prompt warning meets WCAG AA", async () => {
      // This message once used a hard-coded amber that measured 3.06:1.
      const opened = await openPage({ colorScheme: colourScheme })
      await fillPrompt(opened.page, OVERSIZED_PROMPT)
      await opened.page.waitForTimeout(300)

      const reading = (await readContrast(opened.page)).find((r) => r.what === "prompt-meta")
      expect(reading).toBeDefined()
      expect(reading!.ratio).toBeGreaterThanOrEqual(reading!.required)
      await opened.close()
    })
  })
}

describe("target sizes", () => {
  test("every control meets the WCAG minimum", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    const small = (await readTargets(opened.page)).filter(
      (t) => t.width < WCAG_TARGET || t.height < WCAG_TARGET
    )
    expect(small.map((t) => `${t.what} ${t.width}x${t.height}`)).toEqual([])
    await opened.close()
  })

  test("every control meets the HIG target", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    const small = (await readTargets(opened.page)).filter((t) => t.height < HIG_TARGET)
    expect(small.map((t) => `${t.what} ${t.width}x${t.height}`)).toEqual([])
    await opened.close()
  })
})

describe("text size", () => {
  test("no text is below 13px", async () => {
    // Below this size text stops meeting the platform minimum.
    const opened = await openPage()
    await fillPrompt(opened.page)

    const small = (await readContrast(opened.page)).filter((r) => r.size < 13)
    expect(small.map((r) => `${r.what} at ${r.size}px`)).toEqual([])
    await opened.close()
  })
})

describe("semantics", () => {
  test("the document has one h1 and a language", async () => {
    const opened = await openPage()
    const result = await opened.page.evaluate(() => ({
      headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => h.tagName),
      lang: document.documentElement.lang,
    }))
    expect(result.headings[0]).toBe("H1")
    expect(result.lang.length).toBeGreaterThan(0)
    await opened.close()
  })

  test("every control has an accessible name", async () => {
    const opened = await openPage()
    await fillPrompt(opened.page)

    const unnamed = await opened.page.evaluate(() =>
      [...document.querySelectorAll("button,[role=radio],textarea,input")]
        .filter((element) => {
          const name =
            element.getAttribute("aria-label") ??
            element.getAttribute("aria-labelledby") ??
            (element.textContent ?? "").trim()
          const label = element.id ? document.querySelector(`label[for="${element.id}"]`) : null
          return !name && !label
        })
        .map((element) => element.id || element.tagName)
    )
    expect(unnamed).toEqual([])
    await opened.close()
  })

  test("every group has a name", async () => {
    const opened = await openPage()
    const unnamed = await opened.page.evaluate(() =>
      [...document.querySelectorAll('[role="radiogroup"],[role="group"]')]
        .filter((g) => !g.getAttribute("aria-label") && !g.getAttribute("aria-labelledby"))
        .map((g) => g.id || g.getAttribute("role") || "group")
    )
    expect(unnamed).toEqual([])
    await opened.close()
  })

  test("a decorative icon is hidden from assistive technology", async () => {
    const opened = await openPage()
    const exposed = await opened.page.evaluate(() =>
      [...document.querySelectorAll("svg")]
        .filter((s) => s.getAttribute("aria-hidden") !== "true" && !s.getAttribute("aria-label") && !s.querySelector("title"))
        .length
    )
    expect(exposed).toBe(0)
    await opened.close()
  })
})

describe("focus", () => {
  test("every control shows the same focus indicator", async () => {
    // The indicator must not be --ring. That colour disappears on a control
    // that the accent colour fills.
    const opened = await openPage()
    await fillPrompt(opened.page)

    const seen: string[] = []
    const wrong: string[] = []
    for (let i = 0; i < 16; i += 1) {
      await opened.page.keyboard.press("Tab")
      await opened.page.waitForTimeout(260)
      const info = await opened.page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null
        if (!element || element === document.body) return null
        const style = getComputedStyle(element)
        return {
          what: element.id || element.getAttribute("aria-label") || (element.textContent ?? "").trim().slice(0, 20),
          outline: `${style.outlineWidth} ${style.outlineStyle} ${style.outlineOffset}`,
        }
      })
      if (!info || seen.includes(info.what)) break
      seen.push(info.what)
      if (info.outline !== "2px solid 2px") wrong.push(`${info.what}: ${info.outline}`)
    }

    expect(seen.length).toBeGreaterThan(4)
    expect(wrong).toEqual([])
    await opened.close()
  })
})

describe("reduced motion", () => {
  test("the app suppresses its transitions", async () => {
    const opened = await openPage({ reducedMotion: "reduce" })
    const duration = await opened.page.evaluate(() => {
      const indicator = document.querySelector('[role="radiogroup"] span[aria-hidden]')
      return indicator ? getComputedStyle(indicator).transitionDuration : "missing"
    })
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001)
    await opened.close()
  })
})
