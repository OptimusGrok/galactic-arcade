// t632u: Grok visits the arcade — look-trigger logic + forced start; phone viewport; shots.
const { open } = require('./lib');
const S = '/workspace/galactic-shop/shots/';
const fs = require('fs');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 844 });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  fs.mkdirSync(S, { recursive: true });

  await page.waitForFunction(() => window.__shop && window.__grokVisit && window.__grokVisit.ready, null, { timeout: 90000 });
  const info = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    const pad = V.pad;
    const cabs = (A.featured || []).filter(c => c.getObjectByName && c.getObjectByName('joystick')
      && !/roadster|claw|deadsignal/i.test(c.name || ''));
    return { state: V.state, pad: [+pad.x.toFixed(2), +pad.z.toFixed(2)], cabs: cabs.map(c => c.name), n: cabs.length };
  });
  console.log('info', JSON.stringify(info));
  chk(info.state === 'idle', 'starts idle');
  chk(!!info.pad, 'pad ' + info.pad);
  chk(info.n >= 5, 'joystick cabinets ' + info.n + ' ' + info.cabs.join(','));

  // ---- look-trigger: settle camera, confirm padLooking, seed 1 look, stare to trip the 2nd ----
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
      } else {
        A.st.face = Math.atan2(1, 1); A.st.yaw = A.st.face - Math.PI;
      }
      for (let i = 0; i < 45; i++) A.step(1 / 60);   // settle third-person camera onto the aim
    };
    V.fallAt = 1e9;
    aim(true);
    const looking = V.isLooking();
    const busy = V.isBusy();
    // first look counted via wall-clock stare
    await wait(700);
    const a1 = { lookCount: V.lookCount, looking, busy, state: V.state };
    aim(false); await wait(400);
    // seed one prior look so the next stare is the 2nd (triggers visit)
    V.simulateLooks(1);
    aim(true); await wait(700);
    await wait(600);   // allow begin('look') to start
    return { a1, a2: { lookCount: V.lookCount, state: V.state, started: V.started, reason: V.reason } };
  });
  console.log('look', JSON.stringify(look));
  chk(look.a1.looking && !look.a1.busy, 'pad in view when aimed (looking=' + look.a1.looking + ' busy=' + look.a1.busy + ')');
  chk(look.a1.lookCount >= 1 || look.a2.lookCount >= 2 || look.a2.started >= 1,
    'look counted (a1=' + look.a1.lookCount + ' a2=' + look.a2.lookCount + ')');
  chk(look.a2.started >= 1 && look.a2.reason === 'look',
    '2nd look started the visit (started=' + look.a2.started + ' reason=' + look.a2.reason + ' state=' + look.a2.state + ')');

  // ---- force start (debug hook) if look didn't fire (headless camera can be flaky) ----
  await page.evaluate(() => {
    const V = window.__grokVisit;
    V.fast = true; V.fallAt = 1e9;
    if (V.state === 'idle' || V.state === 'done') V.start('test');
  });
  await page.waitForFunction(() => {
    const V = window.__grokVisit; return V && V.grok && V.grok.visible && (V.state === 'greet' || V.state === 'walk' || V.state === 'play');
  }, null, { timeout: 20000 });

  // Arrive shot: park the local monkey out of frame; snap Grok to full size at the pad with beam on
  await page.evaluate(() => {
    const A = window.__arcade, V = window.__grokVisit, pad = V.pad, THREE = A.THREE;
    A.monkey.visible = false;
    A.monkey.position.set(0, 0, 0);   // away from the NW corner
    // free-cam style: put the follow target near the pad so the third-person camera frames Grok
    A.monkey.position.set(pad.x + 0.2, 0, pad.z + 2.8);
    A.st.face = Math.PI; A.st.yaw = 0; A.st.pitch = 0.25; A.st.dist = 4.2; A.st.camInit = false;
    V.grok.position.set(pad.x, 0, pad.z);
    V.grok.scale.setScalar(0.6);
    V.grok.rotation.y = Math.atan2(0 - pad.x, 0 - pad.z);
    V.grok.visible = true;
    // ensure beam FX visible
    try { V.skipTo && null; } catch (e) {}
  });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: S + 'grok_visit_arrive.png' });
  console.log('shot arrive');
  await page.evaluate(() => { window.__arcade.monkey.visible = true; });

  // Skip ahead to playing at a cabinet for the play shot
  await page.evaluate(() => { window.__grokVisit.skipTo('play'); });
  await page.waitForTimeout(400);
  const playing = await page.evaluate(() => {
    const V = window.__grokVisit, c = V.cab, A = window.__arcade;
    if (c && c.userData.front) {
      const f = c.userData.front, face = c.userData.facing;
      // stand to the side-rear of Grok so he and the cabinet controls are both visible
      const sideX = face.z, sideZ = -face.x; // perpendicular
      // far side-rear so Grok (at the cabinet) is clearly in frame, not covered by the local monkey
      A.monkey.position.set(f.x - face.x * 3.2 + sideX * 2.4, 0, f.z - face.z * 3.2 + sideZ * 2.4);
      A.st.face = Math.atan2(V.grok.position.x - A.monkey.position.x, V.grok.position.z - A.monkey.position.z);
      A.st.yaw = A.st.face - Math.PI; A.st.pitch = 0.28; A.st.dist = 4.2; A.st.camInit = false;
    }
    return { state: V.state, cab: c && c.name, vis: V.grok.visible, pos: V.grok.position.toArray().map(v => +v.toFixed(2)),
      tickets: A.play.tickets.total, gScale: +V.grok.scale.x.toFixed(2) };
  });
  console.log('playing', JSON.stringify(playing));
  chk(playing.state === 'play', 'state play (got ' + playing.state + ')');
  chk(playing.vis, 'Grok visible at cabinet');
  chk(!!playing.cab, 'picked cabinet ' + playing.cab);

  await page.waitForTimeout(800);
  await page.screenshot({ path: S + 'grok_visit_playing.png' });
  console.log('shot playing');

  // Joystick should be wiggling
  const joy = await page.evaluate(async () => {
    const V = window.__grokVisit, j = V.cab && V.cab.getObjectByName('joystick');
    if (!j) return { noJoy: true };
    const a = [j.rotation.x, j.rotation.z];
    await new Promise(r => setTimeout(r, 1600));
    const b = [j.rotation.x, j.rotation.z];
    return { moved: Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.02, a, b };
  });
  console.log('joy', JSON.stringify(joy));
  chk(!joy.noJoy && joy.moved, 'joystick wiggles while Grok plays');

  // Tickets unchanged after visit activity
  const tickets2 = await page.evaluate(() => window.__arcade.play.tickets.total);
  chk(tickets2 === playing.tickets, 'tickets unchanged (' + playing.tickets + ' -> ' + tickets2 + ')');

  // Leave / close shot
  await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, pad = V.pad;
    V.skipTo('leave');
    A.monkey.position.set(pad.x + 2.8, 0, pad.z + 3.2);
    const fx = pad.x - A.monkey.position.x, fz = pad.z - A.monkey.position.z;
    A.st.face = Math.atan2(fx, fz); A.st.yaw = A.st.face - Math.PI; A.st.pitch = 0.1; A.st.dist = 3.6; A.st.camInit = false;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: S + 'grok_visit_close.png' });
  console.log('shot close');

  // Wait until done
  await page.waitForFunction(() => window.__grokVisit.state === 'done', null, { timeout: 10000 }).catch(() => {});
  const fin = await page.evaluate(() => ({ state: window.__grokVisit.state, finished: window.__grokVisit.finished, vis: window.__grokVisit.grok.visible }));
  console.log('fin', JSON.stringify(fin));
  chk(fin.state === 'done' && !fin.vis, 'beamed out and done');

  // Once per session: look/random should not re-fire from done (start('test') still allowed for debug)
  await page.evaluate(() => { const V = window.__grokVisit; V.lookCount = 2; V.fallAt = 0; });
  await page.waitForTimeout(400);
  const stay = await page.evaluate(() => window.__grokVisit.state);
  chk(stay === 'done', 'stays done after look/random would have fired again');

  const realErrs = errors.filter(e => !/supabase|Signal|AudioContext|favicon|AbortError/i.test(e));
  chk(realErrs.length === 0, 'no page errors ' + realErrs.slice(0, 4).join(' | '));

  await close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
