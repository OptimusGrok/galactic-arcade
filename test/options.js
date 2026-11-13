// FLOOR · WALLS · WINDOW options (opened from the HUD button after the player.js start screen: name + PLAY): FLOOR neon / ARCADE carpet /
// checkers / lava applied to every floor and saved; WALLS current / viking / portals; choices persist across reloads. node test/options.js [phone]
const { open, play } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '', SH = process.env.NOSHOTS ? 0 : 1;
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open(PH ? { phone: true, start: true } : { start: true, w: 1280, h: 720 }); const { page, errors } = o; page.setDefaultTimeout(60000);
  const ev = (f, a) => page.evaluate(f, a);
  const tap = async sel => { const b = await page.locator(sel).first().boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(500); };
  const rich = () => ev(() => { localStorage.setItem('neonarcade.tickets', '50'); window.__neonSync && window.__neonSync(); });
  const reload = async () => { await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await page.waitForTimeout(800); await play(page, PH, 'Astro'); await rich(); };
  await page.waitForTimeout(1000); await rich();
  chk(await ev(() => !!document.getElementById('start') && window.__arcade.floor === 'cobble'), 'start screen up, cobble floor by default');
  await play(page, PH, 'Astro');
  chk(await ev(() => !document.getElementById('start') && window.__arcade.play.mode === 'walk'), 'name + PLAY enters the arcade');
  await tap('#bOpt');
  await page.waitForFunction(() => [...document.querySelectorAll('#opFlTiles .opFl img')].every(i => i.complete && i.naturalWidth > 100), null, { timeout: 60000 }).catch(() => {});
  const fl = await ev(() => { const im = [...document.querySelectorAll('#opFlTiles .opFl img')]; return { on: !!document.querySelector('#gOpt.on'), n: im.length, loaded: im.every(i => i.complete && i.naturalWidth > 100), sel: document.querySelector('#opFlTiles .opFl.sel').dataset.floor, tab: document.getElementById('opTabFloor').textContent }; });
  chk(fl.on && fl.tab === 'FLOOR' && fl.n === 6 && fl.loaded && fl.sel === 'cobble', 'Options opens the FLOOR tab with 6 previews, cobble selected ' + JSON.stringify(fl));
  if (SH) await page.screenshot({ path: `shots/options_floor${sfx}.png` });
  await tap('#opFlCarpet');
  let b = await ev(() => ({ sel: document.querySelector('#opFlTiles .opFl.sel').dataset.floor, floor: window.__arcade.floor, carpet: window.__arcade.carpet.visible, ls: localStorage.getItem('neonarcade.floor'), mg: window.__arcade.mirror.visible, m2: window.__arcade.room.parent.getObjectByName('floorMirror2').visible,
    all: ['carpet2', 'carpetW'].map(n => { const o = window.__arcade.room.parent.getObjectByName(n); return !!o && o.visible; }) }));
  chk(b.sel === 'carpet' && b.floor === 'carpet' && b.carpet && b.ls === 'carpet', 'tapping ARCADE applies it straight away (saved)');
  chk(!b.mg && !b.m2 && b.all.every(Boolean), 'carpet: reflectors off, covers room 2 + the white room too');
  chk(await ev(() => /^ARCADE/.test(document.getElementById('opFlCarpet').textContent)), 'carpet tile is labelled ARCADE');
  await tap('#opX');
  chk(await ev(() => !document.querySelector('#gOpt.on') && window.__arcade.play.mode === 'walk'), 'X closes Options, back to walking');
  await reload();
  chk(await ev(() => window.__arcade.floor === 'carpet' && window.__arcade.carpet.visible), 'carpet choice persists after a reload');
  await tap('#bOpt'); chk(await ev(() => document.querySelector('#opFlTiles .opFl.sel').dataset.floor === 'carpet'), 'Options shows ARCADE selected after reload');
  await tap('#opFlNeon');
  b = await ev(() => ({ floor: window.__arcade.floor, carpet: window.__arcade.carpet.visible, ls: localStorage.getItem('neonarcade.floor') }));
  chk(b.floor === 'neon' && !b.carpet && b.ls === 'neon', 'switching back to NEON restores the reflective floor');
  for (const f of ['checkers', 'lava']) { await tap(`#opFlTiles .opFl[data-floor="${f}"]`);
    const r = await ev(f => { const A = window.__arcade, S = A.room.parent; return { floor: A.floor, ls: localStorage.getItem('neonarcade.floor'), all: ['carpet2', 'carpetW'].map(n => { const o = S.getObjectByName(n); return !!o && o.visible; }), mg: A.mirror.visible || S.getObjectByName('floorMirror2').visible }; }, f);
    chk(r.floor === f && r.ls === f && r.all.every(Boolean) && !r.mg, `${f.toUpperCase()}: applied to every floor, saved, reflectors off ` + JSON.stringify(r)); }
  // WALLS
  await tap('#opTabWalls'); await page.waitForTimeout(400);
  await page.waitForFunction(() => [...document.querySelectorAll('#opWlTiles img')].every(i => i.complete && i.naturalWidth > 50), null, { timeout: 60000 }).catch(() => {});
  let wl = await ev(() => { const im = [...document.querySelectorAll('#opWlTiles img')]; return { n: im.length, loaded: im.every(i => i.complete && i.naturalWidth > 50), vis: im.every(i => i.getBoundingClientRect().height > 0), sel: document.querySelector('#opWlTiles .sel').id }; });
  chk(wl.n === 4 && wl.loaded && wl.vis && wl.sel === 'opWlMed', 'WALLS tab: CURRENT + VIKING + PORTALS + MEDIEVAL, MEDIEVAL selected ' + JSON.stringify(wl));
  if (SH) await page.screenshot({ path: `shots/options_walls${sfx}.png` });
  await tap('#opWlPor'); await page.waitForTimeout(1000);
  chk(await ev(() => window.__arcade.walls === 'portals' && localStorage.getItem('neonarcade.walls') === 'portals'), 'PORTALS applied + saved');
  await tap('#opWlVik'); await page.waitForTimeout(1500);
  wl = await ev(() => { const A = window.__arcade, m = A.wallMat.map; return { w: A.walls, ls: localStorage.getItem('neonarcade.walls'), src: m && m.image && m.image.src }; });
  chk(wl.w === 'viking' && wl.ls === 'viking' && /viking_walls\.jpg/.test(wl.src), 'VIKING puts the rune texture on the walls (saved) ' + JSON.stringify(wl));
  await tap('#opX');
  const bands = () => ev(() => ['Cyan'].map(n => { const m = window.__arcade.room.getObjectByName('wallBand' + n); return m ? m.visible : null; }));
  chk((await bands()).every(v => v === false), 'Viking walls: the 3 coloured wall bands are hidden');
  chk(await ev(() => window.__opts && window.__opts.snapshot().walls === 'viking'), 'save snapshot records the walls choice');
  await reload();
  chk(await ev(() => window.__arcade.walls === 'viking' && window.__arcade.floor === 'lava'), 'Viking walls + lava floor persist after reload');
  await ev(() => { window.__arcade.setWalls('current'); window.__arcade.setFloor('neon'); });
  chk(await ev(() => window.__arcade.walls === 'current' && window.__arcade.wallMat.map.image.tagName === 'CANVAS'), 'switching back restores the current walls');
  chk((await bands()).every(v => v === true), 'CURRENT walls: the 3 coloured wall bands are back');
  const errs = errors.filter(e => !/Failed to load resource: net::ERR_FAILED/.test(e)); chk(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
