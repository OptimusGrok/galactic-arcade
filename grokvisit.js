// t632u (Dave): Grok teleports into the arcade on the 2nd look at the teleporter-pad corner (or randomly
// after 2-4 min), says hi, plays a random cabinet on "expert" (sped attract + working joystick/buttons),
// then beams out. Once per session. Reuses buildGrokClerk() from shop.js; does NOT edit teleport.js / main.js.
import { buildGrokClerk } from './shop.js';

const HI = "Hi! I'm Grok! Watch this!";
const CHEER = 'Nice!';
const PLAY_S = 50;          // seconds at the cabinet
const LOOK_NEED = 0.5;      // seconds pad must stay near screen centre to count as one look
const LOOK_RAD = 0.42;      // NDC radius from centre that counts as "looking at the pad"
const SCALE = 0.6;

export function setupGrokVisit({ scene, tp, play, monkey, camera, st } = {}) {
  if (window.__grokVisit && window.__grokVisit.ready) return window.__grokVisit;
  const A = () => window.__arcade || {};
  const THREE = (A().THREE) || null;
  if (!THREE || !scene || !tp || !tp.PAD1) { console.warn('grokvisit: missing deps'); return null; }

  const pad = tp.PAD1;
  const built = buildGrokClerk();
  const grok = built.root, arms = built.arms, head = built.head, faceTex = built.faceTex, drawFace = built.drawFace;
  grok.name = 'grokVisitor';
  grok.scale.setScalar(SCALE);
  grok.visible = false;
  grok.position.set(pad.x, 0, pad.z);
  scene.add(grok);

  // Lightweight beam FX (same look as teleport.js / start-screen beam; local only, no teleport.js edit)
  const fx = makeBeam(THREE, scene);
  const tmp = new THREE.Vector3(), ndc = new THREE.Vector3();

  // Voice: same upbeat male TTS path as the shopkeeper (spoken, no bubble). Prefer shared AudioContext.
  let voice = null;
  const pickVoice = () => { try { const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); voice = vs.find(v => /\bmale\b/i.test(v.name) && !/female/i.test(v.name)) || vs.find(v => /david|daniel|alex|guy|james|george|ryan|mark|tom/i.test(v.name)) || vs[0] || null; } catch (e) {} };
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  let talkT = 0, happyT = 0, blinkT = 2, faceState = '', t = 0;
  const muted = () => !!(window.__muted || (window.__mute && window.__mute.on));
  function say(text) {
    talkT = Math.max(1.4, text.length * 0.065); happyT = talkT + 1.2; api.said.push(text);
    if (muted()) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.lang = (voice && voice.lang) || 'en-US'; u.pitch = 0.95; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {}
  }
  function zap() {
    try {
      if (muted()) return;
      const AC = window.AudioContext || window.webkitAudioContext; const ac = window.__unlockAC = window.__unlockAC || new AC();
      if (ac.state !== 'running') return;
      const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(2200, t0); o.frequency.exponentialRampToValueAtTime(110, t0 + 0.28);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.34);
    } catch (e) {}
  }
  function vwoom(D) {
    try {
      if (muted()) return;
      const AC = window.AudioContext || window.webkitAudioContext; const ac = window.__unlockAC = window.__unlockAC || new AC();
      if (ac.state !== 'running') return;
      const t0 = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(420, t0 + D);
      o2.frequency.setValueAtTime(140, t0); o2.frequency.exponentialRampToValueAtTime(1100, t0 + D);
      f.type = 'lowpass'; f.Q.value = 8; f.frequency.setValueAtTime(200, t0); f.frequency.exponentialRampToValueAtTime(3200, t0 + D);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.3); g.gain.setValueAtTime(0.08, t0 + D - 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t0 + D + 0.1);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination); [o, o2].forEach(x => { x.start(t0); x.stop(t0 + D + 0.15); });
    } catch (e) {}
  }

  const api = {
    ready: true, state: 'idle', lookCount: 0, looks: 0, started: 0, finished: 0, said: [],
    cab: null, reason: null, fallAt: 120 + Math.random() * 120, sessT: 0, force: false,
    start(reason = 'debug') { if (api.state !== 'idle' && api.state !== 'done') return false; api.force = true; api.reason = reason; begin(reason); return true; },
    get grok() { return grok; }, get pad() { return pad; },
  };
  window.__grokVisit = api;
  // Test helpers: shorten timings + jump phases (does not affect live play unless start('test') / fast=true)
  api.fast = false;
  api.skipTo = (stName) => {
    if (stName === 'play' && cab) { const s = standAtCab(); grok.position.set(s.x, 0, s.z); grok.rotation.y = s.yaw; grok.scale.setScalar(SCALE); grok.visible = true; bindControls(); api.state = 'play'; phaseT = 0; playDur = api.fast ? 3 : playDur; return true; }
    if (stName === 'leave') { resetControls(); grok.position.set(pad.x, 0, pad.z); grok.visible = true; api.state = 'leave'; phaseT = 0; fx.start(pad.x, pad.z, 'out'); powerPad(1); return true; }
    if (stName === 'done') { resetControls(); grok.visible = false; powerPad(0); fx.stop(); api.state = 'done'; api.finished++; return true; }
    return false;
  };

  // ---- look tracking (wall-clock: phone + slow headless both count real stare time) ----
  let lookStart = 0, leftSince = true, wasLooking = false;
  function padLooking() {
    if (!camera) return false;
    ndc.set(pad.x, 0.55, pad.z).project(camera);
    if (ndc.z > 1 || ndc.z < -1) return false;                       // behind near/far
    const r = Math.hypot(ndc.x, ndc.y);
    const dx = pad.x - camera.position.x, dz = pad.z - camera.position.z;
    const dist = Math.hypot(dx, dz); if (dist < 0.5 || dist > 22) return false;
    return r < LOOK_RAD;
  }

  function busy() {
    try {
      if (document.getElementById('start')) return true;
      if (play && play.mode && play.mode !== 'walk') return true;
      if (tp && tp.where !== 1) return true;
      if (tp && tp.locked) return true;
      if (window.__shop && window.__shop.open) return true;
      if (window.__wardrobe && window.__wardrobe.isOpen) return true;
      if (document.querySelector('#inv.on')) return true;
      if (document.querySelector('#holo.on')) return true;
      if (document.querySelector('#poolOv.on')) return true;
      if (document.querySelector('#demoUI.on')) return true;
      if (st && (st.seated || st.fp)) return true;
    } catch (e) {}
    return false;
  }

  api.simulateLooks = (n) => { api.lookCount = Math.max(0, n | 0); leftSince = true; lookStart = 0; };
  api.isLooking = padLooking;
  api.isBusy = busy;

  function pickCab() {
    const list = (A().featured || []).filter(c => {
      if (!c || !c.getObjectByName) return false;
      if (!c.getObjectByName('joystick')) return false;
      const n = (c.userData && c.userData.name) || c.name || '';
      if (/roadster|claw|deadsignal|dsCab/i.test(n)) return false;
      // stay in room 1 (featured roadster/claw filtered; room2 ds has no joystick usually)
      const f = c.userData && c.userData.front; if (!f) return false;
      if (Math.abs(f.x) > 14 || Math.abs(f.z) > 14) return false;
      return true;
    });
    if (!list.length) return null;
    return list[(Math.random() * list.length) | 0];
  }

  // ---- state machine ----
  let phaseT = 0, from = new THREE.Vector3(), to = new THREE.Vector3(), fromYaw = 0, toYaw = 0;
  let cab = null, joy = null, btns = [], joyBase = null, btnBase = [];
  let playDur = PLAY_S;

  function begin(reason) {
    cab = pickCab();
    if (!cab) { api.state = 'idle'; api.force = false; return; }
    api.cab = cab; api.reason = reason; api.started++; api.state = 'arrive'; phaseT = 0;
    if (api.fast || reason === 'test') playDur = 3;
    grok.position.set(pad.x, 0, pad.z);
    grok.rotation.set(0, Math.atan2(0 - pad.x, 0 - pad.z), 0);   // face into the room
    grok.scale.setScalar(0.01); grok.visible = true;
    fx.start(pad.x, pad.z, 'in');
    try { if (tp.fxAt) tp.fxAt(pad.x, pad.z, false); } catch (e) {}
    powerPad(1); zap();
  }

  function powerPad(k) {
    try {
      const pd = tp.pads && tp.pads[0]; if (!pd) return;
      if (pd.beam) { pd.beam.visible = k > 0.01; pd.beam.material.opacity = k * 0.55; }
    } catch (e) {}
  }

  function walkTo(x, z, yaw, next, dur) {
    from.copy(grok.position); to.set(x, 0, z); fromYaw = grok.rotation.y; toYaw = yaw;
    // shortest yaw lerp
    let d = toYaw - fromYaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; toYaw = fromYaw + d;
    api.state = next; phaseT = 0; api._walkDur = dur || 2.4;
  }

  function standAtCab() {
    const f = cab.userData.front, face = cab.userData.facing || new THREE.Vector3(0, 0, 1);
    // stand a touch behind the play spot so the player can walk up beside/behind him
    const x = f.x - face.x * 0.05, z = f.z - face.z * 0.05;
    const yaw = Math.atan2(face.x, face.z);
    return { x, z, yaw };
  }

  function bindControls() {
    joy = cab.getObjectByName('joystick');
    btns = []; cab.traverse(o => { if (/^btn/i.test(o.name) && o.isMesh) btns.push(o); });
    joyBase = joy ? { x: joy.rotation.x, y: joy.rotation.y, z: joy.rotation.z } : null;
    btnBase = btns.map(b => b.position.y);
  }
  function resetControls() {
    if (joy && joyBase) joy.rotation.set(joyBase.x, joyBase.y, joyBase.z);
    btns.forEach((b, i) => { if (btnBase[i] != null) b.position.y = btnBase[i]; });
    joy = null; btns = []; joyBase = null; btnBase = [];
  }

  function animatePlay(dt) {
    // Grok leans in, arms work the panel
    const L = arms[0], R = arms[1];
    L.sh.rotation.x += (-0.85 - L.sh.rotation.x) * Math.min(1, dt * 5);
    L.sh.rotation.z += ((-0.05) - L.sh.rotation.z) * Math.min(1, dt * 5);
    L.el.rotation.x += (-0.55 + Math.sin(t * 9) * 0.25 - L.el.rotation.x) * Math.min(1, dt * 8);
    R.sh.rotation.x += (-0.55 - R.sh.rotation.x) * Math.min(1, dt * 5);
    R.sh.rotation.z += (0.35 - R.sh.rotation.z) * Math.min(1, dt * 5);
    R.el.rotation.x += (-0.9 - R.el.rotation.x) * Math.min(1, dt * 5);
    R.el.rotation.z = Math.sin(t * 14) * 0.35;   // mash buttons
    // cabinet joystick + buttons (visible "expert" play)
    if (joy) {
      joy.rotation.x = Math.sin(t * 7.5) * 0.55;
      joy.rotation.z = Math.cos(t * 5.5) * 0.45;
    }
    btns.forEach((b, i) => {
      const press = ((Math.sin(t * 11 + i * 1.7) > 0.55) ? 1 : 0);
      const base = btnBase[i] != null ? btnBase[i] : b.position.y;
      b.position.y += ((base - press * 0.012) - b.position.y) * Math.min(1, dt * 18);
    });
    // speed up attract-mode "expert" playback on cabinets that expose tick()
    try {
      if (cab.userData && typeof cab.userData.tick === 'function') {
        cab.userData.tick(t * 2.6);   // ~2.6x attract speed while Grok plays
      }
    } catch (e) {}
    // Strike / Ghost demos keep running via main.js; bump their glow a bit so the screen looks "on"
    try { if (cab.userData.glow) cab.userData.glow.intensity = 1.35 + Math.sin(t * 10) * 0.1; } catch (e) {}
  }

  function idleArms(dt) {
    arms.forEach(a => {
      a.sh.rotation.x += ((-0.1) - a.sh.rotation.x) * Math.min(1, dt * 4);
      a.sh.rotation.z += ((a.sd * 0.14) - a.sh.rotation.z) * Math.min(1, dt * 4);
      a.el.rotation.x += ((-1.0) - a.el.rotation.x) * Math.min(1, dt * 4);
      a.el.rotation.z *= 0.85;
    });
  }

  function tick(dt) {
    t += dt; api.sessT += dt; phaseT += dt;
    // face / blink always when visible
    if (grok.visible) {
      blinkT -= dt; if (blinkT < -0.12) blinkT = 2 + Math.random() * 3;
      talkT = Math.max(0, talkT - dt); happyT = Math.max(0, happyT - dt);
      const talking = talkT > 0, happy = happyT > 0;
      const tk = talking ? [0.15, 0.7, 1, 0.4][(t * 11 | 0) % 4] : 0;
      const fs = (happy ? 'h' : blinkT < 0 ? 'b' : 'o') + tk;
      if (fs !== faceState) { faceState = fs; drawFace(faceTex.g, blinkT < 0, tk, happy); faceTex.t.needsUpdate = true; }
      grok.position.y = (api.state === 'play' || api.state === 'cheer' ? 0 : Math.sin(t * 1.6) * 0.015);
      if (api.state === 'walk' || api.state === 'return') grok.position.y = Math.abs(Math.sin(phaseT * 8)) * 0.04;
    }
    fx.tick(dt);

    if (api.state === 'idle') {
      if (busy()) { lookStart = 0; wasLooking = false; leftSince = true; return; }
      const looking = padLooking();
      const now = performance.now() / 1000;
      if (looking) {
        if (leftSince) {
          if (!lookStart) lookStart = now;
          if (now - lookStart >= LOOK_NEED) { api.lookCount++; api.looks++; leftSince = false; lookStart = 0; }
        }
      } else { leftSince = true; lookStart = 0; }
      wasLooking = looking;
      if (api.lookCount >= 2) { begin('look'); return; }
      // fallback: wall-clock session age (api.fallAt is seconds)
      if ((now - api._t0) >= api.fallAt) { begin('random'); return; }
      return;
    }

    if (api.state === 'arrive') {
      const D = 1.35, k = Math.min(1, phaseT / D);
      grok.scale.setScalar(0.01 + (SCALE - 0.01) * ease(k));
      powerPad(1 - k * 0.7);
      if (k >= 1) {
        grok.scale.setScalar(SCALE); powerPad(0); fx.stop();
        say(HI); api.state = 'greet'; phaseT = 0;
        // wave with right arm
      }
      return;
    }

    if (api.state === 'greet') {
      const wv = arms[1];
      wv.sh.rotation.z += (2.4 - wv.sh.rotation.z) * Math.min(1, dt * 6);
      wv.el.rotation.z = Math.sin(t * 9) * 0.45;
      wv.el.rotation.x += (-0.3 - wv.el.rotation.x) * Math.min(1, dt * 6);
      arms[0].sh.rotation.z += ((-0.14) - arms[0].sh.rotation.z) * Math.min(1, dt * 4);
      if (phaseT > (api.fast || api.reason === 'test' ? 0.6 : 2.2)) {
        idleArms(dt);
        const s = standAtCab();
        walkTo(s.x, s.z, s.yaw, 'walk', api.fast || api.reason === 'test' ? 0.9 : 2.6);
      }
      return;
    }

    if (api.state === 'walk' || api.state === 'return') {
      const D = api._walkDur || 2.4, k = Math.min(1, phaseT / D), e = ease(k);
      grok.position.x = from.x + (to.x - from.x) * e;
      grok.position.z = from.z + (to.z - from.z) * e;
      grok.rotation.y = fromYaw + (toYaw - fromYaw) * e;
      // walk arm swing
      arms[0].sh.rotation.x = Math.sin(phaseT * 7) * 0.35;
      arms[1].sh.rotation.x = Math.sin(phaseT * 7 + Math.PI) * 0.35;
      arms[0].el.rotation.x = -0.7; arms[1].el.rotation.x = -0.7;
      if (k >= 1) {
        if (api.state === 'walk') {
          grok.position.set(to.x, 0, to.z); grok.rotation.y = toYaw;
          bindControls(); playDur = 45 + Math.random() * 15; api.state = 'play'; phaseT = 0;
        } else {
          grok.position.set(pad.x, 0, pad.z);
          api.state = 'leave'; phaseT = 0;
          fx.start(pad.x, pad.z, 'out'); vwoom(1.1);
          try { if (tp.fxAt) tp.fxAt(pad.x, pad.z, true); } catch (e) {}
          powerPad(1);
        }
      }
      return;
    }

    if (api.state === 'play') {
      animatePlay(dt);
      head.rotation.x = -0.12 + Math.sin(t * 2) * 0.03;
      if (phaseT >= playDur) { resetControls(); say(CHEER); api.state = 'cheer'; phaseT = 0; }
      return;
    }

    if (api.state === 'cheer') {
      arms.forEach(a => {
        a.sh.rotation.z += ((a.sd * 0.2) - a.sh.rotation.z) * Math.min(1, dt * 5);
        a.sh.rotation.x += (-2.2 - a.sh.rotation.x) * Math.min(1, dt * 5);
        a.el.rotation.x += (-0.2 - a.el.rotation.x) * Math.min(1, dt * 5);
      });
      if (phaseT > (api.fast || api.reason === 'test' ? 0.4 : 1.6)) {
        idleArms(dt);
        walkTo(pad.x, pad.z, Math.atan2(0 - pad.x, 0 - pad.z), 'return', api.fast || api.reason === 'test' ? 0.9 : 2.6);
      }
      return;
    }

    if (api.state === 'leave') {
      const D = 1.2, k = Math.min(1, phaseT / D);
      grok.scale.setScalar(SCALE * (1 - k) + 0.01 * k);
      powerPad(Math.max(0.2, 1 - k));
      if (k >= 1) {
        grok.visible = false; grok.scale.setScalar(SCALE); powerPad(0); fx.stop();
        resetControls(); api.state = 'done'; api.finished++; api.force = false;
      }
      return;
    }
  }

  // Hook into shop.update so we ride main.js's rAF with no Arcade edit
  const S = window.__shop;
  if (S && typeof S.update === 'function') {
    const prev = S.update;
    S.update = (dt) => { try { prev(dt); } catch (e) {} try { tick(dt); } catch (e) { if (!api._err) { api._err = 1; console.warn('grokvisit', e); } } };
  } else {
    // fallback: own rAF (shop not ready yet - shouldn't happen since we load from setupShop)
    let last = performance.now();
    const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; try { tick(dt); } catch (e) {} };
    requestAnimationFrame(loop);
  }

  return api;
}

function ease(k) { return k * k * (3 - 2 * k); }

function makeBeam(THREE, scene) {
  const g = new THREE.Group(); g.name = 'grokVisitBeam'; g.visible = false; scene.add(g);
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const q = c.getContext('2d');
  for (let i = 0; i < 10; i++) {
    const x = i * 64 / 10; q.strokeStyle = 'rgba(' + (i % 2 ? '190,255,255' : '80,235,255') + ',' + (0.35 + Math.random() * 0.5) + ')';
    q.lineWidth = 2 + Math.random() * 3; q.beginPath(); q.moveTo(x, 128); q.lineTo(x + 32, 0); q.stroke();
  }
  const fd = q.createLinearGradient(0, 0, 0, 128); fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(0.55, 'rgba(0,0,0,0.25)'); fd.addColorStop(1, 'rgba(0,0,0,0)');
  q.globalCompositeOperation = 'destination-out'; q.fillStyle = fd; q.fillRect(0, 0, 64, 128);
  const tx = new THREE.CanvasTexture(c); tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(2, 1);
  const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2.2, 24, 1, true),
    new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  sw.position.y = 1.1; g.add(sw);
  const rings = [0.28, 0.42, 0.58].map(r => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = Math.PI / 2; m.position.y = 0.03; g.add(m); return m;
  });
  const N = 48, pos = new Float32Array(N * 3), bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0x9ff8ff, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  pts.frustumCulled = false; g.add(pts);
  const P = []; for (let i = 0; i < N; i++) P.push({ x: 0, y: -9, z: 0, vy: 0, l: 0, t: 1 });
  let on = false, mode = 'in', t = 0, pi = 0;
  function emit(n, h) {
    for (let k = 0; k < n; k++) {
      const o = P[pi = (pi + 1) % P.length], a = Math.random() * 6.283, r = 0.12 + Math.random() * 0.45;
      o.x = Math.cos(a) * r; o.z = Math.sin(a) * r; o.y = h + (Math.random() - 0.5) * 0.12; o.vy = 0.7 + Math.random() * 1.1; o.l = 0.55 + Math.random() * 0.45; o.t = 0;
    }
  }
  return {
    start(x, z, m) { g.position.set(x, 0, z); g.visible = true; on = true; mode = m; t = 0; sw.material.opacity = 0; },
    stop() { on = false; g.visible = false; sw.material.opacity = 0; rings.forEach(r => { r.material.opacity = 0; }); },
    tick(dt) {
      if (!on) return; t += dt; tx.offset.x = (tx.offset.x + dt * 0.9) % 1; sw.rotation.y += dt * 2.2;
      const op = Math.min(1, t * 3, Math.max(0, (1.6 - t) * 2)) * 0.8;
      sw.material.opacity = op;
      rings.forEach((m, j) => { const o = Math.min(1, Math.max(0, (t - j * 0.08) / 0.1)) * (mode === 'out' || t < 1.2 ? 1 : Math.max(0, 1.5 - t)); m.material.opacity = o * (0.7 + 0.3 * Math.sin(t * 28 + j)); });
      emit(Math.round(dt * 90), Math.min(2.0, t * 1.4));
      let any = false; for (let i = 0; i < P.length; i++) { const o = P[i]; if (o.t < o.l) { o.t += dt; o.y += o.vy * dt; any = true; } else o.y = -9; pos[i * 3] = o.x; pos[i * 3 + 1] = o.y; pos[i * 3 + 2] = o.z; }
      pts.geometry.attributes.position.needsUpdate = true; pts.visible = any;
    },
  };
}
