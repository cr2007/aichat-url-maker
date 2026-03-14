import {
  Search,
  ImageIcon,
  Lightbulb,
  BookOpen,
  ShoppingCart,
  GraduationCap,
  PenTool,
} from "lucide-react"

export type ProviderId = "chatgpt" | "claude" | "perplexity"
export type Feature = "search" | "image" | "think" | "research" | "shopping" | "study" | "canvas" | ""

export interface FeatureOption {
  label: string
  value: Feature
  icon: React.ReactNode
}

export interface ProviderConfig {
  id: ProviderId
  name: string
  baseURL: string
  promptParam: string
  supportsFeatures: boolean
  supportsTemporaryChat: boolean
  features: FeatureOption[]
  buildURL: (prompt: string, feature: Feature, temporaryChat: boolean) => string
}

const CHATGPT_FEATURES: FeatureOption[] = [
  { label: "Search",            value: "search",   icon: <Search className="w-4 h-4" /> },
  { label: "Image generation",  value: "image",    icon: <ImageIcon className="w-4 h-4" /> },
  { label: "Thinking",          value: "think",    icon: <Lightbulb className="w-4 h-4" /> },
  { label: "Deep Research",     value: "research", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Shopping Research", value: "shopping", icon: <ShoppingCart className="w-4 h-4" /> },
  { label: "Study and Learn",   value: "study",    icon: <GraduationCap className="w-4 h-4" /> },
  { label: "Canvas",            value: "canvas",   icon: <PenTool className="w-4 h-4" /> },
]

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    baseURL: "https://chatgpt.com/",
    promptParam: "q",
    supportsFeatures: true,
    supportsTemporaryChat: true,
    features: CHATGPT_FEATURES,
    buildURL(prompt, feature, temporaryChat) {
      const url = new URL(this.baseURL)
      url.searchParams.set("q", prompt)
      if (feature) url.searchParams.set("hints", feature)
      if (temporaryChat) url.searchParams.set("temporary-chat", "true")
      return url.toString()
    },
  },
  {
    id: "claude",
    name: "Claude",
    baseURL: "https://claude.ai/new",
    promptParam: "q",
    supportsFeatures: false,
    supportsTemporaryChat: false,
    features: [],
    buildURL(prompt) {
      const url = new URL(this.baseURL)
      url.searchParams.set("q", prompt)
      return url.toString()
    },
  },
  {
    id: "perplexity",
    name: "Perplexity",
    baseURL: "https://www.perplexity.ai/search",
    promptParam: "q",
    supportsFeatures: false,
    supportsTemporaryChat: false,
    features: [],
    buildURL(prompt) {
      const url = new URL(this.baseURL)
      url.searchParams.set("q", prompt)
      return url.toString()
    },
  },
]

export function getProvider(id: ProviderId): ProviderConfig {
  return PROVIDERS.find((p) => p.id === id)!
}
