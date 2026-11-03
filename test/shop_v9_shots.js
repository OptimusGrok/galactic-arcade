// v9 shop screenshots (phone portrait 491x1024). node test/shop_v9_shots.js [url] [prefix]
const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/', URL_ = process.argv[2] || undefined, PRE = process.argv[3] || 'v9_';
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 491, h: 1024, url: URL_ });
  await page.evaluate(() => { localStorage.setItem('neonarcade.prizes', JSON.stringify({ grok: 1 })); });
  const frames = n => page.evaluate(async n => { const A = window.__arcade, f = A.stats.frames; while (A.stats.frames < f + n) await new Promise(r => setTimeout(r, 50)); }, n);
  const shot = async (name, pos, at, show = false, fn) => { await page.evaluate(([pos, at, show, fn]) => { const A = window.__arcade; if (fn) (0, eval)(fn); window.__camOverride = { pos, at, showMonkey: show }; }, [pos, at, show, fn || null]);
    await frames(4); await page.waitForTimeout(1200); await page.screenshot({ path: S + PRE + name + '.png' }); };
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(80, 0, 6); A.st.vel.set(0, 0, 0); });
  await shot('room', [80.8, 2.4, 9.5], [80.6, 4.3, -3]);
  await shot('roof', [80, 1.6, 9], [80, 14, 3]);
  await shot('title_wall', [80, 3.6, -1.2], [80, 4.0, 14]);
  await shot('shelf_closeup', [80, 2.6, 1.6], [80, 2.4, -3.2]);
  await shot('viking_toys', [76.55, 3.0, -1.85], [76.55, 2.95, -3.2]);
  await page.evaluate(() => { const A = window.__arcade; window.__shop.hold('grok'); A.monkey.position.set(81.2, 0, 1.6); A.st.vel.set(0, 0, 0); A.st.face = 0.35; A.monkey.rotation.y = 0.35; });
  await shot('hold_grok', [81.95, 1.45, 3.95], [81.2, 0.95, 1.6], true);
  console.log('errors', errors.length, errors.join(' | ')); await close();
})();
