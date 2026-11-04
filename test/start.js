// Start screen (player.js): character creator over the room on load; PLAY hidden until a name is typed; taps elsewhere and keys never
// reach the game; typing a name + PLAY (or Enter in the box) dismisses it, unlocks audio, saves the name; nothing leaks into a cabinet.
// Usage: node test/start.js [phone]
const { open, play } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });   // no real network
  const o = await open(PH ? { phone: true, start: true, supa } : { start: true, w: 1280, h: 720, supa }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const S = () => page.evaluate(() => { const A = window.__arcade, P = A.play, el = document.getElementById('start'), g = document.getElementById('gaP'), go = document.getElementById('gaGo');
    return { exists: !!el, ga: !!g && g.isConnected && g.getBoundingClientRect().width > 100, go: !!go && !go.hidden, st: window.__start, pos: [A.monkey.position.x, A.monkey.position.z].map(v => +v.toFixed(3)), face: +A.st.face.toFixed(3),
      cs: P.machines.strike.credits, cg: P.machines.ghost.credits, t: P.tickets.total, mode: P.mode, name: (JSON.parse(localStorage.getItem('galacticarcade.player') || '{}')).name || '', vw: innerWidth, vh: innerHeight }; });
  await page.evaluate(() => localStorage.removeItem('galacticarcade.player')); await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); });
  await page.waitForTimeout(700);
  const a = await S();
  chk(a.exists && a.ga && a.st.shown && !a.st.dismissed, 'start screen (character creator) shows on load, room running behind it');
  chk(!a.go && a.name === '', 'no name yet: PLAY hidden ("Type your name to play")');
  chk(await page.title() === 'Galactic Arcade', 'page title is Galactic Arcade');
  await page.screenshot({ path: 'shots/start' + sfx + '.png' });
  // taps off the controls and keys do nothing
  for (const [x, y] of [[0.5, 0.05], [0.03, 0.5], [0.97, 0.97]]) { if (PH) await page.touchscreen.tap(a.vw * x, a.vh * y); else await page.mouse.click(a.vw * x, a.vh * y); }
  if (!PH) { await page.keyboard.press('KeyE'); await page.keyboard.press('Enter'); await page.keyboard.press('Space'); }
  await page.waitForTimeout(600);
  let b = await S();
  chk(b.exists && !b.st.dismissed && b.mode === 'walk' && b.cs === a.cs && b.t === a.t, 'taps elsewhere / keys with no name do not start or reach the game');
  // type a name: keys go into the box, not the game
  await play(page, PH, 'Astro');
  b = await S();
  chk(!b.exists && b.st.dismissed && b.st.audio, 'name + PLAY dismisses it (' + b.st.how + '), audio unlocked');
  chk(b.name === 'Astro', 'name saved to galacticarcade.player (' + b.name + ')');
  chk(JSON.stringify(b.pos) === JSON.stringify(a.pos) && b.face === a.face, 'typing (W/A/S/D in a name too) did not move the monkey');
  chk(b.cs === a.cs && b.cg === a.cg && b.t === a.t && b.mode === 'walk', 'no credit or ticket changed, no zoom started');
  if (PH) await page.tap('#bPlay'); else await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  chk((await S()).mode === 'zoomIn', 'after the start screen, PLAY works normally');
  // reload: name remembered, PLAY shown straight away; Enter in the box starts (desktop)
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await page.waitForTimeout(1000);
  if (PH) await page.tap('#gaT'); else await page.click('#gaT'); await page.waitForTimeout(2500);   // PLAY appears 2 s after a touch (player.js)
  b = await S(); chk(b.exists && b.go && await page.evaluate(() => document.getElementById('gaIn').value) === 'Astro', 'after reload the name is filled in and PLAY is shown');
  if (!PH) { await page.click('#gaIn'); await page.keyboard.press('Enter'); await page.waitForTimeout(900); b = await S(); chk(!b.exists && b.st.dismissed && b.mode === 'walk', 'Enter in the name box starts, and the key is not used by the game'); }
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})();
