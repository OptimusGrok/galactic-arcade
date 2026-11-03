// Start-screen turntable preview wears the chosen hat: saved hat on a fresh load, each pick immediately, and still after the
// preview's WebGL context is lost (phones drop the 2nd context; the canvas used to freeze on its last frame).
const { open } = require('./lib');
const OUT = '/workspace/galactic-shop/shots/';
(async () => { let o; for (let i = 0; ; i++) { try { o = await open({ phone: true, start: true, w: 412, h: 915 }); break; } catch (e) { if (i > 3) throw e; console.log('retry open'); } } const { page, errors } = o;
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  await page.evaluate(() => localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'helmet', hoodie: 'navy', fur: 'brown', shoes: 'red' })));
  await page.reload({ timeout: 120000 }); await page.waitForFunction(() => window.__gaPlayer && window.__gaPlayer.prev.root, null, { timeout: 90000 }); await page.waitForTimeout(2500);
  // what the preview canvas actually shows: pixel count above the head that is helmet-ish (light) or crown-ish (gold)
  const seen = () => page.evaluate(() => { const P = window.__gaPlayer.prev, r = P.root, w = {}; r.traverse(x => { if (x.name === 'gaCrown') w.crown = x.visible; if (x.name === 'gaHelmet') w.helmet = x.visible; if (x.userData.gaCap) w.cap = x.visible; });
    const cv = P.r.domElement, c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const g = c.getContext('2d'); P.r.render(P.scene, P.cam); g.drawImage(cv, 0, 0);
    const d = g.getImageData(0, 0, c.width, Math.floor(c.height * 0.3)).data; let gold = 0, light = 0, pink = 0; for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3]; if (A < 40) continue; if (R > 170 && G > 120 && B < 90) gold++; if (R > 190 && G > 190 && B > 190) light++; if (R > 200 && G < 120 && B > 120) pink++; }
    return Object.assign(w, { gold, light, pink, lost: P.lost || 0, remakes: P.remakes || 0 }); });
  let s = await seen(); chk(s.helmet && !s.crown && !s.cap && s.light > 30, 'fresh load: saved helmet on the preview head', s); await page.screenshot({ path: OUT + 'start_helmet.png' });
  await page.evaluate(() => window.__gaPlayer.pick('hat', 'crown')); await page.waitForTimeout(700); s = await seen(); chk(s.crown && !s.helmet && s.gold > 30, 'pick crown: shows at once', s); await page.screenshot({ path: OUT + 'start_crown.png' });
  await page.evaluate(() => window.__gaPlayer.pick('hat', 'cap')); await page.waitForTimeout(700); s = await seen(); chk(s.cap && !s.crown && s.pink > 30, 'pick cap', s);
  await page.evaluate(() => window.__gaPlayer.pick('hat', 'none')); await page.waitForTimeout(700); s = await seen(); chk(!s.cap && !s.crown && !s.helmet && s.gold < 10, 'pick none', s);
  // lose the preview context like a phone would, then pick
  await page.evaluate(() => { const x = window.__gaPlayer.prev.r.getContext().getExtension('WEBGL_lose_context'); x.loseContext(); });
  await page.waitForTimeout(1500); await page.evaluate(() => window.__gaPlayer.pick('hat', 'crown')); await page.waitForTimeout(1500);
  s = await seen(); chk(s.lost === 1 && s.remakes === 1 && s.crown && s.gold > 30, 'after a lost preview context: rebuilt and the crown shows', s);
  await page.screenshot({ path: '/tmp/after_loss.png' });
  chk(errors.filter(e => !/CONTEXT_LOST|context lost/i.test(e)).length === 0, 'no page errors', errors);
  await o.close(); process.exit(ok ? 0 : 1); })();
