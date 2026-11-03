// ORC ATTACK cabinet: west wall slot left of GHOST 256, PLAY prompt, zoom into the silent DEMO, 3 tickets = 1 credit (NEED below 3),
// one credit = the whole run, gold ticket drops from kills / bursts banked into neonarcade.tickets at once, isolated storage, game over -> DEMO.
// node test/orcplay.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const slot = await page.evaluate(() => { const A = window.__arcade, c = A.orcCab; const west = A.playables.filter(k => k.userData.wall === 'west').map(k => [k.name, k.userData.index, +k.position.z.toFixed(2)]).sort((a, b) => a[1] - b[1]);
    const bad = []; c.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || (/body|trim|brackets/.test(o.name) && o.material.emissive && o.material.emissive.getHex()))) bad.push(o.name); });
    return { wall: c.userData.wall, idx: c.userData.index, z: +c.position.z.toFixed(2), x: +c.position.x.toFixed(2), west, bad, parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'screen', 'joystick', 'coinDoor', 'btn5'].every(k => c.getObjectByName(k)) }; });
  console.log(JSON.stringify(slot));
  const gi = slot.west.find(n => n[0] === 'ghostCabinet');
  chk(slot.wall === 'west' && slot.idx === 3 && gi && gi[1] === 4 && slot.z === gi[2] + 4, 'ORC ATTACK on the west wall, slot 3 (z=' + slot.z + '), immediately left of GHOST 256 (slot 4, z=' + (gi && gi[2]) + ') as you face them');
  chk(slot.parts && slot.bad.length === 0, 'cabinet parts present (6 buttons, joystick, coin door), no neon on the body ' + slot.bad);
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 2; localStorage.setItem('neonarcade.tickets', '2'); p.machines.orc.credits = 0; });
  await H.goTo('orcCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'orcCabinet' && /5 TICKETS TO PLAY/.test(p0.cr), 'PLAY prompt at ORC ATTACK with 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await page.evaluate(() => { window.__camOverride = null; });
  await page.screenshot({ path: 'shots/orc_cab_prompt' + sfx + '.png' });
  await H.press(); await H.zoomToDemo();
  await page.waitForTimeout(3000);
  const d = await page.evaluate(W => { const w = eval(W); return { src: w.location.pathname, demo: w.__DEMO, st: w.__TD.G.state, ins: document.getElementById('dInsert').textContent, cost: document.getElementById('dCost').textContent, towers: w.__TD.G.towers.length, wave: w.__TD.G.wave }; }, W);
  chk(/orc-play/.test(d.src) && d.demo && d.st === 'play' && d.ins === 'INSERT CREDIT' && d.cost === '5 TICKETS TO PLAY', 'zoom lands in the ORC ATTACK DEMO: INSERT CREDIT, 3 TICKETS TO PLAY ' + JSON.stringify(d));
  chk(d.towers > 0 && d.wave >= 1, 'DEMO autopilot builds towers and calls waves (' + d.towers + ' towers, wave ' + d.wave + ')');
  const mu = await page.evaluate(W => eval(W).eval('AU.isMuted()'), W);
  chk(mu === true, 'DEMO is muted');
  const t0 = await page.evaluate(() => localStorage.getItem('neonarcade.tickets'));
  await page.evaluate(W => eval(W).__TD.sim(40), W); await page.waitForTimeout(500);
  chk(await page.evaluate(() => localStorage.getItem('neonarcade.tickets')) === t0 && await page.evaluate(W => eval(W).__orcTk.got, W) === 0, 'DEMO kills never drop tickets');
  await page.screenshot({ path: 'shots/orc_demo' + sfx + '.png' });
  // 2 tickets: NEED 3
  const n0 = (await H.state()).need; await H.insert();
  const b = await page.evaluate(() => ({ cr: window.__arcade.play.machines.orc.credits, t: window.__arcade.play.tickets.total, btn: document.getElementById('bTicket').textContent, need: window.__arcade.play.need }));
  chk(b.cr === 0 && b.t === 2 && b.need > n0 && b.btn === 'NEED 5 TICKETS', 'with 2 tickets: NEED 5 TICKETS, no credit ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); p.toDemo && 0; });
  await page.evaluate(() => document.getElementById('bTicket').textContent = 'x'); await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.orc.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1 tickets) ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  const g = await page.evaluate(W => { const w = eval(W); return { st: w.__TD.G.state, wave: w.__TD.G.wave, gold: w.__TD.G.gold, demo: w.__DEMO, cr: window.__arcade.play.machines.orc.credits, sub: window.__arcade.play.sub, muted: w.eval('AU.isMuted()'), title: w.document.getElementById('title').classList.contains('hidden') }; }, W);
  chk(g.st === 'play' && !g.demo && g.cr === 0 && g.sub === 'play' && g.wave === 0 && g.gold === 180 && g.title, 'credit starts a fresh run at wave 0 / 180 gold (credit 1 -> 0) ' + JSON.stringify(g));
  chk(!g.muted, 'game audio on');
  // real controls: tap a build pad and build an archer tower through the game's own sheet
  const built = await page.evaluate(W => { const w = eval(W), T = w.__TD, p = T.PADS[0]; T.openSheet(p); const btn = w.document.querySelector('.tb[data-b="archer"]'); if (btn) btn.click(); return { towers: T.G.towers.length, gold: T.G.gold, btn: !!btn }; }, W);
  chk(built.towers === 1 && built.gold < 180, 'building a tower from the build sheet works ' + JSON.stringify(built));
  // play waves: kills drop gold tickets, each banked into neonarcade.tickets immediately
  const a0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  let k = null; for (let i = 0; i < 40; i++) { k = await page.evaluate(W => { const w = eval(W), T = w.__TD; T.autoBuild(); if (!T.G.queues.length && !T.G.enemies.some(e => !e.dead)) T.startWave(); T.sim(1.5); return { got: w.__orcTk.got, log: w.__orcTk.log.slice(-3), wave: T.G.wave, kills: T.G.stats.kills, st: T.G.state }; }, W); if (k.got >= 2 && k.wave >= 2) break; }
  await page.waitForTimeout(350); await page.screenshot({ path: 'shots/orc_ticket' + sfx + '.png' });
  const a1 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets') }));
  chk(k.got >= 1 && a1.t - a0 >= Math.floor(k.got * 5 / 3) && a1.t - a0 <= Math.ceil(k.got * 5 / 3) && a1.ls === a1.t, 'kills drop gold tickets, banked at once: +' + k.got + ' (' + JSON.stringify(k) + ')');
  // full run tuning: a decent run (autopilot, normal gold) nets clearly more than the 3-ticket cost
  const run = await page.evaluate(W => { const w = eval(W), T = w.__TD; for (let i = 0; i < 4000 && T.G.state === 'play'; i++) { T.autoBuild(); if (!T.G.queues.length && !T.G.enemies.some(e => !e.dead)) T.startWave(); T.sim(1); }
    const L = w.__orcTk.log; return { got: w.__orcTk.got, wave: T.G.wave, st: T.G.state, lives: T.G.lives, kills: T.G.stats.kills, boss: L.filter(x => /^boss/.test(x)).length, clears: L.filter(x => /^clear/.test(x)).length, bursts: w.__orcTk.bursts }; }, W);
  const a2 = await page.evaluate(() => window.__arcade.play.tickets.total);
  chk(run.got >= 8 && Math.abs(a2 - a0 - run.got * 5 / 3) <= 1, 'a decent run nets well over 3 tickets: ' + JSON.stringify(run));
  chk(run.clears >= 3 && run.kills > 20, 'kill drops plus wave-clear bonuses (' + run.clears + ' clears)');
  const iso = await page.evaluate(() => ({ best: localStorage.getItem('arcade_orc_best'), orig: localStorage.getItem('orcattack.best'), prog: localStorage.getItem('orcattack.progress') }));
  chk(iso.best !== null && iso.orig === null && iso.prog === null, 'the copy keeps its own storage keys (arcade_orc_*), the standalone keys untouched ' + JSON.stringify(iso));
  // game over -> no retry buttons -> back to the silent DEMO
  await page.waitForFunction(() => window.__arcade.play.goShown, null, { timeout: 8000 }).catch(() => {});
  const o = await page.evaluate(W => { const w = eval(W), vis = id => getComputedStyle(w.document.getElementById(id)).display !== 'none'; return { st: w.__TD.G.state, again: vis('bAgain') || vis('bMenu') || vis('bCont') || vis('bNext'), go: window.__arcade.play.goShown }; }, W);
  chk((o.st === 'won' || o.st === 'lost') && !o.again && o.go, 'run ends: GAME OVER, no free retry / continue / next level ' + JSON.stringify(o));
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const back = await page.evaluate(W => { const w = eval(W); return { demo: w.__DEMO, ins: document.getElementById('dInsert').textContent, muted: w.eval('AU.isMuted()'), st: w.__TD.G.state }; }, W);
  chk(back.demo && back.ins === 'INSERT CREDIT' && back.muted && back.st === 'play', 'game over returns to the silent DEMO ' + JSON.stringify(back));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {});
  chk(await page.evaluate(() => !document.getElementById('game')), 'zoomed out: the game iframe is unloaded');
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
