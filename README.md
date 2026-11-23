# Lexicosmos ✦

> Fluency isn't fifty thousand words. It's fifty words, in endless orbits.

Lexicosmos is a language-learning web app shaped like outer space. You start in pure black with a single word. Every word you learn becomes a **star**. Every sentence you build becomes a **constellation** — a template whose words can be swapped out like variables. Link sentences together and you get **galaxies**: whole paragraphs.

The idea: you can't be fluent with 50,000 words if you aren't fluent with 50. A few dozen words that you truly own — plus the patterns that let each one slide into a thousand sentences — get you further than a huge vocabulary you can't use.

```
WHO      ACTION    THING     TIME
 I        want     coffee    now
 you      need     water     today
 we       love     music     tomorrow
 they     have     books     tonight
 people   find     friends   every day
  5   ×    12   ×    14   ×    8     =  6,720 sentences from one pattern
```

## How to play

| In space | What it means |
|---|---|
| **Star** | A word. Lit stars are words you know; faint stars are linked words waiting to be discovered. |
| **Sector** | A grammatical role (WHO, ACTION, THING, PLACE, TIME, FEELING, MODE, HOW OFTEN, LINK, CORE). Any star can take the place of another star from the same sector. |
| **Constellation** | A sentence template. Fixed words stay put; *variables* orbit through every star in their sector. |
| **Galaxy** | A paragraph: sentences joined by a full stop or a bridge star (*and, but, because, so…*). The links are variables too. |
| **Mastery** | Every time a word appears in a sentence you make, hear or practise, its star grows — Spark → Flame → Star → Giant → Supernova. |

1. **Genesis**: pick your first word from the motes drifting in the dark, or type your own.
2. **Discover**: tap the faint stars connected to yours. Each one is a word that sits next to yours in a real sentence. Words are spoken aloud as they ignite.
3. **Forge**: tap a star and choose *Add to sentence*, or just type a whole sentence. Then tap any word and choose **Make variable**. Click the coloured words, scroll over a variable, or hit **Shuffle** to spin the sentence. The counter shows how many sentences the pattern can make.
4. **Save** it as a constellation. It's drawn into your sky, and the number of *sentences within reach* climbs.
5. **Galaxy**: chain constellations into paragraphs and spin the links between them.
6. **Eclipse**: one word of a sentence goes dark. You hear the sentence, then pick the missing word — active recall using your own patterns.
7. **Drift**: autopilot. The camera flies star to star through freshly generated sentences while they're read aloud.

Hidden constellations (*First Light, Curiosity, Binary Star…*) appear in the sky once you've lit every star they need. Seventeen missions guide you from one word to a million sentences within reach.

### Any language

The built-in universe is an English starter of 80 high-frequency words, chosen so that any swap stays grammatical. Choose **Start an empty universe** on the first screen, or reset from Settings, to bring your own language. Type words, give each one a sector (or create your own sectors), and pick a matching voice under **Settings → Voice**. Every star has a *meaning / note* field for your native-language translation.

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
| `js/seed.js` | Starter words, sectors, example sentences (which wire the discovery graph), hidden constellations |
| `js/store.js` | Universe state, persistence, star placement, discovery graph, event bus |
| `js/language.js` | Tokenising input, rendering sentences and paragraphs, counting combinations |
| `js/space.js` | Canvas renderer: camera, parallax starfield, nebulae, stars, constellation paths, warp streaks |
| `js/forge.js` | Sentence-template builder with variables |
| `js/galaxy.js` | Paragraph builder |
| `js/eclipse.js` | Listening quiz |
| `js/drift.js` | Autopilot |
| `js/logbook.js`, `js/missions.js` | Star chart, saved work, missions |
| `js/panels.js` | Star card, word dialogs, sector picker, settings |
| `js/sfx.js` | Pentatonic chimes (each sector has its own note) and text-to-speech |
| `js/genesis.js`, `js/main.js` | Opening sequence and wiring |
