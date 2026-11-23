// Language packs, normalised into one shape:
//   words:      [{ t, c, en?, l, cefr?, f?, ft?, n?, p?, tense?, also?, comma?, joinComma? }]  (frequency order)
//   blueprints: [{ id, name, pattern, end, l? }]
//   genesis:    words offered on the very first screen
//   levels:     optional; when present, words arrive level by level

import en from './en.js';
import it from './it.js';
import es from './es.js';

function prepare(pack) {
  if (!pack.levels) return { ...pack, words: pack.words.map((w) => ({ ...w, l: 0 })) };
  const sem = pack.semantics || { kinds: {}, objects: {} };
  const words = pack.levels.flatMap((L, i) => L.words.map((w) => ({
    ...w, l: i + 1, cefr: L.cefr || 'A1',
    ...(sem.kinds[w.t] ? { k: sem.kinds[w.t] } : {}),
    ...(sem.objects[w.t] ? { o: sem.objects[w.t].split(' ') } : {}),
    ...(sem.modalActs?.[w.t] ? { acts: sem.modalActs[w.t].split(' ') } : {}),
  })));
  const blueprints = pack.levels.flatMap((L, i) => (L.patterns || []).map((p) => ({ ...p, l: i + 1 })));
  const genesis = pack.levels[0].words.filter((w) => w.c !== 'core').map((w) => w.t);
  return { ...pack, words, blueprints, genesis };
}

export const PACKS = Object.fromEntries([it, es, en].map((p) => [p.id, prepare(p)]));
export const PACK_ORDER = ['it', 'es', 'en'];
