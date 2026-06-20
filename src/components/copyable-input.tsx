"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyableInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  onCopy?: () => void
}

const CopyableInput = React.forwardRef<HTMLTextAreaElement, CopyableInputProps>(
  ({ value, onCopy, className, ...props }, ref) => {
    const [isCopied, setIsCopied] = React.useState(false)
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Merge the passed ref with our internal ref
    React.useImperativeHandle(ref, () => textareaRef.current!)

    const handleCopy = React.useCallback(async () => {
      try {
        // Try using the modern Clipboard API
        await navigator.clipboard.writeText(value)
        setIsCopied(true)
        onCopy?.()

        // Clear existing timeout if any
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Auto-dismiss tooltip after 1.5 seconds
        timeoutRef.current = setTimeout(() => {
          setIsCopied(false)
        }, 1500)
      } catch (err) {
        // Fallback for older browsers: use the textarea trick
        const textarea = document.createElement("textarea")
        textarea.value = value
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)

        try {
          textarea.select()
          // @ts-ignore document.execCommand is deprecated but needed for older browser fallback
          document.execCommand("copy")
          setIsCopied(true)
          onCopy?.()
        } catch {
          console.error("Failed to copy to clipboard")
        } finally {
          document.body.removeChild(textarea)
        }
      }
    }, [value, onCopy])

    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])

    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          readOnly
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
            "pr-10 min-h-24", // Add padding for the copy button
            className,
          )}
          rows={4}
          {...props}
        />

        {/* Copy button positioned inside the textarea */}
        <button
          onClick={handleCopy}
          type="button"
          aria-label="Copy to clipboard"
          className={cn(
            "absolute right-2 top-2 rounded-md p-1.5 transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {isCopied ? (
            <Check className="size-4 animate-[check-pop_0.3s_ease-out]" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>

        {/* Tooltip that appears on copy */}
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
  },
)

CopyableInput.displayName = "CopyableInput"

export { CopyableInput }
