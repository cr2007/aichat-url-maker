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
if (import.meta.env.DEV && new URLSearchParams(location.search).has('fonts')) {
  // The font lab is for the dev server only. The build removes this branch.
  void import('./dev/font-lab.tsx').then(({ default: FontLab }) => {
    createRoot(container).render(<FontLab />)
  })
} else if (container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}

// The greeting goes last, so it does not delay the first paint.
printBanner()
