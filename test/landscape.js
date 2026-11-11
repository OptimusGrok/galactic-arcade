// Landscape start screen, fixed joystick, and a short flight/jump smoke. Phone viewports.
// node test/landscape.js
const { open } = require('./lib');
const fs = require('fs');
const START = '/workspace/artifacts/landscape_start.png';
const GAME = '/workspace/artifacts/landscape_game.png';
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };

const fit = () => {
  const box = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
  const vw = innerWidth, vh = innerHeight, bad = [];
  const see = (e, name) => {
    if (!e || e.hidden) return;
    const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return;
    const r = box(e);
    if (r.w < 8 || r.h < 8 || r.top < -1 || r.left < -1 || r.bottom > vh + 1 || r.right > vw + 1) bad.push({ name, r, vw, vh });
  };
  see(document.getElementById('gaIn'), 'name');
  see(document.getElementById('gaT'), 'title');
  document.querySelectorAll('#gaP .gaO').forEach((e, i) => see(e, 'opt' + i));
  see(document.getElementById('gaGo'), 'play');
  const p = document.getElementById('gaP');
  return { bad, n: document.querySelectorAll('#gaP .gaO').length, rows: document.querySelectorAll('#gaP .gaRow').length, scroll: p ? p.scrollHeight - p.clientHeight : 99, go: document.getElementById('gaGo') && !document.getElementById('gaGo').hidden };
};

(async () => {
  fs.mkdirSync('/workspace/artifacts', { recursive: true });
  const o = await open({ phone: true, start: true, w: 844, h: 390 });
  const page = o.page;
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 2 && document.getElementById('gaIn'), null, { timeout: 90000 });

  const wide = await page.evaluate(fit);
  chk(wide.rows === 0 && wide.n === 0 && wide.bad.length === 0 && wide.scroll <= 4 && !wide.go, 'landscape start shows player select without accessory rows, scrolling or Play', wide);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const tall = await page.evaluate(() => ({ hint: document.getElementById('turnHint').classList.contains('on'), name: document.getElementById('gaIn').getBoundingClientRect().height > 10 }));
  chk(tall.hint && tall.name, 'portrait shows a rotate hint and keeps the name field', tall);

  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForTimeout(250);
  const small = await page.evaluate(fit);
  chk(small.bad.length === 0 && small.scroll <= 4 && small.n === 0 && small.rows === 0, 'small landscape still fits player select without accessory rows', small);

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(200);
  await page.click('#gaIn');
  await page.keyboard.type('NovaPilot');
  await page.waitForTimeout(2300);
  const named = await page.evaluate(fit);
  chk(named.go && named.bad.length === 0 && named.scroll <= 4, 'a valid name shows Play inside the landscape screen', named);
  await page.screenshot({ path: START });

  const orient = await page.evaluate(async () => { window.__wantWide(); await new Promise(r => setTimeout(r, 50)); return { lock: window.__arcade.st.orientLock || '', w: innerWidth, h: innerHeight }; });
  chk(orient.lock !== 'ok' || orient.w > orient.h, 'orientation lock is not reported as working unless the view is actually landscape', orient);
  console.log('orient', JSON.stringify(orient));

  await page.evaluate(() => { window.__gaNoTp = true; window.__arcade.st.beamed = true; window.__gaPlayer.play(1); });
  await page.waitForFunction(() => window.__start && window.__start.dismissed && document.getElementById('joy').classList.contains('arm') && window.__tp && window.__tp.state === 'idle' && !window.__tp.locked, null, { timeout: 20000 });
  await page.evaluate(() => window.__arcade.simPause(true));

  const speeds = await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement, joy = document.getElementById('joy'), dash = document.getElementById('joyDash');
    const c = joy.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2, R = c.width / 2 - 12;
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: cv, clientX: p.x, clientY: p.y }));
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : list, changedTouches: list }));
    };
    const end = (id, x, y) => fire('touchend', [{ id, x, y }]);
    const run = (dx, dy) => {
      A.monkey.position.set(0, 0, 5); A.st.vel.set(0, 0, 0); A.st.yaw = 0; A.keys.Space = false;
      fire('touchstart', [{ id: 1, x: cx, y: cy }]);
      fire('touchmove', [{ id: 1, x: cx + dx, y: cy + dy }]);
      let sp = 0;
      for (let i = 0; i < 90; i++) { A.step(1 / 60); sp = Math.max(sp, A.st.speed); }
      const line = { on: document.getElementById('joyLine').classList.contains('on'), x2: +dash.getAttribute('x2'), y2: +dash.getAttribute('y2') };
      const reach = Math.hypot(line.x2 - cx, line.y2 - cy);
      const out = { vmax: +A.st.joy.vmax.toFixed(2), sp: +sp.toFixed(2), reach: +reach.toFixed(1), past: reach > R + 8, line: line.on };
      end(1, cx + dx, cy + dy);
      return out;
    };
    const short = run(0, -40), mid = run(0, -90), long = run(190, 0);
    fire('touchstart', [{ id: 1, x: cx, y: cy }]);
    fire('touchmove', [{ id: 1, x: cx + 190, y: cy }]);
    for (let i = 0; i < 20; i++) A.step(1 / 60);
    end(1, cx + 190, cy);
    const released = { on: A.st.joy.on, line: document.getElementById('joyLine').classList.contains('on') };
    for (let i = 0; i < 40; i++) A.step(1 / 60);
    const stopped = { sp: +A.st.speed.toFixed(2) };
    fire('touchstart', [{ id: 3, x: cx, y: cy }]);
    fire('touchmove', [{ id: 3, x: cx + 160, y: cy }]);
    fire('touchcancel', [{ id: 3, x: cx + 160, y: cy }]);
    const cancelled = { on: A.st.joy.on, line: document.getElementById('joyLine').classList.contains('on') };
    A.monkey.position.set(0, 0, 4); A.st.vel.set(0, 0, 0); A.st.yaw = 0;
    fire('touchstart', [{ id: 1, x: cx, y: cy }]);
    fire('touchmove', [{ id: 1, x: cx, y: cy - 150 }]);
    const y0 = A.st.yaw;
    fire('touchstart', [{ id: 2, x: 700, y: 200 }], [{ id: 1, x: cx, y: cy - 150 }, { id: 2, x: 700, y: 200 }]);
    fire('touchmove', [{ id: 2, x: 640, y: 200 }], [{ id: 1, x: cx, y: cy - 150 }, { id: 2, x: 640, y: 200 }]);
    for (let i = 0; i < 20; i++) A.step(1 / 60);
    const both = { joy: A.st.joy.on, sp: +A.st.speed.toFixed(2), dyaw: +(A.st.yaw - y0).toFixed(3) };
    fire('touchend', [{ id: 2, x: 640, y: 200 }], [{ id: 1, x: cx, y: cy - 150 }]);
    fire('touchend', [{ id: 1, x: cx, y: cy - 150 }]);
    const j0 = A.st.jumps || 0;
    fire('touchstart', [{ id: 4, x: 760, y: 200 }]);
    fire('touchend', [{ id: 4, x: 762, y: 202 }]);
    for (let i = 0; i < 8; i++) A.step(1 / 60);
    const jumped = (A.st.jumps || 0) > j0;
    A.monkey.position.set(0, 0, 4); A.st.vel.set(0, 0, 0); A.st.yaw = 0;
    fire('touchstart', [{ id: 1, x: cx, y: cy }]);
    fire('touchmove', [{ id: 1, x: cx - 200, y: cy }]);
    let minX = 0;
    for (let i = 0; i < 80; i++) { A.step(1 / 60); minX = Math.min(minX, A.monkey.position.x); }
    end(1, cx - 200, cy);
    const wall = { x: +minX.toFixed(2) };
    return { short, mid, long, released, stopped, cancelled, both, jumped, wall, R: +R.toFixed(1), cx: +cx.toFixed(1), cy: +cy.toFixed(1) };
  });
  console.log('speeds', JSON.stringify(speeds));
  chk(speeds.short.vmax > 0.8 && speeds.short.vmax < speeds.mid.vmax && speeds.mid.vmax < speeds.long.vmax && speeds.long.vmax <= 5.21 && speeds.long.vmax > 5, 'short, medium and long drags raise speed up to the sprint cap', speeds);
  chk(speeds.short.sp < speeds.mid.sp && speeds.mid.sp < speeds.long.sp && speeds.long.sp <= 5.25, 'the body actually moves faster as the drag gets longer', speeds);
  chk(speeds.long.line && speeds.long.past, 'the dotted line reaches past the base while the thumb stays inside', speeds.long);
  chk(!speeds.released.on && !speeds.released.line && speeds.stopped.sp < 0.25, 'release clears the stick and the line and the walk stops', { released: speeds.released, stopped: speeds.stopped });
  chk(!speeds.cancelled.on && !speeds.cancelled.line, 'a cancelled touch clears the stick', speeds.cancelled);
  chk(speeds.both.joy && speeds.both.sp > 1 && Math.abs(speeds.both.dyaw) > 0.05 && speeds.jumped, 'a second finger can turn the camera and a right-side tap still jumps', speeds.both);
  chk(speeds.wall.x < -1 && speeds.wall.x > -11.7, 'a full sprint still stops at the wall', speeds.wall);

  await page.evaluate(() => {
    const A = window.__arcade, cv = A.renderer.domElement, joy = document.getElementById('joy');
    const c = joy.getBoundingClientRect();
    const t = new Touch({ identifier: 9, target: cv, clientX: c.left + c.width / 2 + 188, clientY: c.top + c.height / 2 });
    const t0 = new Touch({ identifier: 9, target: cv, clientX: c.left + c.width / 2, clientY: c.top + c.height / 2 });
    cv.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t0], changedTouches: [t0] }));
    cv.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [t], changedTouches: [t] }));
    A.monkey.position.set(0, 0, 2); A.st.yaw = 0; A.st.pitch = 0.22; A.st.fp = false; A.simPause(false);
  });
  await page.waitForFunction(() => window.__arcade.stats.frames > 4, null, { timeout: 15000 });
  await page.screenshot({ path: GAME });
  await page.evaluate(() => window.__arcade.simPause(true));

  const fly = await page.evaluate(() => {
    localStorage.setItem('galacticarcade.wardrobeMig', '1');
    localStorage.setItem('galacticarcade.wardrobeOwned', JSON.stringify(['back:jetpack']));
    window.__gaPlayer.pick('back', 'jetpack');
    const A = window.__arcade, st = A.st;
    A.monkey.position.set(0, 0, 4); st.vel.set(0, 0, 0); st.fly.e = 1; st.fly.air = false; A.keys.Space = true;
    for (let i = 0; i < 20; i++) A.step(1 / 60);
    let vis = 0; const g = A.monkey.getObjectByName('gaBk_jetpack');
    if (g) for (let i = 0; i < g.children.length; i++) if (g.children[i].name === 'gaThruster' && g.children[i].visible) vis++;
    const up = { y: +A.monkey.position.y.toFixed(2), e: +st.fly.e.toFixed(3), vis, thrust: st.fly.thrust };
    A.keys.Space = false;
    for (let i = 0; i < 10; i++) A.step(1 / 60);
    return { up, glide: st.fly.thrust, drain: A.flyCfg.drain, ticket: window.__shop && window.__shop.dome && window.__shop.dome.y, appear: window.__grokVisit && window.__grokVisit.appearAfter };
  });
  chk(fly.up.y > 0.4 && fly.up.e < 0.98 && fly.up.vis === 2 && fly.up.thrust && !fly.glide && fly.drain === 0.125, 'jetpack still thrusts, shows both flames, and stops thrust on release', fly);
  chk(fly.ticket === 21.45 && fly.appear === 30, 'dome ticket height and the 30s Grok visit are unchanged', fly);

  const kept = await page.evaluate(() => ({ name: localStorage.getItem('galacticarcade.player'), cache: (self.__cacheNote || '') }));
  chk(/NovaPilot/.test(kept.name || ''), 'the typed name stayed in the saved look', kept);

  await o.close();

  const d = await open({ w: 1280, h: 720 });
  await d.page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 2, null, { timeout: 90000 });
  const desk = await d.page.evaluate(() => {
    const A = window.__arcade;
    A.simPause(true); A.monkey.position.set(0, 0, 5); A.st.vel.set(0, 0, 0); A.st.yaw = 0; A.keys.KeyW = true;
    for (let i = 0; i < 30; i++) A.step(1 / 60);
    A.keys.KeyW = false;
    const joy = document.getElementById('joy');
    return { z: +A.monkey.position.z.toFixed(2), arm: joy.classList.contains('arm'), shown: getComputedStyle(joy).display !== 'none', hint: document.getElementById('turnHint').classList.contains('on') };
  });
  chk(desk.z < 4.2 && !desk.arm && !desk.shown && !desk.hint, 'desktop still walks with the keyboard and does not show the phone stick or rotate hint', desk);
  const man = await d.page.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()).orientation);
  chk(man === 'landscape', 'installed app asks for landscape', man);
  await d.close();

  chk(fs.existsSync(START) && fs.statSync(START).size > 8000 && fs.existsSync(GAME) && fs.statSync(GAME).size > 8000, 'screenshots written');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
