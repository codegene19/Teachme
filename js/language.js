// Turning tokens into sentences, sentences into paragraphs, and counting how
// many different sentences a template can produce.

const APOS = /[’‘`´]/g;
const STRIP = /[.,!?;:"“”„«»()[\]{}<>¿¡…]/g;

export const norm = (s) => String(s ?? '').toLowerCase().replace(APOS, "'").replace(/\s+/g, ' ').trim();
export const cap = (s) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

export function cleanWordText(s) {
  return String(s ?? '').replace(APOS, "'").replace(STRIP, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/**
 * Split free text into tokens, greedily matching known multi-word chunks
 * ("at home", "every day") first. Unknown words come back with wordId null.
 */
export function parseInput(text, byText) {
  const raw = String(text ?? '').replace(APOS, "'");
  const endMatch = raw.trim().match(/([.?!])["”')]*$/);
  const end = endMatch ? endMatch[1] : null;
  const parts = raw.replace(STRIP, ' ').split(/\s+/).filter(Boolean);
  const tokens = [];
  let i = 0;
  while (i < parts.length) {
    let hit = null;
    for (let len = Math.min(4, parts.length - i); len >= 1; len--) {
      const phrase = parts.slice(i, i + len).join(' ');
      const id = byText.get(norm(phrase));
      if (id) { hit = { text: phrase, wordId: id, len }; break; }
    }
    if (hit) { tokens.push({ text: hit.text, wordId: hit.wordId }); i += hit.len; }
    else { tokens.push({ text: parts[i], wordId: null }); i += 1; }
  }
  return { tokens, end };
}

const COMMA_BEFORE = new Set(['but', 'so']);
const CLAUSE_COMMA = new Set(['and', 'but', 'so', 'or', 'yet', 'then']);

/** One segment per token: { text, sep, wordId, index, isVar, cat }. */
export function sentenceSegments(tokens, words, { capitalize = true } = {}) {
  const segs = [];
  tokens.forEach((t, i) => {
    const w = words[t.wordId];
    if (!w) return;
    let sep = segs.length ? ' ' : '';
    if (segs.length && w.cat === 'link' && COMMA_BEFORE.has(norm(w.text))) sep = ', ';
    const text = !segs.length && capitalize ? cap(w.text) : w.text;
    segs.push({ kind: 'word', text, sep, wordId: w.id, index: i, isVar: !!t.var, cat: w.cat });
  });
  return segs;
}

export const joinSegments = (segs) => segs.map((s) => s.sep + s.text).join('');

export function sentenceText(tokens, words, end = '.') {
  const segs = sentenceSegments(tokens, words);
  return segs.length ? joinSegments(segs) + (end || '.') : '';
}

/**
 * A paragraph is sentences glued by joins. A join is either null (full stop,
 * new sentence) or the id of a LINK word ("because", "but"…), which fuses
 * two sentences into one.
 */
export function paragraphSegments(parts, joins, words) {
  const segs = [];
  let capNext = true;
  parts.forEach((p, pi) => {
    const ss = sentenceSegments(p.tokens, words, { capitalize: capNext });
    ss.forEach((s, k) => {
      s.partIndex = pi;
      if (k === 0 && segs.length) s.sep = ' ';
      segs.push(s);
    });
    if (pi === parts.length - 1) {
      if (ss.length) segs.push({ kind: 'punct', text: p.end || '.', sep: '' });
      return;
    }
    const jw = joins[pi] ? words[joins[pi]] : null;
    if (!jw) {
      segs.push({ kind: 'punct', text: p.end || '.', sep: '', joinIndex: pi });
      capNext = true;
    } else {
      const comma = CLAUSE_COMMA.has(norm(jw.text));
      segs.push({ kind: 'join', text: jw.text, sep: comma ? ', ' : ' ', wordId: jw.id, joinIndex: pi, cat: jw.cat });
      capNext = false;
    }
  });
  return segs;
}

export const paragraphText = (parts, joins, words) => joinSegments(paragraphSegments(parts, joins, words));

export function optionsFor(token, words, byCat) {
  const w = words[token.wordId];
  return w ? byCat[w.cat] || [] : [];
}

/** How many sentences one template can make: the product of its variables' orbits. */
export function countTokens(tokens, words, byCat) {
  let n = 1;
  for (const t of tokens) if (t.var) n *= Math.max(1, optionsFor(t, words, byCat).length);
  return n;
}

export function countParagraph(parts, joins, words, byCat) {
  let n = 1;
  for (const p of parts) n *= countTokens(p.tokens, words, byCat);
  const joinChoices = 1 + (byCat.link || []).length;
  return n * Math.pow(joinChoices, Math.max(0, parts.length - 1));
}

export function formulaParts(tokens, words, byCat) {
  return tokens.filter((t) => t.var).map((t) => ({ n: Math.max(1, optionsFor(t, words, byCat).length), cat: words[t.wordId]?.cat }));
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export function formatBig(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 100000) return Math.round(n).toLocaleString('en-US');
  if (n < 1e15) return compact.format(n);
  const [m, e] = n.toExponential(1).split('e+');
  return `${m}e${e}`;
}

export function pickRandom(list, avoid) {
  if (!list.length) return undefined;
  if (list.length === 1) return list[0];
  let v;
  do { v = list[Math.floor(Math.random() * list.length)]; } while (v === avoid);
  return v;
}
