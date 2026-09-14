import { Suspense, useState, useCallback } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ModeToggle } from "@/components/mode-toggle"
import { ExternalLink, MessageCircleDashed, ChevronDown, Copy } from "lucide-react"
import { ThemeProvider } from "@/components/theme-provider"
import { PROVIDERS, getProvider, isUrlTooLong, resolveOpenAction } from "@/lib/providers"
import type { ProviderId, Feature } from "@/lib/providers"
import { cn } from "@/lib/utils"

const PILL_CLASS =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-all duration-150 text-sm font-medium"

/**
 * Root page: prompt entry, provider/feature selection, and the generated
 * URL output. Owns all form state; URL generation itself is delegated to
 * each provider's `buildURL` (see `@/lib/providers`).
 */
function PageContent() {
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("chatgpt")
  const [selectedFeature, setSelectedFeature] = useState<Feature>("")
  const [temporaryChat, setTemporaryChat] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  // The URL a popup was blocked for, so the notice clears itself once the
  // prompt, provider, feature, or temporary-chat setting changes and the
  // next "Open" click becomes a fresh attempt. `null` means no block.
  const [blockedURL, setBlockedURL] = useState<string | null>(null)

  const provider = getProvider(selectedProvider)
  const url = prompt.trim()
    ? provider.buildURL(prompt, selectedFeature, temporaryChat)
    : ""
  const isTooLong = isUrlTooLong(url)
  const wordCount = prompt.split(/\s+/).filter(Boolean).length
  const popupBlocked = blockedURL !== null && blockedURL === url

  /**
   * Opens the generated URL in a new tab, or falls back to copying the
   * prompt and opening the provider's homepage when the URL is too long.
   */
  const handleOpenInProvider = useCallback(() => {
    if (!url) return

    // Step 1: decide whether to open the URL directly, or copy the prompt
    // and open the bare provider homepage instead.
    const { targetURL, shouldCopyPrompt } = resolveOpenAction(url, provider)

    // Step 2: copy the prompt first so it's ready to paste once the tab loads.
    if (shouldCopyPrompt) navigator.clipboard.writeText(prompt).catch(() => {})

    // Step 3: open the tab and remember the URL if the browser blocked it.
    const opened = window.open(targetURL, "_blank")
    setBlockedURL(opened ? null : url)
  }, [url, prompt, provider])

  /** Toggles a feature pill on, or off again if it was already selected. */
  const handleFeatureChange = useCallback((value: string) => {
    setSelectedFeature((prev) => (prev === (value as Feature) ? "" : (value as Feature)))
  }, [])

  /**
   * Switches the active provider, clearing feature/temporary-chat selections
   * the new provider doesn't support.
   */
  const handleProviderChange = useCallback((value: string) => {
    if (!value) return

    // Step 1: resolve the newly selected provider's config.
    const next = getProvider(value as ProviderId)

    // Step 2: drop any selections the new provider can't express.
    if (!next.supportsFeatures) setSelectedFeature("")
    if (!next.supportsTemporaryChat) setTemporaryChat(false)

    // Step 3: commit the provider switch.
    setSelectedProvider(value as ProviderId)
  }, [])

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="relative text-center pt-2">
          <div className="absolute right-0 top-0">
            <ModeToggle />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight pb-0.5 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            AI Prompt URL Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Prefill a prompt for ChatGPT, Claude, or Perplexity and share it as a link.
          </p>
        </div>

        {/* Provider selector */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Provider
          </span>
          <ToggleGroup
            type="single"
            value={selectedProvider}
            onValueChange={handleProviderChange}
            className="w-full justify-center flex-wrap gap-1.5 bg-transparent p-0"
          >
            {PROVIDERS.map((p) => (
              <ToggleGroupItem
                key={p.id}
                value={p.id}
                className={PILL_CLASS}
                aria-label={p.name}
              >
                {p.icon}
                {p.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Prompt */}
        <div className="space-y-1.5">
          <label
            htmlFor="prompt-input"
            className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
          >
            Prompt
          </label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Enter your ${provider.name} prompt here...`}
            className="w-full px-3 py-2.5 rounded-md bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150 resize-y"
            rows={4}
          />
          {prompt.length > 0 && (
            <p
              className={cn(
                "text-[11px] text-right",
                isTooLong
                  ? "text-amber-600 dark:text-amber-500 font-medium"
                  : "text-muted-foreground"
              )}
            >
              {prompt.length} characters · {wordCount} words
              {isTooLong && (
                <>
                  <br />
                  Too long for a link. Will copy and open instead.
                </>
              )}
            </p>
          )}
        </div>

        {/* Features */}
        {provider.supportsFeatures && (
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
              Features
            </span>
            <ToggleGroup
              type="single"
              value={selectedFeature}
              onValueChange={handleFeatureChange}
              className="w-full justify-center flex-wrap gap-1.5 bg-transparent p-0"
            >
              {provider.features.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className={PILL_CLASS}
                  aria-label={option.label}
                >
                  {option.icon}
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}

        {/* Temporary chat */}
        {provider.supportsTemporaryChat && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant={temporaryChat ? "default" : "outline"}
              size="sm"
              onClick={() => setTemporaryChat((prev) => !prev)}
              className="transition-all duration-150"
              aria-pressed={temporaryChat}
            >
              {provider.temporaryChatIcon ?? <MessageCircleDashed className="w-4 h-4" />}
              Temporary Chat
            </Button>
          </div>
        )}

        {/* Generated URL */}
        <div className="space-y-1.5">
          <label
            htmlFor="generated-url"
            className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
          >
            Generated URL
          </label>
          {url ? (
            <div className="animate-fade-in">
              <CopyableInput id="generated-url" value={url} />
            </div>
          ) : (
            <div className="w-full px-3 py-2.5 rounded-md bg-secondary text-muted-foreground border border-border text-sm">
              Enter a prompt above to generate a URL
            </div>
          )}
        </div>

        {/* Open button */}
        {url && (
          <div className="space-y-1.5 animate-fade-in">
            <Button
              onClick={handleOpenInProvider}
              className="w-full h-auto py-2.5 font-medium rounded-md transition-all duration-150 hover:shadow-[0_0_16px]! hover:shadow-chart-2/50! dark:hover:shadow-white/50! active:scale-[0.99]"
            >
              {isTooLong ? (
                <Copy className="w-4 h-4" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {isTooLong ? `Copy Prompt & Open ${provider.name}` : `Open in ${provider.name}`}
            </Button>
            {isTooLong && (
              <p className="text-xs text-center text-muted-foreground">
                This prompt is too long to fit in a link. We'll copy it to
                your clipboard and open {provider.name} so you can paste it in.
              </p>
            )}
            {popupBlocked && (
              <p role="alert" className="text-xs text-center text-destructive">
                Your browser blocked the popup. Allow popups for this site, then
                click the button again.
              </p>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="border-t border-border pt-3 pb-1">
          <button
            type="button"
            onClick={() => setInfoOpen(!infoOpen)}
            className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150 w-full"
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform duration-200",
                infoOpen && "rotate-180"
              )}
            />
            How it works
          </button>
          {infoOpen && (
            <ul className="mt-3 text-xs text-muted-foreground space-y-1.5 list-disc list-inside animate-fade-in">
              <li>Select your preferred AI provider above</li>
              <li>Enter any prompt you would like to use</li>
              <li>Optionally select features where supported</li>
              <li>Copy the generated URL to share with others</li>
              <li>Or click Open in ... to launch it immediately</li>
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}

/** App root: wraps the page in the theme provider and a Suspense boundary. */
function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Suspense fallback={null}>
        <PageContent />
      </Suspense>
    </ThemeProvider>
  )
}

export default App
