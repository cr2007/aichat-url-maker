import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"

/**
 * The base classes for a toggle and a toggle group item. The hover shadow sits
 * below the toggle and changes at once, so it is not in the transition list.
 */
const TOGGLE_CLASS =
  "inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-md bg-transparent px-2 text-sm font-medium whitespace-nowrap hover:bg-muted hover:shadow-[0_2px_8px_-3px] hover:shadow-primary/45 active:scale-[0.97] active:shadow-none motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-ring transition-[color,background-color,scale]"

/**
 * A two-state button from Radix. `ToggleGroupItem` uses the same classes.
 *
 * @param props.className - Classes that override the base.
 * @returns The toggle.
 */
function Toggle({ className, ...props }: React.ComponentProps<typeof TogglePrimitive.Root>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(TOGGLE_CLASS, className)} {...props} />
}

/**
 * A group of toggle buttons. The items keep their own corners: the feature
 * pills wrap onto more than one row, and a joined bar cannot wrap.
 *
 * @param props.className - Classes for the group.
 * @returns The group.
 */
function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("flex w-fit items-center rounded-md", className)}
      {...props}
    />
  )
}

/**
 * One toggle button in a {@link ToggleGroup}.
 *
 * @param props.className - Classes that override the base.
 * @returns The item.
 */
function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(TOGGLE_CLASS, "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10", className)}
      {...props}
    />
  )
}

export { Toggle, ToggleGroup, ToggleGroupItem }
