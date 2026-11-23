// The Logbook: your star chart — words by sector, constellations, galaxies, missions.

import { state, derived, on, deleteConstellation, deleteGalaxy, resolveBlueprint } from './store.js';
import { BLUEPRINTS, SEED_WORDS } from './seed.js';
import { sentenceText, paragraphText, countTokens, countParagraph, formatBig } from './language.js';
import { app, h, fill, $, icon } from './ui.js';
import { MISSIONS, doneCount } from './missions.js';
import { mastery } from './panels.js';

const root = $('#log');
let tab = 'stars';
let bodyEl, tabsEl;
const TABS = [['stars', 'Stars'], ['constellations', 'Constellations'], ['galaxies', 'Galaxies'], ['missions', 'Missions']];

export function initLog() {
  tabsEl = h('div', { class: 'tabs', role: 'tablist' });
  bodyEl = h('div', { class: 'log-body' });
  root.replaceChildren(
    h('div', { class: 'log-head' },
      h('span', { class: 'kicker' }, icon('log', 14), 'Logbook'),
      h('button', { class: 'icon-btn', 'aria-label': 'Close logbook', onclick: close }, icon('close'))),
    tabsEl, bodyEl);
  on('change', () => { if (isOpen()) render(); });
  app.log = { open, close, toggle, isOpen, show };
}

export const isOpen = () => !root.hidden;
export function open() {
  root.hidden = false;
  document.body.classList.add('log-open');
  render();
  app.onSheetChange?.();
}
export function close() {
  if (root.hidden) return;
  root.hidden = true;
  document.body.classList.remove('log-open');
  app.onSheetChange?.();
}
export const toggle = () => (isOpen() ? close() : open());
export function show(t) { tab = t; open(); }

function render() {
  const counts = {
    stars: derived.litCount, constellations: Object.keys(state.constellations).length,
    galaxies: Object.keys(state.galaxies).length, missions: `${doneCount()}/${MISSIONS.length}`,
  };
  fill(tabsEl, ...TABS.map(([id, label]) => h('button', {
    class: 'tab' + (tab === id ? ' active' : ''), role: 'tab', 'aria-selected': String(tab === id),
    onclick: () => { tab = id; render(); },
  }, label, h('small', {}, String(counts[id])))));
  const scroll = bodyEl.scrollTop;
  fill(bodyEl, ...({ stars, constellations, galaxies, missions }[tab])());
  bodyEl.scrollTop = scroll;
}

function stars() {
  const cats = Object.values(state.categories).sort((a, b) => a.order - b.order);
  const out = [];
  const lit = derived.litCount;
  out.push(h('p', { class: 'lede' }, lit
    ? `${lit} star${lit === 1 ? '' : 's'} lit. Tap one to fly there.`
    : 'No stars yet.'));
  for (const c of cats) {
    const ids = derived.byCat[c.id] || [];
    const total = state.mode === 'english' && SEED_WORDS[c.id] ? Object.values(state.words).filter((w) => w.cat === c.id).length : null;
    if (!ids.length) {
      if (total && !c.custom) out.push(h('div', { class: 'sector dark', style: { '--c': c.color } }, h('div', { class: 'sector-head' }, h('i'), h('b', {}, '?'.repeat(Math.min(6, c.label.length))), h('span', {}, `undiscovered sector · ${total} stars`))));
      continue;
    }
    out.push(h('div', { class: 'sector', style: { '--c': c.color } },
      h('div', { class: 'sector-head' }, h('i'), h('b', {}, c.label), h('span', {}, c.sector), h('span', { class: 'grow' }), h('small', {}, total ? `${ids.length} / ${total}` : String(ids.length))),
      h('div', { class: 'mini-chips' }, ids.map((id) => {
        const w = state.words[id];
        const m = mastery(w.seen);
        return h('button', {
          class: `mini-chip tier-${m.tier}`, title: `${m.name} · met ${w.seen}×${w.note ? ` · ${w.note}` : ''}`,
          onclick: () => { app.space.focusWord(id, 1.2); app.panels.openStarCard(id); },
        }, w.text, w.note ? h('small', {}, w.note) : null);
      }))));
  }
  return out;
}

function constellations() {
  const list = Object.values(state.constellations).sort((a, b) => b.updatedAt - a.updatedAt);
  const out = [];
  if (!list.length) out.push(h('p', { class: 'lede' }, 'No constellations yet. Open the Forge, build a sentence, make a word a variable, and save it.'));
  for (const c of list) {
    const n = countTokens(c.tokens, state.words, derived.byCat);
    out.push(h('div', { class: 'entry' },
      h('div', { class: 'entry-head' }, h('b', {}, c.name), h('span', { class: 'grow' }), h('span', { class: 'pill' }, `${formatBig(n)}`)),
      h('div', { class: 'pattern' }, c.tokens.map((t) => {
        const w = state.words[t.wordId];
        const cat = state.categories[w?.cat] || state.categories.uncharted;
        return t.var ? h('span', { class: 'slot', style: { '--c': cat.color } }, cat.label) : h('span', { class: 'fixed' }, w?.text);
      }), h('span', { class: 'fixed' }, c.end)),
      h('div', { class: 'entry-sample' }, sentenceText(c.tokens, state.words, c.end)),
      h('div', { class: 'entry-tools' },
        h('button', { class: 'btn small', onclick: () => app.forge.loadConstellation(c.id) }, icon('forge', 14), 'Open in Forge'),
        h('button', { class: 'btn small ghost', onclick: () => { app.galaxy.addPart({ tokens: c.tokens, end: c.end, name: c.name }); app.galaxy.open(); } }, icon('galaxy', 14), 'To galaxy'),
        h('span', { class: 'grow' }),
        confirmDelete(() => deleteConstellation(c.id)))));
  }
  if (state.mode === 'english') {
    const sighted = BLUEPRINTS.filter((bp) => state.sighted[bp.id]);
    const hidden = BLUEPRINTS.length - sighted.length;
    out.push(h('h4', { class: 'log-sub' }, '✧ Sighted in the sky'));
    if (!sighted.length) out.push(h('p', { class: 'lede' }, 'Hidden constellations appear once you light all the stars they need.'));
    for (const bp of sighted) {
      const r = resolveBlueprint(bp);
      out.push(h('div', { class: 'entry blueprint' },
        h('div', { class: 'entry-head' }, h('b', {}, bp.name), h('span', { class: 'grow' }),
          h('button', { class: 'btn small', disabled: !r, onclick: () => app.forge.loadBlueprint(bp) }, icon('forge', 14), 'Forge it')),
        h('div', { class: 'pattern' }, bp.pattern.split(' ').map((p) => {
          const m = p.match(/^\[(.+)\]$/);
          const cat = m && state.categories[m[1]];
          return m ? h('span', { class: 'slot', style: { '--c': cat.color } }, cat.label) : h('span', { class: 'fixed' }, p);
        }), h('span', { class: 'fixed' }, bp.end))));
    }
    if (hidden) out.push(h('p', { class: 'lede dim' }, `${hidden} more constellation${hidden === 1 ? '' : 's'} still hide in the dark.`));
  }
  return out;
}

function galaxies() {
  const list = Object.values(state.galaxies).sort((a, b) => b.updatedAt - a.updatedAt);
  if (!list.length) return [h('p', { class: 'lede' }, 'No galaxies yet. A galaxy links sentences into a paragraph. Save a constellation first, then open Galaxy.')];
  return list.map((g) => h('div', { class: 'entry' },
    h('div', { class: 'entry-head' }, h('b', {}, g.name), h('span', { class: 'grow' }), h('span', { class: 'pill' }, formatBig(countParagraph(g.parts, g.joins, state.words, derived.byCat)))),
    h('div', { class: 'entry-sample serif' }, paragraphText(g.parts, g.joins, state.words)),
    h('div', { class: 'entry-tools' },
      h('button', { class: 'btn small', onclick: () => app.galaxy.loadGalaxy(g.id) }, icon('galaxy', 14), 'Open'),
      h('span', { class: 'grow' }),
      confirmDelete(() => deleteGalaxy(g.id)))));
}

function missions() {
  return [
    h('p', { class: 'lede' }, `${doneCount()} of ${MISSIONS.length} complete.`),
    h('ol', { class: 'mission-list' }, MISSIONS.map((m) => {
      const done = !!state.missions[m.id];
      const v = Math.min(m.target, m.value());
      return h('li', { class: done ? 'done' : '' },
        h('span', { class: 'check' }, done ? '✦' : '○'),
        h('div', {},
          h('b', {}, m.title),
          h('small', {}, done ? 'Complete' : m.how),
          !done && m.target > 1 ? h('span', { class: 'bar' }, h('i', { style: { width: `${(v / m.target) * 100}%` } })) : null),
        !done && m.target > 1 ? h('small', { class: 'prog' }, `${formatBig(v)} / ${formatBig(m.target)}`) : null);
    })),
  ];
}

function confirmDelete(fn) {
  let armed = false;
  const b = h('button', {
    class: 'icon-btn small danger', 'aria-label': 'Delete',
    onclick: () => {
      if (!armed) { armed = true; b.classList.add('armed'); b.title = 'Click again to delete'; setTimeout(() => { armed = false; b.classList.remove('armed'); }, 2500); return; }
      fn();
    },
  }, icon('trash', 16));
  return b;
}
