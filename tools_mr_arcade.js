// MARS ROADSTER (arcade copy only): gold monkey ticket pickups on the road and in the air over every gap, a silent attract DEMO,
// one credit (5 tickets) = one race, no free retry on the end screen (the arcade returns to its demo). The original never has any of this.
(function () {
  const TK = window.__TK = { got: 0, run: 0, n: 0, picks: [], log: [] };
  const D = window.__demo = { on: false, runs: 0, restarts: 0 };
  S.routes = [0, 1, 2, 3];   // arcade: every route open (a credit picks the next one in turn)
  let tex = null; const grp = new THREE.Group(); scene.add(grp);
  function ticketTex() { if (tex) return tex; const c = document.createElement('canvas'); TicketArt.toCanvas(c, 96, false); tex = new THREE.CanvasTexture(c); return tex; }
  function place() {   // ~1 ground pickup every fin/14 m off the gaps, plus 1 mid-air over each gap
    for (const p of TK.picks) grp.remove(p.s); TK.picks = []; if (!T || T.attract) return;
    const add = (x, y, z, air) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ticketTex(), transparent: true, fog: false, depthWrite: false })); s.scale.set(2.2, 1.45, 1); s.position.set(x, y, z); s.renderOrder = 2; grp.add(s); TK.picks.push({ s, x, y, z, air, taken: false }); };
    const N = Math.max(8, 15 - T.gaps.length), L = T.cps.length ? T.cps[T.cps.length - 1] : T.len - 250;   // the finish line (last checkpoint)
    for (let i = 1; i <= N; i++) { let z = L * i / (N + 1); for (let k = 0; k < 40 && (gapAt(z) || gapAt(z + 20) || gapAt(z - 20)); k++) z += 8; if (z > L - 20) continue;
      const x = CX(z) + (i % 3 - 1) * 2.2, y = GH(x, z); if (isNaN(y)) continue; add(x, y + 1.2, z, false); }
    for (const g of T.gaps) { const z = (g.a + g.b) / 2, x = CX(z), y0 = GH(CX(g.a - 1), g.a - 1); if (isNaN(y0)) continue; add(x, y0 + 3 + Math.min(10, (g.b - g.a) * 0.06), z, true); }
    TK.n = TK.picks.length; }
  TK.place = place;
  const _start = start; start = function () { _start(); TK.run = 0; place(); };
  const _step = step; step = function (dt) {
    if (D.on) pilot();
    _step(dt); if (st !== 'play' || !C) return;
    for (const p of TK.picks) { if (p.taken) continue; const d = Math.hypot(C.x - p.x, (C.y + 0.6) - p.y, C.z - p.z); if (d < 3.4) {
      if (D.on || window.__DEMO) continue; p.taken = true; p.s.visible = false; TicketArt.collect('roadster'); TK.got++; TK.run++; TK.log.push((p.air ? 'air' : 'ground') + '@' + p.z.toFixed(0));
      try { blip(1568, .12, 'triangle', .15); setTimeout(() => blip(2093, .14, 'triangle', .12), 70); } catch (e) {} } } };
  const _render = render; render = function (dt) { const t = performance.now() / 1000; for (const p of TK.picks) if (!p.taken) { p.s.position.y = p.y + Math.sin(t * 2 + p.z) * 0.25; p.s.material.rotation = Math.sin(t * 1.5 + p.z) * 0.15; } _render(dt); };
  // ---- end screen: no RETRY / MENU (a new race needs a credit) ----
  let lastOk = true;
  const _finish = finish; finish = function (ok, why) { lastOk = !!ok; _finish(ok, why); TK.log.push('end:' + (ok ? 'ok' : 'fail')); };
  // ---- DEMO autopilot: gas, steer to the road centre ahead, jump each gap and feather the jet in the air ----
  function pilot() {
    if (st === 'end' || st === 'menu') { if ((D.endT = (D.endT || 0) + 1) > 120) { D.endT = 0; D.restarts++; route = (route + 1) % 4; start(); } return; }
    if (st === 'pause') { st = 'play'; show(); }
    if (st !== 'play' || !C || C.dead > 0) { for (const k in K) K[k] = 0; return; }
    const look = C.z + 12, want = Math.atan2(CX(look) - C.x, look - C.z); let dy = want - C.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    K.g = 1; K.b = 0; K.l = dy > 0.04 ? 1 : 0; K.r = dy < -0.04 ? 1 : 0;
    const v = C.ground ? C.v : 0, ahead = gapAt(C.z + Math.max(6, v * 0.35));
    if (C.ground) K.j = ahead && !gapAt(C.z) && v > 12 ? (K.j ? 0 : 1) : 0; else { K.j = C.fuel > 5 ? 1 : 0; K.l = K.r = 0; const pd = C.pitch; K.u = 0; K.d = 0; }
  }
  function quiet(on) { try { const m = on ? true : localStorage.getItem('arcade_mr_mute') === '1'; muted = m; if (master) master.gain.value = m ? 0 : .5; $('mute').textContent = m ? '🔇' : '🔊'; } catch (e) {} }
  D.start = function () { D.on = true; window.__DEMO = true; D.runs++; quiet(true); mode = 'tt'; route = D.runs % 4; start(); };
  D.stop = function () { D.on = false; window.__DEMO = false; for (const k in K) K[k] = 0; };
  let runs = 0;
  window.__mrA = { TK, D, pilot, place, scene() { return st === 'end' ? 'over' : st === 'menu' || st === 'gar' ? 'title' : 'play'; },
    start(r) { D.stop(); quiet(false); try { audio(); } catch (e) {} mode = 'tt'; route = r === undefined ? runs++ % 4 : r; start(); },
    hold() { if (st !== 'play') return false; st = 'pause'; show(); return true; }, unhold() { if (st === 'pause') { st = 'play'; show(); } } };
  window.__gaContinue = {
    can() { return !D.on && !window.__DEMO && st === 'end' && lastOk === false; },
  force() { if (st === 'end' && lastOk === false) return true; try { finish(false, 'test'); } catch (e) { lastOk = false; st = 'end'; show(); } return st === 'end' && lastOk === false; },
  mark() { score = 88; clock = 12.5; cpIdx = Math.max(cpIdx, 1); return this.snap(); },
    go() { if (!this.can()) return false; try { doRespawn(); } catch (e) {} st = 'play'; show(); return st === 'play'; },
    snap() { return { clock: clock, cpIdx: cpIdx, score: score, route: route, st: st, lastOk: lastOk }; }
  };
})();
