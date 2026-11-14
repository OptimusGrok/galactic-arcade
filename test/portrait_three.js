// t765u: Ghost 256, Strike and Cybercity are upright games. t787u: Monkey Crossing too. t799u: the Claw Machine too. On a portrait phone (390x844) they play the normal way up,
// full screen: the arcade drops its landscape lock (asks for portrait), shows no "turn sideways" hint, nothing is rotated,
// the game fills the viewport, the close X sits tight top-left.
// t766u: leaving one goes BACK to the side (landscape) view on every exit path (X, Esc, HOME, fullscreen lost mid-game, an
// exit right after entering while the portrait request is still pending, safety net), same as after a normal cabinet.
// screen.orientation + fullscreen are stubbed like Android Chrome: lock() only works in fullscreen, a newer lock aborts an
// older pending one, leaving fullscreen drops the lock. The call order is recorded.
const { open } = require('./lib');
(async () => {
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 420) : '')); if (!c) ok = false; };
  const W = 390, H = 844, o = await open({ phone: true, w: W, h: H }), page = o.page; page.setDefaultTimeout(60000);
  const noStart = () => page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });
  await noStart();
  await page.evaluate(() => {
    const F = window.__F = { el: null, log: [], cur: 'natural', pend: null, delay: {} }, so = screen.orientation, D = document;
    Object.defineProperty(Document.prototype, 'fullscreenElement', { get() { return F.el; }, configurable: true });
    D.documentElement.requestFullscreen = function () { F.log.push('fs'); return new Promise(r => setTimeout(() => { if (!F.el) { F.el = D.documentElement; D.dispatchEvent(new Event('fullscreenchange')); } r(); }, 30)); };
    const abort = () => { if (F.pend) { const p = F.pend; F.pend = null; p.rej(new DOMException('aborted', 'AbortError')); } };
    so.lock = k => { F.log.push('lock:' + k); if (!F.el) return Promise.reject(new DOMException('not fullscreen', 'SecurityError')); abort();
      return new Promise((res, rej) => { const me = { rej }; F.pend = me; setTimeout(() => { if (F.pend !== me) return; F.pend = null; F.cur = k; F.log.push('=>' + k); res(); }, F.delay[k] || 20); }); };
    so.unlock = () => { F.log.push('unlock'); abort(); F.cur = 'natural'; };
    F.drop = () => { F.el = null; F.cur = 'natural'; abort(); F.log.push('fs-lost'); D.dispatchEvent(new Event('fullscreenchange')); };
    window.__wantWide && window.__wantWide();   // the arcade's own PLAY flow: full screen + landscape
  });
  await page.waitForTimeout(400);
  chk(await page.evaluate(() => __F.cur === 'landscape' && !!__F.el), 'arcade itself starts full screen in the side (landscape) view', await page.evaluate(() => __F.log));
  const enter = async (k, wait) => {
    await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(k => { __F.log.length = 0; const P = window.__arcade.play; P.start(P.machines[k]); }, k);
    if (wait === 0) return;
    await page.waitForFunction(() => { const P = window.__arcade.play; return P.mode === 'game' && P.sub === 'demo' && document.getElementById('bExit').style.display === 'block'; }, null, { timeout: 90000 }).catch(() => {});
    await page.evaluate(k => { const P = window.__arcade.play; P.machines[k].credits = 1; P.tryPlay(); }, k);
    await page.waitForTimeout(4500); };
  const tapX = async () => { const X = await page.locator('#bExit').boundingBox(); await page.touchscreen.tap(X.x + X.width / 2, X.y + X.height / 2); };
  const back = async (tag, how, base) => {
    const out = await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(1500);   // let every pending lock / fullscreen answer land
    const a = await page.evaluate(i => { const L = __F.log, locks = L.filter(x => /^lock:/.test(x)), lastL = L.lastIndexOf('lock:landscape');
      return { mode: window.__arcade.play.mode, log: L.slice(i), cur: __F.cur, fs: !!__F.el, lastLock: locks[locks.length - 1], portraitAfter: L.slice(lastL + 1).some(x => x === 'lock:portrait' || x === '=>portrait'),
        upright: document.body.classList.contains('upright'), hint: document.getElementById('turnHint').classList.contains('on') }; }, 0);
    chk(out, tag + ': ' + how + ' exits back to the room', a.mode);
    chk(a.cur === 'landscape' && a.fs && (a.lastLock === 'lock:landscape' || (base && !a.log.length)) && !a.portraitAfter, tag + ': ' + how + ' -> back to the side (landscape) view, full screen held, no later portrait request', a);
    chk(!a.upright && a.hint, tag + ': ' + how + ' -> sideways hint / state restored like any other cabinet', { upright: a.upright, hint: a.hint });
    if (!out) await page.evaluate(() => window.__arcade.play.exit('x')).catch(() => {});
    return a; };
  const paths = { ghost: 'close X', strike: 'Esc key', cyber: 'close X', monkey: 'close X', claw: 'close X' };
  for (const k of (process.env.PT_KEYS || 'ghost,strike,cyber,monkey,claw').split(',')) {
    await enter(k);
    const r = await page.evaluate(([W, H]) => {
      const f = document.getElementById('game'), w = f.contentWindow, d = w.document, R = b => [b.left, b.top, b.width, b.height].map(Math.round);
      const rot = e => { for (let q = e; q && q.nodeType === 1; q = q.parentElement) { const t = w.getComputedStyle(q).transform; if (t && t !== 'none') { const m = new w.DOMMatrix(t); if (Math.abs(m.b) > 0.01 || Math.abs(m.c) > 0.01) return (q.id || q.tagName) + ' ' + t; } } return null; };
      const cvs = [...d.querySelectorAll('canvas')].filter(c => { const b = c.getBoundingClientRect(), cs = w.getComputedStyle(c); return b.width > 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; });
      const main = cvs.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
      const mb = main ? main.getBoundingClientRect() : null;
      return { sub: window.__arcade.play.sub, frame: R(f.getBoundingClientRect()), inner: [w.innerWidth, w.innerHeight], log: __F.log.slice(), cur: __F.cur, upright: document.body.classList.contains('upright'),
        hint: document.getElementById('turnHint').classList.contains('on'), X: R(document.getElementById('bExit').getBoundingClientRect()), gaTop: w.__gaTop,
        main: main ? { id: main.id || main.className, box: R(mb), px: [main.width, main.height] } : null, rot: main ? rot(main) : 'no canvas', rootRot: rot(d.body),
        fill: mb ? +(mb.width * mb.height / (W * H)).toFixed(3) : 0, wfill: mb ? +(mb.width / W).toFixed(3) : 0 };
    }, [W, H]);
    const tag = k + ' ' + W + 'x' + H;
    chk(r.sub === 'play', tag + ': game running', r.sub);
    chk(r.cur === 'portrait' && r.upright, tag + ': the phone goes to normal portrait for the game', { log: r.log, cur: r.cur, upright: r.upright });
    chk(!r.hint, tag + ': no "turn your phone sideways" hint over the game');
    chk(r.frame[0] === 0 && r.frame[1] === 0 && r.frame[2] === W && r.frame[3] === H && r.inner[0] === W && r.inner[1] === H, tag + ': game frame is the full screen', { frame: r.frame, inner: r.inner });
    chk(!r.rot && !r.rootRot, tag + ': nothing rotated (game is upright)', { rot: r.rot, rootRot: r.rootRot });
    chk(r.main && r.wfill >= 0.95 && r.fill >= 0.4 && r.main.box[0] >= -1 && r.main.box[0] + r.main.box[2] <= W + 1 && r.main.box[1] + r.main.box[3] <= H + 1, tag + ': game picture fills the screen width (no small box)', { main: r.main, fill: r.fill, wfill: r.wfill });
    chk(r.X[0] <= 6 && r.X[1] <= 140 && r.X[2] >= 36 && r.gaTop === 46, tag + ': close X on the left, under the game stats (t808u phone layout; strip known to the game)', { X: r.X, gaTop: r.gaTop });
    if (paths[k] === 'Esc key') { await page.evaluate(() => { const f = document.getElementById('game'); f.focus(); f.contentWindow.focus(); }); await page.keyboard.press('Escape'); }
    else await tapX();
    await back(tag, paths[k]);
  }
  // fullscreen lost mid-game (Android drops the lock with it) -> the X re-requests fullscreen and locks landscape again
  await enter('ghost'); await page.evaluate(() => __F.drop()); await page.waitForTimeout(300); await tapX();
  const a1 = await back('ghost', 'close X after fullscreen was lost');
  chk(a1.log.includes('fs') || a1.log.includes('fullscreen'), 'ghost: fullscreen was re-requested on the way out', a1.log);
  // leave right after entering, while the portrait request is still pending (slow answer must not win)
  await page.evaluate(() => { __F.delay.portrait = 900; });
  await enter('strike', 0); await page.waitForTimeout(150); await page.evaluate(() => window.__arcade.play.mode).then(async m => { if (m !== 'game') await page.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 90000 }).catch(() => {}); });
  await page.waitForFunction(() => document.getElementById('bExit').style.display === 'block', null, { timeout: 90000 }).catch(() => {});
  await page.evaluate(() => { __F.delay.portrait = 900; const P = window.__arcade.play; window.__orient(true); }); await page.waitForTimeout(100); await tapX();
  await back('strike', 'close X while the portrait request is still pending');
  await page.evaluate(() => { __F.delay.portrait = 0; });
  // safety net: if something ever leaves the upright state behind outside a game, the side view comes back by itself
  await page.evaluate(() => { __F.log.length = 0; document.body.classList.add('upright'); screen.orientation.lock('portrait'); });
  await back('cyber', 'stale upright state outside a game (safety net)');
  // baseline: a normal (non-upright) cabinet leaves the phone in the same side view
  await enter('rockfall'); await tapX(); const b0 = await back('rockfall', 'close X (normal cabinet, baseline: lock untouched, stays landscape)', true);
  // HOME from inside an upright game
  await enter('cyber'); await page.evaluate(() => window.__arcade.play.home.go()); await noStart(); await back('cyber', 'HOME button');
  const errs = o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase|reading 'isReady'|AbortError|not fullscreen/i.test(e));
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
