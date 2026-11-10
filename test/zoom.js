// Wheel zoom: clamps and persistence. Pinch no longer changes distance; joystick+look still works.
const { open } = require('./lib');
const fs = require('fs');
const OUT = '/workspace';
(async () => {
  const { page, close } = await open({ phone: true, w: 844, h: 390 });
  let ok = true; const chk = (c, m, extra) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra ? ' ' + JSON.stringify(extra) : '')); if (!c) ok = false; };

  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  await page.evaluate(() => {
    try { localStorage.removeItem('galacticarcade.zoom'); } catch (e) {}
    const s = document.getElementById('start'); if (s) s.remove();
    if (window.__start) window.__start.dismissed = true;
    window.__gaNoTp = true;
    if (window.__arcade.st) { window.__arcade.st.distUser = false; window.__arcade.st.beamed = true; }
  });
  // dismiss start properly if still there
  await page.evaluate(() => { try { if (window.__gaPlayer && window.__gaPlayer.play) window.__gaPlayer.play(1); } catch (e) {} });
  await page.waitForFunction(() => window.__start && window.__start.dismissed && window.__arcade.joyFrom, null, { timeout: 30000 }).catch(() => {});
  // keep RAF running so zoom screenshots actually re-render
  await page.evaluate(() => { window.__arcade.simPause && window.__arcade.simPause(false); });

  const basics = await page.evaluate(() => {
    const A = window.__arcade, Z = A.zoom;
    // reset to wide default for landscape
    A.st.distUser = false; A.st.fp = false;
    A.st.dist = Z.wide;
    return { min: Z.min, max: Z.max, wide: Z.wide, dist: A.st.dist, key: Z.key };
  });
  console.log('basics', JSON.stringify(basics));
  chk(basics.min === 2 && basics.max === 15.2 && basics.wide === 7.6, 'zoom clamps / wide default', basics);

  // wheel zoom in (negative deltaY → closer)
  const wheel = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement;
    A.setDist(A.zoom.wide);
    const d0 = A.st.dist;
    cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -400, bubbles: true, cancelable: true }));
    const closer = A.st.dist;
    cv.dispatchEvent(new WheelEvent('wheel', { deltaY: 8000, bubbles: true, cancelable: true }));
    const far = A.st.dist;
    A.setDist(A.zoom.min - 5);
    const atMin = A.st.dist;
    A.setDist(A.zoom.max + 5);
    const atMax = A.st.dist;
    const saved = localStorage.getItem(A.zoom.key);
    return { d0, closer, far, atMin, atMax, saved, distUser: !!A.st.distUser };
  });
  console.log('wheel', JSON.stringify(wheel));
  chk(wheel.closer < wheel.d0, 'wheel zoom in shortens dist');
  chk(wheel.far > wheel.closer && wheel.far <= basics.max + 0.001, 'wheel zoom out lengthens up to max');
  chk(wheel.atMin === basics.min && wheel.atMax === basics.max, 'setDist clamps');
  chk(wheel.distUser && wheel.saved, 'zoom persists to localStorage');

  // pinch: two fingers on game view (not joy)
  const pinch = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement;
    A.setDist(A.zoom.wide);
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list }));
    };
    // start two fingers 100px apart near centre
    fire('touchstart', [{ id: 1, x: 400, y: 180 }]);
    fire('touchstart', [{ id: 2, x: 500, y: 180 }], [{ id: 1, x: 400, y: 180 }, { id: 2, x: 500, y: 180 }]);
    const mid = A.st.dist;
    // pinch apart → zoom in (update each finger, keep both in touches)
    fire('touchmove', [{ id: 1, x: 320, y: 180 }], [{ id: 1, x: 320, y: 180 }, { id: 2, x: 500, y: 180 }]);
    fire('touchmove', [{ id: 2, x: 580, y: 180 }], [{ id: 1, x: 320, y: 180 }, { id: 2, x: 580, y: 180 }]);
    const inDist = A.st.dist;
    // pinch together → zoom out
    fire('touchmove', [{ id: 1, x: 450, y: 180 }], [{ id: 1, x: 450, y: 180 }, { id: 2, x: 580, y: 180 }]);
    fire('touchmove', [{ id: 2, x: 470, y: 180 }], [{ id: 1, x: 450, y: 180 }, { id: 2, x: 470, y: 180 }]);
    const outDist = A.st.dist;
    // end both — must not jump
    const j0 = A.st.jumps || 0;
    fire('touchend', [{ id: 1, x: 450, y: 180 }], [{ id: 2, x: 470, y: 180 }]);
    fire('touchend', [{ id: 2, x: 470, y: 180 }]);
    for (let i = 0; i < 6; i++) A.step(1 / 60);
    const jumped = (A.st.jumps || 0) > j0;
    return { mid, inDist, outDist, jumped };
  });
  console.log('pinch', JSON.stringify(pinch));
  chk(Math.abs(pinch.inDist - pinch.mid) < 0.15, 'pinch apart no longer zooms', pinch);
  chk(Math.abs(pinch.outDist - pinch.inDist) < 0.15, 'pinch together no longer zooms', pinch);
  chk(!pinch.jumped, 'ending a two-finger drag does not jump', pinch);

  // joystick + second finger still turns (not treated as pinch alone with joy)
  const both = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement, joy = document.getElementById('joy');
    const c = joy.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list }));
    };
    A.monkey.position.set(0, 0, 4); A.st.vel.set(0, 0, 0); A.st.yaw = 0;
    A.setDist(A.zoom.wide);
    fire('touchstart', [{ id: 1, x: cx, y: cy }]);
    fire('touchmove', [{ id: 1, x: cx, y: cy - 140 }]);
    const y0 = A.st.yaw, d0 = A.st.dist;
    fire('touchstart', [{ id: 2, x: 700, y: 200 }], [{ id: 1, x: cx, y: cy - 140 }, { id: 2, x: 700, y: 200 }]);
    fire('touchmove', [{ id: 2, x: 640, y: 200 }], [{ id: 1, x: cx, y: cy - 140 }, { id: 2, x: 640, y: 200 }]);
    for (let i = 0; i < 20; i++) A.step(1 / 60);
    const dyaw = A.st.yaw - y0, dist = A.st.dist, joyOn = A.st.joy.on;
    fire('touchend', [{ id: 2, x: 640, y: 200 }], [{ id: 1, x: cx, y: cy - 140 }]);
    fire('touchend', [{ id: 1, x: cx, y: cy - 140 }]);
    // right-side tap still jumps
    const j0 = A.st.jumps || 0;
    fire('touchstart', [{ id: 4, x: 760, y: 200 }]);
    fire('touchend', [{ id: 4, x: 762, y: 202 }]);
    for (let i = 0; i < 8; i++) A.step(1 / 60);
    return { joyOn, dyaw: +dyaw.toFixed(3), distChanged: Math.abs(dist - d0) > 0.05, jumped: (A.st.jumps || 0) > j0 };
  });
  console.log('both', JSON.stringify(both));
  chk(both.joyOn && Math.abs(both.dyaw) > 0.05 && !both.distChanged, 'joy + one look finger turns without pinching', both);
  chk(both.jumped, 'right-side tap still jumps', both);

  // screenshots: zoomed in / out at landscape 844x390 (live RAF frames)
  const shoot = async (dist, path) => {
    await page.evaluate(async (d) => {
      const A = window.__arcade;
      window.__camOverride = null;
      A.monkey.visible = true;
      A.monkey.position.set(0, 0, 2.5);
      A.st.yaw = 0.55; A.st.pitch = 0.28; A.st.fp = false; A.st.face = Math.PI;
      A.monkey.rotation.y = A.st.face;
      A.setDist(d, false); A.st.camInit = false;
      await new Promise(r => { let n = 0; const t = () => { if (++n >= 24) r(); else requestAnimationFrame(t); }; requestAnimationFrame(t); });
    }, dist);
    await page.waitForTimeout(250);
    await page.screenshot({ path });
    console.log('shot', path, fs.statSync(path).size);
  };
  await shoot(2.3, OUT + '/zoom-in.png');
  await shoot(14.5, OUT + '/zoom-out.png');

  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
