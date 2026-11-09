// t700u: smaller Grok, stand-back gap, full-screen expert Watch. Screenshots to /workspace.
const { open } = require('./lib');
const fs = require('fs');
const OUT = '/workspace';
(async () => {
  const { page, close } = await open({ phone: true, w: 390, h: 844 });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForFunction(() => window.__shop && window.__grokVisit && window.__grokVisit.ready, null, { timeout: 90000 });
  await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });

  const meta = await page.evaluate(() => {
    const V = window.__grokVisit, Sh = window.__shop;
    return { scale: V.SCALE, stand: V.STAND_BACK, shop: +Sh.grok.scale.x.toFixed(3) };
  });
  console.log('meta', JSON.stringify(meta));
  chk(Math.abs(meta.scale - 0.665) < 1e-6, 'SCALE 0.665');
  chk(Math.abs(meta.stand - 0.55) < 1e-6, 'STAND_BACK 0.55');
  chk(Math.abs(meta.shop - 0.6) < 1e-6, 'shopkeeper unchanged 0.6');

  const playerT0 = await page.evaluate(() => window.__arcade.play.tickets.total);

  // Force play on Strike, then FREEZE shop update + visit tick so screenshots stay put
  await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, Sh = window.__shop;
    V.fast = true; V.fallAt = 1e9;
    V.cab = A.strikeCab || (A.featured || []).find(c => /strike/i.test(c.name));
    V.skipTo('play');
    for (let i = 0; i < 36; i++) Sh.update(1 / 30);
    window.__savedShopUpdate = Sh.update;
    Sh.update = function () {};   // freeze RAF-driven visit progress via shop
    // also park tickets so award path can't cheer if anything slips through
    V.tickets = 5;
  });

  const gap = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, THREE = A.THREE;
    const g = V.grok, cab = V.cab;
    const f = cab.userData.front, face = cab.userData.facing.clone().normalize();
    const toFront = new THREE.Vector3(g.position.x - f.x, 0, g.position.z - f.z);
    const dist = toFront.dot(face);
    // pure side profile: camera on the side, looking at the gap between Grok and cabinet front
    const side = new THREE.Vector3(face.z, 0, -face.x).normalize();
    // look at the midpoint between Grok's chest and the cabinet front, from a pure side so the gap reads clearly
    const chest = g.position.clone(); chest.y = 0.9;
    const panel = f.clone(); panel.y = 0.95;
    const gapMid = chest.clone().lerp(panel, 0.5);
    const cam = gapMid.clone().add(side.multiplyScalar(2.6));
    cam.y = 1.35;
    A.monkey.visible = false;
    window.__camOverride = { pos: [cam.x, cam.y, cam.z], at: [gapMid.x, gapMid.y, gapMid.z], showMonkey: false, bloom: 0.18 };
    A.camera.position.set(cam.x, cam.y, cam.z); A.camera.lookAt(gapMid.x, gapMid.y, gapMid.z); A.camera.updateMatrixWorld(true);
    if (V.placeTixHud) V.placeTixHud();
    const centre = cab.userData.centre;
    const dCentre = Math.hypot(g.position.x - centre.x, g.position.z - centre.z);
    return {
      dist: +dist.toFixed(3), dCentre: +dCentre.toFixed(3), scale: +g.scale.x.toFixed(3), gy: +g.position.y.toFixed(3),
      lean: +g.rotation.x.toFixed(3), cab: cab.name, state: V.state,
      tixHud: !!(g.getObjectByName('gvTixSprite') && g.getObjectByName('gvTixSprite').visible),
    };
  });
  console.log('gap', JSON.stringify(gap));
  chk(gap.state === 'play', 'still in play for gap shot');
  chk(gap.dist < -0.4, 'clear stand-back gap into room dist=' + gap.dist);
  chk(gap.dCentre > 1.2, 'far enough from cabinet centre d=' + gap.dCentre);
  chk(Math.abs(gap.scale - 0.665) < 0.01, 'playing scale ~0.665');
  chk(gap.gy === 0, 'on the floor');
  await page.waitForTimeout(350);
  await page.screenshot({ path: OUT + '/grok-gap-play.png' });
  console.log('shot gap', fs.statSync(OUT + '/grok-gap-play.png').size);

  // Watch full-screen portrait (still frozen; openWatch itself does not need shop.update)
  const watchP = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    // ensure play + cab
    if (V.state !== 'play') {
      V.cab = A.strikeCab; V.skipTo('play');
      window.__shop.update = window.__savedShopUpdate;
      for (let i = 0; i < 20; i++) window.__shop.update(1 / 30);
      window.__shop.update = function () {};
    }
    const t0 = A.play.tickets.total;
    V.openWatch();
    const cv = document.getElementById('gvWatchCv');
    const ov = document.getElementById('gvWatchOv');
    const hands = document.getElementById('gvWatchHands');
    // draw a couple frames manually
    if (V.drawWatchNow) V.drawWatchNow(1);
    return {
      on: ov.classList.contains('on'),
      expert: !!window.__watchExpert,
      hands: getComputedStyle(hands).display,
      cvH: cv.height, innerH: innerHeight, dpr: Math.min(2, devicePixelRatio || 1),
      tickets: A.play.tickets.total, t0,
      badge: (document.getElementById('gvWatchBadge') || {}).textContent || '',
      state: V.state, watchOpen: V.watchOpen,
    };
  });
  console.log('watchP', JSON.stringify(watchP));
  chk(watchP.on && watchP.expert, 'watch open expert');
  chk(watchP.hands === 'none', 'hands hidden');
  chk(Math.abs(watchP.cvH - Math.round(watchP.innerH * watchP.dpr)) <= 2, 'portrait full height');
  chk(watchP.tickets === watchP.t0, 'tickets unchanged');
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/grok-watch-portrait.png' });
  console.log('shot watch portrait', fs.statSync(OUT + '/grok-watch-portrait.png').size);

  // Landscape 844x390
  await page.setViewportSize({ width: 844, height: 390 });
  const watchL = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    // stay frozen; keep play state
    if (V.state !== 'play') { V.cab = A.strikeCab; V.skipTo('play'); }
    if (V.watchOpen) V.closeWatch();
    V.openWatch();
    const cv = document.getElementById('gvWatchCv');
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    cv.style.width = '100%'; cv.style.height = '100%';
    // paint from the live strike demo canvas if CRT is empty/dark
    const wctx = cv.getContext('2d');
    wctx.fillStyle = '#05060a'; wctx.fillRect(0, 0, cv.width, cv.height);
    let src = null;
    try {
      const demo = A.demo;
      const iframe = demo && demo.iframe;
      const ic = iframe && iframe.contentDocument && iframe.contentDocument.getElementById('c');
      if (ic) src = ic;
    } catch (e) {}
    if (!src) {
      try {
        const scr = V.cab.getObjectByName('screen');
        const mat = scr && scr.material;
        const map = mat && (mat.map || (mat.uniforms && mat.uniforms.map && mat.uniforms.map.value));
        src = map && (map.image || (map.source && map.source.data));
      } catch (e) {}
    }
    if (src && src.width) {
      const s = Math.max(cv.width / src.width, cv.height / src.height);
      const dw = src.width * s, dh = src.height * s;
      wctx.drawImage(src, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
    }
    const mid = wctx.getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data;
    return {
      on: document.getElementById('gvWatchOv').classList.contains('on'),
      cvW: cv.width, cvH: cv.height, innerW: innerWidth, innerH: innerHeight, dpr,
      expert: !!window.__watchExpert, state: V.state,
      mid: [mid[0], mid[1], mid[2]],
      hintOn: document.getElementById('turnHint').classList.contains('on'),
      dataUrl: cv.toDataURL('image/png'),
    };
  });
  console.log('watchL', JSON.stringify({ ...watchL, dataUrl: watchL.dataUrl.slice(0, 32) + '...' }));
  chk(watchL.on && watchL.expert, 'landscape watch open expert');
  chk(Math.abs(watchL.cvW - Math.round(watchL.innerW * watchL.dpr)) <= 2, 'landscape full width');
  chk(Math.abs(watchL.cvH - Math.round(watchL.innerH * watchL.dpr)) <= 2, 'landscape full height');
  chk(watchL.mid[0] + watchL.mid[1] + watchL.mid[2] > 20, 'landscape canvas has game pixels');
  fs.writeFileSync(OUT + '/grok-watch-landscape.png', Buffer.from(watchL.dataUrl.split(',')[1], 'base64'));
  await page.screenshot({ path: OUT + '/grok-watch-landscape-page.png' });
  console.log('shot watch landscape', fs.statSync(OUT + '/grok-watch-landscape.png').size, 'page', fs.statSync(OUT + '/grok-watch-landscape-page.png').size);

  // Close returns to normal
  const closed = await page.evaluate(() => {
    const V = window.__grokVisit;
    V.closeWatch();
    return { on: document.getElementById('gvWatchOv').classList.contains('on'), watchOpen: V.watchOpen };
  });
  chk(!closed.on && !closed.watchOpen, 'watch closes via API');

  await page.evaluate(() => {
    window.__shop.update = window.__savedShopUpdate || window.__shop.update;
    window.__camOverride = null;
    window.__grokVisit.skipTo('done');
  });
  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
