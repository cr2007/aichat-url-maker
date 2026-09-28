import { useEffect } from "react"

import { SensoryUIProvider, useSensoryUI } from "./sensory-ui/config/provider"
import type { PlayFunction, SoundRole } from "./sound-context"

/**
 * Holds the engine's play function while the engine is loaded.
 *
 * The value is `null` when sound is off, which is also the state before the
 * engine finishes loading. Callers treat `null` as silence.
 */
type PlayFunctionRef = { current: PlayFunction | null }

/**
 * Publishes the engine's play function to the owner of the ref.
 *
 * The hook that reads it has to work whether or not this engine is loaded, so
 * it cannot call `useSensoryUI` itself. This component sits inside the
 * provider, where the context exists, and hands the function outwards.
 *
 * @param props.playRef - The ref to fill in.
 * @returns Nothing. This component renders no markup.
 */
function PlayBridge({ playRef }: { playRef: PlayFunctionRef }) {
  const { playSound } = useSensoryUI()

  useEffect(() => {
    // Step 1.1: publish a function that drops the engine's return value. A
    // caller only needs to start a sound.
    const play: PlayFunction = (role: SoundRole) => void playSound(role)
    playRef.current = play

    // Step 1.2: restore the silent function when this engine unmounts.
    return () => {
      playRef.current = null
    }
  }, [playSound, playRef])

  return null
}

/**
 * The sound engine.
 *
 * This module is loaded on demand, and only after a person turns sound on.
 * Everything it imports, including the synthesis code, therefore stays out of
 * the first load for everyone else.
 *
 * @param props.playRef - Receives the play function while this is mounted.
 * @returns The provider and its bridge.
 */
export default function SoundEngine({ playRef }: { playRef: PlayFunctionRef }) {
  return (
    <SensoryUIProvider
      config={{
        enabled: true,
        volume: 0.25,
        theme: "aero",
        // The provider control and the feature pills stay silent. They are
        // the most used controls on the page, and one of them is draggable,
        // so a cue there would repeat as the selection crosses each segment.
        categories: {
          interaction: false,
          overlay: true,
          navigation: true,
          notification: true,
          hero: false,
        },
      }}
    >
      <PlayBridge playRef={playRef} />
    </SensoryUIProvider>
  )
}
