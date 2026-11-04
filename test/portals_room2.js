// t253 PORTALS walls in room 2 + the hallway (same shader/clock as room 1; room 2's right-hand window stays; no neon bands), switching
// walls back updates both rooms; draw calls in room 2 current vs portals. node test/portals_room2.js  (phone 412x915)
const { open, play } = require('./lib');
(async () => { const { page, errors, close } = await open({ phone: true, start: true, w: 412, h: 915 }); page.setDefaultTimeout(150000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForTimeout(1500); await play(page, true, 'Astro'); await page.waitForTimeout(2000);
  const st = () => page.evaluate(() => { const A = window.__arcade, R = A.room2, H = A.hall, nm = o => o && o.material && o.material.name;
    return { r1: [0, 1, 2, 3].map(i => nm(A.room.getObjectByName('wall' + i))), r2: [0, 2, 3].map(i => nm(R.getObjectByName('wall' + i))), r2win: R.getObjectByName('wall1').visible === false && !!R.getObjectByName('spaceWindow') && R.getObjectByName('spaceWindow').visible,
      hall: ['hallWallW', 'hallWallE'].map(n => nm(H.getObjectByName(n))), bands2: ['Pink', 'Amber', 'Cyan'].map(n => R.getObjectByName('wallBand' + n).visible), uT: A.room2.getObjectByName('wall0').material.uniforms ? A.room2.getObjectByName('wall0').material.uniforms.uT.value : null }; });
  const calls = () => page.evaluate(async () => { const A = window.__arcade, R = A.renderer; window.__camOverride = { pos: [4, 2.5, A.Z2 + 9], at: [-4, 4.2, A.Z2 - 10] }; await new Promise(r => setTimeout(r, 2500));
    R.info.autoReset = false; const c = []; for (let i = 0; i < 6; i++) { R.info.reset(); await new Promise(r => requestAnimationFrame(r)); await new Promise(r => setTimeout(r, 0)); c.push(R.info.render.calls); } R.info.autoReset = true; return Math.min(...c); });
  await page.evaluate(() => { const A = window.__arcade; A.setWalls('current'); A.monkey.position.set(0, 0, A.Z2 + 6); });
  const c0 = await calls(); let s = await st();
  chk(s.r2.every(n => n !== 'portalWalls') && s.bands2.every(Boolean), 'CURRENT: room 2 normal walls + bands ' + JSON.stringify(s));
  await page.evaluate(() => window.__arcade.setWalls('portals')); const c1 = await calls(); s = await st();
  chk(s.r1.every(n => n === 'portalWalls') && s.r2.every(n => n === 'portalWalls') && s.hall.every(n => n === 'portalWallsHall'), 'PORTALS: room 1, room 2 (3 walls) and the hallway use the portal shader ' + JSON.stringify(s));
  chk(s.r2win && s.bands2.every(b => !b), 'PORTALS: room 2 window wall stays a window, no neon bands');
  const t0 = s.uT; await page.waitForTimeout(4000); s = await st(); chk(s.uT > t0, 'portals animate (shared clock ' + t0 + ' -> ' + s.uT + ')');
  chk(c1 <= c0 + 2, 'room 2 draw calls current ' + c0 + ' -> portals ' + c1);
  await page.screenshot({ path: 'shots/portals_room2_wide_phone.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0, 2.0, window.__arcade.Z2 + 4], at: [0, 2.6, window.__arcade.Z2 + 12] }; }); await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/portals_room2_back_phone.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0, 1.7, -12.5], at: [0, 1.5, -17] }; }); await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/portals_hall_phone.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [-3, 2.4, window.__arcade.Z2 + 5], at: [6, 3, window.__arcade.Z2 - 2] }; }); await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/portals_room2_window_phone.png' });
  for (const m of ['medieval', 'current']) { await page.evaluate(m => window.__arcade.setWalls(m), m); s = await st();
    chk(s.r1.every(n => n !== 'portalWalls') && s.r2.every(n => n !== 'portalWalls') && s.hall.every(n => n !== 'portalWallsHall') && s.bands2.every(b => b === (m === 'current')), 'back to ' + m.toUpperCase() + ': both rooms + hallway switch off portals ' + JSON.stringify(s)); }
  const hs = await page.evaluate(() => { const A = window.__arcade, m = A.hall.getObjectByName('hallWallW').material; return [m.name, !!m.map, m.map === m.userData.map0]; }); chk(hs[1] && hs[2], 'hallway material restored after PORTALS -> MEDIEVAL -> CURRENT ' + JSON.stringify(hs));
  await page.evaluate(() => { window.__camOverride = null; });
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1); })();
