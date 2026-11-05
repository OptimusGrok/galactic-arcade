// Two-hand hold (shop.js): L/R slots, hug clears both, registerHoldable, legacy string still loads.
// Usage: node test/hold.js [phone]
const { open } = require('./lib');
(async () => {
  const phone = process.argv[2] === 'phone';
  let { page, errors, close } = await open(phone ? { phone: true, w: 491, h: 1024 } : {}); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const put = (x, z, yaw, pitch = 0.15, dist = 3.2) => page.evaluate(([x, z, yaw, pitch, dist]) => { const A = window.__arcade; A.monkey.position.set(80 + x, 0, z); A.st.vel.set(0, 0, 0); A.st.yaw = yaw; A.st.face = yaw + Math.PI; A.st.pitch = pitch; A.st.dist = dist; }, [x, z, yaw, pitch, dist]);
  const att = () => page.evaluate(() => {
    const S = window.__shop, h = S.held, o = S.heldObjs || {}, A = window.__arcade;
    const inM = (obj) => { let p = obj, ok = false; while (p) { if (p === A.monkey) ok = true; p = p.parent; } return ok; };
    return { held: h, R: h && h.R, L: h && h.L, hug: !!(o.hug), inMR: inM(o.R), inML: inM(o.L), inHug: inM(o.hug),
      visR: !!(o.R && o.R.visible), visL: !!(o.L && o.L.visible), visH: !!(o.hug && o.hug.visible),
      ls: localStorage.getItem('neonarcade.held'), primary: (h && (h.R || h.L)) || null };
  });
  await put(3.0, 0.3, -0.62); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__arcade.play.tickets.total = 1600; localStorage.removeItem('neonarcade.prizes'); localStorage.removeItem('neonarcade.held'); window.__shop.reloadPrizes(); });
  await page.click('#shopBtn'); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('#holoL button[data-id="monkeyBrown"]').click()); await page.waitForTimeout(200);
  let a = await att(); chk(a.R === 'monkeyBrown' && a.inHug && /"R":"monkeyBrown"/.test(a.ls || ''), 'bought monkey plush hugged (R) ' + JSON.stringify(a));
  await page.evaluate(() => document.querySelector('#holoL button[data-id="grok"]').click()); await page.waitForTimeout(200);
  a = await att(); chk(a.R === 'grok' && a.inHug && !a.L, 'buying Grok plush switches hug to it');
  await page.click('#holoX');
  await page.evaluate(() => { const A = window.__arcade; A.keys.KeyW = true; for (let i = 0; i < 30; i++) A.step(1 / 60); A.keys.KeyW = false; }); await page.waitForTimeout(300);
  a = await att(); chk(a.visH, 'held hug visible while walking');
  // inventory chips
  await page.evaluate(() => { const b = document.getElementById('bPack'); if (b) b.click(); else if (window.__inv) window.__inv.show && window.__inv.show(); }); await page.waitForTimeout(600);
  const chips = await page.evaluate(() => [...document.querySelectorAll('#invPz .pzC')].map(b => b.dataset.pz + (b.classList.contains('on') ? '*' : '')));
  chk(chips.length === 2 && chips.includes('grok*'), 'inventory chips ' + chips.join(','));
  await page.evaluate(() => document.querySelector('#invPz [data-pz="monkeyBrown"]').click()); await page.waitForTimeout(200);
  a = await att(); chk(a.R === 'monkeyBrown', 'chip tap switches to monkey plush');
  await page.evaluate(() => document.querySelector('#invPz [data-pz="monkeyBrown"]').click()); await page.waitForTimeout(200);
  a = await att(); chk(a.R === null && a.L === null && a.ls === null, 'tapping held chip puts it away');
  await page.evaluate(() => document.querySelector('#invPz [data-pz="grok"]').click());
  await page.waitForTimeout(200);
  // the held prize survives a plain reload; SAVE then LOAD of a slot also brings it back
  await page.evaluate(() => window.__opts.save(2)); await page.waitForTimeout(300);
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__shop, null, { timeout: 60000 }); await page.waitForTimeout(500);
  a = await att(); chk(a.R === 'grok' && a.inHug, 'held prize survives reload ' + JSON.stringify(a));
  const ld = await page.evaluate(() => window.__opts.load(2)); await page.waitForTimeout(500);
  a = await att(); chk(ld && a.R === 'grok' && a.inHug, 'LOAD of the saved slot: Grok plush held again ' + JSON.stringify(a));
  await page.evaluate(() => localStorage.removeItem('neonarcade.save.2'));
  // hidden while playing a cabinet / seated
  const hid = await page.evaluate(async () => { const A = window.__arcade; const pm = A.play.mode; A.play.mode = 'game'; const w = async () => { const f = A.stats.frames; while (A.stats.frames < f + 3) await new Promise(r => setTimeout(r, 50)); }; await w(); const v = !!(window.__shop.heldObj && window.__shop.heldObj.visible); A.play.mode = pm; await w(); return [v, !!(window.__shop.heldObj && window.__shop.heldObj.visible)]; });
  chk(!hid[0] && hid[1], 'hidden while in a game, back afterwards ' + hid);
  // save slots: reloadPrizes() re-reads localStorage
  const rp = await page.evaluate(async () => { const S = window.__shop, A = window.__arcade; const w = async () => { const f = A.stats.frames; while (A.stats.frames < f + 3) await new Promise(r => setTimeout(r, 50)); };
    localStorage.setItem('neonarcade.prizes', JSON.stringify({ monkeyBrown: 1 })); localStorage.setItem('neonarcade.held', 'monkeyBrown'); S.reloadPrizes(); await w(); const h1 = S.held;
    const b = document.getElementById('bPack'); if (b && !document.querySelector('#inv.on')) b.click(); await new Promise(r => setTimeout(r, 400));
    localStorage.removeItem('neonarcade.prizes'); localStorage.removeItem('neonarcade.held'); S.reloadPrizes(); S.reloadPrizes(); await w();
    const empty = { held: S.held, obj: !!S.heldObj, inMonkey: !!A.monkey.getObjectByName('heldPrize'), chips: document.querySelectorAll('#invPz .pzC').length };
    localStorage.setItem('neonarcade.prizes', JSON.stringify({ grok: 1 })); localStorage.setItem('neonarcade.held', JSON.stringify({ R: 'grok', L: null })); S.reloadPrizes(); await w();
    const hp = A.monkey.getObjectByName('heldPrize'); return { h1, empty, grok: S.held, gid: hp && hp.userData.id, chips2: [...document.querySelectorAll('#invPz .pzC')].map(c => c.dataset.pz) }; });
  chk(rp.h1 && rp.h1.R === 'monkeyBrown', 'reloadPrizes: legacy string -> {R:monkeyBrown} ' + JSON.stringify(rp.h1));
  chk(rp.empty.held && rp.empty.held.R === null && rp.empty.held.L === null && !rp.empty.obj && !rp.empty.inMonkey && rp.empty.chips === 0, 'reloadPrizes with cleared keys: hands empty, no chips ' + JSON.stringify(rp.empty));
  chk(rp.grok && rp.grok.R === 'grok' && rp.gid === 'grok', 'reloadPrizes: Grok plush attached ' + JSON.stringify(rp.grok));

  // ---- two-hand API ----
  const two = await page.evaluate(async () => {
    const S = window.__shop, A = window.__arcade, T = A.THREE;
    localStorage.setItem('neonarcade.prizes', JSON.stringify({ cherry: 2, jaw: 1, grok: 1, monkeyBrown: 1 }));
    S.reloadPrizes();
    // registerHoldable
    const okReg = S.registerHoldable('clawStar', { name: 'Claw Star', kind: 'hand', build: (THREE) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a })); g.add(m); return g; } });
    S.hold('cherry', 'R'); S.hold('jaw', 'L');
    const afterHands = { ...S.held, hasR: !!S.heldObjs.R, hasL: !!S.heldObjs.L, hug: !!S.heldObjs.hug, ls: localStorage.getItem('neonarcade.held') };
    // hug clears hands
    S.hold('grok');
    const afterHug = { ...S.held, hasR: !!S.heldObjs.R, hasL: !!S.heldObjs.L, hug: !!S.heldObjs.hug, hugId: S.heldObjs.hug && S.heldObjs.hug.userData.id };
    // hand clears hug
    S.hold('cherry', 'R');
    const afterHand = { ...S.held, hug: !!S.heldObjs.hug, hasR: !!S.heldObjs.R };
    // unhold slot
    S.hold('jaw', 'L'); S.unhold('R');
    const afterUn = { ...S.held, hasR: !!S.heldObjs.R, hasL: !!S.heldObjs.L };
    // registered holdable (no shop prize needed)
    S.hold('clawStar', 'R');
    const claw = { ...S.held, hasR: !!S.heldObjs.R, rid: S.heldObjs.R && S.heldObjs.R.userData.id, okReg };
    // legacy string still accepted by hold()
    localStorage.setItem('neonarcade.held', 'monkeyBrown'); S.reloadPrizes();
    const leg = { ...S.held, hug: !!S.heldObjs.hug };
    S.unhold();
    return { afterHands, afterHug, afterHand, afterUn, claw, leg };
  });
  chk(two.afterHands.R === 'cherry' && two.afterHands.L === 'jaw' && two.afterHands.hasR && two.afterHands.hasL && !two.afterHands.hug, 'hold R+L candy in each hand ' + JSON.stringify(two.afterHands));
  chk(two.afterHug.R === 'grok' && !two.afterHug.L && two.afterHug.hug && two.afterHug.hugId === 'grok' && !two.afterHug.hasR && !two.afterHug.hasL, 'hug clears both hands ' + JSON.stringify(two.afterHug));
  chk(two.afterHand.R === 'cherry' && !two.afterHand.hug && two.afterHand.hasR, 'hand hold clears hug');
  chk(two.afterUn.R === null && two.afterUn.L === 'jaw' && !two.afterUn.hasR && two.afterUn.hasL, 'unhold(R) leaves L ' + JSON.stringify(two.afterUn));
  chk(two.claw.okReg && two.claw.R === 'clawStar' && two.claw.rid === 'clawStar', 'registerHoldable + hold claw item in R');
  chk(two.leg.R === 'monkeyBrown' && two.leg.hug, 'legacy string neonarcade.held still loads as hug in R');

  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); await close(); process.exit(ok ? 0 : 1);
})();
