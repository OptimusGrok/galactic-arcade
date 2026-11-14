// t776u-t779u: NEON BRICKS (Lego-brick Tetris) in room 1's big window: playfield in the middle pane with the window theme visible around it,
// score/level panel in the right-hand pane, PLAY pops up at the window, D-pad/keys move (up rotates), MOVE (in the backpack's place) still rotates,
// ZOOM once = playfield full screen / again = back, game over / exit gives the backpack + walking back.
// t781u: the game is NOT drawn until PLAY (only the button at the window); the player fades out (0.3 s) and is gone while playing, others see it too.
// t791u: while playing, hide FIRE and FLY (restore on exit); pan the camera up far enough to see the top of the playfield.
// t795u: while playing, replace the joystick with a D-pad (restore the joystick on exit).
// t796u: smaller PLAY button; the darkest block (Z) is a lighter red, readable on the window themes.
// node test/neon_bricks_window.js
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
  const pb = geo.pb, pH = pb[1][1] - pb[0][1], pZ = (pb[0][2] + pb[1][2]) / 2;
  const hid0 = await page.evaluate(() => ({ g: window.__neonBricks.grp.visible, p: window.__neonBricks.panel.visible }));
  chk(!hid0.g && !hid0.p, 't781u: playfield + score panel not drawn while not playing', hid0);
  // away from the window: no PLAY
  chk(!(await vis(page, '#nbPlay')), 'no PLAY button away from the window');
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(9.6, 0, 0.2); A.st.vel && A.st.vel.set && A.st.vel.set(0, 0, 0); });
  await page.waitForTimeout(400);
  chk(await vis(page, '#nbPlay'), 'walking to the middle of the window pops up PLAY');
  const playSz = await page.evaluate(() => { const b = document.getElementById('nbPlay').getBoundingClientRect(), cs = getComputedStyle(document.getElementById('nbPlay')); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1), fs: parseFloat(cs.fontSize), padT: parseFloat(cs.paddingTop) }; });
  chk(playSz.h <= 50 && playSz.w <= 230 && playSz.fs <= 16 && playSz.h >= 32 && playSz.w >= 110, 't796u: PLAY button is smaller but still tappable ' + JSON.stringify(playSz));
  const cols = await page.evaluate(() => {
    const H = window.__neonBricks.HEX, lum = h => { const n = parseInt(h.slice(1), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
    const L = Object.fromEntries(Object.entries(H).map(([k, v]) => [k, +lum(v).toFixed(1)]));
    return { H, L, z: H.Z, zL: L.Z };
  });
  chk(/^#ff/i.test(cols.z) && cols.zL > 100 && cols.z !== '#e3000b', 't796u: the darkest block (Z) is a lighter red, readable on the window ' + JSON.stringify(cols));
  const hid1 = await page.evaluate(() => ({ g: window.__neonBricks.grp.visible, p: window.__neonBricks.panel.visible }));
  chk(!hid1.g && !hid1.p, 't781u: at the window only the PLAY button shows (no game drawn)', hid1);
  const before = await page.evaluate(() => { const A = window.__arcade, ms = []; A.nbWarm(); A.monkey.traverse(o => { if (o.material) ms.push(o.material); }); window.__nbMats0 = ms;
    window.__nbProgs0 = new Set(A.renderer.info.programs.map(p => p.id)); return { progs: A.renderer.info.programs.length, tag: !!A.monkey.getObjectByName('gaNameTag'), n: ms.length }; });
  chk(await vis(page, '#bPack'), 'backpack still there before playing');
  const tapEl = async sel => { const r = await page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, sel); await page.mouse.click(r[0], r[1]); };
  // t791u: equip the jetpack + laser pistol so FIRE and FLY are on, then they must hide while playing
  await page.evaluate(() => {
    const own = JSON.parse(localStorage.getItem('galacticarcade.wardrobeOwned') || '[]');
    for (const k of ['back:jetpack', 'hand:pistol']) if (!own.includes(k)) own.push(k);
    localStorage.setItem('galacticarcade.wardrobeOwned', JSON.stringify(own));
    const G = window.__gaPlayer; if (G) { G.pick('back', 'jetpack'); G.pick('hand', 'pistol'); }
    const A = window.__arcade; for (let i = 0; i < 8; i++) A.step(1 / 60);
    if (window.__roomFire) window.__roomFire.update(0);
  });
  const hud0 = { fire: await vis(page, '#bFire'), fly: await vis(page, '#flyHud'), bFly: await vis(page, '#bFly') };
  chk(hud0.fire && hud0.fly && hud0.bFly, 't791u: FIRE and FLY are offered before Neon Bricks starts', hud0);
  await tapEl('#nbPlay'); await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => ({ p: window.__neonBricks.playing, body: document.body.classList.contains('nbPlay'), st: window.__neonBricks.G.state, yaw: window.__arcade.st.yaw }));
  chk(s1.p && s1.body && s1.st === 'play', 'tapping PLAY starts the game', s1);
  const hud1 = { fire: await vis(page, '#bFire'), fly: await vis(page, '#flyHud'), bFly: await vis(page, '#bFly') };
  chk(!hud1.fire && !hud1.fly && !hud1.bFly, 't791u: FIRE and FLY hide while Neon Bricks is playing', hud1);
  const sh = await page.evaluate(() => ({ g: window.__neonBricks.grp.visible, p: window.__neonBricks.panel.visible }));
  chk(sh.g && sh.p, 't781u: the playfield + score panel appear when PLAY is tapped', sh);
  // player fade (driven at 60 Hz steps; software GL here is a few fps)
  const fd = await page.evaluate(() => { const A = window.__arcade, m0 = window.__nbMats0; A.nbFade(1 / 60); A.nbFade(0.1); window.__nbFadeCl = [...A.pfClones.values()]; const mid = { k: A.playerFade, ops: [] }; let swapped = 0, tr = 0;
    A.monkey.traverse(o => { if (o.material) { if (!m0.includes(o.material)) swapped++; if (o.material.transparent) tr++; mid.ops.push(o.material.opacity); } });
    const orig = m0.every(m => m.opacity === 1 || m.opacity > 0.99 || true) && m0.filter(m => m.opacity < 1 && !m.transparent).length === 0;
    for (let i = 0; i < 12; i++) A.nbFade(1 / 60); const end = { k: A.playerFade, vis: A.monkey.visible };
    return { mid: { k: mid.k, maxOp: Math.max(...mid.ops), swapped, tr }, orig, end, restored: (() => { let r = 0; A.monkey.traverse(o => { if (o.material && m0.includes(o.material)) r++; }); return r; })(), n: m0.length }; });
  chk(fd.mid.k > 0 && fd.mid.k < 0.9 && fd.mid.maxOp < 0.9 && fd.mid.swapped === fd.n, 't781u: the player (body, accessories, name tag) fades: part-way after ~0.1 s (+ any real frames), on transparent copies of its materials', fd.mid);
  chk(fd.end.k === 0 && !fd.end.vis && fd.restored === fd.n, 'gone after 0.3 s (shared materials untouched / put back)', { end: fd.end, restored: fd.restored, n: fd.n });
  await page.waitForTimeout(1500);
  const gone = await page.evaluate(() => { const A = window.__arcade, nb = A.neonBricks, P = A.renderer.properties, fresh = [];
    for (const m of [...nb.mats, nb.panel.material, ...nb.grp.children.map(c => c.material)]) { const pr = P.get(m).currentProgram; if (pr && !window.__nbProgs0.has(pr.id)) fresh.push(m.name || m.type); }
    return { vis: A.monkey.visible, fresh: [...new Set(fresh)], progs: A.renderer.info.programs.length }; });
  chk(!gone.vis, 'stays hidden over real frames while playing', gone);
  const clp = await page.evaluate(() => { const P = window.__arcade.renderer.properties; let used = 0, fresh = 0; for (const m of window.__nbFadeCl) { const pr = P.get(m).currentProgram; if (pr) { used++; if (!window.__nbProgs0.has(pr.id)) fresh++; } } return { clones: window.__nbFadeCl.length, used, fresh }; });
  chk(clp.fresh === 0, 'the fade uses pre-warmed transparent shader variants', clp);
  chk(gone.fresh.length === 0, 'the game draws with pre-warmed shaders (no compile when PLAY is tapped)', gone);
  const mp = await page.evaluate(async () => { const M = window.__mp; if (!M || !M.animOf || !M._onState) return null; const me = M.animOf();
    const A = window.__arcade; M._onState({ i: 'nbtest', x: 9.0, y: 0, z: 3.0, r: 0, a: 'idle', m: 'room1' }); await new Promise(r => setTimeout(r, 1200));
    const p = M.peers.get('nbtest'), v0 = p && p.g.visible; M._onState({ i: 'nbtest', x: 9.0, y: 0, z: 3.0, r: 0, a: 'nb', m: 'room1' });
    const t0 = performance.now(); while (performance.now() - t0 < 6000 && p.nbF > 0) await new Promise(r => setTimeout(r, 100)); const v1 = p.g.visible, f1 = p.nbF;
    M._onState({ i: 'nbtest', x: 9.0, y: 0, z: 3.0, r: 0, a: 'idle', m: 'room1' }); const t1 = performance.now(); while (performance.now() - t1 < 6000 && p.nbF < 1) await new Promise(r => setTimeout(r, 100));
    return { me, v0, v1, f1, back: p.g.visible && p.nbF === 1 }; });
  chk(!mp || mp.me === 'nb', "multiplayer: my state is 'nb' while playing (others fade me out; older clients show me idle)", mp);
  chk(!mp || (mp.v0 && !mp.v1 && mp.f1 === 0 && mp.back), 'another player who starts Neon Bricks fades out and back in on my screen', mp);
  chk(!(await vis(page, '#bPack')) && (await vis(page, '#nbMove')), 'backpack button replaced by MOVE', { pack: await vis(page, '#bPack'), move: await vis(page, '#nbMove') });
  const padOn = await vis(page, '#nbPad');
  const joyOn = await vis(page, '#joy');
  chk(padOn && !joyOn, 't795u: D-pad replaces the joystick while playing', { pad: padOn, joy: joyOn });
  // D-pad / keys move blocks, not the monkey
  const pos0 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  const x0 = await page.evaluate(() => window.__neonBricks.G.cur.x);
  // (software GL here runs a few fps, so drive the arcade's own step() at 60 Hz like test/zoom.js)
  const x1 = await page.evaluate(() => { const A = window.__arcade; A.st.joy.on = true; A.st.joy.x = -1; A.st.joy.y = 0; A.st.joy.vmax = 0; A.st.joy.dist = 60;
    for (let i = 0; i < 3; i++) A.step(1 / 60); A.st.joy.x = 0; A.st.joy.on = false; A.step(1 / 60); return window.__neonBricks.G.cur.x; });
  await page.keyboard.down('ArrowRight'); const x2 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 3; i++) A.step(1 / 60); return window.__neonBricks.G.cur.x; });
  await page.keyboard.up('ArrowRight'); await page.evaluate(() => window.__arcade.step(1 / 60));
  const pos1 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  chk(x1 < x0 && x2 > x1, 'held left / key right move the falling block side to side', { x0, x1, x2 });
  // D-pad left / right / down / up (up = rotate, safer than a hard drop). MOVE still rotates.
  const dx0 = await page.evaluate(() => window.__neonBricks.G.cur.x);
  await page.locator('#nbPad [data-nbd="l"]').hover(); await page.mouse.down();
  const dx1 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 3; i++) A.step(1 / 60); return window.__neonBricks.G.cur.x; });
  await page.mouse.up(); await page.evaluate(() => window.__arcade.step(1 / 60));
  await page.locator('#nbPad [data-nbd="r"]').hover(); await page.mouse.down();
  const dx2 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 3; i++) A.step(1 / 60); return window.__neonBricks.G.cur.x; });
  await page.mouse.up(); await page.evaluate(() => window.__arcade.step(1 / 60));
  chk(dx1 < dx0 && dx2 > dx1, 'D-pad left / right move the falling block', { dx0, dx1, dx2 });
  const rot0 = await page.evaluate(() => window.__neonBricks.rotates);
  await tapEl('#nbPad [data-nbd="u"]'); await page.waitForTimeout(80);
  const rot1 = await page.evaluate(() => window.__neonBricks.rotates);
  chk(rot1 === rot0 + 1, 'D-pad up rotates (same as MOVE, not a hard drop)', { rot0, rot1 });
  chk(Math.hypot(pos1[0] - pos0[0], pos1[2] - pos0[2]) < 0.05, 'the monkey does not walk while playing', { pos0, pos1 });
  // MOVE rotates
  const r0 = await page.evaluate(() => [window.__neonBricks.G.cur.r, window.__neonBricks.rotates]);
  await tapEl('#nbMove'); await page.waitForTimeout(80);
  const r1 = await page.evaluate(() => [window.__neonBricks.G.cur.r, window.__neonBricks.rotates]);
  chk(r1[1] === r0[1] + 1, 'MOVE rotates the block', { r0, r1 });
  // D-pad / joystick down = soft drop
  const sd = await page.evaluate(() => { const A = window.__arcade, G = window.__neonBricks.G; A.st.joy.on = true; A.st.joy.x = 0; A.st.joy.y = 1; A.st.joy.dist = 60; A.step(1 / 60); const s = G.soft; A.st.joy.y = 0; A.st.joy.on = false; A.step(1 / 60); return [s, G.soft]; });
  chk(sd[0] === true && sd[1] === false, 'held down soft-drops', sd);
  const sdPad = await page.evaluate(() => {
    const A = window.__arcade, G = window.__neonBricks.G, b = document.querySelector('#nbPad [data-nbd="d"]');
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, isPrimary: true }));
    A.step(1 / 60); const s = G.soft;
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9, isPrimary: true }));
    A.step(1 / 60); return [s, G.soft];
  });
  chk(sdPad[0] === true && sdPad[1] === false, 'D-pad down soft-drops', sdPad);
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
  // t791u: pan up (pitch to the Neon Bricks look-up limit) until the top of the playfield is on screen
  const top0 = await page.evaluate(() => {
    const A = window.__arcade, nb = A.neonBricks, T = A.THREE, cam = A.camera, b = new T.Box3().setFromObject(nb.grp);
    cam.updateMatrixWorld();
    const ys = [[b.min.x, b.max.y, b.min.z], [b.max.x, b.max.y, b.max.z], [b.min.x, b.max.y, b.max.z], [b.max.x, b.max.y, b.min.z]].map(p => new T.Vector3(...p).project(cam).y);
    return { pitch: A.st.pitch, maxY: Math.max(...ys), minY: Math.min(...ys) };
  });
  const top1 = await page.evaluate(() => {
    const A = window.__arcade, nb = A.neonBricks, T = A.THREE, cam = A.camera;
    A.st.pitch = -1.35; A.st.lookT = A.st.t;
    for (let i = 0; i < 60; i++) { nb.restoreCam(cam); A.step(1 / 60); nb.update(1 / 60); if (nb.camera(cam)) A.monkey.visible = false; }
    cam.updateMatrixWorld();
    const b = new T.Box3().setFromObject(nb.grp);
    const pts = [[b.min.x, b.max.y, b.min.z], [b.max.x, b.max.y, b.max.z], [b.min.x, b.max.y, b.max.z], [b.max.x, b.max.y, b.min.z]].map(p => new T.Vector3(...p).project(cam));
    const ys = pts.map(p => p.y);
    return { pitch: A.st.pitch, maxY: Math.max(...ys), minY: Math.min(...ys), on: pts.every(p => p.y <= 1.05 && p.y >= -1.15) };
  });
  chk(top1.pitch <= -1.3 && top1.maxY <= 1.05 && top1.on, 't791u: panning the camera up shows the top of the Neon Bricks playfield', { top0, top1 });
  // exit -> backpack + walking back
  await tapEl('#nbExit'); await page.waitForTimeout(200);
  const ex = await page.evaluate(() => ({ p: window.__neonBricks.playing, body: document.body.classList.contains('nbPlay') }));
  chk(!ex.p && !ex.body && (await vis(page, '#bPack')) && !(await vis(page, '#nbMove')) && !(await vis(page, '#nbPad')), 'exit: backpack back, MOVE and D-pad gone', ex);
  await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 8; i++) A.step(1 / 60); if (window.__roomFire) window.__roomFire.update(0); });
  const hud2 = { fire: await vis(page, '#bFire'), fly: await vis(page, '#flyHud'), bFly: await vis(page, '#bFly') };
  chk(hud2.fire && hud2.fly && hud2.bFly, 't791u: FIRE and FLY return after leaving Neon Bricks', hud2);
  const back = await page.evaluate(() => { const A = window.__arcade, m0 = window.__nbMats0; for (let i = 0; i < 25; i++) { A.step(1 / 60); A.nbFade(1 / 60); } let r = 0, tr = 0; A.monkey.traverse(o => { if (o.material && m0.includes(o.material)) r++; }); return { k: A.playerFade, vis: A.monkey.visible, r, n: m0.length, g: A.neonBricks.grp.visible, p: A.neonBricks.panel.visible }; });
  chk(back.k === 1 && back.vis && back.r === back.n, 't781u: on exit the player fades back in (original materials back)', back);
  chk(!back.g && !back.p, 't781u: game hidden again after exit', back);
  const w0 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  await page.keyboard.down('KeyA'); const w1 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 20; i++) A.step(1 / 60); return A.monkey.position.toArray(); }); await page.keyboard.up('KeyA');
  chk(Math.hypot(w1[0] - w0[0], w1[2] - w0[2]) > 0.2, 'joystick / keys walk again after exit', { w0, w1 });
  // game over also gives control back
  await page.evaluate(() => window.__neonBricks.start()); await page.waitForTimeout(100);
  const go = await page.evaluate(async () => { const nb = window.__neonBricks; for (let i = 0; i < 60 && nb.playing; i++) { nb.hardDrop(); await new Promise(r => setTimeout(r, 20)); } return { p: nb.playing, st: nb.G.state, body: document.body.classList.contains('nbPlay') }; });
  chk(!go.p && go.st === 'over' && !go.body && (await vis(page, '#bPack')), 'game over: backpack returns, walking resumes', go);
  const goH = await page.evaluate(() => { const nb = window.__neonBricks, a = nb.grp.visible; for (let i = 0; i < 40; i++) nb.update(0.05); return { during: a, after: nb.grp.visible || nb.panel.visible }; });
  chk(goH.during && !goH.after, 't781u: after game over a short GAME OVER beat, then the game is hidden again', goH);
  // theme visible for every window theme: playfield never covers the side panes
  const th = await page.evaluate(() => { const out = []; for (const m of ['space', 'jungle', 'beach']) { window.__arcade.setWindow(m); out.push([m, window.__arcade.window, !window.__neonBricks.grp.visible]); } window.__arcade.setWindow('space'); return out; });
  chk(th.every(t => t[0] === t[1] && t[2]), 'every window theme: nothing drawn over it when not playing', th);
  chk(errors.length === 0, 'no page errors', errors);
  await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
