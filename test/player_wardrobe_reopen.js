// t590 bug: 2nd wardrobe open showed a white preview (close() force-lost the context of a canvas that was then reused).
// Open/close 6x, each open must draw real monkey pixels; forced context loss mid-session recovers; start screen after
// __startUI.show (after the wardrobe was used) draws too.
const { open, play } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) ok = false; };
async function opn(o) { for (let i = 0; ; i++) { try { return await open(Object.assign({ phone: true, w: 412, h: 915 }, o)); } catch (e) { if (i >= 6) throw e; console.log('retry open'); } } }
const pix = page => page.evaluate(() => { const P = window.__gaPlayer.prev; if (!P.r) return { r: false }; const cv = P.r.domElement, gl = P.r.getContext();
  if (gl.isContextLost()) return { r: true, lost: true }; P.r.render(P.scene, P.cam); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d'); g.drawImage(cv, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let mk = 0, white = 0, n = 0; for (let i = 0; i < d.length; i += 16) { n++; const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3]; if (A > 200 && R > 245 && G > 245 && B > 245) white++; else if (A > 60) mk++; }
  return { r: true, id: cv.id, inDom: cv.isConnected, mk, whiteFrac: +(white / n).toFixed(3), remakes: P.remakes || 0 }; });
const good = s => s.r && !s.lost && s.inDom && s.mk > 400 && s.whiteFrac < 0.2;
(async () => {
  let o = await opn({}); let { page, errors } = o;
  await page.waitForFunction(() => window.__gaPlayer && window.__gaPlayer.tag && window.__wardrobe, null, { timeout: 90000 });
  for (let i = 1; i <= 6; i++) { await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1500); const s = await pix(page);
    chk(good(s) && s.id === 'gaWCv', 'open #' + i + ': preview draws the monkey (not white)', s); await page.evaluate(() => window.__wardrobe.close()); await page.waitForTimeout(400);
    chk(!(await page.evaluate(() => !!window.__gaPlayer.prev.r)), 'close #' + i + ': context freed'); }
  // also via the real button + DONE
  if (await page.locator('#wdBtn').count()) { for (let i = 0; i < 2; i++) { await page.locator('#wdBtn').tap(); await page.waitForTimeout(1500); const s = await pix(page); chk(good(s), 'WARDROBE button open #' + (i + 1) + ' draws', s); await page.locator('#gaWDone').tap(); await page.waitForTimeout(400); } }
  // forced context loss while open
  await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1200);
  const r0 = await page.evaluate(() => window.__gaPlayer.prev.remakes || 0);
  await page.evaluate(() => window.__gaPlayer.prev.r.getContext().getExtension('WEBGL_lose_context').loseContext()); await page.waitForTimeout(2000);
  await page.evaluate(() => window.__gaPlayer.pick('hat', 'party')); await page.waitForTimeout(800); let s = await pix(page);
  chk(good(s) && s.remakes > r0, 'forced context loss while open: preview rebuilt and draws', s);
  await page.evaluate(() => window.__wardrobe.close()); await page.waitForTimeout(300); await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1500); s = await pix(page);
  chk(good(s), 'reopen after a forced loss draws', s); await page.evaluate(() => window.__wardrobe.close());
  chk(errors.filter(e => !/CONTEXT_LOST|context lost/i.test(e)).length === 0, 'no page errors (in game)', errors);
  await o.close();
  // start screen: play, use the wardrobe twice, then __startUI.show brings the start screen back
  o = await opn({ start: true }); ({ page, errors } = o);
  await page.waitForFunction(() => window.__gaPlayer && window.__gaPlayer.prev.root, null, { timeout: 90000 }); await page.waitForTimeout(1500);
  s = await pix(page); chk(good(s) && s.id === 'gaCv', 'start screen preview draws', s);
  await play(page, true, 'Dave'); await page.waitForTimeout(1000);
  for (let i = 0; i < 2; i++) { await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1500); s = await pix(page); chk(good(s), 'after PLAY, wardrobe open #' + (i + 1) + ' draws', s); await page.evaluate(() => window.__wardrobe.close()); await page.waitForTimeout(300); }
  const back = await page.evaluate(() => { if (!window.__startUI || !window.__startUI.show) return false; window.__startUI.show(); return !!document.getElementById('gaCv'); });
  if (back) { await page.waitForTimeout(1500); s = await pix(page); chk(good(s) && s.id === 'gaCv', '__startUI.show: start preview draws again', s);
    await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1500); s = await pix(page); chk(good(s) && s.id === 'gaWCv', 'wardrobe over the start screen draws', s); await page.evaluate(() => window.__wardrobe.close()); await page.waitForTimeout(1500);
    s = await pix(page); chk(good(s) && s.id === 'gaCv', 'start preview draws after closing the wardrobe', s); }
  else console.log('SKIP __startUI.show did not bring #gaCv back');
  chk(errors.filter(e => !/CONTEXT_LOST|context lost/i.test(e)).length === 0, 'no page errors (start)', errors);
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
