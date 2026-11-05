// BACKPACK button (bottom-right, walk-around only) + INVENTORY panel: gold / Viking tickets, cash + refill countdown, live values,
// tap does not move the monkey, I key on desktop, hidden in cabinet games. node test/inventory.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE);
  await page.waitForFunction(() => window.__inv && window.__inv.shown, null, { timeout: 20000 }).catch(() => {});
  const lay = await page.evaluate(() => { const R = id => { const e = document.getElementById(id); if (!e || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
    const b = R('bPack'), hit = []; for (const id of ['tix', 'vix', 'cash', 'ui', 'bUse', 'bPick', 'playUI', 'bPlay']) { const r = R(id); if (r && !(r.bottom <= b.top || b.bottom <= r.top || r.right <= b.left || b.right <= r.left)) hit.push(id); }
    return { b: b && [b.left | 0, b.top | 0, b.width | 0, b.height | 0], W: innerWidth, H: innerHeight, hit, why: window.__inv.why }; });
  chk(lay.b && lay.b[0] + lay.b[2] > lay.W - 130 && lay.b[1] + lay.b[3] > lay.H - 130 && lay.b[2] >= 100 && lay.b[2] <= 110 && lay.hit.length === 0, 'big (2.5x) ringless backpack button bottom-right, clear of the other HUD ' + JSON.stringify(lay));
  await page.screenshot({ path: 'shots/backpack_room' + sfx + '.png' }); await page.screenshot({ path: 'shots/backpack_big' + sfx + '.png' });
  { await page.evaluate(() => { localStorage.setItem('neonarcade.tickets', '4'); localStorage.setItem('neonarcade.vikingTickets', '0'); window.__neonSync(); });
    if (PHONE) await page.tap('#bPack'); else await page.click('#bPack'); await page.waitForTimeout(700);
    const z = await page.evaluate(() => ({ open: window.__inv.open, row: getComputedStyle(document.getElementById('invV')).display, h: document.getElementById('invV').getBoundingClientRect().height, rows: [...document.querySelectorAll('#inv .invR')].filter(r => r.offsetParent).map(r => r.id) }));
    chk(z.open && z.row === 'none' && z.h === 0 && JSON.stringify(z.rows) === '["invG","invC","invMy"]', '0 Viking tickets: no Viking row in the backpack (gold + cash + PRIZES: No prizes yet) ' + JSON.stringify(z));
    await page.screenshot({ path: 'shots/inventory_noviking' + sfx + '.png' });
    if (PHONE) await page.tap('#invX'); else await page.click('#invX'); await page.waitForTimeout(300); }
  await page.evaluate(() => { const p = window.__arcade.play; localStorage.setItem('neonarcade.tickets', '7'); localStorage.setItem('neonarcade.vikingTickets', '2'); window.__neonSync(); window.__kiosk.setState({ bal: 5, at: Date.now(), pending: 0 }); });
  const m0 = await page.evaluate(() => window.__arcade.monkey.position.toArray().map(v => +v.toFixed(3)));
  if (PHONE) await page.tap('#bPack'); else await page.click('#bPack'); await page.waitForTimeout(700);
  const o = await page.evaluate(() => ({ open: window.__inv.open, g: document.getElementById('invGn').textContent, v: document.getElementById('invVn').textContent, vr: !!document.getElementById('invV').offsetParent, c: document.getElementById('invCn').textContent, r: document.getElementById('invCr').textContent, m: window.__arcade.monkey.position.toArray().map(v => +v.toFixed(3)) }));
  chk(o.open && o.vr && o.g === '7' && o.v === '2' && o.c === '$5' && o.r === '', 'tap opens INVENTORY: 7 gold, 2 Viking (row shown once won), $5 (no countdown at $5) ' + JSON.stringify(o));
  chk(JSON.stringify(o.m) === JSON.stringify(m0), 'tapping the backpack does not move the monkey');
  await page.evaluate(() => { const p = window.__arcade.play; localStorage.setItem('neonarcade.tickets', '9'); localStorage.setItem('neonarcade.vikingTickets', '3'); window.__neonSync(); window.__kiosk.setState({ bal: 2, at: Date.now() - 600e3, pending: 0 }); }); await page.waitForTimeout(600);
  const l = await page.evaluate(() => ({ g: document.getElementById('invGn').textContent, v: document.getElementById('invVn').textContent, c: document.getElementById('invCn').textContent, r: document.getElementById('invCr').textContent }));
  chk(l.g === '9' && l.v === '3' && l.c === '$2' && /^\+\$3 in \d+m$/.test(l.r), 'values live-update, cash below $5 shows the refill countdown ' + JSON.stringify(l));
  await page.screenshot({ path: 'shots/inventory_open' + sfx + '.png' });
  if (PHONE) await page.tap('#invX'); else await page.click('#invX'); await page.waitForTimeout(300);
  chk(await page.evaluate(() => !window.__inv.open && !document.getElementById('inv').classList.contains('on')), 'X closes it');
  if (!PHONE) { await page.keyboard.press('KeyI'); await page.waitForTimeout(300); const a = await page.evaluate(() => window.__inv.open); await page.keyboard.press('Escape'); await page.waitForTimeout(300); const b = await page.evaluate(() => window.__inv.open);
    await page.keyboard.press('KeyI'); await page.waitForTimeout(200); await page.keyboard.press('KeyI'); await page.waitForTimeout(200); const c = await page.evaluate(() => window.__inv.open);
    chk(a && !b && !c, 'I opens / closes it, Esc closes it'); }
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 3; }); await H.goTo('novaCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300); await H.press(); await H.zoomToDemo();
  const g = await page.evaluate(() => ({ shown: window.__inv.shown, vis: getComputedStyle(document.getElementById('bPack')).display, why: window.__inv.why }));
  chk(!g.shown && g.vis === 'none', 'hidden inside cabinet games (their FIRE / FORCE / wave buttons own the corner) ' + JSON.stringify(g));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(600);
  chk(await page.evaluate(() => window.__inv.shown), 'back in the room the backpack returns');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
