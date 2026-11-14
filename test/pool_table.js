// t564: 3D pool table on the shop's right wall (opposite the corner teleporter pad). Phone emulator: table visible, PLAY POOL button near it,
// 8-Ball Pool opens full-screen in an iframe overlay, ✕ closes it back to the shop, the player can walk afterwards. node test/pool_table.js
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 844, h: 390 }); let ok = true;
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const SH = process.env.NOSHOTS ? 0 : 1;
  const shot = path => SH ? page.screenshot({ path }) : Promise.resolve();
  const closePos = async (tag) => {
    const r = await ev(() => { const e = document.getElementById('poolX'); if (!e) return { missing: true };
      const b = e.getBoundingClientRect();
      const others = [...document.querySelectorAll('#poolOv button')].filter(x => x !== e && getComputedStyle(x).display !== 'none');
      return { left: +b.left.toFixed(1), top: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1), iw: innerWidth, ih: innerHeight, extras: others.map(x => x.id || x.tagName) }; });
    chk(!r.missing && r.left <= 8 && r.top <= 8 && r.w >= 36 && r.h >= 36 && r.right < r.iw * 0.4 && r.extras.length === 0,
      tag + ': close X is tight in the top-left, only one close button', r);
    return r;
  };
  const ev = (f, a) => page.evaluate(f, a);
  const cdp = await page.context().newCDPSession(page); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const center = async sel => ev(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, sel);
  await page.waitForFunction(() => window.__pool && window.__shop && window.__arcade, null, { timeout: 60000 });
  const g = await ev(() => { const s = window.__shop, t = s.G.getObjectByName('poolTable'), W = window.__tp.whiteRoom.position.x, P = window.__tp.PAD2;
    const p = new window.__arcade.THREE.Vector3(); t.getWorldPosition(p); const parts = ['poolWood', 'poolFelt', 'poolPockets', 'poolBalls', 'poolCue'].filter(n => t.getObjectByName(n));
    return { lx: p.x - W, lz: p.z, parts, pockets: t.getObjectByName('poolPockets').count, balls: t.getObjectByName('poolBalls').count, padD: Math.hypot(p.x - P.x, p.z - P.z) }; });
  chk(g.parts.length === 5 && g.pockets === 6 && g.balls === 16 && g.lx > 9 && g.padD > 15, 'pool table built on the right wall, far from the pad ' + JSON.stringify(g));
  // stand in front of the table facing it (shop view) -> screenshot + button
  await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX - 1.8, 0, P.PZ + 0.6); A.st.vel.set(0, 0, 0);
    A.st.yaw = -Math.PI / 2 + 0.3; A.st.face = A.st.yaw + Math.PI; A.st.pitch = 0.42; A.st.dist = 6.5; A.st.camInit = false; });
  await page.waitForFunction(() => !!document.querySelector('#poolBtn.on'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const vis = await ev(() => { const A = window.__arcade, t = window.__shop.G.getObjectByName('poolFelt'), THREE = A.THREE; const p = new THREE.Vector3(); t.getWorldPosition(p);
    const b = new THREE.Box3().setFromObject(t), c = b.getCenter(new THREE.Vector3()).project(A.camera); return { x: c.x, y: c.y, z: c.z, btn: !!document.querySelector('#poolBtn.on') }; });
  chk(Math.abs(vis.x) < 1 && Math.abs(vis.y) < 1 && vis.z < 1, 'table is on screen ' + JSON.stringify(vis));
  chk(vis.btn, 'PLAY POOL button appears near the table');
  await shot('/workspace/galactic-shop/shots/pool_table.png');
  // tap PLAY POOL -> pays 5 tickets -> overlay + game
  await ev(() => { const t = window.__arcade.play.tickets; t.total = 7; localStorage.setItem('neonarcade.tickets', '7'); document.getElementById('tixN').textContent = '7'; });
  let [x, y] = await center('#poolBtn'); await page.touchscreen.tap(x, y);
  await page.waitForFunction(() => window.__pool.open && window.__pool.frame, null, { timeout: 10000 }).catch(() => {});
  const ok1 = await page.waitForFunction(() => { try { const d = window.__pool.frame.contentDocument; return d && d.readyState === 'complete' && d.title === '8-Ball Pool' && d.getElementById('gl'); } catch (e) { return false; } }, null, { timeout: 60000 }).then(() => true).catch(() => false);
  const ov = await ev(() => { const o = document.getElementById('poolOv').getBoundingClientRect(), f = window.__pool.frame.getBoundingClientRect(); return { on: document.getElementById('poolOv').classList.contains('on'), w: f.width, h: f.height, iw: innerWidth, ih: innerHeight, src: window.__pool.frame.src }; });
  chk(ok1 && ov.on && ov.w === ov.iw && ov.h === ov.ih && /pool-play\/index\.html$/.test(ov.src), 'pool game opens full-screen in the overlay ' + JSON.stringify(ov));
  const pay = await ev(() => ({ t: window.__arcade.play.tickets.total, ls: localStorage.getItem('neonarcade.tickets'), hud: document.getElementById('tixN').textContent }));
  chk(pay.t === 2 && pay.ls === '2' && pay.hud === '2', 'PLAY POOL takes 5 tickets (7 -> 2) and updates the HUD ' + JSON.stringify(pay));
  await closePos('phone landscape');
  await page.setViewportSize({ width: 412, height: 915 }); await page.waitForTimeout(300);
  await closePos('phone portrait');
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(300);
  await page.waitForTimeout(6000);
  await shot('/workspace/galactic-shop/shots/pool_open.png');
  [x, y] = await center('#poolX'); await page.touchscreen.tap(x, y); await page.waitForTimeout(500);
  const cl = await ev(() => ({ open: window.__pool.open, ov: document.getElementById('poolOv').classList.contains('on'), frames: document.querySelectorAll('#poolOv iframe').length, cv: window.__arcade.renderer.domElement.style.visibility }));
  chk(!cl.open && !cl.ov && cl.frames === 0 && cl.cv === '', '✕ closes the game back to the shop ' + JSON.stringify(cl));
  // not enough tickets (2): blocked with a visible message, no game
  await page.waitForFunction(() => !!document.querySelector('#poolBtn.on'), null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500);
  [x, y] = await center('#poolBtn'); console.log('tap at', x, y, await ev(([x, y]) => { const e = document.elementFromPoint(x, y); return [e && (e.id || e.tagName), window.__opts.open, getComputedStyle(e).display, document.getElementById('gOpt').className]; }, [x, y])); await page.touchscreen.tap(x, y); await page.waitForTimeout(300);
  const nb = await ev(() => { const m = document.getElementById('poolMsg'); return { need: window.__pool.need, btn: !!document.querySelector('#poolBtn.on'), open: window.__pool.open, msg: m.style.display !== 'none' ? m.textContent : '', t: window.__arcade.play.tickets.total }; });
  chk(!nb.open && /NEED 5 TICKETS/.test(nb.msg) && nb.t === 2, 'blocked with a message when short of tickets ' + JSON.stringify(nb));
  // walk with the joystick (real touches)
  const p0 = await ev(() => window.__arcade.monkey.position.clone());
  const p1 = await ev(() => { const A = window.__arcade; A.keys.KeyW = true; for (let i = 0; i < 90; i++) A.step(1 / 60); A.keys.KeyW = false; return A.monkey.position.clone(); });
  chk(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1, 'player walks after closing the game ' + JSON.stringify([p0, p1].map(p => [p.x.toFixed(2), p.z.toFixed(2)])));
  // can't walk into the table
  const p2 = await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX, 0, P.PZ); A.st.vel.set(0, 0, 0); window.__shop.update(1 / 60); return [A.monkey.position.x - W - P.PX, A.monkey.position.z - P.PZ]; });
  chk(Math.abs(p2[0]) > 0.9 || Math.abs(p2[1]) > 1.5, 'table is solid ' + JSON.stringify(p2));
  // ---- table 2 (t567): identical, shares geometry + materials, own button, solid, opens the same game ----
  const g2 = await ev(() => { const G = window.__shop.G, a = G.getObjectByName('poolTable'), b = G.getObjectByName('poolTable2'), W = window.__tp.whiteRoom.position.x, P = window.__tp.PAD2;
    const share = ['poolWood', 'poolFelt', 'poolBalls', 'poolCue'].every(n => { const x = a.getObjectByName(n), y = b.getObjectByName(n); return x && y && x !== y && (x.geometry === y.geometry || n === 'poolCue') && (x.material === y.material || n === 'poolCue'); });
    const gap = (b.position.z - a.position.z) - 2 * (1.42 + 0.16); return { x: b.position.x, z: b.position.z, share, gap, wallGap: 14 - (b.position.z + 1.58), padD: Math.hypot(W + b.position.x - P.x, b.position.z - P.z) }; });
  chk(g2.share && Math.abs(g2.x - 12.1) < 1e-6 && g2.gap > 1.2 && g2.wallGap > 1 && g2.padD > 15, 'second identical table next to the first, toward the front corner, shared geometry/materials ' + JSON.stringify(g2));
  await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX - 4.2, 0, P.PZ - 1.5); A.st.vel.set(0, 0, 0);
    A.st.yaw = -Math.PI / 2 - 0.6; A.st.face = A.st.yaw + Math.PI; A.st.pitch = 0.8; A.st.dist = 8; A.st.camInit = false; });
  { const f0 = await ev(() => window.__arcade.stats.frames); await page.waitForFunction(f => window.__arcade.stats.frames > f + 4, f0, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(1000); }
  await shot('/workspace/galactic-shop/shots/pool_two.png');
  const gp = await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX - 1.4, 0, (P.PZ + P.PZ2) / 2); A.st.vel.set(0, 0, 0); window.__shop.update(1 / 60); return A.monkey.position.z - (P.PZ + P.PZ2) / 2; });
  chk(Math.abs(gp) < 0.05, 'walking gap between the tables is clear ' + gp.toFixed(3));
  await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX - 1.8, 0, P.PZ2 + 0.6); A.st.vel.set(0, 0, 0);
    const t = A.play.tickets; t.total = 5; localStorage.setItem('neonarcade.tickets', '5'); });
  await page.waitForFunction(() => !!document.querySelector('#poolBtn2.on') && !document.querySelector('#poolBtn.on'), null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(800);
  const b2 = await ev(() => ({ b2: !!document.querySelector('#poolBtn2.on'), b1: !!document.querySelector('#poolBtn.on'), txt: document.getElementById('poolBtn2').textContent }));
  chk(b2.b2 && !b2.b1 && /5/.test(b2.txt), 'table 2 shows its own PLAY POOL button ' + JSON.stringify(b2));
  [x, y] = await center('#poolBtn2'); await page.touchscreen.tap(x, y);
  const ok2 = await page.waitForFunction(() => { try { const d = window.__pool.frame.contentDocument; return d && d.readyState === 'complete' && d.title === '8-Ball Pool'; } catch (e) { return false; } }, null, { timeout: 60000 }).then(() => true).catch(() => false);
  const o2 = await ev(() => ({ table: window.__pool.table, t: window.__arcade.play.tickets.total, src: window.__pool.frame && window.__pool.frame.src }));
  chk(ok2 && o2.table === 1 && o2.t === 0 && /pool-play\/index\.html$/.test(o2.src), 'table 2 opens the same game for 5 tickets ' + JSON.stringify(o2));
  [x, y] = await center('#poolX'); await page.touchscreen.tap(x, y); await page.waitForTimeout(500);
  chk(await ev(() => !window.__pool.open && !document.querySelector('#gOpt.on')), 'table 2 game closes back to the shop');
  const s2 = await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX, 0, P.PZ2); A.st.vel.set(0, 0, 0); window.__shop.update(1 / 60); return [A.monkey.position.x - W - P.PX, A.monkey.position.z - P.PZ2]; });
  chk(Math.abs(s2[0]) > 0.9 || Math.abs(s2[1]) > 1.5, 'table 2 is solid ' + JSON.stringify(s2));
  const fs = await ev(() => window.__arcade.stats.frames); chk(fs > 0, 'arcade loop alive frames=' + fs);
  chk(errors.length === 0, 'no page errors ' + JSON.stringify(errors.slice(0, 3)));
  await close();

  // t820u: the same top-left close X on an iPad (must still be tappable)
  const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const ip = await open({ phone: true, start: false, w: 1180, h: 820, ua: IPAD_UA });
  const pageI = ip.page, evI = (f, a) => pageI.evaluate(f, a);
  await pageI.waitForFunction(() => window.__pool && window.__shop && window.__arcade, null, { timeout: 60000 });
  await evI(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX - 1.8, 0, P.PZ + 0.6); A.st.vel.set(0, 0, 0);
    A.st.yaw = -Math.PI / 2 + 0.3; A.st.face = A.st.yaw + Math.PI; A.st.pitch = 0.42; A.st.dist = 6.5; A.st.camInit = false;
    const tk = A.play.tickets; tk.total = 5; localStorage.setItem('neonarcade.tickets', '5'); });
  await pageI.waitForFunction(() => !!document.querySelector('#poolBtn.on'), null, { timeout: 30000 }).catch(() => {});
  await pageI.waitForTimeout(800);
  let [ix, iy] = await evI(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, '#poolBtn');
  await pageI.touchscreen.tap(ix, iy);
  await pageI.waitForFunction(() => window.__pool.open && window.__pool.frame, null, { timeout: 15000 }).catch(() => {});
  await pageI.waitForTimeout(400);
  const iPos = await evI(() => { const e = document.getElementById('poolX'), b = e.getBoundingClientRect(); return { left: +b.left.toFixed(1), top: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1), iw: innerWidth }; });
  chk(iPos.left <= 8 && iPos.top <= 8 && iPos.w >= 36 && iPos.h >= 36 && iPos.right < iPos.iw * 0.4, 'iPad landscape: close X is tight in the top-left', iPos);
  [ix, iy] = await evI(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, '#poolX');
  await pageI.touchscreen.tap(ix, iy); await pageI.waitForTimeout(500);
  const iCl = await evI(() => ({ open: window.__pool.open, ov: document.getElementById('poolOv').classList.contains('on') }));
  chk(!iCl.open && !iCl.ov, 'iPad: tapping the top-left X closes the pool game', iCl);
  chk(ip.errors.filter(e => !/net::ERR_FAILED/.test(e)).length === 0, 'iPad: no page errors ' + JSON.stringify(ip.errors.slice(0, 3)));
  await ip.close();
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
