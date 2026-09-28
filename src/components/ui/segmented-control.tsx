import { useCallback, useRef, useState } from "react"
import type * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"

import { cn } from "@/lib/utils"
import {
  TRACK_PADDING_REM,
  getDragTension,
  getIndicatorGeometry,
  getSegmentWidth,
  positionFromDrag,
  resolveActiveIndex,
  snapToIndex,
} from "@/lib/segmented-control"

/**
 * The pointer movement that starts a drag, in pixels.
 *
 * A smaller movement stays a tap. An unsteady finger therefore selects the
 * segment that it touched.
 */
const DRAG_THRESHOLD_PX = 3

/**
 * The track.
 *
 * `touch-pan-y` gives horizontal movement to the drag gesture. The page can
 * still scroll vertically.
 */
const TRACK_CLASS =
  "segment-track relative grid w-full touch-pan-y rounded-xl border border-border bg-segment-track p-1"

/**
 * The indicator that shows the selected segment.
 *
 * `inset-y-1` agrees with the `p-1` class on the track. The indicator
 * therefore fills the height of a segment and needs no height value.
 *
 * The `.segment-indicator` rules in `index.css` set the surface, the
 * transitions and the glass effect. Those rules need `backdrop-filter` and an
 * inset shadow, which Tailwind classes cannot supply.
 */
const INDICATOR_CLASS =
  "segment-indicator pointer-events-none absolute inset-y-1 left-1 origin-center rounded-lg ring-1 ring-border/60"

/**
 * One segment.
 *
 * Below 376px the icon moves above the label. At that width three segments
 * cannot hold an icon and a label on one line. The control stacks the content
 * and does not truncate it, so the label stays readable at large text sizes.
 */
const SEGMENT_CLASS = cn(
  "segment-item relative z-10 flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5",
  "min-[376px]:flex-row min-[376px]:gap-2 sm:px-3",
  // The label colour lives in `.segment-item` in index.css. A Tailwind colour
  // utility here would outrank the drag rules, because the utilities layer is
  // above the components layer.
  "text-[0.9375rem] font-medium select-none",
  "transition-[color,transform,scale] duration-150",
  "active:scale-[0.97] motion-reduce:active:scale-100",
  "focus-ring",
  "[&_svg]:size-[1.125rem] [&_svg]:shrink-0"
)

/** One choice in a {@link SegmentedControl}. */
export interface SegmentedControlOption<T extends string> {
  /** The value that `onValueChange` receives for this segment. */
  value: T
  /** The visible text. This text is also the accessible name. */
  label: string
  /** An optional icon. The icon is decorative. The label gives the name. */
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  /** The accessible name of the group. The visible label is a separate element. */
  label: string
  /** The choices. The control shows them as segments of equal width. */
  options: readonly SegmentedControlOption<T>[]
  /** The value of the selected option. */
  value: T
  /** Receives the new value. The control never sends an empty value. */
  onValueChange: (value: T) => void
  /** Additional classes for the track. */
  className?: string
  /** The `id` of the track. */
  id?: string
}

/** The state of a pointer interaction that is in progress. */
interface DragState {
  /** The tracked pointer. A second touch cannot control the drag. */
  pointerId: number
  /** The x coordinate at the start of the drag. */
  startX: number
  /** The position of the indicator at the start of the drag. */
  startPosition: number
  /** The width of one segment, in pixels. The code measures this once. */
  segmentWidth: number
  /** The current position. The release handler reads this value. */
  position: number
  /** True after the movement passes {@link DRAG_THRESHOLD_PX}. */
  moved: boolean
}

/**
 * A control that selects one option from a small set.
 *
 * The control has one track and segments of equal width. An indicator moves
 * to the selected segment.
 *
 * A person can tap a segment or drag the indicator. The drag works with a
 * mouse, a pen and a touch screen. During the press the indicator gets a
 * glass surface and becomes longer. The indicator moves to the nearest
 * segment at the end of the drag, and the glass surface goes away.
 *
 * The control changes three defaults of the Radix toggle group:
 * - The track gets `role="radiogroup"`. Radix gives it `role="group"`. The
 *   items already have `role="radio"` and `aria-checked`.
 * - Selection follows the arrow keys. Radix only moves the focus.
 * - Focus does not select while a pointer is down. A person can therefore
 *   press one segment and drag to a different segment.
 *
 * @param props - See {@link SegmentedControlProps}.
 * @returns The segmented control.
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   label="Provider"
 *   options={[{ value: "chatgpt", label: "ChatGPT" }]}
 *   value={provider}
 *   onValueChange={setProvider}
 * />
 * ```
 */
function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
  id,
}: SegmentedControlProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)

  /** The position during a drag. The value is null at rest. */
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  /** True while a pointer is down. This state applies the glass surface. */
  const [isPressed, setIsPressed] = useState(false)

  const activeIndex = resolveActiveIndex(options, value)
  const position = dragPosition ?? activeIndex
  const tension = dragPosition === null ? 0 : getDragTension(dragPosition)
  const indicatorStyle = getIndicatorGeometry(options.length, position, tension)

  // The segment that a release selects. The value is null when there is no
  // drag. The CSS uses it to show the result before the release.
  const candidateIndex =
    dragPosition === null ? null : snapToIndex(dragPosition, options.length)

  /**
   * Starts a pointer interaction.
   *
   * @param event - The pointer down event on the track.
   */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current
      // Step 1.1: ignore a secondary mouse button and a missing track.
      if (!track || (event.pointerType === "mouse" && event.button !== 0)) return

      // Step 1.2: measure one segment. The move handler then does no layout
      // reads.
      const rootFontSize =
        Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const segmentWidth = getSegmentWidth(
        track.getBoundingClientRect().width,
        options.length,
        TRACK_PADDING_REM * rootFontSize
      )

      // Step 1.3: record the start of the drag. Clear the click flag.
      // Do not capture the pointer here. A capture sends the click event to
      // the track, and the segment then does not get it.
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startPosition: activeIndex,
        segmentWidth,
        position: activeIndex,
        moved: false,
      }
      suppressClickRef.current = false
      setIsPressed(true)
    },
    [activeIndex, options.length]
  )

  /**
   * Moves the indicator with the pointer.
   *
   * @param event - The pointer move event on the track.
   */
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      // Step 1.1: use only the pointer that started the drag.
      if (!drag || drag.pointerId !== event.pointerId) return

      // Step 1.2: do not move the indicator until the gesture is a drag.
      const deltaX = event.clientX - drag.startX
      if (!drag.moved && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return

      // Step 1.3: capture the pointer at the start of the drag. The drag then
      // continues off the track. A tap does not get here, so its click event
      // goes to the segment.
      if (!drag.moved) {
        drag.moved = true
        trackRef.current?.setPointerCapture(event.pointerId)
      }

      // Step 1.4: change the movement into a position and show it.
      drag.position = positionFromDrag(
        drag.startPosition,
        deltaX,
        drag.segmentWidth,
        options.length
      )
      setDragPosition(drag.position)
    },
    [options.length]
  )

  /**
   * Ends a pointer interaction.
   *
   * @param event - The pointer up event or the pointer cancel event.
   */
  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      // Step 1.1: use only the pointer that started the drag.
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null

      // Step 1.2: release the pointer and remove the glass surface.
      const track = trackRef.current
      if (track?.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId)
      }
      setIsPressed(false)

      // Step 1.3: let the click handler of the segment process a tap.
      if (!drag.moved) {
        setDragPosition(null)
        return
      }

      // Step 1.4: select the nearest segment after a drag. Block the click
      // that follows, because it would select the segment under the pointer.
      suppressClickRef.current = true
      const index = snapToIndex(drag.position, options.length)
      setDragPosition(null)
      onValueChange(options[index].value)
    },
    [onValueChange, options]
  )

  /**
   * Blocks the click that follows a drag.
   *
   * @param event - The click event. The track gets it in the capture phase.
   */
  const handleClickCapture = useCallback((event: React.MouseEvent) => {
    // Step 1.1: let a normal tap continue.
    if (!suppressClickRef.current) return

    // Step 1.2: stop the click before it gets to a segment.
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }, [])

  /**
   * Selects the segment that has the focus. This applies to the keyboard only.
   *
   * @param next - The value of the segment that got the focus.
   */
  const handleSegmentFocus = useCallback(
    (next: T) => {
      // Step 1.1: do nothing during a pointer interaction. The tap or the
      // drag selects the segment.
      if (dragRef.current) return

      // Step 1.2: the focus came from the keyboard. Select the segment.
      onValueChange(next)
    },
    [onValueChange]
  )

  return (
    <ToggleGroupPrimitive.Root
      ref={trackRef}
      id={id}
      type="single"
      role="radiogroup"
      aria-label={label}
      value={value}
      // Step 1.1: Radix sends "" when a person clicks the selected item
      // again. This control always keeps one selection. Ignore that value.
      onValueChange={(next) => next && onValueChange(next as T)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClickCapture={handleClickCapture}
      data-dragging={dragPosition !== null}
      className={cn(TRACK_CLASS, className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        data-active={isPressed}
        data-dragging={dragPosition !== null}
        className={INDICATOR_CLASS}
        style={indicatorStyle}
      />
      {options.map((option, index) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          onFocus={() => handleSegmentFocus(option.value)}
          data-candidate={candidateIndex === index}
          className={SEGMENT_CLASS}
        >
          {option.icon}
          <span>{option.label}</span>
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

export { SegmentedControl }
