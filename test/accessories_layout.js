// t738u: ACCESSORIES split layout at 844x390 landscape. The player preview fills the left column as tall as the screen allows, every
// row sits on the right with big icons/labels/arrows, nothing overflows, every control is tappable, and buy / equip / save still work.
// Monkey and alien. Portrait + WARDROBE keep the old stacked layout. Screenshots: ga-accessories-layout.png (monkey, wearing items),
// ga-accessories-layout-alien.png (in $SHOTS, default /workspace).
const { open } = require('./lib');
const OUT = (process.env.SHOTS || '/workspace') + '/', SH = process.env.NOSHOTS ? 0 : 1;
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) ok = false; };
const OLD = { cvH: 150, oH: 28, oW: 34, lab: 10 };   // v172 at 844x390: 460x150 preview strip, 34x28 icons, 10px labels, DONE below the fold
async function setup(page, ch, owned) {
  await page.evaluate(([ch, owned]) => { localStorage.setItem('galacticarcade.wardrobeMig', '1'); localStorage.setItem('galacticarcade.wardrobeOwned', JSON.stringify(owned));
    localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', char: ch, hat: 'crown', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'shades', back: 'wings' })); }, [ch, owned]);
  await page.reload(); await page.waitForFunction(() => window.__gaPlayer && window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 90000 });
  await page.evaluate(() => Promise.all([window.__arcade.shopReady].filter(Boolean)));
}
const T = (page, n) => page.evaluate(n => { window.__arcade.play.tickets.total = n; localStorage.setItem('neonarcade.tickets', String(n)); const e = document.getElementById('tixN'); if (e) e.textContent = n; }, n);
const measure = page => page.evaluate(() => { const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
  const e = document.getElementById('gaW'), G = window.__gaPlayer, p = G.prev, T = window.__arcade.THREE;
  const rows = [...e.querySelectorAll('.gaRow')].filter(r => !r.hidden), cv = e.querySelector('#gaWCv');
  // projected height of the preview player on the canvas
  const bb = new T.Box3(), tb = new T.Box3(); p.root.updateMatrixWorld(true); p.root.traverse(o => { if (!o.isMesh || !o.geometry) return; for (let q = o; q; q = q.parent) if (!q.visible) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bb.union(tb); });
  const ys = []; for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { const v = new T.Vector3(x, y, z).project(p.cam); ys.push(v.y); }
  const ph = (Math.max(...ys) - Math.min(...ys)) / 2 * cv.clientHeight, pTop = (1 - Math.max(...ys)) / 2 * cv.clientHeight;
  const hit = el => { const b = el.getBoundingClientRect(); const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!t && (t === el || el.contains(t)); };
  const firstO = rows.map(r => r.querySelector('.gaO')), arrows = rows.flatMap(r => [...r.querySelectorAll('.gaA')]);
  return { split: e.classList.contains('gaSplit'), title: e.querySelector('#gaWT').textContent, rows: rows.map(r => r.dataset.k).join(), cv: R(cv), box: R(e.querySelector('#gaWBox')), t: R(e.querySelector('#gaWT')), x: R(e.querySelector('#gaWX')), done: R(e.querySelector('#gaWDone')),
    L: R(e.querySelector('#gaWL')), Rr: R(e.querySelector('#gaWR')), o: R(firstO[0]), a: R(arrows[0]), lab: parseFloat(getComputedStyle(rows[0].querySelector('span')).fontSize), lk: parseFloat(getComputedStyle(e.querySelector('.gaLk') || e).fontSize),
    rowsIn: rows.every(r => { const b = r.getBoundingClientRect(), x = e.querySelector('#gaWBox').getBoundingClientRect(); return b.top >= x.top - 1 && b.bottom <= x.bottom + 1 && b.left >= x.left - 1 && b.right <= x.right + 1; }),
    over: e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1 || e.querySelector('#gaWBox').scrollHeight > e.querySelector('#gaWBox').clientHeight + 1,
    hitO: firstO.every(hit), hitA: arrows.every(hit), hitCtl: ['#gaWX', '#gaWDone', '#gaWL', '#gaWR'].every(s => hit(e.querySelector(s))), ph, pTop, vw: innerWidth, vh: innerHeight }; });
const tapEl = async (page, sel) => { const r = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(450); };
(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page, { errors } = o; page.on('pageerror', e => console.log('STACK', e.stack));
  for (const ch of ['monkey', 'alien']) {
    await setup(page, ch, ['hat:crown', 'glasses:shades', 'back:wings', 'hoodie:navy', 'fur:brown', 'shoes:red']); await T(page, 20);
    await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(1500);
    let m = await measure(page);
    const nRows = ch === 'alien' ? 3 : 6;
    chk(m.split && m.title === 'ACCESSORIES' && m.rows.split(',').length === nRows, ch + ': ACCESSORIES opens in the split layout with ' + nRows + ' rows', { split: m.split, rows: m.rows });
    chk(m.cv.r <= m.box.x && m.cv.x < m.vw * 0.1 && m.box.r > m.vw * 0.9, ch + ': preview on the left, rows on the right, no overlap', { cv: m.cv, box: m.box });
    chk(m.cv.h >= m.vh * 0.6 && m.cv.h >= OLD.cvH * 1.6 && m.cv.w >= 260, ch + ': preview tall (>=60% of the screen)', { w: Math.round(m.cv.w), h: Math.round(m.cv.h), old: OLD.cvH });
    chk(m.ph >= m.cv.h * 0.75 && m.ph <= m.cv.h * 1.0 && m.pTop >= 0, ch + ': player fills the preview top to bottom, nothing cut off', { player: Math.round(m.ph), canvas: Math.round(m.cv.h), top: Math.round(m.pTop) });
    chk(m.box.h >= m.vh * 0.9 && m.box.w >= m.vw * 0.55, ch + ': rows panel takes the full right side', m.box);
    chk(m.o.h >= OLD.oH * 1.6 && m.o.w >= OLD.oW * 1.5 && m.o.h >= 44 && m.a.h >= 44 && m.a.w >= 40 && m.lab >= 14 && m.lk >= 9.5, ch + ': icons, arrows, labels and ticket badges bigger', { o: [Math.round(m.o.w), Math.round(m.o.h)], a: [Math.round(m.a.w), Math.round(m.a.h)], lab: m.lab, lk: m.lk });
    chk(!m.over && m.rowsIn, ch + ': no overflow at 844x390 (every row inside the panel, nothing to scroll)', { over: m.over, rowsIn: m.rowsIn });
    chk(m.t.y >= 0 && m.t.b <= m.cv.y + 1 && m.done.b <= m.vh && m.done.y >= m.cv.b - 1 && m.x.y >= 0 && m.x.r <= m.box.x && m.x.b <= m.cv.y + 1, ch + ': title, X and DONE on screen and off the player', { t: m.t, x: m.x, done: m.done });
    chk(m.hitO && m.hitA && m.hitCtl, ch + ': items, row arrows, rotate arrows, X and DONE are tappable (not covered)', { o: m.hitO, a: m.hitA, c: m.hitCtl });
    // rotate arrows still turn the preview
    let r0 = await page.evaluate(() => { const p = window.__gaPlayer.prev; p.auto = false; return p.want; }); await tapEl(page, '#gaWR');
    let r1 = await page.evaluate(() => window.__gaPlayer.prev.want); chk(Math.abs(r1 - r0 - Math.PI / 4) < 0.01 || Math.abs(r1 - r0 + Math.PI / 4) < 0.01, ch + ': rotate arrow turns the preview', [r0, r1]);
    // try a locked item: preview updates, buy bar fits in the left column, then buy + equip
    const sel = ch === 'alien' ? '#gaW .gaRow[data-k=glasses] .gaO[data-v=round]' : '#gaW .gaRow[data-k=hat] .gaO[data-v=tophat]';
    const [k, v] = ch === 'alien' ? ['glasses', 'round'] : ['hat', 'tophat'];
    await page.evaluate(s => { const b = document.querySelector(s); b.scrollIntoView({ block: 'nearest', inline: 'center' }); }, sel); await page.waitForTimeout(300);
    await tapEl(page, sel); await page.waitForTimeout(500);
    let s = await page.evaluate(([k, v]) => { const G = window.__gaPlayer, b = document.getElementById('gaWBuy').getBoundingClientRect(), c = document.getElementById('gaWCv').getBoundingClientRect(), x = document.getElementById('gaWBox').getBoundingClientRect(), d = document.getElementById('gaWDone').getBoundingClientRect();
      let worn = 0; G.prev.root.traverse(o => { if (o.name === (k === 'hat' ? 'gaHat_' : 'gaGl_') + v && o.visible) worn = 1; });
      return { shown: !document.getElementById('gaWBuy').hidden, txt: document.getElementById('gaWBuyB').textContent, worn, saved: G.p[k], fit: b.right <= x.left && b.left >= 0 && b.bottom <= d.top + 1 && b.top >= c.bottom - 1, cvh: c.height, over: document.getElementById('gaW').scrollHeight > innerHeight + 1 }; }, [k, v]);
    chk(s.shown && /^BUY \d+ 🎟$/.test(s.txt) && s.worn && s.fit && !s.over && s.cvh >= 200, ch + ': tapping a locked ' + v + ' previews it live, BUY bar fits under the player', s);
    if (SH && ch === 'monkey') await page.screenshot({ path: OUT + 'ga-accessories-layout-buy.png' });
    await tapEl(page, '#gaWBuyB'); await page.waitForTimeout(400);
    s = await page.evaluate(([k, v]) => ({ p: window.__gaPlayer.p[k], own: window.__gaPlayer.owned().includes(k + ':' + v), t: window.__arcade.play.tickets.total, buy: !document.getElementById('gaWBuy').hidden, sel: !!document.querySelector('#gaW .gaRow[data-k=' + k + '] .gaO.sel[data-v=' + v + ']'), own2: !!document.querySelector('#gaW .gaRow[data-k=' + k + '] .gaO.own[data-v=' + v + ']') }), [k, v]);
    chk(s.p === v && s.own && s.t < 20 && !s.buy && s.sel && s.own2, ch + ': BUY spends tickets, equips, marks selected + owned', s);
    // unequip / re-equip an owned item (back row)
    await tapEl(page, '#gaW .gaRow[data-k=back] .gaO[data-v=none]'); let bk = await page.evaluate(() => window.__gaPlayer.p.back);
    await tapEl(page, '#gaW .gaRow[data-k=back] .gaO[data-v=wings]'); let bk2 = await page.evaluate(() => window.__gaPlayer.p.back);
    chk(bk === 'none' && bk2 === 'wings', ch + ': unequip + re-equip wings', [bk, bk2]);
    // row arrow still steps through owned items
    const st0 = await page.evaluate(() => window.__gaPlayer.p.glasses); await tapEl(page, '#gaW .gaRow[data-k=glasses] .gaA[data-step="1"]'); const st1 = await page.evaluate(() => window.__gaPlayer.p.glasses);
    await tapEl(page, '#gaW .gaRow[data-k=glasses] .gaA[data-step="-1"]'); const st2 = await page.evaluate(() => window.__gaPlayer.p.glasses);
    chk(st1 !== st0 && st2 === st0, ch + ': row arrows step through owned glasses', [st0, st1, st2]);
    await page.evaluate(() => { const p = window.__gaPlayer.prev; p.auto = false; p.want = p.rot = 0.5; }); await page.waitForTimeout(900);
    if (SH) await page.screenshot({ path: OUT + (ch === 'monkey' ? 'ga-accessories-layout.png' : 'ga-accessories-layout-alien.png') });
    await tapEl(page, '#gaWDone');
    s = await page.evaluate(([k, v]) => ({ open: window.__wardrobe.isOpen, save: JSON.parse(localStorage.getItem('galacticarcade.player')) }), [k, v]);
    chk(!s.open && s.save[k] === v && s.save.back === 'wings' && (s.save.char || 'monkey') === ch, ch + ': DONE closes and the look is saved', s.save);
    // reopen: still split, still sized
    await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(900); m = await measure(page);
    chk(m.split && !m.over && m.o.h >= 44, ch + ': reopen keeps the split layout', { split: m.split, o: m.o && Math.round(m.o.h) });
    await tapEl(page, '#gaWX'); chk(!(await page.evaluate(() => window.__wardrobe.isOpen)), ch + ': X closes');
  }
  // WARDROBE (room 1 HUD) is unchanged: stacked, no split
  await page.evaluate(() => window.__wardrobe.open()); await page.waitForTimeout(800);
  let w = await page.evaluate(() => ({ split: document.getElementById('gaW').classList.contains('gaSplit'), t: document.getElementById('gaWT').textContent })); chk(!w.split && w.t === 'WARDROBE', 'WARDROBE keeps its own layout', w);
  await page.evaluate(() => window.__wardrobe.close());
  // portrait fallback: the old stacked layout
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await page.evaluate(() => window.__wardrobe.open({ shop: true })); await page.waitForTimeout(900);
  w = await page.evaluate(() => { const e = document.getElementById('gaW'), c = e.querySelector('#gaWCv').getBoundingClientRect(), b = e.querySelector('#gaWBox').getBoundingClientRect(); return { split: e.classList.contains('gaSplit'), stacked: c.bottom <= b.top + 1 }; });
  chk(!w.split && w.stacked, 'portrait keeps the stacked layout (preview above rows)', w);
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(500);
  w = await page.evaluate(() => document.getElementById('gaW').classList.contains('gaSplit')); chk(w, 'rotating back to landscape switches to split live');
  await page.evaluate(() => window.__wardrobe.close());
  const real = errors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e)); chk(real.length === 0, 'no page errors', real.slice(0, 5));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
