// Music of the spheres: every sector has its own note on a pentatonic scale,
// so any sentence you build plays as a little melody. Plus text-to-speech.

let ac = null;
let out = null;
let chimesOn = true;

export function setSoundEnabled(v) { chimesOn = !!v; }

export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      const master = ac.createGain();
      master.gain.value = 0.55;
      const comp = ac.createDynamicsCompressor();
      // A soft feedback delay gives every chime a little cosmic tail.
      const delay = ac.createDelay(1.5);
      delay.delayTime.value = 0.33;
      const fb = ac.createGain();
      fb.gain.value = 0.36;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      const wet = ac.createGain();
      wet.gain.value = 0.32;
      out = ac.createGain();
      out.connect(master);
      out.connect(delay);
      delay.connect(lp);
      lp.connect(fb);
      fb.connect(delay);
      lp.connect(wet);
      wet.connect(master);
      master.connect(comp);
      comp.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { /* audio unavailable */ }
}

const PENTA = [0, 2, 4, 7, 9];
const DEGREE = { core: -3, uncharted: -1, who: 0, freq: 1, modal: 2, action: 3, thing: 4, place: 5, time: 6, feeling: 7, link: 9 };

function degreeOf(cat) {
  if (cat in DEGREE) return DEGREE[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return h % 10;
}

function freqOf(cat, shift = 0) {
  const d = degreeOf(cat) + shift;
  const oct = Math.floor(d / 5);
  const semis = PENTA[((d % 5) + 5) % 5] + 12 * oct;
  return 261.63 * Math.pow(2, semis / 12);
}

export function chime(cat, { gain = 0.5, dur = 1.4, delay = 0, shift = 0 } = {}) {
  if (!chimesOn || !ac || !out) return;
  try {
    const t = ac.currentTime + delay;
    const f = freqOf(cat || 'who', shift);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * 0.25), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o1 = ac.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    const o2 = ac.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.005;
    const g2 = ac.createGain();
    g2.gain.value = 0.22;
    const o3 = ac.createOscillator();
    o3.type = 'triangle';
    o3.frequency.value = f * 3.01;
    const g3 = ac.createGain();
    g3.gain.value = 0.05;
    o1.connect(g);
    o2.connect(g2).connect(g);
    o3.connect(g3).connect(g);
    g.connect(out);
    [o1, o2, o3].forEach((o) => { o.start(t); o.stop(t + dur + 0.05); });
  } catch { /* ignore */ }
}

export function arpeggio(cats, step = 0.085) {
  cats.forEach((c, i) => chime(c, { delay: i * step, gain: 0.34, dur: 1.1 }));
}

export function igniteSound(cat) {
  chime(cat, { gain: 0.7, dur: 2.8 });
  chime(cat, { gain: 0.32, dur: 2.2, delay: 0.09, shift: 5 });
}

export function errorSound() {
  chime('core', { gain: 0.35, dur: 0.5 });
  chime('core', { gain: 0.25, dur: 0.6, delay: 0.12, shift: -1 });
}

// ------------------------------------------------------------------ speech
export const speechSupported = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// "it_IT" (Android) and "it-IT" (everyone else) are the same language.
const normLang = (l) => String(l || '').replace(/_/g, '-').toLowerCase();
const baseOf = (l) => normLang(l).split('-')[0];

let voicesCache = [];
const waiters = [];
export function getVoices() {
  if (!speechSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) {
    voicesCache = v;
    waiters.splice(0).forEach((f) => f());
  }
  return voicesCache;
}

/** Resolves once the browser has listed its voices, or after `timeout` ms. */
export function whenVoicesReady(timeout = 1500) {
  if (!speechSupported()) return Promise.resolve([]);
  if (getVoices().length) return Promise.resolve(voicesCache);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(getVoices()), timeout);
    waiters.push(() => { clearTimeout(t); resolve(voicesCache); });
  });
}

const voiceListeners = new Set();
export const onVoicesChanged = (fn) => voiceListeners.add(fn);
if (speechSupported()) {
  const changed = () => { getVoices(); voiceListeners.forEach((fn) => fn()); };
  if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', changed);
  else window.speechSynthesis.onvoiceschanged = changed;
  getVoices();
}

/**
 * The best installed voice for a language ("it-IT", "es-ES"). A voice saved
 * in Settings is used only if it actually speaks that language, so an
 * English voice can never read Italian.
 */
export function voiceFor(lang, voiceURI = '') {
  const voices = getVoices();
  const want = normLang(lang);
  const base = baseOf(lang);
  const speaks = (v) => !base || baseOf(v.lang) === base;
  if (voiceURI) {
    const chosen = voices.find((x) => x.voiceURI === voiceURI);
    if (chosen && speaks(chosen)) return chosen;
  }
  if (!base) return null;
  const score = (v) => (normLang(v.lang) === want ? 8 : 0)
    + (/premium|enhanced|natural|neural/i.test(v.name) ? 4 : 0)
    + (/google/i.test(v.name) ? 2 : 0)
    + (v.localService ? 1 : 0);
  return voices.filter(speaks).sort((a, b) => score(b) - score(a))[0] || null;
}

/** 'ok', 'missing' (voices listed, none for this language), 'unknown' (no list) or 'unsupported'. */
export function voiceStatus(lang) {
  if (!speechSupported()) return 'unsupported';
  if (!getVoices().length) return 'unknown';
  if (!baseOf(lang)) return 'ok';
  return voiceFor(lang) ? 'ok' : 'missing';
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

let waitedOnce = false;
/** Speak text. Resolves when done (or after a safety timeout). */
export function speak(text, opts = {}) {
  if (!speechSupported() || !text) return Promise.resolve(false);
  // Speaking before the voice list arrives falls back to the system voice
  // (usually English), so the very first time, give the list a moment.
  if (!getVoices().length && opts.lang && !waitedOnce) {
    waitedOnce = true;
    return whenVoicesReady(700).then(() => speakNow(text, opts));
  }
  return speakNow(text, opts);
}

function speakNow(text, { rate = 0.9, voiceURI = '', lang = '', onBoundary } = {}) {
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      const v = voiceFor(lang, voiceURI);
      if (v) u.voice = v;
      // Always declare the language too: some browsers pick the voice from it.
      if (lang || v) u.lang = v ? v.lang.replace(/_/g, '-') : lang;
      let done = false;
      const timer = setTimeout(() => finish(true), 2500 + text.length * 120);
      function finish(ok) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(ok);
      }
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      if (onBoundary) u.onboundary = (e) => { if (!e.name || e.name === 'word') onBoundary(e.charIndex); };
      synth.speak(u);
    } catch { resolve(false); }
  });
}
