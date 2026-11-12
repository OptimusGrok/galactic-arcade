// SKY TOWER cabinet (#15, room 1 south wall slot 2:2 = old blank E, x=0), between MARS ROADSTER
// and ROCKFALL RUSH. Bright sky-blue body with yellow trim (no neon on the body), a canvas
// "SKY TOWER" marquee, side art of a Lego climb from clouds into space, and an animated
// attract loop (platforms, jetpack, Lego aliens, INSERT CREDIT). visit.on hides INSERT CREDIT
// while Grok is playing.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';

const canvasTex = (w, h, paint) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

function brickFill(g, x, y, w, h, col) {
  g.fillStyle = col; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = 'rgba(255,255,255,.28)';
  const pitch = 10;
  for (let sx = x + 6; sx < x + w - 4; sx += pitch) {
    for (let sy = y + 5; sy < y + 8; sy += 8) {
      g.beginPath(); g.arc(sx, sy, 2.2, 0, 7); g.fill();
    }
  }
}

function paintSide(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#040612'); sky.addColorStop(0.22, '#1a1040');
  sky.addColorStop(0.48, '#ff7a3a'); sky.addColorStop(0.7, '#5eb8ff'); sky.addColorStop(1, '#c8e8ff');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff';
  for (let i = 0; i < 18; i++) { g.globalAlpha = 0.5 + (i % 3) * 0.15; g.fillRect((i * 37) % w, 8 + (i * 13) % 90, 2, 2); }
  g.globalAlpha = 1;
  g.fillStyle = '#e8f4ff';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(20 + i * 44, h * 0.86 + (i % 2) * 8, 34, 12, 0, 0, 7); g.fill(); }
  const cols = ['#c91a09', '#f5cd2f', '#0055bf', '#237841', '#fe8a18', '#ffffff'];
  for (let i = 0; i < 10; i++) {
    const t = i / 9, y = h * 0.78 - t * h * 0.62, bw = 70 - t * 38, x = w * 0.5 - bw / 2 + Math.sin(i * 1.2) * 18;
    brickFill(g, x, y, bw, 18, cols[i % cols.length]);
  }
  g.fillStyle = '#4aa0ff'; g.beginPath(); g.ellipse(w * 0.72, 52, 22, 22, 0, 0, 7); g.fill();
  g.fillStyle = '#2a7a2a'; g.beginPath(); g.ellipse(w * 0.68, 50, 8, 5, 0.4, 0, 7); g.fill();
  g.fillStyle = '#3a8a3a'; g.beginPath(); g.ellipse(w * 0.76, 54, 7, 4, -0.3, 0, 7); g.fill();
  g.fillStyle = '#ffe14a'; g.font = '900 22px "Courier New", monospace'; g.textAlign = 'center';
  g.save(); g.translate(w * 0.18, h * 0.55); g.rotate(-Math.PI / 2); g.fillText('SKY TOWER', 0, 0); g.restore();
}

function paintMarquee(g, w, h) {
  brickFill(g, 0, 0, w, h, '#c91a09');
  g.fillStyle = '#f5cd2f'; g.fillRect(8, 8, w - 16, h - 16);
  brickFill(g, 14, 14, w - 28, h - 28, '#c91a09');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 54px "Courier New", monospace';
  g.lineWidth = 8; g.strokeStyle = '#3a0800'; g.strokeText('SKY TOWER', w / 2, h / 2 + 2);
  g.fillStyle = '#ffe14a'; g.fillText('SKY TOWER', w / 2, h / 2);
}

// ---- t754u: LIVE view of the climb being played at this cabinet (watchers in the room) ----
// Drawn from the players' own sky packets (position, camera yaw, nearby platforms, the TITAN, its eye lasers, HP),
// in the player's camera direction, centred on the first player at the machine. The second climber (shared race) is
// drawn in the same view when in range, otherwise an arrow at the edge; a race bar on the right shows both heights.
const SLOT_COL = ['#7ff6ff', '#ff7ad9'];
const hex = n => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
export function drawLive(g, W, H, feed, t, live) {
  const F = feed[0], s = F.s, cy = s.cy || 0, fx = Math.sin(cy), fz = Math.cos(cy), rx = -fz, rz = fx;   // camera forward / right
  // a schematic of the real tower: height to scale (about three platforms on screen), sideways squeezed (tanh) so the
  // neighbouring platforms of the spiral stay in view; depth only shrinks things a little
  const ppm = H / 56, cxs = W / 2, cys = H * 0.62;
  const proj = (x, y, z) => { const dx = x - s.x, dz = z - s.z, d = dx * fx + dz * fz, k = Math.max(0.6, Math.min(1.4, 30 / (30 + d))); return { x: cxs - W * 0.42 * Math.tanh((dx * rx + dz * rz) / 24), y: cys - (y - s.y) * ppm, k, d }; };
  // sky by the climber's own day/night
  const n = s.nt || 0, sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, n > 0.5 ? '#02040e' : '#2a6ad8'); sky.addColorStop(0.6, n > 0.5 ? '#0c1638' : '#7cc0ff'); sky.addColorStop(1, n > 0.5 ? '#17264f' : '#d8ecff');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  if (n > 0.3) { g.fillStyle = '#fff'; for (let i = 0; i < 28; i++) { g.globalAlpha = (0.3 + (i % 4) * 0.15) * n; g.fillRect((i * 53) % W, (i * 29) % H, 2, 2); } g.globalAlpha = 1; }
  const items = [];
  for (const q of (s.pd || [])) { const [i, x, z, top, sx, sz, col] = q, P = proj(x, top, z); items.push({ d: P.d, f() { const w = Math.max(22, Math.min(90, Math.max(sx, sz) * 7 * P.k)), h = 9 * P.k; brickFill(g, P.x - w / 2, P.y, w, h, hex(col)); g.fillStyle = '#0008'; g.font = 'bold 9px "Courier New", monospace'; g.textAlign = 'center'; g.fillText(String(i), P.x, P.y + h - 2); } }); }
  if (s.fc) { const [x, y, z, ang, chg, open] = s.fc, P = proj(x, y, z); items.push({ d: P.d, f() { drawTitan(g, P.x, P.y, 30 * P.k, ang, chg, open, t); } }); }
  feed.forEach((c, j) => { const q = c.s, P = proj(q.x, q.y, q.z); items.push({ d: P.d - 0.01, f() {
    if (P.y < -10 || P.y > H + 10) { const up = P.y < 0, ax = Math.max(14, Math.min(W - 40, P.x)), ay = up ? 46 : H - 14; g.fillStyle = SLOT_COL[j % 2]; g.beginPath(); g.moveTo(ax, ay + (up ? -8 : 8)); g.lineTo(ax - 7, ay); g.lineTo(ax + 7, ay); g.fill(); g.font = 'bold 10px "Courier New", monospace'; g.textAlign = 'center'; g.fillText(c.name.toUpperCase().slice(0, 10), ax, ay + (up ? 12 : -10)); return; }
    drawClimber(g, P.x, P.y, P.k, q, t, SLOT_COL[j % 2], c.name); } }); });
  for (const b of (s.bm || [])) { const [x, y, z, dx, dy, dz] = b, A = proj(x, y, z), B = proj(x - dx * 4.2, y - dy * 4.2, z - dz * 4.2); items.push({ d: A.d - 0.02, f() { g.strokeStyle = '#ff2a1a'; g.lineCap = 'round'; g.lineWidth = 5 * A.k; g.beginPath(); g.moveTo(B.x, B.y); g.lineTo(A.x, A.y); g.stroke(); g.strokeStyle = '#ffd0c0'; g.lineWidth = 1.5; g.stroke(); } }); }
  items.sort((a, b) => b.d - a.d); for (const it of items) it.f();
  // HUD: LIVE tag, each climber's platform + hearts, race bar
  g.textAlign = 'left'; g.font = 'bold 13px "Courier New", monospace';
  g.fillStyle = '#000a'; g.fillRect(0, 0, W, 18 + feed.length * 15);
  g.fillStyle = Math.floor(t * 2) % 2 ? '#ff3030' : '#ff7070'; g.beginPath(); g.arc(10, 10, 4.5, 0, 7); g.fill();
  g.fillStyle = '#ffe14a'; g.fillText(feed.length > 1 ? 'LIVE RACE' : 'LIVE', 19, 14);
  g.textAlign = 'right'; g.fillText('SKY TOWER', W - 6, 14); g.textAlign = 'left';
  feed.forEach((c, j) => { const q = c.s; g.fillStyle = SLOT_COL[j % 2]; g.fillText(c.name.toUpperCase().slice(0, 10) + ' ' + q.p + '/50', 6, 29 + j * 15); g.fillStyle = '#ff4060'; g.fillText('♥'.repeat(q.h) + (q.w ? '  TOP!' : ''), 150, 29 + j * 15); });
  const bx = W - 10, by0 = 26 + feed.length * 15, by1 = H - 12; g.fillStyle = '#0007'; g.fillRect(bx - 3, by0, 6, by1 - by0);
  feed.forEach((c, j) => { const yy = by1 - (by1 - by0) * Math.min(1, (c.s.p - 1) / 49); g.fillStyle = SLOT_COL[j % 2]; g.beginPath(); g.arc(bx, yy, 5, 0, 7); g.fill(); });
  const won = feed.find(c => c.s.w);
  if (won) { g.textAlign = 'center'; g.font = '900 20px "Courier New", monospace'; g.lineWidth = 5; g.strokeStyle = '#3a0800'; const m = won.name.toUpperCase().slice(0, 10) + ' MADE IT!'; g.strokeText(m, W / 2, H * 0.4); g.fillStyle = '#ffe14a'; g.fillText(m, W / 2, H * 0.4); }
  live.names = feed.map(c => c.name); live.focus = F.id; live.pads = (s.pd || []).length; live.titan = !!s.fc; live.beams = (s.bm || []).length;
}
function drawTitan(g, x, y, r, ang, chg, open, t) {
  g.fillStyle = '#f4f4f0'; for (let i = 0; i < 9; i++) { const a = Math.PI * (0.05 + i * 0.1125), rr = r * (0.42 + ((i * 37) % 5) * 0.06); g.beginPath(); g.arc(x + Math.cos(a) * r * 0.85, y - Math.sin(a) * r * 0.8, rr, 0, 7); g.fill(); }
  const sk = ang > 0.3 ? '#e2452a' : '#ff9a3a'; g.fillStyle = sk; g.beginPath(); g.ellipse(x, y, r, r * 1.02, 0, 0, 7); g.fill();
  const ey = y - r * 0.18, ex = r * 0.36, er = r * 0.17; for (const sgn of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + sgn * ex, ey, er, er * (ang > 0.3 ? 0.55 : 1), 0, 0, 7); g.fill(); g.fillStyle = chg ? '#ff1a1a' : '#111'; g.beginPath(); g.arc(x + sgn * ex, ey, er * 0.5, 0, 7); g.fill();
    g.strokeStyle = '#3a1406'; g.lineWidth = Math.max(2, r * 0.09); g.beginPath(); g.moveTo(x + sgn * (ex + er), ey - er * 1.5 + (ang > 0.3 ? -r * 0.06 : 0)); g.lineTo(x + sgn * (ex - er), ey - er * 1.5 + (ang > 0.3 ? r * 0.1 : 0)); g.stroke(); }
  g.fillStyle = '#3a0a06'; g.beginPath(); g.ellipse(x, y + r * 0.45, r * (ang > 0.3 ? 0.42 : 0.3), Math.max(2, r * (0.06 + open * 0.2)), 0, 0, 7); g.fill();
}
function drawClimber(g, px, py, k, q, t, tagCol, name) {
  const alien = q.c === 'alien', s = 1.4 * k; g.save(); g.translate(px, py); g.scale(s, s);
  if (q.f) { g.fillStyle = '#ff9a1a'; g.globalAlpha = 0.85 + Math.sin(t * 30) * 0.1; g.beginPath(); g.moveTo(-6, 2); g.lineTo(-3, 16); g.lineTo(-1, 2); g.fill(); g.beginPath(); g.moveTo(6, 2); g.lineTo(3, 16); g.lineTo(1, 2); g.fill(); g.globalAlpha = 1; }
  g.fillStyle = alien ? '#9aa5ab' : '#4e2a14'; g.beginPath(); g.arc(0, -16, 7, 0, 7); g.fill();
  if (alien) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(-3, -17, 2.4, 1.4, 0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(3, -17, 2.4, 1.4, -0.3, 0, 7); g.fill(); }
  else { g.fillStyle = '#e8c49a'; g.beginPath(); g.ellipse(0, -14, 4, 3, 0, 0, 7); g.fill(); }
  g.fillStyle = alien ? '#237841' : '#1d2452'; g.fillRect(-6, -9, 12, 12);
  g.fillStyle = '#b8c0cc'; g.fillRect(-8, -4, 4, 8); g.fillRect(4, -4, 4, 8);
  g.restore();
  g.font = 'bold 10px "Courier New", monospace'; g.textAlign = 'center'; g.fillStyle = '#000a'; const tw = Math.min(70, name.length * 6.4 + 8); g.fillRect(px - tw / 2, py - 32 * s - 10, tw, 12); g.fillStyle = tagCol; g.fillText(name.toUpperCase().slice(0, 10), px, py - 32 * s);
}

function attract(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const visit = { on: false };
  const live = { on: false, frames: 0, names: [], focus: null };
  function draw(t) {
    // t754u: someone is playing at this cabinet -> show THEIR climb live (from the room's sky packets), not the attract loop
    let feed = null; try { const M = window.__mp; feed = M && M.sky && M.sky.feed ? M.sky.feed('skytower') : null; } catch (e) {}
    if (feed && feed.length) { drawLive(g, W, H, feed, t, live); live.on = true; live.frames++; tex.needsUpdate = true; return; }
    live.on = false; live.names = []; live.focus = null;
    const sky = g.createLinearGradient(0, 0, 0, H);
    const k = (Math.sin(t * 0.15) + 1) * 0.5;
    sky.addColorStop(0, k > 0.55 ? '#050816' : '#3a1a60');
    sky.addColorStop(0.45, k > 0.45 ? '#ff7040' : '#4aa8ff');
    sky.addColorStop(1, '#b8dcff');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    for (let i = 0; i < 24; i++) {
      const sx = (i * 53 + t * 8) % W, sy = 8 + (i * 17) % (H * 0.38);
      g.globalAlpha = 0.35 + (i % 4) * 0.15; g.fillRect(sx, sy, 2, 2);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#eef6ff';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 90 + t * 12) % (W + 80)) - 40, cy = H * 0.78 + (i % 2) * 10;
      g.beginPath(); g.ellipse(cx, cy, 46, 16, 0, 0, 7); g.fill();
    }
    const cols = ['#c91a09', '#f5cd2f', '#0055bf', '#237841', '#fe8a18'];
    for (let i = 0; i < 7; i++) {
      const y = H * 0.72 - i * 22, bw = 110 - i * 10, x = W * 0.5 - bw / 2 + Math.sin(t * 0.7 + i) * 10;
      g.fillStyle = cols[i % cols.length]; g.fillRect(x, y, bw, 14);
      g.fillStyle = 'rgba(255,255,255,.35)';
      for (let s = x + 8; s < x + bw - 4; s += 12) { g.beginPath(); g.arc(s, y + 4, 2.4, 0, 7); g.fill(); }
    }
    const px = W * 0.42 + Math.sin(t * 1.4) * 16, py = H * 0.42 + Math.sin(t * 2.1) * 8;
    g.fillStyle = '#4e2a14'; g.beginPath(); g.arc(px, py - 10, 7, 0, 7); g.fill();
    g.fillStyle = '#ff4f9e'; g.beginPath(); g.arc(px, py - 14, 6, Math.PI, 0); g.fill();
    g.fillStyle = '#1d2452'; g.fillRect(px - 6, py - 4, 12, 12);
    g.fillStyle = '#b8c0cc'; g.fillRect(px - 8, py + 2, 5, 8); g.fillRect(px + 3, py + 2, 5, 8);
    g.fillStyle = '#ff9a1a'; g.globalAlpha = 0.85;
    g.beginPath(); g.moveTo(px - 6, py + 10); g.lineTo(px - 3, py + 22); g.lineTo(px - 1, py + 10); g.fill();
    g.beginPath(); g.moveTo(px + 6, py + 10); g.lineTo(px + 3, py + 22); g.lineTo(px + 1, py + 10); g.fill();
    g.globalAlpha = 1;
    const ax = W * 0.78 + Math.sin(t * 1.1) * 20, ay = H * 0.34 + Math.cos(t * 0.9) * 14;
    g.fillStyle = '#9aa5ab'; g.beginPath(); g.arc(ax, ay - 6, 7, 0, 7); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(ax - 3, ay - 7, 2.4, 1.4, 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(ax + 3, ay - 7, 2.4, 1.4, -0.3, 0, 7); g.fill();
    g.fillStyle = '#237841'; g.fillRect(ax - 5, ay, 10, 10);
    g.fillStyle = '#ff5030';
    const shotX = ax - 8 - ((t * 40) % 40);
    g.fillRect(shotX, ay + 2, 10, 3);
    g.textAlign = 'center'; g.font = 'bold 22px "Courier New", monospace';
    g.lineWidth = 5; g.strokeStyle = '#3a0800'; g.strokeText('SKY TOWER', W / 2, 30);
    g.fillStyle = '#ffe14a'; g.fillText('SKY TOWER', W / 2, 30);
    if (!visit.on && Math.floor(t * 2) % 2 === 0) {
      g.font = 'bold 16px "Courier New", monospace';
      g.fillStyle = '#000a'; g.fillRect(W / 2 - 92, H * 0.88 - 16, 184, 24);
      g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H * 0.88);
    }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw, visit, live };
}

export function buildSkyTowerCabinet() {
  const g = new THREE.Group(); g.name = 'skyTowerCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0a3a7a, roughness: 0.22, metalness: 0.28, clearcoat: 0.85, clearcoatRoughness: 0.14 });
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), gloss, 'body');
  const sideL = canvasTex(256, 512, paintSide), sideR = canvasTex(256, 512, (c, w, h) => { paintSide(c, w, h); });
  const sideMat = t => new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22, roughness: 0.35, clearcoat: 0.55 });
  add(sideGeo(1), sideMat(sideL), 'sidePanelL'); add(sideGeo(-1), sideMat(sideR), 'sidePanelR');
  const tm = [];
  for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) {
    for (let i = 1; i < SPROFILE.length - 1; i++) {
      const a = SPROFILE[i], b = SPROFILE[i + 1];
      tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.03));
    }
  }
  add(mergeGeos(tm), new THREE.MeshPhysicalMaterial({ color: 0xf5cd2f, roughness: 0.3, metalness: 0.35, clearcoat: 0.6 }), 'trim');
  const mq = canvasTex(512, 128, paintMarquee);
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.65, roughness: 0.3 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.84, sw = Math.min(SW - 0.14, sh * 16 / 9);
  const at = attract(Math.round(280 * sw / sh), 280);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  const pt = canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = '#124a8a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#f5cd2f'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
    c.font = 'bold 28px "Courier New", monospace'; c.fillStyle = '#ffe14a'; c.textAlign = 'center';
    c.save(); c.translate(w * 0.28, h * 0.42); c.rotate(Math.PI / 2); c.fillText('FLY', 0, 0); c.restore();
    c.save(); c.translate(w * 0.28, h * 0.72); c.rotate(Math.PI / 2); c.fillText('FIRE', 0, 0); c.restore();
  });
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.4 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls';
  cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.18); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.12, clearcoat: 1 }))); }
  const yellow = new THREE.MeshPhysicalMaterial({ color: 0xf5cd2f, emissive: 0xf5cd2f, emissiveIntensity: 0.18, roughness: 0.15, clearcoat: 1 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xe01818, emissive: 0xe01818, emissiveIntensity: 0.18, roughness: 0.15, clearcoat: 1 });
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.022, 20).translate(0, 0.011, 0), yellow); b.position.set(0, 0, -0.08); b.name = 'btnFly'; cp.add(b); }
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.022, 20).translate(0, 0.011, 0), red); b.position.set(0, 0, -0.2); b.name = 'btnFire'; cp.add(b); }
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.36, 0.3), new THREE.MeshStandardMaterial({ color: 0x9a9ca2, metalness: 0.85, roughness: 0.35 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a1a, emissiveIntensity: 1.3 });
  for (const z of [-0.06, 0.06]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.06, 0.04).translate(0.006, 0.1, z), slot));
  const glow = new THREE.PointLight(0x70c8ff, 0.5, 2.4, 1.6); glow.name = 'screenGlow';
  glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, visit: at.visit, live: at.live, aspect: sw / sh };
  return g;
}
