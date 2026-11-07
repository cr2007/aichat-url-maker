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

// The greeting goes last, so it does not delay the first paint.
printBanner()
