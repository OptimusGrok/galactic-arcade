// t795u WARDROBE lives inside the backpack inventory (not a top-level HUD button or the FLOOR/WALLS menu).
// Opening the backpack shows a Wardrobe entry that opens window.__wardrobe exactly as before.
// Taps never walk / jump; mp.js rebroadcasts the look on 'galacticarcade:look' (mpmock, no network).
// node test/wardrobe.js [phone]
const { open } = require('./lib'); const mock = require('./mpmock');
const PH = process.argv[2] === 'phone', SH = process.env.NOSHOTS ? 0 : 1;
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const O = PH ? { phone: true, w: 412, h: 860 } : {}, pages = [], all = [];
  async function dev(id) { const o = await open(O); const p = o.page; p.setDefaultTimeout(60000); all.push(o);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(id => { window.__mpId = id; }, id); await p.addInitScript(mock); pages.push(p); await p.reload();
    await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && /on|solo/.test(window.__mp.state), null, { timeout: 60000 }); return o; }
  const A = await dev('aaaa1111'), page = A.page; await page.waitForTimeout(1500);
  const hud = await page.evaluate(() => {
    const wd = document.getElementById('wdBtn');
    const fl = document.getElementById('flBtn');
    const vis = e => { if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity !== 0 && r.width > 2 && r.height > 2; };
    const hudWards = [...document.querySelectorAll('button')].filter(b => vis(b) && /wardrobe/i.test((b.textContent || '') + (b.title || '')) && !b.closest('#opt'));
    return { hasWd: !!wd, wdVis: vis(wd), flVis: vis(fl), hudWards: hudWards.map(b => b.id || b.className), api: !!(window.__wardrobeBtn && window.__wardrobeBtn.openFromMenu) };
  });
  chk(!hud.hasWd && !hud.wdVis && !hud.flVis && hud.hudWards.length === 0, 'no separate top-level wardrobe or FLOOR/WALLS button ' + JSON.stringify(hud));
  chk(hud.api, 'wardrobe menu API is ready ' + JSON.stringify(hud));

  const openMenu = async () => {
    await page.waitForFunction(() => window.__inv && window.__inv.shown, null, { timeout: 20000 }).catch(() => {});
    const b = await page.locator('#bPack').boundingBox();
    if (PH) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(500);
  };
  await openMenu();
  const menu = await page.evaluate(() => {
    const inv = document.getElementById('inv');
    const w = document.getElementById('invWard');
    const vis = e => { if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 8 && r.height > 8; };
    const extra = w && getComputedStyle(w, '::after').content;
    return {
      open: !!(window.__inv && window.__inv.open && inv && inv.classList.contains('on') && vis(inv)),
      ward: w && vis(w),
      label: w && (w.textContent || '').replace(/\s+/g, ' ').trim(),
      extra: extra && extra !== 'none' ? extra : ''
    };
  });
  chk(menu.open && menu.ward && menu.label === 'WARDROBE', 'opening the backpack shows a Wardrobe entry ' + JSON.stringify(menu));
  chk(!/🎟/.test(menu.extra || ''), 'wardrobe entry does not show a ticket cost ' + JSON.stringify(menu.extra));
  if (process.env.WD_SHOT) await page.screenshot({ path: process.env.WD_SHOT });

  const tapWard = async () => {
    const b = await page.locator('#invWard').boundingBox();
    if (!b) throw new Error('invWard not on screen');
    if (PH) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(600);
  };
  const p0 = await page.evaluate(() => { const m = window.__arcade.monkey.position; return [m.x, m.y, m.z]; });
  const real = await page.evaluate(() => !!(window.__wardrobe && window.__wardrobe.open));
  await tapWard();
  if (real) {
    const op = await page.evaluate(() => ({ open: !!window.__wardrobe.isOpen, menu: !!(window.__inv && window.__inv.open) }));
    chk(op.open && !op.menu, 'Wardrobe entry opens the existing wardrobe and closes the backpack ' + JSON.stringify(op));
    await page.evaluate(() => window.__wardrobe.close()); await page.waitForTimeout(400);
  } else {
    const t = await page.evaluate(() => { const e = document.querySelector('.wdToast'); return e && e.style.display !== 'none' ? e.textContent : ''; });
    chk(t === 'Coming soon', "no __wardrobe yet -> 'Coming soon' toast");
  }
  await page.evaluate(() => { window.__wdOpen = 0; window.__wardrobe = { open() { window.__wdOpen++; }, close() {} }; });
  await openMenu();
  await tapWard(); await page.waitForTimeout(500);
  const s = await page.evaluate(() => { const m = window.__arcade.monkey.position, st = window.__arcade.st; return { n: window.__wdOpen, p: [m.x, m.y, m.z], jump: !!(st && st.jump), mode: window.__arcade.play.mode, menu: !!(window.__inv && window.__inv.open) }; });
  chk(s.n === 1, 'Wardrobe option calls window.__wardrobe.open() once ' + s.n);
  chk(Math.hypot(s.p[0] - p0[0], s.p[2] - p0[2]) < 0.05 && !s.jump && s.mode === 'walk' && !s.menu, 'menu taps do not walk, jump or start anything ' + JSON.stringify([p0, s]));
  if (SH) await page.screenshot({ path: 'shots/wardrobe_button_' + (PH ? 'phone' : 'desktop') + '.png' });
  const hid = await page.evaluate(async () => {
    const p = window.__arcade.play, prev = p.mode;
    p.mode = 'game'; document.body.classList.add('ingame');
    await new Promise(r => setTimeout(r, 400));
    const out = { packShown: window.__inv.shown, pack: getComputedStyle(document.getElementById('bPack')).display, fl: getComputedStyle(document.getElementById('flBtn')).display };
    p.mode = prev; document.body.classList.remove('ingame');
    return out;
  });
  chk(hid.fl === 'none' && !hid.packShown && hid.pack === 'none', 'FLOOR tab stays gone and the backpack (with Wardrobe) hides inside machines ' + JSON.stringify(hid));
  const B = await dev('bbbb2222'), b = B.page;
  await page.waitForFunction(() => window.__mp.peers.size === 1, null, { timeout: 15000 }).catch(() => {}); await b.waitForFunction(() => window.__mp.peers.has('aaaa1111'), null, { timeout: 15000 }).catch(() => {});
  const on = await page.evaluate(() => window.__mp.state);
  await page.evaluate(() => { localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'cowboy', hoodie: 'green', fur: 'silver', shoes: 'blue', glasses: 'shades' })); dispatchEvent(new Event('galacticarcade:look')); });
  await b.waitForFunction(() => { const p = window.__mp.peers.get('aaaa1111'); return p && p.look && p.look.glasses === 'shades'; }, null, { timeout: 1500 }).catch(() => {});
  const r = await b.evaluate(() => { const p = window.__mp.peers.get('aaaa1111'); return p && { look: p.look, name: p.name }; });
  const sent = await page.evaluate(() => ({ ls: window.__mp.lookSent || 0, ev: window.__mpMockLog.sent.filter(e => e === 'look').length }));
  chk(on === 'on' && sent.ls === 1 && sent.ev === 1, "'galacticarcade:look' -> one 'look' broadcast + presence track " + JSON.stringify(sent));
  chk(r && r.name === 'Dave' && r.look.glasses === 'shades' && r.look.hat === 'cowboy' && r.look.fur === 'silver' && r.look.hoodie === 'green', 'remote monkey gets the new look within 1.5 s, new fields (glasses, new hat) passed as-is ' + JSON.stringify(r));
  const errs = all.flatMap(o => o.errors); chk(errs.length === 0, 'no page errors ' + errs.join('|'));
  for (const o of all) await o.close(); process.exit(ok ? 0 : 1); })();
