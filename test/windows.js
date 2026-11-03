// t198 WINDOWS walls: picker tile, big framed windows in room 1 with animated jungle (random walkers + chilling animals) and
// beach (waves, palms), weather cycle sunny -> clouds -> rain -> clearing -> sunset, parallax, saved choice. node test/windows.js [phone]
const { open } = require('./lib'); const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '_desktop';
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open(PH ? { phone: true, w: 412, h: 860 } : {}); const page = o.page; page.setDefaultTimeout(60000);
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3);
  const r = await page.evaluate(() => { const A = window.__arcade, m = A.setWalls('windows'), W = window.__windows;
    return { m, ls: localStorage.getItem('neonarcade.walls'), n: W.wins.length, vis: W.group.visible, j: W.wins.filter(w => w.sc === 'jungle').length, b: W.wins.filter(w => w.sc === 'beach').length, tile: !!window.__startUI.opt.querySelector('.wlT[data-walls="windows"] img') }; });
  chk(r.m === 'windows' && r.ls === 'windows' && r.vis && r.tile, 'WINDOWS walls: tile in the picker, windows shown, choice saved ' + JSON.stringify(r));
  chk(r.n >= 6 && r.j >= 3 && r.b >= 3, 'big framed windows: ' + r.j + ' jungle + ' + r.b + ' beach');
  const ph = await page.evaluate(() => { const W = window.__windows, out = {}; for (const p of [10, 60, 110, 155, 205]) { W.setPhase(p); out[p] = W.weather().name; } W.setPhase(null); return out; });
  chk(ph[10] === 'sunny' && ph[60] === 'clouds' && ph[110] === 'rain' && ph[155] === 'clearing' && ph[205] === 'sunset', 'weather cycle ' + JSON.stringify(ph));
  const sp = await page.evaluate(() => { const W = window.__windows; for (const k of ['tiger', 'elephant', 'parrot', 'toucan', 'giraffe', 'tapir', 'monkey']) W.spawn(k); return W.J.walkers.map(a => a.k); });
  chk(sp.length >= 7, 'jungle animals walk / fly past: ' + sp.join(','));
  // jungle view (west wall)
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(3, 0, 0); window.__windows.setPhase(10); window.__camOverride = { pos: [1, 4.2, 1.5], at: [-12, 5.3, -0.3] }; window.__windows.J.walkers.length = 0; window.__windows.spawn('elephant').x = 420; window.__windows.spawn('parrot').x = 300; window.__windows.spawn('tiger').x = 610; });
  await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/windows_jungle' + sfx + '.png' });
  const d0 = await page.evaluate(() => window.__windows.draws); await page.waitForTimeout(1500); const d1 = await page.evaluate(() => ({ d: window.__windows.draws, j: window.__windows.S.jungle.c.toDataURL().length }));
  chk(d1.d > d0, 'scenes animate (redraws ' + d0 + ' -> ' + d1.d + ')');
  // beach (south wall)
  await page.evaluate(() => { window.__camOverride = { pos: [-1, 4.2, -1], at: [0, 5.3, 12] }; });
  await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/windows_beach' + sfx + '.png' });
  await page.evaluate(() => { window.__windows.setPhase(110); }); await page.waitForTimeout(2000); await page.screenshot({ path: 'shots/windows_rain' + sfx + '.png' });
  await page.evaluate(() => { window.__windows.setPhase(205); }); await page.waitForTimeout(2000); await page.screenshot({ path: 'shots/windows_sunset' + sfx + '.png' });
  // parallax: offset changes when the camera moves sideways
  const px = await page.evaluate(async () => { const w = window.__windows.wins.find(w => w.sc === 'beach'); window.__camOverride = null; const M = window.__arcade.monkey; M.position.set(-4, 0, 0); await new Promise(r => setTimeout(r, 2500)); const a = w.tex.offset.x; M.position.set(4, 0, 0); await new Promise(r => setTimeout(r, 2500)); return [a, w.tex.offset.x]; });
  chk(Math.abs(px[1] - px[0]) > 0.01, 'look-through parallax ' + px.map(v => v.toFixed(3)));
  const back = await page.evaluate(() => { window.__arcade.setWalls('current'); return window.__windows.group.visible; });
  chk(back === false, 'switching back to CURRENT hides the windows');
  chk(o.errors.length === 0, 'no page errors ' + o.errors.join('|')); await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
