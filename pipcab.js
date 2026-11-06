// SUPER PIP QUEST cabinet (#11, blank A = west wall slot 1:0). Dave's approved mockup: tex/spq_cabinet_mockup.jpg (copied from
// Side Scroller Platform's /workspace/platformer/art/pip_cabinet_mockup.jpg). Glossy black body (no neon on the body, only the standard
// wall edge glow); marquee and side art are cut straight from the mockup (tex/spq_marquee.jpg, tex/spq_side.jpg): pixel SUPER PIP QUEST /
// THE QUEST FOR THE SUN CROWN, teal-capped Pip jumping over coins, chomper pipes and a sunset. Purple control panel with a red ball
// joystick, JUMP and RUN buttons; brushed steel coin door with two red slots and an INSERT COIN plate. Screen: a silent attract loop.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const L = new THREE.TextureLoader();
const load = (url, flip) => { const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
const canvasTex = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const PIP = ['...TTTT...', '..TTTTTTT.', '..SSSSS...', '.SSKSSKS..', '..SSSSS...', '.BBTTTTBB.', '.S.BBBB.S.', '...B..B...', '..NN..NN..'];
const COL = { T: '#1fb5a8', S: '#f2b47a', K: '#1a1020', B: '#2a5bd8', N: '#6a3a1a' };
const pxc = (g, rows, x, y, s) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (COL[r[i]]) { g.fillStyle = COL[r[i]]; g.fillRect(x + i * s, y + j * s, s, s); } });
function attract(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const visit = { on: false };
  function draw(t) {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#3a8cff'); sky.addColorStop(1, '#a8dcff'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const x = ((i * 97 - t * 12) % (W + 60) + W + 60) % (W + 60) - 30; g.beginPath(); g.ellipse(x, 30 + (i % 2) * 22, 22, 8, 0, 0, 7); g.fill(); }
    g.fillStyle = '#5bbf4a'; for (let i = -1; i < 6; i++) { const x = i * 80 - (t * 25 % 80); g.beginPath(); g.ellipse(x, H - 40, 50, 34, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = '#3a9a34'; g.fillRect(0, H - 40, W, 6); g.fillStyle = '#8a5a2a'; g.fillRect(0, H - 34, W, 34);
    const px = W * 0.35, jump = Math.abs(Math.sin(t * 2.2)) * 34; pxc(g, PIP, px, H - 40 - 27 - jump, 3);
    for (let i = 0; i < 3; i++) { const x = ((i * 70 + 120 - t * 25) % (W + 20) + W + 20) % (W + 20); g.fillStyle = '#ffd23a'; g.fillRect(x, H - 92 - (i % 2) * 14, 7, 10); }
    g.textAlign = 'center'; g.font = 'bold 26px "Courier New", monospace'; g.lineWidth = 5; g.strokeStyle = '#5a1a08';
    g.strokeText('SUPER PIP QUEST', W / 2, 60); g.fillStyle = '#ffb21a'; g.fillText('SUPER PIP QUEST', W / 2, 60);
    g.font = 'bold 11px "Courier New", monospace'; g.fillStyle = '#fff'; g.fillText('THE QUEST FOR THE SUN CROWN', W / 2, 78);
    if (!visit.on && Math.floor(t * 2) % 2 === 0) { g.font = 'bold 20px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 100, H / 2 - 4, 200, 30); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H / 2 + 18); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw, visit };
}
export function buildPipCabinet() {
  const g = new THREE.Group(); g.name = 'pipCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x060608, roughness: 0.18, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), gloss, 'body');
  const sideMat = flip => { const t = load('tex/spq_side.jpg', flip); return new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22, roughness: 0.3, clearcoat: 0.8 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.03)); }
  add(mergeGeos(tm), gloss, 'trim');   // glossy black edge (no neon on the body)
  const mq = load('tex/spq_marquee.jpg');
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.6, roughness: 0.3 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x08060c, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.84, sw = Math.min(SW - 0.14, sh * 4 / 3);
  const at = attract(Math.round(240 * sw / sh), 240);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  const pt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#2a1650'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = ['#ff5a3a', '#3ad8ff', '#ffd23a', '#7aff5a'][i % 4]; c.fillRect(Math.random() * w, Math.random() * h, 4, 4); }
    c.font = 'bold 30px "Courier New", monospace'; c.fillStyle = '#ffd23a'; c.textAlign = 'center';
    for (const [y, t] of [[0.82, 'JUMP'], [0.3, 'RUN']]) { c.save(); c.translate(w * 0.28, h * y); c.rotate(Math.PI / 2); c.fillText(t, 0, 0); c.restore(); } });
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.4 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.2); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.12, clearcoat: 1 }))); }
  const red = new THREE.MeshPhysicalMaterial({ color: 0xe01818, emissive: 0xe01818, emissiveIntensity: 0.15, roughness: 0.15, clearcoat: 1 });
  for (const [z, n] of [[-0.08, 'btnJump'], [-0.2, 'btnRun']]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.022, 20).translate(0, 0.011, 0), red); b.position.set(0, 0, z); b.name = n; cp.add(b); }
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.36, 0.3), new THREE.MeshStandardMaterial({ color: 0x9a9ca2, metalness: 0.85, roughness: 0.35 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a1a, emissiveIntensity: 1.3 });
  for (const z of [-0.06, 0.06]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.06, 0.04).translate(0.006, 0.1, z), slot));
  const plate = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#9a9ca2'; c.fillRect(0, 0, w, h); c.font = '900 52px Arial Black, Arial, sans-serif'; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = '#1a2a6a';
    c.strokeText('INSERT', w / 2, 56); c.strokeText('COIN', w / 2, 112); c.fillStyle = '#ffb21a'; c.fillText('INSERT', w / 2, 56); c.fillText('COIN', w / 2, 112); });
  door.add(new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12).rotateY(Math.PI / 2).translate(0.009, -0.07, 0), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.4, metalness: 0.4 })));
  const glow = new THREE.PointLight(0x80c0ff, 0.5, 2.4, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, visit: at.visit, aspect: sw / sh };
  return g;
}
