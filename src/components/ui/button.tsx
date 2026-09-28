import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The classes for a button.
 *
 * Hover does not fade the button. A fade dims the label with the background,
 * and the button then looks disabled, especially in dark mode. Each variant
 * changes its own fill instead, and a filled variant also lifts.
 *
 * A lift is a shadow below the button, in the colour of that button. Do not
 * use a symmetric glow, and do not use a colour from a different part of the
 * palette. Such a shadow makes a halo around the button.
 *
 * Every variant has a press state. HIG buttons.md > Best practices: "Always
 * include a press state for a custom button."
 *
 * The focus indicator is `--focus-ring` with an offset, not `--ring`.
 * `--ring` is the accent colour, so it disappears on a filled button.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    // `scale` is named because Tailwind v4 compiles `scale-*` to the
    // independent `scale` property, which `transform` does not cover.
    "transition-[background-color,box-shadow,transform,scale] duration-150",
    "active:scale-[0.98] active:shadow-none motion-reduce:active:scale-100",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "focus-ring",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_12px_-4px] hover:shadow-primary/50",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 hover:shadow-[0_4px_12px_-4px] hover:shadow-destructive/50 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Styled button. Renders as a `<Slot>` instead of `<button>` when `asChild` is set. */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
