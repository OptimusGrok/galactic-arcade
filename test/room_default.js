// Fresh room (t341u): MEDIEVAL COBBLESTONE floor + MEDIEVAL walls. A saved floor/wall (including neon + current) survives reload.
// No-preference (missing or unknown keys) comes back to that pair. Tickets and other keys are left alone.
// node test/room_default.js   (phone 390x700; flock /workspace/.browser-test.lock)
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700 });
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const look = () => page.evaluate(() => {
    const A = window.__arcade, g = A.room.getObjectByName('gothicWindows'), g2 = A.room2.getObjectByName('gothicWindows2');
    const c2 = A.room.parent.getObjectByName('carpet2'), mat = A.carpet.material, hm = A.hall.getObjectByName('hallWallW').material;
    const bands = ['Cyan'].map(n => { const m = A.room.getObjectByName('wallBand' + n); return !!(m && m.visible); });
    const glass = g && g.getObjectByName('gothicGlass');
    return {
      floor: A.floor, walls: A.walls, win: A.window,
      lsF: localStorage.getItem('neonarcade.floor'), lsW: localStorage.getItem('neonarcade.walls'), lsN: localStorage.getItem('neonarcade.window'),
      tix: localStorage.getItem('neonarcade.tickets'), vik: localStorage.getItem('neonarcade.vikingTickets'), keep: localStorage.getItem('neonarcade.keepSentinel'),
      tixN: A.play.tickets.total,
      carpet: A.carpet.visible, carpet2: !!(c2 && c2.visible), hex: A.room.getObjectByName('floorHex').visible, mirror: A.mirror.visible,
      cobble: mat === A.floorMats.cobble,
      goth: !g && !g2 && A.walls === 'medieval', gothN: 0, goth2: true,
      bandsOn: bands.every(Boolean), bandsOff: bands.every(v => v === false),
      stone: A.walls === 'medieval' && A.wallMat.emissiveIntensity === 0.55 && !!(A.wallMat.map && A.wallMat.map.image && A.wallMat.map.image.tagName === 'CANVAS'),
      hallStone: !!(hm.userData.stone && hm.map === hm.userData.stone),
      viking: !!(A.wallMat.map && A.wallMat.map.image && /viking_walls\.jpg/.test(A.wallMat.map.image.src || '')),
    };
  });
  const menu = () => page.evaluate(() => {
    window.__floorBtn.openMenu(true);
    const floor = (document.querySelector('#flTiles .flT.sel') || {}).dataset || {};
    const walls = (document.querySelector('#wlTiles .wlT.sel') || {}).dataset || {};
    window.__floorBtn.openMenu(false);
    return { floor: floor.floor || null, walls: walls.walls || null };
  });
  const reload = async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
    await page.evaluate(() => Promise.all([window.__arcade.shopReady, window.__arcade.windowsReady].filter(Boolean).map(p => Promise.resolve(p))));
  };
  const vp = page.viewportSize();
  chk(vp.width <= 390 && vp.height <= 700, 'viewport <=390x700 ' + vp.width + 'x' + vp.height);

  let s = await look();
  chk(s.floor === 'cobble' && s.walls === 'medieval' && s.win === 'space', 'fresh: cobble floor + medieval walls ' + JSON.stringify({ floor: s.floor, walls: s.walls, win: s.win }));
  chk(s.lsF === 'cobble' && s.lsW === 'medieval', 'fresh: applied pair stored so a reload keeps it ' + s.lsF + '/' + s.lsW);
  chk(s.carpet && s.carpet2 && !s.hex && !s.mirror && s.cobble, 'fresh: cobble material on room 1 + room 2, neon hex and mirror off ' + JSON.stringify({ carpet: s.carpet, carpet2: s.carpet2, hex: s.hex, mirror: s.mirror, cobble: s.cobble }));
  chk(s.goth && s.bandsOff && s.stone && s.hallStone, 'fresh: medieval stone walls (no gothic windows, t773u), neon bands hidden ' + JSON.stringify({ goth: s.goth, gothN: s.gothN, goth2: s.goth2, bandsOff: s.bandsOff, stone: s.stone, hallStone: s.hallStone }));
  chk(s.tix === '1' && s.tixN === 1 && s.vik === null, 'fresh: starter ticket stays 1, viking tickets untouched ' + s.tix + '/' + s.tixN + '/' + s.vik);
  let m = await menu();
  chk(m.floor === 'cobble' && m.walls === 'medieval', 'menu highlights COBBLE + MEDIEVAL ' + JSON.stringify(m));

  // start-menu helpers floorNow()/wallsNow(): with the keys missing they must also pick COBBLE + MEDIEVAL
  m = await page.evaluate(() => { localStorage.removeItem('neonarcade.floor'); localStorage.removeItem('neonarcade.walls');
    window.__floorBtn.openMenu(true);   // reuses the start screen's openOpt -> showFloor()/showWalls() -> floorNow()/wallsNow()
    const floor = (document.querySelector('#flTiles .flT.sel') || {}).dataset || {}, walls = (document.querySelector('#wlTiles .wlT.sel') || {}).dataset || {};
    const n = document.querySelectorAll('#flTiles .flT.sel').length + document.querySelectorAll('#wlTiles .wlT.sel').length;
    window.__floorBtn.openMenu(false); return { floor: floor.floor || null, walls: walls.walls || null, n }; });
  chk(m.floor === 'cobble' && m.walls === 'medieval' && m.n === 2, 'start-menu tiles with no saved keys select COBBLE + MEDIEVAL only ' + JSON.stringify(m));
  await page.evaluate(() => {
    localStorage.setItem('neonarcade.tickets', '4'); localStorage.setItem('neonarcade.vikingTickets', '2'); localStorage.setItem('neonarcade.keepSentinel', 'ok');
    if (window.__neonSync) window.__neonSync();
    window.__arcade.setWindow('beach');
    localStorage.removeItem('neonarcade.floor'); localStorage.removeItem('neonarcade.walls');
  });
  await reload();
  s = await look();
  chk(s.floor === 'cobble' && s.walls === 'medieval' && s.lsF === 'cobble' && s.lsW === 'medieval', 'reload with no floor/wall preference: cobble + medieval again ' + s.floor + '/' + s.walls);
  chk(s.win === 'beach' && s.lsN === 'beach' && s.tix === '4' && s.tixN === 4 && s.vik === '2' && s.keep === 'ok', 'reload keeps window, tickets, and other keys ' + JSON.stringify({ win: s.win, tix: s.tix, tixN: s.tixN, vik: s.vik, keep: s.keep }));
  chk(s.cobble && s.goth && s.hallStone && s.bandsOff, 'reload no-preference still shows cobble + medieval stone ' + JSON.stringify({ cobble: s.cobble, goth: s.goth, hallStone: s.hallStone }));
  m = await menu();
  chk(m.floor === 'cobble' && m.walls === 'medieval', 'menu after no-preference reload ' + JSON.stringify(m));

  await page.evaluate(() => { window.__arcade.setFloor('carpet'); window.__arcade.setWalls('viking'); });
  await reload();
  await page.waitForFunction(() => { const m = window.__arcade.wallMat.map; return !!(m && m.image && m.image.complete && /viking_walls\.jpg/.test(m.image.src || '')); }, null, { timeout: 20000 });
  s = await look();
  chk(s.floor === 'carpet' && s.walls === 'viking' && s.lsF === 'carpet' && s.lsW === 'viking' && s.carpet && !s.cobble && s.viking && !s.goth, 'saved carpet + viking survive reload ' + JSON.stringify({ floor: s.floor, walls: s.walls, viking: s.viking, goth: s.goth }));
  chk(s.tix === '4' && s.vik === '2' && s.win === 'beach' && s.keep === 'ok', 'alternate floor/wall save does not reset tickets or window');
  m = await menu();
  chk(m.floor === 'carpet' && m.walls === 'viking', 'menu shows the saved alternate ' + JSON.stringify(m));

  await page.evaluate(() => { window.__arcade.setFloor('neon'); window.__arcade.setWalls('current'); });
  await reload();
  s = await look();
  chk(s.floor === 'neon' && s.walls === 'current' && s.lsF === 'neon' && s.lsW === 'current' && !s.carpet && s.hex && !s.goth && s.bandsOn && !s.stone, 'saved neon + current are kept, not replaced by the new default ' + JSON.stringify({ floor: s.floor, walls: s.walls, hex: s.hex, goth: s.goth, bandsOn: s.bandsOn }));
  chk(s.tix === '4' && s.keep === 'ok', 'neon/current save leaves other storage');
  m = await menu();
  chk(m.floor === 'neon' && m.walls === 'current', 'menu shows saved neon + current ' + JSON.stringify(m));

  await page.evaluate(() => { localStorage.setItem('neonarcade.floor', 'bogus'); localStorage.setItem('neonarcade.walls', 'bogus'); });
  await reload();
  s = await look();
  chk(s.floor === 'cobble' && s.walls === 'medieval' && s.cobble && s.goth && s.tix === '4' && s.vik === '2' && s.keep === 'ok', 'unknown floor/wall values fall back to cobble + medieval without clearing storage ' + JSON.stringify({ floor: s.floor, walls: s.walls, tix: s.tix, keep: s.keep }));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + (e && e.stack || e)); process.exit(1); });
