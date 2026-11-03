// Our customisation start screen (player.js): PLAY hidden until a name (and 2 s after the first touch), real taps/typing on a phone, choices apply to the
// real monkey, name tag, persisted in 'galacticarcade.player' across a reload, game starts and the monkey moves.
const { open } = require('./lib');
const { execSync } = require('child_process');
const OUT = '/workspace/galactic-shop/shots/';
(async () => {
  let o; for (let i = 0; ; i++) { try { o = await open({ phone: true, start: true, w: 412, h: 915 }); break; } catch (e) { if (i >= 3) throw e; console.log('retry open (slow box): ' + e.message.split('\n')[0]); } } const { page, errors } = o;
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  page.on('crash', () => console.log('PAGE CRASHED')); page.on('close', () => console.log('PAGE CLOSED'));
  const cdp = await page.context().newCDPSession(page);
  const tap = async sel => { const r = await page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, sel);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r[0], y: r[1] }] }); await page.waitForTimeout(60); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250); };
  const st = () => page.evaluate(() => { const A = window.__arcade, g = document.getElementById('gaGo'); return { go: !!g && !g.hidden && getComputedStyle(g).display !== 'none' && g.getBoundingClientRect().height > 0, dis: window.__start.dismissed, pos: [A.monkey.position.x, A.monkey.position.z].map(v => +v.toFixed(2)), name: window.__gaPlayer.p.name, val: document.getElementById('gaIn') && document.getElementById('gaIn').value, theirs: !document.getElementById('stStart') || document.getElementById('stStart').offsetParent === null ? 'none' : 'shown' }; });
  await page.evaluate(() => localStorage.removeItem('galacticarcade.player'));
  await page.reload({ timeout: 120000 }); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer.prev.r, null, { timeout: 60000 }); await page.waitForTimeout(1500);
  let a = await st();
  chk(!a.go && a.theirs === 'none' && !a.dis, 'empty name: no PLAY button (theirs hidden too), start screen up', a);
  await page.screenshot({ path: OUT + 'start_empty.png' });
  const clean = await page.evaluate(() => { const vis = e => { if (!e) return false; for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') return false; } return e.getBoundingClientRect().height > 0; };
    return { tk: !!document.getElementById('gaTk'), opt: !!document.getElementById('gaOpt'), stOpt: vis(document.getElementById('stOpt')), anyOpt: [...document.querySelectorAll('#start button')].filter(vis).map(b => b.textContent.trim()).filter(t => /OPTION|TICKET/i.test(t)) }; });
  chk(!clean.tk && !clean.opt && !clean.stOpt && clean.anyOpt.length === 0, 'no ticket counter and no OPTIONS button on the start screen', clean);
  await page.screenshot({ path: OUT + 'start_clean.png' });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await page.waitForTimeout(300);
  chk(!(await st()).dis, 'Enter with no name does not start');
  await tap('#gaIn'); await page.keyboard.type('   '); a = await st(); chk(!a.go, 'spaces only: still no button');
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  const p0 = a.pos; await page.keyboard.type('wasd Dave Rocket 2026'); await page.waitForTimeout(2300); a = await st();   // PLAY waits 2 s after the first touch
  chk(a.go && a.val === 'wasd Dave Ro' && a.name === 'wasd Dave Ro', 'typed name (WASD letters) shows PLAY, capped at 12', a);
  chk(a.pos.join() === p0.join() && !a.dis, 'typing did not move the monkey or start the game', a.pos);
  // choices by tapping swatches / arrows
  console.log('tapping crown'); await tap('.gaRow[data-k=hat] .gaO[data-v=crown]'); console.log('ok'); await tap('.gaRow[data-k=hoodie] .gaO[data-v=red]'); await tap('.gaRow[data-k=fur] .gaO[data-v=gold]');
  await tap('.gaRow[data-k=shoes] .gaA[data-step="1"]');
  const r0 = await page.evaluate(() => window.__gaPlayer.prev.want); await tap('#gaR'); const r1 = await page.evaluate(() => window.__gaPlayer.prev.want);
  chk(r1 - r0 > 0.7, 'right arrow rotates the preview');
  await page.waitForTimeout(800); await page.screenshot({ path: OUT + 'start_named.png' });
  const look = () => page.evaluate(() => { const A = window.__arcade, m = A.monkey, cols = {}; m.traverse(o => { if (o.isMesh && o.material.userData.gaOrig != null) cols[o.material.userData.gaOrig.toString(16)] = o.material.color.getHexString(); });
    let cap = null; m.traverse(o => { if (o.userData && o.userData.gaCap) cap = o; }); const h = cap.parent.userData.gaHats;
    return { p: window.__gaPlayer.p, cols, cap: cap.visible, crown: h.crown.visible, helmet: h.helmet.visible, tag: window.__gaPlayer.tag && window.__gaPlayer.tag.visible }; });
  let L = await look();
  chk(L.p.hat === 'crown' && L.crown && !L.cap && L.cols['1d2452'] === 'd42a2a' && L.cols['4e2a14'] === 'b7862a' && L.cols['8a1e2c'] === '1f4fbf' && L.tag, 'crown/red hoodie/gold fur/blue shoes on the real monkey + name tag', L);
  await tap('#gaGo'); await page.waitForTimeout(1200); a = await st();
  chk(a.dis, 'PLAY starts the game through their START', a.dis);
  const q0 = a.pos; await page.keyboard.down('KeyW'); for (let i = 0; i < 40; i++) await page.evaluate(() => window.__arcade.step && window.__arcade.step(1 / 30)); await page.waitForTimeout(800); await page.keyboard.up('KeyW');
  a = await st(); chk(Math.hypot(a.pos[0] - q0[0], a.pos[1] - q0[1]) > 0.3, 'the monkey moves after starting', [q0, a.pos]);
  await page.evaluate(() => { const A = window.__arcade; A.st.yaw = A.st.face + Math.PI; A.st.dist = 3.2; A.st.pitch = 0.2; });
  await page.waitForTimeout(2500); await page.screenshot({ path: OUT + 'start_ingame.png' });
  const saved = await page.evaluate(() => localStorage.getItem('galacticarcade.player'));
  chk(/"name":"wasd Dave Ro"/.test(saved), 'saved under galacticarcade.player', saved);
  await page.reload({ timeout: 120000 }); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer.tag, null, { timeout: 60000 }); await page.waitForTimeout(800);
  a = await st(); L = await look();
  chk(a.val === 'wasd Dave Ro' && !a.go && L.crown && L.cols['1d2452'] === 'd42a2a' && L.cols['4e2a14'] === 'b7862a' && L.cols['8a1e2c'] === '1f4fbf', 'after reload: name pre-filled, look re-applied, PLAY waits for a touch', { a, L });
  await tap('#gaT'); await page.waitForTimeout(2300); a = await st(); chk(a.go, 'after reload: touch + 2 s shows PLAY', a);
  await tap('.gaRow[data-k=hat] .gaO[data-v=helmet]'); L = await look(); chk(L.helmet && !L.crown && !L.cap, 'helmet works'); await tap('.gaRow[data-k=hat] .gaO[data-v=none]'); L = await look(); chk(!L.helmet && !L.crown && !L.cap, 'no hat works');
  chk(errors.length === 0, 'no page errors', errors);
  await o.close(); process.exit(ok ? 0 : 1);
})();
