// t827u: pinch-to-zoom anywhere while playing Neon Bricks (two-finger pinch in/out, clamped)
// without breaking single-touch D-pad / MOVE / ZOOM. Phone and iPad. No screenshots.
// NOSHOTS=1 node test/neon_bricks_pinch.js
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) ok = false; };

function pinchScript() {
  return ({ el, w, h, z0, steps }) => {
    const tgt = el || document.body;
    const fire = (type, pts, rest) => {
      const list = pts.map(p => new Touch({ identifier: p.id, target: tgt, clientX: p.x, clientY: p.y }));
      const stay = (rest || pts).map(p => new Touch({ identifier: p.id, target: tgt, clientX: p.x, clientY: p.y }));
      const ev = new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' || type === 'touchcancel' ? (rest ? stay : []) : (rest ? stay : list), changedTouches: list });
      tgt.dispatchEvent(ev);
      document.dispatchEvent(ev);
    };
    const cx = (w || 400) / 2, cy = (h || 200) / 2;
    const r = [];
    fire('touchstart', [{ id: 11, x: cx - 50, y: cy }]);
    fire('touchstart', [{ id: 12, x: cx + 50, y: cy }], [{ id: 11, x: cx - 50, y: cy }, { id: 12, x: cx + 50, y: cy }]);
    r.push(window.__neonBricks.zoomAmt);
    fire('touchmove', [{ id: 11, x: cx - 120, y: cy }], [{ id: 11, x: cx - 120, y: cy }, { id: 12, x: cx + 50, y: cy }]);
    fire('touchmove', [{ id: 12, x: cx + 120, y: cy }], [{ id: 11, x: cx - 120, y: cy }, { id: 12, x: cx + 120, y: cy }]);
    r.push(window.__neonBricks.zoomAmt);
    fire('touchmove', [{ id: 11, x: cx - 20, y: cy }], [{ id: 11, x: cx - 20, y: cy }, { id: 12, x: cx + 120, y: cy }]);
    fire('touchmove', [{ id: 12, x: cx + 20, y: cy }], [{ id: 11, x: cx - 20, y: cy }, { id: 12, x: cx + 20, y: cy }]);
    r.push(window.__neonBricks.zoomAmt);
    fire('touchend', [{ id: 11, x: cx - 20, y: cy }], [{ id: 12, x: cx + 20, y: cy }]);
    fire('touchend', [{ id: 12, x: cx + 20, y: cy }]);
    return { before: z0, mid: r[0], out: r[1], inn: r[2], amt: window.__neonBricks.zoomAmt, min: window.__neonBricks.ZOOM_MIN, max: window.__neonBricks.ZOOM_MAX };
  };
}

async function runOn(label, opts) {
  const o = await open(opts), page = o.page, { errors } = o;
  page.setDefaultTimeout(60000);
  await page.waitForFunction(() => window.__arcade && window.__neonBricks && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(9.6, 0, 0.2); A.st.vel && A.st.vel.set && A.st.vel.set(0, 0, 0); window.__neonBricks.start(); });
  await page.waitForTimeout(80);
  const playing = await page.evaluate(() => ({ p: window.__neonBricks.playing, amt: window.__neonBricks.zoomAmt, min: window.__neonBricks.ZOOM_MIN, max: window.__neonBricks.ZOOM_MAX }));
  chk(playing.p && playing.min === 0 && playing.max === 1.4, label + ': game is playing with clamped pinch zoom 0..1.4', playing);

  const z0 = await page.evaluate(() => { const nb = window.__neonBricks; nb.setZoomAmt(0); return nb.zoomAmt; });
  const vp = opts.w && opts.h ? { w: opts.w, h: opts.h } : { w: 844, h: 390 };
  const pinch = await page.evaluate(pinchScript(), { el: null, w: vp.w, h: vp.h, z0 });
  chk(pinch.out > pinch.mid + 0.15, label + ': pinch apart zooms in', pinch);
  chk(pinch.inn < pinch.out - 0.15, label + ': pinch together zooms out', pinch);

  const clamp = await page.evaluate(() => {
    const nb = window.__neonBricks;
    const lo = nb.setZoomAmt(-4), hi = nb.setZoomAmt(9);
    return { lo, hi, min: nb.ZOOM_MIN, max: nb.ZOOM_MAX };
  });
  chk(clamp.lo === clamp.min && clamp.hi === clamp.max, label + ': zoom amount is clamped', clamp);

  // single-touch D-pad still moves the piece (does not start a pinch)
  const moved = await page.evaluate(() => {
    const nb = window.__neonBricks, x0 = nb.G.cur && nb.G.cur.x;
    nb.setZoomAmt(0.2);
    const pad = document.querySelector('#nbPad [data-nbd="r"]');
    pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', clientX: 40, clientY: 40 }));
    nb.move(1);
    pad.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch' }));
    return { x0, x1: nb.G.cur && nb.G.cur.x, amt: nb.zoomAmt, moves: nb.moves };
  });
  chk(moved.x1 === moved.x0 + 1 || moved.moves > 0, label + ': a single D-pad / move touch still shifts the block', moved);
  chk(Math.abs(moved.amt - 0.2) < 0.001, label + ': that single touch did not change the pinch zoom', moved);

  // ZOOM button still toggles full-screen
  const tog = await page.evaluate(() => {
    const nb = window.__neonBricks; nb.setZoomAmt(0);
    nb.toggleZoom(); const a = nb.zoomAmt, z = nb.zoom;
    nb.toggleZoom(); const b = nb.zoomAmt, z2 = nb.zoom;
    return { a, z, b, z2 };
  });
  chk(tog.a === 1 && tog.z && tog.b === 0 && !tog.z2, label + ': ZOOM button still toggles the playfield full screen and back', tog);

  chk(errors.length === 0, label + ': no page errors', errors);
  await o.close();
}

(async () => {
  await runOn('phone', { phone: true, w: 844, h: 390 });
  await runOn('iPad', { phone: true, w: 1024, h: 768, ua: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    init: `(() => { Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5, configurable: true }); })()` });
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message + '\n' + e.stack); process.exit(1); });
