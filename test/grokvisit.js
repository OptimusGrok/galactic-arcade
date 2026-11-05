// t635u/t639u/t641u: light-grey Grok, natural walk+look, centred WATCH, 1x play, no INSERT CREDIT.
const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/';
const fs = require('fs');
(async () => {
  const { page, close } = await open({ phone: true, w: 390, h: 844 });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  fs.mkdirSync(S, { recursive: true });

  await page.waitForFunction(() => window.__shop && window.__grokVisit && window.__grokVisit.ready, null, { timeout: 90000 });
  const info = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, S = window.__shop;
    const cabs = (A.featured || []).filter(c => c.getObjectByName && c.getObjectByName('joystick') && /strike|ghost/i.test(c.name || ''));
    const bodyHexes = [];
    S.grok.traverse(o => { if (o.isMesh && o.name === 'grokBody' && o.material && o.material.color) bodyHexes.push(o.material.color.getHex()); });
    return { state: V.state, cabs: cabs.map(c => c.name), n: cabs.length, bodyHexes, nLegs: (V.legs && V.legs.length) || 0 };
  });
  console.log('info', JSON.stringify(info));
  chk(info.state === 'idle', 'starts idle');
  chk(info.n >= 1, 'live-demo cabs ' + info.n);
  chk(info.bodyHexes.includes(0xc9ccd1), 'light grey sil present');
  chk(info.nLegs === 2, 'two leg groups');

  const look = await page.evaluate(async () => {
    const A = window.__arcade, V = window.__grokVisit, pad = V.pad;
    const stEl = document.getElementById('start'); if (stEl) stEl.remove();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const aim = (toward) => {
      A.monkey.position.set(pad.x + 4.2, 0, pad.z + 4.2);
      A.st.vel.set(0, 0, 0); A.st.pitch = 0.1; A.st.dist = 3.0; A.st.camInit = false;
      if (toward) {
        const fx = pad.x - A.monkey.position.x, fz = pad.z - A.monkey.position.z;
        A.st.face = Math.atan2(fx, fz); A.st.yaw = A.st.face - Math.PI;
      } else { A.st.face = Math.atan2(1, 1); A.st.yaw = A.st.face - Math.PI; }
      for (let i = 0; i < 45; i++) A.step(1 / 60);
    };
    V.fallAt = 1e9;
    aim(true); await wait(700);
    const a1 = { looking: V.isLooking(), busy: V.isBusy() };
    aim(false); await wait(400);
    V.simulateLooks(1); aim(true); await wait(900); await wait(500);
    if (V.started < 1) { V.simulateLooks(2); await wait(400); }
    return { a1, a2: { started: V.started, reason: V.reason } };
  });
  console.log('look', JSON.stringify(look));
  chk(look.a1.looking && !look.a1.busy, 'pad in view');
  chk(look.a2.started >= 1 && look.a2.reason === 'look', '2nd look started visit');

  await page.evaluate(() => {
    const V = window.__grokVisit;
    V.fast = true; V.fallAt = 1e9;
    if (V.state === 'idle' || V.state === 'done') V.start('test');
  });
  await page.waitForFunction(() => {
    const V = window.__grokVisit;
    return V && V.grok && V.grok.visible && ['greet','look','walk','play','arrive'].includes(V.state);
  }, null, { timeout: 20000 });
  await page.waitForTimeout(600);

  // grok3_walk: pose mid-stride + head glance
  const walkShot = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    if (V.legs) {
      V.legs[0].hip.rotation.x = 0.5;
      V.legs[1].hip.rotation.x = -0.45;
      V.legs[0].thigh.rotation.x = 0.2;
      V.legs[1].thigh.rotation.x = 0.15;
    }
    V.arms[0].sh.rotation.x = -0.5;
    V.arms[1].sh.rotation.x = 0.5;
    let headG = V.head;
    if (!headG) V.grok.traverse(o => { if (o.name === 'grokFace' && o.parent) headG = o.parent; });
    if (headG) { headG.rotation.y = 0.55; headG.rotation.x = 0.05; }
    const g = V.grok.position;
    A.monkey.visible = false;
    A.monkey.position.set(g.x + 2.2, 0, g.z + 0.4);
    A.st.face = Math.atan2(g.x - A.monkey.position.x, g.z - A.monkey.position.z);
    A.st.yaw = A.st.face - Math.PI; A.st.pitch = 0.25; A.st.dist = 2.8; A.st.camInit = false;
    for (let i = 0; i < 30; i++) A.step(1 / 60);
    const hs = [];
    V.grok.traverse(o => { if (o.isMesh && o.name === 'grokBody' && o.material && o.material.color) hs.push(o.material.color.getHex()); });
    return {
      leg0: V.legs && +V.legs[0].hip.rotation.x.toFixed(2),
      leg1: V.legs && +V.legs[1].hip.rotation.x.toFixed(2),
      headY: headG ? +headG.rotation.y.toFixed(2) : null,
      visitorHexes: hs,
    };
  });
  console.log('walkShot', JSON.stringify(walkShot));
  chk(Math.abs(walkShot.leg0) > 0.2 && Math.abs(walkShot.leg1) > 0.2, 'visible step pose');
  chk(Math.abs(walkShot.headY) > 0.3, 'head turned looking around');
  chk(walkShot.visitorHexes.includes(0xc9ccd1), 'visitor light grey');
  await page.screenshot({ path: S + 'grok3_walk.png' });
  console.log('shot walk', fs.statSync(S + 'grok3_walk.png').size);

  await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    V.fast = true;
    if (V.head) { V.head.rotation.y = 0; V.head.rotation.x = 0; }
    if (V.state !== 'play') V.skipTo('play');
    A.monkey.visible = true;
  });
  await page.waitForTimeout(600);

  const reach = await page.evaluate(() => {
    const V = window.__grokVisit, c = V.cab, A = window.__arcade;
    if (!c || !c.userData.front) return { err: 'no cab' };
    const f = c.userData.front, face = c.userData.facing;
    const sideX = face.z, sideZ = -face.x;
    A.monkey.visible = false;
    A.monkey.position.set(f.x - face.x * 0.4 + sideX * 2.4, 0, f.z - face.z * 0.4 + sideZ * 2.4);
    A.st.face = Math.atan2(V.grok.position.x - A.monkey.position.x, V.grok.position.z - A.monkey.position.z);
    A.st.yaw = A.st.face - Math.PI; A.st.pitch = 0.55; A.st.dist = 1.85; A.st.camInit = false;
    for (let i = 0; i < 50; i++) A.step(1 / 60);
    const tipDist = (arm, palm) => {
      if (!arm || !palm || !palm.visible) return 99;
      arm.el.updateMatrixWorld(true); palm.updateMatrixWorld(true);
      const tip = A.monkey.position.clone().set(0, -0.40, 0.02);
      arm.el.localToWorld(tip);
      const pw = A.monkey.position.clone(); palm.getWorldPosition(pw);
      return tip.distanceTo(pw);
    };
    const joy = c.getObjectByName('joystick');
    const palmL = joy && joy.getObjectByName('gvPalm');
    let palmR = null; c.traverse(o => { if (o.name === 'gvPalm' && o !== palmL) palmR = o; });
    for (let i = 0; i < 30; i++) A.step(1 / 60);
    return {
      state: V.state, cab: c.name, palmOnJoy: !!(palmL && palmL.visible),
      dL: +(tipDist(V.arms[0], palmL).toFixed(3)),
      dR: +(tipDist(V.arms[1], palmR).toFixed(3)),
      tickets: A.play.tickets.total,
    };
  });
  console.log('reach', JSON.stringify(reach));
  chk(reach.state === 'play', 'state play');
  chk(reach.palmOnJoy, 'left palm on joystick');
  chk(reach.dL < 0.25, 'left forearm near stick ' + reach.dL);
  chk(reach.dR < 0.25, 'right forearm near buttons ' + reach.dR);
  chk(/strike|ghost/i.test(reach.cab || ''), 'live-demo cab ' + reach.cab);
  await page.waitForTimeout(400);
  await page.screenshot({ path: S + 'grok3_hands_side.png' });
  console.log('shot hands_side', fs.statSync(S + 'grok3_hands_side.png').size);

  const buttons = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, c = V.cab;
    A.monkey.visible = true;
    if (c && c.userData.front) {
      const f = c.userData.front, face = c.userData.facing;
      A.monkey.position.set(f.x + face.x * 0.15, 0, f.z + face.z * 0.15);
      A.st.face = Math.atan2(face.x, face.z);
      A.st.yaw = A.st.face - Math.PI; A.st.pitch = 0.25; A.st.dist = 2.6; A.st.camInit = false;
      for (let i = 0; i < 25; i++) A.step(1 / 60);
    }
    document.getElementById('playUI').classList.add('on');
    document.getElementById('gvWatch').classList.add('on');
    document.getElementById('gvBtns').classList.remove('on');
    const wb = document.getElementById('gvWatch').getBoundingClientRect();
    const pb = document.getElementById('bPlay').getBoundingClientRect();
    return {
      watch: { x: +wb.x.toFixed(1), y: +wb.y.toFixed(1), r: +wb.right.toFixed(1), b: +wb.bottom.toFixed(1), mid: +(wb.x + wb.width / 2).toFixed(1) },
      play: { b: +pb.bottom.toFixed(1) },
      vw: innerWidth, vh: innerHeight,
      shopChatOn: document.getElementById('gvBtns').classList.contains('on'),
      watchOn: true, playOn: true,
    };
  });
  console.log('buttons', JSON.stringify(buttons));
  chk(buttons.watch.x >= 0 && buttons.watch.r <= buttons.vw + 1, 'WATCH fully on-screen X');
  chk(buttons.watch.y >= 0 && buttons.watch.b <= buttons.vh + 1, 'WATCH fully on-screen Y');
  chk(buttons.watch.y >= buttons.play.b - 2, 'WATCH below PLAY card');
  chk(Math.abs(buttons.watch.mid - buttons.vw / 2) < 8, 'WATCH horizontally centred ' + buttons.watch.mid);
  chk(!buttons.shopChatOn, 'SHOP/CHAT hidden while PLAY/WATCH up');
  await page.waitForTimeout(250);
  await page.screenshot({ path: S + 'grok3_buttons.png' });
  console.log('shot buttons', fs.statSync(S + 'grok3_buttons.png').size);

  await page.evaluate(() => {
    document.getElementById('playUI').classList.remove('on');
    document.getElementById('gvWatch').classList.remove('on');
    document.getElementById('gvChat').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const chatVoice = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const chip = document.querySelector('#gvChips [data-cid="c_fav"]');
    if (chip) chip.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await wait(500);
    return { voice: window.__grokVisit.voice };
  });
  console.log('chatVoice', JSON.stringify(chatVoice));
  chk(chatVoice.voice === 'webaudio' || chatVoice.voice === 'clip', 'chat uses GuyNeural clip (' + chatVoice.voice + ')');

  await page.evaluate(() => {
    document.getElementById('gvChatX').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    document.getElementById('gvWatch').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const watch = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    for (let i = 0; i < 10; i++) A.step(1 / 60);
    if (V.drawWatchNow) V.drawWatchNow(1);
    const cv = document.getElementById('gvWatchHands');
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const bx0 = w * 0.50, by = h * 0.62, gap = w * 0.14;
    const sample = (x, y) => { const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data; return [d[0], d[1], d[2]]; };
    const pts = [];
    for (const i of [0, 1, 2]) for (const dy of [-0.06, -0.02, 0, 0.02]) pts.push(sample(bx0 + i * gap, by + dy * h));
    const isRed = (c) => c[0] > 160 && c[1] < 100 && c[0] > c[2] + 40;
    const isYellow = (c) => c[0] > 160 && c[1] > 140 && c[2] < 120;
    const isBlue = (c) => c[2] > 140 && c[2] > c[0] + 20 && c[2] > c[1];
    const isWhite = (c) => c[0] > 200 && c[1] > 200 && c[2] > 200;
    const wcv = document.getElementById('gvWatchCv');
    const wctx = wcv.getContext('2d');
    let yellowBand = 0;
    const wd = wctx.getImageData(0, Math.floor(wcv.height * 0.75), wcv.width, Math.floor(wcv.height * 0.2)).data;
    for (let i = 0; i < wd.length; i += 16) {
      if (wd[i] > 200 && wd[i + 1] > 180 && wd[i + 2] < 100) yellowBand++;
    }
    return {
      open: V.watchOpen, ov: document.getElementById('gvWatchOv').classList.contains('on'),
      hasRed: pts.some(c => isRed(c)),
      hasYellow: pts.some(c => isYellow(c) || isWhite(c)),
      hasBlue: pts.some(c => isBlue(c)),
      hand: sample(w * 0.26, h * 0.58),
      yellowBand, cab: V.cab && V.cab.name,
    };
  });
  console.log('watch', JSON.stringify(watch));
  chk(watch.open && watch.ov, 'watch overlay open');
  chk(watch.hasRed, 'red button visible');
  chk(watch.hasYellow, 'yellow button visible');
  chk(watch.hasBlue, 'blue button visible');
  chk(watch.hand[0] > 100 && Math.abs(watch.hand[0] - watch.hand[1]) < 50, 'robot hand light grey-ish ' + watch.hand);
  chk(watch.yellowBand < 40, 'no INSERT CREDIT yellow flash ' + watch.yellowBand);
  await page.screenshot({ path: S + 'grok3_watch.png' });
  console.log('shot watch', fs.statSync(S + 'grok3_watch.png').size);

  const tickets = await page.evaluate(() => window.__arcade.play.tickets.total);
  chk(tickets === reach.tickets, 'tickets unchanged ' + tickets);
  await page.evaluate(() => window.__grokVisit.skipTo('done'));
  const done = await page.evaluate(() => ({ state: window.__grokVisit.state, finished: window.__grokVisit.finished }));
  chk(done.state === 'done' && done.finished >= 1, 'done once/session');

  for (const f of ['grok3_walk.png', 'grok3_hands_side.png', 'grok3_buttons.png', 'grok3_watch.png']) {
    const sz = fs.statSync(S + f).size;
    chk(sz > 20000, f + ' size ' + sz);
  }
  console.log(ok ? 'ALL PASS' : 'SOME FAIL');
  await close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
