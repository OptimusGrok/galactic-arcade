// t756u: ZOOM lock. Hold to FULL zoom and lift = stays locked (button lit, LOCKED); lift before full = zooms back out;
// a tap while locked releases (eases back out). Touch and mouse. FIRE, joystick (walking), MUTE still work while locked.
// 844x390 phone landscape.
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 844, h: 390 });
  let ok = true;
  const chk = (c, m, extra) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!c) ok = false; };
  await page.evaluate(() => {
    try { localStorage.removeItem('galacticarcade.zoom'); } catch (e) {}
    const s = document.getElementById('start'); if (s) s.remove();
    if (window.__start) window.__start.dismissed = true;
    window.__gaNoTp = true;
    if (window.__arcade.st) { window.__arcade.st.distUser = false; window.__arcade.st.beamed = true; window.__arcade.st.fp = false; }
    window.__arcade.simPause && window.__arcade.simPause(false);
  });
  await page.waitForFunction(() => { const z = document.getElementById('bZoom'); return !!(z && z.classList.contains('on') && window.__arcade.tickZoom); }, null, { timeout: 30000 });
  const ev = (t, id, kind) => `(() => { const b = document.getElementById('bZoom'), r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent('${t}', { bubbles: true, cancelable: true, pointerId: ${id}, pointerType: '${kind || 'touch'}', clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); })()`;
  const S = () => page.evaluate(() => { const A = window.__arcade, b = document.getElementById('bZoom'); return { on: A.zoomHold.on, k: +A.zoomHold.k.toFixed(3), lock: A.zoomHold.lock, dist: +A.st.dist.toFixed(3), home: +A.defaultDist().toFixed(3), min: A.zoom.min, cls: b.className, label: b.querySelector('span').textContent, title: b.title, glow: getComputedStyle(b).borderColor }; });
  const tick = (n, dt) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) window.__arcade.tickZoom(dt); }, [n, dt || 0.1]);
  await page.evaluate(() => { const A = window.__arcade; A.st.dist = A.defaultDist(); });
  let s0 = await S();
  // 1) release BEFORE full: back out, no lock
  const early = await page.evaluate(([d, u]) => { eval(d); for (let i = 0; i < 3; i++) window.__arcade.tickZoom(0.1); const A = window.__arcade, s1 = { on: A.zoomHold.on, k: +A.zoomHold.k.toFixed(3), dist: +A.st.dist.toFixed(3) }; eval(u); return { s1, s2: { on: A.zoomHold.on, lock: A.zoomHold.lock } }; }, [ev('pointerdown', 21), ev('pointerup', 21)]);
  let s1 = early.s1, s2 = early.s2; await tick(10); let s3 = await S();
  chk(s1.on && s1.k > 0.3 && s1.k < 1 && s1.dist < s0.home - 0.5, 'holding ZOOM ramps in toward full', s1);
  chk(!s2.on && !s2.lock && s3.k === 0 && Math.abs(s3.dist - s3.home) < 0.15 && !/locked/.test(s3.cls), 'released BEFORE full: zooms back out, not locked', { s2, s3 });
  // 2) hold to FULL, lift: stays locked
  await page.evaluate(ev('pointerdown', 22)); await tick(9); let s4 = await S();
  await page.evaluate(ev('pointerup', 22)); await tick(10); let s5 = await S();
  chk(s4.k === 1 && Math.abs(s4.dist - s4.min) < 0.05, 'held until FULL zoom', s4);
  chk(s5.lock && s5.on && s5.k === 1 && Math.abs(s5.dist - s5.min) < 0.05, 'lift at full: zoom stays LOCKED at full', s5);
  chk(/locked/.test(s5.cls) && s5.label === 'LOCKED' && /tap to release/i.test(s5.title) && s5.glow !== s0.glow, 'locked is shown: button stays lit (amber ring), label LOCKED', { cls: s5.cls, label: s5.label, glow: s5.glow, was: s0.glow });
  if (process.env.ZOOM_SHOT) { await page.waitForTimeout(1200); await page.screenshot({ path: process.env.ZOOM_SHOT }); }
  // 3) while locked: walk with the joystick, FIRE (pistol), MUTE toggle
  await page.evaluate(() => { const g = window.__gaPlayer; g.p.hand = 'pistol'; g.has = () => true; });
  await page.waitForFunction(() => window.__roomFire && window.__roomFire.shown, null, { timeout: 20000 }).catch(() => {});
  const walk = await page.evaluate(() => { const A = window.__arcade, cv = A.renderer.domElement, j = document.getElementById('joy'), c = j.getBoundingClientRect(), jx = c.left + c.width / 2, jy = c.top + c.height / 2;
    const fire = (type, x, y) => { const T = new Touch({ identifier: 71, target: cv, clientX: x, clientY: y }); cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [T], changedTouches: [T] })); };
    A.monkey.position.set(0, 0, 0); A.st.vel.set(0, 0, 0); const p0 = A.monkey.position.clone();
    fire('touchstart', jx, jy); fire('touchmove', jx, jy - 120); for (let i = 0; i < 60; i++) A.step(1 / 60); const joy = A.st.joy.on; fire('touchend', jx, jy - 120);
    for (let i = 0; i < 3; i++) A.tickZoom(0.1);
    return { moved: +A.monkey.position.distanceTo(p0).toFixed(2), joy, lock: A.zoomHold.lock, k: A.zoomHold.k, dist: +A.st.dist.toFixed(3) }; });
  chk(walk.joy && walk.moved > 0.5 && walk.lock && walk.k === 1, 'joystick walks while zoom is locked (zoom stays locked)', walk);
  const fr = await page.evaluate(() => { const R = window.__roomFire, b = document.getElementById('bFire'), r = b.getBoundingClientRect(), n0 = R.shots; R.cool = 0;
    for (const t of ['pointerdown', 'pointerup']) b.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 31, pointerType: 'touch', clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    if (R.shots === n0) { R.cool = 0; R.fire(); }   // fallback if the button listens on touch events only
    return { shown: R.shown, shots: R.shots - n0, lock: window.__arcade.zoomHold.lock }; });
  chk(fr.shown && fr.shots >= 1 && fr.lock, 'FIRE shows and fires while zoom is locked', fr);
  const mu = await page.evaluate(() => { const M = window.__mute, w = M.on; M.set(!w); const a = M.on; M.set(w); return { toggled: a !== w, back: M.on === w, lock: window.__arcade.zoomHold.lock }; });
  chk(mu.toggled && mu.back && mu.lock, 'MUTE still toggles while zoom is locked', mu);
  // 4) TAP while locked: releases and eases back out (no new hold)
  await page.evaluate(ev('pointerdown', 23)); let s6 = await S(); await page.evaluate(ev('pointerup', 23)); let s7 = await S(); await tick(3); let s8 = await S(); await tick(10); let s9 = await S();
  chk(!s6.lock && !s6.on && !s7.lock && !s7.on, 'a tap on ZOOM while locked releases the lock', { s6, s7 });
  chk(s8.k > 0 && s8.k < 1 && s9.k === 0 && Math.abs(s9.dist - s9.home) < 0.15 && s9.label === 'ZOOM' && !/locked/.test(s9.cls), 'then eases back out (same ease as a release), button back to normal', { s8, s9 });
  // 5) mouse (desktop): hold to full, mouse-up locks, click releases
  await page.evaluate(() => { const A = window.__arcade; A.st.dist = A.defaultDist(); });
  const b = await page.locator('#bZoom').boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down(); await tick(9); await page.mouse.up(); await tick(3); const m1 = await S();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await tick(10); const m2 = await S();
  chk(m1.lock && m1.k === 1, 'mouse: hold to full + mouse-up locks', m1);
  chk(!m2.lock && m2.k === 0, 'mouse: a click releases', m2);
  // 6) hold again from locked-free state still works normally; a lock is dropped when the button hides (entering a game)
  await page.evaluate(ev('pointerdown', 24)); await tick(9); await page.evaluate(ev('pointerup', 24));
  const hide = await page.evaluate(() => { const P = window.__arcade.play, was = window.__arcade.zoomHold.lock; P.start(P.machines.monkey); return { was, mode: P.mode }; });
  await page.waitForFunction(() => !document.getElementById('bZoom').classList.contains('on'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400); const h2 = await page.evaluate(() => ({ lock: window.__arcade.zoomHold.lock, on: window.__arcade.zoomHold.on, btn: document.getElementById('bZoom').className }));
  await page.evaluate(() => { try { window.__arcade.play.exit(); } catch (e) {} });
  chk(hide.was && !h2.lock && !h2.on, 'a lock is dropped when the ZOOM button hides (cabinet game / menus)', { hide, h2 });
  chk(errors.length === 0, 'no page errors', errors.slice(0, 3));
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await close(); process.exit(ok ? 0 : 1);
})();
