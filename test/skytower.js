// SKY TOWER (#15): south wall slot 2:2 (old blank E, x=0). 3D jetpack climb, 50 Lego
// platforms ending in space above Earth. FLY lifts, FIRE shoots Lego aliens, tickets
// only while a real arcade credit is running (never in DEMO / WATCH).
// node test/skytower.js
const { open } = require('./lib'); const { helpers } = require('./cabflow');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 844, h: 390 });
  page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const H = helpers(page, true), W = 'document.getElementById("game").contentWindow';

  const s = await page.evaluate(() => {
    const A = window.__arcade, c = A.skyTowerCab;
    if (!c) return { missing: true };
    const bs = A.scene.children.filter(o => /^machineBadge_/.test(o.name)).map(o => [o.name.slice(13), o.userData.key, o.userData.game]);
    return {
      name: c.name, wall: c.userData.wall, idx: c.userData.index, x: +c.position.x.toFixed(2), z: +c.position.z.toFixed(2),
      blank: A.cabinets.some(k => k.position.distanceTo(c.position) < 0.5),
      parts: ['body', 'sidePanelL', 'sidePanelR', 'trim', 'marquee', 'screen', 'joystick', 'btnFly', 'btnFire', 'coinDoor'].every(k => !!c.getObjectByName(k)),
      visit: !!(c.userData.visit), aspect: c.userData.aspect, machine: !!A.play.machines.skytower,
      cache: document.querySelector('script') && true,
      bs, eLetter: bs.some(b => b[0] === 'E' && b[1] === '2:2')
    };
  });
  chk(!s.missing && s.name === 'skyTowerCabinet' && s.wall === 'south' && s.idx === 2 && s.x === 0 && s.z > 11 && !s.blank,
    'SKY TOWER replaces blank E on the south wall (x=' + s.x + ', z=' + s.z + ')');
  chk(s.parts && s.visit && s.machine && !s.eLetter, 'cabinet parts, attract visit flag, play machine, letter E retired ' + JSON.stringify(s));
  const bk = Object.fromEntries((s.bs || []).map(([t, k]) => [k, t]));
  chk(bk['2:2'] === '15' && bk['2:3'] === '14', 'NUMBERS: SKY TOWER = 15 next to ROCKFALL RUSH = 14');

  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 1; localStorage.setItem('neonarcade.tickets', '1'); p.machines.skytower.credits = 0; });
  await H.goTo('skyTowerCabinet');
  await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui();
  chk(p0.on && p0.txt === 'PLAY' && p0.near === 'skyTowerCabinet' && /5 TICKETS TO PLAY/.test(p0.cr),
    'PLAY prompt with 5 TICKETS TO PLAY ' + JSON.stringify(p0));

  await H.press();
  await page.waitForFunction(() => window.__arcade.play.mode === 'game' && window.__arcade.play.sub === 'demo' && document.getElementById('game').classList.contains('on'), null, { timeout: 150000 });
  await page.waitForFunction(W => { try { const w = eval(W); return !!(w.__skytower && w.__skytower.ready && w.__demo); } catch (e) { return false; } }, W, { timeout: 20000 });
  await page.waitForTimeout(400);

  const d = await page.evaluate(W => { const w = eval(W), S = w.__skytower;
    return { src: w.location.pathname, demo: !!w.__DEMO, scene: S.scene(), plat: S.platform, silent: !!w.__DEMO, cost: document.getElementById('dCost').textContent }; }, W);
  chk(/sky-tower-play/.test(d.src) && d.demo && d.scene === 'play' && d.cost === '5 TICKETS TO PLAY',
    'zoom lands in the silent SKY TOWER DEMO ' + JSON.stringify(d));

  const t0 = await page.evaluate(() => ({ ls: localStorage.getItem('neonarcade.tickets'), tot: window.__arcade.play.tickets.total }));
  const demoPay = await page.evaluate(W => { const w = eval(W); const n = w.__skytower.give(5, 'demo'); return { n, got: w.__TK.got, hi: localStorage.getItem('arcade_skytower_best') }; }, W);
  const t1 = await page.evaluate(() => ({ ls: localStorage.getItem('neonarcade.tickets'), tot: window.__arcade.play.tickets.total }));
  chk(demoPay.n === 0 && t1.ls === t0.ls && t1.tot === t0.tot, 'DEMO never pays tickets into the arcade ' + JSON.stringify([demoPay, t0, t1]));

  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 6; localStorage.setItem('neonarcade.tickets', '6'); });
  await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.skytower.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 1, 'INSERT 5 TICKETS -> CREDIT 1 (6 -> 1) ' + JSON.stringify(c));
  await page.evaluate(() => window.__arcade.play.tryPlay());
  await page.waitForTimeout(600);
  const g = await page.evaluate(W => { const w = eval(W), S = w.__skytower; return { scene: S.scene(), run: S.active(), demo: !!w.__DEMO, plat: S.platform, y: S.player.position.y }; }, W);
  chk(g.scene === 'play' && g.run && !g.demo, 'credit starts a real climb ' + JSON.stringify(g));

  const flew = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, y0 = S.player.position.y;
    S.fly(true);
    for (let i = 0; i < 45; i++) S.step(1 / 60);
    const y1 = S.player.position.y;
    S.fly(false);
    return { y0, y1, dy: y1 - y0, energy: S.energy };
  }, W);
  chk(flew.dy > 0.8, 'FLY lifts the player (dy=' + flew.dy.toFixed(2) + ') ' + JSON.stringify(flew));

  const shot = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, p = S.player.position;
    S.G.face = 0;
    const a = S.spawnAlien({ x: p.x + Math.sin(S.G.face) * 3.2, y: p.y + 1.15, z: p.z + Math.cos(S.G.face) * 3.2, r: 0.15 });
    const before = S.aliens.filter(x => x.alive).length;
    const L = S.fire();
    for (let i = 0; i < 30; i++) S.step(1 / 60);
    return { fired: !!L, before, alive: a.alive, after: S.aliens.filter(x => x.alive).length, lasers: S.lasers.length };
  }, W);
  chk(shot.fired && shot.before >= 1 && shot.alive === false, 'FIRE spawns a laser that destroys a Lego alien ' + JSON.stringify(shot));

  const col = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, p2 = S.platforms[1], under = p2.top - p2.h;
    S.placeOn(1);
    S.player.position.set(p2.x, under - S.PH - 0.25, p2.z);
    S.G.vx = 0; S.G.vz = 0; S.G.vy = 0; S.G.air = true; S.G.energy = 1;
    S.fly(true);
    let maxHead = -1e9;
    for (let i = 0; i < 90; i++) { S.step(1 / 30); maxHead = Math.max(maxHead, S.player.position.y + S.PH); }
    S.fly(false);
    return { maxHead, under, feet: S.player.position.y, vy: S.G.vy, ph: S.PH };
  }, W);
  chk(col.maxHead <= col.under + 0.06, 'thrusting up from under a platform does not pass through (head ' + col.maxHead.toFixed(2) + ' vs underside ' + col.under.toFixed(2) + ') ' + JSON.stringify(col));

  const side = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, p2 = S.platforms[1];
    const edge = p2.x + p2.size * 0.5 + S.R;
    S.placeOn(1);
    S.player.position.set(edge + 0.45, p2.top - 0.22, p2.z);
    S.G.vx = -6; S.G.vz = 0; S.G.vy = 0; S.G.air = true; S.G.ix = 0; S.G.iz = 0; S.G.joy.on = false;
    S.fly(false);
    for (let i = 0; i < 24; i++) S.step(1 / 30);
    return { x: S.player.position.x, edge, min: edge - 0.1, y: S.player.position.y, top: p2.top };
  }, W);
  chk(side.x >= side.min, 'approaching a platform from the side is blocked (x=' + side.x.toFixed(2) + ' edge=' + side.edge.toFixed(2) + ') ' + JSON.stringify(side));

  const land = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, p2 = S.platforms[1];
    S.placeOn(1);
    S.player.position.set(p2.x + p2.size * 0.5 + S.R + 0.85, p2.top + 1.05, p2.z);
    S.G.vx = -3.6; S.G.vz = 0; S.G.vy = 0; S.G.air = true; S.G.ix = 0; S.G.iz = 0; S.G.joy.on = false;
    S.fly(false);
    for (let i = 0; i < 55; i++) S.step(1 / 30);
    return { x: S.player.position.x, y: S.player.position.y, z: S.player.position.z, top: p2.top, plat: S.platform, air: S.G.air, px: p2.x, hs: p2.size * 0.5 };
  }, W);
  chk(Math.abs(land.y - land.top) < 0.12 && Math.abs(land.x - land.px) <= land.hs && land.plat >= 2,
    'flying around the edge lets you land on top ' + JSON.stringify(land));

  const stick = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    function snapCam(yaw) {
      const p = S.player.position, back = 5.1, height = 2.35;
      S.G.camYaw = yaw;
      S.camera.position.set(p.x - Math.sin(yaw) * back, p.y + height, p.z - Math.cos(yaw) * back);
      S.camera.lookAt(p.x, p.y + 1.15, p.z);
      S.camera.updateMatrixWorld(true);
    }
    function project(x, y, z) {
      const v = S.player.position.clone().set(x, y, z);
      v.project(S.camera);
      return { x: (v.x * 0.5 + 0.5) * w.innerWidth, y: (-v.y * 0.5 + 0.5) * w.innerHeight };
    }
    function run(kind, yaw, sx, sy, ix, iz) {
      S.placeOn(1);
      S.G.face = 0; S.G.vx = 0; S.G.vz = 0; S.G.vy = 0; S.G.air = false;
      S.G.ix = 0; S.G.iz = 0; S.G.joy.on = false; S.G.joy.x = 0; S.G.joy.y = 0;
      S.player.rotation.y = 0;
      snapCam(yaw);
      S.G.shotLock = true;
      const p = S.player.position, x0 = p.x, y0 = p.y, z0 = p.z, yaw0 = S.G.camYaw;
      const s0 = project(x0, y0, z0);
      const pts = [[x0, z0]];
      if (kind === 'joy') { S.G.joy.on = true; S.G.joy.x = sx; S.G.joy.y = sy; }
      else { S.G.ix = ix; S.G.iz = iz; }
      for (let i = 0; i < 30; i++) { S.step(1 / 30); pts.push([p.x, p.z]); }
      S.G.joy.on = false; S.G.joy.x = 0; S.G.joy.y = 0; S.G.ix = 0; S.G.iz = 0;
      const x1 = p.x, z1 = p.z, dx = x1 - x0, dz = z1 - z0, disp = Math.hypot(dx, dz);
      const s1 = project(x1, p.y, z1);
      let maxDev = 0;
      for (const [x, z] of pts) {
        const t = disp > 1e-6 ? ((x - x0) * dx + (z - z0) * dz) / (disp * disp) : 0;
        maxDev = Math.max(maxDev, Math.hypot(x - (x0 + t * dx), z - (z0 + t * dz)));
      }
      const faceDot = disp > 1e-6 ? (Math.sin(S.G.face) * dx + Math.cos(S.G.face) * dz) / disp : 0;
      S.G.shotLock = false;
      return { disp, dYaw: S.G.camYaw - yaw0, maxDev, dx, dz, dsx: s1.x - s0.x, dsy: s1.y - s0.y, faceDot, s0, s1 };
    }
    const yaw0 = 0, orbit = Math.PI / 2;
    return {
      joyUp: run('joy', yaw0, 0, -1, 0, 0),
      joyDown: run('joy', yaw0, 0, 1, 0, 0),
      joyRight: run('joy', yaw0, 1, 0, 0, 0),
      joyLeft: run('joy', yaw0, -1, 0, 0, 0),
      keyUp: run('key', yaw0, 0, 0, 0, -1),
      keyDown: run('key', yaw0, 0, 0, 0, 1),
      keyRight: run('key', yaw0, 0, 0, 1, 0),
      keyLeft: run('key', yaw0, 0, 0, -1, 0),
      orbitJoyUp: run('joy', orbit, 0, -1, 0, 0),
      orbitJoyRight: run('joy', orbit, 1, 0, 0, 0),
      orbitKeyUp: run('key', orbit, 0, 0, 0, -1),
      orbitKeyRight: run('key', orbit, 0, 0, 1, 0)
    };
  }, W);
  const straight = r => r.disp > 2 && Math.abs(r.dYaw) < 0.08 && r.maxDev < 0.45 && r.faceDot > 0.85;
  const goesUp = r => straight(r) && r.dsy < -25;
  const goesDown = r => straight(r) && r.dsy > 25;
  const goesRight = r => straight(r) && r.dsx > 25;
  const goesLeft = r => straight(r) && r.dsx < -25;
  chk(goesUp(stick.joyUp), 'joystick up walks away from the camera (screen y decreases) ' + JSON.stringify(stick.joyUp));
  chk(goesDown(stick.joyDown), 'joystick down walks toward the camera (screen y increases) ' + JSON.stringify(stick.joyDown));
  chk(goesRight(stick.joyRight), 'joystick right walks to screen-right (screen x increases) ' + JSON.stringify(stick.joyRight));
  chk(goesLeft(stick.joyLeft), 'joystick left walks to screen-left (screen x decreases) ' + JSON.stringify(stick.joyLeft));
  chk(goesUp(stick.keyUp), 'W / up-arrow walks away from the camera ' + JSON.stringify(stick.keyUp));
  chk(goesDown(stick.keyDown), 'S / down-arrow walks toward the camera ' + JSON.stringify(stick.keyDown));
  chk(goesRight(stick.keyRight), 'D / right-arrow walks to screen-right ' + JSON.stringify(stick.keyRight));
  chk(goesLeft(stick.keyLeft), 'A / left-arrow walks to screen-left ' + JSON.stringify(stick.keyLeft));
  chk(goesUp(stick.orbitJoyUp) && goesUp(stick.orbitKeyUp), 'after orbiting the camera, stick-up and W still decrease screen y ' + JSON.stringify({ joy: stick.orbitJoyUp, key: stick.orbitKeyUp }));
  chk(goesRight(stick.orbitJoyRight) && goesRight(stick.orbitKeyRight), 'after orbiting the camera, stick-right and D still increase screen x ' + JSON.stringify({ joy: stick.orbitJoyRight, key: stick.orbitKeyRight }));


  const adv = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, p0 = S.platform;
    S.placeOn(12);
    const txt = w.document.getElementById('plat').textContent;
    return { p0, p1: S.platform, txt };
  }, W);
  chk(adv.p1 === 12 && /12\/50/.test(adv.txt), 'platform counter advances to 12/50 ' + JSON.stringify(adv));

  const win = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    S.placeOn(50);
    for (let i = 0; i < 8; i++) S.step(1 / 60);
    return { plat: S.platform, won: S.won, scene: S.scene(), earth: !!(S.earth && S.earth.visible), banner: w.document.getElementById('banner').textContent };
  }, W);
  chk(win.plat === 50 && win.won && win.scene === 'over' && win.earth, 'platform 50 finishes in space with Earth below ' + JSON.stringify(win));

  const paid = await page.evaluate(W => { const w = eval(W); return { run: w.__TK.run, log: w.__TK.log.slice(), arcade: window.__arcade.play.tickets.total }; }, W);
  chk(paid.run >= 7 && paid.arcade === 1 + paid.run, 'win tickets bank in the arcade only (' + JSON.stringify(paid) + ')');

  const leak = await page.evaluate(() => ({
    origHi: localStorage.getItem('skytower_best'),
    arcadeHi: localStorage.getItem('arcade_skytower_best'),
    tickets: localStorage.getItem('neonarcade.tickets')
  }));
  chk(leak.origHi === null, 'no tickets or scores leak into a standalone / original key ' + JSON.stringify(leak));

  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 4).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.stack); process.exit(1); });
