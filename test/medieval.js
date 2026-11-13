// t230 MEDIEVAL: cobblestone floor + castle stone walls (t773u: the gothic stained-glass windows and the wall shelf were removed). node test/medieval.js [phone]
const { open, play } = require('./lib');
const SH = process.env.NOSHOTS ? 0 : 1;
const PH = process.argv[2] === 'phone';
(async () => { const { page, errors, close } = await open({ phone: PH, start: true }); await page.waitForTimeout(4000); await play(page, PH, 'Astro'); await page.evaluate(() => { localStorage.setItem('neonarcade.tickets', '50'); window.__neonSync && window.__neonSync(); }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const r = await page.evaluate(() => { const A = window.__arcade; const w = A.setWalls('medieval'), f = A.setFloor('cobble'); const g = A.room.getObjectByName('gothicWindows');
    return { w, f, map: A.wallMat.map && A.wallMat.map.image.tagName, g: !g, n: 0, shelf: (() => { let k = 0; [A.room, A.room2].forEach(R => R.traverse(o => { if (/^ledge|gothic/.test(o.name)) k++; })); return k; })(), ls: [localStorage.getItem('neonarcade.walls'), localStorage.getItem('neonarcade.floor')],
      bands: ['Cyan'].every(n => !A.room.getObjectByName('wallBand' + n).visible), tiles: !!window.__startUI.opt.querySelector('[data-walls="medieval"]') && !!window.__startUI.opt.querySelector('[data-floor="cobble"]'), carpet: A.carpet.visible }; });
  chk(r.w === 'medieval' && r.f === 'cobble' && r.map === 'CANVAS' && r.g && r.shelf === 0 && r.ls[0] === 'medieval' && r.ls[1] === 'cobble' && r.bands && r.tiles && r.carpet, 'MEDIEVAL walls (t773u: plain stone, no stained-glass windows, no wall shelf) + COBBLE floor applied, saved, tiles present ' + JSON.stringify(r));
  const shot = async (pos, at, f, wait = 3000) => { await page.evaluate(([p, a]) => { window.__camOverride = { pos: p, at: a }; }, [pos, at]); await page.waitForTimeout(wait); if (SH) await page.screenshot({ path: f }); };
  const s = PH ? '_phone' : '';
  await shot([6, 2.2, 9], [-6, 3.5, -12], `shots/medieval_wide${s}.png`, 4000);
  await shot([-3, 4.5, 4], [-12, 5.9, 0], `shots/medieval_window_close${s}.png`);
  await shot([0, 2.5, 6], [0, 4, -12], `shots/medieval_north${s}.png`);
  await shot([0, 2.0, 2], [0, 0, -2.5], `shots/medieval_floor${s}.png`);
  const r2 = await page.evaluate(() => { const A = window.__arcade, R = A.room2, hm = A.hall.getObjectByName('hallWallW').material;
    return { walls: [0, 1, 2, 3].map(i => { const w = R.getObjectByName('wall' + i); return !!w && w.material === A.wallMat && A.wallMat.map.image.width === 1024; }), win: !R.getObjectByName('gothicWindows2'),
      dup: R.children.filter(c => c.name === 'gothicWindows').length, bands: ['Cyan'].every(n => !R.getObjectByName('wallBand' + n).visible), hall: hm.map === hm.userData.stone && !!hm.userData.stone }; });
  chk(r2.walls.every(Boolean) && r2.win && r2.dup === 0 && r2.bands && r2.hall, 'room 2 + hallway: stone walls, no gothic windows, no neon bands ' + JSON.stringify(r2));
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(0, 0, A.Z2 + 6); });
  await shot([4, 2.5, -29 + 9], [-4, 4.2, -29 - 10], `shots/medieval_room2${s}.png`, 5000);
  await shot([0, 1.7, -12.5], [0, 1.5, -17], `shots/medieval_hall${s}.png`);
  await page.evaluate(() => window.__arcade.monkey.position.set(0, 0, 6));
  // t235: room 2's right-hand wall is a window like room 1's; its blank cabinets are gone; both windows switch together
  const w2 = await page.evaluate(async () => { const A = window.__arcade, R = A.room2, Z2 = A.Z2;
    const right = A.blockers.filter(b => b.minX !== undefined && b.minZ < Z2 + 12 && b.maxZ > Z2 - 12 && b.minX > 12 - 3.2 && /cabinet|plinth/.test(b.kind));
    const inst = R.userData.instanced.every(im => { const m = new A.THREE.Matrix4(), v = new A.THREE.Vector3(); for (let k = 0; k < im.count; k++) { im.getMatrixAt(k, m); v.setFromMatrixPosition(m); if (v.x < -12 + 3) return false; } return true; });
    const sw2 = R.getObjectByName('spaceWindow'), out = {}; out.cab = R.userData.cabinetCount; out.right = right.length; out.inst = inst; out.wall1 = R.getObjectByName('wall1').visible; out.sw2 = !!sw2;
    out.goth = R.getObjectByName('gothicWindows2') ? 1 : 0;
    for (const m of ['jungle', 'beach', 'space']) { A.setWindow(m); if (m !== 'space') await window.__arcade.windowsReady; await new Promise(r => setTimeout(r, 300)); const W = window.__windows;
      out[m] = [A.room.getObjectByName('spaceWindow').visible, sw2.visible, !!(W.group && W.group.visible), !!(W.group2 && W.group2.visible), W.view2 ? W.view2.material === W.view.material : null]; }
    return out; });
  chk(w2.cab === 14 && w2.right === 0 && w2.inst && !w2.wall1 && w2.sw2 && w2.goth === 0, 'room 2: blank cabinets on the right wall gone (no blockers), wall replaced by the window, no gothic windows ' + JSON.stringify(w2));
  chk(w2.jungle.join() === 'false,false,true,true,true' && w2.beach.join() === 'false,false,true,true,true' && w2.space.slice(0, 4).join() === 'true,true,false,false', 'both windows switch together (space / jungle / beach), one shared view ' + JSON.stringify(w2));
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(-4, 0, A.Z2 + 4); });
  for (const m of ['jungle', 'beach']) { await page.evaluate(m => window.__arcade.setWindow(m), m); await shot([-8, 2.4, -29 + 5], [12, 4, -29 - 1], `shots/room2_window_${m}${s}.png`, 5000); }
  await page.evaluate(() => window.__arcade.setWindow('space'));
  // window tab still works with medieval walls
  const wn = await page.evaluate(() => { const A = window.__arcade; const out = ['jungle', 'beach', 'space'].map(m => A.setWindow(m)); return { out, walls: A.walls }; });
  chk(wn.out.join() === 'jungle,beach,space' && wn.walls === 'medieval', 'WINDOW tab still works with medieval walls ' + JSON.stringify(wn));
  await page.evaluate(() => { window.__camOverride = null; });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 90000 });
  chk(await page.evaluate(() => window.__arcade.walls === 'medieval' && window.__arcade.floor === 'cobble' && !window.__arcade.room.getObjectByName('gothicWindows')), 'medieval choices persist after reload');
  await page.waitForTimeout(800); await play(page, PH, 'Astro');
  const tap = async sel => { const b = await page.locator(sel).first().boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(500); };
  await tap('#bOpt'); await tap('#opTabWalls');
  await page.waitForTimeout(2500); if (SH) await page.screenshot({ path: `shots/medieval_menu_walls${s}.png` });
  await tap('#opTabFloor'); await page.waitForTimeout(2500); if (SH) await page.screenshot({ path: `shots/medieval_menu_floor${s}.png` });
  chk(await page.evaluate(() => document.getElementById('opWlMed').classList.contains('sel') && document.getElementById('opFlCob').classList.contains('sel')), 'Options shows MEDIEVAL selected on both tabs');
  await page.evaluate(() => { const A = window.__arcade; A.setWalls('current'); A.setFloor('neon'); });
  chk(await page.evaluate(() => { const A = window.__arcade, hm = A.hall.getObjectByName('hallWallW').material; return !A.room.getObjectByName('gothicWindows') && A.room.getObjectByName('wallBandCyan').visible && !A.room2.getObjectByName('gothicWindows2') && A.room2.getObjectByName('wallBandCyan').visible && hm.map === hm.userData.map0; }), 'back to CURRENT hides the gothic windows, bands return');
  chk(errors.length === 0, 'no page errors ' + errors.join('|'));
  await close(); process.exit(ok ? 0 : 1); })().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
