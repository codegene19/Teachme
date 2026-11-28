// Lexicosmos service worker: the whole app works offline once it has loaded.
//
// App files are fetched from the network first (so updates arrive as soon as
// you are online) and fall back to the cache when you are not. Fonts and the
// pinned CDN libraries are cached on first use. The save API is never cached,
// and Piper's voice models are skipped: the Piper library keeps them in its
// own browser storage.

const VERSION = 'lexicosmos-v2';
const SHELL = [
  './', './index.html', './manifest.json', './css/styles.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
  './js/charts.js', './js/daily.js', './js/disk.js', './js/drift.js', './js/eclipse.js', './js/english.js', './js/forge.js', './js/galaxy.js',
  './js/generate.js', './js/genesis.js', './js/language.js', './js/logbook.js', './js/main.js', './js/memory.js',
  './js/missions.js', './js/order.js', './js/panels.js', './js/piper.js', './js/practice.js', './js/progress.js', './js/pwa.js', './js/seed.js',
  './js/sfx.js', './js/space.js', './js/speakback.js', './js/store.js', './js/ui.js',
  './js/packs/conjugate.js', './js/packs/en.js', './js/packs/es-extra.js', './js/packs/es-agree.js', './js/packs/it-agree.js', './js/packs/es.js', './js/packs/index.js',
  './js/packs/it-extra.js', './js/packs/it.js',
  './js/vendor/piper-tts-web/piper-tts-web.js', './js/vendor/piper-tts-web/piper-o91UDS6e.js', './js/vendor/piper-tts-web/voices_static-D_OtJDHM.js',
];
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const skip = (url) => url.pathname.includes('/api/') || /\.(onnx|onnx\.json)$/.test(url.pathname) || url.hostname.endsWith('huggingface.co');

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (skip(url)) return;
  if (url.origin === location.origin) e.respondWith(networkFirst(req));
  else if (RUNTIME_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(req));
});
