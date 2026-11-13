// t767u: on iPad (iPadOS UA, and iPadOS "desktop" Safari = MacIntel + multi-touch) Galactic Arcade never forces the side view:
// no orientation lock / fullscreen request, no "turn sideways" hint, the world renders and fills the screen as held
// (portrait and landscape), HUD buttons are reachable (not covered), and cabinet games (upright + normal) open full screen
// with the close X top-left and exit back to the room - all without any lock call.
const { open } = require('./lib');
const UAS = {
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' };
const init = mode => {
  if (mode === 'ipadDesktop') { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel', configurable: true }); Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5, configurable: true }); }
  const L = window.__lockCalls = [];
  try { const so = screen.orientation; so.lock = k => { L.push('lock:' + k); return Promise.resolve(); }; so.unlock = () => { L.push('unlock'); }; } catch (e) {}
  const rf = Element.prototype.requestFullscreen; Element.prototype.requestFullscreen = function () { L.push('fullscreen'); return Promise.resolve(); };
};
(async () => {
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) ok = false; };
  const sizes = (process.env.IPAD_SIZES || '820x1180,1024x1366,1180x820').split(',').map(s => s.split('x').map(Number));
  for (const mode of (process.env.IPAD_MODES || 'ipad,ipadDesktop').split(',')) {
    const [w0, h0] = sizes[0], o = await open({ phone: true, w: w0, h: h0, ua: UAS[mode], init: `(${init})(${JSON.stringify(mode)})` }), page = o.page; page.setDefaultTimeout(60000);
    await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; window.__wantWide && window.__wantWide(); });   // what PLAY does
    chk(await page.evaluate(() => window.__isIPad === true), mode + ': detected as iPad');
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(1500);
      const tag = mode + ' ' + w + 'x' + h;
      const r = await page.evaluate(() => { const c = document.querySelector('body > canvas'), b = c.getBoundingClientRect(), A = window.__arcade, f0 = A.stats.frames;
        const hud = ['bView', 'bOpt', 'flBtn', 'tix'].map(id => { const e = document.getElementById(id); if (!e) return [id, 'missing']; const q = e.getBoundingClientRect(); if (!q.width || getComputedStyle(e).display === 'none') return [id, 'hidden'];
          const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return [id, q.left >= 0 && q.top >= 0 && q.right <= innerWidth && q.bottom <= innerHeight && t && (t === e || e.contains(t)) ? 'ok' : 'blocked:' + (t ? t.id || t.tagName : 'none')]; });
        return new Promise(res => setTimeout(() => res({ W: innerWidth, H: innerHeight, cv: [b.left, b.top, b.width, b.height].map(Math.round), frames: A.stats.frames - f0, hint: document.getElementById('turnHint').classList.contains('on'),
          hintVis: getComputedStyle(document.getElementById('turnHint')).display, locks: window.__lockCalls.slice(), hud }), 3000)); });
      chk(!r.hint && r.hintVis === 'none', tag + ': no "turn sideways" hint', { hint: r.hint, display: r.hintVis });
      chk(r.locks.length === 0, tag + ': no orientation lock / fullscreen request', r.locks);
      chk(r.frames >= 2 && r.cv[0] === 0 && r.cv[1] === 0 && Math.abs(r.cv[2] - r.W) <= 1 && Math.abs(r.cv[3] - r.H) <= 1, tag + ': the world renders and fills the screen as held', { frames: r.frames, cv: r.cv, W: r.W, H: r.H });
      chk(r.hud.every(([, s]) => s === 'ok' || s === 'hidden') && r.hud.some(([, s]) => s === 'ok'), tag + ': HUD buttons on screen and not covered', r.hud);
    }
    await page.setViewportSize({ width: w0, height: h0 }); await page.waitForTimeout(1200);
    for (const k of ['ghost', 'rockfall']) {
      const tag = mode + ' ' + w0 + 'x' + h0 + ' ' + k;
      await page.evaluate(k => { const P = window.__arcade.play; P.start(P.machines[k]); }, k);
      await page.waitForFunction(() => { const P = window.__arcade.play; return P.mode === 'game' && P.sub === 'demo' && document.getElementById('bExit').style.display === 'block'; }, null, { timeout: 90000 }).catch(() => {});
      await page.evaluate(k => { const P = window.__arcade.play; P.machines[k].credits = 1; P.tryPlay(); }, k);
      await page.waitForTimeout(4000);
      const g = await page.evaluate(() => { const f = document.getElementById('game'), b = f.getBoundingClientRect(), X = document.getElementById('bExit').getBoundingClientRect();
        return { sub: window.__arcade.play.sub, frame: [b.left, b.top, b.width, b.height].map(Math.round), W: innerWidth, H: innerHeight, X: [X.left, X.top, X.width].map(Math.round),
          hint: document.getElementById('turnHint').classList.contains('on'), locks: window.__lockCalls.slice() }; });
      chk(g.sub === 'play' && g.frame[0] === 0 && g.frame[1] === 0 && g.frame[2] === g.W && g.frame[3] === g.H, tag + ': game plays full screen as held', g);
      chk(!g.hint && g.locks.length === 0, tag + ': no hint and no lock call in the game', { hint: g.hint, locks: g.locks });
      chk(g.X[0] <= 6 && g.X[1] <= 6 && g.X[2] >= 36, tag + ': close X top-left', g.X);
      const X = await page.locator('#bExit').boundingBox(); await page.touchscreen.tap(X.x + X.width / 2, X.y + X.height / 2);
      const out = await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(800);
      const a = await page.evaluate(() => ({ mode: window.__arcade.play.mode, locks: window.__lockCalls.slice(), hint: document.getElementById('turnHint').classList.contains('on') }));
      chk(out && a.locks.length === 0 && !a.hint, tag + ': X exits to the room, still no lock call / hint', a);
      if (!out) await page.evaluate(() => window.__arcade.play.exit('x')).catch(() => {});
    }
    const errs = o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase|reading 'isReady'/i.test(e));
    chk(errs.length === 0, mode + ': no page errors', errs.slice(0, 4));
    await o.close();
  }
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
