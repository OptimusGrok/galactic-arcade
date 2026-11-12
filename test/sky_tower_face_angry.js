// t749u/t751u/t752u: SKY TOWER — shoot the TITAN face. Every hit makes it ANGRY (red flush, V brows, squint, scowl,
// shake; NO forehead vein) and advances a cycle: odd hits boom "Hey, watch it!" (same voice, sfx/sky_face_hey.mp3),
// even hits fire a THICK red laser from each eye at the player (1 heart if it connects, dodgeable, MUTE-able SFX).
// Also: wild white mad-scientist hair (no teal crown), monkey cyan + alien red lasers both hit, bolt is spent, no
// tickets from the face or its beams, nothing in DEMO / after the win, opening line unchanged, MUTE.
// 844x390; screenshots only if FACE_SHOTS=dir.
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 460) : '')); if (!c) ok = false; };
(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page, { errors } = o;
  const url = new URL('sky-tower-play/index.html', page.url().replace(/[^/]*$/, '')).href;
  const boot = async (mute, ch) => {
    await page.evaluate(([m, ch]) => { localStorage.setItem('neonarcade.mute', m ? '1' : '0'); localStorage.setItem('galacticarcade.player.char', ch); }, [mute, ch]);
    await page.goto(url + '?cb=' + Date.now());
    await page.waitForFunction(() => window.__skytower && window.__skytower.face && window.__skySnd, null, { timeout: 60000 });
    await page.waitForFunction(() => window.__skySnd.voiceReady && window.__skySnd.heyReady, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => {
      const A = window.__skytower, F = A.face, G = A.G, P = A.player, V = P.position.constructor;
      window.__shootFace = () => { const h = F.head.getWorldPosition(new V());
        G.face = Math.atan2(h.x - P.position.x, h.z - P.position.z); G.cooldown = 0; const L = A.fire(); if (!L) return { fired: false };
        const h0 = F.hits; let n = 0; while (L.alive && n < 90) { A.step(1 / 60); n++; }
        return { fired: true, color: L.color, hit: F.hits > h0, alive: L.alive, inScene: !!L.mesh.parent, act: F.lastAct, cycle: F.cycle };
      };
      // advance until the face's eye beams have been fired and are gone; dodge = sidestep right after they fire
      window.__beams = (dodge) => { const B = A.BEAM_STATS, f0 = B.fired, h0 = B.hits, m0 = B.misses, hp0 = G.hp; let info = null, n = 0;
        while (n < 400) { A.step(1 / 60); n++;
          if (!info && B.fired > f0) { const eyes = F.eyeWorld(), bs = A.eyeBeams.slice(-2);
            info = { n: bs.length, fromEyes: bs.map((b, i) => +b.o.distanceTo(eyes[i]).toFixed(2)), red: bs.map(b => b.mesh.children[0].material.color.getHexString()),
              thick: +bs[0].mesh.children[0].geometry.parameters.radiusTop.toFixed(2), glow: +bs[0].mesh.children[1].geometry.parameters.radiusTop.toFixed(2),
              aim: bs.map(b => { const to = new V(P.position.x, P.position.y + 1.0, P.position.z).sub(b.o).normalize(); return +to.dot(b.dir).toFixed(3); }), at: n };
            if (dodge) { const d = bs[0].dir, sx = -d.z, sz = d.x, k = 1 / (Math.hypot(sx, sz) || 1); P.position.x += sx * k * 4; P.position.z += sz * k * 4; } }
          if (info && A.eyeBeams.length === 0) break; }
        return Object.assign({ fired: B.fired - f0, hits: B.hits - h0, misses: B.misses - m0, hpLost: hp0 - G.hp, hp: G.hp, travel: info ? +((n - info.at) / 60).toFixed(2) : 0 }, info || {}); };
      window.__faceSt = () => { const S = window.__skySnd, b = F.brows, skin = F.head.children[0].material.color;
        let teal = 0, redMark = 0; F.root.traverse(m => { if (m.material && m.material.color) { const h = m.material.color.getHex(); if (h === 0x1fd8c8 || h === 0x0fa79c) teal++; if (m.material.isMeshBasicMaterial && h === 0xff1e2a) redMark++; } });
        return { ang: +F.ang.toFixed(3), hits: F.hits, cycle: F.cycle, act: F.lastAct, heys: F.heys, quiet: F.heyBlocked, beams: F.beams, spoke: F.spoke, speaking: F.speaking, line: F.line, open: +F.open.toFixed(2),
          brow: +(Math.min(...b.map(m => m.rotation.z * m.userData.sd))).toFixed(2), skin: skin.getHexString(), green: +skin.g.toFixed(3), vein: !!F.vein || redMark > 0, teal,
          plays: S.voicePlays, by: Object.assign({}, S.voicePlaysBy), mutedBy: Object.assign({}, S.voiceMutedBy), vline: S.voiceLine, sfxBeams: S.beams, sfxBeamsMuted: S.beamsMuted,
          tk: A.TK.run, fly: A.TK.fly, hp: A.hp, scene: A.scene(), on: F.on, dist: +F.dist.toFixed(1), look: +F.lookErr.toFixed(3) }; };
    });
  };
  const st = () => page.evaluate(() => window.__faceSt());
  const shoot = () => page.evaluate(() => window.__shootFace());
  const beams = (dodge) => page.evaluate(d => window.__beams(d), dodge);
  const steps = (n) => page.evaluate(n => { const A = window.__skytower, F = A.face, m = []; for (let i = 0; i < n; i++) { A.step(1 / 30); m.push(F.open); } return Math.max(...m); }, n);
  const calm = () => page.evaluate(() => { const G = window.__skytower.G; G.wind.next = 9999; G.iframe = 0; });

  // ---- monkey, sound on ----
  await boot(false, 'monkey');
  let s = await st();
  const hair = await page.evaluate(() => { const F = window.__skytower.face, H = F.hair; const cols = []; H.traverse(m => { if (m.material) cols.push(m.material.color); });
    const minC = Math.min(...cols.map(c => Math.min(c.r, c.g, c.b))); const bb = new (F.root.position.constructor)(); F.root.visible = true; F.root.updateMatrixWorld(true);
    const box = new (Object.getPrototypeOf(F.root).constructor === Object ? Object : Object)(); F.root.visible = false;
    return { name: H.name, parts: cols.length, minC: +minC.toFixed(2), spikes: H.children.filter(m => m.geometry && m.geometry.type === 'ConeGeometry').length }; });
  chk(hair.name === 'skyFaceHair' && hair.parts >= 40 && hair.spikes >= 30 && hair.minC > 0.6 && s.teal === 0, 'wild white mad-scientist hair (white/grey-white, ' + hair.spikes + ' spikes + puffs), no teal flame crown', Object.assign({ teal: s.teal }, hair));
  chk(!s.vein, 'no forehead vein exists on the face', { vein: s.vein });
  // t760u: Viking helmet on the TITAN, with the wild hair still poking out around / under it
  const helm = await page.evaluate(() => { const F = window.__skytower.face, H = F.helmet; if (!H) return null; let tubes = 0, tori = 0, dome = 0, guard = !!F.head.getObjectByName('skyFaceNoseGuard'); const P = new (F.root.position.constructor)();
    H.traverse(m => { if (!m.geometry) return; const t = m.geometry.type; if (t === 'TubeGeometry') tubes++; if (t === 'TorusGeometry') tori++; if (t === 'SphereGeometry' && m.geometry.parameters.thetaLength < 2) dome++; });
    F.root.updateMatrixWorld(true); const hy = H.getWorldPosition(P).clone(), rim = []; F.head.worldToLocal(hy);
    let below = 0; F.hair.children.forEach(m => { if (m.position.y < 0.75) below++; });
    return { parent: H.parent === F.head, tubes, tori, dome, guard, rimY: +hy.y.toFixed(2), hairBelow: below, hairN: F.hair.children.length, steel: H.children[0].material.color.getHexString() }; });
  chk(helm && helm.parent && helm.tubes === 2 && helm.tori >= 4 && helm.dome >= 1 && helm.guard && helm.hairBelow >= 30 && helm.rimY > 0.4, 'Viking helmet on the face: steel dome + rim band + bands, two curved horns, nose guard; wild hair pokes out under it', helm);

  // DEMO attract: no face to hit
  await page.evaluate(() => window.__demo.start()); await steps(10);
  let r = await page.evaluate(() => { const A = window.__skytower, F = A.face, V = A.player.position.constructor; return { hit: F.hit(new V(0, 0, 0), new V(0, 500, 0)), on: F.on }; });
  chk(!r.hit && !r.on, 'DEMO attract: no face, nothing to hit', r);
  await page.evaluate(() => window.__demo.stop());
  await page.evaluate(() => window.__skytower.start()); await calm(); await steps(6);
  // HIT 1 during the opening line: angry, counts as the "hey" step but stays quiet so the opening plays through
  r = await shoot(); await steps(3); s = await st();
  chk(r.fired && r.color === 'cyan' && r.hit && !r.alive && !r.inScene, 'monkey cyan laser hits the face and the bolt is spent on it', r);
  chk(s.ang > 0.8 && s.brow > 0.3 && s.green < 0.15 && !s.vein, 'hit 1: ANGRY (red flush, V brows) and no forehead vein', s);
  chk(s.cycle === 1 && s.act === 'hey-quiet' && s.by.show === 1 && s.spoke === 1 && s.line === 'show' && s.by.hey === 0, 'hit 1 lands during "Can you make it to the top?": opening plays on untouched, no "hey" over it', s);
  chk(s.tk === 0 && s.fly === 0 && s.hp === 3, 'hitting the face: no tickets, no damage', s);
  await steps(120); await page.waitForTimeout(3400); await steps(20);
  s = await st(); chk(s.ang < 0.05 && !s.speaking && s.skin === 'ff8f3f' && s.brow < 0 && !s.vein, 'anger eases back to the normal face', s);
  // HIT 2: eye lasers, standing still -> 1 heart
  r = await shoot(); await page.evaluate(() => { const A = window.__skytower; for (let i = 0; i < 3; i++) A.step(1 / 60); }); s = await st(); chk(r.hit && s.cycle === 2 && s.act === 'beam' && s.ang > 0.5 && !s.vein, 'hit 2: angry + charges the eye lasers (no "hey")', s);
  let b = await beams(false); s = await st();
  chk(b.fired === 2 && b.n === 2 && b.fromEyes.every(d => d < 1.5) && b.red.every(c => c === 'ff2418') && b.thick >= 0.2 && b.glow >= 0.5, 'two THICK red lasers, one from each eye', b);
  chk(b.aim.every(d => d > 0.999) && b.travel > 1, 'aimed at the player with a fair ' + b.travel + ' s travel time', b);
  chk(b.hits >= 1 && b.hpLost === 1 && s.hp === 2 && s.sfxBeams === 1, 'a beam that connects takes exactly 1 heart (zap SFX played)', Object.assign({ hp: s.hp, sfx: s.sfxBeams }, b));
  chk(s.heys === 0 && s.by.hey === 0, 'even hit does not speak', s);
  // HIT 3 = hit 1: "Hey, watch it!"
  await calm(); r = await shoot(); const m3 = await steps(20); s = await st();
  chk(r.hit && s.cycle === 3 && s.act === 'hey' && s.heys === 1 && s.by.hey === 1 && s.line === 'hey' && m3 > 0.4 && !s.vein, 'hit 3: angry + booms "Hey, watch it!" (mouth moves)', Object.assign({ m3 }, s));
  // HIT 4 = hit 2, this time the player dodges
  await calm(); r = await shoot(); b = await beams(true); s = await st();
  chk(r.hit && s.cycle === 4 && r.act === 'beam' && b.fired === 2 && b.hits === 0 && b.misses === 2 && b.hpLost === 0 && s.hp === 2, 'hit 4: eye lasers again; sidestepping dodges them (no heart lost)', b);
  chk(s.by.hey === 1 && s.plays === 2, 'no extra / overlapping voice on the laser hit', s);
  // HIT 5/6: cycle repeats
  await page.waitForTimeout(3300); await steps(10); await calm();
  r = await shoot(); s = await st(); const a5 = s.act, h5 = s.by.hey;
  await calm(); r = await shoot(); const a6 = r.act; b = await beams(true); s = await st();
  chk(a5 === 'hey' && h5 === 2 && a6 === 'beam' && b.fired === 2 && s.cycle === 6, 'hits 5 and 6 repeat the cycle (hey, lasers)', { a5, h5, a6, b, cycle: s.cycle });
  // one hit can't count twice (debounce) and the face's beams never take tickets
  r = await page.evaluate(() => { const A = window.__skytower, F = A.face, c0 = F.cycle; F.shot(null); const c1 = F.cycle; F.shot(null); return { c0, c1, c2: F.cycle, act: F.lastAct }; });
  chk(r.c1 === r.c0 + 1 && r.c2 === r.c1 && r.act !== '', 'same-instant double hit only advances the cycle once', r);
  await steps(60);
  r = await page.evaluate(() => { const A = window.__skytower, P = A.player, V = P.position.constructor, t = A.tickets.find(t => !t.collected), fly0 = A.TK.fly;
    A.G.iframe = 0; const eyes = A.face.eyeWorld(); A.fireEyeBeams(eyes); const b = A.eyeBeams[A.eyeBeams.length - 1], q = b.o.clone().addScaledVector(b.dir, 9);
    Object.assign(t, { x: q.x, y: q.y, z: q.z, cx: q.x, cy: q.y, cz: q.z, vx: 0, vy: 0, vz: 0, span: 99 }); t.mesh.position.copy(q);
    for (let i = 0; i < 260 && A.eyeBeams.length; i++) A.step(1 / 60); return { got: t.collected, fly: A.TK.fly - fly0, tk: A.TK.run }; });
  chk(!r.got && r.fly === 0 && r.tk === 0, 'the face\'s lasers fly through golden tickets without collecting them', r);
  // last heart: a beam hit = the usual HIT -> checkpoint (health never goes below 0)
  r = await page.evaluate(() => { const A = window.__skytower, G = A.G; G.hp = 1; G.iframe = 0; A.fireEyeBeams(A.face.eyeWorld()); for (let i = 0; i < 260 && A.eyeBeams.length; i++) A.step(1 / 60); return { hp: G.hp, scene: A.scene() }; });
  chk(r.hp === 3 && r.scene === 'play', 'beam on the last heart = normal HIT -> checkpoint respawn, hearts refilled', r);
  s = await st(); chk(s.dist >= 18 && s.look < 0.25 && s.on, 'still keeps its distance and watches the player', s);
  // the win: once the face drifts away it cannot be hit and fires nothing
  r = await page.evaluate(() => { const A = window.__skytower, F = A.face; A.placeOn(A.N); A.finish(); for (let i = 0; i < 60; i++) A.step(1 / 30); const h = F.head.getWorldPosition(new (A.player.position.constructor)());
    return { hit: !!F.hit(A.player.position, h), won: A.won, fire: A.fireEyeBeams(F.eyeWorld()), live: A.eyeBeams.length }; });
  chk(!r.hit && r.won && r.fire === 0 && r.live === 0, 'after the win: face can\'t be hit and fires no lasers', r);
  // ---- alien, MUTE ----
  await boot(true, 'alien');
  await page.evaluate(() => window.__skytower.start()); await calm(); await steps(150); await page.waitForTimeout(300);
  r = await shoot(); const m1 = await steps(20); s = await st();
  chk(r.fired && r.color === 'red' && r.hit && !r.alive, 'alien red robot-eye laser hits the face too', r);
  chk(s.act === 'hey' && s.heys === 1 && s.by.hey === 0 && s.mutedBy.hey === 1 && s.plays === 0 && m1 > 0.4 && !s.vein, 'MUTE hit 1: angry + mouths "Hey, watch it!", voice silent', Object.assign({ m1 }, s));
  await calm(); r = await shoot(); b = await beams(false); s = await st();
  chk(r.act === 'beam' && b.fired === 2 && b.hpLost === 1 && s.sfxBeams === 0 && s.sfxBeamsMuted === 1, 'MUTE hit 2: eye lasers still fire and cost 1 heart, laser SFX silent', Object.assign({ sfx: s.sfxBeams, muted: s.sfxBeamsMuted }, b));
  const real = errors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e)); chk(real.length === 0, 'no page errors', real.slice(0, 4));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
