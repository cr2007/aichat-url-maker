import { afterEach, describe, expect, test } from "bun:test"
import { cn, copyText, countCharacters, countWords } from "../../src/lib/utils"

describe("countWords", () => {
  test("counts words, and ignores spaces at the ends and in runs", () => {
    expect(countWords("hello world")).toBe(2)
    expect(countWords("one")).toBe(1)
    expect(countWords("  hello world  ")).toBe(2)
    expect(countWords("hello     world")).toBe(2)
    expect(countWords("hello\n\nworld\tagain")).toBe(3)
  })

  test("returns 0 for empty or whitespace-only input", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("   ")).toBe(0)
    expect(countWords("\n\t  \n")).toBe(0)
  })

  test("counts a realistic multiline prompt", () => {
    // "Summarize this paper." is 3, "Then list three open questions." is 5.
    const prompt = "Summarize this paper.\nThen list three open questions."
    expect(countWords(prompt)).toBe(8)
  })
})

describe("countWords in scripts without spaces", () => {
  test("counts the words of a Chinese and a Thai sentence, not one each", () => {
    expect(countWords("\u4ECA\u5929\u5929\u6C14\u5F88\u597D")).toBeGreaterThan(1)
    expect(countWords("\u0E09\u0E31\u0E19\u0E23\u0E31\u0E01\u0E04\u0E38\u0E13")).toBeGreaterThan(1)
  })

  test("keeps one word for a hyphenated English word", () => {
    expect(countWords("state-of-the-art")).toBe(1)
  })
})

describe("countCharacters", () => {
  test("counts plain text and empty text", () => {
    expect(countCharacters("")).toBe(0)
    expect(countCharacters("hello")).toBe(5)
  })

  test("counts a family emoji as one character", () => {
    expect(countCharacters("\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}")).toBe(1)
  })

  test("counts a flag and a skin tone as one character each", () => {
    expect(countCharacters("\u{1F1EE}\u{1F1F3}")).toBe(1)
    expect(countCharacters("\u{1F44D}\u{1F3FD}")).toBe(1)
  })

  test("the ASCII fast path agrees with the segmenter", () => {
    // Plain ASCII skips the segmenter. A CR LF pair is ASCII but one
    // character, so it must take the slow path.
    expect(countCharacters("a\r\nb")).toBe(3)
    expect(countCharacters("tab\there\n")).toBe(9)
    expect(countCharacters("plain ".repeat(20000))).toBe(120000)
  })
})

describe("cn", () => {
  test("joins names, drops falsy values, and lets the last Tailwind utility win", () => {
    expect(cn("a", "b")).toBe("a b")
    expect(cn("a", false, undefined, null, "b")).toBe("a b")
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})

describe("copyText", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator")

  function setClipboard(clipboard: unknown) {
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard },
      configurable: true,
      writable: true,
    })
  }

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "navigator", original)
  })

  test("it reports success when the write resolves", async () => {
    setClipboard({ writeText: () => Promise.resolve() })
    expect(await copyText("hello")).toBe(true)
  })

  test("it reports failure when the write rejects", async () => {
    setClipboard({ writeText: () => Promise.reject(new Error("denied")) })
    expect(await copyText("hello")).toBe(false)
  })

  test("it reports failure when there is no clipboard", async () => {
    // An insecure origin has no clipboard. Reading `writeText` from it throws
    // at once, which a `.catch()` on the call never sees.
    setClipboard(undefined)
    expect(await copyText("hello")).toBe(false)
  })

  test("it passes the text through", async () => {
    const seen: string[] = []
    setClipboard({ writeText: (text: string) => { seen.push(text); return Promise.resolve() } })
    await copyText("the prompt")
    expect(seen).toEqual(["the prompt"])
  })
})
