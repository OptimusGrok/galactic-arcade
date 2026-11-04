// Dave: the shop island's button "does not always work" + rename to ACCESSORIES. Real phone taps on #wardBtn from every side, repeated
// open/close; the panel must still be open 1 s after the tap (the tap's compat click used to land on DONE). Shot: accessories_island.png.
const { open } = require('./lib');
(async () => { const { page, errors, close } = await open({ phone: true, w: 412, h: 915 }); page.setDefaultTimeout(150000);
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  const I = await page.evaluate(() => { const W = window.__shop.wardrobe, A = window.__arcade, p = new A.THREE.Vector3(); A.scene.getObjectByName('wardrobeSign').getWorldPosition(p); const wx = p.x - W.x; return { x: W.x, z: W.z, w: W.w, d: W.d, wx }; });
  chk(await page.evaluate(() => document.getElementById('wardBtn').textContent === '👕 ACCESSORIES'), 'button reads ACCESSORIES');
  const sides = { front: [I.x - I.d - 0.9, I.z], back: [I.x + 0.9, I.z], north: [I.x - 0.3, I.z - I.w - 0.8], south: [I.x - 0.3, I.z + I.w + 0.8] };
  for (const [n, [lx, lz]] of Object.entries(sides)) {
    await page.evaluate(([x, z]) => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.monkey.position.set(x, 0, z); }, [lx + I.wx, lz]);
    for (let k = 0; k < 2; k++) {
      await page.waitForFunction(() => document.querySelector('#wardBtn.on'), null, { timeout: 8000 }).catch(() => {});
      const b = await page.locator('#wardBtn').boundingBox(); if (!b) { chk(false, n + ': button shown'); break; }
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(1000);
      chk(await page.evaluate(() => window.__wardrobe.isOpen), n + ' tap ' + (k + 1) + ': accessories panel opens and stays open');
      await page.evaluate(() => window.__wardrobe.close()); await page.waitForTimeout(500); }
  }
  await page.evaluate(([x, z]) => { const A = window.__arcade, s = A.scene.getObjectByName('wardrobeSign'), p = new A.THREE.Vector3(); s.getWorldPosition(p); A.monkey.position.set(x, 0, z);
    window.__camOverride = { pos: [p.x - 4.6, 2.3, p.z], at: [p.x, 1.7, p.z], showMonkey: true }; }, [sides.front[0] + I.wx, I.z]);
  await page.waitForTimeout(1500); await page.screenshot({ path: '/workspace/galactic-shop/shots/accessories_island.png' });
  chk(!errors.length, 'no page errors', errors.slice(0, 2));
  await close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1); })();
