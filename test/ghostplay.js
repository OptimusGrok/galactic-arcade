// GHOST 256 PLAY flow: prompt, zoom, playable game, controls, credit 1->0 (separate from STRIKE), game over -> zoom out, INSERT COIN, EXIT.
const { open } = require('./lib');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true } : {});
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '';
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 5; p.machines.strike.credits = 1; p.machines.ghost.credits = 1; });
  const goTo = name => page.evaluate(n => { const A = window.__arcade, c = A.playables.find(k => k.name === n), u = c.userData; window.__noAdapt = 1; A.st.fp = false;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; }, name);
  const ui = () => page.evaluate(() => ({ on: document.getElementById('playUI').classList.contains('on'), txt: document.getElementById('bPlay').textContent, cr: document.getElementById('credit').textContent, near: window.__arcade.play.near() }));
  const press = async sel => { if (PHONE) await page.tap(sel || '#bPlay'); else await page.keyboard.press('Enter'); };
  await goTo('ghostCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await ui(); chk(p0.on && p0.txt === 'PLAY' && p0.cr.startsWith('CREDIT 1') && p0.near === 'ghostCabinet', 'PLAY prompt + CREDIT 1 at GHOST 256 ' + JSON.stringify(p0));
  await page.screenshot({ path: 'shots/ghostplay_prompt' + sfx + '.png' });
  await press();
  let mid = false; const z = []; for (let i = 0; i < 120; i++) { await page.waitForTimeout(100);
    z.push(await page.evaluate(() => { const A = window.__arcade; return { m: A.play.mode, k: A.play.t, d: A.play.target ? A.camera.position.distanceTo(A.play.target) : 9, mv: A.monkey.visible }; }));
    const l = z[z.length - 1]; if (!mid && l.m === 'zoomIn' && l.k > 0.45) { mid = true; await page.screenshot({ path: 'shots/ghostplay_midzoom' + sfx + '.png' }); } if (i > 2 && l.m !== 'zoomIn') break; }
  const zi = z.filter(s => s.m === 'zoomIn');
  chk(zi.length > 0 && zi.some(s => !s.mv), 'zoom passes through the monkey (hidden)');
  chk(zi[0].d > 2.5 && Math.min(...zi.map(s => s.d)) < 0.9, 'camera pushes into the GHOST screen (' + zi[0].d.toFixed(2) + ' -> ' + Math.min(...zi.map(s => s.d)).toFixed(2) + ' m)');
  await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game').classList.contains('on'), null, { timeout: 30000 });
  await page.waitForTimeout(700);
  chk(await page.evaluate(() => window.__arcade.play.sub === 'demo' && document.getElementById('game').contentWindow.__DEMO === true), 'zoom lands in the GHOST DEMO');
  await page.evaluate(() => window.__arcade.play.tryPlay()); await page.waitForTimeout(600);   // tap the screen (flow details: test/credits.js)
  const g = await page.evaluate(() => { const A = window.__arcade, w = document.getElementById('game').contentWindow; return { src: w.location.pathname, st: w.__ghost.G.state, muted: w.__ghost.G.muted, gc: A.play.machines.ghost.credits, sc: A.play.machines.strike.credits, paused: A.paused, f0: A.stats.frames }; });
  chk(/ghost-play/.test(g.src) && g.st === 'play', 'playable Ghost 256 started straight into play (' + g.st + ')');
  chk(!g.muted, 'audio on');
  chk(g.gc === 0 && g.sc === 1, 'GHOST credit 1 -> 0, STRIKE credit untouched (1)');
  await page.waitForTimeout(500); chk(g.paused && (await page.evaluate(() => window.__arcade.stats.frames)) === g.f0, 'arcade paused, render loop stopped');
  // controls
  const d0 = await page.evaluate(() => { const P = document.getElementById('game').contentWindow.__ghost.P; return { want: P.want, dir: P.dir, tx: P.tx, ty: P.ty }; });
  if (PHONE) await page.evaluate(() => { const w = document.getElementById('game').contentWindow, c = w.document.getElementById('c'), r = c.getBoundingClientRect();
    const ev = (t, x, y) => c.dispatchEvent(new w.PointerEvent(t, { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    const x = r.left + r.width / 2, y = r.top + r.height / 2; ev('pointerdown', x, y); ev('pointermove', x - 30, y); ev('pointermove', x - 70, y); ev('pointerup', x - 70, y); });
  else await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const d1 = await page.evaluate(() => { const P = document.getElementById('game').contentWindow.__ghost.P; return { want: P.want, dir: P.dir, tx: P.tx, ty: P.ty }; });
  console.log(JSON.stringify({ d0, d1 }));
  chk(d1.want === 1 || d1.dir === 1, (PHONE ? 'swipe' : 'arrow key') + ' steers the ghost left');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/ghostplay_ingame' + sfx + '.png' });
  const hud = await page.evaluate(() => { const b = document.getElementById('bExit').getBoundingClientRect(), w = document.getElementById('game').contentWindow, o = [];
    for (const id of ['bPause', 'bMute', 'bPad']) { const r = w.document.getElementById(id).getBoundingClientRect(); if (r.width && !(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom)) o.push(id); }
    w.document.querySelectorAll('#pad .d').forEach(d => { const r = d.getBoundingClientRect(); if (r.width && !(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom)) o.push('pad'); }); return o; });
  chk(hud.length === 0, '✕ does not cover any Ghost 256 HUD button ' + hud);
  // game over -> GAME OVER + its own score/best screen -> zoom out
  await page.evaluate(() => { const g = document.getElementById('game').contentWindow.__ghost.G; g.score = 4560; g.state = 'over'; g.overT = 0; g.newHi = true; });
  await page.waitForTimeout(600);
  const go = await page.evaluate(() => ({ banner: window.__arcade.play.goShown, st: document.getElementById('game').contentWindow.__ghost.G.state }));
  if (!PHONE) { await page.keyboard.press('Space'); await page.waitForTimeout(1200); }   // RETRY is disabled in the arcade copy
  const st2 = await page.evaluate(() => document.getElementById('game') && document.getElementById('game').contentWindow.__ghost.G.state);
  chk(go.banner && go.st === 'over', 'GAME OVER banner over Ghost 256\'s own score / BEST screen');
  chk(PHONE || st2 === 'over', 'no free retry inside the game (Space at game over stays on game over: ' + st2 + ')');
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 30000 });
  const back = await page.evaluate(() => ({ mode: window.__arcade.play.mode, demo: document.getElementById('game').contentWindow.__DEMO, ui: document.getElementById('demoUI').classList.contains('on'), ins: document.getElementById('dInsert').textContent }));
  chk(back.mode === 'game' && back.demo && back.ui && back.ins === 'INSERT CREDIT', 'game over returns to the GHOST DEMO with INSERT CREDIT ' + JSON.stringify(back));
  chk(await page.evaluate(() => window.__arcade.play.machines.strike.credits === 1), 'STRIKE still has its own CREDIT 1');
  if (PHONE) await page.tap('#bTicket'); else await page.click('#bTicket');
  await page.waitForTimeout(500);
  const c1 = await page.evaluate(() => ({ cr: document.getElementById('dCredit').textContent, sfx: window.__arcade.play.coinSfx, sub: window.__arcade.play.sub }));
  chk(c1.cr.startsWith('CREDIT 1') && c1.sfx === 1 && c1.sub === 'demo', 'INSERT TICKET gives CREDIT 1 with coin sound, no game started');
  if (PHONE) await page.touchscreen.tap(page.viewportSize().width / 2, page.viewportSize().height * 0.4); else await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__arcade.play.sub === 'play' && document.getElementById('game').contentWindow.__ghost.G.state === 'play', null, { timeout: 30000 });
  if (PHONE) await page.tap('#bExit'); else await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 15000 });
  const ex = await page.evaluate(() => ({ last: window.__arcade.play.lastExit, gc: window.__arcade.play.machines.ghost.credits }));
  chk((PHONE ? ex.last === 'x' : ex.last === 'esc') && ex.gc === 0, 'EXIT (' + (PHONE ? '✕' : 'Esc') + ') zooms out, credit used');
  const ext = requests.filter(u => !u.startsWith('http://localhost'));
  console.log('requests', requests.length, 'off-site', ext.length, ext.slice(0, 3));
  chk(ext.length === 0, 'zero requests outside the site (Ghost 256 has no online leaderboard)');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
