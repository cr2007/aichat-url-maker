import { Fragment, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { LinkPreview } from "@/components/link-preview"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Toggle } from "@/components/ui/toggle"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MessageCircleDashed, ChevronDown, Copy, Check } from "lucide-react"
import { PROVIDERS, getProvider, isUrlTooLong, resolveOpenAction } from "@/lib/providers"
import type { ProviderId, Feature } from "@/lib/providers"
import { cn, copyText, countCharacters, countWords } from "@/lib/utils"

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
 * stays on the left. Flex centres every row, including the last. In the wide
 * layout the label and the field above are left aligned, so the pills are too.
 */
const FEATURE_ROW_CLASS = "flex w-full flex-wrap justify-center gap-1.5 bg-transparent p-0 lg:justify-start"

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
 *
 * The transition names `scale`, so the press scale from `toggleVariants`
 * eases. The hover shadow is not in the list. It changes at once.
 */
const TEMPORARY_CHAT_CLASS =
  "flex h-auto w-full items-center gap-3 rounded-md border border-border bg-secondary px-3 py-2.5 text-left whitespace-normal " +
  "transition-[color,background-color,border-color,scale] duration-200 " +
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
 * height and the padding when a label wraps. It names `scale`, so the press
 * scale eases. The hover shadow is not in the list. It changes at once.
 */
const PILL_CLASS =
  "flex items-center justify-center gap-1.5 px-3 py-2 h-auto min-h-11 max-w-full whitespace-normal text-center rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary transition-[background-color,color,border-color,scale] duration-150 text-sm font-medium"

/**
 * Shows its content, or folds it away.
 *
 * A control that a provider does not support leaves the page. The fold makes
 * the controls below it move up over 200ms, so the move reads as one change
 * and not as a jump. The content stays in the page while it is folded. The
 * `inert` attribute then takes it out of the tab order and out of the
 * accessibility tree.
 *
 * The inner box has `-m-1 p-1` so the clip does not cut the focus ring. The
 * `-mt-5` cancels the `gap-5` above a folded item.
 *
 * @param props.id - The id of the wrapper.
 * @param props.open - True to show the content.
 * @param props.className - Extra classes, such as a margin for a wrapper
 *   that is not in the column gap.
 * @param props.children - The content.
 * @returns The wrapper.
 */
function Collapse({
  id,
  open,
  className,
  children,
}: {
  id: string
  open: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "-mt-5 grid-rows-[0fr] opacity-0",
        className
      )}
    >
      <div className="-m-1 min-h-0 overflow-hidden p-1">{children}</div>
    </div>
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

  const provider = getProvider(selectedProvider)

  // The temporary chat row keeps the text of the last provider that supports
  // it while the row folds away. Without this the name and the icon would
  // change in the middle of the fold. The feature row needs no such state,
  // because it reads from the one provider that has features.
  const [tempProvider, setTempProvider] = useState(provider)
  if (provider.supportsTemporaryChat && provider !== tempProvider) {
    setTempProvider(provider)
  }
  const featureProvider = PROVIDERS.find((p) => p.supportsFeatures) ?? provider

  // A provider that does not support a setting ignores it, but the setting
  // stays in state. A person who moves to another provider and back therefore
  // keeps their choice. Clearing the state here would destroy it, and the
  // segmented control changes the provider on focus alone, so an arrow key
  // would be enough to lose it.
  const feature = provider.supportsFeatures ? selectedFeature : ""
  const isTemporary = provider.supportsTemporaryChat ? temporaryChat : false

  const url = prompt.trim() ? provider.buildURL(prompt, feature, isTemporary) : ""
  const isTooLong = isUrlTooLong(url)
  // A prompt of spaces only gives no URL, so it gets no count either.
  const hasPrompt = prompt.trim().length > 0
  const wordCount = countWords(prompt)
  const characterCount = countCharacters(prompt)
  // One message for the oversize case. It sits in the page, so a touch device
  // sees it, and it is not in the pinned bar, which must stay small.
  const oversizeMessage = `Too long for a link. Opening ${provider.name} copies the prompt, ready to paste.`
  const popupBlocked = blockedURL !== null && blockedURL === url
  const copyFailed = copyFailedURL !== null && copyFailedURL === url

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
  }, [url, prompt, provider])

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
   * Opens or closes the steps under "How it works".
   *
   * The steps open at the end of the page, below the screen, so a person
   * would see nothing happen. After the fold the page scrolls just enough
   * to show them.
   */
  const toggleInfo = useCallback(() => {
    // Step 1.1: fold the steps open or closed.
    const next = !infoOpen
    setInfoOpen(next)
    if (!next) return

    // Step 1.2: wait for the 200ms fold, then bring the steps into view. A
    // person who asks for less motion gets a jump, not a glide.
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    setTimeout(() => {
      document.getElementById("how-it-works-panel")?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" })
    }, 200)
  }, [infoOpen])

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
    <main id="app" className="@container min-h-dvh px-4 py-8">
      {/* One column on a phone. Two columns from 1024px: the inputs on the
          left and the result on the right, so the URL is in view while a
          person edits. The two wrappers use `contents` below 1024px, so their
          children join the one column. */}
      <div
        id="app-column"
        className="mx-auto flex max-w-xl flex-col gap-5 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:items-start lg:gap-x-12"
      >
        {/* Header */}
        <div id="app-header" className="text-center pt-2 lg:col-span-2">
          <h1 id="app-title" className="text-2xl font-semibold tracking-tight pb-0.5">
            AI Prompt URL Generator
          </h1>
          <p id="app-tagline" className="text-sm text-muted-foreground mt-1.5">
            Prefill a prompt for ChatGPT, Claude, or Perplexity and share it as a link.
          </p>
        </div>

        <div id="inputs-column" className="contents lg:flex lg:flex-col lg:gap-5">
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
              aria-describedby={hasPrompt ? "prompt-meta" : undefined}
              className="w-full px-3 py-2.5 rounded-md bg-secondary text-foreground text-sm pointer-coarse:text-base placeholder:text-muted-foreground border border-border focus-ring focus:border-primary resize-y"
              rows={4}
            />
            {/* The line is always in the page and holds its height. The page
                then does not move when the first character arrives. It is not
                a live region, because it changes on every key. */}
            <p
              id="prompt-meta"
              className={cn(
                "min-h-5 text-[0.8125rem] text-right",
                isTooLong ? "text-warning font-medium" : "text-muted-foreground"
              )}
            >
              {hasPrompt && (
                <>
                  {characterCount} {characterCount === 1 ? "character" : "characters"}
                  {" · "}
                  {wordCount} {wordCount === 1 ? "word" : "words"}
                  {isTooLong && (
                    <>
                      <br />
                      <span aria-hidden="true">{oversizeMessage}</span>
                    </>
                  )}
                </>
              )}
            </p>
            {/* One announcement, when the prompt goes over the limit. */}
            <p role="status" className="sr-only">
              {isTooLong ? oversizeMessage : ""}
            </p>
          </div>

          {/* Features. The row folds away on a provider that has none. */}
          <Collapse id="feature-collapse" open={provider.supportsFeatures}>
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
                {featureProvider.features.map((option) => {
                  const selected = selectedFeature === option.value
                  return (
                    <Fragment key={option.value}>
                      <Tooltip>
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
                        <TooltipContent>{option.description}</TooltipContent>
                      </Tooltip>
                      {/* The tooltip is in the page only while it is open, so
                          the description lives here. A screen reader then
                          has it at rest. */}
                      <span id={`feature-${option.value}-description`} className="sr-only">
                        {option.description}
                      </span>
                    </Fragment>
                  )
                })}
              </ToggleGroup>
              {/* Only a finger needs this line. A mouse and a pen show the
                  tooltip on hover. */}
              <p
                id="feature-hint"
                className="hidden pointer-coarse:block text-center text-[0.8125rem] text-muted-foreground"
              >
                Press and hold a feature to see what it does.
              </p>
            </div>
          </Collapse>

          {/* Temporary chat. The row folds away on a provider without it. */}
          <Collapse id="temporary-chat-collapse" open={provider.supportsTemporaryChat}>
            <Toggle
              id="temporary-chat-section"
              pressed={temporaryChat}
              onPressedChange={setTemporaryChat}
              className={TEMPORARY_CHAT_CLASS}
            >
              <span className="flex flex-1 flex-col gap-1 text-left">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {tempProvider.temporaryChatIcon ?? <MessageCircleDashed className="size-4" />}
                  Temporary chat
                </span>
                {/* One line on the on state. A person infers the off state. */}
                <span className="text-[0.8125rem] font-normal text-muted-foreground">
                  Keeps this chat out of your {tempProvider.name} history.
                </span>
              </span>
              {/* The check is the second cue. Colour alone does not show a
                  state. It is decorative: aria-pressed carries the state. */}
              {/* The tick grows in from 0.9, not from 0: nothing appears out
                  of nothing. ease-out, because it is entering. */}
              <Check
                aria-hidden="true"
                data-on={temporaryChat}
                className={cn(
                  "size-5 shrink-0 scale-90 opacity-0",
                  // `scale` and not `transform`: Tailwind v4 compiles `scale-*`
                  // to the independent `scale` property, which a transform
                  // transition does not cover.
                  "transition-[opacity,scale] duration-200 ease-out",
                  "data-[on=true]:scale-100 data-[on=true]:opacity-100"
                )}
              />
            </Toggle>
          </Collapse>
        </div>

        <div id="result-column" className="contents lg:sticky lg:top-8 lg:flex lg:flex-col lg:gap-5">
          {/* Generated URL. On a phone the dock below shows the link, so this
              field shows from 1024px. It also shows when the column is under
              16rem, which happens only with large text: the link line would
              then make the pinned dock too tall. */}
          <div id="generated-url-section" className="hidden space-y-1.5 @max-[16rem]:block lg:block">
            <label
              htmlFor="generated-url"
              className={SECTION_LABEL_CLASS}
            >
              Generated URL
            </label>
            {/* The field is in the page before a prompt exists. It then has
                the same size before and after the first character. */}
            <CopyableInput
              id="generated-url"
              value={url}
              placeholder="Enter a prompt above to generate a URL"
            />
          </div>

          {/* The dock. On a phone it sticks to the bottom edge of the screen,
              so a short screen, such as a phone in landscape, does not hide
              it below the fold. It holds the link on one line, its copy
              button and the open button, so the features above it are on
              the first screen. The solid fill hides the content
              that scrolls under it, and the gradient above it softens that
              edge. From 1024px the result column is sticky, so the button
              stays in the page. */}
          <div
            id="open-action-section"
            className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-1.5 bg-background px-4 pt-2 pb-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-linear-to-t before:from-background before:to-transparent lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:before:hidden"
          >
            <LinkPreview url={url} className="@max-[16rem]:hidden lg:hidden" />
            <Button
              id="open-in-provider"
              onClick={handleOpenInProvider}
              disabled={!url}
              className="w-full h-auto min-h-11 py-3 font-medium rounded-md whitespace-normal text-center"
            >
              {isTooLong ? <Copy className="w-4 h-4" /> : provider.icon}
              {isTooLong ? `Copy Prompt & Open ${provider.name}` : `Open in ${provider.name}`}
            </Button>
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
        </div>

        {/* How it works */}
        <div id="how-it-works-section" className="border-t border-border pt-3 pb-1 lg:col-span-2">
          <button
            id="how-it-works-toggle"
            type="button"
            aria-expanded={infoOpen}
            aria-controls="how-it-works-panel"
            onClick={toggleInfo}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-[0.8125rem] text-muted-foreground hover:text-foreground focus-ring transition-[color,scale] duration-150 active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200 ease-out",
                infoOpen && "rotate-180"
              )}
            />
            How it works
          </button>
          {/* The steps fold open like the feature rows, so the page below
              moves as one change. The list is a sequence, so it is numbered. */}
          <Collapse id="how-it-works-panel" open={infoOpen} className="mt-0">
            <ol className="mx-auto w-fit max-w-xl list-inside list-decimal space-y-1.5 pt-3 text-[0.8125rem] text-muted-foreground">
              <li>Choose a provider.</li>
              <li>Type your prompt.</li>
              <li>Pick a feature, if you want one.</li>
              <li>Copy the link to share it, or open it in {provider.name}.</li>
            </ol>
          </Collapse>
        </div>
      </div>
    </main>
  )
}

/**
 * The root of the app.
 *
 * `prefers-color-scheme` in `index.css` controls the appearance. There is no
 * theme provider.
 *
 * @returns The app.
 */
function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <PageContent />
    </TooltipProvider>
  )
}

export default App
