import { describe, expect, test } from "bun:test"
import { PROVIDERS, getProvider } from "./providers"

describe("getProvider", () => {
  test("resolves every declared provider by id", () => {
    for (const p of PROVIDERS) {
      expect(getProvider(p.id).id).toBe(p.id)
    }
  })
})

describe("ChatGPT buildURL", () => {
  const p = getProvider("chatgpt")

  test("encodes the prompt as the q param", () => {
    const parsed = new URL(p.buildURL("hello world", "", false))
    expect(parsed.searchParams.get("q")).toBe("hello world")
  })

  test("adds hints param when a feature is selected", () => {
    const parsed = new URL(p.buildURL("test", "search", false))
    expect(parsed.searchParams.get("hints")).toBe("search")
  })

  test("omits hints when no feature is selected", () => {
    const parsed = new URL(p.buildURL("test", "", false))
    expect(parsed.searchParams.get("hints")).toBeNull()
  })

  test("adds temporary-chat=true when enabled", () => {
    const parsed = new URL(p.buildURL("test", "", true))
    expect(parsed.searchParams.get("temporary-chat")).toBe("true")
  })

  test("omits temporary-chat when disabled", () => {
    const parsed = new URL(p.buildURL("test", "", false))
    expect(parsed.searchParams.get("temporary-chat")).toBeNull()
  })

  test("correctly round-trips special characters", () => {
    const parsed = new URL(p.buildURL("a & b = c", "", false))
    expect(parsed.searchParams.get("q")).toBe("a & b = c")
  })
})

describe("Claude buildURL", () => {
  const p = getProvider("claude")

  test("targets claude.ai/new", () => {
    expect(p.buildURL("test", "", false)).toMatch(/^https:\/\/claude\.ai\/new/)
  })

  test("encodes the prompt as the q param", () => {
    const parsed = new URL(p.buildURL("hello world", "", false))
    expect(parsed.searchParams.get("q")).toBe("hello world")
  })

  test("appends the incognito flag for temporary chat", () => {
    expect(p.buildURL("test", "", true)).toContain("incognito")
  })

  test("omits the incognito flag when disabled", () => {
    expect(p.buildURL("test", "", false)).not.toContain("incognito")
  })
})

describe("Perplexity buildURL", () => {
  const p = getProvider("perplexity")

  test("targets perplexity.ai/search", () => {
    expect(p.buildURL("test", "", false)).toMatch(/^https:\/\/www\.perplexity\.ai\/search/)
  })

  test("encodes the prompt as the q param", () => {
    const parsed = new URL(p.buildURL("hello world", "", false))
    expect(parsed.searchParams.get("q")).toBe("hello world")
  })
})

describe("URL length safety threshold", () => {
  test("a very long prompt produces a URL exceeding 7500 chars", () => {
    const url = getProvider("chatgpt").buildURL("a".repeat(8000), "", false)
    expect(url.length).toBeGreaterThan(7500)
  })

  test("a normal prompt stays under the 7500-char threshold", () => {
    const url = getProvider("chatgpt").buildURL(
      "Summarize the key points from this article.",
      "search",
      true,
    )
    expect(url.length).toBeLessThan(7500)
  })
})
