import { useEffect, useRef, useState } from "react"

/**
 * A font choice for the lab.
 *
 * `body` styles all text. `title` styles the h1 only. The names are the
 * Google Fonts family names. The lab loads them from Google, so a choice needs
 * no install. After a choice, the app self-hosts the files.
 */
interface FontPreset {
  id: string
  name: string
  body: string
  title?: string
  /** The `family=` query values for the Google Fonts URL. */
  families: string[]
  summary: string
  good: string
  watch: string
}

const PRESETS: FontPreset[] = [
  {
    id: "geist",
    name: "Geist (now)",
    body: "Geist",
    families: ["Geist:wght@400;500;600"],
    summary: "The current font. Clean and neutral.",
    good: "Reads well at small sizes.",
    watch: "Many AI tools use it, so it looks the same as them.",
  },
  {
    id: "schibsted",
    name: "Schibsted Grotesk",
    body: "Schibsted Grotesk",
    families: ["Schibsted+Grotesk:wght@400..700"],
    summary: "A news font with sharp, ink-trap details. It has character and stays calm.",
    good: "Distinct title. Strong digits for the counters.",
    watch: "Slightly wider than Geist. Check the 320px layout.",
  },
  {
    id: "hanken",
    name: "Hanken Grotesk",
    body: "Hanken Grotesk",
    families: ["Hanken+Grotesk:wght@400..700"],
    summary: "A quiet sans. Round shapes and open spaces.",
    good: "Very easy to read in small labels. Close to the system look.",
    watch: "Less character than the others.",
  },
  {
    id: "instrument",
    name: "Instrument Sans",
    body: "Instrument Sans",
    families: ["Instrument+Sans:wght@400..700"],
    summary: "A tidy sans with a slight narrow width. Neat for a tool.",
    good: "Fits more text on a small screen.",
    watch: "Thin strokes at 13px in light mode.",
  },
  {
    id: "hanken-fraunces",
    name: "Hanken Grotesk + Fraunces title",
    body: "Hanken Grotesk",
    title: "Fraunces",
    families: ["Hanken+Grotesk:wght@400..700", "Fraunces:opsz,wght@9..144,600"],
    summary: "A quiet body font with a warm serif title.",
    good: "The title gives the page a face. The tool text stays plain.",
    watch: "Two families. One more file to load.",
  },
  {
    id: "schibsted-bricolage",
    name: "Schibsted Grotesk + Bricolage title",
    body: "Schibsted Grotesk",
    title: "Bricolage Grotesque",
    families: ["Schibsted+Grotesk:wght@400..700", "Bricolage+Grotesque:wght@600;700"],
    summary: "A strong title with a lively shape. The body stays calm.",
    good: "The most memorable title of the set.",
    watch: "The boldest choice. Two families.",
  },
]

/** The widths of the preview frame, in pixels. */
const FRAMES = [
  { id: "phone", label: "Phone", width: 390, height: 780 },
  { id: "desktop", label: "Desktop", width: 1100, height: 780 },
]

/**
 * A dev-only screen that compares fonts on the real UI.
 *
 * The app loads in a frame on the left. The font list and its notes are on the
 * right. A click on a font changes the font in the frame at once. Open it
 * with `/?fonts` on the dev server. Delete this file after a choice.
 *
 * @returns The lab.
 */
export default function FontLab() {
  const [presetId, setPresetId] = useState(PRESETS[1].id)
  const [frameId, setFrameId] = useState("phone")
  const [loaded, setLoaded] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]
  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0]

  // Step 1.1: load the font files in this page, so the specimen on the right
  // uses them too. Step 1.2: write the same rules into the frame.
  useEffect(() => {
    const css = `https://fonts.googleapis.com/css2?${preset.families.map((f) => `family=${f}`).join("&")}&display=swap`
    const rules = `body, button, textarea, input { font-family: '${preset.body}', system-ui, sans-serif !important; }${
      preset.title ? ` h1 { font-family: '${preset.title}', serif !important; }` : ""
    }`
    const targets = [document, loaded ? frameRef.current?.contentDocument : null]
    for (const doc of targets) {
      if (!doc) continue
      doc.getElementById("lab-font-link")?.remove()
      doc.getElementById("lab-font-rules")?.remove()
      const link = doc.createElement("link")
      link.id = "lab-font-link"
      link.rel = "stylesheet"
      link.href = css
      const style = doc.createElement("style")
      style.id = "lab-font-rules"
      style.textContent = doc === document ? "" : rules
      doc.head.append(link, style)
    }
  }, [preset, loaded, frameId])

  return (
    <main id="font-lab" className="flex min-h-dvh flex-col gap-6 p-6 lg:flex-row">
      <section id="font-lab-preview" className="flex flex-col items-center gap-3 lg:flex-1">
        <div id="font-lab-frame-picker" role="group" aria-label="Frame size" className="flex gap-2">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={frameId === f.id}
              onClick={() => {
                setLoaded(false)
                setFrameId(f.id)
              }}
              className="min-h-11 rounded-md border border-border px-4 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-ring"
            >
              {f.label}
            </button>
          ))}
        </div>
        <iframe
          id="font-lab-frame"
          key={frame.id}
          ref={frameRef}
          src="/"
          title="The app with the chosen font"
          width={frame.width}
          height={frame.height}
          onLoad={() => setLoaded(true)}
          className="max-w-full rounded-xl border border-border bg-background shadow-sm"
        />
      </section>

      <section id="font-lab-choices" className="flex w-full flex-col gap-3 lg:w-[26rem]">
        <h1 className="text-xl font-semibold">Fonts</h1>
        <ul className="flex flex-col gap-2">
          {PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={p.id === presetId}
                onClick={() => setPresetId(p.id)}
                className="min-h-11 w-full rounded-md border border-border px-3 py-2 text-left text-sm aria-pressed:border-primary aria-pressed:bg-primary/10 focus-ring"
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
        <article
          id="font-lab-notes"
          className="flex flex-col gap-2 rounded-xl border border-border bg-secondary p-4 text-sm"
          style={{ fontFamily: `'${preset.body}', system-ui, sans-serif` }}
        >
          <p
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: `'${preset.title ?? preset.body}', system-ui, sans-serif` }}
          >
            AI Prompt URL Generator
          </p>
          <p>Open in ChatGPT. 1,284 characters, 212 words. 0123456789</p>
          <p className="text-[0.8125rem] text-muted-foreground">Keeps this chat out of your history.</p>
          <p>{preset.summary}</p>
          <p>
            <strong className="font-medium">Good:</strong> {preset.good}
          </p>
          <p>
            <strong className="font-medium">Watch:</strong> {preset.watch}
          </p>
        </article>
      </section>
    </main>
  )
}
