// Lexicosmos — boot and wiring.

import { load, state, derived, on, persist, saveNow, ignite, resolveBlueprint, markHint } from './store.js';
import { BLUEPRINTS } from './seed.js';
import { sentenceText, formatBig } from './language.js';
import { createSpace } from './space.js';
import { app, $, $$, h, fill, icon, toast, caption, countUp, closeModal, hidePopover, isPopoverOpen, isModalOpen } from './ui.js';
import { unlockAudio, igniteSound, setSoundEnabled, speak } from './sfx.js';
import { initPanels, speechOpts } from './panels.js';
import { initForge } from './forge.js';
import { initGalaxy } from './galaxy.js';
import { initLog } from './logbook.js';
import { initDrift } from './drift.js';
import { initEclipse } from './eclipse.js';
import { checkMissions, pendingMissions, doneCount, MISSIONS } from './missions.js';
import { runGenesis } from './genesis.js';

load();
setSoundEnabled(state.settings.sound);

const space = createSpace($('#space'), {
  onStar: (id) => app.panels.openStarCard(id),
  onUnlit: (id) => igniteFromMap(id),
  onBackground: () => app.panels.closeStarCard(),
});
app.space = space;
app.igniteFromMap = igniteFromMap;

initPanels();
initForge();
initGalaxy();
initLog();
initDrift();
initEclipse();

function igniteFromMap(id) {
  unlockAudio();
  ignite(id);
}

// ------------------------------------------------------------ discovery
on('ignite', ({ id, newSector, quiet }) => {
  const w = state.words[id];
  const c = state.categories[w.cat];
  space.markLit(id);
  space.burst(id, newSector);
  igniteSound(w.cat);
  if (!quiet) {
    caption(w.text, `${c.label} · ${c.sector}`, c.color);
    if (state.settings.speakOnIgnite) speak(w.text, speechOpts());
  }
  if (newSector) space.markNebula(c.id);
  // The very first sector is announced by the caption; later ones get a toast.
  if (newSector && w.cat !== 'uncharted' && derived.sectors > 1) {
    toast({ kind: 'sector', color: c.color, title: c.sector, body: `${c.label} — ${c.blurb}. Every star in this sector can take another’s place in a sentence.` });
  }
  if (derived.litCount === 1) {
    if (state.mode === 'english' && markHint('neighbors')) {
      setTimeout(() => toast({ kind: 'signal', title: 'You are not alone', body: 'Faint stars around you are words that live next to yours in real sentences. Tap one to ignite it.' }), 3400);
    }
    return;
  }
  if (!quiet && document.body.classList.contains('live') && !app.drift.isOn()) revealAround(id);
});

// After an ignition, pull the camera back just enough to show the newly
// discoverable neighbours, if they are off-screen.
function revealAround(id, { maxZ = space.cam.z, dur = 1300 } = {}) {
  const fresh = [...(derived.adj.get(id) || [])].filter((n) => derived.discoverable.has(n));
  if (!fresh.length || fresh.every((n) => space.onScreen(n))) return;
  space.fitIds([id, ...fresh], { maxZ: Math.min(maxZ, 1.3), dur });
}

on('moved', ({ id, newSector }) => {
  const w = state.words[id];
  const c = state.categories[w.cat];
  space.markLit(id);
  space.burst(id, newSector);
  if (newSector) {
    space.markNebula(c.id);
    toast({ kind: 'sector', color: c.color, title: c.sector, body: `${c.label} — ${c.blurb}.` });
  }
  space.focusWord(id, Math.max(space.cam.z, 0.9));
});

on('settings', ({ key, value }) => {
  if (key === 'sound') { setSoundEnabled(value); updateSoundBtn(); }
});

on('change', onChange);

function onChange() {
  if (document.body.classList.contains('live')) {
    updateHud();
    updateDock();
    updateMissionCard();
  }
  const done = checkMissions();
  if (done.length) {
    persist();
    // the first mission completes itself the instant you begin — no fanfare needed
    done.filter((m) => m.id !== 'spark').forEach((m, k) => setTimeout(() => {
      unlockAudio();
      toast({ kind: 'mission', title: m.title, body: nextMissionLine() });
    }, 400 + k * 900));
    updateMissionCard();
  }
  checkSightings();
}

function nextMissionLine() {
  const next = pendingMissions()[0];
  return next ? `Next: ${next.title}` : 'Every mission complete. The universe is yours.';
}

function checkSightings() {
  if (state.mode !== 'english' || !document.body.classList.contains('live')) return;
  for (const bp of BLUEPRINTS) {
    if (state.sighted[bp.id]) continue;
    const r = resolveBlueprint(bp);
    if (!r) continue;
    state.sighted[bp.id] = Date.now();
    persist();
    setTimeout(() => toast({
      kind: 'sighting', title: bp.name, body: `“${sentenceText(r.tokens, state.words, r.end)}” — a pattern is forming in your sky.`,
      action: { label: 'Forge it', fn: () => app.forge.loadBlueprint(bp) }, timeout: 9000,
    }), 1200);
    break;
  }
}

// ------------------------------------------------------------------ HUD
const count = (o) => Object.keys(o).length;
const fmt = (n) => formatBig(Math.round(n));

function updateHud() {
  countUp($('#statStars'), derived.litCount, fmt);
  countUp($('#statSectors'), derived.sectors, fmt);
  countUp($('#statConst'), count(state.constellations), fmt);
  countUp($('#statReach'), derived.reach, fmt);
}

function updateSoundBtn() {
  const b = $('#btnSound');
  b.replaceChildren(icon(state.settings.sound ? 'chimes' : 'mute'));
  b.setAttribute('aria-pressed', String(!!state.settings.sound));
  b.title = state.settings.sound ? 'Chimes on' : 'Chimes off';
}

function updateMissionCard() {
  const el = $('#missionCard');
  const next = pendingMissions()[0];
  if (!next) {
    fill(el, h('span', { class: 'kicker' }, '✦ Flight log complete'), h('span', { class: 'mission-title' }, 'Every mission done'));
    return;
  }
  const v = Math.min(next.target, next.value());
  fill(el, 
    h('span', { class: 'kicker' }, `Mission ${doneCount() + 1} of ${MISSIONS.length}`),
    h('span', { class: 'mission-title' }, next.title),
    h('span', { class: 'mission-how' }, next.how),
    next.target > 1 ? h('span', { class: 'bar' }, h('i', { style: { width: `${(v / next.target) * 100}%` } })) : null);
}

const UNLOCKS = {
  forge: {
    name: 'Forge', short: 'bind stars into sentences', title: 'The Forge is online', open: () => app.forge.open(),
    body: 'Bind your stars into a sentence. Then turn any word into a variable and watch one sentence become hundreds.',
    test: () => derived.litCount >= (state.mode === 'english' ? 2 : 1) || state.forge.tokens.length > 0,
  },
  galaxy: {
    name: 'Galaxy', short: 'link sentences into paragraphs', title: 'Galaxies are online', open: () => app.galaxy.open(),
    body: 'Link sentences with bridge words — and, but, because — to build paragraphs.',
    test: () => count(state.constellations) >= 1,
  },
  eclipse: {
    name: 'Eclipse', short: 'one word goes dark; find it', title: 'Eclipse is online', open: () => app.eclipse.start(),
    body: 'One word of your sentence goes dark. Listen, then find it. Practice that sticks.',
    test: () => app.eclipse.available(),
  },
  drift: {
    name: 'Drift', short: 'fly through your sentences, read aloud', title: 'Drift is online', open: () => app.drift.start(),
    body: 'Autopilot: fly through your sentences while they are read aloud.',
    test: () => count(state.constellations) >= 1,
  },
};

function updateDock() {
  const fresh = [];
  for (const [key, u] of Object.entries(UNLOCKS)) {
    const btn = $(`#dock [data-action="${key}"]`);
    if (!state.hints[`unlock:${key}`] && u.test()) {
      markHint(`unlock:${key}`);
      btn.classList.add('fresh');
      fresh.push(u);
    }
    btn.hidden = !state.hints[`unlock:${key}`];
  }
  // One transmission per unlock moment, even when several tools come online together.
  if (fresh.length === 1) {
    const [u] = fresh;
    setTimeout(() => toast({ kind: 'signal', title: u.title, body: u.body, action: { label: 'Open', fn: u.open } }), 900);
  } else if (fresh.length > 1) {
    setTimeout(() => toast({
      kind: 'signal', title: 'New instruments online', timeout: 9000,
      body: h('ul', { class: 'toast-list' }, fresh.map((u) => h('li', {}, h('b', {}, u.name), ' — ', u.short))),
    }), 900);
  }
  requestAnimationFrame(updateInsets);
}

// --------------------------------------------------------------- layout
function updateInsets() {
  const sheet = [$('#forge'), $('#galaxy')].find((el) => !el.hidden);
  const dock = $('#dock');
  const log = $('#log');
  const bottom = (sheet ? sheet.offsetHeight + 16 : 0) + (dock.hidden ? 0 : dock.offsetHeight + 20);
  const right = !log.hidden && window.innerWidth > 900 ? log.offsetWidth + 24 : 0;
  space.setInsets({ top: 70, bottom, right });
}
app.updateInsets = updateInsets;
app.onSheetChange = () => {
  requestAnimationFrame(updateInsets);
  $$('#dock [data-action]').forEach((b) => {
    const a = b.dataset.action;
    const on = (a === 'forge' && app.forge.isOpen()) || (a === 'galaxy' && app.galaxy.isOpen()) || (a === 'log' && app.log.isOpen());
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
};
if ('ResizeObserver' in window) {
  const ro = new ResizeObserver(() => updateInsets());
  [$('#forge'), $('#galaxy'), $('#log'), $('#dock')].forEach((el) => ro.observe(el));
}
window.addEventListener('resize', updateInsets);

// ----------------------------------------------------------------- dock
const ACTIONS = {
  add: () => app.panels.addWordDialog(),
  forge: () => app.forge.toggle(),
  galaxy: () => app.galaxy.toggle(),
  eclipse: () => app.eclipse.start(),
  drift: () => app.drift.start(),
  log: () => app.log.toggle(),
  fit: () => space.fitAll(),
};
$('#dock').addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  unlockAudio();
  b.classList.remove('fresh');
  ACTIONS[b.dataset.action]?.();
});
$('#btnSound').addEventListener('click', () => {
  unlockAudio();
  state.settings.sound = !state.settings.sound;
  setSoundEnabled(state.settings.sound);
  persist();
  updateSoundBtn();
});
$('#btnSettings').addEventListener('click', () => app.panels.settings());
$$('.hud [data-open]').forEach((b) => b.addEventListener('click', () => app.log.show(b.dataset.open)));
$('#missionCard').addEventListener('click', () => app.log.show('missions'));

// ------------------------------------------------------------- keyboard
document.addEventListener('keydown', (e) => {
  const typing = e.target.closest?.('input, textarea, select');
  if (e.key === 'Escape') {
    if (typing) { e.target.blur(); return; }
    if (isPopoverOpen()) hidePopover();
    else if (isModalOpen()) closeModal();
    else if (app.drift.isOn()) app.drift.stop();
    else if (app.panels.cardOpen()) app.panels.closeStarCard();
    else if (app.forge.isOpen()) app.forge.close();
    else if (app.galaxy.isOpen()) app.galaxy.close();
    else if (app.log.isOpen()) app.log.close();
    return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey || isModalOpen() || !document.body.classList.contains('live')) return;
  const unlocked = (k) => !!state.hints[`unlock:${k}`];
  const k = e.key.toLowerCase();
  if (k === 'f' && unlocked('forge')) app.forge.toggle();
  else if (k === 'g' && unlocked('galaxy')) app.galaxy.toggle();
  else if (k === 'e' && unlocked('eclipse')) app.eclipse.start();
  else if (k === 'd' && unlocked('drift')) app.drift.start();
  else if (k === 'l') app.log.toggle();
  else if (k === 'n') app.panels.addWordDialog();
  else if (k === '0') space.fitAll();
  else if (k === 's' && app.forge.isOpen()) app.forge.shuffle();
  else if (k === 'v' && app.forge.isOpen()) app.forge.speak();
  else return;
  e.preventDefault();
});

window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

// ---------------------------------------------------------------- start
function enterLive({ returning = false } = {}) {
  document.body.classList.add('live');
  $('#hud').hidden = false;
  $('#dock').hidden = false;
  $('#missionCard').hidden = false;
  space.setMode('live');
  updateSoundBtn();
  updateHud();
  updateDock();
  updateMissionCard();
  if (returning) {
    space.jumpTo(0, 0, 0.12);
    space.fitAll({ dur: 2400 });
    setTimeout(() => toast({
      kind: 'signal', title: 'Welcome back, traveller',
      body: `${derived.litCount} stars lit · ${formatBig(derived.reach)} sentences within reach. ${nextMissionLine()}`,
    }), 1200);
  }
}

function begin() {
  if (derived.litCount > 0) { enterLive({ returning: true }); return; }
  document.body.classList.remove('live');
  $('#hud').hidden = true;
  $('#dock').hidden = true;
  $('#missionCard').hidden = true;
  space.setMode('genesis');
  runGenesis((id) => {
    setTimeout(() => enterLive(), 900);
    // after the fly-in, drift back so the first neighbours come into view
    setTimeout(() => revealAround(id, { maxZ: 1.0, dur: 2200 }), 3300);
  });
}

app.onUniverseReplaced = () => {
  app.forge.close();
  app.galaxy.close();
  app.log.close();
  app.panels.closeStarCard();
  if (app.drift.isOn()) app.drift.stop();
  begin();
};

begin();
