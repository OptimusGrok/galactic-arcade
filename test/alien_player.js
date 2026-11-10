// Grey alien player + robot companion (Dave t706u): start-screen picker, persist, old saves stay monkey.
const { open } = require('./lib');
const fs = require('fs');
const PORTRAIT = '/workspace/alien-start-portrait.png';
const LANDSCAPE = '/workspace/alien-start-landscape.png';
const INGAME = '/workspace/alien-ingame.png';
const MIRROR = '/workspace/alien-mirror.png';

(async () => {
  const o = await open({ phone: true, start: true, w: 390, h: 844 });
  const { page, errors } = o;
  let ok = true;
  const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 700) : '')); if (!c) ok = false; };

  const ready = async () => {
    await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer && window.__gaPlayer.prev && window.__gaPlayer.prev.root, null, { timeout: 90000 });
    await page.waitForTimeout(400);
  };
  const info = () => page.evaluate(() => {
    const A = window.__arcade, m = A.monkey, p = window.__gaPlayer.p;
    let bot = null, eyes = 0, cap = null;
    m.traverse(o => { if (o.name === 'alienBot') bot = o; if (o.name === 'alienEye') eyes++; if (o.userData && o.userData.gaCap) cap = o; });
    const prevBot = window.__gaPlayer.prev.root && window.__gaPlayer.prev.root.getObjectByName('alienBot');
    let saved = {}; try { saved = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}'); } catch (e) {}
    const hood = document.querySelector('#gaP .gaRow[data-k=hoodie]');
    return {
      char: p.char || 'monkey', ud: m.userData.char || 'monkey', saved: saved.char || null, name: p.name,
      bot: !!(bot && bot.visible), prevBot: !!(prevBot && prevBot.visible), eyes,
      cap: !!cap, hoodieHidden: !!(hood && hood.hidden),
      who: [...document.querySelectorAll('#gaWho .gaWho')].map(b => [b.dataset.v, b.classList.contains('sel'), b.getBoundingClientRect().height > 8]),
      rows: [...document.querySelectorAll('#gaP .gaRow')].filter(r => !r.hidden).map(r => r.dataset.k),
      allRows: [...document.querySelectorAll('#gaP .gaRow')].map(r => r.dataset.k),
      go: !!(document.getElementById('gaGo') && !document.getElementById('gaGo').hidden),
      inp: (document.getElementById('gaIn') || {}).value || '',
      whoH: (() => { const e = document.getElementById('gaWhoH'); if (!e) return null; const r = e.getBoundingClientRect();
        return { t: (e.textContent || '').trim(), vis: r.height > 6 && r.top >= -2 && r.bottom <= innerHeight + 2 }; })()
    };
  });

  // --- fresh / empty save defaults to the monkey ---
  await page.evaluate(() => localStorage.removeItem('galacticarcade.player'));
  await page.reload({ timeout: 120000 }); await ready();
  let a = await info();
  chk(a.char === 'monkey' && a.ud === 'monkey' && a.saved == null && !a.bot && a.eyes === 0, 'fresh save: monkey is the default player', a);
  chk(a.who.length === 2 && a.who[0][0] === 'monkey' && a.who[0][1] && a.who[1][0] === 'alien' && !a.who[1][1] && a.who.every(w => w[2]) && a.whoH && a.whoH.t === 'SELECT PLAYER' && a.whoH.vis, 'start screen has a SELECT PLAYER heading and Monkey / Alien cards, Monkey selected', a);
  chk(a.rows.join() === 'hat,hoodie' && !a.hoodieHidden && !a.go, 'monkey start: hat + hoodie rows, no PLAY until a name', a);

  // --- old save without a char field stays a monkey ---
  await page.evaluate(() => localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'OldDave', hat: 'none', hoodie: 'navy', fur: 'brown', shoes: 'red' })));
  await page.reload({ timeout: 120000 }); await ready();
  a = await info();
  chk(a.char === 'monkey' && a.ud === 'monkey' && a.saved == null && a.name === 'OldDave' && a.inp === 'OldDave' && !a.bot, 'old save without char: still the monkey, name kept', a);

  // --- pick Alien ---
  await page.evaluate(() => window.__gaPlayer.setChar('alien'));
  await page.waitForTimeout(600);
  a = await info();
  chk(a.char === 'alien' && a.ud === 'alien' && a.saved === 'alien' && a.bot && a.prevBot && a.eyes === 2 && a.cap, 'picking Alien swaps the player, saves, shows eyes + robot in game and preview', a);
  const hoodCss = await page.evaluate(() => getComputedStyle(document.querySelector('#gaP .gaRow[data-k=hoodie]')).display);
  chk(a.hoodieHidden && hoodCss === 'none' && a.rows.join() === 'hat' && a.allRows.join() === 'hat,hoodie', 'alien start: hoodie row actually hidden, hat row stays', { hoodieHidden: a.hoodieHidden, hoodCss, rows: a.rows });
  chk(!a.go, 'PLAY still hidden until the 2 s touch (name already filled)', a);

  // three-quarter turn so the robot sits in view beside the shoulder
  await page.evaluate(() => { const P = window.__gaPlayer.prev; P.auto = false; P.want = 0.65; P.rot = 0.65; });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: PORTRAIT });
  chk(fs.existsSync(PORTRAIT) && fs.statSync(PORTRAIT).size > 20000, 'wrote alien-start-portrait.png');

  // persist across reload
  await page.reload({ timeout: 120000 }); await ready();
  a = await info();
  chk(a.char === 'alien' && a.ud === 'alien' && a.saved === 'alien' && a.bot && a.prevBot && a.eyes === 2 && a.hoodieHidden, 'alien choice persists after reload', a);

  // landscape start
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const P = window.__gaPlayer.prev; P.auto = false; P.want = 0.65; P.rot = 0.65; });
  await page.waitForTimeout(1800);
  const land = await page.evaluate(() => {
    const who = [...document.querySelectorAll('#gaWho .gaWho')].map(b => { const r = b.getBoundingClientRect(); return { v: b.dataset.v, sel: b.classList.contains('sel'), h: r.height, top: r.top, bot: r.bottom }; });
    const h = document.getElementById('gaWhoH'); const hr = h && h.getBoundingClientRect();
    return { who, vh: innerHeight, vw: innerWidth, hood: document.querySelector('#gaP .gaRow[data-k=hoodie]').hidden,
      whoH: h && { t: (h.textContent || '').trim(), h: hr.height, top: hr.top, bot: hr.bottom } };
  });
  chk(land.who.length === 2 && land.who.every(w => w.h > 8 && w.top >= -2 && w.bot <= land.vh + 2) && land.hood && land.whoH && land.whoH.t === 'SELECT PLAYER' && land.whoH.h > 6 && land.whoH.top >= -2 && land.whoH.bot <= land.vh + 2, 'landscape: SELECT PLAYER heading and both picker cards fit and hoodie stays hidden', land);
  await page.screenshot({ path: LANDSCAPE });
  chk(fs.existsSync(LANDSCAPE) && fs.statSync(LANDSCAPE).size > 20000, 'wrote alien-start-landscape.png');

  // hats still attach (start-screen free cap, not a locked shop crown)
  const hat = await page.evaluate(() => {
    window.__gaPlayer.pick('hat', 'capblue');
    const m = window.__arcade.monkey; let blue = null, cap = null;
    m.traverse(o => { if (o.name === 'gaHat_capblue') blue = o; if (o.userData && o.userData.gaCap) cap = o; });
    if (!blue) return { ok: false };
    blue.updateWorldMatrix(true, true);
    const b = new window.__arcade.THREE.Box3().setFromObject(blue);
    return { ok: true, vis: blue.visible, capOff: cap && !cap.visible, minY: +b.min.y.toFixed(2), maxY: +b.max.y.toFixed(2) };
  });
  chk(hat.ok && hat.vis && hat.capOff && hat.minY > 1.15, 'blue cap attaches on the alien head, pink cap hidden', hat);
  await page.evaluate(() => window.__gaPlayer.pick('hat', 'none'));

  // in-game
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => { window.__gaNoTp = 1; });
  await page.click('#gaT');
  await page.waitForTimeout(2300);
  a = await info();
  chk(a.go, 'touch + 2 s shows PLAY with the saved name', a);
  await page.click('#gaGo');
  await page.waitForFunction(() => window.__start && window.__start.dismissed, null, { timeout: 15000 });
  await page.waitForFunction(() => !window.__tp || !window.__tp.locked, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const walked = await page.evaluate(() => {
    const A = window.__arcade;
    A.st.fp = false; A.st.vel.set(0, 0, 0);
    const p0 = A.monkey.position.clone();
    A.keys.KeyW = true; for (let i = 0; i < 45; i++) A.step(1 / 30); A.keys.KeyW = false;
    const d = A.monkey.position.distanceTo(p0);
    A.monkey.position.set(-1.2, 0, 3.4); A.st.face = 0.55; A.monkey.rotation.y = 0.55;
    A.st.yaw = 0.55 + 0.72; A.st.pitch = 0.14; A.st.dist = 3.35; A.st.camInit = false;
    A.st.vel.set(0, 0, 0);
    const bot = A.monkey.getObjectByName('alienBot');
    return { d: +d.toFixed(2), char: A.monkey.userData.char, bot: !!(bot && bot.visible), eyes: (() => { let n = 0; A.monkey.traverse(o => { if (o.name === 'alienEye') n++; }); return n; })() };
  });
  chk(walked.d > 0.3 && walked.char === 'alien' && walked.bot && walked.eyes === 2, 'alien walks in the arcade and keeps the robot', walked);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: INGAME });
  chk(fs.existsSync(INGAME) && fs.statSync(INGAME).size > 20000, 'wrote alien-ingame.png');

  // accessories mirror (shop)
  let mirrored = false;
  try {
    const placed = await page.evaluate(async () => {
      await (window.__arcade.shopReady || Promise.resolve());
      const W = window.__shop && window.__shop.wardrobe, mir = W && W.mirror && W.mirror.mesh;
      if (!mir) return null;
      const A = window.__arcade, p = new A.THREE.Vector3(), n = new A.THREE.Vector3();
      mir.getWorldPosition(p); mir.getWorldDirection(n);
      A.st.fp = false; A.st.vel.set(0, 0, 0); A.st.camInit = false;
      A.monkey.position.set(p.x + n.x * 2.15, 0, p.z + n.z * 2.15 + 0.15);
      A.st.face = Math.atan2(n.x, n.z) + Math.PI; A.monkey.rotation.y = A.st.face;
      A.st.yaw = Math.atan2(n.x, n.z); A.st.pitch = 0.22; A.st.dist = 3.3;
      return { p: [+p.x.toFixed(2), +p.z.toFixed(2)], n: [+n.x.toFixed(2), +n.z.toFixed(2)] };
    });
    if (placed) {
      await page.waitForTimeout(2200);
      await page.screenshot({ path: MIRROR });
      mirrored = fs.existsSync(MIRROR) && fs.statSync(MIRROR).size > 20000;
    }
    chk(!!placed && mirrored, 'wrote alien-mirror.png at the accessories mirror', placed);
  } catch (e) { chk(false, 'mirror shot failed ' + e.message); }

  // switching back to monkey removes the robot
  const back = await page.evaluate(() => {
    window.__gaPlayer.setChar('monkey');
    const A = window.__arcade;
    return { char: A.monkey.userData.char, bot: !!A.monkey.getObjectByName('alienBot'), saved: (JSON.parse(localStorage.getItem('galacticarcade.player') || '{}')).char };
  });
  chk(back.char === 'monkey' && !back.bot && back.saved === 'monkey', 'switching back to Monkey removes the robot and saves', back);

  const hard = errors.filter(e => !/net::ERR_FAILED|supabase/i.test(e));
  chk(hard.length === 0, 'no page errors', hard);

  await o.close();
  console.log(ok ? 'ALL PASS' : 'SOME FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
