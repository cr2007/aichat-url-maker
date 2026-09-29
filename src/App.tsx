import { Suspense, useState, useCallback, useEffect, useRef } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Toggle } from "@/components/ui/toggle"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MessageCircleDashed, ChevronDown, Copy, Volume2, VolumeX, Check } from "lucide-react"
import { PROVIDERS, getProvider, isUrlTooLong, resolveOpenAction } from "@/lib/providers"
import type { ProviderId, Feature } from "@/lib/providers"
import { cn, copyText, countWords } from "@/lib/utils"
import { SoundProvider } from "@/lib/sound"
import { useSound, useSoundPreference } from "@/lib/use-sound"

/** The classes for a section label. The rem unit follows the browser text size. */
const SECTION_LABEL_CLASS = "block text-[0.8125rem] font-medium text-muted-foreground"

/** The providers, as options for the segmented control. */
const PROVIDER_OPTIONS = PROVIDERS.map((provider) => ({
  value: provider.id,
  label: provider.name,
  icon: provider.icon,
}))

/**
 * The classes for the feature row.
 *
 * Flex wrap, not a grid. A grid keeps its columns, so a part-filled last row
 * stays on the left. Flex centres every row, including the last.
 */
const FEATURE_ROW_CLASS = "flex w-full flex-wrap justify-center gap-1.5 bg-transparent p-0"

/**
 * The classes for the temporary chat row.
 *
 * The whole row is the control, so a press anywhere in it toggles the
 * setting. HIG toggles.md: outside a list, use a button that behaves like a
 * toggle, not a switch.
 *
 * This row reads `data-state`, which Radix sets. The feature pills cannot,
 * because a tooltip wraps each one and writes its own `data-state` over the
 * toggle's. They read `aria-pressed` instead.
 */
const TEMPORARY_CHAT_CLASS =
  "flex h-auto w-full items-center gap-3 rounded-md border border-border bg-secondary px-3 py-2.5 text-left whitespace-normal " +
  "transition-[color,background-color,border-color,box-shadow,transform] duration-200 " +
  "data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground dark:data-[state=on]:bg-primary/10"

/**
 * The classes for a feature pill.
 *
 * The selected state reads `aria-pressed`, not `data-state`. A tooltip wraps
 * each pill, and `TooltipTrigger asChild` writes its own `data-state` over
 * the toggle's, which silently removed the selected fill.
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
  "flex items-center justify-center gap-1.5 px-3 py-2 h-auto min-h-11 max-w-full whitespace-normal text-center rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary transition-[background-color,color,border-color,box-shadow,transform] duration-150 text-sm font-medium"

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
      void copyText(prompt).then((copied) => {
        if (!copied) setCopyFailedURL(url)
      })
    }

    // Step 1.4: open the tab. Record the URL if the browser blocks the tab.
    const opened = window.open(targetURL, "_blank")
    setBlockedURL(opened ? null : url)

    // Step 1.5: sound the cue only when the tab opened. A blocked popup shows
    // its own message, and a success cue there would contradict it.
    if (opened) playOpen()
  }, [url, prompt, provider, playOpen])

  /**
   * Selects a feature, or clears it.
   *
   * The pills are toggle buttons, so a press on the selected pill clears the
   * choice. Radix reports "" for that press.
   *
   * @param value - The feature, or "" to clear it.
   */
  const handleFeatureChange = useCallback((value: string) => {
    // Step 1.1: "" means the person pressed the selected pill again.
    setSelectedFeature(value as Feature)
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
            {/* Radix marks each item role="radio" for a single group, but a
                radio cannot be unchecked. These are toggle buttons: one at a
                time, and a second press clears the choice. aria-pressed says
                so, and aria-checked is cleared. */}
            <ToggleGroup
              id="feature-picker"
              type="single"
              value={selectedFeature}
              onValueChange={handleFeatureChange}
              aria-labelledby="feature-label"
              className={FEATURE_ROW_CLASS}
            >
              {provider.features.map((option) => {
                const selected = selectedFeature === option.value
                return (
                  <Tooltip key={option.value}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={option.value}
                        className={PILL_CLASS}
                        role="button"
                        aria-pressed={selected}
                        aria-checked={undefined}
                        aria-describedby={`feature-${option.value}-description`}
                      >
                        {option.icon}
                        {option.label}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent id={`feature-${option.value}-description`}>
                      {option.description}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </ToggleGroup>
          </div>
        )}

        {/* Temporary chat */}
        {provider.supportsTemporaryChat && (
          <Toggle
            id="temporary-chat-section"
            pressed={temporaryChat}
            onPressedChange={setTemporaryChat}
            className={TEMPORARY_CHAT_CLASS}
          >
            <span className="flex flex-1 flex-col gap-1 text-left">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {provider.temporaryChatIcon ?? <MessageCircleDashed className="size-4" />}
                Temporary chat
              </span>
              {/* One line on the on state. A person infers the off state. */}
              <span className="text-[0.8125rem] font-normal text-muted-foreground">
                Keeps this chat out of your {provider.name} history.
              </span>
            </span>
            {/* The check is the second cue. Colour alone does not show a
                state. It is decorative: aria-pressed carries the state. */}
            {/* The tick grows in from 0.75, not from 0: nothing appears out
                of nothing. ease-out, because it is entering. */}
            <Check
              aria-hidden="true"
              data-on={temporaryChat}
              className={cn(
                "size-5 shrink-0 scale-75 opacity-0",
                // `scale` and not `transform`: Tailwind v4 compiles `scale-*`
                // to the independent `scale` property, which a transform
                // transition does not cover.
                "transition-[opacity,scale] duration-200 ease-out",
                "data-[on=true]:scale-100 data-[on=true]:opacity-100"
              )}
            />
          </Toggle>
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
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-[0.8125rem] text-muted-foreground hover:text-foreground focus-ring transition-[color,scale] duration-150 active:scale-[0.98] motion-reduce:active:scale-100"
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
      <TooltipProvider delayDuration={300}>
        <Suspense fallback={null}>
          <PageContent />
        </Suspense>
      </TooltipProvider>
    </SoundProvider>
  )
}

export default App
