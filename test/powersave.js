// Phone power-save: on by default under touch/mobile emulation. Caps GPU draws at ~30fps
// (physics still uses real dt so walk speed stays the same), clamps devicePixelRatio,
// and pauses drawing while the tab is hidden. Usage: node test/powersave.js
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700 });
  let ok = true;
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };

  const info = await page.evaluate(() => {
    const A = window.__arcade, P = window.__powerSave;
    return {
      on: !!(P && P.on), fps: P && P.fps, dpr: A.renderer.getPixelRatio(),
      key: P && P.key, ls: localStorage.getItem('neonarcade.powersave'),
      uaMobile: /Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches)
    };
  });
  console.log('boot', JSON.stringify(info));
  chk(info.uaMobile, 'phone context reports touch/mobile');
  chk(info.on, 'power save on by default on phone');
  chk(info.fps === 30, 'fps cap is 30, got ' + info.fps);
  chk(info.dpr <= 1.251, 'pixel ratio clamped to 1.25, got ' + info.dpr);

  await page.evaluate(() => { window.__noAdapt = 1; });
  const stepped = await page.evaluate(() => {
    const A = window.__arcade;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(0, 0, 0);
    A.st.yaw = 0; A.st.face = 0; A.keys.KeyW = true;
    for (let i = 0; i < 60; i++) A.step(1 / 60);
    A.keys.KeyW = false;
    return +A.monkey.position.z.toFixed(3);
  });
  console.log('stepWalk', stepped);
  chk(stepped < -1.5 && stepped > -3.3, '1s of step() still walks at normal speed z=' + stepped);

  const liveWalk = async (on) => {
    await page.evaluate(on => {
      const A = window.__arcade, P = window.__powerSave;
      if (!!P.on !== !!on) P.set(on);
      A.st.vel.set(0, 0, 0); A.monkey.position.set(0, 0, 0);
      A.st.yaw = 0; A.st.face = 0; A.st.camInit = false;
      A.keys.KeyW = true;
    }, on);
    await page.waitForTimeout(1200);
    return page.evaluate(() => { const A = window.__arcade; A.keys.KeyW = false; return +A.monkey.position.z.toFixed(3); });
  };
  const zOn = await liveWalk(true);
  const zOff = await liveWalk(false);
  await page.evaluate(() => { window.__powerSave.set(true); });
  console.log('liveWalk', JSON.stringify({ zOn, zOff }));
  chk(Math.abs(zOn - zOff) < 0.6, 'live walk distance similar with power save on/off ' + zOn + ' vs ' + zOff);
  chk(zOn < -0.2 && zOff < -0.2, 'live walk still moves forward on=' + zOn + ' off=' + zOff);

  const measure = async (ms) => {
    const m0 = await page.evaluate(() => {
      const P = window.__powerSave, A = window.__arcade;
      return { draws: P.draws, skipped: P.skipped, frames: A.stats.frames, t: performance.now() };
    });
    await page.waitForTimeout(ms);
    return page.evaluate(m0 => {
      const P = window.__powerSave, A = window.__arcade, dt = (performance.now() - m0.t) / 1000;
      return {
        dt: +dt.toFixed(2),
        drawRate: +((P.draws - m0.draws) / dt).toFixed(2),
        loopRate: +((A.stats.frames - m0.frames) / dt).toFixed(2),
        skipped: P.skipped - m0.skipped,
        draws: P.draws - m0.draws
      };
    }, m0);
  };

  await page.evaluate(() => { window.__powerSave.fps = 1000; });
  const uncapped = await measure(1500);
  await page.evaluate(() => { window.__powerSave.fps = 30; window.__powerSave.lastDraw = 0; });
  const capped = await measure(2000);
  await page.evaluate(() => { window.__powerSave.fps = 6; window.__powerSave.lastDraw = 0; });
  const tight = await measure(1500);
  await page.evaluate(() => { window.__powerSave.fps = 30; });
  console.log('RATES', JSON.stringify({ uncapped, capped, tight }));
  chk(capped.drawRate <= 36, '30fps cap: drawRate ' + capped.drawRate + ' (loop ' + capped.loopRate + ')');
  chk(tight.drawRate <= 10, '6fps cap holds, drawRate ' + tight.drawRate);
  if (uncapped.loopRate > 36) chk(capped.drawRate + 2 < uncapped.drawRate || capped.skipped > 0, 'cap skips draws vs uncapped ' + uncapped.drawRate + ' -> ' + capped.drawRate);

  const probe = await page.evaluate(() => new Promise(res => {
    const r = window.__arcade.renderer, orig = r.render, P = window.__powerSave;
    r.render = function () {};
    P.fps = 30; P.lastDraw = 0;
    const m0 = { draws: P.draws, skipped: P.skipped, frames: window.__arcade.stats.frames, t: performance.now() };
    setTimeout(() => {
      const dt = (performance.now() - m0.t) / 1000;
      const out = { drawRate: +((P.draws - m0.draws) / dt).toFixed(2), loopRate: +((window.__arcade.stats.frames - m0.frames) / dt).toFixed(2), skipped: P.skipped - m0.skipped };
      r.render = orig; P.fps = 30; res(out);
    }, 800);
  }));
  console.log('skipProbe', JSON.stringify(probe));
  if (probe.skipped > 0) chk(probe.drawRate <= probe.loopRate + 0.05, 'frame skip active: loop ' + probe.loopRate + ' fps, draws ' + probe.drawRate + ', skipped ' + probe.skipped);
  else if (probe.loopRate > 36) chk(false, 'expected skips when loop is above 30fps ' + JSON.stringify(probe));
  else console.log('NOTE skip-probe loop still at/under the cap under software GL (' + probe.loopRate + ' fps)');

  const h0 = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    return window.__powerSave.draws;
  });
  await page.waitForTimeout(700);
  const h1 = await page.evaluate(() => ({ draws: window.__powerSave.draws, hiddenSkips: window.__powerSave.hiddenSkips }));
  chk(h1.draws === h0, 'hidden tab: no new draws (' + h0 + ' -> ' + h1.draws + ')');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(250);

  const off = await page.evaluate(() => {
    const on = window.__powerSave.set(false);
    return { on, ls: localStorage.getItem('neonarcade.powersave'), dpr: window.__arcade.renderer.getPixelRatio() };
  });
  chk(off.on === false && off.ls === '0', 'API toggle off saved ' + JSON.stringify(off));
  chk(off.dpr <= 1.501, 'mobile dpr cap without power save is 1.5, got ' + off.dpr);

  await page.evaluate(() => { window.__powerSave.set(true); });
  await page.click('#bOpt');
  await page.waitForSelector('#gOpt.on', { timeout: 10000 });
  const label = await page.evaluate(() => document.getElementById('opCool') && document.getElementById('opCool').textContent.replace(/\s+/g, ' ').trim());
  chk(/COOLER PHONE:\s*ON/.test(label || ''), 'OPTIONS shows COOLER PHONE toggle: ' + label);
  await page.click('#opCool');
  const after = await page.evaluate(() => ({
    on: window.__powerSave.on,
    ls: localStorage.getItem('neonarcade.powersave'),
    text: document.getElementById('opCool').textContent.replace(/\s+/g, ' ').trim()
  }));
  chk(after.on === false && after.ls === '0' && /OFF/.test(after.text), 'OPTIONS toggle turns it off ' + JSON.stringify(after));

  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + (e.stack || e.message)); process.exit(1); });
