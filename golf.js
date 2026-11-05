// GALACTIC GOLF stairs + IN-WORLD mini golf room (t273u, t275u): a stairwell in the prize shop floor, right of the GROK SHOP counter along
// the back wall (Dave's scribble), going down into a neon basement with holes 1-3 of Arcade Helper's Galactic Golf (Strike, Ghost 256,
// Monkey Crossing), built by the original hole builders (golf-world/, made by tools_build_golf_play.py) and played with its ball physics
// by the player's own monkey. A cyan energy shield across the top step costs 5 tickets on every visit (re-armed as you pass it).
// Each hole pays once per visit: 1 stroke +5, 2 +4, 3 +3, 4+ 0. Own file: shop.js is not touched (the floor hole is cut at runtime with
// clipping planes on the shop's floor meshes). golf-play/ (the old full-screen copy) stays in the repo but is no longer opened.
import * as THREE from 'three';
import { buildHole } from './golf-world/holes.js';
import { makeBall, putt as puttBall, stepBall, inBounds, BALL_R, STOP_SPEED, STROKE_CAP } from './golf-world/physics.js';
const buyNote = (item, cost) => { try { window.__announce && window.__announce('buy', { item, cost }); } catch (e) {} };   // purchase broadcast (mp.js)
export const GOLF_COST = 5, GOLF_HOLES = 3;
export const golfPayout = s => (s === 1 ? 5 : s === 2 ? 4 : s === 3 ? 3 : 0);
export function setupGolf({ scene, play, st, monkey, WX, camera }) {
  const X0 = WX + 7.0, X1 = WX + 13.4, Z0 = -3.2, Z1 = -0.45, D = 4.6, FY = -D, CEIL = -0.12, XS = WX + 16.2, NS = 20, ZM = (Z0 + Z1) / 2, RUN = XS - X0;
  const WZ1 = 0.4, BX1 = WX + 36;                       // walkway north edge, basement east wall
  const S = { open: false, below: false, near: false, popShown: false, entries: 0, pays: 0, fails: 0, touches: 0, paid: {}, earned: 0, payouts: [], X0, X1, XS, Z0, Z1, D, FY, CEIL,
    aiming: false, rolling: false, cur: -1, putts: 0 };
  Object.defineProperty(S, 'inWell', { get: () => S.below });
  const grp = new THREE.Group(); grp.name = 'golfStairs'; scene.add(grp);
  // ---- the hole in the floor: every flat shop-floor mesh over the rect gets 4 clip planes (intersection = clip only inside the rect) ----
  const planes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), X0), new THREE.Plane(new THREE.Vector3(1, 0, 0), -X1), new THREE.Plane(new THREE.Vector3(0, 0, -1), Z0 - 0.3), new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z1)];
  const bb = new THREE.Box3(); let lastCut = 0;
  function cutFloor() {
    scene.traverse(o => { if (!o.isMesh || !o.material || o.parent === grp || o.userData.golfNoCut) return; bb.setFromObject(o);
      if (bb.max.y > 0.09 || bb.min.y < -0.05 || bb.max.x < X0 || bb.min.x > X1 || bb.max.z < Z0 || bb.min.z > Z1) return;
      for (const m of [].concat(o.material)) if (m.clippingPlanes !== planes) { m.clippingPlanes = planes; m.clipIntersection = true; m.needsUpdate = true; } });
  }
  
  // ---- stairwell + basement shell ----
  const dark = new THREE.MeshStandardMaterial({ color: 0x120a2a, roughness: 0.6, emissive: 0x08041a }), stepM = new THREE.MeshStandardMaterial({ color: 0x4a3c8c, roughness: 0.4, emissive: 0x241a58 });
  const neonC = new THREE.MeshBasicMaterial({ color: 0x2de8ff, toneMapped: false }), neonM = new THREE.MeshBasicMaterial({ color: 0xff2bd6, toneMapped: false });
  const box = (w, h, d, x, y, z, m, name, parent = grp) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (name) b.name = name; parent.add(b); return b; };
  const ZW = Z1 - Z0, BZ1 = 11.6;
  box(XS - X0, D + 0.3, 0.06, (X0 + XS) / 2, -D / 2 - 0.15, Z1 + 0.03, dark);                 // stair side wall (north)
  box(BX1 - X0, D + 0.3, 0.06, (X0 + BX1) / 2, -D / 2 - 0.15, Z0 - 0.03, dark);               // south wall: stairs + walkway
  box(0.06, D + 0.3, ZW, X0 - 0.03, -D / 2 - 0.15, ZM, dark);
  const sl = RUN / NS;
  for (let i = 0; i < NS; i++) { const top = -(i + 1) * D / NS, h = top - FY + 0.02; box(sl, h, ZW, X0 + (i + 0.5) * sl, FY + h / 2 - 0.02, ZM, stepM, 'golfStep');
    box(0.07, 0.05, ZW, X0 + i * sl + 0.035, top + 0.02, ZM, i % 2 ? neonM : neonC); }
  for (const z of [Z0 + 0.02, Z1 - 0.02]) box(RUN, 0.04, 0.03, (X0 + XS) / 2, -D / 2 + 0.6, z, neonC).rotation.z = -Math.atan2(D, RUN);   // glowing handrails down both walls
  for (const z of [Z1 + 0.02]) { box(X1 - X0, 0.04, 0.04, (X0 + X1) / 2, 0.02, z, neonC); box(X1 - X0, 0.05, 0.05, (X0 + X1) / 2, 1.0, z + 0.05, neonM, 'golfRail');
    for (let k = 0; k <= 6; k++) box(0.05, 1.0, 0.05, X0 + 0.05 + k * (X1 - X0 - 0.1) / 6, 0.5, z + 0.05, neonC); }
  box(0.04, 0.04, ZW, X0, 0.02, ZM, neonM); box(0.06, 0.06, ZW, X1, 0.03, ZM, neonC);
  const room = new THREE.Group(); room.name = 'golfRoom'; grp.add(room);
  const floorM = new THREE.MeshStandardMaterial({ color: 0x0b0818, roughness: 0.25, metalness: 0.6, emissive: 0x05030c });
  box(BX1 - (X1 - 0.2), 0.04, BZ1 - Z0, (X1 - 0.2 + BX1) / 2, FY - 0.02, (Z0 + BZ1) / 2, floorM, 'golfFloor', room);
  box(BX1 - X1, 0.04, BZ1 - Z0, (X1 + BX1) / 2, CEIL + 0.02, (Z0 + BZ1) / 2, dark, 'golfCeiling', room);
  box(0.08, D, BZ1 - Z0, BX1, FY + D / 2, (Z0 + BZ1) / 2, dark, null, room); box(BX1 - XS, D, 0.08, (XS + BX1) / 2, FY + D / 2, BZ1, dark, null, room);
  box(0.08, D, BZ1 - Z1, XS, FY + D / 2, (Z1 + BZ1) / 2, dark, null, room);
  for (const [z, m] of [[Z0 + 0.05, neonC], [WZ1 - 0.1, neonM]]) box(BX1 - XS, 0.04, 0.04, (XS + BX1) / 2, CEIL - 0.06, z, m, null, room);   // ceiling neon over the walkway
  box(BX1 - XS, 0.05, 0.05, (XS + BX1) / 2, FY + 0.03, Z0 + 0.06, neonC, null, room);
  // ---- holes 1-3: the original builders, side by side north of the walkway, open (tee) ends facing it ----
  const ballM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: 0x666666 });
  const NAMES = ['STRIKE', 'GHOST 256', 'MONKEY CROSSING'];
  const holes = []; let hx = XS + 0.6;
  for (let i = 0; i < 3; i++) {
    const H = buildHole(THREE, i), rw = H.halfW * 2 + 0.8, cx = hx + rw / 2, cz = WZ1 + H.halfL + 0.42; hx += rw + 0.1;
    H.group.position.set(cx, FY, cz); room.add(H.group); if (H.door) H.door.visible = false;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.55, 16, 12), ballM); mesh.name = 'golfBall' + (i + 1); room.add(mesh);
    holes.push({ i, H, cx, cz, mesh, ball: makeBall(H.tee.x, H.tee.z), strokes: 0, done: false, name: NAMES[i], par: H.par,
      area: { x0: cx - H.halfW + 0.25, x1: cx + H.halfW - 0.25, z0: WZ1 - 0.6, z1: cz + H.halfL - 0.05 } });
  }
  const lights = [];
  for (const h of holes) { const l = new THREE.PointLight(0xffffff, 7, 11, 1.3); l.position.set(h.cx, FY + 3.2, h.cz); lights.push(l); grp.add(l); }
  { const l = new THREE.PointLight(0xff4fd8, 4, 9, 1.4); l.position.set(XS + 2, FY + 2.6, (Z0 + WZ1) / 2); lights.push(l); grp.add(l); const f2 = new THREE.PointLight(0x7fe8ff, 3, 8, 1.4); f2.position.set(X0 + RUN * 0.5, -1.4, ZM); lights.push(f2); grp.add(f2); }
  const setLights = on => { if (S.lightsOn === on) return; S.lightsOn = on; for (const l of lights) l.visible = on; };
  S.lightsOn = null; setLights(false);
  const toW = (h, x, z) => [h.cx + x, h.cz + z];
  function placeBall(h) { const b = h.ball; h.mesh.visible = !b.sunk; h.mesh.position.set(h.cx + b.x, FY + Math.max(b.y - BALL_R + BALL_R * 1.55, BALL_R * 0.85) + 0.08, h.cz + b.z); }
  function resetHole(h) { h.ball = makeBall(h.H.tee.x, h.H.tee.z); h.strokes = 0; h.done = false; placeBall(h); }
  holes.forEach(resetHole);
  // sign over the top of the stairs
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const doorT = canvasTex(256, 384, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2de8ff'); gr.addColorStop(1, '#ff2bd6'); g.fillStyle = '#0a0620'; g.fillRect(0, 0, w, h);
    g.strokeStyle = gr; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#fff'; g.font = '900 44px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.shadowColor = '#ff2bd6'; g.shadowBlur = 18;
    g.fillText('MINI', w / 2, 150); g.fillText('GOLF', w / 2, 205); g.font = '64px sans-serif'; g.fillText('⛳', w / 2, 300); });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshBasicMaterial({ map: doorT, toneMapped: false })); door.rotation.y = -Math.PI / 2; door.position.set(BX1 - 0.05, FY + 1.6, (Z0 + WZ1) / 2); grp.add(door);
  const lamp = new THREE.PointLight(0xff4fd8, 3, 6, 1.6); lamp.position.set(BX1 - 1.2, FY + 1.6, (Z0 + WZ1) / 2); grp.add(lamp);
  // sign over the top of the stairs
  const signT = canvasTex(512, 160, (g, w, h) => { g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.font = '900 58px Arial Black, Impact, sans-serif'; g.shadowColor = '#2de8ff'; g.shadowBlur = 22;
    g.lineWidth = 6; g.strokeStyle = '#2de8ff'; g.strokeText('MINI GOLF ⬇', w / 2, 72); g.fillStyle = '#fff'; g.fillText('MINI GOLF ⬇', w / 2, 72); g.font = '800 40px Courier New, monospace'; g.fillStyle = '#ffe08a'; g.shadowColor = '#ffb000'; g.fillText('5 🎟 PER VISIT', w / 2, 132); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.81), new THREE.MeshBasicMaterial({ map: signT, transparent: true, depthWrite: false, toneMapped: false })); sign.position.set(X0 + 1.6, 2.9, Z0 + 0.05); sign.name = 'golfSign'; grp.add(sign);
  // ---- the energy shield across the top step (hex field, like room 2's old shield, cyan) ----
  const U = { uT: { value: 0 }, uHit: { value: -9 }, uOff: { value: 0 } }, SH = 2.4;
  const smat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uHit, uOff; varying vec2 vUv;
      float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(0.8660254, 0.5)), p.y); }
      void main(){ vec2 sz = vec2(${ZW.toFixed(2)}, ${SH.toFixed(2)}); vec2 p = vUv * sz * 5.0; vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h; vec2 g = dot(a, a) < dot(b, b) ? a : b; vec2 id = p - g;
        float edgeHex = smoothstep(0.40, 0.48, hexd(g)), pulse = 0.5 + 0.5 * sin(uT * 1.7 + id.x * 1.3 + id.y * 0.9);
        float e = min(min(vUv.x, 1.0 - vUv.x) * sz.x, min(vUv.y, 1.0 - vUv.y) * sz.y), rim = exp(-e * 22.0) * 2.4 + exp(-e * 5.0) * 0.35;
        float dt = uT - uHit, ripple = dt < 1.2 ? exp(-dt * 3.0) * 0.9 : 0.0;
        float k = (edgeHex * (0.55 + 0.45 * pulse) * 0.55 + 0.08 + rim + ripple) * (0.85 + 0.15 * sin(vUv.y * sz.y * 70.0 - uT * 6.0));
        k *= 1.0 - smoothstep(1.0 - uOff * 1.05, 1.02 - uOff * 1.05, vUv.y) * step(0.001, uOff); k *= 1.0 - step(0.999, uOff);
        gl_FragColor = vec4(vec3(0.15, 0.85, 1.0) * k, 1.0); }` });
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(ZW, SH), smat); shield.rotation.y = Math.PI / 2; shield.position.set(X0, SH / 2, ZM); shield.name = 'golfShield'; shield.renderOrder = 5; grp.add(shield);
  // ---- pop-up ----
  const css = document.createElement('style');
  css.textContent = `#gfPop{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.85);z-index:7;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 26px 14px;border-radius:16px;border:3px solid #2de8ff;background:linear-gradient(#061a2aee,#020812ee);box-shadow:0 0 24px #2de8ff99;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;user-select:none;-webkit-user-select:none;touch-action:none;max-width:90vw;text-align:center}
#gfPop.on{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}
#gfT{font:900 clamp(22px,6vw,34px)/1 'Courier New',monospace;letter-spacing:.08em;color:#fff;text-shadow:0 0 12px #2de8ff}
#gfSub{font:700 12px 'Courier New',monospace;letter-spacing:.12em;color:#9af4ff}
#gfBtn{margin-top:4px;font:900 clamp(18px,5vw,24px)/1 'Courier New',monospace;letter-spacing:.1em;color:#fff;padding:12px 26px 11px;border-radius:12px;border:3px solid #ffb000;background:linear-gradient(#3a2200ee,#1a0e00ee);box-shadow:0 0 16px #ffb00099;text-shadow:0 0 8px #ffb000;cursor:pointer}
#gfBtn.need{border-color:#666;color:#aaa;text-shadow:none;box-shadow:none}
#gfHint{font:600 11px system-ui;color:#fffa;letter-spacing:.06em}
#gfPutt{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9;display:none;font:900 18px/1 'Courier New',monospace;letter-spacing:.1em;color:#fff;padding:12px 22px;border-radius:12px;border:3px solid #2de8ff;background:#061a24ee;box-shadow:0 0 14px #2de8ff99;text-shadow:0 0 8px #2de8ff}
#gfHud{position:fixed;left:50%;top:calc(206px + env(safe-area-inset-top));transform:translateX(-50%);z-index:9;display:none;font:800 12px/1.2 'Courier New',monospace;letter-spacing:.1em;color:#fff;padding:6px 12px;border-radius:10px;border:2px solid #ff2bd6;background:#14061ccc;white-space:nowrap;pointer-events:none}
#gfAim{position:fixed;inset:0;z-index:8;display:none;touch-action:none}
#gfAim .b{position:absolute;font:900 15px/1 'Courier New',monospace;color:#fff;padding:11px 14px;border-radius:10px;border:2px solid #2de8ff;background:#061a24dd}
#gfPow{position:absolute;left:14px;top:30%;width:12px;height:40%;border:2px solid #fff8;border-radius:8px;overflow:hidden;background:#0008}#gfPow i{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(0deg,#2de8ff,#ffb000,#ff2bd6)}
#gfTip{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom));transform:translateX(-50%);font:700 12px system-ui;color:#fffc;letter-spacing:.05em;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none}
#gfToast{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:12;font:900 clamp(20px,6vw,30px)/1.15 'Courier New',monospace;color:#fff;text-align:center;text-shadow:0 0 14px #ff2bd6;pointer-events:none;opacity:0;transition:opacity .3s}#gfToast.on{opacity:1}`;
  document.head.appendChild(css);
  const pop = document.createElement('div'); pop.id = 'gfPop';
  pop.innerHTML = '<div id="gfT">⛳ MINI GOLF</div><div id="gfSub">5 TICKETS PER VISIT · HOLE IN ONE +5 · 2 SHOTS +4 · 3 SHOTS +3</div><button id="gfBtn" type="button">PAY 5 🎟</button><div id="gfHint"></div>';
  document.body.appendChild(pop);
  const btn = pop.querySelector('#gfBtn'), hint = pop.querySelector('#gfHint'), coarse = matchMedia('(pointer:coarse)').matches;
  const swallow = e => e.stopPropagation(); pop.addEventListener('pointerdown', swallow); pop.addEventListener('touchstart', swallow, { passive: true });
  btn.addEventListener('click', e => { e.stopPropagation(); unlock(); });
  addEventListener('keydown', e => { if (!S.popShown || S.open || play.mode !== 'walk' || (play.view && play.view.open)) return;
    if (/^(Enter|KeyE|Space)$/.test(e.code)) { e.stopImmediatePropagation(); e.preventDefault(); if (!e.repeat) unlock(); } }, true);
  const tickets = () => play.tickets.total;
  function refresh() { const ok = tickets() >= GOLF_COST; btn.textContent = ok ? 'PAY 5 🎟' : 'NEED 5 🎟'; btn.classList.toggle('need', !ok);
    hint.textContent = ok ? (coarse ? 'TAP TO OPEN THE SHIELD · YOU HAVE ' : 'ENTER / E / SPACE · YOU HAVE ') + tickets() + ' 🎟' : 'NOT ENOUGH TICKETS · YOU HAVE ' + tickets() + ' 🎟'; }
  let ac = null; const ctx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  const tone = (f0, f1, dur, type, vol) => { try { const c = ctx(), t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05); } catch (e) {} };
  let offT = -1;
  function unlock() {
    if (S.open) return true;
    if (tickets() < GOLF_COST) { S.fails++; refresh(); btn.animate([{ marginLeft: '0' }, { marginLeft: '-12px' }, { marginLeft: '10px' }, { marginLeft: '0' }], { duration: 300 }); tone(70, 60, 0.4, 'sawtooth', 0.07); return false; }
    if (!play.spend(GOLF_COST)) return false;
    S.open = true; S.pays++; buyNote('Mini Golf', GOLF_COST); offT = performance.now(); tone(440, 38, 1.1, 'sawtooth', 0.09); pop.classList.remove('on'); S.popShown = false; return true;
  }
  function arm() { S.open = false; offT = -1; U.uOff.value = 0; shield.visible = true; }
  
  // ---- walking: called from main.js collide() (top: shield/railing; below: our own walk areas instead of the shop clamp) ----
  const prev = new THREE.Vector3(); let lastTouch = -9;
  function block(p, R) {
    if (!S.below) {
      if (p.x > X0 - R && p.x < X1 + 1 && p.z < Z1 + R && p.z > Z0 - 1) {
        const fromNorth = prev.z >= Z1 + R - 0.03 && prev.x > X0 - R + 0.03;
        if (fromNorth) p.z = Z1 + R;                                         // railing along the open side
        else if (!S.open) { p.x = X0 - R - 0.02; if (U.uT.value - lastTouch > 0.7) { lastTouch = U.uT.value; S.touches++; U.uHit.value = U.uT.value; tone(62, 55, 0.45, 'sawtooth', 0.06); } }
        else if (p.x > X0 + 0.02) enterVisit();                              // through the shield: it closes behind you (next visit pays again)
      }
    }
    prev.copy(p);
  }
  function enterVisit() { S.below = true; S.entries++; arm(); S.paid = {}; S.visit = (S.visit || 0) + 1; holes.forEach(resetHole); }
  function leaveVisit() { S.below = false; stopAim(); setLights(false); }
  // walkable boxes below: the stairs, the walkway along the south wall, and each hole's green (the monkey walks onto the green to putt)
  const AREAS = [{ x0: X0 - 0.3, x1: XS + 0.3, z0: Z0, z1: Z1 }, { x0: XS - 0.4, x1: BX1 - 0.3, z0: Z0, z1: WZ1 }, ...holes.map(h => h.area)];
  function collideBelow(p, R) {
    if (S.aiming && S.addr) { p.x = S.addr.x; p.z = S.addr.z; prev.copy(p); return; }
    if (p.x < X0 - 0.05) { leaveVisit(); prev.copy(p); return; }            // walked back up and out (the shield is already re-armed)
    for (const a of AREAS) if (p.x >= a.x0 - 1e-6 && p.x <= a.x1 + 1e-6 && p.z >= a.z0 + R - 1e-6 && p.z <= a.z1 - R + 1e-6) { prev.copy(p); return; }
    let best = null, bd = 1e9;
    for (const a of AREAS) { const x = Math.min(Math.max(p.x, a.x0), a.x1), z = Math.min(Math.max(p.z, a.z0 + R), a.z1 - R), d = (x - p.x) ** 2 + (z - p.z) ** 2; if (d < bd) { bd = d; best = [x, z]; } }
    p.x = best[0]; p.z = best[1]; prev.copy(p);
  }
  const holeAt = (x, z) => holes.find(h => x > h.area.x0 && x < h.area.x1 && z > h.cz - h.H.halfL - 0.1 && z < h.area.z1);
  function ground(p) { if (!S.below) return; const h = holeAt(p.x, p.z);
    p.y = p.x < XS ? -D * THREE.MathUtils.clamp((p.x - X0) / RUN, 0, 1) : FY + (h ? 0.08 : 0); }
  function camBlock(q) { if (S.below) return; if (q.x > X0 && q.x < X1 && q.z > Z0 && q.z < Z1 && q.y < 0.3) q.y = 0.3; }
  // keep the follow camera inside the basement (main.js calls this instead of its shop clamp while we are below)
  function camClamp(q) { if (q.x < XS + 0.3 && monkey.position.x < XS + 0.5) { q.z = Math.min(Math.max(q.z, Z0 + 0.15), Z1 - 0.15); q.x = Math.max(q.x, X0 - 0.6); q.y = Math.min(q.y, (q.x < X1 ? 2.4 : CEIL - 0.2)); }
    else { q.x = Math.min(Math.max(q.x, XS + 0.15), BX1 - 0.15); q.z = Math.min(Math.max(q.z, Z0 + 0.15), BZ1 - 0.15); q.y = Math.min(q.y, CEIL - 0.25); }
    q.y = Math.max(q.y, (q.x > X0 && q.x < XS + 0.3 && q.z > Z0 && q.z < Z1 ? -D * Math.min(1, (q.x - X0) / RUN) : FY) + 0.35); }   // never inside a step
  // ---- putting ----
  const ui = document.createElement('div'); ui.innerHTML = '<button id="gfPutt" type="button">⛳ PUTT</button><div id="gfHud"></div><div id="gfToast"></div>' +
    '<div id="gfAim"><div id="gfPow"><i></i></div><div id="gfTip">DRAG BACK FROM ANYWHERE · RELEASE TO PUTT</div><button class="b" id="gfL" style="left:12px;bottom:calc(84px + env(safe-area-inset-bottom))">⟲</button><button class="b" id="gfR" style="right:12px;bottom:calc(84px + env(safe-area-inset-bottom))">⟳</button><button class="b" id="gfW" style="right:12px;top:calc(96px + env(safe-area-inset-top))">✕ WALK</button></div>';
  while (ui.firstChild) document.body.appendChild(ui.firstChild);
  const $ = id => document.getElementById(id), puttBtn = $('gfPutt'), hud = $('gfHud'), aimEl = $('gfAim'), powI = $('gfPow').firstChild, tip = $('gfTip'), toastEl = $('gfToast');
  for (const el of [puttBtn, aimEl]) { el.addEventListener('pointerdown', swallow); el.addEventListener('touchstart', swallow, { passive: true }); }
  puttBtn.addEventListener('click', e => { e.stopPropagation(); const h = nearBall(); if (h) startAim(h); });
  $('gfL').addEventListener('click', e => { e.stopPropagation(); S.camYaw += 0.4; if (!drag) S.aim = S.camYaw; addressBall(); });
  $('gfR').addEventListener('click', e => { e.stopPropagation(); S.camYaw -= 0.4; if (!drag) S.aim = S.camYaw; addressBall(); });
  $('gfW').addEventListener('click', e => { e.stopPropagation(); stopAim(); });
  addEventListener('keydown', e => { if (!S.below || play.mode !== 'walk') return;
    if (!S.aiming && /^(Enter|KeyE)$/.test(e.code) && nearBall()) { e.stopImmediatePropagation(); e.preventDefault(); startAim(nearBall()); }
    else if (S.aiming && e.code === 'Escape') { e.stopImmediatePropagation(); stopAim(); } }, true);
  let toastT = 0; function toast(t) { toastEl.innerHTML = t; toastEl.classList.add('on'); toastT = performance.now() + 2600; }
  // aim line + putter
  const aimLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 1), new THREE.MeshBasicMaterial({ color: 0x2de8ff, toneMapped: false, transparent: true, opacity: 0.85 })); aimLine.visible = false; room.add(aimLine);
  const putter = new THREE.Group(); { const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), new THREE.MeshStandardMaterial({ color: 0xc0c8d8, metalness: 0.8, roughness: 0.3 }));
    shaft.position.y = -0.475; putter.add(shaft); const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xff2bd6, emissive: 0x80104c })); head.position.set(0, -0.95, 0); putter.add(head); }
  putter.visible = false; putter.name = 'golfPutter'; room.add(putter);
  const ballW = h => h.mesh.position;
  function nearBall() { if (!S.below || S.aiming) return null; const p = monkey.position; let best = null, bd = 1.25;
    for (const h of holes) { if (h.ball.sunk) continue; const b = ballW(h), d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = h; } } return best; }
  function addressBall() { const h = holes[S.cur]; if (!h) return; const b = ballW(h), f = S.aim;
    S.addr = { x: b.x - Math.sin(f) * 0.42 - Math.cos(f) * 0.3, z: b.z - Math.cos(f) * 0.42 + Math.sin(f) * 0.3 };
    monkey.position.x = S.addr.x; monkey.position.z = S.addr.z; ground(monkey.position); st.vel.set(0, 0, 0); st.face = f + Math.PI / 2; monkey.rotation.y = st.face; }
  function startAim(h) { S.cur = h.i; S.aiming = true; const b = h.ball; S.aim = S.camYaw = Math.atan2(h.H.cup.x - b.x, h.H.cup.z - b.z); S.camInit = false;
    addressBall(); aimEl.style.display = 'block'; puttBtn.style.display = 'none'; const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false; }
  function stopAim() { if (!S.aiming) return; S.aiming = false; S.addr = null; drag = null; aimEl.style.display = 'none'; aimLine.visible = false; putter.visible = false; powI.style.height = '0'; }
  let drag = null; S.power = 0;
  aimEl.addEventListener('pointerdown', e => { if (e.target !== aimEl || S.rolling) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { aimEl.setPointerCapture(e.pointerId); } catch (_) {} });
  aimEl.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y, L = Math.hypot(dx, dy);
    if (L < 10) { S.power = 0; return; }
    const f = S.camYaw, fx = Math.sin(f), fz = Math.cos(f), rx = -fz, rz = fx, wx = dx * rx - dy * fx, wz = dx * rz - dy * fz;   // drag in world (screen up = camera forward)
    S.aim = Math.atan2(-wx, -wz); S.power = Math.min(1, L / (0.33 * Math.min(innerWidth, innerHeight))); addressBall(); });
  const release = e => { if (!drag || e.pointerId !== drag.id) return; drag = null; if (S.power > 0.03) strike(S.aim, S.power); S.power = 0; };
  aimEl.addEventListener('pointerup', release); aimEl.addEventListener('pointercancel', e => { drag = null; S.power = 0; });
  let swingT = -1;
  function strike(angle, power) { const h = holes[S.cur]; if (!h || h.ball.sunk || S.rolling) return false;
    S.aim = angle; addressBall(); puttBall(h.ball, angle, power); h.strokes++; S.putts++; S.rolling = true; S.last = { x: h.ball.x, z: h.ball.z }; swingT = 0; tone(900, 500, 0.08, 'triangle', 0.08); return true; }
  function finishHole(h, sunk) { h.done = true; const hole = h.i + 1; let n = 0, first = S.paid[hole] == null;
    if (first) { n = sunk ? golfPayout(h.strokes) : 0; S.paid[hole] = n; S.payouts.push({ hole, strokes: h.strokes, n }); if (n) { S.earned += n; play.addTickets(n); } }
    const what = sunk ? (h.strokes === 1 ? 'HOLE IN ONE!' : h.strokes + ' SHOTS') : 'STROKE CAP';
    toast(`HOLE ${hole} · ${what}<br>${first ? (n ? '+' + n + ' 🎟' : 'NO TICKETS') : 'ALREADY PAID THIS VISIT'}`); if (sunk) tone(520, 1040, 0.35, 'sine', 0.1);
    setTimeout(() => { if (S.cur === h.i) stopAim(); if (S.below) { resetHole(h); } }, 1600); }
  function stepHole(h, dt) { const b = h.ball; if (b.sunk) return;
    const r = stepBall(b, h.H.colliders, h.H.ramps, dt, h.H.cup); if (r && r.bounce > 0.6) tone(300, 240, 0.05, 'square', Math.min(0.05, r.bounce * 0.01));
    if (b.sunk || (r && r.sunk)) { b.sunk = true; S.rolling = false; placeBall(h); finishHole(h, true); return; }
    if (!inBounds(b, h.H.bounds)) { h.strokes++; b.x = S.last.x; b.z = S.last.z; b.vx = b.vz = 0; b.moving = false; }   // out: +1, back to the last spot
    const sp = Math.hypot(b.vx, b.vz);
    if (S.rolling && !b.rolling && sp < STOP_SPEED) { b.vx = b.vz = 0; S.rolling = false; if (h.strokes >= STROKE_CAP) finishHole(h, false); else { S.aim = S.camYaw = Math.atan2(h.H.cup.x - b.x, h.H.cup.z - b.z); placeBall(h); addressBall(); } }
    placeBall(h); }
  // test / helper hooks
  function sink() { const h = holes[S.cur]; if (!h || h.ball.sunk) return false; h.ball.sunk = true; S.rolling = false; placeBall(h); finishHole(h, true); return true; }
  function goTee(i) { const h = holes[i], [x, z] = toW(h, h.H.tee.x, h.H.tee.z - 0.6); monkey.position.set(x, FY + 0.08, z); st.vel.set(0, 0, 0); prev.copy(monkey.position); }
  function update(dt) {
    U.uT.value += dt; if (performance.now() - lastCut > 1000) { lastCut = performance.now(); cutFloor(); }
    if (offT >= 0) { const k = (performance.now() - offT) / 900; U.uOff.value = Math.min(1, k); if (k >= 1) { shield.visible = false; offT = -1; } }
    const p = monkey.position, near = !S.open && !S.below && play.mode === 'walk' && p.x > X0 - 1.7 && p.x < X0 + 0.1 && p.z > Z0 && p.z < Z1 + 0.6;
    if (near !== S.popShown) { S.popShown = near; pop.classList.toggle('on', near); }
    if (near) refresh(); S.near = near;
    const cam = camera ? camera.position : p, show = S.below || (cam.x > X0 - 8 && cam.x < BX1 + 2 && cam.z < 6 && cam.z > -6);
    room.visible = show; setLights(S.below || (p.x > X0 - 3 && p.x < X1 && p.z < Z1 + 2));
    if (show) for (const h of holes) for (const m of h.H.movers) m.update(dt);
    if (S.below && S.rolling) { const h = holes[S.cur]; let t = Math.min(dt, 0.05); while (t > 1e-6) { const s = Math.min(t, 1 / 120); stepHole(h, s); t -= s; } }
    const nb = nearBall(); puttBtn.style.display = nb && play.mode === 'walk' ? 'block' : 'none';
    const hh = S.aiming ? holes[S.cur] : (S.below ? holeAt(p.x, p.z) || nb : null);
    hud.style.display = hh ? 'block' : 'none'; if (hh) hud.textContent = `HOLE ${hh.i + 1} · ${hh.name} · PAR ${hh.par} · STROKES ${hh.strokes}` + (S.paid[hh.i + 1] != null ? ' · PAID' : '');
    if (toastT && performance.now() > toastT) { toastT = 0; toastEl.classList.remove('on'); }
    if (S.aiming) { const h = holes[S.cur], b = ballW(h); powI.style.height = (S.power * 100) + '%'; tip.style.display = S.rolling ? 'none' : 'block';
      aimLine.visible = !S.rolling && !h.ball.sunk; const len = 0.4 + S.power * 2.2; aimLine.scale.z = len; aimLine.rotation.y = S.aim;
      aimLine.position.set(b.x + Math.sin(S.aim) * len / 2, FY + 0.1, b.z + Math.cos(S.aim) * len / 2); aimLine.material.color.setHSL(0.52 - S.power * 0.38, 1, 0.55);
      putter.visible = true; const f = S.aim, px = b.x - Math.sin(f) * 0.12 - Math.cos(f) * 0.0, pz = b.z - Math.cos(f) * 0.12;
      let sw = -S.power * 0.6; if (swingT >= 0) { swingT += dt; sw = swingT < 0.12 ? -0.6 + swingT * 8 : 0.35 * Math.max(0, 1 - (swingT - 0.12) * 3); if (swingT > 0.6) swingT = -1; }
      putter.position.set(px - Math.cos(f) * 0.32, FY + 1.02, pz + Math.sin(f) * 0.32); putter.rotation.set(0, f, 0); putter.rotateZ(0.3); putter.rotateX(-sw); }
  }
  // aiming camera: behind the ball looking down the aim view (⟲ ⟳ rotate it); called from main.js frame() after its own camera
  const cT = new THREE.Vector3(), cP = new THREE.Vector3();
  function cam(camera, dt) { if (!S.aiming) return; const h = holes[S.cur], b = ballW(h), f = S.camYaw;
    cP.set(b.x - Math.sin(f) * 2.6, b.y + 1.9, b.z - Math.cos(f) * 2.6); camClamp(cP); cT.set(b.x + Math.sin(f) * 1.6, b.y, b.z + Math.cos(f) * 1.6);
    if (!S.camInit) { camera.position.copy(cP); S.camInit = true; } else camera.position.lerp(cP, 1 - Math.exp(-(dt || 0.016) * 6)); camera.lookAt(cT); }
  function ballSnap() { if (!S.below) return undefined; const h = holes[S.cur]; if (!h || h.ball.sunk || (!S.aiming && !S.rolling)) return undefined; const b = ballW(h); return [Math.round(b.x * 100) / 100, Math.round(b.y * 100) / 100, Math.round(b.z * 100) / 100]; }
  Object.assign(S, { update, block, collideBelow, ground, camBlock, camClamp, cam, unlock, arm, refresh, pop, shield, group: grp, room, holes, payout: golfPayout, entry: { x: X0 - 1.0, z: ZM },
    startAim, stopAim, strike, sink, goTee, nearBall, ballSnap, enterVisit, AREAS });
  cutFloor(); return S;
}
