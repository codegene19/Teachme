// Extra Italian words for every level, merged into the pack by index.js.
// Same rules as it.js: verbs carry all four tenses, things carry a kind,
// feelings stay gender-neutral, and each verb lists what it can act on.

import { it, P } from './conjugate.js';

const w = (t, c, en, x = {}) => ({ t, c, en, ...x });
const V = (t, c, en, conj, x = {}) => ({ t, c, en, ...conj, ...x });
const a = (t, en, plural = t) => ({ t, c: 'feeling', en, n: [t, plural] });
const T = (t, en, tense) => ({ t, c: 'time', en, ...(tense ? { tense } : {}) });
const FARE = { pres: P('faccio|fai|fa|facciamo|fate|fanno'), imp: P('facevo|facevi|faceva|facevamo|facevate|facevano'), futStem: 'far', pp: 'fatto' };

export default {
  levels: {
    1: [w('una mela', 'thing', 'an apple'), w('il latte', 'thing', 'the milk'), w('il vino', 'thing', 'the wine'), w('un tè', 'thing', 'a tea'), w('il formaggio', 'thing', 'the cheese')],
    2: [w('una macchina', 'thing', 'a car'), w('un telefono', 'thing', 'a phone'), w('le chiavi', 'thing', 'the keys'), w('un lavoro', 'thing', 'a job'), w('una casa', 'thing', 'a house')],
    3: [a('intelligente', 'clever', 'intelligenti'), a('giovane', 'young', 'giovani'), a('elegante', 'elegant', 'eleganti'), a('di fretta', 'in a hurry')],
    4: [
      V('scrivere', 'action', 'write', it('scrivere', { pp: 'scritto' })),
      V('aprire', 'action', 'open', it('aprire', { pp: 'aperto' })),
      V('chiudere', 'action', 'close', it('chiudere', { pp: 'chiuso' })),
      V('pulire', 'action', 'clean', it('pulire', { isc: true })),
      w('una lettera', 'thing', 'a letter'),
      T('stamattina', 'this morning'), T('presto', 'soon'), T('a mezzogiorno', 'at noon'),
    ],
    5: [
      V('chiamare', 'action', 'call', it('chiamare')),
      V('incontrare', 'action', 'meet', it('incontrare')),
      V('vendere', 'action', 'sell', it('vendere')),
      w('un regalo', 'thing', 'a present'), w('un ombrello', 'thing', 'an umbrella'),
    ],
    6: [w('in città', 'place', 'in town'), w('al parco', 'place', 'in the park'), w('in stazione', 'place', 'at the station'), w('in biblioteca', 'place', 'at the library'), w('al supermercato', 'place', 'at the supermarket')],
    7: [
      w('ogni tanto', 'freq', 'now and then'), w('quasi sempre', 'freq', 'almost always'),
      V('cantare', 'action', 'sing', it('cantare')), V('suonare', 'action', 'play (music)', it('suonare')),
      w('una canzone', 'thing', 'a song'),
    ],
    8: [w('oppure', 'link', 'or else'), w('allora', 'link', 'so then', { comma: true }), w('dopo che', 'link', 'after'), w('finché', 'link', 'as long as'), a('di corsa', 'rushing')],
    9: [
      V('perdere', 'action', 'lose', it('perdere', { pp: 'perso' })),
      V('scegliere', 'action', 'choose', it('scegliere', { pres: P('scelgo|scegli|sceglie|scegliamo|scegliete|scelgono'), pp: 'scelto' })),
      V('regalare', 'action', 'give (as a gift)', it('regalare')),
      w('una borsa', 'thing', 'a bag'), w('il biglietto del treno', 'thing', 'the train ticket'),
    ],
    10: [T("l'altro ieri", 'the day before yesterday', 'past'), T('il mese scorso', 'last month', 'past'), T('poco fa', 'a moment ago', 'past'), w('la spesa', 'thing', 'the shopping'), w('i compiti', 'thing', 'the homework')],
    11: [
      T('il mese prossimo', 'next month', 'fut'), T('dopodomani', 'the day after tomorrow', 'fut'), T('tra poco', 'shortly', 'fut'),
      V('prenotare', 'action', 'book', it('prenotare')), w('un viaggio', 'thing', 'a trip'), w('a Roma', 'place', 'in Rome'), w("all'estero", 'place', 'abroad'),
    ],
    12: [w("un'informazione", 'thing', 'some information'), w('il menù', 'thing', 'the menu'), w('un appuntamento', 'thing', 'an appointment'), a('in orario', 'on time')],
    13: [
      T('una volta', 'once / back then', 'imp'), T("a quell'epoca", 'at that time', 'imp'),
      V('conoscere', 'action', 'know (people, places)', it('conoscere', { pp: 'conosciuto' })),
      V('raccontare', 'action', 'tell', it('raccontare')),
      w('la città', 'thing', 'the city'), w('una storia', 'thing', 'a story'),
    ],
    14: [w('invece', 'link', 'instead', { comma: true }), w('infatti', 'link', 'in fact', { comma: true }), w('così', 'link', 'so', { comma: true }), w('in palestra', 'place', 'at the gym'), a('di malumore', 'grumpy')],
    15: [
      V('proporre', 'action', 'propose', it('proporre', {
        pres: P('propongo|proponi|propone|proponiamo|proponete|propongono'), imp: P('proponevo|proponevi|proponeva|proponevamo|proponevate|proponevano'),
        fut: P('proporrò|proporrai|proporrà|proporremo|proporrete|proporranno'), pp: 'proposto',
      })),
      V('organizzare', 'action', 'organise', it('organizzare')),
      w('un piano', 'thing', 'a plan'), w('una riunione', 'thing', 'a meeting'), w('il risultato', 'thing', 'the result'),
    ],
    16: [w('subito', 'freq', 'straight away'), w('ancora', 'freq', 'still'), w('la libertà', 'thing', 'freedom'), w('la natura', 'thing', 'nature'), a('ottimista', 'optimistic', 'ottimisti')],
    17: [
      V('superare', 'action', 'overcome', it('superare')), V('gestire', 'action', 'manage', it('gestire', { isc: true })),
      V('costruire', 'action', 'build', it('costruire', { isc: true })),
      w('una carriera', 'thing', 'a career'), w('il rischio', 'thing', 'the risk'),
    ],
    18: [w('ciononostante', 'link', 'nonetheless', { comma: true }), w('di conseguenza', 'link', 'consequently', { comma: true }), w('visto che', 'link', 'seeing that'), a('al sicuro', 'safe')],
    19: [
      V('prendere in giro', 'action', 'tease', it('prendere in giro', { pp: 'preso' })),
      a('giù di morale', 'down in the dumps'), T('di punto in bianco', 'out of the blue'),
      w('il filo del discorso', 'thing', 'the thread (of a talk)'),
    ],
    20: [
      V('fare i conti con', 'action', 'come to terms with', it('fare i conti con', FARE)),
      w('un dilemma', 'thing', 'a dilemma'), w('le sfumature', 'thing', 'the nuances'), w('il punto di vista', 'thing', 'the point of view'),
    ],
  },
  // the scene of each place: generated sentences only put things where they belong
  places: {
    qui: 'any', 'lì': 'any', 'a casa': 'home', 'al lavoro': 'work', 'in ufficio': 'work', 'in centro': 'city', 'in città': 'city',
    'al bar': 'cafe', 'al ristorante': 'cafe', 'al mare': 'outdoor', 'al parco': 'outdoor', 'in Italia': 'travel', 'a Roma': 'travel',
    "all'estero": 'travel', 'in stazione': 'station', 'in biblioteca': 'library', 'al supermercato': 'shop', 'in palestra': 'gym',
  },
  kinds: {
    'una mela': 'food', 'il formaggio': 'food', 'il latte': 'drink', 'il vino': 'drink', 'un tè': 'drink',
    'una macchina': 'transport', 'un telefono': 'item', 'le chiavi': 'item', 'un lavoro': 'goal', 'una casa': 'room',
    'una lettera': 'read', 'un regalo': 'item', 'un ombrello': 'item', 'una canzone': 'listen', 'una borsa': 'item',
    'il biglietto del treno': 'ticket', 'la spesa': 'errand', 'i compiti': 'errand', 'un viaggio': 'trip',
    "un'informazione": 'info', 'il menù': 'read', 'un appuntamento': 'ticket', 'la città': 'place', 'una storia': 'read',
    'un piano': 'idea', 'una riunione': 'trip', 'il risultato': 'goal', 'la libertà': 'truth', 'la natura': 'truth',
    'una carriera': 'goal', 'il rischio': 'issue', 'il filo del discorso': 'info', 'un dilemma': 'issue',
    'le sfumature': 'truth', 'il punto di vista': 'idea',
  },
  // new verbs, plus extra kinds for existing verbs
  objects: {
    avere: 'item', volere: 'item', vorrei: 'item', preferire: 'item', comprare: 'item', cercare: 'item goal',
    trovare: 'item', usare: 'item', portare: 'item', dimenticare: 'item', fare: 'errand trip', prendere: 'ticket',
    scrivere: 'read info', aprire: 'item read room', chiudere: 'item read room', pulire: 'room item',
    chiamare: 'person', incontrare: 'person', vendere: 'food drink item transport read',
    cantare: 'listen', suonare: 'listen', perdere: 'item ticket transport time money',
    scegliere: 'food drink item room ticket idea', regalare: 'item food read watch',
    prenotare: 'room ticket trip transport', conoscere: 'person place lang', raccontare: 'read info idea',
    proporre: 'idea decision', organizzare: 'trip idea errand', superare: 'issue goal', gestire: 'issue idea trip',
    costruire: 'idea goal', 'prendere in giro': 'person', 'fare i conti con': 'issue truth',
  },
};
