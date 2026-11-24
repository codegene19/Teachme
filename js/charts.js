// Small inline-SVG charts for the Logbook: a growth line and a stacked bar
// series. Thin marks, recessive axes, a hover tooltip, and a table view.

import { h } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
  kids.flat().forEach((c) => c && el.append(c));
  return el;
};
const W = 320, H = 132, PAD = { l: 30, r: 8, t: 10, b: 20 };
const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
const short = (day) => { const [, m, d] = day.split('-'); return `${+d}/${+m}`; };
const longDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= v);
}

function axes(max, data) {
  const g = s('g', { class: 'axes' });
  for (const f of [0, 0.5, 1]) {
    const y = PAD.t + plotH - f * plotH;
    g.append(s('line', { x1: PAD.l, x2: W - PAD.r, y1: y, y2: y, class: f ? 'grid' : 'base' }));
    g.append(s('text', { x: PAD.l - 6, y: y + 3.5, 'text-anchor': 'end' }, String(Math.round(max * f))));
  }
  const step = plotW / data.length;
  [0, Math.floor((data.length - 1) / 2), data.length - 1].forEach((i, k) => {
    g.append(s('text', { x: PAD.l + step * (i + 0.5), y: H - 5, 'text-anchor': ['start', 'middle', 'end'][k] }, short(data[i].day)));
  });
  return g;
}

function frame(svg, title, legend, table, tipFor, xAt) {
  const tip = h('div', { class: 'chart-tip', hidden: true });
  const wrap = h('figure', { class: 'chart' },
    h('figcaption', {}, h('b', {}, title), legend),
    h('div', { class: 'chart-plot' }, svg, tip),
    h('details', { class: 'chart-table' }, h('summary', {}, 'Show as table'), table));
  const cross = s('line', { class: 'cross', y1: PAD.t, y2: PAD.t + plotH, visibility: 'hidden' });
  svg.append(cross);
  const move = (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = xAt(x);
    if (i < 0) { leave(); return; }
    const cx = PAD.l + (plotW / tipFor.n) * (i + 0.5);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    tip.replaceChildren(...tipFor(i));
    tip.hidden = false;
    const px = (cx / W) * r.width;
    tip.style.left = `${Math.min(Math.max(px, 60), r.width - 60)}px`;
  };
  const leave = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', leave);
  return wrap;
}

const indexAt = (n) => (x) => (x < PAD.l || x > W - PAD.r ? -1 : Math.min(n - 1, Math.floor(((x - PAD.l) / plotW) * n)));

/** A single growing line, e.g. stars lit over time. */
export function lineChart({ title, data, unit }) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const step = plotW / data.length;
  const X = (i) => PAD.l + step * (i + 0.5);
  const Y = (v) => PAD.t + plotH - (v / max) * plotH;
  const pts = data.map((d, i) => `${X(i).toFixed(1)},${Y(d.value).toFixed(1)}`);
  const last = data[data.length - 1];
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${title}: ${last.value} ${unit} today, ${data[0].value} ${data.length} days ago` },
    axes(max, data),
    s('path', { class: 'area', d: `M${X(0)},${PAD.t + plotH} L${pts.join(' L')} L${X(data.length - 1)},${PAD.t + plotH} Z` }),
    s('polyline', { class: 'line', points: pts.join(' ') }),
    s('circle', { class: 'dot', cx: X(data.length - 1), cy: Y(last.value), r: 4 }),
    s('text', { class: 'end-label', x: X(data.length - 1) - 7, y: Y(last.value) - 8, 'text-anchor': 'end' }, String(last.value)));
  const tipFor = (i) => [h('b', {}, `${data[i].value} ${unit}`), h('span', {}, longDay(data[i].day))];
  tipFor.n = data.length;
  const table = h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Day'), h('th', {}, unit))),
    h('tbody', {}, data.slice().reverse().map((d) => h('tr', {}, h('td', {}, longDay(d.day)), h('td', {}, String(d.value))))));
  return frame(svg, title, null, table, tipFor, indexAt(data.length));
}

/** Stacked bars: right answers (accent) under missed ones (neutral). */
export function answerBars({ title, data }) {
  const max = niceMax(Math.max(...data.map((d) => d.total), 1));
  const step = plotW / data.length;
  const bw = Math.max(4, Math.min(14, step - 4));
  const Y = (v) => (v / max) * plotH;
  const g = s('g', {});
  data.forEach((d, i) => {
    const x = PAD.l + step * (i + 0.5) - bw / 2;
    const base = PAD.t + plotH;
    const hr = Y(d.right), hm = Y(d.total - d.right);
    // rounded data-end only on the top segment; 2px surface gap between segments
    const top = (y, hh, cls) => s('path', { class: cls, d: `M${x},${y + hh} V${y + Math.min(3, hh)} Q${x},${y} ${x + Math.min(3, bw / 2)},${y} H${x + bw - Math.min(3, bw / 2)} Q${x + bw},${y} ${x + bw},${y + Math.min(3, hh)} V${y + hh} Z` });
    if (hr > 0) g.append(hm > 0 ? s('rect', { class: 'bar-right', x, y: base - hr, width: bw, height: hr }) : top(base - hr, hr, 'bar-right'));
    if (hm > 0) g.append(top(base - hr - hm - (hr > 0 ? 2 : 0), hm, 'bar-miss'));
  });
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${title}: ${data.reduce((a, d) => a + d.total, 0)} answers in ${data.length} days` }, axes(max, data), g);
  const tipFor = (i) => {
    const d = data[i];
    return [h('b', {}, d.total ? `${d.right} of ${d.total} right` : 'No practice'), h('span', {}, longDay(d.day))];
  };
  tipFor.n = data.length;
  const legend = h('span', { class: 'legend' },
    h('span', {}, h('i', { class: 'sw right' }), 'Right'),
    h('span', {}, h('i', { class: 'sw miss' }), 'Missed'));
  const table = h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Day'), h('th', {}, 'Right'), h('th', {}, 'Answers'))),
    h('tbody', {}, data.slice().reverse().map((d) => h('tr', {}, h('td', {}, longDay(d.day)), h('td', {}, String(d.right)), h('td', {}, String(d.total))))));
  return frame(svg, title, legend, table, tipFor, indexAt(data.length));
}
