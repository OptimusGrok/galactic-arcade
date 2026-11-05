// Dave t625: wide mirror, reflection updates every frame in 3rd + 1st person, monkey shows in 1st-person reflection.
const { open } = require('./lib');
(async () => { const { page, errors, close } = await open({ phone: true, w: 390, h: 844 }); page.setDefaultTimeout(150000);
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  // read the mirror's render target centre region; returns a hash + "monkey-ish" pixel count (hoodie navy/red etc differ from the backdrop)
  const grab = async () => { const b64 = (await page.screenshot({ type: 'png' })).toString('base64');
    const px = await page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = 195; c.height = 422; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 195, 422); const d = g.getImageData(0, 0, 195, 422).data; const o = []; for (let i = 0; i < d.length; i += 4) o.push(d[i], d[i + 1], d[i + 2]); return o; }, b64); return { px }; };
  const diff = (a, b) => { let d = 0; for (let i = 0; i < a.px.length; i++) d += Math.abs(a.px[i] - b.px[i]); return d / a.px.length; };
  const M = await page.evaluate(() => { const A = window.__arcade, m = window.__shop.wardrobe.mirror.mesh, p = new A.THREE.Vector3(), n = new A.THREE.Vector3(); m.getWorldPosition(p); m.getWorldDirection(n); m.geometry.computeBoundingBox(); return { p: [p.x, p.y, p.z], n: [n.x, n.y, n.z], w: m.geometry.boundingBox.max.x * 2, rt: [m.getRenderTarget().width, m.getRenderTarget().height] }; });
  chk(M.w > 1.2, 'mirror ~twice as wide', M);
  const place = (d, side, fp) => page.evaluate(([M, d, side, fp]) => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.st.fp = fp; A.st.camInit = false;
    A.monkey.position.set(M.p[0] + M.n[0] * d, 0, M.p[2] + M.n[2] * d + side); A.st.yaw = Math.atan2(M.n[0], M.n[2]); A.st.pitch = fp ? 0.28 : 0.35; }, [M, d, side, fp]);
  for (const fp of [false, true]) { const tag = fp ? '1st person' : '3rd person';
    await place(fp ? 2.0 : 2.2, 0, fp); await page.waitForTimeout(2500);
    const a = await grab(); const r0 = await page.evaluate(() => window.__shop.wardrobe.mirror.renders), f0 = await page.evaluate(() => window.__arcade.stats.frames);
    await place(fp ? 2.0 : 2.2, 0.45, fp); await page.waitForTimeout(1500); const b = await grab();
    const r1 = await page.evaluate(() => window.__shop.wardrobe.mirror.renders), f1 = await page.evaluate(() => window.__arcade.stats.frames);
    chk(diff(a, b) > 1, tag + ': reflection changes as player moves', { d: +diff(a, b).toFixed(2) });
    chk(r1 - r0 >= (f1 - f0) * 0.8, tag + ': mirror renders every frame', { renders: r1 - r0, frames: f1 - f0 });
    await place(fp ? 2.0 : 2.2, 0.2, fp); await page.waitForTimeout(1500);
    if (fp) { const vis = await page.evaluate(() => window.__arcade.monkey.visible); chk(!vis, '1st person: monkey still hidden in main view', vis);
      const g1 = await grab(); await page.evaluate(() => { window.__mkS = window.__arcade.monkey.scale.clone(); window.__arcade.monkey.scale.setScalar(0.0001); }); await page.waitForTimeout(1200);
      const g2 = await grab(); await page.evaluate(() => window.__arcade.monkey.scale.copy(window.__mkS)); await page.waitForTimeout(1200); const hide = diff(g1, g2);
      chk(hide > 1, '1st person: monkey appears in reflection (diff with vs without monkey)', +hide.toFixed(2)); }
    await page.screenshot({ path: '/workspace/galactic-shop/shots/' + (fp ? 'mirror_fp.png' : 'mirror_wide_3p.png') }); }
  for (const [nm, off, side, hy] of [['mirror_frame_front', 3.4, 0.6], ['mirror_frame_angle', 2.0, 2.0], ['mirror_base_extended', 6.5, 1.5, 5.5]]) {
    await page.evaluate(([M, off, side, hy]) => { const A = window.__arcade; A.st.fp = false; A.monkey.position.set(M.p[0] + M.n[0] * 1.0, 0, M.p[2] - 0.2); A.st.yaw = Math.atan2(M.n[0], M.n[2]) + Math.PI;
      window.__camOverride = { pos: [M.p[0] + M.n[0] * off, hy || 1.15, M.p[2] + side], at: [M.p[0], hy ? 0.2 : 1.05, M.p[2] - (hy ? 1.5 : 0)], showMonkey: true }; }, [M, off, side, hy]);
    await page.waitForTimeout(2000); await page.screenshot({ path: '/workspace/galactic-shop/shots/' + nm + '.png' }); }
  await page.evaluate(() => { delete window.__camOverride; });
  const cost = await page.evaluate(async () => { const W = window.__shop.wardrobe; let s = 0, n = 0; for (let i = 0; i < 20; i++) { await new Promise(r => requestAnimationFrame(r)); s += W.mirror.last; n++; } return +(s / n).toFixed(2); });
  console.log('MIRROR_COST_MS ' + cost);
  chk(!errors.length, 'no page errors', errors.slice(0, 2));
  await close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1); })();
