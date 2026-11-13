// t741u LASER PISTOL in the arcade rooms (Dave: "when the laser pistol is equipped add a fire button above zoom. The alien doesn't hold a
// pistol when equipped but the floating machine shoots lasers. Have it similar to the shooting in sky tower").
// Equipped = player.js HAND row 'pistol' (owned + worn). FIRE sits directly above ZOOM and shows only with ZOOM (walk mode, no cabinet game,
// menus, start screen, backpack). t783u/t785u: a tap is a normal shot; holding builds a visible charge. Release before 4 s fires one
// bolt that gets bigger and thicker with the hold. Held for 4 s, a steady thick beam in the player's colours fires for 3 s (no extra
// bolt on release). Monkey raises the pistol (GUN_REST -> GUN_AIM); the alien's robot tips forward. Normal bolts are still cyan
// (monkey muzzle) / red (alien eye), fly ~11 m and fade; they hit nothing (no PVP). Zap = Sky Tower's snd.js zap, silent while MUTE
// is on. Multiplayer: own shots go out as a 'zap' broadcast (mp.js), remote ones draw here.
(function () {
  'use strict';
  var COOL = 0.28, AIM_T = 0.35, SPEED = 24, LIFE = 0.46, FADE = 0.16, ZAP_GAP = 0.1, MAX = 14, CHARGE_T = 4, BEAM_T = 3, BEAM_LEN = 28;
  var REST = { shx: -0.12, shy: 0.04, shz: 0.26, elx: 0.22, elz: 0.06, gx: 0.78, gy: 0 }, AIMP = { shx: -1.40, shy: 0, shz: 0.20, elx: -0.08, elz: 0, gx: 1.48, gy: -0.25 };
  var RF = window.__roomFire = { shots: 0, remote: 0, zaps: 0, zapCyan: 0, zapRed: 0, zapMuted: 0, held: false, cool: 0, aim: 0, aimT: 0, flash: 0, lasers: [], shown: false, last: null,
    charge: 0, chargeSpent: false, beam: null, beamT: 0, CHARGE_T: CHARGE_T, BEAM_T: BEAM_T,
    COOL: COOL, SPEED: SPEED, LIFE: LIFE, REST: REST, AIM: AIMP, equipped: equipped, fire: fire, spawn: spawn, update: update, setHeld: setHeld, playerCols: playerCols };
  function A() { return window.__arcade; }
  function equipped() { var g = window.__gaPlayer; return !!(g && g.p && g.p.hand === 'pistol' && (!g.has || g.has('hand', 'pistol'))); }
  // ---------- FIRE button: directly above ZOOM (#bZoom: right 108px, bottom 24px, 56px), same column, a bit bigger ----------
  var css = document.createElement('style');
  css.textContent = '#bFire{position:fixed;right:calc(max(4px,env(safe-area-inset-right)) + 104px);bottom:calc(max(4px,env(safe-area-inset-bottom)) + 90px);z-index:24;width:64px;height:64px;border-radius:50%;padding:0;display:none;'
    + 'align-items:center;justify-content:center;flex-direction:column;gap:2px;border:3px solid #ff6060;background:radial-gradient(circle at 50% 42%,#4a1010f2,#140404f2);color:#fff;font:900 13px/1 "Courier New",monospace;letter-spacing:.05em;'
    + 'text-shadow:0 0 8px #ff3030;box-shadow:0 0 14px #ff303099,inset 0 0 12px #ff303044;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}'
    + '#bFire.on{display:flex}#bFire.held{border-color:#ffd0d0;background:radial-gradient(circle at 50% 42%,#ff4040cc,#3a0808f2);transform:scale(.96)}#bFire svg{width:24px;height:16px;display:block;filter:drop-shadow(0 0 4px #48f2ff)}'    + '#bFire .chg{position:absolute;inset:-5px;border-radius:50%;pointer-events:none;background:conic-gradient(#ffe14a calc(var(--chg,0)*1%),transparent 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));opacity:.95}'
    + 'body.ingame #bFire{display:none!important}';
  document.head.appendChild(css);
  var btn = document.createElement('button'); btn.id = 'bFire'; btn.type = 'button'; btn.title = 'Fire the laser pistol (hold)'; btn.setAttribute('aria-label', 'Fire laser');
  btn.innerHTML = '<i class="chg" aria-hidden="true"></i><svg viewBox="0 0 44 28" aria-hidden="true"><rect x="4" y="5" width="26" height="10" rx="2" fill="#9aa7bd"/><rect x="26" y="7" width="9" height="6" fill="#5a6678"/><rect x="35" y="7.5" width="6" height="5" rx="1.5" fill="#48f2ff"/><path d="M9 15h8l-2 11H7z" fill="#5a6678"/></svg><span>FIRE</span>';
  (document.body || document.documentElement).appendChild(btn); RF.btn = btn;
  function stopEv(e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }
  btn.addEventListener('pointerdown', function (e) { stopEv(e); try { btn.setPointerCapture(e.pointerId); } catch (x) {} setHeld(true); });
  btn.addEventListener('pointerup', function (e) { stopEv(e); setHeld(false); });
  btn.addEventListener('pointercancel', function () { setHeld(false); });
  btn.addEventListener('lostpointercapture', function () { setHeld(false); });
  ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach(function (t) { btn.addEventListener(t, stopEv); });
  function setHeld(on) {
    on = !!on && RF.shown;
    if (on === RF.held) return;
    RF.held = on; btn.classList.toggle('held', on);
    if (on) { RF.charge = 0; RF.chargeSpent = false; }
    else { if (!RF.chargeSpent && !RF.beam) fire({ k: Math.min(0.999, RF.charge / CHARGE_T), fromRelease: true }); RF.charge = 0; setChg(0); hideChargeBall(); }
  }
  // t783u: the 3 s beam uses the player's suit / hoodie colours (fallback cyan/red)
  function playerCols() {
    var lk = null, G = window.__gaPlayer;
    try { if (G && G.look) lk = G.look(); } catch (e) {}
    if (!lk) { try { lk = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}'); } catch (e) { lk = {}; } }
    var char = (lk && lk.char) || (A() && A().monkey && A().monkey.userData && A().monkey.userData.char) || 'monkey';
    var HOOD = { navy: [0x1d2452, 0x141a3a], red: [0xd42a2a, 0x7a1414], blue: [0x2b62e8, 0x173a8a], green: [0x2fae3a, 0x16601c], yellow: [0xf2c418, 0x9a7a08], purple: [0x7a2bd6, 0x46137f], pink: [0xff5fb4, 0xb02a72], orange: [0xff7a1a, 0xa8460a], teal: [0x13b8a8, 0x0a6b62], black: [0x202026, 0x0c0c10], white: [0xe8eaf0, 0xa9adb8], galaxy: [0x2a1470, 0x160a40], lime: [0x86e02a, 0x4a8a10], maroon: [0x6e1430, 0x3c0818], sky: [0x6cc8ff, 0x2a7ab8] };
    var SUIT = { suitgrey: [0x5a636e, 0x6a3a9a], suitred: [0xb3222f, 0x2b1a3e], suitgold: [0xc9971f, 0x6a3a9a], suitteal: [0x138a8a, 0x6a3a9a], suitwhite: [0xdfe4ea, 0x6a3a9a], suitblack: [0x22252b, 0x8a3ad0] };
    if (char === 'alien') { var su = SUIT[lk && lk.suit] || SUIT.suitgrey; return { a: su[0], b: su[1], char: 'alien' }; }
    var ho = HOOD[(lk && lk.hoodie) || 'navy'] || HOOD.navy; return { a: ho[0], b: ho[1], char: 'monkey' };
  }
  function setChg(k) { btn.style.setProperty('--chg', Math.max(0, Math.min(100, k * 100)).toFixed(1)); }
  var chargeBall = null;
  function hideChargeBall() { if (chargeBall && chargeBall.parent) chargeBall.parent.remove(chargeBall); chargeBall = null; }
  function muzzlePos() {
    var a = A(); if (!a || !a.monkey) return null; var T = a.THREE, mk = a.monkey, u = mk.userData || {}, p = new T.Vector3();
    mk.updateMatrixWorld(true);
    if (u.char === 'alien') { var eye = mk.getObjectByName('botEye') || u.bot; if (eye) eye.getWorldPosition(p); else p.set(mk.position.x, mk.position.y + 1.6, mk.position.z); }
    else { var mz = mk.getObjectByName('gaPistolMuzzle'); if (mz) mz.getWorldPosition(p); else p.set(mk.position.x, mk.position.y + 1.1, mk.position.z); }
    return p;
  }
  function updateChargeBall(k) {
    var a = A(), p = muzzlePos(); if (!a || !p) return; var T = a.THREE;
    if (!chargeBall) { var mat = new T.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false, blending: T.AdditiveBlending });
      chargeBall = new T.Mesh(new T.SphereGeometry(0.12, 12, 10), mat); chargeBall.name = 'roomCharge'; chargeBall.renderOrder = 6; a.scene.add(chargeBall); }
    chargeBall.visible = k > 0.02; chargeBall.position.copy(p); var s = 0.35 + k * 1.6; chargeBall.scale.setScalar(s); chargeBall.material.opacity = 0.35 + k * 0.6;
    var c = playerCols(); chargeBall.material.color.setHex(k > 0.7 ? c.a : 0xffe14a);
  }
  function canShow() { var a = A(), z = document.getElementById('bZoom'); if (!a || !a.play || a.play.mode !== 'walk') return false;
    if (!z || !z.classList.contains('on') || document.body.classList.contains('ingame')) return false;
    if ((window.__wardrobe && window.__wardrobe.isOpen) || (window.__inv && window.__inv.open) || window.__optsOpen) return false;
    var op = document.getElementById('opt'); if (op && op.classList.contains('on')) return false; return equipped(); }
  // ---------- sound: snd.js zap() (Sky Tower) ----------
  var ac = null, noise = null, lastZap = -9;
  function muted() { try { if (window.__muted || (window.__mute && window.__mute.on)) return true; return localStorage.getItem('neonarcade.mute') === '1'; } catch (e) { return false; } }
  function ctx() { try { ac = ac || window.__unlockAC || (window.__unlockAC = new (window.AudioContext || window.webkitAudioContext)()); if (ac.state === 'suspended' && ac.resume) { var p = ac.resume(); if (p && p.catch) p.catch(function () {}); } return ac; } catch (e) { return null; } }
  function env(t, peak, a, decay) { var g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay); g.connect(ac.destination); return g; }
  function osc(type, f, t, dur, peak, slide) { var o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur); o.connect(env(t, peak, 0.012, dur)); o.start(t); o.stop(t + dur + 0.03); }
  function burst(t, dur, peak, hp) { if (!noise) { noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = ac.createBufferSource(); s.buffer = noise; var f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); f.connect(env(t, peak, 0.005, dur)); s.start(t); s.stop(t + dur + 0.02); }
  function zap(hue) { if (muted()) { RF.zapMuted++; return false; } if (!ctx()) return false; var t = ac.currentTime; if (t - lastZap < ZAP_GAP) return false; lastZap = t; RF.zaps++;
    try { if (hue === 'red') { RF.zapRed++; osc('sine', 780, t, 0.14, 0.16, 240); osc('triangle', 520, t, 0.16, 0.1, 190); burst(t, 0.05, 0.045, 900); }
      else { RF.zapCyan++; osc('square', 1680, t, 0.09, 0.11, 620); osc('triangle', 1240, t, 0.07, 0.06, 480); burst(t, 0.035, 0.05, 2800); } } catch (e) {} return true; }
  // ---------- bolts ----------
  var geo = null, glowGeo = null;
  function mat(hue) { var T = A().THREE; return new T.MeshBasicMaterial({ color: hue === 'red' ? 0xff2a33 : 0x48f2ff, transparent: true, opacity: 1, toneMapped: false, depthWrite: false }); }
  function spawn(o, d, hue, remote) { var a = A(); if (!a || !a.scene) return null; var T = a.THREE; geo = geo || new T.BoxGeometry(0.07, 0.07, 0.85); glowGeo = glowGeo || new T.BoxGeometry(0.17, 0.17, 1.05);
    while (RF.lasers.length >= MAX) kill(RF.lasers[0]);
    var m = new T.Mesh(geo, mat(hue)); m.name = 'roomLaser'; m.position.set(o[0], o[1], o[2]); m.lookAt(o[0] + d[0], o[1] + d[1], o[2] + d[2]); m.renderOrder = 4; m.frustumCulled = false;
    var gm = mat(hue); gm.opacity = 0.32; gm.blending = T.AdditiveBlending; var gl = new T.Mesh(glowGeo, gm); gl.name = 'roomLaserGlow'; gl.frustumCulled = false; gl.renderOrder = 5; m.add(gl); a.scene.add(m);
    var k = (arguments[4] || 0); if (k > 0) { var sc = 1 + k * 3, zc = 1 + k * 1.5; m.scale.set(sc, sc, zc); }
    var L = { mesh: m, dir: new T.Vector3(d[0], d[1], d[2]).normalize(), o: o.slice(), life: LIFE, hue: hue, remote: !!remote, k: k }; RF.lasers.push(L); if (remote) RF.remote++; return L; }
  function kill(L) { var i = RF.lasers.indexOf(L); if (i >= 0) RF.lasers.splice(i, 1); if (L.mesh.parent) L.mesh.parent.remove(L.mesh); L.mesh.material.dispose(); L.mesh.children.forEach(function (c) { c.material.dispose(); }); }
  function startBeam() {
    var a = A(), p = muzzlePos(); if (!a || !p) return; var T = a.THREE, f = a.st ? a.st.face : a.monkey.rotation.y, d = new T.Vector3(Math.sin(f), 0.02, Math.cos(f)).normalize();
    var col = playerCols(), core = new T.MeshBasicMaterial({ color: col.a, toneMapped: false, depthWrite: false }), glow = new T.MeshBasicMaterial({ color: col.b, transparent: true, opacity: 0.45, toneMapped: false, depthWrite: false, blending: T.AdditiveBlending });
    var g = new T.Group(); g.name = 'roomChargeBeam';
    g.add(new T.Mesh(new T.CylinderGeometry(0.11, 0.11, BEAM_LEN, 10, 1, true), core));
    g.add(new T.Mesh(new T.CylinderGeometry(0.24, 0.24, BEAM_LEN, 10, 1, true), glow));
    g.children.forEach(function (m) { m.rotation.x = Math.PI / 2; m.position.z = BEAM_LEN / 2; m.renderOrder = 5; });
    a.scene.add(g); RF.beam = { mesh: g, cols: col }; RF.beamT = BEAM_T; hideChargeBall(); setChg(1);
    RF.aimT = AIM_T; RF.aim = 1; if (col.char !== 'alien') pose((a.monkey.userData || {}), 1); else RF.flash = 0.2;
    zap(col.char === 'alien' ? 'red' : 'cyan');
  }
  function placeBeam() {
    if (!RF.beam) return; var a = A(), p = muzzlePos(); if (!a || !p) return; var T = a.THREE, f = a.st ? a.st.face : a.monkey.rotation.y;
    RF.beam.mesh.position.copy(p); RF.beam.mesh.lookAt(p.x + Math.sin(f), p.y + 0.02, p.z + Math.cos(f));
  }
  function endBeam() { if (!RF.beam) return; if (RF.beam.mesh.parent) RF.beam.mesh.parent.remove(RF.beam.mesh); RF.beam = null; RF.beamT = 0; setChg(0); }
  function fire(opts) { opts = opts || {}; var a = A(); if (!a || !a.monkey || !RF.shown) return null;
    if (RF.beam) return null;
    if (!opts.fromRelease && RF.cool > 0) return null; RF.cool = COOL;
    if (!opts.fromRelease) RF.chargeSpent = true;
    var T = a.THREE, mk = a.monkey, u = mk.userData || {}, alien = u.char === 'alien', f = a.st ? a.st.face : mk.rotation.y, d = [Math.sin(f), 0.02, Math.cos(f)], p = new T.Vector3(), hue;
    if (window.__neonPlayer && window.__neonPlayer.idle) window.__neonPlayer.idle.t = 0;   // shooting is not standing idle: no pockets / phone
    if (alien) { hue = 'red'; RF.flash = 0.16; if (u.bot) { u.bot.rotation.set(-0.18, 0, 0); } mk.updateMatrixWorld(true); var eye = mk.getObjectByName('botEye') || u.bot; if (eye) eye.getWorldPosition(p); else p.set(mk.position.x, mk.position.y + 1.6, mk.position.z); }
    else { hue = 'cyan'; RF.aimT = AIM_T; RF.aim = 1; pose(u, 1); mk.updateMatrixWorld(true); var mz = mk.getObjectByName('gaPistolMuzzle'); if (mz) mz.getWorldPosition(p); else p.set(mk.position.x, mk.position.y + 1.1, mk.position.z); }
    p.x += d[0] * (alien ? 0.1 : 0.04); p.z += d[2] * (alien ? 0.1 : 0.04);
    var o = [p.x, p.y, p.z], k = Math.max(0, Math.min(0.999, opts.k || 0)), L = spawn(o, d, hue, false, k); RF.shots++; RF.last = { o: o, d: d, hue: hue, char: alien ? 'alien' : 'monkey', t: performance.now(), k: k }; zap(hue);
    try { if (window.__mp && window.__mp.zap) window.__mp.zap(o, d, hue); } catch (e) {}
    return L; }
  var L_ = function (x, y, k) { return x + (y - x) * k; };
  function pose(u, k) { var arm = u.arms && u.arms[1]; if (!arm) return; var pg = arm.hand && arm.hand.getObjectByName('gaPistol'); if (!pg) return; k = Math.max(0, Math.min(1, k));
    var idle = window.__neonPlayer && window.__neonPlayer.idle, w = idle ? Math.min(1, idle.wP || 0) : 0, sh = arm.sh, el = arm.el;
    // base = the walk swing (or the relaxed rest when he would put his hand in his pocket); then raise toward the aim pose
    var bx = L_(sh.rotation.x, REST.shx, w), by = L_(sh.rotation.y, REST.shy, w), bz = L_(sh.rotation.z, REST.shz, w), ex = L_(el.rotation.x, REST.elx, w), ez = L_(el.rotation.z, REST.elz, w);
    sh.rotation.x = L_(bx, AIMP.shx, k); sh.rotation.y = L_(by, AIMP.shy, k); sh.rotation.z = L_(bz, AIMP.shz, k); el.rotation.x = L_(ex, AIMP.elx, k); el.rotation.z = L_(ez, AIMP.elz, k);
    pg.rotation.x = L_(REST.gx, AIMP.gx, k); pg.rotation.y = L_(REST.gy, AIMP.gy, k);
    arm.hand.visible = true; arm.hand.scale.set(0.8, 1.05, 1); arm.hand.rotation.x = 0; if (u.phone) u.phone.visible = false; }   // the pistol hand never goes in the pocket / holds the phone
  function update(dt) { var a = A(); if (!a || !a.monkey) return; RF.t = (RF.t || 0) + dt; var show = canShow();
    if (show !== RF.shown) { RF.shown = show; btn.classList.toggle('on', show); if (!show) { RF.held = false; btn.classList.remove('held'); } }
    if (RF.cool > 0) RF.cool -= dt;
    if (RF.beam) { RF.beamT -= dt; placeBeam(); if (RF.beamT <= 0) endBeam(); }
    else if (RF.held) { RF.charge += dt; var ck = Math.min(1, RF.charge / CHARGE_T); setChg(ck); updateChargeBall(ck); if (RF.aimT < 0.1) RF.aimT = AIM_T; if (RF.charge >= CHARGE_T && !RF.chargeSpent) { RF.chargeSpent = true; startBeam(); } }
    else if (chargeBall) hideChargeBall();
    var u = a.monkey.userData || {};
    if (equipped() && u.char !== 'alien') { if (RF.aimT > 0) RF.aimT = Math.max(0, RF.aimT - dt); var want = (RF.held || RF.aimT > 0) ? 1 : 0; RF.aim += (want - RF.aim) * (1 - Math.exp(-(want ? 10 : 7) * dt)); pose(u, RF.aim); }
    else RF.aim = 0;
    if (RF.flash > 0) { RF.flash = Math.max(0, RF.flash - dt); if (u.bot && u.char === 'alien') u.bot.rotation.x = -0.18 * Math.min(1, RF.flash / 0.05); }
    for (var i = RF.lasers.length - 1; i >= 0; i--) { var L = RF.lasers[i]; L.mesh.position.addScaledVector(L.dir, SPEED * dt); L.life -= dt; var op = Math.max(0, Math.min(1, L.life / FADE)); L.mesh.material.opacity = op; if (L.mesh.children[0]) L.mesh.children[0].material.opacity = op * 0.32; if (L.life <= 0) kill(L); } }
  addEventListener('keydown', function (e) { if (e.code === 'KeyL' && !e.repeat && RF.shown && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) setHeld(true); });
  addEventListener('keyup', function (e) { if (e.code === 'KeyL') setHeld(false); });
})();
