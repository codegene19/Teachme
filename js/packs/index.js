// Language packs, normalised into one shape:
//   words:      [{ t, c, en?, l, cefr?, f?, ft?, n?, p?, tense?, also?, comma?, joinComma? }]  (frequency order)
//   blueprints: [{ id, name, pattern, end, l? }]
//   genesis:    words offered on the very first screen
//   levels:     optional; when present, words arrive level by level

import en from './en.js';
import it from './it.js';
import es from './es.js';
import itExtra from './it-extra.js';
import esExtra from './es-extra.js';
import itAgree from './it-agree.js';
import esAgree from './es-agree.js';
import itNouns from './it-nouns.js';
import esNouns from './es-nouns.js';

const NOUNS = { it: itNouns, es: esNouns };

/** Fold extra words into each level and extend the meaning rules. */
function withExtra(pack, extra, agree = null) {
  if (!extra) return pack;
  const levels = pack.levels.map((L, i) => ({
    ...L,
    words: [...L.words, ...(extra.levels[i + 1] || []).map((w) => ({ ...w, extra: true })), ...(agree?.levels[i + 1] || []).map((w) => ({ ...w, extra: true }))],
    patterns: [...(L.patterns || []), ...(agree?.patterns?.[i + 1] || [])],
  }));
  if (agree) pack = { ...pack, genders: agree.genders };
  const objects = { ...pack.semantics.objects };
  for (const [verb, kinds] of Object.entries(extra.objects)) objects[verb] = objects[verb] ? `${objects[verb]} ${kinds}` : kinds;
  return { ...pack, levels, semantics: { ...pack.semantics, kinds: { ...pack.semantics.kinds, ...extra.kinds }, objects, places: extra.places || {} } };
}

// Gender and number of a noun chunk, read from its article ("la casa" → f, "i soldi" → plural).
const ARTICLES = {
  it: { m: /^(il|lo|un|uno|i|gli) /, f: /^(la|una|le) |^un'/, pl: /^(i|gli|le) / },
  es: { m: /^(el|un|los|unos) /, f: /^(la|una|las|unas) /, pl: /^(los|las|unos|unas) / },
};
// Subjects whose gender is fixed; the rest (io, tu, noi, yo, tú, usted) follow your setting.
const WHO_GENDER = {
  it: { lui: 'm', lei: 'f', voi: 'm', loro: 'm' },
  es: { 'él': 'm', ella: 'f', ellos: 'm', nosotros: 'm', vosotros: 'm', ustedes: 'm' },
};
function agreement(pack, w) {
  const A = ARTICLES[pack.id];
  if (!A) return {};
  if (w.c === 'thing') {
    const g = pack.genders?.[w.t] || (A.f.test(w.t) ? 'f' : A.m.test(w.t) ? 'm' : null);
    return { ...(g ? { g } : {}), ...(A.pl.test(w.t) ? { pl: true } : {}) };
  }
  if (w.c === 'who' && WHO_GENDER[pack.id][w.t]) return { g: WHO_GENDER[pack.id][w.t] };
  return {};
}

// Articles by rule. Italian looks at how the noun starts: lo / gli / uno / degli
// before s + consonant, z, gn, ps, x, y; l' / gli / un' before a vowel.
const IT_SPECIAL = /^(s[^aeiouàèéìòù]|z|gn|ps|x|y|pn)/i;
const IT_VOWEL = /^[aeiouàèéìòùh]/i;
export function article(lang, g, pl, det, noun) {
  if (lang === 'es') {
    if (det === 'def') return `${g === 'f' ? (pl ? 'las' : 'la') : (pl ? 'los' : 'el')} ${noun}`;
    return `${g === 'f' ? (pl ? 'unas' : 'una') : (pl ? 'unos' : 'un')} ${noun}`;
  }
  const v = IT_VOWEL.test(noun), sp = IT_SPECIAL.test(noun);
  if (det === 'def') {
    if (g === 'f') return pl ? `le ${noun}` : (v ? `l'${noun}` : `la ${noun}`);
    return pl ? `${v || sp ? 'gli' : 'i'} ${noun}` : (v ? `l'${noun}` : `${sp ? 'lo' : 'il'} ${noun}`);
  }
  if (g === 'f') return pl ? `delle ${noun}` : (v ? `un'${noun}` : `una ${noun}`);
  return pl ? `${v || sp ? 'degli' : 'dei'} ${noun}` : `${sp ? 'uno' : 'un'} ${noun}`;
}

/** The four forms of a countable noun: { def: [one, many], indef: [one, many] }, and which one its text is. */
function nounForms(pack, w, g) {
  const entry = NOUNS[pack.id]?.[w.t];
  if (!entry || !g) return {};
  const [sg, pl] = entry;
  const nf = { def: [article(pack.id, g, false, 'def', sg), article(pack.id, g, true, 'def', pl)], indef: [article(pack.id, g, false, 'indef', sg), article(pack.id, g, true, 'indef', pl)] };
  const own = ['def', 'indef'].flatMap((d) => [0, 1].map((k) => ({ d, k }))).find(({ d, k }) => nf[d][k] === w.t);
  if (!own) { console.warn(`noun forms don't reproduce "${w.t}"`, nf); return {}; }
  return { nf, d0: own.d };
}

function prepare(pack) {
  if (!pack.levels) return { ...pack, words: pack.words.map((w) => ({ ...w, l: 0 })) };
  const sem = pack.semantics || { kinds: {}, objects: {} };
  const words = pack.levels.flatMap((L, i) => L.words.map((w) => ({
    ...w, l: i + 1, cefr: L.cefr || 'A1',
    ...(sem.kinds[w.t] ? { k: sem.kinds[w.t] } : {}),
    ...(sem.objects[w.t] ? { o: sem.objects[w.t].split(' ') } : {}),
    ...(sem.modalActs?.[w.t] ? { acts: sem.modalActs[w.t].split(' ') } : {}),
    ...(sem.places?.[w.t] ? { sc: sem.places[w.t] } : {}),
    ...agreement(pack, w),
  })).map((w) => (w.c === 'thing' ? { ...w, ...nounForms(pack, w, w.g) } : w)));
  const blueprints = pack.levels.flatMap((L, i) => (L.patterns || []).map((p) => ({ ...p, l: i + 1 })));
  const genesis = pack.levels[0].words.filter((w) => w.c !== 'core').map((w) => w.t);
  return { ...pack, words, blueprints, genesis };
}

export const PACKS = Object.fromEntries([withExtra(it, itExtra, itAgree), withExtra(es, esExtra, esAgree), en].map((p) => [p.id, prepare(p)]));
export const PACK_ORDER = ['it', 'es', 'en'];
