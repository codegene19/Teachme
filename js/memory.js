// Spaced review. Each lit word has a schedule: it comes due one day after
// you light it; recalling it correctly pushes the next review further out
// (×2, then ×2.5, up to six months); a miss brings it back within hours.
// Overdue stars dim on the map until you review them.

import { state, derived } from './store.js';

const DAY = 864e5;
const reviewable = (w) => w && w.lit && !w.character;

// Stars lit before reviews existed don't all come due at once: their first
// reviews are spread over the five days after the feature arrived.
function since() {
  if (!state.memSince) state.memSince = Date.now();
  return state.memSince;
}
function firstDue(w) {
  const lit = w.litAt || since();
  const base = lit < since() ? since() + ((w.order || 0) % 10) * DAY / 2 : lit;
  return base + DAY;
}

/** The word's schedule, created on first use (due one day after it was lit). */
export function mem(w) {
  if (!w.mem) w.mem = { interval: 1, due: firstDue(w), reps: 0 };
  return w.mem;
}

/** Record an active recall: right or wrong. */
export function grade(id, good) {
  const w = state.words[id];
  if (!reviewable(w)) return;
  const m = mem(w);
  if (good) {
    m.interval = Math.min(180, m.reps ? m.interval * 2.5 : Math.max(1, m.interval * 2));
    m.reps += 1;
  } else {
    m.interval = 0.25;
    m.reps = 0;
  }
  m.due = Date.now() + m.interval * DAY;
  m.last = Date.now();
}

/** Lit words due for review, most overdue first. */
export function dueIds(now = Date.now()) {
  return derived.list
    .filter((w) => reviewable(w) && (w.mem ? w.mem.due : firstDue(w)) <= now)
    .sort((a, b) => (a.mem ? a.mem.due : firstDue(a)) - (b.mem ? b.mem.due : firstDue(b)))
    .map((w) => w.id);
}

/** 1 for a fresh memory, fading towards 0.3 as the word becomes overdue. */
export function brightness(w, now = Date.now()) {
  if (!reviewable(w) || !w.litAt) return 1;
  const due = w.mem ? w.mem.due : firstDue(w);
  const interval = (w.mem ? w.mem.interval : 1) * DAY;
  const over = now - due;
  return over <= 0 ? 1 : Math.max(0.3, 1 - over / (interval * 2));
}

/** "in 3 days", "now", "overdue 2 days" — for the star card. */
export function dueLabel(w, now = Date.now()) {
  if (!reviewable(w)) return '';
  const due = w.mem ? w.mem.due : firstDue(w);
  const days = (due - now) / DAY;
  const fmt = (d) => (d < 1 ? `${Math.max(1, Math.round(d * 24))} h` : `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`);
  if (days > 0) return `review in ${fmt(days)}`;
  return days > -0.04 ? 'due for review' : `overdue ${fmt(-days)}`;
}
