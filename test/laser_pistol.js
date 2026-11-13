// t741u: SKULL MASK (GLASSES & FACE) + LASER PISTOL (new HAND row) in ACCESSORIES, 5 tickets each, buy once; FIRE above ZOOM in the arcade
// rooms while the pistol is worn. Monkey holds + aims the pistol (cyan bolts from its muzzle); the alien never holds it, his robot fires red
// bolts from its eye. FIRE hides when unequipped / in a cabinet game; MUTE silences the zap. 844x390 phone landscape.
// Screenshots ($SHOTS, default /workspace): ga-acc-skull-pistol-monkey.png, ga-acc-skull-pistol-alien.png, ga-room-fire-monkey.png, ga-room-fire-alien.png
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const OUT = (process.env.SHOTS || '/workspace') + '/', SH = process.env.NOSHOTS ? 0 : 1;
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 420) : '')); if (!c) ok = false; };
const tapEl = async (page, sel) => { const r = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(450); };
const T = (page, n) => page.evaluate(n => { window.__arcade.play.tickets.total = n; localStorage.setItem('neonarcade.tickets', String(n)); const e = document.getElementById('tixN'); if (e) e.textContent = n; }, n);
const reload = async page => { await page.reload(); await page.waitForFunction(() => window.__gaPlayer && window.__arcade && window.__arcade.stats.frames > 3 && window.__roomFire, null, { timeout: 90000 }); await page.waitForTimeout(600); };
const worn = page => page.evaluate(() => { const A = window.__arcade, G = window.__gaPlayer, vis = (r, n) => { const o = r && r.getObjectByName(n); if (!o) return false; for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === r) break; } return true; };
  const pr = G.prev.root, pg = A.monkey.getObjectByName('gaPistol');
  return { char: A.monkey.userData.char, skull: vis(A.monkey, 'gaGl_skull'), pistol: vis(A.monkey, 'gaPistol'), inHand: !!(pg && pg.parent && pg.parent.name === 'handR'), botGun: vis(A.monkey, 'gaBotGun'),
    pvSkull: vis(pr, 'gaGl_skull'), pvPistol: vis(pr, 'gaPistol'), pvBotGun: vis(pr, 'gaBotGun'), pvBot: !!(pr && pr.getObjectByName('alienBot')) }; });
const gone = page => page.evaluate(() => { const e = document.getElementById('gaW'); const t = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !window.__wardrobe.isOpen && getComputedStyle(e).display === 'none' && !(t && e.contains(t)); });
const drawn = page => page.evaluate(() => { const p = window.__gaPlayer.prev, cv = document.getElementById('gaWCv'), r = p.r; if (!r || r.domElement !== cv) return false; r.render(p.scene, p.cam); const gl = r.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 200) n++; return n / (w * h) > 0.04; });
const sideCam = (page, alien) => page.evaluate(alien => { const A = window.__arcade, m = A.monkey.position; A.st.vel.set(0, 0, 0);
  if (alien) m.set(0, m.y, 5);   // open floor by the spawn point
  A.st.face = Math.PI / 2; A.monkey.rotation.y = Math.PI / 2; A.monkey.updateMatrixWorld(true);
  if (!alien) { window.__camOverride = { pos: [m.x + 2.2, 1.75, m.z + 3.3], at: [m.x + 1.3, 1.15, m.z], showMonkey: true }; return; }
  const b = new A.THREE.Vector3(); A.monkey.getObjectByName('botEye').getWorldPosition(b); const sd = Math.sign(b.z - m.z) || 1;   // camera on the robot's side, close, so the orb reads as the emitter
  window.__camOverride = { pos: [b.x + 1.5, b.y + 0.55, b.z + sd * 2.3], at: [b.x + 0.5, b.y - 0.1, b.z], showMonkey: true }; }, alien);
(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page, { errors } = o; page.on('pageerror', e => console.log('STACK', e.stack));
  // ---------- 1) ACCESSORIES: both items for 5 tickets, buy once, persist ----------
  await page.evaluate(() => { localStorage.setItem('galacticarcade.wardrobeMig', '1'); localStorage.setItem('galacticarcade.wardrobeOwned', '[]'); localStorage.setItem('neonarcade.mute', '0');
    localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', char: 'monkey', hat: 'none', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'none', back: 'none' })); });
  await reload(page); await T(page, 12);
  await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(1500);
  let s = await page.evaluate(() => { const e = document.getElementById('gaW'), G = window.__gaPlayer, lk = sel => { const b = e.querySelector(sel); return b ? (b.querySelector('.gaLk') || {}).textContent || 'owned' : null; };
    return { rows: [...e.querySelectorAll('.gaRow')].filter(r => !r.hidden).map(r => r.dataset.k).join(), skull: lk('.gaRow[data-k=glasses] .gaO[data-v=skull]'), pistol: lk('.gaRow[data-k=hand] .gaO[data-v=pistol]'),
      pS: G.priceOf('glasses', 'skull'), pP: G.priceOf('hand', 'pistol'), pOld: [G.priceOf('glasses', 'mask'), G.priceOf('back', 'jetpack'), G.priceOf('hat', 'crown')], fire: window.__roomFire.shown }; });
  chk(s.rows === 'hat,glasses,back,hand,hoodie,fur,shoes', 'ACCESSORIES lists a HAND row after BACK', s.rows);
  chk(s.skull === '🔒5' && s.pistol === '🔒5' && s.pS === 5 && s.pP === 5, 'skull mask (GLASSES & FACE) and laser pistol (HAND) are 5 tickets each', s);
  chk(JSON.stringify(s.pOld) === '[5,5,1]', 'existing prices unchanged (ninja mask 5, jetpack 5, crown 1)', s.pOld);
  // t743u/t744u: skull is the first tile after ✕ in GLASSES & FACE, fully on screen with no scrolling, with a skull SVG icon
  s = await page.evaluate(() => { const r = document.querySelector('#gaW .gaRow[data-k=glasses]'), tiles = [...r.querySelectorAll('.gaO')], b = tiles[1].getBoundingClientRect(), ch = r.querySelector('.gaCh').getBoundingClientRect();
    return { order: tiles.slice(0, 3).map(t => t.dataset.v).join(), vis: b.left >= ch.left - 1 && b.right <= ch.right + 1 && b.top >= 0 && b.bottom <= innerHeight, svg: !!tiles[1].querySelector('svg') }; });
  chk(s.order.startsWith('none,skull,') && s.vis && s.svg, 'skull mask is the first tile after ✕, visible at 844x390 without scrolling, skull icon', s);
  // Accessories ‹ › reach locked for-sale items (try-on + BUY bar), not just owned ones
  await page.evaluate(() => document.querySelector('#gaW .gaRow[data-k=glasses] .gaA[data-step="1"]').scrollIntoView({ block: 'nearest' }));
  await tapEl(page, '#gaW .gaRow[data-k=glasses] .gaA[data-step="1"]'); await page.waitForTimeout(300);
  s = await page.evaluate(() => ({ tr: window.__gaPlayer.wardrobe.try, buy: !document.getElementById('gaWBuy').hidden, g: window.__gaPlayer.p.glasses }));
  chk(s.tr && s.tr.k === 'glasses' && s.tr.v === 'skull' && s.buy && s.g === 'none', 'GLASSES › arrow tries on the locked skull mask (BUY bar)', s);
  await tapEl(page, '#gaW .gaRow[data-k=glasses] .gaA[data-step="-1"]'); await page.waitForTimeout(300);
  s = await page.evaluate(() => ({ tr: window.__gaPlayer.wardrobe.try, g: window.__gaPlayer.p.glasses })); chk(!s.tr && s.g === 'none', '‹ back to ✕ clears the try-on', s);
  // try on the skull: live preview, BUY 5
  await page.evaluate(() => document.querySelector('#gaW .gaRow[data-k=glasses] .gaO[data-v=skull]').scrollIntoView({ inline: 'center', block: 'nearest' })); await page.waitForTimeout(200);
  await tapEl(page, '#gaW .gaRow[data-k=glasses] .gaO[data-v=skull]'); await page.waitForTimeout(500);
  s = await page.evaluate(() => ({ buy: document.getElementById('gaWBuyB').textContent, txt: document.getElementById('gaWBuyT').textContent, saved: window.__gaPlayer.p.glasses })); let w = await worn(page);
  chk(/^SKULL MASK/.test(s.txt) && s.buy === 'BUY 5 🎟' && w.pvSkull && s.saved === 'none', 'tapping the skull mask previews it with a BUY 5 bar (not equipped yet)', { s, pv: w.pvSkull });
  await tapEl(page, '#gaWBuyB');
  await page.evaluate(() => document.querySelector('#gaW .gaRow[data-k=hand] .gaO[data-v=pistol]').scrollIntoView({ inline: 'center', block: 'nearest' })); await page.waitForTimeout(200);
  await tapEl(page, '#gaW .gaRow[data-k=hand] .gaO[data-v=pistol]'); await page.waitForTimeout(500);
  s = await page.evaluate(() => ({ buy: document.getElementById('gaWBuyB').textContent, txt: document.getElementById('gaWBuyT').textContent })); w = await worn(page);
  chk(/^LASER PISTOL/.test(s.txt) && s.buy === 'BUY 5 🎟' && w.pvPistol, 'tapping the laser pistol previews it in the hand with a BUY 5 bar', { s, pv: w.pvPistol });
  await tapEl(page, '#gaWBuyB'); await page.waitForTimeout(400);
  s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, own: JSON.parse(localStorage.getItem('galacticarcade.wardrobeOwned')), p: window.__gaPlayer.p, buy: !document.getElementById('gaWBuy').hidden, sel: [...document.querySelectorAll('#gaW .gaO.sel.own')].map(b => b.dataset.v) }));
  chk(s.t === 2 && s.own.includes('glasses:skull') && s.own.includes('hand:pistol') && s.p.glasses === 'skull' && s.p.hand === 'pistol' && !s.buy && s.sel.includes('skull') && s.sel.includes('pistol'), 'both bought: 12 -> 2 tickets, owned, equipped, selected', s);
  // re-tap: owned, no second charge
  await tapEl(page, '#gaW .gaRow[data-k=glasses] .gaO[data-v=none]'); await tapEl(page, '#gaW .gaRow[data-k=glasses] .gaO[data-v=skull]');
  s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, buy: !document.getElementById('gaWBuy').hidden, g: window.__gaPlayer.p.glasses })); chk(s.t === 2 && !s.buy && s.g === 'skull', 'owned skull re-equips free (buy once)', s);
  w = await worn(page); chk(w.skull && w.pistol && w.inHand && !w.botGun && w.pvSkull && w.pvPistol, 'monkey: skull on his face + pistol in his right hand (room + preview)', w);
  chk(await drawn(page), 'preview draws the player');
  if (SH) { await page.evaluate(() => { const p = window.__gaPlayer.prev; p.auto = false; p.want = p.rot = -0.55; }); await page.waitForTimeout(900); await page.screenshot({ path: OUT + 'ga-acc-skull-pistol-monkey.png' }); }
  await tapEl(page, '#gaWDone'); chk(await gone(page), 'DONE closes Accessories for real (v174 fix)');
  await reload(page);
  s = await page.evaluate(() => ({ p: window.__gaPlayer.p, own: window.__gaPlayer.owned() })); w = await worn(page);
  chk(s.p.glasses === 'skull' && s.p.hand === 'pistol' && s.own.includes('glasses:skull') && s.own.includes('hand:pistol') && w.skull && w.pistol, 'after reload: still owned + worn', { p: s.p, w });
  // WARDROBE (backpack entry) lists them once owned
  await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(1000);
  s = await page.evaluate(() => ({ rows: [...document.querySelectorAll('#gaW .gaRow')].filter(r => !r.hidden).map(r => r.dataset.k).join(), skull: !!document.querySelector('#gaW .gaRow[data-k=glasses] .gaO[data-v=skull]'), pistol: !!document.querySelector('#gaW .gaRow[data-k=hand] .gaO[data-v=pistol]'), split: document.getElementById('gaW').classList.contains('gaSplit') }));
  chk(s.skull && s.pistol && s.split, 'WARDROBE shows the owned skull mask + laser pistol (split layout)', s);
  await tapEl(page, '#gaWX'); chk(await gone(page), 'Wardrobe X closes for real');

  // ---------- 2) ARCADE ROOM: FIRE above ZOOM, monkey ----------
  await page.waitForTimeout(500);
  s = await page.evaluate(() => { const R = id => { const e = document.getElementById(id); if (!e || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
    const f = R('bFire'), z = R('bZoom'), ov = (a, b) => !!(a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b), hit = e => { const b = e.getBoundingClientRect(), t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!t && (t === e || e.contains(t)); };
    return { f, z, chat: R('mpChatB') || R('mpBar'), pack: R('bPack'), joy: R('joyBase') || R('joy'), above: !!(f && z && f.b <= z.y + 1 && Math.abs((f.x + f.w / 2) - (z.x + z.w / 2)) < 4), overlap: ['mpBar', 'bPack', 'joyBase', 'bZoom'].filter(i => ov(f, R(i))), hit: !!f && hit(document.getElementById('bFire')) }; });
  chk(s.f && s.f.w >= 56 && s.f.h >= 56 && s.above && s.hit, 'FIRE shows directly above ZOOM, 64px, tappable', s);
  chk(s.overlap.length === 0 && s.f.b <= 390 && s.f.y >= 0, 'FIRE does not cover ZOOM, CHAT, the backpack or the joystick', s.overlap);
  // tap = one cyan bolt from the pistol muzzle, along the way he faces; arm raised
  await page.evaluate(() => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.st.face = 0.6; A.monkey.rotation.y = 0.6; window.__roomFire.cool = 0; }); await page.waitForTimeout(200);
  const muz = await page.evaluate(() => { const A = window.__arcade, p = new A.THREE.Vector3(); window.__roomFire.update(0); A.monkey.updateMatrixWorld(true); return 1; });
  await tapEl(page, '#bFire');
  s = await page.evaluate(() => { const R = window.__roomFire, L = R.last, A = window.__arcade, p = new A.THREE.Vector3(); A.monkey.updateMatrixWorld(true); A.monkey.getObjectByName('gaPistolMuzzle').getWorldPosition(p);
    const sh = A.monkey.userData.arms[1].sh.rotation.x; return { shots: R.shots, hue: L && L.hue, char: L && L.char, o: L && L.o, d: L && L.d, muz: p.toArray(), dist: L ? Math.hypot(L.o[0] - p.x, L.o[1] - p.y, L.o[2] - p.z) : 99, face: A.st.face, aim: R.aim, sh, col: R.lasers[0] && R.lasers[0].mesh.material.color.getHexString() }; });
  chk(s.shots === 1 && s.hue === 'cyan' && s.char === 'monkey' && s.col === '48f2ff', 'monkey: a tap fires one cyan bolt', { shots: s.shots, hue: s.hue, col: s.col });
  chk(s.dist < 0.25 && Math.abs(s.d[0] - Math.sin(s.face)) < 0.01 && Math.abs(s.d[2] - Math.cos(s.face)) < 0.01, 'monkey: bolt leaves the pistol muzzle along his facing', { dist: +s.dist.toFixed(3), d: s.d, face: s.face });
  chk(s.aim > 0.8 && s.sh < -1.0, 'monkey: arm raises the pistol to aim while firing', { aim: s.aim, sh: s.sh });
  // bolt flies ~11 m and fades out
  // (headless software GL runs a few fps and main.js caps a frame at 50 ms, so wait on game time, not wall time)
  s = await page.waitForFunction(() => window.__roomFire.lasers.length === 0, null, { timeout: 60000 }).then(() => 0).catch(() => page.evaluate(() => window.__roomFire.lasers.length)); chk(s === 0, 'bolt fades out after a short range (~11 m)', s);
  s = await page.waitForFunction(() => window.__roomFire.aim < 0.15, null, { timeout: 60000 }).then(() => page.evaluate(() => ({ aim: window.__roomFire.aim, sh: window.__arcade.monkey.userData.arms[1].sh.rotation.x }))).catch(() => ({ aim: 1 })); chk(s.aim < 0.15, 'pistol lowers back to his side after the shot', s);
  // hold = Sky Tower rate (0.28 s)
  const h0 = await page.evaluate(() => window.__roomFire.shots); const b = await page.locator('#bFire').boundingBox();
  await page.evaluate(() => { window.__roomFire.zaps0 = window.__roomFire.zaps; });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); const t0 = await page.evaluate(() => window.__roomFire.t);
  await page.waitForFunction(t0 => window.__roomFire.t - t0 >= 1.2, t0, { timeout: 90000 }).catch(() => {}); await page.mouse.up();
  s = await page.evaluate(([h0, t0]) => ({ n: window.__roomFire.shots - h0, held: window.__roomFire.held, zaps: window.__roomFire.zaps - window.__roomFire.zaps0, game: +(window.__roomFire.t - t0).toFixed(2) }), [h0, t0]);
  chk(s.n === 1 && !s.held, 'holding FIRE then releasing fires one scaled shot (no auto-repeat)', s);
  chk(s.zaps >= 1, 'laser zap plays when not muted', s);
  // screenshot: side view, a cyan bolt mid-flight
  if (SH) { await sideCam(page, false); await page.waitForTimeout(400); await page.evaluate(() => { window.__roomFire.cool = 0; window.__roomFire.fire(); }); await page.waitForFunction(() => window.__roomFire.lasers.some(L => !L.remote && L.life < window.__roomFire.LIFE - 0.08), null, { timeout: 30000 }).catch(() => {});
    await page.screenshot({ path: OUT + 'ga-room-fire-monkey.png' }); await page.evaluate(() => { window.__roomFire.setHeld(false); delete window.__camOverride; }); await page.waitForTimeout(600); }
  // MUTE silences the zap (the bolt still flies)
  await page.evaluate(() => { window.__mute.set(true); const R = window.__roomFire; R.z0 = R.zaps; R.m0 = R.zapMuted; R.cool = 0; R.fire(); });
  s = await page.evaluate(() => { const R = window.__roomFire; return { zaps: R.zaps - R.z0, muted: R.zapMuted - R.m0, n: R.lasers.length }; });
  chk(s.zaps === 0 && s.muted === 1 && s.n >= 1, 'MUTE: shooting is silent (bolt still drawn)', s);
  await page.evaluate(() => window.__mute.set(false));
  // a cabinet game hides FIRE
  const H = helpers(page, true); await H.goTo('monkeyCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  await H.press(); await H.zoomToDemo().catch(() => {});
  s = await page.evaluate(() => ({ mode: window.__arcade.play.mode, fire: window.__roomFire.shown, disp: getComputedStyle(document.getElementById('bFire')).display }));
  chk(s.mode !== 'walk' && !s.fire && s.disp === 'none', 'FIRE hidden while a cabinet game is open', s);
  await page.tap('#bExit').catch(() => {}); await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && window.__roomFire.shown, null, { timeout: 60000 }).catch(() => {});
  s = await page.evaluate(() => ({ mode: window.__arcade.play.mode, fire: window.__roomFire.shown })); chk(s.mode === 'walk' && s.fire, 'FIRE back after leaving the cabinet', s);
  // unequip -> hidden
  await page.evaluate(() => window.__gaPlayer.pick('hand', 'none')); await page.waitForTimeout(500);
  s = await page.evaluate(() => ({ fire: window.__roomFire.shown, disp: getComputedStyle(document.getElementById('bFire')).display, pistol: !!(window.__arcade.monkey.getObjectByName('gaPistol') || {}).visible }));
  chk(!s.fire && s.disp === 'none' && !s.pistol, 'pistol unequipped: FIRE hidden, nothing in his hand', s);
  await page.evaluate(() => window.__gaPlayer.pick('hand', 'pistol')); await page.waitForFunction(() => window.__roomFire.shown, null, { timeout: 20000 }).catch(() => {});
  chk(await page.evaluate(() => window.__roomFire.shown), 're-equipped: FIRE back');

  // ---------- 3) ALIEN: skull, no pistol in hand, robot fires red ----------
  await page.evaluate(() => window.__gaPlayer.setChar('alien')); await page.waitForTimeout(800);
  w = await worn(page); chk(w.char === 'alien' && w.skull && !w.pistol && w.botGun, 'alien: skull mask on, NO pistol in his hand, red emitter on his robot', w);
  await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(1500); w = await worn(page);
  chk(w.pvSkull && !w.pvPistol && w.pvBot && w.pvBotGun && await drawn(page), 'alien preview: skull, robot visible, no pistol', w);
  if (SH) { await page.evaluate(() => { const p = window.__gaPlayer.prev; p.auto = false; p.want = p.rot = -0.5; }); await page.waitForTimeout(900); await page.screenshot({ path: OUT + 'ga-acc-skull-pistol-alien.png' }); }
  await tapEl(page, '#gaWX'); chk(await gone(page), 'alien: Accessories X closes for real');
  await page.waitForFunction(() => window.__roomFire.shown, null, { timeout: 20000 }).catch(() => {}); chk(await page.evaluate(() => { const f = document.getElementById('bFire').getBoundingClientRect(), z = document.getElementById('bZoom').getBoundingClientRect(); return window.__roomFire.shown && f.bottom <= z.top + 1; }), 'alien: FIRE shows above ZOOM');
  await page.evaluate(() => { const A = window.__arcade; A.st.face = -0.4; A.monkey.rotation.y = -0.4; window.__roomFire.cool = 0; }); await page.waitForTimeout(200);
  await tapEl(page, '#bFire');
  s = await page.evaluate(() => { const R = window.__roomFire, L = R.last, A = window.__arcade, p = new A.THREE.Vector3(); A.monkey.updateMatrixWorld(true); A.monkey.getObjectByName('botEye').getWorldPosition(p);
    return { hue: L.hue, char: L.char, dist: Math.hypot(L.o[0] - p.x, L.o[1] - p.y, L.o[2] - p.z), d: L.d, face: A.st.face, col: R.lasers[R.lasers.length - 1].mesh.material.color.getHexString(), red: R.zapRed }; });
  chk(s.hue === 'red' && s.char === 'alien' && s.col === 'ff2a33' && s.dist < 0.35 && Math.abs(s.d[0] - Math.sin(s.face)) < 0.01, 'alien: red bolt from the floating robot\'s eye, along his facing', { hue: s.hue, col: s.col, dist: +s.dist.toFixed(3) });
  if (SH) { await sideCam(page, true); await page.waitForTimeout(400); await page.evaluate(() => { window.__roomFire.cool = 0; window.__roomFire.fire(); }); await page.waitForFunction(() => window.__roomFire.lasers.some(L => !L.remote && L.life < window.__roomFire.LIFE - 0.08), null, { timeout: 30000 }).catch(() => {}); await page.evaluate(() => { const R = window.__roomFire; const L = R.lasers.filter(x => !x.remote).pop();   // headless runs ~3 fps: pull the newest real bolt back to just past the orb for the photo
      if (L) { L.life = 99; L.mesh.position.set(L.o[0] + L.dir.x * 0.75, L.o[1] + L.dir.y * 0.75, L.o[2] + L.dir.z * 0.75); L.dir.set(0, 0, 0); window.__frz = L; } });   // frozen just past the orb
    { const f0 = await page.evaluate(() => window.__arcade.stats.frames); await page.waitForFunction(f0 => window.__arcade.stats.frames >= f0 + 4, f0, { timeout: 60000 }).catch(() => {}); }
    await page.screenshot({ path: OUT + 'ga-room-fire-alien.png' }); await page.evaluate(() => { if (window.__frz) window.__frz.life = 0; }); await page.evaluate(() => { window.__roomFire.setHeld(false); delete window.__camOverride; }); }
  const real = errors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e)); chk(real.length === 0, 'no page errors', real.slice(0, 4));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
