// BERSERKER cabinet (cabinet only, game not added yet): art cropped from the design reference, plain dark-red/gold trim (no neon), static COMING SOON screen.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const L = new THREE.TextureLoader();
const load = (url, flip) => { const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
function screenTexture() {
  const c = document.createElement('canvas'); c.width = 270; c.height = 480; const g = c.getContext('2d');
  const bg = g.createRadialGradient(135, 220, 20, 135, 240, 300); bg.addColorStop(0, '#2a0a06'); bg.addColorStop(1, '#050203'); g.fillStyle = bg; g.fillRect(0, 0, 270, 480);
  g.strokeStyle = '#7a1a10'; g.lineWidth = 3; g.strokeRect(14, 14, 242, 452);
  g.textAlign = 'center'; g.fillStyle = '#ff3a1a'; g.shadowColor = '#ff2000'; g.shadowBlur = 14; g.font = 'bold 34px Georgia, serif'; g.fillText('BERSERKER', 135, 200);
  g.shadowBlur = 0; g.fillStyle = '#c89a3a'; g.font = '14px Georgia, serif'; g.fillText('ᛒ ᛖ ᚱ ᛊ ᛖ ᚱ ᚲ ᛖ ᚱ', 135, 232);
  g.fillStyle = '#ffd27a'; g.font = 'bold 22px "Courier New", monospace'; g.fillText('COMING SOON', 135, 320);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildBerserkerCabinet() {
  const g = new THREE.Group(); g.name = 'berserkerCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), new THREE.MeshPhysicalMaterial({ color: 0x0d0806, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }), 'body');
  const sideMat = flip => { const t = load('tex/bz_side.jpg', flip); return new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3, roughness: 0.32, clearcoat: 0.8 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  // plain dark-red trim (not emissive: no neon on the body)
  const tm = []; for (const z of [-SW / 2 - 0.006, SW / 2 + 0.006]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.02)); }
  add(mergeGeos(tm), new THREE.MeshStandardMaterial({ color: 0x5a0d08, roughness: 0.35, metalness: 0.3 }), 'trim');
  const mq = load('tex/bz_marquee.jpg');
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.55, roughness: 0.2 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.86, sw = Math.min(SW - 0.16, sh * 9 / 16);
  const st = screenTexture();
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.9, roughness: 0.15 }), 'screen');
  // control panel: two red ball-tops, red + gold buttons
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ color: 0x150c08, roughness: 0.45 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  for (const z of [0.3, -0.06]) { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, z); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.15, clearcoat: 1 }))); }
  [[0.2, 0xe01818], [0.13, 0xe01818], [-0.15, 0xf0b020], [-0.23, 0xf0b020]].forEach(([z, c], i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.02, 18).translate(0, 0.01, 0), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.15, roughness: 0.2, clearcoat: 1 })); b.position.set(0.02, 0, z); b.name = 'btn' + i; cp.add(b); });
  // front kick panel with blue knotwork rune strips (the panel art, not neon)
  const kn = load('tex/bz_knot.jpg');
  const kc = document.createElement('canvas'); kc.width = 4; kc.height = 4;
  for (const z of [-0.3, 0.3]) { const k = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.62).rotateY(Math.PI / 2).translate(0.864, 0.46, z), new THREE.MeshStandardMaterial({ map: kn, emissive: 0xffffff, emissiveMap: kn, emissiveIntensity: 0.35, roughness: 0.4 })); k.name = 'knotwork'; g.add(k); }
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.32, 0.28), new THREE.MeshStandardMaterial({ color: 0x120c0a, metalness: 0.6, roughness: 0.4 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2010, emissiveIntensity: 1.5 });
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.03).translate(0.006, 0.07, z), slot));
  const glow = new THREE.PointLight(0xff8060, 0.6, 2.6, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow };
  return g;
}
