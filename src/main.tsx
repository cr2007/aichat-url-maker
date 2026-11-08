import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { printBanner } from './lib/console-banner.ts'

const container = document.getElementById('root')!

const tree = (
  <StrictMode>
    <App />
  </StrictMode>
)

// The production build prerenders the page into #root, so the document paints
// before this script runs. Attach to that markup instead of discarding it.
// In dev the container is empty, so render normally.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}

// A hovering pen marks the root, so hover styles apply (see index.css). A
// finger touch clears the mark, so a tap never leaves a hover behind.
const root = document.documentElement
window.addEventListener("pointermove", (event) => {
  if (event.pointerType === "pen" && event.buttons === 0 && !root.hasAttribute("data-pen-hover")) {
    root.setAttribute("data-pen-hover", "")
  }
}, { passive: true })
window.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") root.removeAttribute("data-pen-hover")
}, { passive: true })

// The greeting goes last, so it does not delay the first paint.
printBanner()
