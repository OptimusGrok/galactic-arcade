// fps probe (phone viewport, software GL so numbers are relative, not absolute). Usage: node test/perf.js [label]
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, shieldOpen: true });
  await page.evaluate(() => { window.__noAdapt = 1; });
  const views = [['room1 centre facing north', 0, 4, 0], ['room1 near doorway facing north', 0, -8, 0], ['room1 facing south', 0, -4, Math.PI]];
  const hasR2 = await page.evaluate(() => !!window.__arcade.room2);
  if (hasR2) views.push(['hallway facing north', 0, -14.5, 0], ['room2 centre facing north', 0, -31, 0], ['room2 facing south (doorway)', 0, -25, Math.PI]);
  const out = {};
  for (const [name, x, z, yaw] of views) {
    await page.evaluate(([x, z, yaw]) => { const A = window.__arcade; A.monkey.position.set(x, 0, z); A.st.yaw = yaw; A.st.camInit = false; A.st.vel.set(0, 0, 0); }, [x, z, yaw]);
    await page.waitForTimeout(1500);
    const f0 = await page.evaluate(() => { const A = window.__arcade; A.renderer.info.autoReset = false; A.renderer.info.reset(); return [A.stats.frames, performance.now()]; });
    await page.waitForTimeout(4000);
    const r = await page.evaluate(f0 => { const A = window.__arcade, i = A.renderer.info.render; const nf = Math.max(1, A.stats.frames - f0[0]); return { fps: +(nf / ((performance.now() - f0[1]) / 1000)).toFixed(1), callsPerFrame: Math.round(i.calls / nf), trisPerFrame: Math.round(i.triangles / nf), r1: A.room.visible, r2: A.room2 ? A.room2.visible : null, cpu: +A.stats.cpuAvg.toFixed(1) }; }, f0);
    out[name] = r; console.log('FPS', name, JSON.stringify(r));
  }
  console.log('PERF', process.argv[2] || '', JSON.stringify(out));
  console.log(errors.length ? 'FAIL errors ' + errors.join('|') : 'PASS no page errors');
  await close(); process.exit(errors.length ? 1 : 0);
})();
