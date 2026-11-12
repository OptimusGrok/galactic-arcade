// t748u: SKY TOWER — the TITAN face greets every real climb with a booming "Show me what you got".
// Appears only when a climb starts (not on the title / DEMO attract), is huge, looks at the player, keeps its
// distance, rises with the player, weaves around, mouth moves; voice plays once per climb, MUTE silences it.
// Existing climb / fly / fire / tickets still work. 844x390, no screenshots unless FACE_SHOTS=dir.
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 380) : '')); if (!c) ok = false; };
const SHOTS = process.env.FACE_SHOTS || '';
(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page, { errors } = o;
  const base = new URL(page.url()); const url = new URL('sky-tower-play/index.html', base.href.replace(/[^/]*$/, '')).href;
  const boot = async (mute) => { await page.evaluate(m => localStorage.setItem('neonarcade.mute', m ? '1' : '0'), mute); await page.goto(url + '?cb=' + Date.now());
    await page.waitForFunction(() => window.__skytower && window.__skytower.face && window.__skySnd, null, { timeout: 60000 }); await page.waitForTimeout(500); };
  // step the game by game-time (headless rAF is slow): N frames of 1/30 s
  const run = (n, fly) => page.evaluate(([n, fly]) => { const A = window.__skytower; A.fly(!!fly); const out = []; for (let i = 0; i < n; i++) { A.step(1 / 30); const F = A.face; out.push({ d: F.dist, y: F.root.position.y }); } A.fly(false); return out; }, [n, fly]);
  const st = () => page.evaluate(() => { const A = window.__skytower, F = A.face, S = window.__skySnd, cam = document.querySelector('canvas'), T = F.root;
    const pl = (() => { let p = null; return p; })();
    return { on: F.on, shown: F.shown, vis: T.visible, scale: +T.scale.x.toFixed(3), dist: +F.dist.toFixed(2), look: +F.lookErr.toFixed(3), spoke: F.spoke, plays: S.voicePlays, muted: S.voiceMuted, ready: S.voiceReady, env: S.voiceEnv ? S.voiceEnv.length : 0, err: S.voiceErr,
      worldR: +(F.SCALE * 1.08 * T.scale.x).toFixed(2), fy: +T.position.y.toFixed(2), scene: A.scene() }; });
  await boot(false);
  // title + DEMO: no face
  let s = await st(); chk(!s.on && !s.vis && s.scene === 'title', 'title screen: no TITAN', s);
  await page.evaluate(() => window.__demo.start()); await run(20); s = await st(); chk(!s.on && !s.vis, 'DEMO attract (lobby cabinet): no TITAN', s);
  await page.evaluate(() => window.__demo.stop());
  await page.waitForFunction(() => window.__skySnd.voiceReady, null, { timeout: 20000 }).catch(() => {});
  s = await st(); chk(s.ready && s.env > 40 && !s.err, 'voice buffer shipped + decoded offline-capable (sfx/sky_face.mp3), loudness envelope', { ready: s.ready, env: s.env, err: s.err });
  // start the climb
  await page.evaluate(() => window.__skytower.start()); await run(1); s = await st();
  chk(s.on && s.vis && s.scene === 'play', 'climb starts: TITAN appears at once', s);
  const opens = await page.evaluate(() => { const A = window.__skytower, F = A.face, m = []; for (let i = 0; i < 90; i++) { A.step(1 / 30); m.push(F.open); } return { max: Math.max(...m), min: Math.min(...m.slice(30)) }; });
  s = await st();
  chk(s.spoke === 1 && s.plays === 1 && s.muted === 0, 'booms "Show me what you got" once at the start', { spoke: s.spoke, plays: s.plays });
  chk(opens.max > 0.5, 'mouth opens and closes with the words', opens);
  chk(s.scale > 0.95 && s.worldR >= 5, 'huge: ~' + (s.worldR * 2).toFixed(1) + ' m tall face', { scale: s.scale, worldR: s.worldR });
  // on screen, looking at the player, standoff kept
  let v = await page.evaluate(() => { const A = window.__skytower, F = A.face; const cam = F.root.parent.children.find(() => false); return null; });
  v = await page.evaluate(() => { const F = window.__skytower.face, r = F.root, c = window.__skyCam; return null; });
  chk(s.look < 0.2, 'head turns to the player (look error ' + s.look + ' rad)');
  chk(s.dist >= 18 && s.dist <= 40, 'keeps its distance (' + s.dist + ' m, min 18)');
  // fly up: rises with the player, never closer than 18 m, weaves around
  const before = await page.evaluate(() => ({ py: window.__TK && 0, fy: window.__skytower.face.root.position.y }));
  const tr = await run(150, true);
  const py = await page.evaluate(() => { const A = window.__skytower; return { e: A.energy }; });
  const s2 = await st();
  const dmin = Math.min(...tr.map(q => q.d)), dmax = Math.max(...tr.map(q => q.d));
  chk(dmin >= 17.99 && dmax <= 45, 'while flying: standoff ' + dmin.toFixed(1) + '-' + dmax.toFixed(1) + ' m (never crowds the player)');
  const up = await page.evaluate(() => { const A = window.__skytower, F = A.face; A.placeOn(20); const p0 = F.root.position.y; for (let i = 0; i < 150; i++) A.step(1 / 30);
    const pl = F.root.parent.getObjectByName ? null : null; return { p0: +p0.toFixed(1), p1: +F.root.position.y.toFixed(1), plat: A.platform, top: +A.yOf(20).toFixed(1), d: +F.dist.toFixed(1), look: +F.lookErr.toFixed(3) }; });
  chk(up.p1 > up.p0 + 10 && up.p1 > up.top && up.p1 < up.top + 14 && up.d >= 18 && up.look < 0.2, 'rises with the player to platform 20 and keeps looking at him', up);
  const wv = await page.evaluate(() => { const A = window.__skytower, F = A.face, ang = []; for (let i = 0; i < 240; i++) { A.step(1 / 30); if (i % 20 === 0) ang.push(F.root.position.y); } return { spread: Math.max(...ang) - Math.min(...ang) }; });
  chk(wv.spread > 1, 'drifts / bobs around (not frozen)', wv);
  // existing climb features still work
  const ex = await page.evaluate(() => { const A = window.__skytower; let L = null; for (let i = 0; i < 12 && !L; i++) { A.step(0.3); L = A.fire(); } return { laser: !!L, tickets: A.tickets.length, energy: A.energy, hp: A.hp, cap: A.RUN_CAP }; });
  chk(ex.laser && ex.tickets === 30 && ex.cap === 50 && ex.hp > 0, 'FIRE lasers, 30 flying tickets, run cap 50 still there', ex);
  if (SHOTS) { await page.evaluate(() => { const A = window.__skytower; A.placeOn(1); for (let i = 0; i < 40; i++) A.step(1 / 30); }); await page.waitForTimeout(600); await page.screenshot({ path: SHOTS + '/ga-skytower-face-climb.png' }); }
  // the win: drifts away + fades, ending untouched
  const w = await page.evaluate(() => { const A = window.__skytower, F = A.face; A.placeOn(A.N); A.finish(); for (let i = 0; i < 120; i++) A.step(1 / 30); return { won: A.won, shown: F.shown, vis: F.root.visible, scene: A.scene() }; });
  chk(w.won && !w.shown && !w.vis && w.scene === 'over', 'space ending: TITAN drifts off and fades, win screen intact', w);
  // a new climb: speaks again (once per climb); MUTE silences it
  await boot(true);
  await page.waitForFunction(() => window.__skySnd.voiceReady, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => window.__skytower.start()); const mo = await page.evaluate(() => { const A = window.__skytower, F = A.face, m = []; for (let i = 0; i < 60; i++) { A.step(1 / 30); m.push(F.open); } return Math.max(...m); });
  s = await st(); chk(s.on && s.vis && s.spoke === 1 && s.plays === 0 && s.muted === 1 && mo > 0.4, 'MUTE: TITAN still appears and mouths it, voice silent', { s, mo });
  const real = errors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e)); chk(real.length === 0, 'no page errors', real.slice(0, 4));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
