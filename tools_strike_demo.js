// STRIKE (arcade copy) DEMO / attract: the real game played by a simple autopilot. No scores, no saves, no board posts, no tickets.
(function () {
  const D = window.__demo = { on: false, runs: 0, restarts: 0, t: 0 };
  const _sv = saveEntry; saveEntry = function () { if (window.__DEMO) return; return _sv(); };
  D.start = function () { D.on = true; window.__DEMO = true; D.runs++; D.hi = G.hi; newGame(0); G.credits = 0; D.t = 0; Input.keys.fire = true; };
  D.stop = function () { D.on = false; window.__DEMO = false; Input.botMove = null; for (const k in Input.keys) Input.keys[k] = false; if (D.hi != null) G.hi = D.hi; };
  setInterval(function () {
    if (!D.on) return;
    if (G.scene === 'pause') return;
    if (G.scene !== 'play') { D.restarts++; G.hi = D.hi; newGame(0); G.credits = 0; Input.keys.fire = true; return; }   // demo died: just run it again
    D.t += 0.1; let ex = 0;   // drift toward the nearest enemy's column, weave, stay low
    try { const al = enemies.items.filter(e => e.alive && e.y > 0); if (al.length) { const e = al.reduce((a, b) => Math.abs(b.x - pl.x) < Math.abs(a.x - pl.x) ? b : a); ex = Math.max(-1, Math.min(1, (e.x - pl.x) / 40)); } } catch (e) {}
    Input.botMove = { x: Math.max(-1, Math.min(1, ex * 0.7 + Math.sin(D.t * 1.3) * 0.5)), y: (pl.y < H * 0.7 ? 0.6 : 0) + Math.sin(D.t * 0.7) * 0.4 };
    Input.keys.fire = true;
  }, 100);
})();
