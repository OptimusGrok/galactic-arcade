// t209/t210 WINDOW option: FLOOR·WALLS menu has a WINDOW tab (SPACE / JUNGLE / BEACH), separate from walls; HD painted views with
// parallax layers, weather, drawn animals; old walls='windows' migrates; 1 ticket via the HUD button, re-pick free. node test/windows.js [phone]
const { open } = require('./lib'); const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '_desktop', SH = process.env.NOSHOTS ? 0 : 1;
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const O = PH ? { phone: true, w: 390, h: 844 } : {};
  let o = await open(O), page = o.page; page.setDefaultTimeout(90000);
  // migration: an old save with walls = 'windows' -> walls current + window jungle
  await page.evaluate(() => { localStorage.setItem('neonarcade.walls', 'windows'); localStorage.removeItem('neonarcade.window'); }); await page.reload();
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3);
  const mg = await page.evaluate(() => ({ walls: window.__arcade.walls, win: window.__arcade.window, lsW: localStorage.getItem('neonarcade.walls'), lsN: localStorage.getItem('neonarcade.window'), on: window.__windows.on }));
  chk(mg.walls === 'current' && mg.win === 'jungle' && mg.lsW === 'current' && mg.lsN === 'jungle' && mg.on, 'old walls=windows migrates to walls current + window jungle ' + JSON.stringify(mg));
  // menu: WINDOW tab with 3 tiles that fit; walls tab has 3 tiles (no WINDOWS)
  const T = await page.evaluate(() => { const U = window.__startUI, opt = U.opt; return { wl: [...opt.querySelectorAll('.wlT')].map(e => e.dataset.walls), wn: [...opt.querySelectorAll('.wnT')].map(e => e.dataset.win), tab: !!opt.querySelector('#tabWin') }; });
  chk(T.tab && T.wl.join() === 'current,viking,portals,medieval' && T.wn.join() === 'space,jungle,beach', 'WINDOW tab (space, jungle, beach); walls are current, viking, portals, medieval ' + JSON.stringify(T));
  // in game via the HUD button: tickets, fit, shot
  await page.evaluate(() => { localStorage.setItem('neonarcade.tickets', '3'); window.__neonSync && window.__neonSync(); window.__startUI.openOpt(false); const s = document.getElementById('start'); if (s && window.__start && !window.__start.dismissed) { window.__start.dismissed = true; s.remove(); } });
  await page.evaluate(() => { if (window.__opts && window.__opts.show) window.__opts.show(true); }); await page.waitForTimeout(400);
  const tapSel = async sel => { const b = await page.locator(sel).first().boundingBox(); if (PH) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(400); };
  await tapSel('#opTabWin');
  const fit = await page.evaluate(() => { const p = document.querySelector('#gOpt .opBox').getBoundingClientRect(); return ['#opTabFloor', '#opTabWalls', '#opTabWin', '#opWnSpace', '#opWnJungle', '#opWnBeach'].map(s => { const b = document.querySelector(s).getBoundingClientRect(); return b.width > 20 && b.left >= p.left && b.right <= p.right && b.top >= 0 && b.bottom <= innerHeight; }); });
  chk(fit.every(Boolean), 'tabs + 3 window tiles fit inside the panel on screen ' + fit);
  if (SH) await page.screenshot({ path: 'shots/window_menu' + sfx + '.png' });
  const t0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  await tapSel('#opWnJungle'); const t1 = await page.evaluate(() => window.__arcade.play.tickets.total);
  await tapSel('#opWnBeach'); const t2 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, w: window.__arcade.window, ls: localStorage.getItem('neonarcade.window'), sel: document.querySelector('#opWnBeach').classList.contains('sel') }));
  chk(t1 === t0 && t2.t === t0 - 1 && t2.w === 'beach' && t2.ls === 'beach' && t2.sel, 're-picking JUNGLE free, BEACH costs 1 ticket, saved ' + JSON.stringify([t0, t1, t2]));
  await page.evaluate(() => window.__arcade.setWalls('viking')); const combo = await page.evaluate(() => ({ w: window.__arcade.walls, win: window.__arcade.window, on: window.__windows.on }));
  chk(combo.w === 'viking' && combo.win === 'beach' && combo.on, 'window choice combines with any walls ' + JSON.stringify(combo));
  await page.evaluate(() => { window.__arcade.setWalls('current'); if (window.__opts && window.__opts.show) window.__opts.show(false); });
  // weather + animals + perf
  const ph = await page.evaluate(() => { const W = window.__windows, out = {}; for (const p of [10, 60, 110, 155, 205]) { W.setPhase(p); out[p] = W.weather().name; } W.setPhase(null); return out; });
  chk(ph[10] === 'sunny' && ph[60] === 'clouds' && ph[110] === 'rain' && ph[155] === 'clearing' && ph[205] === 'sunset', 'weather cycle ' + JSON.stringify(ph));
  await page.evaluate(() => window.__arcade.setWindow('jungle'));
  const sp = await page.evaluate(() => { const W = window.__windows; for (const k of ['tiger', 'elephant', 'parrot', 'toucan', 'giraffe', 'tapir', 'monkey']) W.spawn(k); return W.J.walkers.map(a => a.k + a.depth); });
  chk(sp.length >= 7, 'drawn animals walk / fly past at depths: ' + sp.join(','));
  const shot = async (name, win, phase, cam) => { await page.evaluate(([win, phase, cam]) => { const A = window.__arcade; A.setWindow(win); const W = window.__windows; W.setPhase(phase); A.monkey.position.set(3, 0, 0); window.__camOverride = { pos: cam[0], at: cam[1] };
      if (win === 'jungle') { W.J.walkers.length = 0; W.J.next = 1e12; const a = W.spawn('elephant'); a.x = 700; a.depth = 2; const b = W.spawn('giraffe'); b.x = 1300; b.depth = 1; const c = W.spawn('tiger'); c.x = 400; c.depth = 1; const d = W.spawn('parrot'); d.x = 1000; const e = W.spawn('rhino'); e.x = 1500; e.depth = 0; } }, [win, phase, cam]);
    await page.waitForTimeout(2500); if (SH) await page.screenshot({ path: 'shots/' + name + sfx + '.png' }); };
  const CAM = [[-4, 3.6, 0], [12, 4.2, 0]];
  await shot('window_jungle_hd', 'jungle', 10, CAM); const d0 = await page.evaluate(() => [window.__windows.draws, window.__arcade.stats.frames]); await page.waitForTimeout(1500); const d1 = await page.evaluate(() => [window.__windows.draws, window.__arcade.stats.frames]);
  const dr = d1[0] - d0[0], fr = d1[1] - d0[1];   // capped at ~20 fps; on a slow test box it redraws on every rendered frame
  chk(dr >= Math.min(15, fr * 0.5) && dr <= 34, 'animates at up to ~20 fps (' + dr + ' redraws / ' + fr + ' frames in 1.5 s)');
  await shot('window_beach_hd', 'beach', 10, CAM); await shot('window_rain_hd', 'jungle', 110, CAM); await shot('window_sunset_hd', 'beach', 205, CAM); await shot('window_rainbow_hd', 'jungle', 158, CAM);
  const perf = await page.evaluate(() => ({ ms: +window.__windows.ms.toFixed(1), max: +window.__windows.msMax.toFixed(1), size: window.__windows.size }));
  chk(perf.ms < (PH ? 18 : 12), 'canvas draw cost ' + JSON.stringify(perf));
  // parallax: layers shift with the camera
  const px = await page.evaluate(async () => { window.__camOverride = null; const M = window.__arcade.monkey; M.position.set(0, 0, -5); await new Promise(r => setTimeout(r, 2000)); const a = window.__windows.par; M.position.set(0, 0, 5); await new Promise(r => setTimeout(r, 2000)); return [a, window.__windows.par]; });
  chk(Math.abs(px[1] - px[0]) > 0.1, 'look-through parallax ' + px.map(v => v.toFixed(3)));
  const back = await page.evaluate(() => { window.__arcade.setWindow('space'); return [window.__windows.group.visible, window.__arcade.scene.getObjectByName('spaceWindow').visible, localStorage.getItem('neonarcade.window')]; });
  chk(back[0] === false && back[1] === true && back[2] === 'space', 'SPACE restores the space view');
  chk(o.errors.length === 0, 'no page errors ' + o.errors.join('|')); await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
