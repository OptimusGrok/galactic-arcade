// ORC ATTACK arcade stage order (Dave): stage 1 The Castle, stage 2 Lava Cave, stage 3 River Village, all on one credit; demo = stage 1.
// node test/orcstages.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE);
  const G = () => page.evaluate(() => { const w = document.getElementById('game').contentWindow; try { return { lv: w.eval('LEVEL'), stg: w.eval('ARC_STAGE'), q: w.location.search, st: w.__TD.G.state, wave: w.__TD.G.wave, gold: w.__TD.G.gold, demo: !!w.__DEMO, got: w.__orcTk.got, sub: window.__arcade.play.sub, go: window.__arcade.play.goShown, cr: window.__arcade.play.machines.orc.credits }; } catch (e) { return { err: String(e) }; } });
  const waitStage = n => page.waitForFunction(n => { try { const w = document.getElementById('game').contentWindow; return w.eval('ARC_STAGE') === n && w.__TD && w.__TD.G.state === 'play'; } catch (e) { return false; } }, n, { timeout: 30000 });
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 3; localStorage.setItem('neonarcade.tickets', '3'); });
  await H.goTo('orcCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  await H.press(); await H.zoomToDemo(); await page.waitForTimeout(2500);
  let s = await G(); chk(s.demo && s.stg === 1 && s.lv === 1 && s.st === 'play', 'attract DEMO plays stage 1, The Castle ' + JSON.stringify(s));
  await page.evaluate(() => window.__arcade.play.insertTicket()); await page.evaluate(() => window.__arcade.play.tryPlay()); await page.waitForTimeout(400);
  s = await G(); chk(!s.demo && s.stg === 1 && s.lv === 1 && s.st === 'play' && s.wave === 0 && s.cr === 0, 'credit: stage 1 = The Castle, wave 0 ' + JSON.stringify(s));
  await page.waitForTimeout(800); await page.screenshot({ path: 'shots/orc_stage1_castle' + sfx + '.png' });
  await page.evaluate(() => { const w = document.getElementById('game').contentWindow; w.__orcTk.got = 4; w.__TD.G.lives = 15; w.eval('nextLevel()'); });
  await page.waitForTimeout(500); s = await G(); chk(s.sub === 'play' && !s.go, 'stage 1 cleared: no GAME OVER, run continues ' + JSON.stringify(s));
  await waitStage(2); await page.waitForTimeout(300);
  s = await G(); chk(s.stg === 2 && s.lv === 2 && !s.demo && s.wave === 0 && s.got === 4 && s.sub === 'play' && s.gold > 180, 'stage 2 = Lava Cave, same run, tickets carried, carry-over gold ' + JSON.stringify(s));
  await page.waitForTimeout(800); await page.screenshot({ path: 'shots/orc_stage2_cave' + sfx + '.png' });
  // drops + wave scaling still work on stage 2
  const k = await page.evaluate(() => { const w = document.getElementById('game').contentWindow, T = w.__TD; for (let i = 0; i < 60 && w.__orcTk.got < 6; i++) { T.autoBuild(); if (!T.G.queues.length && !T.G.enemies.some(e => !e.dead)) T.startWave(); T.sim(1.5); } return { got: w.__orcTk.got, c1: w.__orcTk.chance(1), c10: w.__orcTk.chance(10), wave: T.G.wave }; });
  chk(k.got > 4 && k.c10 > k.c1, 'stage 2 drops tickets, chance rises with the wave ' + JSON.stringify(k));
  await page.evaluate(() => { const w = document.getElementById('game').contentWindow; w.eval('nextLevel()'); });
  await waitStage(3); await page.waitForTimeout(300);
  s = await G(); chk(s.stg === 3 && s.lv === 3 && !s.demo && s.sub === 'play', 'stage 3 = River Village ' + JSON.stringify(s));
  await page.screenshot({ path: 'shots/orc_stage3_river' + sfx + '.png' });
  const prog = await page.evaluate(() => ({ p: localStorage.getItem('arcade_orc_progress'), o: localStorage.getItem('orcattack.progress') }));
  chk(prog.p && prog.o === null, 'stage wins recorded in arcade_orc_progress only ' + JSON.stringify(prog));
  await page.evaluate(() => { const w = document.getElementById('game').contentWindow; w.__TD.G.lives = 0; w.eval("gameOver(false)"); });
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 }); await waitStage(1); await page.waitForTimeout(800);
  s = await G(); chk(s.demo && s.stg === 1, 'game over -> DEMO back on stage 1 ' + JSON.stringify(s));
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
