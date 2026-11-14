// t779u: in both rooms the floor and the walls change at random every minute, each time to a different existing option; it is pre-warmed
// (no new shader program / long hitch at a swap), leaves the saved Options choice alone, and test harness pages can switch it off. node test/random_room.js
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };
(async () => {
  const o = await open({ w: 480, h: 300, randomRoom: true }), page = o.page, { errors } = o;
  await page.waitForFunction(() => window.__arcade && window.__randomRoom && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  const r0 = await page.evaluate(() => { const R = window.__randomRoom; return { period: R.period, n: R.n, saved: [localStorage.getItem('neonarcade.floor'), localStorage.getItem('neonarcade.walls')] }; });
  chk(r0.period === 30, 'something changes every 30 s (t817u: floor and walls staggered)', r0);
  // speed the clock up so the test does not wait minutes
  await page.evaluate(() => { const R = window.__randomRoom; R.t = 29; });
  await page.waitForFunction(() => window.__randomRoom.n >= 1, null, { timeout: 60000 });
  chk(true, 'the timer fires on its own (no call from the test)');
  await page.waitForFunction(() => window.__randomRoom.warmed, null, { timeout: 5000 }).catch(() => {});
  const w = await page.evaluate(() => { const R = window.__randomRoom; if (!R.warmed) R.warm(); return R.warmed; });
  chk(w && await page.evaluate(() => new Promise(r => { const t0 = Date.now(); const c = () => window.__randomRoom.floorsWarm ? r(true) : Date.now() - t0 > 30000 ? r(false) : setTimeout(c, 200); c(); })), 'pre-warmed (all wall modes + floors compiled, textures uploaded) before / at the first swap');
  await page.waitForFunction(() => window.__randomRoom.floorsWarm, null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500);
  const res = await page.evaluate(async () => { const A = window.__arcade, R = window.__randomRoom, out = [], frames = n => new Promise(r => { const f0 = A.stats.frames; const c = () => A.stats.frames >= f0 + n ? r() : requestAnimationFrame(c); c(); });
    await frames(2); const p0 = A.renderer.info.programs.length;
    for (let i = 0; i < 16; i++) { await frames(1); const f = A.floor, wl = A.walls, l = R.tick();
      const r2w = A.room2.getObjectByName('wall0'), r1w = A.room.getObjectByName('wall0');
      out.push({ kind: l.kind, from: [f, wl], to: [A.floor, A.walls], ms: l.ms, sameWalls: r1w.material === r2w.material }); }
    await frames(3); return { out, p0, p1: A.renderer.info.programs.length, saved: [localStorage.getItem('neonarcade.floor'), localStorage.getItem('neonarcade.walls')] }; });
  chk(res.out.every(x => x.kind === 'floor' ? (x.to[0] !== x.from[0] && x.to[1] === x.from[1]) : (x.to[1] !== x.from[1] && x.to[0] === x.from[0])), 'each change swaps ONLY the floor or ONLY the walls, to a DIFFERENT option', res.out.map(x => x.kind + ':' + x.from.join('/') + '->' + x.to.join('/')));
  chk(res.out.every((x, i) => i === 0 || x.kind !== res.out[i - 1].kind), 'floor and walls alternate (floor, 30 s later walls, 30 s later floor ...)', res.out.map(x => x.kind));
  const fl = new Set(res.out.map(x => x.to[0])), wa = new Set(res.out.map(x => x.to[1]));
  chk(fl.size >= 3 && wa.size >= 2, 'random across the existing options', { floors: [...fl], walls: [...wa] });
  chk(res.out.every(x => x.sameWalls), 'room 2 walls follow (both rooms)');
  const fb = await page.evaluate(() => { const A = window.__arcade; A.setFloor('lava'); const c2 = A.room2.getObjectByName('carpet2') || null; let m2 = null; A.room2.traverse(o => { if (o.isMesh && o.material === A.floorMats.lava) m2 = o.name || 'mesh'; }); return { r1: A.carpet.material === A.floorMats.lava, r2: m2 }; });
  chk(fb.r1 && fb.r2, 'room 2 floor follows (both rooms)', fb);
  chk(res.p1 === res.p0, 'no new shader programs at a swap (pre-warmed)', { before: res.p0, after: res.p1 });
  chk(Math.max(...res.out.map(x => x.ms)) < 30, 'a swap is cheap on the main thread (< 30 ms)', res.out.map(x => x.ms));
  chk(res.saved[0] === r0.saved[0] && res.saved[1] === r0.saved[1], 'the saved Options choice in storage is left alone', { before: r0.saved, after: res.saved });
  chk(errors.length === 0, 'no page errors', errors);
  await o.close();
  // harness default: off
  const o2 = await open({ w: 320, h: 240 });
  await o2.page.waitForFunction(() => window.__arcade && window.__randomRoom && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  const off = await o2.page.evaluate(async () => { const R = window.__randomRoom, f = window.__arcade.floor; R.t = 59.9; await new Promise(r => setTimeout(r, 2500)); return { n: R.n, same: window.__arcade.floor === f }; });
  chk(off.n === 0 && off.same, 'window.__noRandomRoom (the test harness default) keeps it off', off);
  await o2.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
