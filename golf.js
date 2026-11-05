// GALACTIC GOLF stairs (t273u): a stairwell in the prize shop floor, right of the GROK SHOP counter along the back wall (Dave's scribble),
// going down to the mini golf. A cyan energy shield across the top step blocks it; walking up to it offers PAY 5 🎟 and every trip down
// costs 5 again (the shield re-arms once you are on the stairs). Near the bottom the full-screen golf copy (golf-play/, first 3 holes)
// opens; each hole pays 1 stroke = 5 tickets, 2 = 4, 3 = 3, 4+ = 0 into the arcade's ticket count. Own file: shop.js is not touched
// (the floor hole is cut at runtime with clipping planes on the shop's floor meshes).
import * as THREE from 'three';
export const GOLF_COST = 5, GOLF_HOLES = 3;
export const golfPayout = s => (s === 1 ? 5 : s === 2 ? 4 : s === 3 ? 3 : 0);
export function setupGolf({ scene, play, st, monkey, WX, pause }) {
  const X0 = WX + 7.0, X1 = WX + 13.4, Z0 = -3.2, Z1 = -0.45, D = 2.8, NS = 12, ZM = (Z0 + Z1) / 2, RUN = X1 - 0.5 - X0;
  const S = { open: false, inWell: false, near: false, popShown: false, entries: 0, pays: 0, fails: 0, touches: 0, game: false, paid: {}, earned: 0, payouts: [], frame: null, X0, X1, Z0, Z1, D };
  const grp = new THREE.Group(); grp.name = 'golfStairs'; scene.add(grp);
  // ---- the hole in the floor: every flat shop-floor mesh over the rect gets 4 clip planes (intersection = clip only inside the rect) ----
  const planes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), X0), new THREE.Plane(new THREE.Vector3(1, 0, 0), -X1), new THREE.Plane(new THREE.Vector3(0, 0, -1), Z0 - 0.3), new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z1)];
  const bb = new THREE.Box3(); let lastCut = 0;
  function cutFloor() {
    scene.traverse(o => { if (!o.isMesh || !o.material || o.parent === grp || o.userData.golfNoCut) return; bb.setFromObject(o);
      if (bb.max.y > 0.09 || bb.min.y < -0.05 || bb.max.x < X0 || bb.min.x > X1 || bb.max.z < Z0 || bb.min.z > Z1) return;
      for (const m of [].concat(o.material)) if (m.clippingPlanes !== planes) { m.clippingPlanes = planes; m.clipIntersection = true; m.needsUpdate = true; } });
  }
  // ---- well: walls, steps, neon edges, bottom doorway ----
  const dark = new THREE.MeshStandardMaterial({ color: 0x120a2a, roughness: 0.6, emissive: 0x08041a }), stepM = new THREE.MeshStandardMaterial({ color: 0x4a3c8c, roughness: 0.4, emissive: 0x241a58 });
  const neonC = new THREE.MeshBasicMaterial({ color: 0x2de8ff, toneMapped: false }), neonM = new THREE.MeshBasicMaterial({ color: 0xff2bd6, toneMapped: false });
  const box = (w, h, d, x, y, z, m, name) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (name) b.name = name; grp.add(b); return b; };
  const W = X1 - X0, ZW = Z1 - Z0;
  box(W, D + 0.4, 0.06, (X0 + X1) / 2, -D / 2 - 0.2, Z0 - 0.03, dark); box(W, D + 0.4, 0.06, (X0 + X1) / 2, -D / 2 - 0.2, Z1 + 0.03, dark);
  box(0.06, D + 0.4, ZW, X1 + 0.03, -D / 2 - 0.2, ZM, dark); box(0.06, D + 0.4, ZW, X0 - 0.03, -D / 2 - 0.2, ZM, dark);
  box(W, 0.06, ZW, (X0 + X1) / 2, -D - 0.4, ZM, dark);
  const sl = RUN / NS;
  for (let i = 0; i < NS; i++) { const y = -(i + 1) * D / NS; box(sl, 0.12, ZW, X0 + (i + 0.5) * sl, y - 0.06, ZM, stepM, 'golfStep');
    box(0.07, 0.05, ZW, X0 + i * sl + 0.035, y + 0.02, ZM, i % 2 ? neonM : neonC); }
  for (const z of [Z0 + 0.02, Z1 - 0.02]) for (let i = 0; i < NS; i++) box(sl, 0.04, 0.03, X0 + (i + 0.5) * sl, -(i + 1) * D / NS + 0.35, z, neonC);   // handrail glow strips down both walls
  const fill = new THREE.PointLight(0x7fe8ff, 2.5, 7, 1.4); fill.position.set(X0 + RUN * 0.45, -0.6, ZM); grp.add(fill);
  box(X1 - (X0 + RUN), 0.12, ZW, X0 + RUN + (X1 - X0 - RUN) / 2, -D - 0.06, ZM, stepM);
  for (const z of [Z1 + 0.02]) { box(W, 0.04, 0.04, (X0 + X1) / 2, 0.02, z, neonC); box(W, 0.05, 0.05, (X0 + X1) / 2, 1.0, z + 0.05, neonM, 'golfRail');
    for (let k = 0; k <= 6; k++) box(0.05, 1.0, 0.05, X0 + 0.05 + k * (W - 0.1) / 6, 0.5, z + 0.05, neonC); }
  box(0.04, 0.04, ZW, X0, 0.02, ZM, neonM);
  // glowing GALACTIC GOLF door at the bottom
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const doorT = canvasTex(256, 384, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2de8ff'); gr.addColorStop(1, '#ff2bd6'); g.fillStyle = '#0a0620'; g.fillRect(0, 0, w, h);
    g.strokeStyle = gr; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#fff'; g.font = '900 44px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.shadowColor = '#ff2bd6'; g.shadowBlur = 18;
    g.fillText('MINI', w / 2, 150); g.fillText('GOLF', w / 2, 205); g.font = '64px sans-serif'; g.fillText('⛳', w / 2, 300); });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshBasicMaterial({ map: doorT, toneMapped: false })); door.rotation.y = -Math.PI / 2; door.position.set(X1 - 0.01, -D + 1.05, ZM); grp.add(door);
  const lamp = new THREE.PointLight(0xff4fd8, 3, 6, 1.6); lamp.position.set(X1 - 1.2, -D + 1.6, ZM); grp.add(lamp);
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
#golfFrame{position:fixed;inset:0;width:100%;height:100%;border:0;z-index:40;background:#080814;opacity:0;transition:opacity .4s}#golfFrame.on{opacity:1}`;
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
    S.open = true; S.pays++; offT = performance.now(); tone(440, 38, 1.1, 'sawtooth', 0.09); pop.classList.remove('on'); S.popShown = false; return true;
  }
  function arm() { S.open = false; offT = -1; U.uOff.value = 0; shield.visible = true; }
  // ---- walking: called from main.js collide() after the room clamp ----
  const prev = new THREE.Vector3(); let lastTouch = -9;
  function block(p, R) {
    if (!S.inWell) {
      if (p.x > X0 - R && p.x < X1 + 1 && p.z < Z1 + R && p.z > Z0 - 1) {
        const fromNorth = prev.z >= Z1 + R - 0.03 && prev.x > X0 - R + 0.03;
        if (fromNorth) p.z = Z1 + R;                                         // railing along the open side
        else if (!S.open) { p.x = X0 - R - 0.02; if (U.uT.value - lastTouch > 0.7) { lastTouch = U.uT.value; S.touches++; U.uHit.value = U.uT.value; tone(62, 55, 0.45, 'sawtooth', 0.06); } }
        else if (p.x > X0 + 0.02) { S.inWell = true; S.entries++; arm(); }  // through the shield: it closes behind you (next visit pays again)
      }
    } else {
      if (p.x < X0 - 0.05) S.inWell = false;                               // walked back up and out
      else { p.z = Math.min(Math.max(p.z, Z0 + R), Z1 - R); p.x = Math.min(p.x, X1 - R); }
    }
    prev.copy(p);
  }
  function ground(p) { if (!S.inWell) return; p.y = -D * THREE.MathUtils.clamp((p.x - X0) / RUN, 0, 1);
    if (!S.game && p.y < -D * 0.6) launch(); }
  function camBlock(q) { if (S.inWell || S.game) return; if (q.x > X0 && q.x < X1 && q.z > Z0 && q.z < Z1 && q.y < 0.3) q.y = 0.3; }
  // ---- the golf copy ----
  function launch() {
    if (S.game) return; S.game = true; S.paid = {}; S.session = (S.session || 0) + 1;
    const f = S.frame = document.createElement('iframe'); f.id = 'golfFrame'; f.src = 'golf-play/index.html'; f.allow = 'autoplay; fullscreen'; f.title = 'Galactic Golf';
    document.body.appendChild(f); const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false;
    f.addEventListener('load', () => { f.classList.add('on'); try { f.contentWindow.focus(); } catch (e) {} if (pause) pause(true); }, { once: true });
  }
  function exitGolf() {
    if (!S.game) return; S.game = false; const f = S.frame; S.frame = null; if (pause) pause(false);
    if (f) { f.classList.remove('on'); setTimeout(() => f.remove(), 450); }
    S.inWell = false; arm(); monkey.position.set(X0 - 1.0, 0, ZM); st.vel.set(0, 0, 0); st.face = st.yaw = -Math.PI / 2; prev.copy(monkey.position); window.focus();
  }
  window.__golfArcadePay = (strokes, hole) => {
    if (!S.game) return 0; hole = hole | 0; if (hole < 1 || hole > GOLF_HOLES || S.paid[hole] != null) return S.paid[hole] || 0;
    const n = golfPayout(strokes | 0); S.paid[hole] = n; S.payouts.push({ hole, strokes, n }); if (n) { S.earned += n; play.addTickets(n); } return n; };
  window.__golfArcadeExit = exitGolf;
  function update(dt) {
    U.uT.value += dt; if (performance.now() - lastCut > 1000) { lastCut = performance.now(); cutFloor(); }
    if (offT >= 0) { const k = (performance.now() - offT) / 900; U.uOff.value = Math.min(1, k); if (k >= 1) { shield.visible = false; offT = -1; } }
    const p = monkey.position, near = !S.open && !S.game && play.mode === 'walk' && p.x > X0 - 1.7 && p.x < X0 + 0.1 && p.z > Z0 && p.z < Z1 + 0.6;
    if (near !== S.popShown) { S.popShown = near; pop.classList.toggle('on', near); }
    if (near) refresh(); S.near = near;
  }
  Object.assign(S, { update, block, ground, camBlock, unlock, arm, launch, exit: exitGolf, refresh, pop, shield, group: grp, payout: golfPayout, entry: { x: X0 - 1.0, z: ZM } });
  cutFloor(); return S;
}
