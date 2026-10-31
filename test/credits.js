// A machine with 0 credits cannot be played: keys, taps, double-taps, key repeat, rapid presses during the zoom, re-entering.
const { open } = require('./lib');
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const o = await open({ supa }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const goTo = name => page.evaluate(n => { const A = window.__arcade, c = A.playables.find(k => k.name === n), u = c.userData; window.__noAdapt = 1; A.st.fp = false;
    A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; }, name);
  const S = () => page.evaluate(() => { const P = window.__arcade.play; return { mode: P.mode, s: P.machines.strike.credits, g: P.machines.ghost.credits, sg: P.machines.strike.games, gg: P.machines.ghost.games, txt: document.getElementById('bPlay').textContent, cr: document.getElementById('credit').textContent, frame: !!document.getElementById('game') }; });
  for (const [cab, key] of [['strikeCabinet', 'strike'], ['ghostCabinet', 'ghost']]) {
    const k1 = key === 'strike' ? 's' : 'g', kg = key === 'strike' ? 'sg' : 'gg';
    await page.evaluate(k => { window.__arcade.play.machines[k].credits = 0; }, key);
    await goTo(cab); await page.waitForTimeout(900);
    let s = await S(); chk(s.txt === 'INSERT COIN' && s.cr === 'CREDIT 0', cab + ': at 0 credits only INSERT COIN / CREDIT 0 is shown (no PLAY)');
    const g0 = s[kg];
    // direct start attempts at 0 credits are refused
    await page.evaluate(k => { const P = window.__arcade.play; P.machines[k].credits = 0; }, key);
    // one press of each key type + a tap: each only inserts a coin (max CREDIT 1), never a game
    const kd = (code, repeat) => dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'Space' ? ' ' : code === 'KeyE' ? 'e' : code, repeat, bubbles: true }));
    await page.evaluate(`(${kd})('KeyE', false)`); s = await S();
    chk(s.mode === 'walk' && s[k1] === 1 && s[kg] === g0 && !s.frame, cab + ': E at 0 credits only inserts a coin');
    await page.evaluate(k => { window.__arcade.play.machines[k].credits = 0; }, key);
    await page.evaluate(`(() => { const kd = ${kd}; kd('KeyE', false); kd('Enter', false); })()`); s = await S();   // double-tap: two presses in the same instant
    chk(s.mode === 'walk' && s[k1] === 1 && s[kg] === g0, cab + ': double-press (E then Enter at once) inserts one coin, does not start the game');
    await page.evaluate(k => { window.__arcade.play.machines[k].credits = 0; }, key);
    await page.evaluate(`(() => { const kd = ${kd}; kd('Space', false); for (let i = 0; i < 10; i++) kd('Space', true); })()`); s = await S();   // held key auto-repeat
    chk(s.mode === 'walk' && s[k1] === 1 && s[kg] === g0, cab + ': holding Space (key repeat) only inserts one coin');
    await page.evaluate(k => { window.__arcade.play.machines[k].credits = 0; }, key);
    await page.evaluate(() => { const b = document.getElementById('bPlay'); b.click(); b.click(); b.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }); s = await S();
    chk(s.mode === 'walk' && s[k1] === 1 && s[kg] === g0, cab + ': double-tap on the button at 0 credits inserts one coin, never starts a game');
    await page.waitForTimeout(800);   // let the coin lockout pass, as a real second press would
    // now legitimately: CREDIT 1 -> start; hammer every input during the zoom
    await page.evaluate(k => { window.__arcade.play.machines[k].credits = 1; }, key); await page.waitForTimeout(600);
    await page.keyboard.press('Enter');
    for (let i = 0; i < 8; i++) { await page.keyboard.press(['Enter', 'KeyE', 'Space'][i % 3]); await page.evaluate(() => window.__arcade.play.press()); }
    s = await S(); chk(s.mode === 'zoomIn' && s[k1] === 0 && s[kg] === g0 + 1, cab + ': rapid presses during the zoom: exactly one game, credit 1 -> 0, no coin added');
    await page.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 30000 });
    await page.evaluate(() => window.__arcade.play.exit('esc'));
    await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 15000 });
    // re-entering: walk away and back, still 0 credits -> INSERT COIN, press can't start
    await page.evaluate(() => { window.__arcade.monkey.position.set(0, 0, 0); }); await page.waitForTimeout(500);
    const away = await page.evaluate(() => { const P = window.__arcade.play; const g = P.machines; const b = P.blocked; P.press(); return { blocked: P.blocked > b, mode: P.mode }; });
    chk(away.blocked && away.mode === 'walk', cab + ': pressing away from any cabinet does nothing');
    await goTo(cab); await page.waitForTimeout(900); s = await S();
    chk(s.txt === 'INSERT COIN' && s.cr === 'CREDIT 0' && s[k1] === 0, cab + ': re-entering at 0 credits still shows INSERT COIN / CREDIT 0');
  }
  const fin = await S(); chk(fin.sg === 1 && fin.gg === 1, 'exactly one game per machine was started in total (' + fin.sg + ', ' + fin.gg + ')');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})();
