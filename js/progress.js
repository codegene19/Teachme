// Progress: a small history of practice answers and the kinds of slips you
// make (wrong person, wrong tense, a word you keep missing). The Logbook
// charts it; Practice can aim a session at any weak spot.

import { state, derived, pack } from './store.js';

const DAY = 864e5;
export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

function hist() {
  if (!state.history) state.history = { days: {}, slips: {} };
  return state.history;
}

export const personName = (p) => (pack()?.persons?.[p] || ['I', 'you', 'he/she', 'we', 'you all', 'they'][p] || '').split(' / ')[0];
export const tenseName = (t) => pack()?.tenseNames?.[t] || { pres: 'present', past: 'past', imp: 'imperfect', fut: 'future' }[t] || t;

const slipKey = (s) => (s.kind === 'word' ? `word:${s.id}` : s.kind === 'order' ? `order:${s.cat}` : `${s.kind}:${s.from}>${s.to}`);
function parseKey(k) {
  const [kind, rest] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
  if (kind === 'word') return { kind, id: rest };
  if (kind === 'order') return { kind, cat: rest };
  const [from, to] = rest.split('>');
  return kind === 'person' ? { kind, from: +from, to: +to } : { kind, from, to };
}

/** One answer in Practice, Review, Listen or Eclipse. */
export function recordAnswer(ok, mode = 'translate') {
  const d = (hist().days[dayKey()] ||= { right: 0, total: 0 });
  d.total += 1;
  if (ok) d.right += 1;
  d[mode] = (d[mode] || 0) + 1;
}

/** A slip, or (delta −1) a slip put right in a focused session. */
export function recordSlip(slip, delta = 1) {
  const slips = hist().slips;
  const k = slipKey(slip);
  const n = Math.max(0, (slips[k]?.n || 0) + delta);
  if (n) slips[k] = { n, last: Date.now() }; else delete slips[k];
}

const ORDER_NAMES = {
  neg: '“not” words', freq: 'how-often words', time: 'time words', who: 'subjects', link: 'linking words',
  inf: 'infinitives', verb: 'verbs', thing: 'objects', place: 'places', feeling: 'descriptions',
};
const ORDER_CATS = { neg: 'core', inf: 'action', verb: 'action' };

export function slipText(s) {
  if (s.kind === 'person') return `“${personName(s.from)}” form where “${personName(s.to)}” is needed`;
  if (s.kind === 'tense') return `${tenseName(s.from)} instead of ${tenseName(s.to)}`;
  if (s.kind === 'order') return `where ${ORDER_NAMES[s.cat] || 'words'} go in the sentence`;
  const w = state.words[s.id];
  return w ? `“${w.text}”${w.gloss ? ` (${w.gloss.split(' / ')[0]})` : ''}` : 'a word';
}

/** Does a challenge exercise this weak spot? */
export function slipMatches(s, target, words) {
  if (s.kind === 'word') return target.some((c) => c.wordId === s.id);
  if (s.kind === 'order') {
    const cat = ORDER_CATS[s.cat] || s.cat;
    return target.length >= 4 && target.some((c) => (s.cat === 'neg' ? /^(non|no|not)$/i.test(c.text) : words[c.wordId]?.cat === cat || (cat === 'action' && words[c.wordId]?.forms)));
  }
  if (s.kind === 'person') return target.some((c) => words[c.wordId]?.forms && c.person === s.to);
  return target.some((c) => words[c.wordId]?.forms && c.tense === s.to);
}

/** The slips you make most, grammar first when counts tie. */
export function weakSpots(limit = 6) {
  return Object.entries(hist().slips)
    .map(([k, v]) => ({ slip: parseKey(k), n: v.n, last: v.last }))
    .filter((x) => x.slip.kind !== 'word' || state.words[x.slip.id]?.lit)
    .sort((a, b) => b.n - a.n || (a.slip.kind === 'word') - (b.slip.kind === 'word') || b.last - a.last)
    .slice(0, limit);
}

/** Stars lit by the end of each of the last `days` days. */
export function litSeries(days = 30) {
  const lit = derived.list.filter((w) => w.lit && !w.character).map((w) => w.litAt || 0).sort((a, b) => a - b);
  const end = new Date(); end.setHours(24, 0, 0, 0);
  const out = [];
  let i = 0;
  for (let k = days - 1; k >= 0; k--) {
    const cut = end.getTime() - k * DAY;
    while (i < lit.length && lit[i] < cut) i++;
    out.push({ day: dayKey(cut - 1), value: i });
  }
  return out;
}

/** Answers and right answers for each of the last `days` days. */
export function answerSeries(days = 14) {
  const out = [];
  for (let k = days - 1; k >= 0; k--) {
    const day = dayKey(Date.now() - k * DAY);
    const d = hist().days[day] || { right: 0, total: 0 };
    out.push({ day, total: d.total, right: d.right });
  }
  return out;
}

export function accuracy(days = 7) {
  const s = answerSeries(days);
  const total = s.reduce((a, d) => a + d.total, 0);
  return total ? { pct: Math.round((s.reduce((a, d) => a + d.right, 0) / total) * 100), total } : null;
}

/** Days in a row with at least one answer, counting today or yesterday as the latest. */
export function practiceStreak() {
  const days = hist().days;
  let k = days[dayKey()]?.total ? 0 : 1;
  let n = 0;
  while (days[dayKey(Date.now() - k * DAY)]?.total) { n++; k++; }
  return n;
}
