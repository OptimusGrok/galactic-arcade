// t753u: CABINET PRESENCE + SHARED SKY TOWER CLIMB (3 devices, mocked Supabase realtime relay, no network), 844x390.
// - a player inside a machine still stands in front of it for others, solid (not ghosted), in Grok's playing pose
// - a 2nd player at the same machine: the 1st shifts left, both side by side; a 3rd device sees both; 2 is the max
// - one leaves: the other glides back to the centre
// - two players in SKY TOWER share the climb: see each other, both progress, race result, cosmetic shots, no PVP
// Screenshots only if CAB_SHOTS=dir.
const { open } = require('./lib'); const mock = require('./mpmock');
const SHOTS = process.env.CAB_SHOTS || '';
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 420) : '')); if (!c) ok = false; };
(async () => {
  const pages = [], devs = [];
  async function dev(id, name, look) { const o = await open({ phone: true, w: 844, h: 390 }); const p = o.page; p.setDefaultTimeout(60000);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(([id, name, look]) => { window.__mpId = id; localStorage.setItem('galacticarcade.player', JSON.stringify(Object.assign({ name }, look))); localStorage.setItem('neonarcade.mute', '1'); }, [id, name, look]);
    await p.addInitScript(mock); pages.push(p); devs.push(o); await p.reload();
    await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && window.__mp.state === 'on', null, { timeout: 60000 }); return p; }
  const a = await dev('aaaa1111', 'Dave', { char: 'monkey', hoodie: 'red', hat: 'none' });
  const b = await dev('bbbb2222', 'Zed', { char: 'alien', suit: 'suitgold', hat: 'none' });
  const c = await dev('cccc3333', 'Obs', { char: 'monkey', hat: 'none' });
  for (const p of [a, b, c]) await p.waitForFunction(() => window.__mp.peers.size === 2, null, { timeout: 20000 }).catch(() => {});
  const n = await Promise.all([a, b, c].map(p => p.evaluate(() => window.__mp.peers.size)));
  chk(n.every(v => v === 2), 'three devices see each other', n);
  // everyone walks over near SKY TOWER (C stands back to watch)
  const cab = await a.evaluate(() => { const u = window.__arcade.skyTowerCab.userData; return { f: [u.front.x, u.front.z], fc: [u.facing.x, u.facing.z] }; });
  const put = (p, back, side) => p.evaluate(([cab, back, side]) => { const m = window.__arcade.monkey, [fx, fz] = cab.f, [cx, cz] = cab.fc; m.position.set(fx - cx * back + cz * side, 0, fz - cz * back - cx * side); m.rotation.y = Math.atan2(cx, cz); }, [cab, back, side]);
  await put(a, 0.9, 1.6); await put(b, 1.2, -1.6); await put(c, 4.2, 0);
  await c.waitForTimeout(800);
  const startCab = p => p.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.skytower); });
  const inGame = p => p.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 30000 });
  const view = (p, pid) => p.evaluate(pid => { const M = window.__mp, q = M.peers.get(pid), g = q.g, u = g.userData; let op = 1; g.traverse(o => { if (o.isMesh && o.material && o.material.opacity < op) op = o.material.opacity; });
    return { a: q.a, vis: g.visible, op: q.ghost ? 0.45 : 1, x: +g.position.x.toFixed(2), z: +g.position.z.toFixed(2), r: +g.rotation.y.toFixed(2), lean: +g.rotation.x.toFixed(2), arm0: +u.arms[0].sh.rotation.x.toFixed(2), arm1: +u.arms[1].sh.rotation.x.toFixed(2), slot: q.slot ? { i: q.slot.i, n: q.slot.n } : null, kind: q.kind }; }, pid);
  const exp = (off) => { const [fx, fz] = cab.f, [cx, cz] = cab.fc; return { x: fx - cx * 0.42 + cz * off, z: fz - cz * 0.42 - cx * off, r: Math.atan2(cx, cz) }; };
  const near = (v, e, tol) => Math.hypot(v.x - e.x, v.z - e.z) < (tol || 0.06);
  // ---- A plays alone ----
  await startCab(a); await inGame(a);
  await c.waitForFunction(() => { const q = window.__mp.peers.get('aaaa1111'); return q && q.a === 'play:skytower' && q.slot; }, null, { timeout: 15000 }).catch(() => {});
  await c.waitForTimeout(1500);
  let va = await view(c, 'aaaa1111');
  chk(va.vis && va.op === 1 && va.a === 'play:skytower', 'a player inside SKY TOWER still stands in the room, solid (not ghosted)', va);
  chk(near(va, exp(0)) && Math.abs(va.r - exp(0).r) < 0.12 && va.slot && va.slot.n === 1, 'alone: centred in front of the machine, facing it', { va, want: exp(0) });
  chk(va.lean > 0.04 && va.arm0 < -0.9 && va.arm1 < -0.9, 'Grok-style playing pose (leaning in, both hands on the controls)', va);
  const wig = await c.evaluate(() => new Promise(res => { const q = window.__mp.peers.get('aaaa1111'), xs = []; const f = () => { xs.push(q.g.userData.arms[0].sh.rotation.x); if (xs.length < 30) requestAnimationFrame(f); else res(Math.max(...xs) - Math.min(...xs)); }; requestAnimationFrame(f); }));
  chk(wig > 0.03, 'hands move while playing (stick / buttons)', { wig });
  // ---- B joins the same machine ----
  await startCab(b); await inGame(b);
  await c.waitForFunction(() => { const q = window.__mp.peers.get('bbbb2222'); return q && q.slot && q.slot.n === 2; }, null, { timeout: 15000 }).catch(() => {});
  await c.waitForTimeout(1500);
  va = await view(c, 'aaaa1111'); let vb = await view(c, 'bbbb2222');
  const gap = Math.hypot(va.x - vb.x, va.z - vb.z);
  chk(near(va, exp(0.4)) && near(vb, exp(-0.4)) && va.slot.i === 0 && vb.slot.i === 1, 'second player: first shifts LEFT, second on the right, side by side', { va, vb, wantA: exp(0.4), wantB: exp(-0.4) });
  chk(Math.abs(gap - 0.8) < 0.08 && va.op === 1 && vb.op === 1 && vb.kind === 'alien' && vb.arm0 < -0.9 && va.arm0 < -0.9, 'observer sees both playing, equally spaced (' + gap.toFixed(2) + ' m), alien look kept', { gap, vb });
  const vba = await view(a, 'bbbb2222'), vab = await view(b, 'aaaa1111');
  chk(near(vba, exp(-0.4)) && near(vab, exp(0.4)), 'the two players agree on the slots too', { vba, vab });
  if (SHOTS) { await c.evaluate(() => { const A = window.__arcade; A.st.yaw = 0; }); await c.waitForTimeout(1200); await c.screenshot({ path: SHOTS + '/ga-room-two-at-skytower.png' }); }
  // ---- 2 max: a third can't start the same machine ----
  const full = await c.evaluate(() => ({ full: window.__mp.cabFull('skytower'), n: window.__mp.cabCount('skytower') }));
  const fb = await c.evaluate(() => { const P = window.__arcade.play, b0 = P.fullBlocked || 0; P.start(P.machines.skytower); return { blocked: (P.fullBlocked || 0) - b0, mode: P.mode, frame: !!document.getElementById('game') }; });
  chk(full.full && full.n === 2 && fb.blocked === 1 && fb.mode === 'walk' && !fb.frame, 'two is the max: a third player is told to wait and does not start', Object.assign(full, fb));
  await put(c, 4.2, 0);
  // ---- SKY TOWER shared climb ----
  const fr = p => p.evaluate(() => !!(document.getElementById('game') && document.getElementById('game').contentWindow.__skytower && document.getElementById('game').contentWindow.__skytower.ready));
  for (const p of [a, b]) await p.waitForFunction(() => { const f = document.getElementById('game'); return f && f.contentWindow.__skytower && f.contentWindow.__skytower.ready && f.contentWindow.__skytower.rivals; }, null, { timeout: 60000 });
  const sky = (p, fn, arg) => p.evaluate(([fn, arg]) => { const w = document.getElementById('game').contentWindow, A = w.__skytower; return (new Function('A', 'w', 'arg', fn))(A, w, arg); }, [fn, arg]);
  await sky(a, 'A.start(); A.G.wind.next = 9999; return 1;'); await sky(b, 'A.start(); A.G.wind.next = 9999; return 1;');
  for (const p of [a, b]) await p.waitForFunction(() => document.getElementById('game').contentWindow.__skytower.rivals.avatars.size === 1, null, { timeout: 15000 }).catch(() => {});
  const seeA = await sky(a, 'const R = A.rivals, g = [...R.avatars.values()][0]; return g ? { n: R.avatars.size, char: g.g.userData.char, vis: g.g.visible, tag: !!g.g.getObjectByName("rivalTag"), chip: w.document.getElementById("rivalChip").textContent, chipOn: w.document.getElementById("rivalChip").style.display } : { n: 0 };');
  const seeB = await sky(b, 'const R = A.rivals, g = [...R.avatars.values()][0]; return g ? { n: R.avatars.size, char: g.g.userData.char, vis: g.g.visible, tag: !!g.g.getObjectByName("rivalTag"), chip: w.document.getElementById("rivalChip").textContent } : { n: 0 };');
  chk(seeA.n === 1 && seeA.char === 'alien' && seeA.vis && seeA.tag && seeB.n === 1 && seeB.char === 'monkey', 'both climbers see each other in the tower (monkey sees the alien, alien sees the monkey), name tag', { seeA, seeB });
  chk(/RACE · YOU 1\/20/.test(seeA.chip) && /Zed 1\/20/.test(seeA.chip) && seeA.chipOn === 'block', 'race chip shows both platform numbers', seeA);
  const same = await Promise.all([a, b].map(p => sky(p, 'const o = []; for (let i = 1; i <= A.N; i++) { const f = A.offsetOf(i); o.push(f.x.toFixed(2) + "," + f.z.toFixed(2) + "," + A.yOf(i).toFixed(2)); } return o.join(";");')));
  chk(same[0] === same[1] && same[0].length > 100, 'same tower layout on both devices (fair race)');
  // A climbs to 12: B sees it
  await sky(a, 'A.placeOn(12); for (let i = 0; i < 20; i++) A.step(1 / 30); return 1;');
  await b.waitForFunction(() => { const R = document.getElementById('game').contentWindow.__skytower.rivals; return R.rivals[0] && R.rivals[0].s.p === 12; }, null, { timeout: 10000 }).catch(() => {});
  await b.waitForTimeout(600);
  const prog = await sky(b, 'const R = A.rivals, r = R.rivals[0], g = [...R.avatars.values()][0]; const pa = A.yOf(12); return { p: r && r.s.p, y: +g.g.position.y.toFixed(1), top12: +pa.toFixed(1), chip: w.document.getElementById("rivalChip").textContent, myP: A.platform };');
  chk(prog.p === 12 && Math.abs(prog.y - prog.top12) < 6 && /Dave 12\/20 ▲/.test(prog.chip) && prog.myP === 1, 'B sees A up at platform 12 (rival avatar there, chip ▲)', prog);
  // ---- t754u: a watcher in the room sees the LIVE shared climb on the Sky Tower cabinet screen (not the attract) ----
  await c.evaluate(() => { window.__forceDemo = true; });
  await c.waitForFunction(() => { const L = window.__arcade.play.machines.skytower.cab.userData.live; return L && L.on && L.names.length === 2 && L.pads > 0; }, null, { timeout: 15000 }).catch(() => {});
  const lv = await c.evaluate(() => { const L = window.__arcade.play.machines.skytower.cab.userData.live; return { on: L.on, names: L.names, focus: L.focus, pads: L.pads, titan: L.titan, frames: L.frames }; });
  chk(lv.on && lv.names.join() === 'Dave,Zed' && lv.focus === 'aaaa1111' && lv.pads >= 3 && lv.frames > 0, 'watcher: the Sky Tower cabinet screen shows the LIVE race (both climbers, their platforms), not the attract demo', lv);
  if (SHOTS) { await c.evaluate(() => { window.__camOverride = { pos: [1.9, 2.45, 8.3], at: [0, 1.5, 11.3], showMonkey: false }; }); await c.waitForTimeout(2500); await c.screenshot({ path: SHOTS + '/ga-room-watch-skytower-live.png' }); { const u = await c.evaluate(() => { const s = window.__arcade.play.machines.skytower.cab.userData.screen, im = s.material.map.image; return im.toDataURL('image/png'); }); require('fs').writeFileSync(SHOTS + '/ga-skytower-cabinet-live-screen.png', Buffer.from(u.split(',')[1], 'base64')); } await c.evaluate(() => { window.__camOverride = null; }); }
  if (SHOTS) { await sky(b, 'A.placeOn(11); for (let i = 0; i < 20; i++) A.step(1 / 30); A.G.camYaw = A.G.camYaw; return 1;'); await b.evaluate(() => { const d = document.getElementById('demoUI'); if (d) d.classList.remove('on'); const w = document.getElementById('game').contentWindow.document; for (const e of w.querySelectorAll('#demoBadge,.demoBadge,#cabDemo')) e.style.display = 'none'; }); await b.waitForTimeout(1500); await b.screenshot({ path: SHOTS + '/ga-skytower-two-climbers.png' }); await sky(b, 'A.placeOn(1); return 1;'); }
  // A fires: B sees the bolt, nobody is hurt
  const hp0 = await sky(b, 'return A.hp;');
  const z0 = await sky(b, 'return A.rivals.boltsShown;');
  await sky(a, 'A.G.cooldown = 0; A.fire(); for (let i = 0; i < 4; i++) A.step(1 / 30); return 1;');
  await b.waitForFunction(z => document.getElementById('game').contentWindow.__skytower.rivals.boltsShown > z, z0, { timeout: 8000 }).catch(() => {});
  const z1 = await sky(b, 'return { shown: A.rivals.boltsShown, hp: A.hp };');
  chk(z1.shown > z0 && z1.hp === hp0, "the other climber's laser shots show up (cosmetic, no PVP damage)", { z0, z1, hp0 });
  // B's face fires its eye lasers at B only: A is never hurt by them
  const fl = await sky(b, 'A.G.wind.next = 9999; A.fly(false); A.G.thrust = false; A.placeOn(Math.max(1, A.platform)); for (let i = 0; i < 40; i++) A.step(1 / 60); A.G.iframe = 0; const hp0 = A.hp, ey = A.face.eyeWorld(), pp0 = A.player.position.toArray().map(v => +v.toFixed(1)), n = A.fireEyeBeams(ey), aim = A.eyeBeams.slice(-2).map(q => { const t = A.player.position.clone(); t.y += 1; const v = t.clone().sub(q.o); const along = v.dot(q.dir); return +Math.sqrt(Math.max(0, v.lengthSq() - along * along)).toFixed(2); }); for (let i = 0; i < 260 && A.eyeBeams.length; i++) A.step(1 / 60); return { hp0, hp: A.hp, n, aim, ey: ey.map(e => e.toArray().map(v => +v.toFixed(1))), pp0, pp1: A.player.position.toArray().map(v => +v.toFixed(1)), stats: A.BEAM_STATS, run: A.G.run, mode: A.G.mode, hold: A.G.hold };');
  const ahp = await sky(a, 'return A.hp;');
  chk(fl.n === 2 && fl.aim.every(d => d < 0.3) && (fl.stats.hits === 0 || fl.hp === fl.hp0 - 1) && ahp === 3, "a TITAN's eye lasers aim at (and can only hurt) that device's own climber, never the other one", { fl, a: ahp });
  // own tickets: each collects their own
  const tk = await Promise.all([a, b].map(p => sky(p, 'const t = A.tickets.find(t => !t.collected); A.collectFlyTicket(t); return { fly: A.TK.fly, got: t.collected };')));
  chk(tk[0].fly >= 1 && tk[1].fly >= 1, 'each climber collects their own tickets', tk);
  // race: A reaches the top first, B second
  await sky(a, 'A.placeOn(A.N); for (let i = 0; i < 6; i++) A.step(1 / 30); if (!A.won) A.finish(); for (let i = 0; i < 4; i++) A.step(1 / 30); return 1;');
  const ab = await sky(a, 'return { won: A.won, banner: w.document.getElementById("banner").textContent, place: A.rivals.place };');
  chk(ab.won && /YOU WIN THE RACE/.test(ab.banner) && ab.place === 1, 'first to the top wins the race', ab);
  await b.waitForFunction(() => { const R = document.getElementById('game').contentWindow.__skytower.rivals; return !!R.first; }, null, { timeout: 10000 }).catch(() => {});
  const bb = await sky(b, 'return { first: A.rivals.first, banner: w.document.getElementById("banner").textContent, run: A.G.run, won: A.won };');
  chk(bb.first === 'Dave' && /DAVE REACHED THE TOP FIRST/.test(bb.banner) && bb.run && !bb.won, 'the other climber is told and keeps climbing', bb);
  await sky(b, 'A.placeOn(A.N); for (let i = 0; i < 6; i++) A.step(1 / 30); if (!A.won) A.finish(); return 1;');
  const b2 = await sky(b, 'return { won: A.won, banner: w.document.getElementById("banner").textContent, place: A.rivals.place };');
  chk(b2.won && /2ND PLACE/.test(b2.banner) && /DAVE WON THE RACE/.test(b2.banner) && b2.place === 2, 'arriving second: 2ND PLACE', b2);
  // ---- A leaves the machine: B recentres for everyone ----
  await a.evaluate(() => window.__arcade.play.exit('esc'));
  await a.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 20000 }).catch(() => {});
  await a.evaluate(cab => { const m = window.__arcade.monkey; m.position.x += 2.5; }, cab);
  await c.waitForFunction(() => { const q = window.__mp.peers.get('bbbb2222'); return q && q.slot && q.slot.n === 1; }, null, { timeout: 15000 }).catch(() => {});
  await c.waitForTimeout(1500);
  vb = await view(c, 'bbbb2222'); va = await view(c, 'aaaa1111');
  chk(near(vb, exp(0)) && vb.slot.n === 1 && !va.slot && va.lean === 0, 'one leaves: the remaining player glides back to the centre; the leaver walks off un-posed', { vb, va });
  // ---- after A left, B's climb is solo again ----
  await sky(b, 'A.start(); return 1;'); await b.waitForTimeout(3200); await sky(b, 'for (let i = 0; i < 4; i++) A.step(1 / 30); return 1;');
  const solo = await sky(b, 'return { n: A.rivals.avatars.size, chip: w.document.getElementById("rivalChip").style.display, run: A.G.run };');
  chk(solo.n === 0 && solo.chip === 'none' && solo.run, 'with the other player gone, Sky Tower is a normal solo climb', solo);
  const lv1 = await c.evaluate(() => { const L = window.__arcade.play.machines.skytower.cab.userData.live; return { on: L.on, names: L.names }; });
  chk(lv1.on && lv1.names.join() === 'Zed', 'watcher: with one climber left the screen follows just them live', lv1);
  // A plays another machine: its attract gets a LIVE strip naming the player (those games cannot stream their screen)
  await a.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.monkey); });
  await c.waitForFunction(() => window.__arcade.play.machines.monkey.cab.userData.liveBadge, null, { timeout: 15000 }).catch(() => {});
  const bd = await c.evaluate(() => ({ monkey: window.__arcade.play.machines.monkey.cab.userData.liveBadge || null, rock: window.__arcade.play.machines.rockfall.cab.userData.liveBadge || null }));
  chk(bd.monkey === 'LIVE · DAVE PLAYING' && !bd.rock, 'other machines: LIVE · <name> PLAYING on the cabinet being played (and only that one)', bd);
  // nobody at Sky Tower any more: the screen goes back to its attract demo
  for (let i = 0; i < 3; i++) { await b.evaluate(() => window.__arcade.play.exit('esc')); const w = await b.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 15000 }).then(() => true).catch(() => false); if (w) break; }
  await c.waitForFunction(() => !window.__arcade.play.machines.skytower.cab.userData.live.on, null, { timeout: 20000 }).catch(() => {});
  const lv2 = await c.evaluate(() => window.__arcade.play.machines.skytower.cab.userData.live.on), bm = await b.evaluate(() => window.__arcade.play.mode), ca = await c.evaluate(() => { const q = window.__mp.peers.get('bbbb2222'); return q && q.a; });
  chk(lv2 === false, 'nobody playing: the Sky Tower screen reverts to the attract demo', { live: lv2, bMode: bm, cSeesB: ca });
  const errs = []; for (const o of devs) errs.push(...o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase|reading 'isReady'/i.test(e)));   // isReady: three.js compileAsync poll inside the Monkey Crossing iframe under software GL (not this code)
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));
  for (const o of devs) await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
