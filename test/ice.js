// t260 ICE floor: option tile, saved, slide when fast, grippy when slow, walls still collide. node test/ice.js  (phone 412x915)
const { open, play } = require('./lib');
(async () => { const { page, errors, close } = await open({ phone: true, start: true, w: 412, h: 915 }); page.setDefaultTimeout(120000); await page.waitForTimeout(4000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  chk(await page.evaluate(() => !!window.__startUI.opt.querySelector('[data-floor="ice"]')), 'ICE tile in FLOOR menu');
  await play(page, true, 'Astro');
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  // run (shift) for 1 s from z=8 toward -z, release, measure coast distance. Steps are synchronous inside one evaluate.
  const coast = (floor, run, x = 0, z = 8, T = 1) => page.evaluate(([floor, run, x, z, T]) => { const A = window.__arcade; A.setFloor(floor); const st = A.st, k = A.keys;
    A.monkey.position.set(x, 0, z); st.vel.set(0, 0, 0); st.yaw = 0; st.iceSlide = false;
    k.KeyW = true; k.ShiftLeft = run; for (let i = 0; i < T * 60; i++) A.step(1 / 60);
    const z0 = A.monkey.position.z, sp = st.speed, sl = !!st.iceSlide; k.KeyW = false; k.ShiftLeft = false;
    let t = 0; for (; t < 600 && st.speed > 0.05; t++) A.step(1 / 60);
    return { d: +(z0 - A.monkey.position.z).toFixed(2), sp: +sp.toFixed(2), sl, stopT: +(t / 60).toFixed(2), zEnd: +A.monkey.position.z.toFixed(2), saved: localStorage.getItem('neonarcade.floor') }; }, [floor, run, x, z, T]);
  const nFast = await coast('neon', true), iFast = await coast('ice', true, -6, 8, 2.2), iSlow = await coast('ice', false);
  console.log(JSON.stringify({ nFast, iFast, iSlow }));
  chk(iFast.saved === 'ice' && nFast.saved === 'neon', 'selecting ICE saves neonarcade.floor=ice');
  chk(iFast.sl && iFast.sp > 4.8 && iFast.d >= 0.9 && iFast.d <= 1.2, `full speed (${iFast.sp} m/s) on ice slides ~1 m after release (${iFast.d} m vs normal ${nFast.d} m)`);
  chk(!iSlow.sl && iSlow.d < 0.4 && iSlow.stopT < 0.7, `slow walk on ice stops almost at once (${iSlow.d} m)`);
  const wall = await coast('ice', true, 6, -6, 3);   // run hard at the north wall/plinth zone and slide
  chk(wall.zEnd > -12 && wall.zEnd < -9, 'sliding still stopped by walls/cabinets z=' + wall.zEnd);
  // screenshots: ice room 1 + mid-slide
  await page.evaluate(() => { const A = window.__arcade; A.setFloor('ice'); A.monkey.position.set(0, 0, 8); A.st.vel.set(0, 0, 0); A.st.yaw = 0; A.keys.KeyW = true; A.keys.ShiftLeft = true; for (let i = 0; i < 60; i++) A.step(1 / 60); A.keys.KeyW = false; A.keys.ShiftLeft = false; for (let i = 0; i < 12; i++) A.step(1 / 60); }); const ms = await page.evaluate(() => ({ s: window.__arcade.st.iceSlide, v: window.__arcade.st.speed }));
  await page.screenshot({ path: '/workspace/ga-ice/shots/ice_midslide_phone.png' }); console.log('midslide', JSON.stringify(ms));
  await page.evaluate(() => { window.__camOverride = { pos: [6, 2.2, 9], at: [-6, 1, -10] }; }); await page.waitForTimeout(3000);
  await page.screenshot({ path: '/workspace/ga-ice/shots/ice_room1_phone.png' });
  // legs still while coasting: run up synchronously, release, then let the real loop animate and sample leg angles
  const legs = await page.evaluate(async () => { const A = window.__arcade, st = A.st, k = A.keys, L = A.monkey.userData.legs; A.setFloor('ice'); window.__camOverride = null;
    A.monkey.position.set(-6, 0, 8); st.vel.set(0, 0, 0); st.yaw = 0; k.KeyW = true; k.ShiftLeft = true; for (let i = 0; i < 150; i++) A.step(1 / 60); k.KeyW = false; k.ShiftLeft = false;
    const out = []; for (let i = 0; i < 5; i++) { for (let j = 0; j < 3; j++) { A.step(1 / 60); A.animateMonkey(1 / 60); } out.push({ c: st.iceCoast, sp: +st.speed.toFixed(2), l: +L[0].leg.rotation.x.toFixed(3), r: +L[1].leg.rotation.x.toFixed(3) }); } return out; });
  console.log('legs', JSON.stringify(legs)); const cs = legs.filter(x => x.c && x.sp > 0.3);
  chk(cs.length >= 2 && Math.max(...cs.map(x => Math.abs(x.l))) < 0.05 && Math.max(...cs.map(x => x.l)) - Math.min(...cs.map(x => x.l)) < 0.03, 'legs still (no gait) while coasting on ice');
  // menu highlight: open Options FLOOR tab, tap ICE, check .sel; reload with ice saved and check again
  const sel = () => page.evaluate(() => [...document.querySelectorAll('.flT.sel[data-floor]')].map(t => t.dataset.floor));
  await page.evaluate(() => window.__arcade.setFloor('neon'));
  await page.reload(); await page.waitForTimeout(4000);
  await page.evaluate(() => { window.__startUI.openOpt(true); });
  await page.locator('#flIce').click({ force: true }); await page.waitForTimeout(400);
  let s1 = await sel(); chk(s1.length === 1 && s1[0] === 'ice', 'ICE tile highlighted after tap ' + s1);
  await page.locator('#flCob').click({ force: true }); await page.waitForTimeout(300); const sc = await sel(); chk(sc.join() === 'cobble', 'COBBLE highlights too ' + sc);
  await page.locator('#flIce').click({ force: true }); await page.waitForTimeout(300);
  await page.screenshot({ path: '/workspace/ga-ice/shots/ice_menu_selected.png' });
  await page.reload(); await page.waitForTimeout(4000); await page.evaluate(() => { window.__startUI.openOpt(true); }); await page.waitForTimeout(400);
  s1 = await sel(); chk(s1.length === 1 && s1[0] === 'ice', 'ICE highlighted after reload ' + s1);
  await page.evaluate(() => localStorage.setItem('neonarcade.floor', 'neon'));
  const errs = errors.filter(e => !/ERR_FAILED/.test(e)); chk(!errs.length, 'no page errors ' + errs.join(' | '));
  await close(); process.exit(ok ? 0 : 1); })();
