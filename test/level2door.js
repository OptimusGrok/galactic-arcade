// LEVEL 2 doors block the hallway at room 1's north wall: frame flush with that wall, full width,
// solid from both sides and at the edges; no side-wall collider; sideways movement in room 1 stays clear.
// node test/level2door.js
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700, shieldOpen: true }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForFunction(() => window.__level2Door, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => { const D = window.__level2Door; if (D.unsave) D.unsave(); if (D.close) D.close({ force: true, snap: true }); });
  const d = await page.evaluate(() => {
    const A = window.__arcade, D = window.__level2Door; if (!D) return null;
    D.group.updateWorldMatrix(true, true);
    const wallZ = A.room.getObjectByName('wall0').position.z;
    const boxOf = o => { const b = new A.THREE.Box3().setFromObject(o); return { min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z] }; };
    const frame = boxOf(D.group.getObjectByName('level2Frame'));
    const leaves = D.leaves.map(boxOf);
    let calls = 0; D.group.traverse(o => { if (o.isMesh) calls++; });
    const sign = D.group.getObjectByName('level2SignL'), dir = new A.THREE.Vector3(), sp = new A.THREE.Vector3();
    sign.getWorldDirection(dir); sign.getWorldPosition(sp);
    const signR = new A.THREE.Vector3(); D.group.getObjectByName('level2SignR').getWorldPosition(signR);
    const hazB = boxOf(D.group.getObjectByName('level2Hazard')); const hazZ = (hazB.min[2] + hazB.max[2]) / 2;
    const rp = new A.THREE.Vector3(); D.group.getWorldPosition(rp);
    return { wallZ, frame, leaves, calls, dir: [dir.x, dir.y, dir.z], signZ: sp.z, signR: signR.x, hazZ, hazMinZ: hazB.min[2],
      label: D.label, signs: !!D.group.getObjectByName('level2SignL') && !!D.group.getObjectByName('level2SignR'),
      leavesN: D.leaves.length, canOpen: typeof D.open === 'function' && typeof D.close === 'function', inHall: D.group.parent && D.group.parent.name === 'hallway',
      pos: [rp.x, rp.z], align: D.align, doorW: A.DOOR_W, keypad: !!D.group.getObjectByName('level2Keypad') };
  });
  const hw = d && d.doorW / 2;
  chk(d && d.leavesN === 2 && d.canOpen && d.inHall, 'LEVEL 2 doors exist in the hallway (two leaf pivots, open/close enabled) ' + JSON.stringify({ leaves: d && d.leavesN, canOpen: d && d.canOpen, inHall: d && d.inHall }));
  chk(d && d.label === 'LEVEL 2' && d.signs && d.keypad, "'LEVEL 2' sign across both leaves, keypad kept");
  chk(d && d.calls <= 10, 'low draw calls (' + (d && d.calls) + ' meshes)');
  chk(d && Math.abs(d.frame.max[2] - d.wallZ) < 0.015 && d.frame.max[2] <= d.wallZ + 0.015, 'frame front flush with room-1 wall (frame z ' + (d && d.frame.max[2].toFixed(3)) + ', wall z ' + (d && d.wallZ.toFixed(3)) + ')');
  chk(d && d.frame.min[0] <= -hw + 0.001 && d.frame.max[0] >= hw - 0.001, 'frame spans the whole opening (x ' + (d && d.frame.min[0].toFixed(2)) + ' .. ' + (d && d.frame.max[0].toFixed(2)) + ', opening ±' + hw + ')');
  chk(d && d.leaves[0].max[0] > -0.02 && d.leaves[1].min[0] < 0.02 && d.leaves[0].min[0] < -hw + 0.2 && d.leaves[1].max[0] > hw - 0.2, 'leaves meet at centre and reach both jambs');
  chk(d && d.dir[2] > 0.9 && d.signZ < d.wallZ + 0.02 && d.signZ > d.wallZ - 0.12, 'LEVEL 2 faces room 1 and sits on the wall (sign z ' + (d && d.signZ.toFixed(3)) + ', normal z ' + (d && d.dir[2].toFixed(2)) + ')');
  chk(d && Math.abs(d.pos[0]) < 0.02 && Math.abs(d.pos[1] - d.wallZ) < 0.02 && d.pos[1] > -13, 'door is centred on the room-1 opening, not the east wall or mid-corridor ' + JSON.stringify(d && d.pos));
  chk(d && d.hazMinZ > d.wallZ - 0.005 && d.hazZ > d.wallZ, 'hazard threshold lies on the room-1 floor in front of the face (z ' + (d && d.hazMinZ.toFixed(2)) + ' .. ' + (d && d.hazZ.toFixed(2)) + ')');
  const step = (x, z, yaw, key, n) => page.evaluate(([x, z, yaw, key, n]) => { const A = window.__arcade; A.monkey.position.set(x, 0, z); A.st.vel.set(0, 0, 0); A.keys[key] = true; for (let i = 0; i < n; i++) { A.st.yaw = yaw; A.step(1 / 60); } A.keys[key] = false; return [A.monkey.position.x, A.monkey.position.z]; }, [x, z, yaw, key, n]);
  const north = await step(0, -8, 0, 'KeyW', 240);
  chk(north[1] > d.wallZ - 0.05 && north[1] < d.wallZ + 0.55, 'walking north from room 1 stops at the door (z=' + north[1].toFixed(2) + ', wall ' + d.wallZ.toFixed(2) + ')');
  const south = await step(0, -14.5, Math.PI, 'KeyW', 240);
  chk(south[1] < d.wallZ - 0.15 && south[1] > d.wallZ - 1.2, 'walking south from the hallway stops at the door (z=' + south[1].toFixed(2) + ')');
  const edgeN = await step(1.15, -8, 0, 'KeyW', 240);
  chk(edgeN[1] > d.wallZ - 0.05 && Math.abs(edgeN[0] - 1.15) < 0.35, 'right edge of the opening also blocks (x=' + edgeN[0].toFixed(2) + ' z=' + edgeN[1].toFixed(2) + ')');
  const edgeS = await step(-1.15, -15, Math.PI, 'KeyW', 240);
  chk(edgeS[1] < d.wallZ - 0.15 && edgeS[1] > -16.5, 'left edge blocks the hallway approach (x=' + edgeS[0].toFixed(2) + ' z=' + edgeS[1].toFixed(2) + ')');
  const east = await step(0, -14.5, 0, 'KeyD', 240);
  chk(east[0] > 1.2 && east[1] < d.wallZ - 1, 'no stale east-wall collider: hallway sideways walk reaches the side wall (x=' + east[0].toFixed(2) + ' z=' + east[1].toFixed(2) + ')');
  const side = await step(-1.2, -11.45, 0, 'KeyD', 180);
  chk(side[0] > 0.8 && side[1] > d.wallZ + 0.35, 'sideways movement in room 1 in front of the door stays clear (x=' + side[0].toFixed(2) + ' z=' + side[1].toFixed(2) + ')');
  const pushed = await page.evaluate(() => { const D = window.__level2Door, R = 0.3; const a = { x: 0, z: D.align.zFront - 0.05 }, b = { x: 1.2, z: D.align.zBack - 0.2 }, c = { x: 4, z: -11.2 }; D.block(a, R); D.block(b, R); D.block(c, R); return { a: a.z, b: b.z, c: [c.x, c.z] }; });
  chk(Math.abs(pushed.a - (d.align.zFront + 0.3)) < 0.02, 'block() pushes a room-side overlap back into room 1 (z=' + pushed.a.toFixed(2) + ')');
  chk(Math.abs(pushed.b - (d.align.zBack - 0.3)) < 0.02, 'block() pushes a hall-side overlap back into the hallway (z=' + pushed.b.toFixed(2) + ')');
  chk(pushed.c[0] === 4 && pushed.c[1] === -11.2, 'block() does not touch a sideways point inside room 1');
  // v216: open() swings the leaves and drops the collider; close() shuts it again
  const opened = await page.evaluate(() => { const D = window.__level2Door, A = window.__arcade; D.open(true); for (let i = 0; i < 10; i++) A.step(1 / 60); return { open: D.open_, ang: [D.leaves[0].rotation.y, D.leaves[1].rotation.y] }; });
  chk(opened.open && Math.abs(opened.ang[0] - Math.PI / 2) < 0.05 && Math.abs(opened.ang[1] + Math.PI / 2) < 0.05, 'open() swings both leaves into the hallway', opened);
  const through = await step(0, -8, 0, 'KeyW', 280);
  chk(through[1] < d.wallZ - 1.5, 'walking north from room 1 goes through the open door into the hallway (z=' + through[1].toFixed(2) + ')', through);
  const shut = await page.evaluate(() => { const D = window.__level2Door, A = window.__arcade; D.close({ force: true, snap: true }); for (let i = 0; i < 6; i++) A.step(1 / 60); return { open: D.open_, ang: [D.leaves[0].rotation.y, D.leaves[1].rotation.y] }; });
  chk(!shut.open && Math.abs(shut.ang[0]) < 0.05 && Math.abs(shut.ang[1]) < 0.05, 'close({force}) shuts the leaves again', shut);
  const blocked = await step(0, -8, 0, 'KeyW', 240);
  chk(blocked[1] > d.wallZ - 0.05 && blocked[1] < d.wallZ + 0.55, 'closed door blocks the hallway again (z=' + blocked[1].toFixed(2) + ')');
  await page.evaluate(() => { window.__arcade.monkey.position.set(0, 0, -6); window.__camOverride = { pos: [0.35, 1.7, -8.2], at: [0, 1.3, -12] }; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/level2_room1_view.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0.9, 1.55, -10.2], at: [0, 1.25, -12] }; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/level2_angle.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0, 1.55, -14.2], at: [0, 1.3, -12] }; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/level2_hall_view.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [0.2, 1.4, -13.2], at: [1.55, 1.3, -12.6] }; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/level2_keypad.png' });
  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  console.log('ALIGN ' + JSON.stringify(d && d.align));
  await close(); process.exit(ok ? 0 : 1);
})();
