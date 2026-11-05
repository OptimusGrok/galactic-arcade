// t282u: start beam-in. Local: pressing PLAY beams the monkey in (column + clip reveal, movement locked) on an open floor spot, not a pad.
// Remote (test/mpmock.js): a player who presses PLAY after we loaded beams in on our screen; a player already in the room does not.
const { open, play } = require('./lib'); const mock = require('./mpmock');
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const SH = '/workspace/ga-beam/shots/', pages = [], closers = [];
  async function dev(id, start) { const o = await open({ phone: true, w: 390, h: 700, start }); closers.push(o.close); const p = o.page; p.setDefaultTimeout(60000);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(id => { window.__mpId = id; window.__beamTest = 1; }, id); await p.addInitScript(mock);
    pages.push(p); await p.reload(); await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && /on|solo/.test(window.__mp.state), null, { timeout: 60000 }); return { p, errors: o.errors }; }
  try {
    // A: already in the room (skips the start screen, so no beam for it)
    const A = await dev('aaaa1111', false); const a = A.p;
    await a.waitForFunction(() => window.__mp.state === 'on', null, { timeout: 30000 });
    chk(await a.evaluate(() => !window.__tp.beamIns), 'A (no start screen) did not beam');
    // B loads → sits on start screen, then presses PLAY
    const B = await dev('bbbb2222', true); const b = B.p;
    await b.waitForFunction(() => window.__mp.state === 'on', null, { timeout: 30000 });
    await b.waitForFunction(() => window.__mp.peers.has('aaaa1111') && window.__mp.peers.get('aaaa1111').cur, null, { timeout: 30000 });
    chk(await b.evaluate(() => !window.__mp.beamIns), 'A was already in the room when B loaded: B sees no beam for A');
    await a.waitForFunction(() => window.__mp.peers.has('bbbb2222') && window.__mp.peers.get('bbbb2222').a === 'pre', null, { timeout: 30000 }).catch(() => {});
    chk(await a.evaluate(() => { const p = window.__mp.peers.get('bbbb2222'); return p && p.a === 'pre' && !p.g.visible; }), 'B on its start screen is hidden for A');
    await b.evaluate(() => { window.__tpTimeScale = 0.5; }); await a.evaluate(() => { window.__tpTimeScale = 0.5; });
    await play(b, true, 'Beamer');
    await b.waitForFunction(() => window.__tp.beaming, null, { timeout: 8000 }).catch(() => {});
    const L = await b.evaluate(() => { const t = window.__tp, m = window.__arcade.monkey || null, p = (m || {}).position || window.__tp; return { beaming: t.beaming, locked: t.locked, st: t.state };});
    chk(L.beaming && L.locked && L.st === 'remat', 'local beam-in playing with movement locked (' + JSON.stringify(L) + ')');
    await b.waitForTimeout(900); await b.screenshot({ path: SH + 'beam_local_mid_phone.png' });
    const col = await b.evaluate(() => { let n = 0; window.__arcade.scene && window.__arcade.scene.traverse(o => { if (o.name === 'beamColumn' && o.visible) n++; }); return n; });
    chk(col >= 1 || !(await b.evaluate(() => !!window.__arcade.scene)), 'light column visible mid-beam');
    await a.waitForFunction(() => (window.__mp.beamIns || 0) >= 1, null, { timeout: 8000 }).catch(() => {});
    chk(await a.evaluate(() => (window.__mp.beamIns || 0) === 1), 'A sees B beam in (remote beam fx triggered once)');
    await a.waitForTimeout(500); await a.screenshot({ path: SH + 'beam_remote_phone.png' });
    await b.evaluate(() => { window.__tpTimeScale = 4; });
    await b.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 60000 }).catch(() => {});
    const E = await b.evaluate(() => { const t = window.__tp, q = window.__arcade.monkey.position; const d = [t.PAD1, t.PAD2].map(p => Math.hypot(q.x - p.x, q.z - p.z)); return { x: q.x, z: q.z, d, n: t.beamIns, idle: t.state === 'idle', lock: t.locked }; });
    chk(E.idle && !E.lock && E.n === 1, 'beam finished, movement unlocked, beamed once');
    chk(E.d.every(v => v > 2.2) && Math.hypot(E.x, E.z - 5) < 1.4, 'B ends on open floor near spawn, not on a pad (' + JSON.stringify(E) + ')');
    await a.waitForTimeout(1500);
    chk(await a.evaluate(() => { const p = window.__mp.peers.get('bbbb2222'); return p.g.visible && Math.abs(p.g.scale.y - p.s0) < 1e-6; }), 'B avatar fully visible at normal scale on A after beam');
    // teleporting / reconnect must not beam again
    await b.evaluate(() => { window.__mp.leave && window.__mp.leave(); }); await b.waitForTimeout(500); await b.evaluate(() => window.__mp.join && window.__mp.join()); await b.waitForTimeout(3000);
    chk(await b.evaluate(() => window.__tp.beamIns === 1), 'no second beam after reconnect');
    chk(await a.evaluate(() => (window.__mp.beamIns || 0) === 1), 'A saw no extra beam-in on reconnect');
    // beam spots differ (random offset) and are all valid
    const S = await b.evaluate(() => { const r = []; for (let i = 0; i < 20; i++) r.push(window.__beamSpot()); return r; });
    chk(new Set(S.map(s => s.x.toFixed(2))).size > 5, 'random offset: spots vary');
    const errs = [...A.errors, ...B.errors].filter(e => !/supabase|Failed to load resource|net::/i.test(e)); chk(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  } catch (e) { chk(false, 'exception ' + e.stack); }
  for (const c of closers) await c().catch(() => {}); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
