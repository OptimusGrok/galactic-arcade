// STRIKE (arcade copy): one gold monkey ticket roughly every 25-35 s of play. It zig-zags down, likes to spawn
// next to an enemy or in a bullet lane, ignores enemy bullets, and leaves after ~7 s if the ship misses it.
(function () {
  const TK = window.__TK = { t: null, next: 0, spawned: 0, got: 0, missed: 0 };
  const rint = (a, b) => a + Math.random() * (b - a);
  TK.next = Math.round(rint(25, 35) * 60);
  TK.spawn = function () {
    let x = rint(30, W - 30), y = -10, near = null;
    const al = enemies.items.filter(e => e.alive && e.y > 10 && e.y < H * 0.55);
    if (al.length && Math.random() < 0.7) { near = al[(Math.random() * al.length) | 0]; x = Math.max(24, Math.min(W - 24, near.x + rint(-26, 26))); y = near.y + 18; }
    TK.t = { x0: x, x, y, age: 0, life: Math.round(rint(6.5, 7.5) * 60), amp: rint(22, 44), fr: rint(0.035, 0.06), ph: rint(0, 6.3), vy: rint(0.75, 1.05) };
    TK.spawned++;
  };
  const _upd = updPlay;
  updPlay = function () {
    _upd();
    if (G.scene !== 'play') return;
    if (!TK.t && --TK.next <= 0) { TK.spawn(); TK.next = Math.round(rint(25, 35) * 60); }
    const t = TK.t; if (!t) return;
    t.age++; t.y += t.vy * (t.y < H * 0.35 ? 1 : 0.6); t.x = Math.max(12, Math.min(W - 12, t.x0 + Math.sin(t.age * t.fr + t.ph) * t.amp));
    if (pl.alive && !pl.entering && Math.hypot(pl.x - t.x, pl.y - t.y) < 13) {
      TK.t = null; TK.got++; sparks(t.x, t.y, 18, '#ffd84a', 2.6, 26); try { Snd.sfx('item'); } catch (e) {} TicketArt.collect('strike'); TK.pop = { x: t.x, y: t.y, a: 50 }; return;
    }
    if (t.age > t.life || t.y > H + 12) { TK.t = null; TK.missed++; }
  };
  const _di = drawItems;
  drawItems = function () {
    _di(); const t = TK.t;
    if (t) { const left = t.life - t.age; TicketArt.draw(ctx, t.x, t.y, 22, G.t / 60, left < 120 && ((left >> 3) & 1) ? 0.35 : 1); }
    if (TK.pop && TK.pop.a > 0) { TK.pop.a--; ctx.globalAlpha = Math.min(1, TK.pop.a / 20); text('+1 TICKET', TK.pop.x, TK.pop.y - 14 - (50 - TK.pop.a) * 0.4, '#ffd84a', 1, 'c'); ctx.globalAlpha = 1; }
  };
})();
