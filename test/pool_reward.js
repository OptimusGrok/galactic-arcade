// Pool win reward (Dave): winning a pool game pays +10 tickets exactly once per paid game (5 tickets each, unchanged); a loss, Play again,
// a quit or a reload pay nothing; both tables. Games end through a real shot (game physics + judge) potting the 8: legal = You win, early = CPU wins.
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
  const again = () => ev(() => { const w = window.__pool.frame.contentWindow; w.POOL.newGame(); });
  for (const i of [0, 1]) {
    await setT(12); chk(await openT(i), 'table ' + (i + 1) + ': pool opens');
    let a = await tix(); chk(a.t === 7 && a.ls === '7', 'table ' + (i + 1) + ': 5-ticket cost charged (12 -> 7)', a);
    const L = await end(1); chk(L.over, 'table ' + (i + 1) + ': early 8 ends the game (loss)', L); await page.waitForTimeout(400); a = await tix(); chk(a.t === 7 && a.ls === '7', 'table ' + (i + 1) + ': a loss (CPU wins) adds nothing', a);
    await again(); const Wn = await end(0); chk(Wn.over, 'table ' + (i + 1) + ': legal 8 ends the game (win)', Wn); await page.waitForTimeout(400); a = await tix();
    const msg = await ev(() => { const m = document.getElementById('poolWin'); return m && m.style.display !== 'none' ? m.textContent : ''; });
    chk(a.t === 17 && a.ls === '17' && a.hud === '17', 'table ' + (i + 1) + ': a win adds +10 (7 -> 17), storage + HUD', a);
    chk(/\+10/.test(msg), 'table ' + (i + 1) + ': "+10 tickets" message shown', msg);
    if (i === 0) await page.screenshot({ path: '/workspace/galactic-shop/shots/pool_win.png' });
    await again(); await end(0); await page.waitForTimeout(400); a = await tix();
    chk(a.t === 17, 'table ' + (i + 1) + ': repeat win signal / Play-again win in the same paid game pays nothing more', a);
    const forged = await ev(() => window.__poolWin(window)); chk(!forged, 'table ' + (i + 1) + ': a call not from the pool frame is refused');
    await ev(() => window.__pool.closePool()); await page.waitForTimeout(300);
    chk(!(await ev(() => window.__poolWin(null))) && (await tix()).t === 17, 'table ' + (i + 1) + ': nothing after quitting');
  }
  // quit with no win, and reload: nothing paid
  await setT(10); await openT(0); await ev(() => window.__pool.closePool()); let a = await tix(); chk(a.t === 5, 'quit without a win: only the 5 cost', a);
  await page.reload({ timeout: 120000 }); await page.waitForFunction(() => window.__pool && window.__arcade && window.__arcade.play && window.__arcade.play.tickets, null, { timeout: 60000 }); await page.waitForTimeout(1500);
  a = await tix(); chk(a.t === 5 && a.ls === '5', 'reload pays nothing', a);
  chk(errors.length === 0, 'no page errors', errors); console.log(ok ? 'ALL OK' : 'SOME FAIL'); await o.close(); process.exit(ok ? 0 : 1); })();
