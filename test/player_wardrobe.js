// In-game wardrobe (player.js): window.__wardrobe.open/close, every option on the monkey, save, 'galacticarcade:look' event,
// old saves, taps inside the panel never reach the game, start screen shows the new rows. Screenshots for Dave (phone portrait).
const { open } = require('./lib');
const OUT = '/workspace/galactic-shop/shots/';
const KEY = 'galacticarcade.player';
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) ok = false; };
async function opn(o) { for (let i = 0; ; i++) { try { return await open(Object.assign({ phone: true, w: 412, h: 915 }, o)); } catch (e) { if (i >= 6) throw e; console.log('retry open'); } } }
(async () => {
  let o, page, errors, st, p; const all = { hat: ['cap','capblue','crown','helmet','beanie','cowboy','party','pirate','halo','headphones','none'], glasses: ['none','shades','round','visor'], hoodie: ['navy','red','blue','green','yellow','purple','pink','orange','teal','black','white'], fur: ['brown','gold','silver','black','white','ginger','pink','blue'], shoes: ['red','blue','black','white','green','pink','gold','purple'] };
  if (!process.env.ONLY_START) {
  o = await opn({}); ({ page, errors } = o);
  const ready = () => page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer && window.__gaPlayer.tag, null, { timeout: 90000 });
  // old save without glasses still loads
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ name: 'Dave', hat: 'crown', hoodie: 'red', fur: 'gold', shoes: 'blue' })), KEY);
  await page.reload({ timeout: 120000 }); await ready();
  p = await page.evaluate(() => window.__gaPlayer.p); chk(p.name === 'Dave' && p.hat === 'crown' && p.hoodie === 'red' && p.fur === 'gold' && p.shoes === 'blue' && p.glasses === 'none', 'old save (no glasses) loads', p);
  // unknown values fall back
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ name: 'Dave', hat: 'tophat', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'monocle' })), KEY);
  await page.reload({ timeout: 120000 }); await ready();
  p = await page.evaluate(() => window.__gaPlayer.p); chk(p.hat === 'cap' && p.glasses === 'none', 'unknown hat/glasses fall back', p);
  await page.evaluate(() => { window.__looks = []; addEventListener('galacticarcade:look', e => window.__looks.push(e.detail)); });
  chk(await page.evaluate(() => typeof window.__wardrobe.open === 'function' && typeof window.__wardrobe.close === 'function'), '__wardrobe.open/close exist');
  await page.evaluate(() => window.__wardrobe.open()); await page.waitForFunction(() => window.__gaPlayer.prev.r && window.__gaPlayer.prev.r.domElement.id === 'gaWCv', null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1000);
  st = await page.evaluate(() => { const e = document.getElementById('gaW'), r = e.getBoundingClientRect(); return { open: window.__wardrobe.isOpen, vis: getComputedStyle(e).display !== 'none', w: r.width, h: r.height, rows: [...e.querySelectorAll('.gaRow')].map(x => x.dataset.k), done: !!e.querySelector('#gaWDone'), prev: !!(window.__gaPlayer.prev.r && window.__gaPlayer.prev.r.domElement.id === 'gaWCv') }; });
  chk(st.open && st.vis && st.w >= 400 && st.h >= 900, 'open(): full-screen panel shown', st);
  chk(st.rows.join() === 'hat,glasses,back,hoodie,fur,shoes' && st.done, 'panel has all rows + DONE', st.rows);
  chk(st.prev, 'live preview renders in the panel');
  const f0 = await page.evaluate(() => window.__arcade.stats.frames); await page.waitForTimeout(4000); const f1 = await page.evaluate(() => window.__arcade.stats.frames);
  chk(f1 > f0, 'game keeps running while open', { f0, f1 });
  // taps inside the panel do not move the monkey (tap the panel background a few times + a row button)
  const pos0 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  for (const [x, y] of [[200, 300], [60, 500], [350, 800]]) await page.touchscreen.tap(x, y);
  await page.locator('#gaW .gaRow[data-k="hoodie"] .gaO[data-v="purple"]').scrollIntoViewIfNeeded(); await page.locator('#gaW .gaRow[data-k="hoodie"] .gaO[data-v="purple"]').tap();
  await page.waitForTimeout(1500); const pos1 = await page.evaluate(() => window.__arcade.monkey.position.toArray());
  const moved = Math.hypot(pos1[0] - pos0[0], pos1[2] - pos0[2]); chk(moved < 0.01, 'taps inside the panel do not move the monkey', { moved });
  p = await page.evaluate(() => window.__gaPlayer.p); chk(p.hoodie === 'purple', 'tapping a swatch picks it', p);
  // every option changes the monkey, is saved, fires the event
  const live = await page.evaluate(() => { const O = window.__gaPlayer.opts, r = {}; for (const k in O) r[k] = O[k].map(a => a[0]); return r; }); chk(JSON.stringify(live) === JSON.stringify(all), 'option lists', live);
  const state = () => page.evaluate(() => { const m = window.__arcade.monkey; let cap; m.traverse(x => { if (x.userData.gaCap) cap = x; }); const h = cap.parent.userData.gaHats, wv = x => { let v = true; for (let n = x; n; n = n.parent) v = v && n.visible; return v; };
    const hats = { cap: wv(cap) }; for (const k in h) if (k !== 'gl') hats[k] = wv(h[k]); const gl = {}; for (const k in h.gl) gl[k] = wv(h.gl[k]);
    const col = n => { let c = null; m.traverse(x => { if (!c && x.isMesh && x.material && x.material.userData.gaOrig === n) c = x.material.color.getHex(); }); return c; };
    return { hats, gl, hood: col(0x1d2452), fur: col(0x4e2a14), shoe: col(0x8a1e2c), saved: JSON.parse(localStorage.getItem('galacticarcade.player')), n: window.__looks.length, last: window.__looks[window.__looks.length - 1] }; });
  const pal = await page.evaluate(() => { const O = window.__gaPlayer.opts, r = {}; for (const k of ['hoodie', 'fur', 'shoes']) { r[k] = {}; O[k].forEach(a => r[k][a[0]] = a[1]); } return r; });
  let bad = [];
  for (const k of Object.keys(all)) for (const v of all[k]) {
    const n0 = (await state()).n; await page.evaluate(([k, v]) => window.__gaPlayer.pick(k, v), [k, v]); const s = await state();
    let good = s.saved[k] === v && s.n === n0 + 1 && s.last[k] === v && ['name', 'hat', 'hoodie', 'fur', 'shoes', 'glasses'].every(x => x in s.last);
    if (k === 'hat') good = good && Object.entries(s.hats).every(([h, on]) => on === (h === v));
    if (k === 'glasses') good = good && Object.entries(s.gl).every(([g, on]) => on === (g === v));
    if (k === 'hoodie') good = good && s.hood === pal.hoodie[v]; if (k === 'fur') good = good && s.fur === pal.fur[v]; if (k === 'shoes') good = good && s.shoe === pal.shoes[v];
    if (!good) bad.push([k, v, s]);
  }
  chk(bad.length === 0, 'every option (' + Object.values(all).flat().length + ') changes the monkey, saves and fires galacticarcade:look', bad);
  // t600: 'cap' is Arcade's real pink cap (default), 'capblue' a blue copy; swatches show those colours
  const caps = await page.evaluate(() => { const m = window.__arcade.monkey; let cap; m.traverse(x => { if (x.userData.gaCap) cap = x; }); const b = cap.parent.getObjectByName('gaHat_capblue'), hx = g => [...new Set(g.children.filter(o => o.isMesh).map(o => o.material.color.getHex().toString(16)))].sort().join();
    const sw = [...document.querySelectorAll('#gaW .gaRow[data-k=hat] .gaO')].slice(0, 2).map(x => x.dataset.v + ':' + (x.innerHTML.match(/#[0-9a-f]{6}/) || [''])[0]); return { pink: hx(cap), blue: hx(b), sw, def: window.__gaPlayer.opts.hat[0][0] }; });
  chk(caps.pink === 'd93a82,ff4f9e' && caps.blue === '1a4fc0,2b7bff' && caps.sw.join() === 'cap:#ff4f9e,capblue:#2b7bff' && caps.def === 'cap', 'pink default cap first, blue cap second, swatches match', caps);
  // hats sit on top of the head: each hat's world bbox top is above the skull top
  const tops = await page.evaluate(() => { const T = window.__arcade.THREE, m = window.__arcade.monkey; let cap; m.traverse(x => { if (x.userData.gaCap) cap = x; }); const h = cap.parent.userData.gaHats, head = cap.parent, r = {};
    m.updateMatrixWorld(true); const skull = new T.Vector3(0, 0.333, 0); head.localToWorld(skull);
    for (const k in h) { if (k === 'gl') continue; const v = h[k].visible; h[k].visible = true; const b = new T.Box3().setFromObject(h[k]); h[k].visible = v; r[k] = +(b.max.y - skull.y).toFixed(3); } return r; });
  chk(Object.values(tops).every(t => t > 0.02), 'every hat reaches above the top of the skull', tops);
  // applyRemote on another monkey root (own materials, like mp.js): draws the look there only, save + local monkey untouched
  const rem = await page.evaluate(() => { const A = window.__arcade, before = localStorage.getItem('galacticarcade.player'), loc = JSON.stringify(window.__gaPlayer.p);
    const g = A.monkey.clone(true); g.traverse(o => { if (o.isMesh && o.material) { const or = o.material.userData.gaOrig != null ? o.material.userData.gaOrig : o.material.color.getHex(); o.material = o.material.clone(); o.material.userData = { orig: or }; o.material.color.setHex(or); } });
    A.scene && A.scene.add(g); window.__wardrobe.applyRemote(g, { name: 'Bob', hat: 'pirate', glasses: 'visor', hoodie: 'orange', fur: 'white', shoes: 'pink' });
    let cap, hood = null; g.traverse(o => { if (o.userData.gaCap) cap = o; if (!hood && o.isMesh && o.material.userData.orig === 0x1d2452) hood = o.material.color.getHex(); });
    const h = cap.parent.userData.gaHats, vis = []; for (const k in h) if (k !== 'gl' && h[k].visible) vis.push(k); for (const k in h.gl) if (h.gl[k].visible) vis.push('gl:' + k);
    const dup = cap.parent.children.filter(o => /^ga/.test(o.name)).length, localH = A.monkey.getObjectByName('gaHat_pirate').visible;
    A.scene && A.scene.remove(g); return { vis, capVis: cap.visible, hood, dup, localH, saveSame: localStorage.getItem('galacticarcade.player') === before, localSame: JSON.stringify(window.__gaPlayer.p) === loc }; });
  chk(rem.vis.join() === 'pirate,gl:visor' && !rem.capVis && rem.hood === 0xff7a1a && rem.dup === 24 && !rem.localH && rem.saveSame && rem.localSame, 'applyRemote dresses another monkey root only, no save', rem);
  // screenshot: wardrobe open with a nice look
  await page.evaluate(() => { const g = window.__gaPlayer; g.pick('hat', 'cowboy'); g.pick('glasses', 'shades'); g.pick('hoodie', 'purple'); g.pick('fur', 'brown'); g.pick('shoes', 'white'); });
  await page.waitForTimeout(2500); await page.screenshot({ path: OUT + 'wardrobe_open.png' });
  // close
  await page.locator('#gaWDone').tap(); await page.waitForTimeout(400);
  st = await page.evaluate(() => ({ open: window.__wardrobe.isOpen, hidden: document.getElementById('gaW').hidden, r: !!window.__gaPlayer.prev.r })); chk(!st.open && st.hidden && !st.r, 'DONE closes + frees the preview context', st);
  await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(500); await page.evaluate(() => window.__wardrobe.close());
  st = await page.evaluate(() => window.__wardrobe.isOpen); chk(st === false, 'open/close again via the API');
  // reload keeps the wardrobe choice
  await page.reload({ timeout: 120000 }); await ready(); p = await page.evaluate(() => window.__gaPlayer.p); chk(p.hat === 'cowboy' && p.glasses === 'shades' && p.hoodie === 'purple', 'choice survives reload', p);
  // in-game shots: each hat (for the montage) + glasses
  const face = async path => { await page.evaluate(() => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.st.fp = false; A.st.yaw = A.st.face; A.st.dist = 2.3; A.st.pitch = 0.12; A.st.camInit = false; });
    await page.waitForTimeout(2200); await page.evaluate(() => { const A = window.__arcade; A.st.yaw = A.st.face; A.st.dist = 2.3; A.st.pitch = 0.12; }); await page.waitForTimeout(1800); await page.screenshot({ path }); };
  await page.evaluate(() => { const g = window.__gaPlayer; g.pick('glasses', 'none'); g.pick('hoodie', 'navy'); g.pick('shoes', 'red'); });
  for (const h of all.hat) { await page.evaluate(h => window.__gaPlayer.pick('hat', h), h); await face('/tmp/wd_hat_' + h + '.png'); }
  await page.evaluate(() => window.__gaPlayer.pick('hat', 'none'));
  for (const g of all.glasses) { await page.evaluate(g => window.__gaPlayer.pick('glasses', g), g); await face('/tmp/wd_gl_' + g + '.png'); }
  chk(errors.length === 0, 'no page errors (in game)', errors);
  await o.close(); }
  // ---------- start screen ----------
  o = await opn({ start: true }); ({ page, errors } = o);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ name: 'Dave', hat: 'party', hoodie: 'teal', fur: 'ginger', shoes: 'gold', glasses: 'round' })), KEY);
  await page.reload({ timeout: 120000 }); await page.waitForFunction(() => window.__gaPlayer && window.__gaPlayer.prev.root, null, { timeout: 90000 }); await page.waitForTimeout(2500);
  st = await page.evaluate(() => { const P = document.getElementById('gaP'), r = {}; P.querySelectorAll('.gaRow').forEach(x => r[x.dataset.k] = [...x.querySelectorAll('.gaO')].map(b => b.dataset.v)); const sel = {}; P.querySelectorAll('.gaO.sel').forEach(b => sel[b.closest('.gaRow').dataset.k] = b.dataset.v); return { r, sel }; });
  chk(JSON.stringify(st.r) === JSON.stringify({ hat: ['cap', 'capblue'], hoodie: ['navy', 'red', 'green'] }), 'start screen shows only 3 hoodie colours (Dave: no other items)', st.r);
  const inView = await page.evaluate(() => [...document.querySelectorAll('#gaP .gaO.sel')].every(b => { const r = b.getBoundingClientRect(), c = b.parentNode.getBoundingClientRect(); return r.left >= c.left - 1 && r.right <= c.right + 1; }));
  chk(inView, 'each row is scrolled so the saved choice is visible');
  chk(JSON.stringify(st.sel) === '{}', 'saved teal hoodie (not one of the 3): none selected', st.sel);
  const pv = await page.evaluate(() => { const r = window.__gaPlayer.prev.root, w = {}; r.traverse(x => { if (/^ga(Hat|Gl)_/.test(x.name) && x.visible) w[x.name] = 1; }); return Object.keys(w); });
  chk(pv.join() === 'gaHat_party', 'start preview wears the saved party hat, no eyewear', pv);
  const fit = await page.evaluate(() => { const g = document.getElementById('gaP'); return { sh: g.scrollHeight, ch: g.clientHeight, stage: document.getElementById('gaStage').getBoundingClientRect().height }; });
  chk(fit.sh <= fit.ch + 1 && fit.stage >= 130, 'start screen fits a 412x915 phone without scrolling', fit);
  await page.touchscreen.tap(206, 400); await page.waitForTimeout(2600); await page.screenshot({ path: OUT + 'start_wardrobe_options.png' });
  chk(errors.length === 0, 'no page errors (start screen)', errors);
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
