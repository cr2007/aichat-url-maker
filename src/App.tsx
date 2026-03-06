import { Suspense, useState, useCallback } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Search,
  ImageIcon,
  Lightbulb,
  BookOpen,
  ShoppingCart,
  GraduationCap,
  PenTool,
  ExternalLink,
  MessageCircleDashed,
} from "lucide-react"
import { ThemeProvider } from './components/theme-provider'

type Feature = "search" | "image" | "think" | "research" | "shopping" | "study" | "canvas" | ""

const FEATURE_OPTIONS: { label: string; value: Feature; icon: React.ReactNode }[] = [
  { label: "Search",            value: "search",   icon: <Search className="w-4 h-4" /> },
  { label: "Image generation",  value: "image",    icon: <ImageIcon className="w-4 h-4" /> },
  { label: "Thinking",          value: "think",    icon: <Lightbulb className="w-4 h-4" /> },
  { label: "Deep Research",     value: "research", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Shopping Research", value: "shopping", icon: <ShoppingCart className="w-4 h-4" /> },
  { label: "Study and Learn",   value: "study",    icon: <GraduationCap className="w-4 h-4" /> },
  { label: "Canvas",            value: "canvas",   icon: <PenTool className="w-4 h-4" /> },
]

function PageContent() {
  const [prompt, setPrompt] = useState("")
  const [selectedFeature, setSelectedFeature] = useState<Feature>("")
  const [temporaryChat, setTemporaryChat] = useState(false)

  const generatedURL = useCallback(() => {
    if (!prompt.trim()) return ""

    const url = new URL("https://chatgpt.com/")
    url.searchParams.set("q", prompt)

    if (selectedFeature) url.searchParams.set("hints", selectedFeature)
    if (temporaryChat)   url.searchParams.set("temporary-chat", "true")

    return url.toString()
  }, [prompt, selectedFeature, temporaryChat])

  const handleOpenInChatGPT = () => {
    const url = generatedURL()
    if (url) window.open(url, "_blank")
  }

  const handleFeatureChange = (value: string) => {
    setSelectedFeature(selectedFeature === (value as Feature) ? "" : (value as Feature))
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">ChatGPT Prompt URL Generator</h1>
          <p className="text-muted-foreground text-base">
            Create shareable ChatGPT URLs with prefilled prompts. Perfect for saving and sharing your favorite prompts
            with others.
          </p>
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
            placeholder="Enter your ChatGPT prompt here... You can include multiple lines and special characters."
            className="w-full px-4 py-3 rounded-lg bg-secondary text-foreground placeholder-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            {prompt.length} characters • {prompt.split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        {/* Options Section */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">Optional ChatGPT Features</label>
          <ToggleGroup
            type="single"
            value={selectedFeature}
            onValueChange={handleFeatureChange}
            className="w-full justify-start flex-wrap gap-2 bg-transparent p-0 justify-center"
          >
            {FEATURE_OPTIONS.map((option) => (
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
                {FEATURE_OPTIONS.find((opt) => opt.value === selectedFeature)?.label}
              </span>
            </p>
          )}
        </div>

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
              <MessageCircleDashed className="w-4 h-4" />
              Temporary Chat
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            When enabled, the chat will not be saved to your chat history.
          </p>
        </div>


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
            onClick={handleOpenInChatGPT}
            disabled={!prompt.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed py-3 h-auto text-base font-semibold rounded-lg transition-all"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in ChatGPT
          </Button>
        )}

        {/* Info Section */}
        <div className="p-4 rounded-lg bg-secondary border border-border space-y-2">
          <h3 className="text-sm font-semibold text-foreground">How it works</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Enter any prompt you'd like to use in ChatGPT</li>
            <li>• Optionally select a ChatGPT feature to use with your prompt</li>
            <li>• Copy the generated URL to share with others</li>
            <li>• Or click "Open in ChatGPT" to use it immediately</li>
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
