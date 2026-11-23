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

let voicesCache = [];
export function getVoices() {
  if (!speechSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}
if (speechSupported()) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => getVoices());
  getVoices();
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** Speak text. Resolves when done (or after a safety timeout). */
export function speak(text, { rate = 0.9, voiceURI = '', lang = '', onBoundary } = {}) {
  return new Promise((resolve) => {
    if (!speechSupported() || !text) { resolve(false); return; }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      const voices = getVoices();
      let v = voiceURI ? voices.find((x) => x.voiceURI === voiceURI) : null;
      if (!v && lang) {
        const base = lang.slice(0, 2).toLowerCase();
        v = voices.find((x) => x.lang?.toLowerCase() === lang.toLowerCase())
          || voices.find((x) => x.lang?.toLowerCase().startsWith(base));
      }
      if (v) { u.voice = v; u.lang = v.lang; } else if (lang) u.lang = lang;
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
