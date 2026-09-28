import { Suspense, lazy, useCallback, useMemo, useRef, useSyncExternalStore } from "react"

import {
  SoundContext,
  getServerSoundPreference,
  readStoredSoundPreference,
  subscribeSoundPreference,
  writeSoundPreference,
  type PlayFunction,
  type SoundRole,
} from "./sound-context"

/**
 * The engine, loaded on demand.
 *
 * `import()` keeps the synthesis code in its own chunk. A person who never
 * turns sound on never downloads it.
 */
const SoundEngine = lazy(() => import("./sound-engine"))

/**
 * Provides the sound preference, and the engine once sound is on.
 *
 * The engine mounts only while the preference is on, so its code is fetched
 * on the first opt-in and never otherwise. The engine keeps quiet on its own
 * when the browser reports `prefers-reduced-motion: reduce`.
 *
 * @param props.children - The tree that can play sounds.
 * @returns The provider.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  // The preference lives in storage, which is outside React. Reading it
  // through this hook gives the prerender a matching first value and keeps
  // every tab in step, with no effect and no second render.
  const soundOn = useSyncExternalStore(
    subscribeSoundPreference,
    readStoredSoundPreference,
    getServerSoundPreference
  )

  // Holds the engine's play function while the engine is mounted.
  const playRef = useRef<PlayFunction | null>(null)

  // This function is stable, so a component that uses it does not re-render
  // when the engine loads. It stays silent until the engine fills the ref,
  // which covers both "sound is off" and "the engine is loading".
  const play = useCallback<PlayFunction>((role: SoundRole) => {
    playRef.current?.(role)
  }, [])

  const value = useMemo(
    () => ({ play, soundOn, setSoundOn: writeSoundPreference }),
    [play, soundOn]
  )

  return (
    <SoundContext.Provider value={value}>
      {soundOn && (
        <Suspense fallback={null}>
          <SoundEngine playRef={playRef} />
        </Suspense>
      )}
      {children}
    </SoundContext.Provider>
  )
}
