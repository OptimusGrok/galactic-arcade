// No flash of Arcade's old start art/buttons: every animation frame from the very first one, #stBox/#stBtns must be invisible.
// Cold load (no SW) then a reload once the service worker controls the page (cached).
const { open } = require('./lib');
(async () => {
  let o; for (let i = 0; ; i++) { try { o = await open({ phone: true, start: true, w: 412, h: 915 }); break; } catch (e) { if (i >= 3) throw e; console.log('retry open'); } }
  const { page, errors } = o; let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); if (!c) ok = false; };
  await page.context().addInitScript(() => { const L = window.__fp = { frames: 0, seen: 0, firstOurs: -1, startAt: -1 };
    const look = () => { L.frames++; const s = document.getElementById('start'); if (s && L.startAt < 0) L.startAt = L.frames;
      for (const id of ['stBox', 'stBtns', 'stStart']) { const e = document.getElementById(id); if (e) { const cs = getComputedStyle(e); if (cs.visibility !== 'hidden' && cs.opacity !== '0' && e.getBoundingClientRect().height > 0) { let v = true; for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') v = false; } if (v) L.seen++; } } }
      if (document.getElementById('gaP') && L.firstOurs < 0) L.firstOurs = L.frames; if (L.frames < 400) requestAnimationFrame(look); };
    requestAnimationFrame(look); new MutationObserver(() => { look(); }).observe(document, { childList: true, subtree: true }); });
  for (const kind of ['cold (no SW)', 'cached (SW)']) {
    await page.reload({ timeout: 120000 }); await page.waitForFunction(() => window.__fp && window.__fp.frames > 60, null, { timeout: 90000 });
    const r = await page.evaluate(() => Object.assign({ sw: !!navigator.serviceWorker.controller }, window.__fp));
    chk(r.seen === 0 && r.firstOurs >= 0, kind + ': old start art/buttons never visible', r);
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: '/tmp/fp.png' });
  chk(errors.length === 0, 'no page errors', errors); await o.close(); process.exit(ok ? 0 : 1);
})();
