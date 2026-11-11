// SUPER PIP QUEST cabinet (#11, blank A = west wall slot 1:0): cabinet parts, no body neon, edge glow, NUMBERS 11 / A retired, PLAY prompt,
// zoom into the silent DEMO, 5 tickets = 1 credit, no free start, real controls, tickets per level cleared + world-clear bonus banked at once
// (once per level per run, per-run cap), own storage keys, game over -> DEMO. node test/pip.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const slot = await page.evaluate(() => { const A = window.__arcade, T = A.THREE, c = A.pipCab;
    const bad = []; c.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || (/body|trim/.test(o.name) && o.material.emissive && o.material.emissive.getHex()))) bad.push(o.name); });
    const tube = A.room.getObjectByName('wallNeonRun').geometry.attributes.position, v = new T.Vector3(); let over = 0;
    for (let i = 0; i < tube.count; i++) { v.fromBufferAttribute(tube, i); if (Math.abs(v.z - c.position.z) < 0.7 && v.x < -11 && v.y > 2.0) over++; }
    const bs = A.scene.children.filter(o => /^machineBadge_/.test(o.name)).map(o => [o.name.slice(13), o.userData.key]);
    const mq = c.getObjectByName('marquee').material.map, sd = c.getObjectByName('sidePanelL').material.map;
    return { wall: c.userData.wall, idx: c.userData.index, x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2), bad, over, blank: A.cabinets.some(k => k.position.distanceTo(c.position) < 0.5),
      art: [mq && mq.image && mq.image.src, sd && sd.image && sd.image.src].map(s => (s || '').split('/').pop()),
      parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'screen', 'joystick', 'btnJump', 'btnRun', 'coinDoor'].every(k => c.getObjectByName(k)), bs }; });
  const bk = Object.fromEntries(slot.bs.map(([t, k]) => [k, t]));
  chk(slot.wall === 'west' && slot.idx === 0 && slot.x < -11 && slot.z === 8 && !slot.blank, 'SUPER PIP QUEST replaces blank A on the west wall (x=' + slot.x + ', z=' + slot.z + ')');
  chk(slot.parts && slot.bad.length === 0 && slot.over > 0, 'cabinet parts present, no neon on the body, wall edge glow outlines it (' + slot.over + ') ' + slot.bad);
  chk(slot.art[0] === 'spq_marquee.jpg' && slot.art[1] === 'spq_side.jpg', 'marquee + side art from Dave\'s mockup ' + slot.art);
  chk(bk['1:0'] === '11' && bk['1:1'] === '10' && bk['2:0'] === '8' && bk['r2:centre'] === '9' && bk['2:2'] === '15' && bk['r2:0:0'] === 'H' && !slot.bs.some(b => b[0] === 'A' || b[0] === 'B' || b[0] === 'E'), 'NUMBERS: PIP = 11, BLASTER 10, ROADSTER 8, DEAD SIGNAL 9, SKY TOWER 15, letter H stays, A/B/E retired');
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 1; localStorage.setItem('neonarcade.tickets', '1'); p.machines.pip.credits = 0; });
  await page.evaluate(PH => { window.__arcade.monkey.position.set(-6, 0, 5); window.__camOverride = { pos: PH ? [-7.0, 2.0, 4.6] : [-7.4, 2.0, 5.2], at: [-11.6, 1.25, 8.4] }; }, PHONE); await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/pip_room' + sfx + '.png' }); await page.evaluate(() => { window.__camOverride = null; });
  await H.goTo('pipCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'pipCabinet' && /5 TICKETS TO PLAY/.test(p0.cr), 'PLAY prompt at SUPER PIP QUEST with 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await H.press(); await page.waitForFunction(() => window.__arcade.play.mode === 'game' && window.__arcade.play.sub === 'demo' && document.getElementById('game').classList.contains('on'), null, { timeout: 150000 }); await page.waitForTimeout(1500);   // generous: slow when the box is busy await page.waitForTimeout(2500);
  const d = await page.evaluate(W => { const w = eval(W), A = w.__pip.App; return { src: w.location.pathname, demo: w.__DEMO, kind: A.scene.kind, silent: w.__pip.silent, ins: document.getElementById('dInsert').textContent, cost: document.getElementById('dCost').textContent }; }, W);
  chk(/pip-play/.test(d.src) && d.demo && d.kind === 'level' && d.silent && d.ins === 'INSERT CREDIT' && d.cost === '5 TICKETS TO PLAY', 'zoom lands in the silent SUPER PIP QUEST DEMO: INSERT CREDIT, 5 TICKETS TO PLAY ' + JSON.stringify(d));
  const t0 = await page.evaluate(() => localStorage.getItem('neonarcade.tickets'));
  const x0 = await page.evaluate(W => { const A = eval(W).__pip.App; return A.scene.p.x; }, W);
  const dk = await page.evaluate(W => { const w = eval(W), A = w.__pip.App; let mx = 0; for (let i = 0; i < 900; i++) { A.step(); if (A.scene.p) mx = Math.max(mx, A.scene.p.x); } return { x: mx, got: w.__TK.got, save: localStorage.getItem('arcade_spq_save_v1') }; }, W);
  chk(dk.x > x0 + 200 && dk.got === 0 && dk.save === null && await page.evaluate(() => localStorage.getItem('neonarcade.tickets')) === t0, 'DEMO autopilot runs Pip through 1-1, never saves or drops tickets ' + JSON.stringify([x0, dk]));
  // no free start from inside the frame
  await page.evaluate(W => { const w = eval(W), P = w.__pip; P.D.stop(); P.App.toTitle(); P.App.newGame(); P.App.continueGame(); P.App.startLevel(0); }, W);
  chk(await page.evaluate(W => eval(W).__pip.App.scene.kind, W) === 'title', 'title menu / map / levels do not start a free game');
  await page.evaluate(W => eval(W).__demo.start(), W);
  await H.insert();
  const b = await page.evaluate(() => ({ cr: window.__arcade.play.machines.pip.credits, btn: document.getElementById('bTicket').textContent }));
  chk(b.cr === 0 && b.btn === 'NEED 5 TICKETS', 'with 1 ticket: NEED 5 TICKETS ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); });
  await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.pip.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1) ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  const g = await page.evaluate(W => { const w = eval(W), A = w.__pip.App; return { kind: A.scene.kind, lives: A.game.lives, run: w.__pip.run, demo: w.__DEMO, cr: window.__arcade.play.machines.pip.credits, sub: window.__arcade.play.sub, silent: w.__pip.silent }; }, W);
  chk(g.kind === 'map' && g.lives === 5 && g.run && !g.demo && g.cr === 0 && g.sub === 'play' && !g.silent, 'credit starts a run on the world map with 5 lives, sound on ' + JSON.stringify(g));
  // real controls inside the frame: enter 1-1 and run right
  await page.evaluate(W => eval(W).__pip.App.startLevel(0, false), W); await page.waitForFunction(W => { const s = eval(W).__pip.App.scene; return s.kind === 'level' && s.state === 'play'; }, W, { timeout: 8000 }).catch(() => {});
  const px0 = await page.evaluate(W => eval(W).__pip.App.scene.p.x, W);
  if (PHONE) { const box = await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const sx = box.x + box.w * 0.18, sy = box.y + box.h * 0.75; await page.touchscreen.tap(sx, sy).catch(() => {});
    await page.evaluate(([W, sx, sy]) => { const w = eval(W), f = document.getElementById('game').getBoundingClientRect(), k = f.width / w.innerWidth, x = (sx - f.left) / k, y = (sy - f.top) / k;
      const ev = (t, X) => w.dispatchEvent(new w.PointerEvent(t, { bubbles: true, pointerType: 'touch', pointerId: 7, clientX: X, clientY: y, isPrimary: true })); ev('pointerdown', x); ev('pointermove', x + 40); w.__pipTouchX = x; }, [W, sx, sy]);
    await page.waitForTimeout(900); await page.evaluate(W => { const w = eval(W); w.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 7, clientX: w.__pipTouchX + 40, clientY: 10 })); }, W); }
  else { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight'); }
  const px1 = await page.evaluate(W => eval(W).__pip.App.scene.p.x, W);
  chk(px1 > px0 + 10, (PHONE ? 'touch stick' : 'arrow keys') + ' move Pip: x ' + px0.toFixed(0) + ' -> ' + px1.toFixed(0));
  await page.waitForTimeout(400); await page.screenshot({ path: 'shots/pip_play' + sfx + '.png' });
  // a decent run: clear levels 1-6 (world 1 incl. its boss) via the game's own levelCleared
  const a0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  const run = await page.evaluate(W => { const w = eval(W), P = w.__pip, A = P.App, out = [];
    for (let i = 0; i < 6; i++) { A.startLevel(i, false); A.scene.state = 'done'; A.levelCleared(i); out.push(P.TK.run); } return out; }, W);
  await page.waitForTimeout(500); const a1 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets') }));
  console.log('RUN', JSON.stringify(run), JSON.stringify(await page.evaluate(W => eval(W).__TK.log, W)));
  chk(run[4] === 5 && run[5] === 9 && a1.t - a0 === 9 && a1.ls === a1.t, 'tickets: 1 per level (5 levels = the 5-ticket cost), world clear +3 -> world 1 pays 9, banked at once ' + JSON.stringify([run, a1]));
  const again = await page.evaluate(W => { const w = eval(W), P = w.__pip, A = P.App; A.startLevel(0, false); A.scene.state = 'done'; A.levelCleared(0); return P.TK.run; }, W);
  chk(again === 9, 'replaying a cleared level pays nothing more in the same run (' + again + ')');
  const per = await page.evaluate(W => [0, 4, 5, 11, 17].map(eval(W).__TK.per), W);
  chk(per.join() === '1,1,4,4,7', 'per level: 1, boss levels 4, final level 7: ' + per);
  const cap = await page.evaluate(W => { const P = eval(W).__pip; for (let i = 0; i < 20; i++) P.give(7, 'x'); return P.TK.run; }, W);
  chk(cap === 40, 'not farmable: a run pays at most 40 (' + cap + ')');
  const iso = await page.evaluate(() => ({ s: !!localStorage.getItem('arcade_spq_save_v1'), o: localStorage.getItem('spq_save_v1'), oa: localStorage.getItem('spq_audio') }));
  // game over: lose the last life
  await page.evaluate(W => { const w = eval(W), A = w.__pip.App; A.startLevel(6, false); A.game.lives = 1; A.scene.state = 'play'; A.scene.die(); for (let i = 0; i < 200; i++) A.step(); }, W);
  const o = await page.evaluate(W => { const w = eval(W); return { kind: w.__pip.App.scene.kind, sc: w.__pip.scene(), unl: JSON.parse(localStorage.getItem('arcade_spq_save_v1')).unlocked }; }, W);
  chk(o.kind === 'gameover' && o.sc === 'over' && o.unl >= 6 && iso.s && iso.o === null && iso.oa === null, 'GAME OVER after the last life; progress saved under arcade_spq_save_v1, original keys untouched ' + JSON.stringify([o, iso]));
  await page.evaluate(W => { const w = eval(W), A = w.__pip.App; for (let i = 0; i < 300; i++) A.step(); }, W);
  chk(await page.evaluate(W => eval(W).__pip.App.scene.kind, W) === 'gameover', 'GAME OVER does not continue to a free game');
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const back = await page.evaluate(W => { const w = eval(W); return { sub: window.__arcade.play.sub, demo: w.__DEMO, kind: w.__pip.App.scene.kind, cr: window.__arcade.play.machines.pip.credits }; }, W);
  chk(back.sub === 'demo' && back.demo && back.kind === 'level' && back.cr === 0, 'game over returns to the silent DEMO ' + JSON.stringify(back));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {});
  chk(await page.evaluate(() => !document.getElementById('game')), 'zoomed out: the game iframe is unloaded');
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
