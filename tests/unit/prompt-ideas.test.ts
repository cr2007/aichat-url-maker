import { describe, expect, test } from "bun:test"
import { PROMPT_IDEAS, dealIdeas } from "../../src/lib/prompt-ideas"

describe("dealIdeas", () => {
  test("deals every other idea once, in an order that changes", () => {
    // The ideas came in one fixed pattern, and an idea could repeat soon.
    const all = PROMPT_IDEAS.map((_, index) => index)
    for (const random of [() => 0, () => 0.999999, Math.random]) {
      const deck = dealIdeas(3, random)
      expect(deck).not.toContain(3)
      expect([...deck, 3].sort((a, b) => a - b)).toEqual(all)
    }
    const orders = new Set(Array.from({ length: 20 }, () => dealIdeas(0).join()))
    expect(orders.size).toBeGreaterThan(1)
  })
})

describe("PROMPT_IDEAS", () => {
  test("each idea is unique, short and plain", () => {
    // Short enough for one or two lines on a phone after "For example: ".
    expect(new Set(PROMPT_IDEAS).size).toBe(PROMPT_IDEAS.length)
    for (const idea of PROMPT_IDEAS) {
      expect(idea.length).toBeLessThanOrEqual(48)
      expect(idea).not.toMatch(/[\u2013\u2014]|\p{Extended_Pictographic}/u)
    }
  })
})
