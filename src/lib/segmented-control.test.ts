import { describe, expect, test } from "bun:test"
import {
  MAX_DRAG_STRETCH,
  TRACK_PADDING_REM,
  clampPosition,
  getDragTension,
  getIndicatorGeometry,
  getSegmentWidth,
  positionFromDrag,
  resolveActiveIndex,
  snapToIndex,
} from "./segmented-control"

const OPTIONS = [
  { value: "chatgpt" },
  { value: "claude" },
  { value: "perplexity" },
] as const

const COUNT = OPTIONS.length
const WIDTH = `calc((100% - ${TRACK_PADDING_REM}rem) / ${COUNT})`

describe("resolveActiveIndex", () => {
  test("finds each option by value", () => {
    expect(resolveActiveIndex(OPTIONS, "chatgpt")).toBe(0)
    expect(resolveActiveIndex(OPTIONS, "claude")).toBe(1)
    expect(resolveActiveIndex(OPTIONS, "perplexity")).toBe(2)
  })

  test("falls back to the first segment for an unknown value", () => {
    // A -1 here would slide the indicator off the leading edge of the track.
    expect(resolveActiveIndex(OPTIONS, "gemini" as "chatgpt")).toBe(0)
  })

  test("falls back to the first segment for an empty options list", () => {
    expect(resolveActiveIndex([], "chatgpt")).toBe(0)
  })
})

describe("clampPosition", () => {
  test("holds a position inside the track", () => {
    expect(clampPosition(COUNT, -2)).toBe(0)
    expect(clampPosition(COUNT, 9)).toBe(2)
  })

  test("preserves fractions inside the range", () => {
    expect(clampPosition(COUNT, 1.25)).toBe(1.25)
  })

  test("resolves non-finite input to the first segment", () => {
    expect(clampPosition(COUNT, Number.NaN)).toBe(0)
    expect(clampPosition(COUNT, Number.POSITIVE_INFINITY)).toBe(0)
    expect(clampPosition(COUNT, Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe("getSegmentWidth", () => {
  test("splits the inner width evenly", () => {
    // 366px track, 8px total padding, 3 segments.
    expect(getSegmentWidth(366, 3, 8)).toBeCloseTo(119.333, 2)
  })

  test("never returns zero for an unlaid-out track", () => {
    // A zero width would make positionFromDrag divide by zero.
    expect(getSegmentWidth(0, 3, 8)).toBe(1)
    expect(getSegmentWidth(4, 3, 8)).toBe(1)
    expect(getSegmentWidth(Number.NaN, 3, 8)).toBe(1)
  })
})

describe("positionFromDrag", () => {
  test("converts pixels travelled into segments travelled", () => {
    expect(positionFromDrag(0, 100, 100, COUNT)).toBe(1)
    expect(positionFromDrag(0, 50, 100, COUNT)).toBe(0.5)
    expect(positionFromDrag(2, -100, 100, COUNT)).toBe(1)
  })

  test("offsets from the grab point rather than the pointer position", () => {
    // Starting on segment 1 and moving half a segment lands at 1.5, not 0.5.
    expect(positionFromDrag(1, 50, 100, COUNT)).toBe(1.5)
  })

  test("cannot be dragged past either end of the track", () => {
    expect(positionFromDrag(0, -400, 100, COUNT)).toBe(0)
    expect(positionFromDrag(2, 400, 100, COUNT)).toBe(2)
  })

  test("survives a malformed delta", () => {
    expect(positionFromDrag(1, Number.NaN, 100, COUNT)).toBe(1)
  })
})

describe("snapToIndex", () => {
  test("settles on the nearest segment", () => {
    expect(snapToIndex(0.49, COUNT)).toBe(0)
    expect(snapToIndex(0.51, COUNT)).toBe(1)
    expect(snapToIndex(1.5, COUNT)).toBe(2)
  })

  test("stays within the track", () => {
    expect(snapToIndex(-3, COUNT)).toBe(0)
    expect(snapToIndex(99, COUNT)).toBe(2)
  })

  test("always returns a whole index", () => {
    for (const position of [0, 0.3, 1.2, 1.9, 2]) {
      expect(Number.isInteger(snapToIndex(position, COUNT))).toBe(true)
    }
  })
})

describe("getDragTension", () => {
  test("is zero when parked on a segment", () => {
    expect(getDragTension(0)).toBe(0)
    expect(getDragTension(2)).toBe(0)
  })

  test("peaks exactly between two segments", () => {
    expect(getDragTension(0.5)).toBe(1)
    expect(getDragTension(1.5)).toBe(1)
  })

  test("rises with distance from the nearest segment", () => {
    expect(getDragTension(0.25)).toBeCloseTo(0.5, 5)
    expect(getDragTension(0.75)).toBeCloseTo(0.5, 5)
  })

  test("is zero for non-finite input", () => {
    expect(getDragTension(Number.NaN)).toBe(0)
  })
})

describe("getIndicatorGeometry", () => {
  test("sizes the indicator to exactly one segment of the inner width", () => {
    expect(getIndicatorGeometry(3, 0).width).toBe(WIDTH)
    expect(getIndicatorGeometry(5, 0).width).toBe(
      `calc((100% - ${TRACK_PADDING_REM}rem) / 5)`
    )
  })

  test("steps the indicator by whole segment widths at rest", () => {
    expect(getIndicatorGeometry(3, 0).transform).toBe("translateX(0%) scaleX(1)")
    expect(getIndicatorGeometry(3, 1).transform).toBe("translateX(100%) scaleX(1)")
    expect(getIndicatorGeometry(3, 2).transform).toBe("translateX(200%) scaleX(1)")
  })

  test("places the indicator at fractional positions mid-drag", () => {
    expect(getIndicatorGeometry(3, 1.5).transform).toBe("translateX(150%) scaleX(1)")
  })

  test("stretches along the track in proportion to tension", () => {
    expect(getIndicatorGeometry(3, 1.5, 1).transform).toBe(
      `translateX(150%) scaleX(${1 + MAX_DRAG_STRETCH})`
    )
    expect(getIndicatorGeometry(3, 1.25, 0.5).transform).toBe(
      `translateX(125%) scaleX(${1 + MAX_DRAG_STRETCH * 0.5})`
    )
  })

  test("never stretches at rest", () => {
    expect(getIndicatorGeometry(3, 1).transform).toContain("scaleX(1)")
  })

  test("clamps tension so the stretch cannot run away", () => {
    expect(getIndicatorGeometry(3, 1, 9).transform).toBe(
      `translateX(100%) scaleX(${1 + MAX_DRAG_STRETCH})`
    )
    expect(getIndicatorGeometry(3, 1, -5).transform).toBe("translateX(100%) scaleX(1)")
    expect(getIndicatorGeometry(3, 1, Number.NaN).transform).toBe(
      "translateX(100%) scaleX(1)"
    )
  })

  test("translates before scaling so the stretch never shifts the segment", () => {
    // CSS applies transform functions right to left, so scaleX must come last
    // in the string to be applied to the element first.
    const { transform } = getIndicatorGeometry(3, 2, 1)
    expect(transform.indexOf("translateX")).toBeLessThan(transform.indexOf("scaleX"))
  })

  test("never emits an invalid divisor", () => {
    const single = `calc((100% - ${TRACK_PADDING_REM}rem) / 1)`
    for (const count of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(getIndicatorGeometry(count, 0).width).toBe(single)
    }
  })

  test("clamps an out-of-range position inside the track", () => {
    expect(getIndicatorGeometry(3, 9).transform).toBe("translateX(200%) scaleX(1)")
    expect(getIndicatorGeometry(3, -4).transform).toBe("translateX(0%) scaleX(1)")
  })

  test("a single segment fills the track and never moves", () => {
    const only = getIndicatorGeometry(1, 0)
    expect(only.width).toBe(`calc((100% - ${TRACK_PADDING_REM}rem) / 1)`)
    expect(only.transform).toBe("translateX(0%) scaleX(1)")
  })
})

describe("a full drag gesture", () => {
  const SEGMENT_PX = 120

  test("dragging from the first to the last segment selects the last", () => {
    // Step 1: grab the indicator on segment 0.
    let position = positionFromDrag(0, 0, SEGMENT_PX, COUNT)
    expect(position).toBe(0)

    // Step 2: drag two full segments to the right.
    position = positionFromDrag(0, SEGMENT_PX * 2, SEGMENT_PX, COUNT)
    expect(position).toBe(2)

    // Step 3: release and settle.
    expect(snapToIndex(position, COUNT)).toBe(2)
    expect(OPTIONS[snapToIndex(position, COUNT)].value).toBe("perplexity")
  })

  test("a drag released short of halfway returns to where it started", () => {
    const position = positionFromDrag(1, SEGMENT_PX * 0.4, SEGMENT_PX, COUNT)
    expect(snapToIndex(position, COUNT)).toBe(1)
  })

  test("a drag released past halfway advances one segment", () => {
    const position = positionFromDrag(1, SEGMENT_PX * 0.6, SEGMENT_PX, COUNT)
    expect(snapToIndex(position, COUNT)).toBe(2)
  })

  test("overdragging past the end still settles on the last segment", () => {
    const position = positionFromDrag(0, SEGMENT_PX * 10, SEGMENT_PX, COUNT)
    expect(position).toBe(2)
    expect(snapToIndex(position, COUNT)).toBe(2)
    // Parked on a segment, so the stretch has fully relaxed.
    expect(getDragTension(position)).toBe(0)
  })

  test("the indicator is most stretched midway between segments", () => {
    const midway = positionFromDrag(0, SEGMENT_PX * 0.5, SEGMENT_PX, COUNT)
    const arrived = positionFromDrag(0, SEGMENT_PX, SEGMENT_PX, COUNT)
    expect(getDragTension(midway)).toBeGreaterThan(getDragTension(arrived))
    expect(getDragTension(arrived)).toBe(0)
  })
})
