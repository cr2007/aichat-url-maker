import { describe, expect, test } from "bun:test"
import {
  SOUND_DEFAULT_ENABLED,
  SOUND_STORAGE_KEY,
  parseSoundPreference,
} from "./sound-context"

describe("parseSoundPreference", () => {
  test("sound is off by default", () => {
    // An app must not make noise before a person asks for it.
    expect(SOUND_DEFAULT_ENABLED).toBe(false)
    expect(parseSoundPreference(null)).toBe(false)
  })

  test('"on" turns sound on', () => {
    expect(parseSoundPreference("on")).toBe(true)
  })

  test('"off" turns sound off', () => {
    expect(parseSoundPreference("off")).toBe(false)
  })

  test("an unknown value turns sound off", () => {
    // A damaged or renamed value must not start playing sound.
    for (const value of ["", "true", "1", "ON", "yes", "{}"]) {
      expect(parseSoundPreference(value)).toBe(false)
    }
  })

  test("the storage key names the app", () => {
    // Other sites share the origin on a static host.
    expect(SOUND_STORAGE_KEY).toContain("aichat-url-maker")
  })
})
