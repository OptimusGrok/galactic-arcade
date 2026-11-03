// Hats on the in-game monkey (third person): cap / crown / helmet / none, after reload, teleport sequence and prize equip/unequip.
const { open } = require('./lib');
const OUT = '/workspace/galactic-shop/shots/';
(async () => {
  let o; for (let i = 0; ; i++) { try { o = await open({ phone: true, w: 412, h: 915 }); break; } catch (e) { if (i >= 3) throw e; console.log('retry open'); } }
  const { page, errors } = o; let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  const ready = () => page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer && window.__gaPlayer.tag, null, { timeout: 90000 });
  await page.evaluate(() => { localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'crown', hoodie: 'red', fur: 'brown', shoes: 'red' })); });
  await page.reload({ timeout: 120000 }); await ready();
  const state = () => page.evaluate(() => { const m = window.__arcade.monkey; let cap; m.traverse(x => { if (x.userData.gaCap) cap = x; }); const h = cap.parent.userData.gaHats, wv = x => { let v = true; for (let n = x; n; n = n.parent) v = v && n.visible; return v; };
    return { hat: window.__gaPlayer.p.hat, cap: wv(cap), crown: wv(h.crown), helmet: wv(h.helmet), crownInHead: h.crown.parent === cap.parent, headOk: !!cap.parent.parent }; });
  const face = async (path) => { await page.evaluate(() => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.st.fp = false; A.st.yaw = A.st.face; A.st.dist = 1.9; A.st.pitch = 0.12; A.st.camInit = false; });
    await page.waitForTimeout(3000); await page.evaluate(() => { const A = window.__arcade; A.st.yaw = A.st.face; A.st.dist = 1.9; A.st.pitch = 0.12; }); await page.waitForTimeout(2500); await page.screenshot({ path }); };
  const want = { cap: [1, 0, 0], crown: [0, 1, 0], helmet: [0, 0, 1], none: [0, 0, 0] };
  const is = (s, h) => [s.cap, s.crown, s.helmet].map(Number).join() === want[h].join();
  let s = await state(); chk(is(s, 'crown'), 'after reload the saved crown is worn in-game', s);
  await face(OUT + 'hat_crown_ingame.png');
  for (const h of ['helmet', 'cap', 'none']) { await page.evaluate(h => window.__gaPlayer.pick('hat', h), h); s = await state(); chk(is(s, h), h + ' worn', s); if (h !== 'none') await face(OUT + 'hat_' + h + '_ingame.png'); }
  await page.evaluate(() => window.__gaPlayer.pick('hat', 'crown'));
  // prize equip / unequip
  await page.evaluate(() => { localStorage.setItem('neonarcade.prizes', JSON.stringify({ monkeyBrown: 1 })); localStorage.setItem('neonarcade.held', 'monkeyBrown'); window.__shop.reloadPrizes(); });
  await page.waitForTimeout(800); s = await state(); chk(is(s, 'crown'), 'crown still worn holding a prize', s);
  await page.evaluate(() => { localStorage.removeItem('neonarcade.held'); window.__shop.reloadPrizes(); }); await page.waitForTimeout(500); s = await state(); chk(is(s, 'crown'), 'crown still worn after unequip', s);
  // teleport sequence
  await page.evaluate(() => { window.__tpTimeScale = 6; window.__tp.state = 'walk'; window.__tp.t = 0; });
  await page.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 120000 }).catch(() => {});
  s = await state(); chk(is(s, 'crown'), 'crown still worn after a teleport', s);
  chk(errors.length === 0, 'no page errors', errors);
  await o.close(); process.exit(ok ? 0 : 1);
})();
