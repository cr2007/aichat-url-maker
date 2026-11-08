import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The base classes for a toggle. The hover shadow sits below the toggle and
 * changes at once, so it is not in the transition list. Each use styles its
 * own on state.
 */
const TOGGLE_CLASS =
  "inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-md bg-transparent px-2 text-sm font-medium whitespace-nowrap hover:bg-muted hover:shadow-[0_2px_8px_-3px] hover:shadow-primary/45 active:scale-[0.97] active:shadow-none motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-ring transition-[color,background-color,scale]"

/** The props of a {@link Toggle}: a button, plus its state. */
interface ToggleProps extends Omit<React.ComponentProps<"button">, "onChange"> {
  /** True while the toggle is on. */
  pressed: boolean
  /** Receives the next state on a press. */
  onPressedChange: (pressed: boolean) => void
}

/**
 * A two-state button. A plain `button` with `aria-pressed` is the whole
 * pattern, so it needs no library. `data-state` mirrors the state for styles.
 *
 * @param props - See {@link ToggleProps}.
 * @returns The toggle.
 */
function Toggle({ pressed, onPressedChange, className, onClick, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onPressedChange(!pressed)
      }}
      className={cn(TOGGLE_CLASS, className)}
      {...props}
    />
  )
}

export { Toggle }
