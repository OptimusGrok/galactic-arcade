// t783u/t785u/t788u: hold FIRE to charge. A tap is a normal shot; release before 4 s fires one bolt
// that gets bigger/thicker with the hold; at 4 s a 3 s beam starts (no extra bolt on release).
// Monkey beam is blue, alien beam is red (not hoodie / suit colours). Rings and sparks surge along
// the beam; a rising charge-up tone plays while holding and stops on release. Arcade (__roomFire)
// and Sky Tower (setFire + step). No screenshots. 844x390 phone landscape.
// t793u/t794u: the monkey's charge ball, scaled bolts and 3 s beam start at his gun muzzle (not his feet). Alien origin unchanged.
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 420) : '')); if (!c) ok = false; };

(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page, { errors } = o;
  page.setDefaultTimeout(60000);

  // ---------- arcade ----------
  await page.evaluate(() => {
    const own = JSON.parse(localStorage.getItem('galacticarcade.wardrobeOwned') || '[]');
    if (!own.includes('hand:pistol')) own.push('hand:pistol');
    localStorage.setItem('galacticarcade.wardrobeOwned', JSON.stringify(own));
    const lk = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}');
    lk.char = 'monkey'; lk.hoodie = 'navy'; lk.hand = 'pistol';
    localStorage.setItem('galacticarcade.player', JSON.stringify(lk));
    if (window.__gaPlayer) { window.__gaPlayer.pick('hand', 'pistol'); }
  });
  await page.waitForFunction(() => window.__roomFire && window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  await page.evaluate(() => { if (window.__gaPlayer) window.__gaPlayer.pick('hand', 'pistol'); window.__roomFire.update(0); });
  await page.waitForFunction(() => window.__roomFire.shown, null, { timeout: 20000 }).catch(() => {});

  let s = await page.evaluate(() => {
    const R = window.__roomFire;
    const wipe = () => { while (R.lasers.length) { const L = R.lasers[0]; if (R.lasers.indexOf(L) >= 0) { /* let life expire via update */ L.life = 0; } R.update(0.02); } R.cool = 0; R.charge = 0; R.chargeSpent = false; if (R.beam) { R.beamT = 0; R.update(0.02); } };
    const last = () => { const L = R.lasers.filter(x => !x.remote).pop(); return L ? { k: L.k, sx: +L.mesh.scale.x.toFixed(3), sy: +L.mesh.scale.y.toFixed(3), sz: +L.mesh.scale.z.toFixed(3), hue: L.hue, oy: L.o && +L.o[1].toFixed(3) } : null; };
    const muz = () => {
      const A = window.__arcade, T = A.THREE, mk = A.monkey, p = new T.Vector3(), h = new T.Vector3();
      mk.updateMatrixWorld(true);
      const mz = mk.getObjectByName('gaPistolMuzzle'); if (mz) mz.getWorldPosition(p);
      const hand = mk.getObjectByName('handR'); if (hand) hand.getWorldPosition(h);
      return { muzzleY: +p.y.toFixed(3), handY: +h.y.toFixed(3), feetY: +mk.position.y.toFixed(3) };
    };
    wipe();
    const n0 = R.shots;
    R.setHeld(true); R.update(0.04); R.setHeld(false);
    const tap = { n: R.shots - n0, last: last(), charge: R.charge, held: R.held, beam: !!R.beam };

    wipe(); const n1 = R.shots;
    R.setHeld(true); R.update(1); const midChg = R.charge; const ring = parseFloat(getComputedStyle(document.getElementById('bFire')).getPropertyValue('--chg') || '0');
    const ball = window.__arcade.scene.getObjectByName('roomCharge');
    const midBall = !!(ball && ball.visible);
    const midMuz = muz();
    const midOrigin = { ballY: ball ? +ball.position.y.toFixed(3) : null, ...midMuz };
    R.setHeld(false);
    const mid = { n: R.shots - n1, last: last(), chargeAt: midChg, ring, ball: midBall, origin: midOrigin };

    wipe(); const n2 = R.shots;
    R.setHeld(true); R.update(3); R.setHeld(false);
    const late = { n: R.shots - n2, last: last(), origin: muz() };

    wipe();
    const snd0 = { on: R.chargeOn, starts: R.chargeStarts, hz: R.chargeHz };
    R.setHeld(true); R.update(0.3);
    const sndEarly = { on: R.chargeOn, starts: R.chargeStarts - snd0.starts, hz: R.chargeHz };
    R.update(1.7);
    const sndLate = { on: R.chargeOn, hz: R.chargeHz };
    R.setHeld(false);
    const sndRel = { on: R.chargeOn, hz: R.chargeHz, stops: R.chargeStops };

    wipe(); const n3 = R.shots;
    R.setHeld(true); R.update(4.05);
    const en0 = R.beam && R.beam.energy && R.beam.energy.rings.map(r => +r.position.z.toFixed(3));
    const muz4 = muz();
    const at4 = { n: R.shots - n3, beam: !!R.beam, beamT: R.beamT, spent: R.chargeSpent, cols: R.beam && R.beam.cols, core: R.beam && R.beam.mesh.children[0].material.color.getHex(), glow: R.beam && R.beam.mesh.children[1].material.color.getHex(), expect: R.playerCols(),
      energy: !!(R.beam && R.beam.energy && R.beam.mesh.getObjectByName('beamEnergy')),
      rings: R.beam && R.beam.energy && R.beam.energy.rings.length,
      sparks: R.beam && R.beam.energy && R.beam.energy.sparks.length,
      chargeOn: R.chargeOn,
      origin: { beamY: R.beam ? +R.beam.mesh.position.y.toFixed(3) : null, ...muz4 } };
    R.update(0.35);
    const en1 = R.beam && R.beam.energy && R.beam.energy.rings.map(r => +r.position.z.toFixed(3));
    const surged = !!(en0 && en1 && en0.some((z, i) => Math.abs(z - en1[i]) > 0.05));
    R.setHeld(false); R.update(0.05);
    const afterRel = { n: R.shots - n3, beam: !!R.beam, beamT: R.beamT };
    R.update(3.1);
    const after3 = { beam: !!R.beam, beamT: R.beamT, n: R.shots - n3 };

    // hoodie colour must not tint the monkey beam (still blue)
    const lk = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}');
    lk.hoodie = 'red'; localStorage.setItem('galacticarcade.player', JSON.stringify(lk));
    if (window.__gaPlayer && window.__gaPlayer.pick) window.__gaPlayer.pick('hoodie', 'red');
    wipe(); R.setHeld(true); R.update(4.05);
    const hood = { core: R.beam && R.beam.mesh.children[0].material.color.getHex(), char: R.playerCols().char };
    R.setHeld(false); if (R.beam) { R.beamT = 0; R.update(0.02); }

    return { shown: R.shown, CHARGE_T: R.CHARGE_T, BEAM_T: R.BEAM_T, tap, mid, late, at4, afterRel, after3, sndEarly, sndLate, sndRel, surged, hood };
  });
  chk(s.shown && s.CHARGE_T === 4 && s.BEAM_T === 3, 'arcade charge/beam timings are 4 s / 3 s and FIRE is shown', s);
  chk(s.tap.n === 1 && s.tap.last && s.tap.last.k < 0.05 && Math.abs(s.tap.last.sx - 1) < 0.16 && s.tap.last.hue === 'cyan' && !s.tap.beam,
    'arcade: a quick tap fires one normal-size cyan bolt', s.tap);
  chk(s.mid.n === 1 && s.late.n === 1 && s.mid.last && s.late.last, 'arcade: mid-hold release fires exactly one bolt', { mid: s.mid, late: s.late });
  const nearMuz = (y, o, slack) => y != null && o && Math.abs(y - o.muzzleY) < (slack || 0.25) && y > o.feetY + 0.7;
  chk(nearMuz(s.mid.origin.ballY, s.mid.origin) && nearMuz(s.late.last.oy, s.late.origin, 0.35),
    'arcade: the monkey charge ball and scaled bolt start at the gun muzzle, not his feet', { mid: s.mid.origin, late: s.late });
  chk(nearMuz(s.at4.origin.beamY, s.at4.origin), 'arcade: the monkey beam origin is near the gun muzzle height', s.at4.origin);
  chk(s.mid.last.sx > s.tap.last.sx + 0.4 && s.late.last.sx > s.mid.last.sx + 0.8 && s.late.last.sz > s.mid.last.sz,
    'arcade: bolt gets progressively bigger and thicker as the hold approaches 4 s', { tap: s.tap.last, mid: s.mid.last, late: s.late.last });
  chk(s.mid.ring > 20 && s.mid.ball, 'arcade: charge ring is visible while holding', { ring: s.mid.ring, ball: s.mid.ball });
  chk(s.at4.n === 0 && s.at4.beam && s.at4.beamT > 2.8 && s.at4.spent && s.at4.core === 0x2f8cff && s.at4.glow === 0x0a3cff && s.at4.cols.char === 'monkey',
    'arcade: a 4 s hold starts a 3 s blue monkey beam (no bolt)', s.at4);
  chk(s.at4.energy && s.at4.rings >= 5 && s.at4.sparks >= 10 && s.surged,
    'arcade: rings and sparks surge along the beam while it fires', { energy: s.at4.energy, rings: s.at4.rings, sparks: s.at4.sparks, surged: s.surged });
  chk(s.at4.chargeOn === false, 'arcade: the charge-up tone stops when the beam starts', { chargeOn: s.at4.chargeOn });
  chk(s.sndEarly.on && s.sndEarly.starts >= 1 && s.sndLate.on && s.sndLate.hz > s.sndEarly.hz + 200 && !s.sndRel.on,
    'arcade: charge-up tone rises while holding and stops on release', { early: s.sndEarly, late: s.sndLate, rel: s.sndRel });
  chk(s.hood.core === 0x2f8cff, 'arcade: a red hoodie does not change the monkey beam from blue', s.hood);
  chk(s.afterRel.n === 0 && s.afterRel.beam, 'arcade: releasing during the beam does not add a bolt', s.afterRel);
  chk(!s.after3.beam && s.after3.n === 0, 'arcade: the beam lasts 3 s then ends', s.after3);

  // alien beam stays red even in a gold suit
  await page.evaluate(() => {
    const lk = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}');
    lk.char = 'alien'; lk.suit = 'suitgold'; lk.hand = 'pistol';
    localStorage.setItem('galacticarcade.player', JSON.stringify(lk));
    if (window.__gaPlayer) {
      if (window.__gaPlayer.setChar) window.__gaPlayer.setChar('alien');
      else if (window.__arcade && window.__arcade.setChar) window.__arcade.setChar('alien');
      if (window.__gaPlayer.pick) window.__gaPlayer.pick('suit', 'suitgold');
    }
    window.__roomFire.update(0);
  });
  await page.waitForTimeout(200);
  const alien = await page.evaluate(() => {
    const R = window.__roomFire, A = window.__arcade;
    const char = (A && A.monkey && A.monkey.userData && A.monkey.userData.char) || (R.playerCols() && R.playerCols().char);
    while (R.lasers.length) { R.lasers[0].life = 0; R.update(0.02); }
    R.cool = 0; R.charge = 0; R.chargeSpent = false; if (R.beam) { R.beamT = 0; R.update(0.02); }
    R.setHeld(true); R.update(4.05);
    const out = { char, core: R.beam && R.beam.mesh.children[0].material.color.getHex(), glow: R.beam && R.beam.mesh.children[1].material.color.getHex(), expect: R.playerCols(), energy: !!(R.beam && R.beam.energy) };
    R.setHeld(false); if (R.beam) { R.beamT = 0; R.update(0.02); }
    return out;
  });
  chk(alien.char === 'alien' && alien.core === 0xff2a33 && alien.glow === 0xff4018 && alien.energy,
    'arcade: the alien beam is red (even in a gold suit) with surging energy', alien);

  // ---------- Sky Tower ----------
  await page.evaluate(() => {
    const lk = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}');
    lk.char = 'monkey'; lk.hoodie = 'navy'; lk.hand = 'pistol';
    localStorage.setItem('galacticarcade.player', JSON.stringify(lk));
  });
  const base = new URL(page.url());
  const url = new URL('sky-tower-play/index.html', base.href.replace(/[^/]*$/, '')).href;
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => window.__skytower && window.__skytower.ready && window.__skytower.fire, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  s = await page.evaluate(() => {
    const S = window.__skytower;
    S.start();
    window.__DEMO = false;
    S.G.mode = 'play'; S.G.run = true; S.G.over = false; S.G.hold = false;
    const last = () => { const L = S.lasers[S.lasers.length - 1]; return L ? { k: L.k, sx: +L.mesh.scale.x.toFixed(3), sy: +L.mesh.scale.y.toFixed(3), sz: +L.mesh.scale.z.toFixed(3), color: L.color, oy: L.o ? +L.o.y.toFixed(3) : null } : null; };
    const muz = () => {
      if (S.poseMonkeyGun) S.poseMonkeyGun(1);
      S.player.updateMatrixWorld(true);
      const u = S.player.userData, p = S.player.position, o = { feetY: +p.y.toFixed(3), muzzleY: null };
      if (u.muzzle) { const v = u.muzzle.getWorldPosition(p.clone()); o.muzzleY = +v.y.toFixed(3); }
      return o;
    };
    const wipe = () => {
      for (const L of S.lasers.slice()) { if (L.mesh && L.mesh.parent) L.mesh.parent.remove(L.mesh); L.alive = false; }
      S.lasers.length = 0; S.G.cooldown = 0; S.G.charge = 0; S.G.charging = false; S.G.chargeSpent = false; S.G.fireHeld = false;
      if (S.G.beam) { S.G.beamT = 0; tick(0.05); }
    };
    const tick = (dt) => { let left = dt; while (left > 1e-8) { const s = Math.min(0.05, left); S.step(s); left -= s; } };
    const hold = (dt) => { S.setFire(true); tick(dt); S.setFire(false); tick(1 / 60); };

    wipe(); const n0 = S.SHOT.n; hold(0.04); const tap = { n: S.SHOT.n - n0, last: last(), beam: !!S.G.beam };

    wipe(); const n1 = S.SHOT.n; S.setFire(true); tick(1);
    const skyBall = S.world && S.world.getObjectByName('skyCharge');
    const midBall = { ballY: skyBall ? +skyBall.position.y.toFixed(3) : null, ...muz() };
    S.setFire(false); tick(1 / 60);
    const mid = { n: S.SHOT.n - n1, last: last(), origin: midBall };
    wipe(); const n2 = S.SHOT.n; hold(3); const late = { n: S.SHOT.n - n2, last: last(), origin: muz() };

    const Sd = window.__skySnd;
    wipe();
    const st0 = Sd && Sd.chargeStarts;
    S.setFire(true); tick(0.3);
    const sndEarly = { on: !!(Sd && Sd.chargeOn), starts: Sd ? Sd.chargeStarts - st0 : 0, hz: Sd && Sd.chargeHz };
    tick(1.7);
    const sndLate = { on: !!(Sd && Sd.chargeOn), hz: Sd && Sd.chargeHz };
    S.setFire(false); tick(1 / 60);
    const sndRel = { on: !!(Sd && Sd.chargeOn), hz: Sd && Sd.chargeHz };

    wipe(); const n3 = S.SHOT.n;
    S.setFire(true); tick(4.05);
    const en0 = S.G.beam && S.G.beam.energy && S.G.beam.energy.rings.map(r => +r.position.z.toFixed(3));
    const muz4 = muz();
    const at4 = { n: S.SHOT.n - n3, beam: !!S.G.beam, beamT: S.G.beamT, spent: S.G.chargeSpent,
      core: S.G.beam && S.G.beam.mesh.children[0].material.color.getHex(),
      glow: S.G.beam && S.G.beam.mesh.children[1].material.color.getHex(),
      expect: S.playerCols(),
      energy: !!(S.G.beam && S.G.beam.energy && S.G.beam.mesh.getObjectByName('beamEnergy')),
      rings: S.G.beam && S.G.beam.energy && S.G.beam.energy.rings.length,
      sparks: S.G.beam && S.G.beam.energy && S.G.beam.energy.sparks.length,
      chargeOn: !!(Sd && Sd.chargeOn),
      origin: { beamY: S.G.beam ? +S.G.beam.mesh.position.y.toFixed(3) : null, ...muz4 } };
    tick(0.35);
    const en1 = S.G.beam && S.G.beam.energy && S.G.beam.energy.rings.map(r => +r.position.z.toFixed(3));
    const surged = !!(en0 && en1 && en0.some((z, i) => Math.abs(z - en1[i]) > 0.05));
    S.setFire(false); tick(0.05);
    const afterRel = { n: S.SHOT.n - n3, beam: !!S.G.beam };
    tick(3.1);
    const after3 = { beam: !!S.G.beam, beamT: S.G.beamT, n: S.SHOT.n - n3 };

    // force the alien look for a red beam (gold suit must not tint it)
    wipe();
    const lk = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}');
    lk.char = 'alien'; lk.suit = 'suitgold';
    localStorage.setItem('galacticarcade.player', JSON.stringify(lk));
    if (S.player && S.player.userData) S.player.userData.char = 'alien';
    S.setFire(true); tick(4.05);
    const alienB = { core: S.G.beam && S.G.beam.mesh.children[0].material.color.getHex(), glow: S.G.beam && S.G.beam.mesh.children[1].material.color.getHex(), char: S.playerCols().char, energy: !!(S.G.beam && S.G.beam.energy) };
    S.setFire(false); if (S.G.beam) { S.G.beamT = 0; tick(0.05); }

    // explicit fire() still works for other tests and marks the charge spent
    wipe(); S.G.fireHeld = true; S.step(0.2); const L = S.fire(); S.setFire(false); S.step(1 / 30);
    const explicit = { ok: !!L && L.k === 0, extra: S.SHOT.n, lasers: S.lasers.length };

    return { CHARGE_T: S.CHARGE_T, BEAM_T: S.BEAM_T, tap, mid, late, at4, afterRel, after3, explicit, sndEarly, sndLate, sndRel, surged, alienB };
  });
  chk(s.CHARGE_T === 4 && s.BEAM_T === 3, 'Sky Tower charge/beam timings are 4 s / 3 s', s);
  chk(s.tap.n === 1 && s.tap.last && s.tap.last.k < 0.05 && Math.abs(s.tap.last.sx - 1) < 0.16 && s.tap.last.color === 'cyan' && !s.tap.beam,
    'Sky Tower: a quick tap fires one normal-size cyan bolt', s.tap);
  chk(s.mid.n === 1 && s.late.n === 1 && s.mid.last && s.late.last, 'Sky Tower: mid-hold release fires exactly one bolt', { mid: s.mid, late: s.late });
  chk(s.mid.last.sx > s.tap.last.sx + 0.4 && s.late.last.sx > s.mid.last.sx + 0.8 && s.late.last.sz > s.mid.last.sz,
    'Sky Tower: bolt gets progressively bigger and thicker as the hold approaches 4 s', { tap: s.tap.last, mid: s.mid.last, late: s.late.last });
  const skyNear = (y, o, slack) => y != null && o && o.muzzleY != null && Math.abs(y - o.muzzleY) < (slack || 0.25) && y > o.feetY + 0.7;
  chk(skyNear(s.mid.origin.ballY, s.mid.origin) && skyNear(s.late.last.oy, s.late.origin, 0.35),
    'Sky Tower: the monkey charge ball and scaled bolt start at the gun muzzle, not his feet', { mid: s.mid.origin, late: s.late });
  chk(skyNear(s.at4.origin.beamY, s.at4.origin), 'Sky Tower: the monkey beam origin is near the gun muzzle height', s.at4.origin);
  chk(s.at4.n === 0 && s.at4.beam && s.at4.beamT > 2.8 && s.at4.spent && s.at4.core === 0x2f8cff && s.at4.glow === 0x0a3cff,
    'Sky Tower: a 4 s hold starts a 3 s blue monkey beam (no bolt)', s.at4);
  chk(s.at4.energy && s.at4.rings >= 5 && s.at4.sparks >= 10 && s.surged,
    'Sky Tower: rings and sparks surge along the beam while it fires', { energy: s.at4.energy, rings: s.at4.rings, sparks: s.at4.sparks, surged: s.surged });
  chk(s.at4.chargeOn === false, 'Sky Tower: the charge-up tone stops when the beam starts', { chargeOn: s.at4.chargeOn });
  chk(s.sndEarly.on && s.sndEarly.starts >= 1 && s.sndLate.on && s.sndLate.hz > s.sndEarly.hz + 200 && !s.sndRel.on,
    'Sky Tower: charge-up tone rises while holding and stops on release', { early: s.sndEarly, late: s.sndLate, rel: s.sndRel });
  chk(s.alienB.char === 'alien' && s.alienB.core === 0xff2a33 && s.alienB.glow === 0xff4018 && s.alienB.energy,
    'Sky Tower: the alien beam is red (even in a gold suit) with surging energy', s.alienB);
  chk(s.afterRel.n === 0 && s.afterRel.beam, 'Sky Tower: releasing during the beam does not add a bolt', s.afterRel);
  chk(!s.after3.beam && s.after3.n === 0, 'Sky Tower: the beam lasts 3 s then ends', s.after3);
  chk(s.explicit.ok && s.explicit.lasers >= 1, 'Sky Tower: explicit fire() still shoots a normal bolt and does not double-fire on release', s.explicit);

  const bad = errors.filter(e => !/supabase|AbortError|Failed to load|AudioContext/i.test(e));
  chk(bad.length === 0, 'no page errors', bad.slice(0, 4));
  await o.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
