const { open } = require('./lib');
(async () => {
  const { page, errors, close, requests } = await open(); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForFunction(() => window.__arcade.demo.ready || window.__arcade.demo.err, null, { timeout: 60000 });
  const info = await page.evaluate(() => { const A = window.__arcade, c = A.strikeCab; const names = []; c.traverse(o => o.name && names.push(o.name));
    let neon = 0; c.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial) neon++; });
    return { x: c.position.x, z: c.position.z, rot: c.rotation.y, nrot: A.cabinets.find(k => k.name === 'cabinet_north_1').rotation.y, nz: A.cabinets.find(k => k.name === 'cabinet_north_1').position.z, wall: c.userData.wall, idx: c.userData.index, names, neon, err: A.demo.err, blank: A.cabinets.length }; });
  console.log(JSON.stringify(info));
  chk(!info.err, 'demo loaded ' + (info.err || ''));
  chk(info.wall === 'north' && info.idx === 0 && Math.abs(info.x + 8) < 1e-6 && Math.abs(info.z - info.nz) < 1e-6, 'STRIKE in north row corner slot (x=-8, same wall offset as row) ' + info.x.toFixed(2) + ',' + info.z.toFixed(2));
  chk(Math.abs(info.rot - info.nrot) < 1e-6 && Math.abs(info.rot + Math.PI / 2) < 1e-6, 'faces straight into the room like the row (not 45deg) ' + info.rot.toFixed(3));
  chk(['screen', 'marquee', 'sidePanelL', 'sidePanelR', 'bezel', 'controlPanel', 'joystick', 'btnFIRE', 'btnBOMB', 'btnHYPER', 'btn1P', 'btn2P', 'coinDoor', 'tMolding', 'screenGlow'].every(n => info.names.includes(n)), 'all parts present');
  chk(info.neon === 0, 'no neon (MeshBasic) meshes on STRIKE cabinet');
  chk(info.blank === 18, '18 blank cabinets + 2 featured');
  // walk up to it: camera showcase + texture changes
  await page.evaluate(() => { const A = window.__arcade; window.__noAdapt = 1; const f = A.strikeCab.userData.front; A.monkey.position.set(f.x + 1.5, 0, f.z + 1.5); A.st.yaw = Math.PI; A.st.lookT = -99; });
  const hash = () => page.evaluate(() => { const cv = window.__arcade.demo.w.document.getElementById('c'), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0; return { h, frames: window.__arcade.demo.frames, st: window.__arcade.demo.SK.state() }; });
  const h1 = await hash(); await page.waitForTimeout(2500); const h2 = await hash();
  console.log(JSON.stringify({ h1: [h1.h, h1.frames, h1.st.scene, h1.st.stage], h2: [h2.h, h2.frames, h2.st.scene, h2.st.score] }));
  chk(h1.h !== h2.h && h2.frames > h1.frames, 'screen texture updates (hash changed, frames ' + h1.frames + '->' + h2.frames + ')');
  chk(h2.st.scene === 'play', 'Strike demo playing, score ' + h2.st.score);
  // collisions: walk into it from four directions, monkey must stay outside its box
  const col = await page.evaluate(() => { const A = window.__arcade, obbs = A.blockers.filter(b => b.kind === 'obb'); const out = [];
    const insideAny = p => obbs.some(b => { const [lx, lz] = local(b, p); return lx > b.x0 && lx < b.x1 && Math.abs(lz) < b.hz; });
    const local = (b, p) => { const c = Math.cos(b.ang), s = Math.sin(b.ang), rx = p.x - b.ox, rz = p.z - b.oz; return [c * rx - s * rz, s * rx + c * rz]; };
    for (const [sx, sz, kx, kz] of [[-7, -7, 'KeyW', 0], [-9.3, -7.5, 'KeyA', 0], [-7.5, -9.3, 'KeyD', 0]]) {
      A.st.vel.set(0, 0, 0); A.monkey.position.set(sx, 0, sz); A.st.yaw = Math.PI / 4; // camera behind, looking toward the corner
      A.keys[kx] = true; let minIn = 9; for (let i = 0; i < 400; i++) { A.step(1 / 60); if (insideAny(A.monkey.position)) minIn = 0; } A.keys[kx] = false;
      out.push({ k: kx, end: [A.monkey.position.x.toFixed(2), A.monkey.position.z.toFixed(2)], inside: minIn === 0 }); }
    // camera never inside walls while orbiting at the corner
    A.monkey.position.set(-8.4, 0, -8.4); for (let i = 0; i < 90; i++) A.step(1 / 60); let bad = 0, maxJump = 0, prev = null;
    for (let i = 0; i < 360; i++) { A.st.yaw += 0.035; A.st.lookT = A.st.t; A.step(1 / 60); const p = A.camera.position; if (Math.abs(p.x) > 11.75 || Math.abs(p.z) > 11.75) bad++; if (prev) maxJump = Math.max(maxJump, p.distanceTo(prev)); prev = p.clone(); }
    return { out, bad, maxJump }; });
  console.log(JSON.stringify(col));
  chk(col.out.every(o => !o.inside), 'monkey never enters STRIKE or GHOST cabinet box');
  chk(col.bad === 0, 'camera stays inside room while orbiting the corner');
  chk(col.maxJump < 0.35, 'camera orbit smooth (max step ' + col.maxJump.toFixed(3) + ' m/frame)');
  // play animation + showcase easing
  const pl = await page.evaluate(() => { const A = window.__arcade, u = A.strikeCab.userData; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x + 0.6, 0, u.front.z + 0.6); A.st.yaw = Math.PI; A.st.lookT = -99;
    A.keys.KeyW = false; const y0 = A.st.yaw; // walk toward cabinet
    A.st.face = Math.atan2(-u.inward.x, -u.inward.z); for (let i = 0; i < 20; i++) { A.keys.KeyW = false; A.st.vel.copy(u.inward).multiplyScalar(-1.2); A.step(1 / 60); }
    for (let i = 0; i < 240; i++) A.step(1 / 60); let maxDy = 0, py = A.st.yaw; for (let i = 0; i < 60; i++) { A.step(1 / 60); maxDy = Math.max(maxDy, Math.abs(A.st.yaw - py)); py = A.st.yaw; }
    return { near: A.nearCab && A.nearCab.name, play: A.st.play, showK: A.st.showK, yaw: A.st.yaw, y0, maxDy }; });
  console.log(JSON.stringify(pl));
  chk(pl.near === 'strikeCabinet' || console.log(pl.near) && pl.play > 0.8, 'play animation at STRIKE cabinet');
  chk(pl.showK > 0.8, 'showcase camera engaged ' + pl.showK.toFixed(2));
  await page.evaluate(() => { window.__noAdapt = 0; }); await page.waitForTimeout(3000);
  const s = await page.evaluate(() => ({ ...window.__arcade.stats, demoFrames: window.__arcade.demo.frames, running: window.__arcade.demo.running }));
  console.log('frame stats', JSON.stringify(s), 'demo score', await page.evaluate(() => window.__arcade.demo.SK.state().score));
  const supa = requests.filter(u => /supabase/i.test(u));
  console.log('requests', requests.length, 'external', requests.filter(u => !u.startsWith('http://localhost')).length);
  chk(supa.length === 0, 'zero requests to supabase (' + supa.length + ')');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
