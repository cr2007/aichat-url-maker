import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Joins class names and removes Tailwind conflicts.
 *
 * The function ignores a false, null or undefined value. If two classes set
 * the same Tailwind property, the last class wins.
 *
 * @param inputs - The class names to join.
 * @returns One class name string.
 *
 * @example
 * ```ts
 * cn("px-2", isWide && "px-4") // "px-4" when isWide is true
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The scripts that do not put spaces between words. A space-based count gives
 * one word for a whole sentence in these scripts.
 */
const UNSPACED_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u

/**
 * The segmenters, made once. A new segmenter for each group of words took
 * about 1.4 seconds a key after a paste of 100,000 mixed characters.
 */
const GRAPHEME_SEGMENTER = new Intl.Segmenter()
const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "word" })

/**
 * A character outside ASCII, or a CR LF pair. Text without one has one
 * visible character for each UTF-16 unit, so no segmenter is needed.
 */
const NEEDS_SEGMENTER = /[\u0080-\uffff]|\r\n/

/** One or more spaces, tabs or new lines: the edge between two words. */
const WHITESPACE = /\s+/

/**
 * Counts the characters that a person sees.
 *
 * A family emoji or a flag is one character on the screen, but it is several
 * UTF-16 units. `String.length` counts the units, so this function counts
 * grapheme clusters instead.
 *
 * @param text - The text to count.
 * @returns The number of visible characters. Empty text gives 0.
 *
 * @example
 * ```ts
 * countCharacters("a\u{1F44D}\u{1F3FD}") // 2
 * ```
 */
export function countCharacters(text: string): number {
  // Step 1.1: plain ASCII text has one character for each unit. A phone took
  // about 100ms a key to segment a long pasted document.
  if (!NEEDS_SEGMENTER.test(text)) return text.length

  // Step 1.2: take the text apart at the edges that a person sees. Count in a
  // loop: `Array.from` built one array entry per character, and on a long
  // paste the garbage collector then ran on every key.
  const segments = GRAPHEME_SEGMENTER.segment(text)[Symbol.iterator]()
  let count = 0
  while (!segments.next().done) count++
  return count
}

/**
 * Counts the words in a string.
 *
 * A word is a group of characters between spaces. The function ignores
 * spaces at the start and at the end. It also ignores repeated spaces,
 * new lines and tabs. A group in a script without spaces, such as Chinese or
 * Thai, is divided into its words with the browser dictionary.
 *
 * @param text - The text to count. This text comes from a textarea.
 * @returns The number of words. Empty text gives 0.
 *
 * @example
 * ```ts
 * countWords("  hello   world \n") // 2
 * ```
 */
export function countWords(text: string): number {
  let count = 0
  // Step 1.1: divide the text at each group of spaces. Spaces at the start
  // or at the end make empty strings. They are not words.
  for (const group of text.split(WHITESPACE)) {
    if (!group) continue

    // Step 1.2: count a group in a spaced script as one word.
    if (!UNSPACED_SCRIPT.test(group)) {
      count++
      continue
    }

    // Step 1.3: a group in an unspaced script holds many words. Count the
    // pieces that the dictionary marks as words, not the punctuation.
    for (const part of WORD_SEGMENTER.segment(group)) {
      if (part.isWordLike) count++
    }
  }
  return count
}

/**
 * Writes text to the clipboard.
 *
 * Every failure gives `false`, so one branch covers them all. A direct call to
 * `navigator.clipboard.writeText` cannot do this: an insecure origin has no
 * clipboard, so reading `writeText` throws at once, and a `.catch()` on the
 * call never sees that error.
 *
 * @param text - The text to write.
 * @returns True if the text reached the clipboard.
 *
 * @example
 * ```ts
 * if (!(await copyText(url))) showTheFallback()
 * ```
 */
export async function copyText(text: string): Promise<boolean> {
  // Step 1.1: stop if the browser gives no clipboard.
  if (!navigator.clipboard) return false

  // Step 1.2: write. The browser refuses the permission on some origins,
  // which rejects.
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
