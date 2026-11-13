// t765u: Ghost 256, Strike and Cybercity are upright games. On a portrait phone (390x844) they play the normal way up,
// full screen: the arcade drops its landscape lock (asks for portrait), shows no "turn sideways" hint, nothing is rotated,
// the game fills the viewport, the close X sits tight top-left, and the X exits back to the room (landscape lock restored).
const { open } = require('./lib');
(async () => {
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) ok = false; };
  const W = 390, H = 844, o = await open({ phone: true, w: W, h: H }), page = o.page; page.setDefaultTimeout(60000);
  await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true;
    // record what the arcade asks of the phone's orientation (headless has no real lock)
    window.__ori = []; const so = screen.orientation;
    so.lock = m => { window.__ori.push(m); return Promise.resolve(); }; so.unlock = () => { window.__ori.push('unlock'); };
    window.__wantWide && window.__wantWide(); });   // the arcade's own PLAY flow locks landscape first
  chk(await page.evaluate(() => window.__ori.slice(-1)[0] === 'landscape'), 'arcade itself starts in the wide (landscape) lock', await page.evaluate(() => window.__ori));
  for (const k of (process.env.PT_KEYS || 'ghost,strike,cyber').split(',')) {
    await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(k => { window.__ori.length = 0; const P = window.__arcade.play; P.start(P.machines[k]); }, k);
    await page.waitForFunction(() => { const P = window.__arcade.play; return P.mode === 'game' && P.sub === 'demo' && document.getElementById('bExit').style.display === 'block'; }, null, { timeout: 90000 }).catch(() => {});
    await page.evaluate(k => { const P = window.__arcade.play; P.machines[k].credits = 1; P.tryPlay(); }, k);
    await page.waitForTimeout(4500);
    const r = await page.evaluate(([W, H]) => {
      const f = document.getElementById('game'), w = f.contentWindow, d = w.document, R = b => [b.left, b.top, b.width, b.height].map(Math.round);
      const rot = e => { for (let q = e; q && q.nodeType === 1; q = q.parentElement) { const t = w.getComputedStyle(q).transform; if (t && t !== 'none') { const m = new w.DOMMatrix(t); if (Math.abs(m.b) > 0.01 || Math.abs(m.c) > 0.01) return (q.id || q.tagName) + ' ' + t; } } return null; };
      const cvs = [...d.querySelectorAll('canvas')].filter(c => { const b = c.getBoundingClientRect(), cs = w.getComputedStyle(c); return b.width > 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; });
      const main = cvs.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
      const mb = main ? main.getBoundingClientRect() : null;
      return { sub: window.__arcade.play.sub, frame: R(f.getBoundingClientRect()), inner: [w.innerWidth, w.innerHeight], ori: window.__ori.slice(), upright: document.body.classList.contains('upright'),
        hint: document.getElementById('turnHint').classList.contains('on'), X: R(document.getElementById('bExit').getBoundingClientRect()), gaTop: w.__gaTop,
        main: main ? { id: main.id || main.className, box: R(mb), px: [main.width, main.height] } : null, rot: main ? rot(main) : 'no canvas', rootRot: rot(d.body),
        fill: mb ? +(mb.width * mb.height / (W * H)).toFixed(3) : 0, wfill: mb ? +(mb.width / W).toFixed(3) : 0 };
    }, [W, H]);
    const tag = k + ' ' + W + 'x' + H;
    chk(r.sub === 'play', tag + ': game running', r.sub);
    chk(r.ori.includes('portrait') && r.ori[r.ori.length - 1] !== 'landscape' && r.upright, tag + ': arcade drops the landscape lock and asks for normal portrait', { ori: r.ori, upright: r.upright });
    chk(!r.hint, tag + ': no "turn your phone sideways" hint over the game');
    chk(r.frame[0] === 0 && r.frame[1] === 0 && r.frame[2] === W && r.frame[3] === H && r.inner[0] === W && r.inner[1] === H, tag + ': game frame is the full screen', { frame: r.frame, inner: r.inner });
    chk(!r.rot && !r.rootRot, tag + ': nothing rotated (game is upright)', { rot: r.rot, rootRot: r.rootRot });
    chk(r.main && r.wfill >= 0.95 && r.fill >= 0.4 && r.main.box[0] >= -1 && r.main.box[0] + r.main.box[2] <= W + 1 && r.main.box[1] + r.main.box[3] <= H + 1, tag + ': game picture fills the screen width (no small box)', { main: r.main, fill: r.fill, wfill: r.wfill });
    chk(r.X[0] <= 6 && r.X[1] <= 6 && r.X[2] >= 36 && r.gaTop === 46, tag + ': close X tight top-left (strip known to the game)', { X: r.X, gaTop: r.gaTop });
    const X = await page.locator('#bExit').boundingBox(); await page.touchscreen.tap(X.x + X.width / 2, X.y + X.height / 2);
    const out = await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).then(() => true).catch(() => false);
    const a = await page.evaluate(() => ({ mode: window.__arcade.play.mode, ori: window.__ori.slice(), upright: document.body.classList.contains('upright'), hint: document.getElementById('turnHint').classList.contains('on') }));
    chk(out, tag + ': tapping the X exits back to the room', a.mode);
    chk(a.ori[a.ori.length - 1] === 'landscape' && !a.upright, tag + ': back in the room the wide (landscape) arcade view is restored', a);
    if (!out) await page.evaluate(() => window.__arcade.play.exit('x')).catch(() => {});
  }
  const errs = o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase|reading 'isReady'/i.test(e));
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
