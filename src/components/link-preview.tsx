import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { ChevronDown, Link, Share } from "lucide-react"
import { CopyButton } from "@/components/copyable-input"
import { cn } from "@/lib/utils"

interface LinkPreviewProps {
  /** The generated URL. Empty when there is no prompt. */
  url: string
  /** True while the URL is too long to share. Copy and Share are then off. */
  tooLong?: boolean
  /** Classes for the row, such as the widths where it shows. */
  className?: string
}

/** No subscription: the share support of a browser does not change. */
const subscribeNever = () => () => {}

/**
 * True on a phone or a tablet with the system share sheet. The query reads
 * the main pointer, which is the device type, not the screen width. The
 * share sheet needs a secure origin, so a page on plain http gets Copy only.
 *
 * @returns True if the browser can open the share sheet.
 */
function canShare() {
  return typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches
}

/**
 * Makes a URL readable: no scheme, spaces for plus signs, and the letters of
 * any script instead of percent codes. Copy and Open still use the real URL.
 *
 * @param url - The generated URL.
 * @returns The text for the line.
 */
function readableUrl(url: string) {
  // Step 1.1: URLSearchParams writes a space as "+" and a real "+" as "%2B",
  // so the swap must come before the decode.
  return decodeURIComponent(url.replace(/^https:\/\//, "").replace(/\+/g, " "))
}

/**
 * The look of a button inside the bar: no own box, a divider on its left.
 * Below a column of 22rem the word goes and the icon stays, so the link line
 * keeps room to be read.
 */
const BAR_BUTTON =
  "h-11 rounded-none border-l border-border bg-transparent @max-[22rem]:w-11 @max-[22rem]:px-0 @max-[22rem]:[&>span]:hidden"

/**
 * The buttons that act on the link: Copy everywhere, and Share on a phone or
 * a tablet that has the share sheet.
 *
 * @param props.url - The link.
 * @param props.share - True to add the Share button.
 * @param props.disabled - Turn the buttons off.
 * @returns The buttons.
 */
function LinkActions({ url, share, disabled }: { url: string; share: boolean; disabled: boolean }) {
  return (
    <>
      <CopyButton value={url} quiet label disabled={disabled} className={BAR_BUTTON} />
      {share && (
        <button
          type="button"
          disabled={disabled || !url}
          // The person can close the sheet. That rejects the promise, and it is not an error.
          onClick={() => void navigator.share({ url }).catch(() => {})}
          aria-label="Share link"
          className={cn(
            "flex shrink-0 items-center justify-center gap-1.5 px-3 text-[0.8125rem] font-medium text-muted-foreground",
            "transition-[color,background-color,opacity,scale] duration-150 hover:text-foreground hover:bg-muted active:scale-[0.97] motion-reduce:active:scale-100",
            "focus-ring disabled:pointer-events-none disabled:opacity-50",
            BAR_BUTTON
          )}
        >
          <Share aria-hidden="true" className="size-4" />
          <span aria-hidden="true">Share</span>
        </button>
      )}
    </>
  )
}

/**
 * The link in one box, with its Copy and Share buttons in the bottom right
 * corner. It lives in the pinned dock on a phone.
 *
 * Closed, the box shows the first line of the link, and the text stops
 * before the buttons. A tap on the text opens the box: the text uses the full
 * width, and the box grows upward to the natural height of the link, because
 * the dock is pinned to the bottom. The buttons never move. A second tap
 * closes it. One element changes height, as the Feedback button on
 * emilkowal.ski does. The motion is short and plain, so it reads as the
 * expected result of the tap, not as an effect.
 *
 * @param props.url - The generated URL.
 * @param props.tooLong - True while the URL is too long to share.
 * @param props.className - Classes for the box.
 * @returns The box.
 */
function LinkPreview({ url, tooLong = false, className }: LinkPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  // The server has no navigator, so the first render shows Copy only.
  const share = useSyncExternalStore(subscribeNever, canShare, () => false)
  const hasUrl = url !== ""
  // A cleared prompt also closes the box. Without this the box opened by
  // itself at the next key.
  if (!hasUrl && expanded) setExpanded(false)
  const open = expanded && hasUrl

  // The closed text stops before the buttons. Their width changes with Share
  // and with the narrow layout, so it is measured, not guessed.
  useLayoutEffect(() => {
    const actions = actionsRef.current
    if (!actions) return
    const observer = new ResizeObserver(() =>
      boxRef.current?.style.setProperty("--actions-width", `${actions.offsetWidth}px`)
    )
    observer.observe(actions)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={boxRef}
      id="url-preview"
      data-open={open}
      onKeyDown={(event) => {
        if (event.key === "Escape") setExpanded(false)
      }}
      // A tap outside closes the box, so it does not cover the page for long.
      // The focus stays where the person put it.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false)
      }}
      className={cn("group relative overflow-hidden rounded-md border border-border bg-secondary", className)}
    >
      <button
        id="url-preview-toggle"
        type="button"
        disabled={!hasUrl}
        aria-expanded={open}
        aria-controls="url-full"
        onClick={() => setExpanded(!open)}
        className="flex min-h-11 w-full items-start gap-2 py-3 pl-3 pr-[calc(var(--actions-width,0px)+0.75rem)] text-left text-[0.8125rem] leading-5 text-muted-foreground focus-ring transition-[color,background-color] duration-150 hover:text-foreground group-data-[open=true]:pr-3 group-data-[open=true]:text-foreground"
      >
        <Link aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {hasUrl && <span className="sr-only">{open ? "Hide the full link: " : "Show the full link: "}</span>}
        {/* One line while closed. While open, the natural height of the link,
            plus room at the bottom for the buttons. The open takes 250ms and
            the close 200ms, on the app ease-out curve. */}
        <span
          id="url-full"
          className="relative block h-5 min-w-0 flex-1 overflow-hidden wrap-anywhere [interpolate-size:allow-keywords] transition-[height] duration-200 ease-out group-data-[open=true]:h-auto group-data-[open=true]:max-h-60 group-data-[open=true]:overflow-y-auto group-data-[open=true]:pb-11 group-data-[open=true]:duration-250"
        >
          {hasUrl ? readableUrl(url) : "Type a prompt to make a link."}
          {/* The fade at the end of the first line says that there is more. */}
          {hasUrl && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-0 h-5 w-10 bg-linear-to-l from-secondary transition-opacity duration-150 group-data-[open=true]:opacity-0"
            />
          )}
        </span>
        {/* Up while closed: the box opens upward. Down while open. */}
        {hasUrl && (
          <ChevronDown
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 rotate-180 transition-transform duration-250 ease-out group-data-[open=true]:rotate-0"
          />
        )}
      </button>
      {/* The buttons never move: the bottom right corner in both states. */}
      <div ref={actionsRef} className="absolute right-0 bottom-0 flex bg-secondary">
        <LinkActions url={url} share={share} disabled={tooLong} />
      </div>
    </div>
  )
}

export { LinkPreview }
