// NO AUTO-SAVE: progress is session-only until SAVEd to a slot; old auto-saved progress discarded on load (slots untouched);
// cash refills to $5 every hour (never stacks); unsaved warning on Back to title + beforeunload. node test/nosave.js [phone]
const { open } = require('./lib');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const o = await open(PHONE ? { phone: true, w: 412, h: 860, unloadWarn: true } : { unloadWarn: true }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', ev = (f, a) => page.evaluate(f, a);
  const cdp = await page.context().newCDPSession(page); await cdp.send('DOMStorage.enable');
  const origin = new URL(page.url()).origin;
  const real = async () => { const r = await cdp.send('DOMStorage.getDOMStorageItems', { storageId: { securityOrigin: origin, isLocalStorage: true } }); return Object.fromEntries(r.entries); };
  // an old auto-save (343 tickets etc.) + an existing slot, then a "first load after the update"
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('neonarcade.tickets', '343'); localStorage.setItem('neonarcade.vikingTickets', '2'); localStorage.setItem('neonarcade.cash', JSON.stringify({ bal: 1, at: Date.now() })); localStorage.setItem('neonarcade.kioskPending', '10'); localStorage.setItem('neonarcade.shieldOpen', '1'); localStorage.setItem('arcade_orc_progress', '{"x":1}'); localStorage.setItem('neonarcade.prizes', '{"grok":1}'); localStorage.setItem('neonarcade.held', 'grok');
    localStorage.setItem('neonarcade.save.3', JSON.stringify({ v: 1, at: 1, tickets: 50, viking: 0, cash: { bal: 4, at: 1 }, kioskPending: 0, credits: {}, shield: false, room: 'ROOM 1' })); localStorage.setItem('neonarcade.floor', 'carpet'); });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await page.waitForTimeout(2500);
  let s = await ev(() => ({ t: window.__arcade.play.tickets.total, v: window.__arcade.play.viking.total, cash: window.__kiosk.C.bal, pend: window.__kiosk.pending, shield: window.__arcade.shield.open, disc: window.__sess.discarded, floor: window.__arcade.floor }));
  let r = await real();
  chk(s.t === 1 && s.v === 0 && s.cash === 5 && s.pend === 0 && !s.shield && s.disc.length === 7, 'first load after the update: old auto-saved progress discarded, fresh game (1 ticket, $5, shield up) ' + JSON.stringify(s));
  chk(r['neonarcade.save.3'] && JSON.parse(r['neonarcade.save.3']).tickets === 50 && s.floor === 'carpet' && !('arcade_orc_progress' in r), 'existing save slot and settings kept; per-run cabinet progress cleared');
  const pz = await ev(() => ({ p: localStorage.getItem('neonarcade.prizes'), h: window.__shop && window.__shop.held, ho: !!(window.__shop && window.__shop.heldObj) }));
  chk(!pz.p && !pz.h && !pz.ho && !('neonarcade.prizes' in r) && !('neonarcade.held' in r), 'old auto-saved prizes + held plush discarded before the shop set up ' + JSON.stringify(pz));
  // earn in the session: nothing reaches storage
  await ev(() => { localStorage.setItem('neonarcade.tickets', '9'); window.__neonSync(); window.__kiosk.setState({ bal: 0, at: Date.now(), pending: 0 }); localStorage.setItem('neonarcade.prizes', '{"monkeyGold":2}'); window.__shop.hold('monkeyGold'); });
  await page.waitForTimeout(1500); r = await real();
  chk(!('neonarcade.prizes' in r) && !('neonarcade.held' in r), 'bought prize + held plush not auto-saved');
  s = await ev(() => ({ t: window.__arcade.play.tickets.total, ls: localStorage.getItem('neonarcade.tickets'), dirty: window.__sess.dirty, cash: document.getElementById('cash').textContent }));
  chk(s.t === 9 && s.ls === '9' && !['neonarcade.tickets', 'neonarcade.cash', 'neonarcade.kioskPending', 'neonarcade.vikingTickets', 'neonarcade.shieldOpen'].some(k => k in r), 'session progress (9 tickets, $0) lives in memory only, nothing auto-saved ' + JSON.stringify(s));
  chk(/\$0\+\$5 in 59m/.test(s.cash), 'cash countdown: +$5 in 59m ' + s.cash);
  await page.screenshot({ path: 'shots/cash_countdown' + sfx + '.png', clip: { x: (PHONE ? 412 : 1280) - 200, y: 0, width: 200, height: 110 } });
  const k = await ev(() => { const a = window.__kiosk.C.at, out = []; window.__kioskNow = () => a + 36e5 + 500; window.__kiosk.showCash(); out.push(window.__kiosk.C.bal); window.__kiosk.setState({ bal: 5, at: a, pending: 0 }); window.__kioskNow = () => a + 3 * 36e5; window.__kiosk.showCash(); out.push(window.__kiosk.C.bal); window.__kiosk.setState({ bal: 3, at: a, pending: 0 }); window.__kioskNow = () => a + 36e5 + 10; window.__kiosk.showCash(); out.push(window.__kiosk.C.bal); delete window.__kioskNow; window.__kiosk.setState({ bal: 0, at: Date.now(), pending: 0 }); return out; });
  chk(k.join() === '5,5,5', 'cash refills to $5 after an hour, never above $5, never stacks ' + k);
  chk(s.dirty, 'session marked unsaved');
  await ev(() => window.__arcade.play.home.ask(true)); await page.waitForTimeout(300);
  const hn = await ev(() => document.getElementById('homeN').textContent); chk(/UNSAVED PROGRESS/.test(hn), 'Back to title warns about unsaved progress: ' + hn);
  await ev(() => window.__arcade.play.home.ask(false));
  // beforeunload prompt while unsaved
  if (PHONE) await page.tap('canvas').catch(() => {}); else await page.mouse.click(300, 300);
  let dlg = null; page.once('dialog', d => { dlg = d.type(); d.dismiss(); });
  await page.reload({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(800);
  const still = await ev(() => window.__arcade.play.tickets.total).catch(() => null);
  chk(dlg === 'beforeunload' && still === 9, 'leaving with unsaved progress asks first (dialog: ' + dlg + ', stayed with ' + still + ' tickets)');
  // SAVE (Options panel) -> clean; screenshot the panel
  await ev(() => window.__opts.show(true)); await page.waitForTimeout(500);
  await ev(() => window.__opts.save(1)); await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/options_saves' + sfx + '.png' });
  s = await ev(() => ({ dirty: window.__sess.dirty, slot: JSON.parse(localStorage.getItem('neonarcade.save.1')) }));
  chk(!s.dirty && s.slot.tickets === 9 && s.slot.cash.bal === 0, 'SAVE writes the slot (9 tickets, $0 + its timer) and clears the warning');
  await ev(() => window.__opts.show(false));
  let d2 = null; page.once('dialog', d => { d2 = d.type(); d.accept(); });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await page.waitForTimeout(1500);
  s = await ev(() => ({ t: window.__arcade.play.tickets.total, cash: window.__kiosk.C.bal }));
  s.pz = await ev(() => [localStorage.getItem('neonarcade.prizes'), window.__shop.held, !!window.__shop.heldObj]);
  chk(d2 === null && s.t === 1 && s.cash === 5 && !s.pz[0] && !s.pz[1] && !s.pz[2], 'saved session reloads without a prompt and starts fresh ' + JSON.stringify(s));
  await ev(() => window.__opts.load(1)); await page.waitForTimeout(500);
  s = await ev(() => ({ t: window.__arcade.play.tickets.total, cash: window.__kiosk.C.bal, hud: document.getElementById('tixN').textContent, dirty: window.__sess.dirty, cd: document.getElementById('cash').textContent }));
  s.pz = await ev(() => [JSON.parse(localStorage.getItem('neonarcade.prizes') || '{}').monkeyGold, window.__shop.held, !!window.__shop.heldObj, document.getElementById('invPz') ? document.getElementById('invPz').textContent.length : -1]);
  chk(s.pz[0] === 2 && s.pz[1] === 'monkeyGold' && s.pz[2], 'LOAD restores bought prizes and the held plush live ' + JSON.stringify(s.pz));
  chk(s.t === 9 && s.hud === '9' && s.cash === 0 && /in \d+m/.test(s.cd) && !s.dirty, 'LOAD slot 1 restores 9 tickets, $0 and its refill timer ' + JSON.stringify(s));
  await ev(() => localStorage.removeItem('neonarcade.save.1'));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await ev(() => { window.__noUnloadWarn = 1; }); await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
