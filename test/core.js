const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open(); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const cab = await page.evaluate(() => { const A = window.__arcade; const by = {}; let screens = 0, art = 0;
    for (const c of A.playables) { by[c.userData.wall] = (by[c.userData.wall] || 0) + 1; const s = c.getObjectByName('screen'); if (s && !s.material.map) screens++; if (c.getObjectByName('marquee') && c.getObjectByName('sidePanelL') && c.getObjectByName('sidePanelR')) art++; }
    return { n: A.playables.length, by, screens, art }; });
  chk(cab.n === 14, 'cabinets=' + cab.n + ' (middle north slot is the doorway; east wall is the space window)'); chk(cab.by.north === 4 && cab.by.west === 5 && cab.by.south === 5 && !cab.by.east, 'per wall ' + JSON.stringify(cab.by));
  chk(cab.screens === 10, 'screen meshes without a texture map (10; BERSERKER + MONKEY CROSSING + ORC ATTACK + NOVA TETHER draw attract screens) ' + cab.screens); chk(cab.art === 14, 'marquee+side panels ' + cab.art);
  // deterministic movement: stop RAF effects by stepping manually
  const mv = await page.evaluate(() => { const A = window.__arcade; window.__noAdapt = 1; A.monkey.position.set(-6, 0, 0); A.st.yaw = 0; A.st.vel.set(0, 0, 0);
    A.keys.KeyW = true; for (let i = 0; i < 60; i++) A.step(1 / 60); A.keys.KeyW = false; const z1 = A.monkey.position.z;
    A.keys.KeyW = true; A.keys.ShiftLeft = true; for (let i = 0; i < 900; i++) A.step(1 / 60); A.keys.KeyW = false; A.keys.ShiftLeft = false;
    const zWall = A.monkey.position.z; // north row blocks at plinth
    A.st.vel.set(0, 0, 0); A.monkey.position.set(10.5, 0, 0.5); A.st.yaw = Math.PI / 2; // facing -x? move toward +x wall via D
    A.st.yaw = 0; A.keys.KeyD = true; for (let i = 0; i < 600; i++) A.step(1 / 60); A.keys.KeyD = false; const xE = A.monkey.position.x;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(11, 0, 11); A.keys.KeyD = true; A.keys.KeyS = true; for (let i = 0; i < 300; i++) A.step(1 / 60); A.keys.KeyD = false; A.keys.KeyS = false;
    const corner = [A.monkey.position.x, A.monkey.position.z];
    // stand at a cabinet facing it → play
    A.st.vel.set(0, 0, 0); A.monkey.position.set(4, 0, -9.6); A.st.yaw = 0; A.keys.KeyW = true; for (let i = 0; i < 60; i++) A.step(1 / 60); A.keys.KeyW = false; for (let i = 0; i < 90; i++) A.step(1 / 60);
    return { z1, zWall, xE, corner, at: [A.monkey.position.x, A.monkey.position.z, A.st.face], play: A.st.play, near: A.nearCab && A.nearCab.name }; });
  console.log(JSON.stringify(mv));
  chk(mv.z1 < -1.5, 'W moves forward (z ' + mv.z1.toFixed(2) + ')');
  chk(mv.zWall > -12 + 1.45 + 0.29 && mv.zWall < -9.5, 'stopped by north plinth/cabinets at z=' + mv.zWall.toFixed(2));
  chk(mv.xE < 11.7 && mv.xE > 11.5, 'stopped by the east glass at x=' + mv.xE.toFixed(2));
  chk(Math.max(...mv.corner) <= 11.651, 'wall clamp in corner ' + mv.corner.map(v => v.toFixed(2)));
  chk(mv.play > 0.8 && mv.near === 'monkeyCabinet', 'play anim at cabinet ' + mv.near + ' ' + mv.play.toFixed(2));
  await page.evaluate(() => { window.__noAdapt = 0; }); await page.waitForTimeout(3000);
  const s = await page.evaluate(() => { const r = window.__arcade.renderer.info.render; return { ...window.__arcade.stats, calls: r.calls, tris: r.triangles }; });
  console.log('frame stats', JSON.stringify(s));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
