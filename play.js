// PLAY mode for the STRIKE and GHOST 256 cabinets: PLAY / INSERT COIN prompt, zoom through the monkey into the screen,
// then a full-screen playable copy. Credits are tracked per machine; a machine with 0 credits cannot be played.
import * as THREE from 'three';
export function setupPlay(A) {
  const { camera, monkey, st } = A;
  const ui = document.getElementById('playUI'), bPlay = document.getElementById('bPlay'), credit = document.getElementById('credit'), hint = document.getElementById('hint');
  const bExit = document.getElementById('bExit'), over = document.getElementById('over');
  const coarse = matchMedia('(pointer:coarse)').matches;
  const MACHINES = {
    strike: { key: 'strike', cab: A.strikeCab, src: 'strike-play/index.html', credits: 1, games: 0, aspect: 9 / 16,
      start(w) { const S = w.STRIKE; S.start(0); S.G.credits = 0; },             // no continues: one credit = one game
      scene(w) { const sc = w.STRIKE.G.scene; return sc === 'play' || sc === 'pause' ? 'play' : sc === 'gameover' ? 'over' : sc === 'entry' ? 'entry' : sc === 'scores' ? 'scores' : sc === 'title' ? 'title' : sc; },
      active(w) { return w.STRIKE.G.scene === 'play'; }, overHold: 0, scoresHold: 6000 },
    ghost: { key: 'ghost', cab: A.ghostCab, src: 'ghost-play/index.html', credits: 1, games: 0, aspect: 152 / 276,
      start(w) { const g = w.__ghost; g.G.muted = false; try { g.Snd.setMuted(false); g.Snd.unlock && g.Snd.unlock(); } catch (e) {} g.startGame(); },
      scene(w) { const s = w.__ghost.G.state; return s === 'play' || s === 'dying' || s === 'pause' ? 'play' : s === 'over' ? 'over' : s; },
      active(w) { return w.__ghost.G.state === 'play'; }, overHold: 4500, scoresHold: 0 },
  };
  const P = { mode: 'walk', t: 0, frame: null, zooms: 0, coinSfx: 0, blocked: 0, cur: null, machines: MACHINES };
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let curve = null, look0 = new THREE.Vector3(), look1 = new THREE.Vector3(), ac = null, near = null, coinLock = 0;
  function coinSound() { P.coinSfx++; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    for (const [f, d] of [[988, 0], [1319, 0.08]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.35); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 0.4); } } catch (e) {} }
  function refresh() { const m = near || MACHINES.strike, c = m.credits > 0;
    bPlay.textContent = c ? 'PLAY' : 'INSERT COIN'; bPlay.classList.toggle('coin', !c); credit.textContent = 'CREDIT ' + m.credits;
    hint.textContent = coarse ? (c ? 'TAP TO PLAY' : 'TAP TO INSERT COIN') : (c ? 'ENTER / E / SPACE' : 'ENTER / E / SPACE TO INSERT COIN'); }
  function screenInfo(m) { const s = m.cab.userData.screen; s.geometry.computeBoundingBox(); const c = s.geometry.boundingBox.getCenter(new THREE.Vector3()); s.localToWorld(c);
    const sz = s.geometry.boundingBox.getSize(new THREE.Vector3()), h = Math.hypot(sz.x, sz.y) * m.cab.scale.y; return { c, h }; }
  function endPos(m) { // camera spot where the portrait screen fills the view
    const { c, h } = screenInfo(m), w = h * m.aspect, n = m.cab.userData.inward, nrm = new THREE.Vector3(n.x * 0.96, 0.28, n.z * 0.96).normalize();
    const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const dist = Math.min(h / 2 / Math.tan(vf / 2), w / 2 / Math.tan(hf / 2)) * 0.9;
    return { p: c.clone().addScaledVector(nrm, Math.max(0.08, dist)), c }; }
  // the only entry point for a press (button, tap, Enter/E/Space)
  function press() {
    const m = near;
    if (P.mode !== 'walk' || !m || !ui.classList.contains('on')) { P.blocked++; return; }
    const now = performance.now();
    if (m.credits <= 0) { // a machine with no credits cannot be played: a press only inserts a coin
      m.credits = 1; coinLock = now + 700; P.lastCoinAt = now; coinSound(); refresh(); bPlay.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 250); return; }
    if (now < coinLock) { P.blocked++; return; }
    P.startGap = now - (P.lastCoinAt || -1e9);   // the same double-tap that inserted the coin doesn't also start the game
    start(m);
  }
  function start(m) {
    if (m.credits <= 0 || P.mode !== 'walk') { P.blocked++; return; }
    m.credits -= 1; m.games++; P.cur = m; refresh(); ui.classList.remove('on');
    P.mode = 'zoomIn'; P.t = 0; P.zooms++;
    const head = monkey.position.clone().setY(1.25), e = endPos(m), mid = head.clone().lerp(e.p, 0.35);
    P.target = e.c; P.end = e.p; curve = new THREE.CatmullRomCurve3([camera.position.clone(), head, mid, e.p]); look0.copy(head); look1.copy(e.c);
    const f = P.frame = document.createElement('iframe'); f.id = 'game'; f.src = m.src; f.allow = 'autoplay; fullscreen'; f.title = m.cab.name;
    f.addEventListener('load', () => { P.loaded = true; try { f.contentWindow.addEventListener('keydown', ev => { if (ev.code === 'Escape') { ev.stopImmediatePropagation(); ev.preventDefault(); exit('esc'); } }, true); } catch (e) {} });
    P.loaded = false; document.body.appendChild(f);
  }
  function launch() {
    const f = P.frame, m = P.cur; P.mode = 'game'; P.over = false; P.goShown = false; clearTimeout(P.holdT); P.holdT = 0; P.scene = null;
    const go = () => { try { m.start(f.contentWindow); } catch (e) { console.warn('game start', e); } f.classList.add('on'); bExit.style.display = 'block'; f.focus(); try { f.contentWindow.focus(); } catch (e) {}
      A.pause(true); P.poll = setInterval(poll, 200); showTix(); };
    if (P.loaded) go(); else f.addEventListener('load', go, { once: true });
  }
  function poll() { // game over -> its own score / high-score screen -> back out to the arcade
    if (P.mode !== 'game' || P.over) return; const m = P.cur; let sc; try { sc = m.scene(P.frame.contentWindow); } catch (e) { return; }
    P.scene = sc;
    if (sc === 'over' && !P.goShown) { P.goShown = true; over.style.display = 'flex'; setTimeout(() => over.style.display = 'none', 1500);
      if (m.overHold) P.holdT = setTimeout(() => { P.over = true; exit('over'); }, m.overHold); }
    if (sc === 'scores' && !P.holdT) P.holdT = setTimeout(() => { P.over = true; exit('over'); }, m.scoresHold);
    if (sc === 'title') { P.over = true; exit('over'); }
  }
  function exit(why) {
    if (P.mode !== 'game') return; clearInterval(P.poll); clearTimeout(P.holdT); P.holdT = 0; over.style.display = 'none';
    P.lastExit = why; P.mode = 'zoomOut'; P.t = 0; bExit.style.display = 'none';
    const f = P.frame; f.classList.remove('on'); try { f.contentWindow.document.body.style.display = 'none'; } catch (e) {} setTimeout(() => f.remove(), 500); P.frame = null;
    const m = P.cur, back = monkey.position.clone().setY(1.25), out = back.clone().addScaledVector(m.cab.userData.inward, 2.6).setY(2.1);
    curve = new THREE.CatmullRomCurve3([camera.position.clone(), back.clone().lerp(camera.position, 0.4), back, out]); look0.copy(back); look1.copy(screenInfo(m).c);
    A.pause(false); window.focus(); showTix();
  }
  // ---- tickets: collected inside the games (gold monkey tickets), 1 each; no time-based payout ----
  const TKEY = 'neonarcade.tickets', tixEl = document.getElementById('tix');
  const T = { total: 0, got: 0 };
  try { T.total = Math.max(0, parseInt(localStorage.getItem(TKEY), 10) || 0); } catch (e) {}
  const showTix = () => { tixEl.textContent = '🎟 ' + T.total; tixEl.classList.toggle('ingame', P.mode === 'game'); };
  let tac = null;
  function ticketSound() { try { tac = tac || new (window.AudioContext || window.webkitAudioContext)(); const t = tac.currentTime;
    [1568, 2093, 2637].forEach((f, i) => { const o = tac.createOscillator(), g = tac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.09, t + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25); o.connect(g).connect(tac.destination); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.3); }); } catch (e) {} }
  function award(n, game) {   // called by the game iframe when the ship / ghost picks up a ticket
    if (P.mode !== 'game' || !P.frame || !P.cur || (game && P.cur.key !== game)) return false;
    n = 1; T.total += n; T.got++; try { localStorage.setItem(TKEY, String(T.total)); } catch (e) {} showTix(); ticketSound();
    const r = tixEl.getBoundingClientRect(), d = document.createElement('div'); d.className = 'tpop'; d.textContent = '+1 🎟'; d.style.left = (r.left + 4) + 'px'; d.style.top = (r.bottom + 4) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1500); return true; }
  window.__neonTicket = award;
  P.award = award;
  P.tickets = T; showTix();
  bPlay.addEventListener('click', e => { e.stopPropagation(); press(); });
  ['pointerdown', 'touchstart'].forEach(t => ui.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bExit.addEventListener('click', () => exit('x'));
  addEventListener('keydown', e => { if (/^(Enter|KeyE|Space)$/.test(e.code)) { if (!e.repeat) press(); } if (e.code === 'Escape') exit('esc'); });
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
  P.press = press; P.exit = exit; P.near = () => near && near.cab.name;
  return P;
}
