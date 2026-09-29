/**
 * The picture that the browser console shows.
 *
 * The builder is pure, so the tests can read the message without a browser.
 * `main.tsx` prints it once, after the app mounts.
 *
 * The console shows the picture and nothing else. The page already explains
 * itself, and the console is not a second place to do that.
 *
 * The art is text, not an image. A console draws no image tag, and Chrome
 * does not load a background image from a console style, so a picture can
 * only arrive as characters.
 *
 * Each cell was matched by shape, not by brightness alone: every candidate
 * character was drawn, reduced to a grid of segments, and compared against
 * the same grid taken from the picture. Box drawing characters therefore
 * land on the edges, which a plain brightness ramp cannot do.
 *
 * The style sets both the ink and the paper. A console has its own theme that
 * the page cannot read, so art that borrows the console colour arrives as a
 * negative on one theme or the other. Fixed colours look the same on both.
 * Every row is padded to the same width, so the paper is one clean rectangle.
 */

/** The art, 64 columns by 34 rows. */
const PICTURE = [
  "                     ┌╓╗╗╣▒▒▒▒▒▒▒▒▒▒╣╗╖╓┌                       ",
  "                 ╓╗▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒╣╣╣╣▒▒▒▒╗╓                   ",
  "              ╓╣▒▒▒▓▓▓▓▓▒▒▒▒▒▒╣╣║║║░░░╝║╣▒▒▒▒▒╣┌                ",
  "            ╔▒▒▒▒▓▓██▓▒▒▒▒▒▒▒▒╣╣╣╣╣║║║╗░░╝║╣╣▒▒▒▒┐              ",
  "          ╔▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒╣╣╣║║║░░╔╗║║║║╣▒▒╣─            ",
  "         ▒▒▒▒▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒╣╣╣╣╣╣║║╗╗░░░╔░░░╝░╝╝╣▒▒░           ",
  "       ┌▒▓▒▒▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒╣╣╣╣╣╣╣║║║║╗╗╗╗╗╔░░░░╝║╣╣┌          ",
  "      ─▒▓▓▒▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒╣╣╣▒▒╣╣╣╣╣║║║║║╗╝╗░░░░░║╣╗          ",
  "      ▐▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒╣╣╣╣╣╣║║║╗░░░░░┘░░║░         ",
  "      ▒▓▓▒▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒╣╣╣╣╣║║║║║╗╔░░─  ░╗░        ",
  "     ╘▓▓▒▒▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒╣▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒╣║░┌   ╘╗        ",
  "     ╔▓▓▒▒▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒╣╣╣╣╣▒▒▒▒▒▒▒▒▒▒▒▒║╗░░   ╙╗       ",
  "     ║▓▒▒▒▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒╣║║╣▒▒▓▓▓████▓▓▓▒▒║░░░  ║░      ",
  "     ╠▒▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▒▓▓▓▓▓▒▒▒╣╝░╚║▒▓▓▓███▓▓▒▒▒╣╗░░░░┌─╙╗      ",
  "     ╬▒▒▒▒▒▓▓▓███████▓▓▓▓▓▓▓▒▒╣░┘──░║▒▓▓▓▓▓▓▓▒▒▒╣╣╗░░░░┌─║─     ",
  "     ▒▒▒▒▒▓▒▒▒▒▒▒▒▒▒╣╣▒▒▒▒▒▒▒▒╣║░░░╔║╣▒▒▒▒▒▒▒▒▒▒╣║░░░░░░┌░      ",
  "     ▒╣▒▒▒▒▒▒╣░░░░░░░║╣▒▒▒▓▓▓▒▒╣║╝╝╣▒▒▒▓▓▒▒▒▒▒▒╣║░░░░░░░┘░      ",
  "     ╣▒▒▒▓▒▒▒╣╗░░░░░░░░║▒▓▓█▓▓▒▒╣╗╗║║║▒▓▓▓▓▓▓▒▒▒╣╗╔╔░░░░┘░─     ",
  "     ╙▒▒▒▓▓▓▒▒╣║╗░░░┘└░▒▓██▓▓▒▒▒▒╣╣║║╗╝╣▒▓█▓▓▓▓▒▒╣╣║║░░░░░─     ",
  "      ▒╣▒▒▓▓▓▒▒▒╣║╗░░░╣▒▓▓▓▒▒▒▒▒╣╗░░╔║╣║░▒▓▓██▓▓▒▒╣╣║░░░░└      ",
  "      ║▒▒▒▓▓▓▓▒▒▒▒╣╣╣▒▓▓▓▓▓▓▒▒▒▒╣░░└░▒▓▓▒╣▒▒███▓▓▒╣╣║╗░░─       ",
  "      ╙▒▒▒▓▓▓▓▓▓▒▒▒▒▓███▓▓▓▒▒▒▒▒╣░░─╔▓█▓▒▒╣▒██▓▓▓▒╣║║╗╗░        ",
  "       └▒▒▓▓▓▓▓▓▓▓▓▓███▓▓▓▓▒▒▒▒▒║░░─▐▓█▓▓▒▒▒██▓▓▒▒▒╣╣╣╗─        ",
  "        └▒▓▓▓▓▓▓▓▓▓███▓▓▓▓▒▒▒▒▒╣║╗░░▒▓▒▒▒▒▒▒▓▓▓▓▓▒▒▒▒╝          ",
  "         └▒▓▓▓▓▓▓▓███▓▓▓▓▒▒▒▒▒▒╣║╗░░║╣╝║▒╣╣▒▒▓▓▓▓▒▒▒╜           ",
  "           ╟▓▓▓▓▓██▓▓▒▒▒▒▒▒▒╣╣╣╣╣║░░░░╔╣╣╣▒▒▓▓▒▒▒▒╝             ",
  "            │▓█▓▓▓▒▒▒▒▒▒▒▒╣╣╣▒▒▒▒╣║░░║▒▒╣▒▒▒╣╣╣╣╣░              ",
  "        ╓▄▄▓▓█▓▓▒▒▒▒▒▒▒▒▒▒╣╣║╣▒▒▒▒╣║╣▒▒▒▒▒╣▒▒▒╣╝░░░┌┌┌          ",
  "    ┌╔▄▓▓▓▓██▓▓▓▓▒▒▒▒▒▒▒▒╣╣╣║║║║▒▒▒▒▓▓▓▓▒▒▒▒╣║░░║╣║╔╔╔▒▒╗░┌     ",
  "╓╢▒▒▒▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒╣║║╝╝╝╝╝╝╝╝░▒▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒║║╣║░▒▒▒║░░░┌  ",
  "╣▒▒▒▒▓▓▓▓▓▓▒▒▒▒▒▒▒╣╣╣║░░░░░░░░░░╗▓▓▓▓▓▓▓▒▒▒▒▒▒╣╣╣╣╣║░░▒▒╣╣╣╗╔╗╗░",
  "░║║╣▒▒▒▒▒▒▒▒▒▒▒╣║╣╣║║░░░░┘└─    ▓▓▒▒▒▒▒▒▒▒▓▓▒▒▒▒▒╣░╔║▒▓▒╣▒╣║║║▒▒",
  "╗║╣▒▒▒▒▒▒▒▒▒▒╣║╝░░╝╝╝░░░┘└─    ╠██▓▒▓▓▓▓▓▒▒▒▒▒▒╣╣╗╗║▒▓▒╣╣▒║║╣╣▒▒",
  "╣╣▒▒▒▒▒║╝║╣╣╣╣║░░░░░░░░└─      ▓██▓▓▒▓▓▓▒▒▒▒▒▒╣╣╣╝░▒▓▓╣╣╣╣░╣╣║▒▒",
].join("\n")

/** The paper behind the art. The picture has a light background. */
const PAPER = "#f4f4f5"

/** The ink. It gives 15:1 against {@link PAPER}. */
const INK = "#18181b"

/**
 * Builds the arguments for one `console.log` call.
 *
 * Each `%c` marker takes the next style, so the count of markers and the
 * count of styles must agree.
 *
 * @returns The format string, then the style for the `%c`.
 *
 * @example
 * ```ts
 * console.log(...bannerArguments())
 * ```
 */
export function bannerArguments(): string[] {
  // Step 1.1: keep a blank line above and below, so the console does not
  // press the art against the message beside it.
  const message = `%c\n${PICTURE}\n`

  // Step 1.2: set the ink and the paper, so the console theme cannot invert
  // the picture. The line height keeps the rows touching, which is what
  // makes the shading read as one picture.
  return [message, `background-color:${PAPER};color:${INK};line-height:1.05`]
}

/**
 * Prints the art.
 *
 * The call is wrapped, because a browser extension can replace `console.log`
 * with something that throws. A greeting must never stop the app.
 *
 * @param log - The function to print with. The default is `console.log`.
 */
export function printBanner(log: (...args: string[]) => void = console.log): void {
  try {
    log(...bannerArguments())
  } catch {
    // A console that refuses the message costs the reader nothing.
  }
}
