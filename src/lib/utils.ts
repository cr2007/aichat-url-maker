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
 * Counts the words in a string.
 *
 * A word is a group of characters between spaces. The function ignores
 * spaces at the start and at the end. It also ignores repeated spaces,
 * new lines and tabs.
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
  // Step 1.1: divide the text at each group of spaces. Spaces at the start
  // or at the end make empty strings.
  // Step 1.2: remove the empty strings. They are not words.
  return text.split(/\s+/).filter(Boolean).length
}
