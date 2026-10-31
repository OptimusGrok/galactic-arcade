const { open } = require('./lib');
(async () => {
  const { page, errors, close, requests } = await open(); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForFunction(() => (window.__arcade.ghostDemo.ready || window.__arcade.ghostDemo.err) && (window.__arcade.demo.ready || window.__arcade.demo.err), null, { timeout: 60000 });
  const info = await page.evaluate(() => { const A = window.__arcade, g = A.ghostCab, s = A.strikeCab; const names = []; g.traverse(o => o.name && names.push(o.name));
    const neonCheck = cab => { const bad = []; cab.traverse(o => { if (!o.isMesh) return; const m = o.material;
      if (/neon/i.test(o.name) || m.isMeshBasicMaterial) bad.push(o.name || '?');
      if (/trim|molding|edge/i.test(o.name) && m.emissive && m.emissive.getHex() && m.emissiveIntensity > 0) bad.push(o.name + ':emissive'); }); return bad; };
    const d = Math.hypot(g.position.x - s.position.x, g.position.z - s.position.z);
    return { x: g.position.x, z: g.position.z, rot: g.rotation.y, rotS: s.rotation.y, names, gap: d, badG: neonCheck(g), badS: neonCheck(s), err: A.ghostDemo.err }; });
  console.log(JSON.stringify(info));
  chk(!info.err, 'ghost demo loaded ' + (info.err || ''));
  chk(info.x < -9 && info.z < -8, 'GHOST cabinet in north-west corner ' + info.x.toFixed(2) + ',' + info.z.toFixed(2));
  chk(Math.abs(info.rot - info.rotS) < 1e-6 && Math.abs(Math.abs(info.rot) - Math.PI / 4) < 0.01, 'angled 45deg, side by side with STRIKE');
  chk(info.gap > 1.5 && info.gap < 2.2, 'spacing between cabinets ' + info.gap.toFixed(2) + ' m');
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
  // walk between the two cabinets toward the corner: must not enter either box
  const between = await page.evaluate(() => { const A = window.__arcade, obbs = A.blockers.filter(b => b.kind === 'obb'); let inside = 0;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(-7.5, 0, -7.5); A.st.yaw = Math.PI / 4; A.keys.KeyW = true;
    for (let i = 0; i < 400; i++) { A.step(1 / 60); const p = A.monkey.position; for (const b of obbs) { const c = Math.cos(b.ang), s = Math.sin(b.ang), rx = p.x - b.ox, rz = p.z - b.oz, lx = c * rx - s * rz, lz = s * rx + c * rz; if (lx > b.x0 && lx < b.x1 && Math.abs(lz) < b.hz) inside++; } }
    A.keys.KeyW = false; return { inside, end: [A.monkey.position.x, A.monkey.position.z] }; });
  console.log(JSON.stringify(between));
  chk(between.inside === 0, 'walking between the cabinets never enters either box');
  const ext = requests.filter(u => !u.startsWith('http://localhost'));
  console.log('requests', requests.length, 'external', ext.length, ext.slice(0, 3));
  chk(ext.length === 0, 'zero requests outside own origin');
  chk(requests.filter(u => /supabase/i.test(u)).length === 0, 'zero supabase requests');
  const s = await page.evaluate(() => window.__arcade.stats); console.log('frame stats', JSON.stringify(s));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
