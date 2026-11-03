const { open } = require('./lib');
(async () => {
  const { page, errors, close, requests } = await open(); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForFunction(() => (window.__arcade.ghostDemo.ready || window.__arcade.ghostDemo.err) && (window.__arcade.demo.ready || window.__arcade.demo.err), null, { timeout: 60000 });
  const info = await page.evaluate(() => { const A = window.__arcade, g = A.ghostCab, s = A.strikeCab; const names = []; g.traverse(o => o.name && names.push(o.name));
    const neonCheck = cab => { const bad = []; cab.traverse(o => { if (!o.isMesh) return; const m = o.material;
      if (/neon/i.test(o.name) || m.isMeshBasicMaterial) bad.push(o.name || '?');
      if (/trim|molding|edge/i.test(o.name) && m.emissive && m.emissive.getHex() && m.emissiveIntensity > 0) bad.push(o.name + ':emissive'); }); return bad; };
    const all = A.playables.filter(c => c !== A.roadsterCab && c !== A.dsCab), walls = {};   // DEAD SIGNAL stands in room 2 (test/deadsignal.js); MARS ROADSTER spans 2 south slots, checked by marsroadster.js
    for (const c of all) (walls[c.userData.wall] = walls[c.userData.wall] || []).push(c);
    const rows = {}; for (const [w, cs] of Object.entries(walls)) { const u = cs.map(c => w === 'north' || w === 'south' ? c.position.x : c.position.z).sort((a, b) => a - b);
      const d = cs.map(c => w === 'north' || w === 'south' ? Math.abs(c.position.z) : Math.abs(c.position.x)); const gaps = u.slice(1).map((v, i) => +(v - u[i]).toFixed(4));
      rows[w] = { n: cs.length, u, gaps, offs: [...new Set(d.map(v => v.toFixed(4)))], ys: [...new Set(cs.map(c => c.position.y.toFixed(3)))], rots: [...new Set(cs.map(c => c.rotation.y.toFixed(4)))] }; }
    // platform neon lip strips: floor-level emissive bars along the plinth front line, must span the full row (no gaps)
    const strips = { north: 0, northL: 0, northR: 0, west: 0 }; A.scene.updateMatrixWorld(true);
    A.scene.traverse(o => { if (!o.isMesh || !o.material.isMeshBasicMaterial) return; const b = new A.THREE.Box3().setFromObject(o); if (b.max.y > 0.2) return;
      if (b.max.z < -10.4 && b.min.z > -10.7) { if (b.min.x <= -9.49 && b.max.x >= -1.61 && b.max.x < 0) strips.northL++; if (b.max.x >= 9.49 && b.min.x <= 1.61 && b.min.x > 0) strips.northR++; } // north row is split by the doorway
      if (b.max.x < -10.4 && b.min.x > -10.7 && b.min.z <= -9.49 && b.max.z >= 9.49) strips.west++; });
    return { x: g.position.x, z: g.position.z, rot: g.rotation.y, wall: g.userData.wall, idx: g.userData.index, sw: s.userData.wall, rows, strips, names, badG: neonCheck(g), badS: neonCheck(s), err: A.ghostDemo.err }; });
  console.log(JSON.stringify(info));
  chk(!info.err, 'ghost demo loaded ' + (info.err || ''));
  chk(info.wall === 'west' && info.idx === 4 && Math.abs(info.z + 8) < 1e-6, 'GHOST in west row corner slot (z=-8) ' + info.x.toFixed(2) + ',' + info.z.toFixed(2));
  chk(info.sw === 'west' ? false : info.sw === 'north', 'STRIKE and GHOST on different walls meeting at the NW corner');
  chk(Math.abs(info.rot - 0) < 1e-6 && info.rows.west.rots.length === 1, 'GHOST faces straight into the room like its row (not 45deg)');
  chk(Object.entries(info.rows).every(([w, r]) => (w === 'north' ? r.n === 4 && JSON.stringify(r.u) === '[-8,-4,4,8]' : w === 'south' ? r.n === 3 && r.gaps.every(g => Math.abs(g - 4) < 1e-6) : r.n === 5 && r.gaps.every(g => Math.abs(g - 4) < 1e-6)) && r.offs.length === 1 && r.ys.length === 1 && r.rots.length === 1), '5 cabinets per wall (north: 4, doorway in the middle slot), 4 m slots, same wall offset/height/facing');
  chk(info.strips.northL >= 1 && info.strips.northR >= 1 && info.strips.west >= 2, 'west strip continuous along full row; north strips run to each doorway edge ' + JSON.stringify(info.strips));
  chk(['screen', 'marquee', 'sidePanelL', 'sidePanelR', 'bezel', 'controlPanel', 'joystick', 'btn0', 'btn1', 'btn2', 'coinDoor', 'trim', 'screenGlow'].every(n => info.names.includes(n)), 'all GHOST parts present');
  chk(info.badG.length === 0, 'GHOST cabinet has no neon/emissive edge meshes ' + info.badG);
  chk(info.badS.length === 0, 'STRIKE cabinet has no neon/emissive edge meshes ' + info.badS);
  const hash = () => page.evaluate(() => { const D = window.__arcade.ghostDemo, cv = D.w.document.getElementById('c'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) >>> 0; return { h, f: D.frames, st: D.gh.G.state, sc: D.gh.G.score }; });
  await page.evaluate(() => { window.__forceDemo = 1; });
  const h1 = await hash(); await page.waitForTimeout(3000); const h2 = await hash();
  console.log(JSON.stringify({ h1, h2 }));
  chk(h1.h !== h2.h && h2.f > h1.f, 'GHOST screen texture updates (frames ' + h1.f + '->' + h2.f + ')');
  chk(h2.st === 'play' || h2.st === 'dying', 'Ghost 256 demo playing (' + h2.st + ', score ' + h2.sc + ')');
  // pause when out of view
  const paused = await page.evaluate(async () => { const A = window.__arcade; window.__forceDemo = 0; A.monkey.position.set(8, 0, 8); A.st.yaw = Math.PI / 4 + Math.PI; A.st.camInit = false; A.st.vel.set(0, 0, 0);
    await new Promise(r => setTimeout(r, 1500)); const f0 = A.ghostDemo.frames, s0 = A.demo.frames; await new Promise(r => setTimeout(r, 1500)); return { g: A.ghostDemo.frames - f0, s: A.demo.frames - s0, gr: A.ghostDemo.running, sr: A.demo.running }; });
  console.log(JSON.stringify(paused));
  chk(paused.g === 0 && paused.s === 0, 'both demos pause when cabinets are off-screen');
  // play animation at GHOST
  const pl = await page.evaluate(() => { const A = window.__arcade, u = A.ghostCab.userData; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(-u.inward.x, -u.inward.z); A.st.lookT = -99;
    for (let i = 0; i < 200; i++) A.step(1 / 60); return { near: A.nearCab && A.nearCab.name, play: A.st.play, showK: A.st.showK }; });
  chk(pl.near === 'ghostCabinet' && pl.play > 0.8 && pl.showK > 0.8, 'play animation + showcase camera at GHOST ' + JSON.stringify(pl));
  // walk into the corner: must not enter either box
  const between = await page.evaluate(() => { const A = window.__arcade, obbs = A.blockers.filter(b => b.kind === 'obb'); let inside = 0;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(-7.5, 0, -7.5); A.st.yaw = Math.PI / 4; A.keys.KeyW = true; A.keys.KeyA = true;
    for (let i = 0; i < 400; i++) { A.step(1 / 60); const p = A.monkey.position; for (const b of obbs) { const c = Math.cos(b.ang), s = Math.sin(b.ang), rx = p.x - b.ox, rz = p.z - b.oz, lx = c * rx - s * rz, lz = s * rx + c * rz; if (lx > b.x0 && lx < b.x1 && Math.abs(lz) < b.hz) inside++; } }
    A.keys.KeyW = false; A.keys.KeyA = false; return { inside, end: [A.monkey.position.x, A.monkey.position.z] }; });
  console.log(JSON.stringify(between));
  chk(between.inside === 0, 'walking into the corner never enters either cabinet box');
  const ext = requests.filter(u => !u.startsWith('http://localhost'));
  console.log('requests', requests.length, 'external', ext.length, ext.slice(0, 3));
  chk(ext.length === 0, 'zero requests outside own origin');
  chk(requests.filter(u => /supabase/i.test(u)).length === 0, 'zero supabase requests');
  const s = await page.evaluate(() => window.__arcade.stats); console.log('frame stats', JSON.stringify(s));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
