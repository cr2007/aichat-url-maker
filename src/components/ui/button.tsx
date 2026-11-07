import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The classes for the one button style: the filled primary. Hover is one
 * opaque step toward the page text colour, so the label gains contrast. A
 * press scales to 0.97 (HIG: always include a press state).
 */
const BUTTON_CLASS = [
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 has-[>svg]:px-3 text-sm font-medium",
  "bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary),var(--foreground)_14%)]",
  // Tailwind v4 compiles `scale-*` to the `scale` property, so it is named.
  "transition-[background-color,opacity,scale] duration-150",
  "active:scale-[0.97] motion-reduce:active:scale-100",
  "disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  "focus-ring",
].join(" ")

/**
 * A button in the one app style. Extra classes merge over the base.
 *
 * @param props.className - Classes that override the base.
 * @returns The button.
 */
function Button({ className, ...props }: React.ComponentProps<"button">) {
  // data-slot: the forced-colors rule in index.css draws a border from it.
  return <button data-slot="button" className={cn(BUTTON_CLASS, className)} {...props} />
}

export { Button }
