// t558: Grok's shop is a sideways-swipe hologram row of prize tiles; no speech bubble, voice kept; buy works; player moves after closing.
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 412, h: 915 }); let ok = true;
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const cdp = await page.context().newCDPSession(page); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const at = sel => page.evaluate(s => { const el = document.querySelector(s), r = el.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2, e = document.elementFromPoint(x, y); return { x, y, hit: !!e && (e === el || el.contains(e)) }; }, sel);
  const tap = async sel => { const b = await at(sel); await T('touchStart', [{ x: b.x, y: b.y, id: 7 }]); await T('touchEnd', []); await page.waitForTimeout(300); return b; };
  await page.evaluate(() => { window.__plays = []; window.__tts = []; const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__plays.push(this.src); return P.call(this).catch(() => {}); };
    window.__tts = []; try { const S = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { window.__tts.push(u.text); try { S(u); } catch (e) {} }; } catch (e) {}
    const A = window.__arcade; A.monkey.position.set(83, 0, 0.3); A.st.yaw = -0.62; A.play.tickets.total = 300; });
  await page.waitForFunction(() => document.querySelector('#shopBtn.on'), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => { window.__tts = []; }); await tap('#shopBtn'); await page.waitForTimeout(1800);
  let s = await page.evaluate(() => { const L = document.getElementById('holoL'), t = [...L.querySelectorAll('.hT')], a = t[0].getBoundingClientRect(), b = t[1].getBoundingClientRect(), im = t[0].querySelector('img').getBoundingClientRect(), n = t[0].querySelector('.hN').getBoundingClientRect(), pr = t[0].querySelector('i').getBoundingClientRect(), cs = getComputedStyle(L);
    return { open: window.__shop.open, n: t.length, items: window.__shop.ITEMS.length, row: Math.abs(a.top - b.top) < 2 && b.left > a.left, sq: Math.abs(im.width - im.height) < 2, nameTop: n.bottom <= im.top + 1, priceUnder: pr.top >= im.bottom - 1, pics: t.filter(x => x.querySelector('img').src.startsWith('data:image/png')).length, ox: cs.overflowX, ta: cs.touchAction, snap: cs.scrollSnapType, bubble: !!document.getElementById('grokSay'), plays: window.__plays.filter(u => /grok_hi\.mp3/.test(u)).length }; });
  chk(s.open && s.n === s.items && s.row && s.sq && s.nameTop && s.priceUnder && s.pics === s.n, 'hologram row: ' + s.n + ' square picture tiles side by side, name on top, price under ' + JSON.stringify(s));
  chk(s.ox === 'auto' && /pan-x/.test(s.ta) && /x/.test(s.snap), 'row scrolls sideways (overflow-x auto, pan-x, snap)');
  chk(!s.bubble, 'no #grokSay bubble element');
  const gp = await page.evaluate(async () => ({ how: await Promise.race([window.__shop.greetPlayed, new Promise(r => setTimeout(() => r('timeout'), 4000))]), voice: window.__shop.voice, greets: window.__shop.greets, ac: window.__unlockAC && window.__unlockAC.state, tts: window.__tts.length }));
  chk((gp.how === 'webaudio' || gp.how === 'clip') && gp.greets === 1 && gp.tts === 0, 'Shop tap: welcome grok_hi.mp3 plays (play resolved, no TTS) ' + JSON.stringify(gp) + ' el.play calls ' + s.plays);
  await page.screenshot({ path: '/workspace/galactic-shop/shots/holo_shop.png' });
  for (let k = 0; k < 12; k++) { await T('touchStart', [{ x: 360, y: (await at('#holoL')).y, id: 1 }]); for (let i = 1; i <= 8; i++) await T('touchMove', [{ x: 360 - i * 38, y: (await at('#holoL')).y, id: 1 }]); await T('touchEnd', []); await page.waitForTimeout(250); }
  await page.waitForTimeout(600);
  s = await page.evaluate(() => { const L = document.getElementById('holoL'), last = L.querySelector('.hT:last-child').getBoundingClientRect(), r = L.getBoundingClientRect(); return { sl: Math.round(L.scrollLeft), max: L.scrollWidth - L.clientWidth, lastIn: last.right <= r.right + 2 && last.left >= r.left - 2 }; });
  chk(s.max > 0 && s.sl >= s.max - 2 && s.lastIn, 'finger swipe scrolls to the last item ' + JSON.stringify(s));
  const last = await page.evaluate(() => window.__shop.ITEMS[window.__shop.ITEMS.length - 1]);
  const t0 = await page.evaluate(() => window.__arcade.play.tickets.total); chk(t0 === 300 && (await page.evaluate(() => window.__shop.buys)) === 0, 'opening tap + swiping bought nothing ' + t0);
  await tap(`#holoL button[data-id="${last.id}"]`);
  s = await page.evaluate(id => ({ t: window.__arcade.play.tickets.total, held: window.__shop.held, said: window.__shop.said.slice(-1)[0], tts: window.__tts.slice(-1)[0], bubble: !!document.querySelector('#grokSay, .on#grokSay'), open: window.__shop.open }), last.id);
  chk(s.t === t0 - last.price && s.held === last.id && !s.tts && s.open, 'BUY tap buys the last item, no voice line (t559) ' + JSON.stringify(s));
  await page.evaluate(() => { window.__arcade.play.tickets.total = 0; }); await page.evaluate(() => window.__shop.open && document.querySelector('#holoL').scrollTo(0, 0)); await page.waitForTimeout(300);
  await tap('#holoL button[data-id="' + (await page.evaluate(() => window.__shop.ITEMS[0].id)) + '"]');
  s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, tts: window.__tts.slice(-1)[0] }));
  chk(s.t === 0 && !s.tts, 'not enough tickets: no buy, nothing spoken ' + JSON.stringify(s));
  const anyBubble = await page.evaluate(() => [...document.querySelectorAll('body *')].some(e => e.id === 'grokSay' || (/Great choice|tickets and you've got/.test(e.textContent || '') && e.children.length === 0 && e.offsetParent)));
  chk(!anyBubble, 'no speech/text bubble anywhere');
  const x = await at('#holoX'); chk(x.hit, 'close ✕ reachable ' + JSON.stringify(x));
  await tap('#holoX'); chk(!(await page.evaluate(() => window.__shop.open)), 'close works');
  const f0 = await page.evaluate(() => window.__arcade.stats.frames); await page.waitForTimeout(1500); const fr = (await page.evaluate(() => window.__arcade.stats.frames)) - f0;
  const p0 = await page.evaluate(() => window.__arcade.monkey.position.clone());
  await T('touchStart', [{ x: 100, y: 700, id: 1 }]); for (let i = 1; i <= 6; i++) await T('touchMove', [{ x: 100, y: 700 - i * 8, id: 1 }]);
  const p1 = await page.evaluate(() => { const A = window.__arcade; for (let i = 0; i < 60; i++) A.step(1 / 60); return A.monkey.position.clone(); }); await T('touchEnd', []);
  const d = Math.hypot(p1.x - p0.x, p1.z - p0.z); chk(fr > 0 && d > 0.5, `player moves after closing (+${fr} frames, ${d.toFixed(2)}m)`);
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); await close();
})();
