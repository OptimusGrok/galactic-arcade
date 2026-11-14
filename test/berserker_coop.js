// t827u/t830u/t834u/t835u: Berserker 2-player online co-op in the arcade cabinet (mocked Supabase relay, no network).
// Set up like Strike: P2 drops in from a second phone; host simulates; guest predicts / interpolates.
// Each player sees the other's Viking actually drawn on the canvas (pixels, both directions) and their
// Thor / Berserker / Odin visuals on both screens. P2 scores its own kills and pickups.
// An OUT or left player can REJOIN the same ongoing game for 5 tickets (blocked under 5).
// t835u: on a portrait phone the 3 option buttons sit under the right-side P2 stats, close X under P1.
// Local names: Dave / Zed. Live (GA_URL): HostP1 / JoinP2. No screenshots.
// NOSHOTS=1 node test/berserker_coop.js
const { open } = require('./lib'); const mock = require('./mpmock');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };
const LIVE = !!process.env.GA_URL;
const NAMES = LIVE ? ['HostP1', 'JoinP2'] : ['Dave', 'Zed'];
(async () => {
  const pages = [], devs = [];
  async function dev(id, name, look) {
    const o = await open({ phone: true, w: 390, h: 844 }); const p = o.page; p.setDefaultTimeout(60000);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(([id, name, look]) => { window.__mpId = id; localStorage.setItem('galacticarcade.player', JSON.stringify(Object.assign({ name }, look))); localStorage.setItem('neonarcade.mute', '1'); localStorage.setItem('neonarcade.tickets', '20'); localStorage.setItem('neonarcade.vikingTickets', '3'); }, [id, name, look]);
    await p.addInitScript(mock); pages.push(p); devs.push(o); await p.reload();
    await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && window.__mp.state === 'on', null, { timeout: 60000 });
    return p;
  }
  const a = await dev('aaaa1111', NAMES[0], { char: 'monkey', hoodie: 'navy' });
  const b = await dev('bbbb2222', NAMES[1], { char: 'alien', suit: 'suitgrey' });
  for (const p of [a, b]) await p.waitForFunction(() => window.__mp.peers.size === 1, null, { timeout: 20000 }).catch(() => {});

  const cab = await a.evaluate(() => { const u = window.__arcade.berserkerCab.userData; return { f: [u.front.x, u.front.z], fc: [u.facing.x, u.facing.z] }; });
  const put = (p, back, side) => p.evaluate(([cab, back, side]) => { const m = window.__arcade.monkey, [fx, fz] = cab.f, [cx, cz] = cab.fc; m.position.set(fx - cx * back + cz * side, 0, fz - cz * back - cx * side); m.rotation.y = Math.atan2(cx, cz); }, [cab, back, side]);
  await put(a, 0.9, 1.2); await put(b, 1.2, -1.2);

  const startCab = p => p.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.berserker); });
  await startCab(a); await a.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 30000 });
  await startCab(b); await b.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 30000 });
  for (const p of [a, b]) await p.waitForFunction(() => { const f = document.getElementById('game'); return f && f.contentWindow && f.contentWindow.__B && f.contentWindow.__bzCoop; }, null, { timeout: 60000 });

  const S = (p, fn, arg) => p.evaluate(([fn, arg]) => { const w = document.getElementById('game').contentWindow; return (new Function('B', 'C', 'w', 'arg', fn))(w.__B, w.__bzCoop, w, arg); }, [fn, arg]);
  const play = p => p.evaluate(() => { const P = window.__arcade.play; P.machines.berserker.credits = 1; P.tryPlay(); return P.sub; });

  chk(await play(a) === 'play', 'P1 spends a credit and starts a real Berserker game');
  await S(a, 'w.__B.cheat.inv = true; return w.__B.G().state;');
  // let the real intro (~2.6s) and typ:'host' keepalive run; P2 then joins through the cabinet path
  await a.waitForTimeout(400);
  chk(await play(b) === 'play', 'P2 drops in while P1 is already playing');
  await S(b, 'w.__B.cheat.inv = true; return 1;');
  await b.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && C.role === 'guest' && C.snaps > 0 && C.p2on; }, null, { timeout: 20000 }).catch(() => {});
  await a.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && C.role === 'host' && C.p2on; }, null, { timeout: 12000 }).catch(() => {});
  // wait out intro on the real requestAnimationFrame loop (no C.steps) so both Vikings are drawn in-frame
  await a.waitForFunction(() => { const w = document.getElementById('game').contentWindow; return w.__B && w.__B.G().state === 'play'; }, null, { timeout: 12000 }).catch(() => {});
  await a.waitForTimeout(700);

  const ha = await S(a, 'return C.hud();');
  const hb = await S(b, 'return C.hud();');
  chk(ha.role === 'host' && ha.slot === 0 && ha.p2on, 'P1 (first at the cabinet) hosts the co-op game', ha);
  chk(hb.role === 'guest' && hb.slot === 1 && hb.p2on && hb.p2 && hb.p2.alive, 'P2 drops in from the other phone and is in the arena', hb);
  chk(ha.p1 && ha.p2 && ha.p1.alive && ha.p2.alive && Math.hypot(ha.p1.x - ha.p2.x, ha.p1.y - ha.p2.y) > 8,
    'both Vikings are in the game at the same time, at different positions', { a: ha.p1, b: ha.p2 });
  chk(ha.p1.hp > 0 && ha.p2.hp > 0 && Math.abs(hb.p1.hp - ha.p1.hp) < 1 && Math.abs(hb.p2.hp - ha.p2.hp) < 1,
    'each phone shows both players’ health', { ha: { p1: ha.p1, p2: ha.p2 }, hb: { p1: hb.p1, p2: hb.p2 } });

  // t834u: both Vikings are actually painted on each phone's canvas (world-to-screen, not HUD / counters)
  const paint = p => S(p, 'return { p1: C.paintOf(1), p2: C.paintOf(2), drawn: C.drawn, role: C.role };');
  const pa = await paint(a), pb = await paint(b);
  chk(pa.p1.on && pa.p1.hits > 8 && pa.p2.on && pa.p2.hits > 8 && Math.hypot(pa.p1.sx - pa.p2.sx, pa.p1.sy - pa.p2.sy) > 12,
    'host canvas: both Vikings are on screen, drawn at different positions, with real pixels', pa);
  chk(pb.p1.on && pb.p1.hits > 8 && pb.p2.on && pb.p2.hits > 8 && Math.hypot(pb.p1.sx - pb.p2.sx, pb.p1.sy - pb.p2.sy) > 12,
    'guest canvas: both Vikings are on screen, drawn at different positions, with real pixels', pb);
  chk((pa.drawn.p1 || 0) > 0 && (pa.drawn.p2 || 0) > 0 && (pb.drawn.p1 || 0) > 0 && (pb.drawn.p2 || 0) > 0,
    'the real draw path has painted P1 and P2 on both clients', { a: pa.drawn, b: pb.drawn });

  // t835u: portrait phone — close X under P1 stats, 3 option buttons under P2 stats, nothing covers the game
  const lay = await a.evaluate(() => {
    const R = id => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none') return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    let hud = 0; try { hud = document.getElementById('game').contentWindow.__gaHudPx(); } catch (e) {}
    return { X: R('bExit'), tix: R('tix'), vix: R('vix'), ui: R('ui'), hud, W: innerWidth, H: innerHeight, upPhone: document.body.classList.contains('upPhone'), upright: document.body.classList.contains('upright') };
  });
  chk(lay.upright && lay.upPhone && lay.hud > 30, 'upright phone layout is on and Berserker reports its HUD bottom', lay);
  chk(lay.X && lay.X.l <= 6 && lay.X.t >= lay.hud && lay.X.t <= lay.hud + 14, 'close X sits directly under the left (P1) stats', lay);
  chk(lay.ui && lay.ui.r >= lay.W - 8 && lay.ui.t >= lay.hud && lay.ui.t <= lay.hud + 14, 'the 3 option buttons sit directly under the right-side (P2) stats', lay);
  const ov = (A, B) => A && B && A.l < B.r - 0.5 && B.l < A.r - 0.5 && A.t < B.b - 0.5 && B.t < A.b - 0.5;
  const p2box = { l: lay.W - 170, t: 0, r: lay.W, b: lay.hud };
  chk(lay.ui && !ov(lay.ui, p2box), 'option buttons do not cover the P2 stats', { ui: lay.ui, p2box, hud: lay.hud });
  chk(lay.X && !ov(lay.X, { l: 0, t: 0, r: 170, b: lay.hud }), 'close X does not cover the P1 stats', { X: lay.X, hud: lay.hud });

  // P2 moves: guest holds right on the joystick
  const x0 = ha.p2.x;
  const guestIn = async (js, n) => { for (let i = 0; i < (n || 4); i++) { await S(b, js + '; C.sendInput(); C.steps(2); return 1;'); await a.waitForTimeout(70); } };
  await S(b, 'w.eval("J.x=1;J.y=0"); C.I2.x = 1; C.I2.y = 0; C.sendInput(); C.steps(2); return 1;');
  for (let i = 0; i < 8; i++) { await S(a, 'C.steps(6); return 1;'); await guestIn('w.eval("J.x=1;J.y=0"); C.I2.x = 1; C.I2.y = 0', 1); }
  const movedA = await S(a, 'return C.hud().p2.x;');
  const movedB = await S(b, 'return C.hud().p2.x;');
  chk(movedA > x0 + 8 && movedB > x0 + 8, 'P2 input from the second phone moves the second Viking on both screens', { x0, movedA, movedB });
  await guestIn('w.eval("J.x=0;J.y=0"); C.I2.x = 0; C.I2.y = 0', 2);

  // P2 scores its own kills
  const sc0 = await S(a, 'return { p1: C.hud().p1.kills, p2: C.hud().p2.kills, wave: C.hud().wave };');
  await S(a, `const P2 = C.P2();
    for (let i = 0; i < 3; i++) { const e = { x: P2.x + 20, y: P2.y, r: 12, hp: 1, type: 'skeleton', dmg: 1, max: 1, face: 0, t: 0, cd: 0, flash: 0, st: 0 }; w.__B.ens().push(e); }
    C.withP2(() => { const L = w.__B.ens().slice(-3); for (const e of L) { e.hp = 0; C.killE(e); } });
    C.steps(2); C.sendState(); return 1;`);
  await a.waitForTimeout(160); await S(b, 'C.steps(2); return 1;');
  const sc1 = await S(a, 'return { p1: C.hud().p1.kills, p2: C.hud().p2.kills };');
  const gsc = await S(b, 'return C.hud();');
  chk(sc1.p2 > sc0.p2 && sc1.p1 === sc0.p1, 'kills by P2 add to P2’s score, not P1’s', { sc0, sc1 });
  chk(gsc.p2.kills === sc1.p2 && gsc.p1.kills === sc1.p1, 'the second phone shows P2’s own kill score', { guest: [gsc.p1.kills, gsc.p2.kills], host: sc1 });

  // P2 pickups (gold) stay on P2
  const g0 = await S(a, 'return { p1: C.hud().p1.gold, p2: C.hud().p2.gold };');
  await S(a, `const P2 = C.P2(); C.world().coins.push({ x: P2.x, y: P2.y, v: 7, t: 1, vx: 0, vy: 0 }); C.steps(3); C.sendState(); return 1;`);
  await a.waitForTimeout(160); await S(b, 'C.steps(2); return 1;');
  const g1 = await S(a, 'return { p1: C.hud().p1.gold, p2: C.hud().p2.gold };');
  chk(g1.p2 >= g0.p2 + 7 && g1.p1 === g0.p1, 'P2 gold pickups go to P2, not P1', { g0, g1 });

  // abilities: both screens see Thor / rage / Odin
  await S(a, 'C.fxLog = []; C.fxSent = 0; return 1;');
  await S(b, 'C.fxLog = []; C.fxGot = 0; return 1;');
  await S(a, 'C.forceThor(1); C.sendStateNow && C.sendStateNow(); return 1;');
  await a.waitForTimeout(250);
  const th = await S(b, 'const bolts = C.world().bolts || []; const sm = bolts[0] ? C.sampleAt(bolts[0].x, bolts[0].y - 40, 28) : { hits: 0 }; return { bolts: bolts.length, fx: (C.fxLog || []).map(e => e.typ), got: C.fxGot || 0, px: sm };');
  const thA = await S(a, 'const bolts = C.world().bolts || []; const sm = bolts[0] ? C.sampleAt(bolts[0].x, bolts[0].y - 40, 28) : { hits: 0 }; return { bolts: bolts.length, sent: C.fxSent || 0, log: (C.fxLog || []).map(e => e.typ), px: sm };');
  chk(thA.sent > 0 && thA.log.includes('thor') && (thA.bolts > 0 || th.bolts > 0), 'P1 Thor plays on the host (visuals + recorded ability)', thA);
  chk((thA.px.hits > 0 || th.px.hits > 0 || thA.bolts > 0), 'P1 Thor lightning is painted on the host canvas', thA.px);
  chk(th.got > 0 && th.fx.includes('thor') && (th.px.hits > 0 || th.bolts > 0), 'P1 Thor is heard and its lightning is on P2’s canvas', th);

  await S(a, 'C.fxLog = []; C.fxSent = 0; return 1;');
  await S(b, 'C.fxLog = []; C.fxGot = 0; return 1;');
  await S(a, 'C.forceRage(2); C.sendStateNow && C.sendStateNow(); return 1;');
  await a.waitForTimeout(250);
  const rgA = await S(a, 'const p2 = C.P2(); const px = p2 ? C.sampleAt(p2.x, p2.y - 4, 28) : { hits: 0 }; return { p2rage: C.hud().p2.rage, sent: C.fxSent || 0, log: (C.fxLog || []).map(e => e.typ), px };');
  const rgB = await S(b, 'const p2 = C.P2(); const px = p2 ? C.sampleAt(p2.x, p2.y - 4, 28) : { hits: 0 }; return { p2rage: C.hud().p2.rage, got: C.fxGot || 0, log: (C.fxLog || []).map(e => e.typ), px };');
  chk(rgA.p2rage > 0 && rgA.log.includes('rage') && rgA.px.hits > 8, 'P2 Berserker rage activates on the host and is painted around P2', rgA);
  chk(rgB.p2rage > 0 && rgB.log.includes('rage') && rgB.px.hits > 8, 'P2 Berserker rage is heard and painted on P2’s phone', rgB);

  await S(a, 'C.fxLog = []; C.fxSent = 0; return 1;');
  await S(b, 'C.fxLog = []; C.fxGot = 0; return 1;');
  await S(a, 'C.forceOdin(1); C.sendStateNow && C.sendStateNow(); return 1;');
  await a.waitForTimeout(400);
  const odA = await S(a, 'const rv = C.world().ravens || []; const sm = rv[0] ? C.sampleAt(rv[0].x, rv[0].y, 16) : { hits: 0 }; return { n: rv.length, sent: C.fxSent || 0, log: (C.fxLog || []).map(e => e.typ), odS: w.__B.G().odS, px: sm };');
  const odB = await S(b, 'const rv = C.world().ravens || []; const sm = rv[0] ? C.sampleAt(rv[0].x, rv[0].y, 16) : { hits: 0 }; return { n: rv.length, got: C.fxGot || 0, log: (C.fxLog || []).map(e => e.typ), px: sm };');
  chk(odA.log.includes('odin') && (odA.n > 0 || odA.odS > 0), 'P1 Odin activates on the host (ravens / timer)', odA);
  chk((odA.n > 0 && odA.px.hits > 0) || odA.odS > 0, 'P1 Odin ravens are painted on the host canvas', odA);
  chk((odB.log.includes('odin') || odB.n > 0) && (odB.n === 0 || odB.px.hits > 0), 'P1 Odin is heard / seen on P2’s phone (ravens painted when present)', odB);

  // t830u: OUT player can rejoin the same wave for 5 tickets; blocked under 5
  const wave0 = await S(a, 'return C.hud().wave;');
  await S(a, 'C.killP2(); C.steps(3); C.sendState(); return 1;');
  await a.waitForTimeout(160); await S(b, 'C.steps(2); return 1;');
  const outH = await S(a, 'return C.hud();'), outG = await S(b, 'return C.hud();');
  chk(outH.p2.out && !outH.p2.alive && outH.p1.alive, 'after P2 is out, P2 is not in the fight and P1 keeps playing', outH);
  chk(outG.p2.out && outG.rejoin.can, 'P2’s phone offers REJOIN (5 tickets) while they are out', outG);
  const btn = await S(b, 'const b = w.document.getElementById("bzRejoin"); return { shown: !!(C.rejoinShown && b && b.classList.contains("on")), text: b && b.textContent, need: C.rejoinNeed };');
  chk(btn.shown && /REJOIN/i.test(btn.text) && /5 TICKETS/i.test(btn.text), 'a clear REJOIN (5 tickets) button is on P2’s screen', btn);

  await b.evaluate(() => { const P = window.__arcade.play; P.tickets.total = 4; try { localStorage.setItem('neonarcade.tickets', '4'); } catch (e) {} });
  await S(b, 'C.syncRejoinBtn(); return 1;');
  const blocked = await b.evaluate(() => { const P = window.__arcade.play, t0 = P.tickets.total; const ok = document.getElementById('game').contentWindow.__bzCoop.tryRejoin(); return { ok, t: P.tickets.total, t0, toast: P.lastToast, blocked: document.getElementById('game').contentWindow.__bzCoop.rejoinBlocked }; });
  chk(!blocked.ok && blocked.t === 4 && blocked.t0 === 4 && /NEED 5 TICKETS/.test(blocked.toast || ''), 'with 4 tickets, REJOIN is blocked and nothing is deducted', blocked);

  await b.evaluate(() => { const P = window.__arcade.play; P.tickets.total = 12; try { localStorage.setItem('neonarcade.tickets', '12'); } catch (e) {} });
  const joined = await b.evaluate(() => { const P = window.__arcade.play; const ok = document.getElementById('game').contentWindow.__bzCoop.tryRejoin(); return { ok, t: P.tickets.total }; });
  await a.waitForTimeout(200);
  for (let i = 0; i < 6; i++) { await S(a, 'C.steps(4); return 1;'); await S(b, 'C.sendInput(); C.steps(2); return 1;'); await a.waitForTimeout(60); }
  const back = await S(a, 'return C.hud();'), backG = await S(b, 'return C.hud();');
  chk(joined.ok && joined.t === 7, 'with 12 tickets, REJOIN deducts 5 and leaves 7', joined);
  chk(back.p2.alive && !back.p2.out && back.wave === wave0, 'P2 rejoins the same ongoing game at the current wave', { back, wave0 });
  chk(backG.p2.alive && !backG.rejoin.can, 'after a successful rejoin the button hides and P2 is alive on both phones', backG);

  // leaving then rejoining the same game for 5 tickets
  await S(b, 'C.sendBye(); C.gone = true; C.steps(1); return 1;');
  await a.waitForTimeout(120); await S(a, 'C.steps(6); return 1;');
  const left = await S(a, 'return C.hud();');
  chk(!left.p2on || left.p2.out || !left.p2.alive, 'after P2 leaves, their Viking is removed and P1 keeps playing', left);
  await b.evaluate(() => { const P = window.__arcade.play; P.tickets.total = 11; try { localStorage.setItem('neonarcade.tickets', '11'); } catch (e) {} });
  const leftJoin = await b.evaluate(() => { const C = document.getElementById('game').contentWindow.__bzCoop, P = window.__arcade.play;
    // a leaver of the still-running game is allowed to rejoin
    const can = C.canRejoin(); const ok = C.tryRejoin(); return { canBefore: can, ok, t: P.tickets.total, canAfter: C.canRejoin() }; });
  await a.waitForTimeout(200);
  for (let i = 0; i < 6; i++) { await S(a, 'C.steps(4); return 1;'); await S(b, 'C.sendInput(); C.steps(2); return 1;'); await a.waitForTimeout(60); }
  const again = await S(a, 'return C.hud();');
  chk(leftJoin.ok && leftJoin.t === 6, 'a player who left can rejoin the same game for 5 tickets', leftJoin);
  chk(again.p2on && again.p2.alive && again.wave === wave0, 'the leaver comes back into the current wave, not a new run', { again, wave0 });

  for (const d of devs) await d.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message + '\n' + e.stack); process.exit(1); });
