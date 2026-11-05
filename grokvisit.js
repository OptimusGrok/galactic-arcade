// t635u/t639u/t641u (Dave): light-grey Grok, natural walk+look, hands on controls, centred WATCH,
// SHOP+CHAT near him, male voice 1 clips, WATCH overlay. Lazy from shop.js; no Arcade edits.
import { buildGrokClerk } from './shop.js';

const HI = "Hi! I'm Grok! Watch this!";
const CHEER = 'Nice!';
const PLAY_S = 50;
const LOOK_NEED = 0.5;
const LOOK_RAD = 0.42;
const SCALE = 0.95;   // near human height so arms reach stick+buttons
const NEAR_R = 1.85;
const WALK_SPD = 1.05;          // m/s calm walk
const LOOK_AROUND_S = 3.4;

const REMARKS = [
  'Ooh, close one!', "This one's my favourite!", 'Watch the combo!', 'Easy peasy!',
  "Ha! Got them!", "Don't blink!", 'Expert mode engaged!', 'Tickets incoming!',
  'Smooth moves!', 'I could do this all day!',
];
const IDLE_LINES = [
  'Come say hi!', 'Wanna chat?', "The prize shop's open anytime!", 'Pull up a cabinet and watch!',
];
const CHAT = [
  { id: 'c_what', q: 'What is Galactic Arcade?',
    a: 'Galactic Arcade is a neon arcade you walk around in. Grab tickets from the cabinets, then teleport to my prize shop!' },
  { id: 'c_tickets', q: 'How do tickets work?',
    a: 'Most games cost 5 tickets for one credit. The claw machine is just 1 ticket a drop. Win games to earn more tickets!' },
  { id: 'c_shop', q: "What's in the prize shop?",
    a: 'My prize shop has big plushies, toys, boxed sets and lollies. Spend tickets at the hologram counter. Accessories cost 1 or 5 tickets on the wall!' },
  { id: 'c_games', q: 'Tell me about the games',
    a: "We've got Strike, Ghost 256, Berserker, Monkey Crossing, Orc Attack, Cybercity, Blaster, Super Pip Quest, Burrow Buster, Nova Tether, Mars Roadster, the claw machine, and Dead Signal next door!" },
  { id: 'c_fav', q: "What's your favourite?",
    a: 'Hard to pick! I love Strike for the action, and Monkey Crossing when I want to hop. Ghost 256 is a classic too!' },
  { id: 'c_acc', q: 'How do accessories work?',
    a: 'On the Accessories wall you buy hats, hoodies, fur colours, shoes, glasses and backs. Free starter picks are on the start screen; the rest need tickets!' },
  { id: 'c_pool', q: "What's 8-Ball Pool?",
    a: 'There are two 8-Ball Pool tables in my shop. Walk up and tap Play Pool. Have a break from the cabinets!' },
  { id: 'c_tips', q: 'Any tips?',
    a: 'Face a cabinet until PLAY shows, spend tickets for credit, then dive in. Look at the teleporter pad twice and I might pop in to play!' },
];

const CLIP = {
  hi: 'hi', cheer: 'cheer',
  r01: 'r01', r02: 'r02', r03: 'r03', r04: 'r04', r05: 'r05',
  r06: 'r06', r07: 'r07', r08: 'r08', r09: 'r09', r10: 'r10',
  idle01: 'idle01', idle02: 'idle02', idle03: 'idle03', idle04: 'idle04',
};
const REMARK_CLIPS = ['r01','r02','r03','r04','r05','r06','r07','r08','r09','r10'];
const IDLE_CLIPS = ['idle01','idle02','idle03','idle04'];

function clipUrl(id) {
  try { return new URL('./sfx/grok/' + id + '.mp3', import.meta.url).href; }
  catch (e) { return 'sfx/grok/' + id + '.mp3'; }
}

export function setupGrokVisit({ scene, tp, play, monkey, camera, st } = {}) {
  if (window.__grokVisit && window.__grokVisit.ready) return window.__grokVisit;
  const A = () => window.__arcade || {};
  const THREE = (A().THREE) || null;
  if (!THREE || !scene || !tp || !tp.PAD1) { console.warn('grokvisit: missing deps'); return null; }

  const pad = tp.PAD1;
  const built = buildGrokClerk();
  const grok = built.root, arms = built.arms, legs = built.legs || [], head = built.head, faceTex = built.faceTex, drawFace = built.drawFace;
  grok.name = 'grokVisitor';
  grok.scale.setScalar(SCALE);
  grok.visible = false;
  grok.position.set(pad.x, 0, pad.z);
  scene.add(grok);

  // blocky dark-grey robot hands — parented to joystick / buttons so they sit ON the controls
  const mkPalm = (side) => {
    const g = new THREE.Group(); g.name = 'gvPalm'; g.visible = false;
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.32, metalness: 0.2, emissive: 0x3a3d42, emissiveIntensity: 0.12 });
    const matD = new THREE.MeshStandardMaterial({ color: 0x8a8e96, roughness: 0.42, metalness: 0.18, emissive: 0x1a1c20, emissiveIntensity: 0.08 });
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.11), mat); palm.position.set(0, 0, 0); g.add(palm);
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.055), matD);
      f.position.set((i - 1) * 0.028, 0.01, -0.07); g.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.04), matD);
    thumb.position.set(side * 0.055, 0.008, -0.02); thumb.rotation.y = side * 0.6; g.add(thumb);
    g.scale.setScalar(1.15); return g;
  };
  const palmL = mkPalm(-1), palmR = mkPalm(1);
  scene.add(palmL); scene.add(palmR);

  const fx = makeBeam(THREE, scene);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), ndc = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();

  // ---- voice (male 1 = GuyNeural clips via shared AudioContext; TTS fallback) ----
  const bufs = {};
  let playingSrc = null, talkT = 0, happyT = 0, blinkT = 2, faceState = '', t = 0;
  let voice = null;
  const pickVoice = () => { try { const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); voice = vs.find(v => /guy/i.test(v.name)) || vs.find(v => /\bmale\b/i.test(v.name) && !/female/i.test(v.name)) || vs[0] || null; } catch (e) {} };
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  const muted = () => !!(window.__muted || (window.__mute && window.__mute.on));
  const actx = () => { try { const AC = window.AudioContext || window.webkitAudioContext; return window.__unlockAC = window.__unlockAC || new AC(); } catch (e) { return null; } };
  function loadClip(id) {
    if (bufs[id] || bufs[id] === false) return;
    bufs[id] = null;
    const ac = actx(); if (!ac) return;
    fetch(clipUrl(id)).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
      .then(buf => { bufs[id] = buf; }).catch(() => { bufs[id] = false; });
  }
  function warmClips() { ['hi','cheer', ...REMARK_CLIPS, ...IDLE_CLIPS, ...CHAT.map(c => c.id)].forEach(loadClip); }
  warmClips();
  function stopVoice() {
    try { if (playingSrc) { playingSrc.stop(); } } catch (e) {}
    playingSrc = null;
    try { speechSynthesis.cancel(); } catch (e) {}
  }
  function playBuf(buf, ac) {
    const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.start();
    playingSrc = src; talkT = Math.max(talkT, buf.duration); happyT = talkT + 1.0;
    src.onended = () => { if (playingSrc === src) playingSrc = null; };
    api.voice = 'webaudio';
  }
  function playClipEl(clipId) {
    const a = new Audio(clipUrl(clipId)); a.preload = 'auto';
    const go = () => {
      try { a.currentTime = 0; } catch (e) {}
      return Promise.resolve(a.play()).then(() => {
        api.voice = 'clip'; talkT = Math.max(talkT, a.duration || talkT); happyT = talkT + 1.0;
      });
    };
    return go().catch(() => new Promise((res, rej) => {
      a.addEventListener('canplaythrough', () => go().then(res, rej), { once: true });
      try { a.load(); } catch (e) {}
      setTimeout(() => go().then(res, rej), 700);
    }));
  }
  function say(text, clipId) {
    talkT = Math.max(1.2, text.length * 0.055); happyT = talkT + 1.0; api.said.push(text);
    if (muted()) return;
    stopVoice();
    const ac = actx();
    try { if (ac && ac.state !== 'running') ac.resume(); } catch (e) {}
    // t639u: when a GuyNeural clip id is given, ALWAYS use that clip — never fall back to a different TTS voice
    if (clipId) {
      loadClip(clipId);
      const buf = bufs[clipId];
      if (buf && buf !== false && ac) {
        try { playBuf(buf, ac); return; } catch (e) {}
      }
      // buffer still loading — wait briefly then play clip (Audio element), never TTS
      if (buf == null) {
        let tries = 0;
        const wait = () => {
          tries++;
          const b = bufs[clipId];
          if (b && b !== false && ac) { try { playBuf(b, ac); return; } catch (e) {} }
          if (tries < 12) { setTimeout(wait, 80); return; }
          playClipEl(clipId).catch(() => { api.voice = 'clip-miss'; });
        };
        setTimeout(wait, 60);
        return;
      }
      playClipEl(clipId).catch(() => { api.voice = 'clip-miss'; });
      return;
    }
    tts(text);
  }
  function tts(text) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.lang = (voice && voice.lang) || 'en-US'; u.pitch = 1.0; u.rate = 1.05; speechSynthesis.speak(u); api.voice = 'tts'; } catch (e) {}
  }

  const api = {
    ready: true, state: 'idle', lookCount: 0, looks: 0, started: 0, finished: 0, said: [],
    cab: null, reason: null, fallAt: 120 + Math.random() * 120, sessT: 0, force: false,
    near: false, chatOpen: false, watchOpen: false, remarks: 0,
    start(reason = 'debug') { if (api.state !== 'idle' && api.state !== 'done') return false; api.force = true; api.reason = reason; begin(reason); return true; },
    get grok() { return grok; }, get pad() { return pad; }, get arms() { return arms; }, get legs() { return legs; }, get head() { return head; },
  };
  window.__grokVisit = api;
  api.fast = false;
  api.drawWatchNow = (idx) => { if (api.watchOpen) { sizeWatch(); drawWatchFrame(); drawWatchHands(idx == null ? 1 : idx); } };
  api.skipTo = (stName) => {
    if (stName === 'play' && cab) { const s = standAtCab(); grok.position.set(s.x, 0, s.z); grok.rotation.y = s.yaw; grok.scale.setScalar(SCALE); grok.visible = true; bindControls(); api.state = 'play'; phaseT = 0; playDur = api.fast ? 3 : playDur; showNear(true); return true; }
    if (stName === 'leave') { resetControls(); hideUI(); grok.position.set(pad.x, 0, pad.z); grok.visible = true; api.state = 'leave'; phaseT = 0; fx.start(pad.x, pad.z, 'out'); powerPad(1); return true; }
    if (stName === 'done') { resetControls(); hideUI(); grok.visible = false; powerPad(0); fx.stop(); api.state = 'done'; api.finished++; return true; }
    if (stName === 'look') { api.state = 'look'; phaseT = 0; grok.visible = true; grok.scale.setScalar(SCALE); return true; }
    return false;
  };

  // ---- look tracking ----
  let lookStart = 0, leftSince = true, wasLooking = false;
  function padLooking() {
    if (!camera) return false;
    ndc.set(pad.x, 0.55, pad.z).project(camera);
    if (ndc.z > 1 || ndc.z < -1) return false;
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
      if (api.chatOpen || api.watchOpen) return true;
      if (window.__wardrobe && window.__wardrobe.isOpen) return true;
      if (document.querySelector('#inv.on')) return true;
      if (document.querySelector('#holo.on')) return true;
      if (document.querySelector('#poolOv.on')) return true;
      if (document.querySelector('#demoUI.on')) return true;
      if (st && (st.seated || st.fp)) return true;
    } catch (e) {}
    return false;
  }
  api.simulateLooks = (n) => { api.lookCount = Math.max(0, n | 0); leftSince = true; lookStart = 0; if (api.lookCount >= 2 && api.state === 'idle' && !busy()) begin('look'); };
  api.isLooking = padLooking;
  api.isBusy = busy;

  function pickCab() {
    // t639u: only cabs whose attract is a live demo (no INSERT CREDIT / INSERT COIN flash). Canvas-attract cabs excluded.
    const list = (A().featured || []).filter(c => {
      if (!c || !c.getObjectByName) return false;
      if (!c.getObjectByName('joystick')) return false;
      const n = (c.userData && c.userData.name) || c.name || '';
      if (!/strike|ghost/i.test(n)) return false;
      const f = c.userData && c.userData.front; if (!f) return false;
      if (Math.abs(f.x) > 14 || Math.abs(f.z) > 14) return false;
      return true;
    });
    if (!list.length) return null;
    return list[(Math.random() * list.length) | 0];
  }

  let phaseT = 0, from = new THREE.Vector3(), to = new THREE.Vector3(), fromYaw = 0, toYaw = 0;
  let cab = null, joy = null, btns = [], joyBase = null, btnBase = [];
  let playDur = PLAY_S, remarkAt = 0, idleLineAt = 0;
  let lookYawT = 0;

  function begin(reason) {
    cab = pickCab();
    if (!cab) { api.state = 'idle'; api.force = false; return; }
    api.cab = cab; api.reason = reason; api.started++; api.state = 'arrive'; phaseT = 0;
    if (api.fast || reason === 'test') playDur = 3;
    grok.position.set(pad.x, 0, pad.z);
    grok.rotation.set(0, Math.atan2(0 - pad.x, 0 - pad.z), 0);
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

  function walkTo(x, z, yaw, next) {
    from.copy(grok.position); to.set(x, 0, z); fromYaw = grok.rotation.y; toYaw = yaw;
    let d = toYaw - fromYaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; toYaw = fromYaw + d;
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    api.state = next; phaseT = 0;
    api._walkDur = api.fast || api.reason === 'test' ? Math.max(0.6, dist / 4) : Math.max(2.8, dist / WALK_SPD);
  }

  function standAtCab() {
    const f = cab.userData.front, face = cab.userData.facing || new THREE.Vector3(0, 0, 1);
    // stand on the play spot, leaned into the panel so arms reach stick+buttons
    const x = f.x + face.x * 0.62, z = f.z + face.z * 0.62;
    const yaw = Math.atan2(face.x, face.z);
    return { x, z, yaw };
  }

  function bindControls() {
    joy = cab.getObjectByName('joystick');
    btns = []; cab.traverse(o => { if (/^btn/i.test(o.name) && o.isMesh) btns.push(o); });
    // prefer first 3 face buttons
    if (btns.length > 3) btns = btns.slice(0, 3);
    joyBase = joy ? { x: joy.rotation.x, y: joy.rotation.y, z: joy.rotation.z } : null;
    btnBase = btns.map(b => b.position.y);
    // park palms on the controls
    if (joy) {
      palmL.position.set(0, 0.14, 0); palmL.rotation.set(0.4, 0, 0);
      joy.add(palmL); palmL.visible = true;
    }
    if (btns[0]) {
      palmR.position.set(0, 0.035, 0); palmR.rotation.set(0.2, 0, 0);
      btns[0].add(palmR); palmR.visible = true;
    }
  }
  function resetControls() {
    if (joy && joyBase) joy.rotation.set(joyBase.x, joyBase.y, joyBase.z);
    btns.forEach((b, i) => { if (btnBase[i] != null) b.position.y = btnBase[i]; });
    if (palmL.parent) palmL.parent.remove(palmL); scene.add(palmL); palmL.visible = false;
    if (palmR.parent) palmR.parent.remove(palmR); scene.add(palmR); palmR.visible = false;
    joy = null; btns = []; joyBase = null; btnBase = [];
  }

  // Aim arm so the baked forearm tip (el local 0,-0.40,0.02) lands on targetW.
  function aimArm(arm, targetW, handLen) {
    grok.updateMatrixWorld(true);
    arm.sh.updateMatrixWorld(true);
    arm.sh.getWorldPosition(tmp);
    const to = tmp2.copy(targetW).sub(tmp);
    const dist = Math.max(0.05, to.length());
    const qInv = grok.getWorldQuaternion(_q).invert();
    const loc = to.clone().applyQuaternion(qInv);
    const sd = arm.sd;
    // point the hanging (-Y) chain at the target
    const pitch = Math.atan2(-loc.z, Math.max(0.04, -loc.y));
    const roll = Math.atan2(loc.x, Math.max(0.04, Math.hypot(loc.y, loc.z)));
    const tipLen = handLen || 0.45;                          // tip offset from elbow
    const need = dist / SCALE;
    // put elbow so tipLen along the chain reaches the palm
    arm.el.position.set(0, -Math.min(0.9, Math.max(0.22, need - tipLen)), 0);
    arm.sh.rotation.x = THREE.MathUtils.clamp(pitch - 0.05, -2.6, 0.5);
    arm.sh.rotation.z = THREE.MathUtils.clamp(roll + sd * 0.04, -1.5, 1.5);
    arm.sh.rotation.y = 0;
    // slight elbow bend for a natural pose (chain still aims via shoulder)
    arm.el.rotation.set(-0.35, 0, 0);
    // snap: correct residual tip error in shoulder space so hands actually touch
    arm.sh.updateMatrixWorld(true); arm.el.updateMatrixWorld(true);
    const tip = tmp.set(0, -tipLen, 0.02); arm.el.localToWorld(tip);
    const err = tmp2.copy(targetW).sub(tip);
    const shQ = arm.sh.getWorldQuaternion(_q);
    err.applyQuaternion(shQ.invert());
    arm.el.position.x += err.x;
    arm.el.position.y += err.y;
    arm.el.position.z += err.z;
  }

  // Paint over INSERT CREDIT / INSERT COIN flash bands on attract canvases (no Arcade file edits)
  function scrubInsertCredit(cab) {
    try {
      const scr = cab && cab.getObjectByName && cab.getObjectByName('screen');
      const mat = scr && scr.material;
      const map = mat && (mat.map || mat.emissiveMap || (mat.uniforms && mat.uniforms.map && mat.uniforms.map.value));
      const img = map && (map.image || (map.source && map.source.data));
      if (!img || typeof img.getContext !== 'function') return;
      const g = img.getContext('2d'); if (!g) return;
      const W = img.width, H = img.height;
      // cover common INSERT CREDIT flash regions (bottom + mid bands)
      g.save();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#05060a';
      g.fillRect(0, Math.floor(H * 0.78), W, Math.ceil(H * 0.22));
      g.fillRect(Math.floor(W * 0.12), Math.floor(H * 0.42), Math.ceil(W * 0.76), Math.ceil(H * 0.14));
      g.restore();
      map.needsUpdate = true;
    } catch (e) {}
  }

  function animatePlay(dt) {
    // wiggle stick + mash buttons first so palms (children) move with them
    if (joy) {
      joy.rotation.x = Math.sin(t * 6.2) * 0.5;
      joy.rotation.z = Math.cos(t * 4.8) * 0.42;
    }
    const pressIdx = ((t * 2.4) | 0) % Math.max(1, btns.length || 1);
    btns.forEach((b, i) => {
      const press = (i === pressIdx && Math.sin(t * 14) > 0) ? 1 : (Math.sin(t * 11 + i * 1.7) > 0.7 ? 1 : 0);
      const base = btnBase[i] != null ? btnBase[i] : b.position.y;
      b.position.y += ((base - press * 0.014) - b.position.y) * Math.min(1, dt * 18);
    });
    // move right palm onto the currently pressed button
    if (btns.length) {
      const b = btns[pressIdx] || btns[0];
      if (palmR.parent !== b) { if (palmR.parent) palmR.parent.remove(palmR); b.add(palmR); palmR.position.set(0, 0.04, 0); palmR.rotation.set(0.15, 0, 0); palmR.visible = true; }
    }
    // aim arms at palm world positions so hands look glued on
    if (palmL.visible) { const tL = palmL.getWorldPosition(new THREE.Vector3()); aimArm(arms[0], tL, 0.45); }
    if (palmR.visible) { const tR = palmR.getWorldPosition(new THREE.Vector3()); aimArm(arms[1], tR, 0.45); }
    // keep elbows bent toward panel (no clamp that pulls hands off the stick)
    try {
      // t639u: actual gameplay at normal 1x speed (no 2.6x speed-up)
      if (cab.userData && typeof cab.userData.tick === 'function') cab.userData.tick(t);
    } catch (e) {}
    try { if (cab.userData.glow) cab.userData.glow.intensity = 1.35 + Math.sin(t * 10) * 0.1; } catch (e) {}
    scrubInsertCredit(cab);
    // watch overlay sync
    if (api.watchOpen) drawWatchHands(pressIdx);
  }

  function idleArms(dt) {
    arms.forEach(a => {
      a.sh.rotation.x += ((-0.1) - a.sh.rotation.x) * Math.min(1, dt * 4);
      a.sh.rotation.z += ((a.sd * 0.14) - a.sh.rotation.z) * Math.min(1, dt * 4);
      a.el.rotation.x += ((-1.0) - a.el.rotation.x) * Math.min(1, dt * 4);
      a.el.rotation.z *= 0.85;
    });
  }

  // ---- UI: SHOP + CHAT near Grok, WATCH beside PLAY ----
  const css = document.createElement('style');
  css.textContent =
    '#gvBtns{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:28;display:none;gap:12px;align-items:center;pointer-events:none}' +
    '#gvBtns.on{display:flex}' +
    '#gvShop,#gvChat{pointer-events:auto;min-width:128px;height:56px;padding:0 24px;border-radius:28px;border:3px solid #00e5ff;background:#021a22f2;color:#dffbff;font:900 20px/1 "Courier New",monospace;letter-spacing:.14em;box-shadow:0 0 18px #00e5ffcc,inset 0 0 12px #00e5ff55;text-shadow:0 0 8px #00e5ff;cursor:pointer;touch-action:manipulation}' +
    '#gvChat{border-color:#c9a0ff;background:#1a0833f2;box-shadow:0 0 18px #b07cffcc,inset 0 0 12px #b07cff55;text-shadow:0 0 8px #c9a0ff;color:#f0e6ff}' +
    '#gvShop:active,#gvChat:active{transform:scale(.95)}' +
    '#gvChatOv{position:fixed;inset:0;z-index:42;display:none;align-items:flex-end;justify-content:center;padding-bottom:max(18px,env(safe-area-inset-bottom));background:#10081ecc;touch-action:pan-y}' +
    '#gvChatOv.on{display:flex}' +
    '#gvChatP{width:min(94vw,440px);max-height:min(72vh,580px);display:flex;flex-direction:column;border-radius:16px;border:2px solid #c9a0ff;background:linear-gradient(#b07cff33,#3d1a7a44);box-shadow:0 0 28px #b07cffaa,inset 0 0 22px #b07cff44;color:#f5eaff;font:700 14px "Courier New",monospace;overflow:hidden;backdrop-filter:blur(3px)}' +
    '#gvChatP:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#e0c8ff18 0 1px,transparent 1px 4px)}' +
    '#gvChatHd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #c9a0ff77;position:relative}' +
    '#gvChatHd b{font:900 18px "Courier New",monospace;letter-spacing:.14em;color:#f0e6ff;text-shadow:0 0 8px #c9a0ff}' +
    '#gvChatX{width:40px;height:40px;border-radius:50%;border:2px solid #c9a0ff;background:#1a083399;color:#f0e6ff;font:700 18px sans-serif;cursor:pointer}' +
    '#gvChatLog{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}' +
    '.gvMsg{align-self:flex-start;max-width:92%;padding:10px 12px;border-radius:12px;border:1px solid #c9a0ff66;background:#2a1055aa;line-height:1.35;text-shadow:0 0 6px #b07cff}' +
    '.gvMsg.me{align-self:flex-end;background:#00e5ff22;border-color:#6ff6ff66;color:#dffcff}' +
    '#gvChips{display:flex;flex-wrap:wrap;gap:8px;padding:10px 12px 14px;border-top:1px solid #c9a0ff55}' +
    '.gvChip{padding:8px 12px;border-radius:16px;border:1.5px solid #c9a0ff;background:#2a1055cc;color:#f0e6ff;font:800 12px/1.2 Arial,sans-serif;cursor:pointer;touch-action:manipulation}' +
    '.gvChip:active{transform:scale(.96)}' +
    '#gvWatch{position:fixed;left:50%;top:calc(50% + 118px);transform:translate(-50%,0) scale(.92);z-index:7;display:none;width:min(78vw,240px);max-width:calc(100vw - 24px);margin:0;padding:12px 22px 11px;border-radius:12px;border:3px solid #00e5ff;background:linear-gradient(#062a36f2,#021018f2);color:#dffbff;font:900 clamp(18px,4.6vw,28px)/1 "Courier New",monospace;letter-spacing:.12em;box-shadow:0 0 14px #00e5ffaa,inset 0 0 10px #00e5ff44;text-shadow:0 0 8px #00e5ff;cursor:pointer;touch-action:manipulation;opacity:0;pointer-events:none;transition:opacity .3s ease,transform .3s ease;box-sizing:border-box;text-align:center}' +
    '#gvWatch.on{display:block;opacity:1;pointer-events:auto;transform:translate(-50%,0) scale(1)}' +
    '#gvWatchOv{position:fixed;inset:0;z-index:55;display:none;background:#000;flex-direction:column;align-items:stretch}' +
    '#gvWatchOv.on{display:flex}' +
    '#gvWatchCv{flex:1;width:100%;background:#000;object-fit:contain}' +
    '#gvWatchHands{position:absolute;left:0;right:0;bottom:0;height:28%;pointer-events:none}' +
    '#gvWatchX{position:absolute;right:calc(10px + env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));z-index:2;width:46px;height:46px;border-radius:23px;border:2px solid #fff8;background:#000a;color:#fff;font:900 22px/1 Arial,sans-serif;cursor:pointer}';
  document.head.appendChild(css);

  const btnsRow = document.createElement('div'); btnsRow.id = 'gvBtns';
  btnsRow.innerHTML = '<button id="gvShop" type="button">SHOP</button><button id="gvChat" type="button">CHAT</button>';
  document.body.appendChild(btnsRow);
  const shopB = btnsRow.querySelector('#gvShop'), chatB = btnsRow.querySelector('#gvChat');

  const chatOv = document.createElement('div'); chatOv.id = 'gvChatOv';
  chatOv.innerHTML = '<div id="gvChatP" style="position:relative"><div id="gvChatHd"><div><b>GROK CHAT</b><div style="font-size:11px;opacity:.7;letter-spacing:.08em">HOLOGRAM LINK</div></div><button id="gvChatX" aria-label="Close">✕</button></div><div id="gvChatLog"></div><div id="gvChips"></div></div>';
  document.body.appendChild(chatOv);
  const chatLog = chatOv.querySelector('#gvChatLog'), chatChips = chatOv.querySelector('#gvChips');
  chatChips.innerHTML = CHAT.map(c => `<button class="gvChip" data-cid="${c.id}" type="button">${c.q}</button>`).join('');

  const watchB = document.createElement('button'); watchB.id = 'gvWatch'; watchB.type = 'button'; watchB.textContent = 'WATCH';
  // fixed, centred just below the PLAY card cluster — fully on-screen at 360-430px, never overlaps PLAY
  document.body.appendChild(watchB);
  const watchOv = document.createElement('div'); watchOv.id = 'gvWatchOv';
  watchOv.innerHTML = '<button id="gvWatchX" aria-label="Close">✕</button><canvas id="gvWatchCv"></canvas><canvas id="gvWatchHands"></canvas>';
  document.body.appendChild(watchOv);
  const watchCv = watchOv.querySelector('#gvWatchCv'), watchHands = watchOv.querySelector('#gvWatchHands');
  const wctx = watchCv.getContext('2d'), hctx = watchHands.getContext('2d');

  function showNear(on) {
    api.near = !!on;
    const playCard = !!(document.getElementById('playUI') && document.getElementById('playUI').classList.contains('on'));
    // hide SHOP/CHAT while the PLAY+WATCH card is up so nothing overlaps
    btnsRow.classList.toggle('on', !!on && !api.chatOpen && !api.watchOpen && !playCard && !(window.__shop && window.__shop.open));
  }
  function hideUI() {
    showNear(false); closeChat(); closeWatch(); watchB.classList.remove('on');
  }

  function openChat() {
    if (api.chatOpen) return;
    api.chatOpen = true; chatOv.classList.add('on'); btnsRow.classList.remove('on');
    if (chatLog.childElementCount === 0) {
      const m = document.createElement('div'); m.className = 'gvMsg';
      m.textContent = "Hey! Ask me anything about Galactic Arcade."; chatLog.appendChild(m);
      say("Hey! Ask me anything about Galactic Arcade.", "hi");
    }
    const k = A().keys; if (k) for (const c in k) k[c] = false;
  }
  function closeChat() {
    if (!api.chatOpen) return;
    api.chatOpen = false; chatOv.classList.remove('on'); stopVoice();
  }
  function askChat(id) {
    const c = CHAT.find(x => x.id === id); if (!c) return;
    const me = document.createElement('div'); me.className = 'gvMsg me'; me.textContent = c.q; chatLog.appendChild(me);
    const ans = document.createElement('div'); ans.className = 'gvMsg'; ans.textContent = c.a; chatLog.appendChild(ans);
    chatLog.scrollTop = chatLog.scrollHeight;
    say(c.a, c.id);
  }

  function openWatch() {
    if (api.watchOpen || !cab) return;
    api.watchOpen = true; watchOv.classList.add('on');
    sizeWatch(); scrubInsertCredit(cab); drawWatchFrame(); drawWatchHands(((t * 2.4) | 0) % 3);
    const k = A().keys; if (k) for (const c in k) k[c] = false;
  }
  function closeWatch() {
    if (!api.watchOpen) return;
    api.watchOpen = false; watchOv.classList.remove('on');
  }
  function sizeWatch() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    watchCv.width = Math.round(innerWidth * dpr); watchCv.height = Math.round(innerHeight * 0.72 * dpr);
    watchCv.style.width = '100%'; watchCv.style.height = '72%';
    watchHands.width = Math.round(innerWidth * dpr); watchHands.height = Math.round(innerHeight * 0.28 * dpr);
    watchHands.style.width = '100%'; watchHands.style.height = '28%';
  }
  function drawWatchFrame() {
    if (!api.watchOpen || !cab) return;
    const scr = cab.getObjectByName && cab.getObjectByName('screen');
    const mat = scr && scr.material;
    const map = mat && (mat.map || (mat.emissiveMap) || (mat.uniforms && mat.uniforms.map && mat.uniforms.map.value));
    const img = map && (map.image || map.source && map.source.data);
    wctx.fillStyle = '#05060a'; wctx.fillRect(0, 0, watchCv.width, watchCv.height);
    if (img && img.width) {
      const cw = watchCv.width, ch = watchCv.height, iw = img.width, ih = img.height;
      const s = Math.min(cw / iw, ch / ih);
      const dw = iw * s, dh = ih * s;
      try { wctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh); } catch (e) {}
    } else {
      wctx.fillStyle = '#9ff8ff'; wctx.font = 'bold 32px monospace'; wctx.textAlign = 'center';
      wctx.fillText((cab.name || 'ARCADE').toUpperCase(), watchCv.width / 2, watchCv.height / 2);
      wctx.font = '16px monospace'; wctx.fillText('GROK PLAYING · EXPERT', watchCv.width / 2, watchCv.height / 2 + 36);
    }
  }
  function drawWatchHands(pressIdx) {
    const w = watchHands.width, h = watchHands.height;
    hctx.clearRect(0, 0, w, h);
    // control deck
    hctx.fillStyle = '#14181f'; hctx.fillRect(0, h * 0.28, w, h * 0.72);
    hctx.fillStyle = '#2a3140'; hctx.fillRect(0, h * 0.28, w, h * 0.07);
    hctx.fillStyle = '#3a3d42'; hctx.fillRect(w * 0.04, h * 0.42, w * 0.92, h * 0.48);
    // joystick (left)
    const jx = w * 0.26, jy = h * 0.78;
    const jdx = Math.sin(t * 6.2) * w * 0.045, jdz = Math.cos(t * 4.8) * h * 0.05;
    hctx.fillStyle = '#23262a'; hctx.beginPath(); hctx.ellipse(jx, jy, w * 0.09, h * 0.07, 0, 0, 7); hctx.fill();
    hctx.strokeStyle = '#6a6e74'; hctx.lineWidth = Math.max(5, w * 0.012);
    hctx.beginPath(); hctx.moveTo(jx, jy - 4); hctx.lineTo(jx + jdx, jy - h * 0.26 + jdz); hctx.stroke();
    hctx.fillStyle = '#e01818'; hctx.beginPath(); hctx.arc(jx + jdx, jy - h * 0.26 + jdz, w * 0.038, 0, 7); hctx.fill();
    // left robot hand gripping stick
    drawRobotHand(hctx, jx + jdx, jy - h * 0.2 + jdz, w * 0.13, true);
    // THREE buttons: red, yellow, blue — fully spaced
    const cols = ['#e01818', '#ffd21e', '#2a6aff'];
    const bx0 = w * 0.50, by = h * 0.62, gap = w * 0.14;
    const pi = ((pressIdx % 3) + 3) % 3;
    for (let i = 0; i < 3; i++) {
      const bx = bx0 + i * gap;
      const pressed = i === pi;
      // bezel
      hctx.fillStyle = '#1a1c20'; hctx.beginPath(); hctx.arc(bx, by + (pressed ? 8 : 0), w * 0.042, 0, 7); hctx.fill();
      hctx.fillStyle = pressed ? '#ffffff' : cols[i];
      hctx.globalAlpha = pressed ? 1 : 0.95;
      hctx.beginPath(); hctx.arc(bx, by + (pressed ? 8 : 0), w * 0.034, 0, 7); hctx.fill();
      hctx.globalAlpha = 1;
      hctx.strokeStyle = '#fff6'; hctx.lineWidth = 2; hctx.stroke();
    }
    // right robot hand approaches from below so all three coloured buttons stay fully visible
    drawRobotHand(hctx, bx0 + pi * gap + w * 0.01, by + h * 0.14, w * 0.11, false);
  }
  function drawRobotHand(ctx, x, y, s, left) {
    ctx.save(); ctx.translate(x, y); if (!left) ctx.scale(-1, 1);
    // dark grey Grok shell colours
    const sil = '#c9ccd1', chr = '#8a8e96', hi = '#e0e3e8';
    // forearm stump
    ctx.fillStyle = chr;
    ctx.fillRect(-s * 0.22, s * 0.15, s * 0.44, s * 0.55);
    // palm block
    ctx.fillStyle = sil;
    ctx.fillRect(-s * 0.48, -s * 0.2, s * 0.96, s * 0.42);
    // three blocky fingers
    for (let i = 0; i < 3; i++) {
      const fx = -s * 0.36 + i * s * 0.28;
      ctx.fillStyle = i === 1 ? hi : chr;
      ctx.fillRect(fx, -s * 0.72, s * 0.22, s * 0.55);
      ctx.fillStyle = sil;
      ctx.fillRect(fx + s * 0.02, -s * 0.78, s * 0.18, s * 0.14);
    }
    // thumb
    ctx.fillStyle = chr;
    ctx.fillRect(-s * 0.72, -s * 0.05, s * 0.28, s * 0.2);
    ctx.restore();
  }

  shopB.addEventListener('pointerup', e => { e.stopPropagation(); try { window.__shop && window.__shop.openShop && window.__shop.openShop(); } catch (err) {} });
  chatB.addEventListener('pointerup', e => { e.stopPropagation(); openChat(); });
  chatOv.querySelector('#gvChatX').addEventListener('pointerup', e => { e.stopPropagation(); closeChat(); });
  chatOv.addEventListener('pointerup', e => { if (e.target === chatOv) closeChat(); });
  chatChips.addEventListener('pointerup', e => { const b = e.target.closest && e.target.closest('[data-cid]'); if (!b) return; e.stopPropagation(); askChat(b.dataset.cid); });
  watchB.addEventListener('pointerup', e => { e.stopPropagation(); openWatch(); });
  watchOv.querySelector('#gvWatchX').addEventListener('pointerup', e => { e.stopPropagation(); closeWatch(); });
  addEventListener('keydown', e => {
    if (api.chatOpen && (e.code === 'Escape' || e.code === 'Backspace')) { closeChat(); e.stopImmediatePropagation(); }
    if (api.watchOpen && (e.code === 'Escape' || e.code === 'Backspace')) { closeWatch(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener('resize', () => { if (api.watchOpen) sizeWatch(); });

  function playerNearGrok() {
    const m = monkey || A().monkey; if (!m || !grok.visible) return false;
    return Math.hypot(m.position.x - grok.position.x, m.position.z - grok.position.z) < NEAR_R;
  }
  function playerNearCab() {
    const m = monkey || A().monkey; if (!m || !cab || !cab.userData.front) return false;
    const f = cab.userData.front;
    return Math.hypot(m.position.x - f.x, m.position.z - f.z) < 1.15;
  }

  function zap() {
    try {
      if (muted()) return;
      const ac = actx(); if (!ac || ac.state !== 'running') return;
      const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(2200, t0); o.frequency.exponentialRampToValueAtTime(110, t0 + 0.28);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.34);
    } catch (e) {}
  }
  function vwoom(D) {
    try {
      if (muted()) return;
      const ac = actx(); if (!ac || ac.state !== 'running') return;
      const t0 = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(420, t0 + D);
      o2.frequency.setValueAtTime(140, t0); o2.frequency.exponentialRampToValueAtTime(1100, t0 + D);
      f.type = 'lowpass'; f.Q.value = 8; f.frequency.setValueAtTime(200, t0); f.frequency.exponentialRampToValueAtTime(3200, t0 + D);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.3); g.gain.setValueAtTime(0.08, t0 + D - 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t0 + D + 0.1);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination); [o, o2].forEach(x => { x.start(t0); x.stop(t0 + D + 0.15); });
    } catch (e) {}
  }

  function tick(dt) {
    t += dt; api.sessT += dt; phaseT += dt;
    if (grok.visible) {
      blinkT -= dt; if (blinkT < -0.12) blinkT = 2 + Math.random() * 3;
      talkT = Math.max(0, talkT - dt); happyT = Math.max(0, happyT - dt);
      const talking = talkT > 0, happy = happyT > 0;
      const tk = talking ? [0.15, 0.7, 1, 0.4][(t * 11 | 0) % 4] : 0;
      const fs = (happy ? 'h' : blinkT < 0 ? 'b' : 'o') + tk;
      if (fs !== faceState) { faceState = fs; drawFace(faceTex.g, blinkT < 0, tk, happy); faceTex.t.needsUpdate = true; }
      if (api.state === 'play' || api.state === 'cheer') grok.position.y = 0;
      else if (api.state !== 'walk' && api.state !== 'return') grok.position.y = Math.sin(t * 1.6) * 0.015;
    }
    fx.tick(dt);

    // near UI while visiting
    if (grok.visible && api.state !== 'idle' && api.state !== 'done' && api.state !== 'leave' && api.state !== 'arrive') {
      const near = playerNearGrok() && !busy() && !api.watchOpen;
      showNear(near);
      if (near && api.state !== 'play' && phaseT > 1 && t > idleLineAt && !talkT && !api.chatOpen) {
        idleLineAt = t + 12 + Math.random() * 8;
        const i = (Math.random() * IDLE_LINES.length) | 0;
        say(IDLE_LINES[i], IDLE_CLIPS[i]);
      }
    } else if (api.state === 'idle' || api.state === 'done') {
      showNear(false);
    }

    // WATCH button: when Grok is playing AND player is at that cabinet (PLAY would show)
    if (api.state === 'play' && cab) {
      const playOn = document.getElementById('playUI') && document.getElementById('playUI').classList.contains('on');
      const nearCab = playerNearCab() || playOn;
      watchB.classList.toggle('on', nearCab && !api.watchOpen && !api.chatOpen && !(window.__shop && window.__shop.open));
      // keep SHOP/CHAT tucked away whenever PLAY card or WATCH is up
      if (playOn || api.watchOpen) btnsRow.classList.remove('on');
      if (api.watchOpen) drawWatchFrame();
    } else {
      watchB.classList.remove('on');
      if (api.watchOpen) closeWatch();
    }

    if (api.state === 'idle') {
      if (!api._t0) api._t0 = performance.now() / 1000;
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
      if ((now - api._t0) >= api.fallAt) { begin('random'); return; }
      return;
    }

    if (api.state === 'arrive') {
      const D = 1.35, k = Math.min(1, phaseT / D);
      grok.scale.setScalar(0.01 + (SCALE - 0.01) * ease(k));
      powerPad(1 - k * 0.7);
      if (k >= 1) {
        grok.scale.setScalar(SCALE); powerPad(0); fx.stop();
        say(HI, 'hi'); api.state = 'greet'; phaseT = 0;
      }
      return;
    }

    if (api.state === 'greet') {
      const wv = arms[1];
      wv.sh.rotation.z += (2.4 - wv.sh.rotation.z) * Math.min(1, dt * 6);
      wv.el.rotation.z = Math.sin(t * 9) * 0.45;
      wv.el.rotation.x += (-0.3 - wv.el.rotation.x) * Math.min(1, dt * 6);
      arms[0].sh.rotation.z += ((-0.14) - arms[0].sh.rotation.z) * Math.min(1, dt * 4);
      if (phaseT > (api.fast || api.reason === 'test' ? 0.5 : 2.0)) {
        idleArms(dt);
        api.state = 'look'; phaseT = 0; lookYawT = 0;
      }
      return;
    }

    // look around the arcade before walking
    if (api.state === 'look') {
      idleArms(dt);
      const dur = api.fast || api.reason === 'test' ? 0.5 : LOOK_AROUND_S;
      lookYawT += dt;
      const sweep = Math.sin(lookYawT * 1.3) * 0.85;
      head.rotation.y += (sweep - head.rotation.y) * Math.min(1, dt * 3);
      head.rotation.x = Math.sin(lookYawT * 0.9) * 0.12;
      grok.rotation.y += Math.sin(lookYawT * 0.7) * dt * 0.35;
      if (phaseT >= dur) {
        head.rotation.y = 0; head.rotation.x = 0;
        const s = standAtCab();
        walkTo(s.x, s.z, s.yaw, 'walk');
      }
      return;
    }

    if (api.state === 'walk' || api.state === 'return') {
      const D = api._walkDur || 3.5, k = Math.min(1, phaseT / D);
      // ease in/out on start/stop (smoother than plain smoothstep)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const dist = Math.hypot(to.x - from.x, to.z - from.z);
      const speed = dist / Math.max(0.001, D);                     // m/s average
      const stride = Math.max(0.15, Math.min(1, speed / WALK_SPD)); // 0..1
      grok.position.x = from.x + (to.x - from.x) * e;
      grok.position.z = from.z + (to.z - from.z) * e;
      // ease turns separately so he doesn't skate sideways
      const turnE = k < 0.2 ? (k / 0.2) * (k / 0.2) : (k > 0.85 ? 1 - Math.pow((1 - k) / 0.15, 2) : 1);
      grok.rotation.y = fromYaw + (toYaw - fromYaw) * Math.min(1, turnE);
      // gait phase locked to distance travelled (no sliding)
      const travelled = dist * e;
      const gait = travelled * 3.6;                                  // ~steps
      const lift = Math.max(0, Math.sin(gait)) * 0.05 * stride;
      grok.position.y = Math.abs(Math.sin(gait)) * 0.028 * stride + lift * 0.15;
      grok.rotation.z = Math.sin(gait) * 0.03 * stride;             // gentle sway
      grok.rotation.x = -Math.abs(Math.sin(gait)) * 0.02 * stride;
      // alternating legs
      for (const L of legs) {
        const ph = gait + (L.sd > 0 ? 0 : Math.PI);
        L.hip.rotation.x = Math.sin(ph) * 0.55 * stride;
        L.thigh.rotation.x = Math.max(0, -Math.sin(ph)) * 0.35 * stride;
      }
      // arms swing opposite the legs
      const armAmp = 0.55 * stride;
      arms[0].sh.rotation.x = Math.sin(gait + Math.PI) * armAmp;
      arms[1].sh.rotation.x = Math.sin(gait) * armAmp;
      arms[0].sh.rotation.z = -0.12; arms[1].sh.rotation.z = 0.12;
      arms[0].el.rotation.x = -0.55 - Math.max(0, Math.sin(gait + Math.PI)) * 0.35;
      arms[1].el.rotation.x = -0.55 - Math.max(0, Math.sin(gait)) * 0.35;
      // look around while walking — smooth occasional glances
      const glance = Math.sin(phaseT * 0.7) * 0.55 + Math.sin(phaseT * 1.7) * 0.25;
      head.rotation.y += (glance - head.rotation.y) * Math.min(1, dt * 2.2);
      head.rotation.x = Math.sin(phaseT * 0.9) * 0.08;
      if (k >= 1) {
        grok.position.y = 0; grok.rotation.z = 0; grok.rotation.x = 0;
        for (const L of legs) { L.hip.rotation.x = 0; L.thigh.rotation.x = 0; }
        if (api.state === 'walk') {
          grok.position.set(to.x, 0, to.z); grok.rotation.y = toYaw; head.rotation.y = 0; head.rotation.x = 0;
          bindControls(); playDur = api.fast || api.reason === 'test' ? 3 : (45 + Math.random() * 15);
          api.state = 'play'; phaseT = 0; remarkAt = t + 8 + Math.random() * 5;
        } else {
          grok.position.set(pad.x, 0, pad.z); head.rotation.y = 0; head.rotation.x = 0;
          api.state = 'leave'; phaseT = 0;
          fx.start(pad.x, pad.z, 'out'); vwoom(1.1);
          try { if (tp.fxAt) tp.fxAt(pad.x, pad.z, true); } catch (e) {}
          powerPad(1); hideUI();
        }
      }
      return;
    }

    if (api.state === 'play') {
      animatePlay(dt);
      head.rotation.x = -0.12 + Math.sin(t * 2) * 0.03;
      if (t >= remarkAt && !talkT) {
        remarkAt = t + 10 + Math.random() * 5;
        const i = (Math.random() * REMARKS.length) | 0;
        say(REMARKS[i], REMARK_CLIPS[i]); api.remarks++;
      }
      if (phaseT >= playDur) { resetControls(); say(CHEER, 'cheer'); api.state = 'cheer'; phaseT = 0; watchB.classList.remove('on'); if (api.watchOpen) closeWatch(); }
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
        walkTo(pad.x, pad.z, Math.atan2(0 - pad.x, 0 - pad.z), 'return');
      }
      return;
    }

    if (api.state === 'leave') {
      const D = 1.2, k = Math.min(1, phaseT / D);
      grok.scale.setScalar(SCALE * (1 - k) + 0.01 * k);
      powerPad(Math.max(0.2, 1 - k));
      if (k >= 1) {
        grok.visible = false; grok.scale.setScalar(SCALE); powerPad(0); fx.stop();
        resetControls(); hideUI(); api.state = 'done'; api.finished++; api.force = false; stopVoice();
      }
      return;
    }
  }

  const S = window.__shop;
  if (S && typeof S.update === 'function') {
    const prev = S.update;
    S.update = (dt) => { try { prev(dt); } catch (e) {} try { tick(dt); } catch (e) { if (!api._err) { api._err = 1; console.warn('grokvisit', e); } } };
  } else {
    let last = performance.now();
    const loop = (now) => { requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; try { tick(dt); } catch (e) {} };
    requestAnimationFrame(loop);
  }

  api._t0 = performance.now() / 1000;
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
