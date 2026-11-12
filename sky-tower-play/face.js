// SKY TOWER (t748u): the TITAN — a massive floating cartoon face that greets every climb with a booming
// "Show me what you got". Original design: sunset-orange giant (t751u: wild white mad-scientist hair), big white eyes,
// heavy brows, round nose, rosy cheeks and a wide toothy mouth. One procedural Three.js group (~40 meshes,
// shared geometries, Lambert), fog-free so it reads at a distance.
// Behaviour: pops in when a real climb starts (never in the lobby / DEMO attract), floats up with the player,
// always turns its head + eyes to the player, weaves around on the camera's right-hand side at a 22-30 m
// standoff (never closer than MIN_D), mouth animates from the voice's loudness envelope. On the win it
// drifts up and away and fades so the space ending stays clear.
// t749u/t751u/t752u: shoot it and it gets ANGRY — red flush, brows slam down into a V, squint, gritted scowl and a
// head shake (no forehead vein). Every hit advances a cycle: odd hits boom "Hey, watch it!" (same voice, same chain,
// ../sfx/sky_face_hey.mp3), even hits charge the eyes red and game.js fires a thick red laser from EACH eye at the
// player (1 heart if it connects, dodgeable). Hits come from game.js (F.hit(prev, now) = swept laser vs head + hair).
// t751u: wild white mad-scientist hair replaces the old teal flame crown.
import * as THREE from '../vendor/three.module.js';

const SCALE = 5.4, MIN_D = 18, D0 = 27;
const ANGRY_T = 2.2, HIT_DEBOUNCE = 0.15, CHARGE_T = 0.45;   // angry hold after the last hit; min gap between counted hits; eye wind-up before the lasers
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function lam(c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c, fog: false }, o || {})); }
function add(p, geo, mat, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (sx != null) m.scale.set(sx, sy, sz); p.add(m); return m; }

export function createFace(scene) {
  const root = new THREE.Group(); root.name = 'skyFace'; root.visible = false; scene.add(root);
  const head = new THREE.Group(); head.name = 'skyFaceHead'; root.add(head);   // turns to the player (+Z = face forward)
  const skin = lam(0xff8f3f, { emissive: 0x5a2306 }), skinD = lam(0xe86a22, { emissive: 0x4a1a04 }), white = lam(0xffffff, { emissive: 0x404040 }),
    ink = lam(0x14101c), blue = lam(0x2a6cff, { emissive: 0x0a1a50 }), hair = lam(0xffffff, { emissive: 0x8c8e94 }), hairD = lam(0xe4e8ee, { emissive: 0x6a6e76 }),
    cheek = lam(0xff5f86, { emissive: 0x501020, transparent: true, opacity: 0.85 }), mouthIn = lam(0x3a0612), tongue = lam(0xff4d6a, { emissive: 0x401018 }), lip = lam(0xc8401c, { emissive: 0x401004 });
  const sph = new THREE.SphereGeometry(1, 36, 24), sphLo = new THREE.SphereGeometry(1, 18, 12), cone = new THREE.ConeGeometry(1, 1, 10);
  // skull: slightly tall, flattened front-to-back
  add(head, sph, skin, 0, 0, 0, 1, 1.08, 0.94);
  add(head, sphLo, skinD, 0, -0.62, 0.18, 0.78, 0.42, 0.7);                   // chunky chin / jaw shadow
  [-1, 1].forEach(sd => { add(head, sphLo, skin, 1.0 * sd, 0.02, -0.05, 0.2, 0.3, 0.16); add(head, sphLo, skinD, 1.04 * sd, 0.02, 0.0, 0.1, 0.17, 0.08); });   // ears
  // t751u wild white mad-scientist hair: a bald-ish dome with huge frizzy puffs over the ears and back, and a
  // messy fan of upright / sideways spikes (seeded, so every climb gets the same do)
  const hairG = new THREE.Group(); hairG.name = 'skyFaceHair'; head.add(hairG);
  { let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const up = V(0, 1, 0), dir = V(0, 0, 0), q = new THREE.Quaternion();
    // puffs: side tufts (Einstein / mad-scientist), back of the head, a wispy forelock tuft
    [[-0.98, 0.5, -0.2, 0.42], [0.98, 0.5, -0.2, 0.42], [-1.12, 0.12, -0.3, 0.34], [1.12, 0.12, -0.3, 0.34], [-0.7, 0.85, -0.55, 0.42], [0.7, 0.85, -0.55, 0.42],
     [0, 0.95, -0.75, 0.48], [-0.35, 1.05, -0.3, 0.36], [0.35, 1.05, -0.3, 0.36], [0, 0.45, -0.95, 0.42], [-0.8, -0.15, -0.55, 0.3], [0.8, -0.15, -0.55, 0.3]]
      .forEach(([x, y, z, r], i) => add(hairG, sphLo, i % 3 ? hair : hairD, x, y, z, r * (1.05 + 0.2 * rnd()), r * (0.85 + 0.2 * rnd()), r));
    // spikes: cones fanned out from the scalp, longer at the sides / top, a few flicked forward
    for (let i = 0; i < 30; i++) {
      const th = -1.45 + 2.9 * (i / 29) + (rnd() - 0.5) * 0.22, ph = 0.25 + rnd() * 0.95;   // around the head (side to side), and up/back
      dir.set(Math.sin(th) * 1.05, Math.cos(th) * 0.9 + 0.25 * rnd(), -0.12 - 0.45 * rnd() * ph).normalize();
      const base = V(dir.x * 0.82, 0.3 + dir.y * 0.66, dir.z * 0.6 - 0.12), len = 0.6 + 0.55 * rnd() + 0.3 * Math.abs(Math.sin(th));
      const c = add(hairG, cone, i % 2 ? hair : hairD, base.x + dir.x * len * 0.45, base.y + dir.y * len * 0.45, base.z + dir.z * len * 0.45, 0.16 + 0.08 * rnd(), len, 0.16 + 0.08 * rnd());
      q.setFromUnitVectors(up, dir); c.quaternion.copy(q); c.rotateY(rnd() * 3); }
    for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.17, c = add(hairG, cone, hair, x, 0.98, 0.32 - Math.abs(x) * 0.3, 0.09, 0.42 + 0.15 * rnd(), 0.09);   // frizzy forelock
      c.rotation.set(0.75 + 0.3 * rnd(), 0, -x * 1.8 + (rnd() - 0.5) * 0.6); } }
  // eyes: white balls with blue iris + pupil on a pivot that aims at the player
  const eyes = [], brows = [];
  [-1, 1].forEach(sd => {
    const e = new THREE.Group(); e.position.set(0.36 * sd, 0.22, 0.7); head.add(e);
    add(e, sph, white, 0, 0, 0, 0.29, 0.34, 0.25);
    const piv = new THREE.Group(); e.add(piv);
    add(piv, sphLo, blue, 0, 0, 0.2, 0.15, 0.17, 0.08); add(piv, sphLo, ink, 0, 0, 0.245, 0.085, 0.1, 0.05); add(piv, sphLo, white, 0.04, 0.05, 0.27, 0.03, 0.03, 0.02);
    eyes.push({ g: e, piv });
    const b = add(head, new THREE.BoxGeometry(0.5, 0.11, 0.14), ink, 0.38 * sd, 0.66, 0.78); b.rotation.z = -0.28 * sd; b.userData.sd = sd; brows.push(b);
  });
  add(head, sph, skinD, 0, -0.04, 0.95, 0.17, 0.15, 0.15);                     // round nose
  add(head, sphLo, white, 0.05, 0.02, 1.08, 0.04, 0.035, 0.02);                // nose shine
  [-1, 1].forEach(sd => add(head, sphLo, cheek, 0.6 * sd, -0.18, 0.62, 0.17, 0.11, 0.08));
  // mouth: dark cavity, upper teeth, tongue, lip ring — the jaw group scales open with the voice
  const mouth = new THREE.Group(); mouth.position.set(0, -0.44, 0.78); head.add(mouth);
  add(mouth, new THREE.TorusGeometry(0.36, 0.06, 10, 32), lip, 0, 0, 0.04, 1, 0.55, 1);
  const cav = add(mouth, sph, mouthIn, 0, 0, 0, 0.34, 0.18, 0.14);
  const teeth = add(mouth, new THREE.BoxGeometry(0.46, 0.08, 0.06), white, 0, 0.1, 0.1);
  const tng = add(mouth, sphLo, tongue, 0, -0.1, 0.07, 0.2, 0.08, 0.1);
  const blueC = blue.color.clone(), blueE = blue.emissive.clone(), EYE_R = new THREE.Color(0xff2020), EYE_RE = new THREE.Color(0xff1010);
  const cheeks = head.children.filter(m => m.material === cheek);
  const skinC = skin.color.clone(), skinE = skin.emissive.clone(), skinDC = skinD.color.clone(), skinDE = skinD.emissive.clone();
  const RED = new THREE.Color(0xff3a22), REDE = new THREE.Color(0x8a1004), REDD = new THREE.Color(0xd8261a), REDDE = new THREE.Color(0x6a0a02);
  head.scale.setScalar(SCALE);
  // a soft glow disc behind it so it pops from the sky, day or night
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const x = gc.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), color: 0xffb070, transparent: true, opacity: 0.22, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(SCALE * 3.4, SCALE * 3.4, 1); glow.position.z = -SCALE * 0.6; root.add(glow);
  // impact flash where a laser lands (one reused sprite)
  const pow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow.material.map, color: 0xfff0a0, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false, blending: THREE.AdditiveBlending }));
  pow.visible = false; pow.renderOrder = 6; scene.add(pow);
  const _a = V(0, 0, 0), _b = V(0, 0, 0), _c = V(0, 0, 0);
  // hit volumes in head-local units (before SCALE): skull (+ears, nose) and the flame crown
  const VOLS = [{ c: V(0, -0.04, 0.04), r: V(1.18, 1.16, 1.06) }, { c: V(0, 0.72, -0.32), r: V(1.62, 1.08, 1.12) }];   // skull, wild hair mass
  function inside(q) { for (const v of VOLS) { const x = (q.x - v.c.x) / v.r.x, y = (q.y - v.c.y) / v.r.y, z = (q.z - v.c.z) / v.r.z; if (x * x + y * y + z * z <= 1) return true; } return false; }

  const F = {
    root, head, mouth, eyes, brows, hair: hairG, on: false, shown: false, t: 0, pop: 0, appearAt: -1, spoke: 0, speakT: -1, speaking: false, open: 0,
    dist: 0, yaw: 0, side: 1, leave: 0, env: null, envDt: 0.03, lookErr: 0, eyeErr: 0, runs: 0,
    ang: 0, angryT: 0, hits: 0, heys: 0, heyBlocked: 0, lastHit: -1e9, cycle: 0, beams: 0, charge: 0, glowT: 0, onBeam: null, line: '', shake: 0, powT: 0, hitPos: null, lastAct: '',
    SCALE, MIN_D, D0, ANGRY_T, HIT_DEBOUNCE, CHARGE_T, VOLS,
    start(ctx) {   // a real climb began
      F.on = true; F.shown = true; root.visible = true; F.t = 0; F.pop = 0; F.leave = 0; F.runs++; F.spoke = 0; F.speakT = -1;
      F.ang = 0; F.angryT = 0; F.hits = 0; F.heys = 0; F.heyBlocked = 0; F.lastHit = -1e9; F.cycle = 0; F.beams = 0; F.charge = 0; F.glowT = 0; F.lastAct = ''; F.line = ''; F.shake = 0; F.powT = 0; F.speaking = false;
      F.yaw = (ctx && ctx.camYaw) || 0; F.side = 1;
      F.place(ctx, true); F.appearAt = performance.now();
      F.speakT = 0.35;   // after the pop-in
    },
    stop() { F.on = false; F.shown = false; root.visible = false; F.speaking = false; F.ang = 0; F.angryT = 0; F.charge = 0; F.glowT = 0; pow.visible = false; },
    eyeWorld() { root.updateMatrixWorld(true); return eyes.map(e => e.g.localToWorld(V(0, 0, 0.3))); },
    // swept laser test: segment p0->p1 (world) against the head; returns the world hit point or null
    hit(p0, p1) {
      if (!F.on || !F.shown || !root.visible || F.leave > 0.5 || F.pop < 0.25) return null;
      const a = head.worldToLocal(_a.copy(p0)), b = head.worldToLocal(_b.copy(p1));
      const n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.08));
      for (let i = 0; i <= n; i++) { _c.lerpVectors(a, b, i / n); if (inside(_c)) return head.localToWorld(_c.clone()); }
      return null;
    },
    shot(at) {   // a player laser hit it: always angry; each counted hit advances the cycle (odd = line, even = eye lasers)
      F.hits++; F.angryT = ANGRY_T; F.shake = 0.45;
      if (at) { F.hitPos = at.clone(); pow.position.copy(at); pow.visible = true; F.powT = 0.22; }
      if (F.t - F.lastHit < HIT_DEBOUNCE) return 'debounced';
      F.lastHit = F.t; F.cycle++;
      if (F.cycle % 2 === 0) { if (F.charge <= 0) F.charge = CHARGE_T; F.glowT = 0.4 + CHARGE_T; F.lastAct = 'beam'; return 'beam'; }
      const S = window.__skySnd;
      const busy = F.speaking || F.speakT >= 0 || (S && S.voiceLine);   // never talks over a line (incl. the opening)
      if (!busy) F.sayHey(); else F.heyBlocked++;
      F.lastAct = busy ? 'hey-quiet' : 'hey'; return F.lastAct;
    },
    sayHey() {
      F.heys++; F.line = 'hey'; F.sayK = 0; F.speaking = true;
      const S = window.__skySnd; F.env = (S && S.voiceEnvs && S.voiceEnvs.hey) || null; if (S && S.voice) S.voice('hey');
    },
    target(ctx) {   // where it wants to float: camera-forward, swung to the right, weaving + bobbing
      const t = F.t, p = ctx.pos, d = D0 + 3.2 * Math.sin(t * 0.37) + (F.leave * 26);
      const off = F.side * (0.4 + 0.14 * Math.sin(t * 0.29) + 0.05 * Math.sin(t * 0.83));
      const a = F.yaw + off;
      return V(p.x + Math.sin(a) * d, p.y + 3.4 + 1.6 * Math.sin(t * 0.53) + 0.6 * Math.sin(t * 1.3) + F.leave * 30, p.z + Math.cos(a) * d);
    },
    place(ctx, snap) { const tg = F.target(ctx); if (snap) root.position.copy(tg); else root.position.lerp(tg, 1 - Math.exp(-ctx.dt * 1.1)); },
    update(dt, ctx) {
      if (!F.on) return;
      if (ctx.hold) return;
      ctx.dt = dt; F.t += dt;
      // follow the camera's yaw slowly so the giant stays in view without swinging wildly
      let dy = ctx.camYaw - F.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; F.yaw += dy * (1 - Math.exp(-dt * 0.9));
      if (ctx.won) F.leave = Math.min(1, F.leave + dt * 0.35);
      F.place(ctx, false);
      // standoff: never closer than MIN_D to the player
      const p = ctx.pos, dx = root.position.x - p.x, dz = root.position.z - p.z, dyy = root.position.y - p.y, d = Math.hypot(dx, dyy, dz) || 1;
      if (d < MIN_D) { const k = MIN_D / d; root.position.set(p.x + dx * k, p.y + dyy * k, p.z + dz * k); }
      F.dist = Math.hypot(root.position.x - p.x, root.position.y - p.y, root.position.z - p.z);
      // pop-in, fade-out on the win
      F.pop = Math.min(1, F.pop + dt / 0.6); const s = (1 - Math.pow(1 - F.pop, 3)) * (1 + 0.1 * Math.sin(F.pop * Math.PI)) * (1 - 0.85 * F.leave);
      root.scale.setScalar(Math.max(0.001, s));
      if (F.leave >= 1) { root.visible = false; F.shown = false; }
      // head + eyes look at the player's head
      const eye = V(p.x, p.y + 1.1, p.z);
      head.lookAt(eye);
      head.rotation.z += 0.08 * Math.sin(F.t * 0.9);   // a little head tilt
      root.updateMatrixWorld(true);
      for (const e of eyes) { const loc = e.g.worldToLocal(eye.clone()); const yaw = Math.atan2(loc.x, loc.z), pit = -Math.atan2(loc.y, Math.hypot(loc.x, loc.z));
        e.piv.rotation.set(THREE.MathUtils.clamp(pit, -0.5, 0.5), THREE.MathUtils.clamp(yaw, -0.5, 0.5), 0); }
      { const fw = V(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion())), to = eye.clone().sub(head.getWorldPosition(V(0, 0, 0))).normalize(); F.lookErr = Math.acos(THREE.MathUtils.clamp(fw.dot(to), -1, 1)) - 0; }
      // voice + mouth
      if (F.speakT >= 0) { F.speakT -= dt; if (F.speakT < 0) { F.speakT = -1; F.say(); } }
      let o = 0.06 + 0.04 * Math.sin(F.t * 1.7);
      if (F.speaking) { F.sayK += dt; const k = F.sayK; const i = Math.floor(k / F.envDt);   // game time (pauses with the game; ~real time while playing)
        const mime = F.line === 'hey' ? 1.3 : 2.6;
        if (F.env && i < F.env.length) o = F.env[i]; else if (!F.env && k < mime) o = 0.5 + 0.5 * Math.abs(Math.sin(k * 7.5)); else { F.speaking = false; F.line = ''; } }
      // anger: snaps in, holds ANGRY_T after the last hit, then eases back
      if (F.angryT > 0) { F.angryT -= dt; F.ang += (1 - F.ang) * (1 - Math.exp(-dt * 16)); } else F.ang += (0 - F.ang) * (1 - Math.exp(-dt * 2.6));
      if (F.ang < 0.002) F.ang = 0;
      const A = F.ang;
      F.open += (o - F.open) * (1 - Math.exp(-dt * 22));
      const op = Math.max(0, F.open);
      // angry scowl: wider, flatter, lower mouth with gritted teeth (still opens with the words)
      mouth.scale.set(1 + op * 0.15 + A * 0.22, (0.55 + op * 1.6) * (1 - A * 0.35), 1); mouth.position.y = -0.44 - A * 0.04;
      cav.scale.y = 0.18 + op * 0.12; tng.position.y = -0.1 - op * 0.05; teeth.position.y = 0.1 + op * 0.02 - A * 0.06; teeth.scale.set(1 + A * 0.25, 1 + A * 0.6, 1);
      // brows: friendly arch -> furious V (inner ends slam down toward the nose)
      for (const b of brows) { const sd = b.userData.sd; b.position.set((0.38 - A * 0.05) * sd, 0.66 + op * 0.06 * (1 - A) - A * 0.1, 0.78 + A * 0.04);
        b.rotation.z = (-(0.28 - op * 0.18) * (1 - A) + 0.52 * A) * sd; b.scale.set(1 + A * 0.12, 1 + A * 0.45, 1); }
      for (const e of eyes) e.g.scale.set(1, 1 - A * 0.38, 1);   // squint
      // red flush + anger mark + shake
      skin.color.copy(skinC).lerp(RED, A * 0.8); skin.emissive.copy(skinE).lerp(REDE, A); skinD.color.copy(skinDC).lerp(REDD, A * 0.8); skinD.emissive.copy(skinDE).lerp(REDDE, A);
      for (const c of cheeks) c.visible = A < 0.5;
      // even-hit wind-up: irises glow red, then game.js fires the eye lasers
      if (F.charge > 0) { F.charge -= dt; if (F.charge <= 0) { F.charge = 0; F.beams++; if (F.onBeam) F.onBeam(F.eyeWorld()); } }
      if (F.glowT > 0) F.glowT = Math.max(0, F.glowT - dt);
      const glow = F.charge > 0 ? 1 - F.charge / CHARGE_T : F.glowT / 0.4;
      blue.color.copy(blueC).lerp(EYE_R, Math.min(1, glow)); blue.emissive.copy(blueE).lerp(EYE_RE, Math.min(1, glow));
      if (F.shake > 0) { F.shake = Math.max(0, F.shake - dt); const k = F.shake / 0.45; head.position.set(Math.sin(F.t * 61) * 0.5 * k, Math.sin(F.t * 47) * 0.25 * k, 0); head.rotation.z += Math.sin(F.t * 38) * 0.12 * k; } else head.position.set(0, 0, 0);
      if (F.powT > 0) { F.powT -= dt; const k = Math.max(0, F.powT / 0.22); pow.material.opacity = k; pow.scale.setScalar(3.4 * (1.6 - k * 0.6)); if (F.powT <= 0) pow.visible = false; }
    },
    say() {   // booming line (snd.js plays the shipped buffer; MUTE = silent, mouth still mimes it)
      F.spoke++; F.sayAt = performance.now(); F.sayK = 0; F.speaking = true; F.line = 'show';
      const S = window.__skySnd; F.env = (S && S.voiceEnv) || null; if (S && S.voice) S.voice('show');
    }
  };
  return F;
}
