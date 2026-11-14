// t812u: on phones a full-screen "Turn your phone sideways" screen shows before the start screen and in the arcade whenever the phone
// is upright; turning it landscape reveals the start screen / arcade. Upright cabinets still play upright (covered by portrait_three.js
// and monkey_view.js); iPad and desktop never see it. No screenshots.  NOSHOTS=1 node test/turn_sideways.js
const { open } = require('./lib');
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const S = () => {
  const h = document.getElementById('turnHint'), r = h.getBoundingClientRect(), on = h.classList.contains('on') && getComputedStyle(h).display !== 'none';
  const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2), inp = document.getElementById('gaIn');
  let inTop = null; if (inp) { const b = inp.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); inTop = e === inp; }
  return { on, full: on && r.left <= 0 && r.top <= 0 && r.right >= innerWidth && r.bottom >= innerHeight, covers: !!(top && h.contains(top)), icon: !!h.querySelector('.thPh'), text: h.textContent.replace(/\s+/g, ' ').trim(),
    start: !!document.getElementById('gaP'), inTop, w: innerWidth, h: innerHeight };
};
(async () => {
  // phone: start screen
  let o = await open({ phone: true, start: true, w: 390, h: 844, ua: ANDROID }), page = o.page;
  await page.waitForFunction(() => document.getElementById('gaIn'), null, { timeout: 90000 }); await page.waitForTimeout(300);
  let a = await page.evaluate(S);
  chk(a.on && a.full && a.covers && a.icon && /turn your phone sideways/i.test(a.text) && a.start, 'phone upright: full-screen turn-sideways screen (rotating phone icon) covers the start screen', a);
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(400);
  a = await page.evaluate(S);
  chk(!a.on && a.inTop === true, 'phone turned sideways: the start screen shows and the name field is usable', a);
  // arcade
  await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; const p = document.getElementById('gaP'); if (p) p.remove(); });
  await page.waitForTimeout(200);
  a = await page.evaluate(S); chk(!a.on, 'arcade in landscape: no turn screen', a);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  a = await page.evaluate(S); chk(a.on && a.full && a.covers, 'arcade turned upright: the full-screen turn-sideways screen blocks portrait play', a);
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(400);
  a = await page.evaluate(S); chk(!a.on, 'arcade back to landscape: turn screen gone', a);
  let errs = o.errors.filter(x => !/Failed to load resource/.test(x)); chk(!errs.length, 'phone: no page errors', errs); await o.close();
  // iPad + desktop: never
  o = await open({ phone: true, start: true, w: 820, h: 1180, ua: IPAD }); page = o.page;
  await page.waitForFunction(() => document.getElementById('gaIn'), null, { timeout: 90000 }); await page.waitForTimeout(300);
  a = await page.evaluate(S); chk(!a.on && a.inTop === true, 'iPad upright: no turn screen, start screen usable', a); await o.close();
  o = await open({ start: true, w: 700, h: 900 }); page = o.page;
  await page.waitForFunction(() => document.getElementById('gaIn'), null, { timeout: 90000 }); await page.waitForTimeout(300);
  a = await page.evaluate(S); chk(!a.on, 'desktop tall window: no turn screen', a); await o.close();
  console.log(ok ? 'ALL PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL', e); process.exit(1); });
