// Start screen: Dave's image full screen on load (contain + blurred cover bars), tap/click/key dismisses it,
// unlocks audio, and the first touch is not a joystick touch or a cabinet press (monkey, credits, tickets unchanged).
// Usage: node test/start.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const o = await open(PH ? { phone: true, start: true } : { start: true, w: 1280, h: 720 }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const S = () => page.evaluate(() => { const A = window.__arcade, P = A.play, el = document.getElementById('start'), im = el && el.querySelector('img');
    const r = im && im.getBoundingClientRect();
    return { shown: !!el && getComputedStyle(el).opacity === '1', exists: !!el, st: window.__start, pos: [A.monkey.position.x, A.monkey.position.z].map(v => +v.toFixed(3)), face: +A.st.face.toFixed(3),
      cs: P.machines.strike.credits, cg: P.machines.ghost.credits, t: P.tickets.total, coin: P.coinSfx, mode: P.mode, joy: document.getElementById('joy') && document.getElementById('joy').className,
      img: im && { w: r.width, h: r.height, l: r.left, t: r.top, nat: im.naturalWidth, src: im.currentSrc }, vw: innerWidth, vh: innerHeight }; });
  await page.waitForTimeout(800);
  // stand the monkey at STRIKE so a leaked tap / Enter would show up as a cabinet press
  await page.evaluate(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); });
  await page.waitForTimeout(700);
  const a = await S();
  chk(a.shown && a.st.shown && !a.st.dismissed, 'start screen shows on load, room loaded behind it (frames running)');
  const side = Math.min(a.vw, a.vh);
  chk(a.img.nat === 1024 && /start\.webp/.test(a.img.src), 'image loaded as WebP (' + a.img.src.split('/').pop() + ')');
  chk(Math.abs(a.img.w - side) < 2 && Math.abs(a.img.h - side) < 2 && Math.abs(a.img.l + a.img.w / 2 - a.vw / 2) < 2 && Math.abs(a.img.t + a.img.h / 2 - a.vh / 2) < 2, 'whole square image fits (contain), centred: ' + a.img.w.toFixed(0) + 'x' + a.img.h.toFixed(0) + ' in ' + a.vw + 'x' + a.vh);
  await page.screenshot({ path: 'shots/start' + sfx + '.png' });
  // dismiss: phone = tap on the joystick area; desktop = click (Enter on a 2nd run below)
  if (PH) await page.touchscreen.tap(a.vw * 0.25, a.vh * 0.8); else await page.mouse.click(a.vw * 0.5, a.vh * 0.5);
  if (!PH) await page.keyboard.press('Enter');   // a key right after the click must not reach the cabinet either
  await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 5000 }).catch(() => {});
  const b = await S();
  chk(!b.exists && b.st.dismissed && b.st.audio, 'tap dismisses it (' + b.st.how + '), faded out and removed; audio unlocked ' + JSON.stringify([b.exists, b.st]));
  chk(JSON.stringify(b.pos) === JSON.stringify(a.pos) && b.face === a.face, 'monkey has not moved ' + JSON.stringify([a.pos, b.pos]));
  chk(b.cs === a.cs && b.cg === a.cg && b.t === a.t && b.coin === a.coin && b.mode === 'walk', 'no credit, ticket or coin changed, no zoom started');
  // now the arcade takes input normally
  if (PH) await page.tap('#bPlay'); else await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  chk((await S()).mode === 'zoomIn', 'after the start screen, PLAY works normally');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await o.close();
  // key dismiss
  if (!PH) { const o2 = await open({ start: true }); await o2.page.waitForTimeout(800); const t0 = await o2.page.evaluate(() => window.__arcade.play.tickets.total);
    await o2.page.keyboard.press('KeyE'); await o2.page.waitForTimeout(900);
    const r = await o2.page.evaluate(() => ({ st: window.__start, ex: !!document.getElementById('start'), t: window.__arcade.play.tickets.total, mode: window.__arcade.play.mode }));
    chk(r.st.dismissed && r.st.how === 'keydown' && !r.ex && r.t === t0 && r.mode === 'walk', 'any key dismisses it too, and the key is not used');
    await o2.page.setViewportSize({ width: 1600, height: 700 }); await o2.close(); }
  process.exit(ok ? 0 : 1);
})();
