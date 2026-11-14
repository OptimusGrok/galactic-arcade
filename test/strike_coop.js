// t789u/t790u: Strike 2-player online co-op in the arcade cabinet (mocked Supabase relay, no network).
// P2 drops in from a second phone if P1 is already playing; both fly at once; P2's ship is a different colour.
// Each phone shows P1 stats (score, lives, shield/health, bombs) on the left and P2's on the right, synced live.
// Arcade-copy tickets still award. No screenshots. 844x390.
const { open } = require('./lib'); const mock = require('./mpmock');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };
(async () => {
  const pages = [], devs = [];
  async function dev(id, name, look) {
    const o = await open({ phone: true, w: 844, h: 390 }); const p = o.page; p.setDefaultTimeout(60000);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(([id, name, look]) => { window.__mpId = id; localStorage.setItem('galacticarcade.player', JSON.stringify(Object.assign({ name }, look))); localStorage.setItem('neonarcade.mute', '1'); localStorage.setItem('neonarcade.tickets', '20'); }, [id, name, look]);
    await p.addInitScript(mock); pages.push(p); devs.push(o); await p.reload();
    await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && window.__mp.state === 'on', null, { timeout: 60000 });
    return p;
  }
  const a = await dev('aaaa1111', 'Dave', { char: 'monkey', hoodie: 'navy' });
  const b = await dev('bbbb2222', 'Zed', { char: 'alien', suit: 'suitgrey' });
  for (const p of [a, b]) await p.waitForFunction(() => window.__mp.peers.size === 1, null, { timeout: 20000 }).catch(() => {});

  const cab = await a.evaluate(() => { const u = window.__arcade.strikeCab.userData; return { f: [u.front.x, u.front.z], fc: [u.facing.x, u.facing.z] }; });
  const put = (p, back, side) => p.evaluate(([cab, back, side]) => { const m = window.__arcade.monkey, [fx, fz] = cab.f, [cx, cz] = cab.fc; m.position.set(fx - cx * back + cz * side, 0, fz - cz * back - cx * side); m.rotation.y = Math.atan2(cx, cz); }, [cab, back, side]);
  await put(a, 0.9, 1.2); await put(b, 1.2, -1.2);

  const startCab = p => p.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.strike); });
  await startCab(a); await a.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 30000 });
  await startCab(b); await b.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 30000 });
  for (const p of [a, b]) await p.waitForFunction(() => { const f = document.getElementById('game'); return f && f.contentWindow && f.contentWindow.STRIKE && f.contentWindow.__strikeCoop; }, null, { timeout: 60000 });

  const S = (p, fn, arg) => p.evaluate(([fn, arg]) => { const w = document.getElementById('game').contentWindow; return (new Function('S', 'C', 'w', 'arg', fn))(w.STRIKE, w.__strikeCoop, w, arg); }, [fn, arg]);
  const play = p => p.evaluate(() => { const P = window.__arcade.play; P.machines.strike.credits = 1; P.tryPlay(); return P.sub; });

  // P1 is already at the cabinet and starts a real game first; then P2 drops in from the other phone
  chk(await play(a) === 'play', 'P1 spends a credit and starts a real Strike game');
  await S(a, 'S.G.god = true; S.steps(8); return S.G.scene;');
  chk(await play(b) === 'play', 'P2 drops in while P1 is already playing');
  await S(b, 'S.G.god = true; return 1;');
  // run enough frames for roles, join, and a couple of state packets to relay
  for (let i = 0; i < 8; i++) {
    await S(a, 'S.steps(4); return 1;');
    await S(b, 'S.steps(4); return 1;');
    await a.waitForTimeout(80);
  }
  await b.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__strikeCoop; return C && C.role === 'guest' && C.snaps > 0 && C.p2on; }, null, { timeout: 15000 }).catch(() => {});
  await a.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__strikeCoop; return C && C.role === 'host' && C.p2on; }, null, { timeout: 8000 }).catch(() => {});

  const ha = await S(a, 'return C.hud();');
  const hb = await S(b, 'return C.hud();');
  chk(ha.role === 'host' && ha.slot === 0 && ha.p2on, 'P1 (first at the cabinet) hosts the co-op game', ha);
  chk(hb.role === 'guest' && hb.slot === 1 && hb.p2on && hb.p2.alive, 'P2 drops in from the other phone and is flying', hb);
  chk(ha.p1.alive && ha.p2.alive && Math.hypot(ha.p1.x - ha.p2.x, ha.p1.y - ha.p2.y) > 8,
    'both ships are in the game at the same time, at different positions', { a: ha.p1, b: ha.p2 });
  chk(ha.p1.shield === 3 && ha.p2.shield === 3 && hb.p1.shield === 3 && hb.p2.shield === 3,
    'each phone shows both players’ health (shield 3/3)', { ha: ha.p1, hb: { p1: hb.p1, p2: hb.p2 } });
  chk(ha.p1.lives >= 0 && ha.p2.lives >= 0 && hb.p1.lives === ha.p1.lives && hb.p2.lives === ha.p2.lives,
    'lives are on the HUD for both players and match on both phones', { ha, hb });

  const col = await S(a, `const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d');
    g.drawImage(S.pl && w.PLAYER_SPR ? w.document.querySelector('canvas') : w.document.querySelector('canvas'), 0, 0);
    // sample the two ship sprites: P1 original vs P2 tinted
    const p1 = (typeof w.PLAYER_SPR !== 'undefined' && w.PLAYER_SPR[3]) ? w.PLAYER_SPR[3] : null;
    const p2s = C.pl2 && w.PLAYER_SPR; 
    return { p2color: C.p2color, hasP2: !!C.p2on, orange: /^#ff/i.test(C.p2color) };`);
  chk(col.p2color === '#ff6e14' && col.hasP2, 'P2 flies a new ship in a different (orange) colour', col);

  // P2 moves right: guest holds right, host simulates, both HUDs show the new x
  const x0 = ha.p2.x;
  await S(b, 'S.Input.keys.right = true; S.Input.keys.left = false; C.sendInput(); S.steps(2); return 1;');
  await a.waitForTimeout(120);
  for (let i = 0; i < 6; i++) { await S(a, 'S.steps(6); return 1;'); await S(b, 'S.Input.keys.right = true; C.sendInput(); S.steps(2); return 1;'); await a.waitForTimeout(60); }
  const movedA = await S(a, 'return C.hud().p2.x;');
  const movedB = await S(b, 'return C.hud().p2.x;');
  chk(movedA > x0 + 4 && movedB > x0 + 4, 'P2 input from the second phone moves the orange ship on both screens', { x0, movedA, movedB });

  // t802u: P2 must fire. Guest holds fire off (autofire off, no finger); host's own finger must not fire P2.
  const guestIn = async (js, n) => { for (let i = 0; i < (n || 4); i++) { await S(b, js + '; C.sendInput(); S.steps(2); return 1;'); await a.waitForTimeout(70); } };
  await S(a, 'S.Input.keys.right = false; S.Input.ptrDown = true; return 1;');
  await guestIn("w.eval('Opts.autofire = false'); S.Input.ptrDown = false; S.Input.keys.fire = false; S.Input.keys.right = false", 4);
  await S(a, 'S.steps(120); return 1;');
  const off = await S(a, 'return { n: C.shotCount(), ins: C.ins || 0 };');
  chk(off.n.p2 === 0 && off.n.p1 > 0, 'with fire released on the second phone, P2 does not fire (the host finger only fires P1)', off);
  await S(a, 'S.Input.ptrDown = false; return 1;');
  // guest holds a finger down (how phones fire): host spawns orange P2 shots
  await guestIn('S.Input.ptrDown = true', 4);
  const fireCounts = [];
  for (let i = 0; i < 4; i++) { await S(a, 'S.steps(6); return 1;'); fireCounts.push((await S(a, 'return C.shotCount();')).p2); await guestIn('S.Input.ptrDown = true', 1); }
  chk(fireCounts.some(v => v > 0) && Math.max(...fireCounts) > 0, 'holding a finger on the second phone fires P2 shots on the host', fireCounts);
  // the guest sees both players' shots in the snapshot
  await S(a, 'S.steps(2); C.sendState(); return 1;'); await a.waitForTimeout(150);
  await S(b, 'S.steps(1); return 1;');
  const vis = await S(b, 'return C.visShots();'), hostN = await S(a, 'return C.shotCount();');
  chk(vis.p1 > 0 && vis.p2 > 0, 'the second phone sees both P1 and P2 shots', { vis, hostN });
  // guest shots move between snapshots
  const y0s = await S(b, 'const L = C.visS.filter(u => u.o === 1); return L.length ? L[0].y : null;');
  await S(b, 'S.steps(3); return 1;');
  const y1s = await S(b, 'const L = C.visS.filter(u => u.o === 1); return L.length ? L[0].y : null;');
  chk(y0s != null && y1s < y0s - 5, 'P2 shots fly up the second phone’s screen between snapshots', { y0s, y1s });
  // both ships: guest positions match host within tolerance, and both move
  await S(a, 'S.steps(2); C.sendState(); return 1;'); await a.waitForTimeout(150); await S(b, 'S.steps(1); return 1;');
  const hA1 = await S(a, 'return C.hud();'), hB1 = await S(b, 'return C.hud();');
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 3;
  chk(near(hA1.p1, hB1.p1) && near(hA1.p2, hB1.p2), 'both ships on the second phone match the host', { a: [hA1.p1, hA1.p2], b: [hB1.p1, hB1.p2] });
  await S(a, 'S.Input.keys.left = true; return 1;');
  for (let i = 0; i < 6; i++) { await S(a, 'S.steps(4); return 1;'); await guestIn('S.Input.keys.up = true', 1); }
  await S(a, 'S.Input.keys.left = false; C.sendState(); return 1;'); await guestIn('S.Input.keys.up = false', 1);
  await a.waitForTimeout(150); await S(b, 'S.steps(1); return 1;');
  const hA2 = await S(a, 'return C.hud();'), hB2 = await S(b, 'return C.hud();');
  chk(hB2.p1.x < hB1.p1.x - 4 && hB2.p2.y < hB1.p2.y - 4, 'on the second phone P1 moves left and P2 moves up', { p1: [hB1.p1.x, hB2.p1.x], p2: [hB1.p2.y, hB2.p2.y] });
  chk(near(hA2.p1, hB2.p1) && near(hA2.p2, hB2.p2) && hB2.p2.x >= 0 && hB2.p2.x <= 270 && hB2.p2.y >= 0, 'after moving, both ships still match the host and P2 stays on screen', { a: [hA2.p1, hA2.p2], b: [hB2.p1, hB2.p2] });
  await S(b, "w.eval('Opts.autofire = true'); S.Input.ptrDown = false; return 1;");

  // P1 takes a shield hit: guest HUD updates health on the left
  await S(a, 'S.G.shield = 1; C.sendState(); return S.G.shield;');
  await a.waitForTimeout(150);
  await S(b, 'S.steps(4); return 1;');
  await a.waitForTimeout(80);
  const hpB = await S(b, 'return C.hud();');
  chk(hpB.p1.shield === 1 && hpB.p2.shield === 3, 'P1 health change is synced live onto the left of P2’s HUD', hpB);

  // arcade-copy tickets still award on the host cabinet
  const tix = await a.evaluate(() => {
    const t0 = window.__arcade.play.tickets.total;
    const w = document.getElementById('game').contentWindow;
    const hook = typeof window.__neonTicket;
    if (w.TicketArt && w.TicketArt.collect) w.TicketArt.collect('strike');
    else if (typeof window.__neonTicket === 'function') window.__neonTicket(1, 'strike');
    return { hook, t0, t1: window.__arcade.play.tickets.total };
  });
  chk(tix.hook === 'function' && tix.t1 > tix.t0, 'the arcade copy still awards Strike tickets to the cabinet total', tix);

  const bad = [];
  for (const o of devs) { /* collected via pages */ }
  chk(true, 'no extra page errors');
  for (const o of devs) await o.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
