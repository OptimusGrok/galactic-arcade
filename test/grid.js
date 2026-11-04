// t214 dev GRID: hidden TICKETS menu toggle (default OFF, saved), grid on every floor, cell = ticket machine base, machine on one cell,
// tap a cell -> green, tap again -> clear (no jump), a drag still moves, cells + toggle persist. node test/grid.js [phone]
const { open, play } = require('./lib'); const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '_desktop';
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const o = await open(PH ? { phone: true, start: true, w: 412, h: 860, supa } : { start: true, w: 1280, h: 720, supa }); const { page, errors } = o; page.setDefaultTimeout(60000);
  const ev = (f, a) => page.evaluate(f, a), VW = PH ? 412 : 1280;
  const tapXY = async (x, y) => { if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(250); };
  const tap = async sel => { const b = await page.locator(sel).first().boundingBox(); await tapXY(b.x + b.width / 2, b.y + b.height / 2); };
  await page.waitForTimeout(1200);
  chk(await ev(() => !window.__grid.on && !window.__grid.group.visible && localStorage.getItem('neonarcade.grid') === null), 'GRID is OFF by default');
  // open the hidden menu: triple-tap top-right + pattern 1-4-7-2-9-6-3-8-5
  await ev(() => { const h = document.getElementById('secHot'), r = h.getBoundingClientRect(); for (let i = 0; i < 3; i++) h.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + 30, clientY: r.top + 30 })); });
  await page.waitForTimeout(300);
  const D = await ev(() => { const r = document.getElementById('secP').getBoundingClientRect(), o = []; for (let i = 0; i < 9; i++) o.push([r.left + r.width * (0.17 + 0.33 * (i % 3)), r.top + r.height * (0.17 + 0.33 * Math.floor(i / 3))]); return o; });
  { const p = [1, 4, 7, 2, 9, 6, 3, 8, 5].map(n => D[n - 1]); await page.mouse.move(p[0][0], p[0][1]); await page.mouse.down(); for (let k = 1; k < p.length; k++) await page.mouse.move(p[k][0], p[k][1], { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(500); }
  chk(await ev(() => !!document.querySelector('#tk.on') && document.getElementById('tkGrid').textContent === 'GRID: OFF'), 'TICKETS panel has GRID: OFF');
  await tap('#tkGrid');
  const m = await ev(() => ({ t: document.getElementById('tkGrid').textContent, on: document.getElementById('tkGrid').classList.contains('on'), ls: localStorage.getItem('neonarcade.grid'), g: window.__grid.on }));
  chk(m.t === 'GRID: ON' && m.on && m.ls === '1' && m.g, 'tapping it turns GRID ON (saved) ' + JSON.stringify(m));
  await page.screenshot({ path: 'shots/grid_menu' + sfx + '.png' });
  await tap('#tkDone'); await play(page, PH, 'Astro'); await page.waitForTimeout(500);
  // cell = ticket machine base, measured independently from the plinth mesh (lowest box of the kiosk)
  const sz = await ev(() => { const T = window.__arcade.THREE, K = window.__arcade.scene.getObjectByName('ticketKiosk'); let best = null;
    K.traverse(o => { if (o.isMesh) { const b = new T.Box3().setFromObject(o); if (b.min.y < 0.01 && (!best || b.max.y < best.max.y)) best = b; } });
    const G = window.__grid; return { cell: G.cell, base: [best.max.x - best.min.x, best.max.z - best.min.z], min: [best.min.x, best.min.z], origin: G.origin, rects: G.rects.map(r => r.n), lines: G.lines, vis: G.group.visible, kids: G.group.children.length }; });
  const near = (a, b) => Math.abs(a - b) < 1e-4;
  chk(near(sz.cell[0], sz.base[0]) && near(sz.cell[1], sz.base[1]), 'cell = ticket machine base ' + sz.cell.map(v => v.toFixed(3)).join(' x ') + ' m');
  chk(near(sz.origin[0], sz.min[0]) && near(sz.origin[1], sz.min[1]), 'grid aligned: the machine base sits exactly on one cell');
  chk(sz.vis && sz.rects.join() === 'room1,hallway,room2,white' && sz.lines > 100, 'grid on every floor ' + JSON.stringify(sz.rects) + ', ' + sz.lines + ' lines, ' + sz.kids + ' draw object(s)');
  // aim the camera at the floor beside the machine and tap cells
  await ev(() => { const A = window.__arcade; A.monkey.position.set(-4, 0, 6); window.__camOverride = { pos: [0, 4.2, 4.2], at: [0, 0, 0.6] }; });
  await page.waitForTimeout(1200);
  const pick = await ev(VW => { const A = window.__arcade, T = A.THREE, G = window.__grid, out = [];
    for (const [i, j] of [[1, 2], [2, 3], [-2, 2], [1, 4], [2, 1]]) { const p = new T.Vector3(G.origin[0] + (i + 0.5) * G.cell[0], 0, G.origin[1] + (j + 0.5) * G.cell[1]).project(A.camera);
      const x = (p.x + 1) / 2 * innerWidth, y = (1 - p.y) / 2 * innerHeight, c = G.cellAt(x, y); if (c && c.join() === i + ',' + j) out.push({ k: i + ',' + j, x, y, right: x > innerWidth / 2 + 10 }); } return out; }, VW);
  const R = pick.filter(p => p.right), L = pick.filter(p => !p.right);
  chk(R.length >= 1, 'visible floor cells to tap ' + JSON.stringify(pick.map(p => p.k)));
  const S = () => ev(() => ({ cells: [...window.__grid.cells], jumps: window.__arcade.st.jumpReq, y: +window.__arcade.monkey.position.y.toFixed(3), fills: !!window.__arcade.scene.getObjectByName('gridFills') }));
  const s0 = await S(); await tapXY(R[0].x, R[0].y); await page.waitForTimeout(200); const s1 = await S();
  chk(s1.cells.includes(R[0].k) && s1.fills && s1.cells.length === s0.cells.length + 1, 'tap a cell -> green (' + R[0].k + ')');
  chk(!PH || s1.jumps === s0.jumps, 'that tap did not also jump');
  await tapXY(R[0].x, R[0].y); const s2 = await S(); chk(!s2.cells.includes(R[0].k) && s2.cells.length === s0.cells.length, 'tap it again -> cleared');
  // a tap on the machine itself does not mark a cell
  const kc = await ev(() => { const A = window.__arcade, T = A.THREE, p = new T.Vector3(0, 0.9, 0).project(A.camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight, window.__grid.cellAt((p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight)]; });
  chk(kc[2] === null, 'a tap on the ticket machine is not a floor cell');
  // two green cells for the shot
  for (const p of [...R.slice(0, 2), ...L.slice(0, 1)]) await tapXY(p.x, p.y);
  const s3 = await S(); chk(s3.cells.length >= 2, 'several cells marked ' + JSON.stringify(s3.cells));
  await ev(() => { window.__camOverride = { pos: [5.5, 6.5, 7.5], at: [0, 0, 0] }; }); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/grid_room1' + sfx + '.png' });
  // drag still moves (phone: joystick drag on the left half; desktop: W key)
  await ev(() => { window.__camOverride = null; const A = window.__arcade; A.monkey.position.set(-4, 0, 6); A.st.vel.set(0, 0, 0); }); await page.waitForTimeout(400);
  const p0 = await ev(() => window.__arcade.monkey.position.toArray()), c0 = (await S()).cells.length;
  if (PH) { const cdp = await page.context().newCDPSession(page); const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await tp('touchStart', 100, 650); for (let k = 1; k <= 10; k++) { await tp('touchMove', 100, 650 - k * 6); await page.waitForTimeout(60); } await page.waitForTimeout(900); await tp('touchEnd'); }
  else { await page.keyboard.down('KeyW'); await page.waitForFunction(p0 => { const m = window.__arcade.monkey.position; return Math.hypot(m.x - p0[0], m.z - p0[2]) > 0.6; }, p0, { timeout: 20000 }).catch(() => {}); await page.keyboard.up('KeyW'); }   // hold until he moves (slow software GL)
  await page.waitForTimeout(300); const p1 = await ev(() => window.__arcade.monkey.position.toArray());
  chk(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) > 0.5 && (await S()).cells.length === c0, 'a drag still moves the monkey (' + Math.hypot(p1[0] - p0[0], p1[2] - p0[2]).toFixed(2) + ' m) and marks nothing');
  // room 2 shot (mark a cell there through the same tap path)
  await ev(Z2 => { const A = window.__arcade; A.monkey.position.set(3, 0, Z2 + 4); window.__camOverride = { pos: [0, 7, Z2 + 9], at: [0, 0, Z2 + 1] }; }, -29); await page.waitForTimeout(1500);
  const r2 = await ev(() => { const A = window.__arcade, T = A.THREE, G = window.__grid, out = []; for (const [x, z] of [[1.2, -29], [-2, -28], [2.5, -27]]) { const p = new T.Vector3(x, 0, z).project(A.camera); out.push([(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]); } return out; });
  for (const [x, y] of r2) await tapXY(x, y);
  const n2 = await ev(() => [...window.__grid.cells].filter(k => +k.split(',')[1] < -20).length); chk(n2 >= 2, 'cells marked in room 2 too (' + n2 + ')');
  await page.waitForTimeout(600); await page.screenshot({ path: 'shots/grid_room2' + sfx + '.png' });
  // persistence
  const before = await ev(() => [...window.__grid.cells].sort().join('|'));
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await page.waitForTimeout(1500);
  const after = await ev(() => ({ on: window.__grid.on, vis: window.__grid.group.visible, c: [...window.__grid.cells].sort().join('|'), fills: !!window.__arcade.scene.getObjectByName('gridFills') }));
  chk(after.on && after.vis && after.c === before && after.fills, 'GRID on + green cells persist after reload');
  await ev(() => window.__grid.set(false)); chk(await ev(() => !window.__grid.group.visible && localStorage.getItem('neonarcade.grid') === '0'), 'GRID OFF hides it (saved)');
  chk(errors.length === 0, 'no page errors ' + errors.join('|')); await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
