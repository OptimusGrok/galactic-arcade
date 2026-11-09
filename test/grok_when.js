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
    return { state: V.state, started: V.started, looks: V.lookCount, playable: V.playable(), busy: V.isBusy(), pad, all, list, tix: A.play.tickets.total, skipped: V.skipped };
  });
  console.log('eligible', JSON.stringify(setup));
  chk(setup.state === 'idle' && setup.started === 0 && setup.looks >= 2, 'looking at the pad does not start the visit', setup);
  const farCabs = setup.list.filter(c => c.pad > 10);
  const walls = new Set(setup.list.map(c => (Math.abs(c.z) > Math.abs(c.x) ? (c.z < 0 ? 'N' : 'S') : (c.x < 0 ? 'W' : 'E'))));
  chk(setup.list.length >= 8 && farCabs.length >= 3 && walls.size >= 3 && setup.list.every(c => c.joy) && !setup.list.some(c => /roadster|claw|dead/i.test(c.name)), 'eligible set spans the room, including far cabinets', { n: setup.list.length, far: farCabs, walls: [...walls], skipped: setup.skipped });
  console.log('skipped', JSON.stringify(setup.skipped));

  const picks = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    const nm = c => (c.userData && c.userData.name) || c.name;
    const list = V.eligibleCabs();
    const names = list.map(nm);
    const byDist = list.map(c => ({ name: nm(c), d: Math.hypot(c.userData.front.x - V.pad.x, c.userData.front.z - V.pad.z) })).sort((a, b) => a.d - b.d);
    const out = [];
    for (let i = 0; i < names.length; i++) {
      const s = (i + 0.01) / names.length;
      let n = 0; const seq = [s, 0.99];
      V.rng = () => seq[Math.min(n++, seq.length - 1)];
      const a = V.pickCab(), b = V.pickCab(a);
      out.push({ s: +s.toFixed(3), first: nm(a), second: nm(b), index: names.indexOf(nm(a)), expect: i });
    }
    A.monkey.position.set(11, 0, 11); V.grok.position.set(11, 0, 10);
    V.rng = () => 0.01; const atFar = nm(V.pickCab());
    A.monkey.position.set(V.pad.x, 0, V.pad.z); V.grok.position.set(V.pad.x, 0, V.pad.z);
    V.rng = () => 0.01; const atPad = nm(V.pickCab());
    return { names, byDist, out, atFar, atPad, state: V.state };
  });
  console.log('picks', JSON.stringify(picks.out));
  const firsts = new Set(picks.out.map(p => p.first));
  const nearest = picks.byDist[0].name;
  chk(picks.state === 'idle' && picks.out.every(p => p.first !== p.second && p.index === p.expect) && firsts.size === picks.names.length && picks.atFar === picks.atPad && picks.out.some(p => p.first !== nearest), 'every cabinet can be the first stop, and the choice ignores where Grok and the player stand', { nearest, atFar: picks.atFar, atPad: picks.atPad });

  const screens = await page.evaluate(() => {
    const V = window.__grokVisit;
    const creditish = (img) => {
      const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 16) if (d[i] > 230 && d[i + 1] > 150 && d[i + 1] < 250 && d[i + 2] < 130 && d[i] > d[i + 1]) n++;
      return n;
    };
    const sig = (img) => {
      const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; let s = 0;
      for (let i = 0; i < d.length; i += 64) s = (s + d[i] * 3 + d[i + 1] * 5 + d[i + 2]) % 10000019;
      return s;
    };
    const rows = [];
    for (const c of V.eligibleCabs()) {
      const visit = c.userData && c.userData.visit;
      if (!visit || typeof c.userData.tick !== 'function') { rows.push({ name: c.name, live: true }); continue; }
      const img = c.getObjectByName('screen').material.map.image;
      visit.on = false; c.userData.tick(0); const off = creditish(img), sigOff = sig(img);
      visit.on = true; c.userData.tick(0); const on = creditish(img);
      c.userData.tick(1.7); const moved = sig(img) !== sigOff;
      visit.on = false; c.userData.tick(0); const back = creditish(img);
      rows.push({ name: c.name, off, on, back, moved });
    }
    return rows;
  });
  console.log('screens', JSON.stringify(screens));
  const canvasRows = screens.filter(r => !r.live);
  chk(canvasRows.length >= 6 && canvasRows.every(r => r.on < r.off && r.back >= r.off * 0.7 && r.moved), 'visitor mode hides the credit line, public mode puts it back, and the attract still moves', canvasRows);

  const watch = await page.evaluate(() => {
    const V = window.__grokVisit, Sh = window.__shop;
    const cab = V.eligibleCabs().find(c => /novaCabinet|bbCabinet|pipCabinet/.test(c.name));
    V.cab = cab; V.fast = true; V.skipTo('play');
    const times = []; const orig = cab.userData.tick;
    cab.userData.tick = (tm) => { times.push(tm); return orig.call(cab.userData, tm); };
    for (let i = 0; i < 8; i++) Sh.update(0.1);
    cab.userData.tick = orig;
    document.getElementById('gvWatch').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    const cv = document.getElementById('gvWatchCv');
    const cx = (cv.width / 2) | 0, cy = (cv.height / 2) | 0;
    const d = cv.getContext('2d').getImageData(Math.max(0, cx - 90), Math.max(0, cy - 90), 180, 180).data;
    let ink = 0; for (let i = 0; i < d.length; i += 32) if (d[i] + d[i + 1] + d[i + 2] > 48) ink++;
    const span = times.length > 1 ? times[times.length - 1] - times[0] : 0;
    const visiting = !!(cab.userData.visit && cab.userData.visit.on);
    V.skipTo('done');
    return { name: cab.name, open: document.getElementById('gvWatchOv').classList.contains('on') || visiting, ink, span: +span.toFixed(2), n: times.length, visiting };
  });
  console.log('watch', JSON.stringify(watch));
  chk(watch.visiting && watch.ink > 40 && watch.n >= 6 && watch.span > 0.45 && watch.span < 1.15, 'Watch shows the attract at normal speed with no credit overlay', watch);

  const shot = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    const list = V.eligibleCabs();
    let cab = list[0], best = -1;
    for (const c of list) { const f = c.userData.front, d = Math.hypot(f.x - V.pad.x, f.z - V.pad.z); if (d > best) { best = d; cab = c; } }
    V.cab = cab; V.fast = true;
    const stood = V.skipTo('play');
    const inn = cab.userData.inward || { x: 0, z: 1 };
    const gx = V.grok.position.x, gz = V.grok.position.z;
    A.monkey.position.set(0, 0, 5); A.monkey.visible = false;
    window.__camOverride = {
      pos: [gx + inn.x * 6.2 + inn.z * 2.6, 2.15, gz + inn.z * 6.2 - inn.x * 2.6],
      at: [gx - inn.x * 0.15, 1.45, gz - inn.z * 0.35], showMonkey: false, bloom: 0.16,
    };
    A.simPause(false);
    const f = cab.userData.front;
    return { stood, name: cab.name, x: +f.x.toFixed(2), z: +f.z.toFixed(2), gx: +gx.toFixed(2), gz: +gz.toFixed(2), padD: +best.toFixed(2), visit: !!(cab.userData.visit && cab.userData.visit.on), vis: V.grok.visible, state: V.state, tix: A.play.tickets.total };
  });
  const n0 = await page.evaluate(() => window.__arcade.stats.frames);
  await page.waitForFunction(n => window.__arcade.stats.frames > n + 1, n0, { timeout: 20000 });
  await page.screenshot({ path: SHOT });
  await page.evaluate(() => { window.__arcade.simPause(true); window.__camOverride = null; });
  console.log('shot', JSON.stringify(shot));
  chk(shot.stood && shot.vis && shot.state === 'play' && shot.padD > 12 && shot.visit && !/strike|ghost/i.test(shot.name), 'Grok is playing a far cabinet, not the pad corner', shot);

  const run = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, Sh = window.__shop;
    V.skipTo('done');
    V.state = 'idle'; V.visited = false; V.due = false; V.entryT = 0; V.started = 0; V.fast = true; V.grok.visible = false;
    V.grok.position.set(V.pad.x, 0, V.pad.z);
    const nm = c => c.name;
    const list = V.eligibleCabs();
    const ranked = list.map(c => ({ c, d: Math.hypot(c.userData.front.x - V.pad.x, c.userData.front.z - V.pad.z) })).sort((a, b) => b.d - a.d);
    const farA = ranked[0].c, farB = ranked.find(r => Math.hypot(r.c.userData.front.x - farA.userData.front.x, r.c.userData.front.z - farA.userData.front.z) > 8).c;
    const iA = list.indexOf(farA);
    let call = 0;
    V.rng = () => {
      call++;
      if (call === 1) return (iA + 0.01) / list.length;
      const rest = list.filter(c => c !== farA);
      return (rest.indexOf(farB) + 0.01) / rest.length;
    };
    const tix0 = A.play.tickets.total;
    const credits0 = {};
    for (const c of list) credits0[c.name] = (c.userData && c.userData.credits) || 0;
    V.start('test');
    const trail = []; let guard = 0; const legs = [];
    while (V.machinesDone < 1 && V.state !== 'done' && guard++ < 1500) {
      Sh.update(1 / 30);
      if (V.state === 'walk' || V.state === 'return') {
        const x = V.grok.position.x, z = V.grok.position.z;
        trail.push([+x.toFixed(2), +z.toFixed(2)]);
        if (!legs.length || legs[legs.length - 1].cab !== (V.cab && V.cab.name)) legs.push({ cab: V.cab && V.cab.name, route: V._route });
      }
    }
    const mid = { state: V.state, cab: V.cab && V.cab.name, done: V.machinesDone, tix: V.tickets, player: A.play.tickets.total };
    guard = 0;
    while (V.state !== 'done' && guard++ < 2500) {
      Sh.update(1 / 30);
      if ((V.state === 'walk' || V.state === 'return') && trail.length < 800) trail.push([+V.grok.position.x.toFixed(2), +V.grok.position.z.toFixed(2)]);
    }
    if (V.state !== 'done') V.skipTo('done');
    const spots = [farA, farB].map(c => { const f = c.userData.front, face = c.userData.facing; return { x: f.x + -face.x * (window.__grokVisit.STAND_BACK || 0.55), z: f.z - face.z * (window.__grokVisit.STAND_BACK || 0.55) }; });
    spots.push({ x: V.pad.x, z: V.pad.z });
    let clipped = 0;
    for (const [x, z] of trail) {
      if (spots.some(s => Math.hypot(x - s.x, z - s.z) < 1.3)) continue;
      if (V.pointBlocked(x, z)) clipped++;
    }
    const visitsLeft = list.filter(c => c.userData && c.userData.visit && c.userData.visit.on).map(c => c.name);
    return {
      farA: nm(farA), farB: nm(farB), da: +ranked[0].d.toFixed(2),
      db: +Math.hypot(farB.userData.front.x - V.pad.x, farB.userData.front.z - V.pad.z).toFixed(2),
      span: +Math.hypot(farA.userData.front.x - farB.userData.front.x, farA.userData.front.z - farB.userData.front.z).toFixed(2),
      mid, machinesDone: V.machinesDone, state: V.state, player: A.play.tickets.total, tix0,
      said: (V.said || []).filter(s => /twenty/i.test(s)),
      clipped, trail: trail.length, visitsLeft, legs: legs.map(l => l.cab),
    };
  });
  console.log('run', JSON.stringify(run));
  chk(run.da > 12 && run.db > 10 && run.span > 8 && run.mid.cab === run.farA && run.machinesDone >= 2 && run.state === 'done', 'a far-to-far visit plays 20 then 20 and leaves', run);
  chk(run.player === run.tix0 && run.player === 40 && run.said.length >= 2 && run.visitsLeft.length === 0, 'player tickets stay put and visitor mode turns back off', run);
  chk(run.clipped === 0 && run.trail > 8, 'the walk stays out of cabinets and walls', { clipped: run.clipped, trail: run.trail, legs: run.legs });

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
