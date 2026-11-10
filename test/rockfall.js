// t322 ROCKFALL RUSH (#14): south wall slot 2:3 (old blank F, x=-4) between blank E and BURROW BUSTER; RPG's cabinet
// art (gold stony marquee, miner/boulder/diamond side art), no body neon, wall edge glow; walkable front; PLAY prompt,
// silent DEMO, 5 tickets = 1 credit, no free start, 1 ticket per 5 diamonds + 10 for the exit (cap 40), own keys,
// game over -> DEMO; original /workspace/boulder-dig/index.html untouched.
// node test/rockfall.js
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const fs = require('fs'), crypto = require('crypto');
const PHONE = true;
const ORIG = '/workspace/boulder-dig/index.html', md5 = () => crypto.createHash('md5').update(fs.readFileSync(ORIG)).digest('hex');
(async () => {
  const m0 = md5();
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700, supa }); page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const s = await page.evaluate(() => { const A = window.__arcade, T = A.THREE, c = A.rockfallCab;
    const bad = []; c.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || (/body|trim/.test(o.name) && o.material.emissive && o.material.emissive.getHex()))) bad.push(o.name); });
    const tube = A.room.getObjectByName('wallNeonRun').geometry.attributes.position, v = new T.Vector3(); let over = 0;
    for (let i = 0; i < tube.count; i++) { v.fromBufferAttribute(tube, i); if (Math.abs(v.x - c.position.x) < 0.7 && v.z > 11 && v.y > 2.0) over++; }
    const bs = A.scene.children.filter(o => /^machineBadge_/.test(o.name)).map(o => [o.name.slice(13), o.userData.key]);
    const mine = A.blockers.find(b => b.name === 'rockfall'), box = new T.Box3().setFromObject(c.getObjectByName('body'));
    const hit = (b, x, z) => b.kind === 'obb' ? (() => { const dx = x - b.ox, dz = z - b.oz, ca = Math.cos(b.ang), sa = Math.sin(b.ang), lx = dx * ca - dz * sa, lz = dx * sa + dz * ca; return lx > b.x0 && lx < b.x1 && Math.abs(lz) < b.hz; })() : x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
    const others = []; for (const b of A.blockers) { if (b === mine || b.kind === 'plinth') continue; for (let x = box.min.x; x <= box.max.x; x += 0.05) for (let z = box.min.z; z <= box.max.z; z += 0.05) if (hit(b, x, z)) { others.push(b.name || b.kind); x = 99; break; } }
    const f = c.userData.front, frontFree = !A.blockers.some(b => b.kind !== 'plinth' && hit(b, f.x, f.z));
    const pathFree = (() => { for (let k = 0; k <= 40; k++) { const x = f.x + (0 - f.x) * k / 40, z = f.z + (6 - f.z) * k / 40; if (A.blockers.some(b => b.kind !== 'plinth' && hit(b, x, z))) return false; } return true; })();
    const mq = c.getObjectByName('marquee').material.map, sd = c.getObjectByName('sidePanelL').material.map;
    const bb = new T.Box3().setFromObject(A.bbCab), eBlank = A.cabinets.find(k => k.userData.wall === 'south' && k.userData.index === 2);
    return { wall: c.userData.wall, idx: c.userData.index, x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2), bad, over,
      blank: A.cabinets.some(k => k.position.distanceTo(c.position) < 0.5),
      joysticks: (() => { let n = 0; c.traverse(o => { if (o.name === 'joystick') n++; }); return n; })(),
      parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'screen', 'joystick', 'btnBlue', 'btnRed', 'coinDoor'].every(k => c.getObjectByName(k)),
      art: [mq && mq.image && mq.image.src, sd && sd.image && sd.image.src].map(u => (u || '').split('/').pop()),
      bs, others, frontFree, pathFree, front: [f.x, f.z],
      bbOverlap: bb.intersectsBox(box), eLetter: eBlank ? { x: +eBlank.position.x.toFixed(2), i: eBlank.userData.index } : null }; });
  const bk = Object.fromEntries(s.bs.map(([t, k]) => [k, t]));
  chk(s.wall === 'south' && s.idx === 3 && s.x === -4 && s.z > 11 && !s.blank, 'ROCKFALL RUSH replaces blank F on the south wall (x=' + s.x + ', z=' + s.z + '), between blank E and BURROW BUSTER');
  chk(s.parts && s.joysticks === 1 && s.bad.length === 0 && s.over > 0, 'cabinet parts (marquee, side art, ONE joystick, buttons, coin door), no body neon, wall edge glow (' + s.over + ') ' + s.bad);
  chk(s.art[0] === 'rf_marquee.jpg' && s.art[1] === 'rf_side.jpg', 'marquee + side art from RPG\'s mockup ' + JSON.stringify(s.art));
  chk(bk['2:3'] === '14' && bk['2:4'] === '13' && bk['2:2'] === 'E' && !s.bs.some(b => b[0] === 'F'), 'NUMBERS: ROCKFALL RUSH = 14, BURROW BUSTER 13, letter E stays, F retired');
  chk(s.others.length === 0 && !s.bbOverlap && s.eLetter && s.eLetter.i === 2, 'no overlap with BURROW BUSTER / other cabinets; blank E remains at index 2 ' + JSON.stringify([s.others, s.eLetter]));
  chk(s.frontFree && s.pathFree, 'monkey can walk up: the play spot ' + JSON.stringify(s.front) + ' and the way to it from the room centre are clear');
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 1; localStorage.setItem('neonarcade.tickets', '1'); p.machines.rockfall.credits = 0; });
  await H.goTo('rockfallCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'rockfallCabinet' && /5 TICKETS TO PLAY/.test(p0.cr), 'PLAY prompt with 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await H.press(); await page.waitForFunction(() => window.__arcade.play.mode === 'game' && window.__arcade.play.sub === 'demo' && document.getElementById('game').classList.contains('on'), null, { timeout: 150000 }); await page.waitForTimeout(1500);
  const d = await page.evaluate(W => { const w = eval(W); return { src: w.location.pathname, demo: w.__DEMO, mode: w.__G.S.mode, silent: w.__rockfall.silent, cost: document.getElementById('dCost').textContent, lives: w.__G.S.lives }; }, W);
  chk(/rockfall-play/.test(d.src) && d.demo && d.mode === 'play' && d.silent && d.cost === '5 TICKETS TO PLAY' && d.lives >= 3, 'zoom lands in the silent ROCKFALL RUSH DEMO ' + JSON.stringify(d));
  const t0 = await page.evaluate(() => localStorage.getItem('neonarcade.tickets'));
  const dk = await page.evaluate(W => { const w = eval(W), G = w.__G, p0 = G.S.pi; let mv = 0; for (let i = 0; i < 400; i++) { G.step(); mv = Math.max(mv, Math.abs(G.S.pi - p0)); } return { mv, got: w.__TK.got, hi: localStorage.getItem('arcade_rockfall_hi'), oh: localStorage.getItem('rockfall_hi') }; }, W);
  chk(dk.mv > 0 && dk.got === 0 && dk.hi === null && dk.oh === null && await page.evaluate(() => localStorage.getItem('neonarcade.tickets')) === t0, 'DEMO autopilot digs around, never saves or drops tickets ' + JSON.stringify(dk));
  await page.evaluate(W => { const w = eval(W); w.__demo.stop(); w.__G.newGame(); }, W);
  chk(await page.evaluate(W => eval(W).__G.S.mode, W) === 'title', 'title tap / newGame does not start a free game');
  await page.evaluate(W => eval(W).__demo.start(), W);
  await H.insert();
  const b = await page.evaluate(() => ({ cr: window.__arcade.play.machines.rockfall.credits, btn: document.getElementById('bTicket').textContent }));
  chk(b.cr === 0 && b.btn === 'NEED 5 TICKETS', 'with 1 ticket: NEED 5 TICKETS ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); });
  await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.rockfall.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1) ' + JSON.stringify(c));
  await page.evaluate(() => window.__arcade.play.tryPlay()); await page.waitForTimeout(1500);
  const g = await page.evaluate(W => { const w = eval(W), R = w.__rockfall; return { mode: w.__G.S.mode, lives: w.__G.S.lives, run: R.run, demo: w.__DEMO, cr: window.__arcade.play.machines.rockfall.credits, sub: window.__arcade.play.sub, silent: R.silent }; }, W);
  chk(g.mode === 'play' && g.lives === 3 && g.run && !g.demo && g.cr === 0 && g.sub === 'play' && !g.silent, 'credit starts a game with 3 lives, sound on ' + JSON.stringify(g));
  const mv = await page.evaluate(W => { const g = eval(W).__G, T = g.T;
    for (let y = 2; y < 10; y++) for (let x = 2; x < 16; x++) g.setTile(x, y, T.E);
    for (let x = 1; x < 17; x++) g.setTile(x, 10, T.ST);
    g.placePlayer(3, 9); const q0 = g.S.pi; g.K.pend = 1; g.step(); return { q0, q1: g.S.pi }; }, W);
  chk(mv.q1 === mv.q0 + 1, 'controls move the miner ' + JSON.stringify(mv));
  const a0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  const run = await page.evaluate(W => { const w = eval(W), g = w.__G, T = g.T, R = w.__rockfall;
    const clear = () => { for (let y = 2; y < 10; y++) for (let x = 2; x < 16; x++) g.setTile(x, y, T.E); for (let x = 1; x < 17; x++) g.setTile(x, 10, T.ST); };
    const grab = n => { clear(); g.placePlayer(3, 9); for (let i = 0; i < n; i++) g.setTile(4 + i, 9, T.G); for (let i = 0; i < n + 2; i++) { g.K.pend = 1; g.step(); } };
    grab(5); const a = R.TK.run; grab(5); const b = R.TK.run;
    clear(); g.placePlayer(3, 9); g.S.got = g.NEED - 1; g.setTile(4, 9, T.G); g.K.pend = 1; g.step();
    g.t[g.S.pi + 1] = T.X; g.K.pend = 1; g.step();
    return { a, b, run: R.TK.run, mode: g.S.mode, over: R.over, log: R.TK.log.slice() }; }, W);
  await page.waitForTimeout(400);
  const a1 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets') }));
  chk(run.a === 1 && run.b === 2 && run.run === 13 && run.mode === 'win' && run.over && /dia:1/.test(run.log.join()) && /exit:10/.test(run.log.join()) && a1.t - a0 === 13 && a1.ls === a1.t,
    'tickets: 1 per 5 diamonds + 10 for the exit -> 13, banked at once ' + JSON.stringify([run, a1, a0]));
  const cap = await page.evaluate(W => { const w = eval(W), R = w.__rockfall; R.start(); for (let i = 0; i < 20; i++) R.give(7, 'x'); return R.TK.run; }, W);
  chk(cap === 40, 'not farmable: a game pays at most 40 (' + cap + ')');
  await page.evaluate(W => { const w = eval(W), g = w.__G, T = g.T, S = g.S; S.lives = 1; S.mode = 'play';
    const x = S.pi % g.W, y = (S.pi / g.W) | 0; if (y > 1) { g.setTile(x, y - 1, T.R); g.fl[S.pi - g.W] = 1; g.t[S.pi - g.W] = T.R; }
    for (let i = 0; i < 40 && S.mode !== 'over'; i++) g.step(); }, W);
  const o = await page.evaluate(W => { const w = eval(W); return { mode: w.__G.S.mode, sc: w.__rockfall.scene(), hi: localStorage.getItem('arcade_rockfall_hi'), oh: localStorage.getItem('rockfall_hi'), os: localStorage.getItem('rockfall_snd') }; }, W);
  chk(o.mode === 'over' && o.sc === 'over' && o.oh === null && o.os === null, 'GAME OVER after the last life; original keys untouched ' + JSON.stringify(o));
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const back = await page.evaluate(W => { const w = eval(W); return { sub: window.__arcade.play.sub, demo: w.__DEMO, cr: window.__arcade.play.machines.rockfall.credits }; }, W);
  chk(back.sub === 'demo' && back.demo && back.cr === 0, 'game over returns to the silent DEMO ' + JSON.stringify(back));
  await page.tap('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {});
  chk(await page.evaluate(() => !document.getElementById('game')), 'zoomed out: the game iframe is unloaded');
  const src = fs.readFileSync(ORIG, 'utf8');
  chk(md5() === m0 && !/TicketArt|arcade_rockfall|__TK/.test(src), 'original /workspace/boulder-dig/index.html untouched, no tickets in it');
  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
