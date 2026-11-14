// GHOST 256 (arcade copy) DEMO / attract: the real game steered by a wandering autopilot. No high score saved, no tickets.
var __D = window.__demo = { on: false, runs: 0, restarts: 0 };
var _saveHi = saveHi; saveHi = function () { if (window.__DEMO) return; _saveHi(); };
var _decP = decidePlayer; decidePlayer = function (e) {
  if (window.__DEMO && e === P) { var opts = [];
    for (var d = 0; d < 4; d++) if (M.open(e.tx + DX[d], e.ty + DY[d]) && !(e.dir >= 0 && d === (e.dir ^ 2))) opts.push(d);
    if (opts.length) e.want = (opts.indexOf(e.dir) >= 0 && Math.random() < 0.55) ? e.dir : opts[(Math.random() * opts.length) | 0]; }
  _decP(e); };
__D.start = function () { __D.on = true; window.__DEMO = true; __D.runs++; __D.hi = G.hi; startGame(); };
__D.stop = function () { __D.on = false; window.__DEMO = false; if (__D.hi != null) G.hi = __D.hi; P.want = -1; };
var _upd2 = update; update = function (dt) { _upd2(dt); if (__D.on && G.state === 'over') { __D.restarts++; G.hi = __D.hi; startGame(); } };

window.__gaContinue = {
  can() { return !window.__DEMO && G.state === 'over'; },
  force() { if (G.state === 'over') return true; gameOver(); return G.state === 'over'; },
  mark() { G.score = 12345; G.dots = Math.max(G.dots, 12); return this.snap(); },
  go() { if (!this.can()) return false; G.lives = 1; G.overT = 0; respawn(); return G.state === 'play'; },
  snap() { return { score: G.score, lives: G.lives, state: G.state, dots: G.dots, camX: G.camX, camY: G.camY }; }
};
