// NOVA TETHER (arcade copy only): gold monkey arcade tickets + silent attract DEMO; one credit (2 tickets) = one run.
// Tickets: a chance on every kill that rises with the stage, the loop and how far into the stage you are (tougher foes x2),
// a bonus for each WARDEN mini-boss and a bigger one for each stage boss. Every ticket is banked in the arcade at once
// (TicketArt.collect -> neonarcade.tickets); the ticket you see fly into the HUD chip is just the show. The demo never drops any.
(function () {
  const TK = window.__TK = { got: 0, run: 0, drops: 0, kills: 0, mini: 0, boss: 0, log: [], fly: [] };
  const D = window.__demo = { on: false, runs: 0, restarts: 0 };
  const CHIP = { x: 236, y: 6, w: 92, h: 26 };
  TK.chance = function (e) { const big = (ETYPES[e.type] && ETYPES[e.type].score >= 250) ? 2 : 1;
    return Math.min(0.45, (0.04 + 0.035 * G.stage + 0.07 * G.loop + 0.0012 * G.stageT) * big); };
  function give(n, x, y, why) {
    if (window.__DEMO || D.on) return;
    for (let i = 0; i < n; i++) { TicketArt.collect('nova'); TK.got++; TK.run++; TK.fly.push({ x: x + (i % 4 - 1.5) * 14, y: y - Math.floor(i / 4) * 12, t: -i * 0.06 }); }
    TK.drops++; TK.log.push(why + ':' + n + '@s' + (G.stage + 1) + (G.loop ? 'L' + (G.loop + 1) : '') + ':' + G.stageT.toFixed(0));
    try { Audio.tone(1568, 2093, 0.09, 'triangle', 0.06); setTimeout(() => Audio.tone(2093, 2637, 0.1, 'triangle', 0.05), 70); } catch (e) {} }
  TK.give = give;
  const _damageEnemy = damageEnemy; damageEnemy = function (e, d, force) { const was = e.dead; _damageEnemy(e, d, force);
    if (was || !e.dead || G.mode !== 'play' || window.__DEMO) return; TK.kills++; if (Math.random() < TK.chance(e)) give(1, e.x, e.y, 'kill'); };
  const _stageClear = stageClear; stageClear = function () { const wasPlay = G.mode === 'play'; _stageClear();
    if (!wasPlay || window.__DEMO) return; TK.boss++; give(5 + 3 * G.stage + 3 * G.loop, W * 0.6, H / 2, 'boss'); };
  const _step = step; step = function () {
    if (!window.__DEMO && (G.mode === 'over' || G.mode === 'title')) Input.startPressed = false;   // no free restart: a new run needs a credit
    if (D.on) pilot();
    const bk = G.bossKills, wasPlay = G.mode === 'play'; _step();
    if (G.bossKills > bk && wasPlay && G.mode === 'play' && !window.__DEMO) { TK.mini++; give(2 + G.stage + G.loop, W * 0.6, H / 2, 'warden'); }
    for (const f of TK.fly) f.t += DT; TK.fly = TK.fly.filter(f => f.t < 0.9); };
  const _render = render; render = function () { _render(); if (window.__DEMO || G.mode === 'title') return;
    const now = performance.now() / 1000; ctx.setTransform(SC, 0, 0, SC, 0, 0);
    ctx.fillStyle = 'rgba(5,6,26,.55)'; ctx.fillRect(CHIP.x, CHIP.y, CHIP.w, CHIP.h);
    try { TicketArt.draw(ctx, CHIP.x + 18, CHIP.y + 13, 26, now, 1); } catch (e) {}
    text('\u00d7' + TK.run, CHIP.x + 36, CHIP.y + 13, 18, PAL.yellow, 'left');
    for (const f of TK.fly) { if (f.t < 0) continue; const k = Math.min(1, f.t / 0.9), e = k * k * (3 - 2 * k), tx = CHIP.x + 18, ty = CHIP.y + 13;
      const x = f.x + (tx - f.x) * e, y = f.y + (ty - f.y) * e - Math.sin(k * Math.PI) * 60;
      try { TicketArt.draw(ctx, x, y, k < 0.5 ? 30 : 24, now + f.x, 1 - k * 0.3); } catch (e2) {}
      if (k < 0.35) text('+1', f.x, f.y - 26 + k * 20, 16, PAL.yellow); } };
  // ---- no hi-score writes from the demo ----
  const _addScore = addScore; addScore = function (n) { if (window.__DEMO) { G.score += n; return; } _addScore(n); };
  // ---- DEMO autopilot: hold the left quarter, line up with the nearest foe, sidestep bullets, tap fire ----
  function pilot() {
    if (G.mode === 'pause') G.mode = 'play';
    if (G.mode === 'over' || G.mode === 'title') { if (G.modeT > 2 || G.mode === 'title') { D.restarts++; newGame(); } return; }
    if (G.mode !== 'play' || !P.alive) { Object.assign(Input, { up: 0, down: 0, left: 0, right: 0 }); return; }
    let ty = H / 2, best = 1e9; for (const e of enemies) { if (e.dead || e.x < P.x) continue; const d = e.x - P.x + Math.abs(e.y - P.y) * 0.5; if (d < best) { best = d; ty = e.y; } }
    for (const b of bosses) if (!b.dead) ty = b.y;
    for (const b of ebullets) { const dx = b.x - P.x; if (dx > -10 && dx < 140 && Math.abs(b.y - P.y) < 34) ty = P.y + (b.y > P.y ? -90 : 90); }
    ty = clamp(ty, 60, H - 70); const tx = 150;
    Input.up = ty < P.y - 8 ? 1 : 0; Input.down = ty > P.y + 8 ? 1 : 0; Input.left = P.x > tx + 20 ? 1 : 0; Input.right = P.x < tx - 20 ? 1 : 0;
    Input.fire = (G.frame % 20) < 14;
    if (G.frame % 600 === 300) Input.forcePressed = true; }
  // the demo plays silent; the player's own sound setting (arcade_nova_mute) comes back with a credit
  function quiet(on) { if (on) { Audio.muted = true; } else { Audio.muted = localStorage.getItem('arcade_nova_mute') === '1'; }
    try { if (Audio.master) Audio.master.gain.value = Audio.muted ? 0 : 0.35; Music.sync(); updMuteBtn(); } catch (e) {} }
  D.start = function () { D.on = true; window.__DEMO = true; D.runs++; NV.god = true; quiet(true); TK.fly = []; newGame(); };
  D.stop = function () { D.on = false; window.__DEMO = false; NV.god = false; Object.assign(Input, { up: 0, down: 0, left: 0, right: 0, fire: false, startPressed: false, forcePressed: false, pausePressed: false }); };
  window.__nova = { TK, D, pilot, start() { D.stop(); quiet(false); try { Audio.init(); } catch (e) {} TK.run = 0; TK.fly = []; T.dx = T.dy = 0; T.stickId = null; newGame(); } };
  window.__gaContinue = {
    can() { return !D.on && !window.__DEMO && G.mode === 'over'; },
  force() { if (G.mode === 'over') return true; gameOver(); return G.mode === 'over'; },
  mark() { G.score = 12345; return this.snap(); },
    go() { if (!this.can()) return false; G.lives = 1; spawnPlayer(); G.mode = 'play'; G.modeT = 0; return G.mode === 'play' && P.alive; },
    snap() { return { score: G.score, stage: G.stage, loop: G.loop, lives: G.lives, mode: G.mode }; }
  };
})();
