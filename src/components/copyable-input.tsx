import * as React from "react"
import { Check, Copy, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSound } from "@/lib/use-sound"

interface CopyableInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  onCopy?: () => void
}

function CopyableInput({ value, onCopy, className, ...props }: CopyableInputProps) {
  const [isCopied, setIsCopied] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  // Both cues repeat a visible state: the icon and the message below change
  // at the same moment.
  const playCopied = useSound("notification.success")
  const playFailed = useSound("notification.error")
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = React.useCallback(async () => {
    // Step 1.1: clear the result of the previous attempt.
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setFailed(false)

    // Step 1.2: write to the clipboard. A rejection must reach the person.
    // The clipboard is unavailable on an insecure origin, and a browser can
    // refuse the permission.
    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      onCopy?.()
      playCopied()
    } catch {
      setFailed(true)
      playFailed()
    }

    // Step 1.3: return to the resting state after a short time.
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false)
      setFailed(false)
    }, 2500)
  }, [value, onCopy, playCopied, playFailed])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <textarea
        value={value}
        readOnly
        rows={4}
        className={cn(
          // pr-14 clears the 44px copy button. At pr-10 the URL ran under it.
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 pr-14 text-base shadow-sm placeholder:text-muted-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none min-h-24",
          className,
        )}
        {...props}
      />
      <button
        onClick={handleCopy}
        type="button"
        aria-label="Copy link"
        className={cn(
          "absolute right-1 top-1 grid size-11 place-items-center rounded-md",
          "transition-[color,background-color,transform,scale] duration-150",
          "active:scale-[0.97] motion-reduce:active:scale-100",
          failed ? "text-destructive" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          "focus-ring",
        )}
      >
        {isCopied ? (
          <Check className="size-4 animate-[check-pop_0.3s_ease-out]" />
        ) : failed ? (
          <TriangleAlert className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
      {/* The result is announced and stays in the layout, so it cannot cover
          the label above the field. */}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "mt-1.5 text-right text-[0.8125rem]",
          failed ? "text-destructive" : "text-muted-foreground",
          !isCopied && !failed && "sr-only"
        )}
      >
        {isCopied ? "Link copied" : failed ? "Could not copy. Select the link and copy it." : ""}
      </p>
    </div>
  )
}

export { CopyableInput }
