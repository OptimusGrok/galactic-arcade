// SKY TOWER (t748u): the TITAN — a massive floating cartoon face that greets every climb with a booming
// "Show me what you got". Original design: sunset-orange giant with a teal flame crown, big white eyes,
// heavy brows, round nose, rosy cheeks and a wide toothy mouth. One procedural Three.js group (~40 meshes,
// shared geometries, Lambert), fog-free so it reads at a distance.
// Behaviour: pops in when a real climb starts (never in the lobby / DEMO attract), floats up with the player,
// always turns its head + eyes to the player, weaves around on the camera's right-hand side at a 22-30 m
// standoff (never closer than MIN_D), mouth animates from the voice's loudness envelope. On the win it
// drifts up and away and fades so the space ending stays clear.
import * as THREE from '../vendor/three.module.js';

const SCALE = 5.4, MIN_D = 18, D0 = 27;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function lam(c, o) { return new THREE.MeshLambertMaterial(Object.assign({ color: c, fog: false }, o || {})); }
function add(p, geo, mat, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (sx != null) m.scale.set(sx, sy, sz); p.add(m); return m; }

export function createFace(scene) {
  const root = new THREE.Group(); root.name = 'skyFace'; root.visible = false; scene.add(root);
  const head = new THREE.Group(); head.name = 'skyFaceHead'; root.add(head);   // turns to the player (+Z = face forward)
  const skin = lam(0xff8f3f, { emissive: 0x5a2306 }), skinD = lam(0xe86a22, { emissive: 0x4a1a04 }), white = lam(0xffffff, { emissive: 0x404040 }),
    ink = lam(0x14101c), blue = lam(0x2a6cff, { emissive: 0x0a1a50 }), hair = lam(0x1fd8c8, { emissive: 0x0a5a52 }), hairD = lam(0x0fa79c, { emissive: 0x064038 }),
    cheek = lam(0xff5f86, { emissive: 0x501020, transparent: true, opacity: 0.85 }), mouthIn = lam(0x3a0612), tongue = lam(0xff4d6a, { emissive: 0x401018 }), lip = lam(0xc8401c, { emissive: 0x401004 });
  const sph = new THREE.SphereGeometry(1, 36, 24), sphLo = new THREE.SphereGeometry(1, 18, 12), cone = new THREE.ConeGeometry(1, 1, 10);
  // skull: slightly tall, flattened front-to-back
  add(head, sph, skin, 0, 0, 0, 1, 1.08, 0.94);
  add(head, sphLo, skinD, 0, -0.62, 0.18, 0.78, 0.42, 0.7);                   // chunky chin / jaw shadow
  [-1, 1].forEach(sd => { add(head, sphLo, skin, 1.0 * sd, 0.02, -0.05, 0.2, 0.3, 0.16); add(head, sphLo, skinD, 1.04 * sd, 0.02, 0.0, 0.1, 0.17, 0.08); });   // ears
  // teal flame crown: ring of tilted cones + a tall centre spike
  for (let i = 0; i < 9; i++) { const a = -1.25 + i * (2.5 / 8), h = 0.55 + 0.25 * Math.cos(a * 1.4);
    const c = add(head, cone, i % 2 ? hairD : hair, Math.sin(a) * 0.62, 0.88 + Math.cos(a) * 0.12, -0.18 + Math.cos(a) * 0.1, 0.24, h, 0.24); c.rotation.z = -a * 0.75; c.rotation.x = -0.25; }
  add(head, cone, hair, 0, 1.28, -0.12, 0.26, 0.85, 0.26).rotation.x = -0.18;
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
  head.scale.setScalar(SCALE);
  // a soft glow disc behind it so it pops from the sky, day or night
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const x = gc.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), color: 0xffb070, transparent: true, opacity: 0.22, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(SCALE * 3.4, SCALE * 3.4, 1); glow.position.z = -SCALE * 0.6; root.add(glow);

  const F = {
    root, head, mouth, eyes, on: false, shown: false, t: 0, pop: 0, appearAt: -1, spoke: 0, speakT: -1, speaking: false, open: 0,
    dist: 0, yaw: 0, side: 1, leave: 0, env: null, envDt: 0.03, lookErr: 0, eyeErr: 0, runs: 0,
    SCALE, MIN_D, D0,
    start(ctx) {   // a real climb began
      F.on = true; F.shown = true; root.visible = true; F.t = 0; F.pop = 0; F.leave = 0; F.runs++; F.spoke = 0; F.speakT = -1;
      F.yaw = (ctx && ctx.camYaw) || 0; F.side = 1;
      F.place(ctx, true); F.appearAt = performance.now();
      F.speakT = 0.35;   // after the pop-in
    },
    stop() { F.on = false; F.shown = false; root.visible = false; F.speaking = false; },
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
        if (F.env && i < F.env.length) o = F.env[i]; else if (!F.env && k < 2.6) o = 0.5 + 0.5 * Math.abs(Math.sin(k * 7.5)); else F.speaking = false; }
      F.open += (o - F.open) * (1 - Math.exp(-dt * 22));
      const op = Math.max(0, F.open);
      mouth.scale.set(1 + op * 0.15, 0.55 + op * 1.6, 1); cav.scale.y = 0.18 + op * 0.12; tng.position.y = -0.1 - op * 0.05; teeth.position.y = 0.1 + op * 0.02;
      for (const b of brows) { b.position.y = 0.66 + op * 0.06; b.rotation.z = -(0.28 - op * 0.18) * b.userData.sd; }
    },
    say() {   // booming line (snd.js plays the shipped buffer; MUTE = silent, mouth still mimes it)
      F.spoke++; F.sayAt = performance.now(); F.sayK = 0; F.speaking = true;
      const S = window.__skySnd; F.env = (S && S.voiceEnv) || null; if (S && S.voice) S.voice();
    }
  };
  return F;
}
