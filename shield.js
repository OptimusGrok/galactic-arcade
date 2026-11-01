// Red energy shield across the hallway doorway (room 1 side). Blocks the monkey and the camera until the player
// pays 10 tickets (UNLOCK in the pop-up). Self-contained: to drop it, remove this file and the setupShield lines in main.js.
import * as THREE from 'three';
export const SHIELD_COST = 10, SHIELD_KEY = 'neonarcade.shieldOpen';
export function setupShield(A) {   // A: { scene, play, st, monkey, HALF, DOOR_W, DOOR_H }
  const { scene, play, monkey, HALF, DOOR_W, DOOR_H } = A;
  const S = { open: false, near: false, touches: 0, unlocks: 0, fails: 0, popShown: false, hum: 0 };
  try { S.open = localStorage.getItem(SHIELD_KEY) === '1'; } catch (e) {}
  const Z = -HALF + 0.035;
  const U = { uT: { value: 0 }, uHit: { value: -9 }, uHitX: { value: new THREE.Vector2(0, 1) }, uOff: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uHit, uOff; uniform vec2 uHitX; varying vec2 vUv;
      float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(0.8660254, 0.5)), p.y); }
      void main(){
        vec2 sz = vec2(${DOOR_W.toFixed(2)}, ${DOOR_H.toFixed(2)}); vec2 p = vUv * sz * 5.0;
        vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h; vec2 g = dot(a, a) < dot(b, b) ? a : b;
        vec2 id = p - g;
        float edgeHex = smoothstep(0.40, 0.48, hexd(g));
        float cellPulse = 0.5 + 0.5 * sin(uT * 1.7 + id.x * 1.3 + id.y * 0.9);
        float ex = min(vUv.x, 1.0 - vUv.x) * sz.x, ey = min(vUv.y, 1.0 - vUv.y) * sz.y, e = min(ex, ey);
        float rim = exp(-e * 22.0) * 2.4 + exp(-e * 5.0) * 0.35;
        float scan = 0.85 + 0.15 * sin(vUv.y * sz.y * 70.0 - uT * 6.0);
        float shimmer = 0.75 + 0.25 * sin(vUv.y * 9.0 + uT * 2.3 + sin(vUv.x * 7.0 - uT * 1.4) * 1.5);
        float dt = uT - uHit, d = distance(vUv * sz, uHitX);
        float ripple = dt < 1.2 ? exp(-abs(d - dt * 3.2) * 6.0) * (1.2 - dt) * 1.6 + exp(-dt * 6.0) * 0.6 : 0.0;
        float k = edgeHex * (0.55 + 0.45 * cellPulse) * 0.55 + 0.07 + rim + ripple;
        k *= scan * shimmer;
        float off = clamp(uOff, 0.0, 1.0);
        float collapse = 1.0 - smoothstep(1.0 - off * 1.05, 1.02 - off * 1.05, vUv.y) ;   // drains from the top
        k *= mix(1.0, (1.0 - off) * collapse + exp(-abs(vUv.y - (1.0 - off)) * 40.0) * (1.0 - off) * 3.0, step(0.001, off));
        gl_FragColor = vec4(vec3(1.0, 0.035, 0.03) * k, 1.0);
      }`,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W - 0.1, DOOR_H - 0.06), mat);
  panel.position.set(0, (DOOR_H - 0.06) / 2, Z); panel.name = 'shield'; panel.renderOrder = 5;
  // faint red glow on the floor in front of the door (a texture-free additive quad, no real light)
  const fmat = new THREE.ShaderMaterial({ uniforms: { uA: { value: 1 }, uT: U.uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA, uT; varying vec2 vUv; void main(){ vec2 q = (vUv - vec2(0.5, 1.0)) * vec2(1.0, 1.6); float f = exp(-dot(q, q) * 5.0) * (0.9 + 0.1 * sin(uT * 3.0)); gl_FragColor = vec4(vec3(1.0, 0.08, 0.05) * f * 0.35 * uA, 1.0); }' });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W + 1.6, 2.2), fmat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.012, Z + 1.1); floor.name = 'shieldFloorGlow'; floor.renderOrder = 4;
  const grp = new THREE.Group(); grp.name = 'shieldGroup'; grp.add(panel, floor); scene.add(grp);
  grp.visible = !S.open;

  // ---- pop-up ----
  const css = document.createElement('style');
  css.textContent = `#shPop{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.85);z-index:7;display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 30px 16px;border-radius:16px;border:3px solid #ff3b3b;background:linear-gradient(#2a0610ee,#120208ee);box-shadow:0 0 24px #ff2a2a99,inset 0 0 18px #ff2a2a44;opacity:0;pointer-events:none;transition:opacity .35s ease,transform .35s ease;user-select:none;-webkit-user-select:none;touch-action:none}
#shPop.on{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}
#shRow{display:flex;align-items:center;gap:14px}
#shIco{width:64px;height:auto;filter:drop-shadow(0 0 8px #ffb000cc)}
#shNum{font:900 clamp(28px,6vw,44px)/1 'Courier New',monospace;letter-spacing:.1em;color:#ffe08a;text-shadow:0 0 12px #ffb000,0 0 3px #fff}
#shSub{font:700 13px 'Courier New',monospace;letter-spacing:.2em;color:#ff9a9a;text-shadow:0 0 6px #ff2a2a}
#shBtn{margin-top:6px;font:900 clamp(18px,4vw,26px)/1 'Courier New',monospace;letter-spacing:.12em;color:#fff;padding:12px 30px 11px;border-radius:12px;border:3px solid #ffb000;background:linear-gradient(#3a2200ee,#1a0e00ee);box-shadow:0 0 16px #ffb00099;text-shadow:0 0 8px #ffb000;cursor:pointer}
#shBtn.need{border-color:#666;color:#aaa;text-shadow:none;box-shadow:none}
#shHint{font:600 11px system-ui;color:#fff8;letter-spacing:.06em}`;
  document.head.appendChild(css);
  const pop = document.createElement('div'); pop.id = 'shPop'; pop.setAttribute('aria-live', 'polite');
  pop.innerHTML = '<div id="shRow"><canvas id="shIco"></canvas><div id="shNum">10 TICKETS</div></div><div id="shSub">TO OPEN THE SHIELD</div><button id="shBtn">UNLOCK · 10 🎟</button><div id="shHint"></div>';
  document.body.appendChild(pop);
  const btn = pop.querySelector('#shBtn'), hint = pop.querySelector('#shHint'), coarse = matchMedia('(pointer:coarse)').matches;
  try { window.TicketArt.toCanvas(pop.querySelector('#shIco'), 64, false); } catch (e) {}
  const swallow = e => e.stopPropagation();
  pop.addEventListener('pointerdown', swallow); pop.addEventListener('touchstart', swallow, { passive: true });
  btn.addEventListener('click', e => { e.stopPropagation(); unlock(); });
  addEventListener('keydown', e => {
    if (!S.popShown || S.open || (play.view && play.view.open) || play.mode !== 'walk') return;
    if (/^(Enter|KeyE|Space)$/.test(e.code)) { e.stopImmediatePropagation(); e.preventDefault(); if (!e.repeat) unlock(); }
  }, true);
  const tickets = () => play.tickets.total;
  function refresh() { const ok = tickets() >= SHIELD_COST; btn.textContent = ok ? 'UNLOCK · 10 🎟' : 'NEED 10 🎟'; btn.classList.toggle('need', !ok);
    hint.textContent = ok ? (coarse ? 'TAP TO UNLOCK' : 'ENTER / E / SPACE') : 'YOU HAVE ' + tickets() + ' 🎟'; }

  // ---- sound ----
  let ac = null; const ctx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  function hum() { S.hum++; try { const c = ctx(), t = c.currentTime, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(62, t); o2.type = 'square'; o2.frequency.setValueAtTime(124.5, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); o2.connect(g); g.connect(c.destination); o.start(t); o2.start(t); o.stop(t + 0.5); o2.stop(t + 0.5); } catch (e) {} }
  function powerDown() { try { const c = ctx(), t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(440, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.1);
    g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1.25); } catch (e) {} }

  let offT = -1;
  function unlock() {
    if (S.open) return false;
    if (tickets() < SHIELD_COST) { S.fails++; refresh(); btn.animate([{ marginLeft: '0' }, { marginLeft: '-12px' }, { marginLeft: '10px' }, { marginLeft: '-6px' }, { marginLeft: '0' }], { duration: 320 }); hum(); return false; }
    play.spend(SHIELD_COST); S.open = true; S.unlocks++; try { localStorage.setItem(SHIELD_KEY, '1'); } catch (e) {}
    powerDown(); offT = performance.now(); pop.classList.remove('on'); S.popShown = false; return true;
  }
  const PAD = 0.04;
  let lastTouch = -9;
  function update(dt) {
    U.uT.value += dt;
    if (offT >= 0) { const k = (performance.now() - offT) / 1100; U.uOff.value = k; fmat.uniforms.uA.value = Math.max(0, 1 - k); if (k >= 1) { grp.visible = false; offT = -1; } }
    if (S.open) { if (S.popShown) { pop.classList.remove('on'); S.popShown = false; } return; }
    const p = monkey.position, inX = Math.abs(p.x) < DOOR_W / 2 + 0.7;
    const near = play.mode === 'walk' && inX && p.z < -HALF + 1.6 && p.z > -HALF;
    if (near !== S.popShown) { S.popShown = near; pop.classList.toggle('on', near); if (near) refresh(); }
    if (near && S.popShown) refresh();
    S.near = near;
  }
  // called from collide() after the walk-area clamp: keep the monkey on room 1's side of the shield
  function block(p, R) {
    if (S.open) return;
    const zMin = Z + R + PAD;
    if (p.z < zMin && p.z > -HALF - 0.5 && Math.abs(p.x) < DOOR_W / 2 + R) {
      p.z = zMin;
      if (U.uT.value - lastTouch > 0.7) { lastTouch = U.uT.value; S.touches++; U.uHit.value = U.uT.value; U.uHitX.value.set(p.x + DOOR_W / 2, 1.0); hum(); }
    }
  }
  function camBlock(q) { if (S.open) return; const zMin = Z + 0.22; if (q.z < zMin && q.z > -HALF - HALL_GUARD && Math.abs(q.x) < DOOR_W / 2 + 0.3) q.z = zMin; }
  const HALL_GUARD = 6;
  Object.assign(S, { update, block, camBlock, unlock, refresh, panel, group: grp, pop, Z });
  S.setOpen = o => { S.open = !!o; try { localStorage.setItem(SHIELD_KEY, o ? '1' : '0'); } catch (e) {} grp.visible = !o; offT = -1; U.uOff.value = o ? 1 : 0; fmat.uniforms.uA.value = o ? 0 : 1; };
  return S;
}
