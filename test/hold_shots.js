// screenshots of the monkey holding prizes. node test/hold_shots.js [url] -> /workspace/galactic-shop/shots/hold_*.png (phone 491x1024)
const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/', URL_ = process.argv[2];
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 491, h: 1024, url: URL_ });
  await page.evaluate(() => { localStorage.setItem('neonarcade.prizes', JSON.stringify({ monkeyBrown: 1, monkeyGold: 1, monkeySpace: 1, grok: 1, cherry: 2 })); });
  const frames = n => page.evaluate(async n => { const A = window.__arcade, f = A.stats.frames; while (A.stats.frames < f + n) await new Promise(r => setTimeout(r, 50)); }, n);
  for (const [id, f] of [['monkeyBrown', 'hold_monkey_brown'], ['monkeyGold', 'hold_monkey_gold'], ['monkeySpace', 'hold_monkey_space'], ['grok', 'hold_grok']]) {
    await page.evaluate(id => { const A = window.__arcade; window.__shop.hold(id); A.monkey.position.set(80 + 1.2, 0, 1.6); A.st.vel.set(0, 0, 0); A.st.face = 0.35; A.monkey.rotation.y = 0.35;
      window.__camOverride = { pos: [80 + 1.2 + 0.75, 1.45, 1.6 + 2.35], at: [80 + 1.2, 0.95, 1.6], showMonkey: true }; }, id);
    await frames(4); await page.waitForTimeout(400); await page.screenshot({ path: S + f + '.png' }); }
  await page.evaluate(() => { window.__camOverride = { pos: [80, 1.6, 9], at: [80, 8.5, 0.5], showMonkey: false }; }); await frames(4); await page.waitForTimeout(400); await page.screenshot({ path: S + 'ceiling_space.png' });
  await page.evaluate(() => { window.__camOverride = null; window.__shop.hold('grok'); const b = document.getElementById('bPack'); if (b) b.click(); }); await frames(3); await page.waitForTimeout(600);
  await page.screenshot({ path: S + 'hold_inventory.png' });
  console.log('errors', errors.length, errors.join(' | ')); await close();
})();
