// Regression (t552): after buying in the prize shop on a touch phone the monkey must still walk with the joystick.
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 412, h: 915 }); let ok = true; page.on('pageerror', e => console.log('ERR', e.stack.split('\n').slice(0, 3).join(' ')));
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const cdp = await page.context().newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const tap = async sel => { const b = await page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel); await T('touchStart', [{ x: b[0], y: b[1], id: 7 }]); await T('touchEnd', []); await page.waitForTimeout(250); };
  const put = () => page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(83, 0, 0.3); A.st.vel.set(0, 0, 0); A.st.yaw = -0.62; A.st.face = A.st.yaw + Math.PI; });
  const walk = async () => { const p0 = await page.evaluate(() => window.__arcade.monkey.position.clone());
    await T('touchStart', [{ x: 100, y: 700, id: 1 }]); for (let i = 1; i <= 6; i++) { await T('touchMove', [{ x: 100, y: 700 - i * 8, id: 1 }]); await page.waitForTimeout(30); }
    const p1 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 60; i++) A.step(1 / 60); return A.monkey.position.clone(); }); await T('touchEnd', []); await page.waitForTimeout(200);
    return Math.hypot(p1.x - p0.x, p1.z - p0.z); };
  const scen = async (name, setup, act) => { await put(); await page.waitForTimeout(800); await page.evaluate(setup);
    await page.waitForFunction(() => document.querySelector('#shopBtn.on'), null, { timeout: 5000 }).catch(() => {});
    await tap('#shopBtn'); await page.waitForTimeout(500); const opened = await page.evaluate(() => window.__shop.open);
    await act(); await tap('#holoX'); const f0 = await page.evaluate(() => window.__arcade.stats.frames); await page.waitForTimeout(1500); const fr = (await page.evaluate(() => window.__arcade.stats.frames)) - f0; const d = await walk(); const s = await page.evaluate(() => ({ open: window.__shop.open, joy: window.__arcade.st.joy.on }));
    chk(opened && !s.open && fr > 0 && d > 0.5, `${name}: game loop +${fr} frames, moved ${d.toFixed(2)}m after closing ${JSON.stringify(s)}`); };
  const buy = id => async () => { await page.evaluate(id => document.querySelector(`#holoL button[data-id="${id}"]`).scrollIntoView(), id); await tap(`#holoL button[data-id="${id}"]`); };
  const ids = await page.evaluate(() => window.__shop.ITEMS.map(i => i.id));
  for (const id of (process.argv[2] === 'all' ? ids : ids.filter((x, i) => i % 4 === 0))) await scen('buy ' + id, () => { window.__arcade.play.tickets.total = 5000; }, buy(id));
  await scen('buy while holding', () => { window.__arcade.play.tickets.total = 5000; }, async () => { await buy(ids[0])(); await buy(ids[1])(); });
  await scen('not enough tickets', () => { window.__arcade.play.tickets.total = 0; }, buy(ids[0]));
  await scen('close without buying', () => {}, async () => {});
  // t553: Unequip in the inventory puts the held prize away (still owned), and walking still works
  await page.evaluate(() => { window.__arcade.play.tickets.total = 5000; }); await tap('#shopBtn'); await buy('grok')(); await tap('#holoX');
  await page.evaluate(() => { const b = document.getElementById('bPack'); if (b) b.click(); }); await page.waitForTimeout(600);
  const hasU = await page.evaluate(() => !!document.querySelector('#invPz .pzU'));
  const uh = await page.evaluate(() => document.querySelector('#invPz .pzU').getBoundingClientRect().height);
  await page.evaluate(() => document.querySelector('#invPz').scrollIntoView({ block: 'start' })); await page.waitForTimeout(300);
  await page.screenshot({ path: '/workspace/galactic-shop/shots/unequip.png' });
  await tap('#invPz .pzU');
  const u = await page.evaluate(() => ({ held: window.__shop.held, inM: !!window.__arcade.monkey.getObjectByName('heldPrize'), owned: [...document.querySelectorAll('#invPz .pzC')].some(c => c.dataset.pz === 'grok'), chips: document.querySelectorAll('#invPz .pzC').length, btn: !!document.querySelector('#invPz .pzU') }));
  chk(hasU && uh >= 48 && u.held === null && !u.inM && u.chips >= 1 && u.owned && !u.btn, 'unequip empties hands, prize still owned ' + uh + ' ' + JSON.stringify(u));
  await page.evaluate(() => { const b = document.getElementById('bPack'); if (document.querySelector('#inv.on') && b) b.click(); }); await page.waitForTimeout(400);
  const du = await walk(); chk(du > 0.5, 'walks after unequip ' + du.toFixed(2));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); await close();
})();
