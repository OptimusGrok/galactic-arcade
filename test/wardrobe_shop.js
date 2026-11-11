// Shop-only wardrobe items (t606u): start screen hides them; in-game wardrobe shows them locked with a ticket price;
// tap = preview + BUY; buying spends neonarcade.tickets, saves galacticarcade.wardrobeOwned, equips; too few tickets = disabled.
// Screenshots: wardrobe_shop_locked.png, wardrobe_shop_bought.png, wardrobe_new_items.png (montage, tiles in /tmp/wsi).
const { open } = require('./lib'); const fs = require('fs'), { execSync } = require('child_process');
const OUT = '/workspace/galactic-shop/shots/', SH = process.env.NOSHOTS ? 0 : 1;
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) ok = false; };
(async () => {
  // 1) start screen: only the free options
  let o = await open({ phone: true, w: 412, h: 915, start: true }), page = o.page;
  await page.waitForSelector('#gaWho');
  let s = await page.evaluate(() => ({ nw: document.querySelectorAll('#gaP .gaNew,#gaP .gaLk').length, rows: [...document.querySelectorAll('#gaP .gaRow')].map(r => r.dataset.k).join(), who: [...document.querySelectorAll('#gaWho .gaWho')].map(b => b.dataset.v).join() }));
  chk(s.nw === 0 && s.rows === '' && s.who === 'monkey,alien', 'start screen: player select only, no accessory rows', s);
  await page.evaluate(() => { localStorage.removeItem('galacticarcade.wardrobeMig'); localStorage.removeItem('galacticarcade.wardrobeOwned'); localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'capblue', hoodie: 'red', fur: 'brown', shoes: 'red', glasses: 'shades' })); }); await page.reload(); await page.waitForFunction(() => window.__gaPlayer && window.__gaPlayer.prev.root && window.__gaPlayer.prev.hat, null, { timeout: 90000 }); await page.waitForTimeout(2500);
  s = await page.evaluate(() => { const r = window.__gaPlayer.prev.root, w = []; r.traverse(x => { if (/^ga(Gl|Hat)_/.test(x.name) && x.visible) w.push(x.name); }); let cap = 0; r.traverse(x => { if (x.userData.gaCap && x.visible) cap = 1; }); return { gl: w, cap, saved: window.__gaPlayer.p.glasses, sel: [...document.querySelectorAll('#gaP .gaO.sel')].map(b => b.dataset.v).join() }; });
  chk(s.saved === 'shades' && s.gl.includes('gaHat_capblue') && s.gl.includes('gaGl_shades') && s.sel === '', 'start preview wears the saved cap and shades; no accessory swatches', s);
  if (SH) await page.screenshot({ path: OUT + 'start_no_hat.png' });
  { const r = await page.locator('#gaT').boundingBox(); await page.touchscreen.tap(r.x + 20, r.y + 10); await page.waitForTimeout(2300); }
  s = await page.evaluate(() => { window.__gaPlayer.play(1); return JSON.parse(localStorage.getItem('galacticarcade.player')).hat; }); chk(s === 'capblue', 'PLAY keeps the saved hat', s);
  await o.close();
  // 2a) grandfather: worn look + default fur/shoes become owned on first load after update
  o = await open({ phone: true, w: 412, h: 915 }); page = o.page; const { errors } = o;
  await page.evaluate(() => { localStorage.removeItem('galacticarcade.wardrobeOwned'); localStorage.removeItem('galacticarcade.wardrobeMig');
    localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'crown', hoodie: 'purple', fur: 'gold', shoes: 'blue', glasses: 'shades', back: 'none' })); });
  await page.reload(); await page.waitForFunction(() => window.__gaPlayer && window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 90000 });
  s = await page.evaluate(() => ({ own: window.__gaPlayer.owned().slice().sort(), mig: localStorage.getItem('galacticarcade.wardrobeMig'), p: window.__gaPlayer.p }));
  chk(s.mig === '1' && s.p.hat === 'crown' && s.own.includes('hat:crown') && s.own.includes('hoodie:purple') && s.own.includes('fur:gold') && s.own.includes('shoes:blue') && s.own.includes('glasses:shades') && s.own.includes('fur:brown') && s.own.includes('shoes:red'), 'grandfather: worn look + default fur/shoes owned', s);

  // 2b) room 1 WARDROBE HUD: start opts + owned only (no locked/for-sale)
  await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1200);
  s = await page.evaluate(() => { const e = document.getElementById('gaW'); return { title: e.querySelector('#gaWT').textContent, rows: [...e.querySelectorAll('.gaRow')].map(r => r.dataset.k).join(), hats: [...e.querySelectorAll('.gaRow[data-k=hat] .gaO')].map(b => b.dataset.v).join(), hoods: [...e.querySelectorAll('.gaRow[data-k=hoodie] .gaO')].map(b => b.dataset.v).join(), locked: e.querySelectorAll('.gaNew:not(.own),.gaLk').length, fur: [...e.querySelectorAll('.gaRow[data-k=fur] .gaO')].map(b => b.dataset.v).join() }; });
  chk(s.title === 'WARDROBE' && s.rows.includes('hat') && s.rows.includes('hoodie') && s.hats.includes('cap') && s.hats.includes('capblue') && s.hats.includes('crown') && s.hoods.includes('navy') && s.hoods.includes('purple') && s.locked === 0 && s.fur.includes('gold') && s.fur.includes('brown'), 'room 1 wardrobe: start opts + owned, no locks', s);
  if (SH) await page.screenshot({ path: OUT + 'wardrobe_tab_limited.png' });
  await page.evaluate(() => window.__wardrobe.close());

  // 2c) accessories island wardrobe: everything, 1-ticket base items, NEW keep prices
  const T = n => page.evaluate(n => { window.__arcade.play.tickets.total = n; localStorage.setItem('neonarcade.tickets', String(n)); document.getElementById('tixN').textContent = n; }, n);
  await page.evaluate(() => { localStorage.removeItem('galacticarcade.wardrobeOwned'); localStorage.setItem('galacticarcade.wardrobeMig', '1'); localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'cap', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'none', back: 'none' })); });
  await page.reload(); await page.waitForFunction(() => window.__gaPlayer && window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 90000 });
  await T(4); await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(1500);
  s = await page.evaluate(() => { const e = document.getElementById('gaW'); const lk1 = e.querySelector('.gaRow[data-k=hat] .gaO[data-v=crown] .gaLk'); const lkN = e.querySelector('.gaRow[data-k=hat] .gaO[data-v=tophat] .gaLk');
    return { title: e.querySelector('#gaWT').textContent, rows: [...e.querySelectorAll('.gaRow')].map(r => r.dataset.k).join(), locked: e.querySelectorAll('.gaNew:not(.own)').length, crown: lk1 && lk1.textContent, tophat: lkN && lkN.textContent, pCrown: window.__gaPlayer.priceOf('hat','crown'), pTop: window.__gaPlayer.priceOf('hat','tophat'), pCap: window.__gaPlayer.priceOf('hat','cap') }; });
  chk(s.title === 'ACCESSORIES' && s.rows === 'hat,glasses,back,hoodie,fur,shoes' && s.locked >= 40 && s.crown === '🔒1' && s.tophat === '🔒5' && s.pCrown === 1 && s.pTop === 5 && s.pCap === 0, 'accessories: full rows, 1-ticket base + priced NEW', s);
  if (SH) await page.screenshot({ path: OUT + 'accessories_prices.png' });
  const tap = async sel => { const b = await page.locator(sel).first(); await b.scrollIntoViewIfNeeded(); const r = await b.boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(400); };
  await tap('#gaW .gaRow[data-k=back] .gaO[data-v=jetpack]');
  s = await page.evaluate(() => ({ buy: !document.getElementById('gaWBuy').hidden, dis: document.getElementById('gaWBuyB').disabled, txt: document.getElementById('gaWBuyB').textContent, back: window.__gaPlayer.p.back }));
  chk(s.buy && s.dis && s.txt === 'Need 5 tickets' && s.back === 'none', 'too few tickets: preview + disabled "Need 5 tickets", nothing equipped', s);
  await tap('#gaWBuyB'); s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, own: window.__gaPlayer.owned() }));
  chk(s.t === 4 && !s.own.includes('back:jetpack'), 'disabled BUY spends nothing', s);
  await T(100); await tap('#gaW .gaRow[data-k=hat] .gaO[data-v=tophat]'); await page.waitForTimeout(800);
  if (SH) await page.screenshot({ path: OUT + 'wardrobe_shop_locked.png' });
  s = await page.evaluate(() => document.getElementById('gaWBuyB').textContent); chk(s === 'BUY 5 🎟', 'BUY 5 shown', s);
  await tap('#gaWBuyB');
  await tap('#gaW .gaRow[data-k=back] .gaO[data-v=jetpack]'); await tap('#gaWBuyB');
  s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: localStorage.getItem('neonarcade.tickets'), hud: document.getElementById('tixN').textContent, p: window.__gaPlayer.p, own: JSON.parse(localStorage.getItem('galacticarcade.wardrobeOwned')), save: JSON.parse(localStorage.getItem('galacticarcade.player')) }));
  chk(s.t === 90 && s.ls === '90' && s.hud === '90', 'buying top hat (5) + jetpack (5): 100 -> 90 tickets, HUD updated', s);
  chk(s.p.hat === 'tophat' && s.p.back === 'jetpack' && s.save.back === 'jetpack' && s.own.includes('hat:tophat') && s.own.includes('back:jetpack') && s.own.includes('fur:brown') && s.own.includes('shoes:red'), 'equipped, saved, ownership stored', s);
  const vis = await page.evaluate(() => { let h = 0, b = 0; window.__arcade.monkey.traverse(x => { if (x.name === 'gaHat_tophat' && x.visible) h = 1; if (x.name === 'gaBk_jetpack' && x.visible) b = 1; }); return h && b; });
  chk(vis, 'the in-room monkey wears the top hat + jetpack');
  const bpv = () => page.evaluate(() => [window.__arcade.monkey.getObjectByName('backpack').visible, window.__gaPlayer.prev.root.getObjectByName('backpack').visible]);
  let bp = await bpv(); chk(!bp[0] && !bp[1], 'backpack hidden while a back item is worn (room monkey + preview)', bp);
  if (SH) { const bs = []; for (const v of ['jetpack', 'cape']) { await page.evaluate(v => { const G = window.__gaPlayer, p = G.prev; if (v === 'jetpack') G.pick('back', v); else G.tryOn('back', v); p.auto = false; p.want = p.rot = Math.PI; }, v); await page.waitForTimeout(900); const f = '/tmp/bnb_' + v + '.png'; await page.locator('#gaWStage').screenshot({ path: f }); bs.push(f); }
    execSync('python3 -c "from PIL import Image;a,b=[Image.open(f) for f in ' + JSON.stringify(bs).replace(/"/g, "'") + '];m=Image.new(\'RGB\',(a.width*2,a.height));m.paste(a,(0,0));m.paste(b,(a.width,0));m.save(\'' + OUT + 'back_no_backpack.png\')"');
    await page.evaluate(() => { window.__gaPlayer.pick('back', 'jetpack'); }); }
  const R = await page.evaluate(() => { const T = window.__arcade.THREE, A = window.__arcade, g = A.monkey.clone(true); window.__wardrobe.applyRemote(g, { hat: 'cap', glasses: 'none', back: 'cape', hoodie: 'navy', fur: 'brown', shoes: 'red' }); const a = g.getObjectByName('backpack').visible; window.__wardrobe.applyRemote(g, { hat: 'cap', glasses: 'none', back: 'none', hoodie: 'navy', fur: 'brown', shoes: 'red' }); return [a, g.getObjectByName('backpack').visible]; });
  chk(!R[0] && R[1], 'remote monkey: backpack hidden with a cape, back again with none', R);
  await page.evaluate(() => { const p = window.__gaPlayer.prev; p.auto = false; p.want = p.rot = 2.4; }); await page.waitForTimeout(900);
  if (SH) await page.screenshot({ path: OUT + 'wardrobe_shop_bought.png' });
  // montage tiles: neutral lighting (no magenta/cyan rim lights)
  if (SH) { fs.mkdirSync('/tmp/wsi', { recursive: true }); execSync('rm -f /tmp/wsi/*.png');
    await page.evaluate(() => { window.__gaPlayer.prev.scene.children.forEach(l => { if (l.isPointLight) l.intensity = 0; }); });
    const N = await page.evaluate(() => window.__gaPlayer.NEW); let i = 0;
    for (const k of ['hat', 'glasses', 'back', 'hoodie']) for (const it of N[k]) {
      await page.evaluate(([k, v]) => { const G = window.__gaPlayer, p = G.prev; G.tryOn(k, v); p.auto = false; p.want = p.rot = k === 'back' ? 2.5 : (k === 'glasses' ? 0.35 : 0.5); }, [k, it[0]]); await page.waitForTimeout(700);
      await page.locator('#gaWStage').screenshot({ path: '/tmp/wsi/' + String(i++).padStart(2, '0') + '_' + k + '_' + it[0] + '.png' }); } }
  await page.evaluate(() => window.__wardrobe.close());
  // 3) reload: owned stays, saved look still worn; start screen still has no shop items
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer, null, { timeout: 90000 });
  s = await page.evaluate(() => { window.__wardrobe.open({ shop: true }); const e = document.getElementById('gaW'); return { p: window.__gaPlayer.p, own: window.__gaPlayer.owned(), unlocked: e.querySelector('.gaO[data-v=tophat]').classList.contains('own') }; });
  chk(s.p.hat === 'tophat' && s.p.back === 'jetpack' && s.own.includes('hat:tophat') && s.own.includes('back:jetpack') && s.unlocked, 'after reload: owned items stay unlocked and worn', s);
  chk(errors.filter(e => !/net::ERR_FAILED/.test(e)).length === 0, 'no page errors', errors.filter(e => !/net::ERR_FAILED/.test(e)));
  await o.close(); process.exit(ok ? 0 : 1);
})();
