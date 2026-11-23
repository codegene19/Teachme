// The universe: every star (word), sector (category), constellation
// (sentence template) and galaxy (paragraph) — persisted to localStorage.

import { CATEGORY_DEFS, UNCHARTED_DEF, SEED_WORDS, EXAMPLES, CUSTOM_COLORS, NAMES } from './seed.js';
import { norm, cleanWordText, parseInput, countTokens, cap } from './language.js';

const KEY = 'lexicosmos:universe:v1';
const VERSION = 1;

// ---------------------------------------------------------------- event bus
const bus = new Map();
export function on(type, fn) {
  if (!bus.has(type)) bus.set(type, new Set());
  bus.get(type).add(fn);
  return () => bus.get(type).delete(fn);
}
export function emit(type, payload) {
  bus.get(type)?.forEach((fn) => {
    try { fn(payload); } catch (err) { console.error(err); }
  });
}

// ------------------------------------------------------- deterministic noise
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seedId = (text) => 's:' + norm(text).replace(/[^a-z0-9]+/g, '-');
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// The seed graph: words adjacent in an example sentence are linked.
const seedEdges = (() => {
  const byText = new Map();
  for (const list of Object.values(SEED_WORDS)) for (const t of list) byText.set(norm(t), seedId(t));
  const edges = [];
  for (const s of EXAMPLES) {
    const { tokens } = parseInput(s, byText);
    for (let i = 0; i + 1 < tokens.length; i++) {
      if (tokens[i].wordId && tokens[i + 1].wordId) edges.push([tokens[i].wordId, tokens[i + 1].wordId]);
    }
  }
  return edges;
})();

// ------------------------------------------------------------------- state
export let state = null;
export const derived = {
  list: [], byCat: {}, byText: new Map(), adj: new Map(),
  discoverable: new Set(), litCount: 0, reach: 0, sectors: 0,
};

const emptyForge = () => ({ tokens: [], end: '.', name: '', editingId: null });
const emptyGalaxy = () => ({ parts: [], joins: [], name: '', editingId: null });

function freshState(mode) {
  const categories = {};
  [...CATEGORY_DEFS, UNCHARTED_DEF].forEach((c, i) => {
    categories[c.id] = { ...c, order: i, discovered: false, custom: false };
  });
  const s = {
    version: VERSION, mode, createdAt: Date.now(),
    categories, words: {}, constellations: {}, galaxies: {},
    missions: {}, hints: {}, sighted: {},
    stats: { swaps: 0, spoken: 0, shuffles: 0, ignited: 0, drifts: 0, eclipses: 0, streak: 0, bestStreak: 0 },
    settings: { sound: true, speakOnIgnite: true, voiceURI: '', rate: 0.9, lang: mode === 'english' ? 'en-US' : '' },
    forge: emptyForge(), galaxyDraft: emptyGalaxy(), nextOrder: 0,
  };
  if (mode === 'english') addSeedWords(s);
  return s;
}

function addSeedWords(s) {
  for (const [cat, list] of Object.entries(SEED_WORDS)) {
    for (const text of list) {
      const id = seedId(text);
      if (!s.words[id]) s.words[id] = { id, text, cat, lit: false, seen: 0, note: '', seed: true, order: s.nextOrder++ };
    }
  }
}

function migrate(s) {
  const base = freshState(s.mode === 'empty' ? 'empty' : 'english');
  s.categories = { ...base.categories, ...(s.categories || {}) };
  s.stats = { ...base.stats, ...(s.stats || {}) };
  s.settings = { ...base.settings, ...(s.settings || {}) };
  for (const k of ['words', 'constellations', 'galaxies', 'missions', 'hints', 'sighted']) s[k] = s[k] || {};
  s.forge = { ...emptyForge(), ...(s.forge || {}) };
  s.galaxyDraft = { ...emptyGalaxy(), ...(s.galaxyDraft || {}) };
  if (typeof s.nextOrder !== 'number') s.nextOrder = Object.keys(s.words).length;
  if (s.mode !== 'empty') { s.mode = 'english'; addSeedWords(s); }
  // Drop tokens that point at words that no longer exist.
  const ok = (t) => t && s.words[t.wordId];
  s.forge.tokens = s.forge.tokens.filter(ok);
  for (const c of Object.values(s.constellations)) c.tokens = (c.tokens || []).filter(ok);
  const fixG = (g) => {
    g.parts = (g.parts || []).map((p) => ({ ...p, tokens: (p.tokens || []).filter(ok) })).filter((p) => p.tokens.length);
    g.joins = (g.joins || []).slice(0, Math.max(0, g.parts.length - 1)).map((j) => (j && s.words[j] ? j : null));
    while (g.joins.length < g.parts.length - 1) g.joins.push(null);
  };
  fixG(s.galaxyDraft);
  Object.values(s.galaxies).forEach(fixG);
  return s;
}

export function anchorOf(c) {
  const a = ((c?.angle || 0) * Math.PI) / 180;
  return { x: Math.cos(a) * (c?.radius || 0), y: Math.sin(a) * (c?.radius || 0) };
}

// Stars are placed deterministically inside their sector, keeping a little
// elliptical breathing room so labels don't collide.
const MIN_DX = 74, MIN_DY = 48;
function placeWord(s, w) {
  const c = s.categories[w.cat] || s.categories.uncharted;
  const a0 = anchorOf(c);
  const spread = c.spread || 220;
  const r = rng(hashStr(w.id + ':' + w.cat));
  const others = Object.values(s.words).filter((o) => o !== w && o.x != null);
  let best = null;
  for (let t = 0; t < 90; t++) {
    const ang = r() * Math.PI * 2;
    const rad = (c.radius === 0 ? 36 : 0) + Math.sqrt(r()) * spread * (1 + t * 0.018);
    const x = a0.x + Math.cos(ang) * rad * 1.15;
    const y = a0.y + Math.sin(ang) * rad * 0.9;
    best = { x, y };
    let clear = true;
    for (const o of others) {
      const dx = (o.x - x) / MIN_DX, dy = (o.y - y) / MIN_DY;
      if (dx * dx + dy * dy < 1) { clear = false; break; }
    }
    if (clear) break;
  }
  w.x = Math.round(best.x);
  w.y = Math.round(best.y);
}

function placeMissing(s) {
  Object.values(s.words).sort((a, b) => a.order - b.order).forEach((w) => { if (w.x == null || w.y == null) placeWord(s, w); });
}

function rebuild() {
  const { words, categories } = state;
  derived.byCat = {};
  for (const id in categories) derived.byCat[id] = [];
  derived.byText = new Map();
  derived.list = Object.values(words).sort((a, b) => a.order - b.order);
  let lit = 0;
  for (const w of derived.list) {
    derived.byText.set(norm(w.text), w.id);
    if (w.lit) { (derived.byCat[w.cat] ||= []).push(w.id); lit++; }
  }
  derived.litCount = lit;

  const adj = new Map();
  const link = (a, b) => {
    if (!a || !b || a === b || !words[a] || !words[b]) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b); adj.get(b).add(a);
  };
  for (const [a, b] of seedEdges) link(a, b);
  for (const c of Object.values(state.constellations)) {
    for (let i = 0; i + 1 < c.tokens.length; i++) link(c.tokens[i].wordId, c.tokens[i + 1].wordId);
  }
  derived.adj = adj;

  const disc = new Set();
  for (const w of derived.list) {
    if (!w.lit) continue;
    for (const n of adj.get(w.id) || []) if (!words[n].lit) disc.add(n);
  }
  derived.discoverable = disc;

  derived.reach = Object.values(state.constellations).reduce((sum, c) => sum + countTokens(c.tokens, words, derived.byCat), 0);
  derived.sectors = Object.keys(categories).filter((id) => (derived.byCat[id] || []).length > 0).length;
}

// -------------------------------------------------------------- persistence
let saveTimer = null;
export function saveNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable — stay in memory */ }
}
export function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}
export function commit() {
  rebuild();
  persist();
  emit('change');
}

export function load() {
  let loaded = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) loaded = JSON.parse(raw);
  } catch { loaded = null; }
  state = loaded && loaded.version === VERSION ? migrate(loaded) : freshState('english');
  placeMissing(state);
  rebuild();
  return state;
}

export function resetUniverse(mode = 'english') {
  state = freshState(mode);
  placeMissing(state);
  rebuild();
  saveNow();
  emit('reset');
  emit('change');
}

export function exportUniverse() {
  return JSON.stringify(state, null, 2);
}

export function importUniverse(obj) {
  if (!obj || obj.version !== VERSION || typeof obj.words !== 'object') throw new Error('Not a Lexicosmos universe file.');
  state = migrate(obj);
  placeMissing(state);
  rebuild();
  saveNow();
  emit('reset');
  emit('change');
}

// ------------------------------------------------------------------ queries
export const findWord = (text) => {
  const id = derived.byText.get(norm(cleanWordText(text)));
  return id ? state.words[id] : null;
};
export const litIn = (cat) => derived.byCat[cat] || [];
export const catOf = (wordId) => state.categories[state.words[wordId]?.cat] || state.categories.uncharted;

export function resolveBlueprint(bp) {
  const tokens = [];
  const used = {};
  for (const part of bp.pattern.split(' ')) {
    const m = part.match(/^\[(.+)\]$/);
    if (m) {
      const ids = litIn(m[1]);
      if (!ids.length) return null;
      const k = used[m[1]] = (used[m[1]] ?? -1) + 1;
      tokens.push({ wordId: ids[k % ids.length], var: true });
    } else {
      const w = findWord(part);
      if (!w || !w.lit) return null;
      tokens.push({ wordId: w.id, var: false });
    }
  }
  return { tokens, end: bp.end, name: bp.name };
}

export function cosmicName(kind = 'constellation') {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return kind === 'galaxy'
    ? `${pick(NAMES.gal1)} of ${pick(NAMES.gal2)}`
    : `The ${pick(NAMES.adj)} ${pick(NAMES.noun)}`;
}

// ---------------------------------------------------------------- mutations
function discover(catId) {
  const c = state.categories[catId];
  if (c && !c.discovered) { c.discovered = true; c.discoveredAt = Date.now(); return true; }
  return false;
}

export function ignite(id, { quiet = false } = {}) {
  const w = state.words[id];
  if (!w || w.lit) return false;
  w.lit = true;
  w.litAt = Date.now();
  state.stats.ignited++;
  const newSector = discover(w.cat);
  commit();
  emit('ignite', { id, newSector, quiet, created: false });
  return true;
}

export function addWord({ text, cat = 'uncharted', note = '' }, { quiet = false } = {}) {
  const clean = cleanWordText(text);
  if (!clean) return null;
  const existing = findWord(clean);
  if (existing) {
    if (!existing.lit) ignite(existing.id, { quiet });
    return existing;
  }
  if (!state.categories[cat]) cat = 'uncharted';
  const w = { id: uid('u:'), text: clean, cat, lit: true, litAt: Date.now(), seen: 0, note: String(note || '').slice(0, 200), seed: false, order: state.nextOrder++ };
  state.words[w.id] = w;
  placeWord(state, w);
  state.stats.ignited++;
  const newSector = discover(cat);
  commit();
  emit('ignite', { id: w.id, newSector, quiet, created: true });
  return w;
}

export function updateWord(id, patch) {
  const w = state.words[id];
  if (!w) return;
  let moved = false, newSector = false;
  if (patch.text != null && !w.seed) {
    const t = cleanWordText(patch.text);
    const clash = t && findWord(t);
    if (t && (!clash || clash.id === id)) w.text = t;
  }
  if (patch.note != null) w.note = String(patch.note).slice(0, 200);
  if (patch.cat && patch.cat !== w.cat && state.categories[patch.cat] && !w.seed) {
    w.cat = patch.cat;
    placeWord(state, w);
    moved = true;
    newSector = discover(patch.cat);
  }
  commit();
  if (moved) emit('moved', { id, newSector });
}

export function deleteWord(id) {
  const w = state.words[id];
  if (!w || w.seed) return;
  const alt = litIn(w.cat).find((x) => x !== id);
  const fix = (tokens) => tokens.flatMap((t) => {
    if (t.wordId !== id) return [t];
    return t.var && alt ? [{ ...t, wordId: alt }] : [];
  });
  delete state.words[id];
  state.forge.tokens = fix(state.forge.tokens);
  for (const [cid, c] of Object.entries(state.constellations)) {
    c.tokens = fix(c.tokens);
    if (!c.tokens.length) delete state.constellations[cid];
  }
  const fixG = (g) => {
    g.parts.forEach((p) => { p.tokens = fix(p.tokens); });
    g.joins = g.joins.map((j) => (j === id ? null : j));
    for (let i = g.parts.length - 1; i >= 0; i--) if (!g.parts[i].tokens.length) removePart(g, i);
  };
  fixG(state.galaxyDraft);
  for (const [gid, g] of Object.entries(state.galaxies)) {
    fixG(g);
    if (!g.parts.length) delete state.galaxies[gid];
  }
  commit();
}

export function removePart(g, i) {
  g.parts.splice(i, 1);
  if (g.joins.length) g.joins.splice(Math.max(0, i - 1), 1);
  g.joins.length = Math.max(0, g.parts.length - 1);
}

export function addCategory(label) {
  const clean = cleanWordText(label).slice(0, 16);
  if (!clean) return null;
  const customs = Object.values(state.categories).filter((c) => c.custom).length;
  const id = uid('k:');
  state.categories[id] = {
    id, label: clean.toUpperCase(), sector: `${cap(clean)} Sector`, blurb: 'a sector you charted',
    color: CUSTOM_COLORS[customs % CUSTOM_COLORS.length],
    angle: (customs * 137.508 + 22) % 360, radius: 1420 + 200 * Math.floor(customs / 5), spread: 220,
    order: Object.keys(state.categories).length, discovered: false, custom: true,
  };
  commit();
  return id;
}

export function bumpSeen(ids, n = 1) {
  for (const id of ids) if (state.words[id]) state.words[id].seen += n;
}
export function bumpStat(key, n = 1) {
  state.stats[key] = (state.stats[key] || 0) + n;
}
export function setSetting(key, value) {
  state.settings[key] = value;
  persist();
  emit('settings', { key, value });
}
export function markHint(key) {
  if (state.hints[key]) return false;
  state.hints[key] = Date.now();
  persist();
  return true;
}

const cloneTokens = (tokens) => tokens.map((t) => ({ wordId: t.wordId, var: !!t.var }));

export function saveConstellation({ id, name, tokens, end }) {
  const cid = id && state.constellations[id] ? id : uid('c:');
  const prev = state.constellations[cid];
  state.constellations[cid] = {
    id: cid, name: name || cosmicName(), tokens: cloneTokens(tokens), end: end || '.',
    createdAt: prev?.createdAt || Date.now(), updatedAt: Date.now(),
  };
  commit();
  return cid;
}

export function deleteConstellation(id) {
  delete state.constellations[id];
  if (state.forge.editingId === id) state.forge.editingId = null;
  commit();
}

export function saveGalaxy({ id, name, parts, joins }) {
  const gid = id && state.galaxies[id] ? id : uid('g:');
  const prev = state.galaxies[gid];
  state.galaxies[gid] = {
    id: gid, name: name || cosmicName('galaxy'),
    parts: parts.map((p) => ({ name: p.name || '', end: p.end || '.', tokens: cloneTokens(p.tokens) })),
    joins: joins.slice(0, Math.max(0, parts.length - 1)),
    createdAt: prev?.createdAt || Date.now(), updatedAt: Date.now(),
  };
  commit();
  return gid;
}

export function deleteGalaxy(id) {
  delete state.galaxies[id];
  if (state.galaxyDraft.editingId === id) state.galaxyDraft.editingId = null;
  commit();
}

export { cloneTokens, emptyForge, emptyGalaxy };
