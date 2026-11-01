// ORC ATTACK (arcade copy): gold ticket drops from kills (more in later waves, a burst on boss kills and wave clears) that fly
// into a ticket chip and are banked in the arcade at once; a silent attract DEMO (autopilot builds + calls waves); one credit = one run.
(function () {
  window.__noAdvance = true;
  var TK = window.__orcTk = { got: 0, drops: 0, bursts: 0, log: [] };
  var chip = document.createElement('div'); chip.id = 'tkChip'; chip.innerHTML = '<canvas id="tkIco"></canvas><b id="tkN">0</b>';
  document.body.appendChild(chip); try { TicketArt.toCanvas(document.getElementById('tkIco'), 26, false); } catch (e) {}
  var st = document.createElement('style');
  st.textContent = '#tkChip{position:fixed;left:8px;top:calc(52px + env(safe-area-inset-top));z-index:6;display:flex;align-items:center;gap:6px;background:rgba(30,20,12,.85);border:1px solid #c89a2a;border-radius:9px;padding:3px 8px;font:bold 15px Georgia,serif;color:#ffe08a;pointer-events:none}' +
    '#tkChip.pop{animation:tkp .35s}@keyframes tkp{50%{transform:scale(1.25)}}.tkFly{position:fixed;z-index:7;pointer-events:none;width:30px;height:20px;transition:transform .75s cubic-bezier(.5,-0.4,.7,1),opacity .75s;filter:drop-shadow(0 0 6px #ffd23a)}' +
    'body.demo #tkChip,body.demo #hud .btn,body.demo #bWave,body.demo #bPortal,body.demo #sheet,body.demo #over,body.demo #banner,body.demo #bossWarn,body.demo #floaters{display:none!important}' +
    '#bAgain,#bNext,#bCont,#bMenu,#bEndless,#bReset,#resetQ,#bClearProg,#clearQ,#lvlSel{display:none!important}';
  document.head.appendChild(st);
  var V = new THREE.Vector3();
  function fly(x, y, z, k) {
    var r = chip.getBoundingClientRect(), sx = innerWidth / 2, sy = innerHeight / 2;
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
  window.__orc = { start: function () { D.stop(); hideTitle(); TK.got = 0; document.getElementById('tkN').textContent = '0'; AU.resume(); begin(false); G.speed = 1; fitCam(true); } };
})();
