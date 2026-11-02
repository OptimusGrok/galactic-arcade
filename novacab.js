// NOVA TETHER cabinet (Dave's design, nova_tether_cabinet.jpg): navy / gunmetal body with riveted steel edges and corner brackets
// (no neon on the body), NOVA TETHER marquee, starfighter-over-alien-world side art, silver ball joystick, orange FORCE and pink
// FIRE buttons, steel coin door with two red slots. Screen: a cheap side-scrolling shooter attract loop with INSERT CREDIT.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const L = new THREE.TextureLoader();
const load = (url, flip) => { const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
function navyTex() {   // brushed, slightly worn navy paint
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#1b2748'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 900; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(10,16,34,.35)' : 'rgba(70,90,140,.18)'; g.fillRect(Math.random() * 128, Math.random() * 256, 1 + Math.random() * 3, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function attract(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const stars = Array.from({ length: 70 }, (_, i) => [Math.random() * W, Math.random() * H, 0.4 + (i % 3) * 0.5]);
  function draw(t) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#07081f'); bg.addColorStop(0.6, '#1a0f3a'); bg.addColorStop(1, '#2a0c3a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(106,61,191,.35)'; g.beginPath(); g.arc(W * 0.78, H * 0.62, H * 0.32, 0, 7); g.fill();
    for (const [x, y, s] of stars) { g.fillStyle = s > 1 ? '#fff' : '#9aa6ff'; g.fillRect(((x - t * 40 * s) % W + W) % W, y, s * 1.6, s * 1.6); }
    const sy = H * 0.55 + Math.sin(t * 1.3) * H * 0.12, sx = W * 0.2;
    g.fillStyle = '#ff8a1f'; g.fillRect(sx - 22, sy - 2, 10 + Math.random() * 6, 4);   // engine flame
    g.fillStyle = '#3d5afe'; g.beginPath(); g.moveTo(sx + 18, sy); g.lineTo(sx - 12, sy - 8); g.lineTo(sx - 12, sy + 8); g.closePath(); g.fill();
    g.fillStyle = '#b8c4ff'; g.fillRect(sx - 4, sy - 3, 8, 3);
    const px = sx + 30 + Math.sin(t * 2) * 4; g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(px, sy, 6, 0, 7); g.fill(); g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.stroke();   // the Force pod
    for (let i = 0; i < 4; i++) { const bx = ((t * 260 + i * W / 4) % (W - px)) + px; g.fillStyle = '#5ee7ff'; g.fillRect(bx, sy - 1, 14, 2); }
    for (let i = 0; i < 5; i++) { const ex = W - ((t * 70 + i * W / 5) % (W * 0.9)), ey = H * 0.3 + Math.sin(t * 2 + i) * H * 0.22 + i * 6;
      g.fillStyle = i % 2 ? '#ff2e88' : '#b388ff'; g.beginPath(); g.arc(ex, ey, 6, 0, 7); g.fill(); g.fillStyle = '#ffd23f'; g.fillRect(ex - 2, ey - 2, 4, 4); }
    g.fillStyle = '#0009'; g.fillRect(0, 0, W, 22); g.font = 'bold 13px "Courier New", monospace'; g.textAlign = 'left'; g.fillStyle = '#f4f1ff';
    g.fillText('SCORE ' + String(Math.floor(t * 137) % 1000000).padStart(6, '0'), 6, 15); g.textAlign = 'right'; g.fillStyle = '#ffd23f'; g.fillText('HI 120500', W - 6, 15);
    g.textAlign = 'center'; g.font = '900 30px "Courier New", monospace'; g.fillStyle = '#1a0a30'; g.fillText('NOVA TETHER', W / 2 + 2, H * 0.3 + 2); g.fillStyle = '#ff2e88'; g.fillText('NOVA TETHER', W / 2, H * 0.3);
    if (Math.floor(t * 2) % 2 === 0) { g.font = 'bold 20px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 100, H - 40, 200, 30); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H - 18); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw };
}
export function buildNovaCabinet() {
  const g = new THREE.Group(); g.name = 'novaCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const navy = navyTex(), bodyMat = new THREE.MeshStandardMaterial({ color: 0xb8c4e8, map: navy, roughness: 0.55, metalness: 0.45 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.35, metalness: 0.9 });
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), bodyMat, 'body');
  const sideMat = flip => { const t = load('tex/nt_side.jpg', flip); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.24, roughness: 0.6 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.036)); }
  add(mergeGeos(tm), steel, 'trim');   // gunmetal edge frame
  const br = [], rv = [];
  for (const z of [-SW / 2 - 0.012, SW / 2 + 0.012]) {
    for (const [x, y] of [[0.05, 0.05], [0.8, 0.05], [0.05, 2.02], [0.8, 2.0]]) br.push(new THREE.BoxGeometry(0.11, 0.11, 0.012).translate(x, y, z));
    for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2));
      for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; rv.push(new THREE.SphereGeometry(0.009, 6, 4).translate(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z + Math.sign(z) * 0.012)); } } }
  add(mergeGeos(br), steel, 'brackets'); add(mergeGeos(rv), steel, 'rivets');
  const mq = load('tex/nt_marquee.jpg');
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.5, roughness: 0.5 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x080a14, roughness: 0.4, metalness: 0.4 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh0 = sf.L * 0.84, sw = Math.min(SW - 0.12, sh0 * 16 / 9), sh = Math.min(sh0, sw * 9 / 16 * 1.12);
  const at = attract(Math.round(220 * sw / sh), 220);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ color: 0x24305a, map: navy, roughness: 0.5, metalness: 0.4 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.17); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xc8ccd4, metalness: 1, roughness: 0.18, clearcoat: 1 }))); }
  [[-0.06, 0xff7a10, 'btnForce'], [-0.17, 0xe0208a, 'btnFire']].forEach(([z, c, n]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.022, 22).translate(0, 0.011, 0), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.12, roughness: 0.2, clearcoat: 1 })); b.position.set(0, 0, z); b.name = n; cp.add(b); });
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.34, 0.28), new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.8, roughness: 0.4 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a1a, emissiveIntensity: 1.3 });
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.06, 0.04).translate(0.006, 0.08, z), slot));
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.04).translate(0.006, -0.06, z), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6 })));
  const glow = new THREE.PointLight(0x8a7cff, 0.5, 2.4, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, aspect: sw / sh };
  return g;
}
