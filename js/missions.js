// Missions: a gentle flight plan from one word to fluency in fifty.

import { state, derived } from './store.js';

const count = (o) => Object.keys(o).length;
const maxOf = (arr) => arr.reduce((m, v) => Math.max(m, v), 0);
const anyVar = () => state.forge.tokens.some((t) => t.var) || Object.values(state.constellations).some((c) => c.tokens.some((t) => t.var));

export const MISSIONS = [
  { id: 'spark',   title: 'Ignite your first star',             how: 'Choose a word floating in the dark.',                          target: 1,     value: () => derived.litCount },
  { id: 'five',    title: 'Discover 5 stars',                   how: 'Tap the faint stars connected to the ones you know.',          target: 5,     value: () => derived.litCount },
  { id: 'forge',   title: 'Forge a sentence of 3 words',        how: 'Open the Forge and add stars — or just type a sentence.',      target: 3,     value: () => maxOf([state.forge.tokens.length, ...Object.values(state.constellations).map((c) => c.tokens.length)]) },
  { id: 'variable',title: 'Turn a word into a variable',        how: 'Tap a word in the Forge pattern → “Make variable”.',           target: 1,     value: () => (anyVar() ? 1 : 0) },
  { id: 'spin',    title: 'Swap variables 10 times',            how: 'Click coloured words in the sentence, or Shuffle.',           target: 10,    value: () => state.stats.swaps },
  { id: 'save',    title: 'Save your first constellation',      how: 'Press Save in the Forge. It will shine in your sky.',          target: 1,     value: () => count(state.constellations) },
  { id: 'voice',   title: 'Hear a sentence aloud',              how: 'Press Hear in the Forge.',                                     target: 1,     value: () => state.stats.spoken },
  { id: 'hundred', title: '100 sentences within reach',         how: 'More variables and more stars multiply your reach.',           target: 100,   value: () => derived.reach },
  { id: 'sectors', title: 'Discover 5 sectors',                 how: 'Each sector is a role in a sentence: WHO, ACTION, TIME…',      target: 5,     value: () => derived.sectors },
  { id: 'galaxy',  title: 'Link two sentences into a galaxy',   how: 'Open Galaxy, add two sentences, save.',                        target: 2,     value: () => maxOf(Object.values(state.galaxies).map((g) => g.parts.length)) },
  { id: 'eclipse', title: 'Survive 5 eclipses in a row',        how: 'Eclipse hides one word. Listen and find it.',                  target: 5,     value: () => state.stats.bestStreak },
  { id: 'quarter', title: 'Discover 25 stars',                  how: 'Keep following the dotted threads.',                           target: 25,    value: () => derived.litCount },
  { id: 'tenk',    title: '10,000 sentences within reach',      how: 'Long patterns with many variables grow fast.',                 target: 10000, value: () => derived.reach },
  { id: 'drift',   title: 'Drift through your universe',        how: 'Press Drift and let your sentences carry you.',                target: 1,     value: () => state.stats.drifts },
  { id: 'fifty',   title: 'Fluent in fifty — light 50 stars',   how: 'Fifty words, truly owned, is a real foundation.',              target: 50,    value: () => derived.litCount },
  { id: 'nova',    title: 'Supernova — meet one word 50 times', how: 'Every time a word appears in your sentences, it grows.',        target: 50,    value: () => maxOf(Object.values(state.words).map((w) => w.seen)) },
  { id: 'million', title: 'One million sentences within reach', how: 'You are no longer learning words. You are learning a language.', target: 1e6, value: () => derived.reach },
];

export function checkMissions() {
  const done = [];
  for (const m of MISSIONS) {
    if (state.missions[m.id]) continue;
    if (m.value() >= m.target) {
      state.missions[m.id] = Date.now();
      done.push(m);
    }
  }
  return done;
}

export const pendingMissions = () => MISSIONS.filter((m) => !state.missions[m.id]);
export const doneCount = () => MISSIONS.filter((m) => state.missions[m.id]).length;
