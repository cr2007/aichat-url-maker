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
const EMOJI_SELECTOR = "\uFE0F"

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

  test("the art is a block of many rows, all one width, none past 80", () => {
    const widths = new Set(rows().map((row) => [...row].length))
    expect(rows().length).toBeGreaterThan(20)
    // The paper is the background of the text. A short row leaves a notch.
    expect([...widths]).toHaveLength(1)
    // A console wraps a longer row, and a wrapped row breaks the picture.
    expect([...widths][0]).toBeLessThanOrEqual(80)
  })

  test("it carries no emoji, no dash and no sentence", () => {
    const [message] = bannerArguments()
    expect(message).not.toMatch(EMOJI)
    expect(message).not.toContain(EMOJI_SELECTOR)
    expect(message).not.toContain("\u2014")
    expect(message).not.toContain("\u2013")
    // The page already explains itself. The console shows the picture only.
    expect(rows().join("")).not.toMatch(/[a-z]{3}/i)
  })

  test("the style sets a line height, the ink and the paper", () => {
    const style = bannerArguments()[1]
    // Without a line height the rows part and the shading breaks up.
    expect(style).toContain("line-height")
    // A console has its own theme that the page cannot read. Art that takes
    // the console colour arrives as a negative on one theme or the other.
    expect(style).toContain("background-color:#")
    expect(style).toContain("color:#")
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
