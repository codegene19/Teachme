// Italiano — the most-used words, in levels of growing complexity.
//
// Every slot is chosen so that any swap stays grammatical:
//  - verbs carry their present-tense forms (io, tu, lui/lei, noi, voi, loro)
//    and agree with the nearest subject before them;
//  - feelings are gender-neutral adjectives with singular/plural forms;
//  - things are noun chunks with their article already attached.

const w = (t, c, en, x = {}) => ({ t, c, en, ...x });
const v = (t, c, en, forms, x = {}) => ({ t, c, en, f: forms.split('|'), ...x });
const a = (t, en, plural = t) => ({ t, c: 'feeling', en, n: [t, plural] });

export default {
  id: 'it',
  name: 'Italiano',
  english: 'Italian',
  voice: 'it-IT',
  invert: false,
  persons: ['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro'],
  hello: 'Ciao! Io voglio un caffè.',
  levels: [
    {
      name: 'First Light', native: 'Prima luce', goal: 'Say what you want and what you have.',
      words: [
        w('io', 'who', 'I', { p: 0 }),
        v('volere', 'modal', 'want', 'voglio|vuoi|vuole|vogliamo|volete|vogliono', { also: ['action'] }),
        w('un caffè', 'thing', 'a coffee'),
        w('tu', 'who', 'you', { p: 1 }),
        v('avere', 'action', 'have', 'ho|hai|ha|abbiamo|avete|hanno'),
        w('una pizza', 'thing', 'a pizza'),
        w("l'acqua", 'thing', 'the water'),
        w('il pane', 'thing', 'the bread'),
        w('non', 'core', 'not'),
      ],
      patterns: [
        { id: 'first-light', name: 'First Light', pattern: '[who] [action] [thing]', end: '.' },
        { id: 'refusal', name: 'The Refusal', pattern: '[who] non [action] [thing]', end: '.' },
      ],
    },
    {
      name: 'Voices', native: 'Le voci', goal: 'Change the subject — watch the verb change with it.',
      words: [
        w('lui', 'who', 'he', { p: 2 }),
        w('lei', 'who', 'she', { p: 2 }),
        w('noi', 'who', 'we', { p: 3 }),
        w('voi', 'who', 'you all', { p: 4 }),
        w('loro', 'who', 'they', { p: 5 }),
        w('un libro', 'thing', 'a book'),
        w('tempo', 'thing', 'time'),
        w('i soldi', 'thing', 'the money'),
      ],
      patterns: [
        { id: 'curiosity', name: 'Curiosity', pattern: '[who] [action] [thing]', end: '?' },
      ],
    },
    {
      name: 'Moods', native: 'Gli stati d’animo', goal: 'Say how people feel with “essere”.',
      words: [
        v('essere', 'core', 'be', 'sono|sei|è|siamo|siete|sono'),
        a('felice', 'happy', 'felici'),
        a('triste', 'sad', 'tristi'),
        a('gentile', 'kind', 'gentili'),
        a('forte', 'strong', 'forti'),
        a('in ritardo', 'late'),
        a('in vacanza', 'on holiday'),
      ],
      patterns: [
        { id: 'inner-weather', name: 'Inner Weather', pattern: '[who] essere [feeling]', end: '.' },
        { id: 'clouded', name: 'Clouded', pattern: '[who] non essere [feeling]', end: '.' },
      ],
    },
    {
      name: 'Daily Orbit', native: 'Ogni giorno', goal: 'Everyday actions, and when they happen.',
      words: [
        v('mangiare', 'action', 'eat', 'mangio|mangi|mangia|mangiamo|mangiate|mangiano'),
        v('bere', 'action', 'drink', 'bevo|bevi|beve|beviamo|bevete|bevono'),
        v('prendere', 'action', 'take / have', 'prendo|prendi|prende|prendiamo|prendete|prendono'),
        v('comprare', 'action', 'buy', 'compro|compri|compra|compriamo|comprate|comprano'),
        w('adesso', 'time', 'now'),
        w('oggi', 'time', 'today'),
        w('domani', 'time', 'tomorrow'),
        w('stasera', 'time', 'tonight'),
        w('ogni giorno', 'time', 'every day'),
      ],
      patterns: [
        { id: 'clockwork', name: 'Clockwork', pattern: '[who] [action] [thing] [time]', end: '.' },
      ],
    },
    {
      name: 'Possibility', native: 'Le possibilità', goal: 'Can, must, want + a verb in the infinitive.',
      words: [
        v('potere', 'modal', 'can', 'posso|puoi|può|possiamo|potete|possono'),
        v('dovere', 'modal', 'must', 'devo|devi|deve|dobbiamo|dovete|devono'),
        v('fare', 'action', 'make / do', 'faccio|fai|fa|facciamo|fate|fanno'),
        v('vedere', 'action', 'see', 'vedo|vedi|vede|vediamo|vedete|vedono'),
        v('cercare', 'action', 'look for', 'cerco|cerchi|cerca|cerchiamo|cercate|cercano'),
        w('un film', 'thing', 'a film'),
        w('il treno', 'thing', 'the train'),
        w('la cena', 'thing', 'dinner'),
      ],
      patterns: [
        { id: 'possibility', name: 'Possibility', pattern: '[who] [modal] [action:inf] [thing] [time]', end: '.' },
      ],
    },
    {
      name: 'Coordinates', native: 'I luoghi', goal: 'Say where things happen.',
      words: [
        w('a casa', 'place', 'at home'),
        w('al lavoro', 'place', 'at work'),
        w('qui', 'place', 'here'),
        w('lì', 'place', 'there'),
        w('in centro', 'place', 'downtown'),
        w('al bar', 'place', 'at the café'),
        v('leggere', 'action', 'read', 'leggo|leggi|legge|leggiamo|leggete|leggono'),
        v('portare', 'action', 'bring', 'porto|porti|porta|portiamo|portate|portano'),
        w('una birra', 'thing', 'a beer'),
      ],
      patterns: [
        { id: 'coordinates', name: 'Coordinates', pattern: '[who] [modal] [action:inf] [thing] [place]', end: '.' },
      ],
    },
    {
      name: 'Habits', native: 'Le abitudini', goal: 'How often: always, often, sometimes.',
      words: [
        w('sempre', 'freq', 'always'),
        w('spesso', 'freq', 'often'),
        w('a volte', 'freq', 'sometimes'),
        w('di solito', 'freq', 'usually'),
        v('guardare', 'action', 'watch', 'guardo|guardi|guarda|guardiamo|guardate|guardano'),
        v('ascoltare', 'action', 'listen to', 'ascolto|ascolti|ascolta|ascoltiamo|ascoltate|ascoltano'),
        w('la musica', 'thing', 'music'),
        w('una foto', 'thing', 'a photo'),
      ],
      patterns: [
        { id: 'habits', name: 'Orbit of Habits', pattern: '[who] [action] [freq] [thing] [place]', end: '.' },
      ],
    },
    {
      name: 'Bridges', native: 'I ponti', goal: 'Join two ideas: and, but, because, so.',
      words: [
        w('e', 'link', 'and'),
        w('ma', 'link', 'but', { comma: true }),
        w('perché', 'link', 'because'),
        w('quindi', 'link', 'so', { comma: true }),
        w('quando', 'link', 'when'),
        w('se', 'link', 'if'),
        w('o', 'link', 'or'),
        a('di buon umore', 'in a good mood'),
        a('in forma', 'fit'),
      ],
      patterns: [
        { id: 'binary', name: 'Binary Star', pattern: '[who] essere [feeling] [link] [who] [action] [thing]', end: '.' },
      ],
    },
    {
      name: 'Wide Field', native: 'Il cielo aperto', goal: 'Long sentences with every piece moving.',
      words: [
        v('sapere', 'modal', 'know how to', 'so|sai|sa|sappiamo|sapete|sanno'),
        v('preferire', 'modal', 'prefer', 'preferisco|preferisci|preferisce|preferiamo|preferite|preferiscono', { also: ['action'] }),
        v('trovare', 'action', 'find', 'trovo|trovi|trova|troviamo|trovate|trovano'),
        v('aspettare', 'action', 'wait for', 'aspetto|aspetti|aspetta|aspettiamo|aspettate|aspettano'),
        w('un amico', 'thing', 'a friend'),
        w('un biglietto', 'thing', 'a ticket'),
        w('il gelato', 'thing', 'ice cream'),
        w('più tardi', 'time', 'later'),
        w('il fine settimana', 'time', 'at the weekend'),
        w('al mare', 'place', 'at the seaside'),
      ],
      patterns: [
        { id: 'wide-field', name: 'Wide Field', pattern: '[who] [modal] [action:inf] [thing] [place] [time]', end: '.' },
      ],
    },
  ],
  // Real sentences that link stars: neighbours here become linked stars.
  examples: [
    'Io voglio un caffè.', 'Tu hai il pane.', 'Io non ho tempo.', 'Noi vogliamo una pizza.', 'Lui ha un libro.',
    "Lei vuole l'acqua.", 'Voi avete i soldi?', 'Loro non hanno tempo.', 'Io sono felice.', 'Noi siamo in ritardo.',
    'Tu sei gentile.', 'Loro sono in vacanza.', 'Lei è forte.', 'Voi siete tristi.', 'Io mangio una pizza oggi.',
    'Tu bevi un caffè adesso.', 'Noi prendiamo il treno domani.', 'Loro comprano il pane ogni giorno.', "Lui beve l'acqua stasera.",
    'Io posso fare la cena stasera.', 'Tu devi prendere il treno domani.', 'Noi vogliamo vedere un film.', 'Lei cerca un libro.',
    'Io leggo un libro a casa.', 'Tu porti una birra al bar.', 'Noi mangiamo una pizza in centro.', 'Io devo fare la cena a casa.',
    'Loro bevono un caffè qui.', 'Voi leggete un libro lì.', 'Lui porta il pane al lavoro.', 'Io ascolto sempre la musica.',
    'Tu guardi spesso un film a casa.', 'Noi facciamo a volte una foto.', 'Lei prende di solito un caffè al bar.',
    'Io sono felice perché tu hai una pizza.', 'Noi siamo in ritardo ma voi siete in vacanza.', 'Io sono di buon umore e tu sei in forma.',
    'Lui è triste quindi noi facciamo la cena.', 'Quando io sono in ritardo tu prendi il treno.', 'Se tu vuoi un caffè io posso fare un caffè.',
    'Tu vuoi un caffè o una birra?', 'Io so fare la cena.', 'Tu preferisci il gelato.', 'Noi troviamo un biglietto.',
    'Io aspetto un amico più tardi.', 'Voi comprate un biglietto il fine settimana.', 'Noi vogliamo mangiare il gelato al mare.',
  ],
};
