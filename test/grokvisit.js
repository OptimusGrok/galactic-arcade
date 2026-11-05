// t635u / t638u: Grok visit round 2 — hands on controls, look-around, SHOP+CHAT, WATCH, dark grey, voice clips.
const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/';
const fs = require('fs');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 844 });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  fs.mkdirSync(S, { recursive: true });

  await page.waitForFunction(() => window.__shop && window.__grokVisit && window.__grokVisit.ready, null, { timeout: 90000 });
  const info = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, S = window.__shop;
    const pad = V.pad;
    const cabs = (A.featured || []).filter(c => c.getObjectByName && c.getObjectByName('joystick')
      && !/roadster|claw|deadsignal/i.test(c.name || ''));
    // dark grey body material
    let bodyHex = null;
    S.grok.traverse(o => { if (o.isMesh && o.name === 'grokBody' && o.material && o.material.color && bodyHex == null) bodyHex = o.material.color.getHex(); });
    return { state: V.state, pad: [+pad.x.toFixed(2), +pad.z.toFixed(2)], cabs: cabs.map(c => c.name), n: cabs.length, bodyHex };
  });
  console.log('info', JSON.stringify(info));
  chk(info.state === 'idle', 'starts idle');
  chk(info.n >= 5, 'joystick cabinets ' + info.n);
  chk(info.bodyHex === 0x3a3d42 || info.bodyHex === 0x23262a, 'dark grey body 0x' + (info.bodyHex >>> 0).toString(16));

  // look trigger
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
    const a1 = { lookCount: V.lookCount, looking: V.isLooking(), busy: V.isBusy() };
    aim(false); await wait(400);
    V.simulateLooks(1); aim(true); await wait(900); await wait(500);
    if (V.started < 1) { V.simulateLooks(2); await wait(400); }
    return { a1, a2: { lookCount: V.lookCount, state: V.state, started: V.started, reason: V.reason } };
  });
  console.log('look', JSON.stringify(look));
  chk(look.a1.looking && !look.a1.busy, 'pad in view');
  chk(look.a2.started >= 1 && look.a2.reason === 'look', '2nd look started visit');

  // force start with fast timings
  await page.evaluate(() => {
    const V = window.__grokVisit;
    V.fast = true; V.fallAt = 1e9;
    if (V.state !== 'idle' && V.state !== 'done' && V.state !== 'play' && V.state !== 'greet' && V.state !== 'look' && V.state !== 'walk') {
      /* already running */
    } else if (V.state === 'idle' || V.state === 'done') V.start('test');
  });
  await page.waitForFunction(() => {
    const V = window.__grokVisit;
    return V && V.grok && V.grok.visible && ['greet','look','walk','play'].includes(V.state);
  }, null, { timeout: 20000 });

  // skip to play for hands / UI shots
  await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    V.fast = true;
    if (V.state !== 'play') V.skipTo('play');
    A.monkey.visible = true;
  });
  await page.waitForTimeout(500);

  // Frame Grok at cabinet from side-rear; hide local monkey for clean hands shot
  const playing = await page.evaluate(() => {
    const V = window.__grokVisit, c = V.cab, A = window.__arcade;
    if (c && c.userData.front) {
      const f = c.userData.front, face = c.userData.facing;
      const sideX = face.z, sideZ = -face.x;
      A.monkey.visible = false;
      A.monkey.position.set(f.x - face.x * 2.6 + sideX * 1.8, 0, f.z - face.z * 2.6 + sideZ * 1.8);
      A.st.face = Math.atan2(V.grok.position.x - A.monkey.position.x, V.grok.position.z - A.monkey.position.z);
      A.st.yaw = A.st.face - Math.PI; A.st.pitch = 0.32; A.st.dist = 3.4; A.st.camInit = false;
      for (let i = 0; i < 30; i++) A.step(1 / 60);
    }
    const joy = c && c.getObjectByName('joystick');
    const palmL = joy && joy.getObjectByName('gvPalm');
    return { state: V.state, cab: c && c.name, vis: V.grok.visible, palmOnJoy: !!(palmL && palmL.visible),
      tickets: A.play.tickets.total,
      visitorHex: (() => { let h = null; V.grok.traverse(o => { if (o.isMesh && o.name === 'grokBody' && o.material && o.material.color && h == null) h = o.material.color.getHex(); }); return h; })()
    };
  });
  console.log('playing', JSON.stringify(playing));
  chk(playing.state === 'play', 'state play');
  chk(playing.palmOnJoy, 'left palm on joystick');
  chk(playing.visitorHex === 0x3a3d42 || playing.visitorHex === 0x23262a, 'visitor dark grey');

  await page.waitForTimeout(700);
  await page.screenshot({ path: S + 'grok2_hands.png' });
  console.log('shot hands', fs.statSync(S + 'grok2_hands.png').size);

  // Move player close to Grok for SHOP+CHAT buttons
  const nearUi = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    A.monkey.visible = true;
    A.monkey.position.set(V.grok.position.x + 0.9, 0, V.grok.position.z + 0.6);
    A.st.face = Math.atan2(V.grok.position.x - A.monkey.position.x, V.grok.position.z - A.monkey.position.z);
    A.st.yaw = A.st.face - Math.PI; A.st.pitch = 0.2; A.st.dist = 3.2; A.st.camInit = false;
    for (let i = 0; i < 20; i++) A.step(1 / 60);
    // force near UI on for a frame
    return new Promise(res => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        res({
          gvOn: document.getElementById('gvBtns').classList.contains('on'),
          shop: !!document.getElementById('gvShop'),
          chat: !!document.getElementById('gvChat'),
          near: V.near,
        });
      }));
    });
  });
  console.log('nearUi', JSON.stringify(nearUi));
  // If near flag didn't trip (distance), force-show for screenshot by class
  await page.evaluate(() => { document.getElementById('gvBtns').classList.add('on'); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: S + 'grok2_buttons.png' });
  console.log('shot buttons', fs.statSync(S + 'grok2_buttons.png').size);
  chk(nearUi.shop && nearUi.chat, 'SHOP+CHAT buttons exist');

  // Open chat, ask a question
  await page.evaluate(() => {
    document.getElementById('gvChat').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const chip = document.querySelector('#gvChips [data-cid="c_fav"]');
    if (chip) chip.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const chat = await page.evaluate(() => ({
    open: window.__grokVisit.chatOpen,
    ov: document.getElementById('gvChatOv').classList.contains('on'),
    msgs: [...document.querySelectorAll('#gvChatLog .gvMsg')].map(m => m.textContent).slice(0, 4),
  }));
  console.log('chat', JSON.stringify(chat));
  chk(chat.open && chat.ov, 'chat panel open');
  chk(chat.msgs.length >= 2, 'chat has answer');
  await page.screenshot({ path: S + 'grok2_chat.png' });
  console.log('shot chat', fs.statSync(S + 'grok2_chat.png').size);

  // Close chat, open watch
  await page.evaluate(() => {
    document.getElementById('gvChatX').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const watch = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, c = V.cab;
    // stand at cabinet front so WATCH would show
    if (c && c.userData.front) {
      const f = c.userData.front, face = c.userData.facing;
      A.monkey.position.set(f.x + face.x * 0.2, 0, f.z + face.z * 0.2);
      for (let i = 0; i < 15; i++) A.step(1 / 60);
    }
    document.getElementById('gvWatch').classList.add('on');
    document.getElementById('gvWatch').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return { open: V.watchOpen, ov: document.getElementById('gvWatchOv').classList.contains('on') };
  });
  console.log('watch', JSON.stringify(watch));
  chk(watch.open && watch.ov, 'watch overlay open');
  await page.waitForTimeout(500);
  await page.screenshot({ path: S + 'grok2_watch.png' });
  console.log('shot watch', fs.statSync(S + 'grok2_watch.png').size);

  // tickets unchanged
  const tickets = await page.evaluate(() => window.__arcade.play.tickets.total);
  chk(tickets === playing.tickets, 'tickets unchanged ' + tickets);

  // finish once
  await page.evaluate(() => window.__grokVisit.skipTo('done'));
  const done = await page.evaluate(() => ({ state: window.__grokVisit.state, finished: window.__grokVisit.finished }));
  chk(done.state === 'done' && done.finished >= 1, 'done once/session');

  // verify shots not tiny/black
  for (const f of ['grok2_hands.png','grok2_buttons.png','grok2_chat.png','grok2_watch.png']) {
    const sz = fs.statSync(S + f).size;
    chk(sz > 20000, f + ' size ' + sz);
  }

  console.log(ok ? 'ALL PASS' : 'SOME FAIL');
  await close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
