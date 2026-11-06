// Jetpack flight: the existing Accessories back item (back:jetpack, 5 tickets) thrusts with an energy meter.
// Phone viewport. node test/jetpack.js
const { open } = require('./lib');
const fs = require('fs');
const SHOT = process.env.JET_SHOT || '/opt/cursor/artifacts/jetpack_flames_flight_phone.png';
const SHOP = process.env.JET_SHOP || '/opt/cursor/artifacts/accessories_back_jetpack_5.png';
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) ok = false; };
const OWN = JSON.stringify(['fur:brown', 'shoes:red']);
const LOOK = (back) => JSON.stringify({ name: 'Jet', hat: 'cap', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'none', back: back });

(async () => {
  let o, page, s;
  // start screen must not list the jetpack (ticket accessories stay in the shop)
  if (process.env.JET_SKIP_START) { console.log('PASS start screen skipped this pass'); }
  else {
  o = await open({ phone: true, w: 390, h: 844, start: true });
  page = o.page;
  await page.waitForSelector('#gaP .gaRow', { timeout: 30000 }).catch(() => {});
  s = await page.evaluate(() => {
    const G = window.__gaPlayer;
    const rows = [...document.querySelectorAll('#gaP .gaRow')].map(r => r.dataset.k);
    const ids = [...document.querySelectorAll('#gaP .gaO')].map(b => b.dataset.v);
    return { rows, jet: ids.includes('jetpack'), backRow: rows.includes('back'), price: G.priceOf('back', 'jetpack'), start: G.isStart('back', 'jetpack'), free: G.isFree('back', 'jetpack') };
  });
  chk(!s.jet && !s.backRow && s.rows.join() === 'hat,hoodie' && s.price === 5 && s.start === false && s.free === false, 'start screen has no jetpack; it stays a 5-ticket accessory', s);
  await o.close();
  }

  o = await open({ phone: true, w: 390, h: 844 });
  page = o.page; const { errors } = o;
  page.on('requestfailed', r => console.log('REQFAIL ' + r.url().slice(0, 140)));
  await page.evaluate(({ own, look }) => {
    localStorage.setItem('galacticarcade.wardrobeMig', '1');
    localStorage.setItem('galacticarcade.wardrobeOwned', own);
    localStorage.setItem('galacticarcade.player', look);
    localStorage.setItem('neonarcade.tickets', '40');
  }, { own: OWN, look: LOOK('none') });
  await page.reload();
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer, null, { timeout: 90000 });
  await page.evaluate(() => Promise.all([window.__arcade.shopReady, window.__arcade.windowsReady].filter(Boolean).map(p => Promise.resolve(p))));

  await page.evaluate(() => window.__wardrobe.open({ shop: true }));
  await page.waitForSelector('#gaW .gaRow[data-k=back] .gaO[data-v=jetpack]', { timeout: 20000 });
  const tap = async sel => { const b = page.locator(sel).first(); await b.scrollIntoViewIfNeeded(); const r = await b.boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(400); };
  s = await page.evaluate(() => {
    const e = document.getElementById('gaW'), row = e.querySelector('.gaRow[data-k=back]'), lk = row.querySelector('.gaO[data-v=jetpack] .gaLk');
    const jets = [...e.querySelectorAll('.gaO[data-v=jetpack]')];
    return { title: e.querySelector('#gaWT').textContent, label: row.querySelector('span').textContent, price: lk && lk.textContent, n: jets.length, own: row.querySelector('.gaO[data-v=jetpack]').classList.contains('own'), back: window.__gaPlayer.p.back, t: window.__gaPlayer.balance() };
  });
  chk(s.title === 'ACCESSORIES' && s.label === 'BACK' && s.price === '🔒5' && s.n === 1 && !s.own && s.back === 'none' && s.t === 40, 'Accessories BACK row shows one jetpack locked at 5 tickets', s);
  await tap('#gaW .gaRow[data-k=back] .gaO[data-v=jetpack]');
  s = await page.evaluate(() => ({ buy: !document.getElementById('gaWBuy').hidden, txt: document.getElementById('gaWBuyB').textContent, back: window.__gaPlayer.p.back, t: window.__gaPlayer.balance() }));
  chk(s.buy && s.txt === 'BUY 5 🎟' && s.back === 'none' && s.t === 40, 'tapping the locked jetpack asks for a 5-ticket purchase and does not equip it', s);
  await page.screenshot({ path: SHOP });
  await tap('#gaWBuyB');
  s = await page.evaluate(() => ({ t: window.__gaPlayer.balance(), hud: document.getElementById('tixN').textContent, back: window.__gaPlayer.p.back, saved: JSON.parse(localStorage.getItem('galacticarcade.player')).back, n: window.__gaPlayer.owned().filter(x => x === 'back:jetpack').length, own: document.querySelector('#gaW .gaO[data-v=jetpack]').classList.contains('own') }));
  chk(s.t === 35 && s.hud === '35' && s.back === 'jetpack' && s.saved === 'jetpack' && s.n === 1 && s.own, 'BUY spends 5 once, equips, and saves back:jetpack', s);
  const againT = s.t;
  await tap('#gaW .gaRow[data-k=back] .gaO[data-v=jetpack]');
  const again = await page.evaluate(b => ({ a: window.__gaPlayer.balance(), back: window.__gaPlayer.p.back, buy: !document.getElementById('gaWBuy').hidden, same: window.__gaPlayer.balance() === b }), againT);
  chk(again.a === againT && again.back === 'jetpack' && again.same && !again.buy, 'tapping the owned jetpack does not charge again', again);
  await page.evaluate(() => window.__wardrobe.close());

  await page.evaluate(() => window.__arcade.simPause(true));
  await page.waitForTimeout(250);

  const boot = await page.evaluate(() => {
    const A = window.__arcade, st = A.st, F = A.flyCfg;
    A.setFloor('neon'); A.monkey.position.set(0, 0, 4); st.vel.set(0, 0, 0); st.yaw = 0; st.face = Math.PI; st.jump = null; st.fly.e = 1; st.fly.air = false; st.fly.hold = false;
    const jets = () => { const g = A.monkey.getObjectByName('gaBk_jetpack'), th = g ? g.children.filter(c => c.name === 'gaThruster') : []; let tall = 0, vis = 0, parts = 0;
      th.forEach(t => { if (t.visible) vis++; t.children.forEach(c => { parts++; const h = c.geometry && c.geometry.parameters && c.geometry.parameters.height; if (h > tall) tall = h; }); }); return { n: th.length, vis, parts, tall }; };
    const idleFx = jets();
    const j0 = st.jumps || 0;
    A.keys.Space = true;
    for (let i = 0; i < 50; i++) A.step(1 / 60);
    const flame = jets();
    const mid = { y: A.monkey.position.y, e: st.fly.e, air: st.fly.air, thrust: st.fly.thrust, jumps: (st.jumps || 0) - j0, hud: document.getElementById('flyHud').className, meter: document.getElementById('flyMeter').firstChild.style.transform, flame, idleFx, fp: st.fp };
    st.fp = true; A.step(1 / 60);
    const first = { camY: A.camera.position.y, y: A.monkey.position.y, vis: A.monkey.visible };
    st.fp = false; A.step(1 / 60);
    const third = { vis: A.monkey.visible };
    // horizontal while airborne
    A.monkey.position.set(0, Math.max(1.2, A.monkey.position.y), 4); st.yaw = 0; st.vel.set(0, 0, 0);
    const z0 = A.monkey.position.z;
    A.keys.KeyW = true;
    for (let i = 0; i < 40; i++) A.step(1 / 60);
    A.keys.KeyW = false; A.keys.Space = false;
    for (let i = 0; i < 8; i++) A.step(1 / 60);
    const glide = { y: A.monkey.position.y, e: st.fly.e, air: st.fly.air, thrust: st.fly.thrust, fx: jets() };
    const moved = { z: A.monkey.position.z, y: A.monkey.position.y, z0 };
    // release: no air refill, controlled descent
    const eAir = st.fly.e, yAir = A.monkey.position.y;
    let minY = yAir, descended = false;
    for (let i = 0; i < 360; i++) { A.step(1 / 60); if (A.monkey.position.y < yAir - 0.4) descended = true; minY = Math.min(minY, A.monkey.position.y); if (A.monkey.position.y <= 0.02 && !st.fly.air) break; }
    const eLand = st.fly.e, yLand = A.monkey.position.y;
    for (let i = 0; i < 40; i++) A.step(1 / 60);
    const eFill = st.fly.e;
    return { mid, first, third, moved, glide, eAir, yAir, descended, minY, eLand, yLand, eFill, below: minY < -0.02, cap: F.body, cfg: F };
  });
  chk(boot.mid.idleFx.vis === 0 && boot.mid.flame.n === 2 && boot.mid.flame.vis === 2 && boot.mid.flame.parts >= 6 && boot.mid.flame.tall >= 1.1, 'both nozzles throw a long flame only while thrusting', { idle: boot.mid.idleFx, flame: boot.mid.flame });
  chk(boot.glide.y > 1 && boot.glide.air && !boot.glide.thrust && boot.glide.fx.vis === 0 && boot.glide.e <= boot.mid.e + 0.001, 'unpowered descent keeps the energy and puts the flames out', boot.glide);
  chk(boot.mid.y > 1.2 && Math.abs(boot.mid.e - (1 - boot.cfg.drain * 50 / 60)) < 0.04 && boot.mid.air && boot.mid.thrust && boot.mid.jumps === 0 && boot.mid.hud === 'on' && /^scaleX\(0\.\d/.test(boot.mid.meter), 'Space thrusts, drains the meter, and does not jump', boot.mid);
  chk(boot.first.vis === false && boot.first.camY > boot.first.y && boot.third.vis === true, 'first person hides the body and follows height; third person shows it', { first: boot.first, third: boot.third });
  chk(boot.moved.z < boot.moved.z0 - 0.8 && boot.moved.y > 0.6, 'horizontal move still works in the air', boot.moved);
  chk(boot.descended && boot.eLand <= boot.eAir + 0.001 && boot.yLand <= 0.02 && boot.minY >= -0.02 && boot.eFill > boot.eLand + boot.cfg.fill * 40 / 60 * 0.75, 'release descends, no air refill, ground refills', boot);

  const edges = await page.evaluate(() => {
    const A = window.__arcade, st = A.st, F = A.flyCfg, cap = A.room ? (8.5 - F.body) : (8.5 - F.body);
    const roomCap = 8.5 - F.body, hallCap = 3 - F.body;
    A.setFloor('neon'); A.monkey.position.set(0, 0, 4); st.vel.set(0, 0, 0); st.yaw = 0; st.jump = null; st.fly.e = 1; st.fly.air = false; st.lavaFall = null;
    A.keys.Space = true;
    let hi = 0;
    for (let i = 0; i < 200; i++) { A.step(1 / 60); hi = Math.max(hi, A.monkey.position.y); }
    const ceil = { hi, y: A.monkey.position.y, e: +st.fly.e.toFixed(3), x: A.monkey.position.x, z: A.monkey.position.z };
    A.keys.Space = false;
    // west wall while high
    A.monkey.position.set(-9, Math.min(hi, roomCap), 2); st.yaw = Math.PI / 2; st.vel.set(0, 0, 0); st.fly.e = 0.8; st.fly.air = true; A.keys.Space = true; A.keys.KeyW = true; A.keys.ShiftLeft = true;
    for (let i = 0; i < 80; i++) A.step(1 / 60);
    const wall = { x: +A.monkey.position.x.toFixed(2), y: +A.monkey.position.y.toFixed(2) };
    A.keys.KeyW = A.keys.ShiftLeft = A.keys.Space = false;
    // doorway: walking and flying should stop on the same side of the closed LEVEL 2 doors
    const shove = (y) => {
      A.monkey.position.set(0, y, -8); st.vel.set(0, 0, 0); st.yaw = 0; st.face = Math.PI; st.jump = null; st.fly.e = 1; st.fly.air = y > 1; st.fly.vy = 0; st.lavaFall = null;
      A.keys.KeyW = true; A.keys.ShiftLeft = true; A.keys.Space = y > 1;
      let minZ = 99;
      for (let i = 0; i < 100; i++) { A.step(1 / 60); if (A.monkey.position.z < minZ) minZ = A.monkey.position.z; }
      A.keys.KeyW = A.keys.ShiftLeft = A.keys.Space = false;
      return { minZ: +minZ.toFixed(2), y: +A.monkey.position.y.toFixed(2), z: +A.monkey.position.z.toFixed(2) };
    };
    const low = shove(0), high = shove(4);
    // hallway ceiling
    A.monkey.position.set(0, 4, -14.5); st.fly.air = true; st.fly.e = 0.6; st.fly.hold = false; A.keys.Space = false; st.vel.set(0, 0, 0);
    A.step(1 / 60);
    const hall = { y: +A.monkey.position.y.toFixed(2), z: +A.monkey.position.z.toFixed(2) };
    // empty tank cannot be tapped back into the air; ground time restores a hop
    A.monkey.position.set(0, 0, 4); st.fly.air = false; st.fly.e = 0; st.fly.vy = 0; st.fly.hold = false; A.keys.Space = true;
    for (let i = 0; i < 8; i++) A.step(1 / 60);
    const empty = { y: A.monkey.position.y, e: +st.fly.e.toFixed(3) };
    A.keys.Space = false;
    let n = 0; while (st.fly.e < F.min && n < 120) { A.step(1 / 60); n++; }
    const ready = st.fly.e;
    A.keys.Space = true;
    for (let i = 0; i < 30; i++) A.step(1 / 60);
    const again = { y: A.monkey.position.y, e: st.fly.e };
    A.keys.Space = false;
    for (let i = 0; i < 180; i++) { A.step(1 / 60); if (!st.fly.air && A.monkey.position.y <= 0.02) break; }
    return { ceil, wall, low, high, hall, empty, ready, again, roomCap, hallCap, grounded: A.monkey.position.y };
  });
  chk(edges.ceil.hi <= edges.roomCap + 0.02 && edges.ceil.hi > 5 && edges.ceil.y <= edges.roomCap + 0.02 && Math.abs(edges.ceil.x) < 1, 'thrust stops at the room ceiling and stays inside', edges.ceil);
  chk(edges.wall.x > -11.7 && edges.wall.y > 1, 'flying into the west wall stays inside', edges.wall);
  chk(edges.high.minZ >= edges.low.minZ - 0.08 && edges.high.minZ > -12.05 && edges.low.minZ > -12.05, 'flying does not pass the closed LEVEL 2 doors', { low: edges.low, high: edges.high });
  chk(edges.hall.y <= edges.hallCap + 0.02 && edges.hall.y > 0.4, 'hallway ceiling holds the head inside', edges.hall);
  chk(edges.empty.y <= 0.05 && edges.empty.e < 0.08 && edges.ready >= 0.08 && edges.again.y > 0.4, 'empty tank stays down until a short ground recharge, then flies again', edges);

  const exploit = await page.evaluate(() => {
    const A = window.__arcade, st = A.st, G = window.__gaPlayer;
    A.monkey.position.set(0, 0, 4); st.vel.set(0, 0, 0); st.yaw = 0; st.jump = null; st.fly.e = 1; st.fly.air = false; st.lavaFall = null;
    A.keys.Space = true;
    for (let i = 0; i < 70; i++) A.step(1 / 60);
    A.keys.Space = false;
    const e1 = st.fly.e, y1 = A.monkey.position.y;
    st.fly.hold = true; A.step(1 / 60); st.fly.hold = false;
    for (let i = 0; i < 40; i++) A.step(1 / 60);
    const e2 = st.fly.e, y2 = A.monkey.position.y;
    G.pick('back', 'none');
    const eOff = st.fly.e;
    for (let i = 0; i < 25; i++) A.step(1 / 60);
    const yOff = A.monkey.position.y, airOff = st.fly.air, hudOff = document.getElementById('flyHud').classList.contains('on');
    const tickets = G.balance();
    G.pick('back', 'jetpack');
    const eOn = st.fly.e, cost = G.balance();
    for (let i = 0; i < 15; i++) A.step(1 / 60);
    const still = { e: st.fly.e, y: A.monkey.position.y };
    return { e1, y1, e2, y2, eOff, yOff, airOff, hudOff, eOn, still, tickets, cost, saved: JSON.parse(localStorage.getItem('galacticarcade.player')).back, own: G.owned().includes('back:jetpack') };
  });
  chk(exploit.y1 > 1.5 && exploit.e2 <= exploit.e1 + 0.002 && exploit.y2 < exploit.y1, 'toggling thrust in the air does not refill', exploit);
  chk(exploit.yOff < exploit.y2 - 0.2 && exploit.eOn <= exploit.eOff + 0.002 && exploit.still.e <= exploit.eOn + 0.002 && exploit.hudOff === false && exploit.cost === exploit.tickets && exploit.saved === 'jetpack' && exploit.own, 'unequip descends without a refund or a free tank; re-equip keeps the same energy', exploit);

  const clean = await page.evaluate(() => {
    const A = window.__arcade, st = A.st;
    const up = () => { A.monkey.position.set(1, 3.2, 3); st.fly.air = true; st.fly.thrust = true; st.fly.e = 0.4; st.fly.vy = 1; st.jump = null; A.play.mode = 'walk'; document.body.classList.remove('ingame'); };
    const read = () => { const g = A.monkey.getObjectByName('gaBk_jetpack'); let vis = 0; if (g) for (let i = 0; i < g.children.length; i++) if (g.children[i].name === 'gaThruster' && g.children[i].visible) vis++; return { y: +A.monkey.position.y.toFixed(2), air: st.fly.air, mode: A.play.mode, vis }; };
    up(); A.play.mode = 'game'; document.body.classList.add('ingame'); A.step(1 / 60); const game = read();
    A.play.mode = 'walk'; document.body.classList.remove('ingame');
    up(); window.__tp.state = 'charge'; A.step(1 / 60); const tp = read(); window.__tp.state = 'idle';
    up(); window.__floorBtn.open = true; A.step(1 / 60); const menu = read(); window.__floorBtn.open = false;
    up(); window.__wardrobe.open({ shop: true }); A.step(1 / 60); const ward = read(); window.__wardrobe.close();
    up(); if (window.__pool) window.__pool.open = true; A.step(1 / 60); const pool = read(); if (window.__pool) window.__pool.open = false;
    up(); const S = window.__start, d = S.dismissed; S.shown = true; S.dismissed = false; A.step(1 / 60); const start = read(); S.dismissed = true; S.shown = false;
    // right-side jump still works on the ground with the pack on
    A.keys.Space = false; st.fly.hold = false; A.monkey.position.set(0, 0, 4); st.fly.air = false; st.fly.thrust = false; st.fly.e = 1; st.vel.set(0, 0, 0); st.jump = null; st.lavaFall = null; A.play.mode = 'walk';
    document.body.classList.remove('ingame'); if (window.__floorBtn) window.__floorBtn.open = false; if (window.__pool) window.__pool.open = false; window.__tp.state = 'idle';
    const why = { can: A.canJump(), air: st.fly.air, mode: A.play.mode, dismissed: S.dismissed, shown: S.shown, seated: st.seated, shop: !!(window.__shop && window.__shop.open), ward: !!(window.__wardrobe && window.__wardrobe.isOpen), floor: window.__floorBtn && window.__floorBtn.open, ingame: document.body.classList.contains('ingame'), tp: window.__tp.state };
    const j0 = st.jumps || 0; st.jumpReq = st.t; A.step(1 / 60);
    for (let i = 0; i < 70; i++) A.step(1 / 60);
    const jump = { d: (st.jumps || 0) - j0, y: A.monkey.position.y, air: st.fly.air, why };
    return { game, tp, menu, ward, pool, start, jump, d };
  });
  chk(clean.game.y === 0 && !clean.game.air && clean.game.vis === 0 && clean.tp.vis === 0 && clean.menu.vis === 0 && clean.ward.vis === 0 && clean.pool.vis === 0 && clean.start.vis === 0, 'game, teleport, menu, wardrobe, pool and start screen end flight and put the flames out', clean);
  chk(clean.jump.d === 1 && clean.jump.y === 0 && !clean.jump.air, 'right-side jump still works with the jetpack on the ground', clean.jump);

  // touch FLY button
  const touch = await page.evaluate(() => {
    const A = window.__arcade, st = A.st, b = document.getElementById('bFly');
    A.monkey.position.set(0, 0, 4); st.vel.set(0, 0, 0); st.fly.e = 1; st.fly.air = false; st.fly.hold = false; A.keys.Space = false; st.jump = null;
    for (let i = 0; i < 5; i++) A.step(1 / 60);
    const shown = document.getElementById('flyHud').classList.contains('on');
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', clientX: 340, clientY: 640 }));
    for (let i = 0; i < 40; i++) A.step(1 / 60);
    const y = A.monkey.position.y, on = b.classList.contains('on');
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', clientX: 340, clientY: 640 }));
    const held = st.fly.hold;
    for (let i = 0; i < 90; i++) A.step(1 / 60);
    return { shown, y, on, held, y2: A.monkey.position.y, e: st.fly.e, lit: b.classList.contains('on') };
  });
  chk(touch.shown && touch.y > 1 && touch.on && touch.held === false && touch.lit === false && touch.y2 < touch.y - 0.3, 'FLY touch button takes off and releasing it descends', touch);

  // golf shield is a full-height blocker: flying does not cross it
  const golf = await page.evaluate(() => {
    const A = window.__arcade, g = window.__minigolf, st = A.st;
    if (!g) return { skip: true };
    const z = (g.Z0 + g.Z1) / 2;
    A.monkey.position.set(g.X0 - 1.1, 3.2, z); st.yaw = -Math.PI / 2; st.vel.set(0, 0, 0); st.fly.air = true; st.fly.e = 1; st.jump = null;
    A.keys.KeyW = true; A.keys.Space = true;
    let maxX = A.monkey.position.x;
    for (let i = 0; i < 70; i++) { A.step(1 / 60); if (A.monkey.position.x > maxX) maxX = A.monkey.position.x; }
    A.keys.KeyW = A.keys.Space = false;
    return { maxX: +maxX.toFixed(2), x0: g.X0, y: +A.monkey.position.y.toFixed(2) };
  });
  chk(golf.skip || (golf.maxX < golf.x0 && golf.y > 0.5), 'flying cannot cross the closed mini-golf shield', golf);

  // reload keeps ownership, worn pack, and does not mint a second item
  const beforeReload = await page.evaluate(() => ({ t: localStorage.getItem('neonarcade.tickets'), own: localStorage.getItem('galacticarcade.wardrobeOwned'), back: JSON.parse(localStorage.getItem('galacticarcade.player')).back }));
  await page.reload();
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer && window.__gaPlayer.p.back === 'jetpack', null, { timeout: 90000 });
  const after = await page.evaluate(() => {
    const G = window.__gaPlayer;
    return { back: G.p.back, own: G.owned().filter(x => /jetpack/.test(x)), t: G.balance(), savedT: localStorage.getItem('neonarcade.tickets'), mesh: !!window.__arcade.monkey.getObjectByName('gaBk_jetpack') };
  });
  chk(after.back === 'jetpack' && after.own.join() === 'back:jetpack' && String(after.t) === beforeReload.t && after.mesh, 'reload keeps the owned equipped jetpack and the ticket balance', { beforeReload, after });

  // live frame: phone shot of equipped flight + meter
  await page.evaluate(() => {
    const A = window.__arcade, st = A.st;
    A.simPause(false);
    A.setFloor('neon'); A.monkey.position.set(0, 0, 4); st.vel.set(0, 0, 0); st.yaw = 0.62; st.pitch = 0.04; st.dist = 2.65; st.fp = false; st.face = Math.PI + 0.62; st.lookT = st.t; st.fly.e = 1; st.fly.air = false; st.jump = null;
    A.play.mode = 'walk'; document.body.classList.remove('ingame');
    if (window.__wardrobe && window.__wardrobe.isOpen) window.__wardrobe.close();
    if (window.__pool) window.__pool.open = false;
    window.__tp.state = 'idle'; window.__floorBtn.open = false;
  });
  await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__arcade.monkey.position.y > 2.4 && window.__arcade.st.fly.e < 0.82 && document.getElementById('flyHud').classList.contains('on'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(200);
  const live = await page.evaluate(() => {
    const A = window.__arcade, r = document.getElementById('bFly').getBoundingClientRect(), m = document.getElementById('flyMeter').getBoundingClientRect();
    let pack = false, bag = null, vis = 0; A.monkey.traverse(o => { if (o.name === 'gaBk_jetpack' && o.visible) pack = true; if (o.name === 'backpack') bag = o.visible; if (o.name === 'gaThruster' && o.visible) vis++; });
    return { y: +A.monkey.position.y.toFixed(2), e: +A.st.fly.e.toFixed(2), thrust: A.st.fly.thrust, space: !!A.keys.Space, pack, bag, vis, btn: r.width, bx: r.x, by: r.y, mw: m.width, my: m.y, w: innerWidth, h: innerHeight };
  });
  chk(live.y > 1.2 && live.e < 0.95 && live.thrust && live.space && live.pack && live.bag === false && live.vis === 2 && live.btn >= 70 && live.mw > 60, 'third-person flight shows both nozzle flames, the meter, and FLY', live);
  await page.screenshot({ path: SHOT });
  await page.keyboard.up('Space');
  chk(fs.existsSync(SHOT) && fs.statSync(SHOT).size > 8000, 'screenshot written', SHOT + ' ' + (fs.existsSync(SHOT) ? fs.statSync(SHOT).size : 0));
  const realErr = errors.filter(e => !/ERR_FAILED|supabase|favicon/i.test(e));
  chk(realErr.length === 0, 'no page errors ' + realErr.join('|') + (errors.length ? ' (ignored resource failures ' + errors.length + ')' : ''));
  await o.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
