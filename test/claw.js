// t215/t216 CLAW MACHINE (#12): free-standing in room 1 on the 2x2 GRID block Dave highlighted (cells i -7..-6, j -1..0), base exactly
// 2 x 2 cells (1.40 x 1.00 m) with its edges on the grid lines, glass + claw + plush, edge glow only, 1 TICKET price plate, PLAY prompt,
// 1 ticket = 1 credit = one drop, refuses at 0 tickets, copy loads clean (own key, no free credits) and returns to the arcade. node test/claw.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone', sfx = PHONE ? '_phone' : '';
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const { page, errors, close } = await open(PHONE ? { phone: true, w: 412, h: 860, supa } : { supa }); page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  await page.evaluate(() => window.__grid.set(true));
  const s = await page.evaluate(() => { const A = window.__arcade, T = A.THREE, c = A.clawCab, G = window.__grid, b = new T.Box3().setFromObject(c.getObjectByName('body'));
    const cells = []; for (let i = -9; i <= -4; i++) for (let j = -3; j <= 2; j++) { const x0 = G.origin[0] + i * G.cell[0], z0 = G.origin[1] + j * G.cell[1], x1 = x0 + G.cell[0], z1 = z0 + G.cell[1];
      const ov = Math.max(0, Math.min(x1, b.max.x) - Math.max(x0, b.min.x)) * Math.max(0, Math.min(z1, b.max.z) - Math.max(z0, b.min.z)); if (ov > 1e-6) cells.push([i, j, +(ov / (G.cell[0] * G.cell[1])).toFixed(3)]); }
    const bad = []; c.traverse(o => { if (o.isMesh && /^(body|top|post)$/.test(o.name) && (o.material.isMeshBasicMaterial || (o.material.emissive && o.material.emissive.getHex()))) bad.push(o.name); });
    const pr = c.getObjectByName('priceTag'), cv = pr && pr.material.map.image;
    const bl = A.blockers.find(k => k.name === 'claw');
    return { min: [b.min.x, b.min.z], max: [b.max.x, b.max.z], cell: G.cell, origin: G.origin, cells, bad, glow: !!c.getObjectByName('edgeGlow') && c.getObjectByName('edgeGlow').children.length,
      parts: ['screen', 'glassBack', 'claw', 'gantry', 'plush', 'marquee', 'priceTag', 'chute'].every(k => c.getObjectByName(k)), plush: c.getObjectByName('plush').children.length, bl: !!bl,
      badge: A.scene.children.filter(o => /^machineBadge_/.test(o.name)).map(o => [o.name.slice(13), o.userData.key]).find(x => x[1] === 'r1:claw') }; });
  const near = (a, b) => Math.abs(a - b) < 1e-4, fw = s.max[0] - s.min[0], fd = s.max[1] - s.min[1];
  chk(near(fw, 2 * s.cell[0]) && near(fd, 2 * s.cell[1]) && near(fw, 1.4) && near(fd, 1.0), 'footprint = 2 x 2 grid cells: ' + fw.toFixed(3) + ' x ' + fd.toFixed(3) + ' m');
  const full = s.cells.filter(c => c[2] > 0.999), part = s.cells.filter(c => c[2] <= 0.999);
  chk(full.length === 4 && part.length === 0 && full.map(c => c[0] + ',' + c[1]).sort().join(' ') === '-6,-1 -6,0 -7,-1 -7,0', 'base covers exactly cells ' + JSON.stringify(full.map(c => c[0] + ',' + c[1])) + ' (Dave\'s highlight), edges on grid lines');
  chk(s.parts && s.plush >= 10 && s.bad.length === 0 && s.glow >= 12 && s.bl, 'glass box, claw, gantry, ' + s.plush + ' plush, no body neon, ' + s.glow + ' edge-glow tubes, collision box');
  chk(s.badge && s.badge[0] === '12', 'NUMBERS: claw machine = 12 ' + JSON.stringify(s.badge));
  // Dave's view (his screenshot camera), cabinet on the spot
  await page.evaluate(() => { const A = window.__arcade; A.setFloor('carpet'); A.monkey.position.set(-4.3, 0, 3.6); A.st.yaw = -0.5; A.st.pitch = 0.95; A.st.dist = 5.6; A.st.face = Math.PI - 0.5; });   // Dave's screenshot camera (fitted), a bit wider
  await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/claw_room1' + sfx + '.png' });
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 1; localStorage.setItem('neonarcade.tickets', '1'); p.machines.claw.credits = 0; });
  await H.goTo('clawCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'clawCabinet' && /1 TICKET TO PLAY/.test(p0.cr), 'PLAY prompt at the claw machine: ' + JSON.stringify(p0));
  await page.screenshot({ path: 'shots/claw_prompt' + sfx + '.png' });
  await H.press(); await page.waitForFunction(() => window.__arcade.play.mode === 'game' && window.__arcade.play.sub === 'demo' && document.getElementById('game').classList.contains('on'), null, { timeout: 150000 }); await page.waitForTimeout(1500);
  const d0 = await page.evaluate(W => { const w = eval(W); return { src: w.location.pathname, demo: w.__demo.on, cr: w.__claw.credits, key: Object.keys(w.localStorage).filter(k => /claw/i.test(k)), dc: document.getElementById('dCost').textContent }; }, W);
  chk(/claw-play\/index\.html$/.test(d0.src) && d0.demo && d0.cr === 0 && d0.dc === '1 TICKET TO PLAY', 'zoom into the copy: silent demo, 0 local credits (no free play) ' + JSON.stringify(d0));
  await page.evaluate(W => eval(W).__claw.drop(), W); await page.waitForTimeout(400);
  chk(await page.evaluate(W => eval(W).__claw.C.st === 'idle', W), 'no drop without a ticket');
  await H.insert(); const a = await H.state(); const c1 = await page.evaluate(() => window.__arcade.play.machines.claw.credits);
  chk(a.tickets === 0 && a.ls === 0 && c1 === 1, '1 ticket spent -> 1 credit ' + JSON.stringify(a));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  const g = await page.evaluate(W => { const w = eval(W), p = window.__arcade.play; return { sub: p.sub, run: w.__clawA.run, cr: w.__claw.credits, demo: w.__demo.on }; }, W);
  chk(g.sub === 'play' && g.run && g.cr === 1 && !g.demo, 'tap to play: the copy has exactly 1 drop ' + JSON.stringify(g));
  await page.screenshot({ path: 'shots/claw_play' + sfx + '.png' });
  await page.evaluate(W => eval(W).__claw.drop(), W); await page.waitForTimeout(300);
  chk(await page.evaluate(W => eval(W).__claw.credits === 0 && eval(W).__claw.C.st !== 'idle', W), 'DROP uses the credit');
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 40000 }).catch(() => {});
  const b = await page.evaluate(W => { const w = eval(W), p = window.__arcade.play; return { sub: p.sub, back: p.demoReturns, cr: w.__claw.credits, st: w.__claw.C.st, tix: p.tickets.total }; }, W);
  chk(b.sub === 'demo' && b.cr === 0 && b.tix === 0, 'after the drop the machine goes back to its demo ' + JSON.stringify(b));
  const n0 = (await H.state()).need; await H.insert(); const r = await H.state(); const c2 = await page.evaluate(() => window.__arcade.play.machines.claw.credits);
  const bt = await page.evaluate(() => document.getElementById('bTicket').textContent);
  chk(r.tickets === 0 && c2 === 0 && r.need > n0 && /NEED A TICKET/.test(bt), 'refuses at 0 tickets: ' + bt);
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {});
  chk(await page.evaluate(() => window.__arcade.play.mode === 'walk' && !(document.getElementById('game') && document.getElementById('game').classList.contains('on'))), 'EXIT returns to the arcade');
  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
