// t249: the WARDROBE preview shows the whole monkey (not just the floating hat) from both entry points: the room 1 HUD button
// and the prize shop's wardrobe island button. Cause of the bug: after PLAY the start-screen teleport-out leaves player.js TP.gone
// = true, so the shared preview renderer keeps clipping the body away.
// Measures the screenshot pixels inside #gaWCv's body area: share of pixels far from the empty beam colour. node test/wardrobe_preview.js
const { open, play } = require('./lib');
(async () => { const { page, errors, close } = await open({ phone: true, start: true, w: 412, h: 915 }); page.setDefaultTimeout(150000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForTimeout(1000); await play(page, true, 'Dave'); await page.waitForTimeout(2500);
  const body = async () => { const r = await page.evaluate(() => { const b = document.getElementById('gaWCv').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
    const clip = { x: r[0] + r[2] * 0.3, y: r[1] + r[3] * 0.4, width: r[2] * 0.4, height: r[3] * 0.4 }, png = (await page.screenshot({ clip })).toString('base64');
    return page.evaluate(async b64 => { const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, im.width, im.height).data; let far = 0, n = 0, sum = [0, 0, 0];
      const bins = {}; for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5); bins[k] = (bins[k] || 0) + 1; }
      const bg = Object.entries(bins).sort((a, b) => b[1] - a[1])[0][0].split(',').map(v => v * 32 + 16);   // the most common colour (the empty beam)
      for (let i = 0; i < d.length; i += 4) { n++; if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 90) far++; sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; }
      return { far: +(far / n).toFixed(3), mean: sum.map(v => Math.round(v / n)) }; }, png); };
  const check = async (where, shot) => { await page.waitForTimeout(3000); const s = await body(); await page.screenshot({ path: `shots/${shot}` });
    chk(await page.evaluate(() => window.__wardrobe.isOpen), where + ': wardrobe open');
    chk(s.far > 0.2, where + ': monkey body visible in the preview (share of non-beam pixels in the body area ' + s.far + ')'); return s; };
  await page.evaluate(() => window.__wardrobe.open()); const a = await check('room 1 button', 'wardrobe_preview_room1.png');
  await page.evaluate(() => window.__wardrobe.close()); await page.waitForTimeout(800);
  await page.evaluate(() => { const A = window.__arcade, w = A.scene.getObjectByName('wardrobeSign').parent, p = new A.THREE.Vector3(); w.getWorldPosition(p); A.st.vel.set(0, 0, 0); A.monkey.position.set(p.x - 1.6, 0, p.z); A.st.face = -Math.PI / 2; });
  await page.waitForFunction(() => document.querySelector('#wardBtn.on'), null, { timeout: 20000 }).catch(() => {});
  chk(await page.evaluate(() => !!document.querySelector('#wardBtn.on')), 'shop: island WARDROBE button shown');
  await page.evaluate(() => window.__shop.wardrobe.open()); await check('shop island button', 'wardrobe_preview_shop.png');
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1); })();
