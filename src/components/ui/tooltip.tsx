import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip as TooltipPrimitive } from "radix-ui"

/**
 * How long a finger stays down before the tooltip opens, in milliseconds. The
 * value is the Android long press timeout.
 */
const LONG_PRESS_MS = 400

/** How far the finger may move before the press counts as a swipe, in pixels. */
const LONG_PRESS_SLOP_PX = 10

/** How long the tooltip stays after the finger lifts, in milliseconds. */
const LINGER_MS = 1500

/**
 * How long a hovering pen may send no move before the tooltip closes, in
 * milliseconds. A hovering pen moves about every 16ms, even when held still.
 */
const PEN_IDLE_MS = 300

/** The media query for a phone or a tablet: the main pointer is a finger. */
const COARSE_POINTER = "(pointer: coarse)"

/**
 * Subscribes to a change of the main pointer.
 *
 * @param onChange - Runs when the main pointer changes.
 * @returns The function that stops the subscription.
 */
function subscribeToPointer(onChange: () => void) {
  const query = window.matchMedia(COARSE_POINTER)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** The handlers that a trigger needs for the long press. */
type TouchHandlers = Pick<
  React.ComponentProps<"button">,
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "onPointerLeave"
  | "onBlur"
  | "onClickCapture"
  | "onContextMenu"
>

const TouchHandlersContext = React.createContext<TouchHandlers>({})

/**
 * Sets the delay for every tooltip below it.
 *
 * On a screen where the main pointer is a finger, a mouse or a pen that hovers
 * is rare and on purpose. The tooltip then opens with no delay.
 *
 * @param props.delayDuration - The wait before a tooltip opens, in milliseconds.
 * @returns The provider.
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  // The server has no screen, so the first render assumes a fine pointer.
  const isCoarse = React.useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia(COARSE_POINTER).matches,
    () => false
  )
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={isCoarse ? 0 : delayDuration}
      {...props}
    />
  )
}

/**
 * The root of one tooltip.
 *
 * A hover with a mouse or a pen, and the keyboard, work as Radix defines them.
 * A finger or a pen tip on the screen differs. A tap must not open the
 * tooltip, because a tap focuses the trigger and Radix opens on focus. A press
 * of 400ms opens it above the finger, and the click that follows the press
 * does nothing. On a touch device a hovering pen opens the tooltip, and the
 * tooltip closes when the pen stops sending moves.
 *
 * @param props - The props of the Radix tooltip root.
 * @returns The tooltip root.
 */
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [open, setOpen] = React.useState(false)
  const isDirectRef = React.useRef(false)
  const heldRef = React.useRef(false)
  // True from a pen tap until the pen leaves the trigger. A mouse that clicks
  // a trigger also gets no tooltip until it leaves.
  const penTappedRef = React.useRef(false)
  const startRef = React.useRef({ x: 0, y: 0 })
  const pressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lingerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = React.useCallback(() => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current)
    pressTimerRef.current = null
    lingerTimerRef.current = null
  }, [])

  React.useEffect(() => clearTimers, [clearTimers])

  const handleOpenChange = React.useCallback((next: boolean) => {
    // Step 1.1: a tap focuses the trigger after the finger lifts, and Radix
    // opens on focus. Drop that open. The long press opens the tooltip itself.
    if (next && isDirectRef.current) return
    setOpen(next)
  }, [])

  const handlers = React.useMemo<TouchHandlers>(
    () => ({
      onPointerDown: (event) => {
        // Step 2.1: remember the input. A finger and a pen tip take the long
        // press. A mouse button does not.
        isDirectRef.current = event.pointerType !== "mouse"
        penTappedRef.current = event.pointerType === "pen"
        heldRef.current = false
        clearTimers()
        if (!isDirectRef.current) return

        // Step 2.2: open the tooltip if the finger stays down.
        startRef.current = { x: event.clientX, y: event.clientY }
        pressTimerRef.current = setTimeout(() => {
          heldRef.current = true
          setOpen(true)
        }, LONG_PRESS_MS)
      },
      onPointerMove: (event) => {
        // Step 3.1: a hover after a touch must open the tooltip. A hover has
        // no button down. A pen tip that moves on the screen is not a hover.
        if (event.buttons === 0) isDirectRef.current = false

        // Step 3.2: a swipe is not a press.
        const { x, y } = startRef.current
        if (
          pressTimerRef.current &&
          Math.hypot(event.clientX - x, event.clientY - y) > LONG_PRESS_SLOP_PX
        ) {
          clearTimers()
        }

        // Step 3.3: Chromium on Android drops the hover exit of a pen
        // (crbug.com/715114), so no leave event comes when the pen leaves the
        // screen. Silence means the pen has left. The pen can also come back to
        // the same trigger with no leave event, so this rule also opens.
        if (event.pointerType === "pen" && event.buttons === 0 && window.matchMedia(COARSE_POINTER).matches) {
          if (!penTappedRef.current) setOpen(true)
          if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current)
          lingerTimerRef.current = setTimeout(() => setOpen(false), PEN_IDLE_MS)
        }
      },
      onPointerUp: () => {
        // Step 4.1: cancel a press that was too short. Keep the tooltip in view
        // for a moment after a long press, so the finger does not cover it.
        clearTimers()
        if (heldRef.current) {
          lingerTimerRef.current = setTimeout(() => setOpen(false), LINGER_MS)
        }
      },
      onPointerLeave: () => {
        penTappedRef.current = false
      },
      onPointerCancel: () => {
        clearTimers()
        if (heldRef.current) setOpen(false)
      },
      // A keyboard user who tabs back to the trigger gets the tooltip again.
      onBlur: () => {
        isDirectRef.current = false
      },
      onClickCapture: (event) => {
        // Step 5.1: the click after a long press must not toggle the control.
        if (!heldRef.current) return
        heldRef.current = false
        event.preventDefault()
        event.stopPropagation()
      },
      onContextMenu: (event) => {
        // Step 6.1: Android shows a menu after a long press. Not here.
        if (isDirectRef.current) event.preventDefault()
      },
    }),
    [clearTimers]
  )

  return (
    <TouchHandlersContext.Provider value={handlers}>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </TouchHandlersContext.Provider>
  )
}

/**
 * The element that opens the tooltip.
 *
 * @param props - The props of the Radix tooltip trigger.
 * @returns The trigger.
 */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const handlers = React.useContext(TouchHandlersContext)
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...handlers} {...props} />
}

/**
 * The tooltip box. It fades in and leaves at once.
 *
 * @param props.sideOffset - The gap to the trigger, in pixels.
 * @param props.collisionPadding - The gap to the screen edge, in pixels. A long
 *   description on a phone then does not touch the edge.
 * @returns The tooltip box.
 */
function TooltipContent({
  className,
  sideOffset = 0,
  collisionPadding = 12,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    // The box goes into the main landmark, not at the end of the body. A screen
    // reader then finds it inside a region. The server has no document, and the
    // portal renders nothing until the client mounts, so there is no mismatch.
    <TooltipPrimitive.Portal
      container={typeof document === "undefined" ? undefined : document.getElementById("app")}
    >
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          // A tooltip fades in and leaves at once. It is hover help that a person
          // sees many times, so it has no zoom, no slide and no exit.
          "z-50 w-fit max-w-64 animate-in select-none rounded-md bg-foreground px-3 py-1.5 text-[0.8125rem] text-pretty text-background duration-125 ease-out fade-in-0",
          // A tooltip that opens while another one is open or just closed has no
          // animation. A person who sweeps across the pills then sees the
          // descriptions at once.
          "data-[state=instant-open]:animate-none",
          // A closed tooltip has no animation either. Without this rule the
          // enter animation starts again on close, and Radix keeps the old
          // tooltip in the page until that animation ends.
          "data-[state=closed]:animate-none",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
