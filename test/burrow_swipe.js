// t226 BURROW BUSTER (#13): south wall slot 2:4 (old blank G, x=-8) beside SUPER PIP QUEST; Tower Defence's cabinet design (pixel marquee,
// dirt-layer side art, ONE joystick, red PUMP button), no body neon, wall edge glow; no overlap with the claw machine / other blockers; walkable
// front; PLAY prompt, silent DEMO, 5 tickets = 1 credit, no free start, tickets per round cleared, own keys, game over -> DEMO; original untouched.
// node test/burrow.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const fs = require('fs'), crypto = require('crypto');
const PHONE = true, sfx = PHONE ? '_phone' : '';
const ORIG = '/workspace/burrow-buster/index.html', md5 = () => crypto.createHash('md5').update(fs.readFileSync(ORIG)).digest('hex');
(async () => {
  const m0 = md5();
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const { page, errors, close } = await open(PHONE ? { phone: true, w: 412, h: 860, supa } : { supa }); page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const s = await page.evaluate(() => { const A = window.__arcade, T = A.THREE, c = A.bbCab;
    const bad = []; c.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || (/body|trim/.test(o.name) && o.material.emissive && o.material.emissive.getHex()))) bad.push(o.name); });
    const tube = A.room.getObjectByName('wallNeonRun').geometry.attributes.position, v = new T.Vector3(); let over = 0;
    for (let i = 0; i < tube.count; i++) { v.fromBufferAttribute(tube, i); if (Math.abs(v.x - c.position.x) < 0.7 && v.z > 11 && v.y > 2.0) over++; }
    const bs = A.scene.children.filter(o => /^machineBadge_/.test(o.name)).map(o => [o.name.slice(13), o.userData.key]);
    const mine = A.blockers.find(b => b.name === 'bb'), box = new T.Box3().setFromObject(c.getObjectByName('body'));
    const hit = (b, x, z) => b.kind === 'obb' ? (() => { const dx = x - b.ox, dz = z - b.oz, ca = Math.cos(b.ang), sa = Math.sin(b.ang), lx = dx * ca - dz * sa, lz = dx * sa + dz * ca; return lx > b.x0 && lx < b.x1 && Math.abs(lz) < b.hz; })() : x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
    const others = []; for (const b of A.blockers) { if (b === mine || b.kind === 'plinth') continue; for (let x = box.min.x; x <= box.max.x; x += 0.05) for (let z = box.min.z; z <= box.max.z; z += 0.05) if (hit(b, x, z)) { others.push(b.name || b.kind); x = 99; break; } }
    const f = c.userData.front, frontFree = !A.blockers.some(b => b.kind !== 'plinth' && hit(b, f.x, f.z));
    const pathFree = (() => { for (let k = 0; k <= 40; k++) { const x = f.x + (0 - f.x) * k / 40, z = f.z + (6 - f.z) * k / 40; if (A.blockers.some(b => b.kind !== 'plinth' && hit(b, x, z))) return false; } return true; })();
    const cl = new T.Box3().setFromObject(A.clawCab.getObjectByName('body')), pip = new T.Box3().setFromObject(A.pipCab);
    return { wall: c.userData.wall, idx: c.userData.index, x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2), bad, over, blank: A.cabinets.some(k => k.position.distanceTo(c.position) < 0.5),
      joysticks: (() => { let n = 0; c.traverse(o => { if (o.name === 'joystick') n++; }); return n; })(),
      parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'screen', 'joystick', 'btnPump', 'coinDoor', 'kickWood'].every(k => c.getObjectByName(k)), bs, others, frontFree, pathFree,
      clawGap: +Math.hypot(Math.max(0, cl.min.x - box.max.x, box.min.x - cl.max.x), Math.max(0, cl.min.z - box.max.z, box.min.z - cl.max.z)).toFixed(2), pipOverlap: pip.intersectsBox(box), front: [f.x, f.z] }; });
  const bk = Object.fromEntries(s.bs.map(([t, k]) => [k, t]));
  chk(s.wall === 'south' && s.idx === 4 && s.x === -8 && s.z > 11 && !s.blank, 'BURROW BUSTER replaces blank G on the south wall (x=' + s.x + ', z=' + s.z + '), the corner neighbour of SUPER PIP QUEST');
  chk(s.parts && s.joysticks === 1 && s.bad.length === 0 && s.over > 0, 'cabinet parts (marquee, dirt side art, ONE joystick, PUMP button, coin door), no body neon, wall edge glow (' + s.over + ') ' + s.bad);
  chk(bk['2:4'] === '13' && bk['1:0'] === '11' && bk['2:2'] === '15' && !s.bs.some(b => b[0] === 'G' || b[0] === 'E'), 'NUMBERS: BURROW BUSTER = 13, PIP 11, SKY TOWER 15, letters E/G retired');
  chk(s.others.length === 0 && !s.pipOverlap && s.clawGap > 2, 'no overlap with other cabinets / the claw machine (gap ' + s.clawGap + ' m) ' + s.others);
  chk(s.frontFree && s.pathFree, 'monkey can walk up: the play spot ' + JSON.stringify(s.front) + ' and the way to it from the room centre are clear');
  // real walk: start 2.5 m in front, hold forward toward it
  await page.evaluate(() => { const A = window.__arcade, f = A.bbCab.userData.front; A.monkey.position.set(f.x, 0, f.z - 2.5); A.st.fp = false; });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const A = window.__arcade, f = A.bbCab.userData.front, p = A.monkey.position; for (let i = 0; i < 400 && Math.hypot(p.x - f.x, p.z - f.z) > 0.25; i++) { const dx = f.x - p.x, dz = f.z - p.z, d = Math.hypot(dx, dz); A.st.face = Math.atan2(dx, dz); const nx = p.x + dx / d * 0.03, nz = p.z + dz / d * 0.03; if (A.blockers.some(b => b.kind === 'cabinet' && nx > b.minX && nx < b.maxX && nz > b.minZ && nz < b.maxZ)) break; p.x = nx; p.z = nz; } });
  await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const w0 = await H.ui(); chk(w0.on && w0.near === 'bbCabinet', 'walking up to it brings up its PLAY prompt ' + JSON.stringify(w0));
  // screenshots: close-up beside SUPER PIP, wider room view
  await page.evaluate(PH => { window.__arcade.monkey.position.set(-7, 0, 6.5); window.__camOverride = { pos: PH ? [-6.2, 2.2, 5.4] : [-5.8, 2.2, 5.8], at: [-9.6, 1.2, 10.0] }; }, PHONE); await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/bb_cabinet_test' + sfx + '.png' });
  await page.evaluate(() => { window.__camOverride = { pos: [1.5, 4.6, -1.0], at: [-7.5, 1.0, 9.0] }; }); await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/bb_room' + sfx + '.png' }); await page.evaluate(() => { window.__camOverride = null; });
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 1; localStorage.setItem('neonarcade.tickets', '1'); p.machines.bb.credits = 0; });
  await H.goTo('bbCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'bbCabinet' && /5 TICKETS TO PLAY/.test(p0.cr), 'PLAY prompt with 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await H.press(); await page.waitForFunction(() => window.__arcade.play.mode === 'game' && window.__arcade.play.sub === 'demo' && document.getElementById('game').classList.contains('on'), null, { timeout: 150000 }); await page.waitForTimeout(1500);
  const d = await page.evaluate(W => { const w = eval(W); return { src: w.location.pathname, demo: w.__DEMO, mode: w.__bb.G.mode, silent: w.__bb.silent, cost: document.getElementById('dCost').textContent }; }, W);
  chk(/bb-play/.test(d.src) && d.demo && /play|ready/.test(d.mode) && d.silent && d.cost === '5 TICKETS TO PLAY', 'zoom lands in the silent BURROW BUSTER DEMO ' + JSON.stringify(d));
  const t0 = await page.evaluate(() => localStorage.getItem('neonarcade.tickets'));
  const dk = await page.evaluate(W => { const w = eval(W), B = w.__bb; const p0 = [B.G.player.x, B.G.player.y]; let mv = 0; for (let i = 0; i < 900; i++) { w.update(); mv = Math.max(mv, Math.abs(B.G.player.x - p0[0]) + Math.abs(B.G.player.y - p0[1])); } return { mv, got: w.__TK.got, hi: localStorage.getItem('arcade_bb_hi') }; }, W);
  chk(dk.mv > 30 && dk.got === 0 && dk.hi === null && await page.evaluate(() => localStorage.getItem('neonarcade.tickets')) === t0, 'DEMO autopilot digs around, never saves or drops tickets ' + JSON.stringify(dk));
  await page.evaluate(W => { const w = eval(W); w.__demo.stop(); w.startGame(); w.__bb.BB.In.startP = true; w.update(); }, W);
  chk(await page.evaluate(W => eval(W).__bb.G.mode, W) === 'title', 'title tap / SPACE does not start a free game');
  await page.evaluate(W => eval(W).__demo.start(), W);
  await H.insert();
  const b = await page.evaluate(() => ({ cr: window.__arcade.play.machines.bb.credits, btn: document.getElementById('bTicket').textContent }));
  chk(b.cr === 0 && b.btn === 'NEED 5 TICKETS', 'with 1 ticket: NEED 5 TICKETS ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); });
  await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.bb.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1) ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  const g = await page.evaluate(W => { const w = eval(W), B = w.__bb; return { mode: B.G.mode, lives: B.G.lives, run: B.run, demo: w.__DEMO, cr: window.__arcade.play.machines.bb.credits, sub: window.__arcade.play.sub, silent: B.silent }; }, W);
  chk(/ready|play/.test(g.mode) && g.lives === 3 && g.run && !g.demo && g.cr === 0 && g.sub === 'play' && !g.silent, 'credit starts a game with 3 lives, sound on ' + JSON.stringify(g));
  await page.waitForFunction(W => eval(W).__bb.G.mode === 'play', W, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(300);
  // t263 swipe controls (arcade copy): no joystick; drag anywhere steers 4-way
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const J = await page.evaluate(W => { const d = eval(W).document; return { base: !!d.getElementById('stickBase'), knob: !!d.getElementById('stickKnob'), pump: getComputedStyle(d.getElementById('pump')).display !== 'none' }; }, W);
  chk(!J.base && !J.knob && J.pump, 'no joystick elements, PUMP button still shown ' + JSON.stringify(J));
  await page.screenshot({ path: '/workspace/ga-burrow/shots/bb_nojoystick_phone.png' });
  const pos = () => page.evaluate(W => { const p = eval(W).__bb.G.player; return [p.x, p.y]; }, W);
  const swipe = async (dx, dy, x = 230, y = 520) => { await page.evaluate(W => { eval(W).__bb.G.god = true; }, W); const a = await pos(); await touch('touchStart', x, y);
    for (let k = 1; k <= 4; k++) await touch('touchMove', x + dx * k / 4, y + dy * k / 4);
    const dir = await page.evaluate(W => eval(W).__bb.BB.In.tdir, W); await page.waitForTimeout(900); await touch('touchEnd'); await page.waitForTimeout(150); const b = await pos(); return { dir, d: [+(b[0] - a[0]).toFixed(1), +(b[1] - a[1]).toFixed(1)] }; };
  const R = await swipe(60, 0), D = await swipe(0, 60), L = await swipe(-60, 0), U = await swipe(0, -60);
  console.log(JSON.stringify({ R, D, L, U }));
  chk(R.dir === 'r' && R.d[0] > 5, 'swipe right moves right'); chk(D.dir === 'd' && D.d[1] > 5, 'swipe down moves down');
  chk(L.dir === 'l' && L.d[0] < -5, 'swipe left moves left'); chk(U.dir === 'u' && U.d[1] < -5, 'swipe up moves up');
  const tiny = await swipe(6, 3); chk(tiny.dir === null, 'a 6px wiggle is inside the deadzone (no move) ' + tiny.dir);
  const pm = await page.evaluate(W => { const w = eval(W), B = w.__bb.BB; B.In.pumpP = false; return 1; }, W);
  const pb = await page.evaluate(W => { const r = eval(W).document.getElementById('pump').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, W);
  await touch('touchStart', pb[0], pb[1]); const pp = await page.evaluate(W => { const B = eval(W).__bb.BB; return { pump: B.In.pump, tdir: B.In.tdir }; }, W); await touch('touchEnd');
  chk(pp.pump && pp.tdir === null, 'PUMP tap pumps and is not a swipe ' + JSON.stringify(pp));
  const a0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  const run = await page.evaluate(W => { const w = eval(W), B = w.__bb, out = []; for (let r = 0; r < 2; r++) { B.G.enemies = []; B.G.mode = 'play'; for (let i = 0; i < 200 && B.G.mode !== 'ready'; i++) w.update(); for (let i = 0; i < 30; i++) w.update(); out.push(B.TK.run); } return out; }, W);
  await page.waitForTimeout(300); const a1 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets') }));
  const pl = await page.evaluate(W => !!eval(W).document.querySelector('.tkPlus'), W);
  chk(run.join() === '2,4' && a1.t - a0 === 4 && a1.ls === a1.t, 'each level clear gives exactly +2 tickets, once ' + JSON.stringify([run, a0, a1]));
  chk(pl, '+2 popup shown');
  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
