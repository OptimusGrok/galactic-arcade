// TELEPORTER: brushed-steel pad in room 1's NW corner nook (between STRIKE 0:0 and GHOST 256 1:4) <-> the same pad in the centre
// of a bare white room (same size as room 1, placed far away at x = WX). Near a pad a SHOP / ARCADE button appears; pressing it
// walks the monkey to the pad centre (input locked), the pad powers up (beam rising FROM the pad and fading out - no light from
// the ceiling), he dematerialises into cyan/white pixels from the feet up, flash-cut, then reassembles on the other pad.
import * as THREE from 'three';
export const WX = 80;
// t233 (Dave): 1 s charge-up (the pad's groove rings light one by one), swirling light column + rising sparkles, white flash out /
// materialise in, 'vwoom' charge + arrival zap, a WARP TO menu on the room-1 pad (SHOP / ROOM 2 / LAVA ISLAND), and other players
// see you beam out / in (mp.js: a = 'tpo' | 'tp' | 'tpi'). The pad's resting look is unchanged (charge rings are invisible until used).
export function setupTeleport({ scene, monkey, st, HALF, H, Z2 }) {
  if (Z2 == null) Z2 = -(2 * HALF + 5);
  const ISLE = new THREE.Vector3(-3.25, 0, 4.5), ROOM2 = new THREE.Vector3(0, 0, Z2 + 5);   // lavapaths.js ISLANDS()[0] centre; room 2's doorway spoke
  const DEST = { shop: { label: 'SHOP' }, room2: { label: 'ROOM 2', pos: ROOM2, face: Math.PI }, island: { label: 'LAVA ISLAND', pos: ISLE, face: Math.PI / 2 }, arcade: { label: 'ARCADE' } };
  const PAD1 = new THREE.Vector3(-HALF + 1.25, 0, -HALF + 1.25), PAD2 = new THREE.Vector3(WX, 0, 0), R = 1.2, MH = 2.0;
  // ---- pad (brushed steel, concentric grooves, cyan neon rim) ----
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, '#d4d8de'); gr.addColorStop(1, '#8e949c'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const r = Math.random() * 250; g.strokeStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '40,44,50'},${.05 + Math.random() * .06})`; g.lineWidth = 1; g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }   // brushed
  for (const r of [60, 120, 170, 215, 246]) { g.strokeStyle = '#3d4249'; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); g.strokeStyle = '#eef1f5'; g.lineWidth = 2; g.beginPath(); g.arc(256, 256, r + 4, 0, 7); g.stroke(); }   // grooves
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const topM = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.75, roughness: 0.32, color: 0xffffff }), sideM = new THREE.MeshStandardMaterial({ color: 0x6d737b, metalness: 0.85, roughness: 0.3 });
  const rimM = new THREE.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false });
  function makePad(pos, name) {
    const G = new THREE.Group(); G.name = name; G.position.copy(pos);
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.06, 64), [sideM, topM, sideM]); disk.position.y = 0.03; G.add(disk);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.03, 0.025, 8, 96), rimM); rim.rotation.x = Math.PI / 2; rim.position.y = 0.065; G.add(rim);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 64), rimM); rim2.rotation.x = Math.PI / 2; rim2.position.y = 0.064; G.add(rim2);
    // beam: rises from the pad and fades out as it goes up (alpha gradient), never reaches the ceiling
    const bc = document.createElement('canvas'); bc.width = 4; bc.height = 128; const bg = bc.getContext('2d'), bgr = bg.createLinearGradient(0, 128, 0, 0);
    bgr.addColorStop(0, 'rgba(160,250,255,1)'); bgr.addColorStop(0.3, 'rgba(0,229,255,.35)'); bgr.addColorStop(0.7, 'rgba(0,229,255,.06)'); bgr.addColorStop(1, 'rgba(0,229,255,0)'); bg.fillStyle = bgr; bg.fillRect(0, 0, 4, 128);
    const beamM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.82, R * 0.95, 3.2, 40, 1, true), beamM); beam.position.y = 1.65; beam.visible = false; G.add(beam);
    const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, 0.02, 6, 64), new THREE.MeshBasicMaterial({ color: 0x9ff8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.rotation.x = Math.PI / 2; m.visible = false; G.add(m); return m; });
    // charge-up rings over the pad's grooves (texture radii 60..246 of 256): invisible at rest, so the pad looks the same
    const charge = [60, 120, 170, 215, 246].map(r => { const m = new THREE.Mesh(new THREE.TorusGeometry(r / 256 * R, 0.022, 6, 64), new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.rotation.x = Math.PI / 2; m.position.y = 0.075; m.visible = false; G.add(m); return m; });
    scene.add(G); return { G, beam, rings, charge };
  }
  const pads = [makePad(PAD1, 'teleportPad'), makePad(PAD2, 'teleportPadShop')];
  // ---- white room: same size as room 1, plain white, soft even light (baked corner shadows in the textures) ----
  const W = new THREE.Group(); W.name = 'whiteRoom'; W.position.set(WX, 0, 0); scene.add(W);
  const shade = (w, h, ys) => { const k = document.createElement('canvas'); k.width = k.height = 256; const q = k.getContext('2d'); q.fillStyle = '#ffffff'; q.fillRect(0, 0, 256, 256);
    const e = (x0, y0, x1, y1) => { const l = q.createLinearGradient(x0, y0, x1, y1); l.addColorStop(0, 'rgba(120,124,135,.32)'); l.addColorStop(1, 'rgba(120,124,135,0)'); q.fillStyle = l; q.fillRect(0, 0, 256, 256); };
    e(0, 0, 22, 0); e(256, 0, 234, 0); e(0, 0, 0, 22); e(0, 256, 0, 234); const t = new THREE.CanvasTexture(k); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, color: ys, fog: false }); };
  const S = HALF * 2, pl = (w, h, m, p, r) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(...p); o.rotation.set(...r); W.add(o); return o; };
  pl(S, S, shade(S, S, 0xd6d9de), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  pl(S, S, shade(S, S, 0xe4e6ea), [0, H, 0], [Math.PI / 2, 0, 0]);
  const wm = shade(S, H, 0xdde0e5);
  pl(S, H, wm, [0, H / 2, -HALF], [0, 0, 0]); pl(S, H, wm, [0, H / 2, HALF], [0, Math.PI, 0]); pl(S, H, wm, [-HALF, H / 2, 0], [0, Math.PI / 2, 0]); pl(S, H, wm, [HALF, H / 2, 0], [0, -Math.PI / 2, 0]);
  const wl = new THREE.PointLight(0xffffff, 40, 16, 1.2); wl.position.set(0, 5, 2.5); W.add(wl);
  // ---- pixels ----
  const N = 420, pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), N);
  pm.frustumCulled = false; pm.count = 0; scene.add(pm);
  const P = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), a: new THREE.Vector3(), life: 0, t: 0, s: 1 }));
  const col = new THREE.Color(), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < N; i++) pm.setColorAt(i, col.set(i % 3 ? 0x33eaff : 0xe8ffff));
  // ---- swirling light column (lazy, small pool: local warp + other players' beams) ----
  let swTex = null; const swirls = [];
  function swirl() { let o = swirls.find(w => !w.busy); if (o) return o; if (swirls.length >= 4) return swirls[0];
    if (!swTex) { const k = document.createElement('canvas'); k.width = 128; k.height = 128; const q2 = k.getContext('2d'); q2.clearRect(0, 0, 128, 128);
      for (let i = 0; i < 14; i++) { const x = i * 128 / 14 + Math.random() * 4; q2.strokeStyle = `rgba(${i % 2 ? '190,255,255' : '80,235,255'},${0.35 + Math.random() * 0.5})`; q2.lineWidth = 2 + Math.random() * 4; q2.beginPath(); q2.moveTo(x, 128); q2.lineTo(x + 64, 0); q2.stroke(); q2.beginPath(); q2.moveTo(x - 128, 128); q2.lineTo(x - 64, 0); q2.stroke(); }
      const fade = q2.createLinearGradient(0, 0, 0, 128); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.55, 'rgba(0,0,0,0.25)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      q2.globalCompositeOperation = 'destination-out'; q2.fillStyle = fade; q2.fillRect(0, 0, 128, 128);
      swTex = new THREE.CanvasTexture(k); swTex.wrapS = THREE.RepeatWrapping; swTex.repeat.set(2, 1); }
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 2.7, 32, 1, true), new THREE.MeshBasicMaterial({ map: swTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.visible = false; m.frustumCulled = false; scene.add(m); o = { m, busy: false, k: 0, life: 0, t: 0 }; swirls.push(o); return o; }
  function swirlAt(x, z, life) { const o = swirl(); o.busy = true; o.t = 0; o.life = life; o.m.position.set(x, 1.38, z); o.m.visible = true; return o; }
  function swirlStep(dt) { if (swTex) swTex.offset.x = (swTex.offset.x + dt * 0.9) % 1;
    for (const o of swirls) { if (!o.busy) continue; o.t += dt; const u = o.t / o.life; if (u >= 1) { o.busy = false; o.m.visible = false; continue; }
      o.m.material.opacity = Math.min(1, o.t * 3, (1 - u) * 4) * 0.85; o.m.rotation.y += dt * 2.2; o.m.scale.set(1 - u * 0.15, 0.6 + Math.min(1, o.t * 2.5) * 0.4, 1 - u * 0.15); } }
  // ---- monkey clipping plane (feet-up dissolve / reassembly) ----
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100); let clipOn = false;
  function clip() { if (clipOn) return; clipOn = true; monkey.traverse(o => { if (o.material) for (const m of [].concat(o.material)) { m.clippingPlanes = [plane]; m.needsUpdate = true; } }); }
  // ---- sound (WebAudio; mute.js gates every destination) ----
  function zap(up, vol) { try { if (window.__muted || (window.__mute && window.__mute.on)) return; const ac = window.__unlockAC || (zap.ac ||= new (window.AudioContext || window.webkitAudioContext)()); const t = ac.currentTime;
    const o = ac.createOscillator(), o2 = ac.createOscillator(), gg = ac.createGain(); o.type = 'sawtooth'; o2.type = 'sine';
    o.frequency.setValueAtTime(up ? 180 : 1400, t); o.frequency.exponentialRampToValueAtTime(up ? 1400 : 220, t + 1.6); o2.frequency.setValueAtTime(up ? 600 : 2400, t); o2.frequency.exponentialRampToValueAtTime(up ? 2400 : 500, t + 1.6);
    gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.15); gg.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    o.connect(gg); o2.connect(gg); gg.connect(ac.destination); o.start(t); o2.start(t); o.stop(t + 1.75); o2.stop(t + 1.75); } catch (e) {} }
  function ac0() { if (window.__muted || (window.__mute && window.__mute.on)) return null; return window.__unlockAC || (zap.ac ||= new (window.AudioContext || window.webkitAudioContext)()); }
  function vwoom() { try { const ac = ac0(); if (!ac) return; const t = ac.currentTime, D = 2.6;   // rising charge-up hum through the charge + dematerialise
    const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), gg = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(420, t + D); o2.frequency.setValueAtTime(140, t); o2.frequency.exponentialRampToValueAtTime(1100, t + D);
    f.type = 'lowpass'; f.Q.value = 8; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3200, t + D);
    lfo.frequency.setValueAtTime(5, t); lfo.frequency.linearRampToValueAtTime(22, t + D); lg.gain.value = 0.04; lfo.connect(lg); lg.connect(gg.gain);
    gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.1, t + 0.5); gg.gain.setValueAtTime(0.1, t + D - 0.2); gg.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.1);
    o.connect(f); o2.connect(f); f.connect(gg); gg.connect(ac.destination); for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + D + 0.15); } } catch (e) {} }
  function zapIn() { try { const ac = ac0(); if (!ac) return; const t = ac.currentTime;   // arrival: bright zap + crackle
    const o = ac.createOscillator(), gg = ac.createGain(); o.type = 'square'; o.frequency.setValueAtTime(2200, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.28);
    gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.09, t + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(gg); gg.connect(ac.destination); o.start(t); o.stop(t + 0.34);
    const n = ac.createBufferSource(), b = ac.createBuffer(1, Math.round(ac.sampleRate * 0.25), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    n.buffer = b; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; const ng = ac.createGain(); ng.gain.value = 0.12; n.connect(hp); hp.connect(ng); ng.connect(ac.destination); n.start(t); } catch (e) {} }
  // ---- UI ----
  const css = document.createElement('style'); css.textContent = '#tpBtn{position:fixed;left:50%;bottom:calc(max(22px,env(safe-area-inset-bottom)) + 6px);transform:translateX(-50%);z-index:24;display:none;min-width:150px;height:58px;padding:0 30px;border-radius:29px;border:3px solid #ff3cf0;background:#1a0420e8;color:#ffe6fb;font:900 22px/1 "Courier New",monospace;letter-spacing:.14em;box-shadow:0 0 16px #ff3cf0aa,inset 0 0 12px #ff3cf055;text-shadow:0 0 8px #ff3cf0;cursor:pointer;touch-action:none}#tpBtn.on{display:block}#tpBtn:active{transform:translateX(-50%) scale(.95)}#tpFl{position:fixed;inset:0;z-index:23;background:#fff;opacity:0;pointer-events:none}'
    + '#tpMenu{position:fixed;left:50%;bottom:calc(max(22px,env(safe-area-inset-bottom)) + 74px);transform:translateX(-50%);z-index:24;display:none;flex-direction:column;align-items:center;gap:8px;touch-action:none}#tpMenu.on{display:flex}'
    + '#tpMenu b{font:900 13px/1 "Courier New",monospace;letter-spacing:.3em;color:#9ff8ff;text-shadow:0 0 8px #00e5ff}'
    + '#tpMenu button{min-width:190px;height:46px;padding:0 18px;border-radius:23px;border:3px solid #00e5ff;background:#03141ae8;color:#e6fdff;font:900 17px/1 "Courier New",monospace;letter-spacing:.12em;box-shadow:0 0 12px #00e5ff88;text-shadow:0 0 8px #00e5ff;cursor:pointer;touch-action:none}#tpMenu button:active{transform:scale(.95)}';
  document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'tpBtn'; document.body.appendChild(btn);
  const menu = document.createElement('div'); menu.id = 'tpMenu'; menu.innerHTML = '<b>WARP TO</b><button data-d="island">LAVA ISLAND</button><button data-d="room2">ROOM 2</button>'; document.body.appendChild(menu);
  const fl = document.createElement('div'); fl.id = 'tpFl'; document.body.appendChild(fl);
  const api = { where: 1, state: 'idle', t: 0, near: 0, pads, plane, whiteRoom: W, PAD1, PAD2, R, get locked() { return api.state !== 'idle'; }, go, dest: null, DEST, ISLE, ROOM2, fxAt };
  // back from the shop (Dave t220u 'when the player returns from the shop to the arcade have this view'): on the pad, facing into room 1,
  // camera low + close straight behind him. Pure st values, so the follow camera keeps it until the player moves or drags.
  api.ARRIVE = { face: 0.70, pitch: 0.18, dist: 2.6 };   // tuned in Playwright (phone) against ref/shop_return_view_t220.jpg
  function arrive() { const A = api.ARRIVE; st.face = A.face; monkey.rotation.y = A.face; st.yaw = A.face + Math.PI; st.pitch = A.pitch; st.dist = A.dist; st.vel.set(0, 0, 0); st.speed = 0; st.lookT = st.t; api.arrivals = (api.arrivals || 0) + 1; }
  api.arrive = arrive;
  const stop = e => { e.stopPropagation(); e.preventDefault(); };
  btn.addEventListener('pointerdown', stop); btn.addEventListener('touchstart', stop, { passive: false });
  btn.addEventListener('pointerup', e => { stop(e); go(); }); btn.addEventListener('click', stop);
  for (const b of menu.querySelectorAll('button')) { b.addEventListener('pointerdown', stop); b.addEventListener('touchstart', stop, { passive: false }); b.addEventListener('click', stop); b.addEventListener('pointerup', e => { stop(e); go(b.dataset.d); }); }
  // go(): from room 1 -> 'shop' (default) | 'room2' | 'island'; from the shop always back to the room-1 pad ('arcade')
  function go(dest) { if (api.state !== 'idle') return; api.dest = api.where === 2 ? 'arcade' : (DEST[dest] && dest !== 'arcade' ? dest : 'shop'); api.state = 'walk'; api.t = 0; btn.classList.remove('on'); menu.classList.remove('on'); }
  // other players' beams (mp.js): swirl + sparkles where they stand; out = beaming away, else arriving
  function fxAt(x, z, out) { swirlAt(x, z, out ? 2.8 : 2.0); for (let i = 0; i < 6; i++) emit(10, 2, 0.05, x, z); }
  let lsw = null;
  const from = () => api.where === 1 ? PAD1 : PAD2, to = () => api.dest === 'shop' ? PAD2 : api.dest === 'arcade' ? PAD1 : DEST[api.dest].pos, padOf = w => pads[w - 1];
  let arrPad = null;
  function emit(n, mode, h, cx, cz) {
    for (let k = 0; k < n; k++) { const i = (api.pi = ((api.pi || 0) + 1) % N), o = P[i], a = Math.random() * 6.283, r = 0.08 + Math.random() * 0.3;
      o.life = mode ? 0.55 + Math.random() * 0.35 : 0.9 + Math.random() * 0.7; o.t = 0; o.s = 0.6 + Math.random() * 0.9;
      if (mode === 2) { const rr = 0.25 + Math.random() * 0.85; o.p.set(cx + Math.cos(a) * rr, h + Math.random() * 0.2, cz + Math.sin(a) * rr); o.v.set(0, 0.9 + Math.random() * 1.4, 0); o.life = 0.8 + Math.random() * 0.6; }
      else if (mode === 0) { o.p.set(cx + Math.cos(a) * r, h + (Math.random() - 0.5) * 0.12, cz + Math.sin(a) * r); o.v.set((Math.random() - 0.5) * 0.25, 0.5 + Math.random() * 0.9, (Math.random() - 0.5) * 0.25); }
      else { o.a.set(cx + Math.cos(a) * r, h + (Math.random() - 0.5) * 0.1, cz + Math.sin(a) * r); o.p.set(cx + Math.cos(a) * (r + 0.6 + Math.random() * 0.6), h + 0.3 + Math.random() * 1.2, cz + Math.sin(a) * (r + 0.6 + Math.random() * 0.6)); o.v.set(0, 0, 0); o.mode = 1; }
      o.mode = mode; } }
  function chargeRings(pd, t, k) { pd.charge.forEach((m, j) => { const on = Math.min(1, Math.max(0, (t - j * 0.2) / 0.12)); const o = on * k; m.visible = o > 0.01; m.material.opacity = o * (0.75 + 0.25 * Math.sin(t * 30 + j)); m.scale.setScalar(1 + 0.04 * on * Math.sin(t * 20)); }); }
  function power(pd, k, t) { pd.beam.visible = k > 0.01; pd.beam.material.opacity = k * (0.55 + 0.15 * Math.sin(t * 18));
    pd.rings.forEach((m, j) => { const f = (t * 0.7 + j / 3) % 1; m.visible = k > 0.01; m.position.y = 0.08 + f * 2.4; m.scale.setScalar(1 - f * 0.12); m.material.opacity = k * (1 - f) * 0.9; }); }
  api.update = (dt, canShow) => {
    const pd = from(), mp = monkey.position, d = Math.hypot(mp.x - pd.x, mp.z - pd.z); api.near = d;
    if (api.state === 'idle') { const show = canShow && d < R + 0.35; btn.textContent = api.where === 1 ? 'SHOP' : 'ARCADE'; btn.classList.toggle('on', show); menu.classList.toggle('on', show && api.where === 1); power(padOf(api.where), 0, 0); }
    else {
      dt *= window.__tpTimeScale || 1; api.t += dt; const T = api.t;   // tests may speed the sequence up (slow software GL)
      if (api.state === 'walk') { const k = 1 - Math.exp(-dt * 6); mp.x += (pd.x - mp.x) * k; mp.z += (pd.z - mp.z) * k; st.vel.set(0, 0, 0);
        if (Math.hypot(mp.x - pd.x, mp.z - pd.z) < 0.03 || T > 1.2) { mp.x = pd.x; mp.z = pd.z; api.state = 'charge'; api.t = 0; clip(); vwoom(); lsw = swirlAt(pd.x, pd.z, 1.0 + 1.8 + 0.2); } }
      else if (api.state === 'charge') { const p0 = padOf(api.where); chargeRings(p0, T, 1); power(p0, Math.min(1, T) * 0.35, T); emit(Math.round(dt * 60), 2, 0.05, mp.x, mp.z);   // rings light one by one over ~1 s
        if (T >= 1.0) { api.state = 'demat'; api.t = 0; } }
      else if (api.state === 'demat') { const D = 1.8, f = Math.min(1, T / D), h = -0.05 + f * (MH + 0.1);
        plane.normal.set(0, 1, 0); plane.constant = -h; const p0 = padOf(api.where); power(p0, Math.max(0.35, Math.min(1, T * 3)), T); chargeRings(p0, 9, 1); emit(Math.round(dt * 260), 0, h, mp.x, mp.z); emit(Math.round(dt * 70), 2, 0.05, mp.x, mp.z);
        if (f >= 1) { api.state = 'flash'; api.t = 0; } }
      else if (api.state === 'flash') { const D = 0.35; fl.style.opacity = String(Math.sin(Math.PI * Math.min(1, T / D)));
        if (!api.cut) { power(padOf(api.where), 1 - T / D, T); chargeRings(padOf(api.where), 9, 1 - T / D); }
        if (T > D / 2 && !api.cut) { api.cut = 1; power(padOf(api.where), 0, 0); chargeRings(padOf(api.where), 0, 0); const tp = to(), dd = api.dest, DD = DEST[dd]; mp.set(tp.x, 0, tp.z); api.where = dd === 'shop' ? 2 : 1; arrPad = dd === 'shop' ? pads[1] : dd === 'arcade' ? pads[0] : null; st.camInit = false;
          if (dd === 'arcade') arrive(); else if (DD.pos) { st.face = DD.face; monkey.rotation.y = DD.face; st.yaw = DD.face + Math.PI; st.pitch = 0.3; st.dist = 4.2; st.vel.set(0, 0, 0); st.speed = 0; st.lookT = st.t; }
          swirlAt(tp.x, tp.z, 2.0); plane.normal.set(0, -1, 0); plane.constant = -0.05; }
        if (T >= D) { fl.style.opacity = '0'; api.cut = 0; api.state = 'remat'; api.t = 0; zapIn(); zap(false, 0.05); } }
      else if (api.state === 'remat') { const D = 1.5, f = Math.min(1, T / D), h = -0.05 + f * (MH + 0.1);
        plane.normal.set(0, -1, 0); plane.constant = h; if (arrPad) power(arrPad, Math.min(1, (D + 0.4 - T) * 2), T); if (f < 1) { emit(Math.round(dt * 240), 1, h, mp.x, mp.z); emit(Math.round(dt * 50), 2, 0.05, mp.x, mp.z); }
        if (T >= D + 0.4) { plane.normal.set(0, 1, 0); plane.constant = 100; if (arrPad) power(arrPad, 0, 0); api.state = 'idle'; api.t = 0; api.trips = (api.trips || 0) + 1; } }
    }
    swirlStep(dt);
    // pixels
    let n = 0;
    for (let i = 0; i < N; i++) { const o = P[i]; if (o.t >= o.life) continue; o.t += dt; const u = o.t / o.life;
      if (o.mode !== 1) { o.p.addScaledVector(o.v, dt); o.v.y += dt * 0.6; } else o.p.lerp(o.a, 1 - Math.exp(-dt * 7));
      const s = o.s * (o.mode !== 1 ? 1 - u : 0.4 + u * 0.6) * (o.mode === 2 ? 0.8 + 0.4 * Math.sin(o.t * 40 + i) : 1); q.identity(); M4.compose(o.p, q, sc.set(s, s, s)); pm.setMatrixAt(n, M4); pm.setColorAt(n, col.set(i % 3 ? 0x33eaff : 0xe8ffff)); n++; }
    pm.count = n; pm.instanceMatrix.needsUpdate = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
  };
  api.reset = () => { menu.classList.remove('on'); for (const p of pads) chargeRings(p, 0, 0); if (api.where !== 1) { monkey.position.set(PAD1.x + 1.6, 0, PAD1.z + 1.6); api.where = 1; } api.state = 'idle'; plane.constant = 100; plane.normal.set(0, 1, 0); fl.style.opacity = '0'; };
  return api;
}
