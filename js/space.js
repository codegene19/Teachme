// The sky. A canvas renderer with a pannable, zoomable camera: parallax
// starfield, sector nebulae, word-stars, discovery threads, constellation
// lines, and the glowing path of the sentence you're building.

import { state, derived, anchorOf, hashStr } from './store.js';
import { hexA } from './ui.js';

const TAU = Math.PI * 2;
const Z_MIN = 0.12, Z_MAX = 2.6;
const clampZ = (z) => Math.max(Z_MIN, Math.min(Z_MAX, z));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
const UNLIT = '#8a93b8';
const FONT = '"Space Grotesk", system-ui, sans-serif';

export function starRadius(w) {
  return 3.3 + Math.min(5.5, Math.log2(1 + (w.seen || 0)) * 0.9);
}

export function createSpace(canvas, handlers = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const cam = { x: 0, y: 0, z: 0.8 };
  const insets = { top: 0, bottom: 0, right: 0 };
  let tween = null;
  let inertia = null;
  let mode = 'genesis';
  let hover = null;
  let selected = null;
  let path = null;
  let lastNow = 0;
  let time = 0;
  const effects = [];
  const sprites = new Map();
  const nebulas = new Map();
  const litAnim = new Map();
  const arriveAnim = new Map(); // id -> time its meteor lands
  const nebulaAnim = new Map();
  const bgOff = { x: 0, y: 0 };
  let prevCam = { x: 0, y: 0 };
  const warp = { x: 0, y: 0 };

  const layers = [
    { n: 420, p: 0.025, s: 0.8, a: 0.4 },
    { n: 170, p: 0.07, s: 1.1, a: 0.6 },
    { n: 60, p: 0.15, s: 1.7, a: 0.9 },
  ].map((L) => ({
    ...L,
    stars: Array.from({ length: L.n }, () => ({
      x: Math.random(), y: Math.random(), ph: Math.random() * TAU, sp: 0.3 + Math.random() * 1.6, tint: Math.random(),
    })),
  }));

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const w2s = (x, y) => [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2];
  const s2w = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];

  function sprite(color) {
    let c = sprites.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, hexA(color, 1));
    grd.addColorStop(0.1, hexA(color, 0.6));
    grd.addColorStop(0.3, hexA(color, 0.17));
    grd.addColorStop(0.62, hexA(color, 0.04));
    grd.addColorStop(1, hexA(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    sprites.set(color, c);
    return c;
  }

  function nebula(color) {
    let c = nebulas.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, hexA(color, 0.5));
    grd.addColorStop(0.35, hexA(color, 0.2));
    grd.addColorStop(0.7, hexA(color, 0.05));
    grd.addColorStop(1, hexA(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    nebulas.set(color, c);
    return c;
  }

  const colorOf = (w) => state.categories[w.cat]?.color || UNLIT;
  const visible = (w) => w.lit || derived.discoverable.has(w.id);
  const phase = (id) => (hashStr(id) % 1000) / 1000 * TAU;

  // ------------------------------------------------------------ camera
  function updateCamera(now, dt) {
    if (tween) {
      const t = Math.min(1, (now - tween.t0) / tween.dur);
      const e = easeInOut(t);
      cam.x = lerp(tween.from.x, tween.to.x, e);
      cam.y = lerp(tween.from.y, tween.to.y, e);
      cam.z = Math.exp(lerp(Math.log(tween.from.z), Math.log(tween.to.z), e));
      if (t >= 1) { const done = tween.done; tween = null; done?.(); }
    } else if (inertia) {
      cam.x -= (inertia.vx * dt) / cam.z;
      cam.y -= (inertia.vy * dt) / cam.z;
      const k = Math.pow(0.9, dt / 16);
      inertia.vx *= k;
      inertia.vy *= k;
      if (Math.hypot(inertia.vx, inertia.vy) < 0.01) inertia = null;
    }
    const dx = (cam.x - prevCam.x) * cam.z;
    const dy = (cam.y - prevCam.y) * cam.z;
    bgOff.x += dx;
    bgOff.y += dy;
    warp.x = warp.x * 0.82 + dx * 0.18;
    warp.y = warp.y * 0.82 + dy * 0.18;
    prevCam = { x: cam.x, y: cam.y };
  }

  // ---------------------------------------------------------- drawing
  function drawBackground() {
    const area = Math.max(0.35, Math.min(1.6, (W * H) / (1440 * 900)));
    const speed = Math.hypot(warp.x, warp.y);
    const streak = speed > 5;
    for (const L of layers) {
      const count = Math.floor(L.n * area);
      const ox = bgOff.x * L.p, oy = bgOff.y * L.p;
      for (let i = 0; i < count; i++) {
        const s = L.stars[i];
        let x = (s.x * W - ox) % W; if (x < 0) x += W;
        let y = (s.y * H - oy) % H; if (y < 0) y += H;
        ctx.globalAlpha = L.a * (0.5 + 0.5 * Math.sin(time * s.sp + s.ph));
        const col = s.tint < 0.14 ? '#ffd9b0' : s.tint > 0.86 ? '#b4ccff' : '#eef2ff';
        if (streak) {
          ctx.strokeStyle = col;
          ctx.lineWidth = L.s;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + warp.x * L.p * 6, y + warp.y * L.p * 6);
          ctx.stroke();
        } else {
          ctx.fillStyle = col;
          ctx.fillRect(x, y, L.s, L.s);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawNebulae(now) {
    ctx.globalCompositeOperation = 'lighter';
    for (const c of Object.values(state.categories)) {
      if (!(derived.byCat[c.id] || []).length) continue;
      const t0 = nebulaAnim.get(c.id);
      const k = t0 ? Math.min(1, (now - t0) / 2600) : 1;
      const a = anchorOf(c);
      const [sx, sy] = w2s(a.x, a.y);
      const R = ((c.spread || 220) * 1.9 + 160) * cam.z;
      if (sx + R < 0 || sx - R > W || sy + R < 0 || sy - R > H) continue;
      const img = nebula(c.color);
      const hh = hashStr(c.id);
      const breathe = 0.9 + 0.1 * Math.sin(time * 0.25 + (hh % 7));
      const blobs = [[0, 0, 1, 0.2], [((hh % 9) - 4) / 14, ((hh >> 4) % 9 - 4) / 14, 0.68, 0.16], [((hh >> 8) % 9 - 4) / 12, ((hh >> 12) % 9 - 4) / 12, 0.55, 0.13]];
      for (const [ox, oy, sc, al] of blobs) {
        const r = R * sc;
        ctx.globalAlpha = al * k * breathe;
        ctx.drawImage(img, sx + ox * R - r, sy + oy * R - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawSectorLabels() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    for (const c of Object.values(state.categories)) {
      if (!(derived.byCat[c.id] || []).length) continue;
      const a = anchorOf(c);
      const top = c.radius === 0 ? (c.spread || 170) + 30 : (c.spread || 220) * 0.95 + 46;
      const [sx, sy] = w2s(a.x, a.y - top);
      if (sx < -200 || sx > W + 200 || sy < -40 || sy > H + 40) continue;
      const size = Math.max(10, Math.min(20, 9 + 9 * cam.z));
      ctx.font = `600 ${size}px ${FONT}`;
      ctx.fillStyle = hexA(c.color, cam.z < 0.55 ? 0.62 : 0.36);
      ctx.fillText(c.sector.toUpperCase(), sx, sy);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  function drawThreads() {
    const words = state.words;
    ctx.lineWidth = 1;
    // lit ↔ lit: the faint web of everything you know
    ctx.strokeStyle = 'rgba(190,200,255,0.055)';
    ctx.beginPath();
    for (const w of derived.list) {
      if (!w.lit) continue;
      for (const n of derived.adj.get(w.id) || []) {
        const o = words[n];
        if (!o.lit || o.order < w.order) continue;
        const [x1, y1] = w2s(w.x, w.y);
        const [x2, y2] = w2s(o.x, o.y);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();
    // lit → unlit: dotted threads toward undiscovered words
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = 'rgba(170,182,230,0.2)';
    ctx.beginPath();
    for (const w of derived.list) {
      if (!w.lit) continue;
      for (const n of derived.adj.get(w.id) || []) {
        if (!derived.discoverable.has(n)) continue;
        const o = words[n];
        const [x1, y1] = w2s(w.x, w.y);
        const [x2, y2] = w2s(o.x, o.y);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function polyline(ids) {
    const pts = [];
    for (const id of ids) {
      const w = state.words[id];
      if (!w) continue;
      const [x, y] = w2s(w.x, w.y);
      const last = pts[pts.length - 1];
      if (last && last.id === id) continue;
      pts.push({ x, y, id, color: colorOf(w) });
    }
    return pts;
  }

  function drawConstellations() {
    const list = Object.values(state.constellations);
    if (!list.length) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.11)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of list) {
      const pts = polyline(c.tokens.map((t) => t.wordId));
      if (pts.length < 2) continue;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      if (cam.z > 0.38) {
        let mx = 0, my = 0;
        pts.forEach((p) => { mx += p.x; my += p.y; });
        mx /= pts.length; my /= pts.length;
        ctx.font = `italic 300 ${Math.max(11, Math.min(15, 12 * cam.z))}px Fraunces, Georgia, serif`;
        ctx.fillStyle = 'rgba(225,230,255,0.3)';
        ctx.fillText(c.name, mx, my);
      }
    }
  }

  function drawPath() {
    if (!path || !path.ids.length) return;
    const pts = polyline(path.ids);
    if (!pts.length) return;
    ctx.globalCompositeOperation = 'lighter';
    if (pts.length > 1) {
      for (const [lw, al] of [[7, 0.07], [3, 0.16], [1.4, 0.8]]) {
        ctx.lineWidth = lw;
        for (let i = 0; i + 1 < pts.length; i++) {
          const a = pts[i], b = pts[i + 1];
          const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          g.addColorStop(0, hexA(a.color, al));
          g.addColorStop(1, hexA(b.color, al));
          ctx.strokeStyle = g;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      // pulses of light travelling along the sentence
      const lens = [];
      let total = 0;
      for (let i = 0; i + 1 < pts.length; i++) {
        const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        lens.push(l);
        total += l;
      }
      if (total > 0) {
        const white = sprite('#ffffff');
        for (let k = 0; k < 3; k++) {
          let d = ((time * 0.22 + k / 3) % 1) * total;
          let i = 0;
          while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
          const t = lens[i] ? d / lens[i] : 0;
          const x = lerp(pts[i].x, pts[i + 1].x, t), y = lerp(pts[i].y, pts[i + 1].y, t);
          ctx.globalAlpha = 0.85;
          ctx.drawImage(white, x - 14, y - 14, 28, 28);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (path.cursor >= 0 && path.ids[path.cursor]) {
      const w = state.words[path.ids[path.cursor]];
      if (w) {
        const [x, y] = w2s(w.x, w.y);
        const s = 60 + 10 * Math.sin(time * 6);
        ctx.drawImage(sprite(colorOf(w)), x - s, y - s, s * 2, s * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawStars(now) {
    const z = cam.z;
    const zs = 0.65 + 0.35 * Math.min(1.6, z);
    const drawn = [];
    ctx.globalCompositeOperation = 'lighter';
    for (const w of derived.list) {
      if (!visible(w)) continue;
      const [sx, sy] = w2s(w.x, w.y);
      if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
      const tw = 0.8 + 0.2 * Math.sin(time * 1.6 + phase(w.id));
      let r;
      if (w.lit) {
        let s = 1;
        const born = litAnim.get(w.id);
        if (born) {
          const t = (now - born) / 1000;
          if (t >= 1) litAnim.delete(w.id); else s = Math.max(0.01, easeOutBack(t));
        }
        r = starRadius(w) * zs * s;
        const g = r * 11;
        const spr = sprite(colorOf(w));
        ctx.globalAlpha = 0.95 * tw;
        ctx.drawImage(spr, sx - g, sy - g, g * 2, g * 2);
        const g2 = r * 3.4;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(spr, sx - g2, sy - g2, g2 * 2, g2 * 2);
      } else {
        let fade = 1;
        const land = arriveAnim.get(w.id);
        if (land) {
          if (now < land) continue; // its meteor is still on the way
          fade = Math.min(1, (now - land) / 700);
          if (fade >= 1) arriveAnim.delete(w.id);
        }
        r = 1.6 * zs;
        const g = 14 * zs * (1 + (1 - fade) * 2);
        ctx.globalAlpha = 0.45 * tw * (0.4 + 0.6 * fade) + (1 - fade) * 0.5;
        ctx.drawImage(sprite(land ? colorOf(w) : UNLIT), sx - g, sy - g, g * 2, g * 2);
      }
      drawn.push({ w, sx, sy, r });
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const showLit = z > 0.2, showUnlit = z > 0.5;
    const fontSize = Math.max(10.5, Math.min(15, 9 + 4.2 * z));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const { w, sx, sy, r } of drawn) {
      const isHover = hover === w.id, isSel = selected === w.id;
      ctx.fillStyle = w.lit ? '#ffffff' : 'rgba(200,208,240,0.75)';
      ctx.beginPath();
      ctx.arc(sx, sy, w.lit ? Math.max(1.2, r * 0.5) : r * 0.7, 0, TAU);
      ctx.fill();
      if (isHover || isSel) {
        ctx.strokeStyle = hexA(colorOf(w), isSel ? 0.9 : 0.6);
        ctx.lineWidth = 1.2;
        if (isSel) ctx.setLineDash([3, 4]);
        ctx.lineDashOffset = -time * 8;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 9, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if ((w.lit ? showLit : showUnlit) || isHover || isSel) {
        ctx.font = `${w.lit ? 500 : 400} ${fontSize}px ${FONT}`;
        ctx.fillStyle = w.lit
          ? (isHover || isSel ? '#ffffff' : 'rgba(236,239,255,0.86)')
          : (isHover ? 'rgba(215,222,255,0.95)' : 'rgba(150,160,205,0.5)');
        ctx.fillText(w.text, sx, sy + r + 6);
        // the English meaning, once you are close enough to read it
        if (w.gloss && state.settings.gloss && (z > 0.85 || isHover || isSel)) {
          ctx.font = `italic 400 ${Math.max(10, fontSize - 2.5)}px Fraunces, Georgia, serif`;
          ctx.fillStyle = w.lit ? 'rgba(200,206,235,0.55)' : 'rgba(150,160,205,0.38)';
          ctx.fillText(w.gloss, sx, sy + r + 8 + fontSize);
        }
      }
    }
  }

  function drawEffects(now) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      const t = (now - e.t0) / e.dur;
      if (t >= 1) {
        effects.splice(i, 1);
        if (e.kind === 'meteor') effects.push({ kind: 'ring', x: e.x, y: e.y, color: e.color, t0: now, dur: 900, max: 70 });
        continue;
      }
      if (t < 0) continue;
      const [sx, sy] = w2s(e.x, e.y);
      if (e.kind === 'meteor') {
        // a streak falling from the upper left onto the star's position
        const k = t * t;
        const [x0, y0] = w2s(e.x - 900, e.y - 620);
        const hx = lerp(x0, sx, k), hy = lerp(y0, sy, k);
        const tail = 0.18;
        const tx = lerp(x0, sx, Math.max(0, k - tail)), ty = lerp(y0, sy, Math.max(0, k - tail));
        const grad = ctx.createLinearGradient(tx, ty, hx, hy);
        grad.addColorStop(0, hexA(e.color, 0));
        grad.addColorStop(1, hexA(e.color, 0.9));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.drawImage(sprite('#ffffff'), hx - 10, hy - 10, 20, 20);
        continue;
      }
      if (e.kind === 'ring') {
        const r = e.max * easeOut(t) * cam.z;
        ctx.strokeStyle = hexA(e.color, (1 - t) * 0.75);
        ctx.lineWidth = 2.2 * (1 - t) + 0.4;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, TAU);
        ctx.stroke();
      } else if (e.kind === 'flash') {
        const s = e.max * (0.4 + easeOut(t)) * cam.z;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.drawImage(sprite(e.color), sx - s, sy - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'spark') {
        const d = easeOut(t) * e.dist * cam.z;
        const x = sx + Math.cos(e.ang) * d, y = sy + Math.sin(e.ang) * d;
        ctx.globalAlpha = 1 - t;
        ctx.drawImage(sprite(e.color), x - 6, y - 6, 12, 12);
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    const dt = Math.min(50, now - (lastNow || now));
    lastNow = now;
    time = now / 1000;
    updateCamera(now, dt);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#010208';
    ctx.fillRect(0, 0, W, H);
    drawBackground();
    if (mode !== 'genesis') {
      drawNebulae(now);
      drawSectorLabels();
      drawThreads();
      drawConstellations();
      drawPath();
      drawStars(now);
    }
    drawEffects(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------- input
  function hitTest(sx, sy) {
    let best = null, bestD = Infinity;
    const zs = 0.65 + 0.35 * Math.min(1.6, cam.z);
    for (const w of derived.list) {
      if (!visible(w)) continue;
      const [x, y] = w2s(w.x, w.y);
      const d = Math.hypot(x - sx, y - sy);
      const r = w.lit ? starRadius(w) * zs : 2;
      const lim = Math.max(20, r + 12);
      const labelHit = Math.abs(x - sx) < 34 && sy > y && sy < y + r + 24;
      if ((d < lim || labelHit) && d < bestD) { best = w.id; bestD = d; }
    }
    return best;
  }

  function zoomAt(sx, sy, nz) {
    const [wx, wy] = s2w(sx, sy);
    cam.z = clampZ(nz);
    cam.x = wx - (sx - W / 2) / cam.z;
    cam.y = wy - (sy - H / 2) / cam.z;
  }

  const pointers = new Map();
  let drag = null;
  let pinch = null;
  // Double-click / double-tap, detected by hand so it works with fingers too.
  let lastTap = null;
  let pendingTap = null;
  const DOUBLE_MS = 380, DOUBLE_PX = 26;

  canvas.addEventListener('pointerdown', (e) => {
    if (mode === 'genesis') return;
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tween = null;
    inertia = null;
    if (pointers.size === 1) {
      drag = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0 };
      canvas.classList.add('grabbing');
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z, w: s2w(mx, my) };
      if (drag) drag.moved = true;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (mode === 'genesis') return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.z = clampZ(pinch.z * (d / pinch.d));
      cam.x = pinch.w[0] - (mx - W / 2) / cam.z;
      cam.y = pinch.w[1] - (my - H / 2) / cam.z;
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved) {
        cam.x = drag.cx - dx / cam.z;
        cam.y = drag.cy - dy / cam.z;
        const now = performance.now();
        const dtt = Math.max(1, now - drag.lt);
        drag.vx = drag.vx * 0.6 + ((e.clientX - drag.lx) / dtt) * 0.4;
        drag.vy = drag.vy * 0.6 + ((e.clientY - drag.ly) / dtt) * 0.4;
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit !== hover) {
        hover = hit;
        canvas.style.cursor = hit ? 'pointer' : '';
      }
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch) {
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        drag = { sx: p.x, sy: p.y, cx: cam.x, cy: cam.y, moved: true, lx: p.x, ly: p.y, lt: performance.now(), vx: 0, vy: 0 };
      } else drag = null;
      return;
    }
    if (!drag) return;
    canvas.classList.remove('grabbing');
    if (!drag.moved && e.type === 'pointerup') {
      const hit = hitTest(e.clientX, e.clientY);
      const now = performance.now();
      const isDouble = !!lastTap && now - lastTap.t < DOUBLE_MS && lastTap.id === hit
        && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_PX;
      lastTap = isDouble ? null : { t: now, x: e.clientX, y: e.clientY, id: hit };
      clearTimeout(pendingTap);
      if (hit && isDouble) handlers.onStarDouble?.(hit);
      else if (hit) {
        const w = state.words[hit];
        if (!w.lit) handlers.onUnlit?.(hit);
        // On a phone the star card slides over the map; hold it back for a
        // moment so a second tap can still reach the star.
        else if (e.pointerType === 'mouse') handlers.onStar?.(hit);
        else pendingTap = setTimeout(() => handlers.onStar?.(hit), DOUBLE_MS);
      } else if (isDouble) {
        const [wx, wy] = s2w(e.clientX, e.clientY);
        flyTo(wx, wy, cam.z * 1.8, 600);
      } else handlers.onBackground?.();
    } else if (performance.now() - drag.lt < 80 && Math.hypot(drag.vx, drag.vy) > 0.15) {
      inertia = { vx: drag.vx, vy: drag.vy };
    }
    drag = null;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { if (!drag && hover) { hover = null; canvas.style.cursor = ''; } });

  canvas.addEventListener('wheel', (e) => {
    if (mode === 'genesis') return;
    e.preventDefault();
    tween = null;
    const k = e.ctrlKey ? 0.012 : 0.0016;
    zoomAt(e.clientX, e.clientY, cam.z * Math.exp(-e.deltaY * k));
  }, { passive: false });


  // --------------------------------------------------------------- API
  function flyTo(x, y, z = cam.z, dur = 1000, done) {
    inertia = null;
    tween = { from: { ...cam }, to: { x, y, z: clampZ(z) }, t0: performance.now(), dur, done };
  }
  const visibleH = () => Math.max(160, H - insets.top - insets.bottom);
  const visibleW = () => Math.max(200, W - insets.right);
  // shift the target so it lands in the middle of the unobscured area
  const offsetY = (z) => (insets.bottom - insets.top) / 2 / z;
  const offsetX = (z) => insets.right / 2 / z;

  function focusWord(id, z, dur = 900) {
    const w = state.words[id];
    if (!w) return;
    const zz = clampZ(z ?? Math.max(cam.z, 1.1));
    flyTo(w.x + offsetX(zz), w.y + offsetY(zz), zz, dur);
  }

  function fitIds(ids, { maxZ = 1.35, minZ = Z_MIN, dur = 1100, pad = 80 } = {}) {
    const pts = ids.map((id) => state.words[id]).filter(Boolean);
    if (!pts.length) { flyTo(0, 0, 0.5, dur); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    const z = clampZ(Math.max(minZ, Math.min(maxZ, (visibleW() - pad * 2) / bw, (visibleH() - pad * 2) / bh)));
    flyTo((x0 + x1) / 2 + offsetX(z), (y0 + y1) / 2 + offsetY(z), z, dur);
  }

  function fitAll(opts) {
    const ids = derived.list.filter(visible).map((w) => w.id);
    fitIds(ids, { maxZ: 1.2, ...opts });
  }

  function jumpTo(x, y, z) {
    tween = null;
    inertia = null;
    cam.x = x; cam.y = y; cam.z = clampZ(z);
    prevCam = { x, y };
  }

  function burst(id, big = false) {
    const w = state.words[id];
    if (!w) return;
    const color = colorOf(w);
    const now = performance.now();
    effects.push({ kind: 'flash', x: w.x, y: w.y, color, t0: now, dur: 900, max: big ? 120 : 70 });
    effects.push({ kind: 'ring', x: w.x, y: w.y, color, t0: now, dur: 1400, max: big ? 320 : 150 });
    if (big) effects.push({ kind: 'ring', x: w.x, y: w.y, color, t0: now + 220, dur: 2200, max: 620 });
    const n = big ? 26 : 16;
    for (let i = 0; i < n; i++) {
      effects.push({ kind: 'spark', x: w.x, y: w.y, color, t0: now, dur: 900 + Math.random() * 700, ang: Math.random() * TAU, dist: 40 + Math.random() * (big ? 160 : 90) });
    }
  }

  function arrive(ids) {
    const now = performance.now();
    ids.forEach((id, i) => {
      const w = state.words[id];
      if (!w) return;
      const t0 = now + 200 + i * 160;
      const dur = 1100;
      effects.push({ kind: 'meteor', x: w.x, y: w.y, color: colorOf(w), t0, dur });
      arriveAnim.set(id, t0 + dur);
    });
  }

  function ripple(id) {
    const w = state.words[id];
    if (!w) return;
    effects.push({ kind: 'ring', x: w.x, y: w.y, color: colorOf(w), t0: performance.now(), dur: 800, max: 60 });
  }

  return {
    get cam() { return cam; },
    get mode() { return mode; },
    setMode(m) { mode = m; },
    setInsets(o) { Object.assign(insets, o); },
    setPath(ids) { path = ids && ids.length ? { ids: ids.slice(), cursor: path?.cursor ?? -1 } : null; },
    setCursor(i) { if (path) path.cursor = i; },
    setSelected(id) { selected = id; },
    markLit(id) { litAnim.set(id, performance.now()); },
    markNebula(cat) { nebulaAnim.set(cat, performance.now()); },
    flyTo, focusWord, fitIds, fitAll, jumpTo, burst, ripple, arrive,
    screenOf(id) { const w = state.words[id]; return w ? w2s(w.x, w.y) : null; },
    onScreen(id, margin = 60) {
      const w = state.words[id];
      if (!w) return false;
      const [x, y] = w2s(w.x, w.y);
      return x > margin && x < W - insets.right - margin && y > insets.top + margin && y < H - insets.bottom - margin;
    },
  };
}
