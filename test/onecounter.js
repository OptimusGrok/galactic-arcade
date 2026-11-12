// BERSERKER + ORC ATTACK: one gold ticket counter only (the arcade HUD chip, top-left, like STRIKE / GHOST 256 / MONKEY CROSSING / NOVA TETHER),
// plus the VIKING chip directly under it only when a Viking ticket is held. node test/onecounter.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE);
  for (const [cab, key, cost] of [['berserkerCabinet', 'berserker', 5], ['orcCabinet', 'orc', 3]]) {
    await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 20; localStorage.setItem('neonarcade.tickets', '20'); p.viking.total = 0; localStorage.setItem('neonarcade.vikingTickets', '0'); p.showVix(); });
    await H.goTo(cab); await page.waitForFunction(c => document.getElementById('playUI').classList.contains('on') && window.__arcade.play.near() === c, cab, { timeout: 15000 }).catch(() => {}); await page.evaluate(() => { window.__camOverride = null; }); await page.waitForTimeout(300); console.log('near', key, await page.evaluate(() => [window.__arcade.play.near(), window.__arcade.play.mode, !!document.getElementById('game')])); await H.press(); await H.zoomToDemo(); await page.waitForTimeout(1500);
    await H.insert(); if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(4000);
    const r = await page.evaluate(() => { const w = document.getElementById('game').contentWindow, d = w.document, fr = document.getElementById('game').getBoundingClientRect(), vis = el => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      const tix = document.getElementById('tix').getBoundingClientRect(), x = document.getElementById('bExit').getBoundingClientRect();
      return { cab: document.body.dataset.cab, sub: window.__arcade.play.sub, chip: vis(d.getElementById('tkChip')), tix: vis(document.getElementById('tix')), vix: vis(document.getElementById('vix')), hudDraw: /fillText\('\\u00d7 ' \+ TK\.run/.test(d.documentElement.innerHTML) || /\u00d7 ' \+ TK.run/.test(d.documentElement.innerHTML),
        tixR: [tix.left | 0, tix.top | 0, tix.bottom | 0], exitR: [x.left | 0, x.top | 0, x.bottom | 0], overlap: !(tix.bottom <= x.top || x.bottom <= tix.top || tix.right <= x.left || x.right <= tix.left) }; });
    chk(r.sub === 'play' && r.tix && !r.chip && !r.hudDraw && !r.vix && !r.overlap, key + ': in a run there is exactly one gold counter (arcade chip), no in-game duplicate, no Viking chip without a Viking ticket, chip clear of the close button ' + JSON.stringify(r));
    await page.screenshot({ path: 'shots/' + key + '_counter' + sfx + '.png' });
    if (key === 'orc') { await page.waitForFunction(() => { try { return !!document.getElementById('game').contentWindow.__tkTarget; } catch (e) { return false; } }, null, { timeout: 15000 }).catch(() => {}); const f = await page.evaluate(() => { const w = document.getElementById('game').contentWindow, fr = document.getElementById('game').getBoundingClientRect(), a = document.getElementById('tix').getBoundingClientRect(), k = fr.width / w.innerWidth;
        const tg = w.__tkTarget ? w.__tkTarget() : null; if (!tg) return { dbg: [w.location.href, !!w.__orcTk, !!w.__orc, typeof w.__tkTarget] }; return { x: fr.left + tg.left * k, y: fr.top + tg.top * k, ax: a.left, ay: a.top }; });
      chk(f && Math.abs(f.x - f.ax) < 2 && Math.abs(f.y - f.ay) < 2, 'orc: ticket pickups fly to the one arcade counter ' + JSON.stringify(f)); }
    await page.evaluate(() => { const p = window.__arcade.play; p.viking.total = 1; localStorage.setItem('neonarcade.vikingTickets', '1'); p.showVix(); }); await page.waitForTimeout(500);
    const v = await page.evaluate(() => { const a = document.getElementById('tix').getBoundingClientRect(), b = document.getElementById('vix').getBoundingClientRect(); return { vis: b.width > 0 && getComputedStyle(document.getElementById('vix')).display !== 'none', under: Math.abs(b.top - a.top) < 3 && b.left >= a.right - 1 && b.left - a.right < 14 && b.bottom < 48, n: document.getElementById('vixN').textContent }; });
    chk(v.vis && v.under && v.n === '1', key + ': with a Viking ticket its chip sits right beside the gold counter (top strip, clear of the game HUD) ' + JSON.stringify(v));
    await page.screenshot({ path: 'shots/' + key + '_counter_viking' + sfx + '.png' });
    if (PHONE) await page.tap('#bExit'); else await page.evaluate(() => document.getElementById('bExit').click()); await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => { const p = window.__arcade.play; p.viking.total = 0; localStorage.setItem('neonarcade.vikingTickets', '0'); p.showVix(); });
  }
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
