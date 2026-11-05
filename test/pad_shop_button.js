// t266 regression: standing on the room-1 teleporter pad shows the SHOP button (phone + iPad), tapping it goes to the shop. node test/pad_shop_button.js
const { open, play } = require('./lib');
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  for (const [w, h] of (process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[390, 700], [712, 1024]])) {
    const { page, errors, close } = await open({ phone: true, w, h, start: true }); page.setDefaultTimeout(120000); await page.waitForTimeout(3000); await play(page, true, 'PadT' + w); await page.waitForTimeout(2500);
    await page.evaluate(() => { const A = window.__arcade, tp = A.tp || window.__tp; });
    const info = () => page.evaluate(() => { const b = document.getElementById('tpBtn'), r = b && b.getBoundingClientRect(), cs = b && getComputedStyle(b);
      const pk = document.getElementById('bPack'); return { has: !!b, on: b && b.classList.contains('on'), vis: cs && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.1, r: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        txt: b && b.textContent, top: (() => { if (!r || !r.width) return null; const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e && (e.id || e.tagName + '.' + e.className); })(), pack: pk && pk.className, inv: !!document.querySelector('#inv.on'), near: window.__tp && +window.__tp.near.toFixed(2), state: window.__tp && window.__tp.state, where: window.__tp && window.__tp.where, R: window.__tp && window.__tp.R, pos: [+window.__arcade.monkey.position.x.toFixed(2), +window.__arcade.monkey.position.z.toFixed(2)], mode: window.__arcade.play.mode }; });
    // walk to the pad: find it from the teleporter's exported position
    const pad = await page.evaluate(() => { const A = window.__arcade; let p = null; A.scene.traverse(o => { if (!p && /pad/i.test(o.name) && o.position && Math.abs(o.position.x) < 13 && Math.abs(o.position.z) < 13) p = [o.getWorldPosition(new A.THREE.Vector3()).x, o.getWorldPosition(new A.THREE.Vector3()).z, o.name]; }); return p; });
    await page.evaluate(p => { const A = window.__arcade; A.monkey.position.set(p[0], 0, p[1]); A.st.vel.set(0, 0, 0); }, pad);
    await page.waitForTimeout(1500); const i = await info(); console.log(w + 'x' + h, JSON.stringify(pad), JSON.stringify(i));
    const inView = i.r && i.r[0] >= 0 && i.r[1] >= 0 && i.r[0] + i.r[2] <= w && i.r[1] + i.r[3] <= h && i.r[2] > 0;
    chk(i.on && i.vis && inView && i.txt === 'SHOP' && i.top === 'tpBtn', `${w}x${h}: SHOP button shows on the pad`);
    if (i.on) { await page.screenshot({ path: `/workspace/ga-padfix/shots/pad_shop_${w}x${h}.png` });
      await page.evaluate(() => { window.__tpTimeScale = 4; }); await page.tap('#tpBtn'); await page.waitForFunction(() => window.__arcade.shop && window.__arcade.shop.open || document.body.classList.contains('inShop') || (window.__arcade.st && window.__arcade.monkey.position.x > 40), null, { timeout: 60000 }).catch(() => {});
      const s = await page.evaluate(() => ({ x: window.__arcade.monkey.position.x })); chk(s.x > 40, `${w}x${h}: tapping SHOP teleports to the shop ` + JSON.stringify(s)); 
      // come back from the shop (ARCADE button on the shop pad), step off, step back on: SHOP must show again
      await page.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(800);
      const sp = await info(); console.log('shop side', JSON.stringify(sp));
      if (sp.on) await page.tap('#tpBtn'); await page.waitForFunction(() => window.__arcade.monkey.position.x < 40 && window.__tp.state === 'idle', null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(1000);
      await page.evaluate(p => { const A = window.__arcade; A.monkey.position.set(p[0] + 3, 0, p[1] + 3); }, pad); await page.waitForTimeout(800);
      await page.evaluate(p => { const A = window.__arcade; A.monkey.position.set(p[0], 0, p[1]); A.st.vel.set(0, 0, 0); }, pad); await page.waitForTimeout(1500);
      const back = await info(); console.log('back', JSON.stringify(back)); chk(back.on && back.vis && back.txt === 'SHOP', `${w}x${h}: SHOP shows again after a shop round trip`);
    }
    chk(!errors.filter(e => !/ERR_FAILED/.test(e)).length, 'no page errors'); await close(); }
  process.exit(ok ? 0 : 1); })();
