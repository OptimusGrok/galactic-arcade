// ROCKFALL RUSH cabinet (#14, room 1 south wall slot 2:3 = old blank F, x=-4), between blank E (south-wall centre)
// and BURROW BUSTER. Art cut from RPG's mockup (tex/rf_cabinet_mockup.jpg): gold stony ROCKFALL RUSH marquee with
// diamonds (tex/rf_marquee.jpg) and side art of the miner, boulders and diamonds (tex/rf_side.jpg). Glossy dark
// body (no neon on the body, only the standard wall edge glow). Rusty control panel with a red-ball joystick and
// two buttons matching the mockup; coin door with two red slots. Screen: a silent attract loop until the arcade
// zooms into the real game.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const L = new THREE.TextureLoader();
const load = (url, flip) => { const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
const canvasTex = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const COL = { Y: '#e8c030', y: '#f8d848', S: '#f0b088', B: '#3a4cc8', b: '#5a70f0', K: '#101010', R: '#6a3a18', D: '#5a3012', W: '#f4f4f4' };
const MINER = ['...YYYY...', '..YYYYYY..', '..YYYYYY..', '..SSSSSS..', '..SKSSKS..', '..SSSSSS..', '..BBBBBB..', '.B.BBBB.B.', '...BBBB...', '...KK.KK..', '..RR...RR.', '..........'];
const px = (g, rows, x, y, s) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (COL[r[i]]) { g.fillStyle = COL[r[i]]; g.fillRect(x + i * s, y + j * s, s, s); } });
function attract(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const visit = { on: false };
  function draw(t) {
    g.imageSmoothingEnabled = false;
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1a1028'); sky.addColorStop(1, '#3e2610'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#523416'; g.fillRect(0, H * 0.55, W, H * 0.45);
    g.fillStyle = '#2a1808'; for (let i = 0; i < 18; i++) g.fillRect(((i * 47 + t * 20) % (W + 20)) - 10, H * 0.55 + (i % 5) * 14, 8, 6);
    g.fillStyle = '#6a6a74';
    for (let i = 0; i < 5; i++) { const x = ((i * 70 + 30 - t * 18) % (W + 40)) - 16; g.beginPath(); g.ellipse(x, H * 0.52, 14, 12, 0, 0, 7); g.fill(); }
    g.fillStyle = '#3aa0e0';
    for (let i = 0; i < 4; i++) { const x = ((i * 90 + 80 + t * 12) % (W + 30)) - 10, y = H * 0.38 + (i % 2) * 16; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 8, y); g.lineTo(x, y + 10); g.lineTo(x - 8, y); g.closePath(); g.fill(); }
    const mx = W * 0.22 + Math.sin(t * 1.4) * (W * 0.18); px(g, MINER, mx, H * 0.55 - 8, 3);
    g.textAlign = 'center'; g.font = 'bold 22px "Courier New", monospace'; g.lineWidth = 5; g.strokeStyle = '#5a2a00';
    g.strokeText('ROCKFALL RUSH', W / 2, 36); g.fillStyle = '#ffe27a'; g.fillText('ROCKFALL RUSH', W / 2, 36);
    if (!visit.on && Math.floor(t * 2) % 2 === 0) { g.font = 'bold 18px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 96, H * 0.78 - 18, 192, 26); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H * 0.78); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw, visit };
}
export function buildRockfallCabinet() {
  const g = new THREE.Group(); g.name = 'rockfallCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0a0806, roughness: 0.22, metalness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), gloss, 'body');
  const sideMat = flip => { const t = load('tex/rf_side.jpg', flip); return new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22, roughness: 0.35, clearcoat: 0.6 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.03)); }
  add(mergeGeos(tm), gloss, 'trim');
  const mq = load('tex/rf_marquee.jpg');
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.6, roughness: 0.3 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x08060c, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.84, sw = Math.min(SW - 0.14, sh * 4 / 3);
  const at = attract(Math.round(240 * sw / sh), 240);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  const pt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#3a2410'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8a030'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
    c.font = 'bold 28px "Courier New", monospace'; c.fillStyle = '#ffe27a'; c.textAlign = 'center';
    c.save(); c.translate(w * 0.28, h * 0.55); c.rotate(Math.PI / 2); c.fillText('DIG', 0, 0); c.restore(); });
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.4 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.18); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.12, clearcoat: 1 }))); }
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x2a8cff, emissive: 0x2a8cff, emissiveIntensity: 0.2, roughness: 0.15, clearcoat: 1 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xe01818, emissive: 0xe01818, emissiveIntensity: 0.15, roughness: 0.15, clearcoat: 1 });
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.022, 20).translate(0, 0.011, 0), blue); b.position.set(0, 0, -0.08); b.name = 'btnBlue'; cp.add(b); }
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.022, 20).translate(0, 0.011, 0), red); b.position.set(0, 0, -0.2); b.name = 'btnRed'; cp.add(b); }
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.36, 0.3), new THREE.MeshStandardMaterial({ color: 0x9a9ca2, metalness: 0.85, roughness: 0.35 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a1a, emissiveIntensity: 1.3 });
  for (const z of [-0.06, 0.06]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.06, 0.04).translate(0.006, 0.1, z), slot));
  const glow = new THREE.PointLight(0xffc070, 0.5, 2.4, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, visit: at.visit, aspect: sw / sh };
  return g;
}
