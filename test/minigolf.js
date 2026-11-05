// t275u IN-WORLD MINI GOLF under the GROK SHOP stairs: stairs reachable, shield blocks under 5 tickets, paying 5 opens it, every visit pays
// again, a basement room with holes 1-3 (Strike, Ghost 256, Monkey Crossing) played by your own monkey with real ball physics, payouts
// 1 stroke +5, 2 +4, 3 +3, 4+ 0 once per hole per visit, walking back up re-arms the shield.
//   flock /workspace/.browser-test.lock node test/minigolf.js  (phone 390x700)
const { open, play } = require('./lib');
const SH = '/workspace/ga-golf/shots/';
(async () => { const { page, errors, close } = await open({ phone: true, start: true, w: 390, h: 700 }); page.setDefaultTimeout(40000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await play(page, true, 'Golfer');
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__minigolf, null, { timeout: 120000 });
  await page.evaluate(() => window.__arcade.shopReady.then(() => 1));
  const setT = n => page.evaluate(n => { localStorage.setItem('neonarcade.tickets', String(n)); window.__neonSync(); }, n);
  const tix = () => page.evaluate(() => window.__arcade.play.tickets.total);
  const G = () => page.evaluate(() => { const g = window.__minigolf, p = window.__arcade.monkey.position; return { open: g.open, below: g.below, aiming: g.aiming, rolling: g.rolling, pop: g.pop.classList.contains('on'), btn: g.pop.querySelector('#gfBtn').textContent, entries: g.entries, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), X0: g.X0, XS: g.XS, FY: g.FY, iframe: !!document.getElementById('golfFrame'), putt: getComputedStyle(document.getElementById('gfPutt')).display }; });
  // walk with real collisions on a fixed heading (yaw -pi/2 = +x, pi/2 = -x, pi = +z)
  const walk = (secs, yaw, from) => page.evaluate(([secs, yaw, from]) => { const A = window.__arcade, g = window.__minigolf, st = A.st;
    if (from) { A.monkey.position.set(from[0], from[1], from[2]); st.vel.set(0, 0, 0); }
    A.keys.KeyW = true; for (let i = 0; i < secs * 60; i++) { st.yaw = yaw; A.step(1 / 60); g.update(1 / 60); } A.keys.KeyW = false; st.vel.set(0, 0, 0); }, [secs, yaw, from]);
  const E = await page.evaluate(() => { const g = window.__minigolf; return [g.entry.x - 1.5, 0, g.entry.z]; });
  // 1. the stairs from the top (Dave's view, right of the counter)
  await page.evaluate(() => { const A = window.__arcade, g = window.__minigolf; A.monkey.position.set(g.entry.x - 2.2, 0, 1.6); window.__camOverride = { pos: [g.X0 - 3.6, 3.2, 4.6], at: [g.X0 + 3.5, -2.2, -1.8], showMonkey: true }; });
  await page.waitForTimeout(3500); await page.screenshot({ path: SH + 'golf_stairs_top_phone.png' });
  await page.evaluate(() => { window.__camOverride = null; });
  // 2. under 5 tickets
  await setT(3); await walk(3, -Math.PI / 2, E); await page.waitForTimeout(800); let s = await G();
  chk(!s.open && !s.below && s.x < s.X0 && s.x > s.X0 - 0.5, 'shield stops the monkey at the top of the stairs (x=' + s.x + ')');
  chk(s.pop && /NEED 5/.test(s.btn), 'prompt shows NEED 5 with 3 tickets');
  await page.locator('#gfBtn').tap(); await page.waitForTimeout(300); s = await G();
  chk(!s.open && (await tix()) === 3, 'PAY with 3 tickets keeps the shield closed and the tickets');
  // 3. pay 5
  await setT(12); await page.waitForTimeout(600); await page.locator('#gfBtn').tap(); await page.waitForTimeout(500); s = await G();
  chk(s.open && (await tix()) === 7, 'paying deducts 5 (12 -> ' + (await tix()) + ') and opens the shield');
  // 4. walk down the stairs into the room (real collisions, no hand-off)
  // 4a. Dave's bug: the REAL frame loop + touch joystick (no A.step, no teleport) must get past the shop's east wall line into the basement
  { const cdp = await page.context().newCDPSession(page), T = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 90, y, id: 1 }] });
    await T('touchStart', 560); await T('touchMove', 540); await T('touchMove', 505);
    let r = null; for (let i = 0; i < 120; i++) { r = await page.evaluate(() => { const A = window.__arcade, g = window.__minigolf, p = A.monkey.position; A.st.yaw = -Math.PI / 2; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), below: g.below, XS: g.XS }; }); if (r.below && r.x > r.XS + 0.6) break; await page.waitForTimeout(500); }
    await T('touchEnd'); console.log('joystick', JSON.stringify(r));
    chk(r.below && r.x > r.XS + 0.6 && r.y < -4.5, 'touch joystick walks down every step, past the doorway onto the basement walkway (x=' + r.x + ', y=' + r.y + ')');
    await page.evaluate(() => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.st.yaw = Math.PI * 0.75; }); await page.waitForTimeout(2500); await page.screenshot({ path: SH + 'golf_doorway_fixed_phone.png' });
    // back up to just inside the shield for the scripted part below
    await page.evaluate(() => { const A = window.__arcade, g = window.__minigolf; A.monkey.position.set(g.X0 + 0.3, 0, g.entry.z); A.st.vel.set(0, 0, 0); }); }
  await walk(4.2, -Math.PI / 2, null); s = await G(); console.log('stairs', JSON.stringify(s));
  chk(s.below && !s.open && s.y < -1, 'on the stairs going down (y=' + s.y + '), shield re-armed behind');
  await page.waitForTimeout(1500); await page.screenshot({ path: SH + 'golf_room_enter_phone.png' });
  await walk(2.5, -Math.PI / 2, null); s = await G(); console.log('room', JSON.stringify(s));
  chk(s.below && Math.abs(s.y - s.FY) < 0.1 && s.x > s.XS, 'reached the golf room floor (y=' + s.y + ', x=' + s.x + ')');
  chk(!s.iframe, 'no full-screen golf-play hand-off');
  chk(await page.evaluate(() => window.__minigolf.holes.length === 3 && window.__minigolf.holes.map(h => h.name).join('|') === 'STRIKE|GHOST 256|MONKEY CROSSING'), '3 holes: Strike, Ghost 256, Monkey Crossing');
  // 5. walk up to hole 1's tee, PUTT button, aim by dragging, real putt
  const tee = await page.evaluate(() => { const h = window.__minigolf.holes[0]; return [h.mesh.position.x - 0.15, h.mesh.position.z]; });
  await walk(0.2, -Math.PI / 2, [tee[0], -4.6, 0]); for (let i = 0; i < 60 && !(await page.evaluate(() => !!window.__minigolf.nearBall())); i++) await walk(0.1, Math.PI, null); await page.waitForTimeout(400); s = await G(); console.log('at tee', JSON.stringify(s));
  chk(s.putt === 'block', 'walking to the ball on hole 1 shows ⛳ PUTT');
  await page.locator('#gfPutt').tap(); await page.waitForTimeout(1200); s = await G(); chk(s.aiming, 'PUTT enters aim mode');
  await page.mouse.move(195, 420); await page.mouse.down(); for (let i = 1; i <= 8; i++) { await page.mouse.move(195 + i, 420 + i * 9); await page.waitForTimeout(40); }
  await page.waitForTimeout(500); await page.screenshot({ path: SH + 'golf_aim_hole1_phone.png' });
  const pw = await page.evaluate(() => window.__minigolf.power); chk(pw > 0.3 && pw < 0.8, 'dragging back sets power (' + pw.toFixed(2) + ')');
  await page.mouse.up(); await page.waitForTimeout(200);
  s = await G(); const st1 = await page.evaluate(() => window.__minigolf.holes[0].strokes); chk(st1 === 1, 'release putts (strokes=' + st1 + ')');
  await page.waitForFunction(() => !window.__minigolf.rolling, null, { timeout: 30000 });
  const moved = await page.evaluate(() => { const h = window.__minigolf.holes[0]; return h.ball.sunk || Math.hypot(h.ball.x - h.H.tee.x, h.ball.z - h.H.tee.z); });
  chk(moved === true || moved > 0.5, 'ball rolled with physics and stopped (' + moved + ')');
  // 6. payouts via the same stroke counter (tiny putts) + sink: 1 -> +5 (the real putt above), 2 -> +4, 3 -> +3, replay -> 0
  const play1 = async (i, n) => { await page.evaluate(i => { const g = window.__minigolf; g.stopAim(); g.goTee(i); g.startAim(g.holes[i]); }, i);
    for (let k = 0; k < n; k++) { await page.evaluate(() => window.__minigolf.strike(window.__minigolf.aim + 1.2, 0.02)); await page.waitForFunction(() => !window.__minigolf.rolling, null, { timeout: 30000 }); }
    const sc = await page.evaluate(i => window.__minigolf.holes[i].strokes, i); await page.evaluate(() => window.__minigolf.sink()); await page.waitForTimeout(300); return sc; };
  let t0 = await tix(); await page.evaluate(() => window.__minigolf.sink()); await page.waitForTimeout(300); let t1 = await tix();
  chk(t1 - t0 === 5, 'hole 1 in 1 pays +5 (' + (t1 - t0) + ')'); await page.waitForTimeout(1800);
  let sc = await play1(1, 2); let t2 = await tix(); chk(sc === 2 && t2 - t1 === 4, 'hole 2 in 2 pays +4 (' + sc + ' strokes, ' + (t2 - t1) + ')'); await page.waitForTimeout(1800);
  sc = await play1(2, 3); let t3 = await tix(); chk(sc === 3 && t3 - t2 === 3, 'hole 3 in 3 pays +3 (' + sc + ' strokes, ' + (t3 - t2) + ')'); await page.waitForTimeout(1800);
  sc = await play1(0, 1); chk((await tix()) === t3, 'replaying hole 1 in the same visit pays nothing more');
  await page.waitForTimeout(1800);
  // overview (cutaway: everything above the basement hidden for the shot)
  await page.evaluate(() => { const A = window.__arcade, g = window.__minigolf; window.__hid = []; for (const o of A.scene.children) if (o !== g.group && !o.isLight && o.visible) { o.visible = false; window.__hid.push(o); }
    const c = g.room.getObjectByName('golfCeiling'); c.visible = false; const h = g.holes; window.__camOverride = { pos: [h[1].cx, 9, -6.5], at: [h[1].cx, g.FY, h[1].cz - 0.5], showMonkey: true }; });
  await page.waitForTimeout(2500); await page.screenshot({ path: SH + 'golf_overview_phone.png' });
  await page.evaluate(() => { for (const o of window.__hid) o.visible = true; window.__minigolf.room.getObjectByName('golfCeiling').visible = true; window.__camOverride = null; });
  // 7. walk back up: re-arms, next visit pays again, payouts reset per visit
  await page.evaluate(() => window.__minigolf.stopAim());
  await walk(10, Math.PI / 2, await page.evaluate(() => [window.__minigolf.XS + 1.2, window.__minigolf.FY, -1.8])); s = await G(); console.log('up', JSON.stringify(s));
  chk(!s.below && !s.open && s.y === 0 && s.x < s.X0, 'walking back up the stairs leaves the room with the shield closed');
  const before = await tix(); await walk(2, -Math.PI / 2, E); s = await G(); chk(!s.below && s.x < s.X0, 'second visit blocked until paid');
  await page.waitForTimeout(600); await page.locator('#gfBtn').tap(); await page.waitForTimeout(400);
  chk((await tix()) === before - 5, 're-entry charges 5 again (' + before + ' -> ' + (await tix()) + ')');
  await walk(7, -Math.PI / 2, null); s = await G(); chk(s.below && s.y < -4, 'second trip down');
  const t4 = await tix(); sc = await play1(0, 4); chk(sc === 4 && (await tix()) === t4, '4 strokes pay 0 (' + sc + ')'); await page.waitForTimeout(1800);
  const t5 = await tix(); await page.evaluate(() => { const g = window.__minigolf; g.stopAim(); g.goTee(1); g.startAim(g.holes[1]); g.strike(0, 0.01); });
  await page.waitForFunction(() => !window.__minigolf.rolling); await page.evaluate(() => window.__minigolf.sink()); await page.waitForTimeout(300);
  chk((await tix()) - t5 === 5, 'new visit: hole 2 pays again (+' + ((await tix()) - t5) + ')');
  chk(await page.evaluate(() => [1, 2, 3, 4, 5, 9].map(window.__minigolf.payout).join(',')) === '5,4,3,0,0,0', 'payout table 5,4,3,0');
  { const real = errors.filter(e => !/Failed to load resource/.test(e)); chk(real.length === 0, 'no page errors ' + real.slice(0, 3).join(' | ')); }
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await close(); process.exit(ok ? 0 : 1); })();
