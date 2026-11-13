// t768u/t769u: frame times right as the player enters the arcade (start screen -> PLAY -> room), first ~5 s.
// Usage: node test/perf_entry.js [desktop|ipad]  (ipad = 820x1180 touch + CDP CPU throttle x4). PROFILE=file.json dumps a CPU profile.
// Software GL -> absolute ms are not device numbers; compare before/after on the same box. ENTRY_MAX_* env = pass limits.
const { open, play } = require('./lib');
const fs = require('fs');
(async () => {
  const mode = process.argv[2] || 'desktop', ipad = mode === 'ipad';
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const o = await open(ipad ? { phone: true, w: +(process.env.EW || 820), h: +(process.env.EH || 1180), dsf: +(process.env.DSF || 1), start: true, supa } : { start: true, w: +(process.env.EW || 1280), h: +(process.env.EH || 720), supa }); const page = o.page; page.setDefaultTimeout(120000);
  await page.evaluate(() => localStorage.removeItem('galacticarcade.player')); await page.reload();
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  await page.waitForTimeout(4000);   // start screen idle (what the player sees before PLAY)
  const cdp = await page.context().newCDPSession(page);
  if (ipad) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.THROTTLE || 4) });
  // type the name first (not measured), then measure from the PLAY tap
  await page.waitForSelector('#gaIn'); await page.locator('#gaIn').click(); await page.keyboard.type('Tester');
  await page.waitForSelector('#gaGo:not([hidden])', { timeout: 20000 }); await page.waitForTimeout(1500);
  await page.evaluate(() => { const R = window.__entryRec = { dts: [], lt: [], t0: 0 }; let last = 0;
    const loop = now => { if (R.t0 && now - R.t0 > 5000) return; if (last && R.t0) R.dts.push([+(now - R.t0).toFixed(0), +(now - last).toFixed(1)]); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (R.t0 && e.startTime >= R.t0) R.lt.push([+(e.startTime - R.t0).toFixed(0), +e.duration.toFixed(0)]); }).observe({ type: 'longtask', buffered: false }); } catch (e) {} });
  if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  if (process.env.DIAG) console.log('PRE', JSON.stringify(await page.evaluate(() => { const A = window.__arcade; window.__pre = new Set((A.renderer.info.programs || []).map(p => p.cacheKey));
    return { warm: window.__warm && { done: window.__warm.done, n: window.__warm.n, ms: Math.round(window.__warm.ms) }, programs: A.renderer.info.programs.length }; })));
  await page.evaluate(() => { window.__entryRec.t0 = performance.now(); });
  const b = await page.locator('#gaGo').boundingBox(); if (ipad) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(5600);
  if (process.env.PROFILE) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(process.env.PROFILE, JSON.stringify(profile)); }
  const r = await page.evaluate(() => { const R = window.__entryRec, d = R.dts.map(x => x[1]), s = d.slice().sort((a, b) => a - b);
    return { frames: d.length, worst: s[s.length - 1], p95: s[Math.floor(s.length * 0.95)], median: s[Math.floor(s.length / 2)], over50: d.filter(x => x > 50).length, over100: d.filter(x => x > 100).length,
      longTotal: R.lt.reduce((a, x) => a + x[1], 0), longN: R.lt.length, longest: R.lt.slice().sort((a, b) => b[1] - a[1]).slice(0, 6), worstAt: R.dts.slice().sort((a, b) => b[1] - a[1]).slice(0, 6),
      gone: !document.getElementById('start'), mode: window.__arcade.play.mode }; });
  console.log('ENTRY', mode, JSON.stringify(r));
  if (process.env.DIAG) console.log('NEW', JSON.stringify(await page.evaluate(() => { const A = window.__arcade, P = A.renderer.info.programs, nw = P.filter(p => !window.__pre.has(p.cacheKey));
    const byMat = {}; A.scene.traverse(o => { const ms = o.material ? [].concat(o.material) : []; for (const m of ms) { const pr = A.renderer.properties.get(m); const k = pr && pr.currentProgram && pr.currentProgram.cacheKey; if (k && !window.__pre.has(k)) { let q = o, path = []; while (q && path.length < 4) { path.push(q.name || q.type); q = q.parent; } (byMat[k] = byMat[k] || new Set()).add(m.type + '|' + path.join('<') + '|' + ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'alphaMap', 'envMap'].filter(q => m[q]).join('+') + (m.transparent ? '|T' : '') + (m.vertexColors ? '|VC' : '') + (m.flatShading ? '|flat' : '') + '|side' + m.side + (o.isSkinnedMesh ? '|skin' : '') + (o.isInstancedMesh ? '|inst' : '') + (m.onBeforeCompile && m.onBeforeCompile.toString().length > 30 ? '|obc' : '') + '|' + m.name); } } });
    return { total: P.length, newN: nw.length, nw: nw.slice(0, 60).map(p => p.name + ' :: ' + [...(byMat[p.cacheKey] || [])].slice(0, 2).join(' ; ') + ' :: ' + p.cacheKey.slice(0, 0)) }; }), null, 1));
  const lim = +(process.env['ENTRY_MAX_' + mode.toUpperCase()] || 0);
  let ok = r.gone; console.log((r.gone ? 'PASS ' : 'FAIL ') + mode + ': entered the arcade (start screen gone)');
  if (lim) { const p = r.worst <= lim; ok = ok && p; console.log((p ? 'PASS ' : 'FAIL ') + mode + ': worst entry frame ' + r.worst + 'ms <= ' + lim); }
  const errs = o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase|reading 'isReady'/i.test(e));
  console.log((errs.length ? 'FAIL' : 'PASS') + ' no page errors ' + JSON.stringify(errs.slice(0, 3)));
  await o.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
