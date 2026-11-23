// Extra Spanish words for every level, merged into the pack by index.js.
// Same rules as es.js: verbs carry all four tenses, things carry a kind,
// feelings work with "estar" and stay gender-neutral, and people are not
// used as objects (Spanish would need the personal "a").

import { es, P } from './conjugate.js';

const w = (t, c, en, x = {}) => ({ t, c, en, ...x });
const V = (t, c, en, conj, x = {}) => ({ t, c, en, ...conj, ...x });
const a = (t, en, plural = t) => ({ t, c: 'feeling', en, n: [t, plural] });
const T = (t, en, tense) => ({ t, c: 'time', en, ...(tense ? { tense } : {}) });
const HACER = { pres: P('hago|haces|hace|hacemos|hacéis|hacen'), pret: P('hice|hiciste|hizo|hicimos|hicisteis|hicieron'), futStem: 'har' };

export default {
  levels: {
    1: [w('una manzana', 'thing', 'an apple'), w('leche', 'thing', 'milk'), w('vino', 'thing', 'wine'), w('un té', 'thing', 'a tea'), w('queso', 'thing', 'cheese')],
    2: [w('un coche', 'thing', 'a car'), w('un teléfono', 'thing', 'a phone'), w('las llaves', 'thing', 'the keys'), w('un trabajo', 'thing', 'a job'), w('una casa', 'thing', 'a house')],
    3: [a('genial', 'great'), a('fatal', 'awful'), a('regular', 'so-so'), a('de pie', 'standing')],
    4: [
      V('escribir', 'action', 'write', es('escribir')),
      V('abrir', 'action', 'open', es('abrir')),
      V('cerrar', 'action', 'close', es('cerrar', { boot: 'cierr' })),
      V('limpiar', 'action', 'clean', es('limpiar')),
      w('una carta', 'thing', 'a letter'),
      T('esta mañana', 'this morning'), T('pronto', 'soon'), T('a mediodía', 'at noon'),
    ],
    5: [
      V('llamar', 'action', 'call', es('llamar')),
      V('conocer', 'action', 'get to know', es('conocer', { pres: P('conozco|conoces|conoce|conocemos|conocéis|conocen') })),
      V('vender', 'action', 'sell', es('vender')),
      w('un regalo', 'thing', 'a present'), w('un paraguas', 'thing', 'an umbrella'),
    ],
    6: [w('en la ciudad', 'place', 'in town'), w('en el parque', 'place', 'in the park'), w('en la estación', 'place', 'at the station'), w('en la biblioteca', 'place', 'at the library'), w('en el supermercado', 'place', 'at the supermarket')],
    7: [
      w('de vez en cuando', 'freq', 'now and then'), w('casi siempre', 'freq', 'almost always'),
      V('cantar', 'action', 'sing', es('cantar')), V('tocar', 'action', 'play (music)', es('tocar')),
      w('una canción', 'thing', 'a song'),
    ],
    8: [w('entonces', 'link', 'so then', { comma: true }), w('pues', 'link', 'well, so', { comma: true }), w('mientras que', 'link', 'whereas'), a('de buenas', 'in good spirits')],
    9: [
      V('perder', 'action', 'lose', es('perder', { boot: 'pierd' })),
      V('elegir', 'action', 'choose', es('elegir', { pres: P('elijo|eliges|elige|elegimos|elegís|eligen'), pret: P('elegí|elegiste|eligió|elegimos|elegisteis|eligieron') })),
      V('regalar', 'action', 'give (as a gift)', es('regalar')),
      w('una bolsa', 'thing', 'a bag'), w('el billete de tren', 'thing', 'the train ticket'),
    ],
    10: [T('anteayer', 'the day before yesterday', 'past'), T('el mes pasado', 'last month', 'past'), T('hace un rato', 'a while ago', 'past'), w('la compra', 'thing', 'the shopping'), w('los deberes', 'thing', 'the homework')],
    11: [
      T('el mes que viene', 'next month', 'fut'), T('pasado mañana', 'the day after tomorrow', 'fut'), T('dentro de poco', 'shortly', 'fut'),
      V('reservar', 'action', 'book', es('reservar')), w('un viaje', 'thing', 'a trip'), w('en Madrid', 'place', 'in Madrid'), w('en el extranjero', 'place', 'abroad'),
    ],
    12: [w('una información', 'thing', 'some information'), w('el menú', 'thing', 'the menu'), w('una cita', 'thing', 'an appointment'), a('en paz', 'at peace')],
    13: [
      T('en aquella época', 'at that time', 'imp'), T('por aquel entonces', 'back then', 'imp'),
      V('contar', 'action', 'tell', es('contar', { boot: 'cuent' })),
      w('el barrio', 'thing', 'the neighbourhood'), w('una historia', 'thing', 'a story'),
    ],
    14: [w('en cambio', 'link', 'on the other hand', { comma: true }), w('de hecho', 'link', 'in fact', { comma: true }), w('por eso', 'link', 'that is why', { comma: true }), w('en el gimnasio', 'place', 'at the gym'), a('de malas', 'in a foul mood')],
    15: [
      V('proponer', 'action', 'propose', es('proponer', {
        pres: P('propongo|propones|propone|proponemos|proponéis|proponen'), pret: P('propuse|propusiste|propuso|propusimos|propusisteis|propusieron'), futStem: 'propondr',
      })),
      V('organizar', 'action', 'organise', es('organizar')),
      w('un plan', 'thing', 'a plan'), w('una reunión', 'thing', 'a meeting'), w('el resultado', 'thing', 'the result'),
    ],
    16: [w('enseguida', 'freq', 'straight away'), w('todavía', 'freq', 'still'), w('la libertad', 'thing', 'freedom'), w('la naturaleza', 'thing', 'nature'), a('de buen ánimo', 'in good spirits')],
    17: [
      V('superar', 'action', 'overcome', es('superar')), V('gestionar', 'action', 'manage', es('gestionar')),
      V('construir', 'action', 'build', es('construir', { pres: P('construyo|construyes|construye|construimos|construís|construyen'), pret: P('construí|construiste|construyó|construimos|construisteis|construyeron') })),
      w('una carrera', 'thing', 'a career'), w('el riesgo', 'thing', 'the risk'),
    ],
    18: [w('por consiguiente', 'link', 'consequently', { comma: true }), w('aun así', 'link', 'even so', { comma: true }), w('ya que', 'link', 'seeing that'), a('a salvo', 'safe')],
    19: [
      V('echar de menos', 'action', 'miss', es('echar de menos')),
      a('de bajón', 'down in the dumps'), T('de buenas a primeras', 'out of the blue'),
      w('el hilo', 'thing', 'the thread (of a talk)'),
    ],
    20: [
      V('hacer frente a', 'action', 'stand up to', es('hacer frente a', HACER)),
      w('un dilema', 'thing', 'a dilemma'), w('los matices', 'thing', 'the nuances'), w('el punto de vista', 'thing', 'the point of view'),
    ],
  },
  kinds: {
    'una manzana': 'food', 'queso': 'food', 'leche': 'drink', 'vino': 'drink', 'un té': 'drink',
    'un coche': 'transport', 'un teléfono': 'item', 'las llaves': 'item', 'un trabajo': 'goal', 'una casa': 'room',
    'una carta': 'read', 'un regalo': 'item', 'un paraguas': 'item', 'una canción': 'listen', 'una bolsa': 'item',
    'el billete de tren': 'ticket', 'la compra': 'errand', 'los deberes': 'errand', 'un viaje': 'trip',
    'una información': 'info', 'el menú': 'read', 'una cita': 'ticket', 'el barrio': 'place', 'una historia': 'read',
    'un plan': 'idea', 'una reunión': 'trip', 'el resultado': 'goal', 'la libertad': 'truth', 'la naturaleza': 'truth',
    'una carrera': 'goal', 'el riesgo': 'issue', 'el hilo': 'info', 'un dilema': 'issue',
    'los matices': 'truth', 'el punto de vista': 'idea',
  },
  objects: {
    tener: 'item', querer: 'item', 'querría': 'item', necesitar: 'item', preferir: 'item', comprar: 'item',
    buscar: 'item goal', encontrar: 'item', usar: 'item', llevar: 'item', olvidar: 'item', hacer: 'errand trip', tomar: 'ticket',
    escribir: 'read info', abrir: 'item read room', cerrar: 'item read room', limpiar: 'room item',
    llamar: 'transport', conocer: 'place lang', vender: 'food drink item transport read',
    cantar: 'listen', tocar: 'listen', perder: 'item ticket transport time money',
    elegir: 'food drink item room ticket idea', regalar: 'item food read watch',
    reservar: 'room ticket trip transport', contar: 'read info idea',
    proponer: 'idea decision', organizar: 'trip idea errand', superar: 'issue goal', gestionar: 'issue idea trip',
    construir: 'idea goal', 'echar de menos': 'place food', 'hacer frente a': 'issue truth',
  },
};
