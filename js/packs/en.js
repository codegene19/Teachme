// English starter universe: no levels — words are revealed by their
// neighbours in real sentences.

import { SEED_WORDS, EXAMPLES, BLUEPRINTS, GENESIS_CHOICES } from '../seed.js';

const COMMA = new Set(['but', 'so']);
const JOIN_COMMA = new Set(['and', 'or']);

export default {
  id: 'en',
  name: 'English',
  english: 'English',
  voice: 'en-US',
  invert: false,
  hello: 'I want coffee now.',
  words: Object.entries(SEED_WORDS).flatMap(([c, list]) => list.map((t) => ({
    t, c, ...(COMMA.has(t) ? { comma: true } : {}), ...(JOIN_COMMA.has(t) ? { joinComma: true } : {}),
  }))),
  blueprints: BLUEPRINTS,
  genesis: GENESIS_CHOICES,
  examples: EXAMPLES,
};
