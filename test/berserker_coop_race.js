// t836u: Berserker co-op handshake that the instant mock test missed.
// Two separate contexts, mocked relay with 250 ms delay (real-network lag), late joiner has a
// lexicographically smaller id, joins after the first player is already in play (after intro).
// Also re-checks the handshake after a CONTINUE. This failed on v220: both phones became guests
// (first host yielded to the smaller typ:'host', joiner also became guest) and typ:'st' stopped.
// NOSHOTS=1 node test/berserker_coop_race.js
const { open } = require('./lib'); const mock = require('./mpmock');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 700) : '')); if (!c) ok = false; };
(async () => {
  const pages = [], devs = [];
  async function dev(id, name, look) {
    const o = await open({ phone: true, w: 390, h: 844 }); const p = o.page; p.setDefaultTimeout(60000);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(([id, name, look]) => {
      window.__mpId = id; window.__mpMockDelay = 250;
      localStorage.setItem('galacticarcade.player', JSON.stringify(Object.assign({ name }, look)));
      localStorage.setItem('neonarcade.mute', '1');
      localStorage.setItem('neonarcade.tickets', '20');
      localStorage.setItem('neonarcade.vikingTickets', '3');
    }, [id, name, look]);
    await p.addInitScript(mock); pages.push(p); devs.push(o); await p.reload();
    await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && window.__mp.state === 'on', null, { timeout: 60000 });
    return p;
  }
  // late joiner id 'aaaLate' < first id 'zzzFirst' — v220 demoted the first host on typ:'host'
  const first = await dev('zzzFirst', 'Dave', { char: 'monkey', hoodie: 'navy' });
  const late = await dev('aaaLate', 'Zed', { char: 'alien', suit: 'suitgrey' });
  for (const p of [first, late]) await p.waitForFunction(() => window.__mp.peers.size === 1, null, { timeout: 20000 }).catch(() => {});

  const startCab = async p => {
    await p.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.berserker); });
    await p.waitForFunction(() => {
      const P = window.__arcade.play, f = document.getElementById('game');
      return P && P.mode === 'game' && P.sub === 'demo' && f && f.classList.contains('on') && f.contentWindow && f.contentWindow.__B && f.contentWindow.__bzCoop;
    }, null, { timeout: 90000 });
  };
  const play = p => p.evaluate(() => { const P = window.__arcade.play; P.tickets.total = 20; P.machines.berserker.credits = 1; P.tryPlay(); return P.sub; });
  const net = p => p.evaluate(() => {
    const w = document.getElementById('game') && document.getElementById('game').contentWindow, C = w && w.__bzCoop, G = w && w.__B && w.__B.G && w.__B.G();
    const h = C && C.hud && C.hud();
    return { role: C && C.role, slot: C && C.slot, p2on: C && C.p2on, locked: C && C.locked, snaps: C && C.snaps, sent: C && C.sent, recv: C && C.recv, joins: C && C.joins, typ: C && C.typ, snapAge: C && C.snapAge, state: G && G.state, p1: h && h.p1, p2: h && h.p2 };
  });

  await startCab(first);
  chk(await play(first) === 'play', 'first phone starts a credited Berserker game');
  await first.evaluate(() => { try { document.getElementById('game').contentWindow.__B.cheat.inv = true; } catch (e) {} });
  await first.waitForFunction(() => { const w = document.getElementById('game').contentWindow; return w.__B && w.__B.G().state === 'play'; }, null, { timeout: 15000 }).catch(() => {});
  await first.waitForTimeout(1200);

  await startCab(late);
  chk(await play(late) === 'play', 'late phone (smaller id) joins after intro, through a delayed relay');
  await late.evaluate(() => { try { document.getElementById('game').contentWindow.__B.cheat.inv = true; } catch (e) {} });

  await first.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && C.role === 'host' && C.p2on; }, null, { timeout: 20000 }).catch(() => {});
  await late.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && C.role === 'guest' && C.snaps > 0; }, null, { timeout: 20000 }).catch(() => {});
  await first.waitForTimeout(1500);
  let a = await net(first), b = await net(late);
  console.log('race first', JSON.stringify(a).slice(0, 700));
  console.log('race late', JSON.stringify(b).slice(0, 700));
  chk(a.role === 'host' && b.role === 'guest', 'first starter stays host; late smaller-id phone is guest (not both guests)', { a: a.role, b: b.role, typA: a.typ, typB: b.typ });
  chk(a.p2on && a.p2 && a.p2.alive, 'host has P2 in the game', a);
  chk(b.p2on && b.snaps > 0 && b.p1 && b.p2, 'guest has typ st snapshots and both Vikings', b);

  // hold J on the host and require the guest snapshot to move P1
  const before = a.p1;
  await first.evaluate(() => {
    const w = document.getElementById('game').contentWindow, C = w.__bzCoop;
    const hold = () => { try { const J = C.world().J; J.x = 1; J.y = 0; } catch (e) {} };
    hold(); w.__holdJ = setInterval(hold, 16);
  });
  await first.waitForTimeout(1400);
  await first.evaluate(() => { const w = document.getElementById('game').contentWindow, C = w.__bzCoop; try { clearInterval(w.__holdJ); C.world().J.x = 0; C.world().J.y = 0; } catch (e) {} });
  await late.waitForTimeout(400);
  a = await net(first); b = await net(late);
  const hd = (a.p1 && before) ? Math.hypot((a.p1.x || 0) - (before.x || 0), (a.p1.y || 0) - (before.y || 0)) : 0;
  const gd = (b.p1 && before) ? Math.hypot((b.p1.x || 0) - (before.x || 0), (b.p1.y || 0) - (before.y || 0)) : 0;
  chk(hd > 8 && gd > 8, 'guest screen is not a frozen snapshot: P1 moved on both phones', { hd, gd, host: a.p1, guest: b.p1 });

  const forced = await first.evaluate(() => { const C = document.getElementById('game').contentWindow.__gaContinue; try { if (C && C.mark) C.mark(); return C && C.force && C.force(); } catch (e) { return String(e); } });
  await first.waitForTimeout(500);
  const shown = await first.waitForFunction(() => { const b = document.getElementById('bContinue'), p = window.__arcade.play; return p.sub === 'play' && b && b.classList.contains('on'); }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const used = shown ? await first.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 12; return p.tryContinue(); }) : false;
  await first.waitForTimeout(2000);
  a = await net(first); b = await net(late);
  console.log('race after CONTINUE', JSON.stringify({ forced, shown, used, a, b }).slice(0, 900));
  chk(forced === true && used === true, 'CONTINUE ran', { forced, shown, used });
  chk(a.role === 'host' && a.p2on && b.role === 'guest' && b.snaps > 0 && (b.snapAge == null || b.snapAge < 1500) && a.p1 && b.p1 && a.p1.lives === b.p1.lives,
    'after CONTINUE, one host, P2 on, guest has a fresh typ st of the new run', { a, b });

  for (const o of devs) { try { await o.close(); } catch (e) {} }
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message + '\n' + e.stack); process.exit(1); });
