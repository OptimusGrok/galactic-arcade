// t554: with every prize owned the inventory panel must fit the phone screen, finger-scroll to the bottom, keep ✕ + UNEQUIP reachable, close, and leave walking working.
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 412, h: 915 }); let ok = true;
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const cdp = await page.context().newCDPSession(page); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const at = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2, e = document.elementFromPoint(x, y); return { x, y, hit: !!e && (e === document.querySelector(s) || document.querySelector(s).contains(e)) }; }, sel);
  const tap = async sel => { const b = await at(sel); await T('touchStart', [{ x: b.x, y: b.y, id: 7 }]); await T('touchEnd', []); await page.waitForTimeout(300); };
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(83, 0, 0.3); const all = {}; for (const it of window.__shop.ITEMS) all[it.id] = 2; localStorage.setItem('neonarcade.prizes', JSON.stringify(all)); localStorage.setItem('neonarcade.held', 'rainbow'); window.__shop.reloadPrizes(); });
  await tap('#bPack'); await page.waitForTimeout(500);
  let g = await page.evaluate(() => { const p = document.getElementById('invP'), r = p.getBoundingClientRect(); return { open: window.__inv.open, top: r.top, bot: r.bottom, sh: p.scrollHeight, ch: p.clientHeight, chips: document.querySelectorAll('#invPz .pzC').length, uFirst: !!document.querySelector('#invPz .pzT + .pzU') }; });
  chk(g.open && g.top >= 0 && g.bot <= 915 && g.sh > g.ch, 'panel fits the screen and overflows into a scroller ' + JSON.stringify(g));
  chk(g.chips === (await page.evaluate(() => window.__shop.ITEMS.length)) && g.uFirst, 'every prize listed, UNEQUIP at the top of PRIZES');
  await page.waitForTimeout(1500);
  const tl = await page.evaluate(() => { const t = [...document.querySelectorAll('#invPz .pzC')]; const a = t[0].getBoundingClientRect(), b = t[1].getBoundingClientRect(), im = t[0].querySelector('img').getBoundingClientRect(), n = t[0].querySelector('.pzN').getBoundingClientRect();
    return { pics: t.filter(x => x.querySelector('img').src.startsWith('data:image/png')).length, n: t.length, side: Math.abs(a.top - b.top) < 2, square: Math.abs(im.width - im.height) < 2, nameAbove: n.bottom <= im.top + 1, held: document.querySelector('#invPz .pzC.on').dataset.pz, badge: !!t[0].querySelector('b') }; });
  chk(tl.pics === tl.n && tl.side && tl.square && tl.nameAbove && tl.held === 'rainbow' && tl.badge, 'tiles: square rendered pictures, name on top, side by side, ×N badge, held tile highlighted ' + JSON.stringify(tl));
  await page.screenshot({ path: '/workspace/galactic-shop/shots/inventory_tiles.png' });
  await page.evaluate(() => document.querySelector('#invPz .pzC[data-pz="dino"]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
  await tap('#invPz .pzC[data-pz="dino"]'); chk(await page.evaluate(() => window.__shop.held === 'dino' && document.querySelector('#invPz .pzC.on').dataset.pz === 'dino'), 'tap a tile holds it');
  await page.evaluate(() => document.querySelector('#invPz .pzC[data-pz="dino"]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
  await tap('#invPz .pzC[data-pz="dino"]'); chk(await page.evaluate(() => window.__shop.held === null), 'tap it again puts it away');
  await page.evaluate(() => window.__shop.reloadPrizes && (localStorage.setItem('neonarcade.held', 'rainbow'), window.__shop.reloadPrizes())); await page.waitForTimeout(300);
  for (let k = 0; k < 6; k++) { await T('touchStart', [{ x: 200, y: 760, id: 1 }]); for (let i = 1; i <= 10; i++) await T('touchMove', [{ x: 200, y: 760 - i * 55, id: 1 }]); await T('touchEnd', []); await page.waitForTimeout(400); }
  g = await page.evaluate(() => { const p = document.getElementById('invP'); return { st: Math.round(p.scrollTop), max: p.scrollHeight - p.clientHeight }; });
  chk(g.st >= g.max - 2 && g.max > 0, 'finger drag scrolls to the bottom ' + JSON.stringify(g));
  const x = await at('#invX'); chk(x.hit && x.y > 0 && x.y < 915, 'close ✕ still visible and tappable at the bottom ' + JSON.stringify(x));
  await page.screenshot({ path: '/workspace/galactic-shop/shots/inventory_full.png' });
  await tap('#invX'); chk(!(await page.evaluate(() => window.__inv.open)), 'close works');
  const p0 = await page.evaluate(() => window.__arcade.monkey.position.clone());
  await T('touchStart', [{ x: 100, y: 700, id: 1 }]); for (let i = 1; i <= 6; i++) await T('touchMove', [{ x: 100, y: 700 - i * 8, id: 1 }]);
  const p1 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 60; i++) A.step(1 / 60); return A.monkey.position.clone(); }); await T('touchEnd', []);
  const d = Math.hypot(p1.x - p0.x, p1.z - p0.z); chk(d > 0.5, 'player walks after closing ' + d.toFixed(2));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); await close();
})();
