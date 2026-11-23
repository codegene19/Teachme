// Italiano — the most-used words, from galaxy A1 out to C2.
//
// Every slot is chosen so that any swap stays grammatical:
//  - verbs carry presente, passato prossimo, imperfetto and futuro, and
//    agree with the nearest subject before them; the tense comes from the
//    time word in the same clause ("ieri" → past, "a quei tempi" → imperfect);
//  - feelings are gender-neutral adjectives with singular/plural forms;
//  - things are noun chunks with their article already attached.

import { it, P } from './conjugate.js';

const w = (t, c, en, x = {}) => ({ t, c, en, ...x });
const V = (t, c, en, conj, x = {}) => ({ t, c, en, ...conj, ...x });
const a = (t, en, plural = t) => ({ t, c: 'feeling', en, n: [t, plural] });
const T = (t, en, tense) => ({ t, c: 'time', en, ...(tense ? { tense } : {}) });

// Polite conditionals: "vorrei" now, "avrei voluto" when the clause is in the past.
const COND = (forms, pp) => {
  const f = P(forms);
  const past = P('avrei|avresti|avrebbe|avremmo|avreste|avrebbero').map((x) => `${x} ${pp}`);
  return { f, ft: { past, imp: past, fut: f } };
};

const ESSERE = { f: P('sono|sei|è|siamo|siete|sono'), ft: { past: P('ero|eri|era|eravamo|eravate|erano'), imp: P('ero|eri|era|eravamo|eravate|erano'), fut: P('sarò|sarai|sarà|saremo|sarete|saranno') } };

export default {
  id: 'it',
  name: 'Italiano',
  english: 'Italian',
  voice: 'it-IT',
  invert: false,
  persons: ['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro'],
  tenseNames: { pres: 'presente', past: 'passato prossimo', imp: 'imperfetto', fut: 'futuro' },
  hello: 'Ciao! Io voglio un caffè.',
  levels: [
    // ------------------------------------------------------------ A1
    {
      cefr: 'A1', name: 'First Light', native: 'Prima luce', goal: 'Say what you want and what you have.',
      words: [
        w('io', 'who', 'I', { p: 0 }),
        V('volere', 'modal', 'want', it('volere', { pres: P('voglio|vuoi|vuole|vogliamo|volete|vogliono'), futStem: 'vorr' }), { also: ['action'] }),
        w('un caffè', 'thing', 'a coffee'),
        w('tu', 'who', 'you', { p: 1 }),
        V('avere', 'action', 'have', it('avere', { pres: P('ho|hai|ha|abbiamo|avete|hanno'), futStem: 'avr' })),
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
      cefr: 'A1', name: 'Voices', native: 'Le voci', goal: 'Change the subject — watch the verb change with it.',
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
      patterns: [{ id: 'curiosity', name: 'Curiosity', pattern: '[who] [action] [thing]', end: '?' }],
    },
    {
      cefr: 'A1', name: 'Moods', native: 'Gli stati d’animo', goal: 'Say how people feel with “essere”.',
      words: [
        V('essere', 'core', 'be', ESSERE),
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
      cefr: 'A1', name: 'Daily Orbit', native: 'Ogni giorno', goal: 'Everyday actions, and when they happen.',
      words: [
        V('mangiare', 'action', 'eat', it('mangiare')),
        V('bere', 'action', 'drink', it('bere', { pres: P('bevo|bevi|beve|beviamo|bevete|bevono'), imp: P('bevevo|bevevi|beveva|bevevamo|bevevate|bevevano'), futStem: 'berr', pp: 'bevuto' })),
        V('prendere', 'action', 'take / have', it('prendere', { pp: 'preso' })),
        V('comprare', 'action', 'buy', it('comprare')),
        T('adesso', 'now'),
        T('oggi', 'today'),
        T('domani', 'tomorrow'),
        T('stasera', 'tonight'),
        T('ogni giorno', 'every day'),
      ],
      patterns: [{ id: 'clockwork', name: 'Clockwork', pattern: '[who] [action] [thing] [time]', end: '.' }],
    },
    {
      cefr: 'A1', name: 'Possibility', native: 'Le possibilità', goal: 'Can, must, want + a verb in the infinitive.',
      words: [
        V('potere', 'modal', 'can', it('potere', { pres: P('posso|puoi|può|possiamo|potete|possono'), futStem: 'potr' })),
        V('dovere', 'modal', 'must', it('dovere', { pres: P('devo|devi|deve|dobbiamo|dovete|devono'), futStem: 'dovr' })),
        V('fare', 'action', 'make / do', it('fare', { pres: P('faccio|fai|fa|facciamo|fate|fanno'), imp: P('facevo|facevi|faceva|facevamo|facevate|facevano'), futStem: 'far', pp: 'fatto' })),
        V('vedere', 'action', 'see', it('vedere', { futStem: 'vedr', pp: 'visto' })),
        V('cercare', 'action', 'look for', it('cercare')),
        w('un film', 'thing', 'a film'),
        w('il treno', 'thing', 'the train'),
        w('la cena', 'thing', 'dinner'),
      ],
      patterns: [{ id: 'possibility', name: 'Possibility', pattern: '[who] [modal] [action:inf] [thing] [time]', end: '.' }],
    },
    // ------------------------------------------------------------ A2
    {
      cefr: 'A2', name: 'Coordinates', native: 'I luoghi', goal: 'Say where things happen.',
      words: [
        w('a casa', 'place', 'at home'),
        w('al lavoro', 'place', 'at work'),
        w('qui', 'place', 'here'),
        w('lì', 'place', 'there'),
        w('in centro', 'place', 'downtown'),
        w('al bar', 'place', 'at the café'),
        V('leggere', 'action', 'read', it('leggere', { pp: 'letto' })),
        V('portare', 'action', 'bring', it('portare')),
        w('una birra', 'thing', 'a beer'),
      ],
      patterns: [{ id: 'coordinates', name: 'Coordinates', pattern: '[who] [modal] [action:inf] [thing] [place]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Habits', native: 'Le abitudini', goal: 'How often: always, often, sometimes.',
      words: [
        w('sempre', 'freq', 'always'),
        w('spesso', 'freq', 'often'),
        w('a volte', 'freq', 'sometimes'),
        w('di solito', 'freq', 'usually'),
        V('guardare', 'action', 'watch', it('guardare')),
        V('ascoltare', 'action', 'listen to', it('ascoltare')),
        w('la musica', 'thing', 'music'),
        w('una foto', 'thing', 'a photo'),
      ],
      patterns: [{ id: 'habits', name: 'Orbit of Habits', pattern: '[who] [action] [freq] [thing] [place]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Bridges', native: 'I ponti', goal: 'Join two ideas: and, but, because, so.',
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
      patterns: [{ id: 'binary', name: 'Binary Star', pattern: '[who] essere [feeling] [link] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Wide Field', native: 'Il cielo aperto', goal: 'Long sentences with every piece moving.',
      words: [
        V('sapere', 'modal', 'know how to', it('sapere', { pres: P('so|sai|sa|sappiamo|sapete|sanno'), futStem: 'sapr' })),
        V('preferire', 'modal', 'prefer', it('preferire', { isc: true }), { also: ['action'] }),
        V('trovare', 'action', 'find', it('trovare')),
        V('aspettare', 'action', 'wait for', it('aspettare')),
        w('un amico', 'thing', 'a friend'),
        w('un biglietto', 'thing', 'a ticket'),
        w('il gelato', 'thing', 'ice cream'),
        T('più tardi', 'later'),
        T('il fine settimana', 'at the weekend'),
        w('al mare', 'place', 'at the seaside'),
      ],
      patterns: [{ id: 'wide-field', name: 'Wide Field', pattern: '[who] [modal] [action:inf] [thing] [place] [time]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Yesterday', native: 'Ieri', goal: 'Time words set the tense: swap “oggi” for “ieri” and the verb moves into the past.',
      words: [
        T('ieri', 'yesterday', 'past'),
        T('ieri sera', 'last night', 'past'),
        T('la settimana scorsa', 'last week', 'past'),
        T('due giorni fa', 'two days ago', 'past'),
        V('cucinare', 'action', 'cook', it('cucinare')),
        V('pagare', 'action', 'pay', it('pagare')),
        V('ordinare', 'action', 'order', it('ordinare')),
        w('il conto', 'thing', 'the bill'),
        w('la colazione', 'thing', 'breakfast'),
        w('il pranzo', 'thing', 'lunch'),
      ],
      patterns: [{ id: 'yesterday', name: 'Echo of Yesterday', pattern: '[time] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'A2', name: 'Tomorrow', native: 'Domani', goal: 'The future tense — “la settimana prossima” pulls every verb forward.',
      words: [
        T('la settimana prossima', 'next week', 'fut'),
        T("l'anno prossimo", 'next year', 'fut'),
        T('fra due giorni', 'in two days', 'fut'),
        T('un giorno', 'one day', 'fut'),
        V('visitare', 'action', 'visit', it('visitare')),
        V('imparare', 'action', 'learn', it('imparare')),
        w('il museo', 'thing', 'the museum'),
        w("l'italiano", 'thing', 'Italian'),
        w('al ristorante', 'place', 'at the restaurant'),
        w('in Italia', 'place', 'in Italy'),
      ],
      patterns: [{ id: 'tomorrow', name: 'Signal from Tomorrow', pattern: '[time] [who] [action] [thing] [place]', end: '.' }],
    },
    // ------------------------------------------------------------ B1
    {
      cefr: 'B1', name: 'Velvet Orbit', native: 'Con gentilezza', goal: 'Polite conditionals: vorrei, potrei, dovrei — and “avrei voluto” in the past.',
      words: [
        V('vorrei', 'modal', 'would like', COND('vorrei|vorresti|vorrebbe|vorremmo|vorreste|vorrebbero', 'voluto'), { also: ['action'] }),
        V('potrei', 'modal', 'could', COND('potrei|potresti|potrebbe|potremmo|potreste|potrebbero', 'potuto')),
        V('dovrei', 'modal', 'should', COND('dovrei|dovresti|dovrebbe|dovremmo|dovreste|dovrebbero', 'dovuto')),
        w('un tavolo', 'thing', 'a table'),
        w('un consiglio', 'thing', 'some advice'),
        w('una camera', 'thing', 'a room'),
        a('disponibile', 'available', 'disponibili'),
        a("d'accordo", 'in agreement'),
      ],
      patterns: [{ id: 'politeness', name: 'Velvet Orbit', pattern: '[who] [modal] [action:inf] [thing] [time]', end: '.' }],
    },
    {
      cefr: 'B1', name: 'Old Light', native: 'I ricordi', goal: 'The imperfect: how things used to be.',
      words: [
        T('prima', 'before / used to', 'imp'),
        T('a quei tempi', 'in those days', 'imp'),
        T('da giovane', 'when young', 'imp'),
        V('usare', 'action', 'use', it('usare')),
        V('dimenticare', 'action', 'forget', it('dimenticare')),
        V('ricordare', 'action', 'remember', it('ricordare')),
        w('il nome', 'thing', 'the name'),
        w('la strada', 'thing', 'the way'),
        a('paziente', 'patient', 'pazienti'),
      ],
      patterns: [{ id: 'memories', name: 'Old Light', pattern: '[time] [who] [action] [freq] [thing]', end: '.' }],
    },
    {
      cefr: 'B1', name: 'Chain of Worlds', native: 'Le connessioni', goal: 'Longer links: while, then, even though, however.',
      words: [
        w('mentre', 'link', 'while'),
        w('poi', 'link', 'then', { comma: true }),
        w('anche se', 'link', 'even though'),
        w('però', 'link', 'however', { comma: true }),
        w('inoltre', 'link', 'moreover', { comma: true }),
        a('di cattivo umore', 'in a bad mood'),
        w('la lezione', 'thing', 'the lesson'),
        w('in ufficio', 'place', 'at the office'),
      ],
      patterns: [{ id: 'chain', name: 'Chain of Worlds', pattern: '[who] [action] [thing] [time] [link] [who] essere [feeling]', end: '.' }],
    },
    // ------------------------------------------------------------ B2
    {
      cefr: 'B2', name: 'Thought Nebula', native: 'Le idee', goal: 'Talk about ideas, problems and decisions.',
      words: [
        V('capire', 'action', 'understand', it('capire', { isc: true })),
        V('spiegare', 'action', 'explain', it('spiegare')),
        V('risolvere', 'action', 'solve', it('risolvere', { pp: 'risolto' })),
        V('discutere', 'action', 'discuss', it('discutere', { pp: 'discusso' })),
        V('sviluppare', 'action', 'develop', it('sviluppare')),
        w("un'idea", 'thing', 'an idea'),
        w('il progetto', 'thing', 'the project'),
        w('il problema', 'thing', 'the problem'),
        w('la soluzione', 'thing', 'the solution'),
        w('una decisione', 'thing', 'a decision'),
      ],
      patterns: [{ id: 'ideas', name: 'Thought Nebula', pattern: '[who] [modal] [action:inf] [thing] [link] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'B2', name: 'Fine Structure', native: 'Le sfumature', goal: 'Nuance: finally, really, rarely, again.',
      words: [
        w('finalmente', 'freq', 'finally'),
        w('davvero', 'freq', 'really'),
        w('raramente', 'freq', 'rarely'),
        w('di nuovo', 'freq', 'again'),
        w('il futuro', 'thing', 'the future'),
        w('la verità', 'thing', 'the truth'),
        w('il mondo', 'thing', 'the world'),
        a('in pensiero', 'worried'),
        a('responsabile', 'responsible', 'responsabili'),
      ],
      patterns: [{ id: 'nuance', name: 'Fine Structure', pattern: '[time] [who] [action] [freq] [thing] [place]', end: '.' }],
    },
    // ------------------------------------------------------------ C1
    {
      cefr: 'C1', name: 'Deep Field', native: 'Il campo profondo', goal: 'Challenges, goals and results.',
      words: [
        V('affrontare', 'action', 'face', it('affrontare')),
        V('raggiungere', 'action', 'reach', it('raggiungere', { pp: 'raggiunto' })),
        V('ottenere', 'action', 'obtain', it('ottenere', { pres: P('ottengo|ottieni|ottiene|otteniamo|ottenete|ottengono'), futStem: 'otterr' })),
        V('migliorare', 'action', 'improve', it('migliorare')),
        V('condividere', 'action', 'share', it('condividere', { pp: 'condiviso' })),
        w('una sfida', 'thing', 'a challenge'),
        w('un obiettivo', 'thing', 'a goal'),
        w("l'esperienza", 'thing', 'the experience'),
        w('il successo', 'thing', 'success'),
        w('la situazione', 'thing', 'the situation'),
        a('a pezzi', 'worn out'),
      ],
      patterns: [{ id: 'deep-field', name: 'Deep Field', pattern: '[time] [who] [modal] [action:inf] [thing] [link] [who] [action] [thing]', end: '.' }],
    },
    {
      cefr: 'C1', name: 'Gravity of Reason', native: 'L’argomentazione', goal: 'Argue: however, therefore, and yet, since.',
      words: [
        w('tuttavia', 'link', 'however', { comma: true }),
        w('dunque', 'link', 'therefore', { comma: true }),
        w('eppure', 'link', 'and yet', { comma: true }),
        w('poiché', 'link', 'since'),
        w('dal momento che', 'link', 'given that'),
        w('anzi', 'link', 'on the contrary', { comma: true }),
        a('puntuale', 'punctual', 'puntuali'),
      ],
      patterns: [{ id: 'reason', name: 'Gravity of Reason', pattern: '[who] essere [feeling] [time] [link] [who] non [action] [thing]', end: '.' }],
    },
    // ------------------------------------------------------------ C2
    {
      cefr: 'C2', name: 'Strange Attractor', native: 'I modi di dire', goal: 'Idioms that sound native.',
      words: [
        T('col senno di poi', 'in hindsight', 'past'),
        T('a lungo andare', 'in the long run', 'fut'),
        a('al settimo cielo', 'over the moon'),
        V('cogliere', 'action', 'seize', it('cogliere', { pres: P('colgo|cogli|coglie|cogliamo|cogliete|colgono'), pp: 'colto' })),
        V('trascurare', 'action', 'neglect', it('trascurare')),
        w("l'occasione", 'thing', 'the opportunity'),
        w('i dettagli', 'thing', 'the details'),
      ],
      patterns: [{ id: 'idioms', name: 'Strange Attractor', pattern: '[time] [who] [action] [thing] [link] [who] essere [feeling]', end: '.' }],
    },
    {
      cefr: 'C2', name: 'Far Horizon', native: 'L’orizzonte lontano', goal: 'Everything moving at once — the far edge of the language.',
      words: [
        V('mettere in discussione', 'action', 'call into question', it('mettere in discussione', { pp: 'messo' })),
        V('sottovalutare', 'action', 'underestimate', it('sottovalutare')),
        w('un compromesso', 'thing', 'a compromise'),
        w('la complessità', 'thing', 'the complexity'),
        w('le conseguenze', 'thing', 'the consequences'),
        w('le apparenze', 'thing', 'appearances'),
        T('in fin dei conti', 'in the end'),
        T('nel frattempo', 'in the meantime'),
      ],
      patterns: [{ id: 'far-horizon', name: 'Far Horizon', pattern: '[time] [who] [modal] [action:inf] [thing] [place] [link] [who] [action] [freq] [thing]', end: '.' }],
    },
  ],
  // What makes sense together: each thing has a kind, each verb the kinds it takes.
  // The sentence and story generators only pair compatible words.
  semantics: {
    kinds: {
      'un caffè': 'drink', "l'acqua": 'drink', 'una birra': 'drink',
      'una pizza': 'food', 'il pane': 'food', 'il gelato': 'food', 'la cena': 'food', 'la colazione': 'food', 'il pranzo': 'food',
      'un libro': 'read', 'un film': 'watch', 'una foto': 'watch', 'la musica': 'listen', 'la lezione': 'lesson',
      'un amico': 'person', 'tempo': 'time', 'i soldi': 'money', 'un biglietto': 'ticket', 'il conto': 'ticket',
      'il treno': 'transport', 'un tavolo': 'room', 'una camera': 'room', 'il museo': 'place', "l'italiano": 'lang',
      'un consiglio': 'info', 'il nome': 'info', 'la strada': 'info',
      "un'idea": 'idea', 'il progetto': 'idea', 'la soluzione': 'idea', 'una decisione': 'decision',
      'il problema': 'issue', 'una sfida': 'issue', 'la situazione': 'issue', 'la complessità': 'issue', 'le conseguenze': 'issue',
      'un obiettivo': 'goal', "l'esperienza": 'goal', 'il successo': 'goal', 'un compromesso': 'goal',
      'il futuro': 'truth', 'la verità': 'truth', 'il mondo': 'truth', 'i dettagli': 'truth', 'le apparenze': 'truth',
      "l'occasione": 'chance',
    },
    objects: {
      avere: 'food drink read watch person time money ticket room idea issue goal',
      volere: 'food drink read watch listen ticket room info time money idea goal truth',
      vorrei: 'food drink read watch listen ticket room info time money idea goal truth',
      preferire: 'food drink read watch listen ticket room',
      mangiare: 'food', bere: 'drink', cucinare: 'food',
      prendere: 'food drink transport room ticket decision',
      comprare: 'food drink read watch ticket',
      fare: 'food watch',
      vedere: 'watch person place truth', guardare: 'watch truth',
      cercare: 'food drink read person money ticket room info idea time',
      leggere: 'read lesson', ascoltare: 'listen lesson info person',
      portare: 'food drink read person ticket',
      trovare: 'person money ticket room info time idea goal',
      aspettare: 'person transport food',
      pagare: 'ticket food drink', ordinare: 'food drink',
      visitare: 'place person', imparare: 'lang lesson info', usare: 'money time lang room info',
      dimenticare: 'info person ticket idea', ricordare: 'info person ticket idea',
      capire: 'issue idea lesson truth lang', spiegare: 'issue idea lesson truth',
      risolvere: 'issue', discutere: 'issue idea decision', sviluppare: 'idea',
      affrontare: 'issue truth', raggiungere: 'goal', ottenere: 'goal money ticket room',
      migliorare: 'issue idea lang goal', condividere: 'idea food drink goal watch listen',
      cogliere: 'chance', trascurare: 'truth issue person', 'mettere in discussione': 'truth idea decision', sottovalutare: 'issue',
    },
    // modals that only make sense with some verbs ("so cucinare", not "so vedere")
    modalActs: { sapere: 'fare cucinare leggere usare risolvere spiegare sviluppare migliorare imparare' },
  },
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
    'Ieri io ho cucinato il pranzo.', 'Ieri sera noi abbiamo ordinato la cena.', 'La settimana scorsa tu hai pagato il conto.',
    'Due giorni fa loro hanno preso la colazione al bar.', 'La settimana prossima io visiterò il museo.', "L'anno prossimo noi impareremo l'italiano in Italia.",
    'Fra due giorni voi mangerete al ristorante.', 'Un giorno tu vedrai il mondo.', 'Io vorrei un tavolo.', 'Tu potresti prendere una camera.',
    'Lei dovrebbe ascoltare un consiglio.', 'Noi siamo disponibili.', "Voi siete d'accordo.", 'Prima io usavo sempre la strada.',
    'A quei tempi tu ricordavi il nome.', 'Da giovane lui dimenticava spesso il nome.', 'Io sono paziente.',
    'Io mangio una pizza mentre tu leggi la lezione.', 'Noi abbiamo pagato il conto, poi abbiamo preso il treno.', 'Lei è di cattivo umore anche se è in ufficio.',
    'Lui è forte, però è triste.', 'Io sono in forma, inoltre sono felice.', 'Noi dobbiamo capire il problema.',
    'Tu spieghi la soluzione.', 'Loro risolvono il problema.', 'Voi discutete il progetto.', "Io sviluppo un'idea.", 'Lui prende una decisione.',
    'Finalmente io capisco la verità.', 'Tu guardi davvero il mondo.', 'Lei vede raramente il futuro.', 'Noi facciamo di nuovo la cena.',
    'Io sono in pensiero.', 'Voi siete responsabili.', 'Noi affrontiamo una sfida.', 'Tu raggiungi un obiettivo.', "Lei ottiene l'esperienza.",
    'Loro migliorano la situazione.', 'Io condivido il successo.', 'Io sono a pezzi.', 'Io sono puntuale, tuttavia tu non hai pagato il conto.',
    'Tu sei triste, dunque noi facciamo la cena.', 'Lei è forte, eppure è triste.', 'Poiché io sono in ritardo tu prendi il treno.',
    'Dal momento che noi siamo qui tu puoi mangiare.', 'Io non sono triste, anzi sono felice.', "Col senno di poi io ho colto l'occasione.",
    'A lungo andare tu trascurerai i dettagli.', 'Io sono al settimo cielo.', 'In fin dei conti noi mettiamo in discussione le apparenze.',
    'Nel frattempo voi sottovalutate le conseguenze.', 'Loro trovano un compromesso.', 'Lei capisce la complessità.',
  ],
};
