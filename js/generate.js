// Generators: fresh sentences and short stories built from the patterns of
// every level you have reached, filled with the stars you have lit.

import { state, derived, blueprints, resolveBlueprint } from './store.js';
import { optionsFor, pickRandom, slotOf } from './language.js';

/** Patterns you can build right now, favouring the newest (most complex) ones. */
function patterns({ statementsOnly = false, withTime = false } = {}) {
  const all = blueprints()
    .filter((bp) => (!statementsOnly || bp.end === '.') && resolveBlueprint(bp))
    .map((bp) => ({ bp, weight: Math.pow(bp.l || 1, 1.3) }));
  // stories that move through time need a time slot in every sentence
  const timed = withTime ? all.filter((x) => x.bp.pattern.includes('[time]')) : [];
  return timed.length ? timed : all;
}

function weighted(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of list) { r -= x.weight; if (r <= 0) return x.bp; }
  return list[list.length - 1]?.bp;
}

const tenseOf = (id) => state.words[id]?.tense || 'pres';

// Where each kind of thing plausibly happens. Places tagged 'any' (here, there) always fit.
const SCENES = {
  food: 'home cafe outdoor city travel shop', drink: 'home cafe outdoor city travel shop',
  read: 'home library work outdoor cafe station', watch: 'home city cafe travel outdoor', listen: 'home cafe city outdoor gym',
  lesson: 'home library work', person: 'home cafe city outdoor travel work station gym', time: 'home work',
  money: 'home work shop city', ticket: 'station city travel home', transport: 'station city travel',
  room: 'home travel city cafe', place: 'city travel', lang: 'home library travel work', info: 'home work city library station',
  idea: 'home work cafe city', decision: 'home work cafe city', issue: 'home work cafe city', goal: 'home work cafe city',
  truth: 'home outdoor travel library', chance: 'work travel city', item: 'home work shop city station',
  errand: 'home shop city', trip: 'home work travel',
};
const fitsScene = (kind, place) => !kind || !place.scene || place.scene === 'any' || (SCENES[kind] || '').split(' ').includes(place.scene);

/**
 * One random sentence. `who` keeps the subject; `tense` keeps every time word
 * in the same tense family, so a story stays in one timeline.
 */
export function randomSentence({ who = null, tense = null, statementsOnly = false, place = null, cast = null, withTime = false } = {}) {
  const list = patterns({ statementsOnly, withTime });
  if (!list.length) return null;
  const bp = weighted(list);
  const r = resolveBlueprint(bp);
  const W = state.words;
  const things = derived.orbit.thing || [];
  // a verb is usable only if at least one lit thing makes sense after it
  const usable = (id) => !W[id].obj || things.some((t) => W[id].obj.includes(W[t].kind));
  let firstWho = true;
  const tokens = [];
  for (const t of r.tokens) {
    if (!t.var) { tokens.push({ ...t }); continue; }
    let opts = optionsFor(t, W, derived.orbit);
    const slot = slotOf(t, W);
    const prev = W[tokens[tokens.length - 1]?.wordId];
    if (slot === 'action') {
      // after "voglio / posso…" the second verb is a real action, not another modal
      if (prev?.cat === 'modal') opts = opts.filter((id) => W[id].cat !== 'modal');
      if (prev?.acts) opts = opts.filter((id) => prev.acts.includes(W[id].text));
      opts = opts.filter(usable);
    }
    if (slot === 'thing') {
      // the object must suit the nearest verb before it in this clause
      let verb = null;
      for (let j = tokens.length - 1; j >= 0 && !verb; j--) {
        const w = W[tokens[j].wordId];
        if (w?.cat === 'link') break;
        if (w?.obj) verb = w;
      }
      if (verb) {
        const fit = opts.filter((id) => verb.obj.includes(W[id].kind));
        if (fit.length) opts = fit;
      }
    }
    if (slot === 'place' && place && opts.includes(place)) opts = [place];
    else if (slot === 'place') {
      // the place must suit the thing in this clause (a ticket at the station, not at the gym)
      let thing = null;
      for (let j = tokens.length - 1; j >= 0 && !thing; j--) {
        const w = W[tokens[j].wordId];
        if (w?.cat === 'link') break;
        if (w?.cat === 'thing') thing = w;
      }
      if (thing) {
        const fit = opts.filter((id) => fitsScene(thing.kind, W[id]));
        if (fit.length) opts = fit;
      }
    }
    if (!opts.length) opts = optionsFor(t, W, derived.orbit);
    let pick = pickRandom(opts);
    if (slot === 'who' && firstWho && who && opts.includes(who)) pick = who;
    // a second subject in the same sentence is someone else
    if (slot === 'who' && !firstWho && opts.length > 1) {
      const first = tokens.find((x) => W[x.wordId]?.cat === 'who')?.wordId;
      const others = (cast || []).filter((id) => id !== first && opts.includes(id));
      pick = pickRandom(others.length ? others : opts.filter((id) => id !== first));
    }
    if (slot === 'who') firstWho = false;
    if (slot === 'time' && tense) {
      const same = opts.filter((id) => tenseOf(id) === tense && (tense !== 'pres' || state.words[id].cat === 'time'));
      if (same.length) pick = pickRandom(same);
    }
    tokens.push({ ...t, wordId: pick || t.wordId });
  }
  return { tokens, end: r.end, name: bp.name };
}

export const canGenerate = () => patterns().length > 0;

/** A short story: one subject, one timeline, sentences joined by your bridge words. */
export function randomStory(length = 3) {
  if (!canGenerate()) return null;
  const whos = derived.orbit.who || [];
  const who = pickRandom(whos);
  const times = derived.orbit.time || [];
  const withTense = times.filter((id) => tenseOf(id) !== 'pres');
  const tense = withTense.length && Math.random() < 0.65 ? tenseOf(pickRandom(withTense)) : 'pres';
  const parts = [];
  for (let i = 0; i < length; i++) {
    const s = randomSentence({ who: i === 0 || Math.random() < 0.6 ? who : null, tense, statementsOnly: true });
    if (s) parts.push({ tokens: s.tokens, end: s.end, name: s.name });
  }
  // join two sentences with a bridge word only when neither already has one, so nothing runs on
  const links = derived.orbit.link || [];
  const hasLink = (p) => p.tokens.some((t) => state.words[t.wordId]?.cat === 'link');
  const joins = [];
  parts.slice(1).forEach((p, i) => {
    const free = links.length && !hasLink(p) && !hasLink(parts[i]) && !joins[i - 1];
    joins.push(free && Math.random() < 0.6 ? pickRandom(links) : null);
  });
  return { parts, joins };
}

const ARC = { arc: ['past', 'pres', 'fut'], past: ['past'], pres: ['pres'], fut: ['fut'] };

/**
 * Story mode: your characters, in one setting, along a timeline
 * ("arc" = yesterday → today → tomorrow). Each sentence's subject is one of
 * the characters; a second subject in the same sentence is another one.
 */
export function characterStory({ cast = [], place = null, timeline = 'arc', length = 5 } = {}) {
  if (!canGenerate() || !cast.length) return null;
  const times = derived.orbit.time || [];
  const has = (t) => t === 'pres' ? times.some((id) => tenseOf(id) === 'pres') : times.some((id) => tenseOf(id) === t);
  const phases = ARC[timeline].filter(has);
  const parts = [];
  for (let i = 0; i < length; i++) {
    const phase = phases.length ? phases[Math.min(phases.length - 1, Math.floor((i * phases.length) / length))] : null;
    const s = randomSentence({ who: cast[i % cast.length], tense: phase, place, cast, statementsOnly: true, withTime: !!phase });
    if (s) parts.push({ tokens: s.tokens, end: s.end, name: s.name });
  }
  const links = derived.orbit.link || [];
  const hasLink = (p) => p.tokens.some((t) => state.words[t.wordId]?.cat === 'link');
  const joins = [];
  parts.slice(1).forEach((p, i) => {
    const free = links.length && !hasLink(p) && !hasLink(parts[i]) && !joins[i - 1];
    joins.push(free && Math.random() < 0.45 ? pickRandom(links) : null);
  });
  return { parts, joins };
}
