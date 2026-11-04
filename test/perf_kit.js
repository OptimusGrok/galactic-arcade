// Frame times walking room 1 past the cabinets on a 412x915 phone with CDP CPU throttling x4.
// Usage: GA_ROOT=<dir> node perf.js <label>. Software GL (swiftshader) -> numbers are relative (before vs after), not phone fps.
const { open } = require('./lib');
(async () => {
  const label = process.argv[2] || 'run';
  const { page, errors, close } = await open({ phone: true, w: 412, h: 915, dsf: +(process.env.DSF || 1) });
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.THROTTLE || 4) });
  await page.evaluate(() => { window.__noAdapt = 1; window.__arcade.st.fp = false; });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => new Promise(done => {
    const A = window.__arcade, pts = A.playables.filter(c => c.userData.front && Math.abs(c.userData.front.z) < 12).map(c => [c.userData.front.x, c.userData.front.z]);
    pts.push([0, 4]); const D = 14000, t0 = performance.now(); let last = t0; const dts = [];
    function step(now) { dts.push(now - last); last = now; const k = (now - t0) / D, f = k * pts.length, i = Math.floor(f) % pts.length, j = (i + 1) % pts.length, u = f - Math.floor(f);
      const x = pts[i][0] + (pts[j][0] - pts[i][0]) * u, z = pts[i][1] + (pts[j][1] - pts[i][1]) * u; A.monkey.position.set(x, 0, z); A.st.vel.set(0, 0, 0);
      if (now - t0 < D) requestAnimationFrame(step); else { dts.shift(); const s = dts.slice().sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
        done({ frames: dts.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +s[s.length - 1].toFixed(1), kit: !!window.__cabMusic, cabSwitches: window.__cabMusic ? window.__cabMusic.starts : 0 }); } }
    requestAnimationFrame(step); }));
  if (r.kit) r.kitCost = await page.evaluate(() => { const C = window.__cabMusic, t0 = performance.now(); for (let i = 0; i < 500; i++) C.tick(); const tick = (performance.now() - t0) / 500;
    const D = window.__cabDemo, t1 = performance.now(); for (let i = 0; i < 500; i++) D.render({ key: 'monkey', credits: 0, cost: 5, tickets: 132, coarse: true }); return { tickMs: +tick.toFixed(4), renderMs: +((performance.now() - t1) / 500).toFixed(4) }; });
  console.log('PERF', label, JSON.stringify(r)); await close(); process.exit(0);
})();
