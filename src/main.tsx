import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import.meta.env.BASE_URL

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ("serviceworker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL}service-worker.js`

    );
  });
}