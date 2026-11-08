import { memo, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { ChevronDown, Link, Share } from "lucide-react"
import { CopyButton } from "@/components/copyable-input"
import { COARSE_POINTER, cn, subscribeNever } from "@/lib/utils"

interface LinkPreviewProps {
  /** The generated URL. Empty when there is no prompt. */
  url: string
  /** True while the URL is too long to share. Copy and Share are then off. */
  tooLong?: boolean
  /** Classes for the row, such as the widths where it shows. */
  className?: string
}

/** The scheme at the start of the link. The readable line leaves it out. */
const SCHEME = /^https:\/\//

/** A plus sign, which URLSearchParams writes for a space. */
const PLUS = /\+/g

/** A prompt whose first letter is in a script that runs from the right. */
const RTL_PROMPT = /[?&]q=\P{L}*[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u


/**
 * True on a phone or a tablet with the system share sheet. The query reads
 * the main pointer, which is the device type, not the screen width. The
 * share sheet needs a secure origin, so a page on plain http gets Copy only.
 *
 * @returns True if the browser can open the share sheet.
 */
function canShare() {
  return typeof navigator.share === "function" && window.matchMedia(COARSE_POINTER).matches
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
  return decodeURIComponent(url.replace(SCHEME, "").replace(PLUS, " "))
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
 * The link in one box in the phone dock, with Copy and Share fixed in the
 * bottom right corner. Closed, it shows one line. A tap grows the box upward
 * to the full link; a second tap, Escape or a tap outside closes it.
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
  const readable = readableUrl(url)
  const rtlPrompt = RTL_PROMPT.test(readable)

  // The closed chevron stops before the buttons. Their width changes with
  // Share and with the narrow layout, so it is measured, not guessed.
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
        // The text has one width in both states, so its first line never
        // wraps again. Closed, the buttons and the chevron cover its end.
        // A width that changed at the end of the close made the text and
        // the chevron jump. The placeholder has no chevron, so it stops
        // before the buttons.
        className={cn(
          "relative flex min-h-11 w-full items-start gap-2 py-3 pl-3 pr-9 text-left text-[0.8125rem] leading-5 text-muted-foreground focus-ring transition-colors duration-150 hover:text-foreground group-data-[open=true]:text-foreground",
          !hasUrl && "pr-[calc(var(--actions-width,0px)+0.75rem)]"
        )}
      >
        <Link aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {hasUrl && <span className="sr-only">{open ? "Hide the full link: " : "Show the full link: "}</span>}
        {/* One line closed, the full link open. The button room is padding, so
            it moves with the height. The close uses ease-in-out, so it does not
            rush. The scrollbar is hidden; a touch still scrolls a long link. */}
        <span
          id="url-full"
          className="relative block h-5 min-w-0 flex-1 overflow-hidden wrap-anywhere [interpolate-size:allow-keywords] [scrollbar-width:none] transition-[height,padding-bottom] duration-250 ease-in-out group-data-[open=true]:h-auto group-data-[open=true]:max-h-60 group-data-[open=true]:overflow-y-auto group-data-[open=true]:pb-11 group-data-[open=true]:animate-[link-settle_250ms_var(--ease-out)]"
        >
          {/* A right-to-left prompt on one line shows its end on the left, under
              the visible part. So its first line ends where the closed line
              ends, in both states, and its first words show. */}
          {rtlPrompt && <span aria-hidden="true" className="float-right h-5 w-(--actions-width)" />}
          {hasUrl ? readable : "Type a prompt to make a link."}
        </span>
        {/* A mask in the colour of the box covers the end of the first line,
            and its fade says that there is more. It stays under the buttons
            and keeps time with the chevron. */}
        {hasUrl && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-0 h-5 w-9 bg-secondary -translate-x-(--actions-width) transition-[translate] duration-150 ease-in-out delay-150 motion-reduce:delay-0 group-data-[open=true]:translate-x-0 group-data-[open=true]:delay-0"
          >
            <span className="absolute top-0 right-full h-5 w-10 bg-linear-to-l from-secondary transition-opacity duration-150 group-data-[open=true]:opacity-0" />
            {/* The text to the right is covered too, up to the buttons, so the
                slide reads as one edge. The box clips this in the corner. */}
            <span className="absolute top-0 left-full h-5 w-(--actions-width) bg-secondary" />
          </span>
        )}
      </button>
      {/* Up while closed: the box opens upward. Down while open. On open the
          chevron runs along the button row behind the buttons, then rises out
          of them to the corner. On close it drops behind them, then runs back
          out. A top in percent follows the height of the box while the box
          grows. It comes before the buttons, so they paint over it. */}
      {hasUrl && (
        <span
          id="url-preview-chevron"
          aria-hidden="true"
          className="pointer-events-none absolute top-[calc(100%-2rem)] right-3 flex h-5 items-center text-muted-foreground -translate-x-(--actions-width) [transition:translate_150ms_ease-in-out_150ms,top_250ms_ease-in-out] motion-reduce:transition-none group-data-[open=true]:top-3 group-data-[open=true]:translate-x-0 group-data-[open=true]:text-foreground group-data-[open=true]:[transition:translate_150ms_ease-in-out,top_250ms_ease-in-out_50ms]"
        >
          <ChevronDown className="size-4 rotate-180 transition-[rotate] duration-250 ease-out group-data-[open=true]:rotate-0" />
        </span>
      )}
      {/* The buttons never move: the bottom right corner in both states. */}
      <div ref={actionsRef} className="absolute right-0 bottom-0 flex bg-secondary">
        <LinkActions url={url} share={share} disabled={tooLong} />
      </div>
    </div>
  )
}

// memo: the page renders this box from a deferred link. The urgent render of
// a key press then skips it, and the letter paints first.
const MemoLinkPreview = memo(LinkPreview)

export { MemoLinkPreview as LinkPreview }
