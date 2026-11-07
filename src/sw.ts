/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

// A new version takes over at once. Without this it waited until every
// window of the installed app was closed, which on a phone can be days.
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
