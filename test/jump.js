// t187 JUMP + stepping-stone islands. Touch: joystick drag + right-half tap jumps; right tap alone jumps; right drag still turns the camera;
// the room-1 island is reachable by a jump but not by walking; no lava check mid-air; landing in lava respawns. node test/jump.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] !== 'desktop';
(async () => { const { page, errors, close } = await open({ phone: PH, w: PH ? 390 : 1280, h: PH ? 844 : 720 }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForTimeout(1500);
  const S = () => page.evaluate(() => { const A = window.__arcade, st = A.st; return { jumps: st.jumps || 0, lands: st.lands || 0, y: +A.monkey.position.y.toFixed(2), x: +A.monkey.position.x.toFixed(2), z: +A.monkey.position.z.toFixed(2), yaw: +st.yaw.toFixed(3), falls: st.lavaFalls || 0, air: +(st.airMax || 0).toFixed(2) }; });
  if (PH) {   // synthetic TouchEvents on the canvas (CDP touch acks take ~1 s under swiftshader, longer than a real tap)
    const T = (type, list, changed) => page.evaluate(([type, list, changed]) => { const cv = window.__arcade.renderer.domElement, mk = p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y });
      cv.dispatchEvent(new TouchEvent(type, { touches: list.map(mk), changedTouches: changed.map(mk), targetTouches: list.map(mk), bubbles: true, cancelable: true })); }, [type, list, changed]);
    const tap = async p => { await T('touchstart', [p], [p]); await page.waitForTimeout(50); await T('touchend', [], [p]); };
    await page.evaluate(() => { const A = window.__arcade; A.setFloor('neon'); A.monkey.position.set(0, 0, 5); A.st.yaw = 0; });
    const J = { x: 100, y: 600, id: 1 }, J2 = { x: 100, y: 540, id: 1 };
    await T('touchstart', [J], [J]); await T('touchmove', [J2], [J2]); await page.waitForTimeout(500);
    const j0 = await S(); const R = { x: 300, y: 500, id: 2 }; await T('touchstart', [J2, R], [R]); await page.waitForTimeout(50); await T('touchend', [J2], [R]);
    await page.waitForFunction(() => window.__arcade.monkey.position.y > 0.3, null, { timeout: 15000 }).catch(() => {}); const mid = await S(); await page.waitForFunction(n => (window.__arcade.st.lands || 0) >= n && !window.__arcade.jumping, j0.lands + 1, { timeout: 20000 }).catch(() => {}); await T('touchend', [], [J2]); const j1 = await S();
    chk(j1.jumps === j0.jumps + 1 && mid.y > 0.3 && j1.z < j0.z - 0.5, 'walking (left drag) + right-half tap: he jumps while moving ' + JSON.stringify({ j0, mid, j1 }));
    const k0 = await S(); await page.evaluate(() => { window.__arcade.st.airMax = 0; }); await tap({ x: 300, y: 450, id: 3 }); await page.waitForFunction(n => (window.__arcade.st.lands || 0) >= n && !window.__arcade.jumping, k0.lands + 1, { timeout: 20000 }).catch(() => {}); const k1 = await S();
    chk(k1.jumps === k0.jumps + 1 && k1.lands === k0.lands + 1 && k1.air > 0.7 && k1.air < 0.9, 'right-half tap alone: one jump, ~0.8 m high, lands ' + JSON.stringify(k1));
    const d0 = await S(); const D = { x: 300, y: 400, id: 4 }; await T('touchstart', [D], [D]); for (let i = 1; i <= 5; i++) { const q = { x: 300 - i * 12, y: 400, id: 4 }; await T('touchmove', [q], [q]); await page.waitForTimeout(30); } await T('touchend', [], [{ x: 240, y: 400, id: 4 }]); await page.waitForTimeout(400); const d1 = await S();
    chk(d1.jumps === d0.jumps && d1.yaw > d0.yaw + 0.2, 'right-half drag still turns the camera, no jump ' + (d1.yaw - d0.yaw).toFixed(2)); }
  // desktop Space + no double jump
  const sp = await page.evaluate(() => { const A = window.__arcade, st = A.st, j0 = st.jumps || 0; st.jumpReq = st.t; A.step(1 / 60); for (let i = 0; i < 10; i++) A.step(1 / 60); st.jumpReq = st.t; A.step(1 / 60); const d = (st.jumps || 0) - j0; for (let i = 0; i < 60; i++) A.step(1 / 60); return { d, y: A.monkey.position.y }; });
  const sj0 = await page.evaluate(() => window.__arcade.st.jumps || 0); if (!PH) await page.keyboard.press('Space'); if (!PH) await page.waitForFunction(n => (window.__arcade.st.jumps || 0) > n, sj0, { timeout: 10000 }).catch(() => {}); const spk = PH || await page.evaluate(n => (window.__arcade.st.jumps || 0) > n, sj0);   // the real Space key is checked in the desktop run
  chk(sp.d === 1 && sp.y === 0 && spk, 'Space jumps; no double jump in the air ' + JSON.stringify(sp) + spk);
  const nj = await page.evaluate(() => { const A = window.__arcade, st = A.st; for (let i = 0; i < 60; i++) A.step(1 / 60); st.seated = 'L'; const a = A.canJump(); st.seated = null; window.__floorBtn.open = true; const b = A.canJump(); window.__floorBtn.open = false; return [a, b, A.canJump()]; });
  chk(!nj[0] && !nj[1] && nj[2], 'no jump while seated or in the menu ' + nj);
  // islands on LAVA
  const run = (x0, jumpAt, steps) => page.evaluate(([x0, jumpAt, steps]) => { const A = window.__arcade, st = A.st; A.setFloor('lava'); st.lavaFalls = 0; st.lastRespawn = null; st.lavaFall = null; st.jump = null;
    A.monkey.position.set(x0, 0, 4.5); st.vel.set(0, 0, 0); st.yaw = Math.PI / 2; st.face = -Math.PI / 2; const log = []; let jumped = false, midAirOff = 0;
    for (let i = 0; i < steps; i++) { A.keys.KeyW = true; if (jumpAt !== null && !jumped && A.monkey.position.x <= jumpAt) { st.jumpReq = st.t; jumped = true; }
      A.step(1 / 60); if (st.jump && !A.LAVA.onPath(A.monkey.position.x, A.monkey.position.z)) midAirOff++; if (st.lavaFall || st.lastRespawn) break; }
    A.keys.KeyW = false; return { x: +A.monkey.position.x.toFixed(2), falls: st.lavaFalls, midAirOff, onIsland: A.LAVA.onPath(A.monkey.position.x, 4.5) }; }, [x0, jumpAt, steps]);
  const w = await run(-0.3, null, 90);
  chk(w.falls === 1, 'walking west off the spoke toward the island falls into the lava (not walkable) ' + JSON.stringify(w));
  const j = await run(-0.3, -0.95, 75);
  chk(j.falls === 0 && j.midAirOff > 5 && j.x < -2.2 && j.onIsland, 'a walking jump clears the ~1.2 m gap onto the island; no lava check mid-air ' + JSON.stringify(j));
  // shot: mid-jump toward the island
  await page.evaluate(() => { const A = window.__arcade, st = A.st; A.setFloor('lava'); st.lavaFalls = 0; A.monkey.position.set(-1.35, 0.72, 4.5); st.jump = { t: 0.25, vx: 0, vz: 0 }; st.face = -Math.PI / 2; st.lavaFall = null; window.__jumpHold = true;
    window.__camOverride = { pos: [1.6, 2.4, 8.8], at: [-3.0, 0.4, 4.0], showMonkey: true }; });
  await page.evaluate(() => { const A = window.__arcade; const f = () => { if (!window.__jumpHold) return; A.st.jump = { t: 0.25, vx: 0, vz: 0 }; A.monkey.position.set(-1.35, 0.72, 4.5); requestAnimationFrame(f); }; f(); });
  await page.waitForTimeout(2200); await page.screenshot({ path: 'shots/jump_island_phone.png' });
  await page.evaluate(() => { window.__jumpHold = false; const A = window.__arcade; A.st.jump = null; A.monkey.position.set(-6.65, 0, 4.5); window.__camOverride = { pos: [2.5, 5.5, 11], at: [-4.5, 0, 3], showMonkey: true }; });
  await page.waitForTimeout(1800); await page.screenshot({ path: 'shots/lava_island_room1_phone.png' }); await page.evaluate(() => { window.__camOverride = null; });
  // landing in the lava respawns (fall only after landing)
  const L = await page.evaluate(() => { const A = window.__arcade, st = A.st; st.lavaFalls = 0; st.lastRespawn = null; st.lavaFall = null; A.monkey.position.set(-1.1, 0, 4.5); st.vel.set(-0.8, 0, 0); st.jumpReq = st.t; let landedAt = null, fellAt = null;
    for (let i = 0; i < 90; i++) { A.step(1 / 60); if (landedAt === null && (st.lands || 0) && !st.jump && i > 5) landedAt = i; if (fellAt === null && st.lavaFall) fellAt = i; if (st.lastRespawn) break; }
    return { landedAt, fellAt, rp: st.lastRespawn, on: st.lastRespawn && A.LAVA.onPath(st.lastRespawn[0], st.lastRespawn[1], 0) }; });
  chk(L.fellAt !== null && L.fellAt >= 30 && L.rp && L.on, 'a short hop into the lava: falls only after landing, respawns on a path ' + JSON.stringify(L));
  // walls / cabinets: no jumping through
  const wl = await page.evaluate(() => { const A = window.__arcade, st = A.st; A.setFloor('neon'); A.monkey.position.set(-9.5, 0, 2); st.yaw = Math.PI / 2; for (let i = 0; i < 120; i++) { A.keys.KeyW = true; A.keys.ShiftLeft = true; if (i % 40 === 0) st.jumpReq = st.t; A.step(1 / 60); } A.keys.KeyW = A.keys.ShiftLeft = false; return +A.monkey.position.x.toFixed(2); });
  chk(wl > -11.6, 'running jumps at the west wall / cabinets stay inside (x=' + wl + ')');
  await page.evaluate(() => window.__arcade.setFloor('neon'));
  chk(errors.length === 0, 'no page errors ' + errors.join('|'));
  await close(); process.exit(ok ? 0 : 1); })();
