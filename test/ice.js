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
  const nFast = await coast('neon', true), iFast = await coast('ice', true), iSlow = await coast('ice', false);
  console.log(JSON.stringify({ nFast, iFast, iSlow }));
  chk(iFast.saved === 'ice' && nFast.saved === 'neon', 'selecting ICE saves neonarcade.floor=ice');
  chk(iFast.sl && iFast.d > 2 && iFast.d > nFast.d * 4, `fast on ice slides after release (${iFast.d} m vs normal ${nFast.d} m)`);
  chk(!iSlow.sl && iSlow.d < 0.4 && iSlow.stopT < 0.7, `slow walk on ice stops almost at once (${iSlow.d} m)`);
  const wall = await coast('ice', true, 6, -6, 3);   // run hard at the north wall/plinth zone and slide
  chk(wall.zEnd > -12 && wall.zEnd < -9, 'sliding still stopped by walls/cabinets z=' + wall.zEnd);
  // screenshots: ice room 1 + mid-slide
  await page.evaluate(() => { const A = window.__arcade; A.setFloor('ice'); A.monkey.position.set(0, 0, 8); A.st.vel.set(0, 0, 0); A.st.yaw = 0; A.keys.KeyW = true; A.keys.ShiftLeft = true; for (let i = 0; i < 60; i++) A.step(1 / 60); A.keys.KeyW = false; A.keys.ShiftLeft = false; for (let i = 0; i < 12; i++) A.step(1 / 60); }); const ms = await page.evaluate(() => ({ s: window.__arcade.st.iceSlide, v: window.__arcade.st.speed }));
  await page.screenshot({ path: '/workspace/ga-ice/shots/ice_midslide_phone.png' }); console.log('midslide', JSON.stringify(ms));
  await page.evaluate(() => { window.__camOverride = { pos: [6, 2.2, 9], at: [-6, 1, -10] }; }); await page.waitForTimeout(3000);
  await page.screenshot({ path: '/workspace/ga-ice/shots/ice_room1_phone.png' });
  await page.evaluate(() => { window.__camOverride = null; window.__arcade.setFloor('neon'); });
  const errs = errors.filter(e => !/ERR_FAILED/.test(e)); chk(!errs.length, 'no page errors ' + errs.join(' | '));
  await close(); process.exit(ok ? 0 : 1); })();
