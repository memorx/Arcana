/**
 * Custom service worker code. next-pwa compiles this file into public/worker-<buildId>.js and loads it
 * from sw.js with importScripts (next-pwa `customWorkerDir`, "worker" by default).
 *
 * Until the redesign, a runtime rule cached Wikimedia card images in "tarot-images" (up to 100 entries).
 * The cards are self-hosted now (/cartas, cache "cartas") and that rule is gone, but Workbox only cleans
 * outdated *precaches*, never runtime caches: returning users would keep those images forever.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("tarot-images"));
});
