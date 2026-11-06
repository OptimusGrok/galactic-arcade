// BURROW BUSTER cabinet (#13, room 1 south wall slot 2:4 = old blank G, beside SUPER PIP QUEST). Follows Tower Defence's design
// (/workspace/burrow-buster/shots/arcade_cabinet.jpg): pixel BURROW BUSTER marquee (yellow / red letters) with the digger, the red goggle
// monster and the green dragon; side art of orange-to-brown dirt layers with black tunnels, monsters, rocks; wood-grain kick panel with a
// black coin door and two red slots; a red PUMP button. ONE joystick (not two), no touch buttons drawn on the screen. No body neon
// (house rule), only the standard wall edge glow. Screen: a silent attract loop until the arcade zooms into the real game.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const canvasTex = (w, h, paint, flip) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
// 12x12 pixel sprites
const COL = { W: '#f4f4f4', B: '#2a6bff', b: '#16348a', K: '#101010', S: '#f2c08a', R: '#e8281e', r: '#9a120c', Y: '#ffe040', G: '#3ec83a', g: '#1e7a1e', O: '#ff8a1a', w: '#ffffff' };
const DIGGER = ['...BBBB.....', '..BBBBBB....', '..BwKwKB....', '..BSSSSB....', '...SSSS.....', '..WWWWWW....', '.WWBWWBWW...', '.S.WWWW.S...', '...WWWW.....', '...BB.BB....', '..BB...BB...', '............'];
const GOGGLE = ['....RRRR....', '..RRRRRRRR..', '.RRRRRRRRRR.', '.RYYKRRYYKR.', '.RYYKRRYYKR.', '.RRRRRRRRRR.', '.RRRRRRRRRR.', '.rRRRRRRRRr.', '..rRRRRRRr..', '..KK....KK..', '............', '............'];
const DRAGON = ['......GGG...', '.....GGwKG..', '.....GGGGGG.', '..g..GGGO...', '.gGg.GGG....', '.GGGGGGGG...', '..GGGGGGGG..', '..GYGYGGG...', '...GGGGG....', '...G...G....', '..GG...GG...', '............'];
const px = (g, rows, x, y, s) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (COL[r[i]]) { g.fillStyle = COL[r[i]]; g.fillRect(x + i * s, y + j * s, s, s); } });
const pixText = (g, t, x, y, size, fill, edge) => { g.font = `900 ${size}px "Courier New", monospace`; g.textBaseline = 'alphabetic'; g.lineWidth = size * 0.16; g.strokeStyle = edge; g.strokeText(t, x, y); g.fillStyle = fill; g.fillText(t, x, y); };
function paintMarquee(g, w, h) {
  g.fillStyle = '#0c0a10'; g.fillRect(0, 0, w, h); g.imageSmoothingEnabled = false;
  g.textAlign = 'left'; const s = h * 0.36;
  pixText(g, 'BURROW', w * 0.05, h * 0.44, s, '#ffd21e', '#5a2a00'); pixText(g, 'BUSTER', w * 0.05, h * 0.86, s, '#ff3a1a', '#4a0800');
  const k = Math.floor(h / 15); px(g, DIGGER, w * 0.6, h * 0.42, k); px(g, GOGGLE, w * 0.72, h * 0.42, k); px(g, DRAGON, w * 0.84, h * 0.3, k);
  g.strokeStyle = '#2a2230'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
}
function paintSide(g, w, h) {   // canvas = the side profile's bounding box: dirt layers top to bottom, tunnels, monsters, rocks
  const L = ['#e8a640', '#d98a2c', '#c0661e', '#9a4a18', '#7a3412'];
  L.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, h * i / L.length, w, h / L.length + 1); });
  let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,230,180,.12)'; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
  for (let i = 1; i < L.length; i++) { g.fillStyle = 'rgba(40,15,0,.35)'; for (let x = 0; x < w; x += 8) g.fillRect(x, h * i / L.length - 2 + ((x / 8) % 2) * 3, 8, 3); }
  const T = w * 0.07; g.fillStyle = '#0a0606';
  const tun = (pts) => { for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; g.fillRect(Math.min(x0, x1) * w - T / 2, Math.min(y0, y1) * h - T / 2, Math.abs(x1 - x0) * w + T, Math.abs(y1 - y0) * h + T); } };
  tun([[0.55, 0.1], [0.55, 0.3], [0.3, 0.3], [0.3, 0.45], [0.6, 0.45], [0.6, 0.62], [0.35, 0.62]]); tun([[0.2, 0.74], [0.55, 0.74]]); tun([[0.7, 0.22], [0.82, 0.22]]);
  const k = Math.max(2, Math.floor(T / 12));
  px(g, GOGGLE, 0.55 * w - 6 * k, 0.24 * h - 6 * k, k); px(g, GOGGLE, 0.35 * w - 6 * k, 0.6 * h - 6 * k, k);
  px(g, DIGGER, 0.26 * w - 6 * k, 0.74 * h - 6 * k, k); px(g, DRAGON, 0.48 * w - 6 * k, 0.74 * h - 6 * k, k);
  const rock = (x, y, r) => { g.fillStyle = '#6a5a50'; g.beginPath(); g.ellipse(x * w, y * h, r, r * 0.8, 0, 0, 7); g.fill(); g.fillStyle = '#9a8a80'; g.beginPath(); g.ellipse(x * w - r * 0.3, y * h - r * 0.3, r * 0.35, r * 0.25, 0, 0, 7); g.fill(); };
  rock(0.8, 0.4, T * 0.5); rock(0.15, 0.2, T * 0.45); rock(0.7, 0.88, T * 0.55); rock(0.25, 0.9, T * 0.4);
}
function attract(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const visit = { on: false };
  function draw(t) {
    g.imageSmoothingEnabled = false; g.fillStyle = '#07070f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a50e8'; g.fillRect(0, 22, W, 20);
    const L = ['#f0b43c', '#dc8a28', '#c0601c', '#963c14']; L.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, 42 + i * (H - 42) / 4, W, (H - 42) / 4 + 1); });
    g.fillStyle = '#000'; g.fillRect(W * 0.45, 42, 14, H * 0.45); g.fillRect(W * 0.2, 42 + H * 0.45, W * 0.55, 14); g.fillRect(W * 0.7, H * 0.3, 14, H * 0.3);
    const x = W * 0.2 + ((t * 30) % (W * 0.55)); px(g, DIGGER, x, 42 + H * 0.45 - 4, 2); px(g, GOGGLE, W * 0.7 - 5, H * 0.3 + ((t * 18) % (H * 0.3)) - 6, 2);
    g.textAlign = 'center'; g.font = 'bold 11px "Courier New", monospace'; g.fillStyle = '#ff4040'; g.fillText('1UP', 22, 14); g.fillStyle = '#fff'; g.fillText('HI-SCORE', W / 2, 14);
    if (!visit.on && Math.floor(t * 2) % 2 === 0) { g.font = 'bold 18px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 90, H * 0.78 - 18, 180, 26); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H * 0.78); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw, visit };
}
export function buildBBCabinet() {
  const g = new THREE.Group(); g.name = 'bbCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const body = new THREE.MeshPhysicalMaterial({ color: 0x0a0806, roughness: 0.3, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), body, 'body');
  // side art: map the dirt picture over the profile's bounding box (sideGeo uses x/y as UVs over that box)
  const xs = SPROFILE.map(p => p[0]), ys = SPROFILE.map(p => p[1]), bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  const sideMat = flip => { const t = canvasTex(Math.round(512 * bw / bh), 512, paintSide, flip); return new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22, roughness: 0.35, clearcoat: 0.6 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.03)); }
  add(mergeGeos(tm), body, 'trim');   // dark edge trim (no neon on the body)
  const mq = canvasTex(1024, 300, paintMarquee);
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.6, roughness: 0.3 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x08060c, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.84, sw = Math.min(SW - 0.14, sh * 4 / 5);
  const at = attract(Math.round(300 * sw / sh), 300);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  const pt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#3a1410'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8a030'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
    c.font = 'bold 30px "Courier New", monospace'; c.fillStyle = '#ffd23a'; c.textAlign = 'center';
    c.save(); c.translate(w * 0.25, h * 0.3); c.rotate(Math.PI / 2); c.fillText('PUMP', 0, 0); c.restore(); });
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.4 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.16); cp.add(s);   // ONE joystick
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.12, clearcoat: 1 }))); }
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.026, 24).translate(0, 0.013, 0), new THREE.MeshPhysicalMaterial({ color: 0xe01818, emissive: 0xe01818, emissiveIntensity: 0.2, roughness: 0.15, clearcoat: 1 }));
    b.position.set(0, 0, -0.14); b.name = 'btnPump'; cp.add(b); }
  // wood-grain kick panel + black coin door with two red slots
  const kp = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#7a3e1a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(${40 + i % 3 * 20},18,4,.35)`; c.lineWidth = 2; c.beginPath(); const x = (i * 37) % w; c.moveTo(x, 0); c.bezierCurveTo(x + 20, h * 0.3, x - 20, h * 0.6, x + 8, h); c.stroke(); } });
  const kf = new THREE.Mesh(new THREE.PlaneGeometry(SW - 0.04, 0.78).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ map: kp, roughness: 0.6 })); kf.position.set(0.862, 0.45, 0); kf.name = 'kickWood'; g.add(kf);
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.868, 0.42, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.34, 0.28), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.5, roughness: 0.4 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a1a, emissiveIntensity: 1.3 });
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.07, 0.045).translate(0.006, 0.08, z), slot));
  const glow = new THREE.PointLight(0xffb070, 0.5, 2.4, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, visit: at.visit, aspect: sw / sh };
  return g;
}
