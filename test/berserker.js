// BERSERKER: cabinet only, north row slot next to STRIKE, no neon, no prompt, no demo, no tickets.
const { open } = require('./lib');
(async () => {
  const { page, errors, requests, close } = await open();
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const info = await page.evaluate(() => { const A = window.__arcade, b = A.berserkerCab, s = A.strikeCab, n2 = A.cabinets.find(k => k.name === 'cabinet_north_2');
    const names = []; b.traverse(o => o.name && names.push(o.name)); const bad = [];
    b.traverse(o => { if (!o.isMesh) return; const m = o.material; if (/neon/i.test(o.name) || m.isMeshBasicMaterial) bad.push(o.name); if (/trim|edge|molding/i.test(o.name) && m.emissive && m.emissive.getHex() && m.emissiveIntensity > 0) bad.push(o.name + ':emissive'); });
    const north = A.playables.filter(c => c.userData.wall === 'north').map(c => [c.name, c.position.x]).sort((a, c) => a[1] - c[1]);
    return { x: b.position.x, z: b.position.z, y: b.position.y, rot: b.rotation.y, wall: b.userData.wall, idx: b.userData.index, sx: s.position.x, sz: s.position.z, nz: n2.position.z, nrot: n2.rotation.y, ny: n2.position.y, names, bad, north,
      spot: !!A.scene.getObjectByName('berserkerSpot'), playMachines: Object.keys(A.play.machines), iframes: [...document.querySelectorAll('iframe')].map(f => f.getAttribute('src')),
      tex: ['sidePanelL', 'sidePanelR', 'marquee', 'screen'].map(n => !!b.getObjectByName(n).material.map) }; });
  console.log(JSON.stringify(info));
  chk(info.wall === 'north' && info.idx === 1 && Math.abs(info.x + 4) < 1e-6, 'BERSERKER in the north-row slot next to STRIKE (x=-4)');
  chk(Math.abs(info.z - info.nz) < 1e-6 && Math.abs(info.y - info.ny) < 1e-6 && Math.abs(info.rot - info.nrot) < 1e-6, 'same wall offset, platform height and facing as the row');
  chk(Math.abs(info.sx + 8) < 1e-6 && Math.abs(info.sz - info.nz) < 1e-6, 'STRIKE unchanged at x=-8');
  chk(info.north.length === 5 && info.north[0][0] === 'strikeCabinet' && info.north[1][0] === 'berserkerCabinet', 'north row: STRIKE, BERSERKER, then 3 blanks (5 total) ' + info.north.map(n => n[0]).join(','));
  chk(['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'bezel', 'screen', 'controlPanel', 'joystick', 'knotwork', 'coinDoor'].every(n => info.names.includes(n)) && info.tex.every(Boolean), 'all parts present with reference-art textures');
  chk(info.bad.length === 0, 'no neon / emissive edge meshes on the BERSERKER body ' + info.bad);
  chk(info.spot, 'warm spotlight on BERSERKER');
  chk(!info.playMachines.includes('berserker') && !info.iframes.some(s => /berserk/i.test(s || '')), 'no game, no attract demo');
  await page.evaluate(() => { const A = window.__arcade, u = A.berserkerCab.userData; window.__noAdapt = 1; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; });
  await page.waitForTimeout(1000);
  const pr = await page.evaluate(() => { const A = window.__arcade, b = A.play.blocked; dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
    return { near: A.nearCab && A.nearCab.name, on: document.getElementById('playUI').classList.contains('on'), mode: A.play.mode, blocked: A.play.blocked > b, tix: window.__neonTicket(1, 'berserker'), total: A.play.tickets.total }; });
  chk(pr.near === 'berserkerCabinet' && !pr.on && pr.mode === 'walk' && pr.blocked, 'monkey at BERSERKER: no PLAY / INSERT COIN prompt, Enter does nothing ' + JSON.stringify(pr));
  chk(pr.tix === false && pr.total === 1, 'BERSERKER never pays tickets (still the starting 1)');
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
