// English for a generated sentence, used as the prompt in translation
// challenges. It follows the same structure the grammar engine builds:
// the subject's person, each clause's tense, negation, modal + infinitive,
// and English adverb order ("I always eat", "I am always happy").

import { personAt, clauseTenses } from './language.js';

const PAST = {
  have: 'had', eat: 'ate', drink: 'drank', take: 'took', buy: 'bought', make: 'made', see: 'saw', find: 'found',
  bring: 'brought', read: 'read', write: 'wrote', meet: 'met', sell: 'sold', sing: 'sang', lose: 'lost', choose: 'chose',
  give: 'gave', tell: 'told', know: 'knew', understand: 'understood', build: 'built', overcome: 'overcame', forget: 'forgot',
  pay: 'paid', get: 'got', stand: 'stood', think: 'thought', prefer: 'preferred', do: 'did', go: 'went', come: 'came',
};
const PP = {
  eat: 'eaten', drink: 'drunk', take: 'taken', see: 'seen', write: 'written', choose: 'chosen', give: 'given', know: 'known',
  forget: 'forgotten', sing: 'sung', overcome: 'overcome', be: 'been', do: 'done', go: 'gone',
};
const past = (v) => PAST[v] || (v.endsWith('e') ? `${v}d` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ied` : `${v}ed`);
const pp = (v) => PP[v] || past(v);
const third = (v) => (v === 'have' ? 'has' : /(s|sh|ch|x|z|o)$/.test(v) ? `${v}es` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`);

/** "take / have" → "take"; "give (as a gift)" → "give"; "you (formal)" → "you". */
export const cleanGloss = (g) => String(g || '').split(' / ')[0].replace(/\s*\([^)]*\)/g, '').trim();

// Verbs that take an infinitive after them, and how.
const TO_INF = new Set(['want', 'prefer', 'need', 'would like']);
// States read as plain past in the imperfect ("I was", "I had"), actions as "used to".
const STATIVE = new Set(['have', 'want', 'need', 'know', 'prefer', 'like', 'love', 'understand', 'remember', 'have to', 'know how to']);
const AUX = /^(will|can|cannot|could|should|would|must|did|do|does|am|is|are|was|were|has|have|had)( not)?\b/;

/** "always" goes after a helper verb ("will always eat", "is always") and before a plain one ("always eats"). */
function withAdverb(vp, adv) {
  // a lone main verb ("has", "eats") takes the adverb before it; only "be" takes it after
  if (!vp.includes(' ') && !/^(am|is|are|was|were)$/.test(vp)) return `${adv} ${vp}`;
  const m = vp.match(AUX);
  if (!m) return `${adv} ${vp}`;
  return `${m[0]} ${adv}${vp.slice(m[0].length)}`;
}
const CONDITIONAL = new Set(['could', 'should']);

function bePresent(person, you) { return person === 0 ? 'am' : person === 2 && !you ? 'is' : 'are'; }
function bePast(person, you) { return (person === 0 || (person === 2 && !you)) ? 'was' : 'were'; }

/** A finite verb phrase, e.g. ("eat", he, past, negative) → "did not eat". */
function verbPhrase(g, person, tense, neg, you) {
  const isThird = person === 2 && !you;
  const not = neg ? ' not' : '';
  const [head, ...rest] = g.split(' ');
  const tail = rest.length ? ` ${rest.join(' ')}` : '';
  switch (g) {
    case 'be':
      if (tense === 'fut') return `will${not} be`;
      return tense === 'pres' ? `${bePresent(person, you)}${not}` : `${bePast(person, you)}${not}`;
    case 'can':
      if (tense === 'fut') return `will${not} be able to`;
      return tense === 'pres' ? (neg ? 'cannot' : 'can') : `could${not}`;
    case 'must':
      if (tense === 'fut') return `will${not} have to`;
      if (tense === 'pres') return `must${not}`;
      return neg ? 'did not have to' : 'had to';
    case 'be going to':
      if (tense === 'past') return neg ? 'did not go to' : 'went to';
      return tense === 'imp' ? `${bePast(person, you)}${not} going to` : `${bePresent(person, you)}${not} going to`;
    case 'would like':
      return tense === 'past' || tense === 'imp' ? `would${not} have liked` : `would${not} like`;
    case 'could': case 'should':
      return tense === 'past' || tense === 'imp' ? `${g}${not} have` : `${g}${not}`;
    default:
      if (tense === 'fut') return `will${not} ${g}`;
      if (tense === 'imp' && !STATIVE.has(g)) return neg ? `did not use to ${g}` : `used to ${g}`;
      if (tense === 'imp') return neg ? `did not ${g}` : `${past(head)}${tail}`;
      if (tense === 'past') return neg ? `did not ${g}` : `${past(head)}${tail}`;
      if (neg) return `${isThird ? 'does' : 'do'} not ${g}`;
      return `${isThird ? third(head) : head}${tail}`;
  }
}

/** English for one sentence of tokens. */
export function englishFor(tokens, words, end = '.') {
  const tenses = clauseTenses(tokens, words);
  const out = [];
  let neg = false;
  let lastModal = null;      // the finite verb before an infinitive
  let verbAt = -1;           // index in `out` of this clause's verb phrase
  let verbIsBe = false;
  let queued = [];           // adverbs waiting for the verb
  const subjectYou = (i) => {
    for (let j = i - 1; j >= 0; j--) {
      const w = words[tokens[j]?.wordId];
      if (w?.person != null) return cleanGloss(w.gloss || w.text).toLowerCase().startsWith('you');
    }
    return false;
  };
  tokens.forEach((t, i) => {
    const w = words[t.wordId];
    if (!w) return;
    let g = cleanGloss(w.gloss || w.text);
    // "fare la spesa" is to DO the shopping; "fare una foto / un viaggio" is to TAKE one
    if (g === 'make') {
      const next = tokens.slice(i + 1).map((x) => words[x.wordId]).find((x) => x?.cat === 'thing');
      if (next?.kind === 'errand') g = 'do';
      else if (next?.kind === 'trip' || /photo/.test(next?.gloss || '')) g = 'take';
    }
    // you miss a train, you don't lose it
    if (g === 'lose') {
      const next = tokens.slice(i + 1).map((x) => words[x.wordId]).find((x) => x?.cat === 'thing');
      if (next?.kind === 'transport' || /train|bus|flight|plane/.test(next?.gloss || '')) g = 'miss';
    }
    // you look at a photo, you don't watch it
    if (g === 'watch') {
      const next = tokens.slice(i + 1).map((x) => words[x.wordId]).find((x) => x?.cat === 'thing');
      if (/photo|picture|map/.test(next?.gloss || '')) g = 'look at';
    }
    if (w.cat === 'link') {
      out.push(`${w.comma || w.joinComma ? ',' : ''}\u0000${g}`);
      neg = false; lastModal = null; verbAt = -1; verbIsBe = false; queued = [];
      return;
    }
    if (w.cat === 'core' && g === 'not') { neg = true; return; }
    if (w.cat === 'freq') {
      if (verbAt < 0) queued.push(g);
      else out[verbAt] = withAdverb(out[verbAt], g);
      return;
    }
    if (w.forms && t.inf) {
      const base = lastModal && CONDITIONAL.has(lastModal.g) && lastModal.pastish
        ? (() => { const [h, ...r] = g.split(' '); return [pp(h), ...r].join(' '); })()
        : g;
      out.push(lastModal && TO_INF.has(lastModal.g) ? `to ${base}` : base);
      lastModal = null;
      return;
    }
    if (w.forms) {
      const person = personAt(tokens, words, i);
      const vp = verbPhrase(g, person, tenses[i], neg, subjectYou(i));
      neg = false;
      verbIsBe = g === 'be';
      const withAdverbs = queued.length ? withAdverb(vp, queued.join(' ')) : vp;
      queued = [];
      verbAt = out.length;
      out.push(withAdverbs);
      lastModal = { g, pastish: tenses[i] === 'past' || tenses[i] === 'imp' };
      return;
    }
    // English puts the describing word before the noun: "a new house", "an old car"
    if (w.cat === 'quality') {
      for (let j = out.length - 1; j >= 0; j--) {
        const m = out[j].match(/^(a|an|the|some)\s+(.*)$/i);
        if (words[tokens[i - 1]?.wordId]?.cat !== 'thing') break;
        if (m) {
          const art = /^(a|an)$/i.test(m[1]) ? (/^[aeiou]/i.test(g) ? 'an' : 'a') : m[1];
          out[j] = `${art} ${g} ${m[2]}`;
        } else out[j] = `${g} ${out[j]}`;
        return;
      }
    }
    out.push(g);
  });
  let text = out.join(' ').replace(/ ,\u0000/g, ', ').replace(/\u0000/g, '');
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return `${text}${end || '.'}`;
}
