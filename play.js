// PLAY mode: PLAY / INSERT COIN prompt at the STRIKE cabinet, zoom through the monkey into the screen, then a full-screen playable Strike.
import * as THREE from 'three';
export function setupPlay(A) {
  const { camera, monkey, strikeCab, st } = A;
  const ui = document.getElementById('playUI'), bPlay = document.getElementById('bPlay'), credit = document.getElementById('credit'), hint = document.getElementById('hint');
  const bExit = document.getElementById('bExit'), over = document.getElementById('over');
  const P = { mode: 'walk', credits: 1, t: 0, frame: null, zooms: 0, games: 0, coinSfx: 0 };
  if (matchMedia('(pointer:coarse)').matches) hint.textContent = 'TAP TO PLAY';
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let curve = null, look0 = new THREE.Vector3(), look1 = new THREE.Vector3(), ac = null;
  function coinSound() { P.coinSfx++; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    for (const [f, d] of [[988, 0], [1319, 0.08]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.35); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 0.4); } } catch (e) {} }
  function refresh() { const c = P.credits > 0; bPlay.textContent = c ? 'PLAY' : 'INSERT COIN'; bPlay.classList.toggle('coin', !c); credit.textContent = 'CREDIT ' + P.credits;
    if (!matchMedia('(pointer:coarse)').matches) hint.textContent = c ? 'ENTER / E / SPACE' : 'ENTER / E / SPACE TO INSERT COIN'; }
  refresh();
  function screenInfo() { const s = strikeCab.userData.screen; s.geometry.computeBoundingBox(); const c = s.geometry.boundingBox.getCenter(new THREE.Vector3()); s.localToWorld(c);
    const sz = s.geometry.boundingBox.getSize(new THREE.Vector3()), h = Math.hypot(sz.x, sz.y) * strikeCab.scale.y; return { c, h }; }
  function endPos() { // camera spot where the portrait screen fills the view
    const { c, h } = screenInfo(), w = h * 152 / 276 * 1.0, n = strikeCab.userData.inward, nrm = new THREE.Vector3(n.x * 0.96, 0.28, n.z * 0.96).normalize();
    const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const dist = Math.min(h / 2 / Math.tan(vf / 2), w / 2 / Math.tan(hf / 2)) * 0.9;
    return { p: c.clone().addScaledVector(nrm, Math.max(0.08, dist)), c }; }
  function press() {
    if (P.mode !== 'walk' || !ui.classList.contains('on')) return;
    if (P.credits <= 0) { P.credits = 1; coinSound(); refresh(); bPlay.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 250); return; }
    P.credits = 0; refresh(); ui.classList.remove('on'); start();
  }
  function start() {
    P.mode = 'zoomIn'; P.t = 0; P.zooms++;
    const head = monkey.position.clone().setY(1.25), e = endPos(), mid = head.clone().lerp(e.p, 0.35);
    P.target = e.c; P.end = e.p; curve = new THREE.CatmullRomCurve3([camera.position.clone(), head, mid, e.p]); look0.copy(head); look1.copy(e.c);
    const f = P.frame = document.createElement('iframe'); f.id = 'game'; f.src = 'strike-play/index.html'; f.allow = 'autoplay; fullscreen'; f.title = 'STRIKE';
    f.addEventListener('load', () => { P.loaded = true; try { f.contentWindow.addEventListener('keydown', ev => { if (ev.code === 'Escape') { ev.stopImmediatePropagation(); exit('esc'); } }, true); } catch (e) {} });
    P.loaded = false; document.body.appendChild(f);
  }
  function launch() { // end of zoom: spend credit -> straight into stage 1
    const f = P.frame; P.mode = 'game'; P.games++; P.over = false; P.goShown = false; clearTimeout(P.scoresT); P.scoresT = 0;
    const go = () => { try { const S = f.contentWindow.STRIKE; S.start(0); S.G.credits = 0; } catch (e) { console.warn('strike start', e); } f.classList.add('on'); bExit.style.display = 'block'; f.focus(); try { f.contentWindow.focus(); } catch (e) {}
      A.pause(true); P.poll = setInterval(poll, 200); };
    if (P.loaded) go(); else f.addEventListener('load', go, { once: true });
  }
  function poll() { // game over -> (name entry for a world score) -> scores board -> back out to the arcade
    if (P.mode !== 'game' || P.over) return; let sc; try { sc = P.frame.contentWindow.STRIKE.G.scene; } catch (e) { return; }
    P.scene = sc;
    if (sc === 'gameover' && !P.goShown) { P.goShown = true; over.style.display = 'flex'; setTimeout(() => over.style.display = 'none', 1500); }
    if (sc === 'scores' && !P.scoresT) P.scoresT = setTimeout(() => { P.over = true; exit('over'); }, 6000);
    if (sc === 'title') { P.over = true; exit('over'); }
  }
  function exit(why) {
    if (P.mode !== 'game') return; clearInterval(P.poll); clearTimeout(P.scoresT); P.scoresT = 0; over.style.display = 'none'; P.lastExit = why; P.mode = 'zoomOut'; P.t = 0; bExit.style.display = 'none';
    try { P.frame.contentWindow.STRIKE.G.scene = 'pause'; const sn = P.frame.contentWindow; sn.document.querySelectorAll('audio').forEach(a => a.pause()); } catch (e) {}
    const f = P.frame; f.classList.remove('on'); setTimeout(() => f.remove(), 500); P.frame = null;
    const back = monkey.position.clone().setY(1.25), u = strikeCab.userData, out = back.clone().addScaledVector(u.inward, 2.6).setY(2.1);
    curve = new THREE.CatmullRomCurve3([camera.position.clone(), back.clone().lerp(camera.position, 0.4), back, out]); look0.copy(back); look1.copy(screenInfo().c);
    A.pause(false); window.focus();
  }
  bPlay.addEventListener('click', e => { e.stopPropagation(); press(); });
  ['pointerdown', 'touchstart'].forEach(t => ui.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bExit.addEventListener('click', () => exit('x'));
  addEventListener('keydown', e => { if (P.mode === 'walk' && /^(Enter|KeyE|Space)$/.test(e.code)) press(); if (e.code === 'Escape') exit('esc'); });
  // called every arcade frame; returns true when it owns the camera
  P.update = (dt, nearCab) => {
    ui.classList.toggle('on', P.mode === 'walk' && nearCab === strikeCab && !st.fp);
    if (P.mode === 'zoomIn' || P.mode === 'zoomOut') {
      const dur = P.mode === 'zoomIn' ? 1.6 : 1.4; P.t = Math.min(1, P.t + dt / dur); const k = ease(P.t);
      camera.position.copy(curve.getPointAt(k));
      const lk = P.mode === 'zoomIn' ? look0.clone().lerp(look1, Math.min(1, k * 1.6)) : look1.clone().lerp(look0, Math.min(1, k * 1.5));
      camera.lookAt(lk);
      monkey.visible = camera.position.distanceTo(monkey.position.clone().setY(1.0)) > 0.75 && !(P.mode === 'zoomIn' && k > 0.3) && !(P.mode === 'zoomOut' && k < 0.65);
      if (P.t >= 1) { if (P.mode === 'zoomIn') launch(); else { P.mode = 'walk'; monkey.visible = true; st.camInit = true; st.lookT = st.t; } }
      return true;
    }
    return P.mode === 'game';
  };
  P.press = press; P.exit = exit;
  return P;
}
