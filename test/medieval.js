// t230 MEDIEVAL: cobblestone floor + castle stone walls with gothic stained-glass windows. node test/medieval.js [phone]
const { open, play } = require('./lib');
const PH = process.argv[2] === 'phone';
(async () => { const { page, errors, close } = await open({ phone: PH, start: true }); await page.waitForTimeout(1000); await play(page, PH, 'Astro'); await page.evaluate(() => { localStorage.setItem('neonarcade.tickets', '50'); window.__neonSync && window.__neonSync(); }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const r = await page.evaluate(() => { const A = window.__arcade; const w = A.setWalls('medieval'), f = A.setFloor('cobble'); const g = A.room.getObjectByName('gothicWindows');
    return { w, f, map: A.wallMat.map && A.wallMat.map.image.tagName, g: !!g && g.visible, n: g && g.getObjectByName('gothicGlass').geometry.attributes.position.count / 4, ls: [localStorage.getItem('neonarcade.walls'), localStorage.getItem('neonarcade.floor')],
      bands: ['Pink', 'Amber', 'Cyan'].every(n => !A.room.getObjectByName('wallBand' + n).visible), tiles: !!window.__startUI.opt.querySelector('[data-walls="medieval"]') && !!window.__startUI.opt.querySelector('[data-floor="cobble"]'), carpet: A.carpet.visible }; });
  chk(r.w === 'medieval' && r.f === 'cobble' && r.map === 'CANVAS' && r.g && r.n === 9 && r.ls[0] === 'medieval' && r.ls[1] === 'cobble' && r.bands && r.tiles && r.carpet, 'MEDIEVAL walls (9 gothic windows) + COBBLE floor applied, saved, tiles present ' + JSON.stringify(r));
  const shot = async (pos, at, f, wait = 3000) => { await page.evaluate(([p, a]) => { window.__camOverride = { pos: p, at: a }; }, [pos, at]); await page.waitForTimeout(wait); await page.screenshot({ path: f }); };
  const s = PH ? '_phone' : '';
  await shot([6, 2.2, 9], [-6, 3.5, -12], `shots/medieval_wide${s}.png`, 4000);
  await shot([-3, 4.5, 4], [-12, 5.9, 0], `shots/medieval_window_close${s}.png`);
  await shot([0, 2.5, 6], [0, 4, -12], `shots/medieval_north${s}.png`);
  await shot([0, 2.0, 2], [0, 0, -2.5], `shots/medieval_floor${s}.png`);
  // window tab still works with medieval walls
  const wn = await page.evaluate(() => { const A = window.__arcade; const out = ['jungle', 'beach', 'space'].map(m => A.setWindow(m)); return { out, walls: A.walls }; });
  chk(wn.out.join() === 'jungle,beach,space' && wn.walls === 'medieval', 'WINDOW tab still works with medieval walls ' + JSON.stringify(wn));
  await page.evaluate(() => { window.__camOverride = null; });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 90000 });
  chk(await page.evaluate(() => window.__arcade.walls === 'medieval' && window.__arcade.floor === 'cobble' && window.__arcade.room.getObjectByName('gothicWindows').visible), 'medieval choices persist after reload');
  await page.waitForTimeout(800); await play(page, PH, 'Astro');
  const tap = async sel => { const b = await page.locator(sel).first().boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(500); };
  await tap('#flBtn'); await tap('#tabWalls');
  await page.waitForTimeout(2500); await page.screenshot({ path: `shots/medieval_menu_walls${s}.png` });
  await tap('#tabFloor'); await page.waitForTimeout(2500); await page.screenshot({ path: `shots/medieval_menu_floor${s}.png` });
  chk(await page.evaluate(() => document.getElementById('wlMed').classList.contains('sel') && document.getElementById('flCob').classList.contains('sel')), 'menu shows MEDIEVAL selected on both tabs');
  await page.evaluate(() => { const A = window.__arcade; A.setWalls('current'); A.setFloor('neon'); });
  chk(await page.evaluate(() => !window.__arcade.room.getObjectByName('gothicWindows').visible && window.__arcade.room.getObjectByName('wallBandPink').visible), 'back to CURRENT hides the gothic windows, bands return');
  chk(errors.length === 0, 'no page errors ' + errors.join('|'));
  await close(); process.exit(ok ? 0 : 1); })().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
