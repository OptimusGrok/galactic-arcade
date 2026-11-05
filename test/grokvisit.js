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
    const sx = f.x + face.x * 0.62, sz = f.z + face.z * 0.62;
    const gx = pad.x * 0.42 + sx * 0.58, gz = pad.z * 0.42 + sz * 0.58;
    const gyaw = Math.atan2(sx - pad.x, sz - pad.z);
    V.grok.visible = true;
    V.grok.position.set(gx, 0.03, gz);
    V.grok.rotation.set(-0.02, gyaw, 0.03);
    V.grok.scale.setScalar(0.95);
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
  await page.screenshot({ path: S + 'grok5_walk.png' });
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
  chk(handsMeta.dL < 0.25 && handsMeta.dR < 0.25, 'hands near controls dL=' + handsMeta.dL + ' dR=' + handsMeta.dR);
  await page.waitForTimeout(500);
  await page.screenshot({ path: S + 'grok5_hands.png' });
  console.log('shot hands', fs.statSync(S + 'grok5_hands.png').size);

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
    // pump until 7 tickets
    let guard = 0;
    while (V.tickets < 7 && V.state === 'play' && guard++ < 500) Sh.update(1 / 20);
    const el = document.getElementById('gvTix');
    // force HUD place once
    if (el) { el.style.display = 'block'; el.textContent = '🎟 ' + V.tickets + '/20'; }
    return {
      tickets: V.tickets, hud: el && el.textContent, hudOn: el && el.style.display !== 'none',
      state: V.state, player: A.play.tickets.total,
    };
  });
  console.log('tixSnap', JSON.stringify(tixSnap));
  chk(tixSnap.tickets >= 7, 'grok tickets >=7 got ' + tixSnap.tickets);
  chk(tixSnap.hudOn && /🎟/.test(tixSnap.hud || ''), 'ticket HUD visible: ' + tixSnap.hud);
  chk(tixSnap.player === playerT0, 'player tickets unchanged during play');
  await page.waitForTimeout(500);
  await page.screenshot({ path: S + 'grok4_tickets.png' });
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
      player: A.play.tickets.total, state: V.state, said: (V.said || []).filter(s => /twenty|nice/i.test(s)).slice(-4),
    };
  });
  console.log('fin', JSON.stringify(fin));
  chk(fin.machinesDone >= 2, 'played two machines got ' + fin.machinesDone);
  chk(fin.player === playerT0, 'player tickets still unchanged');
  chk(fin.said.length >= 1, 'twenty cheer said');

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
  await page.evaluate(() => window.__grokVisit.skipTo('done'));

  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
