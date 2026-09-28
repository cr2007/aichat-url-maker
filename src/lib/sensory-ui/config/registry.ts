import type { SoundRole } from "./sound-roles";
import type { SoundSource } from "./engine";
// LOCAL CHANGE: upstream imports all nine packs here. `packRegistry` then
// references every one of them, so a bundler cannot drop the eight this app
// does not use, and all of `packs.ts` reaches the bundle. Only the pack in
// use is imported.
import { aeroPack, type SoundPackName } from "../sounds/packs";

// Re-export so consumers can import SoundPackName from this module
export type { SoundPackName };

/**
 * A complete mapping of every SoundRole to a SoundSource for one pack.
 * SoundSource is either a SoundSynthesizer function (preferred) or a
 * base64 data URI / public-path string (for custom user overrides).
 */
export type SoundPack = Record<SoundRole, SoundSource>;

// ---------------------------------------------------------------------------
// Pack registry - maps pack name → full SoundPack
// ---------------------------------------------------------------------------

/**
 * All built-in sound packs, keyed by their `SoundPackName`.
 *
 * The engine uses this via `config.theme` to resolve a role to
 * its audio source before playback.
 */
// LOCAL CHANGE: one entry, not nine. `resolveRole` falls back to `aero` for
// any unknown name, so a config that names another pack still plays.
export const packRegistry: Partial<Record<SoundPackName, SoundPack>> & {
  aero: SoundPack
} = {
  aero: aeroPack,
};

/**
 * Default sound pack name.
 * "aero" is the default - balanced, pleasant, professional.
 */
export const DEFAULT_PACK: SoundPackName = "aero";

/**
 * Backwards-compat alias: the default pack's role → source mapping.
 */
export const roleRegistry: SoundPack = aeroPack;

