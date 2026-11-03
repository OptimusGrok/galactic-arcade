// BLASTER cabinet (#10, blank B = west wall slot 1:1): cabinet parts, no body neon, edge glow, NUMBERS 10 / letters stable, PLAY prompt,
// zoom into the silent DEMO, 5 tickets = 1 credit, real controls (keys / touch FIRE pad), freighter kills drop gold tickets
// banked at once (per-kill and per-run caps), own storage keys, game over -> DEMO. node test/blaster.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const slot = await page.evaluate(() => { const A = window.__arcade, T = A.THREE, c = A.blasterCab;
    const bad = []; c.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || (/body|trim/.test(o.name) && o.material.emissive && o.material.emissive.getHex()))) bad.push(o.name); });
    const tube = A.room.getObjectByName('wallNeonRun').geometry.attributes.position, v = new T.Vector3(); let over = 0;
    for (let i = 0; i < tube.count; i++) { v.fromBufferAttribute(tube, i); if (Math.abs(v.z - c.position.z) < 0.7 && v.x < -11 && v.y > 2.0) over++; }
    const bs = A.scene.children.filter(o => /^machineBadge_/.test(o.name)).map(o => [o.name.slice(13), o.userData.key]);
    return { wall: c.userData.wall, idx: c.userData.index, x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2), bad, over, blank: A.cabinets.some(k => k.position.distanceTo(c.position) < 0.5),
      parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'screen', 'joystick', 'btnFire', 'coinDoor'].every(k => c.getObjectByName(k)), bs }; });
  const bk = Object.fromEntries(slot.bs.map(([t, k]) => [k, t]));
  chk(slot.wall === 'west' && slot.idx === 1 && slot.x < -11 && slot.z === 4 && !slot.blank, 'BLASTER replaces blank B on the west wall (x=' + slot.x + ', z=' + slot.z + ')');
  chk(slot.parts && slot.bad.length === 0 && slot.over > 0, 'cabinet parts present, no neon on the body, wall edge glow outlines it (' + slot.over + ') ' + slot.bad);
  chk(bk['1:1'] === '10' && bk['2:0'] === '8' && bk['r2:centre'] === '9' && bk['1:0'] === '11' && bk['2:2'] === 'E' && bk['r2:0:0'] === 'H' && !slot.bs.some(b => b[0] === 'B'), 'NUMBERS: BLASTER = 10, ROADSTER 8, DEAD SIGNAL 9, PIP 11 in A, letters E/H stay, B retired');
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 1; localStorage.setItem('neonarcade.tickets', '1'); p.machines.blaster.credits = 0; });
  await page.evaluate(PH => { window.__arcade.monkey.position.set(-6, 0, 1); window.__camOverride = { pos: PH ? [-7.0, 2.0, 0.6] : [-7.4, 2.0, 1.2], at: [-11.6, 1.25, 4.4] }; }, PHONE); await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/blaster_room' + sfx + '.png' }); await page.evaluate(() => { window.__camOverride = null; });
  await H.goTo('blasterCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'blasterCabinet' && /5 TICKETS TO PLAY/.test(p0.cr), 'PLAY prompt at BLASTER with 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await H.press(); await H.zoomToDemo(); await page.waitForTimeout(2000);
  const d = await page.evaluate(W => { const w = eval(W), B = w.__blaster; return { src: w.location.pathname, demo: w.__DEMO, mode: B.S.mode, snd: w.document.getElementById('snd').textContent, ins: document.getElementById('dInsert').textContent, cost: document.getElementById('dCost').textContent }; }, W);
  chk(/blaster-play/.test(d.src) && d.demo && /play|win/.test(d.mode) && d.ins === 'INSERT CREDIT' && d.cost === '5 TICKETS TO PLAY', 'zoom lands in the BLASTER DEMO: INSERT CREDIT, 5 TICKETS TO PLAY ' + JSON.stringify(d));
  chk(d.snd === 'SOUND OFF', 'DEMO is silent');
  const t0 = await page.evaluate(() => localStorage.getItem('neonarcade.tickets'));
  const dk = await page.evaluate(W => { const w = eval(W), B = w.__blaster; B.step(3000); return { kills: B.D.kills, got: B.TK.got, lives: B.S.lives, mode: B.S.mode, hi: localStorage.getItem('arcade_blaster_hi') }; }, W);
  chk(dk.kills >= 1 && dk.got === 0 && dk.hi === null && await page.evaluate(() => localStorage.getItem('neonarcade.tickets')) === t0, 'DEMO autopilot destroys freighters, never dies, never drops tickets or saves a hi score ' + JSON.stringify(dk));
  // no free start from inside the frame
  await page.evaluate(W => { const w = eval(W); w.__blaster.D.stop(); w.__blaster.S.mode = 'title'; w.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ' })); w.dispatchEvent(new w.KeyboardEvent('keyup', { key: ' ' })); }, W);
  chk(await page.evaluate(W => eval(W).__blaster.S.mode, W) === 'title', 'SPACE / tap on the title does not start a free game');
  await page.evaluate(W => eval(W).__demo.start(), W);
  await H.insert();
  const b = await page.evaluate(() => ({ cr: window.__arcade.play.machines.blaster.credits, btn: document.getElementById('bTicket').textContent }));
  chk(b.cr === 0 && b.btn === 'NEED 5 TICKETS', 'with 1 ticket: NEED 5 TICKETS ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); });
  await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.blaster.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1) ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  const g = await page.evaluate(W => { const w = eval(W), S = w.__blaster.S; return { mode: S.mode, lives: S.lives, level: S.level, score: S.score, demo: w.__DEMO, cr: window.__arcade.play.machines.blaster.credits, sub: window.__arcade.play.sub, snd: w.document.getElementById('snd').textContent }; }, W);
  chk(/play|win/.test(g.mode) && g.lives === 3 && g.level <= 2 && !g.demo && g.cr === 0 && g.sub === 'play', 'credit starts a fresh run: level 1, 3 ships ' + JSON.stringify(g));
  chk(g.snd === 'SOUND ON', 'game sound back on');
  // real controls inside the frame
  const x0 = await page.evaluate(W => { const w = eval(W); w.__blaster.S.bombs = []; return w.__blaster.S.p.x; }, W);
  let fired = false;
  if (PHONE) { const fr = page.frameLocator('#game');
    const touch = (id, type) => page.evaluate(([W, id, type]) => { const w = eval(W), el = w.document.getElementById(id); el.dispatchEvent(new w.PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: 5 })); }, [W, id, type]);
    const vis = await page.evaluate(W => { const w = eval(W), r = w.document.getElementById('bf').getBoundingClientRect(); return w.document.body.classList.contains('touch') && r.width > 40 && r.bottom <= w.innerHeight + 1; }, W);
    chk(vis, 'phone: the touch pad (◀ FIRE ▶) shows inside the cabinet frame');
    await touch('br', 'pointerdown'); await page.waitForFunction(([W, x0]) => eval(W).__blaster.S.p.x > x0 + 12, [W, x0], { timeout: 5000 }).catch(() => {}); await touch('br', 'pointerup');
    await page.evaluate(W => { eval(W).__blaster.S.shots = []; }, W); await touch('bf', 'pointerdown'); await page.waitForFunction(W => eval(W).__blaster.S.shots.length > 0, W, { timeout: 5000 }).catch(() => {}); fired = await page.evaluate(W => eval(W).__blaster.S.shots.length > 0, W); await touch('bf', 'pointerup'); }
  else { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
    await page.keyboard.down('Space'); await page.waitForTimeout(60); fired = await page.evaluate(W => eval(W).__blaster.S.shots.length > 0, W); await page.keyboard.up('Space'); }
  const x1 = await page.evaluate(W => eval(W).__blaster.S.p.x, W);
  chk(x1 > x0 + 10 && fired, (PHONE ? 'touch ▶ / FIRE' : 'arrow keys / SPACE') + ' move and fire the ship: x ' + x0.toFixed(0) + ' -> ' + x1.toFixed(0) + ', fired ' + fired);
  await page.waitForTimeout(500); await page.screenshot({ path: 'shots/blaster_play' + sfx + '.png' });
  // a decent run: 5 freighters (levels 1-5) via a forced hit, as in RPG's own test
  const a0 = await page.evaluate(W => { const B = eval(W).__blaster; B.TK.run = 0; B.S.level = 1; B.S.mode = 'play'; return window.__arcade.play.tickets.total; }, W);
  const kill = W => page.evaluate(W => { const w = eval(W), B = w.__blaster, S = B.S; S.bombs = []; S.beam = null; S.p.frz = 0; S.f.alive = true; S.f.x = S.p.x - 6; S.f.dx = 0; S.f.y = S.p.y - 80;
    B.K.f = 1; for (let i = 0; i < 60 && S.mode === 'play'; i++) B.step(); B.K.f = 0; for (let i = 0; i < 200 && S.mode === 'win'; i++) B.step(); return { got: B.TK.run, level: S.level }; }, W);
  let r; for (let i = 0; i < 5; i++) r = await kill(W);
  await page.waitForTimeout(400); const a1 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets') }));
  console.log('RUN', JSON.stringify(r), JSON.stringify(await page.evaluate(W => eval(W).__TK.log, W)));
  chk(r.got === 15 && a1.t - a0 === 15 && a1.ls === a1.t, 'a decent run (5 freighters, to level 6) pays 15 = 3x the 5-ticket cost, banked at once ' + JSON.stringify(a1));
  const per = await page.evaluate(W => [1, 2, 3, 4, 5, 6, 10, 50].map(eval(W).__TK.per), W);
  chk(per.join() === '1,2,3,4,5,5,6,6', 'per freighter rises with level, capped at 6: ' + per);
  const cap = await page.evaluate(W => { const B = eval(W).__blaster; for (let i = 0; i < 20; i++) B.TK.give(6, 100, 50, 'x'); return B.TK.run; }, W);
  chk(cap === 60, 'not farmable: a run pays at most 60 (' + cap + ')');
  const iso = await page.evaluate(() => ({ hi: localStorage.getItem('arcade_blaster_hi'), snd: localStorage.getItem('arcade_blaster_snd'), oh: localStorage.getItem('blaster_hi'), os: localStorage.getItem('blaster_snd') }));
  // game over
  await page.evaluate(W => { const w = eval(W), B = w.__blaster, S = B.S; S.lives = 1; S.f.alive = false; S.bombs = [{ x: S.p.x + 4, y: S.p.y - 1, v: 1 }]; B.step(3); }, W);
  const o = await page.evaluate(W => { const w = eval(W); return { mode: w.__blaster.S.mode, hi: localStorage.getItem('arcade_blaster_hi') }; }, W);
  chk(o.mode === 'over' && +o.hi > 0 && iso.oh === null && iso.os === null, 'GAME OVER after the last ship; hi score saved under arcade_blaster_hi, original keys untouched ' + JSON.stringify([o, iso]));
  if (!PHONE) await page.keyboard.press('Space'); await page.waitForTimeout(300);
  chk(await page.evaluate(W => eval(W).__blaster.S.mode, W) === 'over', 'a press after GAME OVER does not start a free game');
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const back = await page.evaluate(W => { const w = eval(W); return { sub: window.__arcade.play.sub, demo: w.__DEMO, ins: document.getElementById('dInsert').textContent, mode: w.__blaster.S.mode, cr: window.__arcade.play.machines.blaster.credits }; }, W);
  chk(back.sub === 'demo' && back.demo && back.mode === 'play' && back.cr === 0, 'game over returns to the silent DEMO ' + JSON.stringify(back));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {});
  chk(await page.evaluate(() => !document.getElementById('game')), 'zoomed out: the game iframe is unloaded');
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
