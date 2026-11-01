// room 1 -> hallway -> room 2 -> back; room 2 has 19 blank cabinets; doorway slot is gone; camera stays inside; no errors
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', SUF = PH ? '_phone' : '';
(async () => {
  const { page, errors, close } = await open(PH ? { phone: true, shieldOpen: true } : { shieldOpen: true }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const info = await page.evaluate(() => { const A = window.__arcade; const names = A.playables.map(c => c.name);
    const inst = A.room2.userData.instanced; const art = A.room2.getObjectsByProperty ? 0 : 0;
    return { n2: A.room2.userData.cabinetCount, inst: inst.length, perPart: inst.filter(i => /^cab2_body$/.test(i.name)).map(i => i.count)[0], slot: names.includes('cabinet_north_2'), featured2: A.room2.getObjectByName('strikeCabinet') || A.room2.getObjectByName('ghostCabinet') ? 1 : 0, cap: !!A.scene.getObjectByName('hallEndCap') }; });
  chk(info.n2 === 19 && info.perPart === 19, 'room 2 has 19 blank cabinets (instanced, ' + info.inst + ' draw groups)');
  chk(!info.slot, 'middle north cabinet removed (doorway in its slot)'); chk(!info.featured2, 'no STRIKE/GHOST in room 2'); chk(!info.cap, 'placeholder end panel gone');
  const st = await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 5); A.st.vel.set(0, 0, 0); A.keys.KeyW = true; for (let i = 0; i < 60 * 14; i++) { A.st.yaw = 0; A.step(1 / 60); } A.keys.KeyW = false; return A.monkey.position.z; });
  chk(st < -18, 'straight walk from room 1 centre ends in room 2 (z=' + st.toFixed(2) + ')');
  const go = (x, z) => page.evaluate(([x, z]) => { const A = window.__arcade; A.monkey.position.set(x, 0, z); A.st.vel.set(0, 0, 0); }, [x, z]);
  await go(0, -6);
  const n = await page.evaluate(async () => { const A = window.__arcade; A.st.yaw = 0; A.keys.KeyW = true; let bad = 0; for (let i = 0; i < 60 * 10; i++) { A.st.yaw = 0; A.step(1 / 60); const c = A.camera.position; if (c.z < -12.3 && c.z > -16.7 && (Math.abs(c.x) > 1.32 || c.y > 2.8)) bad++; } A.keys.KeyW = false; return { z: A.monkey.position.z, bad }; });
  chk(n.z < -17 - 1, 'walked north through the hallway into room 2 (z=' + n.z.toFixed(2) + ')'); chk(n.bad === 0, 'third-person camera stayed inside the hallway (' + n.bad + ' bad frames)');
  const room = await page.evaluate(() => { const A = window.__arcade; return { r2: A.room2.visible }; });
  await page.waitForTimeout(800);
  const vis = await page.evaluate(() => ({ r1: window.__arcade.room.visible, r2: window.__arcade.room2.visible }));
  chk(vis.r2, 'room 2 rendered while inside it');
  await page.evaluate(() => { window.__camOverride = { pos: [0, 5.2, window.__arcade.Z2 - 11.3], at: [0, 2.2, -12 - 5] }; }); await page.waitForTimeout(2200);
  await page.screenshot({ path: 'shots/room2_doorway' + SUF + '.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [9, 6, window.__arcade.Z2 + 9], at: [-4, 1.2, window.__arcade.Z2 - 6] }; }); await page.waitForTimeout(2200);
  await page.screenshot({ path: 'shots/room2_wide' + SUF + '.png' });
  const far = await page.evaluate(() => ({ r1: window.__arcade.room.visible }));
  chk(!far.r1, 'room 1 culled when looking away from the doorway in room 2');
  await page.evaluate(() => { window.__camOverride = null; });
  // collisions in room 2: walk into a cabinet row
  const blk = await page.evaluate(() => { const A = window.__arcade, Z2 = A.Z2; A.monkey.position.set(6, 0, Z2); A.st.vel.set(0, 0, 0); A.st.yaw = 0; A.keys.KeyD = true; for (let i = 0; i < 600; i++) { A.st.yaw = 0; A.step(1 / 60); } A.keys.KeyD = false; return A.monkey.position.x; });
  chk(blk < 12 - 1.45 && blk > 9.5, 'room 2 east row blocks the monkey (x=' + blk.toFixed(2) + ')');
  // back south, first-person
  await go(0, -24);
  const b = await page.evaluate(async () => { const A = window.__arcade; A.st.fp = true; A.st.yaw = Math.PI; A.keys.KeyW = true; let bad = 0; for (let i = 0; i < 60 * 10; i++) { A.st.yaw = Math.PI; A.step(1 / 60); const c = A.camera.position; if (c.z < -12.3 && c.z > -16.7 && Math.abs(c.x) > 1.4) bad++; } A.keys.KeyW = false; const z = A.monkey.position.z; return { z, bad }; });
  chk(b.z > -12 + 1, 'walked back south into room 1 in first person (z=' + b.z.toFixed(2) + ')'); chk(b.bad === 0, 'first-person camera inside the hallway');
  await page.evaluate(() => { window.__arcade.st.fp = false; });
  // jambs are solid: walking north at x=3 stops at the north row
  const j = await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(2.6, 0, -6); A.st.vel.set(0, 0, 0); A.keys.KeyW = true; for (let i = 0; i < 600; i++) { A.st.yaw = 0; A.step(1 / 60); } A.keys.KeyW = false; return [A.monkey.position.x, A.monkey.position.z]; });
  chk(j[1] > -12 + 1.45 || Math.abs(j[0]) < 1.31, 'beside the doorway the plinth/wall is solid (' + j.map(v => v.toFixed(2)) + ')');
  // from room 1: hallway with room 2 visible through it
  await page.evaluate(() => { window.__arcade.monkey.position.set(0, 0, 4); window.__camOverride = { pos: [0, 1.7, -5.5], at: [0, 1.4, -24] }; }); await page.waitForTimeout(2500);
  const v1 = await page.evaluate(() => ({ r2: window.__arcade.room2.visible }));
  chk(v1.r2, 'room 2 drawn through the doorway from room 1');
  await page.screenshot({ path: 'shots/hall_with_room2' + SUF + '.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0, 1.6, -12.8], at: [0, 1.4, -24] }; }); await page.waitForTimeout(2000);
  await page.screenshot({ path: 'shots/hall_inside' + SUF + '.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0, 5.2, 11.3], at: [0, 2.2, -12] }; }); await page.waitForTimeout(2000);
  await page.screenshot({ path: 'shots/hall_room1_doorway' + SUF + '.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0, 4, 6], at: [0, 1.0, -12] }; }); await page.waitForTimeout(800);
  const v2 = await page.evaluate(() => ({ r2: window.__arcade.room2.visible }));
  await page.evaluate(() => { window.__camOverride = { pos: [0, 4, 6], at: [0, 1.0, 20] }; }); await page.waitForTimeout(800);
  const v3 = await page.evaluate(() => ({ r2: window.__arcade.room2.visible }));
  chk(!v3.r2, 'room 2 culled when facing away from the doorway in room 1');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
