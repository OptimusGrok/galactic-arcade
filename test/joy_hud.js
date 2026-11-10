// Bottom-left movement joystick: raised by half its height, faded ring/knob,
// every second dash-dot removed, dotted line overshoots the outer circle by 4 dots.
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700 });
  let ok = true;
  const chk = (c, m, extra) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!c) ok = false; };

  await page.evaluate(() => {
    const s = document.getElementById('start'); if (s) s.remove();
    if (window.__start) window.__start.dismissed = true;
    window.__gaNoTp = true;
    if (window.__arcade.st) window.__arcade.st.beamed = true;
    try { if (window.__gaPlayer && window.__gaPlayer.play) window.__gaPlayer.play(1); } catch (e) {}
    window.__arcade.simPause && window.__arcade.simPause(false);
  });
  await page.waitForFunction(() => {
    const j = document.getElementById('joy');
    return !!(j && j.classList.contains('arm') && window.__arcade && window.__arcade.joyFrom);
  }, null, { timeout: 20000 });

  const hud = await page.evaluate(() => {
    const j = document.getElementById('joy'), d = document.getElementById('joyDash');
    const r = j.getBoundingClientRect();
    const cs = getComputedStyle(j), ds = getComputedStyle(d);
    const dash = (ds.strokeDasharray || '').replace(/px/g, '');
    const parts = dash.split(/[,\s]+/).map(Number).filter(n => Number.isFinite(n) && n > 0);
    const period = parts.length >= 2 ? parts[0] + parts[1] : 0;
    return {
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      bottom: +(innerHeight - r.bottom).toFixed(1),
      left: +r.left.toFixed(1),
      opacity: parseFloat(cs.opacity),
      dash, period: +period.toFixed(2), gap: parts[1] || 0, dot: parts[0] || 0,
      oldBottom: 22
    };
  });
  console.log('hud', JSON.stringify(hud));
  chk(hud.w >= 110 && hud.h >= 110, 'joystick is the usual round HUD size', hud);
  chk(Math.abs(hud.bottom - (hud.oldBottom + hud.h / 2)) < 4, 'joystick sits half its own height higher than before', hud);
  chk(hud.left >= 0 && hud.y >= 0 && hud.bottom > 40, 'joystick stays on screen after the raise', hud);
  chk(hud.opacity > 0.2 && hud.opacity <= 0.65, 'ring and knob are faded / see-through', hud);
  chk(hud.gap >= 20 && hud.period >= 22, 'every second dot is gone (double spacing)', hud);

  const line = await page.evaluate(() => {
    const A = window.__arcade, j = document.getElementById('joy'), k = document.getElementById('knob');
    const d = document.getElementById('joyDash'), base = document.getElementById('joyBase');
    const r = j.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const fingerX = cx + 240, fingerY = cy - 240;
    A.joyFrom(fingerX, fingerY);
    const lineOn = document.getElementById('joyLine').classList.contains('on');
    const x1 = +d.getAttribute('x1'), y1 = +d.getAttribute('y1');
    const x2 = +d.getAttribute('x2'), y2 = +d.getAttribute('y2');
    const kr = k.getBoundingClientRect(), kx = kr.left + kr.width / 2, ky = kr.top + kr.height / 2;
    const br = base.getBoundingClientRect(), outerR = Math.min(br.width, br.height) / 2;
    const raw = getComputedStyle(d).strokeDasharray.replace(/px/gi, '');
    const da = raw.split(/[,\s]+/).map(Number).filter(n => Number.isFinite(n));
    const period = (da[0] || 1.5) + (da[1] || 21.5);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const past = len - outerR;
    const toKnob = Math.hypot(x2 - kx, y2 - ky);
    const toFinger = Math.hypot(x2 - fingerX, y2 - fingerY);
    let dotsPast = 0;
    for (let s = 0; s + (da[0] || 1.5) * 0.5 < len - 0.01; s += period) if (s > outerR + 0.01) dotsPast++;
    return {
      lineOn, joyOn: !!A.st.joy.on,
      len: +len.toFixed(2), outerR: +outerR.toFixed(2), past: +past.toFixed(2),
      wantPast: +(4 * period).toFixed(2), period: +period.toFixed(2), dotsPast,
      toKnob: +toKnob.toFixed(2), toFinger: +toFinger.toFixed(1)
    };
  });
  console.log('line', JSON.stringify(line));
  chk(line.lineOn && line.joyOn, 'a long drag shows the dotted line', line);
  chk(Math.abs(line.past - line.wantPast) < 2, 'line extends past the outer circle by exactly 4 dots', line);
  chk(line.dotsPast === 4, 'exactly 4 dots sit beyond the outer circle', line);
  chk(line.toKnob > 20, 'line does not stop at the knob', line);
  chk(line.toFinger > 80, 'line does not keep going all the way to the finger', line);

  const walk = await page.evaluate(() => {
    const A = window.__arcade, j = document.getElementById('joy');
    const r = j.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    A.monkey.position.set(0, 0, 0); A.st.vel.set(0, 0, 0); A.st.yaw = 0; A.st.face = 0;
    A.joyFrom(cx, cy - 140);
    for (let i = 0; i < 60; i++) A.step(1 / 60);
    const z = +A.monkey.position.z.toFixed(3);
    A.joyClear();
    return { z };
  });
  console.log('walk', JSON.stringify(walk));
  chk(walk.z < -1.5, 'raised joystick still walks the player forward', walk);

  const pageErr = errors.filter(e => !/supabase|Failed to load|net::/i.test(e));
  chk(pageErr.length === 0, 'no page errors', pageErr);

  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
