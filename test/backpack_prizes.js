// t284u: backpack INVENTORY lists prizes: GROK SHOP prizes (shop.js #invPz), wardrobe items bought (player.js owned()), claw plushes won
// (arcade_clawMachine.collection). Free start items not listed; 'No prizes yet' when empty; panel scrolls on a 390x700 phone.
const { open } = require('./lib');
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open({ phone: true, w: 390, h: 700 }); const p = o.page; p.setDefaultTimeout(60000);
  try {
    await p.evaluate(() => { localStorage.removeItem('neonarcade.prizes'); localStorage.removeItem('arcade_clawMachine.collection'); window.__shop && window.__shop.reloadPrizes && window.__shop.reloadPrizes(); });
    await p.waitForFunction(() => window.__inv && window.__inv.shown, null, { timeout: 30000 });
    const openInv = async () => { await p.evaluate(() => { window.__inv.setOpen(false); window.__inv.setOpen(true); }); await p.waitForTimeout(400); };
    await openInv();
    const e = await p.evaluate(() => { const my = document.getElementById('invMy'), pz = document.getElementById('invPz'); return { t: my.textContent, vis: getComputedStyle(my).display !== 'none', pz: pz ? getComputedStyle(pz).display : 'none', mine: window.__inv.prizes.mine }; });
    chk(e.vis && /No prizes yet/.test(e.t) && e.pz === 'none' && e.mine.length === 0, 'empty state: "No prizes yet" (start items not listed) ' + JSON.stringify(e));
    // buy a GROK SHOP prize (shop.js writes neonarcade.prizes) x2, a wardrobe item through player.js buy(), and win a claw plush
    const r = await p.evaluate(() => { const id = 'grok'; localStorage.setItem('neonarcade.prizes', JSON.stringify({ [id]: 2 })); const gp = window.__gaPlayer;
      localStorage.setItem('neonarcade.tickets', '50'); const t = window.__arcade.play.tickets; if (t) t.total = 50;
      gp.tryOn('hat', 'tophat'); const b = gp.buy(); localStorage.setItem('arcade_clawMachine.collection', JSON.stringify({ penguin: 3 })); return { b, own: gp.owned() }; });
    chk(r.b && r.own.indexOf('hat:tophat') >= 0, 'wardrobe TOP HAT bought via player.js buy() ' + JSON.stringify(r));
    await p.evaluate(() => { try { window.__wardrobe && window.__wardrobe.close && window.__wardrobe.close(); } catch (e) {} });
    await openInv();
    const f = await p.evaluate(() => { const pz = document.getElementById('invPz'), my = document.getElementById('invMy'); return { pz: pz ? pz.textContent : '', pzv: pz ? getComputedStyle(pz).display : 'none', my: my.textContent, order: my.previousElementSibling && my.previousElementSibling.id }; });
    chk(f.pzv !== 'none' && /GROK/i.test(f.pz) && /×2/.test(f.pz), 'shop prize listed with count ' + f.pz.slice(0, 80));
    chk(!/TOP HAT/.test(f.my + f.pz), 'bought wardrobe item NOT in the backpack (stays in the wardrobe tab)');
    chk(/CLAW PRIZES/.test(f.my), 'claw box titled CLAW PRIZES under the shop PRIZES');
    chk(/PENGUIN PLUSH/.test(f.my) && /×3/.test(f.my), 'claw-won plush listed with count');
    chk(!/HOODIE|BROWN FUR|RED SHOES/.test(f.my), 'free starter items not listed');
    chk(f.order === 'invPz', 'my section sits below the shop prizes');
    // scroll on phone: many claw plushes -> panel fits viewport and scrolls
    await p.evaluate(() => localStorage.setItem('arcade_clawMachine.collection', JSON.stringify({ bear: 1, bunny: 2, duck: 1, frog: 1, cat: 1, octopus: 1, penguin: 3, alien: 1, monkey: 1, grok: 1 })));
    await openInv();
    const s = await p.evaluate(() => { const P = document.getElementById('invP'), r = P.getBoundingClientRect(); P.scrollTop = 9999; return { top: r.top, bot: r.bottom, sh: P.scrollHeight, ch: P.clientHeight, st: P.scrollTop, h: innerHeight }; });
    chk(s.top >= 0 && s.bot <= s.h && (s.sh <= s.ch || s.st > 0), 'panel fits the 390x700 screen and scrolls ' + JSON.stringify(s));
    await p.evaluate(() => { document.getElementById('invP').scrollTop = 0; }); await p.waitForTimeout(300);
    await p.screenshot({ path: '/workspace/ga-prizes/shots/backpack_prizes_v2_phone.png' });
    const errs = o.errors.filter(x => !/supabase|Failed to load resource|net::/i.test(x)); chk(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  } catch (e) { chk(false, 'exception ' + e.stack); }
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1); })();
