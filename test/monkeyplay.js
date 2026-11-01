// MONKEY CROSSING cabinet: slot east of the doorway, PLAY prompt, zoom into the silent DEMO, blocked at 0 credits, 1 ticket = 1 credit,
// playable, the game's own gold ticket pickups feed the arcade 1:1, isolated storage, game over -> back to the DEMO.
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE);
  const slot = await page.evaluate(() => { const A = window.__arcade, c = A.monkeyCab, sh = A.shield; const n = A.playables.filter(k => k.userData.wall === 'north').map(k => [k.name, +k.position.x.toFixed(2)]).sort((a, b) => a[1] - b[1]);
    const bad = []; c.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || (/trim/.test(o.name) && o.material.emissiveIntensity > 0 && o.material.emissive.getHex()))) bad.push(o.name); });
    return { wall: c.userData.wall, idx: c.userData.index, x: c.position.x, north: n, bad, parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'screen', 'joystick', 'coinDoor'].every(k => c.getObjectByName(k)) }; });
  console.log(JSON.stringify(slot));
  const di = slot.north.findIndex(n => n[0] === 'monkeyCabinet');
  chk(slot.wall === 'north' && slot.idx === 3 && slot.x > 0 && slot.north.filter(n => n[1] > 0)[0][0] === 'monkeyCabinet', 'MONKEY CROSSING in the first slot east of the doorway (x=' + slot.x + ')');
  chk(slot.parts && slot.bad.length === 0, 'cabinet parts present, no neon on the body ' + slot.bad);
  await page.evaluate(() => { localStorage.removeItem('mc_best'); localStorage.removeItem('mc_tickets'); const p = window.__arcade.play; p.tickets.total = 0; localStorage.setItem('neonarcade.tickets', '0'); p.machines.monkey.credits = 0; });
  await H.goTo('monkeyCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'monkeyCabinet', 'PLAY prompt at MONKEY CROSSING ' + JSON.stringify(p0));
  await page.screenshot({ path: 'shots/monkey_cab_prompt' + sfx + '.png' });
  await H.press(); await H.zoomToDemo();
  const d = await page.evaluate(() => { const w = document.getElementById('game').contentWindow; return { src: w.location.pathname, demo: w.__DEMO, st: w.__M.state, au: w.__M.audio(), ins: document.getElementById('dInsert').textContent }; });
  chk(/monkey-play/.test(d.src) && d.demo && d.st === 'play' && d.ins === 'INSERT CREDIT', 'zoom lands in the MONKEY CROSSING DEMO with INSERT CREDIT ' + JSON.stringify(d));
  await page.waitForTimeout(2500);
  const d2 = await page.evaluate(() => { const w = document.getElementById('game').contentWindow; return { au: w.__M.audio(), sc: w.__M.score, hops: w.__demo.hops }; });
  chk(d2.au.muted && d2.au.mg <= 0.001, 'DEMO is silent ' + JSON.stringify(d2.au));
  chk(d2.hops > 0, 'DEMO autopilot hops (' + d2.hops + ')');
  await page.screenshot({ path: 'shots/monkey_demo' + sfx + '.png' });
  // blocked at 0 credits / 0 tickets
  const n0 = (await H.state()).need; await page.evaluate(() => window.__arcade.play.tryPlay()); await page.waitForTimeout(300); await H.insert();
  const b = await H.state(); chk(b.sub === 'demo' && b.need >= n0 + 2 && b.tickets === 0, 'with 0 tickets: no credit, the tap does not start a game ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 3; localStorage.setItem('neonarcade.tickets', '3'); });
  await H.insert(); const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.monkey.credits, t: window.__arcade.play.tickets.total, btn: document.getElementById('bTicket').textContent }));
  chk(c.cr === 1 && c.t === 2, 'INSERT TICKET costs 1 ticket -> CREDIT 1 ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  const g = await page.evaluate(() => { const w = document.getElementById('game').contentWindow; return { st: w.__M.state, demo: w.__DEMO, cr: window.__arcade.play.machines.monkey.credits, sub: window.__arcade.play.sub, au: w.__M.audio() }; });
  chk(g.st === 'play' && !g.demo && g.cr === 0 && g.sub === 'play', 'credit starts a real game (credit 1 -> 0) ' + JSON.stringify(g));
  chk(!g.au.muted, 'game audio on');
  // controls
  const z0 = await page.evaluate(() => document.getElementById('game').contentWindow.__M.player.tz);
  if (PHONE) { const box = await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 }; }); await page.touchscreen.tap(box.x, box.y); }
  else await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(400); const z1 = await page.evaluate(() => document.getElementById('game').contentWindow.__M.player.tz);
  chk(z1 === z0 + 1, (PHONE ? 'tap' : 'arrow key') + ' hops forward (' + z0 + ' -> ' + z1 + ')');
  // ticket pickup -> arcade +1 exactly
  const t0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  const put = await page.evaluate(() => { const w = document.getElementById('game').contentWindow, M = w.__M, P = M.player, z = P.z + 1, r = M.rows[z], x = Math.round(P.fx);
    if (r.type === 'river' || r.type === 'road' || r.type === 'rail') { r.type = 'grass'; r.objs = []; } r.trees = r.trees.filter(c => c !== x); r.ticket = x; r.tkGot = 0; M.tryMove(0, 1); return { z, x }; });
  await page.waitForTimeout(600);
  const tk = await page.evaluate(() => { const w = document.getElementById('game').contentWindow; return { arcade: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets'), run: w.__M.tickets, iso: localStorage.getItem('arcade_mc_tickets'), orig: localStorage.getItem('mc_tickets') }; });
  await page.screenshot({ path: 'shots/monkey_ticket' + sfx + '.png' });
  chk(tk.arcade === t0 + 1 && tk.ls === t0 + 1 && tk.run === 1, 'a gold ticket pickup feeds neonarcade.tickets exactly +1 ' + JSON.stringify(tk));
  chk(tk.iso === '1' && tk.orig === null, 'the copy keeps its own storage keys (arcade_mc_*), the standalone game\'s mc_* untouched');
  // game over -> back to the demo; Space does not restart
  await page.evaluate(() => document.getElementById('game').contentWindow.__mcDie('squish'));
  await page.waitForFunction(() => document.getElementById('game').contentWindow.__M.state === 'over', null, { timeout: 8000 });
  if (!PHONE) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
  await page.waitForFunction(() => window.__arcade.play.goShown, null, { timeout: 5000 }).catch(() => {});
  const o = await page.evaluate(() => ({ st: document.getElementById('game').contentWindow.__M.state, again: getComputedStyle(document.getElementById('game').contentWindow.document.getElementById('again')).display, go: window.__arcade.play.goShown }));
  chk(o.st === 'over' && o.again === 'none' && o.go, 'GAME OVER, no free Play again ' + JSON.stringify(o));
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 15000 });
  const back = await page.evaluate(() => ({ demo: document.getElementById('game').contentWindow.__DEMO, ins: document.getElementById('dInsert').textContent, au: document.getElementById('game').contentWindow.__M.audio() }));
  chk(back.demo && back.ins === 'INSERT CREDIT' && back.au.muted, 'game over returns to the silent DEMO ' + JSON.stringify(back));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(async () => console.log('mode', JSON.stringify(await page.evaluate(() => ({ m: window.__arcade.play.mode, s: window.__arcade.play.sub, x: getComputedStyle(document.getElementById('bExit')).display })))));
  chk(await page.evaluate(() => !document.getElementById('game')), 'zoomed out: the game iframe (and its music) is gone');
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
