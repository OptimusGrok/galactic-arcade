// t245 lag check: frame times + JS heap + draw calls in the MONKEY CROSSING demo view (overlay + demo music) and walking near cabinets.
// GA_ROOT=<dir> node test/perf_demo.js <label>   (compare kit vs no-kit in the same session; numbers are relative)
const { open } = require('./lib'); const { helpers } = require('./cabflow');
(async () => { const label = process.argv[2] || 'run';
  const { page, close } = await open({ phone: true, w: 412, h: 915, shieldOpen: true }); page.setDefaultTimeout(90000); const H = helpers(page, true);
  await page.evaluate(() => { window.__noAdapt = 1; const p = window.__arcade.play; p.tickets.total = 50; localStorage.setItem('neonarcade.tickets', '50'); });
  const meas = ms => page.evaluate(ms => new Promise(done => { const d = []; let l = performance.now(), t0 = l; const A = window.__arcade;
    (function f(n) { d.push(n - l); l = n; if (n - t0 < ms) requestAnimationFrame(f); else { d.shift(); d.sort((a, b) => a - b);
      done({ n: d.length, med: +d[d.length >> 1].toFixed(1), p95: +d[Math.floor(d.length * .95)].toFixed(1), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, calls: A.renderer ? A.renderer.info.render.calls : null }); } })(l); }), ms);
  const name = await page.evaluate(() => window.__arcade.play.machines.monkey.cab.name);
  await H.goTo(name); await page.waitForTimeout(2500); const near = await meas(8000);
  for (let i = 0; i < 6 && await page.evaluate(() => window.__arcade.play.mode === 'walk'); i++) { await page.evaluate(n => { const A = window.__arcade, u = A.playables.find(k => k.name === n).userData; A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.vel.set(0, 0, 0); }, name);
    await page.waitForFunction(n => window.__arcade.play.near() === n, name, { timeout: 60000 }).catch(() => {}); await page.evaluate(n => { if (window.__arcade.play.near() === n) window.__arcade.play.press(); }, name); await page.waitForTimeout(800); }
  await H.zoomToDemo(); await page.waitForTimeout(2500); const demo = await meas(8000);
  console.log('PERF_DEMO ' + label + ' ' + JSON.stringify({ near, demo, kit: await page.evaluate(() => !!window.__cabMusic), cab: await page.evaluate(() => window.__cabMusic ? window.__cabMusic.cur : null) }));
  await close(); })().catch(e => { console.log('FAIL ' + e.message); process.exit(1); });
