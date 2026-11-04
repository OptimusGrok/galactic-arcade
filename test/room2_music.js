// t244: the same Neon Nights buffer keeps playing from room 1 through the hallway into room 2 and back: one source node,
// position keeps advancing (never reset), gain never drops. node test/room2_music.js
const { open } = require('./lib');
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open({ phone: true, w: 412, h: 915 }); const p = o.page; p.setDefaultTimeout(90000);
  await p.evaluate(() => { window.__start = Object.assign(window.__start || {}, { dismissed: true }); });
  await p.waitForFunction(() => window.__music.loaded || window.__music.err, null, { timeout: 90000 });
  const at = z => p.evaluate(z => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.monkey.position.set(0, 0, z); }, z);
  const M = () => p.evaluate(() => { const m = window.__music; return { t0: m.t0, pos: m.pos(), target: m.target, gain: m.gain, err: m.err }; });
  await p.evaluate(() => { if (window.__pa) window.__pa.playing = false; }); await at(4); await p.waitForTimeout(2500); const a = await M(); chk(a.target > 0.1 && !a.err, 'playing in room 1 (PA duck allowed) ' + JSON.stringify(a));
  let prev = a, minG = 1, steps = [];
  for (const z of [-13, -16, -20, -26, -30, -34, -26, -16, 4]) { await at(z); await p.waitForTimeout(900); const m = await M(); steps.push([z, +m.pos.toFixed(2), +m.gain.toFixed(2)]);
    if (m.t0 !== a.t0 || m.pos <= prev.pos) ok = ok && chk(false, 'position advanced at z=' + z + ' ' + JSON.stringify(m)); minG = Math.min(minG, m.target); prev = m; }
  chk(prev.t0 === a.t0, 'same source node the whole walk (t0 unchanged), position advancing ' + JSON.stringify(steps));
  chk(minG > 0.1, 'music never fades or stops in the hallway / room 2 (min target ' + minG + ', PA duck allowed)');
  chk(o.errors.length === 0, 'no page errors ' + o.errors.join('|')); await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
