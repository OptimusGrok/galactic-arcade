// CYBERCITY (arcade copy): one credit (10 tickets) = one 15-minute run. Random ticket drops on battle wins, boss wins,
// chests, quest completions and while exploring, plus a run-complete bonus. Attract DEMO = the game's own hidden autoplay,
// muted, never drops tickets. Paused (no sim, no audio) whenever the cabinet is not zoomed in.
(function () {
  // ---- TICKET ADAPTER: the ONLY place that talks to the arcade. Swap the body of add() for the arcade's new parent API. ----
  var TIX = window.__cyberTix = {
    add: function (n, why) { try { if (parent !== window && parent.__neonSession) return parent.__neonSession.addTickets(n, 'cyber'); } catch (e) {} return 0; }   // session ticket API: no storage writes here
  };
  var RUN_SECS = 15 * 60;
  var TK = window.__TK = { got: 0, drops: 0, log: [], stepAcc: 0, run: false, left: RUN_SECS, over: false,
    P: { battle: 0.35, boss: 5, chest: 0.5, quest: 3, questExtra: 0.5, walkEvery: 150, walk: 0.25, runBonus: 3 } };
  function cheating() { try { return (typeof Auto !== 'undefined' && Auto.on) || (typeof Speed !== 'undefined' && Speed.mode !== 1); } catch (e) { return false; } }
  function give(n, why) {
    if (!n || window.__DEMO || !TK.run || TK.over || cheating()) return;
    TK.got += n; TK.drops++; TK.log.push(why + ':' + n); TIX.add(n, why); chipN.textContent = TK.got; pop('+' + n + ' \u{1F39F}');
  }
  var R = function () { return Math.random(); };
  TK.ev = function (kind, a) {
    if (kind === 'battle') { if (a) give(TK.P.boss, 'boss'); else if (R() < TK.P.battle) give(1, 'battle'); }
    else if (kind === 'chest') { if (R() < TK.P.chest) give(R() < 0.35 ? 2 : 1, 'chest'); }
    else if (kind === 'quest') give(TK.P.quest + (R() < TK.P.questExtra ? 1 : 0), 'quest');
    else if (kind === 'step') { if (++TK.stepAcc >= TK.P.walkEvery) { TK.stepAcc = 0; if (R() < TK.P.walk) give(R() < 0.5 ? 2 : 1, 'explore'); } }
  };
  TK.give = give;
  // ---- HUD: ticket chip + run timer + toast + run over ----
  var st = document.createElement('style');
  st.textContent = '#cyChip{position:fixed;right:8px;top:calc(8px + env(safe-area-inset-top));z-index:50;font:bold 14px "Courier New",monospace;color:#ffe14a;background:rgba(20,6,40,.85);border:1px solid #ff3fd0;border-radius:8px;padding:3px 8px;pointer-events:none;box-shadow:0 0 8px #ff3fd088}' +
    '#cyPop{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:51;font:bold 22px "Courier New",monospace;color:#ffe14a;text-shadow:0 0 10px #ff3fd0;pointer-events:none;opacity:0;transition:opacity .3s,top .8s}' +
    '#cyOver{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(8,2,20,.88);color:#7af0ff;font:bold 20px "Courier New",monospace;text-align:center}' +
    '#cyOver b{color:#ff3fd0;font-size:34px;text-shadow:0 0 12px #ff3fd0}body.demo #cyChip,body.demo #cyPop{display:none!important}';
  document.head.appendChild(st);
  var chip = document.createElement('div'); chip.id = 'cyChip'; chip.innerHTML = '<span id="cyN" style="display:none">0</span>\u23F1 <span id="cyT">15:00</span>';   // run timer only: tickets show on the arcade's one gold counter document.body.appendChild(chip);
  var chipN = chip.querySelector('#cyN'), chipT = chip.querySelector('#cyT');
  var pe = document.createElement('div'); pe.id = 'cyPop'; document.body.appendChild(pe); var pt = 0;
  function pop(s) { pe.textContent = s; pe.style.opacity = 1; pe.style.top = '22%'; clearTimeout(pt); pt = setTimeout(function () { pe.style.opacity = 0; pe.style.top = '16%'; }, 900); }
  var ov = document.createElement('div'); ov.id = 'cyOver'; document.body.appendChild(ov);
  chip.style.display = 'none';
  TK.tick = function (dt) {   // called from frame() with the real dt, only when not paused
    if (!TK.run || TK.over || window.__DEMO) return;
    TK.left -= dt; var s = Math.max(0, Math.ceil(TK.left)); chipT.textContent = (s / 60 | 0) + ':' + ('0' + s % 60).slice(-2);
    if (TK.left <= 0) TK.end();
  };
  TK.end = function () { if (TK.over) return; give(TK.P.runBonus, 'runbonus'); TK.over = true; TK.run = false;
    ov.innerHTML = '<b>RUN COMPLETE</b><div style="margin-top:14px">TICKETS WON: ' + TK.got + '</div><div style="margin-top:8px;font-size:14px;color:#a0a0c0">Insert a credit to keep playing.<br>SAVE in the arcade Options to keep your progress.</div>';
    ov.style.display = 'flex'; try { if (typeof saveGame === 'function' && typeof field !== 'undefined' && field && field.mapName && G) saveGame(); } catch (e) {} try { Audio8.setMuted(true); } catch (e) {} };
  // ---- PAUSE: the arcade calls __cyber.pause(true) when zoomed out; hidden tabs pause too ----
  window.__CYPAUSE = false;
  function setPause(on) { window.__CYPAUSE = !!on; try { var c = Audio8.ctx || Audio8.ac; if (c) on ? c.suspend() : c.resume(); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { if (document.hidden) setPause(true); else if (!window.__extPause) setPause(false); });
  // ---- DEMO: the game's own hidden autoplay, muted, no saves, no tickets ----
  var D = window.__demo = { on: false, runs: 0 }, pm = null;
  D.start = function () { D.on = true; window.__DEMO = true; D.runs++; document.body.classList.add('demo'); if (pm === null) pm = Audio8.muted; try { Audio8.setMuted(true); } catch (e) {}
    try { startNewGame(); } catch (e) {} setTimeout(function () { try { Auto.enable(); } catch (e) {} }, 300); };
  D.stop = function () { if (!D.on) return; D.on = false; try { Auto.cancel('arcade'); } catch (e) {} window.__DEMO = false; document.body.classList.remove('demo'); if (pm !== null) { try { Audio8.setMuted(pm); } catch (e) {} pm = null; } setScene(TitleScene()); };
  window.__cyber = {
    start: function () { [st, chip, pe, ov].forEach(function (el) { if (!el.isConnected) (el === st ? document.head : document.body).appendChild(el); }); D.stop(); ov.style.display = 'none'; TK.got = 0; TK.left = RUN_SECS; TK.over = false; TK.run = true; TK.stepAcc = 0; chipN.textContent = '0'; chip.style.display = ''; setScene(TitleScene()); },
    pause: function (on) { window.__extPause = !!on; setPause(on); },
    scene: function () { return TK.over ? 'over' : D.on ? 'demo' : TK.run ? 'play' : 'title'; },
    state: function () { return { got: TK.got, left: TK.left, over: TK.over, run: TK.run, demo: D.on, paused: window.__CYPAUSE, log: TK.log.slice() }; }
  };
})();
