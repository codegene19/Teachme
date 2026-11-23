// Small DOM toolkit: element builder, icons, toasts, popovers, modals.

export const app = {};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText = v;
        else for (const s in v) s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s]);
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  appendKids(el, kids);
  return el;
}

function appendKids(el, kids) {
  const add = (kid) => {
    if (kid == null || kid === false || kid === true) return;
    if (Array.isArray(kid)) kid.forEach(add);
    else el.append(kid.nodeType ? kid : String(kid));
  };
  kids.forEach(add);
}

/** Replace an element's children, skipping null/false and flattening arrays. */
export function fill(el, ...kids) {
  el.replaceChildren();
  appendKids(el, kids);
  return el;
}

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  forge: '<path d="M5 18l4-8 6 3 4-8"/><circle cx="5" cy="18" r="1.7"/><circle cx="9" cy="10" r="1.7"/><circle cx="15" cy="13" r="1.7"/><circle cx="19" cy="5" r="1.7"/>',
  galaxy: '<path d="M12 12c0-1.5 1.8-2.2 3-1.2 1.8 1.5.6 4.6-2 5-3.6.6-6-2.6-5.2-6C8.8 5.4 13.4 3.6 17 5.6c4.4 2.4 4.6 8.8.6 12-4.6 3.6-11.8 1.8-14-3.8"/>',
  drift: '<circle cx="17" cy="7" r="3"/><path d="M14.8 9.2L4 20M12.4 6.4L6.5 12.3M17.6 11.6L11.7 17.5"/>',
  log: '<path d="M6 4h10a3 3 0 0 1 3 3v13H9a3 3 0 0 1-3-3V4z"/><path d="M6 17a3 3 0 0 1 3-3h10"/>',
  fit: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  speak: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  shuffle: '<path d="M3 7h3.5c5 0 6 10 11 10H21M3 17h3.5c1.8 0 3-1.3 4-3M13.5 10c1-1.7 2.2-3 4-3H21"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  chimes: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  mute: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/>',
  eclipse: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16c-2.6-1.9-4-4.9-4-8s1.4-6.1 4-8z" fill="currentColor" stroke="none"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  orbit: '<circle cx="12" cy="12" r="2.4"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-24 12 12)"/>',
  pin: '<circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/>',
};

export function icon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'ico';
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return span;
}

export function hexA(hex, a) {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ------------------------------------------------------------------ toasts
const KICKERS = {
  signal: '◌ Incoming transmission',
  mission: '✦ Mission complete',
  sector: '◎ New sector discovered',
  sighting: '✧ Constellation sighted',
  info: '·',
  warn: '△ Notice',
};

export function toast({ kind = 'signal', title, body, action, timeout = 6000, color } = {}) {
  const box = $('#toasts');
  if (!box) return;
  const max = window.innerWidth < 720 ? 2 : 3;
  while (box.children.length >= max) box.firstElementChild.remove();
  let timer = null;
  const el = h('div', { class: `toast toast-${kind}`, role: 'status', style: color ? { '--c': color } : null },
    h('div', { class: 'toast-kicker' }, KICKERS[kind] || ''),
    title && h('div', { class: 'toast-title' }, title),
    body && h('div', { class: 'toast-body' }, body),
    action && h('button', { class: 'toast-action', onclick: () => { dismiss(); action.fn(); } }, action.label, icon('arrow', 14)),
    h('button', { class: 'toast-x', 'aria-label': 'Dismiss', onclick: () => dismiss() }, icon('close', 14)));
  function dismiss() {
    clearTimeout(timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }
  box.append(el);
  timer = setTimeout(dismiss, timeout);
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  el.addEventListener('pointerleave', () => { clearTimeout(timer); timer = setTimeout(dismiss, 2500); });
  return dismiss;
}

// A quiet line of text that floats above the dock — used for discoveries.
let captionTimer = null;
export function caption(word, label, color) {
  const el = $('#caption');
  if (!el) return;
  fill(el, h('span', { class: 'cap-word' }, word), label ? h('span', { class: 'cap-label' }, label) : null);
  el.style.setProperty('--c', color || '#fff');
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------- popovers
let popAnchor = null;
let popOnClose = null;
export function showPopover(anchor, content, { onClose } = {}) {
  const pop = $('#popover');
  pop.replaceChildren(content);
  pop.hidden = false;
  popAnchor = anchor;
  popOnClose = onClose || null;
  positionPopover();
}
export function positionPopover() {
  const pop = $('#popover');
  if (pop.hidden || !popAnchor || !popAnchor.isConnected) return;
  const r = popAnchor.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const x = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left + r.width / 2 - pw / 2));
  let y = r.top - ph - 10;
  if (y < 12) y = Math.min(window.innerHeight - ph - 12, r.bottom + 10);
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
}
export function hidePopover() {
  const pop = $('#popover');
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  popAnchor = null;
  const f = popOnClose;
  popOnClose = null;
  f?.();
}
export const isPopoverOpen = () => !$('#popover').hidden;

document.addEventListener('pointerdown', (e) => {
  const pop = $('#popover');
  if (!pop || pop.hidden) return;
  if (pop.contains(e.target)) return;
  if (popAnchor && popAnchor.isConnected && popAnchor.contains(e.target)) return;
  hidePopover();
}, true);
window.addEventListener('resize', () => positionPopover());

// ------------------------------------------------------------------ modals
let modalOnClose = null;
export function openModal({ kicker, title, body, footer, onClose, size = '' }) {
  const root = $('#modal');
  const box = h('div', { class: `modal ${size}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || kicker || 'Dialog' },
    h('button', { class: 'icon-btn modal-close', 'aria-label': 'Close', onclick: () => closeModal() }, icon('close')),
    kicker && h('div', { class: 'kicker' }, kicker),
    title && h('h2', { class: 'modal-title' }, title),
    h('div', { class: 'modal-body' }, body),
    footer && h('div', { class: 'modal-foot' }, footer));
  const prev = modalOnClose;
  modalOnClose = null;
  if (!root.hidden) prev?.();
  root.replaceChildren(box);
  root.hidden = false;
  modalOnClose = onClose || null;
  requestAnimationFrame(() => {
    root.classList.add('show');
    box.querySelector('[autofocus], input:not([type=checkbox]):not([type=range]):not([type=file])')?.focus();
  });
  return box;
}
export function closeModal() {
  const root = $('#modal');
  if (root.hidden) return;
  root.hidden = true;
  root.classList.remove('show');
  root.replaceChildren();
  const f = modalOnClose;
  modalOnClose = null;
  f?.();
}
export const isModalOpen = () => !$('#modal').hidden;
document.addEventListener('pointerdown', (e) => {
  const root = $('#modal');
  if (root && !root.hidden && e.target === root) closeModal();
});

// --------------------------------------------------------- number tweening
const tweens = new WeakMap();
export function countUp(el, to, format = (n) => String(n)) {
  if (!el) return;
  const from = Number(el.dataset.value || 0);
  el.dataset.value = String(to);
  if (from === to) { el.textContent = format(to); return; }
  cancelAnimationFrame(tweens.get(el));
  const t0 = performance.now();
  const dur = Math.min(1200, 400 + Math.log10(Math.abs(to - from) + 1) * 220);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = format(from + (to - from) * e);
    if (k < 1) tweens.set(el, requestAnimationFrame(step));
  };
  tweens.set(el, requestAnimationFrame(step));
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
