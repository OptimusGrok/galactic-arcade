// Hold-to-zoom button beside the backpack + swipe-to-look (pinch no longer zooms).
// Portrait 390x700, then landscape 700x390.
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700 });
  let ok = true;
  const chk = (c, m, extra) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!c) ok = false; };

  await page.evaluate(() => {
    try { localStorage.removeItem('galacticarcade.zoom'); } catch (e) {}
    const s = document.getElementById('start'); if (s) s.remove();
    if (window.__start) window.__start.dismissed = true;
    window.__gaNoTp = true;
    if (window.__arcade.st) { window.__arcade.st.distUser = false; window.__arcade.st.beamed = true; window.__arcade.st.fp = false; }
    try { if (window.__gaPlayer && window.__gaPlayer.play) window.__gaPlayer.play(1); } catch (e) {}
    window.__arcade.simPause && window.__arcade.simPause(false);
  });
  await page.waitForFunction(() => {
    const pack = document.getElementById('bPack'), z = document.getElementById('bZoom');
    return !!(pack && pack.classList.contains('on') && z && z.classList.contains('on') && window.__arcade && window.__arcade.tickZoom);
  }, null, { timeout: 20000 });

  const lay = await page.evaluate(() => {
    const z = document.getElementById('bZoom').getBoundingClientRect();
    const p = document.getElementById('bPack').getBoundingClientRect();
    return {
      z: { x: +z.x.toFixed(1), y: +z.y.toFixed(1), w: +z.width.toFixed(1), h: +z.height.toFixed(1), r: +z.right.toFixed(1), b: +z.bottom.toFixed(1) },
      p: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), w: +p.width.toFixed(1), h: +p.height.toFixed(1), r: +p.right.toFixed(1), b: +p.bottom.toFixed(1) },
      vw: innerWidth, vh: innerHeight
    };
  });
  console.log('layout', JSON.stringify(lay));
  chk(lay.z.w >= 48 && lay.z.w <= 72 && lay.z.h >= 48 && lay.z.h <= 72, 'zoom button is a compact HUD circle', lay.z);
  chk(lay.z.r <= lay.p.x + 2, 'zoom button sits to the left of the backpack', lay);
  chk(Math.abs((lay.z.y + lay.z.h / 2) - (lay.p.y + lay.p.h / 2)) < 24, 'zoom button vertically aligned with backpack', lay);
  chk(lay.z.x >= 0 && lay.z.r <= lay.vw && lay.z.y >= 0 && lay.z.b <= lay.vh, 'zoom button on screen', lay);

  const hold = await page.evaluate(() => {
    const A = window.__arcade, b = document.getElementById('bZoom'), r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    A.st.distUser = false; A.st.fp = false; A.st.yaw = 0.12; A.st.pitch = 0.28;
    A.st.dist = A.defaultDist();
    const home = A.st.dist, yaw0 = A.st.yaw, saved0 = localStorage.getItem(A.zoom.key);
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 11, pointerType: 'touch', clientX: cx, clientY: cy }));
    const on = !!A.zoomHold.on;
    for (let i = 0; i < 10; i++) A.tickZoom(0.1);
    const held = { dist: +A.st.dist.toFixed(3), k: +A.zoomHold.k.toFixed(3), yaw: +A.st.yaw.toFixed(4), saved: localStorage.getItem(A.zoom.key) };
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 11, pointerType: 'touch', clientX: cx, clientY: cy }));
    const off = !A.zoomHold.on;
    for (let i = 0; i < 10; i++) A.tickZoom(0.1);
    return {
      home, on, off, held,
      back: +A.st.dist.toFixed(3), k: +A.zoomHold.k.toFixed(3),
      yaw0, yawEnd: +A.st.yaw.toFixed(4),
      saved0, savedEnd: localStorage.getItem(A.zoom.key),
      min: A.zoom.min, holdT: A.zoom.holdT
    };
  });
  console.log('hold', JSON.stringify(hold));
  chk(Math.abs(hold.home - 4.2) < 0.05, 'portrait default distance is 4.2', hold);
  chk(hold.on, 'pointerdown starts a hold', hold);
  chk(hold.held.dist < hold.home - 1.2 && hold.held.dist <= hold.min + 0.15, 'holding zooms in toward 2.0', hold);
  chk(hold.off, 'pointerup ends the hold', hold);
  chk(Math.abs(hold.back - hold.home) < 0.15, 'release returns to the default distance', hold);
  chk(hold.k === 0, 'hold blend returns to 0 after release', hold);
  chk(Math.abs(hold.held.yaw - hold.yaw0) < 0.02 && Math.abs(hold.yawEnd - hold.yaw0) < 0.02, 'holding the button is not a swipe', hold);
  chk(hold.saved0 === hold.held.saved && hold.held.saved === hold.savedEnd, 'button does not persist zoom', hold);

  const swipe = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement;
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list }));
    };
    A.st.yaw = 0; A.st.pitch = 0.28;
    fire('touchstart', [{ id: 21, x: 280, y: 220 }]);
    fire('touchmove', [{ id: 21, x: 200, y: 220 }]);
    fire('touchend', [{ id: 21, x: 200, y: 220 }]);
    return { yaw: +A.st.yaw.toFixed(3), pitch: +A.st.pitch.toFixed(3) };
  });
  console.log('swipe', JSON.stringify(swipe));
  chk(Math.abs(swipe.yaw) > 0.2, 'one-finger swipe turns the camera', swipe);

  const pinch = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement;
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list }));
    };
    A.st.distUser = false; A.st.dist = A.defaultDist();
    const mid = A.st.dist;
    fire('touchstart', [{ id: 31, x: 180, y: 200 }]);
    fire('touchstart', [{ id: 32, x: 280, y: 200 }], [{ id: 31, x: 180, y: 200 }, { id: 32, x: 280, y: 200 }]);
    fire('touchmove', [{ id: 31, x: 120, y: 200 }], [{ id: 31, x: 120, y: 200 }, { id: 32, x: 280, y: 200 }]);
    fire('touchmove', [{ id: 32, x: 340, y: 200 }], [{ id: 31, x: 120, y: 200 }, { id: 32, x: 340, y: 200 }]);
    const apart = A.st.dist;
    fire('touchmove', [{ id: 31, x: 220, y: 200 }], [{ id: 31, x: 220, y: 200 }, { id: 32, x: 340, y: 200 }]);
    fire('touchmove', [{ id: 32, x: 250, y: 200 }], [{ id: 31, x: 220, y: 200 }, { id: 32, x: 250, y: 200 }]);
    const together = A.st.dist;
    fire('touchend', [{ id: 31, x: 220, y: 200 }], [{ id: 32, x: 250, y: 200 }]);
    fire('touchend', [{ id: 32, x: 250, y: 200 }]);
    return { mid, apart, together };
  });
  console.log('pinch', JSON.stringify(pinch));
  chk(Math.abs(pinch.apart - pinch.mid) < 0.15 && Math.abs(pinch.together - pinch.mid) < 0.15, 'pinch no longer changes camera distance', pinch);

  const joy = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement, joyEl = document.getElementById('joy');
    const c = joyEl.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list }));
    };
    A.monkey.position.set(0, 0, 0); A.st.vel.set(0, 0, 0); A.st.yaw = 0; A.st.face = 0;
    fire('touchstart', [{ id: 41, x: cx, y: cy }]);
    fire('touchmove', [{ id: 41, x: cx, y: cy - 140 }]);
    const joyOn = !!A.st.joy.on;
    for (let i = 0; i < 60; i++) A.step(1 / 60);
    const z = +A.monkey.position.z.toFixed(3);
    fire('touchend', [{ id: 41, x: cx, y: cy - 140 }]);
    return { joyOn, z };
  });
  console.log('joy', JSON.stringify(joy));
  chk(joy.joyOn && joy.z < -1.5, 'joystick still walks the player forward', joy);

  const both = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement, b = document.getElementById('bZoom');
    const joyEl = document.getElementById('joy');
    const c = joyEl.getBoundingClientRect(), jx = c.left + c.width / 2, jy = c.top + c.height / 2;
    const r = b.getBoundingClientRect(), zx = r.left + r.width / 2, zy = r.top + r.height / 2;
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list }));
    };
    A.st.distUser = false; A.st.fp = false; A.st.dist = A.defaultDist(); A.st.yaw = 0;
    A.monkey.position.set(0, 0, 0); A.st.vel.set(0, 0, 0); A.st.face = 0;
    const home = A.st.dist;
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 12, pointerType: 'touch', clientX: zx, clientY: zy }));
    fire('touchstart', [{ id: 51, x: jx, y: jy }]);
    fire('touchmove', [{ id: 51, x: jx, y: jy - 140 }]);
    fire('touchstart', [{ id: 52, x: 270, y: 180 }], [{ id: 51, x: jx, y: jy - 140 }, { id: 52, x: 270, y: 180 }]);
    fire('touchmove', [{ id: 52, x: 200, y: 180 }], [{ id: 51, x: jx, y: jy - 140 }, { id: 52, x: 200, y: 180 }]);
    for (let i = 0; i < 10; i++) A.tickZoom(0.1);
    for (let i = 0; i < 60; i++) A.step(1 / 60);
    const out = {
      hold: !!A.zoomHold.on, joyOn: !!A.st.joy.on,
      dist: +A.st.dist.toFixed(3), home,
      z: +A.monkey.position.z.toFixed(3), yaw: +A.st.yaw.toFixed(3)
    };
    fire('touchend', [{ id: 52, x: 200, y: 180 }], [{ id: 51, x: jx, y: jy - 140 }]);
    fire('touchend', [{ id: 51, x: jx, y: jy - 140 }]);
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 12, pointerType: 'touch', clientX: zx, clientY: zy }));
    for (let i = 0; i < 10; i++) A.tickZoom(0.1);
    out.back = +A.st.dist.toFixed(3);
    return out;
  });
  console.log('multi', JSON.stringify(both));
  chk(both.hold && both.joyOn, 'zoom hold and joystick can be down together', both);
  chk(both.dist < both.home - 1.2, 'holding zoom still closes in while the stick is used', both);
  chk(both.z < -1.5, 'joystick still walks while zoom is held', both);
  chk(Math.abs(both.yaw) > 0.15, 'a second finger still swipes to look while zoom is held', both);
  chk(Math.abs(both.back - both.home) < 0.15, 'release still returns to default after multi-touch', both);

  await page.setViewportSize({ width: 700, height: 390 });
  await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
  await page.waitForFunction(() => Math.abs(window.__arcade.defaultDist() - 7.6) < 0.05, null, { timeout: 8000 });

  const wide = await page.evaluate(() => {
    const A = window.__arcade, b = document.getElementById('bZoom'), p = document.getElementById('bPack');
    A.st.distUser = false; A.st.fp = false;
    window.dispatchEvent(new Event('resize'));
    A.st.dist = A.defaultDist();
    const zr = b.getBoundingClientRect(), pr = p.getBoundingClientRect();
    const cx = zr.left + zr.width / 2, cy = zr.top + zr.height / 2;
    const lay = { zRight: +zr.right.toFixed(1), pLeft: +pr.left.toFixed(1), on: b.classList.contains('on') && p.classList.contains('on') };
    const home = A.st.dist;
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 13, pointerType: 'touch', clientX: cx, clientY: cy }));
    for (let i = 0; i < 10; i++) A.tickZoom(0.1);
    const held = +A.st.dist.toFixed(3);
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 13, pointerType: 'touch', clientX: cx, clientY: cy }));
    for (let i = 0; i < 10; i++) A.tickZoom(0.1);
    const cv = A.renderer.domElement;
    const fire = (type, pts, rest) => {
      const list = pts.map(q => new Touch({ identifier: q.id, target: cv, clientX: q.x, clientY: q.y }));
      const stay = (rest || pts).map(q => new Touch({ identifier: q.id, target: cv, clientX: q.x, clientY: q.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list }));
    };
    A.st.yaw = 0;
    fire('touchstart', [{ id: 61, x: 480, y: 160 }]);
    fire('touchmove', [{ id: 61, x: 400, y: 160 }]);
    fire('touchend', [{ id: 61, x: 400, y: 160 }]);
    return { home, held, back: +A.st.dist.toFixed(3), yaw: +A.st.yaw.toFixed(3), lay };
  });
  console.log('landscape', JSON.stringify(wide));
  chk(Math.abs(wide.home - 7.6) < 0.05, 'landscape default distance is 7.6', wide);
  chk(wide.lay.on && wide.lay.zRight <= wide.lay.pLeft + 2, 'zoom button still sits left of backpack in landscape', wide.lay);
  chk(wide.held < wide.home - 2 && wide.held <= 2.15, 'holding zooms in from the wide default', wide);
  chk(Math.abs(wide.back - wide.home) < 0.15, 'release returns to the wide default', wide);
  chk(Math.abs(wide.yaw) > 0.2, 'one-finger swipe still turns the camera in landscape', wide);

  const pageErr = errors.filter(e => !/supabase|Failed to load|net::/i.test(e));
  chk(pageErr.length === 0, 'no page errors', pageErr);

  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
