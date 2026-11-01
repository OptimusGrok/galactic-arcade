// BERSERKER (arcade copy only): silent attract DEMO, gold monkey arcade tickets in the arena, and the VIKING TICKET for clearing Stage I.
// Tickets: released at every new wave (more as waves go on, more on later stages), a small chance from kills (bigger foes more),
// and a burst from every boss. Walk over one to bank it straight into the arcade (nothing is lost on death). They blink and vanish after 18 s.
var __D = window.__demo = { on: false, runs: 0, restarts: 0, conts: 0 };
var TK = window.__TK = { list: [], got: 0, run: 0, placed: 0, expired: 0, seq: -1, stage: -1, viking: 0, LIFE: 18 };
function __bzMute(on) { window.__MUTE = !!on; try { TM.muted = !!on; if (on) TM.pause(); } catch (e) {} try { tv.muted = !!on; } catch (e) {} try { if (VM) VM.muted = !!on; } catch (e) {}
  try { if (master) master.gain.value = on ? 0 : .5; } catch (e) {} }
window.__bzMute = __bzMute;
(function () { const sp = Element.prototype.setPointerCapture; if (sp) Element.prototype.setPointerCapture = function (id) { try { return sp.call(this, id); } catch (e) {} }; })();
// ---- tickets ----
function __inArena(x, y) { if (G.stage == 0) return Math.hypot(x - 650, y - 650) < 440; return x > 50 && y > 50 && x < WS - 50 && y < WS - 50; }
function __tkPut(x0, y0, spread, n) { for (let i = 0; i < n; i++) { let ok = null;
    for (let k = 0; k < 24 && !ok; k++) { const a = Math.random() * 7, d = spread[0] + Math.random() * (spread[1] - spread[0]), x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d;
      if (__inArena(x, y) && !obs.some(o => Math.hypot(o.x - x, o.y - y) < o.r + 14)) ok = { x, y }; }
    if (!ok) ok = { x: P.x + (Math.random() - .5) * 60, y: P.y + (Math.random() - .5) * 60 };
    TK.list.push({ x: ok.x, y: ok.y, t: 0, v: 1 }); TK.placed++; } }
TK.waveRelease = function () { if (window.__DEMO) return; const n = 1 + Math.floor(G.seqI / 4) + G.stage; __tkPut(P.x, P.y, [80, 190], n); };
TK.put = __tkPut;
var _killE = killE; killE = function (e) { const wasPlay = G.state == 'play'; _killE(e);
  if (!wasPlay || window.__DEMO) return;
  if (e.type == 'boss') { __tkPut(e.x, e.y, [10, 70], 4 + 3 * G.stage); return; }
  const t = ET[e.type] || {}, big = (t.xp || 0) >= 20 ? 3 : 1, p = 0.012 * big * (1 + G.seqI * 0.15) * (1 + G.stage * 0.5);
  if (TK.list.length < 10 && Math.random() < p) __tkPut(e.x, e.y, [0, 12], 1); };
var _hpdUpd = hpdUpd; hpdUpd = function (dt) { _hpdUpd(dt);
  if (G.state == 'play' && (TK.seq !== G.seqI || TK.stage !== G.stage)) { const same = TK.stage === G.stage, fresh = same ? G.seqI > TK.seq && !!STAGES[G.stage].seq[G.seqI] : G.seqI === 0; TK.seq = G.seqI; TK.stage = G.stage; if (fresh) TK.waveRelease(); }
  for (const k of TK.list) { k.t += dt; if (Math.hypot(k.x - P.x, k.y - P.y) < P.r + 11) { k.got = 1; TK.got++; TK.run++; TicketArt.collect('berserker');
      nums.push({ x: P.x, y: P.y - 30, v: '+1 \uD83C\uDF9F', l: 1.1, c: '#ffd84a', s: 1.25 });
      for (let i = 0; i < 18; i++) { const a = Math.random() * 7; parts.push({ x: k.x, y: k.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 70 - 30, l: .5 + Math.random() * .4, c: i % 3 ? '#ffe066' : '#fff', s: 2 }); }
      try { tone(1568, .08, 'triangle', .06, 2093); setTimeout(() => tone(2093, .1, 'triangle', .05, 2637), 70); } catch (e) {} } }
  TK.list = TK.list.filter(k => { if (!k.got && k.t >= TK.LIFE) TK.expired++; return !k.got && k.t < TK.LIFE; }); };
var _drawHpd = drawHpd; drawHpd = function (t) { _drawHpd(t); for (const k of TK.list) { const a = k.t > TK.LIFE - 4 ? (Math.floor(k.t * 8) % 2 ? .35 : 1) : 1;
  TicketArt.draw(cx, k.x, k.y - 4 + Math.sin(t * 3 + k.x) * 2, 22, t + k.x, a); } };
var _hud = hud; hud = function () { _hud(); if (window.__DEMO) return; const top = 8 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0), y = top + (cheat.inv || cheat.ff ? 94 : 79) + (G.boss ? 34 : 0);
  try { TicketArt.draw(cx, 22, y - 4, 20, performance.now() / 1000, 1); } catch (e) {} cx.font = 'bold 12px Georgia'; cx.textAlign = 'left'; cx.fillStyle = '#ffe08a'; cx.fillText('\u00d7 ' + TK.run + (TK.viking ? '   \u16DF VIKING' : ''), 36, y); };
var _startStage = startStage; startStage = function (i, c) { TK.list = []; TK.seq = -1; TK.stage = -1; _startStage(i, c); };
var _newRun = newRun; newRun = function () { TK.run = 0; TK.viking = 0; _newRun(); };
// ---- VIKING TICKET: clearing Stage I (The Village) ----
var _stageClear = stageClear; stageClear = function () { const first = G.state == 'play' && G.stage == 0; _stageClear();
  if (!first || window.__DEMO || G.state == 'play') return; TK.viking++;
  for (const k of TK.list) { TK.got++; TK.run++; TicketArt.collect('berserker'); } TK.list = [];   // the market sweep collects what is left
  try { parent !== window && parent.__neonViking && parent.__neonViking('berserker'); } catch (e) {}
  nums.push({ x: P.x, y: P.y - 50, v: 'VIKING TICKET!', l: 2.6, c: '#d8e2ee', s: 1.8 }); };
// ---- no save / score writes from the demo ----
var _recordSave = recordSave; recordSave = function () { if (window.__DEMO) return; _recordSave(); };
// ---- DEMO autopilot: drift toward the nearest foe, back off when crowded or hurt; the game's auto-attack does the rest ----
function __pilot() { if (!__D.on || !P) return; J.id = null;
  if (G.state == 'cont') { __D.conts++; doContinue(); return; } if (G.state == 'dead' || G.state == 'win') { __D.restarts++; ov(null); newRun(); return; }
  if (G.state == 'shop') { ov(null); startStage(G.stage + 1); return; }
  if (G.state != 'play') { J.x = J.y = 0; return; }
  let n = null, nd = 1e9, cx2 = 0, cy2 = 0, close = 0; for (const e of ens) { if (e.hp <= 0) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < nd) { nd = d; n = e; } if (d < 70) { close++; cx2 += e.x; cy2 += e.y; } }
  let mx = 0, my = 0; if (n) { const want = P.hp < P.max * .4 || close > 5 ? 140 : 45; const s = nd > want ? 1 : -1; mx = (n.x - P.x) / nd * s; my = (n.y - P.y) / nd * s; }
  if (G.stage == 0) { const dx = 650 - P.x, dy = 650 - P.y, d = Math.hypot(dx, dy); if (d > 380) { mx += dx / d; my += dy / d; } }
  const l = Math.hypot(mx, my); J.x = l ? mx / l * .9 : 0; J.y = l ? my / l * .9 : 0;
  if (P.energy >= 100) BTL.T = 1; if (G.rgReady) BTL.R = 1; if (G.odReady) BTL.O = 1; }
setInterval(__pilot, 100);
__D.start = function () { __D.on = true; window.__DEMO = true; __D.runs++; __bzMute(true); try { tmStop(); stopTV(); } catch (e) {} ov(null); newRun(); };
__D.stop = function () { __D.on = false; window.__DEMO = false; J.x = J.y = 0; };
window.__bz = { start() { __D.stop(); __bzMute(false); try { initAudio(); if (AC && AC.state != 'running') AC.resume(); } catch (e) {} ov(null); newRun(); }, TK };
