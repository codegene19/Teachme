// Spanish agreement: feelings and describing words that change with gender
// and number ("ella está cansada", "una casa nueva", "los billetes caros").
// g4 = [masculine singular, feminine singular, masculine plural, feminine plural].

const g4 = (s) => s.split('|');
const f = (forms, en) => ({ t: forms.split('|')[0], c: 'feeling', en, g4: g4(forms) });
const q = (forms, en) => ({ t: forms.split('|')[0], c: 'quality', en, g4: g4(forms) });

export default {
  levels: {
    3: [f('cansado|cansada|cansados|cansadas', 'tired'), f('contento|contenta|contentos|contentas', 'glad'), f('listo|lista|listos|listas', 'ready')],
    4: [q('nuevo|nueva|nuevos|nuevas', 'new'), q('caliente|caliente|calientes|calientes', 'hot'), q('frío|fría|fríos|frías', 'cold'), q('bueno|buena|buenos|buenas', 'good'), q('caro|cara|caros|caras', 'expensive')],
    6: [f('ocupado|ocupada|ocupados|ocupadas', 'busy'), f('tranquilo|tranquila|tranquilos|tranquilas', 'calm'), q('pequeño|pequeña|pequeños|pequeñas', 'small'), q('grande|grande|grandes|grandes', 'big')],
    9: [q('viejo|vieja|viejos|viejas', 'old'), q('bonito|bonita|bonitos|bonitas', 'pretty'), q('rojo|roja|rojos|rojas', 'red'), q('barato|barata|baratos|baratas', 'cheap'), f('enfadado|enfadada|enfadados|enfadadas', 'angry')],
    13: [q('italiano|italiana|italianos|italianas', 'Italian'), q('largo|larga|largos|largas', 'long'), q('importante|importante|importantes|importantes', 'important'), q('difícil|difícil|difíciles|difíciles', 'difficult'), f('sorprendido|sorprendida|sorprendidos|sorprendidas', 'surprised'), f('nervioso|nerviosa|nerviosos|nerviosas', 'nervous')],
  },
  patterns: {
    4: [{ id: 'detail', name: 'Fine Detail', pattern: '[who] [action] [thing] [quality]', end: '.' }],
    9: [{ id: 'portrait', name: 'Portrait', pattern: '[who] [modal] [action:inf] [thing] [quality] [place]', end: '.' }],
    13: [{ id: 'mirror', name: 'Mirror Pair', pattern: '[who] estar [feeling] [link] [who] [action] [thing] [quality]', end: '.' }],
  },
  genders: { agua: 'f', pan: 'm', leche: 'f', vino: 'm', queso: 'm', tiempo: 'm', dinero: 'm', 'música': 'f' },
};
