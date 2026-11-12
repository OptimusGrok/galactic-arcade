// t746u/t747u: alien SUIT COLOUR row in ACCESSORIES — free grey (original) + 5 coloured suits at 5 tickets, buy once; alien only.
// Recolours the suit on the room alien + preview + remote (dress); head, cyan zipper and robot keep their colours. 844x390, no screenshots.
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) ok = false; };
const tapEl = async (page, sel) => { await page.evaluate(s => { const b = document.querySelector(s); if (b) b.scrollIntoView({ block: 'nearest', inline: 'center' }); }, sel); await page.waitForTimeout(250);
  const r = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(450); };
const T = (page, n) => page.evaluate(n => { window.__arcade.play.tickets.total = n; localStorage.setItem('neonarcade.tickets', String(n)); const e = document.getElementById('tixN'); if (e) e.textContent = n; }, n);
const reload = async page => { await page.reload(); await page.waitForFunction(() => window.__gaPlayer && window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 90000 }); await page.waitForTimeout(600); };
const rows = page => page.evaluate(() => [...document.querySelectorAll('#gaW .gaRow')].filter(r => !r.hidden && r.offsetParent).map(r => r.dataset.k).join());
// colours of the live alien / preview: suit (orig 0x5a636e), head skin, cyan zip, robot trim
const cols = page => page.evaluate(() => { const A = window.__arcade, G = window.__gaPlayer, hx = m => m.color.getHexString();
  const pick = (root, f) => { let r = null; root && root.traverse(o => { if (!r && o.isMesh && o.material && o.material.color && f(o)) r = hx(o.material); }); return r; };
  const orig = o => o.material.userData.gaOrig != null ? o.material.userData.gaOrig : null, bot = A.monkey.getObjectByName('alienBot');
  return { char: A.monkey.userData.char, suit: pick(A.monkey, o => orig(o) === 0x5a636e), trim: pick(A.monkey, o => orig(o) === 0x3c434c), glove: pick(A.monkey, o => /^hand[RL]$/.test(o.name)),
    pvSuit: pick(G.prev.root, o => orig(o) === 0x5a636e), skin: pick(A.monkey.userData.head, o => o.material.roughness === 0.34),
    cyan: pick(A.monkey, o => o.material.emissive && o.material.emissive.getHex() === 0x14c8e6), botTrim: pick(bot, o => o.material.color && ['5a636f', '3c434d'].includes(hx(o.material))) }; });
(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page, { errors } = o;
  await page.evaluate(() => { localStorage.setItem('galacticarcade.wardrobeMig', '1'); localStorage.setItem('galacticarcade.wardrobeOwned', '[]');
    localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', char: 'monkey', hat: 'none', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'none', back: 'none' })); });
  await reload(page); await T(page, 20);
  // monkey: no suit row
  await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(1200);
  let r = await rows(page); chk(!r.includes('suit') && r.includes('hoodie'), 'monkey: ACCESSORIES has no SUIT COLOUR row (hoodie/fur/shoes instead)', r);
  await page.evaluate(() => window.__wardrobe.close());
  // alien
  await page.evaluate(() => window.__gaPlayer.setChar('alien')); await page.waitForTimeout(800);
  await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(1500);
  r = await rows(page); chk(r === 'hat,glasses,back,hand,suit', 'alien: SUIT COLOUR row shown, no hoodie/fur/shoes', r);
  let s = await page.evaluate(() => { const row = document.querySelector('#gaW .gaRow[data-k=suit]'), G = window.__gaPlayer; return { label: row.querySelector('span').textContent, tiles: [...row.querySelectorAll('.gaO')].map(b => b.dataset.v + ':' + ((b.querySelector('.gaLk') || {}).textContent || 'free')),
    prices: ['suitgrey', 'suitred', 'suitgold', 'suitteal', 'suitwhite', 'suitblack'].map(v => G.priceOf('suit', v)), cur: G.p.suit, old: [G.priceOf('glasses', 'skull'), G.priceOf('hand', 'pistol')] }; });
  chk(s.label === 'SUIT COLOUR' && s.tiles.join() === 'suitgrey:free,suitred:🔒5,suitgold:🔒5,suitteal:🔒5,suitwhite:🔒5,suitblack:🔒5' && s.prices.join() === '0,5,5,5,5,5' && s.cur === 'suitgrey' && s.old.join() === '5,5', 'default grey suit free + first, 5 new suits at 5 tickets', s);
  let c0 = await cols(page); chk(c0.char === 'alien' && c0.suit === '5a636e' && c0.pvSuit === '5a636e' && c0.skin === '9aa5ab' && c0.cyan === '3ae8ff' && !!c0.botTrim, 'alien starts in his grey suit', c0);
  // try on crimson: BUY bar, preview + live suit colour change
  await tapEl(page, '#gaW .gaRow[data-k=suit] .gaO[data-v=suitred]'); await page.waitForTimeout(600);
  s = await page.evaluate(() => ({ buy: document.getElementById('gaWBuyB').textContent, txt: document.getElementById('gaWBuyT').textContent, saved: window.__gaPlayer.p.suit }));
  let c1 = await cols(page); chk(/^BUY 5/.test(s.buy) && /CRIMSON SUIT/.test(s.txt) && s.saved === 'suitgrey' && c1.pvSuit === 'b3222f', 'tapping CRIMSON SUIT previews it with BUY 5', { s, pv: c1.pvSuit });
  await tapEl(page, '#gaWBuyB'); await page.waitForTimeout(600);
  s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, own: window.__gaPlayer.owned().includes('suit:suitred'), p: window.__gaPlayer.p.suit, look: window.__gaPlayer.look().suit, buy: !document.getElementById('gaWBuy').hidden }));
  chk(s.t === 15 && s.own && s.p === 'suitred' && s.look === 'suitred' && !s.buy, 'buy crimson: 20 -> 15 tickets, owned, worn, look().suit set', s);
  let c2 = await cols(page); chk(c2.suit === 'b3222f' && c2.trim === '6a121a' && c2.pvSuit === 'b3222f' && c2.skin === '9aa5ab' && c2.cyan === '3ae8ff' && c2.botTrim === c0.botTrim && c2.glove === 'd8d0c8', 'room alien + preview in crimson; head, cyan zip and robot unchanged; gloves follow', c2);
  // buy once: grey free, crimson back free
  await tapEl(page, '#gaW .gaRow[data-k=suit] .gaO[data-v=suitgrey]'); await tapEl(page, '#gaW .gaRow[data-k=suit] .gaO[data-v=suitred]');
  s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, p: window.__gaPlayer.p.suit, buy: !document.getElementById('gaWBuy').hidden })); chk(s.t === 15 && s.p === 'suitred' && !s.buy, 'grey free, owned crimson re-equips free (buy once)', s);
  // remote player: dress() a cloned alien (mp.js own(): material clones with userData.orig) in gold
  s = await page.evaluate(() => { const A = window.__arcade, g = A.monkey.clone(true); g.traverse(o => { if (o.isMesh && o.material && o.material.color) { const or = o.material.userData.gaOrig != null ? o.material.userData.gaOrig : o.material.color.getHex(); o.material = o.material.clone(); o.material.userData = { orig: or }; o.material.color.setHex(or); } });
    window.__wardrobe.applyRemote(g, { name: 'Bob', char: 'alien', hat: 'none', glasses: 'none', hoodie: 'navy', fur: 'brown', shoes: 'red', back: 'none', hand: 'none', suit: 'suitgold' });
    let su = null, bt = null; g.traverse(o => { if (o.isMesh && o.material.userData.orig === 0x5a636e && !su) su = o.material.color.getHexString(); if (o.isMesh && o.material.userData.orig === 0x5a636f) bt = o.material.color.getHexString(); });
    return { su, bt, local: (() => { let x = null; A.monkey.traverse(o => { if (!x && o.isMesh && o.material.userData.gaOrig === 0x5a636e) x = o.material.color.getHexString(); }); return x; })() }; });
  chk(s.su === 'c9971f' && s.bt === '5a636f' && s.local === 'b3222f', 'multiplayer: dress() paints a remote alien in GOLD SUIT (robot untouched, local unchanged)', s);
  await page.evaluate(() => window.__wardrobe.close());
  // persist + WARDROBE shows owned suits only, no prices
  await reload(page);
  s = await page.evaluate(() => ({ p: window.__gaPlayer.p.suit, char: window.__arcade.monkey.userData.char }));
  let c3 = await cols(page); chk(s.p === 'suitred' && s.char === 'alien' && c3.suit === 'b3222f', 'after reload: crimson suit still worn', { s, suit: c3.suit });
  await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1200);
  s = await page.evaluate(() => { const row = document.querySelector('#gaW .gaRow[data-k=suit]'); return { title: document.getElementById('gaWT').textContent, vis: !!row && !row.hidden, tiles: row ? [...row.querySelectorAll('.gaO')].map(b => b.dataset.v).join() : '', locks: row ? row.querySelectorAll('.gaLk').length : -1, split: document.getElementById('gaW').classList.contains('gaSplit') }; });
  chk(s.title === 'WARDROBE' && s.vis && s.tiles === 'suitgrey,suitred' && s.locks === 0 && s.split, 'WARDROBE (alien) lists the owned suits, no ticket cost, split layout', s);
  await page.evaluate(() => window.__wardrobe.close());
  // switch to the monkey and back: each keeps its own clothes
  await page.evaluate(() => window.__gaPlayer.setChar('monkey')); await page.waitForTimeout(800);
  await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(1000); r = await rows(page);
  s = await page.evaluate(() => ({ hood: window.__gaPlayer.p.hoodie, suit: window.__gaPlayer.p.suit }));
  chk(!r.includes('suit') && s.hood === 'navy' && s.suit === 'suitred', 'monkey again: no suit row, his hoodie unchanged (alien suit kept in the save)', { r, s });
  await page.evaluate(() => window.__wardrobe.close()); await page.evaluate(() => window.__gaPlayer.setChar('alien')); await page.waitForTimeout(800);
  let c4 = await cols(page); chk(c4.char === 'alien' && c4.suit === 'b3222f', 'back to alien: crimson suit on', c4.suit);
  // start screen: no suit row
  s = await page.evaluate(() => document.querySelectorAll('#gaP .gaRow[data-k=suit]').length); chk(s === 0, 'start screen has no suit row');
  const real = errors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e)); chk(real.length === 0, 'no page errors', real.slice(0, 3));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
