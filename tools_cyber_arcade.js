// CYBERCITY (arcade copy). t295u (Dave): one credit = the WHOLE game, presented as STAGE 1 (no run timer); no AUTO in battle
// (field Auto-Runner and the triple-tap dev menu only work in the attract demo); BIG ticket wins for bosses and endings (once per save).
// Before t295u: one credit = one 15-minute run. Random ticket drops on battle wins, boss wins,
// chests, quest completions and while exploring, plus a run-complete bonus. Attract DEMO = the game's own hidden autoplay,
// muted, never drops tickets. Paused (no sim, no audio) whenever the cabinet is not zoomed in.
(function () {
  // ---- TICKET ADAPTER: the ONLY place that talks to the arcade. Swap the body of add() for the arcade's new parent API. ----
  var TIX = window.__cyberTix = {
    add: function (n, why) { try { if (parent !== window && parent.__neonSession) { var k = 0, c; while (n - k > 0) { c = parent.__neonSession.addTickets(Math.min(20, n - k), 'cyber'); if (!c) break; k += c; } return k; }   /* t295u: big wins exceed the 20-per-call cap */ } catch (e) {} return 0; }   // session ticket API: no storage writes here
  };
  var RUN_SECS = Infinity;   // t295u: whole game, no time limit
  var TK = window.__TK = { PAYX: 0.5, acc: 0, got: 0, drops: 0, log: [], stepAcc: 0, run: false, left: RUN_SECS, over: false,
    P: { battle: 0.6, boss: 8, chest: 0.75, quest: 4, questExtra: 0.5, walkEvery: 40, walk: 0.3, runBonus: 5 } };   // tuned 'pays well': ~20-25 tickets per 10-ticket run (measured, test/cyberplay.js)
  function cheating() { try { return (typeof Auto !== 'undefined' && Auto.on) || (typeof Speed !== 'undefined' && Speed.mode !== 1); } catch (e) { return false; } }
  function give(n, why) {
    if (!n || window.__DEMO || !TK.run || TK.over || cheating()) return;
    TK.acc = (TK.acc || 0) + n * TK.PAYX; n = Math.floor(TK.acc + 1e-9); TK.acc -= n; if (!n) return;   // 5-ticket price (was 10): every payout halves, fractions carry
    TK.got += n; TK.drops++; TK.log.push(why + ':' + n); TIX.add(n, why); chipN.textContent = TK.got; pop('+' + n + ' \u{1F39F}');
  }
  TK.WIN = 2;
  function giveRaw(n, why) {   // un-halved arcade payout (battle wins)
    if (!n || window.__DEMO || !TK.run || TK.over || cheating()) return;
    TK.got += n; TK.drops++; TK.log.push(why + ':' + n); TIX.add(n, why); chipN.textContent = TK.got; pop('+' + n + ' \u{1F39F} WIN');
  }
  var R = function () { return Math.random(); };
  TK.ev = function (kind, a) {
    if (kind === 'battle') { giveRaw(TK.WIN, 'win'); if (a) { TK.flawless = !!arguments[2]; give(TK.P.boss, 'boss'); } }   // flat +2 per won battle replaces the old random battle drop
    else if (kind === 'chest') { if (R() < TK.P.chest) give(R() < 0.35 ? 2 : 1, 'chest'); }
    else if (kind === 'quest') give(TK.P.quest + (R() < TK.P.questExtra ? 1 : 0), 'quest');
    else if (kind === 'step') { if (++TK.stepAcc >= TK.P.walkEvery) { TK.stepAcc = 0; if (R() < TK.P.walk) give(R() < 0.5 ? 2 : 1, 'explore'); } }
  };
  TK.give = give;
  // ---- t295u BIG WINS: hard challenges pay a fixed, un-halved payout, once per save (G.flags.arcBig_<key>, saved with the game) ----
  var BIG = TK.BIG = { rook: [15, 'ROOK\'S PIT BULL DOWN'], bulwark: [20, 'BULWARK DESTROYED'], hydra: [20, 'WARDEN-GAMMA DOWN'], adrian: [25, 'ADRIAN VAEL DEFEATED'],
    lantern: [25, 'LANTERN CLEANSED'], subject: [35, 'THE FIRST SUBJECT FREED'], kestrel: [30, 'KESTREL SHOT DOWN'], chorus: [40, 'CHORUS SILENCED'],
    ending_true: [50, 'STAGE 1 COMPLETE: TRUE ENDING'], ending_good: [40, 'STAGE 1 COMPLETE'], ending_bad: [25, 'STAGE 1 COMPLETE'] };
  TK.FLAWLESS = 10; TK.flawless = false; TK.big = [];
  function bigWin(k) {
    var b = BIG[k]; if (!b || window.__DEMO || !TK.run || TK.over || cheating()) return 0;
    try { if (!G || !G.flags || G.flags['arcBig_' + k]) return 0; G.flags['arcBig_' + k] = true; } catch (e) { return 0; }
    var n = b[0], fl = TK.flawless && k.indexOf('ending') < 0; TK.flawless = false; if (fl) n += TK.FLAWLESS;
    TK.got += n; TK.drops++; TK.log.push('big:' + k + ':' + n); TK.big.push([k, n]); TIX.add(n, 'big:' + k); chipN.textContent = TK.got;
    showBig(b[1] + (fl ? ' \u00B7 FLAWLESS +' + TK.FLAWLESS : ''), n); try { Audio8.sfx('ok'); } catch (e) {}
    try { if (typeof saveGame === 'function' && field && field.mapName) saveGame(); } catch (e) {}
    return n; }
  TK.bigWin = bigWin;
  try { var cm = Cov.mark; Cov.mark = function (cat, key) { var r = cm.apply(this, arguments); try { if (cat === 'misc' && BIG[key]) { bigWin(key); if (key.indexOf('ending_') === 0) TK.ended = true; } } catch (e) {} return r; }; } catch (e) {}
  // ---- t295u NO AUTO: the battle command is gone (build), and the game's Auto-Runner / dev menu refuse outside the attract demo ----
  try { var ae = Auto.enable; Auto.enable = function () { if (!window.__DEMO) return; return ae.apply(this, arguments); }; } catch (e) {}
  try { var so = Secret.open; Secret.open = function () { if (!window.__DEMO) return; return so.apply(this, arguments); }; } catch (e) {}
  // ---- HUD: ticket chip + run timer + toast + run over ----
  var st = document.createElement('style');
  st.textContent = '#cyChip{position:fixed;right:8px;top:calc(8px + env(safe-area-inset-top));z-index:50;font:bold 14px "Courier New",monospace;color:#ffe14a;background:rgba(20,6,40,.85);border:1px solid #ff3fd0;border-radius:8px;padding:3px 8px;pointer-events:none;box-shadow:0 0 8px #ff3fd088}' +
    '#cyPop{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:51;font:bold 22px "Courier New",monospace;color:#ffe14a;text-shadow:0 0 10px #ff3fd0;pointer-events:none;opacity:0;transition:opacity .3s,top .8s}' +
    '#cyOver{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(8,2,20,.88);color:#7af0ff;font:bold 20px "Courier New",monospace;text-align:center}' +
    '#cyOver b{color:#ff3fd0;font-size:34px;text-shadow:0 0 12px #ff3fd0}body.demo #cyChip,body.demo #cyPop{display:none!important}' +
    '#cyBig{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%) scale(.6);z-index:55;min-width:230px;max-width:92vw;padding:14px 16px;text-align:center;border:3px solid #ffe14a;border-radius:14px;background:rgba(30,6,50,.94);box-shadow:0 0 24px #ff3fd0,0 0 60px #ffe14a66;color:#fff;font:bold 15px "Courier New",monospace;pointer-events:none;opacity:0;transition:opacity .25s,transform .35s cubic-bezier(.2,1.6,.4,1)}' +
    '#cyBig.on{opacity:1;transform:translate(-50%,-50%) scale(1)}#cyBig b{display:block;color:#ffe14a;font-size:30px;text-shadow:0 0 12px #ff3fd0;margin:4px 0}#cyBig i{display:block;font-style:normal;color:#7af0ff;font-size:12px;letter-spacing:2px}' +
    '#cyStage{position:fixed;left:50%;top:calc(6px + env(safe-area-inset-top));transform:translateX(-50%);z-index:50;font:bold 13px "Courier New",monospace;letter-spacing:3px;color:#ffe14a;background:rgba(20,6,40,.85);border:1px solid #ff3fd0;border-radius:8px;padding:3px 10px;pointer-events:none;display:none}body.demo #cyBig,body.demo #cyStage{display:none!important}';
  document.head.appendChild(st);
  var chip = document.createElement('div'); chip.id = 'cyChip'; chip.innerHTML = '<span id="cyN" style="display:none">0</span>\u23F1 <span id="cyT"></span>';   // run timer only: tickets show on the arcade's one gold counter document.body.appendChild(chip);
  var chipN = chip.querySelector('#cyN'), chipT = chip.querySelector('#cyT');
  var pe = document.createElement('div'); pe.id = 'cyPop'; document.body.appendChild(pe); var pt = 0;
  function pop(s) { pe.textContent = s; pe.style.opacity = 1; pe.style.top = '22%'; clearTimeout(pt); pt = setTimeout(function () { pe.style.opacity = 0; pe.style.top = '16%'; }, 900); }
  var ov = document.createElement('div'); ov.id = 'cyOver'; document.body.appendChild(ov);
  var bg = document.createElement('div'); bg.id = 'cyBig'; document.body.appendChild(bg); var bt = 0;
  function showBig(what, n) { bg.innerHTML = '<i>BIG WIN</i><b>+' + n + ' \u{1F39F}</b>' + what; bg.classList.add('on'); clearTimeout(bt); bt = setTimeout(function () { bg.classList.remove('on'); }, 3800); }
  var sg = document.createElement('div'); sg.id = 'cyStage'; sg.textContent = 'STAGE 1'; document.body.appendChild(sg);
  setInterval(function () { try { var t = topScene(), n = t && t.name, base = scenes[0] && scenes[0].name; sg.style.display = !window.__DEMO && (base === 'title' || base === 'intro') ? 'block' : 'none';
    if (TK.ended && base === 'title' && TK.run && !TK.over) TK.end(); } catch (e) {} }, 250);
  chip.style.display = 'none';
  TK.tick = function (dt) {   // called from frame() with the real dt, only when not paused
    if (!TK.run || TK.over || window.__DEMO) return;
    TK.left -= dt; var s = Math.max(0, Math.ceil(TK.left)); if (isFinite(s)) chipT.textContent = (s / 60 | 0) + ':' + ('0' + s % 60).slice(-2);
    if (TK.left <= 0) TK.end();
  };
  TK.end = function () { if (TK.over) return; give(TK.P.runBonus, 'runbonus'); TK.over = true; TK.run = false;
    ov.innerHTML = '<b>STAGE 1 COMPLETE</b><div style="margin-top:14px">TICKETS WON: ' + TK.got + '</div><div style="margin-top:8px;font-size:14px;color:#a0a0c0">Vesper is only the beginning.<br>STAGE 2 is coming.</div>';
    ov.style.display = 'flex'; try { if (typeof saveGame === 'function' && typeof field !== 'undefined' && field && field.mapName && G) saveGame(); } catch (e) {} softMute(true); };
  // ---- PAUSE: the arcade calls __cyber.pause(true) when zoomed out; hidden tabs pause too ----
  window.__CYPAUSE = false;
  // Sound: the demo/end overlay mute must never be saved (it was persisting cybercity_mute=1, so the copy stayed silent forever).
  function arcadeMuted() { try { var p = window.parent; return !!(p && p !== window && (p.__muted || (p.__mute && p.__mute.on))); } catch (e) { return false; } }
  function softMute(m) { try { Audio8.muted = !!m; if (Audio8.master) Audio8.master.gain.value = m ? 0 : 0.8; } catch (e) {} }
  try { if (Store.get('cybercity_mute') === '1' && !Store.get('cybercity_mute_user')) Store.set('cybercity_mute', '0'); } catch (e) {}
  function soundOn() { try { var um = Store.get('cybercity_mute_user') === '1'; softMute(um || arcadeMuted()); Audio8.init(); if (Audio8.ctx && Audio8.ctx.state !== 'running') Audio8.ctx.resume(); } catch (e) {} }
  try { var sm0 = Audio8.setMuted; Audio8.setMuted = function (m) { sm0.call(Audio8, m); try { Store.set('cybercity_mute_user', m ? '1' : '0'); } catch (e) {} }; } catch (e) {}
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { if (TK.run && !window.__DEMO && !window.__CYPAUSE) soundOn(); }, true); });
  // a demo coroutine still in flight can push the field back after start(): keep the fresh run on the title until the player acts
  ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { TK.touched = true; }, true); });
  setInterval(function () { try { if (TK.run && !TK.touched && Date.now() - TK.t0 < 4000 && scenes[0] && scenes[0].name !== 'title') setScene(TitleScene()); } catch (e) {} }, 100);
  function setPause(on) { window.__CYPAUSE = !!on; try { var c = Audio8.ctx || Audio8.ac; if (c) on ? c.suspend() : c.resume(); } catch (e) {} }
  document.addEventListener('visibilitychange', function () { if (document.hidden) setPause(true); else if (!window.__extPause) setPause(false); });
  // ---- DEMO: the game's own hidden autoplay, muted, no saves, no tickets ----
  var D = window.__demo = { on: false, runs: 0 }, pm = null;
  D.start = function () { D.on = true; window.__DEMO = true; D.runs++; document.body.classList.add('demo'); softMute(true);
    try { startNewGame(); } catch (e) {} setTimeout(function () { try { Auto.enable(); } catch (e) {} }, 300); };
  D.stop = function () { if (!D.on) return; D.on = false; try { Auto.cancel('arcade'); } catch (e) {} window.__DEMO = false; document.body.classList.remove('demo');  setScene(TitleScene()); };
  window.__cyber = {
    start: function () { [st, chip, pe, ov, bg, sg].forEach(function (el) { if (!el.isConnected) (el === st ? document.head : document.body).appendChild(el); }); D.stop(); ov.style.display = 'none'; TK.got = 0; TK.left = RUN_SECS; TK.over = false; TK.run = true; TK.stepAcc = 0; chipN.textContent = '0'; chip.style.display = 'none'; TK.ended = false; TK.big = []; setScene(TitleScene()); soundOn(); TK.t0 = Date.now(); TK.touched = false; },
    pause: function (on) { window.__extPause = !!on; setPause(on); },
    scene: function () { return TK.over ? 'over' : D.on ? 'demo' : TK.run ? 'play' : 'title'; },
    state: function () { return { got: TK.got, left: TK.left, over: TK.over, run: TK.run, demo: D.on, paused: window.__CYPAUSE, log: TK.log.slice() }; }
  };
})();
