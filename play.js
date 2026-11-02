// PLAY mode for the STRIKE and GHOST 256 cabinets: PLAY prompt, zoom into the game's DEMO (INSERT CREDIT; 1 ticket = 1 credit; tap to play), zoom through the monkey into the screen,
// then a full-screen playable copy. Credits are tracked per machine; a machine with 0 credits cannot be played.
import * as THREE from 'three';
// rune-marked bronze/silver ticket with a horned Viking helmet (drawn, no image file); cw = CSS width
export function vikingArt(cv, cw) {
  const d = Math.min(3, window.devicePixelRatio || 1), ch = Math.round(cw * 0.62); cv.width = Math.round(cw * d); cv.height = Math.round(ch * d); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); const w = cw, h = ch, r = h * 0.14;
  const path = () => { g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.arc(w, 0, r, Math.PI, Math.PI / 2, true); g.lineTo(w, h / 2 - r * 0.8); g.arc(w, h / 2, r * 0.8, -Math.PI / 2, Math.PI / 2, true); g.lineTo(w, h - r); g.arc(w, h, r, -Math.PI / 2, Math.PI, true);
    g.lineTo(r, h); g.arc(0, h, r, 0, -Math.PI / 2, true); g.lineTo(0, h / 2 + r * 0.8); g.arc(0, h / 2, r * 0.8, Math.PI / 2, -Math.PI / 2, true); g.lineTo(0, r); g.arc(0, 0, r, Math.PI / 2, 0, true); g.closePath(); };
  path(); const bz = g.createLinearGradient(0, 0, w, h); bz.addColorStop(0, '#e9c48a'); bz.addColorStop(0.35, '#a8692e'); bz.addColorStop(0.6, '#d8e0e8'); bz.addColorStop(1, '#7a4a20'); g.fillStyle = bz; g.fill();
  g.save(); path(); g.clip(); g.strokeStyle = 'rgba(40,20,5,.55)'; g.lineWidth = Math.max(1, w * 0.012); g.setLineDash([w * 0.02, w * 0.015]); g.strokeRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84); g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.45, 0); g.lineTo(w * 0.2, h); g.lineTo(0, h); g.fill(); g.restore();
  const cx = w * 0.5, cy = h * 0.5, s = h * 0.3;   // helmet
  g.fillStyle = '#eadfc8'; g.strokeStyle = '#3a2410'; g.lineWidth = Math.max(1, s * 0.06);
  for (const k of [-1, 1]) { g.beginPath(); g.moveTo(cx + k * s * 0.75, cy - s * 0.05); g.quadraticCurveTo(cx + k * s * 1.45, cy - s * 0.3, cx + k * s * 1.25, cy - s * 1.05); g.quadraticCurveTo(cx + k * s * 1.15, cy - s * 0.5, cx + k * s * 0.7, cy - s * 0.35); g.closePath(); g.fill(); g.stroke(); }
  const hg = g.createLinearGradient(cx - s, cy - s, cx + s, cy + s); hg.addColorStop(0, '#f2f4f6'); hg.addColorStop(1, '#7c8590'); g.fillStyle = hg;
  g.beginPath(); g.arc(cx, cy + s * 0.05, s * 0.8, Math.PI, 0); g.lineTo(cx + s * 0.8, cy + s * 0.35); g.lineTo(cx - s * 0.8, cy + s * 0.35); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#b07a3a'; g.fillRect(cx - s * 0.85, cy + s * 0.2, s * 1.7, s * 0.22); g.strokeRect(cx - s * 0.85, cy + s * 0.2, s * 1.7, s * 0.22);
  g.fillRect(cx - s * 0.1, cy + s * 0.2, s * 0.2, s * 0.6); g.strokeRect(cx - s * 0.1, cy + s * 0.2, s * 0.2, s * 0.6);
  g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = `bold ${Math.round(h * 0.12)}px Georgia, serif`; g.fillText('ᚢ ᛁ ᚲ ᛁ ᛜ', cx, h * 0.2);
  g.font = `900 ${Math.round(h * 0.11)}px 'Courier New', monospace`; g.fillText('VIKING TICKET', cx, h * 0.9);
  g.font = `bold ${Math.round(h * 0.13)}px Georgia, serif`; g.fillText('ᛟ', w * 0.14, cy + h * 0.05); g.fillText('ᛟ', w * 0.86, cy + h * 0.05);
  return cv;
}
export function setupPlay(A) {
  const { camera, monkey, st } = A;
  const ui = document.getElementById('playUI'), bPlay = document.getElementById('bPlay'), credit = document.getElementById('credit'), hint = document.getElementById('hint');
  const bExit = document.getElementById('bExit'), over = document.getElementById('over');
  const demoUI = document.getElementById('demoUI'), dInsert = document.getElementById('dInsert'), dCredit = document.getElementById('dCredit'), bTicket = document.getElementById('bTicket');
  const coarse = matchMedia('(pointer:coarse)').matches;
  const MACHINES = {
    strike: { key: 'strike', cab: A.strikeCab, src: 'strike-play/index.html', credits: 0, games: 0, aspect: 9 / 16,
      start(w) { const S = w.STRIKE; S.start(0); S.G.credits = 0; },
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); if (w.__board) w.__board.stop(); }, board(w) { if (w.__board) w.__board.start(); },   // credit loaded: live WORLD TOP 10;: one credit = one game
      scene(w) { const sc = w.STRIKE.G.scene; return sc === 'play' || sc === 'pause' ? 'play' : sc === 'gameover' ? 'over' : sc === 'entry' ? 'entry' : sc === 'scores' ? 'scores' : sc === 'title' ? 'title' : sc; },
      active(w) { return w.STRIKE.G.scene === 'play'; },
      hold(w) { if (w.STRIKE.G.scene !== 'play') return false; w.pauseGame(); return true; }, unhold(w) { if (w.STRIKE.G.scene === 'pause') w.resumeGame(); }, overHold: 0, scoresHold: 6000 },
    ghost: { key: 'ghost', cab: A.ghostCab, src: 'ghost-play/index.html', credits: 0, games: 0, aspect: 152 / 276,
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { const g = w.__ghost; g.G.muted = false; try { g.Snd.setMuted(false); g.Snd.unlock && g.Snd.unlock(); } catch (e) {} g.startGame(); },
      scene(w) { const s = w.__ghost.G.state; return s === 'play' || s === 'dying' || s === 'pause' ? 'play' : s === 'over' ? 'over' : s; },
      active(w) { return w.__ghost.G.state === 'play'; },
      hold(w) { const s = w.__ghost.G.state; if (s !== 'play' && s !== 'dying') return false; w.__ghost.togglePause(); return true; }, unhold(w) { if (w.__ghost.G.state === 'pause') w.__ghost.togglePause(); }, overHold: 4500, scoresHold: 0 },
    monkey: { key: 'monkey', cab: A.monkeyCab, src: 'monkey-play/index.html', credits: 0, games: 0, aspect: 9 / 16,
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__HOLD = 0; w.__M.startGame(); },
      scene(w) { return w.__M.state; }, active(w) { return w.__M.state === 'play'; },
      hold(w) { if (w.__M.state !== 'play') return false; w.__HOLD = 1; return true; }, unhold(w) { w.__HOLD = 0; }, overHold: 3500, scoresHold: 0 },
    berserker: { key: 'berserker', cab: A.berserkerCab, src: 'berserker-play/index.html', credits: 0, games: 0, aspect: 9 / 16, cost: 5,   // 5 tickets = 1 credit = the whole run incl. 3 continues
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__bz.start(); },
      scene(w) { const s = w.__B.G().state; return s === 'dead' || s === 'win' ? 'over' : s === 'title' ? 'title' : 'play'; },
      active(w) { return w.__B.G().state === 'play'; },
      hold(w) { if (w.__B.G().state !== 'play') return false; w.togglePause(); return true; }, unhold(w) { if (w.__B.G().state === 'pause') w.togglePause(); }, overHold: 5000, scoresHold: 0 },
    orc: { key: 'orc', cab: A.orcCab, src: 'orc-play/index.html', credits: 0, games: 0, aspect: (A.orcCab && A.orcCab.userData.aspect) || 4 / 3, cost: 3,   // 3 tickets = 1 credit = the whole run
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__orc.start(); },
      scene(w) { if (w.__orcAdv) return 'play'; const s = w.__TD.G.state; return s === 'lost' || s === 'won' ? 'over' : s === 'title' ? 'title' : 'play'; },
      active(w) { return !!w.__TD && w.__TD.G.state === 'play'; },
      hold(w) { if (!w.__TD) return false; const G = w.__TD.G; if (G.state !== 'play' || G.paused) return false; G.paused = true; return true; }, unhold(w) { if (w.__TD) w.__TD.G.paused = false; }, overHold: 5000, scoresHold: 0 },
    nova: { key: 'nova', cab: A.novaCab, src: 'nova-play/index.html', credits: 0, games: 0, aspect: (A.novaCab && A.novaCab.userData.aspect) || 16 / 9, cost: 2,   // 2 tickets = 1 credit = one run
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__nova.start(); },
      scene(w) { const m = w.NV.G.mode; return m === 'over' ? 'over' : m === 'title' ? 'title' : 'play'; },
      active(w) { return w.NV.G.mode === 'play'; },
      hold(w) { const G = w.NV.G; if (G.mode !== 'play') return false; G.mode = 'pause'; return true; }, unhold(w) { const G = w.NV.G; if (G.mode === 'pause') G.mode = 'play'; }, overHold: 4500, scoresHold: 0 },
  };
  const P = { need: 0, sub: null, demoReturns: 0, plays: 0, mode: 'walk', t: 0, frame: null, zooms: 0, coinSfx: 0, blocked: 0, cur: null, machines: MACHINES };
  const TKEY = 'neonarcade.tickets', tixEl = document.getElementById('tix'), dCost = document.getElementById('dCost');
  function toast(msg) { const d = document.createElement('div'); d.className = 'ntoast'; d.textContent = msg; document.body.appendChild(d); P.lastToast = msg; setTimeout(() => d.remove(), 2200); }
  const T = { total: 0, got: 0 };
  const saveT = () => { try { localStorage.setItem(TKEY, String(T.total)); } catch (e) {} };
  try { const v = localStorage.getItem(TKEY); if (v === null) { T.total = 1; saveT(); } else T.total = Math.max(0, parseInt(v, 10) || 0); } catch (e) { T.total = 1; }   // a new player starts with 1 ticket
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let curve = null, look0 = new THREE.Vector3(), look1 = new THREE.Vector3(), ac = null, near = null, coinLock = 0;
  function coinSound() { P.coinSfx++; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    for (const [f, d] of [[988, 0], [1319, 0.08]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.35); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 0.4); } } catch (e) {} }
  const costOf = m => m.cost || 1;
  function refresh() { const m = near || MACHINES.strike;   // the room prompt: always PLAY (zooms into the demo)
    bPlay.textContent = 'PLAY'; credit.textContent = (costOf(m) > 1 ? costOf(m) + ' TICKETS TO PLAY  ·  ' : '') + 'CREDIT ' + m.credits + '  ·  YOU HAVE ' + T.total + ' 🎟';
    hint.textContent = coarse ? 'TAP TO PLAY' : 'ENTER / E / SPACE'; }
  function demoRefresh() { const m = P.cur; if (!m) return; const c = costOf(m), has = T.total >= c;
    dInsert.textContent = m.credits > 0 ? (coarse ? 'TAP TO PLAY' : 'TAP / ENTER TO PLAY') : 'INSERT CREDIT'; dInsert.classList.toggle('ready', m.credits > 0);
    dCredit.textContent = 'CREDIT ' + m.credits + '  ·  ' + T.total + ' 🎟';
    bTicket.textContent = has ? (c > 1 ? 'INSERT ' + c + ' TICKETS · ' + c + ' 🎟' : 'INSERT TICKET · 1 🎟') : (c > 1 ? 'NEED ' + c + ' TICKETS' : 'NEED A TICKET'); bTicket.classList.toggle('need', !has);
    const dTag = document.getElementById('dTag'); if (dTag) dTag.style.visibility = m.credits > 0 && m.board ? 'hidden' : '';   // the live board is not a demo
    dCost.textContent = c > 1 ? c + ' TICKETS TO PLAY' : ''; dCost.style.display = c > 1 ? '' : 'none'; }
  function buzz() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(110, t + 0.18); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.25); } catch (e) {} }
  const shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  function insertTicket() {   // demo view button: 1 ticket -> 1 credit
    const m = P.cur, now = performance.now();
    if (P.mode !== 'game' || P.sub !== 'demo' || !m || TV.open || now < coinLock) { P.blocked++; return; }
    const c = costOf(m);
    if (T.total < c) { P.need++; demoRefresh(); shake(bTicket); buzz(); toast('NEED ' + c + ' TICKETS · YOU HAVE ' + T.total); return; }
    T.total -= c; saveT(); m.credits += 1; if (m.credits === 1 && m.board && P.frame) try { m.board(P.frame.contentWindow); } catch (e) {} coinLock = now + 350; coinSound(); showTix(); demoRefresh(); bTicket.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 220); }
  function tryPlay() {   // a tap / click / Enter / Space on the demo screen
    const m = P.cur;
    if (P.mode !== 'game' || P.sub !== 'demo' || !m || TV.open || !P.frame) { P.blocked++; return; }
    if (m.credits < 1) { P.need++; shake(dInsert); buzz(); return; }
    const w = P.frame.contentWindow; m.credits -= 1; m.games++; P.plays++;
    try { m.stopDemo(w); m.start(w); } catch (e) { console.warn('game start', e); }
    P.sub = 'play'; P.over = false; P.goShown = false; clearTimeout(P.holdT); P.holdT = 0; demoUI.classList.remove('on'); try { P.frame.focus(); w.focus(); } catch (e) {} showTix(); }
  function idle(m, w) { if (m.credits > 0 && m.board) m.board(w); else m.demo(w); }   // credit waiting -> machine's board (STRIKE: live high scores), else attract demo
  function toDemo(why) {   // after game over (and the score screens) -> back to the demo, not the room
    const m = P.cur, f = P.frame; if (!m || !f) return; clearTimeout(P.holdT); P.holdT = 0; over.style.display = 'none';
    P.sub = 'demo'; P.over = false; P.goShown = false; P.demoReturns++; P.lastDemo = why;
    try { idle(m, f.contentWindow); } catch (e) { console.warn('demo', e); } demoRefresh(); demoUI.classList.add('on'); }
  function screenInfo(m) { const s = m.cab.userData.screen; s.geometry.computeBoundingBox(); const c = s.geometry.boundingBox.getCenter(new THREE.Vector3()); s.localToWorld(c);
    const sz = s.geometry.boundingBox.getSize(new THREE.Vector3()), h = Math.hypot(sz.x, sz.y) * m.cab.scale.y; return { c, h }; }
  function endPos(m) { // camera spot where the portrait screen fills the view
    const { c, h } = screenInfo(m), w = h * m.aspect, n = m.cab.userData.inward, nrm = new THREE.Vector3(n.x * 0.96, 0.28, n.z * 0.96).normalize();
    const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const dist = Math.min(h / 2 / Math.tan(vf / 2), w / 2 / Math.tan(hf / 2)) * 0.9;
    return { p: c.clone().addScaledVector(nrm, Math.max(0.08, dist)), c }; }
  // the only entry point for a press (button, tap, Enter/E/Space)
  function press() {
    if (TV.open) { P.blocked++; return; }
    const m = near;
    if (P.mode !== 'walk' || !m || !ui.classList.contains('on')) { P.blocked++; return; }
    if (performance.now() < coinLock) { P.blocked++; return; }
    start(m);
  }
  function start(m) {
    if (P.mode !== 'walk') { P.blocked++; return; }
    P.cur = m; refresh(); ui.classList.remove('on');
    P.mode = 'zoomIn'; P.t = 0; P.zooms++;
    const head = monkey.position.clone().setY(1.25), e = endPos(m), mid = head.clone().lerp(e.p, 0.35);
    P.target = e.c; P.end = e.p; curve = new THREE.CatmullRomCurve3([camera.position.clone(), head, mid, e.p]); look0.copy(head); look1.copy(e.c);
    const f = P.frame = document.createElement('iframe'); f.id = 'game'; f.src = m.src; f.allow = 'autoplay; fullscreen'; f.title = m.cab.name;
    f.addEventListener('load', () => { P.loaded = true; try { f.contentWindow.addEventListener('keydown', ev => { if (TV.open) { ev.stopImmediatePropagation(); ev.preventDefault(); if (ev.code === 'Escape') closeView(); return; } if (ev.code === 'Escape') { ev.stopImmediatePropagation(); ev.preventDefault(); exit('esc'); return; } if (P.sub === 'demo') { ev.stopImmediatePropagation(); ev.preventDefault(); if (/^(Enter|Space|KeyE)$/.test(ev.code) && !ev.repeat) tryPlay(); } }, true); } catch (e) {} });
    P.loaded = false; document.body.appendChild(f);
  }
  function launch() {
    const f = P.frame, m = P.cur; P.mode = 'game'; P.over = false; P.goShown = false; clearTimeout(P.holdT); P.holdT = 0; P.scene = null;
    const go = () => { P.sub = 'demo'; try { idle(m, f.contentWindow); } catch (e) { console.warn('demo start', e); } demoRefresh(); demoUI.classList.add('on'); f.classList.add('on'); bExit.style.display = 'block'; f.focus(); try { f.contentWindow.focus(); } catch (e) {}
      A.pause(true); P.poll = setInterval(poll, 200); showTix(); };
    if (P.loaded) go(); else f.addEventListener('load', go, { once: true });
  }
  function poll() { // game over -> its own score / high-score screen -> back out to the arcade
    if (P.mode !== 'game' || P.over || P.sub !== 'play') return; const m = P.cur; let sc; try { sc = m.scene(P.frame.contentWindow); } catch (e) { return; }
    P.scene = sc;
    if (sc === 'over' && !P.goShown) { P.goShown = true; over.style.display = 'flex'; setTimeout(() => over.style.display = 'none', 1500);
      if (m.overHold) P.holdT = setTimeout(() => toDemo('over'), m.overHold); }
    if (sc === 'scores' && !P.holdT) P.holdT = setTimeout(() => toDemo('scores'), m.scoresHold);
    if (sc === 'title') toDemo('title');
  }
  function exit(why) {
    if (P.mode !== 'game') return; clearInterval(P.poll); clearTimeout(P.holdT); P.holdT = 0; over.style.display = 'none';
    P.lastExit = why; P.sub = null; demoUI.classList.remove('on'); P.mode = 'zoomOut'; P.t = 0; bExit.style.display = 'none';
    const f = P.frame; f.classList.remove('on'); try { f.contentWindow.document.body.style.display = 'none'; } catch (e) {} setTimeout(() => f.remove(), 500); P.frame = null;
    const m = P.cur, back = monkey.position.clone().setY(1.25), out = back.clone().addScaledVector(m.cab.userData.inward, 2.6).setY(2.1);
    curve = new THREE.CatmullRomCurve3([camera.position.clone(), back.clone().lerp(camera.position, 0.4), back, out]); look0.copy(back); look1.copy(screenInfo(m).c);
    A.pause(false); window.focus(); showTix();
  }
  // ---- tickets: collected inside the games (gold monkey tickets), 1 each; no time-based payout ----
  const tixN = document.getElementById('tixN'), tview = document.getElementById('tview'), tvCv = document.getElementById('tvCv'), tvCount = document.getElementById('tvCount');
  try { TicketArt.toCanvas(document.getElementById('tixIco'), 30, false); const c = TicketArt.toCanvas(document.createElement('canvas'), 80, false); document.documentElement.style.setProperty('--tkimg', 'url(' + c.toDataURL() + ')'); } catch (e) {}
  const showTix = () => { tixN.textContent = String(T.total); if (P.mode === 'walk') refresh(); else demoRefresh(); tixEl.classList.toggle('ingame', P.mode === 'game'); document.body.classList.toggle('ingame', P.mode === 'game'); try { showVix(); } catch (e) {} };
  // ---- enlarged ticket view: tap/click the HUD counter; tap, click, Esc or ✕ closes. Pauses the arcade / game while open ----
  const TV = { open: false, opens: 0, heldGame: false, heldArcade: false };
  function openView(kind) {
    if (TV.open) return; TV.open = true; TV.opens++; TV.kind = kind === 'viking' ? 'viking' : 'gold';
    const side = Math.min(innerWidth, innerHeight), w = Math.round(Math.min(innerWidth * 0.92, side * 0.66));
    if (TV.kind === 'viking') { vikingArt(tvCv, w); tvCount.textContent = 'ᛟ ' + V.total + (V.total === 1 ? ' VIKING TICKET' : ' VIKING TICKETS'); }
    else { TicketArt.toCanvas(tvCv, w, true); tvCount.textContent = '🎟 ' + T.total + (T.total === 1 ? ' TICKET' : ' TICKETS'); }
    tview.classList.toggle('viking', TV.kind === 'viking'); tview.classList.add('on'); tview.setAttribute('aria-hidden', 'false');
    const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false;   // never carry a held key into / out of the view
    TV.heldGame = false; TV.heldArcade = false;
    if (P.mode === 'game' && P.frame) { try { TV.heldGame = P.cur.hold(P.frame.contentWindow); } catch (e) {} }
    else { A.pause(true); TV.heldArcade = true; }
  }
  function closeView() {
    if (!TV.open) return; TV.open = false; tview.classList.remove('on'); tview.setAttribute('aria-hidden', 'true');
    const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false;
    if (TV.heldGame && P.frame) { try { P.cur.unhold(P.frame.contentWindow); } catch (e) {} try { P.frame.focus(); } catch (e) {} }
    if (TV.heldArcade) A.pause(false); TV.heldGame = TV.heldArcade = false;
  }
  const swallow = e => e.stopPropagation();   // keeps the touch away from the joystick / camera drag
  tixEl.addEventListener('pointerdown', swallow); tixEl.addEventListener('touchstart', swallow, { passive: true });
  tixEl.addEventListener('click', e => { swallow(e); openView(); });
  tixEl.addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'Space') { swallow(e); e.stopImmediatePropagation(); openView(); } });
  tview.addEventListener('pointerdown', swallow); tview.addEventListener('touchstart', swallow, { passive: true });
  tview.addEventListener('click', e => { swallow(e); closeView(); });
  addEventListener('keydown', e => { if (!TV.open) return; e.stopImmediatePropagation(); e.preventDefault(); if (e.code === 'Escape') closeView(); }, true);   // Esc closes the view before it can quit a game
  P.view = TV; P.openView = openView; P.closeView = closeView;
  let tac = null;
  function ticketSound() { try { tac = tac || new (window.AudioContext || window.webkitAudioContext)(); const t = tac.currentTime;
    [1568, 2093, 2637].forEach((f, i) => { const o = tac.createOscillator(), g = tac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.09, t + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25); o.connect(g).connect(tac.destination); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.3); }); } catch (e) {} }
  function award(n, game) {   // called by the game iframe when the ship / ghost picks up a ticket
    if (P.mode !== 'game' || P.sub !== 'play' || !P.frame || !P.cur || (game && P.cur.key !== game)) return false;
    n = 1; T.total += n; T.got++; saveT(); showTix(); refresh(); demoRefresh(); ticketSound();
    const r = tixEl.getBoundingClientRect(), d = document.createElement('div'); d.className = 'tpop'; d.textContent = '+1 🎟'; d.style.left = (r.left + 4) + 'px'; d.style.top = (r.bottom + 4) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1500); return true; }
  window.__neonTicket = award;
  // ---- VIKING TICKET (from clearing BERSERKER Stage I): its own count, its own HUD chip and enlarged view; does nothing else yet ----
  const VKEY = 'neonarcade.vikingTickets', vixEl = document.getElementById('vix'), vixN = document.getElementById('vixN'), V = { total: 0, got: 0 };
  try { V.total = Math.max(0, parseInt(localStorage.getItem(VKEY), 10) || 0); } catch (e) {}
  const showVix = () => { vixN.textContent = String(V.total); vixEl.style.display = V.total > 0 ? '' : 'none'; vixEl.classList.toggle('ingame', P.mode === 'game'); try { const r = tixEl.getBoundingClientRect(); if (r.width) { vixEl.style.left = r.left + 'px'; vixEl.style.top = (r.bottom + 4) + 'px'; vixEl.style.minWidth = r.width + 'px'; } } catch (e) {} };   // tight under the gold ticket
  addEventListener('resize', () => setTimeout(showVix, 50));
  try { vikingArt(document.getElementById('vixIco'), 30); } catch (e) {}
  function vikingAward(game) {
    if (P.mode !== 'game' || P.sub !== 'play' || !P.frame || !P.cur || P.cur.key !== 'berserker' || (game && game !== 'berserker')) return false;
    V.total++; V.got++; try { localStorage.setItem(VKEY, String(V.total)); } catch (e) {} showVix(); ticketSound(); setTimeout(ticketSound, 180);
    const d = document.createElement('div'); d.className = 'vpop'; const c = document.createElement('canvas'); d.appendChild(c); const t = document.createElement('div'); t.textContent = 'VIKING TICKET!'; d.appendChild(t);
    vikingArt(c, Math.round(Math.min(innerWidth * 0.6, 300))); document.body.appendChild(d); setTimeout(() => d.remove(), 3200); return true; }
  window.__neonViking = vikingAward; P.vikingAward = vikingAward; P.viking = V; P.showVix = () => showVix(); P.refresh = () => refresh();
  vixEl.addEventListener('pointerdown', swallow); vixEl.addEventListener('touchstart', swallow, { passive: true });
  vixEl.addEventListener('click', e => { swallow(e); openView('viking'); });
  showVix();
  window.__neonSync = () => { try { T.total = Math.max(0, parseInt(localStorage.getItem(TKEY), 10) || 0); V.total = Math.max(0, parseInt(localStorage.getItem(VKEY), 10) || 0); } catch (e) {} showTix(); };
  P.award = award;
  P.spend = n => { if (T.total < n) return false; T.total -= n; saveT(); showTix(); if (TV.open) tvCount.textContent = '🎟 ' + T.total + (T.total === 1 ? ' TICKET' : ' TICKETS'); return true; };   // used by shield.js
  P.addTickets = n => { T.total += n; saveT(); showTix(); refresh(); ticketSound(); };
  P.tickets = T; showTix();
  bPlay.addEventListener('click', e => { e.stopPropagation(); press(); });
  ['pointerdown', 'touchstart'].forEach(t => ui.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bExit.addEventListener('click', () => exit('x'));
  // HUD home button: confirm, then leave any cabinet game / demo and show the start screen again (credits, tickets, floor kept)
  const homeQ = document.getElementById('homeQ'), homeN = document.getElementById('homeN');
  const homeAsk = on => { homeQ.classList.toggle('on', on); homeQ.setAttribute('aria-hidden', on ? 'false' : 'true'); P.homeAsk = on;
    if (on) { const m = P.cur, inGame = P.mode === 'game' && P.sub === 'play';
      homeN.textContent = inGame ? 'THE CURRENT GAME WILL END.' : (P.mode === 'game' && m && m.credits > 0 ? 'YOUR UNUSED CREDIT STAYS ON THIS MACHINE.' : ''); } };
  const goHome = () => { homeAsk(false); P.homes = (P.homes || 0) + 1; if (P.mode === 'game') { exit('home'); P.t = 1; } try { if (TV.open) closeView(); } catch (e) {}
    try { for (const c in A.keys) A.keys[c] = false; } catch (e) {} if (window.__startUI && window.__startUI.show) window.__startUI.show(); };
  P.home = { ask: homeAsk, go: goHome };
  for (const [id, fn] of [['homeYes', goHome], ['homeNo', () => homeAsk(false)]]) {
    const b = document.getElementById(id); b.addEventListener('pointerdown', swallow); b.addEventListener('touchstart', swallow, { passive: true }); b.addEventListener('click', e => { swallow(e); fn(); }); }
  homeQ.addEventListener('pointerdown', swallow); homeQ.addEventListener('click', e => { if (e.target === homeQ) homeAsk(false); });
  ['pointerdown', 'touchstart'].forEach(t => demoUI.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bTicket.addEventListener('click', e => { e.stopPropagation(); insertTicket(); });   // not a screen tap
  demoUI.addEventListener('click', e => { if (e.target === bTicket) return; tryPlay(); });
  addEventListener('keydown', e => { if (TV.open) return; if (/^(Enter|KeyE|Space)$/.test(e.code)) { if (!e.repeat) { if (P.mode === 'game' && P.sub === 'demo') tryPlay(); else press(); } } if (e.code === 'Escape') exit('esc'); });
  // called every arcade frame; returns true when it owns the camera
  P.update = (dt, nearCab) => {
    const m = P.mode === 'walk' && !st.fp ? Object.values(MACHINES).find(k => k.cab === nearCab) : null;
    if (m && m !== near) { near = m; refresh(); } if (!m && P.mode === 'walk') near = null;
    ui.classList.toggle('on', !!m); document.body.classList.toggle('ingame', P.mode === 'game');
    if (P.mode === 'zoomIn' || P.mode === 'zoomOut') {
      const dur = P.mode === 'zoomIn' ? 1.6 : 1.4; P.t = Math.min(1, P.t + dt / dur); const k = ease(P.t);
      camera.position.copy(curve.getPointAt(k));
      camera.lookAt(P.mode === 'zoomIn' ? look0.clone().lerp(look1, Math.min(1, k * 1.6)) : look1.clone().lerp(look0, Math.min(1, k * 1.5)));
      monkey.visible = camera.position.distanceTo(monkey.position.clone().setY(1.0)) > 0.75 && !(P.mode === 'zoomIn' && k > 0.3) && !(P.mode === 'zoomOut' && k < 0.65);
      if (P.t >= 1) { if (P.mode === 'zoomIn') launch(); else { P.mode = 'walk'; P.cur = null; near = null; monkey.visible = true; st.camInit = true; st.lookT = st.t; } }
      return true;
    }
    return P.mode === 'game';
  };
  Object.defineProperty(P, 'credits', { get: () => MACHINES.strike.credits });   // back-compat for the STRIKE test
  P.press = press; P.exit = exit; P.tryPlay = tryPlay; P.insertTicket = insertTicket; P.toDemo = toDemo; P.near = () => near && near.cab.name;
  return P;
}
