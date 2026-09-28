import { Suspense, useState, useCallback, useEffect, useRef } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { MessageCircleDashed, ChevronDown, Copy, Ban, Volume2, VolumeX } from "lucide-react"
import { PROVIDERS, getProvider, isUrlTooLong, resolveOpenAction } from "@/lib/providers"
import type { ProviderId, Feature } from "@/lib/providers"
import { cn, countWords } from "@/lib/utils"
import { SoundProvider } from "@/lib/sound"
import { useSound, useSoundPreference } from "@/lib/use-sound"

/** The classes for a section label. The rem unit follows the browser text size. */
const SECTION_LABEL_CLASS = "block text-[0.8125rem] font-medium text-muted-foreground"

/**
 * The value of the "None" feature pill.
 *
 * The group is a radio group, so one pill is always selected. Radix treats ""
 * as "nothing selected", so None needs a real value of its own. The handler
 * maps it back to "" for the URL.
 */
const NONE_FEATURE = "__none__"

/** The providers, as options for the segmented control. */
const PROVIDER_OPTIONS = PROVIDERS.map((provider) => ({
  value: provider.id,
  label: provider.name,
  icon: provider.icon,
}))

/**
 * The classes for the feature grid.
 *
 * A wrapping row left the last pill alone on a third row. A grid gives rows
 * of equal length at every width: two columns on a phone, four above 560px,
 * which is eight pills in two rows of four.
 *
 * `items-stretch` gives every pill in a row the same height, so a label that
 * wraps to two lines does not make its row ragged.
 */
const FEATURE_GRID_CLASS =
  "grid w-full grid-cols-2 min-[560px]:grid-cols-4 items-stretch gap-1.5 bg-transparent p-0"

/**
 * The classes for a feature pill.
 *
 * `whitespace-normal h-auto` replaces the fixed height and the nowrap rule
 * from `toggleVariants`, so a long label wraps inside its cell instead of
 * widening it.
 *
 * `min-h-11` is the 44px target that HIG asks for. The transition names the
 * properties a pill actually changes: `transition-all` would also animate the
 * height and the padding when a label wraps.
 */
const PILL_CLASS =
  "flex w-full items-center justify-center gap-1.5 px-3 py-2 h-auto min-h-11 whitespace-normal text-center rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-[background-color,color,border-color,box-shadow,transform] duration-150 text-sm font-medium"

/**
 * Turns the interface sounds on and off.
 *
 * The control shows the current state through its icon and `aria-pressed`,
 * not through colour alone. Sound is off until a person turns it on, and the
 * engine is only fetched at that point.
 *
 * @returns The toggle.
 */
function SoundToggle() {
  const { soundOn, setSoundOn } = useSoundPreference()

  return (
    <Button
      id="sound-toggle"
      type="button"
      variant="ghost"
      size="icon"
      className="size-11"
      aria-pressed={soundOn}
      aria-label={soundOn ? "Turn interface sounds off" : "Turn interface sounds on"}
      onClick={() => setSoundOn(!soundOn)}
    >
      {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </Button>
  )
}

/**
 * The page.
 *
 * It holds the prompt field, the provider control, the feature controls and
 * the generated URL. It also holds all the form state.
 *
 * `buildURL` in `@/lib/providers` makes each URL. `resolveOpenAction` in the
 * same file decides what to do with a URL that is too long.
 *
 * @returns The page.
 */
function PageContent() {
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("chatgpt")
  const [selectedFeature, setSelectedFeature] = useState<Feature>("")
  const [temporaryChat, setTemporaryChat] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  // The URL of a blocked popup. The message goes away when the prompt, the
  // provider, the feature or the temporary chat setting changes. A value of
  // `null` means that the browser blocked no popup.
  const [blockedURL, setBlockedURL] = useState<string | null>(null)
  // The URL of a failed clipboard write. It clears the same way.
  const [copyFailedURL, setCopyFailedURL] = useState<string | null>(null)

  // Each cue repeats something already on screen. Sound is never the only
  // signal. See `AGENTS.md > Sound`.
  const playOpen = useSound("navigation.forward")
  const playTooLong = useSound("notification.warning")
  const playDisclosure = useSound(infoOpen ? "overlay.collapse" : "overlay.expand")

  const provider = getProvider(selectedProvider)

  // A provider that does not support a setting ignores it, but the setting
  // stays in state. A person who moves to another provider and back therefore
  // keeps their choice. Clearing the state here would destroy it, and the
  // segmented control changes the provider on focus alone, so an arrow key
  // would be enough to lose it.
  const feature = provider.supportsFeatures ? selectedFeature : ""
  const isTemporary = provider.supportsTemporaryChat ? temporaryChat : false

  const url = prompt.trim() ? provider.buildURL(prompt, feature, isTemporary) : ""
  const isTooLong = isUrlTooLong(url)
  const wordCount = countWords(prompt)
  const popupBlocked = blockedURL !== null && blockedURL === url
  const copyFailed = copyFailedURL !== null && copyFailedURL === url

  // Sounds once when the prompt crosses the length threshold, not on every
  // keystroke past it. The counter and the button label change at the same
  // moment, so the cue repeats a visible change.
  const wasTooLong = useRef(isTooLong)
  useEffect(() => {
    if (isTooLong && !wasTooLong.current) playTooLong()
    wasTooLong.current = isTooLong
  }, [isTooLong, playTooLong])

  /**
   * Opens the generated URL in a new tab.
   *
   * If the URL is too long, the function copies the prompt to the clipboard
   * and opens the home page of the provider. A person can then paste the
   * prompt into the page.
   *
   * The function records a blocked popup and a failed copy in the state. Each
   * message then goes away when the inputs change.
   */
  const handleOpenInProvider = useCallback(() => {
    // Step 1.1: do nothing if there is no prompt.
    if (!url) return

    // Step 1.2: select the full URL or the home page of the provider.
    const { targetURL, shouldCopyPrompt } = resolveOpenAction(url, provider)

    // Step 1.3: start the copy. Do not wait for it here. `window.open` needs
    // the gesture that started this handler, and an `await` gives that up.
    // The prompt reaches the provider through the clipboard on this path, so
    // a rejected write must reach the person instead of being discarded.
    if (shouldCopyPrompt) {
      setCopyFailedURL(null)
      navigator.clipboard.writeText(prompt).catch(() => setCopyFailedURL(url))
    }

    // Step 1.4: open the tab. Record the URL if the browser blocks the tab.
    const opened = window.open(targetURL, "_blank")
    setBlockedURL(opened ? null : url)

    // Step 1.5: sound the cue only when the tab opened. A blocked popup shows
    // its own message, and a success cue there would contradict it.
    if (opened) playOpen()
  }, [url, prompt, provider, playOpen])

  /**
   * Selects a feature.
   *
   * A press on the selected pill clears the feature, and the None pill does
   * the same. Radix reports "" for the first of those.
   *
   * @param value - The feature from the pill group, "" for a repeat press, or
   * NONE_FEATURE for the None pill.
   */
  const handleFeatureChange = useCallback((value: string) => {
    // Step 1.1: an empty value or the None pill both clear the feature. The
    // group then shows None as selected, so one pill is always selected.
    setSelectedFeature(!value || value === NONE_FEATURE ? "" : (value as Feature))
  }, [])

  /**
   * Changes the provider.
   *
   * It changes the provider and nothing else. The feature and the temporary
   * chat settings stay in state, and the URL ignores the ones that the new
   * provider does not support.
   *
   * @param value - The provider id from the segmented control.
   */
  const handleProviderChange = useCallback((value: string) => {
    // Step 1.1: ignore an empty value.
    if (!value) return

    // Step 1.2: set the new provider.
    setSelectedProvider(value as ProviderId)
  }, [])

  return (
    <main id="app" className="min-h-screen px-4 py-8">
      <div id="app-column" className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div id="app-header" className="relative text-center pt-2">
          <div className="absolute right-0 top-0">
            <SoundToggle />
          </div>
          <h1 id="app-title" className="text-2xl font-semibold tracking-tight pb-0.5">
            AI Prompt URL Generator
          </h1>
          <p id="app-tagline" className="text-sm text-muted-foreground mt-1.5">
            Prefill a prompt for ChatGPT, Claude, or Perplexity and share it as a link.
          </p>
        </div>

        {/* Provider selector */}
        <div id="provider-section" className="space-y-2">
          <span id="provider-label" className={SECTION_LABEL_CLASS}>Provider</span>
          <SegmentedControl
            label="Provider"
            options={PROVIDER_OPTIONS}
            value={selectedProvider}
            onValueChange={handleProviderChange}
            id="provider-picker"
          />
        </div>

        {/* Prompt */}
        <div id="prompt-section" className="space-y-1.5">
          <label
            htmlFor="prompt-input"
            className={SECTION_LABEL_CLASS}
          >
            Prompt
          </label>
          <textarea
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Enter your ${provider.name} prompt here...`}
            aria-describedby={prompt.length > 0 ? "prompt-meta" : undefined}
            className="w-full px-3 py-2.5 rounded-md bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus-ring focus:border-primary transition-[border-color,background-color] duration-150 resize-y"
            rows={4}
          />
          {prompt.length > 0 && (
            <p
              id="prompt-meta"
              role="status"
              aria-live="polite"
              className={cn(
                "text-[0.8125rem] text-right",
                isTooLong ? "text-warning font-medium" : "text-muted-foreground"
              )}
            >
              {prompt.length} {prompt.length === 1 ? "character" : "characters"}
              {" · "}
              {wordCount} {wordCount === 1 ? "word" : "words"}
              {isTooLong && (
                <>
                  <br />
                  Too long for a link. The prompt will be copied instead.
                </>
              )}
            </p>
          )}
        </div>

        {/* Features */}
        {provider.supportsFeatures && (
          <div id="feature-section" className="space-y-2">
            <span id="feature-label" className={SECTION_LABEL_CLASS}>Features</span>
            {/* Radix gives each item role="radio" but leaves the root at
                role="group". A radio outside a radiogroup reports no set size,
                so assistive technology cannot say "3 of 8". */}
            <ToggleGroup
              id="feature-picker"
              type="single"
              role="radiogroup"
              value={selectedFeature || NONE_FEATURE}
              onValueChange={handleFeatureChange}
              aria-labelledby="feature-label"
              className={FEATURE_GRID_CLASS}
            >
              <ToggleGroupItem value={NONE_FEATURE} className={PILL_CLASS}>
                <Ban className="w-4 h-4" />
                None
              </ToggleGroupItem>
              {provider.features.map((option) => (
                // No aria-label: the visible text is already the name, and a
                // duplicate makes screen readers announce the pill twice.
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className={PILL_CLASS}
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
          <div id="temporary-chat-section" className="flex justify-center">
            <Button
              id="temporary-chat-toggle"
              type="button"
              variant={temporaryChat ? "default" : "outline"}
              onClick={() => setTemporaryChat((prev) => !prev)}
              className="min-h-11 px-4"
              aria-pressed={temporaryChat}
            >
              {provider.temporaryChatIcon ?? <MessageCircleDashed className="w-4 h-4" />}
              Temporary Chat
            </Button>
          </div>
        )}

        {/* Generated URL */}
        <div id="generated-url-section" className="space-y-1.5">
          <label
            htmlFor="generated-url"
            className={SECTION_LABEL_CLASS}
          >
            Generated URL
          </label>
          {url ? (
            <div className="animate-fade-in">
              <CopyableInput id="generated-url" value={url} />
            </div>
          ) : (
            <div
              id="generated-url-empty"
              className="w-full px-3 py-2.5 rounded-md bg-secondary text-muted-foreground border border-border text-sm"
            >
              Enter a prompt above to generate a URL
            </div>
          )}
        </div>

        {/* Open button */}
        {url && (
          <div id="open-action-section" className="space-y-1.5 animate-fade-in">
            <Button
              id="open-in-provider"
              onClick={handleOpenInProvider}
              className="w-full h-auto min-h-11 py-3 font-medium rounded-md"
            >
              {isTooLong ? <Copy className="w-4 h-4" /> : provider.icon}
              {isTooLong ? `Copy Prompt & Open ${provider.name}` : `Open in ${provider.name}`}
            </Button>
            {isTooLong && (
              <p
                id="oversize-notice"
                className="text-[0.8125rem] text-center text-muted-foreground"
              >
                Opening {provider.name} copies the prompt to the clipboard,
                ready to paste.
              </p>
            )}
            {copyFailed && (
              <p
                id="copy-failed-notice"
                role="alert"
                className="text-[0.8125rem] text-center text-destructive"
              >
                The prompt did not reach the clipboard. Copy it from the Prompt
                field, then paste it into {provider.name}.
              </p>
            )}
            {popupBlocked && (
              <p
                id="popup-blocked-notice"
                role="alert"
                className="text-[0.8125rem] text-center text-destructive"
              >
                {provider.name} did not open. Allow pop-up windows for this
                site, then try again.
              </p>
            )}
          </div>
        )}

        {/* How it works */}
        <div id="how-it-works-section" className="border-t border-border pt-3 pb-1">
          <button
            id="how-it-works-toggle"
            type="button"
            aria-expanded={infoOpen}
            aria-controls="how-it-works-panel"
            onClick={() => {
              playDisclosure()
              setInfoOpen(!infoOpen)
            }}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-[0.8125rem] text-muted-foreground hover:text-foreground focus-ring transition-colors duration-150 active:scale-[0.98] motion-reduce:active:scale-100"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                infoOpen && "rotate-180"
              )}
            />
            How it works
          </button>
          {infoOpen && (
            <ul
              id="how-it-works-panel"
              className="mt-3 text-xs text-muted-foreground space-y-1.5 list-disc list-inside animate-fade-in"
            >
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

/**
 * The root of the app.
 *
 * It puts the page in a Suspense boundary. `prefers-color-scheme` in
 * `index.css` controls the appearance. There is no theme provider.
 *
 * @returns The app.
 */
function App() {
  return (
    <SoundProvider>
      <Suspense fallback={null}>
        <PageContent />
      </Suspense>
    </SoundProvider>
  )
}

export default App
