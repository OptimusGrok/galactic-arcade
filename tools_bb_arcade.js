// BURROW BUSTER (arcade copy only, injected after the game's own code). One credit (5 tickets) = one game of 3 lives.
// Gold monkey tickets: 2 per round cleared (t263), max 40 a game (not farmable). GAME OVER ends the credit
// (no free restart: the title/tap start is locked, the arcade returns to its demo). Silent attract DEMO: an autopilot digger with
// infinite lives, nothing saved, no sound. Own storage keys (arcade_bb_*). Tickets bank at once (TicketArt.collect -> neonarcade.tickets).
(function () {
var TK = { got: 0, run: 0, log: [], RUN_CAP: 40 }, D = { on: false, runs: 0, t: 0 }, RUN = false, OVER = false, HOLD = false, lastRound = 0;
TK.per = function (r) { return 2; };   // t263: every level cleared = 2 tickets
function tgt() { try { var pt = parent.document.getElementById('tix'), fe = frameElement; if (pt && fe) { var a = pt.getBoundingClientRect(), b = fe.getBoundingClientRect(), k = b.width / innerWidth || 1;
  if (a.width) return { left: (a.left - b.left) / k, top: (a.top - b.top) / k }; } } catch (e) {} return { left: 8, top: 8 }; }
function fly(k) { var sx = innerWidth / 2, sy = innerHeight * 0.45, t = tgt(); var c = document.createElement('canvas'); c.className = 'tkFly'; try { TicketArt.toCanvas(c, 30, false); } catch (e) {}
  c.style.left = (sx - 15 + (k % 3 - 1) * 16) + 'px'; c.style.top = (sy - 10 - Math.floor(k / 3) * 12) + 'px'; document.body.appendChild(c);
  setTimeout(function () { c.style.transform = 'translate(' + (t.left + 4 - sx + 15) + 'px,' + (t.top + 2 - sy + 10) + 'px) scale(.8)'; c.style.opacity = '.4'; }, 120 + k * 70);
  setTimeout(function () { c.remove(); }, 950 + k * 70); }
var css = document.createElement('style'); css.textContent = '.tkFly{position:fixed;z-index:70;pointer-events:none;width:30px;height:20px;transition:transform .75s cubic-bezier(.5,-0.4,.7,1),opacity .75s;filter:drop-shadow(0 0 6px #ffd23a)}body.demo #touch,.x{}.tkPlus{position:fixed;left:50%;top:38%;transform:translate(-50%,0);z-index:71;pointer-events:none;font:900 30px monospace;color:#ffd23a;text-shadow:0 0 8px #000,0 0 12px #ffb000;transition:transform 1.2s ease-out,opacity 1.2s}.tkPlus.go{transform:translate(-50%,-60px);opacity:0}body.demo #touch,#bFs,#bInstall{visibility:hidden!important}'; document.head.appendChild(css);
function give(n, why) { if (D.on || window.__DEMO || !RUN) return 0; n = Math.min(n, TK.RUN_CAP - TK.run); if (n <= 0) return 0;
  for (var i = 0; i < n; i++) { TicketArt.collect('bb'); TK.got++; TK.run++; fly(i); } TK.log.push(why + ':' + n); plus(n); return n; }
function plus(n) { var e = document.createElement('div'); e.className = 'tkPlus'; e.textContent = '+' + n + ' \uD83C\uDF9F'; document.body.appendChild(e); setTimeout(function () { e.classList.add('go'); }, 30); setTimeout(function () { e.remove(); }, 1500); }
TK.give = give;
// sound: silent in the demo and while held
var _ok = Audio.ok, quiet = function () { return D.on || HOLD; }; Audio.ok = function () { return !quiet() && _ok.call(Audio); };
// no free play: the title tap / SPACE only starts inside a credit (or the demo)
var _start = startGame; startGame = function (o) { if (!RUN && !D.on) return; if (RUN && G.mode !== 'title') return; lastRound = 1; _start(o); };
var _upd = update, _ad = afterDeath;
afterDeath = function () { if (D.on) { G.lives = 99; } _ad(); if (G.mode === 'over' && RUN) { OVER = true; RUN = false; } };
update = function () { if (HOLD) return; var m0 = G.mode, r0 = G.round;
  if (D.on) { D.t++; demoPilot(); if (G.mode === 'title' || G.mode === 'over' || D.t > 60 * 90) D.restart(); }
  _upd();
  if (m0 === 'clear' && G.mode === 'ready' && G.round === r0 + 1 && RUN) give(TK.per(r0), 'R' + r0); };
// demo autopilot: wander the tunnels, turn at walls, pump when a monster is in line
function demoPilot() { var p = G.player; if (!p) return; In.keys = [];
  if (!D.dir || D.t % 45 === 0 || Math.abs(p.x - (D.px || 0)) + Math.abs(p.y - (D.py || 0)) < 0.01) D.dir = 'lrud'[Math.floor(Math.random() * 4)];
  D.px = p.x; D.py = p.y; In.tdir = D.dir;
  var line = G.enemies.some(function (e) { return (Math.abs(e.y - p.y) < 8 && Math.abs(e.x - p.x) < 80) || (Math.abs(e.x - p.x) < 8 && Math.abs(e.y - p.y) < 80); });
  if (line && D.t % 10 === 0) In.pumpP = true; }
D.restart = function () { D.t = 0; G.god = true; _start({ lives: 99, god: true }); G.mode = 'play'; G.god = true; };
D.start = function () { D.on = true; window.__DEMO = true; D.runs++; RUN = false; OVER = false; HOLD = false; document.body.classList.add('demo'); D.restart(); };
D.stop = function () { D.on = false; window.__DEMO = false; In.tdir = null; In.keys = []; document.body.classList.remove('demo'); G.mode = 'title'; G.modeT = 0; G.god = false; };
window.__demo = D; window.__TK = TK;
window.__bb = { TK: TK, D: D, BB: BB, G: G, give: give,
  start: function () { D.stop(); TK.run = 0; OVER = false; HOLD = false; RUN = true; G.mode = 'title'; _start({ lives: 3 }); try { audioUnlock(); } catch (e) {} },
  scene: function () { return OVER ? 'over' : RUN || D.on ? 'play' : 'title'; }, active: function () { return RUN && (G.mode === 'play' || G.mode === 'ready'); },
  get run() { return RUN; }, get over() { return OVER; }, get silent() { return quiet(); },
  hold: function () { if (!RUN || OVER) return false; HOLD = true; return true; }, unhold: function () { HOLD = false; }, get held() { return HOLD; } };
})();
