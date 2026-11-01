// GHOST 256 (arcade copy): gold monkey tickets scattered in the maze like Pac-Man fruit (item value 3). They are placed in
// dead ends / tight corners of freshly generated maze, away from the ghost, and vanish after 30 s if not eaten.
(function () {
  const TK = window.__TK = { acc: 0, next: 140, live: {}, placed: 0, got: 0, expired: 0, vis: [], LIFE: 30 };
  const key = (x, y) => (x & 63) | ((y & 63) << 6);
  const deg = (x, y) => (M.open(x + 1, y) ? 1 : 0) + (M.open(x - 1, y) ? 1 : 0) + (M.open(x, y + 1) ? 1 : 0) + (M.open(x, y - 1) ? 1 : 0);
  TK.put = function (x, y) { const k = key(x, y); M.items[k] = 3; TK.live[k] = TK.last = { x, y, t: TK.LIFE }; TK.placed++; };
  TK.area = function (x0, y0, x1, y1) {   // called after M.extend generated a new area
    if (G.state !== 'play' || M.gens < 4 || window.__DEMO) return;
    TK.acc += (x1 - x0 + 1) * (y1 - y0 + 1); if (TK.acc < TK.next) return;
    x0 = Math.max(x0, M.x0 + 1); y0 = Math.max(y0, M.y0 + 1); x1 = Math.min(x1, M.x1 - 1); y1 = Math.min(y1, M.y1 - 1);   // inside the generated world
    const dead = [], other = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!M.open(x, y) || M.items[key(x, y)] === 2 || Math.abs(x - P.tx) + Math.abs(y - P.ty) < 10) continue;
      const h = M.open(x + 1, y) || M.open(x - 1, y), v = M.open(x, y + 1) || M.open(x, y - 1), d = deg(x, y);
      (d === 1 || (d === 2 && h && v) ? dead : other).push([x, y, Math.abs(x - P.tx) + Math.abs(y - P.ty)]);   // dead ends and tight corners
    }
    const pool = dead.length ? dead : other; if (!pool.length) return;
    pool.sort((a, b) => b[2] - a[2]); const p = pool[(Math.random() * Math.max(1, pool.length / 3)) | 0];   // the far third of the new maze
    TK.put(p[0], p[1]); TK.lastKind = dead.length ? 'corner' : 'open tile'; TK.acc = 0; TK.next = 120 + ((Math.random() * 90) | 0);
  };
  TK.force = function () {   // test hook: put one on an open tile next to the ghost
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (M.open(P.tx + dx, P.ty + dy)) { TK.put(P.tx + dx, P.ty + dy); return [P.tx + dx, P.ty + dy]; }
  };
  TK.eat = function (k) { delete TK.live[k]; TK.got++; addScore(0); popup(P.x, P.y - 6, '+1'); try { Snd.life(); } catch (e) {} TicketArt.collect('ghost'); };
  TK.tick = function (dt) { for (const k in TK.live) { const o = TK.live[k]; if (M.items[k] !== 3) { delete TK.live[k]; continue; } if ((o.t -= dt) <= 0) { M.items[k] = 0; delete TK.live[k]; TK.expired++; } } };
  TK.stepOn = function (x, y) { P.tx = x; P.ty = y; onPlayerTile(); return M.items[key(x, y)]; };   // test hook
  TK.mark = function (k, px, py) { TK.vis.push([k, px, py]); };
  TK.flush = function () { for (const [k, px, py] of TK.vis) { const o = TK.live[k], left = o ? o.t : 9; TicketArt.draw(cx, px + T / 2, py + T / 2, 13, G.anim, left < 5 && (((G.anim * 6) | 0) & 1) ? 0.3 : 1); } TK.vis.length = 0; };
  const _ps = playStep; playStep = function (dt) { _ps(dt); if (G.state === 'play') TK.tick(dt); };
  const _de = drawEnemies; drawEnemies = function () { TK.flush(); _de(); };
})();
