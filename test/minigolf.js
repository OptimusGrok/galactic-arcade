// t273u MINI GOLF stairs behind the GROK SHOP counter: reachable, shield blocks under 5 tickets, paying 5 opens it, every visit pays again,
// the golf copy has 3 holes and pays 1 stroke +5, 2 +4, 3 +3, 4+ 0.   flock /workspace/.browser-test.lock node test/minigolf.js  (phone 390x700)
const { open, play } = require('./lib');
const SH = '/workspace/ga-golf/shots/';
(async () => { const { page, errors, close } = await open({ phone: true, start: true, w: 390, h: 700 }); page.setDefaultTimeout(180000); page.on('requestfailed', r => console.log('REQFAIL', r.url()));
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await play(page, true, 'Golfer');
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__minigolf, null, { timeout: 120000 });
  await page.evaluate(() => window.__arcade.shopReady.then(() => 1));
  const setT = n => page.evaluate(n => { localStorage.setItem('neonarcade.tickets', String(n)); window.__neonSync(); }, n);
  const tix = () => page.evaluate(() => window.__arcade.play.tickets.total);
  const G = () => page.evaluate(() => { const g = window.__minigolf, p = window.__arcade.monkey.position; return { open: g.open, inWell: g.inWell, game: g.game, pop: g.pop.classList.contains('on'), btn: g.pop.querySelector('#gfBtn').textContent, entries: g.entries, pays: g.pays, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), X0: g.X0 }; });
  // walk east (+x) from in front of the shield with real collisions, fixed heading
  const walk = (secs, from) => page.evaluate(([secs, from]) => { const A = window.__arcade, g = window.__minigolf, st = A.st;
    if (from) { A.monkey.position.set(g.entry.x - 1.5, 0, g.entry.z); st.vel.set(0, 0, 0); }
    A.keys.KeyW = true; for (let i = 0; i < secs * 60; i++) { st.yaw = -Math.PI / 2; A.step(1 / 60); g.update(1 / 60); if (g.game) break; } A.keys.KeyW = false; st.vel.set(0, 0, 0); }, [secs, from]);
  // 1. Dave's view: standing right of the counter, stairs in front, Mars mural behind
  await page.evaluate(() => { const A = window.__arcade, g = window.__minigolf; A.monkey.position.set(g.entry.x - 2.2, 0, 1.6); window.__camOverride = { pos: [g.X0 - 4.2, 3.4, 5.8], at: [g.X0 + 2.0, -0.6, -1.6], showMonkey: true }; });
  await page.waitForTimeout(3500); await page.screenshot({ path: SH + 'golf_stairs_phone.png' });
  await page.evaluate(() => { window.__camOverride = null; });
  // 2. under 5 tickets: blocked + prompt says so
  await setT(3); await walk(3, true); await page.waitForTimeout(800); let s = await G();
  console.log('blocked', JSON.stringify(s));
  chk(!s.open && !s.inWell && s.x < s.X0 && s.x > s.X0 - 0.5, 'shield stops the monkey at the top of the stairs (stairs reachable, x=' + s.x + ')');
  chk(s.pop && /NEED 5/.test(s.btn), 'prompt shows with NEED 5 when holding 3 tickets');
  await page.locator('#gfBtn').tap(); await page.waitForTimeout(300); s = await G();
  chk(!s.open && (await tix()) === 3, 'tapping PAY with 3 tickets keeps the shield closed and the tickets');
  // 3. pay with 12 -> 7, opens
  await setT(12); await page.waitForTimeout(600); await page.screenshot({ path: SH + 'golf_shield_prompt_phone.png' });
  await page.locator('#gfBtn').tap(); await page.waitForTimeout(500); s = await G();
  chk(s.open && (await tix()) === 7, 'paying deducts 5 (12 -> ' + (await tix()) + ') and opens the shield');
  await walk(6, false); s = await G(); console.log('down', JSON.stringify(s));
  chk(s.inWell && s.y < -1 && s.game, 'walks down the stairs (y=' + s.y + ') into the mini golf');
  chk(!s.open, 'shield re-arms behind you');
  // 4. the golf copy
  const fr = async () => { for (let i = 0; i < 240; i++) { const f = page.frames().find(f => /golf-play/.test(f.url())); if (f) { try { if (await f.evaluate(() => !!window.__golf)) return f; } catch (e) {} } await page.waitForTimeout(500); } return null; };
  let f = await fr(); chk(!!f, 'golf-play loaded full-screen');
  const settle = () => f.waitForFunction(() => window.__golf.phase === 'aim', null, { timeout: 120000 });
  const strokesThenSink = async n => { for (let i = 1; i <= n; i++) { await settle(); await f.evaluate(() => window.__golf.putt(0, 0.08)); await f.waitForFunction(k => window.__golf.strokes >= k, i, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(300); await settle(); }
    console.log('  strokes before sink', await f.evaluate(() => window.__golf.strokes)); await f.evaluate(() => window.__golf.sink()); await page.waitForTimeout(400); };
  const nextHole = async h => { await f.evaluate(() => window.__golf.next()); await f.waitForFunction(h => window.__golf.hole === h && window.__golf.phase === 'aim' && !document.getElementById('fade').classList.contains('on'), h, { timeout: 60000 }); await page.waitForTimeout(600); };
  chk(await f.evaluate(() => window.__golf.holes === 3), 'golf copy has 3 holes');
  await page.waitForTimeout(2500); await page.screenshot({ path: SH + 'golf_level1_phone.png' });
  const t0 = await tix();
  await strokesThenSink(1); const t1 = await tix();
  chk(t1 - t0 === 5, 'hole in one pays +5 (' + (t1 - t0) + ')');
  await nextHole(2); await strokesThenSink(2); const t2 = await tix();
  chk(t2 - t1 === 4, '2 strokes pay +4 (' + (t2 - t1) + ')');
  await nextHole(3); await strokesThenSink(3); const t3 = await tix();
  chk(t3 - t2 === 3, '3 strokes pay +3 (' + (t3 - t2) + ')');
  await f.evaluate(() => window.__golf.next()); await page.waitForTimeout(900);
  const fin = await f.evaluate(() => ({ hole: window.__golf.hole, phase: window.__golf.phase, rows: document.querySelectorAll('#finBody .row').length }));
  chk(fin.hole === 3 && fin.phase === 'final' && fin.rows === 4, 'round ends after hole 3 (' + JSON.stringify(fin) + ')');
  chk((await f.evaluate(() => { window.__golf.goto(7); return window.__golf.hole; })) === 3, 'cannot go past hole 3');
  // 5. back upstairs, re-entry charges again; 4 strokes pay 0
  await f.locator('#gaX').tap(); await page.waitForTimeout(1200); s = await G();
  chk(!s.game && !s.open && !s.inWell && s.y === 0, 'UPSTAIRS returns to the top, shield closed again');
  const before = await tix(); await walk(2, true); s = await G(); chk(!s.inWell && s.x < s.X0, 'second visit blocked again until paid');
  await page.waitForTimeout(600); await page.locator('#gfBtn').tap(); await page.waitForTimeout(400);
  chk((await tix()) === before - 5, 're-entry charges 5 again (' + before + ' -> ' + (await tix()) + ')');
  await walk(6, false); s = await G(); chk(s.game, 'second trip down opens the golf again');
  f = await fr(); await f.waitForFunction(() => window.__golf.phase === 'aim' && window.__golf.strokes === 0); await page.waitForTimeout(1500); const t4 = await tix(); await strokesThenSink(4); chk((await tix()) === t4, '4 strokes pay 0 tickets');
  chk(await page.evaluate(() => [1, 2, 3, 4, 5, 9].map(window.__minigolf.payout).join(',')) === '5,4,3,0,0,0', 'payout table 1..3 = 5,4,3; 4+ = 0');
  await f.locator('#gaX').tap(); await page.waitForTimeout(800);
  { const real = errors.filter(e => !/Failed to load resource/.test(e)); chk(real.length === 0, "no page errors (offline supabase name lookups ignored) " + real.slice(0, 3).join(" | ")); }
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await close(); process.exit(ok ? 0 : 1); })();
