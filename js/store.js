// The universe: every star (word), sector (category), constellation
// (sentence template) and galaxy (paragraph) — persisted to localStorage.

import { CATEGORY_DEFS, UNCHARTED_DEF, CUSTOM_COLORS, NAMES, GALAXIES, galaxyIndex } from './seed.js';
import { PACKS } from './packs/index.js';
import { norm, fold, cleanWordText, parseInput, countTokens, cap, setGrammar } from './language.js';

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

const slug = (text) => fold(norm(text)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// English keeps its original ids ("s:coffee") so older universes still load.
export const packWordId = (packId, text) => (packId === 'en' ? 's:' : `${packId}:`) + slug(text);
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------------------------------------------------------- word lookups
// Every form of every word points back at its star: "vogliamo" → volere (we),
// "volere" → volere (infinitive). A second, accent-free index forgives
// "perche" for "perché".
function buildLookup(entries) {
  const exact = new Map();
  const loose = new Map();
  const add = (text, info) => {
    const k = norm(text);
    if (!k) return;
    if (!exact.has(k)) exact.set(k, info);
    const f = fold(k);
    if (!loose.has(f)) loose.set(f, info);
  };
  for (const e of entries) {
    add(e.text, e.forms ? { id: e.id, inf: true } : { id: e.id });
    e.forms?.forEach((f, i) => add(f, { id: e.id, person: i }));
    for (const [tense, list] of Object.entries(e.tenses || {})) list.forEach((f, i) => add(f, { id: e.id, person: i, tense }));
    [...(e.num || []), ...(e.agr || [])].forEach((f) => add(f, { id: e.id }));
    // every form of a noun: "i libri" is the star "un libro", many, with "the"
    for (const [det, list] of Object.entries(e.nouns || {})) list.forEach((f, k) => add(f, { id: e.id, num: k ? 'pl' : 'sg', det }));
  }
  return (phrase) => exact.get(norm(phrase)) || loose.get(fold(norm(phrase))) || null;
}

const edgeCache = new Map();
function edgesFor(pack) {
  if (!pack) return [];
  if (edgeCache.has(pack.id)) return edgeCache.get(pack.id);
  const resolve = buildLookup(pack.words.map((w) => ({ id: packWordId(pack.id, w.t), text: w.t, forms: w.f, num: w.n || w.g4, tenses: w.ft, nouns: w.nf })));
  const edges = [];
  for (const s of pack.examples || []) {
    const { tokens } = parseInput(s, resolve);
    for (let i = 0; i + 1 < tokens.length; i++) {
      if (tokens[i].wordId && tokens[i + 1].wordId) edges.push([tokens[i].wordId, tokens[i + 1].wordId]);
    }
  }
  // Words of the same level are linked in a chain, so every star has neighbours.
  for (let i = 0; i + 1 < pack.words.length; i++) {
    if (pack.words[i].l && pack.words[i].l === pack.words[i + 1].l) edges.push([packWordId(pack.id, pack.words[i].t), packWordId(pack.id, pack.words[i + 1].t)]);
  }
  edgeCache.set(pack.id, edges);
  return edges;
}

// ------------------------------------------------------------------- state
export let state = null;
export const derived = {
  list: [], byCat: {}, orbit: {}, adj: new Map(), discoverable: new Set(),
  litCount: 0, reach: 0, sectors: 0, resolve: () => null,
};

export const pack = () => (state?.pack ? PACKS[state.pack] || null : null);
export const hasLevels = () => !!pack()?.levels;

const emptyForge = () => ({ tokens: [], end: '.', name: '', editingId: null });
const emptyGalaxy = () => ({ parts: [], joins: [], name: '', editingId: null });

function freshState(packId) {
  const p = packId ? PACKS[packId] : null;
  const categories = {};
  [...CATEGORY_DEFS, UNCHARTED_DEF].forEach((c, i) => {
    categories[c.id] = { ...c, order: i, discovered: false, custom: false };
  });
  const s = {
    version: VERSION, pack: p ? p.id : null, createdAt: Date.now(),
    level: p?.levels ? 1 : 0, levelBase: 0, journeyDone: false,
    categories, words: {}, constellations: {}, galaxies: {},
    missions: {}, hints: {}, sighted: {},
    stats: { swaps: 0, spoken: 0, shuffles: 0, ignited: 0, drifts: 0, eclipses: 0, streak: 0, bestStreak: 0, made: 0 },
    settings: { sound: true, speakOnIgnite: true, gloss: true, voiceURI: '', rate: 0.9, lang: p?.voice || '', voiceEngine: 'device', piperVoices: {}, selfGender: 'm' },
    forge: emptyForge(), galaxyDraft: emptyGalaxy(), nextOrder: 0,
  };
  if (p) addPackWords(s, p);
  return s;
}

/** Create the pack's stars, or refresh their grammar if they already exist. */
function addPackWords(s, p) {
  for (const pw of p.words) {
    const id = packWordId(p.id, pw.t);
    const grammar = {
      text: pw.t, cat: pw.c, lvl: pw.l || 0, gloss: pw.en || '',
      forms: pw.f || null, tenses: pw.ft || null, tense: pw.tense || null, num: pw.n || null, person: pw.p ?? null,
      also: pw.also || null, comma: !!pw.comma, joinComma: !!pw.joinComma, gal: p.levels ? galaxyIndex(pw.cefr) : 0,
      kind: pw.k || null, obj: pw.o || null, acts: pw.acts || null, scene: pw.sc || null,
      agr: pw.g4 || null, gender: pw.g || null, plural: !!pw.pl, nouns: pw.nf || null, det0: pw.d0 || null,
    };
    const ex = s.words[id];
    if (ex) {
      const moved = ex.cat !== grammar.cat || (ex.gal || 0) !== grammar.gal;
      Object.assign(ex, grammar, { seed: true });
      if (moved) { ex.x = undefined; ex.y = undefined; }
    } else {
      s.words[id] = { id, ...grammar, lit: false, seen: 0, note: '', seed: true, order: s.nextOrder++ };
    }
  }
}

function migrate(s) {
  if (!('pack' in s)) s.pack = s.mode === 'empty' ? null : 'en';
  delete s.mode;
  if (s.pack && !PACKS[s.pack]) s.pack = null;
  const base = freshState(s.pack);
  s.categories = { ...base.categories, ...(s.categories || {}) };
  s.stats = { ...base.stats, ...(s.stats || {}) };
  s.settings = { ...base.settings, ...(s.settings || {}) };
  for (const k of ['words', 'constellations', 'galaxies', 'missions', 'hints', 'sighted']) s[k] = s[k] || {};
  if (typeof s.level !== 'number') s.level = base.level;
  if (typeof s.levelBase !== 'number') s.levelBase = 0;
  s.forge = { ...emptyForge(), ...(s.forge || {}) };
  s.galaxyDraft = { ...emptyGalaxy(), ...(s.galaxyDraft || {}) };
  if (typeof s.nextOrder !== 'number') s.nextOrder = Object.keys(s.words).length;
  const p = s.pack ? PACKS[s.pack] : null;
  if (p) addPackWords(s, p);
  // Drop tokens that point at words that no longer exist.
  const ok = (t) => t && s.words[t.wordId];
  s.forge.tokens = s.forge.tokens.filter(ok);
  for (const c of Object.values(s.constellations)) c.tokens = (c.tokens || []).filter(ok);
  const fixG = (g) => {
    g.parts = (g.parts || []).map((part) => ({ ...part, tokens: (part.tokens || []).filter(ok) })).filter((part) => part.tokens.length);
    g.joins = (g.joins || []).slice(0, Math.max(0, g.parts.length - 1)).map((j) => (j && s.words[j] ? j : null));
    while (g.joins.length < g.parts.length - 1) g.joins.push(null);
  };
  fixG(s.galaxyDraft);
  Object.values(s.galaxies).forEach(fixG);
  return s;
}

/** Where a sector sits: its place on the ring, inside galaxy `gal` (A1 = 0). */
export function anchorOf(c, gal = 0) {
  const a = ((c?.angle || 0) * Math.PI) / 180;
  const g = GALAXIES[gal] || GALAXIES[0];
  return { x: g.x + Math.cos(a) * (c?.radius || 0), y: g.y + Math.sin(a) * (c?.radius || 0) };
}

// Stars are placed deterministically inside their sector, keeping a little
// elliptical breathing room so labels don't collide.
const MIN_DX = 78, MIN_DY = 50;
function placeWord(s, w) {
  const c = s.categories[w.cat] || s.categories.uncharted;
  const a0 = anchorOf(c, w.gal || 0);
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
  const p = pack();
  const leveled = !!p?.levels;
  derived.byCat = {};
  derived.orbit = {};
  for (const id in categories) { derived.byCat[id] = []; derived.orbit[id] = []; }
  derived.list = Object.values(words).sort((a, b) => a.order - b.order);
  derived.resolve = buildLookup(derived.list);
  let lit = 0;
  for (const w of derived.list) {
    if (!w.lit) continue;
    (derived.byCat[w.cat] ||= []).push(w.id);
    (derived.orbit[w.cat] ||= []).push(w.id);
    lit++;
  }
  // Guests (e.g. "volere" also orbiting ACTION) come after a sector's own stars.
  for (const w of derived.list) {
    if (w.lit) for (const extra of w.also || []) (derived.orbit[extra] ||= []).push(w.id);
  }
  derived.litCount = lit;
  // Which sectors of which galaxies are glowing (have lit stars).
  const regions = new Map();
  for (const w of derived.list) {
    if (!w.lit) continue;
    const key = `${w.gal || 0}:${w.cat}`;
    regions.set(key, (regions.get(key) || 0) + 1);
  }
  derived.regions = [...regions.keys()].map((k) => { const [gal, cat] = k.split(':'); return { gal: Number(gal), cat }; });

  const adj = new Map();
  const link = (a, b) => {
    if (!a || !b || a === b || !words[a] || !words[b]) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b); adj.get(b).add(a);
  };
  for (const [a, b] of edgesFor(p)) link(a, b);
  for (const c of Object.values(state.constellations)) {
    for (let i = 0; i + 1 < c.tokens.length; i++) link(c.tokens[i].wordId, c.tokens[i + 1].wordId);
  }
  derived.adj = adj;

  // Leveled languages reveal every star of the levels you have reached;
  // the English starter reveals the neighbours of the stars you know.
  const disc = new Set();
  for (const w of derived.list) {
    if (w.lit) continue;
    if (leveled) { if (w.lvl > 0 && w.lvl <= state.level) disc.add(w.id); }
    else if ([...(adj.get(w.id) || [])].some((n) => words[n].lit)) disc.add(w.id);
  }
  derived.discoverable = disc;
  derived.galaxiesSeen = [...new Set(derived.list.filter((w) => w.lit || disc.has(w.id)).map((w) => w.gal || 0))];

  derived.reach = Object.values(state.constellations).reduce((sum, c) => sum + countTokens(c.tokens, words, derived.orbit), 0);
  derived.sectors = Object.keys(categories).filter((id) => (derived.byCat[id] || []).length > 0).length;
}

function applyGrammar() {
  setGrammar({ invert: !!pack()?.invert, selfGender: state?.settings?.selfGender === 'f' ? 'f' : 'm' });
}

// -------------------------------------------------------------- persistence
let saveTimer = null;
export function saveNow() {
  clearTimeout(saveTimer);
  state.savedAt = Date.now();
  let ok = true;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { ok = false; /* storage unavailable — stay in memory */ }
  emit('saved', { browser: ok });
}
export function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}
export function commit() {
  applyGrammar();
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
  state = loaded && loaded.version === VERSION ? migrate(loaded) : freshState('it');
  placeMissing(state);
  applyGrammar();
  rebuild();
  return state;
}

/** Start over with a language pack ('it', 'es', 'en') or null for an empty universe. */
export function resetUniverse(packId = 'it') {
  if (packId === 'english') packId = 'en';
  if (packId === 'empty') packId = null;
  state = freshState(packId);
  placeMissing(state);
  applyGrammar();
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
  applyGrammar();
  rebuild();
  saveNow();
  emit('reset');
  emit('change');
}

// ------------------------------------------------------------------ queries
export const resolveText = (phrase) => derived.resolve(phrase);
export const findWord = (text) => {
  const info = derived.resolve(cleanWordText(text));
  return info ? state.words[info.id] : null;
};
export const litIn = (cat) => derived.orbit[cat] || [];
export const catOf = (wordId) => state.categories[state.words[wordId]?.cat] || state.categories.uncharted;

/** Hidden constellations available at the current level. */
export function blueprints() {
  const p = pack();
  if (!p) return [];
  return (p.blueprints || []).filter((bp) => !bp.l || bp.l <= state.level);
}

export function resolveBlueprint(bp) {
  const tokens = [];
  const used = {};
  for (const part of bp.pattern.split(' ')) {
    const m = part.match(/^\[([a-z]+)(:inf)?\]$/);
    if (m) {
      const ids = litIn(m[1]);
      if (!ids.length) return null;
      const k = used[m[1]] = (used[m[1]] ?? -1) + 1;
      const taken = new Set(tokens.map((t) => t.wordId));
      const fresh = ids.filter((id) => !taken.has(id));
      const pickFrom = fresh.length ? fresh : ids;
      const tok = { wordId: pickFrom[k % pickFrom.length], var: true, slot: m[1] };
      if (m[2]) tok.inf = true;
      tokens.push(tok);
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

// ----------------------------------------------------------------- levels
/** Sentences you have actually made: every swap, shuffle, playback or eclipse answer counts once. */
export const practiceTotal = () => state.stats.made || 0;

/** Where you are in the journey, and what the current level still asks of you. */
export function levelProgress() {
  const p = pack();
  if (!p?.levels) return null;
  const n = Math.min(state.level, p.levels.length);
  const def = p.levels[n - 1];
  const ids = derived.list.filter((w) => w.seed && w.lvl === n).map((w) => w.id);
  const lit = ids.filter((id) => state.words[id].lit).length;
  const needLit = Math.min(ids.length, def.need?.lit ?? Math.max(1, Math.ceil(ids.length * 0.7)));
  const practice = Math.max(0, practiceTotal() - state.levelBase);
  const needPractice = def.need?.practice ?? 6 + 3 * n;
  return {
    level: n, total: p.levels.length, def, ids, lit, needLit, practice, needPractice,
    galaxy: GALAXIES[galaxyIndex(def.cefr)], galaxyIndex: galaxyIndex(def.cefr),
    done: lit >= needLit && practice >= needPractice, final: n === p.levels.length,
    next: p.levels[n] || null,
  };
}

/** Open the next level: its stars arrive in the sky. */
export function levelUp() {
  const prog = levelProgress();
  if (!prog?.done) return null;
  if (prog.final) {
    if (!state.journeyDone) { state.journeyDone = true; commit(); emit('journey-complete', {}); }
    return null;
  }
  state.level = prog.level + 1;
  state.levelBase = practiceTotal();
  const ids = derived.list.filter((w) => w.seed && w.lvl === state.level).map((w) => w.id);
  const next = pack().levels[state.level - 1];
  const newGalaxy = next.cefr !== prog.def.cefr ? GALAXIES[galaxyIndex(next.cefr)] : null;
  commit();
  emit('levelup', { level: state.level, ids, newGalaxy });
  return state.level;
}

/**
 * Placement: start at `level`, with every word of the earlier levels already
 * lit. Their first reviews are spread over the next two weeks so they don't
 * all come due at once. Never moves you backwards.
 */
export function placeAt(level) {
  const p = pack();
  if (!p?.levels) return null;
  level = Math.max(1, Math.min(p.levels.length, level));
  if (level <= state.level) return null;
  const now = Date.now();
  const DAY = 864e5;
  for (const w of derived.list) {
    if (!w.seed || !w.lvl || w.lvl >= level || w.lit) continue;
    w.lit = true;
    w.litAt = now;
    w.seen = Math.max(w.seen || 0, 2);
    w.placed = true;
    w.mem = { interval: 3 + Math.random() * 5, due: now + (1 + Math.random() * 13) * DAY, reps: 1 };
    discover(w.cat);
  }
  // patterns of the levels you skipped are known already: no fanfare for each
  for (const bp of p.blueprints || []) if (bp.l && bp.l < level) state.sighted[bp.id] = state.sighted[bp.id] || now;
  const from = state.level;
  state.level = level;
  state.levelBase = practiceTotal();
  state.placedAt = { level, from, at: now };
  const ids = derived.list.filter((w) => w.seed && w.lvl === level).map((w) => w.id);
  const def = p.levels[level - 1];
  const newGalaxy = galaxyIndex(def.cefr) !== galaxyIndex(p.levels[from - 1]?.cefr || 'A1') || def.cefr !== 'A1' ? GALAXIES[galaxyIndex(def.cefr)] : null;
  commit();
  emit('levelup', { level, ids, newGalaxy, placed: true });
  return level;
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
  const w = { id: uid('u:'), text: clean, cat, lit: true, litAt: Date.now(), seen: 0, note: String(note || '').slice(0, 200), seed: false, lvl: 0, order: state.nextOrder++ };
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
  const alt = (t) => litIn(t.slot || w.cat).find((x) => x !== id);
  const fix = (tokens) => tokens.flatMap((t) => {
    if (t.wordId !== id) return [t];
    const a = t.var && alt(t);
    return a ? [{ ...t, wordId: a }] : [];
  });
  delete state.words[id];
  state.forge.tokens = fix(state.forge.tokens);
  for (const [cid, c] of Object.entries(state.constellations)) {
    c.tokens = fix(c.tokens);
    if (!c.tokens.length) delete state.constellations[cid];
  }
  const fixG = (g) => {
    g.parts.forEach((part) => { part.tokens = fix(part.tokens); });
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

const cloneTokens = (tokens) => tokens.map((t) => {
  const c = { wordId: t.wordId, var: !!t.var };
  if (t.slot) c.slot = t.slot;
  if (t.inf) c.inf = true;
  if (t.person != null) c.person = t.person;
  if (t.tense) c.tense = t.tense;
  if (t.num) c.num = t.num;
  if (t.det) c.det = t.det;
  return c;
});

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

export function saveGalaxy({ id, name, parts, joins, book = false }) {
  const gid = id && state.galaxies[id] ? id : uid('g:');
  const prev = state.galaxies[gid];
  state.galaxies[gid] = {
    id: gid, name: name || cosmicName('galaxy'),
    parts: parts.map((p) => ({ name: p.name || '', end: p.end || '.', tokens: cloneTokens(p.tokens) })),
    joins: joins.slice(0, Math.max(0, parts.length - 1)),
    createdAt: prev?.createdAt || Date.now(), updatedAt: Date.now(),
    ...(book || prev?.book ? { book: true } : {}),
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

/**
 * A story character ("Marco", "Lucía"): a star in the WHO sector that
 * conjugates like he/she, so the generators can make it the subject.
 */
export function addCharacter(name, gender = null) {
  const clean = cleanWordText(name).slice(0, 24);
  if (!clean) return null;
  const existing = findWord(clean);
  if (existing) {
    if (existing.cat !== 'who') return null;
    if (existing.character && gender) existing.gender = gender;
    return existing;
  }
  const text = cap(clean);
  const w = {
    id: uid('ch:'), text, cat: 'who', person: 2, gloss: '', gender: gender || guessGender(text), lit: true, litAt: Date.now(),
    seen: 0, note: '', seed: false, character: true, lvl: 0, gal: 0, order: state.nextOrder++,
  };
  state.words[w.id] = w;
  placeWord(state, w);
  discover('who');
  commit();
  emit('ignite', { id: w.id, newSector: false, quiet: true, created: true });
  return w;
}

/** Names ending in -a are usually feminine in Italian and Spanish (Giulia, Lucía); you can change it. */
export const guessGender = (name) => (/a$/i.test(String(name).trim()) && !/^(luca|andrea|nicola|mattia|elia|tobia)$/i.test(String(name).trim()) ? 'f' : 'm');

export const characters = () => derived.list.filter((w) => w.character);
