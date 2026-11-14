// MONKEY CROSSING (arcade copy) DEMO / attract: the real game driven by a simple look-ahead autopilot. Silent, no best saved, no tickets.
var __D = window.__demo = { on: false, runs: 0, restarts: 0, hops: 0, ai: 'ultra', moves: { f: 0, b: 0, l: 0, r: 0, w: 0 }, deaths: 0, best: 0, sumScore: 0 };
var _ss0 = ss; ss = function (k, v) { if (window.__DEMO) return; _ss0(k, v); };
function __safe(z, x) { var r = rows[z]; if (!r) return false;
  if (r.type === 'river') return !!findLog(r, x) && M.abs((findLog(r, x).x) - x) < findLog(r, x).len / 2 - 0.1;
  if (isTree(z, x) || x < COLMIN || x > COLMAX) return false;
  if (r.type === 'road') { for (var i = 0; i < r.objs.length; i++) { var c = r.objs[i], d = (x - c.x) * r.dir; if (d > -c.len / 2 - 0.45 && d < c.len / 2 + 0.45 + r.spd * 0.3) return false; } }
  if (r.type === 'rail' && (r.trainOn || r.warn)) return false;
  return true; }
var __dT = 0;
function __pilotOld(dt) { if (!__D.on || state !== 'play' || player.dead || player.hop < 1) return; __dT -= dt; if (__dT > 0) return; __dT = 0.12;
  var z = player.z, x = M.round(player.fx), here = __safe(z, rows[z] && rows[z].type === 'river' ? player.fx : x);
  if (__safe(z + 1, rows[z + 1] && rows[z + 1].type === 'river' ? player.fx : x)) { tryMove(0, 1); __D.hops++; return; }
  for (var s = -1; s <= 1; s += 2) if (rows[z].type !== 'river' && __safe(z, x + s) && __safe(z + 1, x + s)) { tryMove(s, 0); return; }
  if (!here) { var o = rows[z].type !== 'river' && __safe(z, x - 1) ? -1 : rows[z].type !== 'river' && __safe(z, x + 1) ? 1 : 0; if (o) tryMove(o, 0); else tryMove(0, 1); } }

// ---- smart look-ahead AI: simulates every 4-move plan (forward / left / right / back / wait) against predicted cars, logs and trains ----
function __objX(r, o, t) { var P = 32 + o.len, lo = -16 - o.len / 2, x = o.x + r.dir * r.spd * t; x = ((x - lo) % P + P) % P + lo; return x; }
function __trainBad(r, x, t) { var X, tl = TRAINLEN, sp = r.spd;
  if (r.trainOn) X = r.trainX + r.dir * sp * t; else { var t0 = r.trainT; if (t < t0 - 0.35) return false; X = -r.dir * 26 + r.dir * sp * M.max(0, t - t0); }
  var x1 = X - r.dir * tl; return x > M.min(X, x1) - 0.9 && x < M.max(X, x1) + 0.9; }
function __okAt(z, x, t, river) { var r = rows[z]; if (!r) return false;
  if (x < COLMIN - 1.2 || x > COLMAX + 1.2) return false;
  if (r.type === 'road') { for (var i = 0; i < r.objs.length; i++) { var c = r.objs[i]; if (M.abs(__objX(r, c, t) - x) < c.len / 2 + 0.5) return false; } }
  if (r.type === 'rail' && __trainBad(r, x, t)) return false;
  if (r.type === 'river') { for (var j = 0; j < r.objs.length; j++) { var o = r.objs[j]; if (M.abs(__objX(r, o, t) - x) < o.len / 2 - 0.2) return true; } return false; }
  return true; }
var __ACT = [[0, 1, 'f'], [-1, 0, 'l'], [1, 0, 'r'], [0, -1, 'b'], [0, 0, 'w']], __STEP = 0.3, __DEPTH = 4;
function __sim(z, x, t, a) { // one step: returns [z, x] or null if dead / illegal
  var dx = a[0], dz = a[1], nz = z + dz, nr = rows[nz], cr = rows[z];
  if (dx || dz) { if (!nr) return null; if (dz < 0 && nz < scrollZ - PUSHD + 0.4) return null;
    var nx = nr.type === 'river' ? x + dx : M.round(x + dx);
    if (nr.type !== 'river' && (nx < COLMIN || nx > COLMAX || isTree(nz, nx))) return null;
    if (nr.type === 'river' && (nx < COLMIN - 0.5 || nx > COLMAX + 0.5)) return null;
    for (var k = 1; k <= 3; k++) { var e = k / 3, tt = t + HOPDUR * e, xx = x + (nx - x) * e, rz = e < 0.5 ? z : nz;
      if (rows[rz].type === 'river') { if (k === 3 && !__okAt(rz, xx, tt)) return null; } else if (!__okAt(rz, xx, tt)) return null; }
    z = nz; x = nx; t += HOPDUR; }
  var r = rows[z], rest = __STEP - (dx || dz ? HOPDUR : 0);
  for (var s = 1; s <= 3; s++) { var t2 = t + rest * s / 3, x2 = r.type === 'river' ? x + r.dir * r.spd * rest * s / 3 : x; if (!__okAt(z, x2, t2)) return null; }
  if (r.type === 'river') x += r.dir * r.spd * rest;
  return [z, x]; }
function __open(z, x) { var seen = {}, st = [[z, M.round(x)]], best = 0; // how many rows ahead are reachable past the trees (traffic ignored), max 4
  while (st.length) { var c = st.pop(), k = c[0] + ',' + c[1]; if (seen[k]) continue; seen[k] = 1; best = M.max(best, c[0] - z); if (best >= 4) return 4;
    var nb = [[c[0], c[1] - 1], [c[0], c[1] + 1], [c[0] + 1, c[1]]]; for (var i = 0; i < 3; i++) { var n = nb[i], r = rows[n[0]]; if (!r || n[1] < COLMIN || n[1] > COLMAX || n[0] - z > 4) continue; if (r.type !== 'river' && isTree(n[0], n[1])) continue; st.push(n); } }
  return best; }
function __plan() { var z0 = player.z, x0 = player.fx, best = -1e9, pick = 4;
  function go(z, x, d, t, first, acc) {
    if (d === __DEPTH) { var v = acc + z * 10 + __open(z, x) * 4 - M.abs(x) * 0.15 + (rows[z].type === 'river' ? -0.5 : 0) - M.max(0, scrollZ - PUSHD + 1 - z) * 8;
      if (v > best) { best = v; pick = first; } return; }
    for (var i = 0; i < 5; i++) { var n = __sim(z, x, t, __ACT[i]); if (!n) { var dv = -1000 + d * 100 + acc; if (dv > best) { best = dv; pick = d ? first : i; } continue; }
      var r = rows[n[0]], b = (r.ticket === M.round(n[1]) && !r.tkGot && r.type !== 'river') ? 3 : 0;
      go(n[0], n[1], d + 1, t + __STEP, d ? first : i, acc + b - (i === 3 ? 0.3 : i === 4 ? 0.05 : i ? 0.1 : 0) * (d ? 0.5 : 1)); } }
  go(z0, x0, 0, 0, 4, 0); return pick; }
var __cool = 0; __D.plan = function () { return __plan(); }; __D.sim = function (a) { return __sim(player.z, player.fx, 0, __ACT[a]); };
function __pilotSmart(dt) { if (!__D.on || state !== 'play' || player.dead || player.hop < 1) { __cool = 0.15; return; } __cool -= dt; if (__cool > 0) return;
  var i = __plan(), a = __ACT[i]; __D.moves[a[2]]++; __cool = 0.15;
  if (a[0] || a[1]) { tryMove(a[0], a[1]); if (a[1] > 0) __D.hops++; } }

// ---- ULTRA AI: time-expanded search over (row, col, t) ~3 s ahead with every lane's cars / logs / trains simulated forward,
// paths scored on progress + safety margin, replanned every tick, sticky to its current plan (deliberate, not jittery),
// adaptive caution (bolder after a clean streak, more careful after near misses / deaths), river-edge aware. ----
function __marg(z, x, t) { var r = rows[z]; if (!r) return 0; var m = 3;
  if (r.type === 'road') for (var i = 0; i < r.objs.length; i++) { var c = r.objs[i], d = M.abs(__objX(r, c, t) - x) - c.len / 2 - 0.5; if (d < m) m = d; }
  if (r.type === 'rail') { if (r.trainOn || r.warn) m = M.min(m, r.trainOn ? 0 : 0.6); else if (r.trainT - t < 1.2) m = M.min(m, M.max(0, r.trainT - t)); }
  if (r.type === 'river') { var lm = 0; for (var j = 0; j < r.objs.length; j++) { var o = r.objs[j], e = o.len / 2 - M.abs(__objX(r, o, t) - x); if (e > lm) lm = e; } m = M.min(m, lm * 2); // deeper on the log = safer
    var drift = r.dir * r.spd * 1.5 + x; if (drift < COLMIN - 0.3 || drift > COLMAX + 0.3) m = M.min(m, 0.3); } // about to be carried off the edge
  return M.max(0, m); }
var __U = { caution: 1, prev: -1, streak: 0, near: 0, LAYERS: 10, lastScore: 0 };
function __planUltra() { var z0 = player.z, x0 = player.fx, L = __U.LAYERS, cw = __U.caution;
  var layer = [{ z: z0, x: x0, first: -1, acc: 0, mn: 3 }], bestV = -1e9, pick = 4, firstBest = [-1e9, -1e9, -1e9, -1e9, -1e9];
  for (var d = 0; d < L; d++) { var nx = {}, t = d * __STEP;
    for (var s = 0; s < layer.length; s++) { var S = layer[s];
      for (var i = 0; i < 5; i++) { var n = __sim(S.z, S.x, t, __ACT[i]); var f = d ? S.first : i;
        if (!n) { var dv = -1000 + d * 60 + S.acc; if (dv > firstBest[f]) firstBest[f] = dv; continue; }
        var r = rows[n[0]], m = __marg(n[0], n[1], t + __STEP), disc = 1 / (1 + d * 0.25);
        var acc = S.acc + disc * (-cw * M.max(0, 1.2 - m) * 2.2 - (i === 3 ? 0.4 : i === 4 ? 0.04 : i ? 0.12 : 0)) + ((r.ticket === M.round(n[1]) && !r.tkGot && r.type !== 'river') ? 3 : 0);
        var key = n[0] + ',' + M.round(n[1] * 2) + ',' + f; if (!nx[key] || nx[key].acc < acc) nx[key] = { z: n[0], x: n[1], first: f, acc: acc, mn: M.min(S.mn, m) }; } }
    layer = []; for (var k in nx) layer.push(nx[k]); if (!layer.length) break;
    if (layer.length > 600) { layer.sort(function (a, b) { return (b.z * 10 + b.acc) - (a.z * 10 + a.acc); }); layer.length = 600; } }
  for (var q = 0; q < layer.length; q++) { var S2 = layer[q], rr = rows[S2.z];
    var v = S2.acc + (S2.z - z0) * 10 + __open(S2.z, S2.x) * 4 - M.abs(S2.x) * 0.15 + (rr.type === 'river' ? -0.8 * cw : 0) - M.max(0, scrollZ - PUSHD + 1.5 - S2.z) * 10 + M.min(S2.mn, 1.5) * 2 * cw;
    if (v > firstBest[S2.first]) firstBest[S2.first] = v; }
  if (__U.prev >= 0 && __U.prev !== 3 && firstBest[__U.prev] > -500) firstBest[__U.prev] += 0.6; // commitment: keep the plan unless another is clearly better
  for (var a = 0; a < 5; a++) if (firstBest[a] > bestV) { bestV = firstBest[a]; pick = a; }
  __U.prev = pick; __U.bestV = bestV; return pick; }
function __pilotUltra(dt) { if (!__D.on || state !== 'play' || player.dead || player.hop < 1) { __cool = 0.1; return; } __cool -= dt; if (__cool > 0) return;
  var here = __marg(player.z, player.fx, 0); if (here < 0.25 && rows[player.z].type !== 'grass') __U.near++;
  if (score > __U.lastScore) { __U.streak++; __U.lastScore = score; if (__U.streak % 10 === 0) __U.caution = M.max(0.8, __U.caution - 0.05); }
  __U.idle = score > (__U.ls2 || 0) ? 0 : (__U.idle || 0) + 0.1; __U.ls2 = M.max(__U.ls2 || 0, score); var cw0 = __U.caution; if (__U.idle > 3) __U.caution = M.max(0.4, cw0 - (__U.idle - 3) * 0.3);
  var i = __planUltra(), a = __ACT[i]; __U.caution = cw0; __D.moves[a[2]]++; __cool = 0.1;
  if (a[0] || a[1]) { tryMove(a[0], a[1]); if (a[1] > 0) __D.hops++; } }
__D.U = __U; __D.planUltra = function () { return __planUltra(); };
function __pilot(dt) { if (__D.ai === 'old') __pilotOld(dt); else if (__D.ai === 'smart') __pilotSmart(dt); else __pilotUltra(dt); }
var _upd0 = update; update = function (dt) { if (window.__HOLD) return; _upd0(dt); __pilot(dt); if (__D.on && state === 'over') { (__D.causes = __D.causes || []).push(player.cause + '@' + score); __D.restarts++; __D.deaths++; __U.caution = M.min(2.2, __U.caution + 0.35); __U.streak = 0; __U.lastScore = 0; __U.prev = -1; __U.ls2 = 0; __U.idle = 0; __D.sumScore += score; __D.best = M.max(__D.best, score); startGame(); } };
__D.start = function () { if (!__D.on) __D.tt0 = totalT; __D.on = true; window.__DEMO = true; __D.runs++; if (__D.pm == null) __D.pm = muted; muted = true; try { setMute(); } catch (e) {} startGame(); };
__D.stop = function () { if (__D.on && __D.tt0 != null) totalT = __D.tt0; __D.on = false; window.__DEMO = false; muted = !!__D.pm; __D.pm = null; try { au(); setMute(); } catch (e) {} };
window.__mcDie = function (c) { die(c || 'squish'); };
__D.bench = function (secs, ai) { __U.caution = 1; __U.near = 0; __U.prev = -1;   // headless benchmark on a simulated clock (the game's own setTimeouts run on it too)
  __D.ai = ai || 'ultra'; var ST = window.setTimeout, q = [], now = 0; window.setTimeout = function (f, ms) { q.push([now + (ms || 0) / 1000, f]); return 0; };
  __D.start(); __D.causes = []; __D.deaths = 0; __D.sumScore = 0; __D.best = 0; __D.moves = { f: 0, b: 0, l: 0, r: 0, w: 0 }; var dist = 0, last = 0;
  for (var i = 0; i < secs * 60; i++) { now += 1 / 60; update(1 / 60); for (var k = q.length - 1; k >= 0; k--) if (q[k][0] <= now) { var f = q[k][1]; q.splice(k, 1); try { f(); } catch (e) {} }
    if (state === 'play' && !player.dead) { if (score > last) dist += score - last; last = score; } else last = 0; }
  window.setTimeout = ST; var live = score; __D.ai = 'ultra';
  return { simSecs: secs, deaths: __D.deaths, avgScore: +((__D.sumScore + live) / (__D.deaths + 1)).toFixed(1), best: M.max(__D.best, live), rowsGained: dist, causes: __D.causes, moves: __D.moves, near: __U.near, caution: +__U.caution.toFixed(2) }; };

window.__gaContinue = {
  can() { return !window.__DEMO && state === 'over'; },
  force() { if (state === 'over') return true; try { document.getElementById('over').classList.add('on'); } catch (e) {} state = 'over'; return state === 'over'; },
  mark() { score = 17; try { updHud(); } catch (e) {} return this.snap(); },
  go() {
    if (!this.can()) return false;
    var z, x, r, found = false;
    for (z = player.z | 0; z >= minRow && !found; z--) {
      r = rows[z]; if (!r || r.type !== 'grass') continue;
      x = Math.round(player.fx);
      if (typeof __safe === 'function' && __safe(z, x)) found = true;
      else if (!isTree(z, x)) found = true;
      if (found) { player.z = player.fz = player.tz = z; player.x = player.fx = player.tx = x; }
    }
    if (!found) { player.z = player.fz = player.tz = 0; player.x = player.fx = player.tx = 0; }
    player.dead = 0; player.deadT = 0; player.hop = 1; player.onLog = null; player.bump = 0;
    try { document.getElementById('over').classList.remove('on'); } catch (e) {}
    try { musDuck(0); } catch (e) {}
    state = 'play';
    return state === 'play' && !player.dead;
  },
  snap() { return { score: score, z: player.z, tickets: runT2, state: state, dead: !!player.dead }; }
};
