// Auto-save to a file on your computer, when the app is served by run.py.
// Everywhere else (GitHub Pages, the preview) this quietly does nothing and
// the universe stays in the browser's storage.

let disk = null;          // { file } when run.py is serving the app
let timer = null;
let pending = null;
const listeners = new Set();

export const onDiskSave = (fn) => listeners.add(fn);
const tell = (status) => listeners.forEach((fn) => { try { fn(status); } catch { /* ignore */ } });

/** Ask the local server whether it can save; resolves quickly either way. */
export async function detectDisk(timeoutMs = 900) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch('api/status', { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    disk = j?.disk ? { file: j.file || 'data/universe.json' } : null;
  } catch { disk = null; }
  return disk;
}

export const diskInfo = () => disk;

/** The universe saved on disk, or null. */
export async function loadFromDisk() {
  if (!disk) return null;
  try {
    const res = await fetch('api/universe', { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/** Save soon (debounced): many quick changes become one write. */
export function queueDiskSave(json) {
  if (!disk) return;
  pending = json;
  clearTimeout(timer);
  timer = setTimeout(flush, 1200);
}

async function flush() {
  if (!disk || pending == null) return;
  const body = pending;
  pending = null;
  try {
    const res = await fetch('api/universe', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
    tell(res.ok ? { ok: true, at: Date.now(), file: disk.file } : { ok: false });
  } catch { tell({ ok: false }); }
}

/** When the tab closes, send whatever hasn't been written yet. */
export function flushDiskNow(json) {
  if (!disk) return;
  clearTimeout(timer);
  const body = json ?? pending;
  pending = null;
  if (body && navigator.sendBeacon) navigator.sendBeacon('api/universe', new Blob([body], { type: 'application/json' }));
}
