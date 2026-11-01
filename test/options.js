// start screen START / OPTIONS buttons, taps elsewhere ignored, Options > FLOOR (neon / cream carpet) applied to room 1 and saved
// node test/options.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open(PH ? { phone: true, start: true } : { start: true, w: 1280, h: 720 }); const { page, errors } = o;
  const ev = (f, a) => page.evaluate(f, a);
  const tap = async sel => { const r = await ev(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, sel); if (PH) await page.touchscreen.tap(r[0], r[1]); else await page.mouse.click(r[0], r[1]); };
  const st = () => ev(() => ({ ex: !!document.getElementById('start'), s: window.__start, opt: !!document.querySelector('#opt.on'), mode: window.__arcade.play.mode, t: window.__arcade.play.tickets.total, floor: window.__arcade.floor, pos: window.__arcade.monkey.position.toArray().map(v => +v.toFixed(3)) }));
  await page.waitForTimeout(1500);
  await ev(() => { const A = window.__arcade, u = A.strikeCab.userData; A.monkey.position.set(u.front.x, 0, u.front.z); });   // a leaked tap / Enter would press STRIKE
  const a = await st();
  chk(a.ex && !a.s.dismissed && a.floor === 'neon', 'start screen up, neon floor by default');
  const btn = await ev(() => { const r = id => document.getElementById(id).getBoundingClientRect(), s = r('stStart'), o = r('stOpt'), im = document.querySelector('#stBox img').getBoundingClientRect(); return { s: [s.top, s.bottom, s.width], o: [o.top, o.bottom], imgT: im.top, imgH: im.height }; });
  chk(btn.s[0] > btn.imgT + btn.imgH * 0.8 && btn.s[2] > 80, 'START / OPTIONS sit low on the image (top at ' + ((btn.s[0] - btn.imgT) / btn.imgH * 100).toFixed(0) + '%)');
  await page.screenshot({ path: `shots/start_buttons${sfx}.png` });
  // taps / clicks off the buttons do nothing
  for (const [x, y] of [[0.5, 0.3], [0.2, 0.6], [0.5, 0.5], [0.9, 0.95]]) { const vw = PH ? 390 : 1280, vh = PH ? 844 : 720; if (PH) await page.touchscreen.tap(vw * x, vh * y); else await page.mouse.click(vw * x, vh * y); }
  if (!PH) { await page.keyboard.press('KeyE'); await page.keyboard.press('Space'); }
  await page.waitForTimeout(800);
  let b = await st();
  chk(b.ex && !b.s.dismissed && !b.opt && b.s.ignored >= 4 && b.mode === 'walk' && b.t === a.t && JSON.stringify(b.pos) === JSON.stringify(a.pos), 'taps off the buttons (and E / Space) do nothing (' + b.s.ignored + ' ignored)');
  // OPTIONS -> FLOOR tab
  await tap('#stOpt'); await page.waitForTimeout(500);
  const fl = await ev(() => { const im = [...document.querySelectorAll('.flT img')]; return { on: !!document.querySelector('#opt.on'), n: im.length, loaded: im.every(i => i.complete && i.naturalWidth > 100), sel: document.querySelector('.flT.sel').dataset.floor, tab: document.getElementById('tabFloor').textContent }; });
  chk(fl.on && fl.tab === 'FLOOR' && fl.n === 2 && fl.loaded && fl.sel === 'neon', 'OPTIONS opens the menu: FLOOR tab with CURRENT + CARPET previews, neon selected');
  await page.screenshot({ path: `shots/options_floor${sfx}.png` });
  await tap('#flCarpet'); await page.waitForTimeout(400);
  b = await ev(() => ({ sel: document.querySelector('.flT.sel').dataset.floor, floor: window.__arcade.floor, carpet: window.__arcade.carpet.visible, ls: localStorage.getItem('neonarcade.floor'), mg: window.__arcade.mirror.geometry.parameters && window.__arcade.mirror.geometry.parameters.width }));
  chk(b.sel === 'carpet' && b.floor === 'carpet' && b.carpet && b.ls === 'carpet', 'tapping CARPET selects it and applies it to room 1 straight away (saved)');
  chk(b.mg < 5, 'room 1 reflector dropped: mirror only covers the hallway (width ' + b.mg + ')');
  await page.screenshot({ path: `shots/options_floor_carpet${sfx}.png` });
  await tap('#optBack'); await page.waitForTimeout(300);
  b = await st(); chk(b.ex && !b.opt && !b.s.dismissed, 'BACK returns to the start screen');
  await tap('#stStart'); await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 5000 }).catch(() => {});
  b = await st(); chk(!b.ex && b.s.how === 'start' && b.s.audio && b.mode === 'walk' && b.t === a.t && JSON.stringify(b.pos) === JSON.stringify(a.pos), 'START enters (audio unlocked), no tap leaked into the game');
  // carpet room shots + wall strips kept
  const keep = await ev(() => { const A = window.__arcade; let neon = 0; A.room.traverse(o => { if (o.isMesh && o.visible && o.material && o.material.type === 'MeshBasicMaterial' && o.position.y < 0.2 && o.parent === A.room) neon++; }); return { neon, shield: A.shield.group.visible || A.shield.open, hex: A.room.getObjectByName('floorHex').geometry.parameters.width }; });
  chk(keep.neon >= 8, 'neon wall-bottom / plinth strips still visible in room 1 (' + keep.neon + ')');
  await ev(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 9); A.step(1 / 60); window.__camOverride = { pos: [0, 2.6, 10.5], at: [0, 0.6, -6] }; });
  await page.waitForTimeout(2500); await page.screenshot({ path: `shots/carpet_room1${sfx}.png` });
  await ev(() => { delete window.__camOverride; const A = window.__arcade; A.monkey.position.set(-3, 0, 2); A.st.yaw = 0.6; A.st.pitch = 0.35; A.st.dist = 3.6; A.st.camInit = false; A.st.lookT = A.st.t + 1e9; A.step(1 / 60); });
  await page.waitForTimeout(2500); await page.screenshot({ path: `shots/carpet_monkey${sfx}.png` });
  // persists after reload; switch back to neon
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await page.waitForTimeout(800);
  b = await ev(() => ({ floor: window.__arcade.floor, carpet: window.__arcade.carpet.visible }));
  chk(b.floor === 'carpet' && b.carpet, 'carpet choice persists after a reload');
  await tap('#stOpt'); await page.waitForTimeout(400);
  chk(await ev(() => document.querySelector('.flT.sel').dataset.floor === 'carpet'), 'menu shows CARPET selected after reload');
  await tap('#flNeon'); await page.waitForTimeout(300);
  b = await ev(() => ({ floor: window.__arcade.floor, carpet: window.__arcade.carpet.visible, ls: localStorage.getItem('neonarcade.floor'), mg: (window.__arcade.mirror.geometry.parameters || {}).width }));
  chk(b.floor === 'neon' && !b.carpet && b.ls === 'neon' && !(b.mg < 5), 'switching back to NEON restores the reflective floor');
  if (!PH) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.keyboard.press('Enter'); await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 5000 }).catch(() => {});
    b = await st(); chk(!b.ex && b.s.how === 'enter' && b.mode === 'walk', 'Esc closes the menu, Enter starts'); }
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})();
