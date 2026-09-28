import { createContext } from "react"

import type { SoundRole } from "./sensory-ui/config/sound-roles"

export type { SoundRole }

/** Starts one sound. */
export type PlayFunction = (role: SoundRole) => void

/** The key that holds the sound preference. */
export const SOUND_STORAGE_KEY = "aichat-url-maker.sound"

/** Sound is off until a person turns it on. An app must not make noise first. */
export const SOUND_DEFAULT_ENABLED = false

/** What {@link SoundContext} carries. */
export interface SoundContextValue {
  /** Plays one sound. Does nothing while sound is off. */
  play: PlayFunction
  /** Whether sound is on. */
  soundOn: boolean
  /** Turns sound on or off and stores the choice. */
  setSoundOn: (on: boolean) => void
}

/**
 * The sound context.
 *
 * It is in its own module so that `sound.tsx` exports only a component and
 * `use-sound.ts` exports only hooks. A file that mixes the two breaks React
 * Fast Refresh.
 */
export const SoundContext = createContext<SoundContextValue | null>(null)

/**
 * Reads a stored preference value.
 *
 * @param stored - The value from storage, or null when there is none.
 * @returns True for "on". {@link SOUND_DEFAULT_ENABLED} when there is no value.
 */
export function parseSoundPreference(stored: string | null): boolean {
  // Step 1.1: no value means the person has not chosen yet.
  if (stored === null) return SOUND_DEFAULT_ENABLED

  // Step 1.2: only "on" turns sound on. Any other value is off.
  return stored === "on"
}

/** The listeners that {@link writeSoundPreference} calls. */
const listeners = new Set<() => void>()

/**
 * Reads the stored preference.
 *
 * @returns The stored value, or {@link SOUND_DEFAULT_ENABLED} if there is none.
 */
export function readStoredSoundPreference(): boolean {
  // Step 1.1: storage throws in a private window and when a site blocks it.
  try {
    return parseSoundPreference(localStorage.getItem(SOUND_STORAGE_KEY))
  } catch {
    return SOUND_DEFAULT_ENABLED
  }
}

/**
 * Stores the preference and tells every listener.
 *
 * @param on - The new value.
 */
export function writeSoundPreference(on: boolean): void {
  // Step 1.1: store the choice. A failed write must not stop sound from
  // working for this visit.
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, on ? "on" : "off")
  } catch {
    // Storage is unavailable. The choice lasts for this visit only.
  }

  // Step 1.2: the `storage` event does not fire in the tab that wrote the
  // value, so tell the listeners in this tab directly.
  for (const listener of listeners) listener()
}

/**
 * Watches the preference.
 *
 * @param onChange - Called after any change, in this tab or another one.
 * @returns A function that stops watching.
 */
export function subscribeSoundPreference(onChange: () => void): () => void {
  // Step 1.1: watch this tab.
  listeners.add(onChange)

  // Step 1.2: watch the other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_STORAGE_KEY) onChange()
  }
  window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * Gives the value to use before the client takes over.
 *
 * The prerendered document is built without storage, so the first client
 * render must agree with it. Hydration would otherwise discard the markup.
 *
 * @returns {@link SOUND_DEFAULT_ENABLED}.
 */
export function getServerSoundPreference(): boolean {
  return SOUND_DEFAULT_ENABLED
}
