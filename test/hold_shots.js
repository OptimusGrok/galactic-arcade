// screenshots: fist-held candy R+L, hug plushes, backpack chips with R/L badges.
// node test/hold_shots.js -> /workspace/galactic-shop/shots/hold_*.png (phone 491x1024; chips at 390x844)
const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/';
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 491, h: 1024 });
  await page.evaluate(() => { localStorage.setItem('neonarcade.prizes', JSON.stringify({ monkeyBrown: 1, monkeyGold: 1, monkeySpace: 1, grok: 1, cherry: 2, jaw: 1, swirl: 1, gummy: 1 })); });
  const frames = n => page.evaluate(async n => { const A = window.__arcade, f = A.stats.frames; while (A.stats.frames < f + n) await new Promise(r => setTimeout(r, 50)); }, n);
  const pose = (extra = 0) => page.evaluate((extra) => { const A = window.__arcade; A.monkey.position.set(80 + 1.2, 0, 1.6); A.st.vel.set(0, 0, 0); A.st.face = 0.35; A.monkey.rotation.y = 0.35;
    // three-quarter, whole monkey + hands in frame
    window.__camOverride = { pos: [80 + 1.2 + 0.85 + extra, 1.35, 1.6 + 2.55], at: [80 + 1.2, 0.85, 1.6], showMonkey: true }; }, extra);

  for (const [id, f] of [['monkeyBrown', 'hold_monkey_brown'], ['monkeyGold', 'hold_monkey_gold'], ['monkeySpace', 'hold_monkey_space'], ['grok', 'hold_grok']]) {
    await page.evaluate(id => { window.__shop.hold(id); }, id); await pose();
    await frames(5); await page.waitForTimeout(350); await page.screenshot({ path: S + f + '.png' }); }

  // two hands: cherry R, jaw L — closed fists, sticks gripped
  await page.evaluate(() => { window.__shop.hold('cherry', 'R'); window.__shop.hold('jaw', 'L'); }); await pose(0.15);
  await frames(6); await page.waitForTimeout(400); await page.screenshot({ path: S + 'hold_hands_rl.png' });

  // also swirl + gummy to verify other hand kinds
  await page.evaluate(() => { window.__shop.hold('swirl', 'R'); window.__shop.hold('gummy', 'L'); }); await pose(0.15);
  await frames(5); await page.waitForTimeout(300); await page.screenshot({ path: S + 'hold_hands_candy2.png' });

  await page.evaluate(() => { window.__camOverride = null; window.__shop.hold('cherry', 'R'); window.__shop.hold('jaw', 'L'); const b = document.getElementById('bPack'); if (b) b.click(); else if (window.__inv) window.__inv.setOpen(true); });
  await frames(4); await page.waitForTimeout(700);
  await page.screenshot({ path: S + 'hold_inventory.png' });
  // dedicated chips shot at 390x844 — crop/viewport already phone; retake after ensuring badges
  const chipOk = await page.evaluate(() => {
    const badges = [...document.querySelectorAll('.pzSlot')].map(el => el.textContent);
    const away = [...document.querySelectorAll('.pzAway .pzU')].map(el => el.textContent.trim());
    return { badges, away, hasRL: badges.includes('R') && badges.includes('L'), both: away.some(t => /both/i.test(t)) };
  });
  console.log('chipsUI', JSON.stringify(chipOk));
  await page.screenshot({ path: S + 'hold_chips.png' });

  console.log('errors', errors.length, errors.join(' | ')); await close();
  if (!chipOk.hasRL || !chipOk.both) { console.error('chip UI incomplete'); process.exit(1); }
})();
