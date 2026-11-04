// WINDOW option (t198 / t200 / t209 / t210): the whole east space window can look out on a JUNGLE or a BEACH instead of space.
// HD painted views (t210): 5-7 parallax layers with atmospheric haze (far = bluer, lighter, flatter), sky gradients with sun /
// moon glow, volumetric clouds, light shafts, weather (sunny -> clouds -> rain -> clearing + rainbow -> sunset), drawn and shaded
// animals with walk cycles / wing flaps at three depths with ground shadows. Static layers are pre-rendered once per scene;
// only moving things are drawn per frame, ~20 fps, only while the window is on and the camera is in room 1.
export function setupWindows({ THREE, room, camera, HALF, H, DOOR_W, WX }) {
  const CYCLE = 240, DW = 2048, VW = HALF * 2, DH = Math.round(DW * H / VW), M = 170;   // design units; M = parallax margin
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  const Q = coarse ? Math.min(0.75, 0.42 * dpr) : 1;   // canvas scale: phones get a lighter canvas (texture upload is the cost)
  const PW = Math.round(DW * Q), PH = Math.round(DH * Q);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w * Q); c.height = Math.round(h * Q); const x = c.getContext('2d'); x.scale(Q, Q); return { c, x, w, h }; };
  const pano = document.createElement('canvas'); pano.width = PW; pano.height = PH; const px = pano.getContext('2d');
  const grp = new THREE.Group(); grp.name = 'roomWindows'; grp.visible = false; room.add(grp);
  const tex = new THREE.CanvasTexture(pano); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const view = new THREE.Mesh(new THREE.PlaneGeometry(VW, H).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: 0xdedede }));
  view.position.set(HALF - 0.02, H / 2, 0); view.name = 'windowPanorama'; grp.add(view);
  const wins = [{ g: view, tex, sc: 'pano', base: 0 }];
  // ---------- helpers ----------
  let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, R = (a, b) => a + rnd() * (b - a);
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k)), rgb = (a, al) => al == null ? 'rgb(' + a.join(',') + ')' : 'rgba(' + a.join(',') + ',' + al + ')';
  const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const HAZE = [178, 204, 226];
  function haze(L, k, col) { const x = L.x; x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgb(col || HAZE, k); x.fillRect(0, 0, L.w, L.h); x.restore(); }
  function ell(x, cx, cy, rx, ry, rot, fill) { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, 7); if (fill) { x.fillStyle = fill; x.fill(); } }
  function shade(x, cx, cy, r, c1, c2) { const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.1); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }
  // ---------- weather ----------
  let t0 = performance.now() / 1000, phaseOverride = null;
  function weather(t) { const p = phaseOverride != null ? phaseOverride : ((t - t0) % CYCLE + CYCLE) % CYCLE;
    const cloud = sm(40, 70, p) * (1 - sm(140, 170, p)), rain = sm(80, 95, p) * (1 - sm(130, 145, p)), sunset = sm(170, 195, p) * (1 - sm(225, 240, p));
    const rainbow = sm(138, 150, p) * (1 - sm(165, 178, p)), dusk = sm(188, 205, p) * (1 - sm(228, 240, p));
    const name = rain > 0.5 ? 'rain' : p >= 130 && p < 172 ? 'clearing' : cloud > 0.5 ? 'clouds' : sunset > 0.5 ? 'sunset' : 'sunny'; return { p, cloud, rain, sunset, rainbow, dusk, name }; }
  function skyCols(w) { let T = [52, 128, 222], B = [176, 220, 248]; T = mix(T, [84, 92, 110], w.cloud * 0.85); B = mix(B, [150, 158, 170], w.cloud * 0.85);
    T = mix(T, [58, 40, 112], w.sunset); B = mix(B, [255, 150, 80], w.sunset); return [T, B]; }
  function sky(x, w, horizon) { const [T, B] = skyCols(w), g = x.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, rgb(T)); g.addColorStop(0.65, rgb(mix(T, B, 0.6))); g.addColorStop(1, rgb(B)); x.fillStyle = g; x.fillRect(0, 0, DW, horizon + 4);
    const sx = 1500, sy = 120 + w.sunset * 200, a = 1 - w.cloud * 0.92;   // sun glow (low + orange at sunset), moon at dusk
    if (a > 0.04) { const gl = x.createRadialGradient(sx, sy, 10, sx, sy, 360); gl.addColorStop(0, w.sunset > 0.3 ? `rgba(255,190,110,${0.75 * a})` : `rgba(255,250,215,${0.7 * a})`); gl.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = gl; x.fillRect(sx - 360, sy - 360, 720, 720);
      x.globalAlpha = a; ell(x, sx, sy, 44 + w.sunset * 14, 44 + w.sunset * 14, 0, w.sunset > 0.3 ? '#ffb45a' : '#fff6c8'); x.globalAlpha = 1; }
    if (w.dusk > 0.05) { x.globalAlpha = w.dusk; ell(x, 420, 110, 30, 30, 0, '#f4f2e6'); ell(x, 432, 102, 26, 26, 0, rgb(mix(T, B, 0.2))); for (let i = 0; i < 40; i++) { const s = (i * 7919) % 1000; ell(x, (s * 2.05) % DW, (s * 0.31) % (horizon * 0.6), 1.6, 1.6, 0, '#fff'); } x.globalAlpha = 1; } }
  // volumetric clouds: pre-rendered sprites (lit top, shaded belly), light + storm versions crossfaded per frame
  function cloudSprite(dark) { const L = mk(520, 220), x = L.x; seed = dark ? 77 : 55;
    for (let i = 0; i < 34; i++) { const cx = R(70, 450), cy = R(90, 150) - Math.sin((cx - 70) / 380 * Math.PI) * 50, r = R(30, 62);
      const g = x.createRadialGradient(cx - r * 0.2, cy - r * 0.5, r * 0.1, cx, cy, r); g.addColorStop(0, dark ? 'rgba(150,154,166,.95)' : 'rgba(255,255,255,.98)'); g.addColorStop(0.7, dark ? 'rgba(96,100,114,.85)' : 'rgba(232,238,248,.9)'); g.addColorStop(1, dark ? 'rgba(70,74,88,0)' : 'rgba(205,215,232,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } return L; }
  let CL = null, CD = null;
  function clouds(x, t, w, horizon, par) { if (!CL) { CL = cloudSprite(false); CD = cloudSprite(true); } const n = 4 + Math.round(w.cloud * 6);
    for (let i = 0; i < n; i++) { const s = 0.55 + (i % 4) * 0.22, sp = 4 + (i % 3) * 3, cx = ((i * 431 + t * sp) % (DW + 700)) - 520 - par * 40 * s, cy = 20 + (i * 97) % (horizon * 0.45);
      x.globalAlpha = (0.55 + 0.45 * w.cloud) * (1 - w.rain * 0.2); x.drawImage(CL.c, cx, cy, 520 * s, 220 * s); if (w.cloud > 0.05) { x.globalAlpha = w.cloud * 0.9; x.drawImage(CD.c, cx, cy, 520 * s, 220 * s); } }
    x.globalAlpha = 1; if (w.sunset > 0.05) { x.fillStyle = `rgba(255,120,90,${0.18 * w.sunset})`; x.fillRect(0, 0, DW, horizon); } }
  function shafts(x, t, w, k) { const a = (1 - w.cloud) * (1 - w.rain) * k; if (a < 0.03) return; x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const sx = 900 + i * 230 + Math.sin(t * 0.2 + i) * 20, g = x.createLinearGradient(sx, 0, sx - 260, DH); g.addColorStop(0, `rgba(255,240,190,${0.16 * a})`); g.addColorStop(1, 'rgba(255,240,190,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + 60 + i * 8, 0); x.lineTo(sx - 200 + i * 8, DH); x.lineTo(sx - 330, DH); x.fill(); } x.restore(); }
  function rainFx(x, t, w, ground, water) { if (w.rain < 0.02) return; x.fillStyle = `rgba(28,34,48,${0.3 * w.rain})`; x.fillRect(0, 0, DW, DH);
    x.strokeStyle = `rgba(205,218,236,${0.5 * w.rain})`; x.lineWidth = 1.6; x.beginPath(); const n = 260 * w.rain;
    for (let i = 0; i < n; i++) { const rx = (i * 61.7 + t * 60) % DW, ry = (i * 37.3 + t * 900) % DH; x.moveTo(rx, ry); x.lineTo(rx - 6, ry + 22); } x.stroke();
    x.strokeStyle = `rgba(225,235,248,${0.55 * w.rain})`; x.lineWidth = 1.2; for (let i = 0; i < 40 * w.rain; i++) { const k = (t * 3 + i * 0.37) % 1, sx = (i * 211.3) % DW, sy = ground + (i * 53) % (DH - ground);
      x.beginPath(); x.ellipse(sx, sy, 3 + k * 16, 1 + k * 4, 0, 0, 7); x.globalAlpha = 1 - k; x.stroke(); } x.globalAlpha = 1;   // splashes / ripples
    if (water) for (let i = 0; i < 30 * w.rain; i++) { const k = (t * 1.6 + i * 0.29) % 1; x.beginPath(); x.ellipse((i * 157.7) % DW, water[0] + (i * 31) % (water[1] - water[0]), 4 + k * 26, 1.5 + k * 5, 0, 0, 7); x.globalAlpha = (1 - k) * 0.7; x.stroke(); } x.globalAlpha = 1;
    const g = x.createLinearGradient(0, ground, 0, DH); g.addColorStop(0, `rgba(200,220,240,0)`); g.addColorStop(1, `rgba(200,220,240,${0.14 * w.rain})`); x.fillStyle = g; x.fillRect(0, ground, DW, DH - ground); }   // wet sheen
  function rainbow(x, w, cx, cy) { if (w.rainbow < 0.03) return; x.save(); x.globalAlpha = 0.32 * w.rainbow; x.lineWidth = 16;
    ['#ff3b3b', '#ff9a2a', '#ffe94a', '#4ad34a', '#3a9aff', '#5a4aff', '#a040d8'].forEach((c, i) => { x.strokeStyle = c; x.beginPath(); x.arc(cx, cy, 720 - i * 15, Math.PI * 1.08, Math.PI * 1.92); x.stroke(); }); x.restore(); }
  function warm(x, w) { if (w.sunset > 0.02) { x.fillStyle = `rgba(255,112,40,${0.17 * w.sunset})`; x.fillRect(0, 0, DW, DH); } if (w.dusk > 0.02) { x.fillStyle = `rgba(20,16,60,${0.32 * w.dusk})`; x.fillRect(0, 0, DW, DH); } }
  // ---------- animals (drawn + shaded, animated) ----------
  const DEF = { tiger: { c1: '#f6a548', c2: '#b45a14', L: 150, Hh: 70, leg: 46, stripes: '#1a1008', belly: '#fff1d8', tail: 1 }, leopard: { c1: '#f2c46a', c2: '#a87a2a', L: 135, Hh: 60, leg: 44, spots: '#2a1a0a', belly: '#fff4dc', tail: 1 },
    elephant: { c1: '#9aa0a8', c2: '#5c6068', L: 230, Hh: 150, leg: 80, trunk: 1, ears: 1, tail: 0.4 }, rhino: { c1: '#a49a90', c2: '#5e564e', L: 200, Hh: 100, leg: 50, horn: 1, tail: 0.3 },
    giraffe: { c1: '#f0c060', c2: '#b07a2a', L: 150, Hh: 80, leg: 120, neck: 1, spots: '#7a4214', tail: 0.6 }, tapir: { c1: '#2c2c34', c2: '#121218', L: 150, Hh: 70, leg: 40, saddle: '#e8e8ea', snout: 1, tail: 0.1 },
    monkey: { c1: '#8a5a32', c2: '#4a2a12', L: 80, Hh: 50, leg: 40, face: '#e8c49a', curl: 1, tail: 1.4 }, peacock: { bird: 1, c1: '#1e5ad8', c2: '#0a2a7a', L: 70, Hh: 60, leg: 30 },
    parrot: { fly: 1, c1: '#e52a2a', c2: '#8a1010', wing: '#2a6ae8', beak: '#f2e6c0', L: 60 }, toucan: { fly: 1, c1: '#18181c', c2: '#000', wing: '#18181c', beak: '#ff9a1a', bib: '#fff', L: 60 },
    zebra: { c1: '#f6f6f2', c2: '#8a8a88', L: 150, Hh: 72, leg: 56, stripes: '#141414', tail: 0.6 }, capybara: { c1: '#b08454', c2: '#5e3e20', L: 115, Hh: 62, leg: 24, snout: 1, tail: 0 },
    macaw: { fly: 1, c1: '#2a8ae8', c2: '#0a3a8a', wing: '#f2c21a', beak: '#2a2a2a', L: 66 } };
  function leg(x, lx, top, len, ang, w, col) { x.save(); x.translate(lx, top); x.rotate(ang); x.fillStyle = col; x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.lineTo(w * 0.4, len); x.lineTo(-w * 0.4, len); x.fill(); ell(x, 0, len, w * 0.5, w * 0.28, 0, col); x.restore(); }
  function quad(x, d, ph, sleep) { const L = d.L, Hh = d.Hh, lg = d.leg, sw = sleep ? 0 : Math.sin(ph) * 0.42, bodyY = -lg - Hh * 0.45 + (sleep ? lg * 0.9 : Math.abs(Math.cos(ph)) * -3);
    const dark = d.c2; if (!sleep) { leg(x, -L * 0.32, bodyY + Hh * 0.2, lg + Hh * 0.25, -sw, L * 0.11, dark); leg(x, L * 0.3, bodyY + Hh * 0.2, lg + Hh * 0.25, sw, L * 0.11, dark); }   // far legs (darker)
    if (d.tail) { x.strokeStyle = d.c2; x.lineWidth = Math.max(3, L * 0.04); x.lineCap = 'round'; x.beginPath(); x.moveTo(-L * 0.48, bodyY - Hh * 0.1); const tw = Math.sin(ph * 0.5) * 12;
      if (d.curl) x.bezierCurveTo(-L * 0.9, bodyY + tw, -L * 1.1, bodyY - Hh * 1.2, -L * 0.8, bodyY - Hh * 1.1); else x.quadraticCurveTo(-L * 0.75, bodyY + Hh * 0.1 + tw, -L * (0.48 + 0.4 * d.tail), bodyY + Hh * 0.5 * d.tail + tw); x.stroke(); }
    ell(x, 0, bodyY, L * 0.52, Hh * 0.5, 0, shade(x, 0, bodyY, L * 0.5, d.c1, d.c2));
    if (d.belly) ell(x, 0, bodyY + Hh * 0.28, L * 0.36, Hh * 0.16, 0, d.belly);
    if (d.saddle) ell(x, -L * 0.05, bodyY - Hh * 0.02, L * 0.24, Hh * 0.46, 0, d.saddle);
    if (d.stripes) { x.strokeStyle = d.stripes; x.lineWidth = L * 0.03; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(i * L * 0.12, bodyY - Hh * 0.48); x.quadraticCurveTo(i * L * 0.12 + 8, bodyY - Hh * 0.1, i * L * 0.12 - 4, bodyY + Hh * 0.2); x.stroke(); } }
    if (d.spots && !d.neck) { x.fillStyle = d.spots; for (let i = 0; i < 14; i++) ell(x, ((i * 37) % 90 - 45) / 100 * L, bodyY + ((i * 23) % 60 - 32) / 100 * Hh, L * 0.035, L * 0.028, 0); x.fill(); }
    if (!sleep) { leg(x, -L * 0.28, bodyY + Hh * 0.25, lg + Hh * 0.2, sw, L * 0.12, d.c1); leg(x, L * 0.34, bodyY + Hh * 0.25, lg + Hh * 0.2, -sw, L * 0.12, d.c1); }
    let hx = L * 0.56, hy = bodyY - Hh * 0.22;
    if (d.neck) { x.fillStyle = shade(x, L * 0.5, bodyY - Hh, Hh, d.c1, d.c2); x.beginPath(); x.moveTo(L * 0.25, bodyY - Hh * 0.2); x.lineTo(L * 0.5, bodyY - Hh * 2.1); x.lineTo(L * 0.66, bodyY - Hh * 2.0); x.lineTo(L * 0.5, bodyY); x.fill();
      x.fillStyle = d.spots; for (let i = 0; i < 22; i++) { const u = (i * 0.618) % 1, v = (i * 0.371) % 1; ell(x, (-0.4 + v * 0.8) * L * (u < 0.5 ? 1 : 0.4) + (u < 0.5 ? 0 : L * 0.5), u < 0.5 ? bodyY + (v - 0.6) * Hh * 0.7 : bodyY - Hh * (0.3 + u * 1.6), L * 0.04, L * 0.035, 0.4); x.fill(); }
      hx = L * 0.66; hy = bodyY - Hh * 2.1; }
    if (d.trunk) { x.strokeStyle = d.c2; x.lineWidth = L * 0.06; x.beginPath(); x.moveTo(hx + L * 0.08, hy + Hh * 0.1); x.quadraticCurveTo(hx + L * 0.2, hy + Hh * 0.6 + sw * 10, hx + L * 0.14, hy + Hh * 0.95); x.stroke(); }
    ell(x, hx, hy, L * (d.trunk ? 0.17 : 0.14), Hh * (d.trunk ? 0.34 : 0.3), 0, shade(x, hx, hy, L * 0.15, d.c1, d.c2));
    if (d.ears) ell(x, hx - L * 0.1, hy, L * 0.12, Hh * 0.36, 0.1, d.c2);
    if (d.snout) ell(x, hx + L * 0.14, hy + Hh * 0.1, L * 0.07, Hh * 0.08, 0.3, d.c2);
    if (d.horn) { x.fillStyle = '#e6dccb'; x.beginPath(); x.moveTo(hx + L * 0.06, hy - Hh * 0.18); x.lineTo(hx + L * 0.12, hy - Hh * 0.6); x.lineTo(hx + L * 0.15, hy - Hh * 0.12); x.fill(); }
    if (d.face) ell(x, hx + L * 0.04, hy + 2, L * 0.08, Hh * 0.2, 0, d.face);
    if (d.stripes || d.spots) { ell(x, hx - L * 0.06, hy - Hh * 0.28, L * 0.04, L * 0.04, 0, d.c2); }
    ell(x, hx + L * 0.06, hy - Hh * 0.06, Math.max(1.5, L * 0.016), Math.max(1.5, L * 0.016), 0, sleep ? 'rgba(0,0,0,0)' : '#111');
    if (sleep) { x.strokeStyle = '#111'; x.lineWidth = 2; x.beginPath(); x.moveTo(hx + L * 0.03, hy - Hh * 0.06); x.lineTo(hx + L * 0.09, hy - Hh * 0.06); x.stroke(); } }
  function peacock(x, d, ph) { const sw = Math.sin(ph) * 0.4; leg(x, -6, -34, 34, -sw, 4, '#8a7a6a'); leg(x, 6, -34, 34, sw, 4, '#8a7a6a');
    x.save(); x.translate(-22, -44); for (let i = 0; i < 11; i++) { const a = Math.PI * (0.55 + i * 0.045); x.strokeStyle = '#1f7a4a'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 110, -Math.sin(a) * 30 + i * 2); x.stroke(); ell(x, Math.cos(a) * 110, -Math.sin(a) * 30 + i * 2, 6, 5, 0, '#2a3aa8'); ell(x, Math.cos(a) * 110, -Math.sin(a) * 30 + i * 2, 3, 2.5, 0, '#e8c020'); } x.restore();
    ell(x, 0, -48, 26, 18, -0.2, shade(x, 0, -48, 26, '#3a7aff', '#0a2a7a')); x.strokeStyle = '#1e5ad8'; x.lineWidth = 8; x.beginPath(); x.moveTo(14, -56); x.quadraticCurveTo(24, -78, 22, -96); x.stroke(); ell(x, 24, -98, 9, 8, 0, '#1e5ad8'); ell(x, 27, -100, 1.8, 1.8, 0, '#111'); x.fillStyle = '#d8c8a0'; x.beginPath(); x.moveTo(32, -98); x.lineTo(40, -96); x.lineTo(32, -94); x.fill(); }
  function bird(x, d, t, s) { const f = Math.sin(t * 14) ; ell(x, 0, 0, d.L * 0.45, d.L * 0.2, -0.1, shade(x, 0, 0, d.L * 0.4, d.c1, d.c2));
    x.fillStyle = d.c1; x.beginPath(); x.moveTo(-d.L * 0.4, -2); x.lineTo(-d.L * 0.95, 8 + f * 3); x.lineTo(-d.L * 0.85, 14); x.fill();   // tail
    if (d.bib) ell(x, d.L * 0.25, 2, d.L * 0.13, d.L * 0.12, 0, d.bib);
    ell(x, d.L * 0.38, -6, d.L * 0.16, d.L * 0.15, 0, d.c1); ell(x, d.L * 0.44, -9, 2.4, 2.4, 0, '#111');
    x.fillStyle = d.beak; x.beginPath(); x.moveTo(d.L * 0.5, -10); x.quadraticCurveTo(d.L * (d.bib ? 1.05 : 0.72), -6, d.L * (d.bib ? 0.95 : 0.6), 4); x.lineTo(d.L * 0.5, 0); x.fill();
    x.fillStyle = d.wing; x.beginPath(); x.moveTo(-d.L * 0.15, -4); x.quadraticCurveTo(d.L * 0.05, -4 - f * d.L * 0.8, d.L * 0.25, -6 - f * d.L * 0.7); x.lineTo(d.L * 0.15, -2); x.fill(); }
  // depths: 0 far (small, hazed), 1 mid, 2 near; ground line per depth comes from the scene
  const WALK = ['tiger', 'elephant', 'monkey', 'giraffe', 'tapir', 'rhino', 'leopard', 'peacock', 'zebra', 'capybara'], FLY = ['parrot', 'toucan', 'macaw'];
  const J = { walkers: [], next: 1.5, spawned: [] };
  function spawn(k) { k = k || [...WALK, ...WALK, ...FLY][Math.floor(Math.random() * (WALK.length * 2 + FLY.length))]; const d = DEF[k]; if (!d) return null; const dir = Math.random() < 0.5 ? 1 : -1;
    const depth = d.fly ? 1 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3), v = (d.fly ? 120 : k === 'elephant' || k === 'rhino' ? 38 : 60) * [0.45, 0.75, 1][depth];
    const a = { k, d, dir, depth, v, x: dir > 0 ? -300 : DW + 300, y: d.fly ? 140 + Math.random() * 200 : 0, born: performance.now() / 1000, ph: Math.random() * 6 }; J.walkers.push(a); J.spawned.push(k); return a; }
  function drawAnimal(x, a, t, gy, sc, hz, w, par) { const k = [0.25, 0.55, 1][a.depth], ox = a.x - par * M * k;
    x.save(); x.globalAlpha = 1 - hz * 0.7; x.translate(ox, a.d.fly ? a.y + Math.sin(t * 2 + a.born) * 16 : gy); x.scale(sc * (a.dir > 0 ? 1 : -1), sc);
    if (!a.d.fly) { const sl = 1 + w.sunset * 2.2; x.fillStyle = `rgba(0,0,0,${0.28 * (1 - w.cloud * 0.6)})`; x.beginPath(); x.ellipse(a.d.L * 0.25 * w.sunset * (a.dir > 0 ? -1 : 1), 2, a.d.L * 0.55 * sl, 7, 0, 0, 7); x.fill(); }   // ground shadow (long at sunset)
    if (a.d.fly) bird(x, a.d, t + a.born, sc); else if (a.d.bird) peacock(x, a.d, a.ph); else quad(x, a.d, a.ph, false); x.restore();
    if (hz > 0.02) { /* haze applied through a translucent veil drawn over far animals */ } }
  // ---------- JUNGLE (pre-rendered layers) ----------
  const GY = { j: [505, 600, 700], b: [0, 0, 0] };
  function fern(x, cx, cy, s, col) { x.strokeStyle = col; x.fillStyle = col; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.36; x.lineWidth = 3 * s; x.beginPath(); x.moveTo(cx, cy); const ex = cx + Math.cos(a) * 80 * s, ey = cy + Math.sin(a) * 70 * s; x.quadraticCurveTo(cx + Math.cos(a) * 50 * s, cy + Math.sin(a) * 60 * s - 20 * s, ex, ey); x.stroke();
      for (let j = 1; j < 8; j++) { const u = j / 8, lx = cx + (ex - cx) * u, ly = cy + (ey - cy) * u - Math.sin(u * Math.PI) * 14 * s; ell(x, lx, ly, 9 * s * (1 - u * 0.6), 3 * s, a + 1.2); x.fill(); ell(x, lx, ly, 9 * s * (1 - u * 0.6), 3 * s, a - 1.2); x.fill(); } } }
  function bigLeaf(x, cx, cy, s, a, c1, c2) { x.save(); x.translate(cx, cy); x.rotate(a); const g = x.createLinearGradient(0, -30 * s, 0, 30 * s); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g;
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(40 * s, -40 * s, 120 * s, -30 * s, 150 * s, 0); x.bezierCurveTo(120 * s, 30 * s, 40 * s, 40 * s, 0, 0); x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(0, 0); x.lineTo(150 * s, 0); x.stroke(); x.restore(); }
  function canopyTree(x, tx, ty, s, c1, c2, c3) { const tg = x.createLinearGradient(tx - 14 * s, 0, tx + 14 * s, 0); tg.addColorStop(0, '#2a1a0c'); tg.addColorStop(0.5, '#5a3a1e'); tg.addColorStop(1, '#22150a'); x.fillStyle = tg; x.fillRect(tx - 12 * s, ty - 200 * s, 24 * s, 200 * s);
    for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, r = R(40, 110) * s, cx = tx + Math.cos(a) * r * 1.3, cy = ty - 230 * s + Math.sin(a) * r * 0.6, rr = R(40, 70) * s; x.fillStyle = shade(x, cx, cy, rr, c1, c2); x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); }
    for (let i = 0; i < 8; i++) { x.fillStyle = c3; x.beginPath(); x.arc(tx + R(-90, 90) * s, ty - R(250, 320) * s, R(18, 32) * s, 0, 7); x.fill(); } }
  function palmTree(x, px0, py, s, t, sway, c1, c2) { const sw = Math.sin(t * 0.9 + px0) * 12 * s * sway, tx = px0 + 26 * s + sw * 0.4, ty = py - 260 * s;
    const tg = x.createLinearGradient(px0 - 10 * s, 0, px0 + 10 * s, 0); tg.addColorStop(0, '#6a4a28'); tg.addColorStop(1, '#a07a4a'); x.strokeStyle = tg; x.lineWidth = 16 * s; x.lineCap = 'round'; x.beginPath(); x.moveTo(px0, py); x.quadraticCurveTo(px0 + 40 * s, py - 140 * s, tx, ty); x.stroke();
    x.strokeStyle = 'rgba(40,24,10,.5)'; x.lineWidth = 2 * s; for (let i = 1; i < 12; i++) { const u = i / 12, bx = px0 + (40 * s) * 2 * u * (1 - u) + (tx - px0) * u * u, by = py + (-140 * s) * 2 * u * (1 - u) + (ty - py) * u * u; x.beginPath(); x.moveTo(bx - 8 * s, by); x.lineTo(bx + 8 * s, by - 3 * s); x.stroke(); }
    for (let i = 0; i < 9; i++) { const a = -Math.PI + i * Math.PI / 8 + Math.sin(t * 1.1 + i) * 0.05 * sway, len = (110 + (i % 3) * 20) * s, ex = tx + Math.cos(a) * len + sw, ey = ty + Math.sin(a) * len * 0.35 + len * 0.45;
      const g = x.createLinearGradient(tx, ty, ex, ey); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + Math.cos(a) * len * 0.5 + sw, ty + Math.sin(a) * len * 0.3 - 30 * s, ex, ey);
      x.quadraticCurveTo(tx + Math.cos(a) * len * 0.5 + sw, ty + Math.sin(a) * len * 0.3 - 6 * s, tx, ty + 6 * s); x.fill(); }
    for (const d of [-8, 7, 0]) ell(x, tx + d * s, ty + 10 * s, 8 * s, 8 * s, 0, '#5a3a1a'); }
  function veinLeaf(x, cx, cy, s, a, c1, c2) { bigLeaf(x, cx, cy, s, a, c1, c2); x.save(); x.translate(cx, cy); x.rotate(a); x.strokeStyle = 'rgba(255,255,230,.16)'; x.lineWidth = 1.2 * s;
    for (let i = 1; i < 7; i++) { const u = i * 21 * s; x.beginPath(); x.moveTo(u, 0); x.lineTo(u + 16 * s, -14 * s * (1 - i / 9)); x.moveTo(u, 0); x.lineTo(u + 16 * s, 14 * s * (1 - i / 9)); x.stroke(); }
    x.fillStyle = 'rgba(255,255,200,.12)'; x.beginPath(); x.moveTo(10 * s, -2 * s); x.bezierCurveTo(50 * s, -30 * s, 110 * s, -22 * s, 140 * s, -2 * s); x.lineTo(10 * s, -2 * s); x.fill(); x.restore(); }
  function monstera(x, cx, cy, s, a, c1, c2) { x.save(); x.translate(cx, cy); x.rotate(a); const g = x.createRadialGradient(-20 * s, -30 * s, 5, 0, 0, 90 * s); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g;
    x.beginPath(); x.ellipse(0, 0, 80 * s, 64 * s, 0, 0, 7); x.fill(); x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) { const an = -2.6 + i * 0.75; x.beginPath(); x.moveTo(Math.cos(an) * 30 * s, Math.sin(an) * 24 * s); x.lineTo(Math.cos(an - 0.06) * 90 * s, Math.sin(an - 0.06) * 72 * s); x.lineTo(Math.cos(an + 0.12) * 90 * s, Math.sin(an + 0.12) * 72 * s); x.fill(); if (i % 2) ell(x, Math.cos(an + 0.4) * 34 * s, Math.sin(an + 0.4) * 26 * s, 6 * s, 4 * s, an, '#000'); }
    x.globalCompositeOperation = 'source-over'; x.strokeStyle = 'rgba(230,255,200,.25)'; x.lineWidth = 2 * s; x.beginPath(); x.moveTo(-70 * s, 0); x.lineTo(70 * s, 0); x.stroke(); x.restore(); }
  function grass(x, x0, x1, y, h, col, n) { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < n; i++) { const gx = R(x0, x1), gy = y + R(-6, 6), hh = R(h * 0.4, h); x.moveTo(gx, gy); x.quadraticCurveTo(gx + R(-6, 6), gy - hh * 0.6, gx + R(-14, 14), gy - hh); } x.stroke(); }
  function mistBand(L, y, h, a) { const x = L.x, g = x.createLinearGradient(0, y - h, 0, y + h); g.addColorStop(0, 'rgba(230,240,240,0)'); g.addColorStop(0.5, `rgba(230,240,240,${a})`); g.addColorStop(1, 'rgba(230,240,240,0)'); x.fillStyle = g; x.fillRect(0, y - h, L.w, h * 2); }
  let JL = null;
  function buildJungle() { seed = 4242; const LW = DW + 2 * M, L = [];
    // L0 misty mountains + a smoking volcano
    let a = mk(LW, DH), x = a.x; for (const [base, amp, col, f] of [[330, 120, [120, 150, 180], 0.0022], [380, 90, [96, 128, 150], 0.004]]) { x.fillStyle = rgb(col); x.beginPath(); x.moveTo(0, DH); for (let i = 0; i <= LW; i += 12) x.lineTo(i, base - Math.abs(Math.sin(i * f + base)) * amp - Math.sin(i * f * 3.7) * amp * 0.25); x.lineTo(LW, DH); x.fill(); }
    x.fillStyle = 'rgb(110,120,140)'; x.beginPath(); x.moveTo(1180, 470); x.lineTo(1400, 210); x.lineTo(1470, 214); x.lineTo(1700, 470); x.fill(); ell(x, 1435, 210, 40, 8, 0, 'rgb(150,90,70)');
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(1400, 210); x.lineTo(1440, 260); x.lineTo(1420, 300); x.lineTo(1470, 214); x.fill();   // snowy cone ridge light
    haze(a, 0.45); mistBand(a, 450, 40, 0.5); L.push({ c: a.c, k: 0.06 });
    // L1 far tree line in haze
    a = mk(LW, DH); x = a.x; x.fillStyle = 'rgb(46,92,70)'; for (let i = 0; i < LW; i += 26) { x.beginPath(); x.arc(i, 470 - R(0, 40), R(26, 50), 0, 7); x.fill(); } x.fillRect(0, 470, LW, DH - 470); for (let i = 0; i < 14; i++) palmTree(x, R(0, LW), 480, R(0.45, 0.65), 0, 0, '#2e6a50', '#3e7a5c'); haze(a, 0.38); mistBand(a, 490, 30, 0.45); L.push({ c: a.c, k: 0.18 });
    // L1b a second, closer haze row of palms + broad trees for depth
    a = mk(LW, DH); x = a.x; for (let i = 0; i < 12; i++) canopyTree(x, R(0, LW), 540, R(0.45, 0.6), '#3e7a4a', '#24503a', '#4c8a56'); for (let i = 0; i < 9; i++) palmTree(x, R(0, LW), 545, R(0.7, 0.9), 0, 0, '#2a6a3a', '#4a8a4a'); haze(a, 0.26); mistBand(a, 540, 26, 0.35); L.push({ c: a.c, k: 0.27 });
    // L2 mid canopy + waterfall cliff
    a = mk(LW, DH); x = a.x; x.fillStyle = shade(x, 1560, 380, 260, '#6a6a62', '#33352e'); x.beginPath(); x.moveTo(1380, 560); x.lineTo(1420, 300); x.lineTo(1520, 260); x.lineTo(1700, 290); x.lineTo(1760, 560); x.fill();
    x.fillStyle = 'rgba(70,120,50,.7)'; for (let i = 0; i < 40; i++) ell(x, R(1390, 1750), R(290, 550), R(8, 20), R(5, 10), 0), x.fill();   // moss on the cliff
    for (let i = 0; i < 9; i++) canopyTree(x, 60 + i * 260 + R(-40, 40), 560, 0.75, '#3c8a3c', '#1a4a22', '#4aa048');
    x.fillStyle = 'rgba(190,240,140,.28)'; for (let i = 0; i < 260; i++) ell(x, R(0, LW), R(330, 470), R(4, 9), R(3, 5), R(0, 3)), x.fill();   // sunlit leaf texture
    x.strokeStyle = 'rgba(30,60,24,.8)'; x.lineWidth = 3; for (let i = 0; i < 16; i++) { const vx = R(0, LW); x.beginPath(); x.moveTo(vx, 380); x.quadraticCurveTo(vx + R(-20, 20), 470, vx + R(-10, 10), R(480, 560)); x.stroke(); }   // lianas
    haze(a, 0.16); L.push({ c: a.c, k: 0.36 });
    // L3 ground: river / pond (reflection drawn live on top), mossy banks, flowers
    a = mk(LW, DH); x = a.x; let g = x.createLinearGradient(0, 560, 0, DH); g.addColorStop(0, '#3a6a2a'); g.addColorStop(1, '#2a4a1a'); x.fillStyle = g; x.fillRect(0, 560, LW, DH - 560);
    x.fillStyle = '#245a6a'; x.beginPath(); x.moveTo(1400, 560); x.bezierCurveTo(1300, 600, 1500, 630, 1100, 660); x.bezierCurveTo(800, 690, 500, 640, 300, 700); x.lineTo(900, 700); x.bezierCurveTo(1200, 690, 1700, 650, 1640, 560); x.fill();
    grass(x, 0, LW, 600, 22, 'rgba(90,150,50,.8)', 260); grass(x, 0, LW, 680, 30, 'rgba(60,120,40,.85)', 220);
    for (let i = 0; i < 70; i++) ell(x, R(0, LW), R(590, DH), R(3, 6), R(3, 6), 0, ['#ff5aa0', '#ffd84a', '#ffffff', '#ff7a2a'][i % 4]);
    for (const [lx, ly] of [[700, 672], [760, 664], [1180, 650], [1240, 658], [560, 684]]) { ell(x, lx, ly, 22, 7, 0, '#3a8a3a'); x.fillStyle = '#245a6a'; x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx + 22, ly - 3); x.lineTo(lx + 22, ly + 3); x.fill(); }   // lily pads
    ell(x, 742, 660, 6, 5, 0, '#ffb0d0'); ell(x, 742, 658, 3, 3, 0, '#ffe0f0');
    for (const [rx, ry, rr] of [[420, 620, 30], [1280, 610, 24], [1900, 640, 36]]) { ell(x, rx, ry, rr * 1.4, rr, 0, shade(x, rx, ry, rr * 1.3, '#9a9a8a', '#3a3a32')); ell(x, rx - rr * 0.2, ry - rr * 0.6, rr * 0.9, rr * 0.35, 0, 'rgba(80,140,50,.8)'); }   // mossy rocks
    x.strokeStyle = '#4a7a30'; x.lineWidth = 3; for (let i = 0; i < 30; i++) { const rx = R(300, 1500), ry = 660 + R(-30, 40); x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx + R(-4, 4), ry - R(30, 60)); x.stroke(); }   // reeds
    L.push({ c: a.c, k: 0.6, water: 1 });
    // L4 near foliage: banyan with aerial roots, ferns, big leaves
    a = mk(LW, DH); x = a.x; const bx = 260; x.fillStyle = shade(x, bx, 300, 120, '#5a4028', '#24160a'); x.fillRect(bx - 50, 0, 100, DH);
    x.strokeStyle = '#3a2614'; x.lineWidth = 6; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(bx + R(-140, 140), 0); x.quadraticCurveTo(bx + R(-160, 160), DH * 0.5, bx + R(-180, 180), DH); x.stroke(); }
    palmTree(x, 1980, DH + 30, 1.25, 0, 0, '#1e6a2a', '#4aaa40'); palmTree(x, 640, DH + 20, 1.05, 0, 0, '#1a5e26', '#3e9a3a');
    for (let i = 0; i < 20; i++) fern(x, R(0, LW), DH - R(0, 30), R(1, 1.6), ['#2a7a32', '#1e6228', '#35903a', '#4aa040'][i % 4]);
    for (let i = 0; i < 6; i++) monstera(x, R(0, LW), DH - R(20, 70), R(0.8, 1.2), R(-0.6, 0.6), '#4ab048', '#105a1c');
    for (let i = 0; i < 10; i++) veinLeaf(x, R(0, LW), DH - R(10, 80), R(0.9, 1.5), -R(0.4, 2.7), '#3aa040', '#145a1e');
    x.fillStyle = '#2a6a26'; for (let i = 0; i < 40; i++) { const u = i / 40; ell(x, bx + Math.sin(u * 9) * 40, u * DH, 10, 6, u * 6); x.fill(); }   // ivy up the banyan
    L.push({ c: a.c, k: 0.82 });
    // L5 foreground frame: leaves hanging into the top corners + down the sides
    a = mk(LW, DH); x = a.x; for (let i = 0; i < 22; i++) { const left = i % 2 === 0, cx = left ? R(0, 260) : LW - R(0, 260); veinLeaf(x, cx, R(-20, 200), R(1.2, 2), left ? R(0.1, 1.2) : Math.PI - R(0.1, 1.2), '#2e8a34', '#0e3a14'); }
    monstera(x, 70, DH - 40, 1.6, 0.3, '#2e9a38', '#0a3a12'); monstera(x, LW - 70, DH - 30, 1.7, -0.4, '#2e9a38', '#0a3a12');
    for (let i = 0; i < 26; i++) bigLeaf(x, R(0, LW), R(-40, 40), R(0.8, 1.4), R(0.5, 2.6), '#2a7a30', '#0c3010'); L.push({ c: a.c, k: 1 });
    JL = L; }
  const vines = []; for (let i = 0; i < 9; i++) vines.push({ x: 120 + i * 230 + (i * 37) % 60, len: 160 + (i * 71) % 220 });
  const bugs = []; for (let i = 0; i < 26; i++) bugs.push({ x: (i * 233) % DW, y: 420 + (i * 97) % 280, p: i * 1.7 });
  function jungle(x, t, w, par) { if (!JL) buildJungle(); const off = k => -M - par * M * k;
    sky(x, w, 560); rainbow(x, w, 900, 620); clouds(x, t, w, 560, par);
    for (let i = 0; i < 3; i++) { const fx = ((t * 30 + i * 700) % (DW + 400)) - 200 - par * 20, fy = 160 + i * 50; x.strokeStyle = 'rgba(30,30,40,.55)'; x.lineWidth = 2; for (let b = 0; b < 7; b++) { const bx = fx + b * 18 - Math.abs(b - 3) * 4, by = fy + Math.abs(b - 3) * 8, f = Math.sin(t * 8 + b) * 4; x.beginPath(); x.moveTo(bx - 6, by + f); x.lineTo(bx, by); x.lineTo(bx + 6, by + f); x.stroke(); } }   // distant flocks
    if (w.p % 60 < 1 || Math.sin(t * 0.3) > 0.97) {} // (volcano smoke drawn below)
    x.drawImage(JL[0].c, off(JL[0].k), 0, DW + 2 * M, DH); for (let i = 0; i < 4; i++) { const k = (t * 0.05 + i / 4) % 1; x.fillStyle = `rgba(200,200,205,${0.35 * (1 - k)})`; ell(x, 1435 - par * M * 0.06 + k * 80, 200 - k * 150, 30 + k * 60, 20 + k * 40, 0); x.fill(); }
    x.drawImage(JL[1].c, off(JL[1].k), 0, DW + 2 * M, DH); x.drawImage(JL[2].c, off(JL[2].k), 0, DW + 2 * M, DH);
    const far = J.walkers.filter(a => a.depth === 0), mid = J.walkers.filter(a => a.depth === 1), near = J.walkers.filter(a => a.depth === 2);
    for (const a of far) drawAnimal(x, a, t, GY.j[0], 0.42, 0.4, w, par); if (far.length) { /* far animals veiled */ }
    x.drawImage(JL[3].c, off(JL[3].k), 0, DW + 2 * M, DH);
    const wx = 1540 - par * M * 0.36; const g = x.createLinearGradient(wx - 40, 0, wx + 40, 0); g.addColorStop(0, 'rgba(220,240,255,.75)'); g.addColorStop(0.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(200,230,250,.75)'); x.fillStyle = g; x.fillRect(wx - 40, 280, 80, 290);   // waterfall
    x.strokeStyle = 'rgba(150,200,230,.8)'; x.lineWidth = 2; for (let i = 0; i < 8; i++) { const yy = 280 + ((t * 260 + i * 37) % 290); x.beginPath(); x.moveTo(wx - 36 + i * 10, yy); x.lineTo(wx - 36 + i * 10, yy + 26); x.stroke(); }
    for (let i = 0; i < 6; i++) { const k = (t * 0.4 + i / 6) % 1; x.fillStyle = `rgba(255,255,255,${0.4 * (1 - k)})`; ell(x, wx + Math.sin(i * 2) * 50 * k, 570 - k * 40, 40 + k * 50, 14 + k * 20, 0); x.fill(); }   // mist
    shafts(x, t, w, 1);
    { const a = (1 - w.cloud) * (1 - w.rain); if (a > 0.05) { x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const sx0 = 300 + i * 360 - par * M * 0.5, g2 = x.createLinearGradient(sx0, 0, sx0 + 180, 600); g2.addColorStop(0, `rgba(255,250,200,${0.13 * a * (0.6 + 0.4 * Math.sin(t * 0.4 + i))})`); g2.addColorStop(1, 'rgba(255,250,200,0)'); x.fillStyle = g2; x.beginPath(); x.moveTo(sx0, 0); x.lineTo(sx0 + 60, 0); x.lineTo(sx0 + 260, 640); x.lineTo(sx0 + 120, 640); x.fill(); } x.restore(); } }   // god rays through the canopy
    for (let i = 0; i < 3; i++) { const mx = ((t * (8 + i * 4) + i * 700) % (DW + 900)) - 450 - par * M * 0.5, my = 560 + i * 26; const g3 = x.createRadialGradient(mx, my, 10, mx, my, 420); g3.addColorStop(0, `rgba(235,245,240,${0.28 + w.rain * 0.2})`); g3.addColorStop(1, 'rgba(235,245,240,0)'); x.fillStyle = g3; x.fillRect(mx - 420, my - 60, 840, 120); }   // drifting ground mist
    x.drawImage(JL[4].c, off(JL[4].k), 0, DW + 2 * M, DH);
    const rx = -par * M * 0.6; x.strokeStyle = 'rgba(220,240,255,.35)'; x.lineWidth = 2; for (let i = 0; i < 16; i++) { const yy = 600 + (i * 7) % 90, xx = 500 + ((i * 197 + t * 30) % 1000); x.beginPath(); x.moveTo(xx + rx, yy); x.lineTo(xx + 30 + rx, yy); x.stroke(); }   // river shimmer
    for (const a of mid) drawAnimal(x, a, t, GY.j[1], 0.7, 0.15, w, par);
    { const o = -par * M * 0.6, cb = Math.sin(t * 0.8) * 2; x.save(); x.translate(820 + o, 676 + cb); ell(x, 0, 0, 90, 9, 0, shade(x, 0, -4, 80, '#6a7a3a', '#2a3a18')); x.fillStyle = '#3a4a20'; for (let i = 0; i < 9; i++) ell(x, -70 + i * 16, -7, 4, 3, 0), x.fill(); ell(x, 82, -6, 4, 3.5, 0, '#e8d04a'); ell(x, 83, -6, 1.5, 2.5, 0, '#111'); x.strokeStyle = 'rgba(220,240,255,.4)'; x.lineWidth = 2; ell(x, 0, 6, 110 + cb * 4, 10, 0); x.stroke(); x.restore(); }   // crocodile basking
    { const o = -par * M * 0.6, fx = 1220 + o, fy = 664, bob = Math.sin(t * 0.9) * 3; x.strokeStyle = '#e87a8a'; x.lineWidth = 3; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx, fy - 44); x.moveTo(fx + 6, fy); x.lineTo(fx + 2, fy - 24); x.lineTo(fx + 12, fy - 32); x.stroke(); ell(x, fx + 2, fy - 54, 18, 11, -0.2, shade(x, fx, fy - 56, 18, '#ffb0b8', '#e05a72')); x.lineWidth = 4; x.strokeStyle = '#f08a9a'; x.beginPath(); x.moveTo(fx + 14, fy - 58); x.bezierCurveTo(fx + 30, fy - 80, fx + 4, fy - 92 + bob, fx + 18, fy - 104 + bob); x.stroke(); ell(x, fx + 20, fy - 106 + bob, 6, 5, 0, '#f08a9a'); x.fillStyle = '#222'; x.beginPath(); x.moveTo(fx + 24, fy - 108 + bob); x.lineTo(fx + 32, fy - 100 + bob); x.lineTo(fx + 24, fy - 103 + bob); x.fill(); }   // flamingo wading
    { const o = -par * M * 0.6, hop = Math.max(0, Math.sin(t * 0.7)) > 0.97 ? 8 : 0; ell(x, 742 + o + 16, 656 - hop, 8, 6, 0, '#4ad04a'); ell(x, 738 + o + 16, 651 - hop, 2.5, 2.5, 0, '#ffd23a'); ell(x, 746 + o + 16, 651 - hop, 2.5, 2.5, 0, '#ffd23a'); }   // tree frog on a lily pad
    // chilling: lion lying + tiger asleep on the bank
    x.save(); x.translate(980 - par * M * 0.6, 640); x.scale(0.75, 0.75); quad(x, { c1: '#d8a050', c2: '#8a5a20', L: 160, Hh: 64, leg: 44, tail: 1, belly: '#f2d8a8' }, 0, true); ell(x, 118, -88, 46, 44, 0, 'rgba(120,64,20,.9)'); x.restore();
    x.save(); x.translate(1750 - par * M * 0.6, 668); x.scale(-0.75, 0.75); quad(x, DEF.tiger, 0, true); x.restore(); x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '700 24px sans-serif'; x.fillText('z', 1700 - par * M * 0.6, 580 - (t * 10 % 24)); x.fillText('z', 1716 - par * M * 0.6, 560 - ((t * 10 + 12) % 24));
    for (const a of near) drawAnimal(x, a, t, GY.j[2], 1, 0, w, par);
    x.drawImage(JL[5].c, off(JL[5].k), 0, DW + 2 * M, DH);
    // sloth hangs from a vine-branch, monkey sits on the banyan branch
    const sx = 560 - par * M * 0.82; x.strokeStyle = '#4a2e16'; x.lineWidth = 14; x.beginPath(); x.moveTo(sx - 300, 120); x.lineTo(sx + 200, 150); x.stroke();
    x.save(); x.translate(sx, 140); x.rotate(Math.sin(t * 0.6) * 0.06); ell(x, 0, 40, 34, 52, 0, shade(x, 0, 40, 40, '#a08868', '#5a4a34')); ell(x, 0, 80, 22, 18, 0, '#d8c8a8'); ell(x, -8, 78, 6, 4, 0, '#3a2a1a'); ell(x, 8, 78, 6, 4, 0, '#3a2a1a'); x.strokeStyle = '#7a6448'; x.lineWidth = 8; x.beginPath(); x.moveTo(-20, 10); x.lineTo(-24, -10); x.moveTo(20, 10); x.lineTo(24, -10); x.stroke(); x.restore();
    x.save(); x.translate(sx - 220, 120 + Math.sin(t * 1.3) * 2); x.scale(0.8, 0.8); ell(x, 0, -30, 26, 34, 0, shade(x, 0, -30, 30, '#8a5a32', '#4a2a12')); ell(x, 0, -76, 22, 20, 0, '#8a5a32'); ell(x, 2, -72, 14, 12, 0, '#e8c49a'); ell(x, -4, -76, 2.5, 2.5, 0, '#111'); ell(x, 8, -76, 2.5, 2.5, 0, '#111');
    x.strokeStyle = '#4a2a12'; x.lineWidth = 7; x.beginPath(); x.moveTo(-20, -10); x.bezierCurveTo(-40, 40, -10, 70, -30, 90 + Math.sin(t) * 6); x.stroke(); x.restore();
    // hanging vines (sway), flowers on them
    x.lineWidth = 4; for (const v of vines) { const vx = v.x - par * M * 0.9, s = Math.sin(t * 0.8 + v.x) * 14; x.strokeStyle = '#2a5a1e'; x.beginPath(); x.moveTo(vx, 0); x.quadraticCurveTo(vx + s, v.len * 0.6, vx + s * 1.4, v.len); x.stroke(); ell(x, vx + s * 1.4, v.len, 7, 6, 0, '#ff4a8a'); }
    // butterflies (sunny) / fireflies (dusk)
    for (const b of bugs) { const bx = (b.x + Math.sin(t * 0.7 + b.p) * 60) - par * M * 0.7, by = b.y + Math.sin(t * 1.3 + b.p) * 30;
      if (w.dusk > 0.1 || w.sunset > 0.6) { const a = (0.5 + 0.5 * Math.sin(t * 3 + b.p)) * Math.max(w.dusk, w.sunset * 0.6); const gl = x.createRadialGradient(bx, by, 0, bx, by, 14); gl.addColorStop(0, `rgba(230,255,120,${a})`); gl.addColorStop(1, 'rgba(230,255,120,0)'); x.fillStyle = gl; x.fillRect(bx - 14, by - 14, 28, 28); }
      else if (b.p % 3 < 1.2 && w.rain < 0.3) { const f = Math.abs(Math.sin(t * 12 + b.p)); x.fillStyle = ['#ffd23a', '#3ad0ff', '#ff6ad0'][Math.floor(b.p) % 3]; ell(x, bx - 5 * f, by, 6 * f + 1, 8, -0.3); x.fill(); ell(x, bx + 5 * f, by, 6 * f + 1, 8, 0.3); x.fill(); } }
    x.drawImage(JL[6].c, off(JL[6].k), 0, DW + 2 * M, DH);
    rainFx(x, t, w, 560, [600, 690]); warm(x, w); }
  // ---------- BEACH ----------
  let BL = null;
  function buildBeach() { seed = 777; const LW = DW + 2 * M, L = [];
    let a = mk(LW, DH), x = a.x; for (const [cx, wd, ht] of [[400, 380, 70], [1300, 520, 110], [1900, 260, 50]]) { x.fillStyle = 'rgb(70,110,110)'; x.beginPath(); x.moveTo(cx - wd / 2, 400); x.quadraticCurveTo(cx - wd * 0.2, 400 - ht * 1.6, cx, 400 - ht); x.quadraticCurveTo(cx + wd * 0.25, 400 - ht * 1.3, cx + wd / 2, 400); x.fill(); }
    for (const [cx, wd, ht] of [[400, 380, 70], [1300, 520, 110], [1900, 260, 50]]) { x.fillStyle = 'rgba(40,90,60,.8)'; for (let i = 0; i < 14; i++) ell(x, cx + R(-wd * 0.3, wd * 0.3), 400 - R(4, ht * 0.7), R(8, 18), R(5, 10), 0), x.fill(); x.fillStyle = 'rgba(240,230,200,.7)'; x.fillRect(cx - wd / 2 + 10, 397, wd - 20, 3); }   // trees + beach strip on the islands
    x.fillStyle = 'rgb(110,140,150)'; for (const [cx, wd, ht] of [[800, 240, 30], [1650, 160, 22]]) { x.beginPath(); x.moveTo(cx - wd / 2, 400); x.quadraticCurveTo(cx, 400 - ht * 2, cx + wd / 2, 400); x.fill(); }   // far-away islets
    x.fillStyle = '#e8e8e0'; x.fillRect(1240, 296, 6, 24); x.fillStyle = '#d04040'; x.fillRect(1240, 296, 6, 6);   // lighthouse
    haze(a, 0.5); L.push({ c: a.c, k: 0.05 });
    a = mk(LW, DH); x = a.x; const g = x.createLinearGradient(0, 540, 0, DH); g.addColorStop(0, '#f2dcae'); g.addColorStop(1, '#e0c088'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 560); for (let i = 0; i <= LW; i += 30) x.lineTo(i, 556 + Math.sin(i * 0.004) * 14); x.lineTo(LW, DH); x.lineTo(0, DH); x.fill();
    x.fillStyle = 'rgba(160,120,70,.25)'; for (let i = 0; i < 400; i++) ell(x, R(0, LW), R(570, DH), 1.5, 1.2, 0), x.fill();   // sand grain
    for (let i = 0; i < 12; i++) { const fx = 300 + i * 60, fy = 690 - i * 8; ell(x, fx, fy, 7, 4, 0.3, 'rgba(150,110,60,.35)'); ell(x, fx + 22, fy + 10, 7, 4, 0.3, 'rgba(150,110,60,.35)'); }   // footprints
    for (let i = 0; i < 14; i++) { const cx = R(100, LW - 100), cy = R(620, DH - 10), c = ['#fff0e0', '#ffc8b0', '#f0d0ff'][i % 3]; x.fillStyle = c; x.beginPath(); x.moveTo(cx, cy); for (let k = 0; k <= 6; k++) x.lineTo(cx + Math.cos(Math.PI + k * Math.PI / 6) * 9, cy + Math.sin(Math.PI + k * Math.PI / 6) * 9); x.fill(); }   // shells
    x.fillStyle = shade(x, 1500, 670, 90, '#8a8478', '#3e3a34'); for (const [cx, cy, r] of [[1440, 676, 40], [1560, 664, 52], [1500, 690, 34], [1620, 686, 30]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
    ell(x, 1520, 700, 60, 14, 0, '#3a8aa0'); ell(x, 1505, 697, 20, 4, 0, 'rgba(255,255,255,.4)');   // rock pool
    x.fillStyle = 'rgba(255,255,255,.25)'; for (const [cx, cy, r] of [[1440, 676, 40], [1560, 664, 52], [1500, 690, 34]]) ell(x, cx - r * 0.3, cy - r * 0.5, r * 0.35, r * 0.18, -0.3), x.fill();
    x.fillStyle = 'rgba(60,120,60,.6)'; for (let i = 0; i < 18; i++) ell(x, 1440 + R(-30, 200), 690 + R(-30, 10), R(4, 9), R(2, 4), R(0, 3)), x.fill();   // seaweed on rocks
    ell(x, 1540, 702, 9, 6, 0, '#ff7a4a'); for (let k = 0; k < 5; k++) ell(x, 1540 + Math.cos(k * 1.256) * 10, 702 + Math.sin(k * 1.256) * 6, 6, 2.5, k * 1.256, '#ff7a4a');   // starfish
    for (let i = 0; i < 26; i++) { const cx = R(80, LW - 80), cy = R(610, DH - 6), r = R(5, 11); if (i % 2) { x.fillStyle = shade(x, cx, cy, r, '#fff8f0', '#d8a888'); x.beginPath(); x.moveTo(cx, cy + r * 0.3); x.quadraticCurveTo(cx - r * 1.4, cy - r, cx, cy - r * 1.2); x.quadraticCurveTo(cx + r * 1.4, cy - r, cx, cy + r * 0.3); x.fill(); x.strokeStyle = 'rgba(160,100,70,.5)'; x.lineWidth = 1; for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(cx, cy + r * 0.2); x.lineTo(cx + k * r * 0.4, cy - r); x.stroke(); } } else ell(x, cx, cy, r * 0.7, r * 0.5, R(0, 3), shade(x, cx, cy, r, '#a8a49c', '#5a564e')); }   // scallops + pebbles
    for (let i = 0; i < 3; i++) { const dx = R(200, LW - 200), dy = R(640, 720); x.strokeStyle = '#8a6a44'; x.lineWidth = 6; x.beginPath(); x.moveTo(dx - 40, dy); x.quadraticCurveTo(dx, dy - 10, dx + 50, dy + 4); x.stroke(); }   // driftwood
    x.strokeStyle = 'rgba(170,130,80,.25)'; x.lineWidth = 2; for (let r = 0; r < 14; r++) { const yy = 640 + r * 12; x.beginPath(); for (let i = 0; i <= LW; i += 40) x.lineTo(i, yy + Math.sin(i * 0.01 + r) * 4); x.stroke(); }   // wind ripples
    L.push({ c: a.c, k: 0.7 });
    a = mk(LW, DH); x = a.x; for (let i = 0; i < 8; i++) { const left = i < 4; palmFrame(x, left ? R(-40, 120) : LW - R(-40, 120), R(-30, 40), left); } L.push({ c: a.c, k: 1 });
    BL = L; }
  function palmFrame(x, cx, cy, left) { for (let i = 0; i < 6; i++) { const a = (left ? 0.2 : Math.PI - 0.2) + (left ? 1 : -1) * i * 0.22, len = R(180, 280); const g = x.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len); g.addColorStop(0, '#1e6a2a'); g.addColorStop(1, '#3aa040');
      x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + Math.cos(a - 0.2) * len * 0.6, cy + Math.sin(a - 0.2) * len * 0.6, cx + Math.cos(a) * len, cy + Math.sin(a) * len); x.quadraticCurveTo(cx + Math.cos(a + 0.2) * len * 0.6, cy + Math.sin(a + 0.2) * len * 0.6, cx, cy); x.fill(); } }
  const BB = { dolphin: -1, crab: 0 };
  function beach(x, t, w, par) { if (!BL) buildBeach(); const off = k => -M - par * M * k, HZ = 400;
    sky(x, w, HZ); rainbow(x, w, 1000, 520); clouds(x, t, w, HZ, par);
    x.drawImage(BL[0].c, off(BL[0].k), 0, DW + 2 * M, DH);
    // layered sea: deep blue at the horizon -> turquoise shallows
    let deep = mix([20, 70, 140], [60, 76, 96], w.cloud * 0.7), shal = mix([60, 210, 200], [110, 140, 140], w.cloud * 0.7); deep = mix(deep, [120, 70, 90], w.sunset * 0.5); shal = mix(shal, [240, 150, 110], w.sunset * 0.4);
    const sg = x.createLinearGradient(0, HZ, 0, 600); sg.addColorStop(0, rgb(deep)); sg.addColorStop(1, rgb(shal)); x.fillStyle = sg; x.fillRect(0, HZ, DW, 210);
    const so = -par * M * 0.3; x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; for (let r = 0; r < 9; r++) { const yy = HZ + 10 + r * r * 2.2; x.beginPath(); for (let i = 0; i <= DW; i += 24) x.lineTo(i, yy + Math.sin(i * 0.02 + t * (0.8 + r * 0.15) + r + so * 0.01) * (1 + r * 0.4)); x.stroke(); }   // wave crests
    if (w.cloud < 0.7) { x.fillStyle = `rgba(255,250,220,${0.8 * (1 - w.cloud)})`; for (let i = 0; i < 90; i++) { const gx = 1500 + Math.sin(i * 12.9) * 260 + so, gy = HZ + 6 + (i * 13) % 150, a = Math.sin(t * 6 + i * 3.1); if (a > 0.4) ell(x, gx, gy, 6 * a, 1.4, 0), x.fill(); } }   // sun glitter
    const bxp = ((t * 14) % (DW + 400)) - 200 + so * 0.3; x.fillStyle = '#f4f4f0'; x.beginPath(); x.moveTo(bxp, HZ + 10); x.lineTo(bxp + 26, HZ - 38); x.lineTo(bxp + 30, HZ + 10); x.fill(); x.fillStyle = '#6a3a1a'; x.fillRect(bxp - 10, HZ + 10, 52, 7);   // distant boat
    { const b2 = DW + 200 - ((t * 9 + 600) % (DW + 400)) + so * 0.2; x.fillStyle = '#ff5a3a'; x.beginPath(); x.moveTo(b2, HZ + 4); x.lineTo(b2 + 14, HZ - 20); x.lineTo(b2 + 16, HZ + 4); x.fill(); x.fillStyle = '#3a3a4a'; x.fillRect(b2 - 6, HZ + 4, 30, 4);
      const b3 = 400 + Math.sin(t * 0.05) * 300 + so * 0.4; x.fillStyle = '#f2f2f2'; x.fillRect(b3, HZ + 30, 46, 9); x.fillRect(b3 + 10, HZ + 22, 22, 8); x.fillStyle = '#2a4a8a'; x.fillRect(b3, HZ + 37, 46, 3); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(b3 - 4, HZ + 41); x.lineTo(b3 - 40, HZ + 43); x.stroke(); }   // sailing dinghy + motor yacht with wake
    for (let r = 0; r < 4; r++) { const yy = 470 + r * 30, amp = 4 + r * 2, sp = 0.6 + r * 0.12; x.fillStyle = rgb(mix(deep, shal, 0.4 + r * 0.15), 0.55); x.beginPath(); x.moveTo(0, yy + 30); for (let i = 0; i <= DW; i += 32) x.lineTo(i, yy + Math.sin(i * (0.012 - r * 0.0015) + t * sp + r * 2 + so * 0.01) * amp); x.lineTo(DW, yy + 30); x.fill();
      x.strokeStyle = `rgba(255,255,255,${0.35 + r * 0.12})`; x.lineWidth = 1.5 + r; x.beginPath(); for (let i = 0; i <= DW; i += 32) { const v = Math.sin(i * (0.012 - r * 0.0015) + t * sp + r * 2 + so * 0.01); if (v < -0.55) x.lineTo(i, yy + v * amp); else x.moveTo(i, yy + v * amp); } x.stroke(); }   // rolling swells with foamy crests
    if (BB.dolphin < 0 && Math.random() < 0.004) BB.dolphin = t; if (BB.dolphin >= 0) { const k = (t - BB.dolphin) / 1.6; if (k > 1) BB.dolphin = -1; else { const dx = 700 + k * 160 + so, dy = 470 - Math.sin(k * Math.PI) * 70; x.save(); x.translate(dx, dy); x.rotate(-Math.cos(k * Math.PI) * 0.9); ell(x, 0, 0, 34, 10, 0, shade(x, 0, 0, 30, '#8a9aac', '#3a4a5c')); x.fillStyle = '#4a5a6c'; x.beginPath(); x.moveTo(-4, -8); x.lineTo(4, -22); x.lineTo(10, -8); x.fill(); x.restore(); } }
    // shore: foam washes up and back, darker wet sand behind it
    const wash = Math.sin(t * 0.7) * 22, so2 = -par * M * 0.7, sandC = mix([236, 214, 168], [190, 176, 150], w.rain * 0.6);
    x.drawImage(BL[1].c, off(BL[1].k), 0, DW + 2 * M, DH);
    x.fillStyle = rgb(mix(sandC, [150, 120, 80], 0.45), 0.85); x.beginPath(); x.moveTo(0, 560); for (let i = 0; i <= DW; i += 24) x.lineTo(i, 600 + 26 + Math.sin(i * 0.006 + 1) * 10); x.lineTo(DW, 560); x.fill();   // wet band
    x.fillStyle = rgb(shal, 0.75); x.beginPath(); x.moveTo(0, 556); for (let i = 0; i <= DW; i += 24) x.lineTo(i, 586 + wash + Math.sin(i * 0.008 + t * 0.9) * 8); x.lineTo(DW, 556); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 5; x.beginPath(); for (let i = 0; i <= DW; i += 24) x.lineTo(i, 586 + wash + Math.sin(i * 0.008 + t * 0.9) * 8); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= DW; i += 24) x.lineTo(i, 572 + wash * 0.6 + Math.sin(i * 0.011 + t * 1.3) * 6); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 70; i++) { const fx = (i * 29.3) % DW, fy = 590 + wash + Math.sin(fx * 0.008 + t * 0.9) * 8 + ((i * 7) % 11) - 4; ell(x, fx, fy, 3 + (i % 4), 1.6, 0); x.fill(); }   // lacy foam bubbles
    { const sh = (1 - w.cloud) * (1 - w.rain * 0.5); const gs = x.createLinearGradient(0, 596 + wash, 0, 640); gs.addColorStop(0, `rgba(255,255,255,${0.35 * sh})`); gs.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gs; x.fillRect(0, 596 + wash, DW, 44); x.fillStyle = `rgba(255,250,220,${0.55 * sh})`; for (let i = 0; i < 24; i++) { const gx = (i * 97 + so2 * 0.2) % DW, a2 = Math.sin(t * 3 + i * 1.7); if (a2 > 0.5) ell(x, gx, 604 + wash + (i * 5) % 22, 10 * a2, 1.4, 0), x.fill(); } }   // wet-sand shine + sparkle
    // crab scuttles, gulls glide
    const cx = 900 + Math.sin(t * 0.35) * 260 + so2, cy = 680; ell(x, cx, cy + 10, 26, 5, 0, 'rgba(0,0,0,.2)'); ell(x, cx, cy, 20, 13, 0, shade(x, cx, cy, 18, '#ff6a3a', '#a02a10')); x.strokeStyle = '#c03a18'; x.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const lp = Math.sin(t * 14 + i) * 3; x.beginPath(); x.moveTo(cx - 14, cy + 2 + i * 3); x.lineTo(cx - 26, cy + 10 + i * 3 + lp); x.moveTo(cx + 14, cy + 2 + i * 3); x.lineTo(cx + 26, cy + 10 + i * 3 - lp); x.stroke(); } ell(x, cx - 22, cy - 10, 7, 5, 0, '#ff6a3a'); ell(x, cx + 22, cy - 10, 7, 5, 0, '#ff6a3a'); ell(x, cx - 5, cy - 12, 2, 2, 0, '#111'); ell(x, cx + 5, cy - 12, 2, 2, 0, '#111');
    for (let i = 0; i < 4; i++) { const fx = ((t * 22 + i * 520) % (DW + 400)) - 200, fy = 230 + (i % 2) * 40; x.strokeStyle = 'rgba(40,40,50,.45)'; x.lineWidth = 2; for (let b = 0; b < 5; b++) { const bx = fx + b * 14, by = fy + Math.abs(b - 2) * 6, f = Math.sin(t * 7 + b) * 3; x.beginPath(); x.moveTo(bx - 5, by + f); x.lineTo(bx, by); x.lineTo(bx + 5, by + f); x.stroke(); } }   // distant flocks
    for (let i = 0; i < 5; i++) { const gx = ((t * (40 + i * 9) + i * 500) % (DW + 300)) - 150 - par * 30, gy = 130 + i * 40 + Math.sin(t + i) * 16, f = Math.sin(t * 5 + i) * 10, s = 0.7 + (i % 3) * 0.25;
      x.strokeStyle = '#f8f8f8'; x.lineWidth = 4 * s; x.beginPath(); x.moveTo(gx - 26 * s, gy + f * s); x.quadraticCurveTo(gx - 10 * s, gy - 10 * s, gx, gy); x.quadraticCurveTo(gx + 10 * s, gy - 10 * s, gx + 26 * s, gy + f * s); x.stroke(); ell(x, gx, gy + 2, 4 * s, 3 * s, 0, '#dcdcdc'); }
    shafts(x, t, w, 0.5);
    // palms (swaying, shaded fronds) + umbrella
    for (const [p0, s] of [[150, 1.5], [620, 1.05], [1250, 1.2], [1880, 1.6]]) { ell(x, p0 + 40 * s + w.sunset * 120, 720, 90 * s * (1 + w.sunset * 1.5), 10, 0, `rgba(0,0,0,${0.22 * (1 - w.cloud * 0.6)})`); palmTree(x, p0 - par * M * (s > 1.3 ? 0.9 : 0.75), 720, s, t, 1, '#1e6a2a', '#4aaa40'); }
    { const tx2 = 1480 - par * M * 0.75; x.fillStyle = '#2a7ab8'; x.fillRect(tx2, 690, 120, 26); x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) x.fillRect(tx2 + 12 + i * 28, 690, 10, 26); ell(x, tx2 - 60, 706, 18, 18, 0, shade(x, tx2 - 60, 706, 18, '#ffe04a', '#e04a2a')); x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(tx2 - 62, 688, 4, 36); }   // towel + beach ball
    const ux = 1050 - par * M * 0.75; x.strokeStyle = '#eee'; x.lineWidth = 5; x.beginPath(); x.moveTo(ux, 700); x.lineTo(ux + 8, 590); x.stroke(); for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff3a5a'; x.beginPath(); x.moveTo(ux + 8, 586); x.arc(ux + 8, 600, 90, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); x.fill(); }
    x.drawImage(BL[2].c, off(BL[2].k), 0, DW + 2 * M, DH);
    rainFx(x, t, w, 600, [HZ + 20, 590]); warm(x, w); }
  // ---------- per frame ----------
  let last = 0, on = false, scene = 'jungle', par = 0;
  const api = { group: grp, wins, view, S: {}, spawn, J, Q, size: [PW, PH], weather: () => weather(performance.now() / 1000), draws: 0, ms: 0, msMax: 0, get par() { return par; },
    setPhase(p) { phaseOverride = p; last = 0; }, get on() { return on; }, get scene() { return on ? scene : 'space'; } };
  api.set = v => { on = !!v && v !== 'space'; scene = v === 'beach' ? 'beach' : 'jungle'; grp.visible = on; last = 0; if (on) { J.walkers.length = 0; } const sw = room.getObjectByName('spaceWindow'); if (sw) sw.visible = !on; };
  api.pano = pano;
  api.update = () => { if (!on) return; const now = performance.now();
    const inRoom1 = camera.position.x < WX / 2 && camera.position.z > -HALF - 1; if (!inRoom1) return;
    if (now - last < 50) return; last = now; const t0p = performance.now(), t = now / 1000, w = weather(t);
    par = Math.max(-1, Math.min(1, camera.position.z / HALF));   // look-through parallax: near layers slide more than far ones
    if (scene === 'jungle') { if (now / 1000 > J.next) { spawn(); J.next = now / 1000 + 4 + Math.random() * 9; } J.walkers = J.walkers.filter(a => { a.x += a.dir * a.v * 0.05; a.ph += 0.05 * a.v / 9; return a.x > -360 && a.x < DW + 360; }); }
    px.setTransform(Q, 0, 0, Q, 0, 0); if (scene === 'jungle') jungle(px, t, w, par); else beach(px, t, w, par);
    api.draws++; tex.needsUpdate = true; const ms = performance.now() - t0p; api.ms = api.ms ? api.ms * 0.9 + ms * 0.1 : ms; api.msMax = Math.max(api.msMax, ms); };
  return api;
}
