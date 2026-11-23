// Star card, word dialogs, sector classification, and settings.

import {
  state, derived, on, updateWord, deleteWord, addWord, addCategory, setSetting,
  resetUniverse, exportUniverse, importUniverse, findWord,
} from './store.js';
import { app, h, fill, $, icon, openModal, closeModal, toast } from './ui.js';
import { speak, getVoices, speechSupported, setSoundEnabled } from './sfx.js';

export const TIERS = [
  { name: 'Spark', min: 0 },
  { name: 'Flame', min: 5 },
  { name: 'Star', min: 15 },
  { name: 'Giant', min: 30 },
  { name: 'Supernova', min: 50 },
];

export function mastery(seen = 0) {
  let i = TIERS.length - 1;
  while (i > 0 && seen < TIERS[i].min) i--;
  const next = TIERS[i + 1];
  const pct = next ? ((seen - TIERS[i].min) / (next.min - TIERS[i].min)) * 100 : 100;
  return { ...TIERS[i], tier: i, next: next?.min ?? null, pct: Math.max(4, Math.min(100, pct)) };
}

export const speechOpts = () => ({ rate: state.settings.rate, voiceURI: state.settings.voiceURI, lang: state.settings.lang });

let cardId = null;
const card = () => $('#starCard');

export function initPanels() {
  app.panels = { openStarCard, closeStarCard, addWordDialog, classify, editWordDialog, settings, cardOpen: () => cardId };
  on('change', () => {
    if (!cardId) return;
    if (card().contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    renderCard();
  });
}

// ------------------------------------------------------------- star card
export function openStarCard(id) {
  if (!state.words[id]) return;
  cardId = id;
  app.space?.setSelected(id);
  renderCard();
  card().hidden = false;
  card().classList.remove('in');
  void card().offsetWidth;
  card().classList.add('in');
}

export function closeStarCard() {
  if (!cardId) return;
  cardId = null;
  app.space?.setSelected(null);
  card().hidden = true;
}

function renderCard() {
  const w = state.words[cardId];
  if (!w) { closeStarCard(); return; }
  const c = state.categories[w.cat] || state.categories.uncharted;
  const m = mastery(w.seen);
  const neighbors = [...(derived.adj.get(w.id) || [])]
    .map((id) => state.words[id])
    .filter((n) => n && (n.lit || derived.discoverable.has(n.id)))
    .sort((a, b) => Number(b.lit) - Number(a.lit) || a.order - b.order)
    .slice(0, 14);
  let noteTimer = null;
  const note = h('textarea', {
    class: 'note-input', rows: 2, maxlength: 200, placeholder: 'Write the meaning in your own language…',
    oninput: (e) => { clearTimeout(noteTimer); const v = e.target.value; noteTimer = setTimeout(() => updateWord(w.id, { note: v }), 350); },
    onblur: (e) => { clearTimeout(noteTimer); if (e.target.value !== w.note) updateWord(w.id, { note: e.target.value }); },
  });
  note.value = w.note || '';

  card().style.setProperty('--c', c.color);
  fill(card(), 
    h('div', { class: 'card-top' },
      h('span', { class: 'sector-pill' }, h('i'), h('b', {}, c.label), h('span', {}, c.sector)),
      h('button', { class: 'icon-btn', 'aria-label': 'Close star card', onclick: closeStarCard }, icon('close'))),
    h('div', { class: 'card-word' },
      h('span', { class: 'card-text' }, w.text),
      h('button', { class: 'icon-btn speak-btn', 'aria-label': `Say “${w.text}”`, onclick: () => speak(w.text, speechOpts()) }, icon('speak', 20))),
    h('div', { class: 'mastery', title: m.next ? `${m.next - w.seen} more encounters to the next tier` : 'Fully mastered' },
      h('span', { class: 'mastery-name' }, `✦ ${m.name}`),
      h('span', { class: 'bar' }, h('i', { style: { width: `${m.pct}%` } })),
      h('span', { class: 'mastery-n' }, `met ${w.seen}×`)),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Meaning / note'), note),
    neighbors.length ? h('div', { class: 'card-links' },
      h('div', { class: 'field-label' }, 'Linked stars'),
      h('div', { class: 'mini-chips' }, neighbors.map((n) => h('button', {
        class: 'mini-chip' + (n.lit ? '' : ' unlit'),
        style: { '--c': state.categories[n.cat]?.color || '#999' },
        title: n.lit ? `Go to “${n.text}”` : `Ignite “${n.text}”`,
        onclick: () => {
          if (n.lit) { app.space.focusWord(n.id); openStarCard(n.id); }
          else app.igniteFromMap(n.id);
        },
      }, n.lit ? null : h('span', { class: 'spark' }, '✧'), n.text)))) : null,
    h('div', { class: 'card-actions' },
      h('button', { class: 'btn primary', onclick: () => app.forge.addWord(w.id) }, icon('plus', 16), 'Add to sentence'),
      w.cat === 'uncharted' ? h('button', { class: 'btn', onclick: () => classify([w.id]) }, 'Give it a sector') : null,
      !w.seed ? h('button', { class: 'btn ghost', onclick: () => editWordDialog(w.id) }, icon('edit', 16), 'Edit') : null));
}

// ---------------------------------------------------------- sector picker
function sectorPicker(selected, onPick, { allowNew = true, includeUncharted = false } = {}) {
  const wrap = h('div', { class: 'sector-grid', role: 'radiogroup', 'aria-label': 'Sector' });
  const cats = Object.values(state.categories)
    .filter((c) => includeUncharted || c.id !== 'uncharted')
    .sort((a, b) => a.order - b.order);
  let current = selected;
  const draw = () => {
    fill(wrap, 
      ...cats.map((c) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(current === c.id),
        class: 'sector-opt' + (current === c.id ? ' active' : ''), style: { '--c': c.color },
        onclick: () => { current = c.id; draw(); onPick(c.id); },
      }, h('i'), h('b', {}, c.label), h('span', {}, c.blurb))),
      allowNew ? h('button', {
        type: 'button', class: 'sector-opt new',
        onclick: () => {
          const input = h('input', { class: 'text-input', placeholder: 'Sector name, e.g. FOOD', maxlength: 16 });
          const row = h('form', { class: 'new-sector', onsubmit: (e) => {
            e.preventDefault();
            const id = addCategory(input.value);
            if (!id) return;
            cats.push(state.categories[id]);
            current = id;
            draw();
            onPick(id);
          } }, input, h('button', { class: 'btn small', type: 'submit' }, 'Create'));
          wrap.append(row);
          input.focus();
        },
      }, h('i', { class: 'plus' }, '+'), h('b', {}, 'NEW SECTOR'), h('span', {}, 'chart your own')) : null);
  };
  draw();
  return wrap;
}

// ----------------------------------------------------------- add a word
export function addWordDialog({ text = '' } = {}) {
  let cat = state.mode === 'english' ? 'thing' : null;
  const input = h('input', { class: 'text-input big', placeholder: 'A word or short phrase', maxlength: 40, value: text, autofocus: true });
  const note = h('input', { class: 'text-input', placeholder: 'Meaning in your language (optional)', maxlength: 200 });
  const status = h('p', { class: 'form-status', 'aria-live': 'polite' });
  const picker = sectorPicker(cat, (id) => { cat = id; });
  const submit = () => {
    const t = input.value.trim();
    if (!t) { status.textContent = 'Type a word first.'; input.focus(); return; }
    const existing = findWord(t);
    if (existing?.lit) {
      closeModal();
      app.space.focusWord(existing.id);
      openStarCard(existing.id);
      toast({ kind: 'info', title: `“${existing.text}” already shines`, body: `It lives in the ${state.categories[existing.cat].sector}.` });
      return;
    }
    if (existing) {
      closeModal();
      app.igniteFromMap(existing.id);
      app.space.focusWord(existing.id, 1.2);
      return;
    }
    const w = addWord({ text: t, cat: cat || 'uncharted', note: note.value });
    closeModal();
    if (w) { app.space.focusWord(w.id, 1.2); setTimeout(() => openStarCard(w.id), 500); }
  };
  openModal({
    kicker: 'New star',
    title: 'Ignite a word',
    body: h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); submit(); } },
      input,
      h('div', { class: 'field-label' }, 'Which sector does it orbit? Words in the same sector can replace each other.'),
      picker, note, status,
      h('button', { type: 'submit', class: 'hidden-submit', tabindex: '-1' })),
    footer: [h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn primary', onclick: submit }, icon('spark', 16), 'Ignite')],
  });
}

// --------------------------------------------- classify new (typed) words
const queue = [];
let classifying = false;
export function classify(ids) {
  for (const id of ids) if (!queue.includes(id)) queue.push(id);
  if (!classifying) nextClassify();
}
function nextClassify() {
  const id = queue.shift();
  const w = id && state.words[id];
  if (!w) { classifying = false; return; }
  classifying = true;
  let picked = false;
  openModal({
    kicker: `New star · ${queue.length ? `${queue.length + 1} to chart` : 'uncharted'}`,
    title: `“${w.text}”`,
    body: h('div', { class: 'stack' },
      h('p', { class: 'lede' }, 'This word isn’t on the star map yet. Which sector does it belong to? That decides which words it can swap with.'),
      sectorPicker(null, (cat) => {
        picked = true;
        updateWord(id, { cat });
        app.space.burst(id);
        setTimeout(closeModal, 220);
      })),
    footer: [h('button', { class: 'btn ghost', onclick: closeModal }, 'Leave uncharted')],
    onClose: () => { void picked; setTimeout(nextClassify, 120); },
  });
}

// ------------------------------------------------------------ edit word
export function editWordDialog(id) {
  const w = state.words[id];
  if (!w || w.seed) return;
  let cat = w.cat;
  const input = h('input', { class: 'text-input big', maxlength: 40, value: w.text });
  const note = h('input', { class: 'text-input', placeholder: 'Meaning in your language', maxlength: 200, value: w.note || '' });
  const status = h('p', { class: 'form-status', 'aria-live': 'polite' });
  let confirmDel = false;
  const delBtn = h('button', { class: 'btn danger ghost', onclick: () => {
    if (!confirmDel) { confirmDel = true; delBtn.lastChild.textContent = 'Click again to delete'; return; }
    deleteWord(id);
    closeModal();
    closeStarCard();
    toast({ kind: 'info', title: `“${w.text}” faded from the sky` });
  } }, icon('trash', 16), h('span', {}, 'Delete star'));
  const save = () => {
    const t = input.value.trim();
    const clash = findWord(t);
    if (!t) { status.textContent = 'A star needs a name.'; return; }
    if (clash && clash.id !== id) { status.textContent = `“${clash.text}” already exists.`; return; }
    updateWord(id, { text: t, note: note.value, cat });
    closeModal();
    app.space.focusWord(id);
  };
  openModal({
    kicker: 'Edit star',
    title: w.text,
    body: h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); save(); } },
      input, sectorPicker(cat, (c) => { cat = c; }, { includeUncharted: true }), note, status,
      h('button', { type: 'submit', class: 'hidden-submit', tabindex: '-1' })),
    footer: [delBtn, h('span', { class: 'grow' }), h('button', { class: 'btn ghost', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn primary', onclick: save }, 'Save')],
  });
}

// ------------------------------------------------------------- settings
function toggle(label, desc, value, onChange) {
  const input = h('input', { type: 'checkbox', checked: !!value, onchange: (e) => onChange(e.target.checked) });
  return h('label', { class: 'toggle' }, input, h('span', { class: 'switch' }), h('span', { class: 'toggle-text' }, h('b', {}, label), desc && h('small', {}, desc)));
}

export function settings() {
  const voices = getVoices().slice().sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  const voiceSel = h('select', { class: 'select', onchange: (e) => setSetting('voiceURI', e.target.value) },
    h('option', { value: '' }, state.settings.lang ? `Automatic (${state.settings.lang})` : 'Browser default'),
    voices.map((v) => h('option', { value: v.voiceURI, selected: v.voiceURI === state.settings.voiceURI }, `${v.name} — ${v.lang}`)));
  const rateOut = h('output', {}, `${state.settings.rate.toFixed(2)}×`);
  const rate = h('input', { type: 'range', min: '0.5', max: '1.3', step: '0.05', value: String(state.settings.rate), oninput: (e) => { setSetting('rate', Number(e.target.value)); rateOut.textContent = `${Number(e.target.value).toFixed(2)}×`; } });
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', onchange: async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      importUniverse(JSON.parse(await f.text()));
      closeModal();
      toast({ kind: 'info', title: 'Universe restored', body: `${derived.litCount} stars are shining again.` });
      app.onUniverseReplaced?.();
    } catch (err) {
      toast({ kind: 'warn', title: 'Could not import', body: err.message });
    }
  } });
  let confirmReset = '';
  const resetBtn = (mode, label) => {
    const b = h('button', { class: 'btn ghost danger', onclick: () => {
      if (confirmReset !== mode) { confirmReset = mode; b.textContent = 'Click again — this erases your universe'; return; }
      resetUniverse(mode);
      closeModal();
      app.onUniverseReplaced?.();
    } }, label);
    return b;
  };

  openModal({
    kicker: 'Ship settings',
    title: 'Settings',
    size: 'wide',
    body: h('div', { class: 'stack' },
      h('section', { class: 'set-group' },
        h('h3', {}, 'Sound'),
        toggle('Chimes', 'Every sector sings its own note.', state.settings.sound, (v) => { setSetting('sound', v); setSoundEnabled(v); }),
        toggle('Say new words aloud', 'Hear each word the moment you discover it.', state.settings.speakOnIgnite, (v) => setSetting('speakOnIgnite', v))),
      h('section', { class: 'set-group' },
        h('h3', {}, 'Voice'),
        speechSupported()
          ? [h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Speaking voice — pick one in the language you are learning'), voiceSel),
            h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Speed ', rateOut), rate),
            h('button', { class: 'btn small', onclick: () => speak(state.mode === 'english' ? 'I want coffee now.' : 'Lexicosmos', speechOpts()) }, icon('speak', 16), 'Test voice')]
          : h('p', { class: 'lede' }, 'Speech is not available in this browser.')),
      h('section', { class: 'set-group' },
        h('h3', {}, 'Universe'),
        h('p', { class: 'lede' }, 'Your universe lives in this browser. Export it to keep a copy or move it to another device.'),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn', onclick: () => {
            const blob = new Blob([exportUniverse()], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: `lexicosmos-${new Date().toISOString().slice(0, 10)}.json` });
            document.body.append(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
          } }, icon('download', 16), 'Export'),
          h('button', { class: 'btn', onclick: () => file.click() }, icon('upload', 16), 'Import'),
          file),
        h('div', { class: 'row wrap' },
          resetBtn('english', 'Restart: English starter universe'),
          resetBtn('empty', 'Restart: empty universe (any language)'))),
      h('section', { class: 'set-group about' },
        h('h3', {}, 'Why this works'),
        h('p', {}, 'You don’t need fifty thousand words. You need a few dozen you truly own — and the patterns that let each one slide into a thousand sentences. Every sector is a slot; every slot multiplies. Five subjects × twelve actions × fourteen things × eight times is already 6,720 sentences.'))),
  });
}
