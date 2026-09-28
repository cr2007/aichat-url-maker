import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The classes for a toggle.
 *
 * The hover shadow is below the toggle, in the accent colour. Do not use a
 * symmetric shadow. A symmetric shadow makes a halo around the toggle.
 *
 * The `!` on the hover shadow classes sets `!important`. `ToggleGroupItem` in
 * `toggle-group.tsx` applies `data-[spacing=0]:shadow-none` at all times. That
 * class is later in the stylesheet and has the same specificity, so it removes
 * the shadow without the `!`.
 */
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:shadow-[0_2px_8px_-3px]! hover:shadow-primary/45! active:scale-[0.98] active:shadow-none motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-ring transition-[color,background-color,box-shadow,transform,scale] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Two-state pressable button (Radix Toggle), used as the building block for `ToggleGroupItem` pills. */
function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
