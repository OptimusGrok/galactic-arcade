// t184 LAVA floor: step off a path -> sink with an orange flash + sizzle, respawn on the nearest path in < 0.6 s; key spots stay on the paths.
// node test/lava.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone';
(async () => { const { page, errors, close } = await open({ phone: PH, shieldOpen: true }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const spots = await page.evaluate(() => { const A = window.__arcade, L = A.LAVA, out = {};
    const S = { spawn: [0, 5], kioskFront: [0, 2.3], doorN: [0, -12], hall: [0, -18], doorS2: [0, -17.1], room2: [0, -22], pad1: [-10.75, -10.75], dsFront: [0, -29 + 2.6], whitePad: [80, 0], shopNP: [83.1, 0.16] };
    A.playables.forEach((c, i) => { if (c === A.roadsterCab || c === A.dsCab || c.name === 'deadSignalStation') return; let x = c.position.x, z = c.position.z;   // stand 0.8 m in front of the cabinet face (10.55 from centre)
      if (Math.abs(x) > 11) x = Math.sign(x) * 9.75; else z = Math.sign(z) * 9.75; S['front_' + c.name] = [x, z]; });
    S.roadsterL = [6 + 2.95, 8.55]; S.roadsterR = [6 - 2.95, 8.55];
    for (const k in S) out[k] = L.onPath(S[k][0], S[k][1], 0.22); return out; });
  const off = Object.entries(spots).filter(([, v]) => !v).map(([k]) => k);
  chk(off.length === 0, 'all key spots are on a path (spawn, kiosk, doorways, hall, pads, DS, shop, ' + Object.keys(spots).length + ' spots incl. cabinet fronts) ' + off.join(','));
  const rs = await page.evaluate(() => { const A = window.__arcade, L = A.LAVA, bad = []; for (const p of L.samples().filter((_, i) => i % 7 === 0)) { const r = A.lavaRespawnPoint(p[0] !== undefined ? p[0] : p.x, p[1] !== undefined ? p[1] : p.z); if (!L.onPath(r.x, r.z, 0)) bad.push([r.x, r.z]); } return bad.length; });
  chk(rs === 0, 'respawn points are always on a path, outside blockers');
  const fall = (floor) => page.evaluate(floor => { const A = window.__arcade; A.setFloor(floor); const st = A.st; st.lavaFalls = 0; st.lastRespawn = null;
    A.monkey.position.set(5.2, 0, 3.0); st.vel.set(0, 0, 0); let t = 0, tFall = null, minY = 0; for (let i = 0; i < 120 && !st.lastRespawn; i++) { A.step(1 / 60); t += 1 / 60; if (st.lavaFall && tFall === null) tFall = t; minY = Math.min(minY, A.monkey.position.y); }
    return { falls: st.lavaFalls, rp: st.lastRespawn, dt: tFall !== null && st.lastRespawn ? +(t - tFall).toFixed(2) : null, minY: +minY.toFixed(2), on: st.lastRespawn ? A.LAVA.onPath(st.lastRespawn[0], st.lastRespawn[1], 0) : null, fx: !!document.getElementById('lavaFx') }; }, floor);
  await page.waitForTimeout(800);
  const p0 = await page.evaluate(() => window.__arcade.LAVA.onPath(5.2, 3.0, 0.22));
  chk(!p0, 'test point (5.2, 3.0) is lava');
  await page.evaluate(() => { const A = window.__arcade; A.setFloor('lava'); A.monkey.position.set(4.6, 0, 3.0); A.st.yaw = Math.PI * 0.85; }); await page.waitForTimeout(1200);
  await page.waitForFunction(() => window.__arcade.st.lavaFall && window.__arcade.st.lavaFall.t > 0.12, null, { timeout: 8000 }).catch(() => {});
  await page.screenshot({ path: 'shots/lava_fall' + (PH ? '_phone' : '_desktop') + '.png' }); await page.waitForTimeout(1500);
  const f = await fall('lava');
  chk(f.falls === 1 && f.rp && f.on && f.fx, 'off the path on LAVA: falls once and respawns on the path ' + JSON.stringify(f));
  chk(f.dt !== null && f.dt <= 0.6 && f.minY < -0.5, 'sinks into the lava and is back on the path in ' + f.dt + ' s (< 0.6 s)');
  const g = await fall('neon'); chk(g.falls === 0, 'no lava fall on NEON ' + JSON.stringify(g));
  const g2 = await fall('checkers'); chk(g2.falls === 0, 'no lava fall on CHECKERS');
  // walking along a path on lava never falls
  const w = await page.evaluate(() => { const A = window.__arcade, st = A.st; A.setFloor('lava'); st.lavaFalls = 0; A.monkey.position.set(0, 0, 5); st.vel.set(0, 0, 0); st.yaw = 0; st.face = 0; for (let i = 0; i < 90; i++) { A.keys.KeyW = true; A.step(1 / 60); } A.keys.KeyW = false; return { falls: st.lavaFalls, z: +A.monkey.position.z.toFixed(2) }; });
  chk(w.falls === 0 && w.z < 3, 'walking along the spawn path on LAVA does not fall ' + JSON.stringify(w));
  await page.evaluate(() => window.__arcade.setFloor('neon'));
  chk(errors.length === 0, 'no page errors ' + errors.join('|'));
  await close(); process.exit(ok ? 0 : 1); })();
