import { useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { CopyButton } from "@/components/copyable-input"
import { cn } from "@/lib/utils"

interface LinkPreviewProps {
  /** The generated URL. Empty when there is no prompt. */
  url: string
  /** Classes for the row, such as the widths where it shows. */
  className?: string
}

/**
 * The link on one line, with a copy button. It lives in the pinned dock on a
 * phone.
 *
 * A tap grows the line into a panel with the full link, as the Feedback
 * button on emilkowal.ski does. The panel is always in the page, above the
 * line. A clip-path shows only its bottom edge, which covers the line
 * exactly, and the open state reveals the rest upward. The dock keeps its
 * size.
 *
 * @param props.url - The generated URL.
 * @param props.className - Classes for the row.
 * @returns The row.
 */
function LinkPreview({ url, className }: LinkPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
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
    <div id="url-preview" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <div className="relative min-w-0 flex-1">
        <button
          ref={toggleRef}
          id="url-preview-toggle"
          type="button"
          disabled={!hasUrl}
          aria-expanded={open}
          aria-controls="url-full-panel"
          onClick={() => setOpen(true)}
          className="flex min-h-11 w-full items-center gap-2 rounded-md border border-border bg-secondary px-3 text-left text-[0.8125rem] text-muted-foreground focus-ring transition-[color,background-color,scale] duration-150 hover:text-foreground active:scale-[0.97] disabled:active:scale-100 motion-reduce:active:scale-100"
        >
          <span className="sr-only">Generated URL: </span>
          <span className="min-w-0 flex-1 truncate">
            {hasUrl ? url.replace(/^https:\/\//, "") : "Type a prompt to make a link"}
          </span>
          {hasUrl && <ChevronDown aria-hidden="true" className="size-4 shrink-0 rotate-180" />}
        </button>
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
            // line. On open it is visible at once, so the focus can move into
            // it in the next frame.
            "invisible [clip-path:inset(calc(100%-2.75rem)_0_0_0_round_0.375rem)] [transition:clip-path_250ms_var(--ease-out),visibility_0s_linear_250ms]",
            "data-[open=true]:visible data-[open=true]:[clip-path:inset(0_0_0_0_round_0.375rem)] data-[open=true]:[transition:clip-path_250ms_var(--ease-out),visibility_0s]"
          )}
        >
          {/* The box grows first. The text fades in behind it. */}
          <div className="opacity-0 transition-opacity duration-150 ease-out group-data-[open=true]:opacity-100 group-data-[open=true]:delay-75">
            <p className="px-3 pt-2.5 text-[0.8125rem] text-muted-foreground">Generated URL</p>
            <p
              id="url-full"
              className="max-h-48 overflow-y-auto px-3 pt-1 pb-2 text-[0.8125rem] break-all text-foreground select-text"
            >
              {url}
            </p>
          </div>
          <button
            ref={closeRef}
            id="url-full-close"
            type="button"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2 border-t border-dashed border-border px-3 text-left text-[0.8125rem] text-muted-foreground focus-ring hover:text-foreground"
          >
            <span className="flex-1">Hide the full link</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          </button>
        </div>
      </div>
      <CopyButton value={url} quiet className="border border-border bg-secondary" />
    </div>
  )
}

export { LinkPreview }
