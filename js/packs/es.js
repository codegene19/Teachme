// Español — the most-used words, in levels of growing complexity.
//
// Every slot is chosen so that any swap stays grammatical:
//  - verbs carry their present-tense forms (yo, tú, él/ella/usted,
//    nosotros, vosotros, ellos/ustedes) and agree with the nearest subject;
//  - feelings use "estar" with gender-neutral adjectives (singular/plural);
//  - things are noun chunks (with an article where Spanish needs one).

const w = (t, c, en, x = {}) => ({ t, c, en, ...x });
const v = (t, c, en, forms, x = {}) => ({ t, c, en, f: forms.split('|'), ...x });
const a = (t, en, plural = t) => ({ t, c: 'feeling', en, n: [t, plural] });

export default {
  id: 'es',
  name: 'Español',
  english: 'Spanish',
  voice: 'es-ES',
  invert: true,
  persons: ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ustedes'],
  hello: '¡Hola! Yo quiero un café.',
  levels: [
    {
      name: 'First Light', native: 'Primera luz', goal: 'Say what you want and what you have.',
      words: [
        w('yo', 'who', 'I', { p: 0 }),
        v('querer', 'modal', 'want', 'quiero|quieres|quiere|queremos|queréis|quieren', { also: ['action'] }),
        w('un café', 'thing', 'a coffee'),
        w('tú', 'who', 'you', { p: 1 }),
        v('tener', 'action', 'have', 'tengo|tienes|tiene|tenemos|tenéis|tienen'),
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
      name: 'Voices', native: 'Las voces', goal: 'Change the subject — watch the verb change with it.',
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
      patterns: [
        { id: 'curiosity', name: 'Curiosity', pattern: '[who] [action] [thing]', end: '?' },
      ],
    },
    {
      name: 'Moods', native: 'Los ánimos', goal: 'Say how people feel with “estar”.',
      words: [
        v('estar', 'core', 'be (feel)', 'estoy|estás|está|estamos|estáis|están'),
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
      name: 'Daily Orbit', native: 'Cada día', goal: 'Everyday actions, and when they happen.',
      words: [
        v('comer', 'action', 'eat', 'como|comes|come|comemos|coméis|comen'),
        v('beber', 'action', 'drink', 'bebo|bebes|bebe|bebemos|bebéis|beben'),
        v('tomar', 'action', 'take / have', 'tomo|tomas|toma|tomamos|tomáis|toman'),
        v('comprar', 'action', 'buy', 'compro|compras|compra|compramos|compráis|compran'),
        w('ahora', 'time', 'now'),
        w('hoy', 'time', 'today'),
        w('mañana', 'time', 'tomorrow'),
        w('esta noche', 'time', 'tonight'),
        w('todos los días', 'time', 'every day'),
      ],
      patterns: [
        { id: 'clockwork', name: 'Clockwork', pattern: '[who] [action] [thing] [time]', end: '.' },
      ],
    },
    {
      name: 'Possibility', native: 'Las posibilidades', goal: 'Can, have to, going to + a verb in the infinitive.',
      words: [
        v('poder', 'modal', 'can', 'puedo|puedes|puede|podemos|podéis|pueden'),
        v('tener que', 'modal', 'have to', 'tengo que|tienes que|tiene que|tenemos que|tenéis que|tienen que'),
        v('ir a', 'modal', 'be going to', 'voy a|vas a|va a|vamos a|vais a|van a'),
        v('hacer', 'action', 'make / do', 'hago|haces|hace|hacemos|hacéis|hacen'),
        v('ver', 'action', 'see / watch', 'veo|ves|ve|vemos|veis|ven'),
        v('buscar', 'action', 'look for', 'busco|buscas|busca|buscamos|buscáis|buscan'),
        w('una película', 'thing', 'a film'),
        w('el tren', 'thing', 'the train'),
        w('la cena', 'thing', 'dinner'),
      ],
      patterns: [
        { id: 'possibility', name: 'Possibility', pattern: '[who] [modal] [action:inf] [thing] [time]', end: '.' },
      ],
    },
    {
      name: 'Coordinates', native: 'Los lugares', goal: 'Say where things happen.',
      words: [
        w('en casa', 'place', 'at home'),
        w('en el trabajo', 'place', 'at work'),
        w('aquí', 'place', 'here'),
        w('allí', 'place', 'there'),
        w('en el centro', 'place', 'downtown'),
        w('en el bar', 'place', 'at the bar'),
        v('leer', 'action', 'read', 'leo|lees|lee|leemos|leéis|leen'),
        v('llevar', 'action', 'bring / carry', 'llevo|llevas|lleva|llevamos|lleváis|llevan'),
        w('una cerveza', 'thing', 'a beer'),
      ],
      patterns: [
        { id: 'coordinates', name: 'Coordinates', pattern: '[who] [modal] [action:inf] [thing] [place]', end: '.' },
      ],
    },
    {
      name: 'Habits', native: 'Las costumbres', goal: 'How often: always, sometimes, never.',
      words: [
        w('siempre', 'freq', 'always'),
        w('a veces', 'freq', 'sometimes'),
        w('a menudo', 'freq', 'often'),
        w('normalmente', 'freq', 'usually'),
        w('nunca', 'freq', 'never'),
        v('escuchar', 'action', 'listen to', 'escucho|escuchas|escucha|escuchamos|escucháis|escuchan'),
        w('música', 'thing', 'music'),
        w('una foto', 'thing', 'a photo'),
      ],
      patterns: [
        { id: 'habits', name: 'Orbit of Habits', pattern: '[who] [freq] [action] [thing] [place]', end: '.' },
      ],
    },
    {
      name: 'Bridges', native: 'Los puentes', goal: 'Join two ideas: and, but, because, so.',
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
      patterns: [
        { id: 'binary', name: 'Binary Star', pattern: '[who] estar [feeling] [link] [who] [action] [thing]', end: '.' },
      ],
    },
    {
      name: 'Wide Field', native: 'El cielo abierto', goal: 'Long sentences with every piece moving.',
      words: [
        v('necesitar', 'modal', 'need', 'necesito|necesitas|necesita|necesitamos|necesitáis|necesitan', { also: ['action'] }),
        v('preferir', 'modal', 'prefer', 'prefiero|prefieres|prefiere|preferimos|preferís|prefieren', { also: ['action'] }),
        v('saber', 'modal', 'know how to', 'sé|sabes|sabe|sabemos|sabéis|saben'),
        v('encontrar', 'action', 'find', 'encuentro|encuentras|encuentra|encontramos|encontráis|encuentran'),
        v('esperar', 'action', 'wait for', 'espero|esperas|espera|esperamos|esperáis|esperan'),
        w('ustedes', 'who', 'you all', { p: 5 }),
        w('vosotros', 'who', 'you all (Spain)', { p: 4 }),
        w('un helado', 'thing', 'an ice cream'),
        w('un taxi', 'thing', 'a taxi'),
        w('más tarde', 'time', 'later'),
        w('el fin de semana', 'time', 'at the weekend'),
        w('en la playa', 'place', 'at the beach'),
      ],
      patterns: [
        { id: 'wide-field', name: 'Wide Field', pattern: '[who] [modal] [action:inf] [thing] [place] [time]', end: '.' },
      ],
    },
  ],
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
    'Nosotros queremos comer un helado en la playa.',
  ],
};
