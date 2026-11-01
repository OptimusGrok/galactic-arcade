// Tickets are collected inside the games (gold monkey tickets, +1 each), never paid for time. Persisted in localStorage.
// node test/tickets.js [phone]
const { open } = require('./lib'); const fs = require('fs');
const PH = process.argv[2] === 'phone', SUF = PH ? '_phone' : '';
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().url().includes('submit') ? 'true' : '[]' });
  let o = await open({ supa, phone: PH }); let { page, errors, requests } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const goTo = name => page.evaluate(n => { const A = window.__arcade, c = A.playables.find(k => k.name === n), u = c.userData; window.__noAdapt = 1; A.st.fp = false;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; }, name);
  const T = () => page.evaluate(() => ({ total: window.__arcade.play.tickets.total, badge: document.getElementById('tixN').textContent, ls: localStorage.getItem('neonarcade.tickets'), pops: [...document.querySelectorAll('.tpop')].map(p => p.textContent) }));
  const W = f => page.evaluate(`(() => { const w = document.getElementById('game').contentWindow; return w.eval('(' + ${JSON.stringify(String(f))} + ')(window)'); })()`);
  const W0 = f => page.evaluate(`(() => { const w = document.getElementById('game').contentWindow; return (${f})(w); })()`);
  const t0 = await T(); chk(t0.total === 1 && t0.badge.trim() === '1', 'a new player starts with 1 ticket (badge 1)');
  chk(await page.evaluate(() => typeof window.__arcade.play.ticketTick === 'undefined'), 'time-based payout code removed (no ticketTick / timer)');
  const press = async () => { if (PH) await page.tap('#bPlay'); else await page.keyboard.press('Enter'); await page.waitForTimeout(900); };
  for (const cab of ['strikeCabinet', 'ghostCabinet']) {
    await goTo(cab); await page.waitForTimeout(900);
    for (let k = 0; k < 4; k++) { await press(); if (await page.evaluate(() => window.__arcade.play.mode !== 'walk')) break; await goTo(cab); await page.waitForTimeout(600); }
    await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game').classList.contains('on'), null, { timeout: 30000 });
    for (let k = 0; k < 3 && !(await page.evaluate(w => document.getElementById('game').src.includes(w), cab === 'strikeCabinet' ? 'strike-play' : 'ghost-play')); k++) { await page.evaluate(() => window.__arcade.play.exit('x')); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }); await goTo(cab); await page.waitForTimeout(900); await press(); await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game').classList.contains('on'), null, { timeout: 30000 }); }
    chk(await page.evaluate(w => document.getElementById('game').src.includes(w), cab === 'strikeCabinet' ? 'strike-play' : 'ghost-play'), cab + ': launched the right game'); await page.waitForTimeout(300);
    await page.evaluate(() => { const p = window.__arcade.play; if (p.tickets.total < 1) p.tickets.total = 1; p.insertTicket(); }); await page.waitForTimeout(450);   // demo: INSERT TICKET, then tap the screen
    await page.evaluate(() => window.__arcade.play.tryPlay());
    chk(await page.evaluate(() => window.__arcade.play.sub === 'play'), cab + ': ticket -> credit -> real game');
    const base = (await T()).total;
    if (cab === 'ghostCabinet') await page.waitForFunction(() => { const f = document.getElementById('game'); return f && f.contentWindow && f.contentWindow.__ghost && f.contentWindow.__ghost.G; }, null, { timeout: 45000 }).catch(async e => { console.log('ghostwait', JSON.stringify(await page.evaluate(() => { const f = document.getElementById('game'); const p = window.__arcade.play; let g; try { g = f && Object.keys(f.contentWindow.__ghost || {}).length + ' ' + f.contentWindow.location.href + ' ' + f.contentWindow.document.readyState; } catch (x) { g = 'err ' + x; } return { m: p.mode, sub: p.sub, ex: p.lastExit, g, ifr: [...document.querySelectorAll('iframe')].map(i => i.id + ':' + i.src) }; }))); throw e; });
    if (cab === 'ghostCabinet') await W(w => { const G = w.__ghost.G; w.__keepInv = setInterval(() => { G.lives = 5; if (G.state === 'play') G.inv = 9; }, 100); return 1; });   // stay alive for the test
    await page.waitForTimeout(1200);
    // 4 s of real play earns nothing by itself
    await page.waitForTimeout(4000); chk((await T()).total === base, cab + ': 4 s of play pays no time-based tickets');
    if (cab === 'strikeCabinet') {
      // fast-forward ~40 s of play (invulnerable): a ticket spawns on its own ~every 25-35 s; total only moves if the ship actually touched it
      const ff = await W(w => { G.god = true; const TK = w.__TK, n0 = TK.spawned, nx = TK.next; let first = -1;
        for (let i = 0; i < 2400 && G.scene === 'play'; i++) { updPlay(); if (first < 0 && TK.spawned > n0) { first = i; var nextAfter = TK.next; } } return { first, nx, nextAfter, spawned: TK.spawned - n0, got: TK.got, missed: TK.missed }; });
      const a = await T();
      chk(ff.spawned >= 1 && ff.first === ff.nx - 1 && ff.nextAfter >= 1500 && ff.nextAfter <= 2100, cab + ': ticket spawned on its own when the 25-35 s play timer ran out; next one scheduled in ' + (ff.nextAfter / 60).toFixed(1) + ' s ' + JSON.stringify(ff));
      chk(a.total === base + ff.got, cab + ': total moved only by collected tickets (' + a.total + ')');
      const b0 = a.total;
      await W(w => { w.__TK.spawn(); const t = w.__TK.t; t.x0 = W / 2; t.y = H * 0.42; t.amp = 18; t.vy = 0.05; return 1; });
      await page.waitForTimeout(350); await page.screenshot({ path: 'shots/ticket_strike' + SUF + '.png' });
      const vis = await W(w => !!w.__TK.t); chk(vis, cab + ': gold monkey ticket on screen (shots/ticket_strike' + SUF + '.png)');
      // enemy bullets do not destroy it: cover it in bullets for a few frames
      const sb = await W(w => { const t = w.__TK.t; for (let i = 0; i < 20; i++) { const b = ebul.get(); if (!b) break; Object.assign(b, { x: t.x, y: t.y, vx: 0, vy: 0, ax: 0, ay: 0, life: 0, home: 0 }); } for (let i = 0; i < 3; i++) updPlay(); return !!w.__TK.t; });
      chk(sb, cab + ': enemy bullets do not destroy the ticket');
      await W(w => { const t = w.__TK.t; t.x0 = pl.x; t.amp = 0; t.y = pl.y; updPlay(); return 1; });
      const c = await T(); chk(c.total === b0 + 1 && c.ls === String(b0 + 1) && c.pops.includes('+1 🎟'), cab + ': ship flies into ticket: +1 (' + b0 + ' -> ' + c.total + '), "+1 🎟" pop, saved');
      // a missed ticket leaves after ~7 s
      const miss = await W(w => { w.__TK.spawn(); const t = w.__TK.t; t.x0 = 20; t.amp = 0; t.vy = 0; pl.x = W - 20; let n = 0; while (w.__TK.t && n < 900) { updPlay(); pl.x = W - 20; n++; } return n; });
      chk(miss >= 380 && miss <= 460, cab + ': missed ticket despawns after ' + (miss / 60).toFixed(1) + ' s');
      await W(w => { G.god = false; return 1; }); await page.click('#bExit');   // quit early with ✕
    } else {
      if (0) console.log('dbg', JSON.stringify(await page.evaluate(() => ({ m: window.__arcade.play.mode, ex: window.__arcade.play.lastExit, f: !!document.getElementById('game') }))));
      const b0 = (await T()).total;
      const pl = await W(w => { const TK = w.__TK; const g0 = w.__ghost.M.gens; w.__ghost.M.gens = Math.max(5, g0); TK.acc = 1e9; const n0 = TK.placed;
        TK.area(w.__ghost.P.tx - 18, w.__ghost.P.ty - 30, w.__ghost.P.tx + 18, w.__ghost.P.ty + 30); w.__ghost.M.gens = g0; const o = TK.last;
        const deg = ['1,0', '-1,0', '0,1', '0,-1'].filter(d => { const [dx, dy] = d.split(',').map(Number); return w.__ghost.M.open(o.x + dx, o.y + dy); }).length;
        return { kind: TK.lastKind, placed: TK.placed - n0, dist: Math.abs(o.x - w.__ghost.P.tx) + Math.abs(o.y - w.__ghost.P.ty), deg }; });
      chk(pl.placed === 1 && pl.dist >= 10 && pl.kind === 'corner' && pl.deg <= 2, cab + ': maze ticket placed in a far corner / dead end of new maze, away from the ghost ' + JSON.stringify(pl));
      const f = await W(w => { clearInterval(w.__keepInv); w.__ghost.G.inv = 0; for (const e of w.__ghost.E) e.state = 0; return w.__TK.force(); }); await page.waitForTimeout(400); await page.screenshot({ path: 'shots/ticket_ghost' + SUF + '.png' });
      chk(!!f, cab + ': gold monkey ticket in the maze (shots/ticket_ghost' + SUF + '.png)');
      const got = await W('w => { const [x, y] = ' + JSON.stringify(f) + '; return w.__TK.stepOn(x, y); }');
      const c = await T(); chk(got === 0 && c.total === b0 + 1 && c.ls === String(b0 + 1) && c.pops.includes('+1 🎟'), cab + ': ghost eats ticket: +1 (' + b0 + ' -> ' + c.total + '), "+1 🎟" pop, saved');
      const ex = await W(w => { const n = w.__TK.expired; w.__TK.tick(31); return w.__TK.expired - n; });
      chk(ex >= 1 && (await T()).total === b0 + 1, cab + ': uncollected maze tickets time out (30 s), no payout');
      await W(w => { const g = w.__ghost.G; g.state = 'over'; g.overT = 0; return 1; });
    }
    const vis = await page.evaluate(() => { const t = document.getElementById('tix').getBoundingClientRect(), x = document.getElementById('bExit').getBoundingClientRect(); const cs = getComputedStyle(document.getElementById('tix'));
      return { on: cs.display !== 'none' && +cs.zIndex > 20, overlapX: !(t.bottom < x.top || t.top > x.bottom || t.right < x.left || t.left > x.right) }; });
    chk(vis.on && !vis.overlapX, cab + ': ticket badge visible during play, clear of ✕');
    await page.waitForFunction(() => window.__arcade.play.sub === 'demo' || window.__arcade.play.mode !== 'game', null, { timeout: 40000 });   // game over -> back to the demo (STRIKE already left via ✕)
    if (await page.evaluate(() => window.__arcade.play.sub === 'demo')) { chk(await page.evaluate(() => window.__neonTicket(1) === false), cab + ': no ticket can be awarded in the demo'); await page.evaluate(() => window.__arcade.play.exit('x')); }
    await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 40000 }).catch(async e => { console.log('stuck', JSON.stringify(await page.evaluate(() => { const p = window.__arcade.play; return { m: p.mode, ex: p.lastExit, t: p.t, paused: window.__arcade.paused }; }))); throw e; });
    chk(await page.evaluate(() => window.__neonTicket(1, 'strike')) === false, cab + ': no ticket can be awarded outside a game');
  }
  const before = await T(); await page.screenshot({ path: 'shots/tickets_badge' + SUF + '.png' });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  const after = await T(); chk(before.total === after.total && after.total >= 1 && after.badge.trim() === String(after.total), 'total persists after reload (' + before.total + ' -> ' + after.total + ')');
  const sa = fs.readFileSync('/workspace/strike/strike.html', 'utf8'), ga = fs.readFileSync('/workspace/ghost256/index.html', 'utf8');
  chk(!/TicketArt|__TK|neonTicket/.test(sa + ga), 'standalone Strike / Ghost 256 sources have no ticket code');
  const ext = requests.filter(u => !u.startsWith('http://localhost') && !u.startsWith('https://kfupqtafhaflzaoqtenf.supabase.co/'));
  chk(ext.length === 0, 'no off-site requests (leaderboard stubbed)');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})();
