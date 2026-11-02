// Enlarged ticket view: tap/click the HUD counter -> big gold monkey ticket centred, count under it; tap/click/Esc/✕ closes.
// Pauses the arcade or game while open, never moves the monkey, spends credits or starts a game. node test/ticketview.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', SUF = PH ? '_phone' : '';
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().url().includes('submit') ? 'true' : '[]' });
  const o = await open({ supa, phone: PH }); const { page, errors, requests } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.addInitScript(() => { window.__sessSeed = { 'neonarcade.tickets': '7' }; }); await page.reload();
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  const cdp = PH ? await page.context().newCDPSession(page) : null;
  const tapAt = async (x, y) => { if (PH) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await page.waitForTimeout(60); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } else await page.mouse.click(x, y); };
  const tapEl = async sel => { const b = await page.locator(sel).boundingBox(); await tapAt(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(400); };
  const S = () => page.evaluate(() => { const A = window.__arcade, p = A.play, v = document.getElementById('tview'), c0 = document.getElementById('tvWrap').getBoundingClientRect(), cvw = parseFloat(document.getElementById('tvCv').style.width) || 0, c = { width: cvw, height: c0.height, left: c0.left + c0.width / 2 - cvw / 2, top: c0.top };
    return { open: p.view.open, shown: v.classList.contains('on') && getComputedStyle(v).display !== 'none', paused: A.paused, frames: A.stats.frames, pos: [A.monkey.position.x, A.monkey.position.z].map(n => +n.toFixed(4)),
      mode: p.mode, cs: p.machines.strike.credits, cg: p.machines.ghost.credits, gs: p.machines.strike.games + p.machines.ghost.games, coin: p.coinSfx, cw: c.width, ch: c.height, cx: c.left + c.width / 2, cy: c.top + c.height / 2,
      vw: innerWidth, vh: innerHeight, count: document.getElementById('tvCount').textContent, badge: document.getElementById('tixN').textContent, joy: getComputedStyle(document.getElementById('joy')).display }; });
  // ---- in the arcade, standing at STRIKE (prompt showing)
  await page.evaluate(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; });
  await page.waitForTimeout(1200);
  const s0 = await S(); chk(s0.badge === '7', 'HUD counter shows 7');
  await tapEl('#tix'); const s1 = await S();
  const side = Math.min(s1.vw, s1.vh), frac = s1.cw / side;
  chk(s1.open && s1.shown, 'tapping the counter opens the enlarged ticket');
  chk(frac >= 0.58 && frac <= 0.72 && Math.abs(s1.cx - s1.vw / 2) < s1.vw * 0.03 && Math.abs(s1.cy - s1.vh / 2) < s1.vh * 0.12, 'big ticket centred, ' + (frac * 100).toFixed(0) + '% of the shorter side');
  chk(s1.count === '🎟 7 TICKETS', 'count under the ticket: ' + s1.count);
  chk(s1.paused, 'arcade paused while open');
  chk(!PH || s1.joy !== 'block', 'phone: touch on the counter does not trigger the joystick');
  await page.waitForTimeout(700); await page.screenshot({ path: 'shots/ticket_view' + SUF + '.png' });
  if (!PH) { await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW'); await page.keyboard.press('Enter'); await page.keyboard.press('Space'); await page.keyboard.press('KeyE'); }
  else await tapEl('#tvWrap');   // phone: tapping closes; check the state just before
  const s2 = await S();
  chk(JSON.stringify(s2.pos) === JSON.stringify(s0.pos) && s2.cs === s0.cs && s2.gs === s0.gs && s2.coin === s0.coin && s2.mode === 'walk', 'opening (and keys / taps while open) never moves the monkey, spends credits, inserts coins or starts a game');
  if (!PH) { chk(s2.open, 'keys other than Esc do not close it'); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  const s3 = await S(); await page.waitForTimeout(500); const s4 = await S();
  chk(!s3.open && !s3.shown && !s3.paused && s4.frames > s3.frames && s4.mode === 'walk', (PH ? 'tap' : 'Esc') + ' closes it and the arcade resumes cleanly (frames ' + s3.frames + ' -> ' + s4.frames + ')');
  chk(JSON.stringify(s4.pos) === JSON.stringify(s0.pos), 'monkey still in place after closing');
  await tapEl('#tix'); await tapEl('#tvX'); chk(!(await S()).open, '✕ closes it');
  if (!PH) { await tapEl('#tix'); const so = (await S()).open; await page.mouse.click(20, 300); await page.waitForTimeout(300); chk(so && !(await S()).open, 'click anywhere closes it (open=' + so + ')'); }
  // ---- during play: STRIKE
  const start = async () => { if (PH) await tapEl('#bPlay'); else await page.keyboard.press('Enter');   // PLAY -> demo -> INSERT TICKET -> tap the screen
    await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game').classList.contains('on'), null, { timeout: 30000 }); await page.waitForTimeout(600);
    await tapEl('#bTicket'); await page.waitForTimeout(300); const v = page.viewportSize(); if (PH) await page.touchscreen.tap(v.width / 2, v.height * 0.4); else await page.mouse.click(v.width / 2, v.height * 0.4); await page.waitForTimeout(1500); };
  await start();
  const gw = f => page.evaluate(`(() => { const w = document.getElementById('game').contentWindow; return (${f})(w); })()`);
  await tapEl('#tix'); const g1 = await S(); const sc1 = await gw(w => w.STRIKE.G.scene);
  chk(g1.open && sc1 === 'pause', 'STRIKE: counter opens the view during play and the game is paused (' + sc1 + ')');
  await page.screenshot({ path: 'shots/ticket_view_ingame' + SUF + '.png' });
  if (!PH) { await page.evaluate(() => document.getElementById('game').contentWindow.focus()); await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  else await tapEl('#tview');
  const g2 = await S(); const sc2 = await gw(w => w.STRIKE.G.scene);
  chk(!g2.open && g2.mode === 'game' && sc2 === 'play', 'STRIKE: ' + (PH ? 'tap' : 'Esc') + ' closes the view first, game resumes, still in the game');
  if (!PH) { await page.keyboard.press('Escape'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 20000 }); chk(true, 'STRIKE: second Esc quits the game'); }
  else { await tapEl('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 20000 }); }
  // ---- during play: GHOST 256
  await page.evaluate(() => { const A = window.__arcade, u = A.ghostCab.userData; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; });
  await page.waitForTimeout(1200); await start();
  await tapEl('#tix'); const h1 = await S(); const st1 = await gw(w => w.__ghost.G.state);
  chk(h1.open && st1 === 'pause', 'GHOST: view opens during play and the game is paused (' + st1 + ')');
  await tapEl('#tvX'); const st2 = await gw(w => w.__ghost.G.state); const h2 = await S();
  chk(!h2.open && st2 === 'play' && h2.mode === 'game', 'GHOST: ✕ closes the view and the game resumes');
  // ---- hi-res close-up of the new ticket
  if (!PH) { await page.evaluate(() => { const c = document.createElement('canvas'); c.id = 'closeup'; c.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#140c04'; document.body.appendChild(c); TicketArt.toCanvas(c, 900, true); });
    await page.locator('#closeup').screenshot({ path: 'shots/ticket_closeup.png' });
    await page.evaluate(() => { const c = document.getElementById('closeup'); TicketArt.toCanvas(c, 300, false); c.style.width = '600px'; c.style.height = '396px'; });   // small art, 2x for inspection
    await page.locator('#closeup').screenshot({ path: 'shots/ticket_small_art.png' }); }
  chk(requests.filter(u => !u.startsWith('http://localhost') && !/supabase\.co/.test(u)).length === 0, 'no off-site requests (leaderboard stubbed)');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})();
