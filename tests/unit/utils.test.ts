import { afterEach, describe, expect, test } from "bun:test"
import { cn, copyText, countWords } from "../../src/lib/utils"

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
