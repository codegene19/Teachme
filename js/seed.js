// The starter universe: ~80 high-frequency English words, grouped into
// "sectors" — grammatical roles. Any two words in the same sector can swap
// places in a sentence, which is what makes a sentence a *template*.

export const CATEGORY_DEFS = [
  { id: 'who',     label: 'WHO',       sector: 'Persona Nebula',  blurb: 'people & pronouns',         color: '#6fb8ff', angle: 180, radius: 760, spread: 170 },
  { id: 'freq',    label: 'HOW OFTEN', sector: 'Pulsar Field',    blurb: 'how often it happens',      color: '#7ef0f0', angle: 226, radius: 800, spread: 170 },
  { id: 'modal',   label: 'MODE',      sector: 'Possibility Rim', blurb: 'can, will, should…',        color: '#b693ff', angle: 270, radius: 760, spread: 200 },
  { id: 'action',  label: 'ACTION',    sector: 'Action Cluster',  blurb: 'verbs — what we do',        color: '#ffd25e', angle: 316, radius: 820, spread: 240 },
  { id: 'thing',   label: 'THING',     sector: 'Object Belt',     blurb: 'things & ideas',            color: '#ff7c7c', angle: 2,   radius: 820, spread: 250 },
  { id: 'place',   label: 'PLACE',     sector: 'Locus Expanse',   blurb: 'where it happens',          color: '#4fe3c1', angle: 46,  radius: 800, spread: 220 },
  { id: 'time',    label: 'TIME',      sector: 'Chrono Drift',    blurb: 'when it happens',           color: '#d4f16a', angle: 92,  radius: 780, spread: 220 },
  { id: 'feeling', label: 'FEELING',   sector: 'Aurora of Moods', blurb: 'how we feel',               color: '#ff8fd6', angle: 136, radius: 820, spread: 230 },
  { id: 'quality', label: 'QUALITY',   sector: 'Prism Reach',     blurb: 'words that describe things', color: '#ffb36b', angle: 24, radius: 1180, spread: 190 },
  { id: 'core',    label: 'CORE',      sector: 'Inner Ring',      blurb: 'small helper words',        color: '#e9e3d3', angle: 205, radius: 400, spread: 120 },
  { id: 'link',    label: 'LINK',      sector: 'Bridge Core',     blurb: 'words that join sentences', color: '#ffa95e', angle: 0,   radius: 0,   spread: 170 },
];

export const UNCHARTED_DEF = {
  id: 'uncharted', label: 'UNCHARTED', sector: 'Uncharted Space',
  blurb: 'new words waiting for a sector', color: '#9aa0b8', angle: 252, radius: 1200, spread: 260,
};

export const CUSTOM_COLORS = ['#ff6fa8', '#8affc1', '#ffcf8a', '#a0b4ff', '#e58aff', '#8ae0ff', '#ffe36f', '#ff9e7a'];

// Every word here was chosen so that swapping it with a sibling keeps the
// sentence grammatical: subjects all take the same verb form, modals are all
// followed by a bare verb, things need no article, and so on.
export const SEED_WORDS = {
  who:     ['I', 'you', 'we', 'they', 'people'],
  freq:    ['always', 'never', 'often', 'sometimes', 'usually'],
  modal:   ['can', "can't", 'will', "won't", 'should', 'must', 'might'],
  action:  ['want', 'need', 'like', 'love', 'have', 'find', 'make', 'see', 'buy', 'bring', 'share', 'take'],
  thing:   ['coffee', 'tea', 'water', 'food', 'music', 'time', 'money', 'help', 'books', 'friends', 'ideas', 'bread', 'flowers', 'games'],
  place:   ['here', 'there', 'outside', 'inside', 'at home', 'at work', 'in the city', 'everywhere'],
  time:    ['now', 'today', 'tomorrow', 'tonight', 'later', 'every day', 'this morning', 'on weekends'],
  feeling: ['happy', 'tired', 'ready', 'hungry', 'free', 'busy', 'calm', 'excited', 'sad', 'lucky'],
  core:    ['do', "don't", 'feel', 'really'],
  link:    ['and', 'but', 'because', 'so', 'or', 'if', 'when'],
};

// Real sentences that wire the sky together. Words that sit next to each
// other here become "linked stars": lighting one reveals the other.
export const EXAMPLES = [
  'I want coffee now.', 'You need water today.', 'We love music.', 'They have books at home.',
  'People like flowers.', 'I need help.', 'Do you want tea?', "We don't have time today.",
  'I can make bread at home.', 'You should bring food tomorrow.', 'They will buy flowers later.',
  'We might find friends in the city.', 'I feel tired this morning.', 'You feel happy because we share music.',
  'They feel hungry tonight.', 'We feel ready now.', 'I really love coffee.', 'People always want money.',
  'I never have time.', 'We often see friends on weekends.', 'They sometimes take books outside.',
  'You usually bring ideas.', "I can't find money here.", "We won't need help tomorrow.",
  'You must take water there.', 'I feel free and we share games.', 'They feel busy but I feel calm.',
  'People feel excited when we bring games.', 'I feel sad so you bring flowers.', 'Do they like games?',
  'We can share ideas everywhere.', 'I might see friends inside.', 'Do you want coffee or tea?',
  'I will bring food if you feel hungry.', 'We share music at work.', 'They love music every day.',
  'I see friends at work.', 'You need books every day.', 'We bring tea outside.', 'I want bread tonight.',
  'We feel lucky today.', 'You like coffee.', 'They make games.', 'People need friends.', 'I take tea.',
];

// Hidden constellations. Each one becomes "sighted" once every star it
// needs is lit. [sector] = a variable slot, plain text = a fixed word.
export const BLUEPRINTS = [
  { id: 'first-light',   name: 'First Light',     pattern: '[who] [action] [thing]',                         end: '.' },
  { id: 'clockwork',     name: 'Clockwork',       pattern: '[who] [action] [thing] [time]',                  end: '.' },
  { id: 'curiosity',     name: 'Curiosity',       pattern: 'do [who] [action] [thing]',                      end: '?' },
  { id: 'inner-weather', name: 'Inner Weather',   pattern: '[who] feel [feeling] [time]',                    end: '.' },
  { id: 'refusal',       name: 'The Refusal',     pattern: "[who] don't [action] [thing] [time]",            end: '.' },
  { id: 'supergiant',    name: 'Supergiant',      pattern: '[who] really [action] [thing]',                  end: '!' },
  { id: 'possibility',   name: 'Possibility',     pattern: '[who] [modal] [action] [thing] [place]',         end: '.' },
  { id: 'habits',        name: 'Orbit of Habits', pattern: '[who] [freq] [action] [thing] [place]',          end: '.' },
  { id: 'binary',        name: 'Binary Star',     pattern: '[who] feel [feeling] [link] [who] [action] [thing]', end: '.' },
  { id: 'wide-field',    name: 'Wide Field',      pattern: '[who] [modal] [action] [thing] [place] [time]',  end: '.' },
];

export const GENESIS_CHOICES = ['I', 'love', 'coffee', 'music', 'want', 'today', 'happy', 'you'];

export const NAMES = {
  adj:  ['Silent', 'Wandering', 'Golden', 'Twin', 'Hidden', 'Restless', 'Bright', 'Distant', 'Sleeping', 'Burning', 'Little', 'Patient'],
  noun: ['Harp', 'Lantern', 'Compass', 'River', 'Kite', 'Crown', 'Whale', 'Fox', 'Gate', 'Archer', 'Moth', 'Bridge', 'Key', 'Sail'],
  gal1: ['Spiral', 'Veil', 'Whirl', 'Halo', 'Cradle', 'Wheel', 'Bloom', 'Tide'],
  gal2: ['Echoes', 'Mornings', 'Wishes', 'Embers', 'Lanterns', 'Promises', 'Questions', 'Small Talk'],
};

// CEFR galaxies. Each is its own cluster of sectors in the sky: A1 is home,
// and the harder bands sit further and further out along a spiral.
export const GALAXIES = [
  { id: 'A1', name: 'Home Galaxy', color: '#8fb4ff', x: 0, y: 0 },
  { id: 'A2', name: 'Neighbour Spiral', color: '#b693ff', x: 3300, y: -1100 },
  { id: 'B1', name: 'Open Wheel', color: '#6ff2b4', x: 4700, y: 2300 },
  { id: 'B2', name: 'Lantern Cluster', color: '#ffd25e', x: 1700, y: 5000 },
  { id: 'C1', name: 'Deep Field', color: '#ff8fd6', x: -2500, y: 4900 },
  { id: 'C2', name: 'Far Horizon', color: '#ff7c7c', x: -5200, y: 1500 },
];
export const galaxyIndex = (cefr) => Math.max(0, GALAXIES.findIndex((g) => g.id === cefr));
