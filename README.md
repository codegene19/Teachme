# Lexicosmos ✦

> Fluency isn't fifty thousand words. It's fifty words, in endless orbits.

Lexicosmos is a language-learning web app shaped like outer space, for **Italian** and **Spanish** (plus an English starter and a bring-your-own-language mode). You start in pure black, choose a language, then a single word. Every word you learn becomes a **star**. Every sentence you build becomes a **constellation** — a template whose words can be swapped out like variables. Link sentences together and you get **galaxies**: whole paragraphs.

The idea: you can't be fluent with 50,000 words if you aren't fluent with 50. A few dozen words that you truly own — plus the patterns that let each one slide into a thousand sentences — get you further than a huge vocabulary you can't use.

```
WHO      MODE           ACTION     THING         TIME
io       voglio         mangiare   una pizza     oggi
tu       puoi           bere       un caffè      domani
noi      dobbiamo       prendere   il treno      stasera
loro     sanno          vedere     un film       ogni giorno
  7   ×    5       ×      16    ×     16      ×    7    =  62,720 sentences
```

That's one pattern built from Italian's nine levels: about 80 words in total.

The verb follows the subject: switch *io* to *noi* and *voglio* becomes *vogliamo* automatically.

## How to play

| In space | What it means |
|---|---|
| **Star** | A word. Lit stars are words you know; faint stars are linked words waiting to be discovered. |
| **Sector** | A grammatical role (WHO, ACTION, THING, PLACE, TIME, FEELING, MODE, HOW OFTEN, LINK, CORE). Any star can take the place of another star from the same sector. |
| **Constellation** | A sentence template. Fixed words stay put; *variables* orbit through every star in their sector. |
| **Galaxy** | A paragraph: sentences joined by a full stop or a bridge star (*and, but, because, so…*). The links are variables too. |
| **Mastery** | Every time a word appears in a sentence you make, hear or practise, its star grows — Spark → Flame → Star → Giant → Supernova. |

1. **Genesis**: choose Italiano or Español, then pick your first word from the most-used words drifting in the dark. Each one shows its English meaning.
2. **Discover**: tap the faint stars connected to yours. Each one is a word that sits next to yours in a real sentence. Words are spoken aloud as they ignite.
3. **Forge**: tap a star and choose *Add to sentence*, or just type a whole sentence. Then tap any word and choose **Make variable**. Click the coloured words, scroll over a variable, or hit **Shuffle** to spin the sentence. The counter shows how many sentences the pattern can make.
4. **Save** it as a constellation. It's drawn into your sky, and the number of *sentences within reach* climbs.
5. **Galaxy**: chain constellations into paragraphs and spin the links between them.
6. **Eclipse**: one word of a sentence goes dark. You hear the sentence, then pick the missing word — active recall using your own patterns.
7. **Drift**: autopilot. The camera flies star to star through freshly generated sentences while they're read aloud.

Hidden constellations (*First Light, Curiosity, Binary Star…*) appear in the sky once you've lit every star they need. Seventeen missions guide you from one word to a million sentences within reach.

### Levels

Italian and Spanish each come as about 80 of the most-used words, in nine levels of growing complexity. Each level asks you to light most of its stars and make a number of sentences. When you do, the next level's words arrive as a meteor shower, along with a harder sentence pattern:

| Level | Adds | Pattern |
|---|---|---|
| 1 First Light | I, you, want, have, coffee, bread… | *Io voglio un caffè.* |
| 2 Voices | he, she, we, you all, they | conjugation in all six persons |
| 3 Moods | essere / estar + feelings | *Noi siamo felici.* |
| 4 Daily Orbit | eat, drink, take, buy + times | *Loro bevono un caffè ogni giorno.* |
| 5 Possibility | can, must / tener que, ir a + infinitive | *Tu devi prendere il treno domani.* |
| 6 Coordinates | places | *Ellos van a comer una pizza en casa.* |
| 7 Habits | always, often, sometimes | *Yo siempre tomo un café en el bar.* |
| 8 Bridges | and, but, because, so | two clauses, each agreeing on its own |
| 9 Wide Field | know how, prefer, find, wait for… | six moving parts in one sentence |

### Grammar that stays correct

Swapping words only teaches if every sentence it produces is right, so the packs carry grammar:

- Verbs carry their present-tense forms and agree with the nearest subject before them, so two-clause sentences conjugate each clause separately.
- A verb after *volere/poder/tener que/ir a* is shown in the infinitive. Any verb chip can be switched between conjugated and infinitive.
- Feelings are gender-neutral adjectives with singular and plural forms (*felice/felici*, *feliz/felices*).
- Things are noun chunks with their article (*un caffè*, *il treno*, *la cena*).
- Spanish questions and exclamations get their opening *¿ ¡*.
- English meanings appear under every word in your sentences and next to stars on the map (Settings → Reading). Each verb's star card shows its full conjugation, and tapping a form plays it aloud.
- Typing works with any form, and accents are optional: *vogliamo*, *perche*, *tengo que* are all recognized.

### Other languages

There's also an English starter (80 words, revealed through their neighbours rather than levels). For any other language, choose **an empty universe** on the first screen, or restart from Settings. Type words, give each one a sector (or create your own sectors), and pick a matching voice under **Settings → Voice**. Every star has a *meaning / note* field for your native-language translation.

### Keyboard

`F` Forge · `G` Galaxy · `E` Eclipse · `D` Drift · `L` Logbook · `N` new word · `S` shuffle · `V` hear · `0` show everything · `Esc` close

Drag to pan, scroll or pinch to zoom, double-click to dive in.

## Running it

No build step and no dependencies: just static files using ES modules. Serve the folder over HTTP (modules don't load from `file://`):

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

To publish on GitHub Pages: **Settings → Pages → Deploy from a branch**, pick the branch and `/ (root)`.

Your universe is saved in the browser's `localStorage`. Use **Settings → Export** to back it up or move it to another device.

## Code map

| File | Role |
|---|---|
| `index.html`, `css/styles.css` | Shell and visual design |
| `js/packs/it.js`, `js/packs/es.js` | Italian and Spanish: words by level with meanings, conjugations, plural forms, patterns, example sentences |
| `js/packs/en.js`, `js/packs/index.js` | English starter pack and the loader that normalises packs |
| `js/seed.js` | Sectors, the English starter words, constellation names |
| `js/store.js` | Universe state, persistence, levels, word lookup (every form → its star), discovery graph, event bus |
| `js/language.js` | Grammar engine: agreement, infinitives, parsing typed text, rendering sentences and paragraphs, counting combinations |
| `js/space.js` | Canvas renderer: camera, parallax starfield, nebulae, stars, constellation paths, warp streaks |
| `js/forge.js` | Sentence-template builder with variables |
| `js/galaxy.js` | Paragraph builder |
| `js/eclipse.js` | Listening quiz |
| `js/drift.js` | Autopilot |
| `js/logbook.js`, `js/missions.js` | Star chart, saved work, missions |
| `js/panels.js` | Star card, word dialogs, sector picker, settings |
| `js/sfx.js` | Pentatonic chimes (each sector has its own note) and text-to-speech |
| `js/genesis.js`, `js/main.js` | Opening sequence and wiring |
