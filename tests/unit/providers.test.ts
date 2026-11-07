import { describe, expect, test } from "bun:test"
import {
  PROVIDERS,
  getProvider,
  isUrlTooLong,
  resolveOpenAction,
  MAX_SAFE_URL_LENGTH,
} from "../../src/lib/providers"
import type { Feature, ProviderId } from "../../src/lib/providers"

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

  test("adds hints only when a feature is selected", () => {
    expect(new URL(p.buildURL("test", "search", false)).searchParams.get("hints")).toBe("search")
    expect(new URL(p.buildURL("test", "", false)).searchParams.get("hints")).toBeNull()
  })

  test("adds temporary-chat=true only when enabled", () => {
    expect(new URL(p.buildURL("test", "", true)).searchParams.get("temporary-chat")).toBe("true")
    expect(new URL(p.buildURL("test", "", false)).searchParams.get("temporary-chat")).toBeNull()
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

  test("appends the incognito flag only for temporary chat", () => {
    expect(p.buildURL("test", "", true)).toContain("incognito")
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
  test("a very long prompt produces a URL exceeding the safe length", () => {
    const url = getProvider("chatgpt").buildURL("a".repeat(8000), "", false)
    expect(url.length).toBeGreaterThan(MAX_SAFE_URL_LENGTH)
  })

  test("a normal prompt stays under the safe length", () => {
    const url = getProvider("chatgpt").buildURL(
      "Summarize the key points from this article.",
      "search",
      true,
    )
    expect(url.length).toBeLessThan(MAX_SAFE_URL_LENGTH)
  })
})

describe("isUrlTooLong", () => {
  test("returns false for a URL at the safe length", () => {
    expect(isUrlTooLong("a".repeat(MAX_SAFE_URL_LENGTH))).toBe(false)
  })

  test("returns true for a URL one character over the safe length", () => {
    expect(isUrlTooLong("a".repeat(MAX_SAFE_URL_LENGTH + 1))).toBe(true)
  })
})

describe("resolveOpenAction", () => {
  const provider = getProvider("chatgpt")

  test("opens the generated URL directly when it's short enough", () => {
    const url = provider.buildURL("hello", "", false)
    expect(resolveOpenAction(url)).toEqual({
      targetURL: url,
      shouldCopyPrompt: false,
    })
  })

  test("a link that is too long drops only the prompt and keeps every setting", () => {
    // The fallback opened the bare home page, so a temporary chat became a
    // normal chat that the AI app saves to the history.
    const long = "a".repeat(8000)
    const cases: [ProviderId, Feature, boolean, string][] = [
      ["chatgpt", "search", true, "https://chatgpt.com/?hints=search&temporary-chat=true"],
      ["chatgpt", "", false, "https://chatgpt.com/"],
      ["claude", "", true, "https://claude.ai/new?incognito"],
      ["perplexity", "", false, "https://www.perplexity.ai/search"],
    ]
    for (const [id, feature, temporary, expected] of cases) {
      const target = getProvider(id)
      expect(resolveOpenAction(target.buildURL(long, feature, temporary))).toEqual({
        targetURL: expected,
        shouldCopyPrompt: true,
      })
    }
  })
})

describe("feature options", () => {
  const features = PROVIDERS.flatMap((provider) => provider.features)

  test("every feature has a label, an icon, and a one-sentence description", () => {
    for (const feature of features) {
      expect(feature.label.length).toBeGreaterThan(0)
      expect(feature.icon).toBeTruthy()
      // The tooltip shows the description, so it is trimmed and ends with a full stop.
      expect(feature.description.trim()).toBe(feature.description)
      expect(feature.description).toMatch(/^.+\.$/)
    }
  })

  test("values and labels are unique inside a provider", () => {
    for (const provider of PROVIDERS) {
      const values = provider.features.map((f) => f.value)
      const labels = provider.features.map((f) => f.label)
      expect(new Set(values).size).toBe(values.length)
      expect(new Set(labels).size).toBe(labels.length)
    }
  })

  test("only a provider that declares features has any", () => {
    for (const provider of PROVIDERS) {
      if (!provider.supportsFeatures) expect(provider.features).toHaveLength(0)
      else expect(provider.features.length).toBeGreaterThan(0)
    }
  })

  test("a feature value never reaches the URL of a provider without features", () => {
    for (const provider of PROVIDERS) {
      if (provider.supportsFeatures) continue
      expect(provider.buildURL("hi", "search", false)).not.toContain("hints")
    }
  })
})
