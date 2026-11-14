// t787u: Monkey Crossing plays upright (portrait), flipping from sideways, like Ghost 256 / Strike / Cybercity.
// Full-screen iframe, no CSS rotation, arcade landscape lock released, close X top-left, tickets still award
// through the arcade copy. Leaving re-locks the side (landscape) view. No screenshots. 390x844 portrait phone.
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 420) : '')); if (!c) ok = false; };
(async () => {
  const W = 390, H = 844, o = await open({ phone: true, w: W, h: H }), page = o.page, { errors } = o;
  page.setDefaultTimeout(60000);
  await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });
  await page.evaluate(() => {
    const F = window.__F = { el: null, log: [], cur: 'natural', pend: null, delay: {} }, so = screen.orientation, D = document;
    Object.defineProperty(Document.prototype, 'fullscreenElement', { get() { return F.el; }, configurable: true });
    D.documentElement.requestFullscreen = function () { F.log.push('fs'); return new Promise(r => setTimeout(() => { if (!F.el) { F.el = D.documentElement; D.dispatchEvent(new Event('fullscreenchange')); } r(); }, 30)); };
    const abort = () => { if (F.pend) { const p = F.pend; F.pend = null; p.rej(new DOMException('aborted', 'AbortError')); } };
    so.lock = k => { F.log.push('lock:' + k); if (!F.el) return Promise.reject(new DOMException('not fullscreen', 'SecurityError')); abort();
      return new Promise((res, rej) => { const me = { rej }; F.pend = me; setTimeout(() => { if (F.pend !== me) return; F.pend = null; F.cur = k; F.log.push('=>' + k); res(); }, F.delay[k] || 20); }); };
    so.unlock = () => { F.log.push('unlock'); abort(); F.cur = 'natural'; };
    window.__wantWide && window.__wantWide();
  });
  await page.waitForTimeout(400);

  const mode = await page.evaluate(() => {
    const m = window.__arcade.play.machines.monkey, g = window.__arcade.play.machines.ghost;
    return { monkeyUpright: !!m.upright, ghostUpright: !!g.upright, aspect: m.aspect, src: m.src };
  });
  chk(mode.monkeyUpright && mode.ghostUpright, 'Monkey Crossing is flagged upright like Ghost 256', mode);
  chk(Math.abs(mode.aspect - 9 / 16) < 1e-6 && /monkey-play/.test(mode.src), 'cabinet aspect is still the original 9:16 portrait screen', mode);

  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 20; localStorage.setItem('neonarcade.tickets', '20'); p.machines.monkey.credits = 1; });
  await page.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.monkey); });
  await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('bExit') && document.getElementById('bExit').style.display === 'block', null, { timeout: 90000 });
  await page.evaluate(() => { const P = window.__arcade.play; P.machines.monkey.credits = 1; P.tryPlay(); });
  await page.waitForTimeout(4500);
  await page.waitForFunction(() => { const f = document.getElementById('game'); return f && f.contentWindow && f.contentWindow.__M; }, null, { timeout: 20000 });

  const play = await page.evaluate(([W, H]) => {
    const f = document.getElementById('game'), w = f.contentWindow, d = w.document, R = b => [b.left, b.top, b.width, b.height].map(Math.round);
    const rot = e => { for (let q = e; q && q.nodeType === 1; q = q.parentElement) { const t = w.getComputedStyle(q).transform; if (t && t !== 'none') { const m = new w.DOMMatrix(t); if (Math.abs(m.b) > 0.01 || Math.abs(m.c) > 0.01) return (q.id || q.tagName) + ' ' + t; } } return null; };
    const cvs = [...d.querySelectorAll('canvas')].filter(c => { const b = c.getBoundingClientRect(), cs = w.getComputedStyle(c); return b.width > 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; });
    const main = cvs.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
    const mb = main ? main.getBoundingClientRect() : null;
    return {
      sub: window.__arcade.play.sub, state: w.__M.state,
      upright: document.body.classList.contains('upright'),
      hint: document.getElementById('turnHint') && document.getElementById('turnHint').classList.contains('on'),
      cur: window.__F && window.__F.cur,
      frame: R(f.getBoundingClientRect()), inner: [w.innerWidth, w.innerHeight],
      rot: main ? rot(main) : 'no canvas', rootRot: rot(d.body),
      fill: mb ? +(mb.width * mb.height / (W * H)).toFixed(3) : 0, wfill: mb ? +(mb.width / W).toFixed(3) : 0,
      X: R(document.getElementById('bExit').getBoundingClientRect()), gaTop: w.__gaTop
    };
  }, [W, H]);
  chk(play.sub === 'play' && play.state === 'play', 'Monkey Crossing is running', play);
  chk(play.cur === 'portrait' && play.upright, 'the phone goes to normal portrait for Monkey Crossing', play);
  chk(!play.hint, 'no “turn your phone sideways” hint over the game');
  chk(play.frame[0] === 0 && play.frame[1] === 0 && play.frame[2] === W && play.frame[3] === H && play.inner[0] === W && play.inner[1] === H, 'game frame is the full portrait screen', play);
  chk(!play.rot && !play.rootRot, 'nothing is rotated (the game is upright, not sideways)', { rot: play.rot, rootRot: play.rootRot });
  chk(play.wfill >= 0.95 && play.fill >= 0.4, 'the game picture fills the portrait screen', { fill: play.fill, wfill: play.wfill });
  chk(play.X[0] <= 6 && play.X[1] <= 140 && play.X[2] >= 36 && play.gaTop === 46, 'close X on the left, under the game stats (t808u phone layout)', { X: play.X, gaTop: play.gaTop });

  const tix = await page.evaluate(() => {
    const t0 = window.__arcade.play.tickets.total;
    const w = document.getElementById('game').contentWindow;
    const hook = typeof window.__neonTicket;
    w.parent.__neonTicket(1, 'monkey');
    return { hook, t0, t1: window.__arcade.play.tickets.total, keys: { best: localStorage.getItem('arcade_mc_best'), tot: localStorage.getItem('arcade_mc_tickets') } };
  });
  chk(tix.hook === 'function' && tix.t1 === tix.t0 + 1, 'the arcade copy still awards tickets to the cabinet total', tix);

  const X = await page.locator('#bExit').boundingBox();
  await page.touchscreen.tap(X.x + X.width / 2, X.y + X.height / 2);
  await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => ({
    mode: window.__arcade.play.mode, cur: window.__F.cur, fs: !!window.__F.el,
    upright: document.body.classList.contains('upright'),
    hint: document.getElementById('turnHint') && document.getElementById('turnHint').classList.contains('on'),
    lastLock: window.__F.log.filter(x => /^lock:/.test(x)).pop()
  }));
  chk(back.mode === 'walk' && back.cur === 'landscape' && back.fs && back.lastLock === 'lock:landscape' && !back.upright,
    'leaving Monkey Crossing goes back to the side (landscape) view', back);

  const bad = errors.filter(e => !/supabase|AbortError|Failed to load|AudioContext|not fullscreen/i.test(e));
  chk(bad.length === 0, 'no page errors', bad.slice(0, 4));
  await o.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
