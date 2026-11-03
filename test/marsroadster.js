// MARS ROADSTER two-seat driving cabinet: south wall slots C + D (2:0, 2:1), 2 slots wide x 4 cabinets long into the room; machine #8;
// LEFT SEAT / RIGHT SEAT by the nearest seat; seated monkey + zoom into that seat's screen; 5 tickets = 1 credit; gold ticket pickups
// (road + air) only in the arcade copy (the original Mars Roadster is untouched). node test/marsroadster.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow'); const fs = require('fs');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const pl = await page.evaluate(() => { const A = window.__arcade, T = A.THREE, c = A.roadsterCab; c.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(c), box = { x0: +b.min.x.toFixed(2), x1: +b.max.x.toFixed(2), z0: +b.min.z.toFixed(2), z1: +b.max.z.toFixed(2), y1: +b.max.y.toFixed(2) };
    const others = A.blockers.filter(k => k.name !== 'roadster' && k.kind === 'cabinet' && k.maxZ > -12.5 && k.minZ < 12.5 && k.minX > -12.5 && k.maxX < 12.5).filter(k => k.minX < b.max.x && k.maxX > b.min.x && k.minZ < b.max.z && k.maxZ > b.min.z).length;
    const blanksCD = A.cabinets.filter(k => k.userData.wall === 'south' && k.userData.index < 2).length;
    const bad = []; c.traverse(o => { if (o.isMesh && o.material.isMeshBasicMaterial) bad.push(o.name || o.geometry.type); });
    const badges = window.__dev.badges.map(s => s.userData).filter(u => u && (u.game === 'roadster' || u.letter === 'C' || u.letter === 'D' || u.letter === 'E'));
    const tube = A.room.getObjectByName('wallNeonRun').geometry.attributes.position, v = new T.Vector3(); let over = 0;
    for (let i = 0; i < tube.count; i++) { v.fromBufferAttribute(tube, i); if (v.x > 3 && v.x < 9 && v.z > 11.5 && v.y > 3.0) over++; }
    const kiosk = A.blockers.filter(k => /kiosk/.test(k.kind || '') || /kiosk/.test(k.name || ''));
    return { box, others, blanksCD, bad, badges, over, pos: [c.position.x, c.position.z], seats: Object.fromEntries(Object.entries(c.userData.seats).map(([k, s]) => [k, [+s.world.x.toFixed(2), +s.world.z.toFixed(2)]])),
      parts: ['body', 'hood', 'marquee', 'screenL', 'screenR', 'wheelL', 'wheelR', 'seatL', 'seatR', 'podL', 'podR', 'sideArtL', 'sideArtR', 'trim', 'shifterL'].filter(k => !c.getObjectByName(k)),
      tp: [window.__tp.PAD1.x, window.__tp.PAD1.z], kioskN: kiosk.length }; });
  console.log(JSON.stringify(pl));
  const B = pl.box;
  chk(B.x0 >= 3.3 && B.x1 <= 8.7 && B.x1 - B.x0 <= 5.3 && B.x1 - B.x0 >= 4.8, 'footprint 2 slots wide across C (x=8) and D (x=4): x ' + B.x0 + '..' + B.x1);
  chk(B.z1 <= 11.75 && B.z1 > 11.3 && B.z1 - B.z0 >= 3.8 && B.z1 - B.z0 <= 4.4, '4 cabinets long into the room, clear of the south wall (z ' + B.z0 + '..' + B.z1 + ', wall at 12)');
  chk(B.x0 > -12 && B.x1 < 12 && B.z0 > -12 && B.z1 < 12 && B.y1 < 8.5, 'inside room 1');
  chk(pl.others === 0 && pl.blanksCD === 0, 'no other cabinet / blank overlaps it, blanks C and D removed');
  chk(Math.hypot(B.x0 - 0, B.z0 - 0) > 7 && Math.hypot(B.x0 - pl.tp[0], B.z0 - pl.tp[1]) > 15 && B.x0 > 1.6 + 1.5, 'well clear of the kiosk (0,0), the north doorway and the NW teleporter nook');
  chk(pl.parts.length === 0 && pl.bad.length === 0, 'parts present (hood, marquee, 2 screens, 2 wheels, 2 bucket seats on MARS pods, side art, chrome trim); no neon on the body ' + pl.parts + pl.bad);
  chk(pl.over > 0, 'the standard pink wall neon goes round its sides and top (' + pl.over + ' vertices above 3 m)');
  const n8 = pl.badges.find(u => u.game === 'roadster'), lE = pl.badges.find(u => u.letter === 'E');
  chk(n8 && n8.n === 8 && !pl.badges.some(u => u.letter === 'C' || u.letter === 'D') && lE && lE.key === '2:2', 'NUMBERS: #8 MARS ROADSTER, letters C/D retired, E stays on 2:2 ' + JSON.stringify(pl.badges));
  // walk-around: monkey can't enter the footprint
  const col = await page.evaluate(() => { const A = window.__arcade; window.__noAdapt = 1; A.st.fp = false; A.monkey.position.set(6, 0, 6); A.st.face = 0; A.st.vel.set(0, 0, 0);
    for (let i = 0; i < 120; i++) { A.keys.KeyS = true; A.st.yaw = 0; A.step(1 / 60); } A.keys.KeyS = false; return +A.monkey.position.z.toFixed(2); });
  chk(col < 7.6, 'cabinet is solid: walking south stops at the seat end (z=' + col + ')');
  // room shots
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 2; localStorage.setItem('neonarcade.tickets', '2'); p.machines.roadster.credits = 0; });
  await page.evaluate(PH => { window.__arcade.monkey.position.set(1, 0, 4); window.__camOverride = { pos: PH ? [-1.2, 3.0, 1.0] : [-0.8, 3.0, 2.2], at: [6, 1.3, 9.6] }; }, PHONE); await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/mr_room' + sfx + '.png' });
  await page.evaluate(PH => { window.__camOverride = { pos: PH ? [11, 2.2, 6.5] : [11.2, 2.4, 7.5], at: [6, 1.1, 10] }; }, PHONE); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/mr_room_side' + sfx + '.png' }); await page.evaluate(() => { window.__camOverride = null; });
  // seat selection
  // t184: the PLAY prompt shows only standing beside the car's side, next to a seat, facing the car
  const seatAt = x => page.evaluate(x => { const A = window.__arcade, c = A.roadsterCab, sx = Math.sign(x - c.position.x) || 1, s = Object.values(c.userData.seats).find(q => Math.sign(q.world.x - c.position.x) === sx).world; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(c.position.x + sx * 2.95, 0, s.z); A.st.face = sx > 0 ? -Math.PI / 2 : Math.PI / 2; A.st.yaw = A.st.face; A.st.lookT = -99; }, x);
  await page.evaluate(() => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.monkey.position.set(6, 0, A.roadsterCab.userData.zEnd - 0.45); A.st.face = 0; A.st.yaw = Math.PI; for (let i = 0; i < 30; i++) A.step(1 / 60); }); await page.waitForTimeout(600);
  chk(!(await H.ui()).on, 'no PLAY prompt at the open (rear) end any more');
  const waitTxt = t => page.waitForFunction(t => document.getElementById('playUI').classList.contains('on') === !!t && (!t || document.getElementById('bPlay').textContent === t), t, { timeout: 15000 }).catch(() => {});
  await seatAt(pl.seats.L[0] + 0.2); await waitTxt('LEFT SEAT');
  const sL = await H.ui();
  await seatAt(pl.seats.R[0] - 0.3); await waitTxt('RIGHT SEAT');
  const sR = await H.ui();
  chk(sL.on && sL.txt === 'LEFT SEAT' && sL.near === 'roadsterCabinet' && /5 TICKETS TO PLAY/.test(sL.cr), 'nearest seat prompt: LEFT SEAT (x=' + pl.seats.L[0] + ') ' + JSON.stringify(sL));
  chk(sR.on && sR.txt === 'RIGHT SEAT', 'nearest seat prompt: RIGHT SEAT (x=' + pl.seats.R[0] + ') ' + JSON.stringify(sR));
  await page.screenshot({ path: 'shots/mr_seat_prompt' + sfx + '.png' }); if (PHONE) await page.screenshot({ path: 'shots/mr_side_prompt_phone.png' });
  await page.evaluate(() => { window.__arcade.monkey.position.x += 20; window.__arcade.step(1 / 60); }); await waitTxt('');
  chk(!(await H.ui()).on, 'no prompt away from the cabinet');
  // sit in the RIGHT seat: seated pose + zoom into the right screen
  await seatAt(pl.seats.R[0]); await waitTxt('RIGHT SEAT');
  await H.press(); await page.waitForFunction(() => window.__arcade.play.mode === 'prep' && window.__arcade.play.stepIn > 0.5, null, { timeout: 15000 }).catch(() => {});
  const si = await page.evaluate(() => { const A = window.__arcade; return { mode: A.play.mode, k: +(A.play.stepIn || 0).toFixed(2), y: +A.monkey.position.y.toFixed(2), x: +A.monkey.position.x.toFixed(2) }; });
  if (PHONE) await page.screenshot({ path: 'shots/mr_stepin_phone.png' });
  chk(si.mode === 'prep' && si.k > 0.4 && si.k < 1, 'PLAY runs the step-in animation (walk to the seat, leg over, sit) ' + JSON.stringify(si));
  await page.waitForFunction(() => window.__arcade.play.mode === 'zoomIn' && window.__arcade.play.t > 0.15, null, { timeout: 15000 }).catch(() => {});
  const z = await page.evaluate(() => { const A = window.__arcade, u = A.monkey.userData, P = A.play; return { mode: P.mode, seated: A.st.seated, x: +A.monkey.position.x.toFixed(2), z: +A.monkey.position.z.toFixed(2), hips: +u.hips.position.y.toFixed(2), leg: +u.legs[0].leg.rotation.x.toFixed(2), knee: +u.legs[0].knee.rotation.x.toFixed(2), end: P.end && [+P.end.x.toFixed(2), +P.end.y.toFixed(2), +P.end.z.toFixed(2)], scr: A.roadsterCab.userData.screen.name }; });
  await page.screenshot({ path: 'shots/mr_seated_zoom' + sfx + '.png' });
  chk(z.mode === 'zoomIn' && z.seated === 'R' && Math.abs(z.x - pl.seats.R[0]) < 0.05 && z.leg < -1.2 && z.knee > 1.2, 'monkey sits in the RIGHT bucket seat (seated pose: thighs forward, knees bent) ' + JSON.stringify(z));
  chk(z.scr === 'screenR' && z.end && Math.abs(z.end[0] - 4.78) < 0.3 && z.end[2] < 11 && z.end[2] > 9, 'camera zooms into the RIGHT seat\'s screen ' + JSON.stringify(z.end));
  await H.zoomToDemo(); await page.waitForTimeout(1500);
  const d = await page.evaluate(W => { const w = eval(W); return { src: w.location.pathname, demo: w.__DEMO, st: w.__mrA.scene(), muted: w.eval('muted'), ins: document.getElementById('dInsert').textContent, cost: document.getElementById('dCost').textContent, picks: w.__TK.n, got: w.__TK.got }; }, W);
  chk(/mr-play/.test(d.src) && d.demo && d.st === 'play' && d.ins === 'INSERT CREDIT' && d.cost === '5 TICKETS TO PLAY' && d.muted, 'zoom lands in the silent MARS ROADSTER DEMO: INSERT CREDIT, 5 TICKETS TO PLAY ' + JSON.stringify(d));
  await page.screenshot({ path: 'shots/mr_demo' + sfx + '.png' });
  const t0 = await page.evaluate(() => localStorage.getItem('neonarcade.tickets'));
  await page.evaluate(W => { const w = eval(W); for (let i = 0; i < 900; i++) w.step(1 / 60); }, W);
  chk((await page.evaluate(W => eval(W).__TK.got, W)) === 0 && await page.evaluate(() => localStorage.getItem('neonarcade.tickets')) === t0, 'DEMO drives but never collects tickets');
  // 5-ticket cost
  await H.insert();
  const b = await page.evaluate(() => ({ cr: window.__arcade.play.machines.roadster.credits, t: window.__arcade.play.tickets.total, btn: document.getElementById('bTicket').textContent }));
  chk(b.cr === 0 && b.t === 2 && b.btn === 'NEED 5 TICKETS', 'with 2 tickets: NEED 5 TICKETS, no credit ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); p.insertTicket(); });
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.roadster.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1) ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  const g = await page.evaluate(W => { const w = eval(W); return { st: w.__mrA.scene(), demo: w.__DEMO, muted: w.eval('muted'), cr: window.__arcade.play.machines.roadster.credits, sub: window.__arcade.play.sub, n: w.__TK.n, air: w.__TK.picks.filter(p => p.air).length }; }, W);
  chk(g.st === 'play' && !g.demo && g.cr === 0 && g.sub === 'play' && !g.muted, 'credit starts a race with sound ' + JSON.stringify(g));
  chk(g.n >= 12 && g.n <= 20 && g.air >= 1, 'about 15 gold ticket pickups on the route (' + g.n + ', ' + g.air + ' in the air over gaps) = ~3 per ticket spent');
  // drive a little with the real keys, then run the car through pickups
  if (!PHONE) { await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowUp'); }
  const a0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  const k = await page.evaluate(W => { const w = eval(W), TK = w.__TK, got0 = TK.got, gr = TK.picks.filter(p => !p.air && !p.taken).slice(0, 2), air = TK.picks.find(p => p.air);
    for (const p of [...gr, air].filter(Boolean)) { w.__mrA.place && 0; const C = w.__mrA.car ? w.__mrA.car() : null; }
    return { got0, targets: [...gr, air].filter(Boolean).map(p => [p.x, p.y, p.z, p.air]) }; }, W);
  // move the car onto each pickup through the game's own state (C), one frame each
  const hit = await page.evaluate(([W, tg]) => { const w = eval(W); const r = w.eval(`(function(tg){ let n=0; for (const [x,y,z] of tg) { C.x=x; C.z=z; C.y=y-0.6; step(1/60); n++; } return { got: __TK.got, log: __TK.log.slice(-4), st }; })`)(tg); return r; }, [W, k.targets]);
  await page.waitForTimeout(300);
  const a1 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets') }));
  chk(hit.got - k.got0 >= 2 && a1.t === a0 + (hit.got - k.got0) && a1.ls === a1.t, 'driving through gold tickets banks them in the arcade (+' + (hit.got - k.got0) + ') ' + JSON.stringify(hit));
  chk(hit.log.some(x => /^air/.test(x)), 'an in-air pickup over a gap works');
  // mid-drive shot with a pickup ahead: put the car on the road just behind the next ground ticket
  await page.evaluate(W => { const w = eval(W); w.eval(`(function(){ const clear = z => { for (let k = z - 34; k <= z; k += 2) if (gapAt(k)) return false; return true; }; const p = __TK.picks.find(p => !p.taken && !p.air && clear(p.z)) || __TK.picks.find(p => !p.taken); if (!p) return; C.z = p.z - 20; C.x = CX(C.z); C.y = GH(C.x, C.z); C.yaw = Math.atan2(CX(C.z+10)-C.x, 10); C.v = 12; C.vx = C.vy = C.vz = 0; C.dead = 0; C.ground = true; snapCam(); })()`); }, W);
  await page.waitForTimeout(120); await page.screenshot({ path: 'shots/mr_seated' + sfx + '.png' });
  const hud = await page.evaluate(() => { const vis = id => { const e = document.getElementById(id); if (!e) return null; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden'; }; return { tix: vis('tix'), vix: vis('vix'), exit: vis('bExit') }; });
  const ghud = await page.evaluate(W => { const w = eval(W), v = id => { const e = w.document.getElementById(id); return e ? getComputedStyle(e).display !== 'none' : null; }; return { again: v('again'), menu: v('toMenu'), gar: v('garB') }; }, W);
  chk(hud.tix && !hud.vix && hud.exit && !ghud.again && !ghud.menu && !ghud.gar, 'arcade HUD: one ticket counter, no Viking chip (none held), home/exit; the copy hides RETRY / MENU / GARAGE ' + JSON.stringify([hud, ghud]));
  const iso = await page.evaluate(() => ({ s: localStorage.getItem('arcade_mr_save'), orig: localStorage.getItem('marsroadster.save.v1'), mute: localStorage.getItem('marsroadster.mute'), keys: Object.keys(localStorage).filter(k => !/^neonarcade\.|^arcade_/.test(k)) }));
  chk(iso.orig === null && iso.mute === null && iso.keys.length === 0, 'the copy uses its own keys; the original roadster keys are untouched; arcade keys stay neonarcade.* ' + JSON.stringify(iso));
  const orig = fs.readFileSync('/workspace/mars-roadster/index.html', 'utf8');
  chk(!/TicketArt|__neonTicket|__TK|__mrA/.test(orig), 'the original Mars Roadster has no tickets / pickups / arcade code');
  // finish the race -> end screen -> back to the silent DEMO (no free retry)
  await page.evaluate(W => { const w = eval(W); w.eval('finish(false, "test")'); }, W);
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 }).catch(() => {});
  const back = await page.evaluate(W => { const w = eval(W); return { sub: window.__arcade.play.sub, demo: w.__DEMO, ins: document.getElementById('dInsert').textContent, muted: w.eval('muted') }; }, W);
  chk(back.sub === 'demo' && back.demo && back.ins === 'INSERT CREDIT' && back.muted, 'race end returns to the silent DEMO ' + JSON.stringify(back));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {});
  const ex = await page.evaluate(() => { const A = window.__arcade; return { mode: A.play.mode, z: +A.monkey.position.z.toFixed(2), seated: A.st.seated, hips: +A.monkey.userData.hips.position.y.toFixed(2) }; });
  await page.waitForTimeout(400);
  const ex2 = await page.evaluate(() => +window.__arcade.monkey.userData.hips.position.y.toFixed(2));
  chk(ex.mode === 'walk' && !ex.seated && ex.z < 7.6 && ex2 < 0.84, 'exit stands the monkey up behind the seat ' + JSON.stringify(ex) + ' hips ' + ex2);
  const errs = errors.filter(e => !/supabase|Failed to load resource|net::ERR/i.test(e));
  chk(errs.length === 0, 'no page errors ' + errs.slice(0, 3));
  await close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
