// Cabinet flow: PLAY (always) -> zoom into the game's DEMO with INSERT CREDIT -> INSERT 5 TICKETS (5 🎟 = 1 credit) -> tap screen plays
// -> game over -> back to the DEMO -> ✕ / Esc zooms out. Machines start at CREDIT 0, a new player has 1 ticket. Demo: no scores, no tickets.
// Usage: node test/credits.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const posts = [];
  const supa = r => { const q = r.request(); if (q.method() !== 'GET') posts.push(q.url()); return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); };
  const o = await open(PH ? { phone: true, supa } : { supa }); const { page, errors, requests } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const goTo = name => page.evaluate(n => { const A = window.__arcade, c = A.playables.find(k => k.name === n), u = c.userData; window.__noAdapt = 1; A.st.fp = false;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; }, name);
  const S = () => page.evaluate(() => { const P = window.__arcade.play, f = document.getElementById('game'), w = f && f.contentWindow, $ = id => document.getElementById(id);
    return { mode: P.mode, sub: P.sub, s: P.machines.strike.credits, g: P.machines.ghost.credits, sg: P.machines.strike.games, gg: P.machines.ghost.games,
      t: P.tickets.total, ls: localStorage.getItem('neonarcade.tickets'), badge: $('tixN').textContent, need: P.need, coin: P.coinSfx, frame: !!f, demoW: !!(w && w.__DEMO),
      demoOn: $('demoUI').classList.contains('on'), ins: $('dInsert').textContent, dcr: $('dCredit').textContent, bt: $('bTicket').textContent, returns: P.demoReturns,
      txt: $('bPlay').textContent, cr: $('credit').textContent, on: $('playUI').classList.contains('on') }; });
  const tapScreen = async () => { const v = page.viewportSize(), x = v.width / 2, y = v.height * 0.4; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(250); };
  const tapEl = async sel => { const b = await page.locator(sel).boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(450); };
  const playBtn = async () => { if (PH) await tapEl('#bPlay'); else await page.keyboard.press('Enter'); };
  let s = await S(); chk(s.t === 1 && s.ls === '1' && s.badge === '1' && s.s === 0 && s.g === 0, 'fresh visit: 1 ticket, STRIKE and GHOST at CREDIT 0');
  for (const [cab, key] of [['strikeCabinet', 'strike'], ['ghostCabinet', 'ghost']]) {
    const k1 = key === 'strike' ? 's' : 'g', kg = key === 'strike' ? 'sg' : 'gg', N = key.toUpperCase();
    await goTo(cab); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(400); s = await S();
    chk(s.on && s.txt === 'PLAY' && /^5 TICKETS TO PLAY  ·  CREDIT 0 /.test(s.cr), N + ': room prompt is PLAY at CREDIT 0 "' + s.cr + '"');
    const g0 = s[kg];
    await playBtn(); await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game').classList.contains('on'), null, { timeout: 90000 });
    await page.waitForTimeout(2500); s = await S();
    chk(s.sub === 'demo' && s.demoOn && s.demoW && s.ins === 'INSERT CREDIT' && s.dcr.startsWith('CREDIT 0') && s[kg] === g0, N + ': zoomed in to the DEMO with INSERT CREDIT / CREDIT 0, no game started');
    const live = await page.evaluate(k => { const w = document.getElementById('game').contentWindow; return k === 'strike' ? w.STRIKE.G.scene : w.__ghost.G.state; }, key);
    chk(live === 'play', N + ': the demo is the real game on autoplay (' + live + ')');
    await page.screenshot({ path: 'shots/demo_' + key + sfx + '.png' });
    // demo gives no tickets
    const ta = await page.evaluate(() => { const w = document.getElementById('game').contentWindow; w.TicketArt.collect('x'); return window.__arcade.play.award(1); });
    s = await S(); chk(!ta && s.t === (key === 'strike' ? 1 : s.t), N + ': the demo never awards tickets');
    // tap / Enter at 0 credits: nothing starts
    const n0 = s.need; await tapScreen(); if (!PH) { await page.keyboard.press('Enter'); await page.keyboard.press('Space'); } await page.waitForTimeout(200); s = await S();
    chk(s.sub === 'demo' && s[k1] === 0 && s[kg] === g0 && s.need > n0 && s.demoW, N + ': tapping the screen at CREDIT 0 does not start (INSERT CREDIT shakes)');
    // insert ticket (button tap is not a screen tap)
    const t0 = s.t, c0 = s.coin;
    if (t0 < 5) await page.evaluate(() => { window.__arcade.play.tickets.total = 5; });
    await tapEl('#bTicket'); s = await S();
    chk(s.sub === 'demo' && s[k1] === 1 && s.t === 0 && s.ls === '0' && s.coin === c0 + 1 && s[kg] === g0 && s.dcr.startsWith('CREDIT 1'), N + ': INSERT 5 TICKETS: 5 🎟 -> CREDIT 1, coin sound, still the demo (not a screen tap)');
    if (key === 'strike') await page.screenshot({ path: 'shots/insert_ticket' + sfx + '.png' });
    await tapEl('#bTicket'); s = await S();
    chk(s.bt === 'NEED 5 TICKETS' && s[k1] === 1 && s.t === 0 && s.sub === 'demo', N + ': at 0 tickets the button shows NEED 5 TICKETS and adds nothing');
    if (key === 'strike') await page.screenshot({ path: 'shots/need_ticket' + sfx + '.png' });
    // tap the screen: real game, uses the credit
    await tapScreen(); await page.waitForTimeout(400); s = await S();
    chk(s.sub === 'play' && !s.demoOn && !s.demoW && s[k1] === 0 && s[kg] === g0 + 1, N + ': tapping the screen with CREDIT 1 starts a real game (CREDIT 1 -> 0)');
    // collect a ticket in the game
    if (key === 'strike') await page.evaluate(() => { const w = document.getElementById('game').contentWindow; w.eval('__TK.spawn(); const t = __TK.t; t.x0 = pl.x; t.amp = 0; t.y = pl.y; pl.entering = 0; updPlay();'); });
    else await page.evaluate(() => { const w = document.getElementById('game').contentWindow, f = w.__TK.force(); w.__TK.stepOn(f[0], f[1]); });
    await page.waitForTimeout(300); s = await S(); chk(s.t === 5 && s.ls === '5', N + ': collecting a ticket in the game pays 5 (5 / old 1-ticket price): 0 -> 5');
    // game over -> back to the demo
    if (key === 'strike') await page.evaluate(() => { const w = document.getElementById('game').contentWindow; w.eval('G.score = 0; gameOver();'); });
    else await page.evaluate(() => { const g = document.getElementById('game').contentWindow.__ghost; g.G.state = 'over'; g.G.overT = 0; });
    for (let i = 0; i < 60; i++) { s = await S(); if (s.sub === 'demo') break;
      if (key === 'strike') await page.evaluate(() => { const w = document.getElementById('game').contentWindow; if (w.STRIKE.G.scene === 'entry') w.eval('saveEntry()'); });
      await page.waitForTimeout(500); }
    chk(s.sub === 'demo' && s.demoOn && s.demoW && s.mode === 'game' && s.ins === 'INSERT CREDIT', N + ': game over returns to the DEMO with INSERT CREDIT (not the room)');
    const p0 = posts.length; await page.waitForTimeout(3000);
    chk(posts.length === p0 && (await S()).sub === 'demo', N + ': the demo posts nothing to the leaderboard');
    // the collected ticket buys another credit, then ✕ (or Esc) zooms out from the demo
    await tapEl('#bTicket'); s = await S(); chk(s[k1] === 1 && s.t === 0, N + ': the collected ticket (5) buys another credit');
    if (key === 'strike') { await tapEl('#bExit'); } else { await tapScreen(); s = await S(); chk(s.sub === 'play', 'GHOST: second game started'); if (PH) await tapEl('#bExit'); else await page.keyboard.press('Escape'); }
    await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 45000 }); s = await S();
    chk(s.mode === 'walk' && !s.demoOn, N + ': ' + (key === 'strike' ? '✕ from the demo' : (PH ? '✕' : 'Esc') + ' mid-game') + ' zooms back out to the monkey');
    await page.evaluate(() => { window.__arcade.monkey.position.set(0, 0, 0); }); await page.waitForTimeout(500);
  }
  await page.evaluate(() => { localStorage.setItem('neonarcade.tickets', '0'); window.__noUnloadWarn = 1; });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  let r = await S(); chk(r.t === 0 && r.ls === '0' && r.s === 0 && r.g === 0, 'autosave (45261ce): a reload keeps the saved 0 tickets (the 1-ticket gift is only for a brand-new save), credits 0 ' + JSON.stringify(r));
  await page.addInitScript(() => { window.__sessSeed = { 'neonarcade.tickets': '4' }; }); await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  r = await S(); chk(r.t === 4 && r.s === 0 && r.g === 0, 'a loaded total (4) is used as is; credits start at 0 on every load');
  chk(requests.filter(u => !u.startsWith('http://localhost') && !/supabase\.co/.test(u)).length === 0, 'no off-site requests (Strike board stubbed)');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})();
