// Word order without an answer key. Inside each clause (clauses start at a
// bridge word like "e", "perché", "porque"), the roles keep a fixed order:
//
//   subject → "non/no" → verb → infinitive → object / description → place
//
// Time words ("oggi", "ayer") may stand at the start or the end, and
// how-often words ("spesso", "siempre") sit next to the verb on either side,
// so neither is ever flagged. Used by the Forge to spot and fix order
// mistakes, and by Practice to explain them.

import { slotOf } from './language.js';

const NEG = /^(non|no|not)$/i;

/** A role rank, or null for words that may float (time, how often, unknown). */
function rank(t, words) {
  const w = words[t.wordId];
  if (!w) return null;
  if (w.cat === 'link') return 0;
  if (w.cat === 'who') return 1;
  if (w.cat === 'core' && NEG.test(w.text)) return 2;
  if (w.forms) return t.inf ? 5 : 3;
  const slot = slotOf(t, words);
  if (slot === 'thing' || slot === 'feeling' || w.cat === 'thing' || w.cat === 'feeling') return 6;
  if (slot === 'place' || w.cat === 'place') return 7;
  return null; // time, freq and anything else: free
}

// A clause ends at a bridge word, or where a new subject follows a finished
// clause ("Quando io sono in ritardo | tu prendi il treno").
const clauses = (tokens, words) => {
  const out = [];
  let cur = [];
  let hasVerb = false, hasRest = false;
  tokens.forEach((t, i) => {
    const w = words[t.wordId];
    const newSubject = w?.cat === 'who' && hasVerb && hasRest;
    if ((w?.cat === 'link' || newSubject) && cur.length) { out.push(cur); cur = []; hasVerb = false; hasRest = false; }
    cur.push(i);
    if (w?.forms && !t.inf) hasVerb = true;
    else if (hasVerb && w && w.cat !== 'link' && w.cat !== 'who') hasRest = true;
  });
  if (cur.length) out.push(cur);
  return out;
};

/** The same tokens in a better order for one clause (a list of token indexes), or null if it is fine. */
function fixClause(idx, tokens, words) {
  const r = (i) => rank(tokens[i], words);
  const fixed = idx.filter((i) => r(i) != null);
  const ranks = fixed.map(r);
  if (ranks.every((x, k) => !k || x >= ranks[k - 1])) return null;
  const sorted = fixed.slice().sort((a, b) => r(a) - r(b) || a - b);
  // floating words keep their side: a time word at the start stays first, otherwise it goes last;
  // a how-often word that leaned on a verb stays with that verb, otherwise it follows the first verb
  const out = sorted.slice();
  const floats = idx.filter((i) => r(i) == null);
  const firstFixedPos = idx.findIndex((i) => r(i) != null);
  const isVerb = (i) => words[tokens[i]?.wordId]?.forms;
  for (const i of floats) {
    const w = words[tokens[i].wordId];
    const pos = idx.indexOf(i);
    if (w?.cat === 'time' || !w) {
      const atStart = firstFixedPos < 0 || pos < firstFixedPos;
      if (atStart) out.splice(out[0] != null && r(out[0]) === 0 ? 1 : 0, 0, i); else out.push(i);
    } else if (w.cat === 'freq') {
      const before = idx[pos + 1];
      const after = idx[pos - 1];
      if (before != null && isVerb(before) && out.includes(before)) out.splice(out.indexOf(before), 0, i);
      else if (after != null && isVerb(after) && out.includes(after)) out.splice(out.indexOf(after) + 1, 0, i);
      else {
        const v = out.findIndex((j) => isVerb(j) && !tokens[j].inf);
        out.splice(v < 0 ? out.length : v + 1, 0, i);
      }
    } else {
      // an unknown word follows whatever it followed before
      const prev = idx[pos - 1];
      const at = prev != null ? out.indexOf(prev) : -1;
      out.splice(at + 1, 0, i);
    }
  }
  return out;
}

/** Longest common subsequence of two sequences: the keys of `a` that stay in place. */
export function keptInOrder(a, b, key = (x) => x) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    L[i][j] = key(a[i]) === key(b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
  const kept = new Set();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (key(a[i]) === key(b[j])) { kept.add(i); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return kept;
}

/**
 * Check a whole sentence. Returns null when the order is fine, otherwise
 * { order: [token indexes in the suggested order], moved: Set of token indexes out of place }.
 */
export function checkOrder(tokens, words) {
  if (tokens.length < 2) return null;
  let changed = false;
  const order = [];
  for (const c of clauses(tokens, words)) {
    const fix = fixClause(c, tokens, words);
    if (fix) changed = true;
    order.push(...(fix || c));
  }
  if (!changed) return null;
  const original = tokens.map((_, i) => i);
  const kept = keptInOrder(original, order);
  const moved = new Set(original.filter((i) => !kept.has(i)));
  return moved.size ? { order, moved } : null;
}

/**
 * Why the word at position j of a correctly ordered sequence sits there,
 * shown with its real neighbours. Items: { text, wordId, inf }.
 */
export function orderRule(seq, j, words) {
  const c = seq[j], prev = seq[j - 1], next = seq[j + 1];
  const w = words[c.wordId];
  const isVerb = (t) => t && words[t.wordId]?.forms;
  const q = (...xs) => `“${xs.filter(Boolean).map((x) => x.text).join(' ')}”`;
  if (w.cat === 'core' && NEG.test(w.text)) return { cat: 'neg', text: `“${c.text}” goes right before the verb: ${q(c, next)}.` };
  if (w.cat === 'freq') return { cat: 'freq', text: isVerb(prev) ? `How-often words go right after the verb: ${q(prev, c)}.` : `“${c.text}” goes here: ${q(prev, c, next)}.` };
  if (w.cat === 'time') return { cat: 'time', text: `Time words like “${c.text}” go at the start or the end of the sentence, not in the middle.` };
  if (w.cat === 'who') return { cat: 'who', text: next ? `The subject comes before its verb: ${q(c, next)}.` : `“${c.text}” goes here: ${q(prev, c)}.` };
  if (w.cat === 'link') return { cat: 'link', text: `“${c.text}” joins two sentences — it opens the second one: ${q(c, next, seq[j + 2])}…` };
  if (w.forms && c.inf) return { cat: 'inf', text: `After “${prev?.text}” comes the infinitive: ${q(prev, c)}.` };
  if (w.forms) {
    if (prev && NEG.test(prev.text)) return { cat: 'verb', text: `The verb comes right after “${prev.text}”: ${q(prev, c)}.` };
    return { cat: 'verb', text: prev && words[prev.wordId]?.cat === 'who' ? `The verb follows its subject: ${q(prev, c)}.` : `The verb goes here: ${q(prev, c, next)}.` };
  }
  if (w.cat === 'thing') return { cat: 'thing', text: `“${c.text}” is what the action is done to — it comes after the verb: ${q(prev, c)}.` };
  if (w.cat === 'place') return { cat: 'place', text: `Places come after the action and its object: ${q(prev, c)}.` };
  if (w.cat === 'feeling') return { cat: 'feeling', text: `Descriptions come after the verb: ${q(prev, c)}.` };
  return { cat: w.cat, text: j === 0 ? `“${c.text}” starts the sentence.` : `“${c.text}” comes after “${prev.text}”.` };
}
