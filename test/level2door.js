// t305u: LEVEL 2 doors in the hallway east wall: exist, labelled, solid; hallway/portals still passable; no errors. node test/level2door.js
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700, shieldOpen: true }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForFunction(() => window.__level2Door, null, { timeout: 20000 }).catch(() => {});
  const d = await page.evaluate(() => { const D = window.__level2Door; if (!D) return null; const p = new (D.group.position.constructor)(); D.group.getWorldPosition(p); let calls = 0; D.group.traverse(o => { if (o.isMesh) calls++; });
    return { pos: [p.x, p.z].map(v => +v.toFixed(2)), label: D.label, signs: !!D.group.getObjectByName('level2SignL') && !!D.group.getObjectByName('level2SignR'), leaves: D.leaves.length, calls, stub: typeof D.open === 'function' && typeof D.close === 'function', inHall: D.group.parent && D.group.parent.name === 'hallway' }; });
  chk(d && d.leaves === 2 && d.stub && d.inHall, 'LEVEL 2 doors exist in the hallway (two leaf pivots, open/close stubs) ' + JSON.stringify(d));
  chk(d && d.label === 'LEVEL 2' && d.signs, "'LEVEL 2' sign across both leaves");
  chk(d && d.calls <= 10, 'low draw calls (' + (d && d.calls) + ' meshes)');
  const step = (x, z, yaw, key, n) => page.evaluate(([x, z, yaw, key, n]) => { const A = window.__arcade; A.monkey.position.set(x, 0, z); A.st.vel.set(0, 0, 0); A.keys[key] = true; for (let i = 0; i < n; i++) { A.st.yaw = yaw; A.step(1 / 60); } A.keys[key] = false; return [A.monkey.position.x, A.monkey.position.z]; }, [x, z, yaw, key, n]);
  const b = await step(0, -14.5, 0, 'KeyD', 300); const cx = await page.evaluate(() => window.__level2Door.collider.x);
  chk(b[0] < cx, 'walking east into the doors stops in front of them (x=' + b[0].toFixed(2) + ' < ' + cx.toFixed(2) + ')');
  const bypass = await page.evaluate(() => { const D = window.__level2Door, p = { x: 1.5, z: -14.5 }; D.block(p, 0.3); return p.x; });
  chk(bypass < cx, 'door collider pushes the player out (' + bypass.toFixed(2) + ')');
  const n = await step(0.9, -6, 0, 'KeyW', 60 * 12);
  chk(n[1] < -19, 'hallway still passable past the doors into room 2 (z=' + n[1].toFixed(2) + ')');
  const s = await step(0, -24, Math.PI, 'KeyW', 60 * 12);
  chk(s[1] > -10, 'and back to room 1 (z=' + s[1].toFixed(2) + ')');
  await page.evaluate(() => window.__setWalls('portals')).catch(() => {}); await page.waitForTimeout(500);
  const pz = await step(0, -6, 0, 'KeyW', 60 * 12); chk(pz[1] < -19, 'with PORTALS walls the hallway is still passable (z=' + pz[1].toFixed(2) + ')');
  await page.evaluate(() => { window.__arcade.monkey.position.set(-0.6, 0, -11); window.__camOverride = { pos: [-1.1, 1.6, -11.6], at: [1.6, 1.4, -14.6] }; }); await page.waitForTimeout(2500);
  await page.screenshot({ path: '/workspace/ga-door/shots/level2_phone.png' });
  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
