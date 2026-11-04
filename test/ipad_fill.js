// iPad fill: canvas (CSS box + drawing buffer) must cover the full viewport at tablet/phone sizes and after resizes. node test/ipad_fill.js
const { open } = require('./lib');
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open({ phone: true, w: 768, h: 1024 }); const { page } = o; page.setDefaultTimeout(120000);
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  const m = () => page.evaluate(() => { const c = document.querySelector('body > canvas'), r = c.getBoundingClientRect();
    return { w: innerWidth, h: innerHeight, cw: r.width, ch: r.height, top: r.top, bw: c.width, bh: c.height }; });
  const fits = v => v.top === 0 && Math.abs(v.cw - v.w) <= 1 && Math.abs(v.ch - v.h) <= 1 && Math.abs(v.bw / v.bh - v.w / v.h) < 0.02;
  for (const [w, h] of [[768, 1024], [820, 1180], [1024, 1366], [1366, 1024], [412, 915], [712, 700], [712, 1024]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(1500);
    const v = await m(); chk(fits(v), `${w}x${h} canvas fills viewport ${JSON.stringify(v)}`);
    if (w >= 700) await page.screenshot({ path: `/workspace/ga-ipad/shots/ipad_${w}x${h}.png` });
  }
  await o.close(); process.exit(ok ? 0 : 1);
})();
