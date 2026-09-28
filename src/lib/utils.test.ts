import { describe, expect, test } from "bun:test"
import { cn, countWords } from "./utils"

describe("countWords", () => {
  test("counts plain words", () => {
    expect(countWords("hello world")).toBe(2)
    expect(countWords("one")).toBe(1)
  })

  test("returns 0 for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("   ")).toBe(0)
    expect(countWords("\n\t  \n")).toBe(0)
  })

  test("ignores leading and trailing whitespace", () => {
    expect(countWords("  hello world  ")).toBe(2)
  })

  test("collapses runs of whitespace", () => {
    expect(countWords("hello     world")).toBe(2)
    expect(countWords("hello\n\nworld\tagain")).toBe(3)
  })

  test("counts a realistic multiline prompt", () => {
    // "Summarize this paper." is 3, "Then list three open questions." is 5.
    const prompt = "Summarize this paper.\nThen list three open questions."
    expect(countWords(prompt)).toBe(8)
  })
})

describe("cn", () => {
  test("merges class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  test("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b")
  })

  test("last conflicting Tailwind utility wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
