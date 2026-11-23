// The Forge: bind stars into a sentence, then turn any word into a variable
// and spin it through every star in its sector.

import {
  state, derived, on, commit, persist, ignite, addWord, bumpSeen, bumpStat,
  saveConstellation, resolveBlueprint, cosmicName, markHint, emptyForge, cloneTokens,
} from './store.js';
import { BLUEPRINTS } from './seed.js';
import { sentenceSegments, sentenceText, countTokens, formatBig, parseInput, formulaParts, pickRandom, optionsFor } from './language.js';
import { app, h, fill, $, icon, toast, showPopover, hidePopover, isPopoverOpen } from './ui.js';
import { chime, arpeggio, speak, unlockAudio, errorSound } from './sfx.js';
import { speechOpts } from './panels.js';

const root = $('#forge');
let chipsEl, sentenceEl, mathEl, countEl, nameInput, textInput, endEls, saveBtn, editTag, hintEl;
let popIndex = -1;
let wheelAcc = 0;

const F = () => state.forge;
const wordOf = (t) => state.words[t.wordId];
const catOfTok = (t) => state.categories[wordOf(t)?.cat] || state.categories.uncharted;

export function initForge() {
  nameInput = h('input', {
    class: 'name-input', placeholder: 'Unnamed constellation', maxlength: 40, 'aria-label': 'Constellation name',
    oninput: (e) => { F().name = e.target.value; persist(); },
  });
  countEl = h('b', { class: 'count-n' }, '0');
  editTag = h('span', { class: 'edit-tag', hidden: true }, 'editing');
  chipsEl = h('div', { class: 'chips', role: 'list', 'aria-label': 'Sentence pattern' });
  sentenceEl = h('p', { class: 'sentence', 'aria-live': 'polite' });
  mathEl = h('div', { class: 'math' });
  hintEl = h('div', { class: 'forge-hint' });
  textInput = h('input', {
    class: 'text-input', placeholder: 'Type words or a whole sentence…', 'aria-label': 'Add words', autocomplete: 'off', spellcheck: 'false',
    onkeydown: (e) => {
      if (e.key === 'Backspace' && !textInput.value && F().tokens.length) { removeToken(F().tokens.length - 1); e.preventDefault(); }
    },
  });
  endEls = ['.', '?', '!'].map((m) => h('button', { class: 'end-btn', 'aria-label': `End with ${m}`, onclick: () => { F().end = m; commit(); } }, m));
  saveBtn = h('button', { class: 'btn primary', onclick: save }, icon('star', 16), h('span', {}, 'Save'));

  root.replaceChildren(
    h('div', { class: 'sheet-head' },
      h('div', { class: 'sheet-title' }, h('span', { class: 'kicker' }, icon('forge', 14), 'Forge'), nameInput, editTag),
      h('div', { class: 'sheet-count', title: 'Different sentences this pattern can make' }, countEl, h('span', {}, 'sentences')),
      h('button', { class: 'icon-btn', 'aria-label': 'Close forge', onclick: close }, icon('close'))),
    chipsEl,
    sentenceEl,
    mathEl,
    hintEl,
    h('form', { class: 'forge-input', onsubmit: (e) => { e.preventDefault(); submitText(textInput.value); textInput.value = ''; } },
      textInput, h('button', { class: 'btn', type: 'submit' }, icon('plus', 16), 'Add')),
    h('div', { class: 'sheet-actions' },
      h('button', { class: 'btn', onclick: shuffle, title: 'Shuffle variables (S)' }, icon('shuffle', 16), h('span', {}, 'Shuffle')),
      h('button', { class: 'btn', onclick: speakNow, title: 'Hear it (V)' }, icon('speak', 16), h('span', {}, 'Hear')),
      h('div', { class: 'end-group', role: 'group', 'aria-label': 'End mark' }, endEls),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn ghost', onclick: newDraft, title: 'Start a new sentence' }, h('span', {}, 'New')),
      h('button', { class: 'btn ghost', onclick: toGalaxy, title: 'Send this sentence into a paragraph' }, icon('galaxy', 16), h('span', {}, 'To galaxy')),
      saveBtn));

  on('change', () => { if (isOpen()) render(); });
  on('reset', () => { popIndex = -1; hidePopover(); });
  app.forge = { open, close, toggle, isOpen, addWord: addWordToken, loadConstellation, loadBlueprint, shuffle, speak: speakNow, render };
}

export const isOpen = () => !root.hidden;

export function open() {
  app.galaxy?.close();
  root.hidden = false;
  document.body.classList.add('sheet-open');
  render();
  requestAnimationFrame(() => root.classList.add('in'));
  app.onSheetChange?.();
  if (F().tokens.length) setTimeout(() => app.space.fitIds(F().tokens.map((t) => t.wordId), { maxZ: 1.25 }), 30);
  else if (window.matchMedia('(pointer: fine)').matches) textInput.focus();
}

export function close() {
  if (root.hidden) return;
  hidePopover();
  root.hidden = true;
  root.classList.remove('in');
  document.body.classList.remove('sheet-open');
  app.space.setPath(null);
  app.onSheetChange?.();
}

export const toggle = () => (isOpen() ? close() : open());

// ---------------------------------------------------------------- render
function render() {
  const f = F();
  if (document.activeElement !== nameInput) nameInput.value = f.name || '';
  editTag.hidden = !f.editingId || !state.constellations[f.editingId];
  saveBtn.lastChild.textContent = f.editingId && state.constellations[f.editingId] ? 'Update' : 'Save';
  endEls.forEach((b) => b.classList.toggle('active', b.textContent === f.end));

  fill(chipsEl, ...(f.tokens.length ? f.tokens.map(chip) : [emptyState()]));

  const segs = sentenceSegments(f.tokens, state.words);
  fill(sentenceEl, 
    ...segs.flatMap((s) => [s.sep, wordSpan(s)]),
    segs.length ? h('span', { class: 'end' }, f.end) : h('span', { class: 'placeholder' }, 'Your sentence will appear here.'));

  const n = countTokens(f.tokens, state.words, derived.byCat);
  countEl.textContent = formatBig(n);
  const fp = formulaParts(f.tokens, state.words, derived.byCat);
  if (fp.length) {
    fill(mathEl, 
      ...fp.flatMap((p, i) => [i ? h('span', { class: 'x' }, '×') : null, h('span', { class: 'factor', style: { '--c': state.categories[p.cat]?.color } }, String(p.n))]),
      h('span', { class: 'x' }, '='),
      h('b', {}, formatBig(n)),
      h('span', { class: 'dim' }, n === 1 ? ' sentence' : ' sentences from this one pattern'));
  } else {
    fill(mathEl, f.tokens.length ? h('span', { class: 'dim' }, 'One fixed sentence. Tap a word and make it a variable to multiply it.') : '');
  }
  renderHint();
  app.space.setPath(f.tokens.map((t) => t.wordId));
}

function renderHint() {
  const f = F();
  const vars = f.tokens.filter((t) => t.var).length;
  let msg = '';
  if (!f.tokens.length) msg = '';
  else if (f.tokens.length < 2) msg = 'Add more words: tap a star, then “Add to sentence” — or type.';
  else if (!vars) msg = 'Tip: tap any word above → “Make variable”.';
  else if (state.stats.swaps < 3) msg = 'Click a coloured word in the sentence to swap it. Scroll over a variable to spin it.';
  hintEl.textContent = msg;
  hintEl.hidden = !msg;
}

function emptyState() {
  const sighted = BLUEPRINTS.filter((bp) => state.sighted[bp.id] && resolveBlueprint(bp));
  return h('div', { class: 'chips-empty' },
    h('p', {}, 'An empty forge. Tap a lit star and choose ', h('b', {}, '“Add to sentence”'), ', or type a sentence below.'),
    sighted.length ? h('div', { class: 'row wrap' },
      h('span', { class: 'field-label' }, 'Sighted constellations:'),
      sighted.map((bp) => h('button', { class: 'mini-chip', onclick: () => loadBlueprint(bp) }, '✧ ', bp.name))) : null);
}

function chip(t, i) {
  const w = wordOf(t);
  const c = catOfTok(t);
  const opts = optionsFor(t, state.words, derived.byCat);
  const el = h('button', {
    class: `chip ${t.var ? 'chip-var' : 'chip-fixed'}${w.cat === 'uncharted' ? ' chip-uncharted' : ''}`,
    style: { '--c': c.color }, draggable: 'true', 'data-i': String(i), role: 'listitem',
    'aria-label': t.var ? `Variable ${c.label}, currently ${w.text}, ${opts.length} options` : `Fixed word ${w.text}`,
    onclick: (e) => openChipMenu(i, e.currentTarget),
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); hidePopover(); },
    ondragend: () => el.classList.remove('dragging'),
    ondragover: (e) => { e.preventDefault(); el.classList.add('drop'); },
    ondragleave: () => el.classList.remove('drop'),
    ondrop: (e) => { e.preventDefault(); el.classList.remove('drop'); const from = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(from)) moveToken(from, i); },
  },
  h('span', { class: 'chip-cat' }, t.var ? h('span', { class: 'orb' }) : null, t.var ? `${c.label} · ${opts.length}` : (w.cat === 'uncharted' ? '? no sector' : c.label)),
  h('span', { class: 'chip-word' }, w.text));
  if (t.var) {
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) > 40) { cycle(i, wheelAcc > 0 ? 1 : -1); wheelAcc = 0; }
    }, { passive: false });
  }
  return el;
}

function wordSpan(s) {
  const c = state.categories[s.cat] || state.categories.uncharted;
  if (!s.isVar) return h('span', { class: 'w', 'data-i': String(s.index) }, s.text);
  return h('button', {
    class: 'w var', 'data-i': String(s.index), style: { '--c': c.color },
    title: `${c.label} — click for next, Shift+click for previous`,
    onclick: (e) => cycle(s.index, e.shiftKey ? -1 : 1),
  }, s.text);
}

const chipEl = (i) => chipsEl.querySelector(`[data-i="${i}"]`);

function openChipMenu(i, anchor) {
  const t = F().tokens[i];
  if (!t) { hidePopover(); return; }
  if (popIndex === i && isPopoverOpen() && anchor) { hidePopover(); return; }
  popIndex = i;
  const w = wordOf(t);
  const c = catOfTok(t);
  const opts = optionsFor(t, state.words, derived.byCat);
  const body = h('div', { class: 'pop-body', style: { '--c': c.color } },
    h('div', { class: 'pop-head' }, h('i', { class: 'dot' }), h('b', {}, c.label), h('span', { class: 'dim' }, `${c.sector} · ${opts.length} lit`)),
    t.var
      ? h('div', { class: 'orbit-options' }, opts.map((id) => h('button', {
        class: 'opt' + (id === t.wordId ? ' active' : ''),
        onclick: () => { setValue(i, id); refreshMenu(); },
      }, state.words[id].text)))
      : null,
    w.cat === 'uncharted' ? h('p', { class: 'pop-note' }, 'This star has no sector yet — give it one so it can become a variable.') : null,
    !t.var && w.cat !== 'uncharted' && opts.length < 2
      ? h('p', { class: 'pop-note' }, `Only one ${c.label} star is lit so far. Discover more to make this spin.`) : null,
    h('div', { class: 'pop-actions' },
      w.cat === 'uncharted'
        ? h('button', { class: 'btn small accent', onclick: () => { hidePopover(); app.panels.classify([w.id]); } }, 'Give it a sector')
        : h('button', { class: `btn small ${t.var ? '' : 'accent'}`, onclick: () => { toggleVar(i); refreshMenu(); } },
          icon(t.var ? 'pin' : 'orbit', 16), t.var ? 'Make fixed' : `Make variable · ${opts.length}`),
      h('span', { class: 'grow' }),
      h('button', { class: 'icon-btn small', 'aria-label': 'Move left', disabled: i === 0, onclick: () => { moveToken(i, i - 1); popIndex = -1; openChipMenu(i - 1, chipEl(i - 1)); } }, icon('left', 16)),
      h('button', { class: 'icon-btn small', 'aria-label': 'Move right', disabled: i === F().tokens.length - 1, onclick: () => { moveToken(i, i + 1); popIndex = -1; openChipMenu(i + 1, chipEl(i + 1)); } }, icon('right', 16)),
      h('button', { class: 'icon-btn small danger', 'aria-label': 'Remove word', onclick: () => { hidePopover(); removeToken(i); } }, icon('trash', 16))));
  showPopover(anchor || chipEl(i), body, { onClose: () => { popIndex = -1; } });
}

function refreshMenu() {
  const i = popIndex;
  popIndex = -1;
  const el = chipEl(i);
  if (el) openChipMenu(i, el);
}

// -------------------------------------------------------------- actions
function flashWord(i) {
  sentenceEl.querySelector(`[data-i="${i}"]`)?.classList.add('swapped');
  chipEl(i)?.classList.add('swapped');
}

function setValue(i, id) {
  const t = F().tokens[i];
  if (!t || t.wordId === id) return;
  t.wordId = id;
  bumpStat('swaps');
  bumpSeen([id]);
  unlockAudio();
  chime(state.words[id].cat, { gain: 0.4, dur: 0.9 });
  app.space.ripple(id);
  commit();
  flashWord(i);
}

function cycle(i, dir) {
  const t = F().tokens[i];
  if (!t) return;
  const opts = optionsFor(t, state.words, derived.byCat);
  if (opts.length < 2) {
    errorSound();
    toast({ kind: 'info', title: 'Nothing to swap yet', body: `Discover another ${catOfTok(t).label} star and this variable will spin.` });
    return;
  }
  const k = opts.indexOf(t.wordId);
  setValue(i, opts[(k + dir + opts.length) % opts.length]);
}

function toggleVar(i) {
  const t = F().tokens[i];
  if (!t) return;
  t.var = !t.var;
  unlockAudio();
  chime(wordOf(t).cat, { gain: 0.45, dur: 1.4, shift: t.var ? 5 : 0 });
  commit();
  if (t.var && markHint('firstVar')) {
    toast({ kind: 'signal', title: 'A variable is born', body: 'This slot now orbits every star in its sector. Click the coloured word in your sentence to swap it — same pattern, new meaning.' });
  }
}

function moveToken(from, to) {
  const toks = F().tokens;
  if (from === to || from < 0 || to < 0 || from >= toks.length || to >= toks.length) return;
  const [t] = toks.splice(from, 1);
  toks.splice(to, 0, t);
  commit();
}

function removeToken(i) {
  F().tokens.splice(i, 1);
  commit();
}

export function addWordToken(id) {
  const w = state.words[id];
  if (!w) return;
  if (!w.lit) ignite(id);
  F().tokens.push({ wordId: id, var: false });
  unlockAudio();
  chime(w.cat, { gain: 0.4, dur: 1 });
  if (!isOpen()) open();
  commit();
  chipEl(F().tokens.length - 1)?.classList.add('swapped');
}

function submitText(text) {
  const { tokens, end } = parseInput(text, derived.byText);
  if (!tokens.length) return;
  unlockAudio();
  const created = [];
  tokens.forEach((tok, k) => {
    let id = tok.wordId;
    if (id) {
      if (!state.words[id].lit) ignite(id, { quiet: true });
    } else {
      let txt = tok.text;
      if (k === 0 && tokens.length > 1 && txt !== txt.toUpperCase()) txt = txt.charAt(0).toLowerCase() + txt.slice(1);
      const w = addWord({ text: txt, cat: 'uncharted' }, { quiet: true });
      if (!w) return;
      id = w.id;
      if (w.cat === 'uncharted') created.push(id);
    }
    F().tokens.push({ wordId: id, var: false });
  });
  if (end) F().end = end;
  commit();
  arpeggio(F().tokens.map((t) => wordOf(t).cat));
  app.space.fitIds(F().tokens.map((t) => t.wordId), { maxZ: 1.25 });
  if (created.length) app.panels.classify(created);
}

export function shuffle() {
  const f = F();
  const vars = f.tokens.map((t, i) => [t, i]).filter(([t]) => t.var);
  if (!vars.length) {
    toast({ kind: 'info', title: 'No variables yet', body: 'Tap a word in the pattern and choose “Make variable”. Then shuffle.' });
    return;
  }
  for (const [t] of vars) {
    const next = pickRandom(optionsFor(t, state.words, derived.byCat), t.wordId);
    if (next) t.wordId = next;
  }
  bumpStat('shuffles');
  bumpStat('swaps', vars.length);
  bumpSeen(f.tokens.map((t) => t.wordId));
  unlockAudio();
  arpeggio(f.tokens.map((t) => wordOf(t).cat));
  commit();
  vars.forEach(([, i]) => flashWord(i));
  sentenceEl.classList.remove('warp');
  void sentenceEl.offsetWidth;
  sentenceEl.classList.add('warp');
}

function speakNow() {
  const f = F();
  if (!f.tokens.length) return;
  const segs = sentenceSegments(f.tokens, state.words);
  const text = sentenceText(f.tokens, state.words, f.end);
  const starts = [];
  let pos = 0;
  segs.forEach((s) => { pos += s.sep.length; starts.push(pos); pos += s.text.length; });
  const mark = (k) => {
    sentenceEl.querySelectorAll('.w.say').forEach((el) => el.classList.remove('say'));
    if (k >= 0) sentenceEl.querySelector(`[data-i="${segs[k].index}"]`)?.classList.add('say');
    app.space.setCursor(k >= 0 ? segs[k].index : -1);
  };
  sentenceEl.classList.add('speaking');
  speak(text, {
    ...speechOpts(),
    onBoundary: (ci) => { let k = 0; starts.forEach((st, j) => { if (st <= ci) k = j; }); mark(k); },
  }).then(() => { sentenceEl.classList.remove('speaking'); mark(-1); });
  bumpStat('spoken');
  bumpSeen(f.tokens.map((t) => t.wordId));
  commit();
}

function save() {
  const f = F();
  if (!f.tokens.length) { toast({ kind: 'info', title: 'Nothing to save', body: 'Add a few stars to the forge first.' }); return; }
  const editing = f.editingId && state.constellations[f.editingId];
  const name = (f.name || '').trim() || cosmicName();
  f.name = name;
  const id = saveConstellation({ id: editing ? f.editingId : null, name, tokens: f.tokens, end: f.end });
  f.editingId = id;
  commit();
  unlockAudio();
  arpeggio(f.tokens.map((t) => wordOf(t).cat), 0.06);
  const n = countTokens(f.tokens, state.words, derived.byCat);
  toast({
    kind: 'signal', title: `${editing ? 'Updated' : 'New constellation'}: ${name}`,
    body: `${formatBig(n)} sentence${n === 1 ? '' : 's'} from one pattern. ${formatBig(derived.reach)} now within your reach.`,
  });
  f.tokens.forEach((t, k) => setTimeout(() => app.space.ripple(t.wordId), k * 90));
}

function newDraft() {
  state.forge = emptyForge();
  hidePopover();
  commit();
  textInput.focus();
}

function toGalaxy() {
  const f = F();
  if (!f.tokens.length) { toast({ kind: 'info', title: 'Nothing to send', body: 'Forge a sentence first.' }); return; }
  app.galaxy.addPart({ tokens: cloneTokens(f.tokens), end: f.end, name: f.name || 'Forge sentence' });
  app.galaxy.open();
}

export function loadConstellation(id) {
  const c = state.constellations[id];
  if (!c) return;
  state.forge = { tokens: cloneTokens(c.tokens), end: c.end, name: c.name, editingId: id };
  commit();
  open();
}

export function loadBlueprint(bp) {
  const r = resolveBlueprint(bp);
  if (!r) { toast({ kind: 'info', title: `${bp.name} is still dark`, body: 'Some of its stars are not lit yet.' }); return; }
  state.forge = { tokens: r.tokens, end: r.end, name: bp.name, editingId: null };
  commit();
  open();
  unlockAudio();
  arpeggio(r.tokens.map((t) => wordOf(t).cat));
}
