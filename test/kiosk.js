// TICKET EXCHANGE kiosk: USE near it, zoom, prices, buying / greying, dispense after exit, PICK UP pockets tickets, cash $5 + 24 h refill, persistence.
// node test/kiosk.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const o = await open(PH ? { phone: true, w: 412, h: 860, supa } : { w: 1280, h: 720, supa }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const ev = (f, a) => page.evaluate(f, a);
  const tapEl = async sel => { const b = await page.locator(sel).first().boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(350); };
  const K = () => ev(() => { const k = window.__kiosk; return { mode: k.mode, near: k.near, pending: k.pending, bal: k.C.bal, dispK: k.dispK, use: document.getElementById('bUse').classList.contains('on'), pick: document.getElementById('bPick').classList.contains('on'), view: document.getElementById('kview').classList.contains('on'), t: window.__arcade.play.tickets.total, ls: localStorage.getItem('neonarcade.tickets'), cash: document.getElementById('cash').textContent, cashOn: document.getElementById('cash').classList.contains('on'), dis: [...document.querySelectorAll('.kOff')].map(b => b.classList.contains('dis')), offers: [...document.querySelectorAll('.kOff')].map(b => b.textContent) }; });
  const waitMode = (m, ms = 15000) => page.waitForFunction(m => window.__kiosk.mode === m, m, { timeout: ms }).catch(() => {});
  await page.waitForTimeout(1500);
  await ev(() => { const A = window.__arcade; window.__noAdapt = 1; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(0, 0, 4); A.st.face = Math.PI; A.st.yaw = 0.35; A.st.pitch = 0.25; A.st.dist = 4.2; A.st.lookT = -99; });
  await page.waitForTimeout(900);
  let k = await K(); const t0 = k.t;
  const box = await ev(() => { const b = new window.__arcade.THREE.Box3().setFromObject(window.__arcade.kiosk.K), b0 = 0; return { kh: b.max.y, cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, y0: b.min.y }; });
  chk(Math.abs(box.cx) < 0.05 && Math.abs(box.cz) < 0.2 && box.y0 > -0.6 && box.kh > 1.3 && box.kh < 1.8, 'kiosk at the centre of room 1 on the floor, about the monkey\'s height ' + JSON.stringify(box));
  chk(!k.use && k.cashOn && /\$5/.test(k.cash) && k.bal === 5, 'not near: no USE; cash HUD shows $5');
  const cr = await ev(() => { const a = document.getElementById('cash').getBoundingClientRect(), u = document.getElementById('ui').getBoundingClientRect(); return { top: a.top, uiB: u.bottom, right: innerWidth - a.right }; });
  chk(cr.top >= cr.uiB && cr.right < 20, 'cash HUD top-right, below the V / fullscreen / home buttons ' + JSON.stringify(cr));
  await page.screenshot({ path: `shots/kiosk_room${sfx}.png` });
  // collision: walking into it stops at its face
  await ev(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 0.55); A.step(0.016); }); const pz = await ev(() => window.__arcade.monkey.position.z); chk(pz > 0.5, 'kiosk blocks the monkey (pushed to z ' + pz.toFixed(2) + ')');
  await ev(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 1.0); A.st.face = Math.PI; }); await page.waitForTimeout(600);
  k = await K(); chk(k.near && k.use, 'near the kiosk: USE appears');
  await tapEl('#bUse'); await waitMode('view', 40000); await page.waitForTimeout(400); k = await K();
  chk(k.mode === 'view' && k.view, 'USE zooms the camera onto the screen + keypad');
  chk(JSON.stringify(k.offers) === JSON.stringify(['$1 = 10 TICKETS', '$5 = 60 TICKETS', '$10 = 150 TICKETS']) && JSON.stringify(k.dis) === '[false,false,true]', 'prices $1=10, $5=60, $10=150; $10 greyed with $5 ' + JSON.stringify(k.dis));
  await page.screenshot({ path: `shots/kiosk_view${sfx}.png` });
  await tapEl('.kOff >> nth=2'); await page.waitForTimeout(400); k = await K(); chk(k.bal === 5 && k.pending === 0, 'unaffordable $10 refused');
  await tapEl('.kOff >> nth=0'); k = await K(); chk(k.bal === 4 && k.pending === 10, '$1 bought: 10 tickets queued, cash $4');
  for (const key of ['1', '#']) await tapEl(`.kKey[data-k="${key}"]`); k = await K(); chk(k.bal === 3 && k.pending === 20, 'keypad 1 # buys another $1');
  chk(JSON.stringify(k.dis) === '[false,true,true]', '$5 now greyed (cash $3)');
  chk(k.t === t0, 'nothing dispensed while in the view');
  if (PH) await tapEl('#kX'); else await page.keyboard.press('Escape');
  await waitMode('walk', 40000); k = await K(); chk(k.mode === 'walk' && !k.view && k.t === t0, 'exit returns to the normal camera');
  await page.waitForTimeout(700); await page.screenshot({ path: `shots/kiosk_dispense${sfx}.png` });
  await page.waitForFunction(() => window.__kiosk.dispK >= 1, null, { timeout: 45000 }).catch(() => {}); await page.waitForTimeout(400);
  k = await K(); chk(k.dispK >= 1 && k.pick && !k.use && k.t === t0, 'dispensed into the tray, PICK UP shown, not yet pocketed');
  // persistence of undispensed / unpocketed tickets
  const ls = await ev(() => [localStorage.getItem('neonarcade.kioskPending'), localStorage.getItem('neonarcade.cash')]); chk(ls[0] === '20' && JSON.parse(ls[1]).bal === 3, 'pending tickets and cash saved ' + JSON.stringify(ls));
  await tapEl('#bPick');
  await page.waitForFunction(() => window.__kiosk.mode === 'pick' && window.__kiosk.pt > 0.3, null, { timeout: 30000 }).catch(() => {});
  await page.keyboard.down('KeyS'); await page.waitForFunction(() => window.__kiosk.pt > 1.2 || window.__kiosk.mode !== 'pick', null, { timeout: 20000 }).catch(() => {});
  const lk = await ev(() => ({ m: window.__kiosk.mode, z: window.__arcade.monkey.position.z, arm: Math.min(...window.__arcade.monkey.userData.arms.map(a => a.sh.rotation.x)) }));
  await page.screenshot({ path: `shots/kiosk_pocket${sfx}.png` }); await page.keyboard.up('KeyS');
  chk(lk.m === 'pick' && lk.z < 0.9, 'pocketing locks movement: S held, monkey still walks to the tray (z ' + lk.z.toFixed(2) + ')');
  chk(lk.arm < -0.5, 'new avatar reaches into the tray with its arm (' + lk.arm.toFixed(2) + ')');
  await page.waitForFunction(t => window.__arcade.play.tickets.total === t + 20 && window.__kiosk.mode === 'walk' && !window.__kiosk.counting, t0, { timeout: 30000 }).catch(() => {});
  k = await K(); chk(k.t === t0 + 20 && k.ls === String(t0 + 20) && k.pending === 0 && !k.pick, 'PICK UP: monkey pockets them, tickets +20 ' + k.t);
  // 1 h refill with mocked time (never stacks)
  const at = await ev(() => window.__kiosk.C.at);
  await ev(at => { window.__kioskNow = () => at + 59 * 6e4 + 5000; window.__kiosk.showCash(); }, at); k = await K(); chk(k.bal === 3 && /\+\$2 in 0m/.test(k.cash), 'after 59 min still $3 with countdown: ' + k.cash);
  await ev(at => { window.__kioskNow = () => at + 36e5 + 1000; window.__kiosk.showCash(); }, at); k = await K(); chk(k.bal === 5 && !/in/.test(k.cash), 'after 1 h refilled to $5');
  await ev(at => { window.__kioskNow = () => at + 5 * 36e5; window.__kiosk.showCash(); }, at); k = await K(); chk(k.bal === 5, 'no stacking past $5 (5 h later still $5)');
  await page.screenshot({ path: `shots/kiosk_cash${sfx}.png`, clip: { x: (PH ? 412 : 1280) - 200, y: 0, width: 200, height: 110 } });
  // no auto-save: a reload starts fresh ($5, empty tray) unless a slot is loaded
  await ev(() => { delete window.__kioskNow; window.__kiosk.setState({ bal: 2, at: Date.now() - 6e5, pending: 60 }); window.__noUnloadWarn = 1; });
  await page.reload(); await page.waitForTimeout(2500);
  k = await K(); chk(k.pending === 0 && k.bal === 5, 'reload starts fresh: $5, empty tray ' + JSON.stringify(k));
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
