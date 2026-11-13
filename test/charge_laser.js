// t783u/t785u: hold FIRE to charge. A tap is a normal shot; release before 4 s fires one bolt
// that gets bigger/thicker with the hold; at 4 s a 3 s player-colour beam starts (no extra bolt
// on release). Arcade (__roomFire, driven with update(dt)) and Sky Tower (setFire + step).
// No screenshots. 844x390 phone landscape.
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
    const last = () => { const L = R.lasers.filter(x => !x.remote).pop(); return L ? { k: L.k, sx: +L.mesh.scale.x.toFixed(3), sy: +L.mesh.scale.y.toFixed(3), sz: +L.mesh.scale.z.toFixed(3), hue: L.hue } : null; };
    wipe();
    const n0 = R.shots;
    R.setHeld(true); R.update(0.04); R.setHeld(false);
    const tap = { n: R.shots - n0, last: last(), charge: R.charge, held: R.held, beam: !!R.beam };

    wipe(); const n1 = R.shots;
    R.setHeld(true); R.update(1); const midChg = R.charge; const ring = parseFloat(getComputedStyle(document.getElementById('bFire')).getPropertyValue('--chg') || '0');
    const ball = window.__arcade.scene.getObjectByName('roomCharge');
    const midBall = !!(ball && ball.visible);
    R.setHeld(false);
    const mid = { n: R.shots - n1, last: last(), chargeAt: midChg, ring, ball: midBall };

    wipe(); const n2 = R.shots;
    R.setHeld(true); R.update(3); R.setHeld(false);
    const late = { n: R.shots - n2, last: last() };

    wipe(); const n3 = R.shots;
    R.setHeld(true); R.update(4.05);
    const at4 = { n: R.shots - n3, beam: !!R.beam, beamT: R.beamT, spent: R.chargeSpent, cols: R.beam && R.beam.cols, core: R.beam && R.beam.mesh.children[0].material.color.getHex(), glow: R.beam && R.beam.mesh.children[1].material.color.getHex(), expect: R.playerCols() };
    R.setHeld(false); R.update(0.05);
    const afterRel = { n: R.shots - n3, beam: !!R.beam, beamT: R.beamT };
    R.update(3.1);
    const after3 = { beam: !!R.beam, beamT: R.beamT, n: R.shots - n3 };
    return { shown: R.shown, CHARGE_T: R.CHARGE_T, BEAM_T: R.BEAM_T, tap, mid, late, at4, afterRel, after3 };
  });
  chk(s.shown && s.CHARGE_T === 4 && s.BEAM_T === 3, 'arcade charge/beam timings are 4 s / 3 s and FIRE is shown', s);
  chk(s.tap.n === 1 && s.tap.last && s.tap.last.k < 0.05 && Math.abs(s.tap.last.sx - 1) < 0.16 && s.tap.last.hue === 'cyan' && !s.tap.beam,
    'arcade: a quick tap fires one normal-size cyan bolt', s.tap);
  chk(s.mid.n === 1 && s.late.n === 1 && s.mid.last && s.late.last, 'arcade: mid-hold release fires exactly one bolt', { mid: s.mid, late: s.late });
  chk(s.mid.last.sx > s.tap.last.sx + 0.4 && s.late.last.sx > s.mid.last.sx + 0.8 && s.late.last.sz > s.mid.last.sz,
    'arcade: bolt gets progressively bigger and thicker as the hold approaches 4 s', { tap: s.tap.last, mid: s.mid.last, late: s.late.last });
  chk(s.mid.ring > 20 && s.mid.ball, 'arcade: charge ring is visible while holding', { ring: s.mid.ring, ball: s.mid.ball });
  chk(s.at4.n === 0 && s.at4.beam && s.at4.beamT > 2.8 && s.at4.spent && s.at4.core === s.at4.expect.a && s.at4.glow === s.at4.expect.b,
    'arcade: a 4 s hold starts a 3 s beam in the player hoodie colours (no bolt)', s.at4);
  chk(s.afterRel.n === 0 && s.afterRel.beam, 'arcade: releasing during the beam does not add a bolt', s.afterRel);
  chk(!s.after3.beam && s.after3.n === 0, 'arcade: the beam lasts 3 s then ends', s.after3);

  // ---------- Sky Tower ----------
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
    const last = () => { const L = S.lasers[S.lasers.length - 1]; return L ? { k: L.k, sx: +L.mesh.scale.x.toFixed(3), sy: +L.mesh.scale.y.toFixed(3), sz: +L.mesh.scale.z.toFixed(3), color: L.color } : null; };
    const wipe = () => {
      for (const L of S.lasers.slice()) { if (L.mesh && L.mesh.parent) L.mesh.parent.remove(L.mesh); L.alive = false; }
      S.lasers.length = 0; S.G.cooldown = 0; S.G.charge = 0; S.G.charging = false; S.G.chargeSpent = false; S.G.fireHeld = false;
      if (S.G.beam) { S.G.beamT = 0; tick(0.05); }
    };
    const tick = (dt) => { let left = dt; while (left > 1e-8) { const s = Math.min(0.05, left); S.step(s); left -= s; } };
    const hold = (dt) => { S.setFire(true); tick(dt); S.setFire(false); tick(1 / 60); };

    wipe(); const n0 = S.SHOT.n; hold(0.04); const tap = { n: S.SHOT.n - n0, last: last(), beam: !!S.G.beam };

    wipe(); const n1 = S.SHOT.n; hold(1); const mid = { n: S.SHOT.n - n1, last: last() };
    wipe(); const n2 = S.SHOT.n; hold(3); const late = { n: S.SHOT.n - n2, last: last() };

    wipe(); const n3 = S.SHOT.n;
    S.setFire(true); tick(4.05);
    const at4 = { n: S.SHOT.n - n3, beam: !!S.G.beam, beamT: S.G.beamT, spent: S.G.chargeSpent,
      core: S.G.beam && S.G.beam.mesh.children[0].material.color.getHex(),
      glow: S.G.beam && S.G.beam.mesh.children[1].material.color.getHex(),
      expect: S.playerCols() };
    S.setFire(false); tick(0.05);
    const afterRel = { n: S.SHOT.n - n3, beam: !!S.G.beam };
    tick(3.1);
    const after3 = { beam: !!S.G.beam, beamT: S.G.beamT, n: S.SHOT.n - n3 };

    // explicit fire() still works for other tests and marks the charge spent
    wipe(); S.G.fireHeld = true; S.step(0.2); const L = S.fire(); S.setFire(false); S.step(1 / 30);
    const explicit = { ok: !!L && L.k === 0, extra: S.SHOT.n, lasers: S.lasers.length };

    return { CHARGE_T: S.CHARGE_T, BEAM_T: S.BEAM_T, tap, mid, late, at4, afterRel, after3, explicit };
  });
  chk(s.CHARGE_T === 4 && s.BEAM_T === 3, 'Sky Tower charge/beam timings are 4 s / 3 s', s);
  chk(s.tap.n === 1 && s.tap.last && s.tap.last.k < 0.05 && Math.abs(s.tap.last.sx - 1) < 0.16 && s.tap.last.color === 'cyan' && !s.tap.beam,
    'Sky Tower: a quick tap fires one normal-size cyan bolt', s.tap);
  chk(s.mid.n === 1 && s.late.n === 1 && s.mid.last && s.late.last, 'Sky Tower: mid-hold release fires exactly one bolt', { mid: s.mid, late: s.late });
  chk(s.mid.last.sx > s.tap.last.sx + 0.4 && s.late.last.sx > s.mid.last.sx + 0.8 && s.late.last.sz > s.mid.last.sz,
    'Sky Tower: bolt gets progressively bigger and thicker as the hold approaches 4 s', { tap: s.tap.last, mid: s.mid.last, late: s.late.last });
  chk(s.at4.n === 0 && s.at4.beam && s.at4.beamT > 2.8 && s.at4.spent && s.at4.core === s.at4.expect.a && s.at4.glow === s.at4.expect.b,
    'Sky Tower: a 4 s hold starts a 3 s beam in the player colours (no bolt)', s.at4);
  chk(s.afterRel.n === 0 && s.afterRel.beam, 'Sky Tower: releasing during the beam does not add a bolt', s.afterRel);
  chk(!s.after3.beam && s.after3.n === 0, 'Sky Tower: the beam lasts 3 s then ends', s.after3);
  chk(s.explicit.ok && s.explicit.lasers >= 1, 'Sky Tower: explicit fire() still shoots a normal bolt and does not double-fire on release', s.explicit);

  const bad = errors.filter(e => !/supabase|AbortError|Failed to load|AudioContext/i.test(e));
  chk(bad.length === 0, 'no page errors', bad.slice(0, 4));
  await o.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
