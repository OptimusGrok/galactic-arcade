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
  // random gusts are covered by their own block below; keep the physics checks deterministic
  await page.evaluate(W => { const S = eval(W).__skytower; S.G.wind.lock = true; S.G.wind.phase = 'calm'; S.G.wind.k = 0; }, W);

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

  const pitch = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    S.G.camPitch = 0; S.G.camYaw = 0;
    S.lookDrag(0, -80);
    const afterUp = S.G.camPitch, yawAfterUp = S.G.camYaw;
    S.lookDrag(0, -8000);
    const atMax = S.G.camPitch;
    S.lookDrag(0, 16000);
    const atMin = S.G.camPitch;
    S.G.camYaw = 0;
    S.lookDrag(40, 0);
    return { afterUp, yawAfterUp, atMax, atMin, yaw: S.G.camYaw, pmin: S.PITCH_MIN, pmax: S.PITCH_MAX };
  }, W);
  chk(pitch.afterUp > 0.3 && pitch.afterUp < pitch.pmax && Math.abs(pitch.yawAfterUp) < 1e-6,
    'vertical swipe up tilts the camera upward ' + JSON.stringify(pitch));
  chk(Math.abs(pitch.atMax - pitch.pmax) < 1e-6, 'pitch clamps at the upper limit ' + JSON.stringify(pitch));
  chk(Math.abs(pitch.atMin - pitch.pmin) < 1e-6, 'pitch clamps at the lower limit ' + JSON.stringify(pitch));
  chk(Math.abs(pitch.yaw + 40 * 0.0055) < 1e-6, 'horizontal drag still orbits yaw ' + JSON.stringify(pitch));

  const gun = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    S.placeOn(1);
    S.G.face = 0.15; S.player.rotation.y = 0.15;
    S.G.hold = false; S.G.cooldown = 9; S.G.shotLock = true;
    S.G.fireHeld = false; S.G.gunAim = 0; S.G.gunAimT = 0;
    S.step(1 / 30);
    const u = S.player.userData;
    const restX = u.arms[1].sh.rotation.x, restAim = S.G.gunAim;
    S.G.fireHeld = true;
    S.step(1 / 30);
    const midX = u.arms[1].sh.rotation.x, midAim = S.G.gunAim;
    S.G.cooldown = 0;
    for (let i = 0; i < 16; i++) S.step(1 / 30);
    const aimX = u.arms[1].sh.rotation.x, aimBlend = S.G.gunAim;
    S.player.updateMatrixWorld(true);
    const muz = S.player.position.clone();
    if (u.muzzle) u.muzzle.getWorldPosition(muz);
    S.G.cooldown = 0;
    const L = S.fire();
    const dist = L ? L.mesh.position.distanceTo(muz) : 99;
    const barrel = S.gunBarrelDir();
    const shot = { x: Math.sin(S.G.face), y: 0.02, z: Math.cos(S.G.face) };
    const sl = Math.hypot(shot.x, shot.y, shot.z) || 1;
    const dot = (barrel.x * shot.x + barrel.y * shot.y + barrel.z * shot.z) / sl;
    const shotAng = Math.acos(Math.min(1, Math.max(-1, dot)));
    S.G.fireHeld = false; S.G.gunAimT = 0;
    S.step(1 / 30);
    const downX = u.arms[1].sh.rotation.x, downAim = S.G.gunAim;
    for (let i = 0; i < 22; i++) S.step(1 / 30);
    const backX = u.arms[1].sh.rotation.x;
    return {
      char: u.char, hasGun: !!(u.gun && u.gun.visible), hasMuzzle: !!u.muzzle,
      color: L && L.color, dist,
      hex: L && L.mesh.material.color.getHexString(),
      restX, restAim, midX, midAim, aimX, aimBlend, downX, downAim, backX,
      shotAng, barrel: { x: +barrel.x.toFixed(3), y: +barrel.y.toFixed(3), z: +barrel.z.toFixed(3) },
      aimTime: S.GUN_AIM_TIME, restTarget: S.GUN_REST.shx, aimTarget: S.GUN_AIM.shx
    };
  }, W);
  chk(gun.char === 'monkey' && gun.hasGun && gun.hasMuzzle, 'monkey holds a visible chunky laser gun ' + JSON.stringify(gun));
  chk(gun.restX > -0.45 && gun.restAim < 0.08, 'monkey keeps the gun lowered at his side when not firing ' + JSON.stringify(gun));
  chk(gun.midAim > gun.restAim && gun.midAim < 0.95 && gun.midX < gun.restX && gun.midX > gun.aimX,
    'monkey raises the gun smoothly rather than snapping ' + JSON.stringify(gun));
  chk(gun.aimX < -1.0 && gun.aimBlend > 0.92, 'monkey aims the gun outward while firing ' + JSON.stringify(gun));
  chk(gun.color === 'cyan' && gun.dist < 0.55, 'monkey laser originates at the gun muzzle ' + JSON.stringify(gun));
  chk(gun.shotAng <= 15 * Math.PI / 180, 'monkey gun barrel points within 15° of the shot direction (' + (gun.shotAng * 180 / Math.PI).toFixed(1) + '°) ' + JSON.stringify(gun));
  chk(gun.downX > gun.aimX && gun.backX > -0.45, 'monkey lowers the gun back to his side after firing ' + JSON.stringify(gun));

  const flyTix = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    const live = S.tickets || [];
    const heights = live.map(t => t.sy || t.y);
    const yMin = heights.length ? Math.min.apply(null, heights) : 0;
    const yMax = heights.length ? Math.max.apply(null, heights) : 0;
    const p0 = S.platforms[0].top, pN = S.platforms[S.N - 1].top;
    S.placeOn(1);
    S.G.hold = false; S.G.shotLock = true; S.G.cooldown = 9; S.G.fireHeld = false;
    S.G.mode = 'play'; S.G.run = true; S.G.over = false; w.__DEMO = false;
    const before = { run: S.TK.run, fly: S.TK.fly, logN: S.TK.log.length, arcade: window.__arcade.play.tickets.total };
    const tHit = live[0], tBump = live[1];
    const restore = [];
    [tHit, tBump].forEach(t => { if (t) restore.push({ t, x: t.x, y: t.y, z: t.z, vx: t.vx, vy: t.vy, vz: t.vz, vis: t.mesh.visible, collected: t.collected }); });
    // contact: sit the player on a ticket and step without firing
    tBump.collected = false; tBump.alive = true; tBump.mesh.visible = true;
    tBump.x = S.player.position.x; tBump.y = S.player.position.y + 1.05; tBump.z = S.player.position.z;
    tBump.vx = tBump.vy = tBump.vz = 0;
    tBump.mesh.position.set(tBump.x, tBump.y, tBump.z);
    for (let i = 0; i < 8; i++) S.step(1 / 30);
    const afterBump = { collected: tBump.collected, run: S.TK.run, fly: S.TK.fly };
    // laser: put a ticket on the shot line and fire
    S.G.face = 0.2; S.player.rotation.y = 0.2;
    S.G.cooldown = 0; S.G.fireHeld = false;
    if (S.player.userData.char === 'monkey') { S.G.gunAim = 1; S.poseMonkeyGun(1); }
    S.player.updateMatrixWorld(true);
    const fx = Math.sin(S.G.face), fz = Math.cos(S.G.face);
    tHit.collected = false; tHit.alive = true; tHit.mesh.visible = true;
    tHit.x = S.player.position.x + fx * 2.1;
    tHit.y = S.player.position.y + 1.22;
    tHit.z = S.player.position.z + fz * 2.1;
    tHit.vx = tHit.vy = tHit.vz = 0;
    tHit.mesh.position.set(tHit.x, tHit.y, tHit.z);
    const L = S.fire();
    for (let i = 0; i < 12; i++) S.step(1 / 30);
    const afterShot = {
      collected: tHit.collected, run: S.TK.run, fly: S.TK.fly,
      log: S.TK.log.slice(), color: L && L.color, visible: tHit.mesh.visible
    };
    S.G.cooldown = 0;
    const L2 = S.fire();
    for (let i = 0; i < 10; i++) S.step(1 / 30);
    const afterSecond = { run: S.TK.run, fly: S.TK.fly };
    restore.forEach(r => {
      const t = r.t;
      t.x = r.x; t.y = r.y; t.z = r.z; t.vx = r.vx; t.vy = r.vy; t.vz = r.vz;
      t.collected = r.collected; t.alive = !r.collected; t.mesh.visible = r.vis;
      t.mesh.position.set(t.x, t.y, t.z);
    });
    for (const L of S.lasers) { L.alive = false; try { S.world.remove(L.mesh); } catch (e) {} }
    S.TK.run = before.run; S.TK.fly = before.fly; S.TK.log.length = before.logN;
    window.__arcade.play.tickets.total = before.arcade;
    try { localStorage.setItem('neonarcade.tickets', String(before.arcade)); } catch (e) {}
    S.G.shotLock = false; S.G.cooldown = 0; S.G.fireHeld = false;
    return {
      n: live.length, cap: S.RUN_CAP, value: S.FLY_TICKET_VALUE, named: S.FLY_TICKETS,
      yMin, yMax, p0, pN, before, afterBump, afterShot, afterSecond
    };
  }, W);
  chk(flyTix.n === 30 && flyTix.named === 30 && flyTix.value === 1 && flyTix.cap === 50,
    'about 30 flying tickets and a cap that fits them on top of checkpoints + win ' + JSON.stringify(flyTix));
  chk(flyTix.yMin > flyTix.p0 && flyTix.yMax < flyTix.pN + 8, 'tickets are spread along the climb ' + JSON.stringify({ yMin: flyTix.yMin, yMax: flyTix.yMax, p0: flyTix.p0, pN: flyTix.pN }));
  chk(!flyTix.afterBump.collected && flyTix.afterBump.fly === flyTix.before.fly && flyTix.afterBump.run === flyTix.before.run,
    'flying into a ticket does not collect it ' + JSON.stringify(flyTix.afterBump));
  chk(flyTix.afterShot.collected && flyTix.afterShot.color === 'cyan' && !flyTix.afterShot.visible && flyTix.afterShot.fly === flyTix.before.fly + 1 && flyTix.afterShot.run === flyTix.before.run + 1,
    'a laser hit collects one ticket ' + JSON.stringify(flyTix.afterShot));
  chk(flyTix.afterSecond.fly === flyTix.afterShot.fly && flyTix.afterSecond.run === flyTix.afterShot.run,
    'a already-collected ticket is not awarded twice ' + JSON.stringify(flyTix.afterSecond));

  const layout = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    S.G.wind.lock = true; S.G.wind.phase = 'calm';
    const plats = S.platforms.map(p => ({ i: p.i, x: p.x, z: p.z, size: p.size, kind: p.kind, top: p.top, slide: p.slide || null }));
    const largeI = new Set([1, 11, 21, 31, 41, 50]);
    const large = plats.filter(p => largeI.has(p.i)).map(p => p.size);
    const small = plats.filter(p => !largeI.has(p.i) && p.kind === 'block').map(p => p.size);
    const restOf = p => p.slide ? { x: p.slide.ox, z: p.slide.oz } : { x: p.x, z: p.z };
    const maxT = 1 / S.FLY.drain, maxClimb = S.FLY.up * maxT, maxAir = (S.AIR_SPEED || 6.2) * maxT;
    let minXZ = 1e9, maxXZ = 0, minY = 1e9, maxY = 0, minAny = 1e9;
    const hops = [];
    for (let i = 0; i < plats.length - 1; i++) {
      const start = S.platforms[i], dest = S.platforms[i + 1];
      const a = restOf(start), b = restOf(dest);
      const centerXZ = Math.hypot(b.x - a.x, b.z - a.z), needY = dest.top - start.top;
      const amp = (start.slide ? start.slide.amp : 0) + (dest.slide ? dest.slide.amp : 0);
      const worstXZ = centerXZ + amp;
      const tEff = Math.max(needY / S.FLY.up, centerXZ / (S.AIR_SPEED || 6.2));
      const tWorst = Math.max(needY / S.FLY.up, worstXZ / (S.AIR_SPEED || 6.2));
      const fuelEff = tEff * S.FLY.drain, fuelWorst = tWorst * S.FLY.drain;
      const computed = fuelWorst <= 0.90 + 1e-6;
      hops.push({
        from: start.i, to: dest.i, computed, centerXZ: +centerXZ.toFixed(2), worstXZ: +worstXZ.toFixed(2),
        needY: +needY.toFixed(2), fuelEff: +fuelEff.toFixed(4), fuelWorst: +fuelWorst.toFixed(4), amp: +amp.toFixed(2)
      });
      minXZ = Math.min(minXZ, centerXZ); maxXZ = Math.max(maxXZ, centerXZ);
      minY = Math.min(minY, needY); maxY = Math.max(maxY, needY);
    }
    for (let i = 0; i < plats.length; i++) {
      const a = restOf(S.platforms[i]);
      for (let j = i + 2; j < plats.length; j++) {
        const b = restOf(S.platforms[j]);
        minAny = Math.min(minAny, Math.hypot(b.x - a.x, b.z - a.z));
      }
    }
    S.G.reached = 1; S.G.check = 1; S.G.won = false; S.G.over = false; S.G.mode = 'play';
    S.placeOn(1);
    S.G.energy = 1; S.G.hp = 3;
    for (let i = 0; i < 4; i++) S.spawnAlien({ x: S.player.position.x + 2.4 + i * 0.4, y: S.player.position.y + 1.25, z: S.player.position.z + 0.2, r: 0.15 });
    for (const a of S.aliens) a.fireT = 0;
    const hp0 = S.G.hp, shots0 = S.shots.length;
    for (let i = 0; i < 150; i++) S.step(1 / 30);
    const fuelEffs = hops.map(h => h.fuelEff), fuelWorsts = hops.map(h => h.fuelWorst);
    // worst gust: full strength at the top, straight against the hop, for its whole length while steering (air relax rate 3/s)
    const Wd = S.WIND, gustA = S.windAccelAt(1, true, Wd.str1), drift = gustA / 3;
    const windFuel = (drift * Wd.dur1 / (S.AIR_SPEED || 6.2)) * S.FLY.drain;
    return {
      n: plats.length,
      minXZ, maxXZ, minY, maxY, minAny,
      largeMin: Math.min(...large), largeMax: Math.max(...large),
      smallMin: Math.min(...small), smallMax: Math.max(...small),
      large, smallMinR: +Math.min(...small).toFixed(3), smallMaxR: +Math.max(...small).toFixed(3),
      hopsFailed: hops.filter(h => !h.computed),
      hopsOk: hops.every(h => h.computed),
      hopCount: hops.length,
      easyFuel: fuelEffs[0],
      hardFuel: Math.max(...fuelEffs),
      hardestWorst: Math.max(...fuelWorsts),
      shotsBefore: shots0, shotsAfter: S.shots.length, aliveShots: S.shots.filter(s => s.alive).length,
      hp0, hp1: S.G.hp, maxClimb, maxAir, gustA, drift, windFuel
    };
  }, W);
  chk(layout.n === 50 && layout.minY > 13 && layout.maxY > 22 && layout.minXZ > 20,
    'platforms use ramped hard gaps ' + JSON.stringify({ minY: layout.minY, maxY: layout.maxY, minXZ: layout.minXZ, maxXZ: layout.maxXZ }));
  chk(layout.minXZ > 18 && layout.minAny > 8, 'no platforms are stacked above each other (consec xz ' + layout.minXZ.toFixed(2) + ', other xz ' + layout.minAny.toFixed(2) + ')');
  chk(layout.smallMax < layout.largeMin && layout.largeMin >= 9 && layout.smallMax < 3.4,
    'checkpoints stay large and the other pads are a few studs wide ' + JSON.stringify({ large: layout.large, smallMin: layout.smallMinR, smallMax: layout.smallMaxR }));
  chk(layout.hopsOk && layout.hopCount === 49 && layout.hardestWorst <= 0.90 + 1e-6,
    'every hop stays reachable in the worst moving-pad case (<=90% fuel) ' + JSON.stringify({ failed: layout.hopsFailed, easy: layout.easyFuel, hard: layout.hardFuel, worst: layout.hardestWorst }));
  chk(layout.hardestWorst + layout.windFuel <= 1.0,
    'worst hop + worst head-on gust still fits one tank (' + ((layout.hardestWorst + layout.windFuel) * 100).toFixed(1) + '%) ' + JSON.stringify({ gustA: +layout.gustA.toFixed(2), drift: +layout.drift.toFixed(2), windFuel: +layout.windFuel.toFixed(4) }));
  chk(layout.easyFuel >= 0.48 && layout.easyFuel <= 0.62,
    'early hops cost about 50-60% fuel (' + (layout.easyFuel * 100).toFixed(1) + '%)');
  chk(layout.hardFuel >= 0.80 && layout.hardFuel <= 0.90,
    'the hardest hop costs about 80-90% fuel (' + (layout.hardFuel * 100).toFixed(1) + '%, worst ' + (layout.hardestWorst * 100).toFixed(1) + '%)');
  chk(layout.shotsAfter === 0 && layout.aliveShots === 0 && layout.hp1 === layout.hp0,
    'aliens no longer shoot or deal projectile damage ' + JSON.stringify({ shots: layout.shotsAfter, hp0: layout.hp0, hp1: layout.hp1 }));

  const slide = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    const sliders = S.platforms.filter(p => p.slide);
    const bad = sliders.filter(p => S.isCheck(p.i) || p.i === 1 || p.i === S.N);
    const sl = sliders[2] || sliders[0];
    S.placeOn(sl.i);
    S.G.ix = 0; S.G.iz = 0; S.G.joy.on = false; S.fly(false);
    S.G.vx = 0; S.G.vz = 0; S.G.energy = 1; S.G.hold = false; S.G.shotLock = true;
    const px0 = S.player.position.x, pz0 = S.player.position.z;
    const sx0 = sl.x, sz0 = sl.z;
    let frames = 0, moved = 0;
    for (; frames < 180; frames++) {
      S.step(1 / 30);
      moved = Math.hypot(sl.x - sx0, sl.z - sz0);
      if (moved > 0.85) break;
    }
    const pdx = S.player.position.x - px0, pdz = S.player.position.z - pz0;
    const sdx = sl.x - sx0, sdz = sl.z - sz0;
    return {
      n: sliders.length, bad: bad.map(p => p.i), i: sl.i, frames, moved,
      carry: Math.hypot(pdx - sdx, pdz - sdz),
      air: S.G.air, yErr: Math.abs(S.player.position.y - sl.top),
      axes: sliders.slice(0, 8).map(p => p.slide.axis)
    };
  }, W);
  chk(slide.n >= 12 && slide.bad.length === 0, 'small non-checkpoint pads slide side to side ' + JSON.stringify(slide));
  chk(slide.moved > 0.85 && slide.carry < 0.35 && !slide.air && slide.yErr < 0.2,
    'standing on a moving pad carries the player without falling off ' + JSON.stringify(slide));
  chk(slide.axes.includes('x') && slide.axes.includes('z'), 'moving pads vary axis ' + JSON.stringify(slide.axes));

  const shapes = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    S.G.wind.lock = true; S.G.wind.phase = 'calm';
    const P = S.platforms;
    const tiny = P.filter(p => p.kind === 'tiny'), beam = P.filter(p => p.kind === 'beam');
    const checksBlock = P.filter(p => S.isCheck(p.i) || p.i === 1 || p.i === S.N).every(p => p.kind === 'block' && p.sx === p.sz && p.sx >= 9);
    const tinyMax = Math.max(...tiny.map(p => Math.max(p.sx, p.sz))), tinyMin = Math.min(...tiny.map(p => Math.min(p.sx, p.sz)));
    const beamRatio = Math.min(...beam.map(p => Math.max(p.sx, p.sz) / Math.min(p.sx, p.sz)));
    const beamW = Math.max(...beam.map(p => Math.min(p.sx, p.sz))), beamL = Math.min(...beam.map(p => Math.max(p.sx, p.sz)));
    const axes = Array.from(new Set(beam.map(p => p.along)));
    const slidingOdd = P.filter(p => p.slide && p.kind !== 'block').map(p => p.i + p.kind[0]);
    const noSpinTiny = tiny.every(p => !p.traps.some(tr => tr.type === 'spinner' || tr.type === 'wind'));
    // drop onto a tiny pad from 2m up: lands and stays on top
    const land = (p, ox, oz) => {
      S.placeOn(p.i); S.G.hold = false; S.G.shotLock = true; S.fly(false); S.G.ix = S.G.iz = 0; S.G.joy.on = false;
      if (p.slide) { p.slide.speed0 = p.slide.speed; p.slide.speed = 0; }
      S.player.position.set(p.x + ox, p.top + 2, p.z + oz); S.G.air = true; S.G.vx = S.G.vz = S.G.vy = 0;
      for (let i = 0; i < 70; i++) S.step(1 / 30);
      const r = { i: p.i, kind: p.kind, air: S.G.air, onPad: S.G.onPad && S.G.onPad.i, dy: +(S.player.position.y - p.top).toFixed(3) };
      if (p.slide) p.slide.speed = p.slide.speed0;
      return r;
    };
    const t0 = tiny.find(p => !p.slide) || tiny[0], b0 = beam.find(p => !p.slide) || beam[0];
    const bOff = 0.8 * Math.max(b0.sx, b0.sz) * 0.5;
    const tinyLand = land(t0, 0.1, -0.1);
    const beamEnd = land(b0, b0.along === 'x' ? bOff : 0, b0.along === 'z' ? -bOff : 0);
    const beamMiss = land(b0, b0.along === 'x' ? 0 : 1.3, b0.along === 'z' ? 0 : 1.3);   // beside a thin beam -> falls past it
    return { tiny: tiny.length, beam: beam.length, blocks: P.filter(p => p.kind === 'block').length, checksBlock, tinyMax, tinyMin, beamRatio, beamW, beamL, axes, slidingOdd, noSpinTiny, tinyLand, beamEnd, beamMiss };
  }, W);
  chk(shapes.tiny >= 5 && shapes.tinyMax <= 1.2 && shapes.tinyMin >= 0.95, 'some pads are really small (single-foot) ' + JSON.stringify({ n: shapes.tiny, min: shapes.tinyMin, max: shapes.tinyMax }));
  chk(shapes.beam >= 5 && shapes.beamRatio >= 5 && shapes.beamW <= 1.0 && shapes.axes.length === 2, 'some pads are long thin beams in both orientations ' + JSON.stringify({ n: shapes.beam, ratio: shapes.beamRatio, w: shapes.beamW, minL: shapes.beamL, axes: shapes.axes }));
  chk(shapes.checksBlock, 'checkpoints, start and finish stay large square pads');
  chk(shapes.slidingOdd.length >= 2, 'sliding pads include tiny / beam shapes ' + JSON.stringify(shapes.slidingOdd));
  chk(shapes.noSpinTiny, 'tiny pads never carry a spinner or a wind trap');
  chk(!shapes.tinyLand.air && shapes.tinyLand.onPad === shapes.tinyLand.i && Math.abs(shapes.tinyLand.dy) < 0.05, 'a tiny pad is landable ' + JSON.stringify(shapes.tinyLand));
  chk(!shapes.beamEnd.air && shapes.beamEnd.onPad === shapes.beamEnd.i && Math.abs(shapes.beamEnd.dy) < 0.05, 'the far end of a beam is solid ' + JSON.stringify(shapes.beamEnd));
  chk(shapes.beamMiss.onPad !== shapes.beamMiss.i, 'beside a thin beam there is no invisible floor ' + JSON.stringify(shapes.beamMiss));

  const wind = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, Wd = S.WIND, snd = S.snd || w.__skySnd;
    const big = S.platforms[20];
    const reset = i => { S.placeOn(i); S.G.hold = false; S.G.shotLock = true; S.fly(false); S.G.ix = S.G.iz = 0; S.G.joy.on = false; S.G.vx = S.G.vz = 0; };
    // natural scheduler: calm -> telegraph (warn) -> gust -> calm
    reset(21); S.G.wind.lock = false; S.G.wind.phase = 'calm'; S.G.wind.t = 0; S.G.wind.next = 0.2;
    const wh0 = snd ? snd.whooshes : 0; if (snd) snd.lastWhoosh = -99;
    const seen = []; let warnForce = 0, sawStreaks = 0, hudWarn = false, hudGust = false, arrow = '';
    for (let i = 0; i < 30 * 7; i++) {
      S.step(1 / 30);
      const st = S.G.wind;
      if (seen[seen.length - 1] !== st.phase) seen.push(st.phase);
      if (st.phase === 'warn') { warnForce = Math.max(warnForce, st.accel); hudWarn = hudWarn || w.document.getElementById('windHud').classList.contains('warn'); }
      if (st.phase === 'gust') { hudGust = hudGust || w.document.getElementById('windHud').classList.contains('on'); arrow = w.document.getElementById('windArrow').style.transform; }
      if (st.phase !== 'calm') sawStreaks = Math.max(sawStreaks, S.world.children.filter(o => o.renderOrder === 4 && o.visible).length);
      if (seen.length >= 4) break;
    }
    const whooshed = snd ? snd.whooshes - wh0 : -1;
    // forced full gust +x: air vs ground push
    S.G.wind.lock = false;
    reset(21); S.player.position.y = big.top + 6; S.G.air = true;
    S.windGust({ dx: 1, dz: 0, str: 1, phase: 'gust', t: 1, dur: 10 });
    const ax0 = S.player.position.x; let airA = 0;
    for (let i = 0; i < 15; i++) { S.step(1 / 30); airA = Math.max(airA, S.G.wind.accel); }
    const airDx = S.player.position.x - ax0;
    reset(21); S.windGust({ dx: 1, dz: 0, str: 1, phase: 'gust', t: 1, dur: 10 });
    const gx0 = S.player.position.x; let gA = 0;
    for (let i = 0; i < 15; i++) { S.step(1 / 30); gA = Math.max(gA, S.G.wind.accel); }
    const groundDx = S.player.position.x - gx0;
    // standing still on a tiny pad through a whole full-strength gust: stays on
    const tiny = S.platforms.filter(p => p.kind === 'tiny' && !p.slide).pop();
    S.G.check = 1; reset(tiny.i); S.windGust({ dx: 0, dz: 1, str: 1, phase: 'gust', t: Wd.rampIn, dur: Wd.dur1 });
    for (let i = 0; i < Math.ceil(Wd.dur1 * 30); i++) S.step(1 / 30);
    const tinyHold = { onPad: S.G.onPad && S.G.onPad.i, i: tiny.i, air: S.G.air, off: +Math.hypot(S.player.position.x - tiny.x, S.player.position.z - tiny.z).toFixed(3) };
    const lowA = S.windAccelAt(0, true, 1), highA = S.windAccelAt(1, true, 1);
    S.G.wind.lock = true; S.G.wind.phase = 'calm'; S.G.wind.k = 0; S.drawWind();
    return { seen, warnForce, sawStreaks, hudWarn, hudGust, arrow, whooshed, airA, airDx, gA, groundDx, tinyHold, lowA, highA, hudAfter: w.document.getElementById('windHud').classList.contains('on') };
  }, W);
  chk(wind.seen.join('>') === 'calm>warn>gust>calm', 'random gusts cycle calm > warn > gust > calm ' + JSON.stringify(wind.seen));
  chk(wind.warnForce === 0 && wind.hudWarn && wind.sawStreaks >= 10 && wind.whooshed === 1,
    'each gust is telegraphed first (blinking WIND arrow, streaks, one whoosh, no push yet) ' + JSON.stringify({ f: wind.warnForce, hud: wind.hudWarn, streaks: wind.sawStreaks, whoosh: wind.whooshed }));
  chk(wind.hudGust && /rotate\(/.test(wind.arrow), 'WIND arrow shows the gust direction ' + wind.arrow);
  chk(wind.airDx > 0.12 && wind.airA > 0, 'a gust pushes the player in the air ' + JSON.stringify({ dx: wind.airDx, a: wind.airA }));
  chk(wind.groundDx >= 0 && wind.groundDx < wind.airDx * 0.5 && wind.gA < wind.airA * 0.5, 'ground push is much weaker than air push ' + JSON.stringify({ air: wind.airDx, ground: wind.groundDx, aAir: wind.airA, aGround: wind.gA }));
  chk(wind.tinyHold.onPad === wind.tinyHold.i && !wind.tinyHold.air, 'a full gust does not shove you off a tiny pad while standing ' + JSON.stringify(wind.tinyHold));
  chk(wind.highA > wind.lowA * 1.8, 'gusts ramp with height ' + JSON.stringify({ low: wind.lowA, high: wind.highA }));
  chk(!wind.hudAfter, 'WIND indicator hides when calm');

  // t736u: day/night cycle by height (night + moon at 10/30/50, day at 20/40, dusk/dawn half-way)
  const sky = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    S.G.wind.lock = true; S.G.wind.phase = 'calm'; S.G.wind.k = 0;
    const at = i => { S.G.check = 1; S.placeOn(i); S.G.hold = false; S.G.shotLock = true; S.fly(false); S.G.ix = S.G.iz = 0; S.G.joy.on = false; S.step(1 / 30); const k = S.sky, b = S.world.background;
      return { i, level: +k.level.toFixed(3), n: +k.night.toFixed(3), phase: k.phase, sun: +k.sun.toFixed(3), moon: +k.moon.toFixed(3), stars: +k.stars.toFixed(2), mv: k.moonVisible, space: +k.space.toFixed(2), lum: +(0.3 * b.r + 0.59 * b.g + 0.11 * b.b).toFixed(3) }; };
    const nights = [10, 30, 50].map(at), days = [20, 40].map(at), mids = [5, 15, 25, 35, 45].map(at);
    // smooth with height: sweep from platform 1 to 50 in small height steps, sky never jumps
    let maxStep = 0, mono = true, prevL = -1, prevN = null;
    const y0 = S.platforms[0].top, y1 = S.platforms[S.N - 1].top;
    for (let k = 0; k <= 2000; k++) {
      const y = y0 + (y1 - y0) * k / 2000; S.player.position.y = y; const r = S.setSky(1 / 30);
      if (r.level < prevL - 1e-9) mono = false; prevL = r.level;
      if (prevN != null) maxStep = Math.max(maxStep, Math.abs(r.night - prevN)); prevN = r.night;
    }
    // between platform 9 and 10 (in the air) it is mid-way between their skies, not snapped to either
    const p9 = S.platforms[8], p10 = S.platforms[9];
    S.player.position.y = (p9.top + p10.top) / 2; const half = S.setSky(1 / 30);
    // fall from high up: respawn at the checkpoint and the sky matches that height
    S.G.check = 1; S.placeOn(19); S.G.hold = false; S.G.mode = 'play'; S.G.run = true; S.G.shotLock = true; S.step(1 / 30);
    const before = { level: +S.sky.level.toFixed(2), n: +S.sky.night.toFixed(3), check: S.G.check };
    S.player.position.y = S.platforms[S.G.check - 1].top - 9; S.G.air = true; S.G.vy = -2;
    S.step(1 / 30);
    const after = { level: +S.sky.level.toFixed(2), n: +S.sky.night.toFixed(3), plat: S.platform, expect: +S.nightAt(S.levelAt(S.player.position.y)).toFixed(3) };
    return { nights, days, mids, maxStep: +maxStep.toFixed(4), mono, half: { level: +half.level.toFixed(2), n: +half.night.toFixed(3), n9: +S.nightAt(9).toFixed(3) }, before, after, cycle: S.SKY.cycle };
  }, W);
  console.log('sky', JSON.stringify(sky));
  chk(sky.cycle === 10 && sky.nights.every(r => Math.abs(r.level - r.i) < 0.02 && r.n > 0.99 && r.phase === 'night' && r.sun < 0.02 && r.moon > 0.95 && r.mv && r.stars > 0.95),
    'full night with only moonlight (no sun, moon + stars out) on platforms 10, 30 and 50 ' + JSON.stringify(sky.nights));
  chk(sky.days.every(r => r.n < 0.01 && r.phase === 'day' && r.sun > 0.6 && r.moon < 0.01 && !r.mv && r.stars < 0.05 && r.lum > 0.2),
    'full day again on platforms 20 and 40 ' + JSON.stringify(sky.days));
  chk(sky.mids.every(r => r.n > 0.4 && r.n < 0.6 && r.sun > 0.15 && r.sun < 0.9) && sky.mids.map(r => r.phase).join() === 'dusk,dawn,dusk,dawn,dusk',
    'half-way platforms 5/15/25/35/45 are dusk/dawn mid-transition ' + JSON.stringify(sky.mids.map(r => [r.i, r.n, r.phase])));
  chk(sky.nights[0].lum < sky.mids[0].lum && sky.mids[0].lum < sky.days[0].lum + 0.2 && sky.nights[2].space > 0.95 && sky.nights[2].lum < 0.02,
    'night sky is dark, and platform 50 blends into black space ' + JSON.stringify({ n10: sky.nights[0].lum, d5: sky.mids[0].lum, d20: sky.days[0].lum, n50: sky.nights[2].lum, space: sky.nights[2].space }));
  chk(sky.mono && sky.maxStep < 0.01, 'the sky follows height smoothly (no snap), max step ' + sky.maxStep);
  chk(sky.half.n > 0.8 && sky.half.n < 0.995 && sky.half.level > 9.3 && sky.half.level < 9.7, 'in the air between 9 and 10 the sky is part-way ' + JSON.stringify(sky.half));
  chk(sky.before.check === 11 && sky.before.n < 0.05 && sky.after.plat === 11 && Math.abs(sky.after.level - 11) < 0.05 && Math.abs(sky.after.n - sky.after.expect) < 0.002 && sky.after.n > 0.95,
    'falling from 19 respawns at checkpoint 11 and the sky matches that height (night again) ' + JSON.stringify({ before: sky.before, after: sky.after }));

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

  const music = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower, snd = S.snd || w.__skySnd;
    if (!snd) return { missing: true };
    snd.stop();
    const afterStop = { playing: !!snd.playing, stops: snd.stops };
    snd.unlock();
    snd.start();
    const afterStart = { playing: !!snd.playing, starts: snd.starts, unlocked: !!snd.unlocked };
    S.placeOn(1);
    S.G.hold = false; S.G.shotLock = true; S.G.cooldown = 0;
    S.G.mode = 'play'; S.G.run = true; S.G.over = false; w.__DEMO = false;
    S.G.fireHeld = false;
    if (S.player.userData.char === 'monkey') { S.G.gunAim = 1; S.poseMonkeyGun(1); }
    S.player.updateMatrixWorld(true);
    snd.lastZap = -99;
    const z0 = snd.zaps, c0 = snd.zapCyan;
    const L = S.fire();
    const afterFire = { zaps: snd.zaps, cyan: snd.zapCyan, color: L && L.color, dZ: snd.zaps - z0, dC: snd.zapCyan - c0 };
    const L2 = S.fire();
    const afterRapidFire = { fired: !!L2, zaps: snd.zaps, same: snd.zaps === afterFire.zaps };
    snd.lastZap = 0;
    const z1 = snd.zaps;
    snd.zap('cyan'); snd.zap('cyan');
    const afterThrottle = { d: snd.zaps - z1 };
    const ch0 = snd.chimes;
    const tix = S.tickets[2];
    w.__DEMO = true;
    if (tix) { tix.collected = false; tix.alive = true; tix.mesh.visible = true; S.collectFlyTicket(tix); }
    w.__DEMO = false;
    const afterChime = { d: snd.chimes - ch0 };
    snd.tick(0);
    const spaceLow = snd.space;
    snd.tick(1);
    const spaceHigh = snd.space;
    w.dispatchEvent(new Event('pagehide'));
    const afterHide = { playing: !!snd.playing, stops: snd.stops };
    snd.start();
    const musicWas = window.__music.on;
    window.__music.on = false;
    snd.tick(snd.space);
    const afterMusicOff = { playing: !!snd.playing };
    window.__music.on = musicWas;
    snd.start();
    const afterMusicOn = { playing: !!snd.playing };
    const mode0 = window.__arcade.play.mode;
    window.__arcade.play.mode = 'zoomOut';
    snd.tick(snd.space);
    const afterExit = { playing: !!snd.playing };
    window.__arcade.play.mode = mode0;
    snd.start();
    return {
      afterStop, afterStart, afterFire, afterRapidFire, afterThrottle, afterChime,
      spaceLow, spaceHigh, afterHide, afterMusicOff, afterMusicOn, afterExit
    };
  }, W);
  // t737u: random bass layer under the score
  const bass = await page.evaluate(async W => {
    const w = eval(W), S = w.__skytower, snd = S.snd || w.__skySnd;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    window.__music.on = true; window.__arcade.play.mode = 'game';
    S.G.check = 1; S.placeOn(1); S.G.hold = false; S.step(1 / 30);
    snd.stop(); snd.unlock(); snd.start();
    const T = snd.tap(), an = T.ac.createAnalyser(); an.fftSize = 4096; T.bass.connect(an);
    const an2 = T.ac.createAnalyser(); an2.fftSize = 4096; T.master.connect(an2);
    const n0 = snd.bassNotes, bars0 = snd.bassBars;
    let peakRms = 0, lowShare = 0;
    const buf = new Float32Array(an.fftSize), fb = new Float32Array(an.frequencyBinCount);
    for (let k = 0; k < 40; k++) {   // ~8 s of real time = 3+ bars at 100 bpm
      await wait(200);
      an.getFloatTimeDomainData(buf); let s2 = 0; for (const v of buf) s2 += v * v; const rms = Math.sqrt(s2 / buf.length);
      if (rms > peakRms) {
        peakRms = rms; an.getFloatFrequencyData(fb);
        const hz = i => i * T.ac.sampleRate / an.fftSize; let lo = 0, all = 0;
        for (let i = 1; i < fb.length; i++) { const e = Math.pow(10, fb[i] / 10); all += e; if (hz(i) < 300) lo += e; }
        lowShare = lo / (all || 1);
      }
    }
    const run1 = { notes: snd.bassNotes - n0, bars: snd.bassBars - bars0, log: snd.bassLog.slice(-24), pats: snd.bassPats.slice(), gain: +snd.bassGain.toFixed(3), mg: +snd.musicGain.toFixed(3), peakRms: +peakRms.toFixed(4), lowShare: +lowShare.toFixed(2), playing: snd.playing };
    // MUSIC off: score + bass silent, nothing new scheduled, SFX still work
    window.__music.on = false; snd.tick(snd.space); await wait(700);
    const nOff = snd.bassNotes; await wait(900);
    snd.lastZap = -99; const z0 = snd.zaps; snd.zap('cyan');
    const off = { playing: snd.playing, gain: +snd.bassGain.toFixed(4), newNotes: snd.bassNotes - nOff, zapped: snd.zaps - z0 };
    window.__music.on = true; snd.start(); await wait(400);
    // exit the cabinet: stops at once
    const nEx = snd.bassNotes; window.__arcade.play.mode = 'zoomOut'; snd.tick(snd.space); await wait(600);
    const nEx2 = snd.bassNotes; await wait(900);
    const exit = { playing: snd.playing, gain: +snd.bassGain.toFixed(4), newNotes: snd.bassNotes - nEx2 };
    window.__arcade.play.mode = 'game';
    // variation: many generated bars differ in rhythm / notes, and two fresh runs do not repeat
    const fresh = async ms => { snd.stop(); snd.start(); const l0 = snd.bassNotes, p0 = snd.bassPats.length; await wait(ms); const n = snd.bassNotes - l0; return { log: snd.bassLog.slice(-n).join(), pats: snd.bassPats.slice(p0) }; };
    const A1 = await fresh(9000), B1 = await fresh(9000);
    const runA = A1.log, runB = B1.log;
    const pats = new Set(A1.pats.concat(B1.pats, run1.pats)).size;
    // high up (the game feeds height into the music every frame): only the sparse rhythms
    S.G.check = 1; S.placeOn(47); S.G.hold = false; S.step(1 / 30);
    const H1 = await fresh(10000), hiPats = H1.pats, hiSpace = snd.space;
    S.G.check = 1; S.placeOn(1); S.G.hold = false; S.step(1 / 30);
    T.bass.disconnect(an); T.master.disconnect(an2);
    return { run1, off, exit, runA, runB, pats, hiPats, hiSpace: +hiSpace.toFixed(2), rests: snd.bassRests };
  }, W);
  console.log('bass', JSON.stringify(bass));
  chk(bass.run1.playing && bass.run1.notes >= 6 && bass.run1.bars >= 3 && bass.run1.gain > 0.2 && Math.abs(bass.run1.gain - bass.run1.mg) < 0.02,
    'random bass is scheduled with the score on the music bus ' + JSON.stringify({ notes: bass.run1.notes, bars: bass.run1.bars, gain: bass.run1.gain, music: bass.run1.mg }));
  chk(bass.run1.peakRms > 0.01 && bass.run1.lowShare > 0.6 && bass.run1.log.every(f => f >= 30 && f <= 150),
    'the bass is audible and low (in-key notes 30-150 Hz) ' + JSON.stringify({ rms: bass.run1.peakRms, lowShare: bass.run1.lowShare, notes: bass.run1.log }));
  chk(bass.pats >= 3 && bass.runA.length > 0 && bass.runB.length > 0 && bass.runA !== bass.runB, 'the bass line varies between bars and between runs ' + JSON.stringify({ rhythms: bass.pats, a: bass.runA, b: bass.runB }));
  chk(bass.hiSpace > 0.7 && bass.hiPats.length >= 1 && bass.hiPats.every(p => (p.match(/[^-]/g) || []).length <= 3), 'near space the bass thins out to sparse notes ' + JSON.stringify({ space: bass.hiSpace, pats: bass.hiPats }));
  chk(!bass.off.playing && bass.off.gain < 0.01 && bass.off.newNotes === 0 && bass.off.zapped === 1, 'MUSIC off silences the bass too, SFX still play ' + JSON.stringify(bass.off));
  chk(!bass.exit.playing && bass.exit.gain < 0.01 && bass.exit.newNotes === 0, 'leaving the cabinet stops the bass immediately ' + JSON.stringify(bass.exit));
  chk(!music.missing, 'Sky Tower exposes a WebAudio snd API');
  chk(music.afterStop && music.afterStop.playing === false, 'music stop silences the soundtrack ' + JSON.stringify(music.afterStop));
  chk(music.afterStart && music.afterStart.playing && music.afterStart.starts > 0, 'music starts after unlock ' + JSON.stringify(music.afterStart));
  chk(music.afterFire && music.afterFire.dZ === 1 && music.afterFire.dC === 1 && music.afterFire.color === 'cyan',
    'monkey fire triggers the cyan blaster zap ' + JSON.stringify(music.afterFire));
  chk(music.afterRapidFire && !music.afterRapidFire.fired && music.afterRapidFire.same,
    'game cooldown prevents a second zap ' + JSON.stringify(music.afterRapidFire));
  chk(music.afterThrottle && music.afterThrottle.d === 1, 'rapid zap API is throttled ' + JSON.stringify(music.afterThrottle));
  chk(music.afterChime && music.afterChime.d === 1, 'collecting a ticket plays a chime ' + JSON.stringify(music.afterChime));
  chk(music.spaceLow < 0.15 && music.spaceHigh > 0.85, 'soundtrack gets spacey toward the top ' + JSON.stringify({ lo: music.spaceLow, hi: music.spaceHigh }));
  chk(music.afterHide && music.afterHide.playing === false, 'pagehide stops the soundtrack ' + JSON.stringify(music.afterHide));
  chk(music.afterMusicOff && music.afterMusicOff.playing === false && music.afterMusicOn && music.afterMusicOn.playing,
    'MUSIC option silences and restores the soundtrack ' + JSON.stringify({ off: music.afterMusicOff, on: music.afterMusicOn }));
  chk(music.afterExit && music.afterExit.playing === false, 'leaving the cabinet stops the soundtrack ' + JSON.stringify(music.afterExit));

  await page.evaluate(() => {
    localStorage.setItem('galacticarcade.player.char', 'alien');
    try {
      const o = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}');
      o.char = 'alien';
      localStorage.setItem('galacticarcade.player', JSON.stringify(o));
    } catch (e) {}
    document.getElementById('game').contentWindow.location.reload();
  });
  await page.waitForFunction(W => {
    try {
      const w = eval(W);
      return !!(w.__skytower && w.__skytower.ready && w.__skytower.player && w.__skytower.player.userData.char === 'alien');
    } catch (e) { return false; }
  }, W, { timeout: 45000 });
  const alienFire = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    S.start();
    S.placeOn(1);
    S.G.face = 0.2; S.player.rotation.y = 0.2;
    S.G.hold = false; S.G.cooldown = 0; S.G.mode = 'play'; S.G.run = true; S.G.shotLock = true;
    S.G.fireHeld = false;
    S.step(1 / 30);
    S.player.updateMatrixWorld(true);
    const u = S.player.userData;
    const eye = S.player.position.clone();
    if (u.botEye) u.botEye.getWorldPosition(eye);
    const snd = S.snd || w.__skySnd;
    if (snd) snd.lastZap = -99;
    const r0 = snd ? snd.zapRed : 0;
    const L = S.fire();
    return {
      char: u.char, hasGun: !!u.gun, hasEye: !!u.botEye, hasBot: !!u.bot,
      color: L && L.color, dist: L && u.botEye ? L.mesh.position.distanceTo(eye) : 99,
      flash: S.G.orbFlash, hex: L && L.mesh.material.color.getHexString(),
      zapRed: !!(snd && snd.zapRed > r0), zapRedN: snd && snd.zapRed
    };
  }, W);
  chk(alienFire.char === 'alien' && alienFire.hasEye && alienFire.hasBot && !alienFire.hasGun,
    'alien has a floating orb and no hand gun ' + JSON.stringify(alienFire));
  chk(alienFire.color === 'red' && alienFire.dist < 0.6,
    'alien FIRE is a red laser from the orb eye ' + JSON.stringify(alienFire));
  chk(alienFire.zapRed, 'alien FIRE triggers the red orb zap sfx ' + JSON.stringify(alienFire));

  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 4).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.stack); process.exit(1); });
