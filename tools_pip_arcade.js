// SUPER PIP QUEST (arcade copy only, injected after the game's own code). One credit (5 tickets) = one run of 5 lives, starting on the
// world map with the arcade copy's own saved progress (arcade_spq_save_v1). Gold monkey tickets: 1 per level cleared, +3 on each world
// clear (the boss level), +3 more for the final level; each level pays once per run, max 40 a run, so it can't be farmed. Clearing about
// 5 levels (or world 1's first five) returns the 5-ticket cost; a world clear pays 9. GAME OVER ends the credit (no free restart, the arcade
// returns to its demo). Silent attract DEMO: autopilot runs level 1-1 with nothing saved and no sound. Tickets bank at once
// (TicketArt.collect -> neonarcade.tickets); the ticket flying to the arcade's gold counter is just the show.
(function () {
var A = App, TK = { got: 0, run: 0, drops: 0, log: [], paid: {}, RUN_CAP: 40 }, D = { on: false, runs: 0, t: 0, lv: 0 }, RUN = false, OVER = false, HOLD = false;
TK.per = function (i) { return 1 + (i % 6 === 5 ? 3 : 0) + (i === NLEV - 1 ? 3 : 0); };
function tgt() { try { var pt = parent.document.getElementById('tix'), fe = frameElement; if (pt && fe) { var a = pt.getBoundingClientRect(), b = fe.getBoundingClientRect(), k = b.width / innerWidth || 1;
  if (a.width) return { left: (a.left - b.left) / k, top: (a.top - b.top) / k }; } } catch (e) {} return { left: 8, top: 8 }; }
function fly(k) { var sx = innerWidth / 2, sy = innerHeight * 0.45, t = tgt(); var c = document.createElement('canvas'); c.className = 'tkFly'; try { TicketArt.toCanvas(c, 30, false); } catch (e) {}
  c.style.left = (sx - 15 + (k % 3 - 1) * 16) + 'px'; c.style.top = (sy - 10 - Math.floor(k / 3) * 12) + 'px'; document.body.appendChild(c);
  setTimeout(function () { c.style.transform = 'translate(' + (t.left + 4 - sx + 15) + 'px,' + (t.top + 2 - sy + 10) + 'px) scale(.8)'; c.style.opacity = '.4'; }, 120 + k * 70);
  setTimeout(function () { c.remove(); }, 950 + k * 70); }
var css = document.createElement('style'); css.textContent = '.tkFly{position:fixed;z-index:70;pointer-events:none;width:30px;height:20px;transition:transform .75s cubic-bezier(.5,-0.4,.7,1),opacity .75s;filter:drop-shadow(0 0 6px #ffd23a)}body.demo #touch{visibility:hidden}'; document.head.appendChild(css);
function give(n, why) { if (D.on || window.__DEMO || !RUN) return 0; n = Math.min(n, TK.RUN_CAP - TK.run); if (n <= 0) return 0;
  for (var i = 0; i < n; i++) { TicketArt.collect('pip'); TK.got++; TK.run++; fly(i); } TK.drops++; TK.log.push(why + ':' + n); try { SND.sfx('coin'); } catch (e) {} return n; }
TK.give = give;
// sound: silent in the demo and while held
var _play = SND.play, _sfx = SND.sfx, _jin = SND.jingle, quiet = function () { return D.on || HOLD; };
SND.play = function () { if (quiet()) return; return _play.apply(this, arguments); }; SND.sfx = function () { if (quiet()) return; return _sfx.apply(this, arguments); }; SND.jingle = function () { if (quiet()) return; return _jin.apply(this, arguments); };
// no free play: the title menu, map and levels only start inside a credit (or the demo)
var _new = A.newGame, _cont = A.continueGame, _lvl = A.startLevel, _map = A.toMap, _save = A.saveGame, _dead = A.afterDeath, _clr = A.levelCleared, _step = A.step;
A.newGame = function () { if (!RUN) return; _new.call(A); }; A.continueGame = function () { if (!RUN) return; _cont.call(A); };
A.startLevel = function (i, ck) { if (!RUN && !D.on) return; _lvl.call(A, i, ck); };
A.toMap = function (sel) { if (OVER || D.on || !RUN) return; _map.call(A, sel); };
A.saveGame = function () { if (D.on) return; _save.call(A); };
var lastDead = { i: 0, ck: false };
A.afterDeath = function (i, ck) { lastDead = { i: i, ck: !!ck }; if (D.on) { A.game.lives = 99; _lvl.call(A, i, ck); return; } _dead.call(A, i, ck); if (A.scene && A.scene.kind === 'gameover') { OVER = true; RUN = false; } };
A.levelCleared = function (i) { if (D.on) { A.scene.state = 'done'; D.restart(); return; } if (RUN && !TK.paid[i]) { TK.paid[i] = 1; give(TK.per(i), 'L' + (i + 1)); } _clr.call(A, i); };
A.step = function () { if (HOLD) return; if (D.on) { if (++D.t > 60 * 50 || !A.scene || A.scene.kind !== 'level') D.restart(); } _step.call(A); };
// demo autopilot: run right, hold RUN, jump at walls / gaps / every so often
var _poll = Input.poll;
Input.poll = function () { var r = _poll(); if (!D.on) return r; var sc = A.scene, p = sc && sc.p, j = false;
  if (p) { D.stuck = Math.abs(p.x - (D.px || 0)) < 0.3 ? (D.stuck || 0) + 1 : 0; D.px = p.x; j = D.stuck > 6 || (A.frame % 70) < 18; }
  var jp = j && !D.j; D.j = j; return { l: false, r: true, u: false, d: false, j: j, run: true, jp: jp, rp: false, sp: false, lp: false, rpR: false, up: false, dp: false, bp: false }; };
D.restart = function () { D.t = 0; A.paused = false; A.game = freshGame(); A.game.lives = 99; _lvl.call(A, D.lv, false); };
D.start = function () { D.on = true; window.__DEMO = true; D.runs++; RUN = false; OVER = false; HOLD = false; document.body.classList.add('demo'); try { SND.stop(); } catch (e) {} D.restart(); };
D.stop = function () { D.on = false; window.__DEMO = false; document.body.classList.remove('demo'); try { SND.stop(); } catch (e) {} };
window.__demo = D; window.__TK = TK;
window.__pip = { TK: TK, D: D, App: A, give: give,
  start: function () { D.stop(); TK.run = 0; TK.paid = {}; OVER = false; HOLD = false; RUN = true; A.paused = false; A.game = loadSave() || freshGame(); A.game.lives = 5; A.game.score = 0; A.game.coins = 0; _save.call(A); _map.call(A); try { SND.init(); } catch (e) {} },
  scene: function () { return OVER ? 'over' : RUN || D.on ? 'play' : 'title'; }, active: function () { return RUN && !!A.scene && A.scene.kind === 'level' && !A.paused; },
  get run() { return RUN; }, get over() { return OVER; }, get silent() { return quiet(); },
  hold: function () { if (!RUN || OVER) return false; HOLD = true; try { SND.stop(); } catch (e) {} return true; }, unhold: function () { HOLD = false; }, get held() { return HOLD; } };
window.__gaContinue = {
  can: function () { return !D.on && !window.__DEMO && (OVER || (A.scene && A.scene.kind === 'gameover')); },
  force: function () { try { if (!A.scene || A.scene.kind === 'map') _lvl.call(A, A.game.at || 0, false); lastDead = { i: A.game.at || 0, ck: false }; A.game.lives = 0; _dead.call(A, lastDead.i, false); if (A.scene && A.scene.kind === 'gameover') { OVER = true; RUN = false; } return this.can(); } catch (e) { return false; } },
  mark: function () { A.game.score = 12345; A.game.coins = 9; return this.snap(); },
  go: function () {
    if (!this.can()) return false;
    var keep = { score: A.game.score, coins: A.game.coins, at: lastDead.i, ck: lastDead.ck };
    OVER = false; RUN = true; A.paused = false; A.game.lives = 1;
    _lvl.call(A, keep.at, keep.ck);
    A.game.score = keep.score; A.game.coins = keep.coins;
    return !!(A.scene && A.scene.kind === 'level');
  },
  snap: function () { return { score: A.game.score, at: A.game.at, lives: A.game.lives, coins: A.game.coins, kind: A.scene && A.scene.kind }; }
};
})();
