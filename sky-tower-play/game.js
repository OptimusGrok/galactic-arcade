// SKY TOWER — 3D jetpack climb, arcade copy only.
// 50 Lego platforms from the clouds to outer space. Tickets only via TicketArt
// (parent.__neonTicket) while a real credit is running; never in DEMO / WATCH.
import * as THREE from '../vendor/three.module.js';

const N = 50, GAP = 5.4;
const FLY = { drain: 0.125, fill: 0.16, min: 0.08, up: 3.4, down: 2.4 };
const R = 0.32, HI_KEY = 'arcade_skytower_best', RUN_CAP = 20;
const BRICKS = [0xc91a09, 0xf5cd2f, 0x0055bf, 0x237841, 0xfe8a18, 0xf4f4f4, 0x81007b, 0x078bc9];
const studGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.07, 7);
const dummy = new THREE.Object3D();
const V3 = THREE.Vector3;

function part(parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
}
const S = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h);
const CYL = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, s);
const lamb = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
const basic = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c, toneMapped: false }, o));

function readChar() {
  try {
    const raw = localStorage.getItem('galacticarcade.player.char');
    if (raw === 'alien' || raw === 'monkey') return raw;
    const o = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}');
    if (o && o.char === 'alien') return 'alien';
  } catch (e) {}
  return 'monkey';
}
function readBest() { try { return Math.max(0, parseInt(localStorage.getItem(HI_KEY), 10) || 0); } catch (e) { return 0; } }
function saveBest(n) { try { if (window.__DEMO) return; const b = Math.max(readBest(), n | 0); localStorage.setItem(HI_KEY, String(b)); return b; } catch (e) { return n; } }
function coolOn() {
  try { if (parent !== window && parent.__powerSave) return !!parent.__powerSave.on; } catch (e) {}
  try { const v = localStorage.getItem('neonarcade.powersave'); if (v === '0') return false; if (v === '1') return true; } catch (e) {}
  return matchMedia('(pointer:coarse)').matches;
}

function addJetpack(torso) {
  const g = new THREE.Group(); g.name = 'gaBk_jetpack'; g.position.set(0, 0.3, -0.22); torso.add(g);
  const jm = lamb(0xb8c0cc), jr = lamb(0xd42a2a);
  const flameM = (c, op) => basic(c, { transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shellM = flameM(0xff2a00, 0.62), outerM = flameM(0xff9a1a, 0.95), coreM = flameM(0xfff6c8, 1);
  const shellGeo = new THREE.ConeGeometry(0.2, 0.82, 7), outerGeo = new THREE.ConeGeometry(0.11, 1.2, 7), coreGeo = new THREE.ConeGeometry(0.045, 0.78, 6);
  [-1, 1].forEach(sd => {
    part(g, CYL(0.07, 0.07, 0.3, 10), jm, 0.08 * sd, 0, -0.05);
    part(g, new THREE.ConeGeometry(0.07, 0.08, 10), jr, 0.08 * sd, 0.19, -0.05);
    const th = new THREE.Group(); th.name = 'gaThruster'; th.position.set(0.08 * sd, -0.16, -0.05); th.visible = false; g.add(th);
    [[shellGeo, shellM, 'gaFlameShell', 0.82], [outerGeo, outerM, 'gaFlameOuter', 1.2], [coreGeo, coreM, 'gaFlameCore', 0.78]].forEach(q => {
      const m = part(th, q[0], q[1], 0, -q[3] / 2, 0); m.rotation.x = Math.PI; m.name = q[2]; m.renderOrder = 3;
    });
  });
  part(g, new THREE.BoxGeometry(0.14, 0.2, 0.05), lamb(0x303038), 0, 0, 0);
  return g;
}
function addGun(el) {
  const gun = new THREE.Group(); gun.name = 'skyGun';
  const metal = lamb(0x4a5560), glow = basic(0x48f2ff);
  part(gun, new THREE.BoxGeometry(0.05, 0.05, 0.22), metal, 0, 0, 0.08);
  part(gun, CYL(0.018, 0.016, 0.16, 8), metal, 0, 0, 0.22).rotation.x = Math.PI / 2;
  part(gun, CYL(0.022, 0.022, 0.03, 8), glow, 0, 0, 0.3).rotation.x = Math.PI / 2;
  part(gun, new THREE.BoxGeometry(0.03, 0.07, 0.04), metal, 0, -0.04, 0.02);
  el.add(gun); gun.position.set(0.02, -0.28, 0.08); gun.rotation.set(-0.15, 0, 0);
  return gun;
}

function makeMonkey() {
  const fur = lamb(0x4e2a14), tan = lamb(0xd9a779), navy = lamb(0x1d2452), navyD = lamb(0x1d2452, { side: THREE.DoubleSide });
  const jeans = lamb(0x2a3a6a), cream = lamb(0xf1e8d6), maroon = lamb(0x8a1e2c), pink = lamb(0xff4f9e), pinkD = lamb(0xd93a82);
  const iris = lamb(0x8a4c1a), lip = lamb(0x3a1a10), hp = lamb(0x18181f);
  const root = new THREE.Group(); root.name = 'player';
  const hips = new THREE.Group(); hips.position.y = 0.8; root.add(hips);
  part(hips, CYL(0.2, 0.21, 0.16, 12), jeans, 0, 0, 0, 1, 1, 0.8);
  const legs = [];
  for (const sd of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.1 * sd, -0.04, 0); hips.add(leg);
    part(leg, CYL(0.11, 0.115, 0.42, 10), jeans, 0, -0.2, 0);
    const knee = new THREE.Group(); knee.position.y = -0.4; leg.add(knee);
    part(knee, CYL(0.115, 0.13, 0.3, 10), jeans, 0, -0.14, 0);
    const shoe = new THREE.Group(); shoe.position.set(0, -0.34, 0.04); knee.add(shoe);
    part(shoe, new THREE.BoxGeometry(0.17, 0.1, 0.26), cream, 0, -0.01, 0.02);
    part(shoe, S(0.088, 10, 8), maroon, 0, -0.01, 0.13, 0.98, 0.6, 0.75);
    part(shoe, new THREE.BoxGeometry(0.185, 0.045, 0.34), lamb(0xffffff), 0, -0.065, 0.03);
    legs.push({ leg, knee });
  }
  const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
  part(torso, CYL(0.24, 0.27, 0.56, 14), lamb(0x3a8a4a), 0, 0.26, 0, 1, 1, 0.76);
  const gap = 0.42;
  part(torso, new THREE.CylinderGeometry(0.265, 0.29, 0.5, 16, 1, true, gap, Math.PI * 2 - gap * 2), navyD, 0, 0.29, 0, 1, 1, 1.06);
  const neck = new THREE.Group(); neck.position.y = 0.58; torso.add(neck);
  part(neck, CYL(0.075, 0.085, 0.12, 10), fur, 0, 0.02, 0);
  const head = new THREE.Group(); head.position.y = 0.08; neck.add(head);
  part(head, S(0.18, 16, 12), fur, 0, 0.15, -0.01, 1, 1.02, 0.98);
  part(head, S(0.11, 12, 10), tan, 0.045, 0.16, 0.095, 0.75, 0.9, 0.75);
  part(head, S(0.11, 12, 10), tan, -0.045, 0.16, 0.095, 0.75, 0.9, 0.75);
  part(head, S(0.11, 12, 10), tan, 0, 0.07, 0.13, 1.1, 0.8, 0.85);
  for (const sd of [-1, 1]) {
    part(head, S(0.046, 10, 8), lamb(0xffffff), 0.06 * sd, 0.165, 0.175, 1, 1.15, 0.7);
    part(head, S(0.03, 8, 6), iris, 0.058 * sd, 0.163, 0.2, 1, 1.1, 0.6);
    part(head, S(0.017, 8, 6), lamb(0x111111), 0.057 * sd, 0.163, 0.214, 1, 1.1, 0.5);
    part(head, S(0.07, 10, 8), fur, 0.185 * sd, 0.15, 0, 0.45, 1, 0.9);
  }
  const smile = part(head, new THREE.TorusGeometry(0.055, 0.008, 5, 12, Math.PI * 0.8), lip, 0, 0.065, 0.214);
  smile.rotation.set(-0.35, 0, Math.PI + Math.PI * 0.1);
  const cap = new THREE.Group(); cap.position.set(0, 0.215, -0.005); cap.rotation.x = -0.08; cap.userData.gaCap = 1; head.add(cap);
  part(cap, new THREE.SphereGeometry(0.188, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), pink, 0, 0, 0, 1, 0.82, 1.03);
  part(cap, CYL(0.19, 0.19, 0.03, 16), pinkD, 0, 0.005, 0, 1, 1, 1.03);
  part(cap, new THREE.CylinderGeometry(0.15, 0.15, 0.014, 14, 1, false, -Math.PI * 0.5, Math.PI), pinkD, 0, -0.005, 0.17).rotation.x = 0.1;
  const arms = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.29 * sd, 0.47, 0); torso.add(sh);
    part(sh, S(0.105, 10, 8), navy, 0.01 * sd, -0.02, 0);
    part(sh, CYL(0.09, 0.08, 0.34, 10), navy, 0.02 * sd, -0.17, 0);
    const el = new THREE.Group(); el.position.set(0.02 * sd, -0.34, 0); sh.add(el);
    part(el, CYL(0.078, 0.068, 0.24, 10), navy, 0, -0.12, 0);
    const hand = part(el, S(0.058, 10, 8), tan, 0, -0.32, 0.01, 0.8, 1.05, 1);
    arms.push({ sh, el, hand, sd });
  }
  const band = part(neck, new THREE.TorusGeometry(0.13, 0.018, 6, 16, Math.PI * 1.15), hp, 0, -0.02, -0.03);
  band.rotation.set(Math.PI / 2 - 0.25, 0, Math.PI * 0.95);
  addJetpack(torso);
  const gun = addGun(arms[1].el);
  root.userData = { hips, torso, neck, head, legs, arms, gun, char: 'monkey', bot: null };
  return root;
}

function makeAlien() {
  const skin = lamb(0x9aa5ab), skinD = lamb(0x7e888e), gunM = lamb(0x5a636e), gunD = lamb(0x3c434c);
  const purp = lamb(0x6a3a9a), glove = lamb(0x8b959e), cyan = basic(0x48f2ff);
  const pink = lamb(0xff4f9e), pinkD = lamb(0xd93a82);
  const eyeM = basic(0x000000, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const root = new THREE.Group(); root.name = 'player';
  const hips = new THREE.Group(); hips.position.y = 0.8; root.add(hips);
  part(hips, S(0.19, 16, 12), gunM, 0, 0.02, 0, 1.2, 0.82, 0.98);
  const legs = [];
  for (const sd of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.12 * sd, -0.015, 0); hips.add(leg);
    part(leg, new THREE.CapsuleGeometry(0.112, 0.22, 6, 10), gunM, 0, -0.18, 0);
    const knee = new THREE.Group(); knee.position.y = -0.36; leg.add(knee);
    part(knee, new THREE.CapsuleGeometry(0.112, 0.12, 6, 10), gunM, 0, -0.08, 0);
    const shoe = new THREE.Group(); shoe.position.set(0, -0.34, 0.07); knee.add(shoe);
    part(shoe, S(0.128, 12, 10), gunM, 0, 0.055, -0.015, 1.18, 1.05, 1.15);
    const foot = part(shoe, new THREE.CapsuleGeometry(0.122, 0.13, 4, 8), gunM, 0, 0, 0.08); foot.rotation.x = Math.PI / 2;
    part(shoe, new THREE.BoxGeometry(0.28, 0.055, 0.4), gunD, 0, -0.085, 0.08);
    legs.push({ leg, knee });
  }
  const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
  part(torso, new THREE.CapsuleGeometry(0.195, 0.12, 6, 12), gunM, 0, 0.13, 0, 1.14, 1, 0.92);
  part(torso, new THREE.BoxGeometry(0.052, 0.2, 0.018), purp, -0.036, 0.17, 0.172);
  part(torso, new THREE.BoxGeometry(0.052, 0.2, 0.018), purp, 0.036, 0.17, 0.172);
  part(torso, new THREE.BoxGeometry(0.014, 0.24, 0.012), cyan, 0, 0.17, 0.184);
  const neck = new THREE.Group(); neck.position.y = 0.34; torso.add(neck);
  part(neck, new THREE.CapsuleGeometry(0.03, 0.035, 4, 8), skin, 0, 0.012, 0);
  const head = new THREE.Group(); head.position.y = 0.05; neck.add(head);
  const eggPts = [[0.022, 0.008], [0.048, 0.028], [0.095, 0.055], [0.14, 0.09], [0.172, 0.125], [0.186, 0.162], [0.188, 0.2], [0.178, 0.24], [0.155, 0.278], [0.118, 0.312], [0.058, 0.338], [0.001, 0.352]].map(p => new THREE.Vector2(p[0], p[1]));
  const egg = part(head, new THREE.LatheGeometry(eggPts, 24), skin);
  egg.geometry.computeVertexNormals();
  const eggR = y => {
    if (y <= eggPts[0].y) return eggPts[0].x;
    if (y >= eggPts[eggPts.length - 1].y) return eggPts[eggPts.length - 1].x;
    for (let i = 0; i < eggPts.length - 1; i++) {
      if (y <= eggPts[i + 1].y) { const t = (y - eggPts[i].y) / (eggPts[i + 1].y - eggPts[i].y); return eggPts[i].x + t * (eggPts[i + 1].x - eggPts[i].x); }
    }
    return eggPts[eggPts.length - 1].x;
  };
  const conformEye = (mesh, pad, thick) => {
    mesh.updateMatrix();
    const mat = mesh.matrix.clone(), inv = mat.clone().invert();
    const pos = mesh.geometry.attributes.position, v = new V3(), local = new V3(), rGeo = 0.07;
    for (let i = 0; i < pos.count; i++) {
      local.fromBufferAttribute(pos, i);
      const nz = THREE.MathUtils.clamp(local.z / rGeo, -1, 1);
      v.copy(local).applyMatrix4(mat);
      const r = Math.hypot(v.x, v.z); if (r < 1e-8) continue;
      const target = eggR(v.y) + pad - (1 - nz) * 0.5 * thick, k = target / r;
      v.x *= k; v.z *= k; v.applyMatrix4(inv); pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true; mesh.geometry.computeVertexNormals();
  };
  for (const sd of [-1, 1]) {
    const eye = part(head, S(0.07, 20, 16), eyeM, 0.116 * sd, 0.167, 0.195, 1.42, 0.72, 0.14);
    eye.name = 'alienEye'; eye.rotation.z = 0.36 * sd; eye.rotation.y = -0.18 * sd; eye.renderOrder = 1;
    conformEye(eye, 0.003, 0.008);
  }
  part(head, S(0.006, 6, 5), skinD, -0.012, 0.108, 0.156, 0.7, 1.1, 0.4);
  part(head, S(0.006, 6, 5), skinD, 0.012, 0.108, 0.156, 0.7, 1.1, 0.4);
  const cap = new THREE.Group(); cap.position.set(0, 0.215, -0.005); cap.rotation.x = -0.08; cap.userData.gaCap = 1; head.add(cap);
  part(cap, new THREE.SphereGeometry(0.188, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), pink, 0, 0, 0, 1, 0.82, 1.03);
  part(cap, CYL(0.19, 0.19, 0.03, 16), pinkD, 0, 0.005, 0, 1, 1, 1.03);
  part(cap, new THREE.CylinderGeometry(0.15, 0.15, 0.014, 14, 1, false, -Math.PI * 0.5, Math.PI), pinkD, 0, -0.005, 0.17).rotation.x = 0.1;
  head.scale.setScalar(2.18);
  const arms = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.225 * sd, 0.28, 0); torso.add(sh);
    part(sh, S(0.078, 12, 10), gunM, 0.01 * sd, 0.01, 0);
    part(sh, new THREE.CapsuleGeometry(0.07, 0.14, 6, 10), gunM, 0.008 * sd, -0.12, 0);
    const el = new THREE.Group(); el.position.set(0.01 * sd, -0.22, 0); sh.add(el);
    part(el, new THREE.CapsuleGeometry(0.07, 0.1, 6, 10), gunM, 0, -0.06, 0);
    part(el, CYL(0.072, 0.072, 0.042, 10), cyan, 0, -0.175, 0);
    const hand = part(el, S(0.05, 10, 8), glove, 0, -0.24, 0.016, 1.1, 0.82, 1.15);
    arms.push({ sh, el, hand, sd });
  }
  const bot = new THREE.Group(); bot.name = 'alienBot'; bot.position.set(0.64, 0.52, -0.16); bot.userData.baseY = 0.52; torso.add(bot);
  const botShell = lamb(0xe8eef4), botDark = lamb(0x10141a);
  part(bot, S(0.195, 16, 12), botShell);
  part(bot, S(0.16, 12, 10), botDark, 0, 0.014, 0.125, 0.88, 0.8, 0.5);
  part(bot, S(0.088, 12, 10), cyan, 0, 0.018, 0.188);
  addJetpack(torso);
  const gun = addGun(arms[1].el);
  root.userData = { hips, torso, neck, head, legs, arms, gun, bot, char: 'alien' };
  return root;
}

function makeLegoAlien() {
  const g = new THREE.Group(); g.name = 'legoAlien';
  const skin = lamb(0x9aa5ab), body = lamb(0x237841), hips = lamb(0x1a4a28), eye = basic(0x000000);
  part(g, CYL(0.13, 0.13, 0.16, 12), skin, 0, 0.62, 0);
  part(g, S(0.132, 12, 8), skin, 0, 0.7, 0);
  for (const sd of [-1, 1]) {
    const e = part(g, S(0.045, 10, 8), eye, 0.055 * sd, 0.66, 0.11, 1.3, 0.7, 0.35);
    e.rotation.z = 0.25 * sd;
  }
  part(g, new THREE.BoxGeometry(0.08, 0.06, 0.04), skin, 0, 0.72, 0);
  part(g, new THREE.BoxGeometry(0.32, 0.28, 0.16), body, 0, 0.42, 0);
  part(g, new THREE.BoxGeometry(0.32, 0.08, 0.16), hips, 0, 0.24, 0);
  for (const sd of [-1, 1]) {
    part(g, new THREE.BoxGeometry(0.1, 0.26, 0.12), hips, 0.08 * sd, 0.08, 0);
    part(g, CYL(0.05, 0.05, 0.22, 8), body, 0.22 * sd, 0.42, 0);
    part(g, S(0.055, 8, 6), skin, 0.22 * sd, 0.28, 0);
  }
  return g;
}

function earthTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#1a4a9a'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#2a7a2a';
  const blobs = [[40, 50, 38, 22], [70, 70, 22, 16], [130, 48, 44, 20], [160, 72, 28, 14], [210, 42, 30, 18], [30, 90, 18, 10], [190, 95, 26, 12]];
  blobs.forEach(b => { g.beginPath(); g.ellipse(b[0], b[1], b[2], b[3], 0.2, 0, 7); g.fill(); });
  g.fillStyle = '#c8a060'; g.beginPath(); g.ellipse(100, 40, 14, 8, 0, 0, 7); g.fill();
  g.fillStyle = '#f2f6ff'; g.fillRect(0, 0, 256, 10); g.fillRect(0, 118, 256, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const q = document.getElementById.bind(document);
const platEl = q('plat'), hpEl = q('hp'), bestEl = q('best'), bannerEl = q('banner');
const flyMeterEl = q('flyMeter'), flyBarEl = flyMeterEl.firstChild, bFly = q('bFly'), bFire = q('bFire');
const joyEl = q('joy'), joyKnob = q('joyKnob');

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
renderer.setPixelRatio(coolOn() ? 1 : Math.min(1.5, devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8ff);
scene.fog = new THREE.FogExp2(0x7ec8ff, 0.012);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.15, 1400);
scene.add(new THREE.HemisphereLight(0xd8ecff, 0x8a7358, 1.25));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.35); sun.position.set(8, 18, 10); scene.add(sun);
const fill = new THREE.DirectionalLight(0xb8d4ff, 0.45); fill.position.set(-8, 6, -6); scene.add(fill);

const starsGeo = new THREE.BufferGeometry();
{ const n = 500, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 80 + Math.random() * 220, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    a[i * 3] = r * Math.sin(ph) * Math.cos(th); a[i * 3 + 1] = 40 + Math.abs(r * Math.cos(ph)); a[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(a, 3));
}
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0 }));
scene.add(stars);

const earth = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 24), new THREE.MeshLambertMaterial({ map: earthTex() }));
earth.name = 'earth'; earth.position.set(85, 28, 145); earth.rotation.set(0.22, 1.15, 0.12); earth.visible = false; scene.add(earth);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(94, 24, 16), basic(0x6ec8ff, { transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false }));
earth.add(atmo);

const clouds = new THREE.Group(); scene.add(clouds);
const cloudM = basic(0xf4f8ff, { transparent: true, opacity: 0.92 });
for (let i = 0; i < 48; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 6, 8, 6), cloudM);
  const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 90;
  m.position.set(Math.cos(a) * r, -6 - Math.random() * 8, Math.sin(a) * r);
  m.scale.set(1.6 + Math.random(), 0.35 + Math.random() * 0.2, 1.2 + Math.random() * 0.6);
  clouds.add(m);
}

function sizeOf(i) { return 12 - 8.6 * (i - 1) / (N - 1); }
function yOf(i) { return (i - 1) * GAP; }
function offsetOf(i) {
  if (i === 1 || i === N) return { x: 0, z: 0 };
  return { x: Math.sin(i * 1.71) * Math.min(6.2, 0.9 + i * 0.08), z: Math.cos(i * 1.23) * Math.min(6.2, 0.9 + i * 0.07) };
}
function isCheck(i) { return i === 1 || (i - 1) % 10 === 0; }

function addStuds(group, size, color, yTop) {
  const mat = lamb(color);
  const n = Math.max(2, Math.floor(size / 0.72));
  const mesh = new THREE.InstancedMesh(studGeo, mat, n * n);
  const origin = -((n - 1) * 0.72) / 2; let k = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    dummy.position.set(origin + i * 0.72, yTop + 0.035, origin + j * 0.72); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
    dummy.updateMatrix(); mesh.setMatrixAt(k++, dummy.matrix);
  }
  mesh.count = k; mesh.instanceMatrix.needsUpdate = true; group.add(mesh); return mesh;
}

const platforms = [];
function buildPlatform(i) {
  const off = offsetOf(i), size = sizeOf(i), y = yOf(i), col = BRICKS[(i - 1) % BRICKS.length];
  const g = new THREE.Group(); g.position.set(off.x, y, off.z); scene.add(g);
  const h = 0.55, top = h / 2;
  const body = part(g, new THREE.BoxGeometry(size, h, size), lamb(col), 0, 0, 0);
  body.name = 'pad';
  addStuds(g, size, col, top);
  if (isCheck(i) && i !== N) {
    const ring = part(g, new THREE.TorusGeometry(Math.max(0.9, size * 0.28), 0.05, 6, 20), basic(0xffe14a), 0, top + 0.08, 0);
    ring.rotation.x = Math.PI / 2;
    const pole = part(g, CYL(0.03, 0.03, 1.1, 6), lamb(0xf4f4f4), size * 0.38, top + 0.55, -size * 0.38);
    const flag = part(g, new THREE.PlaneGeometry(0.55, 0.32), basic(0xffe14a), size * 0.38 + 0.28, top + 0.95, -size * 0.38);
    flag.material.side = THREE.DoubleSide;
  }
  if (i === N) {
    const pole = part(g, CYL(0.04, 0.04, 1.6, 6), lamb(0xf4f4f4), 0.4, top + 0.8, -0.4);
    const flag = part(g, new THREE.PlaneGeometry(0.8, 0.45), basic(0xff3cf0), 0.82, top + 1.35, -0.4);
    flag.material.side = THREE.DoubleSide;
  }
  const p = { i, g, size, x: off.x, y, z: off.z, h, top: y + top, col, traps: [], solids: [] };
  // traps scale with height; platform 50 is a safe finish
  if (i > 1 && i < N) {
    if (i >= 3 && i % 3 === 0) {
      const ms = Math.max(1.4, size * 0.32);
      const mover = part(g, new THREE.BoxGeometry(ms, 0.4, ms * 0.7), lamb(0xff8a18), 0, top + 0.22, 0);
      addStuds(mover, ms * 0.85, 0xff8a18, 0.2);
      p.traps.push({ type: 'mover', mesh: mover, size: ms, axis: i % 2 ? 'x' : 'z', amp: size * 0.32, speed: 0.9 + i * 0.025, t0: i * 0.4 });
    }
    if (i >= 5 && (i % 4 === 1 || i >= 28)) {
      const len = size * 0.85;
      const bar = part(g, new THREE.BoxGeometry(len, 0.16, 0.16), lamb(0x222228), 0, top + 0.7, 0);
      part(bar, CYL(0.05, 0.05, 0.2, 8), basic(0xff3030), 0, 0, 0);
      p.traps.push({ type: 'spinner', mesh: bar, len, speed: 0.85 + i * 0.035, y: top + 0.7 });
    }
    if (i >= 8 && i % 5 === 2) {
      const cs = Math.max(1.2, size * 0.28);
      const cr = part(g, new THREE.BoxGeometry(cs, 0.28, cs), lamb(0x8a6a3a), size * 0.28, top + 0.16, -size * 0.18);
      p.traps.push({ type: 'crumble', mesh: cr, size: cs, timer: 0, falling: false, dead: false, ox: cr.position.x, oy: cr.position.y, oz: cr.position.z });
    }
    if (i >= 12 && (i % 4 === 0 || i >= 32)) {
      const ks = Math.max(1.1, size * 0.22);
      const kb = part(g, new THREE.BoxGeometry(ks, 0.45, ks), basic(0xff2450), -size * 0.22, top + 0.25, size * 0.2);
      kb.material.transparent = true; kb.material.opacity = 0.88;
      p.traps.push({ type: 'kill', mesh: kb, size: ks, axis: 'x', amp: size * 0.22, speed: 0.7 + i * 0.02, t0: i });
    }
    if (i >= 16 && i % 5 === 0) {
      const dir = new V3(Math.sin(i * 2.1), 0, Math.cos(i * 2.1)).normalize();
      p.traps.push({ type: 'wind', dir, mesh: null, str: 5.5 + i * 0.05 });
    }
  }
  platforms.push(p); return p;
}
for (let i = 1; i <= N; i++) buildPlatform(i);

const windLines = [];
{ const m = basic(0xc8f0ff, { transparent: true, opacity: 0.45 });
  for (let i = 0; i < 14; i++) { const L = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), m); L.visible = false; scene.add(L); windLines.push(L); } }

const player = (readChar() === 'alien' ? makeAlien() : makeMonkey());
scene.add(player);
const flyFx = [];
player.traverse(o => { if (o.name === 'gaThruster') flyFx.push(o); });

const lasers = [], shots = [], aliens = [];
const laserGeo = new THREE.BoxGeometry(0.07, 0.07, 0.85), laserMat = basic(0x48f2ff);
const shotGeo = new THREE.SphereGeometry(0.16, 8, 6), shotMat = basic(0xff5030);

const G = {
  mode: 'title', run: false, over: false, won: false, hold: false,
  t: 0, energy: 1, vy: 0, vx: 0, vz: 0, air: false, thrust: false,
  face: 0, hp: 3, iframe: 0, platform: 1, reached: 1, check: 1,
  best: readBest(), cooldown: 0, fireHeld: false, flyHeld: false,
  ix: 0, iz: 0, joy: { on: false, x: 0, y: 0, pid: -1 },
  phase: 0, camYaw: 0, bannerT: 0
};

const TK = { got: 0, run: 0, log: [], awarded: Object.create(null) };
function quiet() { return !!window.__DEMO || G.mode !== 'play' || !G.run || G.hold; }
function give(n, why) {
  if (window.__DEMO || !G.run || G.over) return 0;
  n = Math.min(n, RUN_CAP - TK.run); if (n <= 0) return 0;
  for (let i = 0; i < n; i++) {
    try { if (window.TicketArt) TicketArt.collect('skytower'); } catch (e) {}
    TK.got++; TK.run++;
  }
  TK.log.push(why + ':' + n); return n;
}

function showBanner(text, win) {
  bannerEl.textContent = text; bannerEl.classList.toggle('win', !!win); bannerEl.classList.add('on'); G.bannerT = 2.2;
}
function hud() {
  platEl.textContent = 'PLATFORM ' + G.platform + '/' + N;
  hpEl.textContent = '♥'.repeat(G.hp) + '♡'.repeat(Math.max(0, 3 - G.hp));
  bestEl.textContent = 'BEST ' + G.best;
  flyBarEl.style.transform = 'scaleX(' + Math.max(0, Math.min(1, G.energy)).toFixed(3) + ')';
  flyMeterEl.classList.toggle('low', G.energy <= 0.18);
  bFly.classList.toggle('on', G.thrust);
  bFire.classList.toggle('on', G.fireHeld);
}
function setSky() {
  const h = player.position.y, t = THREE.MathUtils.clamp(h / yOf(N), 0, 1);
  const a = new THREE.Color(0x7ec8ff), b = new THREE.Color(0xff8a4a), c = new THREE.Color(0x0a1028), d = new THREE.Color(0x03040a);
  const col = new THREE.Color();
  if (t < 0.35) col.copy(a).lerp(b, t / 0.35);
  else if (t < 0.65) col.copy(b).lerp(c, (t - 0.35) / 0.3);
  else col.copy(c).lerp(d, (t - 0.65) / 0.35);
  scene.background.copy(col); scene.fog.color.copy(col);
  scene.fog.density = 0.012 - t * 0.0112;
  stars.material.opacity = THREE.MathUtils.clamp((t - 0.45) / 0.35, 0, 1);
  sun.intensity = 1.35 - t * 0.7;
  clouds.visible = h < 90;
  earth.visible = t > 0.55;
}

function nearPlats() {
  const list = [];
  for (let i = Math.max(1, G.platform - 4); i <= Math.min(N, G.platform + 5); i++) list.push(platforms[i - 1]);
  return list;
}
function updateTraps(dt) {
  const t = G.t;
  for (const p of platforms) {
    const near = Math.abs(p.i - G.platform) <= 6;
    p.g.visible = near;
    if (!near) continue;
    for (const tr of p.traps) {
      if (tr.type === 'mover' || tr.type === 'kill') {
        const u = Math.sin(t * tr.speed + tr.t0) * tr.amp;
        if (tr.axis === 'x') tr.mesh.position.x = u; else tr.mesh.position.z = u;
      } else if (tr.type === 'spinner') {
        tr.mesh.rotation.y = t * tr.speed;
      } else if (tr.type === 'crumble' && tr.falling && !tr.dead) {
        tr.mesh.position.y -= 6 * dt;
        if (tr.mesh.position.y < -4) { tr.dead = true; tr.mesh.visible = false; }
      }
    }
  }
  let wi = 0;
  for (const p of nearPlats()) {
    const w = p.traps.find(tr => tr.type === 'wind'); if (!w) continue;
    for (let k = 0; k < 3 && wi < windLines.length; k++, wi++) {
      const L = windLines[wi]; L.visible = true;
      L.position.set(p.x + (k - 1) * 1.4 + Math.sin(t * 3 + k) * 0.4, p.top + 1.2 + ((t * 4 + k) % 2), p.z);
      L.lookAt(L.position.x + w.dir.x, L.position.y, L.position.z + w.dir.z);
    }
  }
  for (; wi < windLines.length; wi++) windLines[wi].visible = false;
}

function padHit(p, x, z, pad) {
  const hs = (pad || p.size) * 0.5;
  return Math.abs(x - p.x) <= hs && Math.abs(z - p.z) <= hs;
}
function groundAt(x, z, y) {
  if (y == null) y = player.position.y;
  let best = -1e9, hit = null, extra = 0;
  for (const p of nearPlats()) {
    if (padHit(p, x, z) && p.top <= y + 0.12) { if (p.top >= best) { best = p.top; hit = p; extra = 0; } }
    for (const tr of p.traps) {
      if (tr.dead || !tr.mesh || (tr.type !== 'mover' && tr.type !== 'crumble')) continue;
      tr.mesh.updateWorldMatrix(true, false);
      const wp = new V3(); tr.mesh.getWorldPosition(wp);
      const hs = tr.size * 0.5;
      const top = wp.y + (tr.type === 'mover' ? 0.2 : 0.14);
      if (Math.abs(x - wp.x) <= hs && Math.abs(z - wp.z) <= hs && top <= y + 0.12) {
        if (top >= best) { best = top; hit = p; extra = tr; }
      }
    }
  }
  return { y: best > -1e8 ? best : null, p: hit, extra };
}

function lastCheck(i) { return i <= 1 ? 1 : 1 + 10 * Math.floor((i - 1) / 10); }
function placeOn(i, jitter) {
  i = Math.max(1, Math.min(N, i | 0));
  const p = platforms[i - 1];
  player.position.set(p.x + (jitter ? (Math.random() - 0.5) * 0.4 : 0), p.top + 0.01, p.z);
  G.vy = G.vx = G.vz = 0; G.air = false; G.thrust = false; G.platform = i;
  G.check = Math.max(G.check, lastCheck(i));
  if (i > G.reached) onReach(i);
  else hud();
}

function onReach(i) {
  G.reached = i; G.platform = Math.max(G.platform, i);
  if (isCheck(i)) G.check = i;
  if (i > G.best) { G.best = i; if (G.run && !window.__DEMO) saveBest(i); }
  if (G.run && !window.__DEMO && !TK.awarded['p' + i]) {
    TK.awarded['p' + i] = 1;
    if (i > 1 && (i - 1) % 10 === 0 && i < N) give(2, 'cp' + i);
    if (i === N) { give(7, 'win'); finish(); }
  } else if (i === N && G.run) finish();
  hud();
}

function finish() {
  if (G.won) return;
  G.won = true; G.over = true; G.run = false; G.thrust = false;
  showBanner('YOU MADE IT!\nEARTH BELOW', true);
  G.best = N; if (!window.__DEMO) saveBest(N);
}

function respawn(why) {
  const c = platforms[G.check - 1];
  player.position.set(c.x, c.top + 0.02, c.z);
  G.vy = G.vx = G.vz = 0; G.air = false; G.hp = 3; G.iframe = 1.4; G.energy = Math.max(G.energy, 0.55);
  G.platform = G.check;
  showBanner(why === 'fall' ? 'FELL — CHECKPOINT' : 'HIT — CHECKPOINT');
}

function hurt(dx, dz) {
  if (G.iframe > 0 || G.won) return;
  G.hp -= 1; G.iframe = 1.15;
  const L = Math.hypot(dx, dz) || 1;
  G.vx += (dx / L) * 6; G.vz += (dz / L) * 6; G.vy = Math.max(G.vy, 2.2);
  if (G.hp <= 0) respawn('hit');
  hud();
}

function fire() {
  if (G.cooldown > 0 || G.hold || (G.mode !== 'play' && !window.__DEMO)) return null;
  G.cooldown = 0.28;
  player.updateMatrixWorld(true);
  const gun = player.userData.gun;
  const o = new V3(), dir = new V3(Math.sin(G.face), 0.02, Math.cos(G.face));
  if (gun) gun.getWorldPosition(o); else o.set(player.position.x, player.position.y + 1.2, player.position.z);
  const mesh = new THREE.Mesh(laserGeo, laserMat);
  mesh.position.copy(o); mesh.lookAt(o.x + dir.x, o.y + dir.y, o.z + dir.z); scene.add(mesh);
  const L = { mesh, o, dir: dir.clone(), speed: 24, life: 1.15, alive: true };
  lasers.push(L); return L;
}

function spawnAlien(opts) {
  opts = opts || {};
  const a = { mesh: makeLegoAlien(), alive: true, hp: 1, t: Math.random() * 10, fireT: 0.6 + Math.random(),
    x: opts.x, y: opts.y, z: opts.z, r: opts.r || (7 + Math.random() * 4) };
  if (a.x == null) {
    const p = platforms[Math.min(N, G.platform) - 1];
    const ang = Math.random() * Math.PI * 2;
    a.x = p.x + Math.cos(ang) * a.r; a.z = p.z + Math.sin(ang) * a.r; a.y = p.top + 1.6 + Math.random() * 2;
  }
  a.cx = a.x; a.cz = a.z; a.cy = a.y;
  a.mesh.position.set(a.x, a.y, a.z); scene.add(a.mesh); aliens.push(a); return a;
}

function enemyShoot(a) {
  const dir = new V3(player.position.x - a.x, (player.position.y + 1.1) - a.y, player.position.z - a.z);
  if (dir.lengthSq() < 0.01) return;
  dir.normalize();
  const mesh = new THREE.Mesh(shotGeo, shotMat);
  mesh.position.set(a.x, a.y + 0.4, a.z); scene.add(mesh);
  shots.push({ mesh, dir, speed: 7.2, life: 3.2, alive: true });
}

function updateCombat(dt) {
  if (G.cooldown > 0) G.cooldown -= dt;
  if (G.fireHeld && G.cooldown <= 0) fire();
  for (const L of lasers) {
    if (!L.alive) continue;
    L.mesh.position.addScaledVector(L.dir, L.speed * dt); L.life -= dt;
    if (L.life <= 0) { L.alive = false; scene.remove(L.mesh); continue; }
    for (const a of aliens) {
      if (!a.alive) continue;
      if (L.mesh.position.distanceTo(a.mesh.position) < 1.15) {
        a.alive = false; scene.remove(a.mesh); L.alive = false; scene.remove(L.mesh); break;
      }
    }
  }
  for (const s of shots) {
    if (!s.alive) continue;
    s.mesh.position.addScaledVector(s.dir, s.speed * dt); s.life -= dt;
    if (s.life <= 0) { s.alive = false; scene.remove(s.mesh); continue; }
    const d = s.mesh.position.distanceTo(new V3(player.position.x, player.position.y + 1.0, player.position.z));
    if (d < 0.5) {
      s.alive = false; scene.remove(s.mesh);
      hurt(s.dir.x, s.dir.z);
    }
  }
  if (G.platform >= 6 && G.run && !G.won) {
    const want = Math.min(4, 1 + ((G.platform / 12) | 0));
    let live = 0; for (const a of aliens) if (a.alive) live++;
    if (live < want && Math.random() < dt * 0.45) spawnAlien();
  }
  for (const a of aliens) {
    if (!a.alive) continue;
    a.t += dt;
    a.x = a.cx + Math.cos(a.t * 0.7) * a.r * 0.35;
    a.z = a.cz + Math.sin(a.t * 0.7) * a.r * 0.35;
    a.y = a.cy + Math.sin(a.t * 1.4) * 0.35;
    a.mesh.position.set(a.x, a.y, a.z);
    a.mesh.lookAt(player.position.x, a.y, player.position.z);
    if (Math.abs(a.y - (player.position.y + 1)) < 10) {
      a.fireT -= dt;
      if (a.fireT <= 0) { enemyShoot(a); a.fireT = 1.8 + Math.random() * 1.1 - Math.min(0.6, G.platform * 0.01); }
    }
  }
}

function trapHits() {
  const px = player.position.x, py = player.position.y, pz = player.position.z;
  for (const p of nearPlats()) {
    for (const tr of p.traps) {
      if (tr.type === 'spinner' && tr.mesh) {
        const ang = tr.mesh.rotation.y, hx = Math.cos(ang), hz = Math.sin(ang);
        const rx = px - p.x, rz = pz - p.z;
        const along = rx * hx + rz * hz, side = -rx * hz + rz * hx;
        if (Math.abs(along) < tr.len * 0.5 && Math.abs(side) < 0.28 && py < p.top + 1.35 && py + 1.7 > p.top + 0.45) {
          hurt(side > 0 ? -hz : hz, side > 0 ? hx : -hx);
        }
      } else if (tr.type === 'kill' && tr.mesh) {
        const wp = new V3(); tr.mesh.getWorldPosition(wp);
        if (Math.abs(px - wp.x) < tr.size * 0.5 + R && Math.abs(pz - wp.z) < tr.size * 0.5 + R && py < wp.y + 0.4 && py + 1.6 > wp.y - 0.2) {
          hurt(px - wp.x, pz - wp.z);
        }
      }
    }
  }
}

function applyWind(dt) {
  for (const p of nearPlats()) {
    for (const tr of p.traps) if (tr.type === 'wind') {
      if (Math.abs(player.position.x - p.x) < p.size * 0.55 && Math.abs(player.position.z - p.z) < p.size * 0.55 &&
          player.position.y < p.top + 3 && player.position.y > p.top - 0.2) {
        G.vx += tr.dir.x * tr.str * dt; G.vz += tr.dir.z * tr.str * dt;
      }
    }
  }
}

function animatePlayer(dt) {
  const u = player.userData, spd = Math.hypot(G.vx, G.vz);
  if (!G.air && spd > 0.25) {
    G.phase += dt * spd * 5.5;
    const w = Math.sin(G.phase);
    u.legs[0].leg.rotation.x = w * 0.55; u.legs[1].leg.rotation.x = -w * 0.55;
    u.arms[0].sh.rotation.x = -w * 0.4; u.arms[1].sh.rotation.x = w * 0.25;
  } else if (G.air) {
    u.legs[0].leg.rotation.x = -0.35; u.legs[1].leg.rotation.x = -0.28;
    u.arms[0].sh.rotation.z = -0.45 * u.arms[0].sd; u.arms[1].sh.rotation.x = -0.55;
  } else {
    u.legs[0].leg.rotation.x *= 0.8; u.legs[1].leg.rotation.x *= 0.8;
    u.arms[0].sh.rotation.x *= 0.8; u.arms[0].sh.rotation.z *= 0.8;
  }
  if (u.gun) u.arms[1].el.rotation.x = -0.15;
  player.rotation.y = G.face;
  const on = G.thrust ? 1 : 0;
  const s = 0.78 + Math.sin(G.t * 28) * 0.22, w = 0.88 + Math.sin(G.t * 17) * 0.14;
  for (const fx of flyFx) { fx.visible = !!on; if (on) fx.scale.set(w, s, w); }
  if (u.bot) {
    const y0 = u.bot.userData.baseY;
    u.bot.position.x = 0.64 + Math.sin(G.t * 1.15) * 0.016;
    u.bot.position.y = y0 + Math.sin(G.t * 2.35) * 0.035;
    u.bot.rotation.z = Math.sin(G.t * 1.9) * 0.06;
  }
  if (G.iframe > 0) player.visible = Math.floor(G.t * 16) % 2 === 0; else player.visible = true;
}

function step(dt) {
  if (G.hold) return;
  dt = Math.min(0.05, dt); G.t += dt;
  if (G.bannerT > 0) { G.bannerT -= dt; if (G.bannerT <= 0) bannerEl.classList.remove('on'); }
  if (G.iframe > 0) G.iframe -= dt;
  if (G.mode !== 'play' && !window.__DEMO) { setSky(); hud(); return; }

  if (window.__DEMO) demoPilot(dt);

  let ix = G.ix, iz = G.iz;
  if (G.joy.on) {
    const h = Math.hypot(G.joy.x, G.joy.y);
    if (h > 0.12) { ix = G.joy.x / h; iz = G.joy.y / h; }
    else ix = iz = 0;
  }
  const yaw = G.camYaw;
  const wx = ix * Math.cos(yaw) - iz * Math.sin(yaw);
  const wz = -ix * Math.sin(yaw) - iz * Math.cos(yaw);
  const wish = Math.hypot(wx, wz);
  const speed = G.air ? 6.2 : 4.6;
  if (wish > 0.01) {
    G.face = Math.atan2(wx, wz);
    G.vx += (wx / wish * speed - G.vx) * (1 - Math.exp(-dt * (G.air ? 3 : 10)));
    G.vz += (wz / wish * speed - G.vz) * (1 - Math.exp(-dt * (G.air ? 3 : 10)));
  } else {
    G.vx += (0 - G.vx) * (1 - Math.exp(-dt * (G.air ? 1.2 : 8)));
    G.vz += (0 - G.vz) * (1 - Math.exp(-dt * (G.air ? 1.2 : 8)));
  }
  applyWind(dt);

  const request = !!(G.flyHeld), canStart = G.air || G.energy >= FLY.min;
  if (request && canStart && G.energy > 0) G.energy = Math.max(0, G.energy - FLY.drain * dt);
  const powered = request && canStart && G.energy > 0;
  const gnd = groundAt(player.position.x, player.position.z);
  if (powered) G.vy += (FLY.up - G.vy) * (1 - Math.exp(-dt * 9));
  else if (G.air || (gnd.y == null) || player.position.y > (gnd.y || 0) + 0.06) G.vy += (-FLY.down - G.vy) * (1 - Math.exp(-dt * 5));
  else G.vy = 0;

  player.position.x += G.vx * dt;
  player.position.z += G.vz * dt;
  player.position.y += G.vy * dt;

  const g2 = groundAt(player.position.x, player.position.z);
  if (g2.y != null && player.position.y <= g2.y + 0.04 && G.vy <= 0.15) {
    player.position.y = g2.y; G.vy = 0; G.air = false; G.thrust = false;
    G.energy = Math.min(1, G.energy + FLY.fill * dt);
    if (g2.p && g2.p.i > G.platform) onReach(g2.p.i);
    else if (g2.p) G.platform = Math.max(G.platform, g2.p.i);
    if (g2.extra && g2.extra.type === 'crumble' && !g2.extra.falling) {
      g2.extra.timer += dt;
      g2.extra.mesh.position.x = g2.extra.ox + Math.sin(G.t * 40) * 0.03;
      if (g2.extra.timer > 0.55) g2.extra.falling = true;
    }
    if (g2.p && g2.p.i === N && !G.won) onReach(N);
  } else {
    G.air = true; G.thrust = powered;
  }

  const checkY = yOf(G.check);
  if (player.position.y < checkY - 8) respawn('fall');

  updateTraps(dt);
  trapHits();
  updateCombat(dt);
  animatePlayer(dt);
  updateCamera(dt);
  setSky();
  hud();
}

function updateCamera(dt) {
  if (G.shotLock) return;
  if (G.won) {
    const p = platforms[N - 1];
    const el = Math.hypot(earth.position.x - p.x, earth.position.z - p.z) || 1;
    const ux = (earth.position.x - p.x) / el, uz = (earth.position.z - p.z) / el;
    const ang = G.t * 0.18, back = 12.5, side = Math.sin(ang) * 3.2;
    const tx = p.x - ux * back + uz * side, tz = p.z - uz * back - ux * side, ty = p.top + 8.8;
    camera.position.lerp(new V3(tx, ty, tz), 1 - Math.exp(-dt * 1.2));
    camera.lookAt(p.x + ux * 16, p.top - 26, p.z + uz * 16);
    return;
  }
  G.camYaw = G.face;
  const back = 5.1, height = 2.35;
  const tx = player.position.x - Math.sin(G.face) * back;
  const tz = player.position.z - Math.cos(G.face) * back;
  const ty = player.position.y + height;
  camera.position.lerp(new V3(tx, ty, tz), 1 - Math.exp(-dt * 5));
  camera.lookAt(player.position.x, player.position.y + 1.15, player.position.z);
}

function demoPilot(dt) {
  const destI = Math.min(N, G.platform + ((G.energy > 0.32 || G.air) ? 1 : 0));
  const d = platforms[destI - 1];
  const dx = d.x - player.position.x, dz = d.z - player.position.z;
  G.joy.on = false;
  G.face = Math.atan2(dx, dz);
  G.camYaw = G.face;
  G.ix = 0; G.iz = -1;
  const needUp = d.top + 0.15 > player.position.y + 0.1;
  const low = G.energy < 0.2 && !G.air;
  G.flyHeld = !low && (needUp || (G.air && G.energy > 0.08 && player.position.y < d.top + 1.6));
  let nearest = null, nd = 12;
  for (const a of aliens) {
    if (!a.alive) continue;
    const dd = Math.hypot(a.x - player.position.x, a.z - player.position.z);
    if (dd < nd) { nd = dd; nearest = a; }
  }
  G.fireHeld = !!(nearest && nd < 14);
  if (nearest && nd < 8) G.face = Math.atan2(nearest.x - player.position.x, nearest.z - player.position.z);
  for (const s of shots) {
    if (!s.alive) continue;
    if (s.mesh.position.distanceTo(player.position) < 3.2) { G.ix = 1; G.iz = 0; }
  }
}

function resetWorld(keepPos) {
  for (const L of lasers) scene.remove(L.mesh); lasers.length = 0;
  for (const s of shots) scene.remove(s.mesh); shots.length = 0;
  for (const a of aliens) scene.remove(a.mesh); aliens.length = 0;
  for (const p of platforms) for (const tr of p.traps) {
    if (tr.type === 'crumble') { tr.timer = 0; tr.falling = false; tr.dead = false; if (tr.mesh) { tr.mesh.visible = true; tr.mesh.position.set(tr.ox, tr.oy, tr.oz); } }
  }
  G.hp = 3; G.energy = 1; G.iframe = 0; G.vy = G.vx = G.vz = 0; G.won = false; G.over = false;
  G.reached = 1; G.check = 1; G.platform = 1; G.cooldown = 0; TK.run = 0; TK.awarded = Object.create(null);
  if (!keepPos) placeOn(1);
}

function startRun() {
  window.__DEMO = false; D.on = false; document.body.classList.remove('demo');
  G.mode = 'play'; G.run = true; G.over = false; G.won = false;
  resetWorld(false); showBanner('FLY UP!');
}
function startDemo() {
  window.__DEMO = true; D.on = true; D.runs++; document.body.classList.add('demo');
  G.mode = 'play'; G.run = false; G.over = false; G.won = false;
  resetWorld(false);
}
function stopDemo() {
  D.on = false; window.__DEMO = false; document.body.classList.remove('demo');
  G.flyHeld = G.fireHeld = false; G.ix = G.iz = 0;
  if (!G.run) { G.mode = 'title'; resetWorld(false); }
}

const D = { on: false, runs: 0, start: startDemo, stop: stopDemo };

// input
const keys = Object.create(null);
function setFly(on) { G.flyHeld = !!on; }
function setFire(on) { G.fireHeld = !!on; if (on) fire(); }
bFly.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { bFly.setPointerCapture(e.pointerId); } catch (err) {} setFly(true); });
bFly.addEventListener('pointerup', e => { e.preventDefault(); setFly(false); });
bFly.addEventListener('pointercancel', () => setFly(false));
bFire.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { bFire.setPointerCapture(e.pointerId); } catch (err) {} setFire(true); });
bFire.addEventListener('pointerup', e => { e.preventDefault(); setFire(false); });
bFire.addEventListener('pointercancel', () => setFire(false));
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); setFly(true); }
  if (e.code === 'KeyF' || e.code === 'KeyJ') { e.preventDefault(); if (!e.repeat) setFire(true); }
  syncKeys();
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space') setFly(false);
  if (e.code === 'KeyF' || e.code === 'KeyJ') setFire(false);
  syncKeys();
});
function syncKeys() {
  G.ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  G.iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
}
addEventListener('blur', () => { setFly(false); setFire(false); for (const k in keys) keys[k] = false; G.joy.on = false; });

function joyAt(x, y) {
  const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = x - cx, dy = y - cy, m = Math.hypot(dx, dy), max = r.width * 0.32;
  if (m > max) { dx *= max / m; dy *= max / m; m = max; }
  joyKnob.style.left = (60 + dx) + 'px'; joyKnob.style.top = (60 + dy) + 'px';
  G.joy.x = dx / max; G.joy.y = dy / max; G.joy.on = true;
}
function joyClear() { G.joy.on = false; G.joy.x = G.joy.y = 0; joyKnob.style.left = '60px'; joyKnob.style.top = '60px'; }
addEventListener('pointerdown', e => {
  if (e.target.closest && e.target.closest('#flyHud')) return;
  if (e.clientX < innerWidth * 0.46) { G.joy.pid = e.pointerId; joyAt(e.clientX, e.clientY); }
});
addEventListener('pointermove', e => { if (G.joy.on && e.pointerId === G.joy.pid) joyAt(e.clientX, e.clientY); });
addEventListener('pointerup', e => { if (e.pointerId === G.joy.pid) joyClear(); });
addEventListener('pointercancel', e => { if (e.pointerId === G.joy.pid) joyClear(); });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// loop
let last = performance.now(), acc = 0;
const cool = coolOn();
function frame(now) {
  requestAnimationFrame(frame);
  const cap = cool ? (1000 / 30) : 0;
  if (cap && now - last < cap - 1 && !window.__skyForce) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  step(dt);
  renderer.render(scene, camera);
}
placeOn(1); updateCamera(1); setSky(); hud();
requestAnimationFrame(frame);

function sceneName() { return G.over ? 'over' : (G.run || D.on || G.mode === 'play') ? 'play' : 'title'; }

const api = {
  start: startRun,
  scene: sceneName,
  active: () => G.run && G.mode === 'play' && !G.over,
  hold() { if (!(G.run && !G.over)) return false; G.hold = true; return true; },
  unhold() { G.hold = false; },
  get ready() { return true; },
  N, TK, D, G, player, platforms, lasers, aliens, shots, earth, world: scene, camera, renderer,
  fly: setFly, fire, spawnAlien, placeOn, step, give,
  get platform() { return G.platform; },
  get won() { return G.won; },
  get energy() { return G.energy; },
  get hp() { return G.hp; },
  finish, respawn,
  setupShot(kind) {
    window.__DEMO = true; D.on = false; G.mode = 'play'; G.run = true; G.over = false; G.won = false; resetWorld(false);
    camera.fov = 60; camera.updateProjectionMatrix();
    if (kind === 'start') {
      placeOn(1); G.face = 0.55;
      for (const q of platforms) if (q.i > 1 && q.i < 8) q.g.visible = false;
      camera.position.set(7.6, 2.55, 8.6); camera.lookAt(0.15, 1.05, 0.1);
      setSky();
    } else if (kind === 'mid') {
      placeOn(21);
      const p = platforms[20];
      if (platforms[21]) platforms[21].g.visible = false;
      const a = spawnAlien({ x: p.x + 2.6, y: p.top + 1.52, z: p.z + 0.2, r: 0.08 });
      a.cx = a.x; a.cz = a.z; a.cy = a.y;
      G.face = Math.atan2(a.x - player.position.x, a.z - player.position.z);
      player.rotation.y = G.face;
      const L = fire();
      if (L) {
        L.mesh.position.set((player.position.x + a.x) * 0.5, p.top + 1.28, (player.position.z + a.z) * 0.5);
        L.mesh.lookAt(a.x, p.top + 1.28, a.z);
        L.mesh.scale.set(4.6, 4.6, 3.6);
      }
      enemyShoot(a);
      const sh = shots[shots.length - 1];
      if (sh) {
        sh.mesh.position.set(p.x + 1.85, p.top + 1.78, p.z - 0.55);
        sh.mesh.scale.set(2.5, 2.5, 2.5);
      }
      camera.position.set(p.x + 1.2, p.top + 2.5, p.z + 6.5);
      camera.lookAt(p.x + 1.15, p.top + 1.12, p.z + 0.1);
      setSky();
    } else if (kind === 'space') {
      placeOn(N); finish();
      bannerEl.textContent = 'YOU MADE IT!';
      bannerEl.classList.add('on', 'win');
      const p = platforms[N - 1];
      for (const q of platforms) q.g.visible = q.i >= N - 12;
      const el = Math.hypot(earth.position.x - p.x, earth.position.z - p.z) || 1;
      const ux = (earth.position.x - p.x) / el, uz = (earth.position.z - p.z) / el;
      camera.fov = 64; camera.updateProjectionMatrix();
      camera.position.set(p.x - ux * 12.5, p.top + 8.8, p.z - uz * 12.5);
      camera.lookAt(p.x + ux * 16, p.top - 26, p.z + uz * 16);
      earth.visible = true;
      setSky();
      earth.visible = true;
    }
    window.__DEMO = false; D.on = false;
    G.hold = true; G.shotLock = true;
    hud(); renderer.render(scene, camera);
  }
};

window.__demo = D;
window.__skytower = api;
window.__TK = TK;
if (window.__skyQ) {
  if (window.__skyQ.start) startRun();
  else if (window.__skyQ.demo) startDemo();
}
