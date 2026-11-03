// PLAY appears only 2 s after the first touch on the start screen AND with a name; saved name still waits; __startUI.show resets it.
const { open } = require('./lib');
(async () => { let o; for (let i = 0; ; i++) { try { o = await open({ phone: true, start: true, w: 412, h: 915 }); break; } catch (e) { if (i > 3) throw e; console.log('retry open'); } }
  const { page, errors } = o; let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  const go = () => page.evaluate(() => { const g = document.getElementById('gaGo'); return !!g && !g.hidden && g.getBoundingClientRect().height > 0; });
  const tapEl = async sel => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const ready = () => page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__gaPlayer, null, { timeout: 60000 });
  // 1) fresh: no name
  await page.evaluate(() => localStorage.removeItem('galacticarcade.player')); await page.reload({ timeout: 120000 }); await ready(); await page.waitForTimeout(2500);
  chk(!(await go()), 'no PLAY before any touch (empty name)');
  await tapEl('#gaT'); await page.waitForTimeout(2300); chk(!(await go()), 'touched + 2.3 s but empty name: still hidden');
  await tapEl('#gaIn'); await page.keyboard.type('Dave'); await page.waitForTimeout(200); chk(await go(), 'name typed after the 2 s: PLAY shows');
  // 2) saved name: still waits for touch + 2 s
  await page.reload({ timeout: 120000 }); await ready(); await page.waitForTimeout(3000);
  chk((await page.evaluate(() => window.__gaPlayer.p.name)) === 'Dave', 'saved name restored');
  chk(!(await go()), 'saved name, no touch after 3 s: no PLAY');
  await tapEl('#gaT'); await page.waitForTimeout(1500); chk(!(await go()), '1.5 s after touch: no PLAY');
  await page.waitForTimeout(700); chk(await go(), '~2.2 s after touch with a name: PLAY visible');
  const anim = await page.evaluate(() => getComputedStyle(document.getElementById('gaGo')).animationName); chk(anim === 'gaPop', 'pop-in animation', anim);
  await page.evaluate(() => { const i = document.getElementById('gaIn'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(200);
  chk(!(await go()), 'name cleared: PLAY hidden again');
  await tapEl('#gaIn'); await page.keyboard.type('Dave'); await page.waitForTimeout(200); chk(await go(), 'name retyped: PLAY back');
  // 3) start, then __startUI.show resets
  await tapEl('#gaGo'); await page.waitForFunction(() => window.__start.dismissed, null, { timeout: 10000 }); chk(true, 'PLAY starts the game'); await page.waitForTimeout(2500);   // let Arcade finish removing #start
  await page.evaluate(() => window.__startUI.show()); await page.waitForTimeout(2500);
  chk(!(await go()), 'start screen shown again: no PLAY until a new touch');
  await tapEl('#gaT'); await page.waitForTimeout(1500); chk(!(await go()), 'shown again, 1.5 s after touch: hidden');
  await page.waitForTimeout(800); chk(await go(), 'shown again, ~2.3 s after touch: PLAY visible');
  chk(errors.length === 0, 'no page errors', errors); console.log(ok ? 'ALL OK' : 'SOME FAIL'); await o.close(); process.exit(ok ? 0 : 1); })();
