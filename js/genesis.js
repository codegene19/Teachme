// Genesis: the first moments. Pure black. First you choose a language,
// then its most-used words drift in like distant motes. You choose one,
// and it ignites.

import { state, findWord, ignite, addWord, resetUniverse, pack } from './store.js';
import { PACKS } from './packs/index.js';
import { app, h, fill, $ } from './ui.js';
import { unlockAudio, speak } from './sfx.js';
import { speechOpts } from './panels.js';

const root = $('#genesis');

// Two loose arcs, above and below the text, so motes never cover it.
const SPOTS = [
  [16, 20], [38, 13], [62, 15], [84, 22],
  [14, 76], [36, 84], [64, 82], [86, 74],
];

const LANGS = [
  { id: 'it', sample: 'Io voglio un caffè.' },
  { id: 'es', sample: 'Yo quiero un café.' },
];

export function runGenesis(onDone, { askLanguage = true } = {}) {
  root.hidden = false;
  root.classList.remove('leaving', 'chosen');
  const motes = $('#genesisMotes');
  const langs = $('#genesisLangs');
  const form = $('#genesisOwn');
  const input = form.querySelector('input');
  const alt = $('#genesisAlt');
  const lede = $('#genesisLede');

  function showLanguages() {
    root.classList.remove('chosen');
    lede.textContent = 'Choose a language to learn.';
    fill(motes);
    form.hidden = true;
    langs.hidden = false;
    fill(langs, LANGS.map(({ id, sample }) => {
      const p = PACKS[id];
      return h('button', { class: 'lang-card', onclick: () => choosePack(id) },
        h('span', { class: 'lang-name' }, p.name),
        h('span', { class: 'lang-sub' }, `${p.english} · ${p.levels.length} levels · the ${p.words.length} most-used words`),
        h('span', { class: 'lang-sample' }, sample));
    }));
    fill(alt,
      h('span', {}, 'or '),
      h('button', { type: 'button', class: 'link-btn', onclick: () => choosePack('en') }, 'English'),
      h('span', {}, ' · '),
      h('button', { type: 'button', class: 'link-btn', onclick: () => choosePack(null) }, 'an empty universe, any language'));
  }

  function choosePack(id) {
    unlockAudio();
    resetUniverse(id);
    const p = pack();
    if (p?.hello) speak(p.hello, speechOpts());
    showWords({ quick: true });
  }

  function showWords({ quick = false } = {}) {
    root.classList.add('chosen');
    langs.hidden = true;
    form.hidden = false;
    const p = pack();
    lede.textContent = p ? `${p.name} · Choose your first word.` : 'Bring your own language. Whisper your first word.';
    input.placeholder = p ? '…or whisper your own word' : 'your first word, in any language';
    fill(motes, (p?.genesis || []).slice(0, SPOTS.length).map((text, i) => {
      const w = findWord(text);
      if (!w) return null;
      const [x, y] = SPOTS[i];
      const c = state.categories[w.cat];
      const delay = quick ? 0.15 + i * 0.12 : 2.6 + i * 0.22;
      return h('button', {
        class: 'mote',
        style: { left: `${x}%`, top: `${y}%`, '--c': c.color, '--d': `${delay}s`, '--f': `${7 + (i % 4) * 1.7}s` },
        onclick: () => chooseWord(w.id),
      }, h('span', { class: 'mote-dot' }), h('span', { class: 'mote-word' }, w.text), w.gloss ? h('span', { class: 'mote-gloss' }, w.gloss) : null);
    }));
    fill(alt, askLanguage
      ? h('button', { type: 'button', class: 'link-btn', onclick: () => showLanguages() }, '← choose another language')
      : null);
    if (quick && window.matchMedia('(pointer: fine)').matches) setTimeout(() => input.focus({ preventScroll: true }), 400);
  }

  function finish(id) {
    root.classList.add('leaving');
    setTimeout(() => { root.hidden = true; }, 1300);
    onDone(id);
  }

  function chooseWord(id) {
    unlockAudio();
    const w = state.words[id];
    app.space.setMode('live');
    app.space.jumpTo(w.x, w.y, 0.16);
    ignite(id);
    app.space.flyTo(w.x, w.y, 1.3, 2800);
    finish(id);
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    unlockAudio();
    input.value = '';
    const existing = findWord(text);
    if (existing) { chooseWord(existing.id); return; }
    app.space.setMode('live');
    const w = addWord({ text, cat: 'uncharted' });
    if (!w) return;
    app.space.jumpTo(w.x, w.y, 0.16);
    app.space.flyTo(w.x, w.y, 1.3, 2800);
    finish(w.id);
    setTimeout(() => app.panels.classify([w.id]), 1600);
  };

  if (askLanguage) showLanguages(); else showWords();
}
