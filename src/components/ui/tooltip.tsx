import * as React from "react"
import { COARSE_POINTER } from "@/lib/utils"

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

/** How long a mouse rests on a trigger before the tooltip opens, on a desktop. */
const HOVER_DELAY_MS = 200

/**
 * After a tooltip closes, the next one in this time opens at once and with no
 * animation. A person who sweeps across the pills then reads each one.
 */
const SKIP_DELAY_MS = 300

/**
 * The main pointer query, made once. A pen hover sends a move about every
 * 16ms, so a new query on each move was wasted work. The prerender has no
 * window.
 */
const coarsePointer = typeof window === "undefined" ? null : window.matchMedia(COARSE_POINTER)

// One tooltip is open at a time, in the whole page: its anchor and its close.
let openTooltip: { anchor: string; close: () => void } | null = null
let lastClosedAt = -Infinity

/** The handlers that the trigger gets. */
type TriggerHandlers = Pick<
  React.ComponentProps<"button">,
  | "onPointerEnter"
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "onPointerLeave"
  | "onFocus"
  | "onBlur"
  | "onClickCapture"
  | "onContextMenu"
>

/**
 * A tooltip for one trigger, with no library. The box is a manual popover in
 * the top layer, and CSS anchor positioning puts it above the trigger (see
 * `.tooltip` in index.css).
 *
 * A mouse that rests on the trigger, a hovering pen and the keyboard open it.
 * On a desktop the mouse waits 200ms; where the main pointer is coarse, a
 * mouse or a pen that hovers is on purpose, so it opens at once. A finger or a
 * pen tip on the screen differs. A tap must not open the tooltip, because a
 * tap focuses the trigger. A press of 400ms opens it above the finger, and the
 * click that follows the press does nothing. On a touch device a hovering pen
 * opens the tooltip, and it closes when the pen stops sending moves.
 *
 * @param content - The text of the tooltip. A screen reader gets it from the
 *   trigger's own description, so the box is for sight only.
 * @returns `triggerProps` to spread on the trigger button, and `tooltip`, the
 *   box to render next to it while it is open.
 */
function useTooltip(content: React.ReactNode) {
  // Step 1.1: "instant" opens with no animation, inside the skip delay.
  const [open, setOpen] = React.useState<false | "delayed" | "instant">(false)
  const openRef = React.useRef(false)
  const anchor = `--tip-${React.useId().replace(/[^\w-]/g, "")}`
  const isDirectRef = React.useRef(false)
  const heldRef = React.useRef(false)
  // True from a pen tap or a mouse click until the pointer leaves the trigger.
  const pressedRef = React.useRef(false)
  const startRef = React.useRef({ x: 0, y: 0 })
  const pressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lingerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = React.useCallback(() => {
    for (const timer of [pressTimerRef, lingerTimerRef, hoverTimerRef]) {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const close = React.useCallback(() => {
    if (!openRef.current) return
    openRef.current = false
    setOpen(false)
    if (openTooltip?.anchor === anchor) openTooltip = null
    lastClosedAt = performance.now()
  }, [anchor])

  const show = React.useCallback(() => {
    if (openRef.current) return
    // Step 2.1: a tooltip that replaces another one, or follows it closely,
    // opens at once. Close the other one first, so two never show.
    const other = openTooltip
    other?.close()
    const instant = other !== null || performance.now() - lastClosedAt < SKIP_DELAY_MS
    openRef.current = true
    setOpen(instant ? "instant" : "delayed")
    openTooltip = { anchor, close }
  }, [anchor, close])

  React.useEffect(() => () => {
    clearTimers()
    close()
  }, [clearTimers, close])

  // Step 3.1: Escape closes an open tooltip.
  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, close])

  const handlers = React.useMemo<TriggerHandlers>(
    () => ({
      onPointerEnter: (event) => {
        // Step 4.1: a mouse or a pen hovers over the trigger. A hover has no
        // button down. A finger never hovers.
        if (event.pointerType === "touch" || event.buttons !== 0 || pressedRef.current) return
        const quick = coarsePointer?.matches || openTooltip !== null || performance.now() - lastClosedAt < SKIP_DELAY_MS
        if (quick) return show()
        hoverTimerRef.current = setTimeout(show, HOVER_DELAY_MS)
      },
      onPointerDown: (event) => {
        // Step 5.1: remember the input. A finger and a pen tip take the long
        // press. A mouse button closes the tooltip until the mouse leaves.
        isDirectRef.current = event.pointerType !== "mouse"
        pressedRef.current = event.pointerType !== "touch"
        heldRef.current = false
        clearTimers()
        close()
        if (!isDirectRef.current) return

        // Step 5.2: open the tooltip if the finger stays down.
        startRef.current = { x: event.clientX, y: event.clientY }
        pressTimerRef.current = setTimeout(() => {
          heldRef.current = true
          show()
        }, LONG_PRESS_MS)
      },
      onPointerMove: (event) => {
        // Step 6.1: a hover after a touch must open the tooltip. A hover has
        // no button down. A pen tip that moves on the screen is not a hover.
        if (event.buttons === 0) isDirectRef.current = false

        // Step 6.2: a swipe is not a press.
        const { x, y } = startRef.current
        if (
          pressTimerRef.current &&
          Math.hypot(event.clientX - x, event.clientY - y) > LONG_PRESS_SLOP_PX
        ) {
          clearTimers()
        }

        // Step 6.3: Chromium on Android drops the hover exit of a pen
        // (crbug.com/715114), so no leave event comes when the pen leaves the
        // screen. Silence means the pen has left. The pen can also come back to
        // the same trigger with no leave event, so this rule also opens.
        if (event.pointerType === "pen" && event.buttons === 0 && coarsePointer?.matches) {
          if (!pressedRef.current) show()
          if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current)
          lingerTimerRef.current = setTimeout(close, PEN_IDLE_MS)
        }
      },
      onPointerUp: () => {
        // Step 7.1: cancel a press that was too short. Keep the tooltip in view
        // for a moment after a long press, so the finger does not cover it.
        clearTimers()
        if (heldRef.current) lingerTimerRef.current = setTimeout(close, LINGER_MS)
      },
      onPointerLeave: (event) => {
        pressedRef.current = false
        // Step 8.1: a hover that leaves closes the tooltip at once. A finger
        // lifts and leaves, so it keeps the linger. A pen on a touch device
        // has the idle timer instead.
        if (event.pointerType === "mouse" || (event.pointerType === "pen" && !lingerTimerRef.current)) {
          clearTimers()
          close()
        }
      },
      onPointerCancel: () => {
        clearTimers()
        if (heldRef.current) close()
      },
      onFocus: () => {
        // Step 9.1: the keyboard opens the tooltip. A tap or a click also
        // focuses the trigger, and that focus opens nothing.
        if (!isDirectRef.current && !pressedRef.current) show()
      },
      // A keyboard user who tabs back to the trigger gets the tooltip again.
      onBlur: () => {
        isDirectRef.current = false
        close()
      },
      onClickCapture: (event) => {
        // Step 10.1: the click after a long press must not toggle the control.
        if (!heldRef.current) return
        heldRef.current = false
        event.preventDefault()
        event.stopPropagation()
      },
      onContextMenu: (event) => {
        // Step 11.1: Android shows a menu after a long press. Not here.
        if (isDirectRef.current) event.preventDefault()
      },
    }),
    [clearTimers, close, show]
  )

  return {
    triggerProps: { ...handlers, style: { anchorName: anchor } as React.CSSProperties },
    tooltip: open && (
        <div
          // A manual popover is in the top layer, so no parent clips it.
          ref={(node) => node?.showPopover?.()}
          popover="manual"
          role="tooltip"
          data-slot="tooltip-content"
          data-state={open === "instant" ? "instant-open" : "delayed-open"}
          style={{ "--tip-anchor": anchor } as React.CSSProperties}
          className={
            // A tooltip fades in and leaves at once. It is hover help that a
            // person sees many times, so it has no zoom, no slide and no exit.
            // Inside the skip delay it has no animation at all.
            "tooltip w-fit max-w-64 animate-[tooltip-in_125ms_var(--ease-out)] select-none rounded-md bg-foreground px-3 py-1.5 text-[0.8125rem] text-pretty text-background data-[state=instant-open]:animate-none"
          }
        >
          {content}
        </div>
      ),
  }
}

export { useTooltip }
