// Turning tokens into sentences, sentences into paragraphs, and counting how
// many different sentences a template can produce.
//
// Grammar: a word may carry
//   forms  — six present-tense forms (I, you, he/she, we, you all, they)
//   num    — [singular, plural] forms (adjectives)
//   person — 0..5 for subject pronouns
// Each verb/adjective agrees with the nearest subject *before* it, so
// "io voglio … perché tu hai …" conjugates each clause on its own.
// A token may carry `inf` (use the infinitive), `slot` (the sector a variable
// orbits) and `person` (a subject implied by the verb form, e.g. "Voglio…").

const APOS = /[’‘`´]/g;
const STRIP = /[.,!?;:"“”„«»()[\]{}<>¿¡…]/g;

export const norm = (s) => String(s ?? '').toLowerCase().replace(APOS, "'").replace(/\s+/g, ' ').trim();
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const cap = (s) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

let G = { invert: false };
/** Language-wide rules, e.g. Spanish opening marks ¿ ¡. */
export function setGrammar(g) { G = { ...G, ...g }; }

export function cleanWordText(s) {
  return String(s ?? '').replace(APOS, "'").replace(STRIP, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/**
 * Split free text into tokens, greedily matching known multi-word chunks
 * ("at home", "tengo que", "ogni giorno") first. `resolve(phrase)` returns
 * { id, person?, inf? } for a known word form, or null.
 */
export function parseInput(text, resolve) {
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
      const info = resolve(phrase);
      if (info) { hit = { phrase, info, len }; break; }
    }
    if (hit) {
      const tok = { text: hit.phrase, wordId: hit.info.id };
      if (hit.info.inf) tok.inf = true;
      if (hit.info.person != null) tok.person = hit.info.person;
      tokens.push(tok);
      i += hit.len;
    } else { tokens.push({ text: parts[i], wordId: null }); i += 1; }
  }
  return { tokens, end };
}

/** The grammatical person governing token i: the nearest subject before it. */
export function personAt(tokens, words, i) {
  for (let j = i - 1; j >= 0; j--) {
    const w = words[tokens[j]?.wordId];
    if (w && w.person != null) return w.person;
  }
  return tokens[i]?.person ?? 0;
}

/** The form of a word as it appears in this slot. */
export function surface(word, token = {}, person = 0) {
  if (!word) return '';
  if (word.forms) return token.inf ? word.text : (word.forms[person] ?? word.text);
  if (word.num) return word.num[person >= 3 ? 1 : 0] ?? word.text;
  return word.text;
}

const opener = (end) => (G.invert && end === '?' ? '¿' : G.invert && end === '!' ? '¡' : '');

/** One segment per token: { text, sep, wordId, index, isVar, cat, slot, gloss }. */
export function sentenceSegments(tokens, words, { capitalize = true, end } = {}) {
  const segs = [];
  tokens.forEach((t, i) => {
    const w = words[t.wordId];
    if (!w) return;
    let sep = segs.length ? ' ' : '';
    if (segs.length && w.cat === 'link' && w.comma) sep = ', ';
    const person = personAt(tokens, words, i);
    let text = surface(w, t, person);
    if (!segs.length && capitalize) text = cap(text);
    segs.push({
      kind: 'word', text, sep, wordId: w.id, index: i, isVar: !!t.var, cat: w.cat,
      slot: t.slot || w.cat, gloss: w.gloss || '', inflected: text.toLowerCase() !== w.text.toLowerCase(),
    });
  });
  const open = capitalize && segs.length ? opener(end) : '';
  if (open) segs.unshift({ kind: 'punct', text: open, sep: '' });
  return segs;
}

export const joinSegments = (segs) => segs.map((s) => s.sep + s.text).join('');

export function sentenceText(tokens, words, end = '.') {
  const segs = sentenceSegments(tokens, words, { end });
  return segs.length ? joinSegments(segs) + (end || '.') : '';
}

/**
 * A paragraph is sentences glued by joins. A join is either null (full stop,
 * new sentence) or the id of a LINK word ("because", "perché", "porque"…),
 * which fuses two sentences into one.
 */
export function paragraphSegments(parts, joins, words) {
  const segs = [];
  let capNext = true;
  parts.forEach((p, pi) => {
    const ss = sentenceSegments(p.tokens, words, { capitalize: capNext, end: p.end });
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
      const comma = jw.comma || jw.joinComma;
      segs.push({ kind: 'join', text: jw.text, sep: comma ? ', ' : ' ', wordId: jw.id, joinIndex: pi, cat: jw.cat, gloss: jw.gloss || '' });
      capNext = false;
    }
  });
  return segs;
}

export const paragraphText = (parts, joins, words) => joinSegments(paragraphSegments(parts, joins, words));

/** The sector a token belongs to (a variable keeps its slot even when its word changes). */
export const slotOf = (token, words) => token.slot || words[token.wordId]?.cat;

/** Every lit star that can fill this token's slot. `orbit` maps sector → word ids. */
export function optionsFor(token, words, orbit) {
  const slot = slotOf(token, words);
  return slot ? orbit[slot] || [] : [];
}

/** How many sentences one template can make: the product of its variables' orbits. */
export function countTokens(tokens, words, orbit) {
  let n = 1;
  for (const t of tokens) if (t.var) n *= Math.max(1, optionsFor(t, words, orbit).length);
  return n;
}

export function countParagraph(parts, joins, words, orbit) {
  let n = 1;
  for (const p of parts) n *= countTokens(p.tokens, words, orbit);
  const joinChoices = 1 + (orbit.link || []).length;
  return n * Math.pow(joinChoices, Math.max(0, parts.length - 1));
}

export function formulaParts(tokens, words, orbit) {
  return tokens.filter((t) => t.var).map((t) => ({ n: Math.max(1, optionsFor(t, words, orbit).length), cat: slotOf(t, words) }));
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
