// TICKET EXCHANGE kiosk in the centre of room 1: USE -> camera zooms onto the screen + keypad, buy tickets with pretend cash
// ($1 = 10, $5 = 60, $10 = 150). After leaving the view the machine dispenses a gold ticket strip into its tray; PICK UP walks the
// monkey over, he bends down, pockets them and the tickets count up. Cash: $5, refilled to $5 every 24 h. Purchases persist.
import * as THREE from 'three';
const OFFERS = [[1, 10], [5, 60], [10, 150]], DAY = 864e5, CK = 'neonarcade.cash', PK = 'neonarcade.kioskPending';
export function setupKiosk({ room, camera, monkey, st, play, blockers }) {
  const now = () => (window.__kioskNow ? window.__kioskNow() : Date.now());
  // ---------- money ----------
  const C = (() => { try { const c = JSON.parse(localStorage.getItem(CK)); if (c && typeof c.bal === 'number') return c; } catch (e) {} return { bal: 5, at: now() }; })();
  const saveC = () => { try { localStorage.setItem(CK, JSON.stringify(C)); } catch (e) {} };
  function refill() { if (now() - C.at >= DAY) { if (C.bal < 5) C.bal = 5; C.at = now(); saveC(); return true; } return false; }   // no stacking: tops up to $5
  refill(); saveC();
  let pending = 0; try { pending = Math.max(0, parseInt(localStorage.getItem(PK), 10) || 0); } catch (e) {}
  const saveP = () => { try { localStorage.setItem(PK, String(pending)); } catch (e) {} };
  // ---------- 3D kiosk ----------
  const K = new THREE.Group(); K.name = 'ticketKiosk'; room.add(K);
  const W = 0.66, Hh = 1.5, D = 0.46;
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.32 });
  const char = new THREE.MeshStandardMaterial({ color: 0x1c1d22, metalness: 0.5, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); K.add(o); return o; };
  box(W, Hh, D, steel, 0, Hh / 2 + 0.04, 0);   // body
  box(W + 0.04, 0.04, D + 0.04, char, 0, 0.02, 0);   // plinth
  box(W - 0.06, Hh - 0.12, 0.02, char, 0, Hh / 2 + 0.06, D / 2 + 0.005);   // charcoal front panel
  for (const [w, h, x, y] of [[W - 0.04, 0.012, 0, Hh - 0.005], [W - 0.04, 0.012, 0, 0.14], [0.012, Hh - 0.15, -(W / 2 - 0.02), Hh / 2 + 0.07], [0.012, Hh - 0.15, W / 2 - 0.02, Hh / 2 + 0.07]]) box(w, h, 0.03, gold, x, y, D / 2 + 0.012);   // gold trim
  // front face art (sign, screen, card pad, bills / coins, keypad, chute) on one canvas
  const fc = document.createElement('canvas'); fc.width = 512; fc.height = 1100; const fg = fc.getContext('2d');
  const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace; ftex.anisotropy = 4;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, Hh - 0.16), new THREE.MeshStandardMaterial({ map: ftex, emissiveMap: ftex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.45, metalness: 0.2 }));
  face.position.set(0, Hh / 2 + 0.06, D / 2 + 0.017); K.add(face);
  const PX = (W - 0.08) / 512;   // metres per canvas px; canvas y -> local y
  const ly = y => Hh / 2 + 0.06 + (Hh - 0.16) / 2 - y * (Hh - 0.16) / 1100;
  const S = { sel: -1, entry: '', msg: '' };
  function rr(x, y, w, h, r) { fg.beginPath(); fg.roundRect(x, y, w, h, r); }
  function drawFace() { const g = fg; g.fillStyle = '#1c1d22'; g.fillRect(0, 0, 512, 1100);
    // sign
    rr(20, 16, 472, 104, 12); g.fillStyle = '#0b0b0d'; g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 4; g.stroke();
    try { TicketArt.monkey(g, 78, 68, 30); } catch (e) {}
    g.fillStyle = '#ffd98a'; g.shadowColor = '#ffb000'; g.shadowBlur = 12; g.font = '900 44px Impact, Arial Black, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('TICKET EXCHANGE', 120, 70); g.shadowBlur = 0;
    // screen
    rr(46, 150, 420, 270, 12); g.fillStyle = '#05070c'; g.fill(); g.strokeStyle = '#333'; g.lineWidth = 8; g.stroke();
    rr(60, 164, 392, 242, 6); g.fillStyle = '#0c1424'; g.fill();
    g.font = '700 34px Arial, sans-serif'; g.textAlign = 'left';
    OFFERS.forEach(([d, t], i) => { const y = 200 + i * 74, can = C.bal >= d;
      if (S.sel === i) { g.fillStyle = '#2f6cff55'; g.fillRect(64, y - 30, 384, 62); }
      g.fillStyle = can ? '#ffffff' : '#5a6070'; g.fillText('$' + d + ' = ' + t + ' TICKETS', 84, y + 2);
      if (i < 2) { g.fillStyle = '#ffffff33'; g.fillRect(80, y + 36, 352, 2); } });
    g.font = '700 18px Arial'; g.fillStyle = '#9fd6ff'; g.textAlign = 'right'; g.fillText('CASH $' + C.bal + (S.entry ? '   ENTER $' + S.entry : '') + (S.msg ? '   ' + S.msg : ''), 444, 398);
    // card pad
    rr(186, 446, 140, 72, 10); g.fillStyle = '#121216'; g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 4; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(256, 494, 14 + k * 10, -2.3, -0.84); g.stroke(); }
    // bills / coins
    for (const [x, lbl] of [[40, 'BILLS'], [282, 'COINS']]) { rr(x, 545, 190, 96, 10); g.fillStyle = '#26272d'; g.fill(); g.strokeStyle = '#3a3b42'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#c8ccd4'; g.font = '700 18px Arial'; g.textAlign = 'center'; g.fillText(lbl, x + 95, 566); }
    g.fillStyle = '#0a0a0a'; g.fillRect(70, 590, 130, 26); g.fillStyle = '#3cff7a'; g.shadowColor = '#3cff7a'; g.shadowBlur = 10; g.fillRect(84, 600, 102, 5); g.shadowBlur = 0;
    g.fillStyle = '#b8bcc4'; g.beginPath(); g.arc(377, 603, 22, 0, 7); g.fill(); g.fillStyle = '#222'; g.fillRect(374, 586, 6, 34);
    // keypad
    rr(146, 664, 220, 256, 10); g.fillStyle = '#2a2b31'; g.fill();
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    keys.forEach((k, i) => { const x = 160 + (i % 3) * 66, y = 676 + Math.floor(i / 3) * 60; rr(x, y, 58, 50, 7); g.fillStyle = '#c3c7cf'; g.fill(); g.fillStyle = '#1a1a1a'; g.font = '700 28px Arial'; g.textAlign = 'center'; g.fillText(k, x + 29, y + 27); });
    // chute
    rr(70, 950, 372, 70, 8); g.fillStyle = '#0d0d10'; g.fill(); g.strokeStyle = '#3a3b42'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#000'; g.fillRect(100, 976, 312, 18);
    ftex.needsUpdate = true; }
  drawFace();
  // steel tray
  const tray = new THREE.Group(); tray.position.set(0, ly(1040) - 0.02, D / 2 + 0.11); K.add(tray);
  const tm = steel;
  const tb = (w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tm); o.position.set(x, y, z); tray.add(o); };
  tb(0.46, 0.012, 0.2, 0, 0, 0); tb(0.46, 0.06, 0.012, 0, 0.03, 0.1); tb(0.012, 0.06, 0.2, -0.23, 0.03, 0); tb(0.012, 0.06, 0.2, 0.23, 0.03, 0);
  // ticket strip (two columns of gold monkey tickets) pouring from the chute into the tray
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 512; { const g = sc.getContext('2d');
    for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) { g.save(); g.translate(c * 128 + 4, r * 85 + 2); try { TicketArt.paint(g, 120, 80, false); } catch (e) { g.fillStyle = '#e8c45a'; g.fillRect(0, 0, 120, 80); } g.restore(); } }
  const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace; stex.wrapT = THREE.RepeatWrapping;
  const strip = new THREE.Group(); K.add(strip); strip.visible = false;
  const sm = new THREE.MeshStandardMaterial({ map: stex, emissiveMap: stex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide });
  const hang = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1), sm); hang.position.set(0, 0, 0); strip.add(hang);
  const pile = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), sm.clone()); pile.rotation.x = -Math.PI / 2 + 0.25; pile.position.set(0, tray.position.y + 0.025, tray.position.z + 0.01); strip.add(pile);
  const yTop = ly(985), yTray = tray.position.y + 0.02;
  function setStrip(k) {   // k 0..1 dispense progress
    strip.visible = k > 0; const len = Math.max(0.001, (yTop - yTray) * Math.min(1, k * 1.4)); hang.scale.set(1, len, 1); hang.position.set(0, yTop - len / 2, D / 2 + 0.03 + 0.06 * Math.min(1, k * 1.4)); hang.rotation.x = -0.25;
    stex.repeat.set(1, len / 0.3); pile.visible = k > 0.55; pile.scale.setScalar(Math.min(1, (k - 0.55) / 0.45 + 0.01)); }
  // place: centre of room 1, front faces the spawn (+z)
  K.position.set(0, 0, 0); K.updateMatrixWorld(true);
  blockers.push({ minX: -W / 2 - 0.02, maxX: W / 2 + 0.02, minZ: -D / 2 - 0.02, maxZ: D / 2 + 0.25, kind: 'kiosk' });
  const FRONT = new THREE.Vector3(0, 0, D / 2 + 0.75);
  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const bUse = $('bUse'), kv = $('kview'), cash = $('cash'), bPick = $('bPick');
  const K_ = window.__kiosk = { K, C, get pending() { return pending; }, mode: 'walk', near: false, buys: 0, pocketed: 0, dispK: 0, refill, offers: OFFERS };
  function showCash() { refill(); const left = C.at + DAY - now(); cash.innerHTML = '<b>$' + C.bal + '</b>' + (C.bal < 5 ? '<small>+$' + (5 - C.bal) + ' in ' + Math.floor(left / 36e5) + 'h ' + String(Math.floor(left % 36e5 / 6e4)).padStart(2, '0') + 'm</small>' : ''); }
  K_.showCash = showCash; K_.addCash = d => { C.bal = d === 0 ? 5 : Math.max(0, C.bal + d); saveC(); showCash(); drawFace(); renderView(); };
  function renderView() { kv.querySelectorAll('.kOff').forEach((b, i) => { b.classList.toggle('dis', C.bal < OFFERS[i][0]); b.classList.toggle('sel', S.sel === i); });
    $('kInfo').textContent = S.msg || (S.entry ? 'ENTER $' + S.entry + '  ·  # TO BUY' : 'CASH $' + C.bal + (pending ? '  ·  ' + pending + ' 🎟 TO DISPENSE' : '')); }
  function buy(i) { const [d, t] = OFFERS[i]; if (C.bal < d) { S.msg = 'NOT ENOUGH CASH'; kv.classList.remove('shake'); void kv.offsetWidth; kv.classList.add('shake'); renderView(); drawFace(); return false; }
    C.bal -= d; saveC(); pending += t; saveP(); K_.buys++; S.sel = i; S.msg = '+' + t + ' TICKETS'; S.entry = ''; showCash(); drawFace(); renderView(); beep(880); setTimeout(() => beep(1320), 90); return true; }
  K_.buy = buy;
  function key(k) { S.msg = ''; if (/\d/.test(k)) S.entry = (S.entry + k).slice(-2); else if (k === '*') S.entry = ''; else if (k === '#') { const i = OFFERS.findIndex(o => String(o[0]) === S.entry); if (i < 0) { S.msg = 'CHOOSE $1, $5 OR $10'; S.entry = ''; } else return buy(i); }
    beep(660); drawFace(); renderView(); }
  K_.key = key;
  let ac = null; function beep(f) { try { ac = ac || window.__unlockAC || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.14); } catch (e) {} }
  const sw = e => e.stopPropagation();
  for (const el of [bUse, kv, bPick, cash]) { el.addEventListener('pointerdown', sw); el.addEventListener('touchstart', sw, { passive: true }); }
  bUse.addEventListener('click', e => { sw(e); open(); });
  bPick.addEventListener('click', e => { sw(e); pickUp(); });
  kv.querySelectorAll('.kOff').forEach((b, i) => b.addEventListener('click', e => { sw(e); buy(i); }));
  kv.querySelectorAll('.kKey').forEach(b => b.addEventListener('click', e => { sw(e); key(b.dataset.k); }));
  $('kX').addEventListener('click', e => { sw(e); close(); });
  addEventListener('keydown', e => { if (document.getElementById('start')) return;
    if (K_.mode === 'view') { e.stopImmediatePropagation(); if (e.code === 'Escape') close(); else if (/^Digit\d$|^Numpad\d$/.test(e.code)) key(e.code.slice(-1)); else if (e.key === '#' || e.key === '*') key(e.key); else if (e.code === 'Enter' || e.code === 'NumpadEnter') key('#'); return; }
    if (K_.mode === 'walk' && K_.near && !e.repeat && /^(KeyE|Enter|Space)$/.test(e.code)) { e.stopImmediatePropagation(); if (K_.dispK >= 1 && pending) pickUp(); else open(); } }, true);
  // ---------- view / camera ----------
  const v0 = new THREE.Vector3(), l0 = new THREE.Vector3(), vT = new THREE.Vector3(0, ly(560), D / 2 + 1.05), lT = new THREE.Vector3(0, ly(560), 0);
  let t = 0, from = null;
  function open() { if (K_.mode !== 'walk' || play.mode !== 'walk') return; K_.mode = 'zoomIn'; t = 0; v0.copy(camera.position); camera.getWorldDirection(l0).multiplyScalar(3).add(camera.position); S.sel = -1; S.entry = ''; S.msg = ''; bUse.classList.remove('on'); K_.opens = (K_.opens || 0) + 1; }
  function close() { if (K_.mode !== 'view') return; kv.classList.remove('on'); K_.mode = 'zoomOut'; t = 0; S.msg = ''; drawFace(); }
  K_.open = open; K_.close = close;
  function pickUp() { if (K_.mode !== 'walk' || !pending || K_.dispK < 1) return; K_.mode = 'pick'; t = 0; from = monkey.position.clone(); bPick.classList.remove('on'); K_.picks = (K_.picks || 0) + 1; }
  K_.pickUp = pickUp; Object.defineProperty(K_, 'pt', { get: () => t }); Object.defineProperty(K_, 'counting', { get: () => !!count });
  if (pending) K_.dispK = 1, setStrip(1);
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, lk = new THREE.Vector3();
  let cashT = 0, count = null;
  K_.update = dt => {
    cashT -= dt; if (cashT <= 0) { cashT = 1; const b = C.bal; showCash(); if (b !== C.bal) drawFace(); }
    const onStart = !!document.getElementById('start'); cash.classList.toggle('on', !onStart && play.mode === 'walk');
    if (onStart && K_.mode === 'view') { kv.classList.remove('on'); K_.mode = 'walk'; }
    // dispensing (after leaving the view)
    if (K_.mode === 'walk' && pending && K_.dispK < 1) { K_.dispK = Math.min(1, K_.dispK + dt / 1.8); setStrip(K_.dispK); if (Math.random() < dt * 20) beep(1800 + Math.random() * 400); }
    const d = Math.hypot(monkey.position.x - FRONT.x, monkey.position.z - FRONT.z);
    K_.near = K_.mode === 'walk' && play.mode === 'walk' && !onStart && d < 1.1;
    bUse.classList.toggle('on', K_.near && !(pending && K_.dispK >= 1));
    bPick.classList.toggle('on', K_.mode === 'walk' && play.mode === 'walk' && !onStart && pending > 0 && K_.dispK >= 1 && d < 3.2);
    if (count) { count.t -= dt; while (count.t <= 0 && count.left > 0) { count.t += Math.max(0.012, 1.2 / count.n); count.left--; play.addTickets(1); } if (count.left <= 0) count = null; }
    if (K_.mode === 'zoomIn' || K_.mode === 'zoomOut') {
      t = Math.min(1, t + dt / (K_.mode === 'zoomIn' ? 1.1 : 0.9)); const k = ease(t), a = K_.mode === 'zoomIn' ? k : 1 - k;
      camera.position.lerpVectors(v0, vT, a); lk.lerpVectors(l0, lT, a); camera.lookAt(lk); monkey.visible = a < 0.6;
      if (t >= 1) { if (K_.mode === 'zoomIn') { K_.mode = 'view'; kv.classList.add('on'); renderView(); } else { K_.mode = 'walk'; monkey.visible = true; st.camInit = false; } }
      return true; }
    if (K_.mode === 'view') { camera.position.copy(vT); camera.lookAt(lT); monkey.visible = false; return true; }
    if (K_.mode === 'pick') {   // walk to the tray, bend, pocket
      t += dt; const w = Math.min(1, t / 0.8), tgt = FRONT.clone().setZ(D / 2 + 0.5);
      if (t < 0.8) { monkey.position.lerpVectors(from, tgt, ease(w)); st.face = Math.atan2(tgt.x - from.x, tgt.z - from.z) || Math.PI; }
      else { st.face += (Math.atan2(Math.sin(Math.PI - st.face), Math.cos(Math.PI - st.face))) * Math.min(1, dt * 10); }
      const bend = t < 0.9 ? 0 : t < 1.4 ? (t - 0.9) / 0.5 : t < 2.0 ? 1 : t < 2.5 ? 1 - (t - 2.0) / 0.5 : 0;
      monkey.rotation.set(0, st.face, 0); monkey.position.y = 0;
      const u = monkey.userData, R = u.arms && u.arms.find(q => q.sd < 0) || (u.arms && u.arms[0]), Lf = u.arms && u.arms.find(q => q !== R);
      if (u.hips) { // new avatar rig: walk cycle on approach, bend at the waist + knees, reach into the tray with one hand, tuck it in the jeans pocket
        const ws = t < 0.8 ? Math.sin(t * 14) * 0.5 * (1 - w * 0.6) : 0;
        u.legs[0].leg.rotation.x = ws - bend * 0.5; u.legs[1].leg.rotation.x = -ws - bend * 0.5; u.legs[0].knee.rotation.x = u.legs[1].knee.rotation.x = bend * 0.9 + Math.abs(ws) * 0.4;
        u.hips.position.y = 0.8 - bend * 0.14; u.torso.rotation.set(0.06 + bend * 0.75, 0, 0); u.neck.rotation.x = -bend * 0.35;
        const reach = t < 0.9 ? 0 : t < 1.5 ? (t - 0.9) / 0.6 : t < 1.75 ? 1 : 0, pocket = t < 1.75 ? 0 : t < 2.15 ? (t - 1.75) / 0.4 : t < 2.45 ? 1 : Math.max(0, 1 - (t - 2.45) / 0.15);
        if (R) { R.sh.rotation.set(-1.25 * reach + 0.35 * pocket - ws * 0.8, 0, 0.1 * R.sd + 0.25 * R.sd * pocket); R.el.rotation.set(-0.35 * reach - 1.1 * pocket, 0, 0); }
        if (Lf) { Lf.sh.rotation.set(ws * 0.8 - 0.3 * bend, 0, 0.12 * Lf.sd); Lf.el.rotation.set(-0.3, 0, 0); }
      } else { monkey.rotation.set(bend * 0.55, st.face, 0); monkey.position.y = -bend * 0.12; }
      if (t > 1.5 && strip.visible) { strip.visible = false; }
      if (t > 1.7 && pending) { const n = pending; pending = 0; saveP(); K_.pocketed += n; K_.dispK = 0; count = { n, left: n, t: 0 }; }
      if (t > 2.6) { monkey.rotation.set(0, st.face, 0); monkey.position.y = 0; if (st.vel) st.vel.set(0, 0, 0); K_.mode = 'walk'; }
      camera.lookAt(monkey.position.x, 0.9, monkey.position.z); return true; }  // movement locked while pocketing
    return false; };
  showCash(); return K_;
}
