// Daily orbit: a five-minute mix each day — a few reviews, translations,
// one listening, one spoken sentence and one story. A ring in the top bar
// fills as you go; finished days glow on the calendar in Logbook → Progress.

import { state, commit, on } from './store.js';
import { app, h, fill, icon, toast, openModal, closeModal, $ } from './ui.js';
import { dayKey } from './progress.js';
import { dueIds } from './memory.js';
import { canListen } from './speakback.js';
import { arpeggio } from './sfx.js';

const DAY = 864e5;
const day = (k = dayKey()) => {
  if (!state.history) state.history = { days: {}, slips: {} };
  return (state.history.days[k] ||= { right: 0, total: 0 });
};

/** Today's plan, fixed the first time you look at it (so reviews don't move the goal). */
function plan() {
  const d = day();
  if (!d.plan) {
    d.plan = {
      review: Math.min(5, dueIds().length),
      translate: 3,
      listen: 1,
      speak: canListen() ? 1 : 0,
      story: 1,
    };
  }
  return d.plan;
}

const STEPS = [
  { id: 'review', label: 'Review fading stars', unit: 'stars', open: () => app.practice.open('review') },
  { id: 'translate', label: 'Translate sentences', unit: 'sentences', open: () => app.practice.open('translate') },
  { id: 'listen', label: 'Listen and build', unit: 'sentence', open: () => app.practice.open('listen') },
  { id: 'speak', label: 'Say a sentence aloud', unit: 'sentence', open: () => app.practice.open('translate'), how: 'After checking an answer, tap “Say it”.' },
  { id: 'story', label: 'Write a story', unit: 'story', how: 'Choose its steps through to the end.', open: () => { closeModal(); app.galaxy.storyMode(); } },
];

function doneOf(id, d = day()) {
  switch (id) {
    case 'review': return d.review || 0;
    case 'translate': return (d.translate || 0) + (d.focus || 0);
    case 'listen': return d.listen || 0;
    case 'speak': return d.spoken || 0;
    case 'story': return d.stories || 0;
    default: return 0;
  }
}

export function progress() {
  const p = plan();
  const steps = STEPS.filter((s) => p[s.id] > 0).map((s) => ({ ...s, need: p[s.id], done: Math.min(p[s.id], doneOf(s.id)) }));
  const need = steps.reduce((a, s) => a + s.need, 0);
  const done = steps.reduce((a, s) => a + s.done, 0);
  return { steps, need, done, pct: need ? done / need : 0, complete: need > 0 && done >= need };
}

/** Days in a row with the orbit complete, counting today or yesterday as the latest. */
export function orbitStreak() {
  const days = state.history?.days || {};
  let k = days[dayKey()]?.orbitDone ? 0 : 1;
  let n = 0;
  while (days[dayKey(Date.now() - k * DAY)]?.orbitDone) { n++; k++; }
  return n;
}

export function recordStory() {
  const d = day();
  d.stories = (d.stories || 0) + 1;
}

// ------------------------------------------------------------------ UI
function ring(pct, size = 22) {
  const r = (size - 4) / 2, c = 2 * Math.PI * r;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="2.4"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"
      stroke-dasharray="${(c * pct).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
  return svg;
}

let btn;
export function initDaily() {
  btn = h('button', { class: 'icon-btn daily-btn', id: 'btnDaily', onclick: () => open() });
  $('#btnSound').before(btn);
  on('change', update);
  app.daily = { open, progress, update };
  update();
}

function update() {
  if (!btn) return;
  const live = document.body.classList.contains('live') && app.practice?.available();
  btn.hidden = !live;
  if (!live) return;
  const p = progress();
  fill(btn, ring(p.pct), p.complete ? h('span', { class: 'daily-star' }, '✦') : null);
  btn.title = p.complete ? 'Daily orbit complete — see your calendar' : `Daily orbit: ${p.done} of ${p.need} (O)`;
  btn.setAttribute('aria-label', btn.title);
  btn.classList.toggle('complete', p.complete);
  const d = day();
  if (p.complete && !d.orbitDone) {
    d.orbitDone = true;
    commit();
    const streak = orbitStreak();
    setTimeout(() => {
      arpeggio(['who', 'action', 'thing', 'place', 'time'], 0.08);
      toast({ kind: 'orbit', title: 'Daily orbit complete', timeout: 9000, body: streak > 1 ? `${streak} days in a row. Your sky is brighter for it.` : 'Come back tomorrow to start a streak.', action: { label: 'Calendar', fn: () => app.log.show('progress') } });
    }, 600);
  }
}

export function open() {
  const p = progress();
  const next = p.steps.find((s) => s.done < s.need);
  openModal({
    kicker: 'Daily orbit', title: p.complete ? 'Orbit complete ✦' : 'Today’s five minutes', size: 'wide daily',
    body: h('div', { class: 'stack' },
      h('div', { class: 'daily-head' },
        h('div', { class: 'daily-ring' }, ring(p.pct, 64), h('b', {}, `${Math.round(p.pct * 100)}%`)),
        h('div', {},
          h('p', { class: 'lede' }, p.complete ? 'Everything for today is done. Keep going if you like — it all counts.' : 'A little of everything, every day: that’s what keeps words bright.'),
          h('p', { class: 'lede dim' }, `Orbit streak: ${orbitStreak()} day${orbitStreak() === 1 ? '' : 's'}`))),
      h('ol', { class: 'daily-steps' }, p.steps.map((s) => h('li', { class: s.done >= s.need ? 'done' : '' },
        h('span', { class: 'check' }, s.done >= s.need ? '✦' : '○'),
        h('div', { class: 'daily-main' },
          h('b', {}, s.label),
          h('small', {}, `${s.done} / ${s.need} ${s.unit}${s.how && s.done < s.need ? ` · ${s.how}` : ''}`)),
        s.done < s.need ? h('button', { class: 'btn small', onclick: s.open }, 'Go', icon('arrow', 14)) : null))),
      canListen() ? null : h('p', { class: 'lede dim' }, 'Speaking needs Chrome, Edge or Safari, so it isn’t part of today’s orbit here.')),
    footer: [
      h('button', { class: 'btn ghost', onclick: () => { closeModal(); app.log.show('progress'); } }, 'Calendar'),
      h('span', { class: 'grow' }),
      next ? h('button', { class: 'btn primary', onclick: next.open }, p.done ? 'Continue' : 'Start', icon('arrow', 16)) : h('button', { class: 'btn primary', onclick: closeModal }, 'Done'),
    ],
  });
}

/** Last five weeks, Monday first: complete days glow, practice days glow faintly. */
export function calendar() {
  const days = state.history?.days || {};
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // Monday = 0
  const start = new Date(today.getTime() - (dow + 28) * DAY);
  const cells = [];
  for (let i = 0; i < 35; i++) {
    const t = new Date(start.getTime() + i * DAY);
    const k = dayKey(t.getTime());
    const d = days[k];
    const future = t > today;
    const cls = future ? 'future' : d?.orbitDone ? 'full' : d?.total || d?.spoken || d?.stories ? 'some' : '';
    const label = t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    cells.push(h('span', { class: `cal-day ${cls}${k === dayKey() ? ' today' : ''}`, title: `${label}${d?.orbitDone ? ' · orbit complete' : d?.total ? ` · ${d.total} answers` : ''}`, 'aria-label': label }, String(t.getDate())));
  }
  return h('figure', { class: 'calendar' },
    h('figcaption', {}, h('b', {}, 'Daily orbit · last 5 weeks'),
      h('span', { class: 'legend' }, h('span', {}, h('i', { class: 'sw full' }), 'Complete'), h('span', {}, h('i', { class: 'sw some' }), 'Practised'))),
    h('div', { class: 'cal-head' }, ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => h('span', {}, x))),
    h('div', { class: 'cal-grid' }, cells));
}
