// Room 1 east wall = space window: no blank cabinets there, featured cabinets untouched, tube flat along the glass, bands stop at the glass,
// drifting sky, room reflection refreshed on WALLS / FLOOR change, glass blocks the monkey. node test/spacewin.js [phone]
const { open } = require('./lib'); const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => { const o = await open(PH ? { phone: true, w: 412, h: 860 } : { w: 1280, h: 720 }); const p = o.page; let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => { const A = window.__arcade, T = A.THREE, W = A.spaceWin, v = new T.Vector3();
    const east = A.cabinets.filter(c => c.userData.wall === 'east').length, feat = A.featured.map(c => c.userData.wall + ':' + c.userData.index);
    const tube = A.room.getObjectByName('wallNeonRun').geometry.attributes.position; let eastTop = 0, eastN = 0;
    for (let i = 0; i < tube.count; i++) { v.fromBufferAttribute(tube, i); if (v.x > 11.8) { eastN++; eastTop = Math.max(eastTop, v.y); } }
    let bandEast = 0; for (const n of ['Pink', 'Amber', 'Cyan']) { const g = A.room.getObjectByName('wallBand' + n).geometry.attributes.position; for (let i = 0; i < g.count; i++) if (g.getX(i) > 11.6 && Math.abs(g.getZ(i)) < 11.5) bandEast++; }
    const r2east = A.room2.getObjectByName('wall3').visible;
    return { glass: !!W && W.glass.visible, east, feat, eastN, eastTop: +eastTop.toFixed(3), bandEast, wall3: A.room.getObjectByName('wall3').visible, r2east, caps: W.captures, total: A.cabinets.length + A.featured.length }; });
  console.log(JSON.stringify(r));
  chk(r.glass && !r.wall3, 'room 1 east wall replaced by the glass window');
  chk(r.east === 0 && r.total === 14, 'no blank cabinets on the east wall (14 cabinets left in room 1)');
  chk(r.feat.every(f => !/^east/.test(f)) && r.feat.length === 5, 'featured cabinets untouched (none was on the east wall) ' + r.feat);
  chk(r.eastN > 0 && r.eastTop < 0.08, 'pink tube runs flat along the bottom of the glass (max y ' + r.eastTop + ')');
  chk(r.bandEast === 0, 'coloured wall bands do not cross the glass');
  chk(r.r2east, 'room 2 keeps its wall');
  chk(r.caps >= 1, 'room reflection captured on load (' + r.caps + ')');
  const t1 = await p.evaluate(() => window.__arcade.spaceWin.mat.uniforms.uT.value); await p.waitForTimeout(1000);
  chk(await p.evaluate(() => window.__arcade.spaceWin.mat.uniforms.uT.value) > t1, 'sky drifts over time');
  // reflection refresh on option change (and the image actually changes)
  const shot = async (name, pos, at) => { await p.evaluate(([pos, at]) => { window.__camOverride = { pos, at, showMonkey: true }; }, [pos, at]); await p.waitForTimeout(1800); await p.screenshot({ path: `shots/${name}${sfx}.png` }); };
  await shot('window_wide', [0, 4.5, 11], [0, 1, -6]);
  await shot('window_angle', [-8, 3.2, 9], [12, 2.2, -4]);
  await shot('window_close', [4, 2.2, 3], [12, 2.6, -1.5]);
  const c0 = await p.evaluate(() => window.__arcade.spaceWin.captures);
  await p.evaluate(() => { window.__arcade.setWalls('viking'); window.__arcade.setFloor('carpet'); }); await p.waitForTimeout(3500);
  const c1 = await p.evaluate(() => window.__arcade.spaceWin.captures);
  chk(c1 >= c0 + 2, 'WALLS / FLOOR change re-captures the glass reflection (' + c0 + ' -> ' + c1 + ')');
  await shot('window_wide_viking_carpet', [0, 4.5, 11], [0, 1, -6]);
  await shot('window_angle_viking_carpet', [-8, 3.2, 9], [12, 2.2, -4]);
  await shot('window_close_viking_carpet', [4, 2.2, 3], [12, 2.6, -1.5]);
  await p.evaluate(() => { window.__arcade.setWalls('current'); window.__arcade.setFloor('neon'); delete window.__camOverride; });
  // collision: walk the monkey east into the glass
  const x = await p.evaluate(() => { const A = window.__arcade; A.monkey.position.set(9, 0, 2); A.st.vel.set(0, 0, 0); A.keys.KeyD = 0; for (let i = 0; i < 240; i++) { A.monkey.position.x += 0.05; A.step(1 / 60); } return A.monkey.position.x; });
  chk(x < 11.8, 'the monkey cannot walk through the glass (x=' + x.toFixed(2) + ')');
  chk(!o.errors.length, 'no page errors ' + o.errors.join(' | ')); await o.close(); process.exit(ok ? 0 : 1); })();
