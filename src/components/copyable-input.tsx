import * as React from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyableInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  onCopy?: () => void
}

function CopyableInput({ value, onCopy, className, ...props }: CopyableInputProps) {
  const [isCopied, setIsCopied] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setIsCopied(true)
      onCopy?.()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setIsCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }, [value, onCopy])

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
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 pr-10 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none min-h-24",
          className,
        )}
        {...props}
      />
      <button
        onClick={handleCopy}
        type="button"
        aria-label="Copy to clipboard"
        className={cn(
          "absolute right-2 top-2 rounded-md p-1.5 transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        )}
      >
        {isCopied ? (
          <Check className="size-4 animate-[check-pop_0.3s_ease-out]" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
      {isCopied && (
        <div
          role="status"
          aria-live="polite"
          className="absolute -top-8 right-0 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md whitespace-nowrap"
        >
          Copied!
        </div>
      )}
    </div>
  )
}

export { CopyableInput }
