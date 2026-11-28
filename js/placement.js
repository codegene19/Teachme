// Placement test: find where to start. It climbs the CEFR bands (A1 → C2),
// three questions each — meanings, verb forms in that band's tenses, and
// agreement / plural forms — and stops at the first band you don't pass
// (2 of 3). You start at that band's first level, with everything before it lit.

import { state, pack, placeAt } from './store.js';
import { app, h, fill, icon, openModal, closeModal } from './ui.js';
import { unlockAudio, arpeggio, errorSound } from './sfx.js';

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const gloss = (w) => String(w.en || '').split(' / ')[0].replace(/\s*\([^)]*\)/g, '').trim();

/** The bands of this pack: [{ cefr, from, to }] in level numbers. */
function bands(p) {
  const out = [];
  p.levels.forEach((L, i) => {
    const last = out[out.length - 1];
    if (last && last.cefr === L.cefr) last.to = i + 1;
    else out.push({ cefr: L.cefr, from: i + 1, to: i + 1 });
  });
  return out;
}

const TENSES = { A1: ['pres'], A2: ['pres', 'past', 'fut'], B1: ['past', 'imp', 'fut'], B2: ['past', 'imp', 'fut'], C1: ['imp', 'fut', 'past'], C2: ['imp', 'fut', 'past'] };

function meaningQ(p, band) {
  const pool = p.words.filter((w) => w.l >= band.from && w.l <= band.to && w.en && w.c !== 'who' && w.c !== 'core');
  const w = pick(pool);
  if (!w) return null;
  const others = shuffle(p.words.filter((x) => x.c === w.c && x !== w && gloss(x) && gloss(x) !== gloss(w))).slice(0, 3);
  if (others.length < 3) return null;
  return { kind: 'meaning', prompt: h('span', {}, 'What does ', h('b', { class: 'pl-word' }, w.t), ' mean?'), options: shuffle([gloss(w), ...others.map(gloss)]), answer: gloss(w) };
}

function verbQ(p, band) {
  const verbs = p.words.filter((w) => w.f && w.ft && w.l <= band.to && w.c !== 'modal');
  const near = verbs.filter((w) => w.l >= band.from);
  const v = pick(near.length ? near : verbs);
  if (!v) return null;
  const tense = pick(TENSES[band.cefr] || ['pres']);
  const table = tense === 'pres' ? v.f : v.ft[tense];
  if (!table) return null;
  const person = Math.floor(Math.random() * 6);
  const answer = table[person];
  const pool = new Set([...table, ...(tense !== 'pres' ? [v.f[person]] : []), ...Object.values(v.ft).map((t) => t[person])]);
  pool.delete(answer);
  const others = shuffle([...pool]).slice(0, 3);
  if (others.length < 3) return null;
  const who = (p.persons?.[person] || '').split(' / ')[0];
  const tname = p.tenseNames?.[tense] || tense;
  return {
    kind: 'verb',
    prompt: h('span', {}, h('b', { class: 'pl-word' }, who), ' ___ ', h('span', { class: 'dim' }, `(${v.t} · ${tname})`)),
    options: shuffle([answer, ...others]), answer,
  };
}

function formQ(p, band) {
  // plural / article: "the books" → i libri
  if (Math.random() < 0.5) {
    const nouns = p.words.filter((w) => w.nf && w.l <= band.to);
    const w = pick(nouns);
    if (!w) return null;
    const det = Math.random() < 0.5 ? 'def' : 'indef';
    const pl = Math.random() < 0.6;
    const answer = w.nf[det][pl ? 1 : 0];
    const en = englishShape(gloss(w), det, pl, !!w.pl);
    const options = shuffle([...new Set([...w.nf.def, ...w.nf.indef])]);
    if (options.length < 4) return null;
    return { kind: 'noun', prompt: h('span', {}, 'How do you say ', h('b', { class: 'pl-word' }, `“${en}”`), '?'), options, answer };
  }
  // agreement: "lei è ___ (stanco)"
  const adj = p.words.filter((w) => w.g4 && w.c === 'feeling' && w.l <= Math.max(band.to, 3));
  const a = pick(adj);
  const whos = p.words.filter((w) => w.c === 'who' && w.g && w.l <= 2);
  const s = pick(whos);
  if (!a || !s) return null;
  const be = p.id === 'es' ? { 2: 'está', 5: 'están', 3: 'estamos', 4: 'estáis' } : { 2: 'è', 5: 'sono', 3: 'siamo', 4: 'siete' };
  const answer = a.g4[(s.p >= 3 ? 2 : 0) + (s.g === 'f' ? 1 : 0)];
  const options = shuffle([...new Set(a.g4)]);
  if (options.length < 3) return null;
  return { kind: 'agree', prompt: h('span', {}, h('b', { class: 'pl-word' }, `${s.t} ${be[s.p] || ''} ___`), ' ', h('span', { class: 'dim' }, `(${a.t} · ${gloss(a)})`)), options, answer };
}

function englishShape(g, det, pl, wasPlural) {
  const m = g.match(/^(a|an|the|some)\s+(.*)$/i);
  let head = m ? m[2] : g;
  if (wasPlural) head = head.replace(/ies$/, 'y').replace(/s$/, '');
  const many = (x) => (/(s|x|ch|sh)$/.test(x) ? `${x}es` : /[^aeiou]y$/.test(x) ? `${x.slice(0, -1)}ies` : `${x}s`);
  const ws = head.split(' '); const k = ws.indexOf('of'); const at = k > 0 ? k - 1 : ws.length - 1;
  if (pl) ws[at] = many(ws[at]);
  const phrase = ws.join(' ');
  if (det === 'def') return `the ${phrase}`;
  return pl ? `some ${phrase}` : `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`;
}

function questionsFor(p, band) {
  const makers = shuffle([meaningQ, verbQ, ['A1', 'A2'].includes(band.cefr) ? formQ : meaningQ]);
  const qs = [];
  for (const make of makers) {
    let q = null;
    for (let k = 0; k < 20 && !q; k++) q = make(p, band);
    if (q) qs.push(q);
  }
  return qs;
}

// ------------------------------------------------------------------ UI
let run = null;

/** Start the test. `onPlaced(level)` runs after placing; `onBeginner()` if you'd rather start at the beginning. */
export function startPlacement({ onPlaced, onBeginner, fromSettings = false } = {}) {
  const p = pack();
  if (!p?.levels) return;
  unlockAudio();
  run = { p, bands: bands(p), b: 0, q: 0, right: 0, onPlaced, onBeginner, fromSettings, asked: 0 };
  run.qs = questionsFor(p, run.bands[0]);
  app.placement = { answer: () => run?.qs?.[run.q]?.answer, band: () => run?.bands?.[run.b]?.cefr };
  intro();
}

function intro() {
  const { p, fromSettings } = run;
  openModal({
    kicker: `Find your level · ${p.name}`, title: 'Where do you start?', size: 'wide placement',
    body: h('div', { class: 'stack' },
      h('p', { class: 'lede' }, `A few quick questions, from A1 upwards. Each band has three; get two right and you move on. It stops as soon as a band is new to you — usually 3 to 12 questions.`),
      h('p', { class: 'lede dim' }, fromSettings
        ? 'Your progress is kept: the test can move you forward, never back.'
        : 'Everything before your level lights up in your sky, and those words come back for review over the next two weeks.'),
      h('p', { class: 'lede dim' }, 'Not sure? Choose “I don’t know” — guessing only puts you somewhere too hard.')),
    footer: [h('button', { class: 'btn ghost', onclick: () => { closeModal(); run.onBeginner?.(); } }, fromSettings ? 'Cancel' : 'Start from the beginning'), h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: ask }, 'Begin', icon('arrow', 16))],
  });
}

function ask() {
  const band = run.bands[run.b];
  const q = run.qs[run.q];
  if (!q) { finishBand(); return; }
  const total = run.bands.length;
  let done = false;
  const status = h('div', { class: 'pl-status', 'aria-live': 'polite' });
  const choose = (opt, btn) => {
    if (done) return;
    done = true;
    run.asked++;
    const ok = opt === q.answer;
    if (ok) run.right++;
    buttons.forEach((b) => { b.disabled = true; if (b.dataset.v === q.answer) b.classList.add('right'); });
    if (btn && !ok) btn.classList.add('wrong');
    if (ok) arpeggio(['who', 'action'], 0.05); else if (opt) errorSound();
    fill(status, ok ? h('span', { class: 'ok' }, '✦ Right') : h('span', {}, 'It’s ', h('b', {}, q.answer), '.'));
    setTimeout(() => { run.q++; ask(); }, ok ? 650 : 1500);
  };
  const buttons = q.options.map((o) => h('button', { class: 'eclipse-opt', style: { '--c': band ? 'var(--accent)' : null }, 'data-v': o, onclick: (e) => choose(o, e.currentTarget) }, o));
  openModal({
    kicker: `Find your level · ${band.cefr}`, title: '', size: 'wide placement',
    body: h('div', { class: 'stack' },
      h('div', { class: 'pl-bands' }, run.bands.map((b, i) => h('span', { class: `pl-band${i < run.b ? ' passed' : i === run.b ? ' now' : ''}` }, b.cefr))),
      h('div', { class: 'practice-progress' }, h('span', {}, `Question ${run.q + 1} of ${run.qs.length} in ${band.cefr}`), h('span', { class: 'bar' }, h('i', { style: { width: `${((run.b + run.q / Math.max(1, run.qs.length)) / total) * 100}%` } }))),
      h('p', { class: 'prompt-en pl-prompt' }, q.prompt),
      h('div', { class: 'eclipse-opts' }, buttons),
      status),
    footer: [h('button', { class: 'btn ghost', onclick: () => choose(null, null) }, 'I don’t know'), h('span', { class: 'grow' }), h('button', { class: 'btn ghost', onclick: () => { closeModal(); run.onBeginner?.(); } }, 'Stop')],
  });
}

function finishBand() {
  const need = Math.max(1, Math.ceil(run.qs.length * 2 / 3));
  const passed = run.right >= need;
  if (passed && run.b < run.bands.length - 1) {
    run.b++; run.q = 0; run.right = 0;
    run.qs = questionsFor(run.p, run.bands[run.b]);
    ask();
    return;
  }
  // start at the first band you didn't pass (or the last level if you passed everything)
  const level = passed ? run.p.levels.length : run.bands[run.b].from;
  result(level);
}

function result(level) {
  const p = run.p;
  const def = p.levels[level - 1];
  const known = p.words.filter((w) => w.l && w.l < level).length;
  const already = level <= state.level;
  openModal({
    kicker: 'Find your level', title: level === 1 ? 'Start at the beginning' : `Start at ${def.cefr} · level ${level}`, size: 'wide placement',
    body: h('div', { class: 'stack' },
      h('div', { class: 'pl-bands' }, run.bands.map((b) => h('span', { class: `pl-band${b.to < level ? ' passed' : b.from <= level && level <= b.to ? ' now' : ''}` }, b.cefr))),
      level === 1
        ? h('p', { class: 'lede' }, 'A1 is new to you — the best place to start is the first star.')
        : h('p', { class: 'lede' }, `${def.name} (${def.native}) — ${def.goal} The ${known} words of the earlier levels will light up in your sky.`),
      already && level > 1 ? h('p', { class: 'lede dim' }, `You are already at level ${state.level}, so nothing changes.`) : null),
    footer: level === 1 || already
      ? [h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: () => { closeModal(); run.onBeginner?.(); } }, 'OK', icon('arrow', 16))]
      : [h('button', { class: 'btn ghost', onclick: () => { closeModal(); run.onBeginner?.(); } }, run.fromSettings ? 'Keep my level' : 'Start from the beginning'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn primary', onclick: () => { closeModal(); const placed = placeAt(level); run.onPlaced?.(placed || level); } }, `Start at level ${level}`, icon('arrow', 16))],
  });
}
