// SKY TOWER — 3D jetpack climb, arcade copy only.
// 50 Lego platforms from the clouds to outer space. Tickets only via TicketArt
// (parent.__neonTicket) while a real credit is running; never in DEMO / WATCH.
// Soundtrack + laser/ticket SFX live in snd.js (WebAudio, no files).
import * as THREE from '../vendor/three.module.js';
import { createFace } from './face.js';
import { createRivals } from './rivals.js';   // t753u: two players at the cabinet share the climb   // t748u/t782u: the TITAN face ("Can you reach the top?")

const N = 50, AIR_SPEED = 6.2, MIN_SEP = 10;
const PITCH_MIN = -0.22, PITCH_MAX = 1.12;
const FLY = { drain: 0.125, fill: 0.16, min: 0.08, up: 3.4, down: 2.4 };
const R = 0.32, PH = 1.82, HI_KEY = 'arcade_skytower_best', RUN_CAP = 50;
const FLY_TICKETS = 50, FLY_TICKET_VALUE = 1, TICKET_HIT_R = 0.82;   // t782u: more tickets, a mix of fast ones and some drifting slowly
// Pad shapes (non-checkpoint only): tiny single-foot pads and long thin beams.
const PAD = { tiny0: 1.15, tiny1: 1.0, beamW: 0.95, beamL0: 6.4, beamL1: 5.4, tinyP: 0.2, beamP: 0.3 };
// Random gusts: calm gap, telegraph (streaks + HUD arrow + whoosh), then a push. Accel in m/s^2.
const WIND = { gap0: 6, gap1: 11, warn: 1.3, dur0: 1.8, dur1: 3.0, rampIn: 0.45, rampOut: 0.6,
  airBase: 2.0, airTop: 2.4, ground: 0.3, str0: 0.6, str1: 1.0, fromPlat: 2 };
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
function addBlaster(hand) {
  const gun = new THREE.Group(); gun.name = 'skyGun';
  const metal = lamb(0x3a4558), dark = lamb(0x1a2028), glow = basic(0x48f2ff), accent = lamb(0x247888);
  part(gun, new THREE.BoxGeometry(0.12, 0.14, 0.32), metal, 0, 0.025, 0.13);
  part(gun, new THREE.BoxGeometry(0.09, 0.1, 0.16), dark, 0, 0.03, 0.32);
  const barrel = part(gun, CYL(0.036, 0.03, 0.22, 8), metal, 0, 0.032, 0.48);
  barrel.rotation.x = Math.PI / 2;
  const ring = part(gun, CYL(0.044, 0.044, 0.04, 8), accent, 0, 0.032, 0.4);
  ring.rotation.x = Math.PI / 2;
  const muzzle = part(gun, CYL(0.038, 0.042, 0.05, 8), glow, 0, 0.032, 0.6);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.name = 'skyMuzzle';
  part(gun, new THREE.BoxGeometry(0.075, 0.16, 0.09), dark, 0, -0.09, 0.02);
  part(gun, new THREE.BoxGeometry(0.045, 0.045, 0.07), dark, 0, -0.015, -0.07);
  part(gun, new THREE.BoxGeometry(0.13, 0.04, 0.09), accent, 0, 0.105, 0.08);
  hand.add(gun);
  gun.position.set(0.02, -0.02, 0.06);
  gun.rotation.set(0.05, 0, 0);
  return { gun, muzzle };
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
  const blast = addBlaster(arms[1].hand);
  root.userData = { hips, torso, neck, head, legs, arms, gun: blast.gun, muzzle: blast.muzzle, char: 'monkey', bot: null };
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
  const botEye = part(bot, S(0.088, 12, 10), cyan, 0, 0.018, 0.188);
  botEye.name = 'botEye';
  const botFlash = part(bot, S(0.14, 10, 8), basic(0xff4466, { transparent: true, opacity: 0 }), 0, 0.018, 0.24);
  botFlash.name = 'botFlash';
  addJetpack(torso);
  root.userData = { hips, torso, neck, head, legs, arms, gun: null, muzzle: null, bot, botEye, botFlash, char: 'alien' };
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
const tixEl = q('tixHud'), plusLayer = q('plusLayer');
const flyMeterEl = q('flyMeter'), flyBarEl = flyMeterEl.firstChild, bFly = q('bFly'), bFire = q('bFire');
const joyEl = q('joy'), joyKnob = q('joyKnob');
const windEl = q('windHud'), windArrow = q('windArrow');

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
const hemi = new THREE.HemisphereLight(0xd8ecff, 0x8a7358, 1.25); scene.add(hemi);
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
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
scene.add(stars);

// t736u (Dave): day/night cycle by height. Full night (moon only) at platform 10, day at 20, and so on every 10.
const SKY = { cycle: 10, moonDist: 260, moonR: 9.5 };
const moonL = new THREE.DirectionalLight(0x9fb8ff, 0); moonL.position.set(-6, 20, 8); scene.add(moonL);
function moonTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(54, 50, 6, 64, 64, 62);
  gr.addColorStop(0, '#fffef4'); gr.addColorStop(0.7, '#e9ecf2'); gr.addColorStop(1, '#c4cad8');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
  g.fillStyle = 'rgba(120,128,150,0.28)';
  [[44, 46, 11], [82, 40, 7], [74, 78, 14], [40, 86, 8], [92, 70, 5], [58, 64, 5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(210,225,255,0.85)'); gr.addColorStop(0.25, 'rgba(170,195,255,0.35)'); gr.addColorStop(1, 'rgba(120,150,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const moon = new THREE.Group(); moon.name = 'moon'; moon.visible = false; scene.add(moon);
const moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), transparent: true, opacity: 0, fog: false, depthWrite: false }));
moonDisc.scale.setScalar(SKY.moonR * 2); moonDisc.renderOrder = -1; moon.add(moonDisc);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
moonGlow.scale.setScalar(SKY.moonR * 7.5); moonGlow.renderOrder = -2; moon.add(moonGlow);
// gradient sky dome (top / horizon / below) that follows the camera, so dusk, dawn and night read like a real sky
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x4a9cf0) }, mid: { value: new THREE.Color(0x9fd6ff) }, bot: { value: new THREE.Color(0xd6ecff) } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vD; void main(){ float h = vD.y; vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h * 2.2, 0.0, 1.0), 0.75)) : mix(mid, bot, pow(clamp(-h * 2.5, 0.0, 1.0), 0.6)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}',
}));
skyDome.name = 'skyDome'; skyDome.renderOrder = -10; skyDome.frustumCulled = false; scene.add(skyDome);
const NIGHT_TINT = [];   // unlit (basic) bits that should dim to moonlight: tiny-pad rims, clouds

const earth = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 24), (() => { const t = earthTex(); return new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0 }); })());
earth.name = 'earth'; earth.position.set(85, 28, 145); earth.rotation.set(0.22, 1.15, 0.12); earth.visible = false; scene.add(earth);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(94, 24, 16), basic(0x6ec8ff, { transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false }));
earth.add(atmo);

const clouds = new THREE.Group(); scene.add(clouds);
const cloudM = basic(0xf4f8ff, { transparent: true, opacity: 0.92 });
NIGHT_TINT.push({ m: cloudM, day: new THREE.Color(0xf4f8ff), night: new THREE.Color(0x46557e) });
for (let i = 0; i < 48; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 6, 8, 6), cloudM);
  const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 90;
  m.position.set(Math.cos(a) * r, -6 - Math.random() * 8, Math.sin(a) * r);
  m.scale.set(1.6 + Math.random(), 0.35 + Math.random() * 0.2, 1.2 + Math.random() * 0.6);
  clouds.add(m);
}

function isCheck(i) { return i === 1 || (i - 1) % 10 === 0; }
function isSlider(i) { return i >= 4 && i < N && !isCheck(i) && (i - 4) % 3 === 0; }
function hopFuel(from) { return 0.54 + 0.32 * ((from - 1) / Math.max(1, N - 2)); }
function gapYOf(from) { return hopFuel(from) * (1 / FLY.drain) * FLY.up; }
function gapXZOf(from) {
  const wobble = 0.94 + 0.12 * (0.5 + 0.5 * Math.sin(from * 1.73));
  return hopFuel(from) * (1 / FLY.drain) * AIR_SPEED * 0.90 * wobble;
}
function sizeOf(i) {
  if (i === 1) return 12;
  if (i === N) return 9.5;
  if (isCheck(i)) return 11;
  // A few studs wide (about 4 down to 3), shrinking slightly toward space, always landable.
  return 3.15 - 0.75 * (i - 1) / (N - 1);
}
function shapeOf(i) {
  if (i <= 3 || i === N || isCheck(i)) return 'block';
  const u = tickRand(i, 41);
  return u < PAD.tinyP ? 'tiny' : u < PAD.tinyP + PAD.beamP ? 'beam' : 'block';
}
// Full x / z extents of pad i (axis-aligned; beams run along x or z).
function dimsOf(i) {
  const k = (i - 1) / (N - 1), kind = shapeOf(i);
  if (kind === 'tiny') { const s = PAD.tiny0 + (PAD.tiny1 - PAD.tiny0) * k; return { kind, sx: s, sz: s }; }
  if (kind === 'beam') {
    const L = PAD.beamL0 + (PAD.beamL1 - PAD.beamL0) * k, along = tickRand(i, 43) < 0.5 ? 'x' : 'z';
    return along === 'x' ? { kind, sx: L, sz: PAD.beamW, along } : { kind, sx: PAD.beamW, sz: L, along };
  }
  const s = sizeOf(i); return { kind, sx: s, sz: s };
}
function buildHeights() {
  const h = [0];
  for (let i = 1; i < N; i++) h.push(h[i - 1] + gapYOf(i));
  return h;
}
const HEIGHTS = buildHeights();
function yOf(i) { return HEIGHTS[i - 1]; }
function buildOffsets() {
  const gold = Math.PI * (3 - Math.sqrt(5)), out = [{ x: 0, z: 0 }];
  let x = 0, z = 0, ang = 0.4;
  for (let i = 2; i <= N; i++) {
    const step0 = gapXZOf(i - 1);
    let placed = false;
    for (let attempt = 0; attempt < 36 && !placed; attempt++) {
      const trial = ang + gold + attempt * 0.19 + Math.sin(i * 1.7) * 0.15;
      const nx = x + Math.sin(trial) * step0, nz = z + Math.cos(trial) * step0;
      let ok = true;
      for (const p of out) if (Math.hypot(nx - p.x, nz - p.z) < MIN_SEP) { ok = false; break; }
      if (ok) { ang = trial; x = nx; z = nz; out.push({ x, z }); placed = true; }
    }
    if (!placed) {
      for (const extra of [1.2, 2, 3, 4.5, 6, 10]) {
        const trial = ang + gold + extra * 0.31;
        const nx = x + Math.sin(trial) * (step0 + extra), nz = z + Math.cos(trial) * (step0 + extra);
        let ok = true;
        for (const p of out) if (Math.hypot(nx - p.x, nz - p.z) < MIN_SEP) { ok = false; break; }
        if (ok) { ang = trial; x = nx; z = nz; out.push({ x, z }); placed = true; break; }
      }
    }
    if (!placed) { x += step0; out.push({ x, z }); }
  }
  return out;
}
const OFFSETS = buildOffsets();
function offsetOf(i) { return OFFSETS[i - 1]; }

function addStuds(group, size, color, yTop, sizeZ) {
  const mat = lamb(color), sz = sizeZ || size;
  const nx = Math.max(1, Math.floor(size / 0.72)), nz = Math.max(1, Math.floor(sz / 0.72));
  const mesh = new THREE.InstancedMesh(studGeo, mat, nx * nz);
  const ox = -((nx - 1) * 0.72) / 2, oz = -((nz - 1) * 0.72) / 2; let k = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    dummy.position.set(ox + i * 0.72, yTop + 0.035, oz + j * 0.72); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
    dummy.updateMatrix(); mesh.setMatrixAt(k++, dummy.matrix);
  }
  mesh.count = k; mesh.instanceMatrix.needsUpdate = true; group.add(mesh); return mesh;
}

const platforms = [];
function buildPlatform(i) {
  const off = offsetOf(i), dm = dimsOf(i), y = yOf(i), col = BRICKS[(i - 1) % BRICKS.length];
  const size = Math.max(dm.sx, dm.sz);
  const g = new THREE.Group(); g.position.set(off.x, y, off.z); scene.add(g);
  const h = dm.kind === 'block' ? 0.55 : 0.45, top = h / 2;
  const body = part(g, new THREE.BoxGeometry(dm.sx, h, dm.sz), lamb(col), 0, 0, 0);
  body.name = 'pad';
  addStuds(g, dm.sx, col, top, dm.sz);
  if (dm.kind === 'tiny') {   // glow rim so a one-foot pad reads from a distance
    const rim = part(g, new THREE.BoxGeometry(dm.sx + 0.08, 0.06, dm.sz + 0.08), basic(0xffffff, { transparent: true, opacity: 0.55 }), 0, -top + 0.02, 0);
    rim.name = 'tinyRim';
    NIGHT_TINT.push({ m: rim.material, day: new THREE.Color(0xffffff), night: new THREE.Color(0xa9c2ff), op: [0.55, 0.42] });
  }
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
  const p = { i, g, size, sx: dm.sx, sz: dm.sz, kind: dm.kind, along: dm.along || null, x: off.x, y, z: off.z, h, top: y + top, col, traps: [], solids: [] };
  // Heavy traps only on large checkpoint pads; tiny pads keep a timed spinner or a gentle wind.
  if (i > 1 && i < N) {
    const large = isCheck(i);
    if (large && i >= 3 && i % 3 === 0) {
      const ms = Math.max(1.4, size * 0.32);
      const mover = part(g, new THREE.BoxGeometry(ms, 0.4, ms * 0.7), lamb(0xff8a18), 0, top + 0.22, 0);
      addStuds(mover, ms * 0.85, 0xff8a18, 0.2);
      p.traps.push({ type: 'mover', mesh: mover, size: ms, axis: i % 2 ? 'x' : 'z', amp: size * 0.32, speed: 0.9 + i * 0.025, t0: i * 0.4 });
    }
    if (dm.kind === 'block' && i >= 5 && (i % 4 === 1 || i >= 28)) {
      const len = size * (large ? 0.85 : 0.92);
      const bar = part(g, new THREE.BoxGeometry(len, 0.16, 0.16), lamb(0x222228), 0, top + 0.7, 0);
      part(bar, CYL(0.05, 0.05, 0.2, 8), basic(0xff3030), 0, 0, 0);
      p.traps.push({ type: 'spinner', mesh: bar, len, speed: 0.85 + i * 0.035, y: top + 0.7 });
    }
    if (large && i >= 8 && i % 5 === 2) {
      const cs = Math.max(1.2, size * 0.28);
      const cr = part(g, new THREE.BoxGeometry(cs, 0.28, cs), lamb(0x8a6a3a), size * 0.28, top + 0.16, -size * 0.18);
      p.traps.push({ type: 'crumble', mesh: cr, size: cs, timer: 0, falling: false, dead: false, ox: cr.position.x, oy: cr.position.y, oz: cr.position.z });
    }
    if (large && i >= 12 && (i % 4 === 0 || i >= 32)) {
      const ks = Math.max(1.1, size * 0.22);
      const kb = part(g, new THREE.BoxGeometry(ks, 0.45, ks), basic(0xff2450), -size * 0.22, top + 0.25, size * 0.2);
      kb.material.transparent = true; kb.material.opacity = 0.88;
      p.traps.push({ type: 'kill', mesh: kb, size: ks, axis: 'x', amp: size * 0.22, speed: 0.7 + i * 0.02, t0: i });
    }
    if (dm.kind === 'block' && i >= 16 && i % 5 === 0) {
      const dir = new V3(Math.sin(i * 2.1), 0, Math.cos(i * 2.1)).normalize();
      p.traps.push({ type: 'wind', dir, mesh: null, str: large ? 5.5 + i * 0.05 : 3.2 + i * 0.03 });
    }
  }
  if (isSlider(i)) {
    p.slide = {
      axis: i % 2 ? 'x' : 'z',
      amp: 2.2 + (i % 5) * 0.16,
      speed: 0.55 + (i % 7) * 0.08,
      t0: i * 0.73,
      ox: p.x, oz: p.z, dx: 0, dz: 0
    };
  }
  platforms.push(p); return p;
}
for (let i = 1; i <= N; i++) buildPlatform(i);
{
  const fin = platforms[N - 1];
  earth.position.set(fin.x + 85, fin.top - 236, fin.z + 145);
}

const windLines = [];
{ const m = basic(0xc8f0ff, { transparent: true, opacity: 0.45 });
  for (let i = 0; i < 14; i++) { const L = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), m); L.visible = false; scene.add(L); windLines.push(L); } }

const player = (readChar() === 'alien' ? makeAlien() : makeMonkey());
const face = createFace(scene);
const SHOT = { n: 0, v: null };   // t753u: my last laser (for the other climber's screen, cosmetic)
scene.add(player);
const flyFx = [];
player.traverse(o => { if (o.name === 'gaThruster') flyFx.push(o); });

const lasers = [], shots = [], aliens = [];
const laserGeo = new THREE.BoxGeometry(0.07, 0.07, 0.85), laserMat = basic(0x48f2ff), laserMatRed = basic(0xff2a33);
const CHARGE_T = 4, BEAM_T = 3, CHARGE_BEAM_LEN = 60, CHARGE_BEAM_R = 0.22;   // t783u/t785u: hold to charge
const shotGeo = new THREE.SphereGeometry(0.16, 8, 6), shotMat = basic(0xff5030);

const G = {
  mode: 'title', run: false, over: false, won: false, hold: false,
  t: 0, energy: 1, vy: 0, vx: 0, vz: 0, air: false, thrust: false,
  face: 0, hp: 3, iframe: 0, platform: 1, reached: 1, check: 1,
  best: readBest(), cooldown: 0, fireHeld: false, flyHeld: false,
  ix: 0, iz: 0, joy: { on: false, x: 0, y: 0, pid: -1 }, lookPid: -1, lookX: 0, lookY: 0,
  phase: 0, camYaw: 0, camPitch: 0, shotLock: false, onPad: null, orbFlash: 0, bannerT: 0,
  gunAim: 0, gunAimT: 0, charge: 0, charging: false, chargeSpent: false, beam: null, beamT: 0,
  wind: { phase: 'calm', t: 0, next: 6, dur: 2.4, dx: 1, dz: 0, str: 0, k: 0, accel: 0, gusts: 0, warns: 0, lock: false }
};

const TK = { got: 0, run: 0, fly: 0, log: [], awarded: Object.create(null) };
const rivals = createRivals({ scene, makeMonkey, makeAlien, player, G, N, banner: t => showBanner(t), live: liveExtra });
// t754u: what a watcher's cabinet screen in the room needs to draw this climb live (small; pads only every few packets)
const r2l = v => Math.round(v * 100) / 100;
function liveExtra(withPads) {
  const o = { cy: r2l(G.camYaw || 0), nt: r2l((G.sky && G.sky.night) || 0) };
  if (face.on && face.shown && face.root.visible) { const q = face.root.position; o.fc = [r2l(q.x), r2l(q.y), r2l(q.z), r2l(face.ang || 0), face.charge > 0 || face.glowT > 0 ? 1 : 0, r2l(face.open || 0)]; }
  const bm = []; for (const b of eyeBeams) if (b.alive && bm.length < 4) { const q = b.mesh.position; bm.push([r2l(q.x), r2l(q.y), r2l(q.z), r2l(b.dir.x), r2l(b.dir.y), r2l(b.dir.z)]); }
  if (bm.length) o.bm = bm;
  if (withPads) { const pd = [], c = Math.max(1, G.platform | 0); for (let i = Math.max(1, c - 2); i <= Math.min(N, c + 4); i++) { const p = platforms[i - 1]; if (!p) continue; const gp = p.g.position; pd.push([i, r2l(gp.x), r2l(gp.z), r2l(p.top), r2l(p.sx), r2l(p.sz), p.col | 0]); } o.pd = pd; }
  return o;
}
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
  if (tixEl) tixEl.textContent = '🎟 ' + (TK.fly || 0);
}

const tickets = [], sparks = [];
function tickRand(i, k) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
// shared ticket geometries / materials (t782u: more tickets, one set of meshes reused so the extra fly-pasts stay cheap)
const TIX_GEO = {
  body: new THREE.BoxGeometry(0.62, 0.36, 0.08),
  stripe: new THREE.BoxGeometry(0.68, 0.08, 0.09),
  shine: new THREE.BoxGeometry(0.66, 0.4, 0.03),
  hole: CYL(0.075, 0.075, 0.06, 8),
  stub: new THREE.BoxGeometry(0.1, 0.1, 0.09)
};
const TIX_MAT = {
  gold: lamb(0xffc433, { emissive: 0xb36a00 }),
  shine: basic(0xffe37a),
  stripe: lamb(0xd4a017, { emissive: 0x6a3a00 })
};
function makeGoldTicket() {
  const g = new THREE.Group(); g.name = 'skyTicket';
  part(g, TIX_GEO.body, TIX_MAT.gold);
  part(g, TIX_GEO.stripe, TIX_MAT.stripe, 0, 0.02, 0);
  part(g, TIX_GEO.shine, TIX_MAT.shine, 0, 0, -0.02);
  part(g, TIX_GEO.hole, TIX_MAT.gold, -0.16, 0.08, 0.06);
  part(g, TIX_GEO.hole, TIX_MAT.gold, 0.16, 0.08, 0.06);
  part(g, TIX_GEO.stub, TIX_MAT.stripe, 0.28, 0.14, 0);
  return g;
}
function spawnFlyTickets() {
  for (const t of tickets) if (t.mesh) scene.remove(t.mesh);
  tickets.length = 0;
  for (let i = 0; i < FLY_TICKETS; i++) {
    const pi = Math.max(1, Math.min(N - 2, Math.floor((i + 0.5) / FLY_TICKETS * (N - 2))));
    const p = platforms[pi];
    const kind = i % 5;
    // t782u: about 1 in 3 drift slowly past the head; the rest still zip by
    const slow = (i % 3 === 0);
    const speed = slow ? (2.8 + tickRand(i, 2) * 2.6) : (12.5 + tickRand(i, 2) * 6);
    let heading;
    if (kind === 0) heading = 0;
    else if (kind === 1) heading = Math.PI;
    else if (kind === 2) heading = Math.PI * 0.5;
    else if (kind === 3) heading = -Math.PI * 0.5;
    else heading = tickRand(i, 3) * Math.PI * 2;
    const vx = Math.sin(heading) * speed, vz = Math.cos(heading) * speed;
    const vy = (i % 3 === 0) ? (tickRand(i, 4) - 0.5) * 6.2 : 0;
    const hl = Math.hypot(vx, vz) || 1;
    const ux = vx / hl, uz = vz / hl;
    const span = 14 + tickRand(i, 5) * 6;
    const y = p.top + 1.55 + tickRand(i, 6) * 3.1;
    const x = p.x - ux * span * 0.35 + (tickRand(i, 7) - 0.5) * 2.2;
    const z = p.z - uz * span * 0.35 + (tickRand(i, 8) - 0.5) * 2.2;
    const mesh = makeGoldTicket();
    mesh.position.set(x, y, z);
    scene.add(mesh);
    tickets.push({
      i, mesh, alive: true, collected: false,
      x, y, z, sx: x, sy: y, sz: z,
      vx, vy, vz, ux, uz, span,
      cx: p.x, cy: y, cz: p.z, spin: tickRand(i, 9) * Math.PI * 2
    });
  }
}
function resetFlyTickets() {
  for (const t of tickets) {
    t.collected = false; t.alive = true;
    t.x = t.sx; t.y = t.sy; t.z = t.sz;
    t.mesh.visible = true;
    t.mesh.position.set(t.x, t.y, t.z);
  }
  for (const s of sparks) scene.remove(s.mesh);
  sparks.length = 0;
  if (plusLayer) plusLayer.textContent = '';
  TK.fly = 0;
}
function showPlusOne(pos) {
  if (!plusLayer || !camera) return;
  const v = pos.clone().project(camera);
  if (v.z > 1) return;
  const el = document.createElement('div');
  el.className = 'skyPlus';
  el.textContent = '+' + FLY_TICKET_VALUE;
  el.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + 'px';
  el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + 'px';
  plusLayer.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
}
function spawnSparks(pos) {
  const mat = basic(0xffe066);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), mat);
    m.position.copy(pos);
    const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.28) * Math.PI;
    const sp = 3.2 + Math.random() * 6;
    sparks.push({
      mesh: m,
      vx: Math.cos(a) * Math.cos(b) * sp,
      vy: Math.sin(b) * sp + 2.4,
      vz: Math.sin(a) * Math.cos(b) * sp,
      life: 0.42 + Math.random() * 0.28
    });
    scene.add(m);
  }
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt; s.vy -= 14 * dt;
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.y += s.vy * dt;
    s.mesh.position.z += s.vz * dt;
    s.mesh.rotation.x += dt * 9;
    s.mesh.scale.setScalar(Math.max(0.02, s.life * 2.4));
    if (s.life <= 0) { scene.remove(s.mesh); sparks.splice(i, 1); }
  }
}
function collectFlyTicket(t) {
  if (!t || t.collected) return 0;
  t.collected = true; t.alive = false; t.mesh.visible = false;
  const pos = t.mesh.position.clone();
  spawnSparks(pos);
  showPlusOne(pos);
  const n = give(FLY_TICKET_VALUE, 'fly');
  if (n > 0) TK.fly += n;
  hud();
  if (window.__skySnd) window.__skySnd.chime();
  return n;
}
function updateFlyTickets(dt) {
  for (const t of tickets) {
    if (t.collected) continue;
    t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt;
    const along = (t.x - t.cx) * t.ux + (t.z - t.cz) * t.uz;
    if (along > t.span) { t.x -= t.ux * t.span * 2; t.z -= t.uz * t.span * 2; }
    else if (along < -t.span) { t.x += t.ux * t.span * 2; t.z += t.uz * t.span * 2; }
    if (Math.abs(t.y - t.cy) > 5.5) { t.vy *= -1; t.y = t.cy + Math.sign(t.y - t.cy) * 5.5; }
    t.spin += dt * 3.4;
    t.mesh.position.set(t.x, t.y, t.z);
    t.mesh.rotation.set(0.18, t.spin, 0.12);
    t.mesh.lookAt(t.x + t.vx, t.y, t.z + t.vz);
    t.mesh.rotateZ(Math.sin(t.spin * 1.6) * 0.25);
  }
  updateSparks(dt);
}
function laserHitsTicket(L, t) {
  return L.mesh.position.distanceTo(t.mesh.position) < (L.hitR || TICKET_HIT_R);
}

// Continuous platform level from height: exactly i standing on platform i, fractional while flying between pads.
function levelAt(y) {
  if (y <= platforms[0].top) return Math.max(0, 1 + (y - platforms[0].top) / Math.max(1, platforms[1].top - platforms[0].top));
  for (let i = 1; i < N; i++) {
    const a = platforms[i - 1].top, b = platforms[i].top;
    if (y < b) return i + (y - a) / Math.max(0.001, b - a);
  }
  return N;
}
// 0 = full day, 1 = full night (moon only). Cosine ease: night at 10/30/50, day at 20/40, half-way (dusk/dawn) at 5/15/25/35/45.
function nightAt(level) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, level) / SKY.cycle); }
const C3 = (t, h, b) => [new THREE.Color(t), new THREE.Color(h), new THREE.Color(b)];   // sky [top, horizon, below]
const SK = {
  dayLo: C3(0x4a9cf0, 0x9fd6ff, 0xd6ecff), dayHi: C3(0x1a48b0, 0x5a9ae8, 0x9cc8f4),
  dusk: C3(0x3a4590, 0xff8a4a, 0x7a4a6a), dawn: C3(0x5878cc, 0xffb08a, 0x9a7a9c),
  nightLo: C3(0x030718, 0x17264f, 0x080b1a), nightHi: C3(0x010310, 0x0c1638, 0x05070f), space: C3(0x000002, 0x03040a, 0x000000),
  sunDay: new THREE.Color(0xfff2d8), sunLow: new THREE.Color(0xffb070),
  hSkyDay: new THREE.Color(0xd8ecff), hGndDay: new THREE.Color(0x8a7358), hSkyNight: new THREE.Color(0x4a64a8), hGndNight: new THREE.Color(0x101528),
  fillDay: new THREE.Color(0xb8d4ff), fillNight: new THREE.Color(0x6f86c8),
};
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _fw = new THREE.Vector3();
const skyU = skyDome.material.uniforms, SKY_OUT = [skyU.top.value, skyU.mid.value, skyU.bot.value];
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function setSky(dt) {
  const h = player.position.y, t = THREE.MathUtils.clamp(h / yOf(N), 0, 1);
  const level = levelAt(h), n = nightAt(level);
  const dawn = Math.floor(Math.max(0, level) / SKY.cycle) % 2 === 1;   // 10→20, 30→40 brighten (dawn); 0→10, 20→30, 40→50 darken (dusk)
  const space = THREE.MathUtils.smoothstep(t, 0.86, 1.0);              // last few pads blend into outer space
  const midC = dawn ? SK.dawn : SK.dusk;
  for (let j = 0; j < 3; j++) {
    const dayC = _c1.copy(SK.dayLo[j]).lerp(SK.dayHi[j], t), nightC = _c2.copy(SK.nightLo[j]).lerp(SK.nightHi[j], t), out = SKY_OUT[j];
    if (n < 0.5) out.copy(dayC).lerp(midC[j], n / 0.5); else out.copy(midC[j]).lerp(nightC, (n - 0.5) / 0.5);
    out.lerp(SK.space[j], space * (0.55 + 0.45 * n));
  }
  skyDome.position.copy(camera.position);
  const col = scene.background.copy(SKY_OUT[1]);   // horizon colour: clear colour + fog, so far pads melt into the sky
  scene.fog.color.copy(col);
  scene.fog.density = (0.012 - t * 0.0112) * (1 - 0.35 * n);
  // light: sun by day (warm and low at dusk/dawn), only cool moonlight at night
  const day = 1 - n, sunK = THREE.MathUtils.smoothstep(day, 0.04, 1);
  sun.intensity = (1.35 - t * 0.5) * sunK;
  sun.color.copy(SK.sunLow).lerp(SK.sunDay, THREE.MathUtils.smoothstep(day, 0.35, 0.95));
  fill.intensity = 0.45 * day + 0.12 * n; fill.color.copy(SK.fillDay).lerp(SK.fillNight, n);
  hemi.intensity = 1.25 * day + 0.62 * n;
  hemi.color.copy(SK.hSkyDay).lerp(SK.hSkyNight, n); hemi.groundColor.copy(SK.hGndDay).lerp(SK.hGndNight, n);
  moonL.intensity = 1.3 * THREE.MathUtils.smoothstep(n, 0.2, 0.9);
  for (const k of NIGHT_TINT) { k.m.color.copy(k.day).lerp(k.night, n); if (k.op) k.m.opacity = k.op[0] + (k.op[1] - k.op[0]) * n; }
  stars.material.opacity = Math.max(THREE.MathUtils.smoothstep(n, 0.45, 0.9), space);
  stars.position.set(player.position.x, player.position.y - 30, player.position.z);
  // the moon hangs in the upper part of the view (eases after the camera so dragging the look feels natural)
  camera.updateMatrixWorld(); camera.getWorldDirection(_fw);
  const camYawNow = Math.atan2(_fw.x, _fw.z), camElNow = Math.asin(THREE.MathUtils.clamp(_fw.y, -1, 1));
  if (G.moonYaw == null || !dt) { G.moonYaw = camYawNow; G.moonEl = camElNow; }
  else { const k = 1 - Math.exp(-dt * 1.2); G.moonYaw += angDiff(camYawNow, G.moonYaw) * k; G.moonEl += (camElNow - G.moonEl) * k; }
  const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
  const yaw = G.moonYaw + Math.min(0.42, halfH * 0.55), el = G.moonEl + THREE.MathUtils.degToRad(camera.fov) * 0.3;
  const dx = Math.sin(yaw) * Math.cos(el), dy = Math.sin(el), dz = Math.cos(yaw) * Math.cos(el);
  moon.position.set(camera.position.x + dx * SKY.moonDist, camera.position.y + dy * SKY.moonDist, camera.position.z + dz * SKY.moonDist);
  const mo = THREE.MathUtils.smoothstep(n, 0.25, 0.75);
  moon.visible = mo > 0.005; moonDisc.material.opacity = mo; moonGlow.material.opacity = mo * 0.75;
  // moonlight comes from high on the moon's side (and a touch from the camera side so lit faces read)
  moonL.position.set(Math.sin(yaw) * 6 - Math.sin(camYawNow) * 10, 22, Math.cos(yaw) * 6 - Math.cos(camYawNow) * 10);
  earth.material.emissiveIntensity = 0.7 * Math.max(space, THREE.MathUtils.smoothstep(t, 0.55, 1) * n);
  clouds.visible = t < 0.4;
  earth.visible = t > 0.55;
  G.sky = { level, night: n, phase: n > 0.9 ? 'night' : n < 0.1 ? 'day' : (dawn ? 'dawn' : 'dusk'), space, sun: sun.intensity, moon: moonL.intensity, stars: stars.material.opacity, moonVisible: moon.visible };
  return G.sky;
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

function padHit(p, x, z) {
  return Math.abs(x - p.x) <= p.sx * 0.5 && Math.abs(z - p.z) <= p.sz * 0.5;
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

function collectSolids() {
  const list = [];
  for (const p of nearPlats()) {
    const hx = p.sx * 0.5, hz = p.sz * 0.5;
    list.push({ minX: p.x - hx, maxX: p.x + hx, minY: p.top - p.h, maxY: p.top, minZ: p.z - hz, maxZ: p.z + hz, p, extra: null, kind: 'pad' });
    for (const tr of p.traps) {
      if (tr.dead || !tr.mesh || (tr.type !== 'mover' && tr.type !== 'crumble')) continue;
      tr.mesh.updateWorldMatrix(true, false);
      const wp = new V3(); tr.mesh.getWorldPosition(wp);
      const hx = tr.size * 0.5;
      const hy = tr.type === 'mover' ? 0.2 : 0.14;
      const hz = tr.type === 'mover' ? tr.size * 0.35 : hx;
      list.push({ minX: wp.x - hx, maxX: wp.x + hx, minY: wp.y - hy, maxY: wp.y + hy, minZ: wp.z - hz, maxZ: wp.z + hz, p, extra: tr, kind: tr.type });
    }
  }
  return list;
}
function xzHits(x, z, box) {
  const cx = Math.max(box.minX, Math.min(x, box.maxX));
  const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
  const dx = x - cx, dz = z - cz;
  return dx * dx + dz * dz < R * R;
}
function resolveXZ(x, z, y, vx, vz, boxes) {
  for (const box of boxes) {
    if (!(y < box.maxY - 0.015 && y + PH > box.minY + 0.015)) continue;
    const cx = Math.max(box.minX, Math.min(x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
    let ex = x - cx, ez = z - cz;
    const d = Math.hypot(ex, ez);
    if (d > R) continue;
    if (d < 1e-6) {
      const pens = [
        [x + R - box.minX, -1, 0],
        [box.maxX - (x - R), 1, 0],
        [z + R - box.minZ, 0, -1],
        [box.maxZ - (z - R), 0, 1]
      ];
      let best = pens[0];
      for (const q of pens) if (q[0] < best[0]) best = q;
      x += best[1] * (best[0] + 0.002);
      z += best[2] * (best[0] + 0.002);
      const vn = vx * best[1] + vz * best[2];
      if (vn < 0) { vx -= vn * best[1]; vz -= vn * best[2]; }
    } else {
      const nx = ex / d, nz = ez / d, pen = R - d + 0.002;
      x += nx * pen; z += nz * pen;
      const vn = vx * nx + vz * nz;
      if (vn < 0) { vx -= vn * nx; vz -= vn * nz; }
    }
  }
  return { x, z, vx, vz };
}
function resolveY(x, z, y, vy, boxes) {
  let grounded = null;
  for (const box of boxes) {
    if (!xzHits(x, z, box)) continue;
    const feet = y, head = y + PH;
    if (head <= box.minY || feet >= box.maxY) {
      if (vy <= 0.18 && feet <= box.maxY + 0.08 && feet >= box.maxY - 0.16 && head > box.maxY) {
        y = box.maxY; vy = Math.min(vy, 0); grounded = box;
      }
      continue;
    }
    const penCeil = head - box.minY, penFloor = box.maxY - feet;
    if (penCeil <= 0 || penFloor <= 0) continue;
    if (vy > 0.08 || (vy >= -0.05 && penCeil < penFloor)) {
      y = box.minY - PH - 0.002;
      if (vy > 0) vy = 0;
    } else {
      y = box.maxY; vy = Math.min(vy, 0); grounded = box;
    }
  }
  return { y, vy, grounded };
}

function lastCheck(i) { return i <= 1 ? 1 : 1 + 10 * Math.floor((i - 1) / 10); }
function placeOn(i, jitter) {
  i = Math.max(1, Math.min(N, i | 0));
  const p = platforms[i - 1];
  player.position.set(p.x + (jitter ? (Math.random() - 0.5) * 0.4 : 0), p.top + 0.01, p.z);
  G.vy = G.vx = G.vz = 0; G.air = false; G.thrust = false; G.platform = i; G.onPad = p;
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
  showBanner(rivals.myWin() || 'YOU MADE IT!\nEARTH BELOW', true);   // t753u: race result when someone else is climbing too
  G.best = N; if (!window.__DEMO) saveBest(N);
}

function respawn(why) {
  const c = platforms[G.check - 1];
  player.position.set(c.x, c.top + 0.02, c.z);
  G.vy = G.vx = G.vz = 0; G.air = false; G.hp = 3; G.iframe = 1.4; G.energy = Math.max(G.energy, 0.55);
  G.platform = G.check; G.onPad = c;
  if (G.wind.phase !== 'calm') scheduleCalm(G.wind);
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
function bump(dx, dz, force) {
  const L = Math.hypot(dx, dz) || 1;
  force = force || 3.2;
  G.vx += (dx / L) * force; G.vz += (dz / L) * force; G.vy = Math.max(G.vy, 1.1);
}

function playerCols() {
  let lk = null;
  try { if (window.parent && window.parent !== window && window.parent.__gaPlayer && window.parent.__gaPlayer.look) lk = window.parent.__gaPlayer.look(); } catch (e) {}
  if (!lk) { try { lk = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}'); } catch (e) { lk = {}; } }
  const char = lk.char || (player.userData && player.userData.char) || 'monkey';
  const HOOD = { navy: [0x1d2452, 0x141a3a], red: [0xd42a2a, 0x7a1414], blue: [0x2b62e8, 0x173a8a], green: [0x2fae3a, 0x16601c], yellow: [0xf2c418, 0x9a7a08], purple: [0x7a2bd6, 0x46137f], pink: [0xff5fb4, 0xb02a72], orange: [0xff7a1a, 0xa8460a], teal: [0x13b8a8, 0x0a6b62], black: [0x202026, 0x0c0c10], white: [0xe8eaf0, 0xa9adb8], galaxy: [0x2a1470, 0x160a40], lime: [0x86e02a, 0x4a8a10], maroon: [0x6e1430, 0x3c0818], sky: [0x6cc8ff, 0x2a7ab8] };
  const SUIT = { suitgrey: [0x5a636e, 0x6a3a9a], suitred: [0xb3222f, 0x2b1a3e], suitgold: [0xc9971f, 0x6a3a9a], suitteal: [0x138a8a, 0x6a3a9a], suitwhite: [0xdfe4ea, 0x6a3a9a], suitblack: [0x22252b, 0x8a3ad0] };
  if (char === 'alien') { const su = SUIT[lk.suit] || SUIT.suitgrey; return { a: su[0], b: su[1], char: 'alien' }; }
  const ho = HOOD[lk.hoodie || 'navy'] || HOOD.navy; return { a: ho[0], b: ho[1], char: 'monkey' };
}
function muzzlePos() {
  player.updateMatrixWorld(true);
  const u = player.userData, o = new V3(), dir = new V3(Math.sin(G.face), 0.02, Math.cos(G.face));
  if (u.char === 'alien' && u.botEye) { u.botEye.getWorldPosition(o); o.addScaledVector(dir, 0.1); }
  else if (u.muzzle) { u.muzzle.getWorldPosition(o); o.addScaledVector(dir, 0.04); }
  else if (u.gun) u.gun.getWorldPosition(o);
  else o.set(player.position.x, player.position.y + 1.2, player.position.z);
  return { o, dir };
}
function setChg(k) { try { bFire.style.setProperty('--chg', (Math.max(0, Math.min(1, k)) * 100).toFixed(1)); } catch (e) {} }
let chargeBall = null;
function hideChargeBall() { if (chargeBall) { scene.remove(chargeBall); chargeBall = null; } }
function updateChargeBall(k) {
  const { o } = muzzlePos();
  if (!chargeBall) { chargeBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), basic(0xffe14a, { transparent: true, opacity: 0.85 })); chargeBall.name = 'skyCharge'; chargeBall.renderOrder = 6; scene.add(chargeBall); }
  chargeBall.visible = k > 0.02; chargeBall.position.copy(o); chargeBall.scale.setScalar(0.45 + k * 2.2); chargeBall.material.opacity = 0.35 + k * 0.6;
  chargeBall.material.color.setHex(k > 0.7 ? playerCols().a : 0xffe14a);
}
function startChargeBeam() {
  const col = playerCols(), { o, dir } = muzzlePos();
  const g = new THREE.Group(); g.name = 'skyChargeBeam';
  const core = basic(col.a), glow = basic(col.b, { transparent: true, opacity: 0.45 });
  if (glow.blending !== undefined) glow.blending = THREE.AdditiveBlending;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(CHARGE_BEAM_R, CHARGE_BEAM_R, CHARGE_BEAM_LEN, 12, 1, true), core);
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(CHARGE_BEAM_R * 2.1, CHARGE_BEAM_R * 2.1, CHARGE_BEAM_LEN, 12, 1, true), glow);
  [c, gl].forEach(m => { m.rotation.x = Math.PI / 2; m.position.z = CHARGE_BEAM_LEN / 2; m.renderOrder = 5; g.add(m); });
  scene.add(g); G.beam = { mesh: g, cols: col, lastHit: -1 }; G.beamT = BEAM_T; hideChargeBall(); setChg(1);
  if (player.userData.char === 'monkey') { G.gunAimT = GUN_AIM_TIME; G.gunAim = 1; poseMonkeyGun(1); }
  else { G.orbFlash = 0.2; }
  if (window.__skySnd) window.__skySnd.zap(col.char === 'alien' ? 'red' : 'cyan');
}
function placeChargeBeam() {
  if (!G.beam) return;
  const { o, dir } = muzzlePos();
  G.beam.mesh.position.copy(o); G.beam.mesh.lookAt(o.x + dir.x, o.y + dir.y, o.z + dir.z);
  return { o, dir, tip: o.clone().addScaledVector(dir, CHARGE_BEAM_LEN) };
}
function chargeBeamHits(o, tip) {
  if (!G.beam || G.won) return;
  const at = face.hit(o, tip); if (at && G.t - (G.beam.lastHit || -9) > 0.15) { G.beam.lastHit = G.t; face.shot(at); }
  for (const a of aliens) {
    if (!a.alive) continue;
    const d = (function () { const abx = tip.x - o.x, aby = tip.y - o.y, abz = tip.z - o.z, l2 = abx * abx + aby * aby + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((a.mesh.position.x - o.x) * abx + (a.mesh.position.y - o.y) * aby + (a.mesh.position.z - o.z) * abz) / l2));
      return Math.hypot(o.x + abx * t - a.mesh.position.x, o.y + aby * t - a.mesh.position.y, o.z + abz * t - a.mesh.position.z); })();
    if (d < 1.15 + CHARGE_BEAM_R) { a.alive = false; scene.remove(a.mesh); }
  }
  for (const t of tickets) {
    if (t.collected) continue;
    const d = (function () { const p = t.mesh.position, abx = tip.x - o.x, aby = tip.y - o.y, abz = tip.z - o.z, l2 = abx * abx + aby * aby + abz * abz || 1;
      const k = Math.max(0, Math.min(1, ((p.x - o.x) * abx + (p.y - o.y) * aby + (p.z - o.z) * abz) / l2));
      return Math.hypot(o.x + abx * k - p.x, o.y + aby * k - p.y, o.z + abz * k - p.z); })();
    if (d < TICKET_HIT_R + CHARGE_BEAM_R) collectFlyTicket(t);
  }
}
function endChargeBeam() {
  if (!G.beam) return;
  scene.remove(G.beam.mesh); G.beam = null; G.beamT = 0; setChg(0);
}
function fire(opts) {
  opts = opts || {};
  if (G.beam) return null;
  if (G.hold || (G.mode !== 'play' && !window.__DEMO)) return null;
  if (!opts.fromRelease && G.cooldown > 0) return null;
  G.cooldown = 0.28;
  if (!opts.fromRelease) G.chargeSpent = true;
  const uPre = player.userData;
  if (uPre.char === 'monkey') {
    G.gunAimT = GUN_AIM_TIME;
    G.gunAim = 1;
    poseMonkeyGun(1);
  }
  const { o, dir } = muzzlePos();
  const u = player.userData;
  let mat = laserMat, hue = 'cyan';
  if (u.char === 'alien' && u.botEye) {
    mat = laserMatRed; hue = 'red';
    G.orbFlash = 0.16;
    if (u.bot) { u.bot.rotation.x = -0.18; u.bot.rotation.y = 0; u.bot.rotation.z = 0; }
  }
  const k = Math.max(0, Math.min(0.999, opts.k || 0));
  const mesh = new THREE.Mesh(laserGeo, mat);
  mesh.position.copy(o); mesh.lookAt(o.x + dir.x, o.y + dir.y, o.z + dir.z);
  if (k > 0) mesh.scale.set(1 + k * 3, 1 + k * 3, 1 + k * 1.5);
  scene.add(mesh);
  const L = { mesh, o: o.clone(), dir: dir.clone(), speed: 28, life: 1.5, alive: true, color: hue, k, hitR: TICKET_HIT_R * (1 + k * 0.9) };   // t782u range ~42 m; t785u scale with hold
  lasers.push(L);
  if (window.__skySnd) window.__skySnd.zap(hue);
  { const q = v => Math.round(v * 1000) / 1000; SHOT.n++; SHOT.v = [q(o.x), q(o.y), q(o.z), q(dir.x), q(dir.y), q(dir.z), hue === 'red' ? 1 : 0]; }
  return L;
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

const _lp = new V3(), _bp = new V3(), _pc = new V3();
// t751u: the TITAN's eye lasers — every 2nd hit on the face, one THICK red beam from each eye, aimed where the player
// is when it fires (no homing), slow enough to dodge. A beam that connects costs one heart (hurt() = 1 heart with
// i-frames, so both beams together still cost only 1). Beams never touch tickets, pads or aliens.
const BEAM_SPEED = 15, BEAM_LIFE = 3.4, BEAM_R = 0.85, BEAM_LEN = 4.2;
const eyeBeams = [];
const beamGeo = new THREE.CylinderGeometry(0.24, 0.24, BEAM_LEN, 10, 1, false).rotateX(Math.PI / 2);
const beamGlowGeo = new THREE.CylinderGeometry(0.55, 0.55, BEAM_LEN * 1.06, 12, 1, true).rotateX(Math.PI / 2);
const beamMat = basic(0xff2418, { fog: false }), beamGlowMat = basic(0xff3020, { fog: false, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
const BEAM_STATS = { fired: 0, hits: 0, misses: 0 };
function fireEyeBeams(eyes) {
  if (!G.run || G.won || G.mode !== 'play' || window.__DEMO) return 0;
  const tgt = new V3(player.position.x, player.position.y + 1.0, player.position.z);
  for (const e of eyes) {
    const dir = tgt.clone().sub(e).normalize();
    const g = new THREE.Group(); g.add(new THREE.Mesh(beamGeo, beamMat)); g.add(new THREE.Mesh(beamGlowGeo, beamGlowMat));
    g.position.copy(e).addScaledVector(dir, BEAM_LEN * 0.5); g.lookAt(g.position.clone().add(dir)); scene.add(g);
    eyeBeams.push({ mesh: g, dir, speed: BEAM_SPEED, life: BEAM_LIFE, alive: true, o: e.clone() });
    BEAM_STATS.fired++;
  }
  if (window.__skySnd && window.__skySnd.beam) window.__skySnd.beam();
  return eyes.length;
}
face.onBeam = fireEyeBeams;
function clearEyeBeams() { for (const b of eyeBeams) scene.remove(b.mesh); eyeBeams.length = 0; }
function segDist(a, b, p) {   // distance from point p to segment ab
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, l2 = abx * abx + aby * aby + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2));
  return Math.hypot(a.x + abx * t - p.x, a.y + aby * t - p.y, a.z + abz * t - p.z);
}
function updateEyeBeams(dt) {
  for (let i = eyeBeams.length - 1; i >= 0; i--) {
    const b = eyeBeams[i];
    _bp.copy(b.mesh.position).addScaledVector(b.dir, BEAM_LEN * 0.5);   // leading tip before the move
    b.mesh.position.addScaledVector(b.dir, b.speed * dt); b.life -= dt;
    const tip = b.mesh.position.clone().addScaledVector(b.dir, BEAM_LEN * 0.5);
    _pc.set(player.position.x, player.position.y + 0.95, player.position.z);
    if (b.alive && !G.won && segDist(_bp, tip, _pc) < BEAM_R) {
      b.alive = false; BEAM_STATS.hits++; hurt(b.dir.x, b.dir.z);
    }
    if (!b.alive || b.life <= 0) { if (b.alive) BEAM_STATS.misses++; scene.remove(b.mesh); eyeBeams.splice(i, 1); }
  }
}
function updateCombat(dt) {
  updateEyeBeams(dt);
  if (G.cooldown > 0) G.cooldown -= dt;
  // t783u/t785u: hold charges; release before 4 s = one scaled shot; 4 s = 3 s player-colour beam. DEMO attract still sprays.
  if (window.__DEMO) {
    if (G.fireHeld && G.cooldown <= 0) fire();
  } else if (G.beam) {
    G.beamT -= dt; const p = placeChargeBeam(); if (p) chargeBeamHits(p.o, p.tip); if (G.beamT <= 0) endChargeBeam();
    if (player.userData.char === 'monkey' && G.gunAimT < 0.08) G.gunAimT = GUN_AIM_TIME;
  } else if (G.fireHeld) {
    if (!G.charging) { G.charging = true; G.charge = 0; G.chargeSpent = false; }
    if (!G.chargeSpent) {
      G.charge += dt; const ck = Math.min(1, G.charge / CHARGE_T); setChg(ck); updateChargeBall(ck);
      if (player.userData.char === 'monkey' && G.gunAimT < 0.08) { G.gunAimT = GUN_AIM_TIME; }
      if (G.charge >= CHARGE_T) { G.chargeSpent = true; startChargeBeam(); }
    }
  } else if (G.charging) {
    if (!G.chargeSpent && !G.beam) fire({ k: Math.min(0.999, G.charge / CHARGE_T), fromRelease: true });
    G.charging = false; G.charge = 0; setChg(0); hideChargeBall();
  }
  for (const L of lasers) {
    if (!L.alive) continue;
    _lp.copy(L.mesh.position);
    L.mesh.position.addScaledVector(L.dir, L.speed * dt); L.life -= dt;
    // t749u: the TITAN face is a target (swept test so a fast bolt can't tunnel through); the bolt is spent on it,
    // it makes the face angry and never gives tickets or touches the player
    { const at = face.hit(_lp, L.mesh.position); if (at) { L.alive = false; scene.remove(L.mesh); face.shot(at); continue; } }
    if (L.life <= 0) { L.alive = false; scene.remove(L.mesh); continue; }
    for (const a of aliens) {
      if (!a.alive) continue;
      if (L.mesh.position.distanceTo(a.mesh.position) < 1.15) {
        a.alive = false; scene.remove(a.mesh); L.alive = false; scene.remove(L.mesh); break;
      }
    }
    if (!L.alive) continue;
    for (const t of tickets) {
      if (t.collected) continue;
      if (laserHitsTicket(L, t)) {
        collectFlyTicket(t);
        L.alive = false; scene.remove(L.mesh);
        break;
      }
    }
  }
  updateFlyTickets(dt);
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
    const dx = player.position.x - a.x, dy = (player.position.y + 1) - a.y, dz = player.position.z - a.z;
    if (Math.hypot(dx, dy, dz) < 0.85) bump(dx, dz, 3.4);
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

// ---- random gusts (t734) ----
const gustLines = [];
{ const m = basic(0xe8f8ff, { transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 26; i++) {
    const L = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.9), m); L.visible = false; L.renderOrder = 4;
    L.userData.seed = Math.random() * 100; scene.add(L); gustLines.push(L);
  } }
function heightK() { return THREE.MathUtils.clamp(player.position.y / (yOf(N) || 1), 0, 1); }
function windAccelAt(h, air, str) { return (str == null ? 1 : str) * (WIND.airBase + WIND.airTop * h) * (air ? 1 : WIND.ground); }
function scheduleCalm(W) { W.phase = 'calm'; W.t = 0; W.k = 0; W.next = WIND.gap0 + Math.random() * (WIND.gap1 - WIND.gap0); }
function windGust(o) {   // start a telegraphed gust now (tests / screenshots may force direction, strength, phase)
  o = o || {};
  const W = G.wind, a = o.angle != null ? o.angle : Math.random() * Math.PI * 2;
  W.dx = o.dx != null ? o.dx : Math.sin(a); W.dz = o.dz != null ? o.dz : Math.cos(a);
  const L = Math.hypot(W.dx, W.dz) || 1; W.dx /= L; W.dz /= L;
  W.str = o.str != null ? o.str : WIND.str0 + Math.random() * (WIND.str1 - WIND.str0);
  W.dur = o.dur != null ? o.dur : WIND.dur0 + Math.random() * (WIND.dur1 - WIND.dur0);
  W.phase = o.phase || 'warn'; W.t = o.t || 0; W.k = W.phase === 'gust' ? 1 : 0;
  if (W.phase === 'warn') { W.warns++; if (window.__skySnd && window.__skySnd.whoosh) window.__skySnd.whoosh(W.str * (0.55 + 0.45 * heightK())); }
  else W.gusts++;
  return W;
}
function updateWind(dt) {
  const W = G.wind;
  if (W.lock) return;
  W.t += dt;
  if (W.phase === 'calm') {
    W.k = 0;
    if (G.platform >= WIND.fromPlat && !G.won && W.t >= W.next) windGust();
  } else if (W.phase === 'warn') {
    W.k = 0;
    if (W.t >= WIND.warn) { W.phase = 'gust'; W.t = 0; W.gusts++; }
  } else if (W.phase === 'gust') {
    const up = Math.min(1, W.t / WIND.rampIn), down = Math.min(1, Math.max(0, (W.dur - W.t) / WIND.rampOut));
    W.k = Math.min(up, down);
    if (W.t >= W.dur) scheduleCalm(W);
  }
}
function applyGust(dt) {
  const W = G.wind;
  W.accel = W.phase === 'gust' ? W.k * windAccelAt(heightK(), G.air, W.str) : 0;
  if (W.accel > 0) { G.vx += W.dx * W.accel * dt; G.vz += W.dz * W.accel * dt; }
}
function drawWind() {
  const W = G.wind, on = W.phase !== 'calm';
  const op = W.phase === 'warn' ? 0.22 + 0.18 * Math.min(1, W.t / WIND.warn) : W.phase === 'gust' ? 0.25 + 0.5 * W.k : 0;
  gustLines[0].material.opacity = op;
  const px = player.position.x, py = player.position.y, pz = player.position.z;
  const sp = W.phase === 'gust' ? 9 + 8 * W.k : 4;
  const rx = -W.dz, rz = W.dx;
  for (let i = 0; i < gustLines.length; i++) {
    const L = gustLines[i]; L.visible = on;
    if (!on) continue;
    const s = L.userData.seed, span = 14;
    const along = ((G.t * sp + s * 7.3) % span) - span / 2;
    const side = ((s * 13.7) % 10) - 5, hgt = ((s * 3.1) % 4) - 0.6;
    L.position.set(px + W.dx * along + rx * side, py + hgt, pz + W.dz * along + rz * side);
    L.lookAt(L.position.x + W.dx, L.position.y, L.position.z + W.dz);
    L.scale.z = W.phase === 'gust' ? 1 + W.k * 1.2 : 0.7;
  }
  if (windEl) {
    windEl.classList.toggle('on', on);
    windEl.classList.toggle('warn', W.phase === 'warn');
    windEl.classList.toggle('gust', W.phase === 'gust');
    if (on && windArrow) {
      const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw), rgx = -Math.cos(G.camYaw), rgz = Math.sin(G.camYaw);
      const sx = W.dx * rgx + W.dz * rgz, sy = W.dx * fx + W.dz * fz;   // screen right / screen up
      windArrow.style.transform = 'rotate(' + (Math.atan2(-sy, sx) * 180 / Math.PI).toFixed(1) + 'deg)';
    }
  }
}
function applyWind(dt) {
  applyGust(dt);
  for (const p of nearPlats()) {
    for (const tr of p.traps) if (tr.type === 'wind') {
      if (Math.abs(player.position.x - p.x) < p.sx * 0.55 && Math.abs(player.position.z - p.z) < p.sz * 0.55 &&
          player.position.y < p.top + 3 && player.position.y > p.top - 0.2) {
        G.vx += tr.dir.x * tr.str * dt; G.vz += tr.dir.z * tr.str * dt;
      }
    }
  }
}

const GUN_REST = { shx: -0.12, shy: 0.04, shz: 0.26, elx: 0.22, elz: 0.06, gx: 0.78, gy: 0 };
const GUN_AIM = { shx: -1.40, shy: 0, shz: 0.20, elx: -0.08, elz: 0, gx: 1.48, gy: -0.25 };
const GUN_AIM_TIME = 0.35;
function lerpNum(a, b, t) { return a + (b - a) * t; }
function poseMonkeyGun(k) {
  const u = player.userData;
  if (!u || u.char !== 'monkey' || !u.gun || !u.arms || !u.arms[1]) return;
  k = Math.max(0, Math.min(1, k));
  const sh = u.arms[1].sh, el = u.arms[1].el;
  sh.rotation.x = lerpNum(GUN_REST.shx, GUN_AIM.shx, k);
  sh.rotation.y = lerpNum(GUN_REST.shy, GUN_AIM.shy, k);
  sh.rotation.z = lerpNum(GUN_REST.shz, GUN_AIM.shz, k);
  el.rotation.x = lerpNum(GUN_REST.elx, GUN_AIM.elx, k);
  el.rotation.z = lerpNum(GUN_REST.elz, GUN_AIM.elz, k);
  u.gun.rotation.x = lerpNum(GUN_REST.gx, GUN_AIM.gx, k);
  u.gun.rotation.y = lerpNum(GUN_REST.gy, GUN_AIM.gy, k);
}

function gunBarrelDir(out) {
  const dir = out || new V3();
  const u = player.userData;
  if (u && u.gun && u.muzzle) {
    player.updateMatrixWorld(true);
    const base = new V3();
    u.gun.getWorldPosition(base);
    u.muzzle.getWorldPosition(dir);
    dir.sub(base);
    if (dir.lengthSq() > 1e-8) return dir.normalize();
  }
  return dir.set(Math.sin(G.face), 0.02, Math.cos(G.face)).normalize();
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
  if (u.char === 'monkey' && u.gun) {
    if (G.gunAimT > 0) G.gunAimT = Math.max(0, G.gunAimT - dt);
    const want = (G.fireHeld || G.gunAimT > 0) ? 1 : 0;
    const rate = want ? 10 : 7;
    G.gunAim += (want - G.gunAim) * (1 - Math.exp(-rate * Math.max(0, dt)));
    poseMonkeyGun(G.gunAim);
  } else if (u.gun) {
    u.arms[1].el.rotation.x = -0.15;
  }
  player.rotation.y = G.face;
  const on = G.thrust ? 1 : 0;
  const s = 0.78 + Math.sin(G.t * 28) * 0.22, w = 0.88 + Math.sin(G.t * 17) * 0.14;
  for (const fx of flyFx) { fx.visible = !!on; if (on) fx.scale.set(w, s, w); }
  if (G.orbFlash > 0) G.orbFlash = Math.max(0, G.orbFlash - dt);
  if (u.bot) {
    const y0 = u.bot.userData.baseY;
    const flash = G.orbFlash > 0 ? Math.min(1, G.orbFlash / 0.05) : 0;
    u.bot.position.x = 0.64 + Math.sin(G.t * 1.15) * 0.016;
    u.bot.position.y = y0 + Math.sin(G.t * 2.35) * 0.035;
    u.bot.rotation.x = -0.18 * flash;
    u.bot.rotation.y = Math.sin(G.t * 0.9) * 0.12 * (1 - flash);
    u.bot.rotation.z = Math.sin(G.t * 1.9) * 0.06 * (1 - flash);
    if (u.botFlash) {
      u.botFlash.material.opacity = flash * 0.95;
      u.botFlash.scale.setScalar(1 + flash * 1.15);
    }
    if (u.botEye) u.botEye.scale.setScalar(1 + flash * 0.4);
  }
  if (G.iframe > 0) player.visible = Math.floor(G.t * 16) % 2 === 0; else player.visible = true;
}

function updateSlides() {
  for (const p of platforms) {
    const sl = p.slide;
    if (!sl) continue;
    const u = Math.sin(G.t * sl.speed + sl.t0) * sl.amp;
    const nx = sl.ox + (sl.axis === 'x' ? u : 0);
    const nz = sl.oz + (sl.axis === 'z' ? u : 0);
    sl.dx = nx - p.x; sl.dz = nz - p.z;
    p.x = nx; p.z = nz;
    p.g.position.x = nx; p.g.position.z = nz;
  }
}

function step(dt) {
  if (window.__skySnd) {
    const top = (platforms[N - 1] && platforms[N - 1].top) || yOf(N) || 1;
    const h = player ? player.position.y / top : 0;
    window.__skySnd.tick(Math.max(0, Math.min(1, h)));
    if (window.__skySnd.setNight && G.sky) window.__skySnd.setNight(G.sky.night);
  }
  if (G.hold) return;
  dt = Math.min(0.05, dt); G.t += dt;
  updateSlides();
  if (!G.air && G.onPad && G.onPad.slide) {
    player.position.x += G.onPad.slide.dx;
    player.position.z += G.onPad.slide.dz;
  }
  if (G.bannerT > 0) { G.bannerT -= dt; if (G.bannerT <= 0) bannerEl.classList.remove('on'); }
  if (G.iframe > 0) G.iframe -= dt;
  if (G.mode !== 'play' && !window.__DEMO) { setSky(dt); hud(); return; }

  if (window.__DEMO) demoPilot(dt);

  let ix = G.ix, iz = G.iz;
  if (G.joy.on) {
    const h = Math.hypot(G.joy.x, G.joy.y);
    if (h > 0.12) { ix = G.joy.x / h; iz = G.joy.y / h; }
    else ix = iz = 0;
  }
  const yaw = G.camYaw;
  // Camera sits at (-sin yaw, -cos yaw) looking at the player, so screen-forward
  // (stick up / W) is (+sin, +cos) and screen-right (stick right / D) is (-cos, +sin).
  // The previous ix signs used the arcade's camera-right vector, which mirrored left/right.
  const wx = -ix * Math.cos(yaw) - iz * Math.sin(yaw);
  const wz = ix * Math.sin(yaw) - iz * Math.cos(yaw);
  const wish = Math.hypot(wx, wz);
  const speed = G.air ? 6.2 : 4.6;
  if (wish > 0.01) {
    const target = Math.atan2(wx, wz);
    let turn = target - G.face;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    G.face += turn * (1 - Math.exp(-dt * 12));
    G.vx += (wx / wish * speed - G.vx) * (1 - Math.exp(-dt * (G.air ? 3 : 10)));
    G.vz += (wz / wish * speed - G.vz) * (1 - Math.exp(-dt * (G.air ? 3 : 10)));
  } else {
    G.vx += (0 - G.vx) * (1 - Math.exp(-dt * (G.air ? 1.2 : 8)));
    G.vz += (0 - G.vz) * (1 - Math.exp(-dt * (G.air ? 1.2 : 8)));
  }
  updateWind(dt);
  applyWind(dt);

  const request = !!(G.flyHeld), canStart = G.air || G.energy >= FLY.min;
  if (request && canStart && G.energy > 0) G.energy = Math.max(0, G.energy - FLY.drain * dt);
  const powered = request && canStart && G.energy > 0;
  if (powered) G.vy += (FLY.up - G.vy) * (1 - Math.exp(-dt * 9));
  else if (G.air) G.vy += (-FLY.down - G.vy) * (1 - Math.exp(-dt * 5));
  else G.vy = 0;

  const boxes = collectSolids();
  let x = player.position.x, y = player.position.y, z = player.position.z;
  const travel = Math.hypot(G.vx * dt, G.vy * dt, G.vz * dt);
  const nStep = Math.max(1, Math.ceil(travel / 0.08));
  const sdt = dt / nStep;
  let grounded = null;
  for (let s = 0; s < nStep; s++) {
    x += G.vx * sdt;
    let hit = resolveXZ(x, z, y, G.vx, G.vz, boxes); x = hit.x; z = hit.z; G.vx = hit.vx; G.vz = hit.vz;
    z += G.vz * sdt;
    hit = resolveXZ(x, z, y, G.vx, G.vz, boxes); x = hit.x; z = hit.z; G.vx = hit.vx; G.vz = hit.vz;
    y += G.vy * sdt;
    const vert = resolveY(x, z, y, G.vy, boxes); y = vert.y; G.vy = vert.vy;
    if (vert.grounded) grounded = vert.grounded;
  }
  player.position.set(x, y, z);

  if (grounded && G.vy <= 0.15) {
    player.position.y = grounded.maxY; G.vy = 0; G.air = false; G.thrust = false;
    G.energy = Math.min(1, G.energy + FLY.fill * dt);
    if (grounded.p && grounded.p.i > G.platform) onReach(grounded.p.i);
    else if (grounded.p) G.platform = Math.max(G.platform, grounded.p.i);
    if (grounded.extra && grounded.extra.type === 'crumble' && !grounded.extra.falling) {
      grounded.extra.timer += dt;
      grounded.extra.mesh.position.x = grounded.extra.ox + Math.sin(G.t * 40) * 0.03;
      if (grounded.extra.timer > 0.55) grounded.extra.falling = true;
    }
    if (grounded.p && grounded.p.i === N && !G.won) onReach(N);
    G.onPad = grounded.p || null;
  } else {
    G.air = true; G.thrust = powered;
    G.onPad = null;
  }

  const checkY = yOf(G.check);
  if (player.position.y < checkY - 8) respawn('fall');

  updateTraps(dt);
  drawWind();
  trapHits();
  updateCombat(dt);
  animatePlayer(dt);
  updateCamera(dt);
  face.update(dt, { pos: player.position, camYaw: G.camYaw, won: G.won, hold: G.hold });
  rivals.update(dt, SHOT);
  setSky(dt);
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
  const pitch = G.camPitch || 0;
  const back = 5.1 + Math.max(0, pitch) * 1.6;
  const height = 2.35 - pitch * 0.7;
  const lookLift = 1.15 + pitch * (pitch > 0 ? 3.2 : 1.15);
  const tx = player.position.x - Math.sin(G.camYaw) * back;
  const tz = player.position.z - Math.cos(G.camYaw) * back;
  const ty = player.position.y + height;
  camera.position.lerp(new V3(tx, ty, tz), 1 - Math.exp(-dt * 5));
  camera.lookAt(player.position.x, player.position.y + lookLift, player.position.z);
}

function lookDrag(dx, dy) {
  G.camYaw -= dx * 0.0055;
  G.camPitch -= dy * 0.0055;
  if (G.camPitch < PITCH_MIN) G.camPitch = PITCH_MIN;
  if (G.camPitch > PITCH_MAX) G.camPitch = PITCH_MAX;
}

function xzInside(p, x, z, extra) {
  extra = extra || 0;
  return Math.abs(x - p.x) <= p.sx * 0.5 + extra && Math.abs(z - p.z) <= p.sz * 0.5 + extra;
}
function demoPilot(dt) {
  const destI = Math.min(N, G.platform + ((G.energy > 0.32 || G.air) ? 1 : 0));
  const d = platforms[destI - 1];
  const px = player.position.x, py = player.position.y, pz = player.position.z;
  G.joy.on = false;
  let block = null;
  for (const p of nearPlats()) {
    if (p.top - p.h > py + 0.2 && xzInside(p, px, pz, R * 0.15) && p.top <= d.top + 0.05) {
      if (!block || p.top < block.top) block = p;
    }
  }
  let tx = d.x, tz = d.z, wantY = d.top;
  if (block && py + PH > block.top - block.h - 0.4) {
    const bx = px - block.x, bz = pz - block.z, hx = block.sx * 0.5 + R + 0.7, hz = block.sz * 0.5 + R + 0.7;
    if (Math.abs(bx) / hx >= Math.abs(bz) / hz) { tx = block.x + (bx >= 0 ? 1 : -1) * hx; tz = pz; }
    else { tx = px; tz = block.z + (bz >= 0 ? 1 : -1) * hz; }
    wantY = py;
  } else if (!xzInside(d, px, pz, -0.15) && py < d.top + 0.25) {
    const xzGap = Math.hypot(d.x - px, d.z - pz);
    const climbLeft = Math.max(0, d.top + 0.7 - py);
    if (climbLeft > xzGap * (FLY.up / AIR_SPEED)) { tx = px; tz = pz; }
    wantY = d.top + 0.85;
  } else if (xzInside(d, px, pz, -0.15) && py < d.top - 0.05) {
    const bx = px - d.x, bz = pz - d.z, hx = d.sx * 0.5 + R + 0.7, hz = d.sz * 0.5 + R + 0.7;
    if (Math.abs(bx) / hx >= Math.abs(bz) / hz) { tx = d.x + (bx >= 0 ? 1 : -1) * hx; tz = pz; }
    else { tx = px; tz = d.z + (bz >= 0 ? 1 : -1) * hz; }
    wantY = py;
  }
  const wdx = tx - px, wdz = tz - pz, wlen = Math.hypot(wdx, wdz);
  if (wlen > 0.08) {
    const wx = wdx / wlen, wz = wdz / wlen, c = Math.cos(G.camYaw), s = Math.sin(G.camYaw);
    G.ix = -c * wx + s * wz;
    G.iz = -s * wx - c * wz;
  } else { G.ix = 0; G.iz = 0; }
  const needUp = wantY > py + 0.1;
  const low = G.energy < 0.2 && !G.air;
  G.flyHeld = !low && (needUp || (G.air && G.energy > 0.08 && py < Math.max(wantY, d.top) + 1.5));
  let nearest = null, nd = 12;
  for (const a of aliens) {
    if (!a.alive) continue;
    const dd = Math.hypot(a.x - player.position.x, a.z - player.position.z);
    if (dd < nd) { nd = dd; nearest = a; }
  }
  G.fireHeld = !!(nearest && nd < 14);
  if (nearest && nd < 8) G.face = Math.atan2(nearest.x - player.position.x, nearest.z - player.position.z);
  for (const sh of shots) {
    if (!sh.alive) continue;
    if (sh.mesh.position.distanceTo(player.position) < 3.2) { G.ix = 1; G.iz = 0; }
  }
}

function resetWorld(keepPos) {
  endChargeBeam(); hideChargeBall(); G.charge = 0; G.charging = false; G.chargeSpent = false; setChg(0);
  for (const L of lasers) scene.remove(L.mesh); lasers.length = 0; clearEyeBeams();
  for (const s of shots) scene.remove(s.mesh); shots.length = 0;
  for (const a of aliens) scene.remove(a.mesh); aliens.length = 0;
  for (const p of platforms) for (const tr of p.traps) {
    if (tr.type === 'crumble') { tr.timer = 0; tr.falling = false; tr.dead = false; if (tr.mesh) { tr.mesh.visible = true; tr.mesh.position.set(tr.ox, tr.oy, tr.oz); } }
  }
  G.hp = 3; G.energy = 1; G.iframe = 0; G.vy = G.vx = G.vz = 0; G.won = false; G.over = false;
  G.reached = 1; G.check = 1; G.platform = 1; G.cooldown = 0; G.gunAim = 0; G.gunAimT = 0; TK.run = 0; TK.awarded = Object.create(null);
  resetFlyTickets();
  G.wind.lock = false; scheduleCalm(G.wind); drawWind();
  if (!keepPos) placeOn(1);
}

function clearInput() {   // t762u: every climb starts with clean controls (no stuck key / joystick / held FLY / pause)
  for (const k in keys) keys[k] = false; G.ix = G.iz = 0; G.flyHeld = G.fireHeld = false; G.flyKey = G.fireKey = false;
  G.joy.on = false; G.joy.x = G.joy.y = 0; G.joy.pid = -1; G.lookPid = -1; G.hold = false;
  try { joyKnob.style.left = '60px'; joyKnob.style.top = '60px'; } catch (e) {}
}
function startRun() {
  clearInput();
  window.__DEMO = false; D.on = false; document.body.classList.remove('demo');
  G.mode = 'play'; G.run = true; G.over = false; G.won = false;
  resetWorld(false); showBanner('FLY UP!'); rivals.reset();
  face.start({ pos: player.position, camYaw: G.camYaw });   // the TITAN pops in and booms its line
  if (window.__skySnd) window.__skySnd.unlock();
}
function startDemo() {
  window.__DEMO = true; D.on = true; D.runs++; document.body.classList.add('demo');
  G.mode = 'play'; G.run = false; G.over = false; G.won = false;
  face.stop();   // attract mode: no TITAN
  resetWorld(false);
  if (window.__skySnd) window.__skySnd.unlock();
}
function stopDemo() {
  D.on = false; window.__DEMO = false; document.body.classList.remove('demo');
  G.flyHeld = G.fireHeld = false; G.ix = G.iz = 0;
  if (!G.run) { G.mode = 'title'; face.stop(); resetWorld(false); }
}

const D = { on: false, runs: 0, start: startDemo, stop: stopDemo };

// input
const keys = Object.create(null);
function setFly(on) { G.flyHeld = !!on; }
function setFire(on) { G.fireHeld = !!on; if (on && window.__DEMO) fire(); }   // t783u: climb charges on hold; DEMO still shoots on press
bFly.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { bFly.setPointerCapture(e.pointerId); } catch (err) {} setFly(true); });
bFly.addEventListener('pointerup', e => { e.preventDefault(); setFly(false); });
bFly.addEventListener('pointercancel', () => setFly(false));
bFire.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { bFire.setPointerCapture(e.pointerId); } catch (err) {} setFire(true); });
bFire.addEventListener('pointerup', e => { e.preventDefault(); setFire(false); });
bFire.addEventListener('pointercancel', () => setFire(false));
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); G.flyKey = true; setFly(true); }
  if (e.code === 'KeyF' || e.code === 'KeyJ') { e.preventDefault(); G.fireKey = true; if (!e.repeat) setFire(true); }
  syncKeys();
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space') { G.flyKey = false; setFly(false); }
  if (e.code === 'KeyF' || e.code === 'KeyJ') { G.fireKey = false; setFire(false); }
  syncKeys();
});
function syncKeys() {
  G.ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  G.iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
}
// t762u: losing keyboard focus (the arcade / Grok's WATCH view focusing the page) only drops KEYBOARD input. A finger on
// the joystick / FLY / FIRE keeps working - pointer events still arrive - so a focus change can't freeze the player mid-touch.
addEventListener('blur', () => { for (const k in keys) keys[k] = false; syncKeys(); if (G.flyKey) { G.flyKey = false; setFly(false); } if (G.fireKey) { G.fireKey = false; setFire(false); } G.blurs = (G.blurs || 0) + 1; });

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
  else { G.lookPid = e.pointerId; G.lookX = e.clientX; G.lookY = e.clientY; }
});
addEventListener('pointermove', e => {
  if (G.joy.on && e.pointerId === G.joy.pid) joyAt(e.clientX, e.clientY);
  else if (e.pointerId === G.lookPid) {
    lookDrag(e.clientX - G.lookX, e.clientY - G.lookY);
    G.lookX = e.clientX; G.lookY = e.clientY;
  }
});
addEventListener('pointerup', e => { if (e.pointerId === G.joy.pid) joyClear(); if (e.pointerId === G.lookPid) G.lookPid = -1; });
addEventListener('pointercancel', e => { if (e.pointerId === G.joy.pid) joyClear(); if (e.pointerId === G.lookPid) G.lookPid = -1; });

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
  // t762u: one bad frame (e.g. a phone refusing to start audio) must never stop the climb: log it, keep stepping + drawing
  try { step(dt); } catch (e) { G.stepErrs = (G.stepErrs || 0) + 1; if (G.stepErrs < 4) console.warn('sky tower step', e); }
  try { renderer.render(scene, camera); } catch (e) { G.drawErrs = (G.drawErrs || 0) + 1; }
}
// t762u: phones can drop the WebGL context under memory pressure (e.g. right after another game closed) - let three restore it
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); G.ctxLost = (G.ctxLost || 0) + 1; }, false);
renderer.domElement.addEventListener('webglcontextrestored', () => { G.ctxRestored = (G.ctxRestored || 0) + 1; try { setSky(); hud(); } catch (e) {} }, false);
spawnFlyTickets(); placeOn(1); updateCamera(1); setSky(); hud();
requestAnimationFrame(frame);

function sceneName() { return G.over ? 'over' : (G.run || D.on || G.mode === 'play') ? 'play' : 'title'; }

const api = {
  start: startRun,
  scene: sceneName,
  active: () => G.run && G.mode === 'play' && !G.over,
  hold() { if (!(G.run && !G.over)) return false; G.hold = true; return true; },
  unhold() { G.hold = false; },
  get ready() { return true; },
  get snd() { return window.__skySnd || null; },
  face, rivals, SHOT, eyeBeams, BEAM_STATS, BEAM_SPEED, fireEyeBeams, liveExtra,
  PAD, WIND, shapeOf, dimsOf, windGust, updateWind, windAccelAt, drawWind, heightK, get wind() { return G.wind; },
  SKY, levelAt, nightAt, setSky, skyDome, get sky() { return G.sky; }, moon, moonL, sun, hemi, stars,
  N, R, PH, FLY, AIR_SPEED, MIN_SEP, PITCH_MIN, PITCH_MAX, RUN_CAP, FLY_TICKETS, FLY_TICKET_VALUE, GUN_AIM_TIME, GUN_REST, GUN_AIM, poseMonkeyGun, gunBarrelDir, tickets, collectFlyTicket, resetFlyTickets, spawnFlyTickets, sizeOf, offsetOf, yOf, isCheck, isSlider, hopFuel, gapYOf, gapXZOf, lookDrag, updateCamera, updateSlides, TK, D, G, player, platforms, lasers, aliens, shots, earth, world: scene, camera, renderer,
  fly: setFly, fire, setFire, spawnAlien, placeOn, step, give, playerCols, CHARGE_T, BEAM_T,
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
    } else if (kind === 'spread') {
      placeOn(1);
      window.__DEMO = false; D.on = false; G.hold = false;
      bannerEl.classList.remove('on');
      G.face = 0.4; player.rotation.y = G.face; G.camYaw = 0.15;
      for (const q of platforms) q.g.visible = q.i <= 16;
      const p1 = platforms[0], p4 = platforms[3], p8 = platforms[7];
      camera.fov = 60; camera.updateProjectionMatrix();
      camera.position.set(p1.x + 7.5, p1.top + 4.6, p1.z + 13.2);
      camera.lookAt(p4.x * 0.4, p8.top * 0.42, p4.z);
      setSky();
    } else if (kind === 'joystick') {
      placeOn(1);
      window.__DEMO = false; D.on = false; G.hold = false;
      bannerEl.classList.remove('on');
      G.camYaw = 0; G.face = 0; player.rotation.y = 0;
      G.vx = G.vz = G.vy = 0; G.air = false; G.ix = 0; G.iz = 0;
      const p0 = player.position;
      camera.fov = 58; camera.updateProjectionMatrix();
      camera.position.set(p0.x, p0.y + 2.35, p0.z - 5.1);
      camera.lookAt(p0.x, p0.y + 1.15, p0.z);
      G.shotLock = true;
      G.joy.on = true; G.joy.x = 1; G.joy.y = 0;
      joyKnob.style.left = '98px'; joyKnob.style.top = '60px';
      for (let i = 0; i < 26; i++) step(1 / 30);
      G.joy.on = false; G.joy.x = 0; G.joy.y = 0;
      joyKnob.style.left = '98px'; joyKnob.style.top = '60px';
      setSky();
    } else if (kind === 'under') {
      placeOn(1);
      const p = platforms[1];
      for (const q of platforms) q.g.visible = q.i <= 2;
      player.position.set(p.x, p.top - p.h - PH - 0.02, p.z);
      G.face = 0.9; player.rotation.y = G.face; G.camYaw = 0.9;
      G.air = true; G.vy = 2.4; G.energy = 1;
      setFly(true);
      for (let i = 0; i < 18; i++) step(1 / 30);
      for (const q of platforms) q.g.visible = q.i <= 2;
      camera.fov = 58; camera.updateProjectionMatrix();
      camera.position.set(p.x + p.sx * 0.5 + 3.6, 4.2, p.z + 3.1);
      camera.lookAt(player.position.x, p.top - p.h - 0.45, player.position.z);
      setSky();
    } else if (kind === 'lookup') {
      placeOn(1);
      window.__DEMO = false; D.on = false; G.hold = false;
      bannerEl.classList.remove('on');
      const p1 = platforms[0], p2 = platforms[1], p4 = platforms[3];
      G.face = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      player.rotation.y = G.face;
      G.camYaw = G.face; G.camPitch = 0.72;
      for (const q of platforms) q.g.visible = q.i <= 10;
      const yaw = Math.atan2(p2.x * 0.65 + p4.x * 0.35 - p1.x, p2.z * 0.65 + p4.z * 0.35 - p1.z);
      camera.fov = 68; camera.updateProjectionMatrix();
      camera.position.set(
        p1.x - Math.sin(yaw) * 8.4 + Math.cos(yaw) * 3.8,
        p1.top + 2.35,
        p1.z - Math.cos(yaw) * 8.4 - Math.sin(yaw) * 3.8
      );
      camera.lookAt(p1.x * 0.22 + p2.x * 0.58 + p4.x * 0.2, p1.top + 6.1, p1.z * 0.22 + p2.z * 0.58 + p4.z * 0.2);
      G.shotLock = true;
      setSky();
    } else if (kind === 'alienFire' || kind === 'monkeyGun' || kind === 'monkeyGunRest' || kind === 'monkeyGunAim') {
      placeOn(1);
      window.__DEMO = false; D.on = false; G.hold = false;
      bannerEl.classList.remove('on');
      const aiming = kind === 'monkeyGun' || kind === 'monkeyGunAim' || kind === 'alienFire';
      G.face = kind === 'alienFire' ? 0.45 : 0.32;
      player.rotation.y = G.face;
      G.camYaw = G.face - 0.7; G.camPitch = 0.1;
      G.fireHeld = aiming && kind !== 'alienFire';
      G.gunAimT = (aiming && kind !== 'alienFire') ? GUN_AIM_TIME : 0;
      G.gunAim = (aiming && kind !== 'alienFire') ? 1 : 0;
      if (player.userData.char === 'monkey') poseMonkeyGun(G.gunAim);
      else animatePlayer(0.016);
      player.updateMatrixWorld(true);
      const dir = new V3(Math.sin(G.face), 0.03, Math.cos(G.face)).normalize();
      const origin = new V3();
      const u = player.userData;
      if (kind === 'alienFire' && u.botEye) u.botEye.getWorldPosition(origin);
      else if (u.muzzle) u.muzzle.getWorldPosition(origin);
      else origin.set(player.position.x, player.position.y + 1.2, player.position.z);
      const L = aiming ? fire() : null;
      if (L) {
        L.mesh.scale.set(1.12, 1.12, 2.8);
        const half = 0.85 * 2.8 * 0.5;
        L.mesh.position.copy(origin).addScaledVector(dir, half + 0.1);
        L.mesh.lookAt(origin.x + dir.x * 10, origin.y + dir.y * 10, origin.z + dir.z * 10);
      }
      const s = Math.sin(G.face), c = Math.cos(G.face);
      if (kind === 'alienFire') {
        camera.fov = 52; camera.updateProjectionMatrix();
        camera.position.set(player.position.x + c * 2.2 + s * 1.55, player.position.y + 1.55, player.position.z - s * 2.2 + c * 1.55);
        camera.lookAt(origin.x + s * 0.25, origin.y + 0.02, origin.z + c * 0.25);
      } else if (kind === 'monkeyGunRest') {
        camera.fov = 48; camera.updateProjectionMatrix();
        camera.position.set(player.position.x + c * 2.2 + s * 1.45, player.position.y + 1.18, player.position.z - s * 2.2 + c * 1.45);
        camera.lookAt(player.position.x + c * 0.22 + s * 0.05, player.position.y + 0.82, player.position.z - s * 0.22 + c * 0.05);
      } else {
        const yaw = G.face;
        G.camYaw = yaw; G.camPitch = 0;
        camera.fov = 50; camera.updateProjectionMatrix();
        const back = 3.35, height = 2.28, side = 1.15;
        camera.position.set(
          player.position.x - Math.sin(yaw) * back + Math.cos(yaw) * side,
          player.position.y + height,
          player.position.z - Math.cos(yaw) * back - Math.sin(yaw) * side
        );
        camera.lookAt(
          player.position.x + Math.sin(yaw) * 0.45,
          player.position.y + 1.22,
          player.position.z + Math.cos(yaw) * 0.45
        );
      }
      setSky();
    } else if (kind === 'tickets' || kind === 'ticketHit') {
      placeOn(21);
      window.__DEMO = true; D.on = false; G.hold = false;
      bannerEl.classList.remove('on');
      const p = platforms[20];
      G.face = 0.35; player.rotation.y = G.face;
      const fx = Math.sin(G.face), fz = Math.cos(G.face);
      const rx = Math.cos(G.face), rz = -Math.sin(G.face);
      const px = player.position.x, py = player.position.y, pz = player.position.z;
      const show = tickets.slice(0, 4);
      for (const t of tickets) if (show.indexOf(t) < 0) t.mesh.visible = false;
      show.forEach((t, i) => {
        t.collected = false; t.alive = true; t.mesh.visible = true;
        const along = 3.8 + i * 0.85, side = (i - 1.4) * 2.15;
        t.x = px + fx * along + rx * side;
        t.y = py + 1.45 + (i % 2) * 0.45;
        t.z = pz + fz * along + rz * side;
        const dir = (i % 2 === 0) ? 1 : -1;
        const spd = 12 + i * 0.8;
        t.vx = rx * spd * dir; t.vy = i === 3 ? 3.2 : (i === 1 ? -1.4 : 0); t.vz = rz * spd * dir;
        t.ux = rx * dir; t.uz = rz * dir; t.span = 16;
        t.cx = t.x; t.cy = t.y; t.cz = t.z;
        t.mesh.position.set(t.x, t.y, t.z);
      });
      G.shotLock = true;
      camera.fov = 58; camera.updateProjectionMatrix();
      camera.position.set(px - fx * 3.4 + rx * 1.35, py + 2.25, pz - fz * 3.4 + rz * 1.35);
      camera.lookAt(px + fx * 3.4, py + 1.45, pz + fz * 3.4);
      if (kind === 'ticketHit') {
        const t = show[1];
        t.x = px + fx * 2.15; t.y = py + 1.22; t.z = pz + fz * 2.15;
        t.vx = rx * 7; t.vy = 0; t.vz = rz * 7;
        t.mesh.position.set(t.x, t.y, t.z);
        G.cooldown = 0; G.fireHeld = false;
        if (player.userData.char === 'monkey') { G.gunAim = 1; poseMonkeyGun(1); }
        player.updateMatrixWorld(true);
        fire();
        for (let i = 0; i < 8; i++) step(1 / 30);
      } else {
        for (let i = 0; i < 10; i++) step(1 / 30);
      }
      setSky();
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
