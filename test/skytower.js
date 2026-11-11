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
      aimTime: S.GUN_AIM_TIME, restTarget: S.GUN_REST.shx, aimTarget: S.GUN_AIM.shx
    };
  }, W);
  chk(gun.char === 'monkey' && gun.hasGun && gun.hasMuzzle, 'monkey holds a visible chunky laser gun ' + JSON.stringify(gun));
  chk(gun.restX > -0.45 && gun.restAim < 0.08, 'monkey keeps the gun lowered at his side when not firing ' + JSON.stringify(gun));
  chk(gun.midAim > gun.restAim && gun.midAim < 0.95 && gun.midX < gun.restX && gun.midX > gun.aimX,
    'monkey raises the gun smoothly rather than snapping ' + JSON.stringify(gun));
  chk(gun.aimX < -1.0 && gun.aimBlend > 0.92, 'monkey aims the gun outward while firing ' + JSON.stringify(gun));
  chk(gun.color === 'cyan' && gun.dist < 0.55, 'monkey laser originates at the gun muzzle ' + JSON.stringify(gun));
  chk(gun.downX > gun.aimX && gun.backX > -0.45, 'monkey lowers the gun back to his side after firing ' + JSON.stringify(gun));

  const layout = await page.evaluate(W => {
    const w = eval(W), S = w.__skytower;
    const plats = S.platforms.map(p => ({ i: p.i, x: p.x, z: p.z, size: p.size, top: p.top, slide: p.slide || null }));
    const largeI = new Set([1, 11, 21, 31, 41, 50]);
    const large = plats.filter(p => largeI.has(p.i)).map(p => p.size);
    const small = plats.filter(p => !largeI.has(p.i)).map(p => p.size);
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
      hp0, hp1: S.G.hp, maxClimb, maxAir
    };
  }, W);
  chk(layout.n === 50 && layout.minY > 13 && layout.maxY > 22 && layout.minXZ > 20,
    'platforms use ramped hard gaps ' + JSON.stringify({ minY: layout.minY, maxY: layout.maxY, minXZ: layout.minXZ, maxXZ: layout.maxXZ }));
  chk(layout.minXZ > 18 && layout.minAny > 8, 'no platforms are stacked above each other (consec xz ' + layout.minXZ.toFixed(2) + ', other xz ' + layout.minAny.toFixed(2) + ')');
  chk(layout.smallMax < layout.largeMin && layout.largeMin >= 9 && layout.smallMax < 3.4,
    'checkpoints stay large and the other pads are a few studs wide ' + JSON.stringify({ large: layout.large, smallMin: layout.smallMinR, smallMax: layout.smallMaxR }));
  chk(layout.hopsOk && layout.hopCount === 49 && layout.hardestWorst <= 0.90 + 1e-6,
    'every hop stays reachable in the worst moving-pad case (<=90% fuel) ' + JSON.stringify({ failed: layout.hopsFailed, easy: layout.easyFuel, hard: layout.hardFuel, worst: layout.hardestWorst }));
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
    S.step(1 / 30);
    S.player.updateMatrixWorld(true);
    const u = S.player.userData;
    const eye = S.player.position.clone();
    if (u.botEye) u.botEye.getWorldPosition(eye);
    const L = S.fire();
    return {
      char: u.char, hasGun: !!u.gun, hasEye: !!u.botEye, hasBot: !!u.bot,
      color: L && L.color, dist: L && u.botEye ? L.mesh.position.distanceTo(eye) : 99,
      flash: S.G.orbFlash, hex: L && L.mesh.material.color.getHexString()
    };
  }, W);
  chk(alienFire.char === 'alien' && alienFire.hasEye && alienFire.hasBot && !alienFire.hasGun,
    'alien has a floating orb and no hand gun ' + JSON.stringify(alienFire));
  chk(alienFire.color === 'red' && alienFire.dist < 0.6,
    'alien FIRE is a red laser from the orb eye ' + JSON.stringify(alienFire));

  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 4).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.stack); process.exit(1); });
