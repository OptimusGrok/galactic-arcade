// v216: Neon Bricks score panel live high score; line-clear beam + sound; Level 2 door opens after 3
// tetrises (4-line clears) in one game and closes on exit unless saved; the playfield frame and the
// score panel neon change colour every 30 s, always different colours (t826u). 5-line clears are
// impossible with standard tetrominoes. node test/neon_bricks_v216.js
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };
(async () => {
  const o = await open({ w: 844, h: 390 }), page = o.page, { errors } = o;
  await page.waitForFunction(() => window.__arcade && window.__neonBricks && window.__level2Door && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  await page.evaluate(() => { const D = window.__level2Door; D.unsave(); D.close({ force: true, snap: true }); });

  const consts = await page.evaluate(() => {
    const nb = window.__neonBricks, cells = {};
    // the rules engine does not export CELLS; recover span from a fresh I / O / T by reading shapes through a debug board is awkward,
    // so we report the published constants and probe the I-piece after start.
    return { lines: nb.TETRIS_LINES, need: nb.TETRISES_TO_OPEN, period: nb.NEON_PERIOD, pal: nb.NEON_PALETTE.slice() };
  });
  chk(consts.lines === 4 && consts.need === 3, 'Level 2 door threshold is 3 tetrises (4 lines at once); constant, not 5', consts);
  chk(consts.period === 30 && consts.pal.length >= 4, 'frame / panel neon period is 30 seconds with a palette of colours', consts);

  // start a game so the panel and frame are drawn
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(9.6, 0, 0.2); A.st.vel && A.st.vel.set && A.st.vel.set(0, 0, 0); window.__neonBricks.start(); });
  await page.waitForTimeout(80);

  const span = await page.evaluate(() => {
    const G = window.__neonBricks.G;
    // lock an I at spawn rotation: I is a 4-wide flat bar, rotate once for a 4-tall column
    return { tetrises: G.stats.tetrises, state: G.state, hi: G.hi };
  });
  chk(span.state === 'play', 'Neon Bricks is playing', span);

  // live high score: drop the stored hi, score some points, hi must catch up immediately
  const live = await page.evaluate(() => {
    const nb = window.__neonBricks;
    nb.G.hi = 10; nb.G.score = 0; try { localStorage.setItem('neonarcade.neonbricks.hi', '10'); } catch (e) {}
    const r = nb.debugClear(1);
    const txt = (() => { const g = nb.panel.material.map.source ? nb.panel.material.map.source.data : nb.panel.material.map.image; return !!g; })();
    return { r, hi: nb.G.hi, score: nb.G.score, label: 'HIGH SCORE', hasCanvas: txt };
  });
  chk(live.score > 10 && live.hi === live.score && live.hi > 10, 'v216: high score updates live as soon as the current score beats it', live);

  // colours: frame and panel differ, and they change together on the 30 s tick (test uses a fake clock)
  const c0 = await page.evaluate(() => {
    const nb = window.__neonBricks; nb.setNeonNow(() => 0); return { f: nb.frameColor, p: nb.panelColor, i: nb.neonIndex };
  });
  chk(c0.f && c0.p && c0.f !== c0.p, 'at t=0 the playfield frame and the score panel are different neon colours', c0);
  const c1 = await page.evaluate(() => {
    const nb = window.__neonBricks; nb.setNeonNow(() => 30); return { f: nb.frameColor, p: nb.panelColor, i: nb.neonIndex };
  });
  chk(c1.f !== c0.f && c1.p !== c0.p && c1.f !== c1.p && c1.i !== c0.i, 'after 30 s both neons change, and they are still different from each other', { c0, c1 });
  const c2 = await page.evaluate(() => {
    const nb = window.__neonBricks; nb.setNeonNow(() => 60); return { f: nb.frameColor, p: nb.panelColor, i: nb.neonIndex };
  });
  chk(c2.f !== c1.f && c2.p !== c1.p && c2.f !== c2.p, 'after another 30 s they change again, still different colours', { c1, c2 });

  // line-clear beam: a tetris (4-line clear) spawns beam meshes
  const beam = await page.evaluate(() => {
    const nb = window.__neonBricks;
    const before = nb.beams; const r = nb.debugClear(4); nb.update(0.016);
    const n = []; nb.grp.traverse(o => { if (o.name && /^nbBeam/.test(o.name)) n.push(o.name); });
    return { before, after: nb.beams, names: n, tetrises: r.tetrises, n: r.n };
  });
  chk(beam.n === 4 && beam.after >= 2 && beam.names.length >= 2, 'a line clear plays the futuristic beam-away effect', beam);

  // 5-line clear does not count as a tetris (impossible with standard pieces; hook still refuses to credit one)
  const five = await page.evaluate(() => {
    const nb = window.__neonBricks, t0 = nb.G.stats.tetrises;
    const r = nb.debugClear(5);
    return { t0, t1: nb.G.stats.tetrises, lines: nb.TETRIS_LINES, r };
  });
  chk(five.t1 === five.t0 && five.lines === 4, 'a 5-line clear is not a tetris (standard tetrominoes span at most 4 rows)', five);

  // 3 tetrises in one game open the Level 2 door
  await page.evaluate(() => { const D = window.__level2Door; D.unsave(); D.close({ force: true, snap: true }); window.__neonBricks.G.stats.tetrises = 0; });
  const door = await page.evaluate(() => {
    const nb = window.__neonBricks, D = window.__level2Door, A = window.__arcade;
    const steps = [];
    for (let i = 1; i <= 3; i++) { nb.debugClear(4); steps.push({ i, tetrises: nb.G.stats.tetrises, open: D.open_ }); }
    for (let i = 0; i < 12; i++) A.step(1 / 60);
    return { steps, open: D.open_, ang: [D.leaves[0].rotation.y, D.leaves[1].rotation.y] };
  });
  chk(!door.steps[0].open && !door.steps[1].open && door.steps[2].open && door.open, 'door opens on the 3rd tetris in one game, not before', door);
  // leaving the game that earned the door keeps it open so the player can walk through (movement is locked while playing)
  const exitedOpen = await page.evaluate(() => {
    const nb = window.__neonBricks, D = window.__level2Door, A = window.__arcade;
    nb.stop('exit');
    for (let i = 0; i < 10; i++) A.step(1 / 60);
    return { playing: nb.playing, open: D.open_, saved: D.saved };
  });
  chk(!exitedOpen.playing && exitedOpen.open && !exitedOpen.saved, 'exit after earning the door keeps it open for the walk-through (unsaved)', exitedOpen);
  const through = await page.evaluate(() => {
    const A = window.__arcade, D = window.__level2Door;
    A.monkey.position.set(0, 0, -8); A.st.vel.set(0, 0, 0); A.keys.KeyW = true;
    for (let i = 0; i < 280; i++) { A.st.yaw = 0; A.step(1 / 60); }
    A.keys.KeyW = false;
    return { z: A.monkey.position.z, wall: D.align.wallZ, open: D.open_ };
  });
  chk(through.open && through.z < through.wall - 1.5, 'once open, the player can walk through the Level 2 door', through);

  // starting a new unsaved game resets the door
  const restarted = await page.evaluate(() => {
    const nb = window.__neonBricks, D = window.__level2Door, A = window.__arcade;
    A.monkey.position.set(9.6, 0, 0.2);
    nb.start();
    for (let i = 0; i < 6; i++) A.step(1 / 60);
    return { playing: nb.playing, open: D.open_, saved: D.saved, tetrises: nb.G.stats.tetrises };
  });
  chk(restarted.playing && !restarted.open && !restarted.saved && restarted.tetrises === 0, 'a new unsaved game closes the door and resets the tetris count', restarted);
  const exited = await page.evaluate(() => {
    const nb = window.__neonBricks, D = window.__level2Door, A = window.__arcade;
    nb.stop('exit');
    for (let i = 0; i < 6; i++) A.step(1 / 60);
    return { playing: nb.playing, open: D.open_, saved: D.saved };
  });
  chk(!exited.playing && !exited.open && !exited.saved, 'exit without earning 3 tetrises (and without saving) leaves the door closed', exited);

  // 3 tetrises again, then save: exit leaves the door open
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(9.6, 0, 0.2); window.__neonBricks.start(); });
  const saved = await page.evaluate(() => {
    const nb = window.__neonBricks, D = window.__level2Door, A = window.__arcade;
    nb.G.stats.tetrises = 0; D.unsave(); D.close({ force: true, snap: true });
    nb.debugClear(4); nb.debugClear(4); nb.debugClear(4);
    D.save();
    nb.stop('exit');
    for (let i = 0; i < 10; i++) A.step(1 / 60);
    return { open: D.open_, saved: D.saved, playing: nb.playing };
  });
  chk(!saved.playing && saved.saved && saved.open, 'if the open door is saved, it stays open after exit', saved);

  // cleanup so later tests / reloads are closed
  await page.evaluate(() => { const D = window.__level2Door; D.unsave(); D.close({ force: true, snap: true }); });

  chk(errors.length === 0, 'no page errors', errors);
  await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message + '\n' + e.stack); process.exit(1); });
