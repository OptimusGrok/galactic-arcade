// t757u: on EVERY cabinet game the arcade close X sits tight in the top-left corner, the ticket pill beside it in the
// same strip, nothing (shell or game HUD) sits under them, the HUD that used to be there is below the strip, and the
// X still exits to the room. 844x390 landscape (+ a portrait pass for Sky Tower). CLOSE_SHOTS=dir saves screenshots.
const { open } = require('./lib');
const SHOTS = process.env.CLOSE_SHOTS || '', PICK = new Set((process.env.CLOSE_PICK || 'skytower,monkey,orc,ds,roadster,bb,berserker,pip,rockfall,nova').split(','));
(async () => {
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };
  // per game: HUD element(s) that the close X used to cover -> must now start below the strip
  const MOVED = { skytower: ['#hp', '#tixHud'], monkey: ['#score'], orc: ['.stat'], ds: ['#hpBox'], roadster: ['#dial'], rockfall: ['#hud > *'] };
  async function sweep(w, h, keys) {
    const o = await open({ phone: true, w, h }), page = o.page; page.setDefaultTimeout(60000);
    await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });
    keys = keys || await page.evaluate(() => Object.keys(window.__arcade.play.machines));
    for (const k of keys) {
      await page.evaluate(k => { const P = window.__arcade.play; P.start(P.machines[k]); }, k);
      await page.waitForFunction(() => { const P = window.__arcade.play; return P.mode === 'game' && P.sub === 'demo' && document.getElementById('bExit').style.display === 'block'; }, null, { timeout: 60000 }).catch(() => {});
      await page.evaluate(k => { const P = window.__arcade.play, m = P.machines[k]; m.credits = 1; P.tryPlay(); }, k);
      await page.waitForTimeout(4500);
      const r = await page.evaluate(([k, MOVED]) => {
        const X = document.getElementById('bExit').getBoundingClientRect(), T = document.getElementById('tix').getBoundingClientRect(), f = document.getElementById('game');
        const strip = { r: Math.max(X.right, T.width ? T.right : 0) + 4, b: Math.max(X.bottom, T.width ? T.bottom : 0) + 3 };
        const hits = [], vis = (e, w) => { const cs = w.getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
        const scan = (doc, w, ox, oy, tag) => { for (const e of doc.querySelectorAll('body *')) {
          if (/^(bExit|tix|vix)$/.test(e.id) || e.closest('#tix,#vix,#bExit') || /^(CANVAS|IFRAME|SCRIPT|STYLE|svg|path)$/i.test(e.tagName)) continue;
          const b = e.getBoundingClientRect(); if (b.width < 3 || b.height < 3 || b.width > innerWidth * 0.7 || b.height > innerHeight * 0.6) continue;
          const L = b.left + ox, Tp = b.top + oy; if (!(L < strip.r && L + b.width > 0 && Tp < strip.b && Tp + b.height > 0) || !vis(e, w)) continue;
          const cs = w.getComputedStyle(e), txt = (e.innerText || e.textContent || '').trim(); if (!txt && !e.querySelector('svg,img,canvas') && cs.backgroundImage === 'none' && /, 0\)$|transparent/.test(cs.backgroundColor) && cs.borderStyle === 'none') continue;
          hits.push(tag + ':' + (e.id ? '#' + e.id : e.tagName.toLowerCase()) + ' "' + txt.slice(0, 16) + '" @' + Math.round(L) + ',' + Math.round(Tp)); } };
        scan(document, window, 0, 0, 'shell'); let gaCab = null, gaTop = null, moved = null, fb = f.getBoundingClientRect();
        try { const w = f.contentWindow, d = w.document; scan(d, w, fb.left, fb.top, 'game'); gaCab = d.documentElement.classList.contains('gaCab'); gaTop = w.__gaTop;
          if (MOVED[k]) moved = MOVED[k].map(sel => { const e = [...d.querySelectorAll(sel)].find(q => q.getBoundingClientRect().width > 0); return e ? { sel, top: Math.round(e.getBoundingClientRect().top + fb.top) } : { sel, top: null }; });
          if (k === 'pip') moved = [{ sel: 'App.safe.t', top: w.__pip.App.safe.t > 0 ? 99 : 0 }];
          if (k === 'nova') moved = [{ sel: 'gaTopUnits', top: w.gaTopUnits && w.gaTopUnits() > 10 ? 99 : 0 }];
        } catch (e) { hits.push('ERR ' + e.message); }
        return { X: [X.left, X.top, X.width, X.height].map(Math.round), T: [T.left, T.top, T.right, T.bottom].map(Math.round), strip: [Math.round(strip.r), Math.round(strip.b)], sub: window.__arcade.play.sub, hits, gaCab, gaTop, moved };
      }, [k, MOVED]);
      const tag = k + ' ' + w + 'x' + h;
      chk(r.sub === 'play' && r.X[0] <= 6 && r.X[1] <= 6 && r.X[2] >= 36, tag + ': close X tight in the top-left corner', r.X);
      chk(r.T[1] <= 12 && r.T[0] >= r.X[0] + r.X[2] && r.T[3] <= r.X[1] + r.X[3] + 2, tag + ': ticket pill beside the X in the same strip (not under it)', r.T);
      chk(r.gaCab && r.gaTop === 46, tag + ': the game knows about the strip (html.gaCab, __gaTop 46)', { gaCab: r.gaCab, gaTop: r.gaTop });
      chk(r.hits.length === 0, tag + ': nothing sits under the X / ticket strip', r.hits);
      if (r.moved) chk(r.moved.every(m => m.top != null && m.top >= r.strip[1] - 3), tag + ': former top-left HUD now below the X', { moved: r.moved, strip: r.strip });
      if (SHOTS && PICK.has(k) && w > h) await page.screenshot({ path: SHOTS + '/ga-close-topleft-' + k + '.png' });
      // the X still leaves to the room
      const X = await page.locator('#bExit').boundingBox(); await page.touchscreen.tap(X.x + X.width / 2, X.y + X.height / 2);
      const out = await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).then(() => true).catch(() => false);
      chk(out, tag + ': tapping the X exits back to the room', await page.evaluate(() => ({ mode: window.__arcade.play.mode, last: window.__arcade.play.lastExit })));
      if (!out) await page.evaluate(() => window.__arcade.play.exit('x')).catch(() => {});
    }
    const errs = o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase|reading 'isReady'/i.test(e));
    chk(errs.length === 0, w + 'x' + h + ': no page errors', errs.slice(0, 4));
    await o.close();
  }
  await sweep(844, 390, process.env.CLOSE_KEYS ? process.env.CLOSE_KEYS.split(',') : null);
  await sweep(390, 844, ['skytower', 'monkey']);
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
