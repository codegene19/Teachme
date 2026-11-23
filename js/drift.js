// Drift: autopilot. The camera flies star to star along freshly generated
// sentences while a voice reads them aloud — passive listening practice.

import { state, derived, bumpSeen, bumpStat, commit } from './store.js';
import { sentenceSegments, paragraphSegments, pickRandom, optionsFor } from './language.js';
import { app, h, fill, $, toast, sleep } from './ui.js';
import { chime, speak, stopSpeaking, unlockAudio } from './sfx.js';
import { speechOpts } from './panels.js';
import { randomSentence, randomStory, canGenerate } from './generate.js';

const root = $('#drift');
const textEl = $('#driftText');
const nameEl = $('#driftName');
let running = false;
let runId = 0;

export function initDrift() {
  $('#driftStop').addEventListener('click', stop);
  app.drift = { start, stop, isOn: () => running };
}

function randomize(tokens) {
  return tokens.map((t) => {
    if (!t.var) return { ...t };
    return { ...t, wordId: pickRandom(optionsFor(t, state.words, derived.orbit)) || t.wordId };
  });
}

function nextScene() {
  const consts = Object.values(state.constellations);
  const gals = Object.values(state.galaxies);
  // Mostly brand-new sentences and stories from your patterns; sometimes your saved ones.
  const roll = Math.random();
  if (canGenerate() && (roll < 0.35 || !consts.length)) {
    const story = roll < 0.15 && randomStory(Math.random() < 0.5 ? 2 : 3);
    if (story && story.parts.length) return { name: 'a new story', segs: paragraphSegments(story.parts, story.joins, state.words) };
    const s = randomSentence();
    if (s) {
      const segs = sentenceSegments(s.tokens, state.words, { end: s.end });
      segs.push({ kind: 'punct', text: s.end, sep: '' });
      return { name: s.name, segs };
    }
  }
  const useGalaxy = gals.length && Math.random() < 0.3;
  if (useGalaxy) {
    const g = pickRandom(gals);
    const parts = g.parts.map((p) => ({ ...p, tokens: randomize(p.tokens) }));
    const links = derived.orbit.link || [];
    const joins = g.joins.map((j) => (j && links.length ? pickRandom(links) : j));
    return { name: g.name, segs: paragraphSegments(parts, joins, state.words) };
  }
  const c = pickRandom(consts);
  const tokens = randomize(c.tokens);
  const segs = sentenceSegments(tokens, state.words, { end: c.end });
  segs.push({ kind: 'punct', text: c.end, sep: '' });
  return { name: c.name, segs };
}

export async function start() {
  if (running) return;
  if (!Object.keys(state.constellations).length && !canGenerate()) {
    toast({ kind: 'info', title: 'Nothing to drift through yet', body: 'Light a few more stars so a pattern can form.' });
    return;
  }
  unlockAudio();
  app.forge.close();
  app.galaxy.close();
  app.log.close();
  app.panels.closeStarCard();
  running = true;
  const id = ++runId;
  root.hidden = false;
  document.body.classList.add('drifting');
  // keep the focused star above the subtitles
  app.space.setInsets({ top: 0, bottom: Math.min(320, window.innerHeight * 0.38), right: 0 });
  bumpStat('drifts');
  commit();
  while (running && id === runId) {
    const scene = nextScene();
    const wordSegs = scene.segs.filter((s) => s.wordId);
    const ids = wordSegs.map((s) => s.wordId);
    nameEl.textContent = scene.name;
    const spans = [];
    fill(textEl, ...scene.segs.flatMap((s) => {
      if (!s.wordId) return [h('span', { class: 'end' }, s.text)];
      const c = state.categories[s.slot] || state.categories[s.cat] || state.categories.uncharted;
      const el = h('span', { class: 'w' + (s.isVar || s.kind === 'join' ? ' var' : ''), style: { '--c': c.color } }, s.text);
      spans.push(el);
      return [s.sep, el];
    }));
    textEl.classList.remove('in');
    void textEl.offsetWidth;
    textEl.classList.add('in');
    app.space.setPath(ids);
    const text = scene.segs.map((s) => s.sep + s.text).join('');
    const spoken = speak(text, { ...speechOpts(), rate: Math.min(state.settings.rate, 0.95) });
    for (let i = 0; i < ids.length && running && id === runId; i++) {
      const w = state.words[ids[i]];
      spans.forEach((el, k) => el.classList.toggle('say', k === i));
      app.space.setCursor(i);
      app.space.focusWord(ids[i], 1.05, 700);
      chime(w.cat, { gain: 0.22, dur: 1.2 });
      await sleep(720);
    }
    spans.forEach((el) => el.classList.remove('say'));
    app.space.setCursor(-1);
    await spoken;
    bumpSeen(ids);
    commit();
    if (!running || id !== runId) break;
    app.space.fitIds(ids, { maxZ: 0.9, dur: 1400 });
    await sleep(1700);
  }
}

export function stop() {
  if (!running) return;
  running = false;
  runId++;
  stopSpeaking();
  root.hidden = true;
  document.body.classList.remove('drifting');
  app.updateInsets?.();
  app.space.setPath(null);
  app.space.setCursor(-1);
  app.space.fitAll({ dur: 1400 });
}
