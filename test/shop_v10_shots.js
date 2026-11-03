const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/';
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 491, h: 1024 });
  const frames = n => page.evaluate(async n => { const A = window.__arcade, f = A.stats.frames; while (A.stats.frames < f + n) await new Promise(r => setTimeout(r, 50)); }, n);
  const shot = async (name, pos, at) => { await page.evaluate(([pos, at]) => { window.__camOverride = { pos, at, showMonkey: false }; }, [pos, at]); await frames(4); await page.waitForTimeout(1200); await page.screenshot({ path: S + 'v10_' + name + '.png' }); };
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(80, 0, 6); A.st.vel.set(0, 0, 0); });
  await shot('shelf_whole', [80, 2.6, 9.5], [80, 2.4, -3.2]);
  await shot('mars_roadster', [78.85, 2.3, 0.6], [79.6, 2.15, -3.2]);
  await shot('vikings', [76.55, 2.95, -0.9], [76.55, 2.85, -3.2]);
  await shot('desk', [81.6, 1.5, 1.1], [84.45, 0.7, -1.95]);
  console.log('errors', errors.length, errors.join(' | ')); await close();
})();
