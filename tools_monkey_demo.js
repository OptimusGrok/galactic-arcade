// MONKEY CROSSING (arcade copy) DEMO / attract: the real game driven by a simple look-ahead autopilot. Silent, no best saved, no tickets.
var __D = window.__demo = { on: false, runs: 0, restarts: 0, hops: 0 };
var _ss0 = ss; ss = function (k, v) { if (window.__DEMO) return; _ss0(k, v); };
function __safe(z, x) { var r = rows[z]; if (!r) return false;
  if (r.type === 'river') return !!findLog(r, x) && M.abs((findLog(r, x).x) - x) < findLog(r, x).len / 2 - 0.1;
  if (isTree(z, x) || x < COLMIN || x > COLMAX) return false;
  if (r.type === 'road') { for (var i = 0; i < r.objs.length; i++) { var c = r.objs[i], d = (x - c.x) * r.dir; if (d > -c.len / 2 - 0.45 && d < c.len / 2 + 0.45 + r.spd * 0.3) return false; } }
  if (r.type === 'rail' && (r.trainOn || r.warn)) return false;
  return true; }
var __dT = 0;
function __pilot(dt) { if (!__D.on || state !== 'play' || player.dead || player.hop < 1) return; __dT -= dt; if (__dT > 0) return; __dT = 0.12;
  var z = player.z, x = M.round(player.fx), here = __safe(z, rows[z] && rows[z].type === 'river' ? player.fx : x);
  if (__safe(z + 1, rows[z + 1] && rows[z + 1].type === 'river' ? player.fx : x)) { tryMove(0, 1); __D.hops++; return; }
  for (var s = -1; s <= 1; s += 2) if (rows[z].type !== 'river' && __safe(z, x + s) && __safe(z + 1, x + s)) { tryMove(s, 0); return; }
  if (!here) { var o = rows[z].type !== 'river' && __safe(z, x - 1) ? -1 : rows[z].type !== 'river' && __safe(z, x + 1) ? 1 : 0; if (o) tryMove(o, 0); else tryMove(0, 1); } }
var _upd0 = update; update = function (dt) { if (window.__HOLD) return; _upd0(dt); __pilot(dt); if (__D.on && state === 'over') { __D.restarts++; startGame(); } };
__D.start = function () { __D.on = true; window.__DEMO = true; __D.runs++; if (__D.pm == null) __D.pm = muted; muted = true; try { setMute(); } catch (e) {} startGame(); };
__D.stop = function () { __D.on = false; window.__DEMO = false; muted = !!__D.pm; __D.pm = null; try { au(); setMute(); } catch (e) {} };
window.__mcDie = function (c) { die(c || 'squish'); };
