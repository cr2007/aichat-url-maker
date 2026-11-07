import {
  Search,
  ImageIcon,
  Brain,
  BookOpen,
  ShoppingCart,
  GraduationCap,
  SquarePen,
} from "lucide-react"
import { ChatGPTIcon, ClaudeIcon, ClaudeIncognitoIcon, PerplexityIcon } from "@/components/provider-icons"

/** The id of a provider. It is also the value of the provider control. */
export type ProviderId = "chatgpt" | "claude" | "perplexity"
/** A feature value for the `hints` parameter. An empty string means no feature. */
export type Feature = "search" | "image" | "think" | "research" | "shopping" | "study" | "canvas" | ""

/** One feature that a provider can switch on. */
export interface FeatureOption {
  /** The visible text, and the accessible name. */
  label: string
  /** The value that goes into the `hints` parameter. */
  value: Feature
  /** A decorative mark. The label gives the name. */
  icon: React.ReactNode
  /** One line on what the feature does. A tooltip shows it. */
  description: string
}

/** Everything the app knows about one provider. */
interface ProviderConfig {
  /** The id of the provider. */
  id: ProviderId
  /** The name that the page shows. */
  name: string
  /** The mark of the provider. It is decorative. */
  icon?: React.ReactNode
  /** The address that the oversized prompt fallback opens. */
  baseURL: string
  /** True if the provider reads a feature. */
  supportsFeatures: boolean
  /** True if the provider has a chat that leaves no history. */
  supportsTemporaryChat: boolean
  /** A mark for the temporary chat row, if the provider has its own. */
  temporaryChatIcon?: React.ReactNode
  /** The features of the provider. The list is empty if there are none. */
  features: FeatureOption[]
  /** Builds the URL. Every value goes through `URLSearchParams`. */
  buildURL: (prompt: string, feature: Feature, temporaryChat: boolean) => string
}

const CHATGPT_FEATURES: FeatureOption[] = [
  {
    label: "Search",
    value: "search",
    icon: <Search className="w-4 h-4" />,
    description: "Searches the web for up-to-date facts first.",
  },
  {
    label: "Image generation",
    value: "image",
    icon: <ImageIcon className="w-4 h-4" />,
    description: "Makes a picture from the prompt.",
  },
  {
    label: "Thinking",
    value: "think",
    icon: <Brain className="w-4 h-4" />,
    description: "Takes longer and works through the problem step by step.",
  },
  {
    label: "Deep Research",
    value: "research",
    icon: <BookOpen className="w-4 h-4" />,
    description: "Reads many sources and writes a report with citations.",
  },
  {
    label: "Shopping Research",
    value: "shopping",
    icon: <ShoppingCart className="w-4 h-4" />,
    description: "Compares products and shows prices.",
  },
  {
    label: "Study and Learn",
    value: "study",
    icon: <GraduationCap className="w-4 h-4" />,
    description: "Helps you learn the topic, not only get the answer.",
  },
  {
    label: "Canvas",
    value: "canvas",
    icon: <SquarePen className="w-4 h-4" />,
    description: "Opens a side panel to write or edit with the assistant.",
  },
]

/** Every provider, in the order of the provider control. */
export const PROVIDERS: ProviderConfig[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: <ChatGPTIcon className="w-4 h-4" />,
    baseURL: "https://chatgpt.com/",
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
    icon: <ClaudeIcon className="w-4 h-4" />,
    baseURL: "https://claude.ai/new",
    supportsFeatures: false,
    supportsTemporaryChat: true,
    temporaryChatIcon: <ClaudeIncognitoIcon className="w-4 h-4" />,
    features: [],
    buildURL(prompt, _feature, temporaryChat) {
      const url = new URL(this.baseURL)
      url.searchParams.set("q", prompt)
      if (temporaryChat) url.search += "&incognito"
      return url.toString()
    },
  },
  {
    id: "perplexity",
    name: "Perplexity",
    icon: <PerplexityIcon className="w-4 h-4" />,
    baseURL: "https://www.perplexity.ai/search",
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

/**
 * Finds the config of a provider.
 *
 * @param id - The provider id, for example `"chatgpt"`.
 * @returns The provider. Every id comes from {@link PROVIDERS}, so a match always exists.
 */
export function getProvider(id: ProviderId): ProviderConfig {
  return PROVIDERS.find((p) => p.id === id)!
}

/**
 * The longest link, in characters, that opens directly. Some servers answer a
 * request line of about 8000 characters with HTTP 431, so a longer link takes
 * the copy-and-open path (see {@link resolveOpenAction}).
 */
export const MAX_SAFE_URL_LENGTH = 7500

/**
 * Checks whether a generated URL is too long to open safely.
 *
 * @param url - The link that `buildURL` made.
 * @returns `true` if `url` exceeds {@link MAX_SAFE_URL_LENGTH}.
 */
export function isUrlTooLong(url: string): boolean {
  return url.length > MAX_SAFE_URL_LENGTH
}

/** The prompt parameter and the separator after it, at any place in a link. */
const PROMPT_PARAM = /([?&])q=[^&]*&?/

/** A `?` or `&` left at the end of a link with no parameter after it. */
const TRAILING_SEPARATOR = /[?&]$/

/** Where {@link resolveOpenAction} decided to navigate, and whether the prompt needs a clipboard copy first. */
interface OpenAction {
  /** The URL that should be opened in a new tab. */
  targetURL: string
  /** Whether the prompt text should be copied to the clipboard before opening. */
  shouldCopyPrompt: boolean
}

/**
 * Decides what "Open in {provider}" does. A short link opens as it is. A link
 * that is too long opens without the prompt, which the caller copies; every
 * other setting stays, so a temporary chat stays temporary.
 *
 * @param url - The link that `buildURL` made for the current prompt.
 * @returns The URL to open, and whether the prompt should be copied first.
 */
export function resolveOpenAction(url: string): OpenAction {
  if (!isUrlTooLong(url)) return { targetURL: url, shouldCopyPrompt: false }

  // Step 1.1: take out only the prompt. The other parameters are the settings.
  const targetURL = url.replace(PROMPT_PARAM, "$1").replace(TRAILING_SEPARATOR, "")
  return { targetURL, shouldCopyPrompt: true }
}
