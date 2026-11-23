// Conjugation generators. Regular verbs are built from rules; irregular
// forms are passed in as overrides. Each returns
//   { f: [6 present forms], ft: { past: [6], imp: [6], fut: [6] } }
// in the order: I, you, he/she, we, you all, they.
// Multi-word verbs ("mettere in discussione") inflect their first word.

const split = (inf) => {
  const [head, ...rest] = inf.split(' ');
  return { head, tail: rest.length ? ` ${rest.join(' ')}` : '' };
};
const withTail = (forms, tail) => forms.map((f) => f + tail);

// ---------------------------------------------------------------- Italian
const IT_AUX = ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'];
const IT_FUT = ['ò', 'ai', 'à', 'emo', 'ete', 'anno'];

/**
 * Italian: presente, passato prossimo (with avere), imperfetto, futuro.
 * Options: pres, imp, past (full arrays), pp (participle), futStem, isc (-ire verbs like capire).
 */
export function it(inf, o = {}) {
  const { head, tail } = split(inf);
  const end = head.slice(-3);
  const stem = head.slice(0, -3);
  let pres, imp, futStem, pp;
  if (end === 'are') {
    const iStem = stem.endsWith('i');                 // mangi-are, studi-are
    const soft = /[cg]i$/.test(stem);                 // mangi-, cominci-
    const hard = /[cg]$/.test(stem) ? 'h' : '';       // cerc-are → cerchi
    const before = iStem ? stem.slice(0, -1) : stem + hard; // before an ending that starts with i
    pres = [`${stem}o`, `${before}i`, `${stem}a`, `${before}iamo`, `${stem}ate`, `${stem}ano`];
    imp = ['avo', 'avi', 'ava', 'avamo', 'avate', 'avano'].map((e) => stem + e);
    futStem = `${soft ? stem.slice(0, -1) : stem + hard}er`;
    pp = `${stem}ato`;
  } else if (end === 'ere') {
    pres = ['o', 'i', 'e', 'iamo', 'ete', 'ono'].map((e) => stem + e);
    imp = ['evo', 'evi', 'eva', 'evamo', 'evate', 'evano'].map((e) => stem + e);
    futStem = `${stem}er`;
    pp = `${stem}uto`;
  } else {
    pres = (o.isc ? ['isco', 'isci', 'isce', 'iamo', 'ite', 'iscono'] : ['o', 'i', 'e', 'iamo', 'ite', 'ono']).map((e) => stem + e);
    imp = ['ivo', 'ivi', 'iva', 'ivamo', 'ivate', 'ivano'].map((e) => stem + e);
    futStem = `${stem}ir`;
    pp = `${stem}ito`;
  }
  pres = o.pres || pres;
  imp = o.imp || imp;
  futStem = o.futStem || futStem;
  pp = o.pp || pp;
  const past = o.past || IT_AUX.map((a) => `${a} ${pp}`);
  const fut = o.fut || IT_FUT.map((e) => futStem + e);
  return { f: withTail(pres, tail), ft: { past: withTail(past, tail), imp: withTail(imp, tail), fut: withTail(fut, tail) } };
}

// ---------------------------------------------------------------- Spanish
const ES_FUT = ['é', 'ás', 'á', 'emos', 'éis', 'án'];

/**
 * Spanish: presente, pretérito indefinido, imperfecto, futuro.
 * Options: pres, pret, imp, fut (full arrays), boot (stem for yo/tú/él/ellos in
 * stem-changing verbs: "encuentr"), futStem ("tendr").
 */
export function es(inf, o = {}) {
  const { head, tail } = split(inf);
  const end = head.slice(-2);
  const stem = head.slice(0, -2);
  const boot = o.boot || stem;
  let pres, pret, imp;
  if (end === 'ar') {
    pres = [`${boot}o`, `${boot}as`, `${boot}a`, `${stem}amos`, `${stem}áis`, `${boot}an`];
    const yo = stem.endsWith('c') ? `${stem.slice(0, -1)}qué` : stem.endsWith('g') ? `${stem}ué` : stem.endsWith('z') ? `${stem.slice(0, -1)}cé` : `${stem}é`;
    pret = [yo, `${stem}aste`, `${stem}ó`, `${stem}amos`, `${stem}asteis`, `${stem}aron`];
    imp = ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'].map((e) => stem + e);
  } else {
    const ir = end === 'ir';
    pres = [`${boot}o`, `${boot}es`, `${boot}e`, `${stem}${ir ? 'imos' : 'emos'}`, `${stem}${ir ? 'ís' : 'éis'}`, `${boot}en`];
    pret = ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'].map((e) => stem + e);
    imp = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'].map((e) => stem + e);
  }
  pres = o.pres || pres;
  pret = o.pret || pret;
  imp = o.imp || imp;
  const fut = o.fut || ES_FUT.map((e) => (o.futStem || head) + e);
  return { f: withTail(pres, tail), ft: { past: withTail(pret, tail), imp: withTail(imp, tail), fut: withTail(fut, tail) } };
}

/** Spread a person-list like "ho|hai|ha|abbiamo|avete|hanno". */
export const P = (s) => s.split('|');
