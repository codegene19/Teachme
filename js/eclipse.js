// Eclipse: one word of a sentence goes dark. Listen, then find it.
// Active recall built from your own constellations.

import { state, derived, bumpSeen, bumpStat, commit } from './store.js';
import { sentenceSegments, pickRandom, optionsFor } from './language.js';
import { app, h, fill, icon, openModal, closeModal, toast } from './ui.js';
import { arpeggio, chime, errorSound, speak, unlockAudio } from './sfx.js';
import { speechOpts } from './panels.js';

export function initEclipse() {
  app.eclipse = { start, available };
}

function pool() {
  return Object.values(state.constellations).filter((c) => c.tokens.some((t) => t.var && optionsFor(t, state.words, derived.byCat).length >= 2));
}
export const available = () => pool().length > 0;

function shuffled(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function start() {
  if (!available()) {
    toast({ kind: 'info', title: 'No eclipse possible yet', body: 'Save a constellation with a variable that has at least two stars to choose from.' });
    return;
  }
  unlockAudio();
  round();
}

function round() {
  const c = pickRandom(pool());
  const tokens = c.tokens.map((t) => (t.var ? { ...t, wordId: pickRandom(optionsFor(t, state.words, derived.byCat)) || t.wordId } : { ...t }));
  const candidates = tokens.map((t, i) => [t, i]).filter(([t]) => t.var && optionsFor(t, state.words, derived.byCat).length >= 2);
  const [hiddenTok, hiddenIdx] = pickRandom(candidates);
  const answer = hiddenTok.wordId;
  const cat = state.categories[state.words[answer].cat];
  const others = shuffled(optionsFor(hiddenTok, state.words, derived.byCat).filter((id) => id !== answer)).slice(0, 3);
  const choices = shuffled([answer, ...others]);
  const segs = sentenceSegments(tokens, state.words);
  const text = segs.map((s) => s.sep + s.text).join('') + c.end;
  let answered = false;

  const hole = h('span', { class: 'eclipse-hole', style: { '--c': cat.color } }, h('span', { class: 'eclipse-disc' }), h('span', { class: 'eclipse-cat' }, cat.label));
  const sentence = h('p', { class: 'sentence eclipse-sentence' },
    ...segs.flatMap((s) => [s.sep, s.index === hiddenIdx ? hole : h('span', { class: 'w' }, s.text)]),
    h('span', { class: 'end' }, c.end));
  const status = h('p', { class: 'eclipse-status', 'aria-live': 'polite' }, 'Listen — which word is hidden in the shadow?');
  const streak = h('span', { class: 'pill' }, `streak ${state.stats.streak} · best ${state.stats.bestStreak}`);
  const nextBtn = h('button', { class: 'btn primary', hidden: true, onclick: round }, 'Next eclipse', icon('arrow', 16));
  const buttons = choices.map((id) => h('button', {
    class: 'eclipse-opt', style: { '--c': cat.color },
    onclick: () => pick(id),
  }, state.words[id].text));

  function pick(id) {
    if (answered) return;
    answered = true;
    const right = id === answer;
    buttons.forEach((b, k) => {
      b.disabled = true;
      if (choices[k] === answer) b.classList.add('right');
      else if (choices[k] === id) b.classList.add('wrong');
    });
    fill(hole, h('span', { class: 'w revealed', style: { '--c': cat.color } }, segs.find((s) => s.index === hiddenIdx).text));
    hole.classList.add('lit');
    bumpStat('eclipses');
    if (right) {
      state.stats.streak++;
      state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
      bumpSeen([answer], 3);
      arpeggio(tokens.map((t) => state.words[t.wordId].cat), 0.05);
      status.textContent = state.stats.streak > 1 ? `Light returns. ${state.stats.streak} in a row.` : 'Light returns.';
    } else {
      state.stats.streak = 0;
      bumpSeen([answer]);
      errorSound();
      status.textContent = `It was “${state.words[answer].text}”. The pattern stays the same — only the word changed.`;
    }
    streak.textContent = `streak ${state.stats.streak} · best ${state.stats.bestStreak}`;
    commit();
    nextBtn.hidden = false;
    nextBtn.focus();
  }

  openModal({
    kicker: `Eclipse · ${c.name}`,
    title: '',
    size: 'wide eclipse',
    body: h('div', { class: 'stack' },
      sentence, status,
      h('div', { class: 'eclipse-opts' }, buttons),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => speak(text, speechOpts()) }, icon('speak', 16), 'Hear again'),
        h('span', { class: 'grow' }), streak)),
    footer: [h('button', { class: 'btn ghost', onclick: closeModal }, 'Done'), nextBtn],
  });
  chime(cat.id, { gain: 0.3, dur: 1.6, shift: -5 });
  speak(text, speechOpts());
}
