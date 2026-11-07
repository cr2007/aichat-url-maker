import { describe, expect, test } from "bun:test"
import { PROMPT_IDEAS, nextIdeaIndex } from "../../src/lib/prompt-ideas"

describe("nextIdeaIndex", () => {
  test("always moves to a different idea that exists", () => {
    // The placeholder must change each time it changes. The two edges of
    // Math.random() and a middle value cover the arithmetic.
    for (let current = 0; current < PROMPT_IDEAS.length; current++) {
      for (const random of [0, 0.5, 0.999999]) {
        const next = nextIdeaIndex(current, random)
        expect(next).not.toBe(current)
        expect(next).toBeGreaterThanOrEqual(0)
        expect(next).toBeLessThan(PROMPT_IDEAS.length)
      }
    }
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
