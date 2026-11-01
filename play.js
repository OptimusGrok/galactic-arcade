// PLAY mode for the STRIKE and GHOST 256 cabinets: PLAY prompt, zoom into the game's DEMO (INSERT CREDIT; 1 ticket = 1 credit; tap to play), zoom through the monkey into the screen,
// then a full-screen playable copy. Credits are tracked per machine; a machine with 0 credits cannot be played.
import * as THREE from 'three';
export function setupPlay(A) {
  const { camera, monkey, st } = A;
  const ui = document.getElementById('playUI'), bPlay = document.getElementById('bPlay'), credit = document.getElementById('credit'), hint = document.getElementById('hint');
  const bExit = document.getElementById('bExit'), over = document.getElementById('over');
  const demoUI = document.getElementById('demoUI'), dInsert = document.getElementById('dInsert'), dCredit = document.getElementById('dCredit'), bTicket = document.getElementById('bTicket');
  const coarse = matchMedia('(pointer:coarse)').matches;
  const MACHINES = {
    strike: { key: 'strike', cab: A.strikeCab, src: 'strike-play/index.html', credits: 0, games: 0, aspect: 9 / 16,
      start(w) { const S = w.STRIKE; S.start(0); S.G.credits = 0; },
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },             // no continues: one credit = one game
      scene(w) { const sc = w.STRIKE.G.scene; return sc === 'play' || sc === 'pause' ? 'play' : sc === 'gameover' ? 'over' : sc === 'entry' ? 'entry' : sc === 'scores' ? 'scores' : sc === 'title' ? 'title' : sc; },
      active(w) { return w.STRIKE.G.scene === 'play'; },
      hold(w) { if (w.STRIKE.G.scene !== 'play') return false; w.pauseGame(); return true; }, unhold(w) { if (w.STRIKE.G.scene === 'pause') w.resumeGame(); }, overHold: 0, scoresHold: 6000 },
    ghost: { key: 'ghost', cab: A.ghostCab, src: 'ghost-play/index.html', credits: 0, games: 0, aspect: 152 / 276,
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { const g = w.__ghost; g.G.muted = false; try { g.Snd.setMuted(false); g.Snd.unlock && g.Snd.unlock(); } catch (e) {} g.startGame(); },
      scene(w) { const s = w.__ghost.G.state; return s === 'play' || s === 'dying' || s === 'pause' ? 'play' : s === 'over' ? 'over' : s; },
      active(w) { return w.__ghost.G.state === 'play'; },
      hold(w) { const s = w.__ghost.G.state; if (s !== 'play' && s !== 'dying') return false; w.__ghost.togglePause(); return true; }, unhold(w) { if (w.__ghost.G.state === 'pause') w.__ghost.togglePause(); }, overHold: 4500, scoresHold: 0 },
  };
  const P = { need: 0, sub: null, demoReturns: 0, plays: 0, mode: 'walk', t: 0, frame: null, zooms: 0, coinSfx: 0, blocked: 0, cur: null, machines: MACHINES };
  const TKEY = 'neonarcade.tickets', tixEl = document.getElementById('tix');
  const T = { total: 0, got: 0 };
  const saveT = () => { try { localStorage.setItem(TKEY, String(T.total)); } catch (e) {} };
  try { const v = localStorage.getItem(TKEY); if (v === null) { T.total = 1; saveT(); } else T.total = Math.max(0, parseInt(v, 10) || 0); } catch (e) { T.total = 1; }   // a new player starts with 1 ticket
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let curve = null, look0 = new THREE.Vector3(), look1 = new THREE.Vector3(), ac = null, near = null, coinLock = 0;
  function coinSound() { P.coinSfx++; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    for (const [f, d] of [[988, 0], [1319, 0.08]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.35); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 0.4); } } catch (e) {} }
  function refresh() { const m = near || MACHINES.strike;   // the room prompt: always PLAY (zooms into the demo)
    bPlay.textContent = 'PLAY'; credit.textContent = 'CREDIT ' + m.credits + '  ·  YOU HAVE ' + T.total + ' 🎟';
    hint.textContent = coarse ? 'TAP TO PLAY' : 'ENTER / E / SPACE'; }
  function demoRefresh() { const m = P.cur; if (!m) return; const has = T.total >= 1;
    dInsert.textContent = m.credits > 0 ? (coarse ? 'TAP TO PLAY' : 'TAP / ENTER TO PLAY') : 'INSERT CREDIT'; dInsert.classList.toggle('ready', m.credits > 0);
    dCredit.textContent = 'CREDIT ' + m.credits + '  ·  ' + T.total + ' 🎟';
    bTicket.textContent = has ? 'INSERT TICKET · 1 🎟' : 'NEED A TICKET'; bTicket.classList.toggle('need', !has); }
  function buzz() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(110, t + 0.18); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.25); } catch (e) {} }
  const shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  function insertTicket() {   // demo view button: 1 ticket -> 1 credit
    const m = P.cur, now = performance.now();
    if (P.mode !== 'game' || P.sub !== 'demo' || !m || TV.open || now < coinLock) { P.blocked++; return; }
    if (T.total < 1) { P.need++; demoRefresh(); shake(bTicket); buzz(); return; }
    T.total -= 1; saveT(); m.credits += 1; coinLock = now + 350; coinSound(); showTix(); demoRefresh(); bTicket.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 220); }
  function tryPlay() {   // a tap / click / Enter / Space on the demo screen
    const m = P.cur;
    if (P.mode !== 'game' || P.sub !== 'demo' || !m || TV.open || !P.frame) { P.blocked++; return; }
    if (m.credits < 1) { P.need++; shake(dInsert); buzz(); return; }
    const w = P.frame.contentWindow; m.credits -= 1; m.games++; P.plays++;
    try { m.stopDemo(w); m.start(w); } catch (e) { console.warn('game start', e); }
    P.sub = 'play'; P.over = false; P.goShown = false; clearTimeout(P.holdT); P.holdT = 0; demoUI.classList.remove('on'); try { P.frame.focus(); w.focus(); } catch (e) {} showTix(); }
  function toDemo(why) {   // after game over (and the score screens) -> back to the demo, not the room
    const m = P.cur, f = P.frame; if (!m || !f) return; clearTimeout(P.holdT); P.holdT = 0; over.style.display = 'none';
    P.sub = 'demo'; P.over = false; P.goShown = false; P.demoReturns++; P.lastDemo = why;
    try { m.demo(f.contentWindow); } catch (e) { console.warn('demo', e); } demoRefresh(); demoUI.classList.add('on'); }
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
    const go = () => { P.sub = 'demo'; try { m.demo(f.contentWindow); } catch (e) { console.warn('demo start', e); } demoRefresh(); demoUI.classList.add('on'); f.classList.add('on'); bExit.style.display = 'block'; f.focus(); try { f.contentWindow.focus(); } catch (e) {}
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
  const showTix = () => { tixN.textContent = String(T.total); if (P.mode === 'walk') refresh(); else demoRefresh(); tixEl.classList.toggle('ingame', P.mode === 'game'); };
  // ---- enlarged ticket view: tap/click the HUD counter; tap, click, Esc or ✕ closes. Pauses the arcade / game while open ----
  const TV = { open: false, opens: 0, heldGame: false, heldArcade: false };
  function openView() {
    if (TV.open) return; TV.open = true; TV.opens++;
    const side = Math.min(innerWidth, innerHeight), w = Math.round(Math.min(innerWidth * 0.92, side * 0.66)); TicketArt.toCanvas(tvCv, w, true);
    tvCount.textContent = '🎟 ' + T.total + (T.total === 1 ? ' TICKET' : ' TICKETS'); tview.classList.add('on'); tview.setAttribute('aria-hidden', 'false');
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
  P.award = award;
  P.tickets = T; showTix();
  bPlay.addEventListener('click', e => { e.stopPropagation(); press(); });
  ['pointerdown', 'touchstart'].forEach(t => ui.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bExit.addEventListener('click', () => exit('x'));
  ['pointerdown', 'touchstart'].forEach(t => demoUI.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bTicket.addEventListener('click', e => { e.stopPropagation(); insertTicket(); });   // not a screen tap
  demoUI.addEventListener('click', e => { if (e.target === bTicket) return; tryPlay(); });
  addEventListener('keydown', e => { if (TV.open) return; if (/^(Enter|KeyE|Space)$/.test(e.code)) { if (!e.repeat) { if (P.mode === 'game' && P.sub === 'demo') tryPlay(); else press(); } } if (e.code === 'Escape') exit('esc'); });
  // called every arcade frame; returns true when it owns the camera
  P.update = (dt, nearCab) => {
    const m = P.mode === 'walk' && !st.fp ? Object.values(MACHINES).find(k => k.cab === nearCab) : null;
    if (m && m !== near) { near = m; refresh(); } if (!m && P.mode === 'walk') near = null;
    ui.classList.toggle('on', !!m);
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
