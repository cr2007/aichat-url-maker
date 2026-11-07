import * as React from "react"
import { Check, Copy, TriangleAlert } from "lucide-react"
import { cn, copyText } from "@/lib/utils"

interface CopyButtonProps {
  value: string
  /** Hide the success line. The button itself then shows the result. */
  quiet?: boolean
  /** Show the word "Copy" next to the icon. An icon alone is not clear to everyone. */
  label?: boolean
  /** Turn the button off, for example while the link is too long to use. */
  disabled?: boolean
  className?: string
}

/**
 * A button that copies a text, and the line that reports the result.
 *
 * The button is off while the text is empty. It shows a tick after a copy,
 * and a warning when the copy fails. A failure is always in view.
 *
 * @param props.value - The text to copy.
 * @param props.quiet - Hide the success line from view. A screen reader still
 *   hears it.
 * @param props.label - Show "Copy", then "Copied", next to the icon.
 * @param props.disabled - Turn the button off.
 * @param props.className - Classes for the button.
 * @returns The button and its status line.
 */
function CopyButton({ value, quiet = false, label = false, disabled = false, className }: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = React.useCallback(async () => {
    // Step 1.1: clear the result of the previous attempt.
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setFailed(false)

    // Step 1.2: write to the clipboard. A failure must reach the person.
    // The clipboard is unavailable on an insecure origin, and a browser can
    // refuse the permission.
    if (await copyText(value)) {
      setIsCopied(true)
    } else {
      setFailed(true)
    }

    // Step 1.3: return to the resting state after a short time.
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false)
      setFailed(false)
    }, 2500)
  }, [value])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <>
      <button
        onClick={handleCopy}
        type="button"
        disabled={disabled || !value}
        // The name stays "Copy link" with or without the visible word, so a
        // narrow screen can show the icon only.
        aria-label="Copy link"
        className={cn(
          "flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md disabled:pointer-events-none disabled:opacity-50",
          label ? "px-3 text-[0.8125rem] font-medium" : "w-11",
          "transition-[color,background-color,opacity,scale] duration-150",
          "active:scale-[0.97] motion-reduce:active:scale-100",
          failed ? "text-destructive" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          "focus-ring",
          className
        )}
      >
        {isCopied ? (
          <Check className="size-4 animate-[check-pop_0.2s_ease-out]" />
        ) : failed ? (
          <TriangleAlert className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
        {label && <span aria-hidden="true">{isCopied ? "Copied" : "Copy"}</span>}
      </button>
      {/* The result is announced and stays in the layout, so it cannot cover
          the label above the field. A live region with no role: TalkBack
          stopped on an empty role="status" and said "status". */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "mt-1.5 basis-full text-right text-[0.8125rem]",
          failed ? "text-destructive" : "text-muted-foreground",
          (failed ? false : quiet || !isCopied) && "sr-only"
        )}
      >
        {isCopied ? "Link copied" : failed ? "Could not copy. Select the link and copy it." : ""}
      </p>
    </>
  )
}

interface CopyableInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  /** Turn the copy button off, for example while the link is too long to use. */
  copyDisabled?: boolean
}

/**
 * A read-only text field with a copy button.
 *
 * @param props.value - The text to show and to copy.
 * @param props.copyDisabled - Turn the copy button off.
 * @returns The field.
 */
function CopyableInput({ value, copyDisabled = false, className, ...props }: CopyableInputProps) {
  return (
    <div className="relative">
      <textarea
        value={value}
        readOnly
        rows={4}
        className={cn(
          // pr-14 clears the 44px copy button. At pr-10 the URL ran under it.
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 pr-14 text-sm pointer-coarse:text-base shadow-sm placeholder:text-muted-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-24",
          className,
        )}
        {...props}
      />
      <CopyButton value={value} disabled={copyDisabled} className="absolute right-1 top-1" />
    </div>
  )
}

// memo: the page renders this field from a deferred link. The urgent render
// of a key press then skips it, and the letter paints first.
const MemoCopyableInput = React.memo(CopyableInput)

export { MemoCopyableInput as CopyableInput, CopyButton }
