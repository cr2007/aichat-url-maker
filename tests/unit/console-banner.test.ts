import { describe, expect, test } from "bun:test"
import { bannerArguments, printBanner } from "../../src/lib/console-banner"

/** Matches the emoji blocks. See `AGENTS.md > Read This First`. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

/**
 * The variation selector that turns a plain glyph into an emoji.
 *
 * It sits outside {@link EMOJI} on purpose. In a character class it joins the
 * character beside it, which makes the class match something else.
 */
const EMOJI_SELECTOR = "️"

/** The art, without the marker and the blank lines around it. */
function rows(): string[] {
  return bannerArguments()[0].replace("%c", "").replace(/^\n+|\n+$/g, "").split("\n")
}

describe("bannerArguments", () => {
  test("every %c marker gets a style", () => {
    // A marker with no style prints the word "undefined" into the console.
    const [message, ...styles] = bannerArguments()
    expect(message.match(/%c/g)).toHaveLength(styles.length)
  })

  test("the art is a block of many rows", () => {
    expect(rows().length).toBeGreaterThan(20)
  })

  test("no row is wider than 80 columns", () => {
    // A console wraps a longer row, and a wrapped row breaks the picture.
    const wide = rows().filter((row) => [...row].length > 80)
    expect(wide).toEqual([])
  })

  test("it carries no emoji and no em dash", () => {
    const [message] = bannerArguments()
    expect(message).not.toMatch(EMOJI)
    expect(message).not.toContain(EMOJI_SELECTOR)
    expect(message).not.toContain("—")
    expect(message).not.toContain("–")
  })

  test("it prints no sentence", () => {
    // The page already explains itself. The console shows the picture only.
    expect(rows().join("")).not.toMatch(/[a-z]{3}/i)
  })

  test("the style sets a line height", () => {
    // Without it the rows part and the shading breaks up.
    expect(bannerArguments()[1]).toContain("line-height")
  })

  test("the style sets both the ink and the paper", () => {
    // A console has its own theme that the page cannot read. Art that takes
    // the console colour arrives as a negative on one theme or the other.
    const style = bannerArguments()[1]
    expect(style).toContain("background-color:#")
    expect(style).toContain("color:#")
  })

  test("every row is the same width", () => {
    // The paper is the background of the text. A short row leaves a notch in
    // the rectangle.
    const widths = new Set(rows().map((row) => [...row].length))
    expect([...widths]).toHaveLength(1)
  })

  test("it loads no picture", () => {
    // Chrome does not fetch a background image from a console style, so the
    // art has to be text. A url() here would draw nothing at all.
    expect(bannerArguments().join(" ")).not.toContain("url(")
  })
})

describe("printBanner", () => {
  test("it prints one message", () => {
    const calls: string[][] = []
    printBanner((...args: string[]) => calls.push(args))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual(bannerArguments())
  })

  test("a console that throws does not reach the caller", () => {
    // An extension can replace console.log. A greeting must never stop the app.
    expect(() =>
      printBanner(() => {
        throw new Error("no console")
      })
    ).not.toThrow()
  })
})
