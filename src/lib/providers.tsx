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
  icon?: React.ReactNode
  baseURL: string
  promptParam: string
  supportsFeatures: boolean
  supportsTemporaryChat: boolean
  features: FeatureOption[]
  buildURL: (prompt: string, feature: Feature, temporaryChat: boolean) => string
}

function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  )
}

function PerplexityIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z" />
    </svg>
  )
}

function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2C14.4183 2 18 5.58172 18 10V17.333C18 17.6404 17.7899 17.9087 17.4912 17.9814C17.1925 18.0539 16.8824 17.9125 16.7412 17.6396C16.4654 17.1046 16.2278 16.6907 15.9443 16.4053C15.6891 16.1486 15.4011 16.0001 14.9775 16C14.3 16.0002 13.5743 16.4876 13.1016 17.5947C12.9967 17.8403 12.7553 18 12.4883 18C12.2214 17.9998 11.9798 17.8402 11.875 17.5947C11.4021 16.4874 10.6776 16 10 16C9.32238 16 8.59794 16.4874 8.125 17.5947C8.02021 17.8402 7.77857 17.9998 7.51172 18C7.24472 18 7.0033 17.8403 6.89844 17.5947C6.42567 16.4876 5.70001 16.0002 5.02246 16C4.59894 16.0001 4.31088 16.1486 4.05566 16.4053C3.7722 16.6907 3.53456 17.1046 3.25879 17.6396C3.11763 17.9125 2.80745 18.0539 2.50879 17.9814C2.21014 17.9087 2 17.6404 2 17.333V10C2 5.58172 5.58172 2 10 2ZM7 8.66699C6.44772 8.66699 6 9.11471 6 9.66699C6.00021 10.2191 6.44785 10.667 7 10.667C7.55215 10.667 7.99979 10.2191 8 9.66699C8 9.11471 7.55228 8.66699 7 8.66699ZM13 8.66699C12.4477 8.66699 12 9.11471 12 9.66699C12.0002 10.2191 12.4478 10.667 13 10.667C13.5522 10.667 13.9998 10.2191 14 9.66699C14 9.11471 13.5523 8.66699 13 8.66699Z"
      />
    </svg>
  )
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
    icon: <ChatGPTIcon className="w-4 h-4" />,
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
    icon: <ClaudeIcon className="w-4 h-4" />,
    baseURL: "https://claude.ai/new",
    promptParam: "q",
    supportsFeatures: false,
    supportsTemporaryChat: true,
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
