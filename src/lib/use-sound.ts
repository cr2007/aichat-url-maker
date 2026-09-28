import { useCallback, useContext } from "react"

import {
  SoundContext,
  type SoundContextValue,
  type SoundRole,
} from "./sound-context"

/**
 * Reads the sound context.
 *
 * @returns The play function and the preference.
 * @throws If used outside `SoundProvider`.
 */
function useSoundContext(): SoundContextValue {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error("useSoundContext must be used within a SoundProvider")
  }
  return context
}

/**
 * Returns a function that plays one sound role.
 *
 * The returned function does nothing when sound is off, while the engine
 * loads, or when the browser reports `prefers-reduced-motion: reduce`. A
 * caller therefore never has to check first.
 *
 * Every sound must repeat something the interface already shows. Sound is the
 * second signal, never the only one.
 *
 * @param role - The semantic role, such as `notification.success`.
 * @returns A function that plays the sound.
 *
 * @example
 * ```tsx
 * const playCopied = useSound("notification.success")
 * playCopied()
 * ```
 */
export function useSound(role: SoundRole): () => void {
  const { play } = useSoundContext()
  return useCallback(() => play(role), [play, role])
}

/**
 * Reads and sets the sound preference.
 *
 * @returns The preference and its setter.
 */
export function useSoundPreference(): Omit<SoundContextValue, "play"> {
  const { soundOn, setSoundOn } = useSoundContext()
  return { soundOn, setSoundOn }
}
