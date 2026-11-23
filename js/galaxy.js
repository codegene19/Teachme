// Galaxies: sentences linked into paragraphs. Each link is itself a
// variable — a full stop, or any LINK star you have discovered
// (and, but, because, so…).

import {
  state, derived, on, commit, persist, bumpSeen, bumpStat, saveGalaxy, cosmicName,
  emptyGalaxy, removePart, cloneTokens,
} from './store.js';
import {
  paragraphSegments, paragraphText, sentenceText, countParagraph, countTokens, formatBig, pickRandom, optionsFor,
} from './language.js';
import { app, h, fill, $, icon, toast, showPopover, hidePopover } from './ui.js';
import { chime, arpeggio, speak, unlockAudio } from './sfx.js';
import { speechOpts } from './panels.js';
import { glossed } from './forge.js';
import { randomStory, canGenerate } from './generate.js';

const root = $('#galaxy');
let paraEl, partsEl, countEl, countLabel, nameInput, addSel, saveBtn, editTag;

const G = () => state.galaxyDraft;
const linkOptions = () => [null, ...(derived.orbit.link || [])];

export function initGalaxy() {
  nameInput = h('input', {
    class: 'name-input', placeholder: 'Unnamed galaxy', maxlength: 40, 'aria-label': 'Galaxy name',
    oninput: (e) => { G().name = e.target.value; persist(); },
  });
  countEl = h('b', { class: 'count-n' }, '0');
  editTag = h('span', { class: 'edit-tag', hidden: true }, 'editing');
  paraEl = h('p', { class: 'paragraph', 'aria-live': 'polite' });
  partsEl = h('ol', { class: 'parts' });
  addSel = h('select', { class: 'select', 'aria-label': 'Sentence to add' });
  saveBtn = h('button', { class: 'btn primary', onclick: save }, icon('star', 16), h('span', {}, 'Save galaxy'));

  root.replaceChildren(
    h('div', { class: 'sheet-head' },
      h('div', { class: 'sheet-title' }, h('span', { class: 'kicker' }, icon('galaxy', 14), 'Galaxy'), nameInput, editTag),
      h('div', { class: 'sheet-count', title: 'Different paragraphs this galaxy can make' }, countEl, countLabel = h('span', {}, 'paragraphs')),
      h('button', { class: 'icon-btn', 'aria-label': 'Close galaxy', onclick: close }, icon('close'))),
    paraEl,
    partsEl,
    h('div', { class: 'add-row' }, addSel, h('button', { class: 'btn', onclick: addSelected }, icon('plus', 16), 'Add sentence')),
    h('div', { class: 'sheet-actions' },
      h('button', { class: 'btn', onclick: shuffleAll }, icon('shuffle', 16), h('span', {}, 'Shuffle all')),
      h('button', { class: 'btn', onclick: speakAll }, icon('speak', 16), h('span', {}, 'Hear')),
      h('button', { class: 'btn accent-btn', onclick: () => writeStory() }, icon('spark', 16), h('span', {}, 'Write a story')),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn ghost', onclick: newDraft }, 'New'),
      saveBtn));

  on('change', () => { if (isOpen()) render(); });
  app.galaxy = { open, close, toggle, isOpen, addPart, loadGalaxy, writeStory };
}

export const isOpen = () => !root.hidden;

export function open() {
  app.forge?.close();
  root.hidden = false;
  document.body.classList.add('sheet-open');
  render();
  requestAnimationFrame(() => root.classList.add('in'));
  app.onSheetChange?.();
  const ids = pathIds();
  if (ids.length) setTimeout(() => app.space.fitIds(ids, { maxZ: 1.1 }), 30);
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

function pathIds() {
  const g = G();
  const ids = [];
  g.parts.forEach((p, i) => {
    p.tokens.forEach((t) => ids.push(t.wordId));
    if (g.joins[i]) ids.push(g.joins[i]);
  });
  return ids;
}

// ---------------------------------------------------------------- render
function render() {
  const g = G();
  if (document.activeElement !== nameInput) nameInput.value = g.name || '';
  const editing = g.editingId && state.galaxies[g.editingId];
  editTag.hidden = !editing;
  saveBtn.lastChild.textContent = editing ? 'Update galaxy' : 'Save galaxy';

  // the paragraph itself
  const segs = paragraphSegments(g.parts, g.joins, state.words);
  if (!segs.length) {
    fill(paraEl, h('span', { class: 'placeholder' }, 'Press “Write a story” for a paragraph built from your stars, or add two or more sentences below. The link between them is a variable too — a full stop, or a bridge star like “because”, “but”, “so”.'));
  } else {
    fill(paraEl, ...segs.flatMap((s) => {
      if (s.kind === 'punct') return [h('span', { class: 'end' }, s.text)];
      if (s.kind === 'join') return [s.sep, glossed(s.text, s.gloss, { class: 'w var join', style: { '--c': state.categories.link.color }, onclick: () => cycleJoin(s.joinIndex, 1) }, 'button')];
      const c = state.categories[s.slot] || state.categories[s.cat] || state.categories.uncharted;
      return [s.sep, s.isVar
        ? glossed(s.text, s.gloss, { class: 'w var', style: { '--c': c.color }, 'data-p': String(s.partIndex), 'data-i': String(s.index), onclick: (e) => cycleVar(s.partIndex, s.index, e.shiftKey ? -1 : 1) }, 'button')
        : glossed(s.text, s.gloss, { class: 'w' })];
    }));
  }

  // the list of parts with their links
  const items = [];
  g.parts.forEach((p, i) => {
    const n = countTokens(p.tokens, state.words, derived.orbit);
    items.push(h('li', { class: 'part' },
      h('span', { class: 'part-n' }, String(i + 1)),
      h('div', { class: 'part-main' },
        h('div', { class: 'part-text' }, sentenceText(p.tokens, state.words, p.end)),
        h('div', { class: 'part-meta' }, `${p.name || 'sentence'} · ${formatBig(n)} variations`)),
      h('div', { class: 'part-tools' },
        h('button', { class: 'icon-btn small', 'aria-label': 'Shuffle this sentence', onclick: () => shufflePart(i) }, icon('shuffle', 16)),
        h('button', { class: 'icon-btn small', 'aria-label': 'Move up', disabled: i === 0, onclick: () => movePart(i, -1) }, icon('up', 16)),
        h('button', { class: 'icon-btn small', 'aria-label': 'Move down', disabled: i === g.parts.length - 1, onclick: () => movePart(i, 1) }, icon('down', 16)),
        h('button', { class: 'icon-btn small danger', 'aria-label': 'Remove sentence', onclick: () => { removePart(G(), i); commit(); } }, icon('trash', 16)))));
    if (i < g.parts.length - 1) {
      const jw = g.joins[i] ? state.words[g.joins[i]] : null;
      items.push(h('li', { class: 'join-row' },
        h('span', { class: 'join-line' }),
        h('button', {
          class: 'join-chip' + (jw ? ' word' : ''), style: { '--c': state.categories.link.color },
          'aria-label': `Link: ${jw ? jw.text : 'full stop'}. Click to change`,
          onclick: (e) => openJoinMenu(i, e.currentTarget),
        }, h('span', { class: 'chip-cat' }, 'LINK'), h('span', { class: 'chip-word' }, jw ? jw.text : '· full stop')),
        h('span', { class: 'join-line' })));
    }
  });
  fill(partsEl, ...items);
  partsEl.hidden = !items.length;

  // source picker
  const consts = Object.values(state.constellations).sort((a, b) => b.updatedAt - a.updatedAt);
  const prev = addSel.value;
  fill(addSel, 
    state.forge.tokens.length ? h('option', { value: '__forge' }, `Forge: ${sentenceText(state.forge.tokens, state.words, state.forge.end)}`) : null,
    consts.map((c) => h('option', { value: c.id }, `${c.name} — ${sentenceText(c.tokens, state.words, c.end)}`)));
  if ([...addSel.options].some((o) => o.value === prev)) addSel.value = prev;
  addSel.disabled = !addSel.options.length;
  if (!addSel.options.length) addSel.append(h('option', {}, 'Save a constellation in the Forge first'));

  const np = g.parts.length ? countParagraph(g.parts, g.joins, state.words, derived.orbit) : 0;
  countEl.textContent = formatBig(np);
  countLabel.textContent = np === 1 ? 'paragraph' : 'paragraphs';
  app.space.setPath(pathIds());
}

function openJoinMenu(i, anchor) {
  const g = G();
  const opts = linkOptions();
  const body = h('div', { class: 'pop-body', style: { '--c': state.categories.link.color } },
    h('div', { class: 'pop-head' }, h('i', { class: 'dot' }), h('b', {}, 'LINK'), h('span', { class: 'dim' }, `${opts.length - 1} bridge stars lit`)),
    h('div', { class: 'orbit-options' }, opts.map((id) => h('button', {
      class: 'opt' + ((g.joins[i] || null) === id ? ' active' : ''),
      onclick: () => { setJoin(i, id); hidePopover(); },
    }, id ? state.words[id].text : '· full stop'))),
    opts.length < 2 ? h('p', { class: 'pop-note' }, 'Discover LINK stars (and, but, because…) in the Bridge Core at the centre of your universe.') : null);
  showPopover(anchor, body);
}

// --------------------------------------------------------------- actions
export function addPart(part) {
  const g = G();
  g.parts.push({ name: part.name || '', end: part.end || '.', tokens: cloneTokens(part.tokens) });
  if (g.parts.length > 1) {
    const links = derived.orbit.link || [];
    g.joins.push(links.length ? pickRandom(links) : null);
  }
  commit();
}

function addSelected() {
  const v = addSel.value;
  if (!v || addSel.disabled) return;
  if (v === '__forge') addPart({ tokens: state.forge.tokens, end: state.forge.end, name: state.forge.name || 'Forge sentence' });
  else {
    const c = state.constellations[v];
    if (c) addPart({ tokens: c.tokens, end: c.end, name: c.name });
  }
  unlockAudio();
  const last = G().parts[G().parts.length - 1];
  if (last) arpeggio(last.tokens.map((t) => state.words[t.wordId]?.cat));
  app.space.fitIds(pathIds(), { maxZ: 1.1 });
}

function setJoin(i, id) {
  G().joins[i] = id;
  if (id) { bumpSeen([id]); unlockAudio(); chime('link', { gain: 0.45 }); app.space.ripple(id); }
  bumpStat('swaps');
  bumpStat('made');
  commit();
}

function cycleJoin(i, dir) {
  const opts = linkOptions();
  const k = opts.indexOf(G().joins[i] || null);
  setJoin(i, opts[(k + dir + opts.length) % opts.length]);
}

function cycleVar(pi, ti, dir) {
  const t = G().parts[pi]?.tokens[ti];
  if (!t) return;
  const opts = optionsFor(t, state.words, derived.orbit);
  if (opts.length < 2) return;
  const k = opts.indexOf(t.wordId);
  t.wordId = opts[(k + dir + opts.length) % opts.length];
  bumpStat('swaps');
  bumpStat('made');
  bumpSeen([t.wordId]);
  unlockAudio();
  chime(state.words[t.wordId].cat, { gain: 0.4, dur: 0.9 });
  app.space.ripple(t.wordId);
  commit();
}

function shufflePart(i, { quiet = false } = {}) {
  const p = G().parts[i];
  if (!p) return;
  for (const t of p.tokens) {
    if (!t.var) continue;
    const next = pickRandom(optionsFor(t, state.words, derived.orbit), t.wordId);
    if (next) t.wordId = next;
  }
  bumpSeen(p.tokens.map((t) => t.wordId));
  if (!quiet) { unlockAudio(); arpeggio(p.tokens.map((t) => state.words[t.wordId]?.cat)); commit(); }
}

function shuffleAll() {
  const g = G();
  if (!g.parts.length) return;
  g.parts.forEach((_, i) => shufflePart(i, { quiet: true }));
  const links = derived.orbit.link || [];
  g.joins = g.joins.map((j) => (Math.random() < 0.2 || !links.length ? null : pickRandom(links, j)));
  bumpStat('shuffles');
  bumpStat('made');
  unlockAudio();
  arpeggio(pathIds().map((id) => state.words[id]?.cat), 0.06);
  commit();
  paraEl.classList.remove('warp');
  void paraEl.offsetWidth;
  paraEl.classList.add('warp');
}

function movePart(i, d) {
  const g = G();
  const j = i + d;
  if (j < 0 || j >= g.parts.length) return;
  [g.parts[i], g.parts[j]] = [g.parts[j], g.parts[i]];
  commit();
}

function speakAll() {
  const g = G();
  if (!g.parts.length) return;
  paraEl.classList.add('speaking');
  speak(paragraphText(g.parts, g.joins, state.words), speechOpts()).then(() => paraEl.classList.remove('speaking'));
  bumpStat('spoken');
  bumpStat('made');
  bumpSeen(pathIds());
  commit();
}

function save() {
  const g = G();
  if (g.parts.length < 2) {
    toast({ kind: 'info', title: 'A galaxy needs two sentences', body: 'Add at least two sentences, then link them.' });
    return;
  }
  const editing = g.editingId && state.galaxies[g.editingId];
  g.name = (g.name || '').trim() || cosmicName('galaxy');
  g.editingId = saveGalaxy({ id: editing ? g.editingId : null, name: g.name, parts: g.parts, joins: g.joins });
  commit();
  unlockAudio();
  arpeggio(pathIds().map((id) => state.words[id]?.cat), 0.05);
  toast({ kind: 'signal', title: `${editing ? 'Updated' : 'New galaxy'}: ${g.name}`, body: `${formatBig(countParagraph(g.parts, g.joins, state.words, derived.orbit))} possible paragraphs.` });
}

function newDraft() {
  state.galaxyDraft = emptyGalaxy();
  hidePopover();
  commit();
}

/** A short story from your stars: one subject, one timeline, joined by bridge words. */
export function writeStory(length = 3) {
  const story = canGenerate() && randomStory(length);
  if (!story || !story.parts.length) {
    toast({ kind: 'info', title: 'Not enough stars yet', body: 'Light a few more stars so full patterns can form.' });
    return;
  }
  state.galaxyDraft = { parts: story.parts, joins: story.joins, name: cosmicName('galaxy'), editingId: null };
  bumpStat('made');
  bumpSeen(pathIds());
  commit();
  if (!isOpen()) open();
  root.scrollTop = 0;
  unlockAudio();
  arpeggio(pathIds().map((id) => state.words[id]?.cat), 0.05);
  paraEl.classList.remove('warp');
  void paraEl.offsetWidth;
  paraEl.classList.add('warp');
  app.space.fitIds(pathIds(), { maxZ: 1, dur: 1000 });
}

export function loadGalaxy(id) {
  const gx = state.galaxies[id];
  if (!gx) return;
  state.galaxyDraft = {
    parts: gx.parts.map((p) => ({ ...p, tokens: cloneTokens(p.tokens) })),
    joins: gx.joins.slice(), name: gx.name, editingId: id,
  };
  commit();
  open();
}
