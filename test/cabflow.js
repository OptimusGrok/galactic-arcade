// shared helpers for the cabinet play tests (monkeyplay / berserkerplay)
exports.helpers = (page, PHONE) => ({
  goTo: name => page.evaluate(n => { const A = window.__arcade, c = A.playables.find(k => k.name === n), u = c.userData; window.__noAdapt = 1; A.st.fp = false;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; }, name),
  ui: () => page.evaluate(() => ({ on: document.getElementById('playUI').classList.contains('on'), txt: document.getElementById('bPlay').textContent, cr: document.getElementById('credit').textContent, near: window.__arcade.play.near() })),
  press: async () => { if (PHONE) await page.tap('#bPlay'); else await page.keyboard.press('Enter'); },
  zoomToDemo: async () => { await page.waitForFunction(() => window.__arcade.play.mode === 'game' && window.__arcade.play.sub === 'demo' && document.getElementById('game').classList.contains('on'), null, { timeout: 40000 }); await page.waitForTimeout(1500); },
  insert: async () => { if (PHONE) await page.tap('#bTicket'); else await page.click('#bTicket'); await page.waitForTimeout(400); },
  state: () => page.evaluate(() => { const p = window.__arcade.play; return { mode: p.mode, sub: p.sub, tickets: p.tickets.total, need: p.need, ls: +localStorage.getItem('neonarcade.tickets') }; }),
});
