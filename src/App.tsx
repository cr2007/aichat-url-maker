import { memo, useState, useCallback, useDeferredValue, useEffect, useRef, useSyncExternalStore } from "react"
import type { ReactNode, RefObject } from "react"
import { CopyableInput } from "@/components/copyable-input"
import { LinkPreview } from "@/components/link-preview"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useTooltip } from "@/components/ui/tooltip"
import { ArrowUpRight, MessageCircleDashed, ChevronDown, Copy, Check } from "lucide-react"
import { PROVIDERS, getProvider, isUrlTooLong, resolveOpenAction } from "@/lib/providers"
import type { ProviderId, Feature, FeatureOption } from "@/lib/providers"
import { cn, copyText, countCharacters, countWords, subscribeNever } from "@/lib/utils"
import { PROMPT_IDEAS, dealIdeas } from "@/lib/prompt-ideas"

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
 * The classes for the temporary chat row. The whole row is one toggle (HIG:
 * a button that toggles, not a switch). It reads `data-state`, because no
 * tooltip wraps it. The transition names `scale` for the press.
 */
const TEMPORARY_CHAT_CLASS =
  "flex h-auto w-full items-center gap-3 rounded-md border border-border bg-secondary px-3 py-2.5 text-left whitespace-normal " +
  "transition-[color,background-color,border-color,scale] duration-200 " +
  "data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground dark:data-[state=on]:bg-primary/10"

/**
 * The classes for a feature pill. It reads `aria-pressed`, the state that a
 * screen reader gets too. `h-auto whitespace-normal` lets a long
 * label wrap, and `min-h-11` is the 44px target.
 */
const PILL_CLASS =
  "flex min-w-0 shrink-0 items-center justify-center gap-1.5 px-3 py-2 h-auto min-h-11 max-w-full whitespace-normal text-center rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary transition-[background-color,color,border-color,scale] duration-150 text-sm font-medium"

/** The reason in the counter line when the link is too long. One short line, so the page does not move. */
const OVERSIZE_MESSAGE = "Too long for a link."

/** How long an example prompt takes to fade out. It matches `duration-120`. */
const IDEA_FADE_OUT_MS = 120

/** How long each example prompt stays. Enough to read the longest one. */
const IDEA_INTERVAL_MS = 3500

/**
 * The counter line under the prompt.
 *
 * Counting a long prompt is the slowest work on a key press: two passes with
 * `Intl.Segmenter`. The page gives this line a deferred copy of the prompt,
 * and `memo` keeps the urgent render from running it, so the typed letter
 * paints first and the counts follow.
 *
 * @param props.text - The trimmed prompt, deferred.
 * @param props.tooLong - True when the link for this prompt is too long.
 * @returns The line. It holds its height when it is empty.
 */
const PromptMeta = memo(function PromptMeta({ text, tooLong }: { text: string; tooLong: boolean }) {
  // Step 1.1: count only a real prompt. Spaces only give no link and no count.
  const characters = text ? countCharacters(text) : 0
  const words = text ? countWords(text) : 0

  return (
    // The line is always in the page and holds its height, so the page does
    // not move at the first character. It is not a live region, because it
    // changes on every key. The field reads it as its description, so it is
    // hidden from the reading order and not read a second time.
    <p
      id="prompt-meta"
      aria-hidden="true"
      className={cn(
        "min-h-5 text-[0.8125rem] text-right tabular-nums",
        tooLong ? "text-warning font-medium" : "text-muted-foreground"
      )}
    >
      {text && (
        <>
          {characters} {characters === 1 ? "character" : "characters"}
          {" · "}
          {words} {words === 1 ? "word" : "words"}
          {tooLong && (
            <>
              <br />
              {OVERSIZE_MESSAGE}
            </>
          )}
        </>
      )}
    </p>
  )
})

/**
 * True on an Apple device, where the shortcut key is Command, not Control.
 *
 * @returns True on macOS, iOS and iPadOS.
 */
function isApplePlatform() {
  return /Mac|iPhone|iPad/.test(navigator.platform)
}

/**
 * Rotates the example prompt while the field is empty, not focused, and on a
 * visible tab. The first idea is random too, and fades in after hydration.
 *
 * @param active - False while the field holds text.
 * @param promptRef - The prompt field. A focused field keeps its idea.
 * @returns The index of the idea, and true while the old idea fades out.
 */
function useRotatingIdea(active: boolean, promptRef: RefObject<HTMLTextAreaElement | null>) {
  // The prerendered page shows the first idea, so the first client render does too.
  const [ideaIndex, setIdeaIndex] = useState(0)
  const [ideaLeaving, setIdeaLeaving] = useState(false)
  const deck = useRef<number[]>([])

  useEffect(() => {
    if (!active) return
    // Step 1.1: the next idea comes from a shuffled deck, so none repeats soon.
    const show = () =>
      setIdeaIndex((current) => {
        if (deck.current.length === 0) deck.current = dealIdeas(current)
        return deck.current.pop()!
      })
    // Step 1.2: the first random idea.
    const first = setTimeout(show, 0)
    // Step 1.3: the old idea fades out, then the new one fades in.
    let swap: ReturnType<typeof setTimeout> | undefined
    const timer = setInterval(() => {
      if (document.hidden || document.activeElement === promptRef.current) return
      setIdeaLeaving(true)
      swap = setTimeout(() => {
        show()
        setIdeaLeaving(false)
      }, IDEA_FADE_OUT_MS)
    }, IDEA_INTERVAL_MS)
    return () => {
      clearTimeout(first)
      clearTimeout(swap)
      clearInterval(timer)
      setIdeaLeaving(false)
    }
  }, [active, promptRef])

  return { ideaIndex, ideaLeaving }
}

/**
 * The feature pills: toggle buttons, one at a time, and a second press clears
 * the choice. A radio cannot be unchecked, so each pill is a button with
 * `aria-pressed`, in a plain group.
 *
 * @param props.features - The pills to show.
 * @param props.value - The selected feature, or "".
 * @param props.onChange - Gets the new feature, or "" on a second press.
 * @returns The pill row.
 */
const FeaturePills = memo(function FeaturePills({
  features,
  value,
  onChange,
}: {
  features: FeatureOption[]
  value: Feature
  onChange: (value: Feature) => void
}) {
  return (
    <div id="feature-picker" role="group" aria-labelledby="feature-label" className={FEATURE_ROW_CLASS}>
      {features.map((option) => (
        <FeaturePill key={option.value} option={option} pressed={value === option.value} onChange={onChange} />
      ))}
    </div>
  )
})

/**
 * One feature pill, with its tooltip.
 *
 * @param props.option - The feature.
 * @param props.pressed - True while this feature is on.
 * @param props.onChange - Receives the feature, or "" to clear it.
 * @returns The pill, its tooltip while open, and its hidden description.
 */
function FeaturePill({ option, pressed, onChange }: { option: FeatureOption; pressed: boolean; onChange: (value: Feature) => void }) {
  const { triggerProps, tooltip } = useTooltip(option.description)
  return (
    <>
      {/* One feature at a time: a press turns this one on, or clears it. */}
      <Toggle
        {...triggerProps}
        pressed={pressed}
        onPressedChange={(on) => onChange(on ? option.value : "")}
        className={PILL_CLASS}
        aria-describedby={`feature-${option.value}-description`}
      >
        {option.icon}
        {option.label}
      </Toggle>
      {tooltip}
      {/* The tooltip is in the page only while open, so the description
          lives here, hidden, and a screen reader reads it once. */}
      <span id={`feature-${option.value}-description`} hidden>
        {option.description}
      </span>
    </>
  )
}

/**
 * The keycap look. The fill takes a step toward the page text colour, so the
 * label keeps 4.5:1 on the button in both appearances. Pressed, it sinks 1px.
 */
const KEYCAP_CLASS =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-[0.3125rem] border border-b-2 border-primary-foreground/35 bg-[color-mix(in_oklab,var(--primary),var(--foreground)_22%)] px-1 font-sans text-[0.8125rem] leading-none font-medium data-[pressed=true]:translate-y-px data-[pressed=true]:border-b data-[pressed=true]:bg-[color-mix(in_oklab,var(--primary),var(--foreground)_36%)]"

/**
 * Shows the keycaps when a mouse or a trackpad is connected: a fine pointer
 * that can hover. A pen is fine too, but on Android it reports no hover, so it
 * does not count. CSS follows a mouse plugged in later with no script.
 */
const FINE_POINTER_SHOW = "hidden [@media(any-pointer:fine)_and_(any-hover:hover)]:inline-flex"

/**
 * True if a key event comes from a physical keyboard. No browser API reports
 * a keyboard, so the event is the proof. An on-screen keyboard on Android
 * sends key code 229 or an empty `code`.
 *
 * @param event - The key event.
 * @returns True for a physical key.
 */
function isPhysicalKey(event: KeyboardEvent) {
  return event.code !== "" && event.keyCode !== 229 && !event.isComposing
}

/**
 * The open shortcut as keycaps, in the open button. They show when a mouse or
 * a trackpad is connected, or after the first key from a physical keyboard.
 * Screen width does not count. A held key shows as pressed. Screen readers
 * get the shortcut from `aria-keyshortcuts` on the button.
 *
 * @param props.apple - True to show Command instead of Ctrl.
 * @returns The keycaps.
 */
function ShortcutKeys({ apple }: { apple: boolean }) {
  const [held, setHeld] = useState({ mod: false, enter: false })
  // The prerender does not know the platform, so it cannot say Ctrl or
  // Command. The keys keep their room from the first paint, so the button does
  // not grow, and show once the client knows.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)
  // The page stores nothing, so the proof of a keyboard lasts for this visit.
  const [keyboard, setKeyboard] = useState(false)

  useEffect(() => {
    // Step 1.1: follow the modifier and Enter. Other keys cause no render.
    const read = (event: KeyboardEvent) => {
      if (event.type === "keydown" && isPhysicalKey(event)) setKeyboard(true)
      const mod = apple ? event.metaKey : event.ctrlKey
      const enter = event.key === "Enter" ? event.type === "keydown" : undefined
      setHeld((prev) => {
        const next = { mod, enter: enter ?? prev.enter }
        return next.mod === prev.mod && next.enter === prev.enter ? prev : next
      })
    }
    // Step 1.2: Ctrl+Enter opens a new tab and the key-up never comes.
    const clear = () => setHeld({ mod: false, enter: false })
    window.addEventListener("keydown", read)
    window.addEventListener("keyup", read)
    window.addEventListener("blur", clear)
    return () => {
      window.removeEventListener("keydown", read)
      window.removeEventListener("keyup", read)
      window.removeEventListener("blur", clear)
    }
  }, [apple])

  return (
    <kbd aria-hidden="true" className={cn("ml-1 items-center gap-1", keyboard ? "inline-flex" : FINE_POINTER_SHOW, !hydrated && "invisible")}>
      <kbd data-pressed={held.mod} className={KEYCAP_CLASS}>
        {apple ? "⌘" : "Ctrl"}
      </kbd>
      <kbd data-pressed={held.enter} className={KEYCAP_CLASS}>
        {"↵"}
      </kbd>
    </kbd>
  )
}

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
  // One feature for each provider, so a pick on one survives a visit to another.
  const [selectedFeatures, setSelectedFeatures] = useState<Partial<Record<ProviderId, Feature>>>({})
  const [temporaryChat, setTemporaryChat] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  // The link of a blocked new tab, and of a failed clipboard write. `null`
  // means no notice. A late clipboard result for an old link cannot match.
  const [blockedURL, setBlockedURL] = useState<string | null>(null)
  const [copyFailedURL, setCopyFailedURL] = useState<string | null>(null)

  const provider = getProvider(selectedProvider)

  // A row that folds away keeps the text of the last provider that supports
  // it. Without this the names and the icons would change mid-fold.
  const [tempProvider, setTempProvider] = useState(provider)
  if (provider.supportsTemporaryChat && provider !== tempProvider) {
    setTempProvider(provider)
  }
  const [featureProvider, setFeatureProvider] = useState(provider)
  if (provider.supportsFeatures && provider !== featureProvider) {
    setFeatureProvider(provider)
  }
  const shownFeature = selectedFeatures[featureProvider.id] ?? ""

  // A provider that does not support a setting ignores it, but the setting
  // stays in state. A person who moves to another provider and back therefore
  // keeps their choice. Clearing the state here would destroy it, and the
  // segmented control changes the provider on focus alone, so an arrow key
  // would be enough to lose it.
  const feature = provider.supportsFeatures ? (selectedFeatures[provider.id] ?? "") : ""
  const isTemporary = provider.supportsTemporaryChat && temporaryChat

  // Spaces and new lines at the ends are not part of the prompt. They would
  // only make the link longer and the count wrong.
  const trimmedPrompt = prompt.trim()
  const url = trimmedPrompt ? provider.buildURL(trimmedPrompt, feature, isTemporary) : ""
  const isTooLong = isUrlTooLong(url)
  // A prompt of spaces only gives no URL, so it gets no count either.
  const hasPrompt = trimmedPrompt.length > 0
  // The counter and the link displays read deferred copies, so a key press
  // paints the letter first. The open button uses the current link, so it
  // never opens an old one.
  const deferredPrompt = useDeferredValue(trimmedPrompt)
  const deferredUrl = useDeferredValue(url)
  const deferredTooLong = isUrlTooLong(deferredUrl)
  // The server has no navigator, so the first render shows "Ctrl".
  const isApple = useSyncExternalStore(subscribeNever, isApplePlatform, () => false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const { ideaIndex, ideaLeaving } = useRotatingIdea(!hasPrompt, promptRef)

  // The keyboard shrinks the layout on a phone, and the pinned dock moves up
  // over the prompt field. The focus then sits under the dock. A resize
  // scrolls the field back into view, and the scroll padding keeps it clear
  // of the dock. TalkBack on a real phone showed the fault.
  useEffect(() => {
    const keepPromptInView = () => {
      if (document.activeElement === promptRef.current) promptRef.current?.scrollIntoView({ block: "nearest" })
    }
    window.addEventListener("resize", keepPromptInView)
    return () => window.removeEventListener("resize", keepPromptInView)
  }, [])
  // Any change of the link clears both notices. An undo back to the same link
  // then does not bring an old notice back.
  const [noticeURL, setNoticeURL] = useState(url)
  if (url !== noticeURL) {
    setNoticeURL(url)
    setBlockedURL(null)
    setCopyFailedURL(null)
  }
  const popupBlocked = blockedURL === url
  const copyFailed = copyFailedURL === url

  /**
   * Opens the generated URL in a new tab.
   *
   * If the URL is too long, the function copies the prompt to the clipboard
   * and opens the same link without the prompt, so every setting still
   * applies. A person can then paste the prompt into the page.
   *
   * The function records a blocked popup and a failed copy in the state. Each
   * message then goes away when the inputs change.
   */
  const handleOpenInProvider = useCallback(() => {
    // Step 1.1: do nothing if there is no prompt.
    if (!url) return

    // Step 1.2: select the full link, or the link without the prompt.
    const { targetURL, shouldCopyPrompt } = resolveOpenAction(url)

    // Step 1.3: start the copy. Do not wait for it here. `window.open` needs
    // the gesture that started this handler, and an `await` gives that up.
    // The prompt reaches the provider through the clipboard on this path, so
    // a rejected write must reach the person instead of being discarded.
    if (shouldCopyPrompt) {
      setCopyFailedURL(null)
      void copyText(trimmedPrompt).then((copied) => {
        if (!copied) setCopyFailedURL(url)
      })
    }

    // Step 1.4: open the tab. Record the URL if the browser blocks the tab.
    // "noopener" would make window.open return null and hide a blocked
    // popup, so the handle back to this tab is cut after the open instead.
    const opened = window.open(targetURL, "_blank")
    if (opened) opened.opener = null
    setBlockedURL(opened ? null : url)
  }, [url, trimmedPrompt])

  /**
   * Selects a feature for the current provider, or clears it.
   *
   * @param value - The feature, or "" after a second press on the pill.
   */
  const handleFeatureChange = useCallback((value: Feature) => {
    // Step 1.1: each provider keeps its own choice, so key it by provider.
    setSelectedFeatures((prev) => ({ ...prev, [selectedProvider]: value }))
  }, [selectedProvider])

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
        {/* Left aligned from 1024px, like the two columns below it. */}
        <header id="app-header" className="text-center pt-2 lg:col-span-2 lg:text-left">
          <h1 id="app-title" className="text-2xl font-semibold tracking-tight pb-0.5">
            AI Prompt URL Generator
          </h1>
          <p id="app-tagline" className="text-sm text-muted-foreground mt-1.5 text-balance">
            Type a question. Get a link that opens ChatGPT, Claude or Perplexity with it ready.
          </p>
        </header>

        <div id="inputs-column" className="contents lg:flex lg:flex-col lg:gap-5">
          <div id="provider-section" className="space-y-2">
            {/* "Provider" reads as an internet or phone company to many people. */}
            {/* Hidden from the reading order: the group already has this name.
                TalkBack on a real phone read it twice before. */}
            <span id="provider-label" aria-hidden="true" className={SECTION_LABEL_CLASS}>AI app</span>
            <SegmentedControl
              label="AI app"
              options={PROVIDER_OPTIONS}
              value={selectedProvider}
              onValueChange={setSelectedProvider}
              id="provider-picker"
            />
          </div>

          <div id="prompt-section" className="space-y-1.5">
            {/* The label still focuses the field on a click. A screen reader
                gets the name from aria-labelledby, so it is one stop. */}
            <label
              id="prompt-label"
              htmlFor="prompt-input"
              aria-hidden="true"
              className={SECTION_LABEL_CLASS}
            >
              Prompt
            </label>
            {/* The overlay draws the example, so a new one can fade in. The
                real placeholder stays for screen readers, in a clear colour. */}
            <div className="relative">
              <textarea
              ref={promptRef}
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                // Ctrl or Command with Enter opens the link, so a person who
                // makes many links never leaves the keyboard.
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleOpenInProvider()
                }
              }}
              // An example defines "prompt" better than the word does.
              placeholder={`For example: ${PROMPT_IDEAS[ideaIndex]}`}
              // Arabic and Hebrew then run from the right.
              dir="auto"
              aria-labelledby="prompt-label"
              aria-describedby={hasPrompt ? "prompt-meta" : undefined}
              className="block w-full px-3 py-2.5 rounded-md bg-secondary text-foreground text-sm pointer-coarse:text-base placeholder:text-transparent border border-input focus-ring focus:border-primary resize-y"
              rows={4}
            />
              {prompt === "" && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-px px-3 py-2.5 text-sm pointer-coarse:text-base text-muted-foreground"
                >
                  For example:{" "}
                  {/* Only the idea changes, so only the idea fades: out fast,
                      then in with an even curve, so the swap is easy to see. */}
                  <span
                    key={ideaIndex}
                    data-leaving={ideaLeaving}
                    className="animate-[idea-in_280ms_ease-in-out] transition-[opacity,filter] duration-120 ease-in data-[leaving=true]:opacity-0 data-[leaving=true]:blur-[2px]"
                  >
                    {PROMPT_IDEAS[ideaIndex]}
                  </span>
                </span>
              )}
            </div>
            <PromptMeta text={deferredPrompt} tooLong={deferredTooLong} />
            {/* One announcement, when the prompt goes over the limit. No role,
                so an empty region is not a stop for TalkBack. */}
            <p aria-live="polite" aria-atomic="true" className="sr-only">
              {isTooLong ? OVERSIZE_MESSAGE : ""}
            </p>
          </div>

          {/* Features. The row folds away on a provider that has none. */}
          <Collapse id="feature-collapse" open={provider.supportsFeatures}>
            <div id="feature-section" className="space-y-2">
              <span id="feature-label" aria-hidden="true" className={SECTION_LABEL_CLASS}>Features (optional)</span>
              <FeaturePills
                features={featureProvider.features}
                value={shownFeature}
                onChange={handleFeatureChange}
              />
              {/* Only a finger needs this line. A mouse and a pen show the
                  tooltip on hover. */}
              <p
                id="feature-hint"
                // A screen reader already reads each description, and its long
                // press does something else. The hint is for sight only.
                aria-hidden="true"
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
              // The name is the first line. The second line is the description,
              // so a screen reader pauses between them.
              aria-labelledby="temporary-chat-label"
              aria-describedby="temporary-chat-description"
              className={TEMPORARY_CHAT_CLASS}
            >
              <span className="flex flex-1 flex-col gap-1 text-left">
                {/* Both lines are hidden, so they are not read again as content
                    of the button. aria-labelledby and aria-describedby still
                    read hidden text. TalkBack read each line twice before. */}
                <span id="temporary-chat-label" aria-hidden="true" className="flex items-center gap-1.5 text-sm font-medium">
                  {tempProvider.temporaryChatIcon ?? <MessageCircleDashed className="size-4" />}
                  Temporary chat
                </span>
                {/* One line on the on state. A person infers the off state. */}
                <span id="temporary-chat-description" aria-hidden="true" className="text-[0.8125rem] font-normal text-muted-foreground">
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
          <div id="generated-url-section" className="hidden space-y-2 @max-[16rem]:block lg:block">
            <label
              id="generated-url-label"
              htmlFor="generated-url"
              aria-hidden="true"
              className={SECTION_LABEL_CLASS}
            >
              Your link
            </label>
            {/* The field is in the page before a prompt exists. It then has
                the same size before and after the first character. */}
            <CopyableInput
              id="generated-url"
              aria-labelledby="generated-url-label"
              value={deferredUrl}
              copyDisabled={deferredTooLong}
              placeholder="Type a prompt to make a link."
            />
          </div>

          {/* The dock. On a phone it sticks to the bottom edge and holds the
              link, Copy and the open button, so the features stay on the first
              screen. From 1024px the result column is sticky instead. */}
          <div
            id="open-action-section"
            // With large text the column is under 16rem, and a pinned dock would
            // cover too much of the screen. It then stays in the page.
            className="sticky @max-[16rem]:static bottom-0 z-20 -mx-4 flex flex-col gap-1.5 bg-background px-4 pt-2 pb-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-linear-to-t before:from-background before:to-transparent lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:before:hidden"
          >
            <LinkPreview url={deferredUrl} tooLong={deferredTooLong} className="@max-[16rem]:hidden lg:hidden" />
            <Button
              id="open-in-provider"
              onClick={handleOpenInProvider}
              disabled={!url}
              aria-keyshortcuts="Control+Enter Meta+Enter"
              className="w-full h-auto min-h-11 flex-wrap py-3 font-medium rounded-md whitespace-normal text-center"
            >
              {isTooLong ? <Copy className="w-4 h-4" /> : provider.icon}
              {isTooLong ? `Copy prompt and open ${provider.name}` : `Open in ${provider.name}`}
              {/* It opens a new tab. The arrow says so before the press. */}
              <ArrowUpRight aria-hidden="true" className="size-4 opacity-70" />
              <ShortcutKeys apple={isApple} />
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
                {/* A link that the person clicks is never blocked as a pop-up. */}
                The browser blocked the new tab.{" "}
                <a
                  href={resolveOpenAction(url).targetURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 focus-ring rounded-sm"
                >
                  Open {provider.name}
                </a>
                , or allow pop-ups for this site.
              </p>
            )}
          </div>
        </div>

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
              <li>Choose an AI app.</li>
              <li>Type your prompt.</li>
              <li>Pick a feature, if you want one.</li>
              <li>Copy or share the link, or open it in {provider.name}.</li>
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
  return <PageContent />
}

export default App
