// Italian agreement: feelings and describing words that change with gender
// and number ("lei è stanca", "una casa nuova", "i biglietti cari").
// g4 = [masculine singular, feminine singular, masculine plural, feminine plural].

const g4 = (s) => s.split('|');
const f = (forms, en) => ({ t: forms.split('|')[0], c: 'feeling', en, g4: g4(forms) });
const q = (forms, en) => ({ t: forms.split('|')[0], c: 'quality', en, g4: g4(forms) });

export default {
  levels: {
    3: [f('stanco|stanca|stanchi|stanche', 'tired'), f('contento|contenta|contenti|contente', 'glad'), f('pronto|pronta|pronti|pronte', 'ready')],
    4: [q('nuovo|nuova|nuovi|nuove', 'new'), q('caldo|calda|caldi|calde', 'hot'), q('freddo|fredda|freddi|fredde', 'cold'), q('buono|buona|buoni|buone', 'good'), q('caro|cara|cari|care', 'expensive')],
    6: [f('occupato|occupata|occupati|occupate', 'busy'), f('tranquillo|tranquilla|tranquilli|tranquille', 'calm'), q('piccolo|piccola|piccoli|piccole', 'small'), q('grande|grande|grandi|grandi', 'big')],
    9: [q('vecchio|vecchia|vecchi|vecchie', 'old'), q('bello|bella|belli|belle', 'beautiful'), q('rosso|rossa|rossi|rosse', 'red'), q('economico|economica|economici|economiche', 'cheap'), f('arrabbiato|arrabbiata|arrabbiati|arrabbiate', 'angry')],
    13: [q('italiano|italiana|italiani|italiane', 'Italian'), q('lungo|lunga|lunghi|lunghe', 'long'), q('importante|importante|importanti|importanti', 'important'), q('difficile|difficile|difficili|difficili', 'difficult'), f('sorpreso|sorpresa|sorpresi|sorprese', 'surprised'), f('nervoso|nervosa|nervosi|nervose', 'nervous')],
  },
  patterns: {
    4: [{ id: 'detail', name: 'Fine Detail', pattern: '[who] [action] [thing] [quality]', end: '.' }],
    9: [{ id: 'portrait', name: 'Portrait', pattern: '[who] [modal] [action:inf] [thing] [quality] [place]', end: '.' }],
    13: [{ id: 'mirror', name: 'Mirror Pair', pattern: '[who] essere [feeling] [link] [who] [action] [thing] [quality]', end: '.' }],
  },
  // nouns whose article doesn't show the gender
  genders: { "l'acqua": 'f', tempo: 'm', "l'italiano": 'm', "l'esperienza": 'f', "l'occasione": 'f' },
};
