/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

// A new version takes over at once. Without this it waited until every
// window of the installed app was closed, which on a phone can be days.
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// The page itself comes from the network first, so a visit after a deploy
// shows the new build at once. The cache was first, and the old page showed
// until the next visit. "no-cache" asks the server, past its 10 minute
// max-age. Offline, or after 3 seconds, the precached page answers.
// This route goes first, so it wins over the precache route for the page.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 3,
      fetchOptions: { cache: 'no-cache' },
      plugins: [{ handlerDidError: async () => (await matchPrecache('index.html')) ?? Response.error() }],
    })
  )
)

// The scripts, the styles and the fonts have a hash in their names, so a
// cached copy is never stale. They stay cache-first for speed and offline use.
precacheAndRoute(self.__WB_MANIFEST)
