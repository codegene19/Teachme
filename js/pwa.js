// Installable app: registers the service worker (offline use) and keeps the
// browser's install prompt so Settings can offer "Install Lexicosmos".

let deferred = null;
let offlineReady = false;
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

export function initPwa() {
  const canRegister = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.isSecureContext;
  if (canRegister) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const ready = () => { offlineReady = true; notify(); };
      if (reg.active) ready();
      else (reg.installing || reg.waiting)?.addEventListener('statechange', (e) => { if (e.target.state === 'activated') ready(); });
    }).catch(() => { /* no sw.js here (e.g. a hosted preview) — the app still works online */ });
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

export const onPwaChange = (f) => { listeners.add(f); return () => listeners.delete(f); };
export const installed = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
export const canInstall = () => !!deferred;
export const isOfflineReady = () => offlineReady;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
  deferred = null;
  notify();
  return outcome === 'accepted';
}
