// ORC ATTACK (arcade copy): gold ticket drops from kills (more in later waves, a burst on boss kills and wave clears) that fly
// into a ticket chip and are banked in the arcade at once; a silent attract DEMO (autopilot builds + calls waves); one credit = one run.
(function () {
  window.__noAdvance = true;
  var TK = window.__orcTk = { got: 0, drops: 0, bursts: 0, log: [] };
  var chip = document.createElement('div'); chip.id = 'tkChip'; chip.innerHTML = '<canvas id="tkIco"></canvas><b id="tkN">0</b>';
  document.body.appendChild(chip); try { TicketArt.toCanvas(document.getElementById('tkIco'), 26, false); } catch (e) {}
  var st = document.createElement('style');
  st.textContent = '#tkChip{display:none!important;position:fixed;left:8px;top:calc(52px + env(safe-area-inset-top));z-index:6;display:flex;align-items:center;gap:6px;background:rgba(30,20,12,.85);border:1px solid #c89a2a;border-radius:9px;padding:3px 8px;font:bold 15px Georgia,serif;color:#ffe08a;pointer-events:none}' +
    '#tkChip.pop{animation:tkp .35s}@keyframes tkp{50%{transform:scale(1.25)}}.tkFly{position:fixed;z-index:7;pointer-events:none;width:30px;height:20px;transition:transform .75s cubic-bezier(.5,-0.4,.7,1),opacity .75s;filter:drop-shadow(0 0 6px #ffd23a)}' +
    'body.demo #tkChip,body.demo #hud .btn,body.demo #bWave,body.demo #bPortal,body.demo #sheet,body.demo #over,body.demo #banner,body.demo #bossWarn,body.demo #floaters{display:none!important}' +
    '#bAgain,#bNext,#bCont,#bMenu,#bEndless,#bReset,#resetQ,#bClearProg,#clearQ,#lvlSel{display:none!important}';
  document.head.appendChild(st);
  var V = new THREE.Vector3();
  // one gold counter only: the arcade HUD chip in the parent page; tickets fly to it (the in-game chip stays hidden, counts only)
  function target() { try { var pt = parent.document.getElementById('tix'), fe = frameElement; if (pt && fe) { var a = pt.getBoundingClientRect(), b = fe.getBoundingClientRect(), k = b.width / innerWidth || 1;
    if (a.width) return { left: (a.left - b.left) / k, top: (a.top - b.top) / k }; } } catch (e) {} return chip.getBoundingClientRect(); }
  window.__tkTarget = target;
  function fly(x, y, z, k) {
    var r = target(), sx = innerWidth / 2, sy = innerHeight / 2;
    try { V.set(x, y, z).project(camera); sx = (V.x + 1) / 2 * innerWidth; sy = (1 - V.y) / 2 * innerHeight; } catch (e) {}
    var c = document.createElement('canvas'); c.className = 'tkFly'; try { TicketArt.toCanvas(c, 30, false); } catch (e) {}
    c.style.left = (sx - 15 + (k % 3 - 1) * 14) + 'px'; c.style.top = (sy - 10 - Math.floor(k / 3) * 12) + 'px'; document.body.appendChild(c);
    setTimeout(function () { c.style.transform = 'translate(' + (r.left + 4 - sx + 15) + 'px,' + (r.top + 2 - sy + 10) + 'px) scale(.8)'; c.style.opacity = '.4'; }, 120 + k * 70);
    setTimeout(function () { c.remove(); chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }, 900 + k * 70);
  }
  function give(n, x, y, z, why) {   // banked at once (TicketArt.collect -> arcade), the flight is just the show
    if (window.__DEMO || G.state !== 'play' && why !== 'clear') return;
    for (var i = 0; i < n; i++) { TicketArt.collect('orc'); TK.got++; fly(x, y, z, i); }
    TK.drops++; if (n > 1) TK.bursts++; TK.log.push(why + ':' + n + '@w' + G.wave); document.getElementById('tkN').textContent = TK.got;
  }
  TK.give = give;
  TK.chance = function (w) { return Math.min(0.3, 0.04 + 0.018 * w); };   // per ordinary kill, rises with the wave
  var _kill = kill; kill = function (e) { var was = e.dead; _kill(e); if (was || window.__DEMO) return; var p = e.root.position;
    if (e.T.boss) give(5, p.x, 1.5, p.z, 'boss');
    else if (e.el > 1) give(2, p.x, 1.2, p.z, 'elite');
    else if (Math.random() < TK.chance(G.wave)) give(1, p.x, 1, p.z, 'kill'); };
  var _uw = updateWaves; updateWaves = function (dt) { var open = G.waveOpen && Object.keys(G.waveOpen).length, w = G.wave; _uw(dt);
    if (open && !(G.waveOpen && Object.keys(G.waveOpen).length) && !window.__DEMO) give((isBoss(w) ? 4 : 1) + Math.floor(w / 4), 0, 1.5, 0, 'clear'); };
  // ---- DEMO: silent autopilot, never saves best / stars, no tickets ----
  var D = window.__demo = { on: false, runs: 0, waves: 0, restarts: 0 }, pm = null;
  var _sb = saveBest; saveBest = function (w) { if (!window.__DEMO) _sb(w); };
  var _rw = recordWin; recordWin = function () { return window.__DEMO ? 1 : _rw(); };
  setInterval(function () { if (!D.on) return;
    if (G.state !== 'play') { D.restarts++; begin(false); G.speed = 2; return; }
    try { window.__TD.autoBuild(); } catch (e) {}
    if (!G.queues.length && !G.enemies.some(function (e) { return !e.dead; })) { startWave(); D.waves++; } }, 400);
  function hideTitle() { document.getElementById('title').classList.add('hidden'); document.getElementById('over').classList.add('hidden'); document.body.classList.remove('menu'); }
  D.start = function () { D.on = true; window.__DEMO = true; D.runs++; document.body.classList.add('demo'); if (pm === null) pm = AU.isMuted(); AU.setMuted(true); hideTitle(); begin(false); G.speed = 2; fitCam(true); };
  D.stop = function () { D.on = false; window.__DEMO = false; document.body.classList.remove('demo'); if (pm !== null) { AU.setMuted(pm); pm = null; } };
  // ---- stages in arcade order: 1 The Castle -> 2 Lava Cave -> 3 River Village, one credit covers the whole run ----
  // LEVEL is fixed per page load, so moving stage reloads this frame with ?stage=N; the run (and its ticket count) rides in sessionStorage.
  var RUN = 'arcade_orc_run';
  function go(o, stage, bonus) { try { sessionStorage.setItem(RUN, JSON.stringify(o)); } catch (e) {} window.__orcAdv = 1; location.search = '?stage=' + stage + (bonus ? '&bonus=' + bonus : ''); }
  function realStart(got, bonus) { D.stop(); hideTitle(); TK.got = got || 0; document.getElementById('tkN').textContent = String(TK.got); AU.resume(); begin(false); if (bonus) { G.gold += bonus; ui(); } G.speed = 1; fitCam(true);
    banner('Stage ' + ARC_STAGE + ': ' + ARC_NAMES[ARC_STAGE - 1], bonus ? 'Carry-over bonus +' + bonus + ' gold' : ''); }
  var _nl = nextLevel; nextLevel = function () { _nl(); if (window.__DEMO || ARC_STAGE >= 3) return; var nx = ARC_STAGE + 1;
    banner('Stage ' + ARC_STAGE + ' complete! ' + starStr(starsFor(G.lives)), 'Stage ' + nx + ': ' + ARC_NAMES[nx - 1] + ' · +' + G.bonus + ' bonus gold'); window.__orcAdv = 1;
    var b = G.bonus, got = TK.got; setTimeout(function () { go({ run: 1, got: got }, nx, b); }, 2000); };
  var _ds = D.start; D.start = function () { if (ARC_STAGE !== 1) { D.on = true; window.__DEMO = true; go({ demo: 1 }, 1); return; } _ds(); };   // the attract demo always plays stage 1
  window.__orc = { stage: ARC_STAGE, names: ARC_NAMES, start: function () { if (ARC_STAGE !== 1) { D.on = false; window.__DEMO = false; go({ run: 1, got: 0 }, 1); return; } realStart(0, 0); } };
  var pend = null; try { pend = JSON.parse(sessionStorage.getItem(RUN) || 'null'); sessionStorage.removeItem(RUN); } catch (e) {}
  if (pend) setTimeout(function () { if (pend.demo) D.start(); else if (pend.run) realStart(pend.got, urlBonus()); }, 0);
})();
