// Español — the most-used words, from galaxy A1 out to C2.
//
// Every slot is chosen so that any swap stays grammatical:
//  - verbs carry presente, pretérito, imperfecto and futuro, agree with the
//    nearest subject, and take their tense from the time word in the clause
//    ("ayer" → pretérito, "antes" → imperfecto, "el año que viene" → futuro);
//  - feelings use "estar" with gender-neutral words (singular/plural);
//  - things are noun chunks (with an article where Spanish needs one).

import { es, P } from './conjugate.js';

const w = (t, c, en, x = {}) => ({ t, c, en, ...x });
const V = (t, c, en, conj, x = {}) => ({ t, c, en, ...conj, ...x });
const a = (t, en, plural = t) => ({ t, c: 'feeling', en, n: [t, plural] });
const T = (t, en, tense) => ({ t, c: 'time', en, ...(tense ? { tense } : {}) });

// Polite conditionals: "querría" now, "habría querido" when the clause is in the past.
const COND = (forms, pp) => {
  const f = P(forms);
  const past = P('habría|habrías|habría|habríamos|habríais|habrían').map((x) => `${x} ${pp}`);
  return { f, ft: { past, imp: past, fut: f } };
};

const ESTAR = { f: P('estoy|estás|está|estamos|estáis|están'), ft: { past: P('estaba|estabas|estaba|estábamos|estabais|estaban'), imp: P('estaba|estabas|estaba|estábamos|estabais|estaban'), fut: P('estaré|estarás|estará|estaremos|estaréis|estarán') } };
const TENER = { pres: P('tengo|tienes|tiene|tenemos|tenéis|tienen'), pret: P('tuve|tuviste|tuvo|tuvimos|tuvisteis|tuvieron'), futStem: 'tendr' };

export default {
  id: 'es',
  name: 'Español',
  english: 'Spanish',
  voice: 'es-ES',
  invert: true,
  persons: ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ustedes'],
  tenseNames: { pres: 'presente', past: 'pretérito', imp: 'imperfecto', fut: 'futuro' },
  hello: '¡Hola! Yo quiero un café.',
  levels: [
    // ------------------------------------------------------------ A1
    {
      cefr: 'A1', name: 'First Light', native: 'Primera luz', goal: 'Say what you want and what you have.',
      words: [
        w('yo', 'who', 'I', { p: 0 }),
        V('querer', 'modal', 'want', es('querer', { boot: 'quier', pret: P('quise|quisiste|quiso|quisimos|quisisteis|quisieron'), futStem: 'querr' }), { also: ['action'] }),
        w('un café', 'thing', 'a coffee'),
        w('tú', 'who', 'you', { p: 1 }),
        V('tener', 'action', 'have', es('tener', TENER)),
        w('una pizza', 'thing', 'a pizza'),
        w('agua', 'thing', 'water'),
        w('pan', 'thing', 'bread'),
        w('no', 'core', 'not'),
      ],
      patterns: [
        { id: 'first-light', name: 'First Light', pattern: '[who] [action] [thing]', end: '.' },
        { id: 'refusal', name: 'The Refusal', pattern: '[who] no [action] [thing]', end: '.' },
      ],
    },
    {
      cefr: 'A1', name: 'Voices', native: 'Las voces', goal: 'Change the subject — watch the verb change with it.',
      words: [
        w('él', 'who', 'he', { p: 2 }),
        w('ella', 'who', 'she', { p: 2 }),
        w('nosotros', 'who', 'we', { p: 3 }),
        w('ellos', 'who', 'they', { p: 5 }),
        w('usted', 'who', 'you (formal)', { p: 2 }),
        w('un libro', 'thing', 'a book'),
        w('tiempo', 'thing', 'time'),
        w('dinero', 'thing', 'money'),
      ],
      patterns: [{ id: 'curiosity', name: 'Curiosity', pattern: '[who] [action] [thing]', end: '?' }],
    },
    {
      cefr: 'A1', name: 'Moods', native: 'Los ánimos', goal: 'Say how people feel with “estar”.',
      words: [
        V('estar', 'core', 'be (feel)', ESTAR),
        a('bien', 'well'),
        a('mal', 'unwell'),
        a('feliz', 'happy', 'felices'),
        a('triste', 'sad', 'tristes'),
        a('alegre', 'cheerful', 'alegres'),
        a('libre', 'free', 'libres'),
      ],
      patterns: [
        { id: 'inner-weather', name: 'Inner Weather', pattern: '[who] estar [feeling]', end: '.' },
        { id: 'clouded', name: 'Clouded', pattern: '[who] no estar [feeling]', end: '.' },
      ],
    },
    {
      cefr: 'A1', name: 'Daily Orbit', native: 'Cada día', goal: 'Everyday actions, and when they happen.',
      words: [
        V('comer', 'action', 'eat', es('comer')),
        V('beber', 'action', 'drink', es('beber')),
        V('tomar', 'action', 'take / have', es('tomar')),
        V('comprar', 'action', 'buy', es('comprar')),
        T('ahora', 'now'),
        T('hoy', 'today'),
        T('mañana', 'tomorrow'),
        T('esta noche', 'tonight'),
        T('todos los días', 'every day'),
      ],
      patterns: [{ id: 'clockwork', name: 'Clockwork', pattern: '[who] [action] [thing] [time]', end: '.' }],
    },
    {
      cefr: 'A1', name: 'Possibility', native: 'Las posibilidades', goal: 'Can, have to, going to + a verb in the infinitive.',
      words: [
        V('poder', 'modal', 'can', es('poder', { boot: 'pued', pret: P('pude|pudiste|pudo|pudimos|pudisteis|pudieron'), futStem: 'podr' })),
        V('tener que', 'modal', 'have to', es('tener que', TENER)),
        V('ir a', 'modal', 'be going to', es('ir a', {
          pres: P('voy|vas|va|vamos|vais|van'), pret: P('fui|fuiste|fue|fuimos|fuisteis|fueron'),
          imp: P('iba|ibas|iba|íbamos|ibais|iban'), fut: P('voy|vas|va|vamos|vais|van'),
        })),
        V('hacer', 'action', 'make / do', es('hacer', { pres: P('hago|haces|hace|hacemos|hacéis|hacen'), pret: P('hice|hiciste|hizo|hicimos|hicisteis|hicieron'), futStem: 'har' })),
        V('ver', 'action', 'see / watch', es('ver', { pres: P('veo|ves|ve|vemos|veis|ven'), pret: P('vi|viste|vio|vimos|visteis|vieron'), imp: P('veía|veías|veía|veíamos|veíais|veían') })),
        V('buscar', 'action', 'look for', es('buscar')),
        w('una película', 'thing', 'a film'),
        w('el tren', 'thing', 'the train'),
        w('la cena', 'thing', 'dinner'),
      ],
      patterns: [{ id: 'possibility', name: 'Possibility', pattern: '[who] [modal] [action:inf] [thing] [time]', end: '.' }],
    },
    // ------------------------------------------------------------ A2
    {
      cefr: 'A2', name: 'Coordinates', native: 'Los lugares', goal: 'Say where things happen.',
      words: [
        w('en casa', 'place', 'at home'),
        w('en el trabajo', 'place', 'at work'),
        w('aquí', 'place', 'here'),
        w('allí', 'place', 'there'),
        w('en el centro', 'place', 'downtown'),
        w('en el bar', 'place', 'at the bar'),
        V('leer', 'action', 'read', es('leer', { pret: P('leí|leíste|leyó|leímos|leísteis|leyeron') })),
        V('llevar', 'action', 'bring / carry', es('llevar')),
        w('una cerveza', 'thing', 'a beer'),
      ],
      patterns: [{ id: 'coordinates', name: 'Coordinates', pattern: '[who] [modal] [action:inf] [thing] [place]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Habits', native: 'Las costumbres', goal: 'How often: always, sometimes, never.',
      words: [
        w('siempre', 'freq', 'always'),
        w('a veces', 'freq', 'sometimes'),
        w('a menudo', 'freq', 'often'),
        w('normalmente', 'freq', 'usually'),
        w('nunca', 'freq', 'never'),
        V('escuchar', 'action', 'listen to', es('escuchar')),
        w('música', 'thing', 'music'),
        w('una foto', 'thing', 'a photo'),
      ],
      patterns: [{ id: 'habits', name: 'Orbit of Habits', pattern: '[who] [freq] [action] [thing] [place]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Bridges', native: 'Los puentes', goal: 'Join two ideas: and, but, because, so.',
      words: [
        w('y', 'link', 'and'),
        w('pero', 'link', 'but', { comma: true }),
        w('porque', 'link', 'because'),
        w('así que', 'link', 'so', { comma: true }),
        w('cuando', 'link', 'when'),
        w('si', 'link', 'if'),
        w('o', 'link', 'or'),
        a('de buen humor', 'in a good mood'),
        a('de vacaciones', 'on holiday'),
      ],
      patterns: [{ id: 'binary', name: 'Binary Star', pattern: '[who] estar [feeling] [link] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Wide Field', native: 'El cielo abierto', goal: 'Long sentences with every piece moving.',
      words: [
        V('necesitar', 'modal', 'need', es('necesitar'), { also: ['action'] }),
        V('preferir', 'modal', 'prefer', es('preferir', { boot: 'prefier', pret: P('preferí|preferiste|prefirió|preferimos|preferisteis|prefirieron') }), { also: ['action'] }),
        V('saber', 'modal', 'know how to', es('saber', { pres: P('sé|sabes|sabe|sabemos|sabéis|saben'), pret: P('supe|supiste|supo|supimos|supisteis|supieron'), futStem: 'sabr' })),
        V('encontrar', 'action', 'find', es('encontrar', { boot: 'encuentr' })),
        V('esperar', 'action', 'wait for', es('esperar')),
        w('ustedes', 'who', 'you all', { p: 5 }),
        w('vosotros', 'who', 'you all (Spain)', { p: 4 }),
        w('un helado', 'thing', 'an ice cream'),
        w('un taxi', 'thing', 'a taxi'),
        T('más tarde', 'later'),
        T('el fin de semana', 'at the weekend'),
        w('en la playa', 'place', 'at the beach'),
      ],
      patterns: [{ id: 'wide-field', name: 'Wide Field', pattern: '[who] [modal] [action:inf] [thing] [place] [time]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Yesterday', native: 'Ayer', goal: 'Time words set the tense: swap “hoy” for “ayer” and the verb moves into the past.',
      words: [
        T('ayer', 'yesterday', 'past'),
        T('anoche', 'last night', 'past'),
        T('la semana pasada', 'last week', 'past'),
        T('hace dos días', 'two days ago', 'past'),
        V('cocinar', 'action', 'cook', es('cocinar')),
        V('pagar', 'action', 'pay', es('pagar')),
        V('pedir', 'action', 'order / ask for', es('pedir', { boot: 'pid', pret: P('pedí|pediste|pidió|pedimos|pedisteis|pidieron') })),
        w('la cuenta', 'thing', 'the bill'),
        w('el desayuno', 'thing', 'breakfast'),
        w('el almuerzo', 'thing', 'lunch'),
      ],
      patterns: [{ id: 'yesterday', name: 'Echo of Yesterday', pattern: '[time] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Tomorrow', native: 'Mañana', goal: 'The future tense — “el año que viene” pulls every verb forward.',
      words: [
        T('la semana que viene', 'next week', 'fut'),
        T('el año que viene', 'next year', 'fut'),
        T('dentro de dos días', 'in two days', 'fut'),
        T('algún día', 'one day', 'fut'),
        V('visitar', 'action', 'visit', es('visitar')),
        V('aprender', 'action', 'learn', es('aprender')),
        w('el museo', 'thing', 'the museum'),
        w('el español', 'thing', 'Spanish'),
        w('en el restaurante', 'place', 'at the restaurant'),
        w('en España', 'place', 'in Spain'),
      ],
      patterns: [{ id: 'tomorrow', name: 'Signal from Tomorrow', pattern: '[time] [who] [action] [thing] [place]', end: '.' }],
    },
    // ------------------------------------------------------------ B1
    {
      cefr: 'B1', name: 'Velvet Orbit', native: 'Con cortesía', goal: 'Polite conditionals: querría, podría, debería — and “habría querido” in the past.',
      words: [
        V('querría', 'modal', 'would like', COND('querría|querrías|querría|querríamos|querríais|querrían', 'querido'), { also: ['action'] }),
        V('podría', 'modal', 'could', COND('podría|podrías|podría|podríamos|podríais|podrían', 'podido')),
        V('debería', 'modal', 'should', COND('debería|deberías|debería|deberíamos|deberíais|deberían', 'debido')),
        w('una mesa', 'thing', 'a table'),
        w('un consejo', 'thing', 'some advice'),
        w('una habitación', 'thing', 'a room'),
        a('disponible', 'available', 'disponibles'),
        a('de acuerdo', 'in agreement'),
      ],
      patterns: [{ id: 'politeness', name: 'Velvet Orbit', pattern: '[who] [modal] [action:inf] [thing] [time]', end: '.' }],
    },
    {
      cefr: 'B1', name: 'Old Light', native: 'Los recuerdos', goal: 'The imperfect: how things used to be.',
      words: [
        T('antes', 'before / used to', 'imp'),
        T('en aquellos tiempos', 'in those days', 'imp'),
        T('de joven', 'when young', 'imp'),
        V('usar', 'action', 'use', es('usar')),
        V('olvidar', 'action', 'forget', es('olvidar')),
        V('recordar', 'action', 'remember', es('recordar', { boot: 'recuerd' })),
        w('el nombre', 'thing', 'the name'),
        w('el camino', 'thing', 'the way'),
        a('a gusto', 'at ease'),
      ],
      patterns: [{ id: 'memories', name: 'Old Light', pattern: '[time] [who] [freq] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'B1', name: 'Chain of Worlds', native: 'Las conexiones', goal: 'Longer links: while, then, although, however.',
      words: [
        w('mientras', 'link', 'while'),
        w('luego', 'link', 'then', { comma: true }),
        w('aunque', 'link', 'although'),
        w('sin embargo', 'link', 'however', { comma: true }),
        w('además', 'link', 'moreover', { comma: true }),
        a('de mal humor', 'in a bad mood'),
        w('la lección', 'thing', 'the lesson'),
        w('en la oficina', 'place', 'at the office'),
      ],
      patterns: [{ id: 'chain', name: 'Chain of Worlds', pattern: '[who] [action] [thing] [time] [link] [who] estar [feeling]', end: '.' }],
    },
    // ------------------------------------------------------------ B2
    {
      cefr: 'B2', name: 'Thought Nebula', native: 'Las ideas', goal: 'Talk about ideas, problems and decisions.',
      words: [
        V('entender', 'action', 'understand', es('entender', { boot: 'entiend' })),
        V('explicar', 'action', 'explain', es('explicar')),
        V('resolver', 'action', 'solve', es('resolver', { boot: 'resuelv' })),
        V('discutir', 'action', 'discuss', es('discutir')),
        V('desarrollar', 'action', 'develop', es('desarrollar')),
        w('una idea', 'thing', 'an idea'),
        w('el proyecto', 'thing', 'the project'),
        w('el problema', 'thing', 'the problem'),
        w('la solución', 'thing', 'the solution'),
        w('una decisión', 'thing', 'a decision'),
      ],
      patterns: [{ id: 'ideas', name: 'Thought Nebula', pattern: '[who] [modal] [action:inf] [thing] [link] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'B2', name: 'Fine Structure', native: 'Los matices', goal: 'Nuance: finally, really, rarely, almost never.',
      words: [
        w('finalmente', 'freq', 'finally'),
        w('realmente', 'freq', 'really'),
        w('rara vez', 'freq', 'rarely'),
        w('casi nunca', 'freq', 'almost never'),
        w('el futuro', 'thing', 'the future'),
        w('la verdad', 'thing', 'the truth'),
        w('el mundo', 'thing', 'the world'),
        a('de los nervios', 'on edge'),
        a('en las nubes', 'daydreaming'),
      ],
      patterns: [{ id: 'nuance', name: 'Fine Structure', pattern: '[time] [who] [freq] [action] [thing] [place]', end: '.' }],
    },
    // ------------------------------------------------------------ C1
    {
      cefr: 'C1', name: 'Deep Field', native: 'El campo profundo', goal: 'Challenges, goals and results.',
      words: [
        V('afrontar', 'action', 'face', es('afrontar')),
        V('alcanzar', 'action', 'reach', es('alcanzar')),
        V('obtener', 'action', 'obtain', es('obtener', { pres: P('obtengo|obtienes|obtiene|obtenemos|obtenéis|obtienen'), pret: P('obtuve|obtuviste|obtuvo|obtuvimos|obtuvisteis|obtuvieron'), futStem: 'obtendr' })),
        V('mejorar', 'action', 'improve', es('mejorar')),
        V('compartir', 'action', 'share', es('compartir')),
        w('un reto', 'thing', 'a challenge'),
        w('un objetivo', 'thing', 'a goal'),
        w('la experiencia', 'thing', 'the experience'),
        w('el éxito', 'thing', 'success'),
        w('la situación', 'thing', 'the situation'),
      ],
      patterns: [{ id: 'deep-field', name: 'Deep Field', pattern: '[time] [who] [modal] [action:inf] [thing] [link] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'C1', name: 'Gravity of Reason', native: 'La argumentación', goal: 'Argue: therefore, nevertheless, since, that is.',
      words: [
        w('por lo tanto', 'link', 'therefore', { comma: true }),
        w('no obstante', 'link', 'nevertheless', { comma: true }),
        w('puesto que', 'link', 'since'),
        w('dado que', 'link', 'given that'),
        w('o sea', 'link', 'that is', { comma: true }),
        a('a tiempo', 'on time'),
      ],
      patterns: [{ id: 'reason', name: 'Gravity of Reason', pattern: '[who] estar [feeling] [time] [link] [who] no [action] [thing]', end: '.' }],
    },
    // ------------------------------------------------------------ C2
    {
      cefr: 'C2', name: 'Strange Attractor', native: 'Los modismos', goal: 'Idioms that sound native.',
      words: [
        T('a toro pasado', 'in hindsight', 'past'),
        T('a la larga', 'in the long run', 'fut'),
        a('en el séptimo cielo', 'over the moon'),
        V('aprovechar', 'action', 'make the most of', es('aprovechar')),
        V('descuidar', 'action', 'neglect', es('descuidar')),
        w('la oportunidad', 'thing', 'the opportunity'),
        w('los detalles', 'thing', 'the details'),
      ],
      patterns: [{ id: 'idioms', name: 'Strange Attractor', pattern: '[time] [who] [action] [thing] [link] [who] estar [feeling]', end: '.' }],
    },
    {
      cefr: 'C2', name: 'Far Horizon', native: 'El horizonte lejano', goal: 'Everything moving at once — the far edge of the language.',
      words: [
        V('poner en duda', 'action', 'call into question', es('poner en duda', { pres: P('pongo|pones|pone|ponemos|ponéis|ponen'), pret: P('puse|pusiste|puso|pusimos|pusisteis|pusieron'), futStem: 'pondr' })),
        V('subestimar', 'action', 'underestimate', es('subestimar')),
        w('un compromiso', 'thing', 'a compromise'),
        w('la complejidad', 'thing', 'the complexity'),
        w('las consecuencias', 'thing', 'the consequences'),
        w('las apariencias', 'thing', 'appearances'),
        T('al fin y al cabo', 'in the end'),
        T('mientras tanto', 'in the meantime'),
      ],
      patterns: [{ id: 'far-horizon', name: 'Far Horizon', pattern: '[time] [who] [modal] [action:inf] [thing] [place] [link] [who] [freq] [action] [thing]', end: '.' }],
    },
  ],
  // What makes sense together: each thing has a kind, each verb the kinds it takes.
  // The sentence and story generators only pair compatible words.
  semantics: {
    kinds: {
      'un café': 'drink', 'agua': 'drink', 'una cerveza': 'drink',
      'una pizza': 'food', 'pan': 'food', 'un helado': 'food', 'la cena': 'food', 'el desayuno': 'food', 'el almuerzo': 'food',
      'un libro': 'read', 'una película': 'watch', 'una foto': 'watch', 'música': 'listen', 'la lección': 'lesson',
      'tiempo': 'time', 'dinero': 'money', 'la cuenta': 'ticket', 'el tren': 'transport', 'un taxi': 'transport',
      'una mesa': 'room', 'una habitación': 'room', 'el museo': 'place', 'el español': 'lang',
      'un consejo': 'info', 'el nombre': 'info', 'el camino': 'info',
      'una idea': 'idea', 'el proyecto': 'idea', 'la solución': 'idea', 'una decisión': 'decision',
      'el problema': 'issue', 'un reto': 'issue', 'la situación': 'issue', 'la complejidad': 'issue', 'las consecuencias': 'issue',
      'un objetivo': 'goal', 'la experiencia': 'goal', 'el éxito': 'goal', 'un compromiso': 'goal',
      'el futuro': 'truth', 'la verdad': 'truth', 'el mundo': 'truth', 'los detalles': 'truth', 'las apariencias': 'truth',
      'la oportunidad': 'chance',
    },
    objects: {
      tener: 'food drink read watch time money ticket room idea issue goal',
      querer: 'food drink read watch listen ticket room info time money idea goal truth',
      'querría': 'food drink read watch listen ticket room info time money idea goal truth',
      necesitar: 'food drink read ticket room info time money idea',
      preferir: 'food drink read watch listen ticket room',
      comer: 'food', beber: 'drink', cocinar: 'food',
      tomar: 'food drink transport room decision',
      comprar: 'food drink read watch ticket',
      hacer: 'food watch',
      ver: 'watch place truth',
      buscar: 'food drink read money ticket room info idea time transport',
      leer: 'read lesson', escuchar: 'listen lesson info',
      llevar: 'food drink read ticket',
      encontrar: 'money ticket room info time idea goal transport',
      esperar: 'transport food',
      pagar: 'ticket food drink', pedir: 'food drink ticket info',
      visitar: 'place', aprender: 'lang lesson info', usar: 'money time lang room info',
      olvidar: 'info ticket idea', recordar: 'info ticket idea',
      entender: 'issue idea lesson truth lang', explicar: 'issue idea lesson truth',
      resolver: 'issue', discutir: 'issue idea decision', desarrollar: 'idea',
      afrontar: 'issue truth', alcanzar: 'goal', obtener: 'goal money ticket room',
      mejorar: 'issue idea lang goal', compartir: 'idea food drink goal watch listen',
      aprovechar: 'chance', descuidar: 'truth issue', 'poner en duda': 'truth idea decision', subestimar: 'issue',
    },
    // modals that only make sense with some verbs ("sé cocinar", not "sé ver")
    modalActs: { saber: 'hacer cocinar leer usar resolver explicar desarrollar mejorar aprender' },
  },
  examples: [
    'Yo quiero un café.', 'Tú tienes pan.', 'Yo no tengo tiempo.', 'Nosotros queremos una pizza.', 'Él tiene un libro.',
    'Ella quiere agua.', 'Usted tiene dinero.', 'Ellos no tienen tiempo.', 'Yo estoy bien.', 'Tú estás feliz.',
    'Nosotros estamos mal.', 'Ella está triste.', 'Ellos están alegres.', 'Usted está libre.', 'Yo como una pizza hoy.',
    'Tú bebes un café ahora.', 'Nosotros tomamos el tren mañana.', 'Ellos compran pan todos los días.', 'Él bebe agua esta noche.',
    'Yo puedo hacer la cena esta noche.', 'Tú tienes que tomar el tren mañana.', 'Nosotros vamos a ver una película.', 'Ella busca un libro.',
    'Yo leo un libro en casa.', 'Tú llevas una cerveza aquí.', 'Nosotros comemos una pizza en el centro.', 'Yo tengo que hacer la cena en casa.',
    'Ellos beben un café allí.', 'Él lee un libro en el trabajo.', 'Ella toma una cerveza en el bar.', 'Yo siempre escucho música.',
    'Tú a menudo ves una película en casa.', 'Nosotros a veces hacemos una foto.', 'Ella normalmente toma un café en el bar.',
    'Ellos nunca comen pan.', 'Yo estoy feliz porque tú tienes una pizza.', 'Nosotros estamos mal pero ustedes están de vacaciones.',
    'Yo estoy de buen humor y tú estás bien.', 'Él está triste así que nosotros hacemos la cena.', 'Cuando yo estoy mal tú tomas el tren.',
    'Si tú quieres un café yo puedo hacer un café.', '¿Tú quieres un café o una cerveza?', 'Yo sé hacer la cena.', 'Tú prefieres un helado.',
    'Nosotros encontramos un taxi.', 'Yo espero un taxi más tarde.', 'Vosotros necesitáis dinero el fin de semana.',
    'Nosotros queremos comer un helado en la playa.', 'Ayer yo cociné el almuerzo.', 'Anoche nosotros pedimos la cena.',
    'La semana pasada tú pagaste la cuenta.', 'Hace dos días ellos tomaron el desayuno en el bar.', 'La semana que viene yo visitaré el museo.',
    'El año que viene nosotros aprenderemos el español en España.', 'Dentro de dos días vosotros comeréis en el restaurante.', 'Algún día tú verás el mundo.',
    'Yo querría una mesa.', 'Tú podrías tomar una habitación.', 'Ella debería escuchar un consejo.', 'Nosotros estamos disponibles.',
    'Vosotros estáis de acuerdo.', 'Antes yo siempre usaba el camino.', 'En aquellos tiempos tú recordabas el nombre.',
    'De joven él a menudo olvidaba el nombre.', 'Yo estoy a gusto.', 'Yo como una pizza mientras tú lees la lección.',
    'Nosotros pagamos la cuenta, luego tomamos el tren.', 'Ella está de mal humor aunque está en la oficina.', 'Él está bien, sin embargo está triste.',
    'Yo estoy de buen humor, además estoy feliz.', 'Nosotros tenemos que entender el problema.', 'Tú explicas la solución.', 'Ellos resuelven el problema.',
    'Vosotros discutís el proyecto.', 'Yo desarrollo una idea.', 'Él toma una decisión.', 'Finalmente yo entiendo la verdad.',
    'Tú realmente ves el mundo.', 'Ella rara vez ve el futuro.', 'Nosotros casi nunca hacemos la cena.', 'Yo estoy de los nervios.',
    'Tú estás en las nubes.', 'Nosotros afrontamos un reto.', 'Tú alcanzas un objetivo.', 'Ella obtiene la experiencia.',
    'Ellos mejoran la situación.', 'Yo comparto el éxito.', 'Yo estoy a tiempo, no obstante tú no pagaste la cuenta.',
    'Tú estás triste, por lo tanto nosotros hacemos la cena.', 'Puesto que yo estoy aquí tú puedes comer.', 'Dado que nosotros estamos aquí tú puedes comer.',
    'Yo estoy bien, o sea estoy feliz.', 'A toro pasado yo aproveché la oportunidad.', 'A la larga tú descuidarás los detalles.',
    'Yo estoy en el séptimo cielo.', 'Al fin y al cabo nosotros ponemos en duda las apariencias.', 'Mientras tanto vosotros subestimáis las consecuencias.',
    'Ellos encuentran un compromiso.', 'Ella entiende la complejidad.',
  ],
};
