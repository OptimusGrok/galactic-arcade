// Start-screen preview monkey beams IN on first paint (and on every return), beams OUT on PLAY, then the game starts.
const { open } = require('./lib'); const fs = require('fs');
(async () => { let o; for (let i = 0; ; i++) { try { o = await open({ phone: true, start: true, w: 412, h: 915 }); break; } catch (e) { if (i > 3) throw e; console.log('retry open'); } }
  const { page, errors } = o; let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  const shotDir = process.env.TP_SHOTS; let n = 0; const shot = async tag => { if (!shotDir) return; const b = await page.locator('#gaCv').boundingBox(); if (b) await page.screenshot({ path: `${shotDir}/tp_${String(n++).padStart(2, '0')}_${tag}.png`, clip: b }); };
  const tp = () => page.evaluate(() => { const T = window.__gaPlayer.tp; return { st: T.st, t: T.t, ins: T.ins, outs: T.outs, gone: !!T.gone, fx: !!T.fx, H: T.H }; });
  await page.waitForFunction(() => window.__gaPlayer && window.__gaPlayer.tp.ins >= 1, null, { timeout: 60000 });
  let a = await tp(); chk(a.ins === 1 && a.fx, 'beams in once on first paint of the start screen', a);
  chk(a.H > 1 && a.H < 4, 'monkey height measured', a.H);
  if (shotDir) for (let i = 0; i < 6 && (await tp()).st === 'in'; i++) { await shot('in'); await page.waitForTimeout(250); }
  await page.waitForFunction(() => window.__gaPlayer.tp.st === 'idle', null, { timeout: 30000 }); await shot('idle');
  const clip = await page.evaluate(() => { let c = 0; window.__arcade.monkey.traverse(o => { if (o.material) for (const m of [].concat(o.material)) if (m.clippingPlanes && m.clippingPlanes.some(p => p.constant < 50 && p.constant > -50)) c++; }); return c; });
  chk(clip === 0, 'shared monkey materials untouched (clip is the preview renderer\'s own)', clip);
  chk((await page.evaluate(() => window.__gaPlayer.prev.r.clippingPlanes.length)) === 0, 'idle: no clipping on the preview');
  // context swap still works mid-effect
  await page.evaluate(() => { window.__startUI.show(); });
  await page.waitForFunction(() => window.__gaPlayer.tp.ins >= 2, null, { timeout: 30000 }).catch(() => {});
  chk((await tp()).ins >= 1, 'still running after show()');
  await page.evaluate(() => { const g = window.__gaPlayer.prev.r.getContext(); const e = g.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); });
  await page.waitForFunction(() => { const p = window.__gaPlayer.prev; return p.r && !p.r.getContext().isContextLost() && (p.remakes || 0) >= 1; }, null, { timeout: 30000 }).catch(() => {});
  chk((await page.evaluate(() => window.__gaPlayer.prev.remakes || 0)) >= 1, 'context loss during the effect: fresh renderer');
  await page.waitForFunction(() => window.__gaPlayer.tp.st === 'idle', null, { timeout: 30000 });
  // PLAY: beam out first, then start
  await page.evaluate(() => { const P = window.__gaPlayer; P.p.name = 'Dave'; const i = document.getElementById('gaIn'); i.value = 'Dave'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  const s0 = await page.evaluate(() => window.__gaPlayer.started || 0);
  const tapEl = async sel => { const bb = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
  await tapEl('#gaT'); await page.waitForFunction(() => { const g = document.getElementById('gaGo'); return g && !g.hidden && g.getBoundingClientRect().height > 0; }, null, { timeout: 15000 });
  await tapEl('#gaGo');
  const b = await page.evaluate(() => ({ st: window.__gaPlayer.tp.st, dis: !!window.__start.dismissed, mu: window.__gaPlayer.music.playing, s: window.__gaPlayer.started || 0 }));
  if (b.st === 'out') { chk(!b.dis && b.s === s0, 'PLAY: beaming out, game not started yet', b); chk(!b.mu, 'music fading on PLAY'); }
  else chk(false, 'PLAY did not beam out (goOK gate?)', b);
  await page.evaluate(() => window.__gaPlayer.play()); chk((await tp()).outs === 1, 'double PLAY ignored during beam-out');
  if (shotDir) for (let i = 0; i < 6 && (await tp()).st === 'out'; i++) { await shot('out'); await page.waitForTimeout(200); }
  await page.waitForFunction(() => window.__start.dismissed, null, { timeout: 10000 }).catch(() => {});
  const c = await page.evaluate(() => ({ dis: !!window.__start.dismissed, s: window.__gaPlayer.started || 0, gone: window.__gaPlayer.tp.gone }));
  chk(c.dis && c.s === s0 + 1 && c.gone, 'after beam-out the game starts (once)', c);
  await page.waitForTimeout(2500); await page.evaluate(() => window.__startUI.show());
  await page.waitForFunction(() => window.__gaPlayer.tp.ins >= 2 && !window.__gaPlayer.tp.gone, null, { timeout: 30000 }).catch(() => {});
  chk(!(await tp()).gone, 'return to start screen: monkey beams back in', await tp());
  chk(errors.length === 0, 'no page errors', errors); console.log(ok ? 'ALL OK' : 'SOME FAIL'); await o.close(); process.exit(ok ? 0 : 1); })();
