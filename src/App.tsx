import { Suspense, useState, useCallback } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ExternalLink,
  MessageCircleDashed,
} from "lucide-react"
import { ThemeProvider } from './components/theme-provider'
import { PROVIDERS, getProvider } from "@/lib/providers"
import type { ProviderId, Feature } from "@/lib/providers"

function PageContent() {
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("chatgpt")
  const [selectedFeature, setSelectedFeature] = useState<Feature>("")
  const [temporaryChat, setTemporaryChat] = useState(false)

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

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">AI Prompt URL Generator</h1>
          <p className="text-muted-foreground text-base">
            Create shareable URLs with prefilled prompts for ChatGPT, Claude, and Perplexity. Perfect for saving and
            sharing your favorite prompts with others.
          </p>
        </div>

        {/* Provider Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">AI Provider</label>
          <ToggleGroup
            type="single"
            value={selectedProvider}
            onValueChange={handleProviderChange}
            className="w-full justify-center flex-wrap gap-2 bg-transparent p-0"
          >
            {PROVIDERS.map((p) => (
              <ToggleGroupItem
                key={p.id}
                value={p.id}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-secondary hover:bg-secondary/80 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-all"
                aria-label={p.name}
              >
                {p.icon}
                <span className="text-sm font-medium">{p.name}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Prompt Input Section */}
        <div className="space-y-3">
          <label htmlFor="prompt-input" className="block text-sm font-semibold text-foreground">
            Your Prompt
          </label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Enter your ${provider.name} prompt here... You can include multiple lines and special characters.`}
            className="w-full px-4 py-3 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            {prompt.length} characters • {prompt.split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        {/* Options Section */}
        {provider.supportsFeatures && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">Optional {provider.name} Features</label>
            <ToggleGroup
              type="single"
              value={selectedFeature}
              onValueChange={handleFeatureChange}
              className="w-full justify-start flex-wrap gap-2 bg-transparent p-0 justify-center"
            >
              {provider.features.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-secondary hover:bg-secondary/80 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-all"
                  aria-label={option.label}
                >
                  {option.icon}
                  <span className="text-sm font-medium">{option.label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {selectedFeature && (
              <p className="text-xs text-muted-foreground">
                Selected feature:{" "}
                <span className="font-semibold text-foreground">
                  {provider.features.find((opt) => opt.value === selectedFeature)?.label}
                </span>
              </p>
            )}
          </div>
        )}

        {provider.supportsTemporaryChat && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">
              Chat Session Options
            </label>

            <div className="flex justify-center">
              <Button
                type="button"
                variant={temporaryChat ? "default" : "outline"}
                onClick={() => setTemporaryChat((prev) => !prev)}
                className="flex items-center gap-2"
                aria-pressed={temporaryChat}
              >
                {provider.temporaryChatIcon ?? <MessageCircleDashed className="w-4 h-4" />}
                Temporary Chat
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              When enabled, the chat will not be saved to your chat history.
            </p>
          </div>
        )}

        {/* Generated URL Section */}
        <div className="space-y-3">
          <label htmlFor="generated-url" className="block text-sm font-semibold text-foreground">
            Generated URL
          </label>
          {generatedURL() ? (
            <CopyableInput id="generated-url" value={generatedURL()} placeholder="Your URL will appear here" />
          ) : (
            <div className="w-full px-4 py-3 rounded-lg bg-secondary text-muted-foreground border border-border text-sm">
              Enter a prompt above to generate a URL
            </div>
          )}
        </div>

        {/* Action Section */}
        {generatedURL() && (
          <Button
            onClick={handleOpenInProvider}
            disabled={!prompt.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed py-3 h-auto text-base font-semibold rounded-lg transition-all"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in {provider.name}
          </Button>
        )}

        {/* Info Section */}
        <div className="p-4 rounded-lg bg-secondary border border-border space-y-2">
          <h3 className="text-sm font-semibold text-foreground">How it works</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Select your preferred AI provider above</li>
            <li>Enter any prompt you'd like to use</li>
            <li>Optionally select features (where supported)</li>
            <li>Copy the generated URL to share with others</li>
            <li>Or click "Open in ..." to use it immediately</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Suspense fallback={null}>
        <PageContent />
      </Suspense>
    </ThemeProvider>
  )
}

export default App
