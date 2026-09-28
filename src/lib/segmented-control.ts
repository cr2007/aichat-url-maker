/**
 * Layout calculations for the segmented control.
 *
 * All functions here are pure. The component keeps no layout maths, so the
 * indicator position and the drag gesture have unit tests.
 *
 * A position is a fractional segment index. 0 is the first segment. A value
 * of 1.5 is halfway between the second segment and the third segment.
 */

/**
 * The total horizontal padding of the track, in rem.
 *
 * This value must agree with the `p-1` class on the track in
 * `segmented-control.tsx`. Tailwind `p-1` is 0.25rem on each side.
 */
export const TRACK_PADDING_REM = 0.5

/**
 * The maximum stretch of the indicator during a drag, as a scale factor.
 *
 * The indicator becomes longer when a person pulls it away from a segment.
 * The value is small, so the effect stays subtle.
 */
export const MAX_DRAG_STRETCH = 0.06

/** The inline styles that position the indicator. */
export type IndicatorGeometry = {
  /** The CSS width of one segment. */
  width: string
  /** The CSS transform that moves and stretches the indicator. */
  transform: string
}

/**
 * Makes a segment count safe to use as a divisor.
 *
 * @param segmentCount - The count to correct.
 * @returns A whole number. The minimum is 1.
 */
function normaliseCount(segmentCount: number): number {
  // Step 1.1: reject a non-finite count. Math.max does not reject NaN.
  if (!Number.isFinite(segmentCount)) return 1

  // Step 1.2: make the count a whole number of 1 or more.
  return Math.max(1, Math.floor(segmentCount))
}

/**
 * Limits a position to the range of the real segments.
 *
 * @param segmentCount - The number of segments in the track.
 * @param position - The position to limit. Fractions are kept.
 * @returns A position from 0 to `segmentCount - 1`. Non-finite input gives 0.
 */
export function clampPosition(segmentCount: number, position: number): number {
  // Step 1.1: use the first segment for a non-finite position.
  if (!Number.isFinite(position)) return 0

  // Step 1.2: keep the position inside the track.
  return Math.min(Math.max(0, position), normaliseCount(segmentCount) - 1)
}

/**
 * Finds the index of the selected option.
 *
 * An unknown value gives 0. This keeps the indicator on the track. An index
 * of -1 would move the indicator off the start of the track.
 *
 * @param options - The options, in display order.
 * @param value - The value of the selected option.
 * @returns The index of the selected segment. The minimum is 0.
 */
export function resolveActiveIndex<T extends string>(
  options: readonly { value: T }[],
  value: T
): number {
  // Step 1.1: find the option that has this value.
  const index = options.findIndex((option) => option.value === value)

  // Step 1.2: use the first segment if there is no match.
  return index < 0 ? 0 : index
}

/**
 * Calculates the width of one segment, in pixels.
 *
 * @param trackWidth - The full width of the track, in pixels.
 * @param segmentCount - The number of segments in the track.
 * @param trackPaddingPx - The total horizontal padding, in pixels.
 * @returns The width of one segment. The minimum is 1.
 */
export function getSegmentWidth(
  trackWidth: number,
  segmentCount: number,
  trackPaddingPx: number
): number {
  // Step 1.1: remove the padding to get the usable width.
  const inner = trackWidth - trackPaddingPx

  // Step 1.2: return 1 if the browser did not lay out the track yet. A result
  // of 0 would make positionFromDrag divide by zero.
  if (!Number.isFinite(inner) || inner <= 0) return 1

  // Step 1.3: divide the usable width between the segments.
  return inner / normaliseCount(segmentCount)
}

/**
 * Changes pointer movement into a position.
 *
 * The result is an offset from the start of the drag. The indicator therefore
 * keeps the same relation to the pointer during the drag.
 *
 * @param startPosition - The position of the indicator at the start.
 * @param deltaX - The pointer movement along the track, in pixels.
 * @param segmentWidth - The width of one segment, in pixels.
 * @param segmentCount - The number of segments in the track.
 * @returns The new position, limited to the track.
 */
export function positionFromDrag(
  startPosition: number,
  deltaX: number,
  segmentWidth: number,
  segmentCount: number
): number {
  // Step 1.1: ignore a non-finite movement.
  const travelled = Number.isFinite(deltaX) ? deltaX : 0

  // Step 1.2: change pixels into segments.
  const moved = travelled / (segmentWidth || 1)

  // Step 1.3: add the movement to the start position.
  return clampPosition(segmentCount, startPosition + moved)
}

/**
 * Selects the segment for a released drag.
 *
 * @param position - The position at the end of the drag.
 * @param segmentCount - The number of segments in the track.
 * @returns The index of the nearest segment.
 */
export function snapToIndex(position: number, segmentCount: number): number {
  // Step 1.1: limit the position, then round it, then limit it again. A value
  // at the end of the track can round to one more than the last index.
  return clampPosition(segmentCount, Math.round(clampPosition(segmentCount, position)))
}

/**
 * Calculates how far a position is from its nearest segment.
 *
 * The component uses this value to stretch the indicator.
 *
 * @param position - A fractional segment index.
 * @returns 0 on a segment. 1 halfway between two segments.
 */
export function getDragTension(position: number): number {
  // Step 1.1: a non-finite position has no tension.
  if (!Number.isFinite(position)) return 0

  // Step 1.2: the distance to the nearest segment is 0 to 0.5. Multiply by 2
  // to get a range of 0 to 1.
  return Math.abs(position - Math.round(position)) * 2
}

/**
 * Calculates the width and the transform of the indicator.
 *
 * All segments have the same width. The indicator is therefore one segment
 * wide, and it moves in steps of its own width. The browser recalculates both
 * values when the track changes size. No code measures the elements.
 *
 * @param segmentCount - The number of segments in the track. A value below 1,
 * or a non-finite value, becomes 1. The `calc()` cannot divide by zero.
 * @param position - A fractional segment index. A whole number puts the
 * indicator on a segment.
 * @param tension - The tension from {@link getDragTension}. Omit this for an
 * indicator at rest.
 * @returns The inline `width` and `transform` styles.
 */
export function getIndicatorGeometry(
  segmentCount: number,
  position: number,
  tension = 0
): IndicatorGeometry {
  // Step 1.1: correct the count and limit the position.
  const count = normaliseCount(segmentCount)
  const offset = clampPosition(count, position)

  // Step 1.2: change the tension into a scale factor.
  const pull = Number.isFinite(tension) ? Math.min(Math.max(0, tension), 1) : 0
  const scaleX = 1 + pull * MAX_DRAG_STRETCH

  // Step 1.3: put translateX before scaleX. CSS applies transform functions
  // from right to left, so the browser scales the indicator first. The
  // stretch then cannot move the indicator off its segment.
  return {
    width: `calc((100% - ${TRACK_PADDING_REM}rem) / ${count})`,
    transform: `translateX(${offset * 100}%) scaleX(${scaleX})`,
  }
}
