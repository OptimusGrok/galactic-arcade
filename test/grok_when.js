// Grok visits 30s after arcade entry, and each visit picks two eligible machines by seed, not by distance.
// node test/grok_when.js
const { open } = require('./lib');
const fs = require('fs');
const SHOT = '/opt/cursor/artifacts/grok_far_machine.png';
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 700) : '')); if (!c) ok = false; };

(async () => {
  const o = await open({ phone: true, w: 390, h: 844 });
  const page = o.page, { errors } = o;
  await page.evaluate(() => { localStorage.setItem('neonarcade.tickets', '40'); });
  await page.reload();
  await page.waitForFunction(() => window.__grokVisit && window.__grokVisit.ready && window.__shop && window.__arcade.stats.frames > 3, null, { timeout: 90000 });
  await page.evaluate(() => window.__arcade.simPause(true));

  const setup = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    if (V.state !== 'idle' && V.state !== 'done') V.skipTo('done');
    V.state = 'idle'; V.visited = false; V.due = false; V.entryT = 0; V.grok.visible = false;
    const s = document.getElementById('start'); if (s) s.remove();
    if (window.__start) { window.__start.shown = false; window.__start.dismissed = true; }
    if (window.__tp) { window.__tp.state = 'idle'; window.__tp.beaming = false; }
    A.play.mode = 'walk';
    V.simulateLooks(2);
    window.__shop.update(0.2);
    const pad = { x: V.pad.x, z: V.pad.z };
    const all = (A.featured || []).map(c => (c.userData && c.userData.name) || c.name);
    const list = V.eligibleCabs().map(c => {
      const f = c.userData.front;
      return { name: (c.userData && c.userData.name) || c.name, x: +f.x.toFixed(2), z: +f.z.toFixed(2), pad: +Math.hypot(f.x - pad.x, f.z - pad.z).toFixed(2), joy: !!c.getObjectByName('joystick') };
    });
    return { state: V.state, started: V.started, looks: V.lookCount, playable: V.playable(), busy: V.isBusy(), pad, all, list, tix: A.play.tickets.total };
  });
  console.log('eligible', JSON.stringify(setup));
  chk(setup.state === 'idle' && setup.started === 0 && setup.looks >= 2, 'looking at the pad does not start the visit', setup);
  chk(setup.list.length === 2 && setup.list.every(c => /strike|ghost/i.test(c.name) && c.joy) && setup.all.length > setup.list.length, 'only Strike and Ghost are eligible live-demo machines', setup.list);

  const picks = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    const names = () => V.eligibleCabs().map(c => (c.userData && c.userData.name) || c.name);
    const list = names();
    const seeds = [0.01, 0.2, 0.49, 0.51, 0.8, 0.99];
    const out = seeds.map(s => {
      let n = 0; const seq = [s, (s + 0.5) % 1];
      V.rng = () => seq[Math.min(n++, seq.length - 1)];
      const a = V.pickCab(), b = V.pickCab(a);
      const ia = list.indexOf((a.userData && a.userData.name) || a.name);
      return { s, first: (a.userData && a.userData.name) || a.name, second: (b.userData && b.userData.name) || b.name, index: ia, expect: Math.min(list.length - 1, Math.floor(s * list.length)) };
    });
    A.monkey.position.set(11, 0, 11); V.grok.position.set(11, 0, 11);
    V.rng = () => 0.01; const far = ((c) => (c.userData && c.userData.name) || c.name)(V.pickCab());
    A.monkey.position.set(V.pad.x, 0, V.pad.z); V.grok.position.set(V.pad.x, 0, V.pad.z);
    V.rng = () => 0.01; const near = ((c) => (c.userData && c.userData.name) || c.name)(V.pickCab());
    return { list, out, far, near, state: V.state };
  });
  console.log('picks', JSON.stringify(picks));
  const firsts = new Set(picks.out.map(p => p.first));
  chk(picks.state === 'idle' && picks.out.every(p => p.first !== p.second && p.index === p.expect) && firsts.size === picks.list.length && picks.far === picks.near, 'seeds index the eligible list and ignore where Grok and the player stand', picks);

  const shot = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    const list = V.eligibleCabs();
    V.rng = () => 0.99;
    const cab = V.pickCab();
    V.cab = cab; V.fast = true;
    const stood = V.skipTo('play');
    const f = cab.userData.front;
    A.monkey.position.set(0, 0, 5); A.monkey.visible = false;
    const gx = V.grok.position.x, gz = V.grok.position.z;
    window.__camOverride = { pos: [gx + 2.15, 1.35, gz + 2.35], at: [gx - 0.45, 1.05, gz - 0.15], showMonkey: false, bloom: 0.22 };
    A.simPause(false);
    const padD = Math.hypot(f.x - V.pad.x, f.z - V.pad.z);
    const centreD = Math.hypot(f.x, f.z);
    return { stood, name: (cab.userData && cab.userData.name) || cab.name, x: +f.x.toFixed(2), z: +f.z.toFixed(2), padD: +padD.toFixed(2), centreD: +centreD.toFixed(2), vis: V.grok.visible, y: +V.grok.position.y.toFixed(2), state: V.state, tix: A.play.tickets.total };
  });
  const n0 = await page.evaluate(() => window.__arcade.stats.frames);
  await page.waitForFunction(n => window.__arcade.stats.frames > n + 1, n0, { timeout: 20000 });
  await page.screenshot({ path: SHOT });
  await page.evaluate(() => { window.__arcade.simPause(true); window.__camOverride = null; });
  console.log('shot', JSON.stringify(shot));
  chk(shot.stood && shot.vis && shot.state === 'play' && /strike|ghost/i.test(shot.name), 'Grok is at the machine a high seed selected', shot);

  const timing = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, Sh = window.__shop, tp = window.__tp;
    V.skipTo('done');
    V.state = 'idle'; V.visited = false; V.due = false; V.entryT = 0; V.started = 0; V.grok.visible = false; V.rng = null;
    const tix0 = A.play.tickets.total;
    const el = document.createElement('div'); el.id = 'start'; document.body.appendChild(el);
    window.__start.shown = true; window.__start.dismissed = false;
    for (let i = 0; i < 45 * 30; i++) Sh.update(1 / 30);
    const onStart = { entryT: +V.entryT.toFixed(2), state: V.state, started: V.started, playable: V.playable() };
    el.remove(); window.__start.shown = false; window.__start.dismissed = true;
    tp.state = 'remat'; tp.beaming = true;
    for (let i = 0; i < 40 * 30; i++) Sh.update(1 / 30);
    const onBeam = { entryT: +V.entryT.toFixed(2), state: V.state, started: V.started, playable: V.playable() };
    tp.state = 'idle'; tp.beaming = false;
    for (let i = 0; i < 29 * 30; i++) Sh.update(1 / 30);
    const early = { entryT: +V.entryT.toFixed(2), due: V.due, state: V.state, started: V.started };
    A.play.mode = 'game';
    for (let i = 0; i < 3 * 30; i++) Sh.update(1 / 30);
    const held = { entryT: +V.entryT.toFixed(2), due: V.due, state: V.state, started: V.started, busy: V.isBusy() };
    A.play.mode = 'walk';
    Sh.update(1 / 30);
    const began = { state: V.state, started: V.started, visited: V.visited, reason: V.reason, cab: V.cab && ((V.cab.userData && V.cab.userData.name) || V.cab.name), tix: A.play.tickets.total, tix0 };
    V.skipTo('done');
    V.state = 'idle';
    const startedAt = V.started;
    for (let i = 0; i < 10 * 30; i++) Sh.update(1 / 30);
    return { onStart, onBeam, early, held, began, after: { state: V.state, started: V.started, same: V.started === startedAt }, tix: A.play.tickets.total };
  });
  console.log('timing', JSON.stringify(timing));
  chk(timing.onStart.entryT === 0 && timing.onStart.state === 'idle' && !timing.onStart.playable, 'the start screen does not consume the 30s', timing.onStart);
  chk(timing.onBeam.entryT === 0 && timing.onBeam.state === 'idle' && !timing.onBeam.playable, 'the entry beam does not consume the 30s', timing.onBeam);
  chk(timing.early.entryT >= 28.5 && timing.early.entryT < 30 && !timing.early.due && timing.early.state === 'idle', 'he is not due before 30s in the arcade', timing.early);
  chk(timing.held.due && timing.held.state === 'idle' && timing.held.started === 0 && timing.held.busy, 'a game at the due moment defers him', timing.held);
  chk(timing.began.state !== 'idle' && timing.began.started === 1 && timing.began.visited && timing.began.reason === 'enter' && timing.began.tix === timing.began.tix0, 'he appears once when the arcade is free and does not touch player tickets', timing.began);
  chk(timing.after.state === 'idle' && timing.after.same && timing.tix === 40, 'the visit does not repeat and the player still has 40 tickets', timing.after);

  chk(fs.existsSync(SHOT) && fs.statSync(SHOT).size > 8000, 'screenshot written');
  const real = errors.filter(e => !/ERR_FAILED|supabase|favicon|net::/i.test(e));
  chk(real.length === 0, 'no page errors ' + real.join('|'));
  await o.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
