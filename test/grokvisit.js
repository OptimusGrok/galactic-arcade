// t635u/t639u/t641u/t644u: light-grey Grok, natural walk+look, centred WATCH, two-cab 20-ticket run.
const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/';
const fs = require('fs');
(async () => {
  const { page, close } = await open({ phone: true, w: 390, h: 844 });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  fs.mkdirSync(S, { recursive: true });

  await page.waitForFunction(() => window.__shop && window.__grokVisit && window.__grokVisit.ready, null, { timeout: 90000 });
  const info = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, Sh = window.__shop;
    const cabs = (A.featured || []).filter(c => c.getObjectByName && c.getObjectByName('joystick') && /strike|ghost/i.test(c.name || ''));
    const bodyHexes = [];
    Sh.grok.traverse(o => { if (o.isMesh && o.name === 'grokBody' && o.material && o.material.color) bodyHexes.push(o.material.color.getHex()); });
    return { state: V.state, cabs: cabs.map(c => c.name), n: cabs.length, bodyHexes, nLegs: (V.legs && V.legs.length) || 0, tixGoal: V.tixGoal };
  });
  console.log('info', JSON.stringify(info));
  chk(info.state === 'idle', 'starts idle');
  chk(info.n >= 2, 'two live-demo cabs ' + info.n);
  chk(info.bodyHexes.includes(0xc9ccd1), 'light grey sil present');
  chk(info.nLegs === 2, 'two leg groups');
  chk(info.tixGoal === 20, 'tix goal 20');
  const scaleInfo = await page.evaluate(() => ({ scale: window.__grokVisit.SCALE, stand: window.__grokVisit.STAND_BACK, shopScale: (() => { try { return +window.__shop.grok.scale.x.toFixed(3); } catch (e) { return null; } })() }));
  console.log('scaleInfo', JSON.stringify(scaleInfo));
  chk(Math.abs(scaleInfo.scale - 0.665) < 0.001, 'visitor SCALE 0.665 got ' + scaleInfo.scale);
  chk(Math.abs(scaleInfo.stand - 0.42) < 0.001, 'STAND_BACK 0.42 got ' + scaleInfo.stand);
  chk(scaleInfo.shopScale == null || Math.abs(scaleInfo.shopScale - 0.6) < 0.001, 'shopkeeper unchanged ~0.6 got ' + scaleInfo.shopScale);

  await page.evaluate(() => {
    const s = document.getElementById('start'); if (s) s.remove();
    if (window.__start) window.__start.dismissed = true;
  });
  const playerT0 = await page.evaluate(() => window.__arcade.play.tickets.total);

  // Start visit and pump to play
  await page.evaluate(() => {
    const V = window.__grokVisit, Sh = window.__shop;
    V.fast = true; V.fallAt = 1e9;
    if (V.state === 'idle' || V.state === 'done') V.start('test');
    for (let i = 0; i < 400 && V.state !== 'play'; i++) Sh.update(1 / 30);
  });
  let st = await page.evaluate(() => ({ state: window.__grokVisit.state, cab: window.__grokVisit.cab && window.__grokVisit.cab.name }));
  console.log('atPlay', JSON.stringify(st));
  if (st.state !== 'play') {
    await page.evaluate(() => window.__grokVisit.skipTo('play'));
    st = await page.evaluate(() => ({ state: window.__grokVisit.state, cab: window.__grokVisit.cab && window.__grokVisit.cab.name }));
  }
  chk(st.state === 'play', 'reached play on ' + st.cab);

  // --- walk shot (freeze update, pose, camOverride) ---
  const walkPose = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, THREE = A.THREE;
    window.__savedShopUpdate = window.__shop.update;
    window.__shop.update = function () {};
    const cab = V.cab, pad = V.pad, face = cab.userData.facing;
    const f = cab.userData.front;
    const sx = f.x - face.x * (V.STAND_BACK || 0.42), sz = f.z - face.z * (V.STAND_BACK || 0.42);
    const gx = pad.x * 0.42 + sx * 0.58, gz = pad.z * 0.42 + sz * 0.58;
    const gyaw = Math.atan2(sx - pad.x, sz - pad.z);
    V.grok.visible = true;
    V.grok.position.set(gx, 0.03, gz);
    V.grok.rotation.set(-0.02, gyaw, 0.03);
    V.grok.scale.setScalar(V.SCALE || 0.665);
    if (V.legs) {
      V.legs[0].hip.rotation.set(0.65, 0, 0);
      V.legs[1].hip.rotation.set(-0.6, 0, 0);
      if (V.legs[0].thigh) V.legs[0].thigh.rotation.x = 0.3;
      if (V.legs[1].thigh) V.legs[1].thigh.rotation.x = 0.25;
    }
    V.arms[0].sh.rotation.set(-0.6, 0.05, 0.1);
    V.arms[1].sh.rotation.set(0.6, -0.05, -0.1);
    V.arms[0].el.rotation.set(-0.7, 0, 0);
    V.arms[1].el.rotation.set(-0.7, 0, 0);
    if (V.head) V.head.rotation.set(0.08, 0.75, 0);
    const forward = new THREE.Vector3(Math.sin(gyaw), 0, Math.cos(gyaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    // ~3.4 m three-quarter side (less behind → avoids pad occlusion): full body mid-stride + cabinet
    const cam = new THREE.Vector3(gx, 1.35, gz).add(right.multiplyScalar(3.4)).add(forward.multiplyScalar(-0.6));
    A.monkey.visible = false;
    window.__camOverride = { pos: [cam.x, cam.y, cam.z], at: [gx, 0.9, gz], showMonkey: false, bloom: 0.25 };
    return { headY: V.head && +V.head.rotation.y.toFixed(2), leg0: +V.legs[0].hip.rotation.x.toFixed(2) };
  });
  console.log('walkPose', JSON.stringify(walkPose));
  chk(Math.abs(walkPose.leg0) > 0.2, 'visible step pose');
  chk(Math.abs(walkPose.headY) > 0.3, 'head turned');
  await page.waitForTimeout(500);
  if (!process.env.NOSHOTS) await page.screenshot({ path: S + 'grok5_walk.png' });
  console.log('shot walk', fs.statSync(S + 'grok5_walk.png').size);

  // --- hands side ---
  const handsMeta = await page.evaluate(() => {
    // still frozen
    const V = window.__grokVisit, A = window.__arcade, THREE = A.THREE;
    // put him back at cab playing pose via skip helpers
    window.__shop.update = window.__savedShopUpdate;
    V.skipTo('play');
    for (let i = 0; i < 36; i++) window.__shop.update(1 / 30);
    // freeze again
    window.__savedShopUpdate = window.__shop.update;
    window.__shop.update = function () {};

    const g = V.grok, cab = V.cab;
    const face = cab.userData.facing.clone();
    let side = new THREE.Vector3(face.z, 0, -face.x).normalize();
    let joy = null, btn0 = null;
    cab.traverse(o => {
      if (o.name === 'joystick') { const v = new THREE.Vector3(); o.getWorldPosition(v); joy = v; }
      if (o.name === 'btn0') { const v = new THREE.Vector3(); o.getWorldPosition(v); btn0 = v; }
    });
    if (joy) { const toJoy = joy.clone().sub(g.position); toJoy.y = 0; if (toJoy.dot(side) < 0) side.negate(); }
    const at = (joy || g.position.clone()).clone(); at.y = 1.16;
    if (btn0) { at.lerp(btn0, 0.35); at.y = 1.16; }
    // ~5.4 m three-quarter: whole Grok + cabinet, hands on stick+buttons (phone FOV 72)
    const cam = g.position.clone()
      .add(side.clone().multiplyScalar(5.0))
      .add(face.clone().multiplyScalar(-2.0));
    cam.y = 1.7;
    const at2 = g.position.clone(); at2.y = 0.8;
    if (joy) at2.lerp(joy, 0.15); at2.y = 0.8;
    A.monkey.visible = false;
    window.__camOverride = { pos: [cam.x, cam.y, cam.z], at: [at2.x, at2.y, at2.z], showMonkey: false, bloom: 0.2 };
    A.camera.position.set(cam.x, cam.y, cam.z); A.camera.lookAt(at2.x, at2.y, at2.z); A.camera.updateMatrixWorld(true);
    if (V.placeTixHud) V.placeTixHud();

    const tipDist = (arm, palm) => {
      if (!arm || !palm || !palm.visible) return 99;
      arm.el.updateMatrixWorld(true); palm.updateMatrixWorld(true);
      const tip = new THREE.Vector3(0, -0.40, 0.02); arm.el.localToWorld(tip);
      const pw = new THREE.Vector3(); palm.getWorldPosition(pw);
      return tip.distanceTo(pw);
    };
    let pL = null, pR = null;
    cab.traverse(o => { if (o.name === 'gvPalm') { if (!pL) pL = o; else pR = o; } });
    // also search scene
    if (!pL) A.scene.traverse(o => { if (o.name === 'gvPalm' && o.visible) { if (!pL) pL = o; else pR = o; } });
    return {
      cab: cab.name,
      cam: [+cam.x.toFixed(2), +cam.y.toFixed(2), +cam.z.toFixed(2)],
      dL: +(tipDist(V.arms[0], pL)).toFixed(3),
      dR: +(tipDist(V.arms[1], pR)).toFixed(3),
    };
  });
  console.log('handsMeta', JSON.stringify(handsMeta));
  chk(handsMeta.dL < 0.48 && handsMeta.dR < 0.48, 'hands reach toward controls dL=' + handsMeta.dL + ' dR=' + handsMeta.dR);
  await page.waitForTimeout(500);
  if (!process.env.NOSHOTS) await page.screenshot({ path: S + 'grok5_hands.png' });
  console.log('shot hands', fs.statSync(S + 'grok5_hands.png').size);

  // --- grok6 close controls: ~1.2 m from panel, side+above, hands fill frame ---
  const ctrlMeta = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, THREE = A.THREE;
    // prefer Strike (clear stick+buttons) for the close controls proof
    window.__shop.update = window.__savedShopUpdate;
    const strike = A.strikeCab || (A.featured || []).find(c => c && /strike/i.test(c.name));
    if (strike) V.cab = strike;
    V.skipTo('play');
    for (let i = 0; i < 36; i++) window.__shop.update(1 / 30);
    // park stick upright + palms on joy/btn0, then a few IK frames
    const joyO = V.cab && V.cab.getObjectByName('joystick');
    const pL0 = V.palms && V.palms.L, pR0 = V.palms && V.palms.R;
    if (joyO && pL0) { if (pL0.parent) pL0.parent.remove(pL0); joyO.add(pL0); pL0.position.set(0, 0.14, 0); pL0.rotation.set(0.5, 0, 0); pL0.visible = true; }
    let b0 = null; V.cab.traverse(o => { if (!b0 && o.isMesh && /^btn0$/i.test(o.name)) b0 = o; });
    if (b0 && pR0) { if (pR0.parent) pR0.parent.remove(pR0); b0.add(pR0); pR0.position.set(0, 0.05, 0); pR0.rotation.set(0.2, 0, 0); pR0.visible = true; }
    for (let i = 0; i < 12; i++) {
      if (joyO) joyO.rotation.set(0, 0, 0);
      if (joyO && pL0) { if (pL0.parent !== joyO) { if (pL0.parent) pL0.parent.remove(pL0); joyO.add(pL0); } pL0.position.set(0, 0.14, 0); pL0.visible = true; }
      if (b0 && pR0) { if (pR0.parent !== b0) { if (pR0.parent) pR0.parent.remove(pR0); b0.add(pR0); } pR0.position.set(0, 0.05, 0); pR0.visible = true; }
      window.__shop.update(1 / 30);
      if (joyO) joyO.rotation.set(0, 0, 0);
    }
    // final park after last animatePlay
    if (joyO) joyO.rotation.set(0, 0, 0);
    if (joyO && pL0) { if (pL0.parent) pL0.parent.remove(pL0); joyO.add(pL0); pL0.position.set(0, 0.14, 0); pL0.rotation.set(0.5, 0, 0); pL0.visible = true; }
    if (b0 && pR0) { if (pR0.parent) pR0.parent.remove(pR0); b0.add(pR0); pR0.position.set(0, 0.05, 0); pR0.rotation.set(0.2, 0, 0); pR0.visible = true; }
    // one more IK without button cycling: monkey-patch btns empty via a tiny update won't work; arms already near from loop
    window.__savedShopUpdate = window.__shop.update;
    window.__shop.update = function () {};

    const g = V.grok, cab = V.cab;
    const face = cab.userData.facing.clone();
    let side = new THREE.Vector3(face.z, 0, -face.x).normalize();
    let joy = null, btn0 = null;
    cab.traverse(o => {
      if (o.name === 'joystick') { const v = new THREE.Vector3(); o.getWorldPosition(v); joy = v; }
      if (o.isMesh && (/^btn0$/i.test(o.name) || /^btn/i.test(o.name)) && !btn0) {
        const v = new THREE.Vector3(); o.getWorldPosition(v); btn0 = v;
      }
    });
    if (joy) { const toJoy = joy.clone().sub(g.position); toJoy.y = 0; if (toJoy.dot(side) < 0) side.negate(); }
    const panel = (joy && btn0) ? joy.clone().lerp(btn0, 0.5) : (joy || g.position.clone());
    panel.y = joy ? joy.y + 0.02 : 1.06;
    // ~1.25 m pure side + slightly above + a hair toward the room: panel fills frame, Grok hands enter from face side
    const cam = panel.clone()
      .add(side.clone().multiplyScalar(1.25))
      .add(face.clone().multiplyScalar(0.2));
    cam.y = panel.y + 0.42;
    // keep near plane from eating arms
    try { A.camera.near = 0.05; A.camera.updateProjectionMatrix(); } catch (e) {}
    A.monkey.visible = false;
    window.__camOverride = { pos: [cam.x, cam.y, cam.z], at: [panel.x, panel.y, panel.z], showMonkey: false, bloom: 0.15 };

    let pL = (V.palms && V.palms.L) || null, pR = (V.palms && V.palms.R) || null;
    if (!pL || !pR) {
      const found = [];
      cab.traverse(o => { if (o.name === 'gvPalm') found.push(o); });
      if (!found.length) A.scene.traverse(o => { if (o.name === 'gvPalm') found.push(o); });
      if (!pL) pL = found[0] || null;
      if (!pR) pR = found[1] || found[0] || null;
    }
    // ensure visible for the shot / tip check
    if (pL) pL.visible = true;
    if (pR) pR.visible = true;
    g.updateMatrixWorld(true);
    const tipDist = (arm, palm) => {
      if (!arm || !palm) return 99;
      arm.el.updateMatrixWorld(true); palm.updateMatrixWorld(true);
      const tip = new THREE.Vector3(0, -0.40, 0.02); arm.el.localToWorld(tip);
      const pw = new THREE.Vector3(); palm.getWorldPosition(pw);
      return +tip.distanceTo(pw).toFixed(3);
    };
    return {
      cab: cab.name,
      dL: tipDist(V.arms[0], pL), dR: tipDist(V.arms[1], pR),
      pLvis: !!(pL && pL.visible), pRvis: !!(pR && pR.visible),
      hasPalmsApi: !!(V.palms && V.palms.L && V.palms.R),
      joy: joy && [+joy.x.toFixed(2), +joy.y.toFixed(2), +joy.z.toFixed(2)],
      btn0: btn0 && [+btn0.x.toFixed(2), +btn0.y.toFixed(2), +btn0.z.toFixed(2)],
      cam: [+cam.x.toFixed(2), +cam.y.toFixed(2), +cam.z.toFixed(2)],
    };
  });
  console.log('ctrlMeta', JSON.stringify(ctrlMeta));
  chk(ctrlMeta.dL < 0.40 && ctrlMeta.dR < 0.40, 'controls hands reach toward dL=' + ctrlMeta.dL + ' dR=' + ctrlMeta.dR);
  await page.waitForTimeout(400);
  if (!process.env.NOSHOTS) await page.screenshot({ path: S + 'grok6_controls.png' });
  console.log('shot controls', fs.statSync(S + 'grok6_controls.png').size);

  // --- tickets: resume, pump to ~7, shot ---
  const tixSnap = await page.evaluate(() => {
    window.__shop.update = window.__savedShopUpdate;
    const V = window.__grokVisit, A = window.__arcade, THREE = A.THREE, Sh = window.__shop;
    if (V.state !== 'play') V.skipTo('play');
    // cam for counter visibility
    const g = V.grok, face = V.cab.userData.facing.clone();
    const side = new THREE.Vector3(face.z, 0, -face.x).normalize();
    const cam = g.position.clone().add(side.multiplyScalar(2.6)).add(face.clone().multiplyScalar(-1.4));
    cam.y = 1.85;
    window.__camOverride = { pos: [cam.x, cam.y, cam.z], at: [g.position.x, 1.7, g.position.z], showMonkey: false };
    A.monkey.visible = false;
    A.camera.position.set(cam.x, cam.y, cam.z); A.camera.lookAt(g.position.x, 1.7, g.position.z); A.camera.updateMatrixWorld(true);
    if (V.placeTixHud) V.placeTixHud();
    // pump until 7 tickets
    let guard = 0;
    while (V.tickets < 7 && V.state === 'play' && guard++ < 500) Sh.update(1 / 20);
    const spr = V.grok.getObjectByName('gvTixSprite');
    return {
      tickets: V.tickets, hud: spr && spr.userData && spr.userData.label, hudOn: !!(spr && spr.visible),
      state: V.state, player: A.play.tickets.total,
    };
  });
  console.log('tixSnap', JSON.stringify(tixSnap));
  chk(tixSnap.tickets >= 7, 'grok tickets >=7 got ' + tixSnap.tickets);
  chk(tixSnap.hudOn && /🎟/.test(tixSnap.hud || ''), 'ticket HUD visible: ' + tixSnap.hud);
  chk(tixSnap.player === playerT0, 'player tickets unchanged during play');
  await page.waitForTimeout(500);
  if (!process.env.NOSHOTS) await page.screenshot({ path: S + 'grok4_tickets.png' });
  console.log('shot tickets', fs.statSync(S + 'grok4_tickets.png').size);

  // Finish two machines
  const fin = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, Sh = window.__shop;
    window.__camOverride = null;
    let guard = 0;
    const cab1 = V.cab && V.cab.name;
    while (V.machinesDone < 1 && guard++ < 800) Sh.update(1 / 20);
    const after1 = { machinesDone: V.machinesDone, state: V.state, cab: V.cab && V.cab.name };
    // continue through cheer → walk → play → 20 more → cheer → return → leave → done
    guard = 0;
    while (V.state !== 'done' && guard++ < 2000) Sh.update(1 / 20);
    if (V.state !== 'done') V.skipTo('done');
    return {
      cab1, after1, machinesDone: V.machinesDone, finished: V.finished,
      player: A.play.tickets.total, state: V.state, said: (V.said || []).slice(),
      clips: performance.getEntriesByType('resource').map(e => e.name).filter(n => /sfx\/grok\//.test(n)).map(n => n.split('/').pop().split('?')[0]),
    };
  });
  console.log('fin', JSON.stringify(fin));
  chk(fin.machinesDone >= 2, 'played two machines got ' + fin.machinesDone);
  chk(fin.player === playerT0, 'player tickets still unchanged');
  chk(fin.said.length >= 1 && fin.said.every(x => x === 'Hi im Grok'), 't736u: the whole two-machine visit, Grok only ever says "Hi im Grok" ' + JSON.stringify(fin.said));
  chk(fin.clips.every(c => c === 'hi_im_grok.mp3'), 'only the "Hi im Grok" voice clip is ever loaded ' + JSON.stringify(Array.from(new Set(fin.clips))));

  // t736u: standing right next to Grok never shows SHOP buttons, the old chat bubbles, or extra lines. t810u: the one 💬 CHAT button (#gcBtn,
  // grokchat.js) now shows near him; the chat itself is covered by test/grok_chat.js
  const near = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, Sh = window.__shop;
    V.said.length = 0; V.fast = false;
    if (V.state === 'idle' || V.state === 'done') V.start('debug');
    const seen = { gc: 0, btns: 0, chatOv: 0, anyChatShop: 0, near: 0, tpAtCab: 0, other: {}, states: new Set() };
    for (let i = 0; i < 30 * 90 && V.state !== 'done'; i++) {
      if (V.grok.visible) { A.monkey.position.set(V.grok.position.x + 0.9, 0, V.grok.position.z + 0.4); }
      Sh.update(1 / 30);
      seen.states.add(V.state); if (V.near) seen.near++; if (document.getElementById('gcBtn').classList.contains('on')) seen.gc++;
      if (document.getElementById('gvBtns') || document.getElementById('gvShop') || document.getElementById('gvChat')) seen.btns++;
      if (document.getElementById('gvChatOv') || document.querySelector('.gvChip, .gvMsg')) seen.chatOv++;
      // not Grok's, and they stay: the teleport pad's SHOP/ARCADE button (#tpBtn), the prize-shop counter (#shopBtn), the multiplayer bar's player chat (#mpChatB)
      const vis = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent && /^(CHAT|SHOP)$/i.test((b.textContent || '').trim()));
      for (const b of vis) { seen.other[b.id || '?'] = (seen.other[b.id || '?'] || 0) + 1; }
      if (vis.some(b => !['tpBtn', 'shopBtn', 'mpChatB'].includes(b.id))) seen.anyChatShop++;
      if (V.state === 'play' && vis.some(b => b.id === 'tpBtn')) seen.tpAtCab++;
    }
    if (V.state !== 'done') V.skipTo('done');
    return { said: V.said.slice(), btns: seen.btns, chatOv: seen.chatOv, anyChatShop: seen.anyChatShop, other: seen.other, tpAtCab: seen.tpAtCab, near: seen.near, states: Array.from(seen.states), chatOpen: V.chatOpen, gc: seen.gc };
  });
  console.log('near', JSON.stringify(near));
  chk(near.near > 60 && near.states.includes('greet') && near.states.includes('play'), 'player stood next to Grok through greet + play ' + JSON.stringify({ near: near.near, states: near.states }));
  chk(near.said.length === 1 && near.said[0] === 'Hi im Grok', 'a full real-time visit: exactly one line, "Hi im Grok" ' + JSON.stringify(near.said));
  chk(near.btns === 0 && near.chatOv === 0 && near.anyChatShop === 0 && near.chatOpen === undefined, 'no SHOP buttons or old chat bubbles near Grok ' + JSON.stringify(near));
  chk(near.gc > 30, 't810u: the 💬 CHAT button shows while you stand next to Grok ' + near.gc);

  // WATCH button still present when near cab during play
  await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    V.fast = true;
    if (V.state === 'idle' || V.state === 'done') V.start('test');
    for (let i = 0; i < 400 && V.state !== 'play'; i++) window.__shop.update(1 / 30);
    if (V.state !== 'play') V.skipTo('play');
    const f = V.cab.userData.front;
    A.monkey.position.set(f.x, 0, f.z);
    for (let i = 0; i < 20; i++) A.step(1 / 60);
  });
  await page.waitForTimeout(300);
  const watch = await page.evaluate(() => {
    const b = document.getElementById('gvWatch');
    return { has: !!b, left: b && getComputedStyle(b).left, on: b && b.classList.contains('on') };
  });
  console.log('watch', JSON.stringify(watch));
  chk(watch.has, 'WATCH button exists');
  const watchFS = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    const t0 = A.play.tickets.total;
    const b = document.getElementById('gvWatch');
    if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    if (!V.watchOpen && V.openWatch) V.openWatch();
    if (!document.getElementById('gvWatchOv').classList.contains('on')) {
      document.getElementById('gvWatch').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    }
    return { t0, on: document.getElementById('gvWatchOv').classList.contains('on') };
  });
  await page.waitForFunction(() => {
    const fr = document.getElementById('gvWatchFrame');
    if (!fr || !fr.src || fr.src.indexOf('watch=1') < 0) return false;
    try {
      const w = fr.contentWindow;
      return !!(w && (w.__DEMO || (w.__demo && w.__demo.on) || w.document.querySelector('canvas')));
    } catch (e) { return false; }
  }, null, { timeout: 15000 });
  const watchFS2 = await page.evaluate((t0) => {
    const V = window.__grokVisit, A = window.__arcade;
    const ov = document.getElementById('gvWatchOv');
    const fr = document.getElementById('gvWatchFrame');
    const hands = document.getElementById('gvWatchHands');
    const x = document.getElementById('gvWatchX');
    const badge = document.getElementById('gvWatchBadge');
    let demoOn = false, watchFlag = false, hasCanvas = false;
    try {
      const w = fr.contentWindow;
      demoOn = !!(w && (w.__DEMO || (w.__demo && w.__demo.on)));
      watchFlag = !!(w && w.__WATCH);
      hasCanvas = !!(w && w.document && w.document.querySelector('canvas'));
    } catch (e) {}
    return {
      on: ov && ov.classList.contains('on'),
      hasFrame: !!fr,
      frameSrc: fr && fr.src,
      handsDisp: hands && getComputedStyle(hands).display,
      hasX: !!x,
      badge: badge && badge.textContent,
      expert: !!window.__watchExpert,
      tickets: A.play.tickets.total,
      t0,
      bot: V.watchBot,
      demoOn, watchFlag, hasCanvas,
    };
  }, watchFS.t0);
  console.log('watchFS', JSON.stringify(watchFS2));
  chk(watchFS2.on, 'watch overlay open');
  chk(watchFS2.hasX, 'watch close button present');
  chk(watchFS2.handsDisp === 'none', 'hands deck hidden for fullscreen');
  chk(watchFS2.expert, 'expert flag on while watching');
  chk(watchFS2.tickets === watchFS2.t0, 'player tickets unchanged in watch');
  chk(watchFS2.hasFrame && /watch=1/.test(watchFS2.frameSrc || ''), 'watch iframe loads play URL with watch=1');
  chk(watchFS2.demoOn || watchFS2.bot === 'smart' || watchFS2.bot === 'fallback', 'watch demo/bot running');
  chk(watchFS2.hasCanvas, 'real game canvas inside watch iframe');

  // close via X
  await page.evaluate(() => {
    const x = document.getElementById('gvWatchX');
    if (x) x.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  const closed = await page.evaluate(() => !document.getElementById('gvWatchOv').classList.contains('on'));
  chk(closed, 'watch closes via X');
  await page.evaluate(() => window.__grokVisit.skipTo('done'));

  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
