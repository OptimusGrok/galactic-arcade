// t564: 3D pool table on the shop's right wall (opposite the corner teleporter pad). Phone emulator: table visible, PLAY POOL button near it,
// 8-Ball Pool opens full-screen in an iframe overlay, ✕ closes it back to the shop, the player can walk afterwards. node test/pool_table.js
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 412, h: 915 }); let ok = true;
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
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
  await page.screenshot({ path: '/workspace/galactic-shop/shots/pool_table.png' });
  // tap PLAY POOL -> pays 5 tickets -> overlay + game
  await ev(() => { const t = window.__arcade.play.tickets; t.total = 7; localStorage.setItem('neonarcade.tickets', '7'); document.getElementById('tixN').textContent = '7'; });
  let [x, y] = await center('#poolBtn'); await page.touchscreen.tap(x, y);
  await page.waitForFunction(() => window.__pool.open && window.__pool.frame, null, { timeout: 10000 }).catch(() => {});
  const ok1 = await page.waitForFunction(() => { try { const d = window.__pool.frame.contentDocument; return d && d.readyState === 'complete' && d.title === '8-Ball Pool' && d.getElementById('gl'); } catch (e) { return false; } }, null, { timeout: 60000 }).then(() => true).catch(() => false);
  const ov = await ev(() => { const o = document.getElementById('poolOv').getBoundingClientRect(), f = window.__pool.frame.getBoundingClientRect(); return { on: document.getElementById('poolOv').classList.contains('on'), w: f.width, h: f.height, iw: innerWidth, ih: innerHeight, src: window.__pool.frame.src }; });
  chk(ok1 && ov.on && ov.w === ov.iw && ov.h === ov.ih && /pool-play\/index\.html$/.test(ov.src), 'pool game opens full-screen in the overlay ' + JSON.stringify(ov));
  const pay = await ev(() => ({ t: window.__arcade.play.tickets.total, ls: localStorage.getItem('neonarcade.tickets'), hud: document.getElementById('tixN').textContent }));
  chk(pay.t === 2 && pay.ls === '2' && pay.hud === '2', 'PLAY POOL takes 5 tickets (7 -> 2) and updates the HUD ' + JSON.stringify(pay));
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/workspace/galactic-shop/shots/pool_open.png' });
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
  await T('touchStart', [{ x: 100, y: 700, id: 1 }]); for (let i = 1; i <= 6; i++) await T('touchMove', [{ x: 100, y: 700 - i * 8, id: 1 }]);
  const p1 = await ev(() => { const A = window.__arcade; for (let i = 0; i < 90; i++) A.step(1 / 60); return A.monkey.position.clone(); }); await T('touchEnd', []);
  chk(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1, 'player walks after closing the game ' + JSON.stringify([p0, p1].map(p => [p.x.toFixed(2), p.z.toFixed(2)])));
  // can't walk into the table
  const p2 = await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x, P = window.__pool; A.monkey.position.set(W + P.PX, 0, P.PZ); A.st.vel.set(0, 0, 0); window.__shop.update(1 / 60); return [A.monkey.position.x - W - P.PX, A.monkey.position.z - P.PZ]; });
  chk(Math.abs(p2[0]) > 0.9 || Math.abs(p2[1]) > 1.5, 'table is solid ' + JSON.stringify(p2));
  const fs = await ev(() => window.__arcade.stats.frames); chk(fs > 0, 'arcade loop alive frames=' + fs);
  chk(errors.length === 0, 'no page errors ' + JSON.stringify(errors.slice(0, 3)));
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); await close(); process.exit(ok ? 0 : 1);
})();
