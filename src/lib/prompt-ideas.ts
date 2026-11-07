/**
 * Example prompts for the empty prompt field. Each one is short, so it fits
 * the field on a phone, and plain, so a person who has never heard the word
 * "prompt" sees what to type. The first one is the one that the prerendered
 * page shows.
 */
export const PROMPT_IDEAS: readonly string[] = [
  "Plan a 3-day trip to Goa",
  "Explain how a mortgage works in simple words",
  "Write a polite email to ask for a day off",
  "Give me a 20-minute dinner recipe with eggs",
  "Summarize the main ideas of a book I name",
  "Help me prepare for a job interview",
  "Make a weekly workout plan for a beginner",
  "Explain this error message and how to fix it",
  "Write a birthday message for my grandmother",
  "Compare two phones under a budget I give",
  "Teach me 10 useful phrases in Spanish",
  "Turn my notes into a short report",
  "Suggest names for a small bakery",
  "Explain photosynthesis to a 10-year-old",
  "Write a cover letter for a teacher job",
  "Make a shopping list for a week of meals",
  "Find the best time of year to visit Japan",
  "Check my paragraph for grammar mistakes",
  "Plan a study schedule for my exams",
  "Explain the news about interest rates",
  "Write a short story about a lost cat",
  "Give me ideas for a rainy day with kids",
  "Help me write a complaint to my landlord",
  "Explain what an API is with an example",
  "Make a budget plan for a monthly salary",
  "Suggest a reading list about history",
  "Write a thank-you note to a colleague",
  "Plan a small garden for a balcony",
  "Explain the rules of cricket simply",
  "Draft a message to cancel a subscription",
]

/**
 * Picks an idea that is not the one on the screen now.
 *
 * @param current - The index of the idea on the screen.
 * @param random - A number from 0 to 1. The default is `Math.random()`.
 * @returns The index of the next idea. It differs from `current`.
 */
export function nextIdeaIndex(current: number, random: number = Math.random()): number {
  // Step 1.1: choose from every idea except the current one, so the text
  // always changes.
  const step = 1 + Math.floor(random * (PROMPT_IDEAS.length - 1))
  return (current + step) % PROMPT_IDEAS.length
}
