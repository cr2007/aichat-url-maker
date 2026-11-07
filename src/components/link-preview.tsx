import { useRef, useState, useSyncExternalStore } from "react"
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
 * The buttons that act on the link: Copy everywhere, and Share on a phone or
 * a tablet that has the share sheet.
 *
 * @param props.url - The link.
 * @param props.share - True to add the Share button.
 * @param props.disabled - Turn the buttons off.
 * @returns The buttons.
 */
function LinkActions({ url, share, disabled }: { url: string; share: boolean; disabled: boolean }) {
  const look = "border border-border bg-secondary"
  const copy = <CopyButton value={url} quiet label disabled={disabled} className={look} />
  if (!share) return copy
  return (
    <>
      {copy}
      <button
        type="button"
        disabled={disabled || !url}
        // The person can close the sheet. That rejects the promise, and it is not an error.
        onClick={() => void navigator.share({ url }).catch(() => {})}
        className={cn(
          "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-medium text-muted-foreground",
          "transition-[color,background-color,opacity,scale] duration-150 hover:text-foreground hover:bg-muted active:scale-[0.97] motion-reduce:active:scale-100",
          "focus-ring disabled:pointer-events-none disabled:opacity-50",
          look
        )}
      >
        <Share aria-hidden="true" className="size-4" />
        Share
      </button>
    </>
  )
}

/**
 * The link on one line, with its Copy and Share buttons. It lives in the pinned
 * dock on a phone.
 *
 * A tap grows the row into a panel with the full link, as the Feedback
 * button on emilkowal.ski does. The panel is always in the page and covers
 * the whole row. A clip-path shows only its bottom edge, which matches the
 * row exactly, and the open state reveals the rest upward. The dock keeps
 * its size.
 *
 * @param props.url - The generated URL.
 * @param props.tooLong - True while the URL is too long to share.
 * @param props.className - Classes for the row.
 * @returns The row.
 */
function LinkPreview({ url, tooLong = false, className }: LinkPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // The server has no navigator, so the first render shows Copy.
  const share = useSyncExternalStore(subscribeNever, canShare, () => false)
  const hasUrl = url !== ""
  // A cleared prompt also closes the panel. Without this the panel opened by
  // itself at the next key.
  if (!hasUrl && expanded) setExpanded(false)
  const open = expanded && hasUrl

  /**
   * Opens or closes the panel, and moves the focus with it.
   *
   * @param next - True to open the panel.
   */
  const setOpen = (next: boolean) => {
    // Step 1.1: change the state. The panel leaves `inert` in the render.
    setExpanded(next)

    // Step 1.2: move the focus in the next frame, after the render. Without
    // `preventScroll` the focus scrolls the page on every open and close.
    requestAnimationFrame(() => (next ? closeRef : toggleRef).current?.focus({ preventScroll: true }))
  }

  return (
    <div id="url-preview" className={cn("relative", className)}>
      {/* The row under the panel leaves the tab order while the panel is open. */}
      <div className="flex flex-wrap items-center gap-1.5" inert={open}>
        <button
          ref={toggleRef}
          id="url-preview-toggle"
          type="button"
          disabled={!hasUrl}
          aria-expanded={open}
          aria-controls="url-full-panel"
          onClick={() => setOpen(true)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-left text-[0.8125rem] text-muted-foreground focus-ring transition-[color,background-color,scale] duration-150 hover:text-foreground active:scale-[0.97] disabled:active:scale-100 motion-reduce:active:scale-100"
        >
          <Link aria-hidden="true" className="size-4 shrink-0" />
          {hasUrl && <span className="sr-only">Show the full link: </span>}
          <span className="min-w-0 flex-1 truncate">
            {hasUrl ? readableUrl(url) : "Type a prompt to make a link."}
          </span>
          {hasUrl && <ChevronDown aria-hidden="true" className="size-4 shrink-0 rotate-180" />}
        </button>
        <LinkActions url={url} share={share} disabled={tooLong} />
      </div>
      <div
        id="url-full-panel"
        data-open={open}
        inert={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false)
        }}
        // A tap outside closes the panel, so it does not cover the pills.
        // The focus stays where the person put it.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false)
        }}
        className={cn(
          "group absolute inset-x-0 bottom-0 flex flex-col rounded-md border border-border bg-secondary shadow-lg",
          // On close the panel stays visible until the clip is back on the
          // row. On open it is visible at once, so the focus can move into it
          // in the next frame.
          "invisible [clip-path:inset(calc(100%-2.75rem)_0_0_0_round_0.375rem)] [transition:clip-path_250ms_var(--ease-out),visibility_0s_linear_250ms]",
          "data-[open=true]:visible data-[open=true]:[clip-path:inset(0_0_0_0_round_0.375rem)] data-[open=true]:[transition:clip-path_250ms_var(--ease-out),visibility_0s]"
        )}
      >
        {/* The box grows first. The text fades in behind it. */}
        <div className="opacity-0 transition-opacity duration-150 ease-out group-data-[open=true]:opacity-100 group-data-[open=true]:delay-75">
          <p className="px-3 pt-2.5 text-[0.8125rem] text-muted-foreground">Your link</p>
          <p
            id="url-full"
            className="max-h-48 overflow-y-auto px-3 pt-1 pb-2 text-[0.8125rem] break-all text-foreground select-text"
          >
            {url}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-border">
          <button
            ref={closeRef}
            id="url-full-close"
            type="button"
            onClick={() => setOpen(false)}
            className="flex min-h-11 flex-1 items-center gap-2 px-3 text-left text-[0.8125rem] text-muted-foreground focus-ring hover:text-foreground"
          >
            <span className="flex-1">Hide the full link</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          </button>
          <LinkActions url={url} share={share} disabled={tooLong} />
        </div>
      </div>
    </div>
  )
}

export { LinkPreview }
