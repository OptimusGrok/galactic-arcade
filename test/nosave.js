// AUTOSAVE (t194u, replaces the old no-autosave rule): tickets, Viking tickets, cash, bought prizes, the held plush, floor + walls
// and machine credits all survive a reload on this device; per-run cabinet progress is cleared; save slots still SAVE / LOAD as
// manual extras; no unsaved-progress prompt any more; cash still refills to $5 every hour. node test/nosave.js [phone]
const { open } = require('./lib');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const o = await open(PHONE ? { phone: true, w: 412, h: 860, unloadWarn: true } : { unloadWarn: true }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', ev = (f, a) => page.evaluate(f, a);
  const boot = async () => { await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await page.waitForTimeout(2000); };
  // progress earned in a session
  await ev(() => { localStorage.setItem('neonarcade.tickets', '343'); window.__neonSync(); localStorage.setItem('neonarcade.vikingTickets', '2'); window.__kiosk.setState({ bal: 0, at: Date.now(), pending: 0 });
    localStorage.setItem('neonarcade.prizes', '{"monkeyGold":2}'); window.__shop.hold('monkeyGold'); window.__arcade.setFloor('carpet'); window.__arcade.play.machines.orc.credits = 2; window.__arcade.play.saveCredits();
    localStorage.setItem('arcade_orc_progress', '{"x":1}'); });
  await page.waitForTimeout(1200);
  const st = () => ev(() => ({ t: window.__arcade.play.tickets.total, v: window.__arcade.play.viking.total, cash: window.__kiosk.C.bal, floor: window.__arcade.floor, cr: window.__arcade.play.machines.orc.credits,
    pz: JSON.parse(localStorage.getItem('neonarcade.prizes') || '{}').monkeyGold, held: window.__shop.held, ho: !!window.__shop.heldObj, orc: localStorage.getItem('arcade_orc_progress') }));
  let dlg = null; page.on('dialog', d => { dlg = d.type(); d.accept(); });
  await page.reload(); await boot();
  let s = await st();
  chk(s.t === 343 && s.v === 2 && s.cash === 0 && s.floor === 'carpet' && s.cr === 2, 'reload keeps tickets, Viking tickets, cash, floor and machine credits ' + JSON.stringify(s));
  chk(s.pz === 2 && s.held === 'monkeyGold' && s.ho, 'reload keeps bought prizes and the held plush (shop restored live) ' + JSON.stringify(s));
  chk(s.orc === null, 'per-run cabinet progress is still cleared on a fresh visit');
  chk(dlg === null, 'no unsaved-progress prompt on reload (everything autosaves)');
  const hn = await ev(() => { window.__arcade.play.home.ask(true); const t = document.getElementById('homeN').textContent; window.__arcade.play.home.ask(false); return t; });
  chk(!/UNSAVED/.test(hn), 'Back to title no longer warns about unsaved progress: ' + hn);
  // cash refill rule unchanged
  const k = await ev(() => { const a = window.__kiosk.C.at, out = []; window.__kioskNow = () => a + 36e5 + 500; window.__kiosk.showCash(); out.push(window.__kiosk.C.bal); window.__kiosk.setState({ bal: 5, at: a, pending: 0 }); window.__kioskNow = () => a + 3 * 36e5; window.__kiosk.showCash(); out.push(window.__kiosk.C.bal); delete window.__kioskNow; window.__kiosk.setState({ bal: 0, at: Date.now(), pending: 0 }); return out; });
  chk(k.join() === '5,5', 'cash refills to $5 after an hour, never above $5 ' + k);
  // save slots: manual extras
  await ev(() => window.__opts.show(true)); await page.waitForTimeout(400);
  await ev(() => window.__opts.save(1)); await page.waitForTimeout(300); await page.screenshot({ path: 'shots/options_saves' + sfx + '.png' }); await ev(() => window.__opts.show(false));
  await ev(() => { localStorage.setItem('neonarcade.tickets', '7'); window.__neonSync(); });
  await page.reload(); await boot();
  chk((await st()).t === 7, 'later progress (7 tickets) autosaved too');
  await ev(() => window.__opts.load(1)); await page.waitForTimeout(500);
  s = await st(); const hud = await ev(() => document.getElementById('tixN').textContent);
  chk(s.t === 343 && hud === '343' && s.pz === 2 && s.held === 'monkeyGold', 'LOAD slot 1 still restores its snapshot (343 tickets, prizes, held plush) ' + JSON.stringify(s));
  await page.reload(); await boot();
  chk((await st()).t === 343, 'the loaded slot then autosaves as the current progress');
  await ev(() => localStorage.removeItem('neonarcade.save.1'));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await ev(() => { window.__noUnloadWarn = 1; }); await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
