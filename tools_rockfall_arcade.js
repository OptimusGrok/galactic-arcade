// ROCKFALL RUSH (arcade copy only, injected before window.__G). One credit (5 tickets) = one run of 3 lives
// through the single 80x44 cave (75 diamonds to open the exit, 300 s). Gold monkey tickets: 1 per 5 diamonds
// collected and 10 for reaching the open exit, max 40 a credit (butterfly-farmed extras cannot exceed the cap).
// GAME OVER and CAVE CLEARED end the credit (no free restart). Silent attract DEMO: an autopilot miner with
// infinite lives, nothing saved, no sound. Own storage keys (arcade_rockfall_*). Tickets bank at once
// (TicketArt.collect -> neonarcade.tickets).
(function () {
var TK = { got: 0, run: 0, log: [], RUN_CAP: 40 }, D = { on: false, runs: 0, t: 0 }, RUN = false, OVER = false, HOLD = false;
function tgt() { try { var pt = parent.document.getElementById('tix'), fe = frameElement; if (pt && fe) { var a = pt.getBoundingClientRect(), b = fe.getBoundingClientRect(), k = b.width / innerWidth || 1;
  if (a.width) return { left: (a.left - b.left) / k, top: (a.top - b.top) / k }; } } catch (e) {} return { left: 8, top: 8 }; }
function fly(k) { var sx = innerWidth / 2, sy = innerHeight * 0.45, t = tgt(); var c = document.createElement('canvas'); c.className = 'tkFly'; try { TicketArt.toCanvas(c, 30, false); } catch (e) {}
  c.style.left = (sx - 15 + (k % 3 - 1) * 16) + 'px'; c.style.top = (sy - 10 - Math.floor(k / 3) * 12) + 'px'; document.body.appendChild(c);
  setTimeout(function () { c.style.transform = 'translate(' + (t.left + 4 - sx + 15) + 'px,' + (t.top + 2 - sy + 10) + 'px) scale(.8)'; c.style.opacity = '.4'; }, 120 + k * 70);
  setTimeout(function () { c.remove(); }, 950 + k * 70); }
var css = document.createElement('style'); css.textContent = '.tkFly{position:fixed;z-index:70;pointer-events:none;width:30px;height:20px;transition:transform .75s cubic-bezier(.5,-0.4,.7,1),opacity .75s;filter:drop-shadow(0 0 6px #ffd23a)}.tkPlus{position:fixed;left:50%;top:38%;transform:translate(-50%,0);z-index:71;pointer-events:none;font:900 30px monospace;color:#ffd23a;text-shadow:0 0 8px #000,0 0 12px #ffb000;transition:transform 1.2s ease-out,opacity 1.2s}.tkPlus.go{transform:translate(-50%,-60px);opacity:0}#fs,#br{visibility:hidden!important}body.demo #fs,body.demo #br{visibility:hidden!important}'; document.head.appendChild(css);
function give(n, why) { if (D.on || window.__DEMO || !RUN) return 0; n = Math.min(n, TK.RUN_CAP - TK.run); if (n <= 0) return 0;
  for (var i = 0; i < n; i++) { TicketArt.collect('rockfall'); TK.got++; TK.run++; fly(i); } TK.log.push(why + ':' + n); plus(n); return n; }
function plus(n) { var e = document.createElement('div'); e.className = 'tkPlus'; e.textContent = '+' + n + ' \uD83C\uDF9F'; document.body.appendChild(e); setTimeout(function () { e.classList.add('go'); }, 30); setTimeout(function () { e.remove(); }, 1500); }
TK.give = give;
var _beep = beep, quiet = function () { return D.on || HOLD || !!window.__DEMO; };
beep = function () { if (quiet()) return; return _beep.apply(this, arguments); };
var _new = newGame, _soc = startOrContinue, _win = win, _save = saveHi, _step = step;
newGame = function () { if (!RUN && !D.on) return; if (RUN && S.mode === 'play') return; _new(); if (D.on) S.lives = 99; };
startOrContinue = function () { if (S.mode === 'paused') { togglePause(); return; } if (!RUN && !D.on) return; if (OVER && !D.on) return; _soc(); };
win = function () { _win(); if (D.on) { D.restart(); return; } if (RUN) { give(10, 'exit'); OVER = true; RUN = false; } };
saveHi = function () { if (D.on || window.__DEMO) return; _save(); };
step = function () { if (HOLD) return; var g0 = S.got;
  if (D.on) { D.t++; demoPilot(); if (S.mode === 'title' || S.mode === 'over' || S.mode === 'win' || D.t > 8 * 90) D.restart(); }
  _step();
  if (RUN && !D.on && S.got > g0) { var n = Math.floor(S.got / 5) - Math.floor(g0 / 5); if (n > 0) give(n, 'dia'); }
  if (RUN && S.mode === 'over') { OVER = true; RUN = false; } };
function demoPilot() { if (!S.alive) return;
  if (D.lastPi === S.pi) D.stuck = (D.stuck || 0) + 1; else D.stuck = 0;
  D.lastPi = S.pi;
  if (D.dir == null || D.stuck > 2 || D.t % 48 === 0) D.dir = ((D.dir == null ? 1 : D.dir) + 1 + ((Math.random() * 2) | 0)) % 4;
  K.held = [D.dir]; K.pend = D.dir; K.swipe = -1; }
D.restart = function () { D.t = 0; D.stuck = 0; D.lastPi = -1; OVER = false; HOLD = false; _new(); S.lives = 99; };
D.start = function () { D.on = true; window.__DEMO = true; D.runs++; RUN = false; OVER = false; HOLD = false; document.body.classList.add('demo'); D.restart(); };
D.stop = function () { D.on = false; window.__DEMO = false; document.body.classList.remove('demo'); try { clearInput(); } catch (e) {} S.mode = 'title'; try { $('ovT').classList.remove('hide'); $('ovM').classList.add('hide'); resetCave(); } catch (e) {} };
try { $('br').onclick = function () {}; } catch (e) {}
window.__demo = D; window.__TK = TK;
window.__rockfall = { TK: TK, D: D, give: give,
  start: function () { D.stop(); TK.run = 0; OVER = false; HOLD = false; RUN = true; _new(); try { if (AC && AC.resume) AC.resume(); } catch (e) {} },
  scene: function () { return OVER ? 'over' : (RUN || D.on) ? 'play' : 'title'; }, active: function () { return RUN && S.mode === 'play'; },
  get run() { return RUN; }, get over() { return OVER; }, get silent() { return quiet(); },
  hold: function () { if (!RUN || OVER) return false; HOLD = true; return true; }, unhold: function () { HOLD = false; }, get held() { return HOLD; } };
window.__gaContinue = {
  can: function () { return !D.on && !window.__DEMO && S.mode === 'over'; },
  force: function () { if (S.mode === 'win') return false; S.lives = 0; S.alive = false; S.mode = 'over'; OVER = true; RUN = false; try { showOv('GAME OVER','Score '+S.score,''); } catch (e) {} return S.mode === 'over'; },
  mark: function () { S.score = 12345; return this.snap(); },
  go: function () {
    if (!this.can()) return false;
    OVER = false; RUN = true; S.lives = 1; resetCave(); S.mode = 'play'; try { hideOv(); } catch (e) {}
    return S.mode === 'play' && S.alive;
  },
  snap: function () { return { score: S.score, lives: S.lives, mode: S.mode, won: !!S.won }; }
};
})();
