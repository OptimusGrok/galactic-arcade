// Pool win reward (Dave): winning a pool game pays +10 tickets once per won game; every game (open or Play again / Menu) costs 5;
// too few tickets blocks Play again; a loss, a quit or a reload pay nothing; both tables. Games end through a real shot (game physics + judge) potting the 8: legal = You win, early = CPU wins.
const { open } = require('./lib');
(async () => { let o; for (let i = 0; ; i++) { try { o = await open({ phone: true, w: 412, h: 915 }); break; } catch (e) { if (i > 3) throw e; console.log('retry open'); } }
  const { page, errors } = o; let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => window.__pool && window.__shop && window.__arcade && window.__arcade.play && window.__arcade.play.tickets, null, { timeout: 60000 });
  const tix = () => ev(() => ({ t: window.__arcade.play.tickets.total, ls: localStorage.getItem('neonarcade.tickets'), hud: document.getElementById('tixN').textContent }));
  const setT = n => ev(n => { const t = window.__arcade.play.tickets; t.total = n; localStorage.setItem('neonarcade.tickets', String(n)); window.__neonSync && window.__neonSync(); }, n);
  const openT = async i => { await ev(i => window.__pool.openPool(i), i);
    return page.waitForFunction(() => { try { const w = window.__pool.frame.contentWindow; return w.document.readyState === 'complete' && w.POOL && w.__ready; } catch (e) { return false; } }, null, { timeout: 90000 }).then(() => true).catch(() => false); };
  // a real shot through the game's own physics + judge(): only the cue + 8 (+ one solid for a loss) on the table, You on solids, 8 lined up on a corner pocket
  const end = async who => { const r = await ev(who => { const w = window.__pool.frame.contentWindow, P = w.POOL, g = P.game; g.over = false; g.state = 'aim'; g.brk = false; g.turn = 0; g.bih = false; g.groups = ['solids', 'stripes'];
      for (let n = 1; n < 16; n++) if (n !== 8) P.set(n, -1.0, -0.4 + n * 0.05, false);
      if (who === 1) P.set(1, -1.0, 0.0, true);   // a solid still on the table: potting the 8 now loses
      const W = 1.27, H = 0.635, px = W - 0.02, pz = H - 0.02, bx = W - 0.3, bz = H - 0.25, d = Math.hypot(px - bx, pz - bz), ux = (px - bx) / d, uz = (pz - bz) / d;
      P.set(8, bx, bz, true); P.set(0, bx - ux * 0.35, bz - uz * 0.35, true); const a = Math.atan2(uz, ux); P.shot(a, 0.12, 0, -0.6); P.settle(); return g.state; }, who);
    await page.waitForFunction(() => window.__pool.frame.contentWindow.POOL.game.state !== 'moving', null, { timeout: 30000 }).catch(() => {});
    return ev(() => { const g = window.__pool.frame.contentWindow.POOL.game; return { over: g.over, state: g.state }; }); };
  // Play again = the game's own button (charged 5 through shop.js); returns whether a new game started
  const again = () => ev(() => { const w = window.__pool.frame.contentWindow, g = w.POOL.game; w.document.getElementById('bagain').click(); return { state: g.state, over: g.over, msg: w.document.getElementById('endmsg').textContent }; });
  const winSig = () => ev(() => window.__poolWin(window.__pool.frame.contentWindow));   // the frame's win call repeated for the same game
  for (const i of [0, 1]) { const T = 'table ' + (i + 1) + ': ';
    await setT(12); chk(await openT(i), T + 'pool opens');
    let a = await tix(); chk(a.t === 7 && a.ls === '7', T + '5-ticket cost charged on open (12 -> 7)', a);
    const L = await end(1); chk(L.over, T + 'early 8 ends the game (loss)', L); await page.waitForTimeout(400); a = await tix(); chk(a.t === 7, T + 'a loss (CPU wins) adds nothing', a);
    let g = await again(); a = await tix(); chk(g.state === 'aim' && !g.over && a.t === 2 && a.ls === '2' && a.hud === '2', T + 'Play again charges 5 (7 -> 2) and starts a game', { g, a });
    const Wn = await end(0); chk(Wn.over, T + 'legal 8 ends the game (win)', Wn); await page.waitForTimeout(400); a = await tix();
    const msg = await ev(() => { const m = document.getElementById('poolWin'); return m && m.style.display !== 'none' ? m.textContent : ''; });
    chk(a.t === 12 && a.ls === '12' && a.hud === '12', T + 'a win adds +10 (2 -> 12), storage + HUD', a);
    chk(/\+10/.test(msg), T + '"+10 tickets" message shown', msg);
    if (i === 0) await page.screenshot({ path: '/workspace/galactic-shop/shots/pool_win.png' });
    chk(!(await winSig()) && (await tix()).t === 12, T + 'the same win signalled again pays nothing more');
    g = await again(); a = await tix(); chk(g.state === 'aim' && a.t === 7, T + 'Play again after a win charges 5 (12 -> 7)', { g, a });
    await end(0); await page.waitForTimeout(400); a = await tix(); chk(a.t === 17 && a.ls === '17', T + 'second win in a new paid game pays another +10 (7 -> 17)', a);
    g = await again(); a = await tix(); chk(a.t === 12, T + 'Play again charges 5 (17 -> 12)', a);
    await end(1); await page.waitForTimeout(300); g = await again(); await end(1); await page.waitForTimeout(300); a = await tix(); chk(a.t === 7, T + 'two losses pay nothing, second Play again charged (12 -> 7)', a);
    g = await again(); await end(1); await page.waitForTimeout(300); a = await tix(); chk(a.t === 2, T + 'another Play again (7 -> 2)', a);
    g = await again(); a = await tix(); chk(g.over && g.state === 'over' && /Need 5 tickets/.test(g.msg) && a.t === 2 && a.ls === '2', T + 'Play again with 2 tickets is blocked: "Need 5 tickets", no free game, nothing charged', { g, a });
    const viaMenu = await ev(() => { const w = window.__pool.frame.contentWindow; w.document.getElementById('bmenu2').click(); w.document.getElementById('bcpu').click(); return w.POOL.game.state; });
    chk(viaMenu === 'menu' && (await tix()).t === 2, T + 'Menu -> new game with 2 tickets is blocked too', viaMenu);
    chk(!(await ev(() => window.__poolWin(window))) && !(await ev(() => window.__poolAgain(window)).ok), T + 'calls not from the pool frame are refused');
    await ev(() => window.__pool.closePool()); await page.waitForTimeout(300);
    chk(!(await ev(() => window.__poolWin(null))) && (await tix()).t === 2, T + 'nothing after quitting');
  }
  // quit with no win, and reload: nothing paid
  await setT(10); await openT(0); await ev(() => window.__pool.closePool()); let a = await tix(); chk(a.t === 5, 'quit without a win: only the 5 cost', a);
  await page.reload({ timeout: 120000 }); await page.waitForFunction(() => window.__pool && window.__arcade && window.__arcade.play && window.__arcade.play.tickets, null, { timeout: 60000 }); await page.waitForTimeout(1500);
  a = await tix(); chk(a.t === 5 && a.ls === '5', 'reload pays nothing', a);
  chk(errors.length === 0, 'no page errors', errors); console.log(ok ? 'ALL OK' : 'SOME FAIL'); await o.close(); process.exit(ok ? 0 : 1); })();
