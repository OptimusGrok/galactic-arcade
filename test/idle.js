// Idle animations: 5 s still -> hands in pockets, 10 s -> phone out scrolling a generic feed, any movement -> phone away, timers reset.
// node test/idle.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const o = await open(PH ? { phone: true, w: 412, h: 860 } : { w: 1280, h: 720 }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const S = () => page.evaluate(() => { const P = window.__neonPlayer, u = window.__arcade.monkey.userData; return { st: P.idleState, t: +P.idleT.toFixed(2), wP: +P.wPocket.toFixed(2), wF: +P.wPhone.toFixed(2), phone: u.phone.visible, sx: +u.arms[0].sh.rotation.x.toFixed(2) }; });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const A = window.__arcade; window.__noAdapt = 1; window.__idleTimeScale = 3; A.monkey.position.set(-3, 0, 6); A.st.vel.set(0, 0, 0); A.st.face = 0; });
  const cam = (yo = 0.55, pitch = 0.2, dist = 2.3) => page.evaluate(([yo, pitch, dist]) => { const A = window.__arcade; delete window.__camOverride; window.__noAdapt = 1; A.st.fp = false; A.st.yaw = A.st.face + yo; A.st.pitch = pitch; A.st.dist = dist; A.st.lookT = A.st.t; }, [yo, pitch, dist]);   // real follow camera, orbited to his front quarter
  await page.keyboard.down('KeyW'); await page.waitForTimeout(400); await page.keyboard.up('KeyW'); await page.waitForTimeout(150);
  let s = await S(); chk(s.st === 'none' && s.t < 1 && !s.phone, '0 s (just moved): normal pose ' + JSON.stringify(s)); await cam();
  await page.waitForFunction(() => window.__neonPlayer.idleT >= 5.5, null, { timeout: 120000 }); await page.waitForFunction(() => window.__neonPlayer.wPocket > 0.85 || window.__neonPlayer.idleT > 9.5, null, { timeout: 120000 });
  s = await S(); chk(s.st === 'pockets' && s.wP >= 0.84 && s.wF < 0.05 && !s.phone, '~5.5 s idle: hands in jacket pockets, no phone ' + JSON.stringify(s));
  await cam(); await page.waitForTimeout(1200); await page.screenshot({ path: `shots/idle_pockets${sfx}.png` });
  await cam(1.4); await page.waitForTimeout(1200); await page.screenshot({ path: `shots/idle_pockets_side${sfx}.png` });
  const hv = await page.evaluate(() => window.__arcade.monkey.userData.arms.map(a => a.hand.visible)); chk(hv.every(v => !v), 'both hands hidden inside the jacket pockets ' + JSON.stringify(hv));
  await page.waitForFunction(() => window.__neonPlayer.idleT >= 10.5, null, { timeout: 120000 }); await page.waitForFunction(() => window.__neonPlayer.wPhone > 0.85, null, { timeout: 120000 });
  s = await S(); const f0 = await page.evaluate(() => window.__neonPlayer.idle.scroll);
  chk(s.st === 'phone' && s.wF > 0.8 && s.phone, '~10.5 s idle: phone out ' + JSON.stringify(s));
  await page.waitForTimeout(6000); const f1 = await page.evaluate(() => window.__neonPlayer.idle.scroll); chk(f1 > f0 + 5, 'feed scrolls with thumb flicks (' + f0.toFixed(0) + ' -> ' + f1.toFixed(0) + ')');
  const lay = await page.evaluate(() => { const T = window.__arcade.THREE, M = window.__arcade.monkey, u = M.userData, p = u.phone.getWorldPosition(new T.Vector3()), h = u.head.getWorldPosition(new T.Vector3()), mp = M.position;
    const fwd = new T.Vector3(Math.sin(window.__arcade.st.face), 0, Math.cos(window.__arcade.st.face)); return { y: +p.y.toFixed(2), headY: +h.y.toFixed(2), front: +p.clone().sub(mp).dot(fwd).toFixed(2), layer: u.phone.children[0].layers.isEnabled(30) || false }; });
  const hv2 = await page.evaluate(() => window.__arcade.monkey.userData.arms.map(a => a.hand.visible)); chk(!hv2[0] && hv2[1], 'other hand stays in its pocket ' + JSON.stringify(hv2));
  chk(lay.y > 1.25 && lay.y < lay.headY && lay.front > 0.15, 'phone held in front of the chest, below the face ' + JSON.stringify(lay));
  await cam(0.5, 0.32, 1.5); await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/idle_phone${sfx}.png` });
  if (PH) { await page.evaluate(() => { const A = window.__arcade; A.st.joy.on = true; A.st.joy.x = 0; A.st.joy.y = -1; }); await page.waitForFunction(() => !window.__arcade.monkey.userData.phone.visible, null, { timeout: 20000 }).catch(() => {}); await page.evaluate(() => { const A = window.__arcade; A.st.joy.on = false; A.st.joy.x = 0; A.st.joy.y = 0; }); }
  else { await page.keyboard.down('KeyD'); await page.waitForFunction(() => !window.__arcade.monkey.userData.phone.visible, null, { timeout: 20000 }).catch(() => {}); await page.keyboard.up('KeyD'); }
  s = await S(); chk(s.st === 'none' && s.t < 1.5 && !s.phone && s.wF < 0.35, 'moving puts the phone away at once, timer reset ' + JSON.stringify(s));
  await page.waitForFunction(() => window.__neonPlayer.wPocket < 0.05, null, { timeout: 30000 }).catch(() => {}); s = await S(); chk(s.st === 'none' && s.wP <= 0.06 && s.t < 5, 'back to the normal pose, idle timer restarted ' + JSON.stringify(s));
  chk(!errors.length, 'no errors ' + errors.slice(0, 3)); await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
