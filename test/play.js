// PLAY flow: prompt only at STRIKE, zoom in, playable game, credit 1->0, inputs, game over -> world score submit (STUBBED) -> zoom out, INSERT COIN, EXIT.
const { open } = require('./lib');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const supa = [];   // live leaderboard is never touched: every supabase request is answered by this stub
  const board = [{ n: 'ETM', s: 2500000, st: 5, c: 0, done: true }, { n: 'ACE', s: 400000, st: 3, c: 0, done: false }];
  const stub = async r => { const q = r.request(); supa.push({ m: q.method(), u: q.url(), b: q.postData() });
    if (q.url().includes('/rpc/submit_score')) { const b = JSON.parse(q.postData()); board.push({ n: b.p_n, s: b.p_s, st: b.p_st, c: b.p_c, done: b.p_done }); board.sort((a, c) => c.s - a.s); return r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(board) }); };
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, supa: stub } : { supa: stub });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const on = () => page.evaluate(() => document.getElementById('playUI').classList.contains('on'));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 5; p.machines.strike.credits = 1; p.machines.ghost.credits = 1; });
  const goTo = name => page.evaluate(n => { const A = window.__arcade, c = A.playables.find(k => k.name === n), u = c.userData; window.__noAdapt = 1; A.st.fp = false;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; }, name);
  await goTo('cabinet_south_2'); await page.waitForTimeout(600); chk(!(await on()), 'no PLAY prompt at a blank cabinet');
  await goTo('ghostCabinet'); await page.waitForTimeout(600); 
  await goTo('strikeCabinet'); await page.waitForTimeout(900);
  await page.screenshot({ path: 'shots/play_prompt' + (PHONE ? '_phone' : '') + '.png' });
  const p0 = await page.evaluate(() => ({ on: document.getElementById('playUI').classList.contains('on'), txt: document.getElementById('bPlay').textContent, cr: document.getElementById('credit').textContent }));
  chk(p0.on && p0.txt === 'PLAY' && p0.cr.startsWith('CREDIT 1'), 'PLAY prompt + CREDIT 1 at STRIKE ' + JSON.stringify(p0));
  if (PHONE) await page.tap('#bPlay'); else await page.keyboard.press('Enter');
  let midShot = false; const z = []; for (let i = 0; i < 120; i++) { await page.waitForTimeout(100); if (i > 2 && z[z.length - 1].m !== 'zoomIn') break; z.push(await page.evaluate(() => { const A = window.__arcade; return { m: A.play.mode, k: A.play.t, d: A.play.target ? A.camera.position.distanceTo(A.play.target) : 9, mv: A.monkey.visible }; }));
    if (!midShot && z[z.length - 1].m === 'zoomIn' && z[z.length - 1].k > 0.45) { midShot = true; await page.screenshot({ path: 'shots/play_midzoom' + (PHONE ? '_phone' : '') + '.png' }); } }
  console.log(JSON.stringify(z.filter((_, i) => i % 4 === 0).map(s => [s.m, +s.d.toFixed(2), s.mv])));
  chk(z[0].m === 'zoomIn' && z.some(s => !s.mv), 'zoom starts, camera passes through the monkey (hidden)');
  const zi = z.filter(s => s.m === 'zoomIn'); chk(Math.min(...zi.map(s => s.d)) < 1.2 && zi[0].d > 2.5 /* sampled every 100 ms; slow software-GL frames can skip the closest point */, 'camera pushes in to the screen (' + zi[0].d.toFixed(2) + ' -> ' + Math.min(...zi.map(s => s.d)).toFixed(2) + ' m from the screen)');
  await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game').classList.contains('on'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  chk(await page.evaluate(() => window.__arcade.play.sub === 'demo' && document.getElementById('demoUI').classList.contains('on')), 'zoom lands in the DEMO');
  await page.evaluate(() => window.__arcade.play.tryPlay()); await page.waitForTimeout(600);   // tap the screen (flow details: test/credits.js)
  const g = await page.evaluate(() => { const A = window.__arcade, S = document.getElementById('game').contentWindow.STRIKE; return { scene: S.G.scene, lives: S.G.lives, credits: A.play.credits, paused: A.paused, cr: document.getElementById('credit').textContent, f0: A.stats.frames }; });
  chk(g.scene === 'play', 'playable Strike started straight into play (' + g.scene + ', lives ' + g.lives + ')');
  chk(g.credits === 0, 'credit spent 1 -> 0');
  await page.waitForTimeout(600); const f1 = await page.evaluate(() => window.__arcade.stats.frames);
  chk(g.paused && f1 === g.f0, 'arcade paused and its render loop stopped behind the game');
  // input moves the ship
  const fr = page.frameLocator('#game'); const x0 = await page.evaluate(() => document.getElementById('game').contentWindow.STRIKE.pl.x);
  if (PHONE) { const vp = page.viewportSize(); await page.mouse.move(vp.width / 2, vp.height * 0.7); await page.touchscreen.tap(vp.width / 2, vp.height * 0.7);
    await page.evaluate(() => { const w = document.getElementById('game').contentWindow, c = w.document.querySelector('canvas'), r = c.getBoundingClientRect();
      const ev = (t, x, y) => c.dispatchEvent(new w.PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true }));
      const x = r.left + r.width / 2, y = r.top + r.height * 0.7; ev('pointerdown', x, y); let i = 0; return new Promise(res => { const t = setInterval(() => { ev('pointermove', x - (++i) * 6, y); if (i > 20) { clearInterval(t); ev('pointerup', x - 120, y); res(); } }, 30); }); }); }
  else { await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await page.keyboard.up('ArrowLeft'); }
  const x1 = await page.evaluate(() => document.getElementById('game').contentWindow.STRIKE.pl.x);
  chk(x1 < x0 - 5, 'input moves the ship left (' + x0.toFixed(1) + ' -> ' + x1.toFixed(1) + ')');
  await page.screenshot({ path: 'shots/play_ingame' + (PHONE ? '_phone' : '') + '.png' });
  // game over with a world-ranking score -> name entry -> submit (stubbed) -> board -> zoom out
  await page.evaluate(() => { const w = document.getElementById('game').contentWindow; w.STRIKE.G.score = 123450; w.STRIKE.G.playT = 600 * 60; w.gameOver(); });
  await page.waitForFunction(() => document.getElementById('game').contentWindow.STRIKE.G.scene === 'entry', null, { timeout: 20000 });
  const shown = await page.evaluate(() => window.__arcade.play.goShown);
  await page.evaluate(() => document.getElementById('game').contentWindow.eval("UI.entry.c = [19, 4, 18]; saveEntry();"));   // name "TES" (obvious test name)
  await page.waitForTimeout(1500);
  const sub = supa.filter(s => s.u.includes('submit_score'));
  const net = await page.evaluate(() => document.getElementById('game').contentWindow.eval('({ st: NET.state, msg: UI.netMsg, board: (NET.board || []).map(e => e.n + ":" + e.s) })'));
  console.log('submit', JSON.stringify(sub.map(s => s.b)), JSON.stringify(net));
  chk(supa.some(s => s.m === 'GET' && s.u.includes('kfupqtafhaflzaoqtenf.supabase.co/rest/v1/scores')), 'arcade Strike reads the world leaderboard (stubbed)');
  chk(sub.length === 1 && JSON.parse(sub[0].b).p_n === 'TES' && JSON.parse(sub[0].b).p_s === 123450 && net.msg === 'WORLD SCORE SAVED', 'score submitted to world leaderboard RPC (stubbed) ' + net.msg);
  chk(shown === true, 'GAME OVER banner shown');
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 30000 });
  const back = await page.evaluate(() => ({ mode: window.__arcade.play.mode, demo: document.getElementById('game').contentWindow.__DEMO, ui: document.getElementById('demoUI').classList.contains('on') }));
  chk(back.mode === 'game' && back.demo && back.ui, 'after the board, back to the DEMO (INSERT CREDIT) ' + JSON.stringify(back));
  const subs0 = supa.filter(s => s.u.includes('submit_score')).length; await page.waitForTimeout(2500);
  chk(supa.filter(s => s.u.includes('submit_score')).length === subs0, 'demo submits nothing');
  if (PHONE) await page.tap('#bTicket'); else await page.click('#bTicket');
  await page.waitForTimeout(500);
  const c1 = await page.evaluate(() => ({ cr: document.getElementById('dCredit').textContent, sfx: window.__arcade.play.coinSfx }));
  chk(c1.cr.startsWith('CREDIT 1') && c1.sfx === 1, 'INSERT TICKET in the demo gives CREDIT 1 (coin sound)');
  // play again then EXIT early
  if (PHONE) await page.touchscreen.tap(page.viewportSize().width / 2, page.viewportSize().height * 0.4); else await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__arcade.play.sub === 'play' && document.getElementById('game').contentWindow.STRIKE.G.scene === 'play', null, { timeout: 30000 });
  if (PHONE) await page.tap('#bExit'); else { await page.keyboard.press('Escape'); }
  await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 45000 });
  const ex = await page.evaluate(() => ({ last: window.__arcade.play.lastExit, credits: window.__arcade.play.credits }));
  chk((PHONE ? ex.last === 'x' : ex.last === 'esc') && ex.credits === 0, 'EXIT (' + (PHONE ? '✕' : 'Esc') + ') zooms out, credit used ' + JSON.stringify(ex));
  await page.waitForTimeout(1500); const fr2 = await page.evaluate(() => window.__arcade.stats.frames); await page.waitForTimeout(500);
  chk((await page.evaluate(() => window.__arcade.stats.frames)) > fr2, 'arcade render loop resumes');
  const ext = requests.filter(u => !u.startsWith('http://localhost') && !u.startsWith('https://kfupqtafhaflzaoqtenf.supabase.co/'));
  const supaFromDemos = supa.length - supa.filter(s => true).length;
  console.log('requests', requests.length, 'supabase(stubbed)', supa.length, 'other off-site', ext.length, ext.slice(0, 3));
  chk(ext.length === 0, 'zero off-site requests other than the (stubbed) Strike leaderboard');
  const demoNet = await page.evaluate(() => { const A = window.__arcade; return [A.demo.w, A.ghostDemo.w].map(w => String(w.fetch).includes('network disabled')); });
  chk(demoNet.every(Boolean), 'cabinet-screen demos remain network-free (fetch disabled)');
  chk(errors.filter(e => !/supabase|ERR_FAILED/i.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
