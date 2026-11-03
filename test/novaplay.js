// NOVA TETHER cabinet: north wall slot 4 (right of MONKEY CROSSING, Dave's pick), PLAY prompt, zoom into the silent DEMO, 2 tickets = 1 credit
// (NEED 2 below that), one credit = one run, finger-drag (phone) / keys (desktop) move the ship inside the cabinet frame, gold tickets from kills
// (rising with stage / progress) + WARDEN and stage-boss bonuses banked into neonarcade.tickets at once, isolated storage, game over -> DEMO.
// node test/novaplay.js [phone]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const slot = await page.evaluate(() => { const A = window.__arcade, T = A.THREE, c = A.novaCab;
    const north = A.playables.filter(k => k.userData.wall === 'north').map(k => [k.name, k.userData.index, +k.position.x.toFixed(2)]).sort((a, b) => a[1] - b[1]);
    const bad = []; c.traverse(o => { if (o.isMesh && (o.material.isMeshBasicMaterial || (/body|trim|brackets|rivets/.test(o.name) && o.material.emissive && o.material.emissive.getHex()))) bad.push(o.name); });
    const blankThere = A.cabinets.some(k => k.position.distanceTo(c.position) < 0.5);
    const tube = A.room.getObjectByName('wallNeonRun').geometry.attributes.position, v = new T.Vector3(); let over = 0;
    for (let i = 0; i < tube.count; i++) { v.fromBufferAttribute(tube, i); if (Math.abs(v.x - c.position.x) < 0.7 && v.z < -11 && v.y > 2.0) over++; }
    const box = new T.Box3().setFromObject(c), sz = box.getSize(new T.Vector3());
    return { wall: c.userData.wall, idx: c.userData.index, x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2), north, bad, blankThere, over, size: [+sz.x.toFixed(2), +sz.y.toFixed(2), +sz.z.toFixed(2)], aspect: +c.userData.aspect.toFixed(3),
      parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'rivets', 'marquee', 'screen', 'joystick', 'coinDoor', 'btnForce', 'btnFire'].every(k => c.getObjectByName(k)) }; });
  console.log(JSON.stringify(slot));
  const mi = slot.north.find(n => n[0] === 'monkeyCabinet');
  chk(slot.wall === 'north' && slot.idx === 4 && mi && mi[1] === 3 && slot.x === mi[2] + 4 && !slot.blankThere, 'NOVA TETHER replaces the blank on the north wall, slot 4 (x=' + slot.x + ', z=' + slot.z + '), next right of MONKEY CROSSING (x=' + (mi && mi[2]) + ')');
  chk(slot.parts && slot.bad.length === 0, 'cabinet parts present (marquee, side art, joystick, FORCE + FIRE, coin door), no neon on the body ' + slot.bad);
  chk(slot.over > 0, 'the pink wall tube still outlines the cabinet (' + slot.over + ' tube vertices over it)');
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 1; localStorage.setItem('neonarcade.tickets', '1'); p.machines.nova.credits = 0; });
  await page.evaluate(PH => { window.__arcade.monkey.position.set(2, 0, 0); window.__camOverride = { pos: PH ? [6.4, 1.9, -7.4] : [5.2, 2.0, -7.6], at: [7.4, 1.25, -11.5] }; }, PHONE); await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/nova_cab_room' + sfx + '.png' }); await page.evaluate(() => { window.__camOverride = null; });
  await H.goTo('novaCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && p0.near === 'novaCabinet' && /5 TICKETS TO PLAY/.test(p0.cr), 'PLAY prompt at NOVA TETHER with 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await page.evaluate(() => { window.__camOverride = null; });
  await page.screenshot({ path: 'shots/nova_cab_prompt' + sfx + '.png' });
  await H.press(); await H.zoomToDemo(); await page.waitForTimeout(2500);
  const d = await page.evaluate(W => { const w = eval(W); return { src: w.location.pathname, demo: w.__DEMO, mode: w.NV.G.mode, god: w.NV.god, muted: w.NV.Audio.muted, ins: document.getElementById('dInsert').textContent, cost: document.getElementById('dCost').textContent, t: w.NV.G.stageT }; }, W);
  chk(/nova-play/.test(d.src) && d.demo && d.mode === 'play' && d.t > 0.5 && d.ins === 'INSERT CREDIT' && d.cost === '5 TICKETS TO PLAY', 'zoom lands in the NOVA TETHER DEMO: INSERT CREDIT, 2 TICKETS TO PLAY ' + JSON.stringify(d));
  chk(d.muted, 'DEMO is silent');
  const t0 = await page.evaluate(() => localStorage.getItem('neonarcade.tickets'));
  const dk = await page.evaluate(W => { const w = eval(W), s0 = w.NV.G.score; w.NV.step(900); return { score: w.NV.G.score - s0, got: w.__TK.got, kills: w.__TK.kills }; }, W);
  chk(dk.score > 0 && dk.got === 0 && await page.evaluate(() => localStorage.getItem('neonarcade.tickets')) === t0, 'DEMO autopilot shoots things down but never drops tickets ' + JSON.stringify(dk));
  await page.waitForTimeout(400); await page.screenshot({ path: 'shots/nova_demo' + sfx + '.png' });
  // 1 ticket: NEED 2
  const n0 = (await H.state()).need; await H.insert();
  const b = await page.evaluate(() => ({ cr: window.__arcade.play.machines.nova.credits, t: window.__arcade.play.tickets.total, btn: document.getElementById('bTicket').textContent, need: window.__arcade.play.need }));
  chk(b.cr === 0 && b.t === 1 && b.need > n0 && b.btn === 'NEED 5 TICKETS', 'with 1 ticket: NEED 5 TICKETS, no credit ' + JSON.stringify(b));
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); });
  await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.nova.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1 tickets) ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  const g = await page.evaluate(W => { const w = eval(W), s = w.NV.state(); return { mode: s.mode, stage: s.stage, score: s.score, lives: s.lives, demo: w.__DEMO, god: w.NV.god, muted: w.NV.Audio.muted, cr: window.__arcade.play.machines.nova.credits, sub: window.__arcade.play.sub, run: w.__TK.run }; }, W);
  chk(g.mode === 'play' && g.stage === 0 && g.lives === 3 && !g.demo && !g.god && g.cr === 0 && g.sub === 'play' && g.run === 0, 'credit starts a fresh run: stage 1, 3 lives (credit 1 -> 0) ' + JSON.stringify(g));
  chk(!g.muted, 'game audio on');
  // real controls inside the cabinet frame
  const x0 = await page.evaluate(W => eval(W).NV.P.x, W);
  if (PHONE) { const cdp = await page.context().newCDPSession(page);
    const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await tp('touchStart', 60, 520); for (let i = 1; i <= 8; i++) { await tp('touchMove', 60 + i * 12, 520 - i * 4); await page.waitForTimeout(30); } await tp('touchEnd'); }
  else { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight'); }
  await page.waitForTimeout(300);
  const mv = await page.evaluate(W => { const w = eval(W); return { x: w.NV.P.x, touch: w.document.body.classList.contains('touch') }; }, W);
  chk(mv.x > x0 + 30 && (!PHONE || mv.touch), (PHONE ? 'finger drag (relative) moves the ship inside the cabinet frame' : 'arrow keys move the ship') + ' x ' + x0.toFixed(0) + ' -> ' + mv.x.toFixed(0));
  // play on: kills drop tickets, banked at once (run the game's own autopilot steering; the sim still kills / scores normally)
  const a0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  let k = null; for (let i = 0; i < 60; i++) { k = await page.evaluate(W => { const w = eval(W); w.NV.god = true; for (let j = 0; j < 30; j++) { w.__nova.pilot(); w.NV.step(1); if (w.__TK.got) break; } w.NV.god = false; return { got: w.__TK.got, log: w.__TK.log.slice(-3), mode: w.NV.G.mode, t: w.NV.G.stageT }; }, W); if (k.got >= 1) break; }
  await page.waitForTimeout(250); await page.screenshot({ path: 'shots/nova_ticket' + sfx + '.png' });
  const a1 = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets') }));
  chk(k.got >= 1 && a1.t - a0 >= Math.floor(k.got * 2.5) && a1.t - a0 <= Math.ceil(k.got * 2.5) && a1.ls === a1.t, 'kills drop gold tickets, banked in the arcade at once: +' + k.got + ' ' + JSON.stringify(k));
  // a whole stage (warden + stage boss) and into stage 2 (test keeps the ship alive so the timeline completes)
  const run = await page.evaluate(W => { const w = eval(W), G = w.NV.G; w.NV.god = true; for (let i = 0; i < 60 * 260 && !(G.stage === 1 && G.mode === "play" && G.stageT > 30); i++) { if (i % 600 === 599) for (const b of w.NV.bosses) if (b.hp > 40) b.hp -= 40; w.__nova.pilot(); w.NV.step(1); }
    w.NV.god = false; const L = w.__TK.log; return { got: w.__TK.got, stage: G.stage + 1, kills: w.__TK.kills, killDrops: L.filter(x => /^kill/.test(x)).length, warden: L.filter(x => /^warden/.test(x)), boss: L.filter(x => /^boss/.test(x)), s1: L.filter(x => /^kill.*@s1:/.test(x)).length, s2: L.filter(x => /^kill.*@s2:/.test(x)).length, score: G.score }; }, W);
  const a2 = await page.evaluate(() => window.__arcade.play.tickets.total);
  console.log('RUN ' + JSON.stringify(run), a0, a1, JSON.stringify(await page.evaluate(W => { const w = eval(W); return { t: w.NV.G.stageT, m: w.NV.G.mode, b: w.NV.bosses.map(b => [b.type, b.hp, b.x|0, b.y|0]) }; }, W)));
  chk(run.stage === 2 && run.warden.length >= 1 && run.boss.length === 1 && Math.abs(a2 - a0 - run.got * 2.5) <= 1, 'stage 1 cleared: WARDEN + stage-boss bonuses banked (' + run.warden + ' / ' + run.boss + '), arcade +' + (a2 - a0) + ' for ' + run.got + ' pickups');
  chk(run.got >= 6 && run.killDrops >= 2, 'a decent stage nets well over the old 2-ticket cost in pickups, each paying 2.5 ('  + run.got + ' tickets, ' + run.killDrops + ' kill drops from ' + run.kills + ' kills)');
  const ch = await page.evaluate(W => { const w = eval(W), G = w.NV.G, e = { type: 'drone' }, s = G.stage, l = G.loop, t = G.stageT; const r = [];
    G.stage = 0; G.loop = 0; G.stageT = 0; r.push(w.__TK.chance(e)); G.stageT = 50; r.push(w.__TK.chance(e)); G.stage = 1; r.push(w.__TK.chance(e)); G.loop = 1; r.push(w.__TK.chance(e)); r.push(w.__TK.chance({ type: 'hunter' }));
    G.stage = s; G.loop = l; G.stageT = t; return r.map(x => +x.toFixed(3)); }, W);
  chk(ch[0] < ch[1] && ch[1] < ch[2] && ch[2] < ch[3] && ch[4] > ch[3], 'kill drop chance rises with progress, stage and loop; tougher foes more ' + JSON.stringify(ch));
  const iso = await page.evaluate(() => ({ hi: localStorage.getItem('arcade_nova_hi'), orig: localStorage.getItem('novaTetherHi'), mute: localStorage.getItem('novaTetherMute2') }));
  chk(iso.hi !== null && iso.orig === null && iso.mute === null, 'the copy keeps its own storage keys (arcade_nova_*), the standalone keys untouched ' + JSON.stringify(iso));
  // lose the last life -> GAME OVER, a press does not restart for free -> back to the silent DEMO
  await page.evaluate(W => { const w = eval(W); w.NV.G.lives = 1; w.NV.killPlayer(); w.NV.step(200); }, W);
  if (!PHONE) await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const o = await page.evaluate(W => { const w = eval(W); return { mode: w.NV.G.mode, go: window.__arcade.play.goShown, sub: window.__arcade.play.sub }; }, W);
  chk(o.mode === 'over', 'run ends at GAME OVER and a press does not start a free game ' + JSON.stringify(o));
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const back = await page.evaluate(W => { const w = eval(W); return { sub: window.__arcade.play.sub, demo: w.__DEMO, ins: document.getElementById('dInsert').textContent, muted: w.NV.Audio.muted, mode: w.NV.G.mode, cr: window.__arcade.play.machines.nova.credits }; }, W);
  chk(back.sub === 'demo' && back.demo && back.ins === 'INSERT CREDIT' && back.muted && back.mode === 'play' && back.cr === 0, 'game over returns to the silent DEMO ' + JSON.stringify(back));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(() => {});
  chk(await page.evaluate(() => !document.getElementById('game')), 'zoomed out: the game iframe is unloaded');
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
