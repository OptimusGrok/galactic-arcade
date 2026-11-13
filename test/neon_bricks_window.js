// t776u-t779u: NEON BRICKS (Lego-brick Tetris) in room 1's big window: playfield in the middle pane with the window theme visible around it,
// score/level panel in the right-hand pane, PLAY pops up at the window, joystick/keys move, MOVE (in the backpack's place) rotates,
// ZOOM once = playfield full screen / again = back, game over / exit gives the backpack + walking back. node test/neon_bricks_window.js
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) ok = false; };
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0; }, sel);
(async () => {
  const o = await open({ w: 640, h: 360 }), page = o.page, { errors } = o;
  await page.waitForFunction(() => window.__arcade && window.__neonBricks && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  const geo = await page.evaluate(() => { const A = window.__arcade, nb = A.neonBricks, T = A.THREE, b = new T.Box3().setFromObject(nb.grp), pb = new T.Box3().setFromObject(nb.panel);
    let win = null; A.room.traverse(o => { if (!win && o.isMesh && /win/i.test(o.name) && o.geometry) { const bb = new T.Box3().setFromObject(o); if (bb.min.x > 11) win = [bb.min.toArray(), bb.max.toArray(), o.name]; } });
    return { b: [b.min.toArray(), b.max.toArray()], pb: [pb.min.toArray(), pb.max.toArray()], win, inRoom1: nb.grp.parent === A.room, G: { W: nb.G.board[0].length, H: nb.G.board.length } }; });
  const [mn, mx] = geo.b;
  chk(geo.inRoom1 && mn[0] > 11 && mx[0] < 12, 'playfield is in room 1, just inside the east window', geo.b);
  chk(mn[2] > -2.2 && mx[2] < 2.2 && mx[2] - mn[2] < 4.4, 'playfield only in the middle window section (|z| < 2.2), theme visible on both sides', geo.b);
  chk(mn[1] > 0.3 && mx[1] < 8.2 && mx[1] - mn[1] > 6.5, 'tall 10x20 well, above the floor, below the ceiling', geo.b);
  chk(geo.G.W === 10 && geo.G.H === 22, 'Neon Bricks rules (10 wide, 20 + 2 hidden rows)', geo.G);
  chk(geo.pb[0][2] > 5.5 && geo.pb[0][0] > 11, 'score / level panel floats in the right-hand window section', geo.pb);
  // away from the window: no PLAY
  chk(!(await vis(page, '#nbPlay')), 'no PLAY button away from the window');
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(9.6, 0, 0.2); A.st.vel && A.st.vel.set && A.st.vel.set(0, 0, 0); });
  await page.waitForTimeout(400);
  chk(await vis(page, '#nbPlay'), 'walking to the middle of the window pops up PLAY');
  chk(await vis(page, '#bPack'), 'backpack still there before playing');
  const tapEl = async sel => { const r = await page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, sel); await page.mouse.click(r[0], r[1]); };
  await tapEl('#nbPlay'); await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => ({ p: window.__neonBricks.playing, body: document.body.classList.contains('nbPlay'), st: window.__neonBricks.G.state, yaw: window.__arcade.st.yaw }));
  chk(s1.p && s1.body && s1.st === 'play', 'tapping PLAY starts the game', s1);
  chk(!(await vis(page, '#bPack')) && (await vis(page, '#nbMove')), 'backpack button replaced by MOVE', { pack: await vis(page, '#bPack'), move: await vis(page, '#nbMove') });
  // joystick moves blocks, not the monkey
  const pos0 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  const x0 = await page.evaluate(() => window.__neonBricks.G.cur.x);
  // (software GL here runs a few fps, so drive the arcade's own step() at 60 Hz like test/zoom.js)
  const x1 = await page.evaluate(() => { const A = window.__arcade; A.st.joy.on = true; A.st.joy.x = -1; A.st.joy.y = 0; A.st.joy.vmax = 0; A.st.joy.dist = 60;
    for (let i = 0; i < 3; i++) A.step(1 / 60); A.st.joy.x = 0; A.st.joy.on = false; A.step(1 / 60); return window.__neonBricks.G.cur.x; });
  await page.keyboard.down('ArrowRight'); const x2 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 3; i++) A.step(1 / 60); return window.__neonBricks.G.cur.x; });
  await page.keyboard.up('ArrowRight'); await page.evaluate(() => window.__arcade.step(1 / 60));
  const pos1 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  chk(x1 < x0 && x2 > x1, 'joystick left / key right move the falling block side to side', { x0, x1, x2 });
  chk(Math.hypot(pos1[0] - pos0[0], pos1[2] - pos0[2]) < 0.05, 'the monkey does not walk while playing', { pos0, pos1 });
  // MOVE rotates
  const r0 = await page.evaluate(() => [window.__neonBricks.G.cur.r, window.__neonBricks.rotates]);
  await tapEl('#nbMove'); await page.waitForTimeout(80);
  const r1 = await page.evaluate(() => [window.__neonBricks.G.cur.r, window.__neonBricks.rotates]);
  chk(r1[1] === r0[1] + 1, 'MOVE rotates the block', { r0, r1 });
  // joystick down = soft drop
  const sd = await page.evaluate(() => { const A = window.__arcade, G = window.__neonBricks.G; A.st.joy.on = true; A.st.joy.x = 0; A.st.joy.y = 1; A.st.joy.dist = 60; A.step(1 / 60); const s = G.soft; A.st.joy.y = 0; A.st.joy.on = false; A.step(1 / 60); return [s, G.soft]; });
  chk(sd[0] === true && sd[1] === false, 'joystick down soft-drops', sd);
  // hard drop locks a piece and scores
  const sc0 = await page.evaluate(() => window.__neonBricks.G.score); await page.keyboard.press('Space'); await page.waitForTimeout(150);
  const hd = await page.evaluate(() => ({ s: window.__neonBricks.G.score, n: window.__neonBricks.G.board.flat().filter(Boolean).length, jump: !!window.__arcade.jumping }));
  chk(hd.s > sc0 && hd.n === 4 && !hd.jump, 'Space hard-drops (4 bricks on the board, score up, no monkey jump)', hd);
  // ZOOM once fills the screen with the playfield; again returns
  chk(await vis(page, '#bZoom'), 'ZOOM button still offered while playing');
  const run = n => page.evaluate(n => { const A = window.__arcade, nb = A.neonBricks, cam = A.camera; for (let i = 0; i < n; i++) { nb.restoreCam(cam); A.step(1 / 60); nb.update(1 / 30); if (nb.camera(cam)) A.monkey.visible = false; } }, n);   // = frame()
  await run(5); const cam0 = await page.evaluate(() => window.__arcade.camera.position.toArray());
  await tapEl('#bZoom'); await run(60);
  const z = await page.evaluate(() => { const A = window.__arcade, nb = A.neonBricks, T = A.THREE, cam = A.camera, b = new T.Box3().setFromObject(nb.grp); cam.updateMatrixWorld();
    const pts = [[b.min.x, b.min.y, b.min.z], [b.max.x, b.max.y, b.max.z], [b.max.x, b.min.y, b.min.z], [b.max.x, b.max.y, b.min.z], [b.max.x, b.min.y, b.max.z]].map(p => new T.Vector3(...p).project(cam));
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { zoom: nb.zoom, k: nb.zoomK, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), inside: pts.every(p => Math.abs(p.x) <= 1.05 && Math.abs(p.y) <= 1.05), monkey: A.monkey.visible }; });
  chk(z.zoom && z.k > 0.95 && !z.monkey && (z.w > 1.4 || z.h > 1.4) && z.inside, 'ZOOM once: the playfield fills the screen (NDC span, all on screen)', z);
  await tapEl('#bZoom'); await run(60);
  const z2 = await page.evaluate(() => ({ zoom: window.__neonBricks.zoom, k: window.__neonBricks.zoomK, p: window.__arcade.camera.position.toArray(), m: window.__arcade.monkey.visible }));
  chk(!z2.zoom && z2.k < 0.05 && Math.hypot(z2.p[0] - cam0[0], z2.p[2] - cam0[2]) < 0.3 && z2.m, 'ZOOM again: back to the normal view', { z2, cam0 });
  // swipe still turns the camera
  const yaw0 = await page.evaluate(() => window.__arcade.st.yaw);
  await page.mouse.move(300, 150); await page.mouse.down(); for (let i = 1; i <= 8; i++) await page.mouse.move(300 + i * 15, 150); await page.mouse.up(); await page.waitForTimeout(100);
  const yaw1 = await page.evaluate(() => window.__arcade.st.yaw);
  chk(Math.abs(yaw1 - yaw0) > 0.05 && (await page.evaluate(() => window.__neonBricks.playing)), 'swiping still turns the camera while playing', { yaw0, yaw1 });
  // exit -> backpack + walking back
  await tapEl('#nbExit'); await page.waitForTimeout(200);
  const ex = await page.evaluate(() => ({ p: window.__neonBricks.playing, body: document.body.classList.contains('nbPlay') }));
  chk(!ex.p && !ex.body && (await vis(page, '#bPack')) && !(await vis(page, '#nbMove')), 'exit: backpack back, MOVE gone', ex);
  const w0 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  await page.keyboard.down('KeyA'); const w1 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 20; i++) A.step(1 / 60); return A.monkey.position.toArray(); }); await page.keyboard.up('KeyA');
  chk(Math.hypot(w1[0] - w0[0], w1[2] - w0[2]) > 0.2, 'joystick / keys walk again after exit', { w0, w1 });
  // game over also gives control back
  await page.evaluate(() => window.__neonBricks.start()); await page.waitForTimeout(100);
  const go = await page.evaluate(async () => { const nb = window.__neonBricks; for (let i = 0; i < 60 && nb.playing; i++) { nb.hardDrop(); await new Promise(r => setTimeout(r, 20)); } return { p: nb.playing, st: nb.G.state, body: document.body.classList.contains('nbPlay') }; });
  chk(!go.p && go.st === 'over' && !go.body && (await vis(page, '#bPack')), 'game over: backpack returns, walking resumes', go);
  // theme visible for every window theme: playfield never covers the side panes
  const th = await page.evaluate(() => { const out = []; for (const m of ['space', 'jungle', 'beach']) { window.__arcade.setWindow(m); out.push([m, window.__arcade.window, window.__neonBricks.grp.visible]); } window.__arcade.setWindow('space'); return out; });
  chk(th.every(t => t[0] === t[1] && t[2]), 'works with every window theme', th);
  chk(errors.length === 0, 'no page errors', errors);
  await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
