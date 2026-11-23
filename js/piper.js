// Piper: open-source neural voices that run inside the browser.
// A voice downloads once (about 30–80 MB), is kept in the browser's private
// storage, and then works offline. Everything here fails soft: if Piper
// can't load, speech falls back to the device voice.

const LIB = new URL('./vendor/piper-tts-web/piper-tts-web.js', import.meta.url).href;

/** Voices offered per language pack. The first one is the default. */
export const PIPER_VOICES = {
  it: [
    { id: 'it_IT-paola-medium', name: 'Paola', note: 'female · natural · 64 MB' },
    { id: 'it_IT-riccardo-x_low', name: 'Riccardo', note: 'male · lighter, less natural · 28 MB' },
  ],
  es: [
    { id: 'es_ES-davefx-medium', name: 'Davefx', note: 'Spain · male · 63 MB' },
    { id: 'es_ES-sharvard-medium', name: 'Sharvard', note: 'Spain · 77 MB' },
    { id: 'es_MX-claude-high', name: 'Claude', note: 'Mexico · high quality · 63 MB' },
    { id: 'es_MX-ald-medium', name: 'Ald', note: 'Mexico · male · 63 MB' },
  ],
  en: [
    { id: 'en_US-hfc_female-medium', name: 'HFC', note: 'US · female · 63 MB' },
    { id: 'en_US-lessac-medium', name: 'Lessac', note: 'US · 63 MB' },
  ],
};

let lib = null;
const sessions = new Map();   // voiceId -> Promise<TtsSession>
const status = new Map();     // voiceId -> { state, progress, error }
const listeners = new Set();
const cache = new Map();      // `${voiceId}|${text}` -> object URL
let player = null;
let playing = null;

export const onPiperStatus = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const piperStatus = (voiceId) => status.get(voiceId) || { state: 'idle', progress: 0 };
function setStatus(voiceId, s) {
  status.set(voiceId, { ...piperStatus(voiceId), ...s });
  listeners.forEach((fn) => { try { fn(voiceId); } catch { /* ignore */ } });
}

const loadLib = () => (lib ||= import(LIB).catch((err) => { lib = null; throw err; }));

/** Load (and if needed download) a voice. Safe to call repeatedly. */
export function preparePiper(voiceId) {
  if (sessions.has(voiceId)) return sessions.get(voiceId);
  setStatus(voiceId, { state: 'loading', progress: 0, error: null });
  const p = (async () => {
    const { TtsSession } = await loadLib();
    // The library shares one session and never reloads its model when the
    // voice changes, so start a fresh one for each voice.
    TtsSession._instance = null;
    const session = await TtsSession.create({
      voiceId,
      progress: (pr) => { if (pr?.total && /\.onnx$/.test(pr.url || '')) setStatus(voiceId, { progress: pr.loaded / pr.total }); },
    });
    setStatus(voiceId, { state: 'ready', progress: 1 });
    return session;
  })();
  p.catch((err) => {
    sessions.delete(voiceId);
    setStatus(voiceId, { state: 'error', error: String(err?.message || err) });
  });
  sessions.set(voiceId, p);
  return p;
}

/** Voices already saved on this device. */
export async function storedVoices() {
  try { return await (await loadLib()).stored(); } catch { return []; }
}

export async function removePiperVoice(voiceId) {
  try { await (await loadLib()).remove(voiceId); } catch { /* nothing stored */ }
  sessions.delete(voiceId);
  for (const k of [...cache.keys()]) if (k.startsWith(`${voiceId}|`)) { URL.revokeObjectURL(cache.get(k)); cache.delete(k); }
  setStatus(voiceId, { state: 'idle', progress: 0, error: null });
}

async function synth(voiceId, text) {
  const key = `${voiceId}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const session = await preparePiper(voiceId);
  const url = URL.createObjectURL(await session.predict(text));
  cache.set(key, url);
  if (cache.size > 150) { const [k, v] = cache.entries().next().value; URL.revokeObjectURL(v); cache.delete(k); }
  return url;
}

/**
 * Prime the one audio element we reuse, inside a user gesture, so phones
 * let it play later even after an asynchronous synthesis.
 */
export function unlockPiperAudio() {
  if (player) return;
  player = new Audio();
  player.preload = 'auto';
  // 0.05 s of silence
  player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  player.play().catch(() => {});
}

export function stopPiper() {
  if (player && !player.paused) player.pause();
  playing?.();
}

/** Speak with Piper. Resolves true when finished, false if it could not play. */
export async function speakPiper(voiceId, text, rate = 0.9) {
  const url = await synth(voiceId, text);
  if (!player) player = new Audio();
  stopPiper();
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (done) return; done = true; playing = null; player.onended = null; player.onerror = null; resolve(ok); };
    playing = () => finish(true);
    player.onended = () => finish(true);
    player.onerror = () => finish(false);
    player.src = url;
    player.playbackRate = Math.max(0.5, Math.min(1.5, rate / 0.9));
    if ('preservesPitch' in player) player.preservesPitch = true;
    player.play().catch(() => finish(false));
  });
}
