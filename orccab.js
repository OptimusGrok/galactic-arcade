// ORC ATTACK cabinet (Dave's design, orc_attack_cabinet_dave.jpg): dark wooden body with iron corner brackets (no neon on the body),
// green jagged ORC ATTACK marquee, side art of a roaring orc with an axe before a burning castle, red joystick,
// red / yellow / green buttons, coin door with two red slots. Screen: a cheap tower-defence attract loop with INSERT CREDIT.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const L = new THREE.TextureLoader();
const load = (url, flip) => { const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
function woodTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#4a2c18'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 140; i++) { const x = Math.random() * 256; g.strokeStyle = `rgba(${20 + Math.random() * 30 | 0},${10 + Math.random() * 15 | 0},4,${0.15 + Math.random() * 0.3})`; g.lineWidth = 0.6 + Math.random() * 2.4;
    g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 3, y); g.stroke(); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(15,8,2,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, i * 86 + 40); g.lineTo(256, i * 86 + 40); g.stroke(); }   // planks
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function attract(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const visit = { on: false };
  const path = [[0, .3], [.3, .3], [.3, .7], [.62, .7], [.62, .25], [.85, .25], [.85, .6], [1, .6]].map(([x, y]) => [x * W, y * H]);
  const seg = []; let tot = 0; for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(l); tot += l; }
  const at = d => { d = ((d % tot) + tot) % tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const k = d / seg[i], a = path[i], b = path[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } d -= seg[i]; } return path[path.length - 1]; };
  const towers = [[.17, .55], [.46, .5], [.46, .86], [.74, .45], [.74, .12]].map(([x, y]) => [x * W, y * H]);
  function draw(t) {
    g.fillStyle = '#3d4a22'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = i & 1 ? '#34401c' : '#465428'; g.fillRect((i * 97) % W, (i * 53) % H, 18, 10); }
    g.strokeStyle = '#8a7650'; g.lineWidth = H * 0.1; g.lineJoin = 'round'; g.beginPath(); path.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    g.strokeStyle = '#a08a5e'; g.lineWidth = H * 0.06; g.stroke();
    const sp = 34, orcs = []; for (let n = 0; n < 9; n++) { const d = t * sp - n * 38; if (d > 0) orcs.push(at(d)); }
    for (const [x, y] of orcs) { g.fillStyle = '#4f8a2a'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillStyle = '#2a1a0a'; g.fillRect(x - 5, y + 3, 10, 4); }
    towers.forEach(([x, y], i) => { g.fillStyle = '#6a6458'; g.fillRect(x - 9, y - 9, 18, 18); g.fillStyle = '#8a8274'; g.fillRect(x - 9, y - 13, 5, 5); g.fillRect(x + 4, y - 13, 5, 5);
      const o = orcs.find(o => Math.hypot(o[0] - x, o[1] - y) < 70); if (o && Math.floor(t * 4 + i) % 2) { g.strokeStyle = i % 2 ? '#ffd040' : '#c070ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(o[0], o[1]); g.stroke(); } });
    g.fillStyle = '#0009'; g.fillRect(0, 0, W, 46); g.textAlign = 'center'; g.font = '900 34px Georgia, serif'; g.fillStyle = '#b8d84a'; g.fillText('ORC ATTACK', W / 2, 36);
    g.font = 'bold 14px Georgia, serif'; g.fillStyle = '#f3e6c8'; g.textAlign = 'left'; g.fillText('Wave ' + (1 + Math.floor(t / 12) % 12), 8, 64);
    if (!visit.on && Math.floor(t * 2) % 2 === 0) { g.textAlign = 'center'; g.font = 'bold 22px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 110, H - 46, 220, 34); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H - 22); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw, visit };
}
export function buildOrcCabinet() {
  const g = new THREE.Group(); g.name = 'orcCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const wood = woodTex(), woodMat = new THREE.MeshStandardMaterial({ color: 0xb08060, map: wood, roughness: 0.75, metalness: 0.05 });
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), woodMat, 'body');
  const sideMat = flip => { const t = load('tex/oa_side.jpg', flip); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22, roughness: 0.6 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.04)); }
  add(mergeGeos(tm), woodMat, 'trim');   // thick wooden edge frame
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.5, metalness: 0.85 }), br = [];
  for (const z of [-SW / 2 - 0.012, SW / 2 + 0.012]) for (const [x, y] of [[0.05, 0.05], [0.8, 0.05], [0.05, 2.02], [0.8, 2.0]]) br.push(new THREE.BoxGeometry(0.12, 0.12, 0.012).translate(x, y, z));
  add(mergeGeos(br), iron, 'brackets');
  const mq = load('tex/oa_marquee.jpg');
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.45, roughness: 0.5 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.4, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.84, sw = Math.min(SW - 0.14, sh * 4 / 3);
  const at = attract(Math.round(240 * sw / sh), 240);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ color: 0x3a2214, map: wood, roughness: 0.7 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.22); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.15, clearcoat: 1 }))); }
  [[0.06, 0.03, 0xe01818], [0.0, 0.03, 0xf0c010], [-0.06, 0.03, 0x18a830], [0.06, -0.03, 0xe01818], [0.0, -0.03, 0xf0c010], [-0.06, -0.03, 0x18a830]].forEach(([z, x, c], i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.02, 18).translate(0, 0.01, 0), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.12, roughness: 0.2, clearcoat: 1 })); b.position.set(x, 0, z - 0.08); b.name = 'btn' + i; cp.add(b); });
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.34, 0.28), new THREE.MeshStandardMaterial({ color: 0x141210, metalness: 0.7, roughness: 0.45 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a1a, emissiveIntensity: 1.3 });
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.06, 0.04).translate(0.006, 0.08, z), slot));
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.04).translate(0.006, -0.06, z), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6 })));
  const glow = new THREE.PointLight(0xffb060, 0.5, 2.4, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, visit: at.visit, aspect: sw / sh };
  return g;
}
