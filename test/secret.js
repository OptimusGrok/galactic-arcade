// hidden ticket menu: triple-tap top-right -> 3x3 keypad pattern (1-4-7-2-9-6-3-8-5, digit tiles) -> TICKETS panel. node test/secret.js [phone]
const { open, play } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open(PH ? { phone: true, start: true, w: 412, h: 860 } : { start: true, w: 1280, h: 720 }); const { page, errors } = o;
  const ev = (f, a) => page.evaluate(f, a);
  const W = PH ? 412 : 1280;
  const tapXY = async (x, y) => { if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const tap = async sel => { const r = await ev(s => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, sel); await tapXY(r[0], r[1]); };
  const secOn = () => ev(() => !!document.querySelector('#sec.on'));
  await page.waitForTimeout(1200);
  await ev(() => localStorage.setItem('neonarcade.tickets', '3'));
  await tapXY(W - 30, 30); await page.waitForTimeout(1500); chk(!(await secOn()), '1 tap: nothing');
  await tapXY(W - 30, 30); await page.waitForTimeout(150); await tapXY(W - 30, 30); await page.waitForTimeout(1500); chk(!(await secOn()), '2 taps: nothing');
  const vis = await ev(() => getComputedStyle(document.getElementById('secHot')).backgroundColor); chk(/rgba\(0, 0, 0, 0\)|transparent/.test(vis), 'hot spot invisible');
  await ev(() => { const h = document.getElementById('secHot'), r = h.getBoundingClientRect(); for (let i = 0; i < 3; i++) h.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + 30, clientY: r.top + 30 })); });   // 3 quick taps (SwiftShader is too slow for 3 real taps inside 1.2 s)
  await page.waitForTimeout(300); chk(await secOn(), "3 quick taps open the pattern pad (taps " + await ev(() => window.__start.hotTaps) + ")");
  const D = await ev(() => { const r = document.getElementById('secP').getBoundingClientRect(), o = []; for (let i = 0; i < 9; i++) o.push([r.left + r.width * (0.17 + 0.33 * (i % 3)), r.top + r.height * (0.17 + 0.33 * Math.floor(i / 3))]); return o; });
  const swipe = async (seq, shot) => { const p = seq.map(n => D[n - 1]); await page.mouse.move(p[0][0], p[0][1]); await page.mouse.down();
    for (let k = 1; k < p.length; k++) { await page.mouse.move(p[k][0], p[k][1], { steps: 8 }); if (shot && k === 3) { await page.mouse.move(p[k][0] + (p[k+1][0]-p[k][0]) * 0.5, p[k][1] + (p[k+1][1]-p[k][1]) * 0.5, { steps: 4 }); await page.screenshot({ path: shot }); } }
    await page.mouse.up(); await page.waitForTimeout(150); };
  const pad = await ev(() => { const r = document.getElementById('secP').getBoundingClientRect(), x = document.getElementById('secX').getBoundingClientRect(); return { w: r.width, l: r.left, r: r.right, vw: innerWidth, x: [x.top, x.right, x.width] }; });
  chk(!PH || (pad.w >= pad.vw * 0.88 && pad.l >= 0 && pad.r <= pad.vw), 'pad nearly full width on phones (' + pad.w.toFixed(0) + ' of ' + pad.vw + ' px)');
  chk(pad.x[0] >= 0 && pad.x[1] <= pad.vw && pad.x[2] >= 40, 'close X on screen and tappable ' + JSON.stringify(pad.x));
  await page.screenshot({ path: `shots/secret_pad_numbers${sfx}.png` });
  await swipe([1, 2, 3, 6, 9]); let s = await ev(() => ({ bad: window.__start.secBad, tk: !!document.querySelector('#tk.on'), sec: !!document.querySelector('#sec.on') }));
  chk(s.bad === 1 && !s.tk && s.sec, 'wrong pattern 1-2-3-6-9 rejected (pad stays)');
  await page.waitForTimeout(600);
  await swipe([1, 5, 9, 6, 3]); s = await ev(() => ({ bad: window.__start.secBad, pat: window.__start.pat, tk: !!document.querySelector('#tk.on') }));
  chk(s.bad === 2 && !s.tk && s.pat === '15963', 'old pattern 1-5-9-6-3 rejected');
  // health check: the wrong-pattern redraw (450 ms later) must not throw if the pad was hidden meanwhile (0x0 canvas)
  { const e0 = errors.length; await swipe([1, 2, 3, 6, 9]); await ev(() => { document.getElementById('sec').classList.remove('on'); document.getElementById('secP').style.display = 'none'; }); await page.waitForTimeout(900);
    chk(errors.length === e0, 'wrong pattern then pad hidden: no drawImage error ' + errors.slice(e0).join('|')); await ev(() => { document.getElementById('secP').style.display = ''; document.getElementById('sec').classList.add('on'); }); await page.waitForTimeout(300); }
  await page.waitForTimeout(600);
  // knight-like jumps 7>2, 2>9, 3>8 must not pick up 4 / 5 / 6 on the way; screenshot with the whole pattern drawn, finger still down
  const NEW = [1, 4, 7, 2, 9, 6, 3, 8, 5]; { const p = NEW.map(n => D[n - 1]); await page.mouse.move(p[0][0], p[0][1]); await page.mouse.down(); for (let k = 1; k < p.length; k++) await page.mouse.move(p[k][0], p[k][1], { steps: 8 });
    const mid = await ev(() => window.__start.pat); chk(mid === '147296385', 'path registers exactly 1-4-7-2-9-6-3-8-5, nothing auto-inserted (' + mid + ')');
    await page.screenshot({ path: `shots/secret_pad_new${sfx}.png` }); await page.mouse.up(); await page.waitForTimeout(450); }
  s = await ev(() => ({ pat: window.__start.pat, tk: !!document.querySelector('#tk.on'), g: document.getElementById('tkG').textContent }));
  chk(s.tk && s.pat === '147296385' && s.g === '3', 'new pattern 1-4-7-2-9-6-3-8-5 opens TICKETS panel showing 3');
  for (const g of [1, 5, 10, 50]) await tap(`.tkB[data-g="${g}"]`);
  await tap('.tkB[data-v="1"]'); await page.waitForTimeout(200);
  s = await ev(() => ({ t: localStorage.getItem('neonarcade.tickets'), v: localStorage.getItem('neonarcade.vikingTickets'), g: document.getElementById('tkG').textContent, hud: document.getElementById('tixN').textContent, vh: document.getElementById('vixN').textContent, P: window.__arcade.play.tickets.total }));
  chk(s.t === '69' && s.v === '1' && s.g === '69', 'adds go into the session progress (69 gold, 1 viking)');
  chk(s.hud === '69' && s.vh === '1' && s.P === 69, 'ticket HUD / game counter updated');
  await page.screenshot({ path: `shots/secret_tickets${sfx}.png` });
  await tap('#tkDone'); await page.waitForTimeout(200);
  chk(!(await ev(() => !!document.querySelector('#tk.on'))) && !(await ev(() => window.__start.dismissed)), 'DONE closes panel, still on start screen');
  await play(page, PH, 'Astro');
  chk(await ev(() => !document.getElementById('start') && window.__arcade.play.tickets.total === 69), 'name + PLAY enters with 69 tickets');
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
