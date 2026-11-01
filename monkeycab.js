// MONKEY CROSSING cabinet: jungle-green body, copper trim (no neon on the body), lit marquee with the gold ticket icon,
// side art of the monkey (from behind) crossing a road. Art cropped from monkey-cross/monkey_crossing_cabinet.jpg.
// Screen: a cheap animated attract loop (lanes, cars, logs, a hopping monkey, INSERT CREDIT) drawn on a canvas.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const L = new THREE.TextureLoader();
const load = (url, flip) => { const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
function attract() {
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const lanes = ['grass', 'road', 'road', 'grass', 'river', 'river', 'grass', 'rail', 'grass', 'road', 'road', 'grass'];
  function draw(t) {
    const lh = 40, scroll = (t * 18) % lh;
    for (let i = -1; i < 13; i++) { const k = lanes[((i + Math.floor(t * 18 / lh)) % 12 + 12) % 12], y = 480 - (i + 1) * lh + scroll;
      g.fillStyle = k === 'grass' ? (i & 1 ? '#5fb83c' : '#55ad35') : k === 'road' ? '#45474f' : k === 'river' ? '#3c8fe0' : '#8a7a5a'; g.fillRect(0, y, 270, lh);
      if (k === 'road') { g.fillStyle = '#e8e8e8'; for (let x = (t * 30) % 40; x < 270; x += 40) g.fillRect(x, y + lh / 2 - 1, 18, 2);
        const dir = i & 1 ? 1 : -1; for (let n = 0; n < 2; n++) { const x = ((t * 60 * dir + n * 150 + i * 47) % 330 + 330) % 330 - 30; g.fillStyle = n ? '#f2a81a' : '#e8462a'; g.fillRect(x, y + 8, 44, 24); g.fillStyle = '#bfe6ff'; g.fillRect(x + (dir > 0 ? 28 : 6), y + 11, 10, 18); } }
      if (k === 'river') { const dir = i & 1 ? 1 : -1; g.fillStyle = '#7a4a22'; for (let n = 0; n < 2; n++) { const x = ((t * 34 * dir + n * 160 + i * 31) % 340 + 340) % 340 - 70; g.fillRect(x, y + 9, 70, 22); } }
      if (k === 'rail') { g.fillStyle = '#5a4a3a'; for (let x = 0; x < 270; x += 14) g.fillRect(x, y + 6, 6, 28); g.fillStyle = '#c0c0c8'; g.fillRect(0, y + 12, 270, 3); g.fillRect(0, y + 26, 270, 3); }
      if (k === 'grass' && i % 3 === 0) { g.fillStyle = '#2f7a22'; g.beginPath(); g.arc(40 + (i * 53) % 190, y + 20, 13, 0, 7); g.fill(); } }
    const hop = Math.abs(Math.sin(t * 5)) * 10, mx = 135 + Math.sin(t * 0.7) * 20, my = 380 - hop;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(mx, 396, 12, 5, 0, 0, 7); g.fill();
    g.fillStyle = '#7a4219'; g.beginPath(); g.arc(mx, my, 13, 0, 7); g.fill(); g.beginPath(); g.arc(mx, my - 15, 10, 0, 7); g.fill();
    g.beginPath(); g.arc(mx - 10, my - 18, 4, 0, 7); g.arc(mx + 10, my - 18, 4, 0, 7); g.fill();
    g.fillStyle = '#0008'; g.fillRect(0, 0, 270, 92); g.textAlign = 'center';
    g.font = '900 30px "Arial Black", Arial, sans-serif'; g.fillStyle = '#ff6a3a'; g.fillText('MONKEY', 135, 40); g.fillStyle = '#ffd23a'; g.fillText('CROSSING', 135, 76);
    if (Math.floor(t * 2) % 2 === 0) { g.font = 'bold 22px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(28, 432, 214, 34); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', 135, 456); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw };
}
export function buildMonkeyCabinet() {
  const g = new THREE.Group(); g.name = 'monkeyCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), new THREE.MeshPhysicalMaterial({ color: 0x1f4a1c, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }), 'body');
  const sideMat = flip => { const t = load('tex/mc_side.jpg', flip); return new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3, roughness: 0.32, clearcoat: 0.8 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.006, SW / 2 + 0.006]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.022)); }
  add(mergeGeos(tm), new THREE.MeshStandardMaterial({ color: 0xb8673a, roughness: 0.3, metalness: 0.85 }), 'trim');   // copper, not emissive
  const mq = load('tex/mc_marquee.jpg');
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.6, roughness: 0.2 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x0c0f0a, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.86, sw = Math.min(SW - 0.16, sh * 9 / 16);
  const at = attract();
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.9, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]), pt = load('tex/mc_panel.jpg');
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ color: 0x24501f, roughness: 0.45 }), 'controlPanel');
  add(segPlane(SPROFILE[2], SPROFILE[3], SW - 0.03, 0.003), new THREE.MeshStandardMaterial({ map: pt, emissive: 0xffffff, emissiveMap: pt, emissiveIntensity: 0.25, roughness: 0.4 }), 'panelArt');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.26); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.15, clearcoat: 1 }))); }
  [[0.08, 0xe01818], [0.0, 0xe01818], [-0.08, 0xe01818], [-0.17, 0x2050e0]].forEach(([z, c], i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.02, 18).translate(0, 0.01, 0), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.15, roughness: 0.2, clearcoat: 1 })); b.position.set(0.02, 0, z); b.name = 'btn' + i; cp.add(b); });
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.32, 0.28), new THREE.MeshStandardMaterial({ color: 0x1a120c, metalness: 0.6, roughness: 0.4 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x402808, emissive: 0xffa020, emissiveIntensity: 1.4 });
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.03).translate(0.006, 0.07, z), slot));
  const glow = new THREE.PointLight(0x9fff80, 0.6, 2.6, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw };
  return g;
}
