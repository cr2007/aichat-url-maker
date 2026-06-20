import { Suspense, useState, useCallback } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ModeToggle } from "@/components/mode-toggle"
import { ExternalLink, MessageCircleDashed, ChevronDown } from "lucide-react"
import { ThemeProvider } from './components/theme-provider'
import { PROVIDERS, getProvider } from "@/lib/providers"
import type { ProviderId, Feature } from "@/lib/providers"
import { cn } from "@/lib/utils"

function PageContent() {
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("chatgpt")
  const [selectedFeature, setSelectedFeature] = useState<Feature>("")
  const [temporaryChat, setTemporaryChat] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const provider = getProvider(selectedProvider)

  const generatedURL = useCallback(() => {
    if (!prompt.trim()) return ""
    return provider.buildURL(prompt, selectedFeature, temporaryChat)
  }, [prompt, selectedFeature, temporaryChat, provider])

  const handleOpenInProvider = () => {
    const url = generatedURL()
    if (url) window.open(url, "_blank")
  }

  const handleFeatureChange = (value: string) => {
    setSelectedFeature(selectedFeature === (value as Feature) ? "" : (value as Feature))
  }

  const handleProviderChange = (value: string) => {
    if (!value) return
    const newProvider = getProvider(value as ProviderId)
    if (!newProvider.supportsFeatures) setSelectedFeature("")
    if (!newProvider.supportsTemporaryChat) setTemporaryChat(false)
    setSelectedProvider(value as ProviderId)
  }

  const wordCount = prompt.split(/\s+/).filter(Boolean).length
  const url = generatedURL()

  const pillClass =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-all duration-150 text-sm font-medium"

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
                className={pillClass}
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
            <p className="text-[11px] text-muted-foreground text-right">
              {prompt.length} characters · {wordCount} words
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
                  className={pillClass}
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
          <Button
            onClick={handleOpenInProvider}
            className="w-full h-auto py-2.5 font-medium rounded-md transition-all duration-150 hover:opacity-90 active:scale-[0.99] animate-fade-in"
          >
            <ExternalLink className="w-4 h-4" />
            Open in {provider.name}
          </Button>
        )}

        {/* Info section */}
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
              <li>Enter any prompt you'd like to use</li>
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
