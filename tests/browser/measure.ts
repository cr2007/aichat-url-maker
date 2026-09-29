import type { Page } from "playwright"

/**
 * Measurements that a browser has to make.
 *
 * Contrast is read from the pixels that the browser paints, not from the
 * tokens. A token says nothing about what a translucent surface over a
 * gradient looks like.
 */

/** One text element and its contrast against what it sits on. */
export interface ContrastReading {
  /** The element id, or its tag and the start of its text. */
  what: string
  /** The contrast ratio. */
  ratio: number
  /** The ratio that WCAG AA asks for at this size and weight. */
  required: number
  /** The text size in pixels. */
  size: number
  /** The foreground colour, as hex. */
  colour: string
  /** The background colour, as hex. */
  background: string
}

/** One control and the size of the area that operates it. */
export interface TargetReading {
  /** The element id, its accessible name, or the start of its text. */
  what: string
  width: number
  height: number
}

/**
 * Reads the contrast of every visible text element.
 *
 * The background is the most common colour inside the element's box. Glyphs
 * never cover most of a box, so the most common colour is the surface.
 *
 * @param page - The page to measure.
 * @returns One reading for each element that holds text.
 */
export async function readContrast(page: Page): Promise<ContrastReading[]> {
  // Step 1.1: take a picture of the page as the browser paints it.
  const shot = await page.screenshot({ fullPage: true })
  const dataUrl = `data:image/png;base64,${shot.toString("base64")}`

  // Step 1.2: read the pixels back inside the page, where the elements are.
  return page.evaluate(async (dataUrl) => {
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext("2d", { willReadFrequently: true })!
    context.drawImage(image, 0, 0)
    const scale = image.width / document.documentElement.clientWidth

    const channel = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const luminance = (c: number[]) =>
      0.2126 * channel(c[0] / 255) + 0.7152 * channel(c[1] / 255) + 0.0722 * channel(c[2] / 255)
    const contrast = (a: number[], b: number[]) => {
      const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (high + 0.05) / (low + 0.05)
    }
    const hex = (c: number[]) =>
      `#${c.slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("")}`

    const probe = document.createElement("canvas")
    probe.width = 1
    probe.height = 1
    const probeContext = probe.getContext("2d")!
    const toRgb = (value: string) => {
      probeContext.clearRect(0, 0, 1, 1)
      probeContext.fillStyle = value.trim()
      probeContext.fillRect(0, 0, 1, 1)
      const data = probeContext.getImageData(0, 0, 1, 1).data
      return [data[0], data[1], data[2]]
    }

    const backdropOf = (rect: DOMRect) => {
      const x = Math.max(0, Math.round((rect.left + window.scrollX) * scale))
      const y = Math.max(0, Math.round((rect.top + window.scrollY) * scale))
      const w = Math.max(1, Math.round(rect.width * scale))
      const h = Math.max(1, Math.round(rect.height * scale))
      if (x + w > canvas.width || y + h > canvas.height) return null
      const data = context.getImageData(x, y, w, h).data
      const tally = new Map<string, number>()
      for (let i = 0; i < data.length; i += 4) {
        const key = `${data[i]},${data[i + 1]},${data[i + 2]}`
        tally.set(key, (tally.get(key) ?? 0) + 1)
      }
      let best = ""
      let most = -1
      for (const [key, count] of tally) if (count > most) [best, most] = [key, count]
      return best.split(",").map(Number)
    }

    const readings: ContrastReading[] = []
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      const holdsText = [...element.childNodes].some(
        (node) => node.nodeType === 3 && (node.textContent ?? "").trim().length > 1
      )
      if (!holdsText) continue

      const rect = element.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue

      const style = getComputedStyle(element)
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
        continue
      }

      const background = backdropOf(rect)
      if (!background) continue

      const size = Number.parseFloat(style.fontSize)
      const weight = Number.parseInt(style.fontWeight) || 400
      const large = size >= 24 || (size >= 18.66 && weight >= 700)
      const foreground = toRgb(style.color)

      readings.push({
        what: element.id || `${element.tagName.toLowerCase()}: ${(element.textContent ?? "").trim().slice(0, 30)}`,
        ratio: contrast(foreground, background),
        required: large ? 3 : 4.5,
        size,
        colour: hex(foreground),
        background: hex(background),
      })
    }
    return readings
  }, dataUrl)
}

/**
 * Reads the size of every control.
 *
 * A control inside a label is operated by the whole label, so the label is
 * the real target and the one that gets measured.
 *
 * @param page - The page to measure.
 * @returns One reading for each control.
 */
export async function readTargets(page: Page): Promise<TargetReading[]> {
  return page.evaluate(() => {
    const readings: TargetReading[] = []
    for (const element of document.querySelectorAll<HTMLElement>(
      'button, [role="radio"], a, textarea, input'
    )) {
      const target = (element.closest("label") ?? element) as HTMLElement
      const rect = target.getBoundingClientRect()
      if (rect.width < 1) continue
      readings.push({
        what:
          element.id ||
          element.getAttribute("aria-label") ||
          (element.textContent ?? "").trim().slice(0, 24) ||
          element.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }
    return readings
  })
}
