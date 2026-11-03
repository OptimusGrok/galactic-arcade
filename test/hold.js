const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/';
(async () => {
  const phone = process.argv[2] === 'phone';
  let { page, errors, close } = await open(phone ? { phone: true, w: 491, h: 1024 } : {}); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const put = (x, z, yaw, pitch = 0.15, dist = 3.2) => page.evaluate(([x, z, yaw, pitch, dist]) => { const A = window.__arcade; A.monkey.position.set(80 + x, 0, z); A.st.vel.set(0, 0, 0); A.st.yaw = yaw; A.st.face = yaw + Math.PI; A.st.pitch = pitch; A.st.dist = dist; }, [x, z, yaw, pitch, dist]);
  const att = () => page.evaluate(() => { const h = window.__shop.heldObj; let p = h, inM = false; while (p) { if (p === window.__arcade.monkey) inM = true; p = p.parent; } return { id: window.__shop.held, inM, vis: !!(h && h.visible), ls: localStorage.getItem('neonarcade.held') }; });
  await put(3.0, 0.3, -0.62); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__arcade.play.tickets.total = 1600; localStorage.removeItem('neonarcade.prizes'); localStorage.removeItem('neonarcade.held'); });
  await page.click('#shopBtn'); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('#holoL button[data-id="monkeyBrown"]').click()); await page.waitForTimeout(200);
  let a = await att(); chk(a.id === 'monkeyBrown' && a.inM && a.ls === 'monkeyBrown', 'bought monkey plush is held by the monkey ' + JSON.stringify(a));
  await page.evaluate(() => document.querySelector('#holoL button[data-id="grok"]').click()); await page.waitForTimeout(200);
  a = await att(); chk(a.id === 'grok' && a.inM, 'buying Grok plush switches to it');
  await page.click('#holoX');
  await page.evaluate(() => { const A = window.__arcade; A.keys.KeyW = true; for (let i = 0; i < 30; i++) A.step(1 / 60); A.keys.KeyW = false; }); await page.waitForTimeout(300);
  a = await att(); chk(a.vis, 'held prize visible while walking');
  // inventory chips
  await page.evaluate(() => { const b = document.getElementById('bPack'); if (b) b.click(); else if (window.__inv) window.__inv.show && window.__inv.show(); }); await page.waitForTimeout(600);
  const chips = await page.evaluate(() => [...document.querySelectorAll('#invPz .pzC')].map(b => b.dataset.pz + (b.classList.contains('on') ? '*' : '')));
  chk(chips.length === 2 && chips.includes('grok*'), 'inventory chips ' + chips.join(','));
  await page.evaluate(() => document.querySelector('#invPz [data-pz="monkeyBrown"]').click()); await page.waitForTimeout(200);
  a = await att(); chk(a.id === 'monkeyBrown', 'chip tap switches to monkey plush');
  await page.evaluate(() => document.querySelector('#invPz [data-pz="monkeyBrown"]').click()); await page.waitForTimeout(200);
  a = await att(); chk(a.id === null && a.ls === null, 'tapping held chip puts it away');
  await page.evaluate(() => document.querySelector('#invPz [data-pz="grok"]').click());
  await page.waitForTimeout(200);
  // prizes are session-only (v53): a plain reload empties the hands; SAVE then LOAD of a slot brings the held prize back
  await page.evaluate(() => window.__opts.save(2)); await page.waitForTimeout(300);
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__shop, null, { timeout: 60000 }); await page.waitForTimeout(500);
  a = await att(); chk(a.id === null && !a.inM, 'reload without LOAD: hands empty ' + JSON.stringify(a));
  const ld = await page.evaluate(() => window.__opts.load(2)); await page.waitForTimeout(500);
  a = await att(); chk(ld && a.id === 'grok' && a.inM, 'LOAD of the saved slot: Grok plush held again ' + JSON.stringify(a));
  await page.evaluate(() => localStorage.removeItem('neonarcade.save.2'));
  // hidden while playing a cabinet / seated
  const hid = await page.evaluate(async () => { const A = window.__arcade; const pm = A.play.mode; A.play.mode = 'game'; const w = async () => { const f = A.stats.frames; while (A.stats.frames < f + 3) await new Promise(r => setTimeout(r, 50)); }; await w(); const v = !!(window.__shop.heldObj && window.__shop.heldObj.visible); A.play.mode = pm; await w(); return [v, !!(window.__shop.heldObj && window.__shop.heldObj.visible)]; });
  chk(!hid[0] && hid[1], 'hidden while in a game, back afterwards ' + hid);
  // save slots: reloadPrizes() re-reads localStorage
  const rp = await page.evaluate(async () => { const S = window.__shop, A = window.__arcade; const w = async () => { const f = A.stats.frames; while (A.stats.frames < f + 3) await new Promise(r => setTimeout(r, 50)); };
    localStorage.setItem('neonarcade.prizes', JSON.stringify({ monkeyBrown: 1 })); localStorage.setItem('neonarcade.held', 'monkeyBrown'); S.reloadPrizes(); await w(); const h1 = S.held, o1 = !!S.heldObj;
    const b = document.getElementById('bPack'); if (b && !document.querySelector('#inv.on')) b.click(); await new Promise(r => setTimeout(r, 400));
    localStorage.removeItem('neonarcade.prizes'); localStorage.removeItem('neonarcade.held'); S.reloadPrizes(); S.reloadPrizes(); await w();
    const empty = { held: S.held, obj: !!S.heldObj, inMonkey: !!A.monkey.getObjectByName('heldPrize'), chips: document.querySelectorAll('#invPz .pzC').length };
    localStorage.setItem('neonarcade.prizes', JSON.stringify({ grok: 1 })); localStorage.setItem('neonarcade.held', 'grok'); S.reloadPrizes(); await w();
    const hp = A.monkey.getObjectByName('heldPrize'); return { h1, o1, empty, grok: S.held, gid: hp && hp.userData.id, chips2: [...document.querySelectorAll('#invPz .pzC')].map(c => c.dataset.pz) }; });
  chk(rp.h1 === 'monkeyBrown' && rp.o1, 'reloadPrizes: holds stored monkey plush');
  chk(rp.empty.held === null && !rp.empty.obj && !rp.empty.inMonkey && rp.empty.chips === 0, 'reloadPrizes with cleared keys: hands empty, no chips ' + JSON.stringify(rp.empty));
  chk(rp.grok === 'grok' && rp.gid === 'grok', 'reloadPrizes: Grok plush attached ' + JSON.stringify(rp));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); await close();
})();
