// Genesis: the first moments. Pure black, a few words drifting like
// distant motes. You choose one, and it ignites.

import { state, findWord, ignite, addWord, resetUniverse } from './store.js';
import { GENESIS_CHOICES } from './seed.js';
import { app, h, $ } from './ui.js';
import { unlockAudio } from './sfx.js';

const root = $('#genesis');

// Two loose arcs, above and below the text, so motes never cover it.
const SPOTS = [
  [16, 20], [38, 13], [62, 15], [84, 22],
  [14, 76], [36, 84], [64, 82], [86, 74],
];

export function runGenesis(onDone) {
  root.hidden = false;
  root.classList.remove('leaving');
  const motes = $('#genesisMotes');
  const form = $('#genesisOwn');
  const input = form.querySelector('input');
  const emptyBtn = $('#genesisEmpty');
  const lede = $('#genesisLede');

  const renderMotes = () => {
    motes.replaceChildren();
    if (state.mode !== 'english') return;
    GENESIS_CHOICES.forEach((text, i) => {
      const w = findWord(text);
      if (!w) return;
      const [x, y] = SPOTS[i % SPOTS.length];
      const c = state.categories[w.cat];
      motes.append(h('button', {
        class: 'mote',
        style: { left: `${x}%`, top: `${y}%`, '--c': c.color, '--d': `${2.6 + i * 0.22}s`, '--f': `${7 + (i % 4) * 1.7}s` },
        onclick: () => choose(w.id),
      }, h('span', { class: 'mote-dot' }), h('span', { class: 'mote-word' }, w.text)));
    });
  };

  const setMode = () => {
    const empty = state.mode !== 'english';
    lede.textContent = empty ? 'Bring your own language. Whisper your first word.' : 'Choose your first word.';
    input.placeholder = empty ? 'your first word, in any language' : '…or whisper your own word';
    emptyBtn.textContent = empty ? 'Use the English starter universe instead' : 'Start an empty universe — any language';
    renderMotes();
  };

  function finish(id) {
    root.classList.add('leaving');
    setTimeout(() => { root.hidden = true; }, 1300);
    onDone(id);
  }

  function choose(id) {
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
    const existing = findWord(text);
    if (existing) { choose(existing.id); return; }
    app.space.setMode('live');
    const w = addWord({ text, cat: 'uncharted' });
    if (!w) return;
    app.space.jumpTo(w.x, w.y, 0.16);
    app.space.flyTo(w.x, w.y, 1.3, 2800);
    finish(w.id);
    setTimeout(() => app.panels.classify([w.id]), 1600);
  };

  emptyBtn.onclick = () => {
    resetUniverse(state.mode === 'english' ? 'empty' : 'english');
    setMode();
    input.focus();
  };

  setMode();
}
