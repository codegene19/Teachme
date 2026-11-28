// Speak it back: the browser listens while you say a sentence, then each
// word you said is checked against the sentence. Uses the Web Speech API
// (Chrome, Edge, Safari, Android); elsewhere the button explains why it's off.

import { h, fill, icon } from './ui.js';
import { fold } from './language.js';
import { speechLang } from './panels.js';
import { recordSpoken } from './progress.js';

const Rec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const canListen = () => !!Rec;

const words = (s) => fold(String(s).toLowerCase()).replace(/[’‘`´]/g, "'").replace(/[.,!?;:"“”«»()¿¡…]/g, ' ').split(/[\s']+/).filter(Boolean);

/** Which words of `target` were heard (in order), and the share heard. */
export function compareSpoken(target, heard) {
  const t = words(target), x = words(heard);
  const n = t.length, m = x.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = t[i] === x[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ok = new Array(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (t[i] === x[j]) { ok[i] = true; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const score = n ? ok.filter(Boolean).length / n : 0;
  return { ok, score };
}

let active = null;

/** Listen once. Resolves with the best of the recogniser's guesses for `target`. */
function listen(target, onInterim) {
  return new Promise((resolve, reject) => {
    const r = new Rec();
    r.lang = speechLang() || 'it-IT';
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.continuous = false;
    let best = null;
    r.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      const alts = [...res].map((a) => a.transcript);
      if (!res.isFinal) { onInterim?.(alts[0]); return; }
      // several guesses come back; keep the one closest to the sentence
      for (const a of alts) {
        const c = compareSpoken(target, a);
        if (!best || c.score > best.score) best = { text: a, ...c };
      }
    };
    r.onerror = (e) => { active = null; reject(e.error || 'error'); };
    r.onend = () => { active = null; resolve(best); };
    active = r;
    r.start();
  });
}

export function stopListening() { try { active?.stop(); } catch { /* already stopped */ } }

const ERRORS = {
  'not-allowed': 'Microphone blocked. Allow it in the browser’s site settings, then try again.',
  'service-not-allowed': 'Speech recognition is turned off in this browser.',
  'no-speech': 'I didn’t hear anything — tap the mic and speak.',
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection in this browser.',
};

/**
 * A "Say it" control for one sentence: mic button, live transcript, then the
 * sentence with each word marked heard / missed. `onDone({ score })` after each try.
 */
export function speakBack(target, { onDone, compact = false } = {}) {
  const status = h('div', { class: 'sb-status', 'aria-live': 'polite' });
  if (!canListen()) {
    return h('div', { class: 'speakback off' },
      h('button', { class: 'btn small ghost', disabled: true, title: 'Speaking practice needs Chrome, Edge or Safari' }, icon('mic', 16), 'Say it'),
      compact ? null : h('small', { class: 'dim' }, 'Speaking practice needs Chrome, Edge or Safari.'));
  }
  const btn = h('button', { class: 'btn small sb-btn', 'aria-label': 'Say the sentence aloud' }, icon('mic', 16), h('span', {}, 'Say it'));
  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) { stopListening(); return; }
    busy = true;
    btn.classList.add('listening');
    btn.lastChild.textContent = 'Listening… tap to stop';
    fill(status, h('span', { class: 'sb-live' }, '…'));
    try {
      const best = await listen(target, (t) => fill(status, h('span', { class: 'sb-live' }, t)));
      if (!best) { fill(status, h('span', { class: 'dim' }, ERRORS['no-speech'])); return; }
      const tw = String(target).replace(/[.!?¿¡]/g, '').split(/\s+/).filter(Boolean);
      // map heard flags (computed on folded words) back to the sentence's own words
      const flags = [];
      let k = 0;
      for (const wd of tw) { const parts = words(wd).length || 1; flags.push(best.ok.slice(k, k + parts).every(Boolean)); k += parts; }
      const pct = Math.round(best.score * 100);
      const verdict = pct === 100 ? '✦ Perfect — every word came through.' : pct >= 75 ? `Good — ${pct}% of the words came through.` : `${pct}% came through. Listen again, then try once more.`;
      fill(status,
        h('p', { class: 'sb-words' }, tw.map((wd, i) => h('span', { class: flags[i] ? 'ok' : 'miss', title: flags[i] ? 'heard' : 'not heard' }, wd)).flatMap((x, i) => (i ? [' ', x] : [x]))),
        h('small', { class: `sb-verdict ${pct >= 75 ? 'good' : 'low'}` }, verdict),
        h('small', { class: 'dim' }, `Heard: “${best.text}”`));
      recordSpoken(best.score);
      onDone?.({ score: best.score });
    } catch (err) {
      fill(status, h('span', { class: 'dim' }, ERRORS[err] || 'Speech recognition stopped. Try again.'));
    } finally {
      busy = false;
      btn.classList.remove('listening');
      btn.lastChild.textContent = 'Say it again';
    }
  });
  return h('div', { class: `speakback${compact ? ' compact' : ''}` }, btn, status);
}
