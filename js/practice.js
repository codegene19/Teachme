// Practice: translation challenges and spaced review.
//
// A challenge shows an English sentence; you build it from a bank of tiles
// that also holds tempting wrong forms (another person, another tense, a
// neighbouring word). Feedback names the exact mistake. Every answer feeds
// the review schedule in memory.js; "Review" builds its challenges around
// the words that are due.

import { state, derived, bumpSeen, bumpStat, commit, pack } from './store.js';
import { sentenceSegments, sentenceText, surface, optionsFor, pickRandom } from './language.js';
import { randomSentence, canGenerate } from './generate.js';
import { englishFor, cleanGloss } from './english.js';
import { grade, dueIds, dueLabel } from './memory.js';
import { orderRule, keptInOrder, checkOrder } from './order.js';
import { recordAnswer, recordSlip, slipMatches, slipText } from './progress.js';
import { app, h, fill, icon, openModal, closeModal } from './ui.js';
import { speak, unlockAudio, arpeggio, errorSound } from './sfx.js';
import { speechOpts } from './panels.js';
import { glossed } from './forge.js';
import { speakBack } from './speakback.js';

export function initPractice() {
  app.practice = { open, available, dueCount: () => dueIds().length, target: () => session?.item?.target?.map((c) => c.text) };
}
export const available = () => canGenerate() && derived.litCount >= 5;

const W = () => state.words;
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const personName = (p) => (pack()?.persons?.[p] || ['I', 'you', 'he/she', 'we', 'you all', 'they'][p]).split(' / ')[0];
const tenseName = (t) => pack()?.tenseNames?.[t] || { pres: 'present', past: 'past', imp: 'imperfect', fut: 'future' }[t];

// ------------------------------------------------------------- items
function tilesFor(s) {
  return sentenceSegments(s.tokens, W(), { capitalize: false, end: s.end })
    .filter((x) => x.kind === 'word')
    .map((x) => {
      const w = W()[x.wordId];
      // describing "io / tu / noi" works in either gender, so both forms are right
      const alts = w.agr && x.agree?.own ? [w.agr[x.agree.pl ? 2 : 0], w.agr[x.agree.pl ? 3 : 1]] : null;
      return { text: x.text, wordId: x.wordId, person: x.person, tense: x.tense, index: x.index, agree: x.agree || null, alts };
    });
}

const agrIdx = (a) => (a.pl ? 2 : 0) + (a.g === 'f' ? 1 : 0);
// "feminine plural", or just "plural" for words that only change number (importante → importanti)
const agreeName = (a, w = null) => (w?.agr && w.agr[0] === w.agr[1] && w.agr[2] === w.agr[3]
  ? (a.pl ? 'plural' : 'singular')
  : `${a.g === 'f' ? 'feminine' : 'masculine'} ${a.pl ? 'plural' : 'singular'}`);

/** Wrong-but-tempting tiles: the same verb in another person or tense, a neighbouring word. */
function distractors(s, target) {
  const words = W();
  const used = new Set(target.flatMap((c) => [c.text, ...(c.alts || [])]).map((x) => x.toLowerCase()));
  const out = [];
  const add = (c) => { const k = c.text.toLowerCase(); if (c.text && !used.has(k)) { used.add(k); out.push(c); } };
  const verbs = target.filter((c) => words[c.wordId].forms && !s.tokens[c.index].inf);
  for (const c of shuffle(verbs).slice(0, 2)) {
    const w = words[c.wordId];
    const choices = [];
    for (let p = 0; p < 6; p++) if (p !== c.person) choices.push({ person: p, tense: c.tense });
    for (const t of ['pres', 'past', 'imp', 'fut']) if (t !== c.tense && (t === 'pres' || w.tenses?.[t])) choices.push({ person: c.person, tense: t }, { person: c.person, tense: t });
    const o = pickRandom(choices);
    const tok = s.tokens[c.index];
    const text = surface(w, tok, o.person, o.tense);
    // name the form by what it really is (some verbs use the imperfect for the past)
    const tense = ['pres', 'imp', 'past', 'fut'].find((t) => surface(w, tok, o.person, t) === text) || o.tense;
    add({ text, wordId: w.id, person: o.person, tense });
  }
  // a describing word in the wrong gender or number ("stanco" for "lei", "nuovo" for "una casa")
  const agreeing = shuffle(target.filter((c) => words[c.wordId].agr && c.agree))[0];
  if (agreeing) {
    const w = words[agreeing.wordId];
    const a = agreeing.agree;
    const wrong = a.own ? [{ g: a.g, pl: !a.pl }] : [{ g: a.g === 'f' ? 'm' : 'f', pl: a.pl }, { g: a.g === 'f' ? 'm' : 'f', pl: a.pl }, { g: a.g, pl: !a.pl }];
    for (const o of shuffle(wrong)) {
      const text = w.agr[agrIdx(o)];
      if (text && !used.has(text.toLowerCase())) { add({ text, wordId: w.id, person: agreeing.person, tense: agreeing.tense, agree: { ...a, ...o } }); break; }
    }
  }
  const other = shuffle(target.filter((c) => ['thing', 'feeling', 'place', 'time', 'quality'].includes(words[c.wordId].cat)))[0];
  if (other) {
    const tok = s.tokens[other.index];
    const alt = pickRandom(optionsFor(tok, words, derived.orbit).filter((id) => id !== other.wordId));
    if (alt) add({ text: surface(words[alt], tok, other.person, other.tense, other.agree), wordId: alt, person: other.person, tense: other.tense, agree: other.agree });
  }
  return out.slice(0, 3);
}

/** focus: a word id (review), or a weak spot to train ({ kind: 'person' | 'tense' | 'word', … }). */
function makeChallenge(focus = null) {
  const slip = focus && typeof focus === 'object' ? focus : null;
  for (let k = 0; k < 160; k++) {
    const s = randomSentence({ statementsOnly: k % 4 !== 0, tense: slip?.kind === 'tense' && k < 120 ? slip.to : null });
    if (!s) return null;
    if (focus && !slip && !s.tokens.some((t) => t.wordId === focus)) continue;
    const target = tilesFor(s);
    if (target.length < 2 || target.length > 12) continue;
    if (slip && k < 150 && !slipMatches(slip, target, W())) continue;
    const bank = shuffle([...target, ...distractors(s, target)]).map((c, key) => ({ ...c, key }));
    return { kind: 'translate', s, target, bank, focus: slip ? null : focus, english: englishFor(s.tokens, W(), s.end) };
  }
  return null;
}

/** For a due word no pattern reaches yet: a quick "which one means…" card. */
function makeWordCard(focus) {
  const w = W()[focus];
  if (!w) return null;
  const same = (derived.byCat[w.cat] || []).filter((id) => id !== focus);
  const options = shuffle([focus, ...shuffle(same).slice(0, 3)]);
  return { kind: 'word', focus, options };
}

// ----------------------------------------------------------- session
let session = null;

/**
 * mode: 'review' (due words first), 'translate' (English → sentence),
 * 'listen' (hear it, build it), or 'focus' (translate, aimed at one weak spot).
 */
export function open(mode, opts = {}) {
  unlockAudio();
  const due = dueIds();
  mode = mode || (due.length ? 'review' : 'translate');
  session = {
    mode, queue: mode === 'review' ? due.slice(0, 10) : [], k: 0, right: 0, total: 0,
    brightened: new Set(), dimmed: new Set(), slip: mode === 'focus' ? opts.slip : null,
  };
  next();
}

function next() {
  if (session.mode === 'review') {
    if (session.k >= session.queue.length) { summary(); return; }
    const focus = session.queue[session.k];
    session.item = makeChallenge(focus) || makeWordCard(focus);
  } else {
    session.item = makeChallenge(session.slip);
  }
  session.answer = [];
  session.checked = false;
  session.marks = null;
  session.retry = false;
  render();
}

function tabs() {
  const due = dueIds().length;
  return h('div', { class: 'practice-tabs', role: 'tablist' },
    h('button', { class: `tense-tab${session.mode === 'review' ? ' active' : ''}`, role: 'tab', onclick: () => open('review') }, `Review · ${due} due`),
    h('button', { class: `tense-tab${session.mode === 'translate' || session.mode === 'focus' ? ' active' : ''}`, role: 'tab', onclick: () => open('translate') }, 'Translate'),
    h('button', { class: `tense-tab${session.mode === 'listen' ? ' active' : ''}`, role: 'tab', onclick: () => open('listen') }, 'Listen'));
}

function progress() {
  if (session.mode === 'review') {
    const n = session.queue.length;
    return h('div', { class: 'practice-progress' }, h('span', {}, `${Math.min(session.k + 1, n)} / ${n}`), h('span', { class: 'bar' }, h('i', { style: { width: `${(session.k / n) * 100}%` } })));
  }
  const score = session.total ? `${session.right} of ${session.total} right` : '';
  if (session.slip) return h('div', { class: 'practice-progress' }, h('span', {}, `Weak spot: ${slipText(session.slip)}${score ? ` · ${score}` : ''}`));
  return h('div', { class: 'practice-progress' }, h('span', {}, score || (session.mode === 'listen' ? 'Listen, then build what you hear' : 'Build the sentence')));
}

function render() {
  const it = session.item;
  if (!it) {
    openModal({
      kicker: 'Practice', title: 'Not enough stars yet', size: 'wide practice',
      body: h('div', { class: 'stack' }, tabs(), h('p', { class: 'lede' }, 'Light a few more stars so full sentence patterns can form, then come back.')),
      footer: [h('button', { class: 'btn primary', onclick: closeModal }, 'Done')],
    });
    return;
  }
  if (it.kind === 'word') { renderWordCard(it); return; }

  const status = h('div', { class: 'practice-feedback', 'aria-live': 'polite' });
  const answerRow = h('div', { class: 'answer-row', 'aria-label': 'Your answer' });
  const bankRow = h('div', { class: 'bank-row', 'aria-label': 'Word tiles' });
  // Tap a placed tile to pick it up; tap another placed tile to move it there,
  // tap the end marker to move it last, or tap it again to send it back.
  session.sel = null;
  const changed = () => { session.marks = null; session.sel = null; drawTiles(); };
  const drawTiles = () => {
    const sel = session.sel;
    const marks = session.marks;
    const tap = (i) => {
      if (session.sel == null) { session.sel = i; drawTiles(); return; }
      if (session.sel === i) { session.answer.splice(i, 1); changed(); return; }
      const [c] = session.answer.splice(session.sel, 1);
      session.answer.splice(i, 0, c);
      changed();
    };
    const toEnd = () => { const [c] = session.answer.splice(session.sel, 1); session.answer.push(c); changed(); };
    fill(answerRow, session.answer.length
      ? [...session.answer.map((c, i) => h('button', {
        class: `tile in${sel === i ? ' lifted' : ''}${marks ? (marks.has(c.key) ? ' misplaced' : ' placed') : ''}`,
        disabled: session.checked, 'aria-pressed': String(sel === i),
        title: sel == null ? 'Tap to move or remove' : sel === i ? 'Tap again to remove' : 'Move here',
        onclick: () => tap(i),
      }, c.text)),
      sel != null && sel !== session.answer.length - 1 ? h('button', { class: 'tile drop-end', onclick: toEnd, 'aria-label': 'Move to the end' }, '↦ end') : null]
      : h('span', { class: 'answer-hint' }, 'Tap the tiles in order'));
    fill(answerHint, sel != null ? 'Tap where it should go · tap it again to send it back' : session.answer.length > 1 && !session.checked ? 'Tap a placed tile to move it' : '');
    const usedKeys = new Set(session.answer.map((c) => c.key));
    fill(bankRow, it.bank.map((c) => h('button', {
      class: 'tile', disabled: session.checked || usedKeys.has(c.key),
      onclick: () => { session.answer.push(c); changed(); },
    }, c.text)));
  };
  const answerHint = h('div', { class: 'move-hint' });
  drawTiles();
  const listen = session.mode === 'listen';
  const english = h('p', { class: 'prompt-en' }, it.english);
  const checkBtn = h('button', { class: 'btn primary', onclick: () => { check(status, checkBtn, nextBtn, drawTiles); if (listen && !prompt.querySelector('.prompt-hint')) prompt.append(h('p', { class: 'prompt-hint' }, it.english)); } }, 'Check');
  const nextBtn = h('button', { class: 'btn primary', hidden: true, onclick: () => { session.k += 1; next(); } }, 'Next', icon('arrow', 16));
  const text = sentenceText(it.s.tokens, W(), it.s.end);
  const play = (rate) => speak(text, { ...speechOpts(), ...(rate ? { rate } : {}) });
  const prompt = listen
    ? h('div', { class: 'prompt listen' },
      h('span', { class: 'field-label' }, `Listen, then build what you hear in ${pack()?.name || 'the language'}`),
      h('div', { class: 'listen-row' },
        h('button', { class: 'play-btn', 'aria-label': 'Play the sentence', onclick: () => play() }, icon('speak', 26)),
        h('button', { class: 'btn small ghost', onclick: () => play(0.6) }, 'Slower')))
    : h('div', { class: 'prompt' }, h('span', { class: 'field-label' }, `Say it in ${pack()?.name || 'the language'}`), english);
  openModal({
    kicker: { review: 'Practice · Review', listen: 'Practice · Listen', focus: 'Practice · Weak spot' }[session.mode] || 'Practice · Translate',
    title: '',
    size: 'wide practice',
    body: h('div', { class: 'stack' },
      tabs(), progress(),
      prompt,
      answerRow, answerHint, bankRow, status),
    footer: [
      h('button', { class: 'btn ghost', onclick: () => { session.k += 1; next(); } }, 'Skip'),
      h('span', { class: 'grow' }),
      checkBtn, nextBtn,
    ],
  });
  if (listen) setTimeout(() => play(), 250);
}

function check(status, checkBtn, nextBtn, drawTiles) {
  const it = session.item;
  if (!session.answer.length) { fill(status, h('p', { class: 'lede' }, 'Tap tiles to build the sentence first.')); return; }
  session.checked = true;
  session.sel = null;
  const norm = (x) => x.toLowerCase();
  const ans = session.answer.map((c) => {
    const t = it.target.find((x) => x.wordId === c.wordId && x.alts?.some((y) => norm(y) === norm(c.text)));
    return t ? { ...c, text: t.text, agree: t.agree } : c;
  });
  const same = (a, b) => a.length === b.length && a.every((c, i) => norm(c.text) === norm(b[i].text));
  const exactOrder = same(ans, it.target);
  const sorted0 = (a) => a.map((c) => norm(c.text)).sort().join('|');
  const sameWords = ans.length === it.target.length && sorted0(ans) === sorted0(it.target);
  // any order the grammar accepts is right too ("io spesso mangio", a time word up front)
  const freeOk = !exactOrder && sameWords && !checkOrder(ans.map((c) => ({ wordId: c.wordId, inf: !!it.s.tokens[c.index]?.inf })), W());
  const alt = !exactOrder && (altOrders(it.target).find((v) => same(ans, v)) || (freeOk && ans));
  const ok = exactOrder || !!alt;
  // only the right words, in the wrong order: show what moved and why, and let them fix it
  const sorted = (a) => a.map((c) => norm(c.text)).sort().join('|');
  const orderOnly = !ok && ans.length === it.target.length && sorted(ans) === sorted(it.target);
  const retry = session.retry;
  if (orderOnly) {
    const fix = orderFix(ans, it.target, it.s);
    session.marks = fix.misplaced;
    drawTiles();
    if (!retry) {
      session.total += 1;
      recordAnswer(false, session.mode);
      for (const cat of fix.cats) recordSlip({ kind: 'order', cat });
      bumpStat('made');
      commit();
    }
    errorSound();
    const again = h('button', { class: 'btn primary', onclick: () => {
      session.checked = false;
      session.retry = true;
      fill(status);
      drawTiles();
      checkBtn.hidden = false;
      nextBtn.hidden = true;
      again.remove();
    } }, 'Fix the order');
    fill(status,
      h('p', { class: 'verdict wrong' }, retry ? 'Still not the right order' : 'Right words — the order needs fixing'),
      h('ul', { class: 'reasons' }, fix.reasons.map((r) => h('li', {}, r))),
      h('p', { class: 'lede dim' }, 'Orange tiles are out of place. Tap one, then tap where it belongs.'),
      h('div', { class: 'row wrap' }, again,
        h('button', { class: 'btn small ghost', onclick: () => showAnswer(status, it, ok) }, 'Show the answer')));
    checkBtn.hidden = true;
    nextBtn.hidden = false;
    again.focus();
    return;
  }
  drawTiles();
  if (retry) {
    // a corrected order: no new grade, just the reward
    session.retry = false;
    if (ok) {
      if (ans.length) arpeggio(it.s.tokens.map((t) => W()[t.wordId]?.cat), 0.05);
      showAnswer(status, it, true, alt ? 'Order fixed ✦ — that order works too.' : 'Order fixed ✦');
    } else {
      errorSound();
      showAnswer(status, it, false, 'Not quite — compare with the sentence below.');
    }
    checkBtn.hidden = true;
    nextBtn.hidden = false;
    nextBtn.focus();
    return;
  }
  const tgt = it.target;
  session.total += 1;
  const reasons = [];
  const wrongIds = new Set();
  if (!ok) {
    // match tiles by word, not by position, so one slip doesn't cascade
    const left = ans.slice();
    const take = (pred) => { const k = left.findIndex(pred); return k < 0 ? null : left.splice(k, 1)[0]; };
    const missing = [];
    const exact = [];
    for (const t of tgt) { const a = take((c) => norm(c.text) === norm(t.text)); if (a) exact.push(t); else missing.push(t); }
    for (const t of missing.slice()) {
      const a = take((c) => c.wordId === t.wordId);
      if (!a) continue;
      missing.splice(missing.indexOf(t), 1);
      wrongIds.add(t.wordId);
      const aw = W()[t.wordId];
      const agrees = aw?.agr && a.agree && t.agree && (a.agree.g !== t.agree.g || a.agree.pl !== t.agree.pl);
      if (agrees) {
        // name the wrong form by what it is, and the right one by what it describes
        const k = aw.agr.findIndex((x) => norm(x) === norm(a.text));
        const was = k >= 0 ? { g: k % 2 ? 'f' : 'm', pl: k >= 2 } : a.agree;
        const what = t.agree.with >= 0 ? tgt.find((x) => x.index === t.agree.with)?.text : null;
        const noun = { ...t.agree };
        recordSlip({ kind: 'agree', cat: was.pl !== noun.pl ? 'number' : 'gender' });
        reasons.push(what
          ? `“${a.text}” is ${agreeName(was, aw)}, but it describes “${what}” (${agreeName(noun, aw.agr[0] === aw.agr[1] ? aw : null)}): “${t.text}”.`
          : `Use the ${agreeName(noun, aw)} form here: “${t.text}”.`);
        continue;
      }
      if (a.person !== t.person) recordSlip({ kind: 'person', from: a.person, to: t.person });
      else if (a.tense !== t.tense) recordSlip({ kind: 'tense', from: a.tense, to: t.tense });
      if (a.person !== t.person) reasons.push(`“${a.text}” goes with “${personName(a.person)}” — here the subject is “${personName(t.person)}”: “${t.text}”.`);
      else if (a.tense !== t.tense) reasons.push(`“${a.text}” is the ${tenseName(a.tense)}; this sentence is in the ${tenseName(t.tense)}: “${t.text}”.`);
      else reasons.push(`Use “${t.text}” here, not “${a.text}”.`);
    }
    for (const a of left) {
      const t = missing.shift();
      if (t) { wrongIds.add(t.wordId); reasons.push(`“${a.text}” doesn’t fit — the sentence needs “${t.text}”${W()[t.wordId]?.gloss ? ` (${cleanGloss(W()[t.wordId].gloss)})` : ''}.`); }
      else reasons.push(`“${a.text}” is extra.`);
    }
    for (const t of missing) { wrongIds.add(t.wordId); reasons.push(`Missing: “${t.text}”.`); }
    for (const id of wrongIds) recordSlip({ kind: 'word', id });
    if (!reasons.length) reasons.push('Right words — check the order.');
    else if (reasons.length > 3) reasons.splice(3);
  }
  // memory: a right answer strengthens every word; a wrong one weakens the words that went wrong
  const ids = [...new Set(tgt.map((c) => c.wordId))];
  for (const id of ids) {
    if (ok) { grade(id, true); session.brightened.add(id); }
    else if (wrongIds.has(id)) { grade(id, false); session.dimmed.add(id); }
  }
  if (it.focus && !ok && !wrongIds.has(it.focus)) grade(it.focus, true);
  if (ok) session.right += 1;
  recordAnswer(ok, session.mode);
  if (ok && session.slip) recordSlip(session.slip, -1);
  bumpStat('made');
  bumpStat('practised');
  bumpSeen(ids);
  commit();
  if (alt) reasons.push(`Also right: ${phrase(it.target)}.`);
  showAnswer(status, it, ok, ok ? '✦ Correct' : 'Not quite', reasons);
  if (ok) arpeggio(it.s.tokens.map((t) => W()[t.wordId]?.cat), 0.05); else errorSound();
  checkBtn.hidden = true;
  nextBtn.hidden = false;
  nextBtn.focus();
}

const phrase = (tiles) => `“${tiles.map((c) => c.text).join(' ')}”`;

function showAnswer(status, it, ok, verdict = ok ? '✦ Correct' : 'Not quite', reasons = []) {
  const segs = sentenceSegments(it.s.tokens, W(), { end: it.s.end });
  const text = sentenceText(it.s.tokens, W(), it.s.end);
  fill(status,
    h('p', { class: `verdict ${ok ? 'right' : 'wrong'}` }, verdict),
    reasons.length ? h('ul', { class: 'reasons' }, reasons.map((r) => h('li', {}, r))) : null,
    h('p', { class: 'sentence answer-sentence' }, ...segs.flatMap((x) => [x.sep, x.kind === 'punct' ? x.text : glossed(x.text, x.gloss, { class: 'w' })]), h('span', { class: 'end' }, it.s.end)),
    h('div', { class: 'row wrap answer-tools' },
      h('button', { class: 'btn small ghost', onclick: () => speak(text, speechOpts()) }, icon('speak', 16), 'Hear it'),
      speakBack(text, { compact: true, onDone: () => { session.spoken = (session.spoken || 0) + 1; commit(); } })));
  speak(text, speechOpts());
}

// ------------------------------------------------------- word order
const clauseOf = (tiles, i) => {
  const isLink = (c) => W()[c.wordId]?.cat === 'link';
  let a = i, b = i;
  while (a > 0 && !isLink(tiles[a - 1]) && !isLink(tiles[a])) a--;
  if (isLink(tiles[a])) a++;
  while (b < tiles.length - 1 && !isLink(tiles[b + 1])) b++;
  return [a, b];
};

/** Other orders that are just as right: a time word at the start or the end of its clause. */
function altOrders(tgt) {
  const out = [];
  tgt.forEach((c, i) => {
    if (W()[c.wordId]?.cat !== 'time') return;
    const [a, b] = clauseOf(tgt, i);
    for (const to of [a, b]) {
      if (to === i) continue;
      const v = tgt.slice();
      v.splice(i, 1);
      v.splice(to, 0, c);
      out.push(v);
    }
  });
  return out;
}

/** Which tiles are out of place (outside the longest run kept in order), and the rule for each. */
function orderFix(ans, tgt, s) {
  const norm = (x) => x.toLowerCase();
  const keptIdx = keptInOrder(ans, tgt, (c) => norm(c.text));
  const kept = new Set([...keptIdx].map((i) => ans[i].key));
  const misplaced = new Set(ans.filter((c) => !kept.has(c.key)).map((c) => c.key));
  const moved = ans.filter((c) => misplaced.has(c.key));
  const reasons = [];
  const cats = new Set();
  for (const c of moved) {
    const j = tgt.findIndex((t) => norm(t.text) === norm(c.text));
    const r = orderRule(tgt.map((t) => ({ ...t, inf: !!s.tokens[t.index]?.inf })), j, W());
    cats.add(r.cat);
    if (!reasons.includes(r.text)) reasons.push(r.text);
  }
  return { misplaced, reasons: reasons.slice(0, 3), cats: [...cats] };
}


function renderWordCard(it) {
  const w = W()[it.focus];
  let answered = false;
  const status = h('div', { class: 'practice-feedback', 'aria-live': 'polite' });
  const nextBtn = h('button', { class: 'btn primary', hidden: true, onclick: () => { session.k += 1; next(); } }, 'Next', icon('arrow', 16));
  const buttons = it.options.map((id) => h('button', {
    class: 'eclipse-opt', style: { '--c': state.categories[w.cat]?.color },
    onclick: (e) => {
      if (answered) return;
      answered = true;
      const ok = id === it.focus;
      grade(it.focus, ok);
      recordAnswer(ok, 'review');
      if (!ok) recordSlip({ kind: 'word', id: it.focus });
      (ok ? session.brightened : session.dimmed).add(it.focus);
      session.total += 1;
      if (ok) session.right += 1;
      bumpSeen([it.focus]);
      commit();
      e.currentTarget.classList.add(ok ? 'right' : 'wrong');
      buttons.forEach((b, k) => { b.disabled = true; if (it.options[k] === it.focus) b.classList.add('right'); });
      fill(status, h('p', { class: `verdict ${ok ? 'right' : 'wrong'}` }, ok ? '✦ Correct' : `It’s “${w.text}”.`));
      speak(w.text, speechOpts());
      nextBtn.hidden = false;
    },
  }, W()[id].text));
  openModal({
    kicker: 'Practice · Review', title: '', size: 'wide practice',
    body: h('div', { class: 'stack' }, tabs(), progress(),
      h('div', { class: 'prompt' }, h('span', { class: 'field-label' }, `Which word means`), h('p', { class: 'prompt-en' }, `“${cleanGloss(w.gloss || w.note || w.text)}”?`)),
      h('div', { class: 'eclipse-opts' }, buttons), status),
    footer: [h('button', { class: 'btn ghost', onclick: () => { session.k += 1; next(); } }, 'Skip'), h('span', { class: 'grow' }), nextBtn],
  });
}

function summary() {
  const words = W();
  const bright = [...session.brightened].map((id) => words[id]?.text).filter(Boolean);
  const soonest = [...session.brightened].map((id) => words[id]).filter((w) => w?.mem).sort((a, b) => a.mem.due - b.mem.due)[0];
  const nextDue = soonest && dueLabel(soonest);
  openModal({
    kicker: 'Practice · Review', title: session.total ? `${session.right} of ${session.total} right` : 'Nothing was due',
    size: 'wide practice',
    body: h('div', { class: 'stack' }, tabs(),
      session.total
        ? [h('p', { class: 'lede' }, bright.length ? `Stars brightened: ${bright.slice(0, 12).join(', ')}${bright.length > 12 ? '…' : ''}.` : 'Keep going — the words you missed come back within a few hours.'),
          nextDue ? h('p', { class: 'lede dim' }, `Next: ${nextDue}.`) : null]
        : h('p', { class: 'lede' }, 'Every star is bright. Try the Translate challenge, or come back tomorrow.')),
    footer: [h('button', { class: 'btn ghost', onclick: closeModal }, 'Done'), h('button', { class: 'btn primary', onclick: () => open('translate') }, 'Translate more', icon('arrow', 16))],
  });
}
