// t218 WARDROBE HUD button under the FLOOR & WALL box: same size, no HUD overlap, hidden in machines; tap -> __wardrobe.open()
// (stub) or a 'Coming soon' toast, never walks / jumps; mp.js rebroadcasts the look on 'galacticarcade:look' (mpmock, no network).
// node test/wardrobe.js [phone]
const { open } = require('./lib'); const mock = require('./mpmock');
const PH = process.argv[2] === 'phone';
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const O = PH ? { phone: true, w: 412, h: 860 } : {}, pages = [], all = [];
  async function dev(id) { const o = await open(O); const p = o.page; p.setDefaultTimeout(60000); all.push(o);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(id => { window.__mpId = id; }, id); await p.addInitScript(mock); pages.push(p); await p.reload();
    await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && /on|solo/.test(window.__mp.state), null, { timeout: 60000 }); return o; }
  const A = await dev('aaaa1111'), page = A.page; await page.waitForTimeout(1500);
  const L = await page.evaluate(() => { const r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
    const fb = r(document.getElementById('flBtn')), wd = r(document.getElementById('wdBtn')), over = [];
    for (const e of document.querySelectorAll('body *')) { if (e.closest('#wdBtn') || e.id === 'wdBtn' || e.closest('#start')) continue; const cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const b = r(e); if (!b.w || !b.h || b.w > innerWidth * 0.9) continue; if (b.x < wd.r && b.r > wd.x && b.y < wd.b && b.b > wd.y) over.push(e.id || e.className); }
    return { fb, wd, over, lbl: document.querySelector('#wdBtn span').textContent, icon: !!document.querySelector('#wdBtn svg') }; });
  chk(Math.abs(L.wd.w - L.fb.w) < 1 && Math.abs(L.wd.h - L.fb.h) < 1 && Math.abs(L.wd.x - L.fb.x) < 1 && L.wd.y > L.fb.b && L.wd.y - L.fb.b <= 10, 'square button directly under the floor box, same size ' + JSON.stringify([L.fb, L.wd]));
  chk(L.lbl === 'WARDROBE' && L.icon, 'WARDROBE label + hanger icon');
  chk(L.over.length === 0, 'no overlap with other HUD items ' + JSON.stringify(L.over));
  const tap = async () => { const b = await page.locator('#wdBtn').boundingBox(); if (PH) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(600); };
  const p0 = await page.evaluate(() => { const m = window.__arcade.monkey.position; return [m.x, m.y, m.z]; });
  await tap();
  const t = await page.evaluate(() => { const e = document.querySelector('.wdToast'); return e && e.style.display !== 'none' ? e.textContent : ''; });
  chk(t === 'Coming soon', "no __wardrobe yet -> 'Coming soon' toast");
  await page.evaluate(() => { window.__wdOpen = 0; window.__wardrobe = { open() { window.__wdOpen++; }, close() {} }; });
  await tap(); await page.waitForTimeout(500);
  const s = await page.evaluate(() => { const m = window.__arcade.monkey.position, st = window.__arcade.st; return { n: window.__wdOpen, p: [m.x, m.y, m.z], jump: !!(st && st.jump), mode: window.__arcade.play.mode }; });
  chk(s.n === 1, 'tap calls window.__wardrobe.open() once ' + s.n);
  chk(Math.hypot(s.p[0] - p0[0], s.p[2] - p0[2]) < 0.05 && !s.jump && s.mode === 'walk', 'taps do not walk, jump or start anything ' + JSON.stringify([p0, s]));
  await page.screenshot({ path: 'shots/wardrobe_button_' + (PH ? 'phone' : 'desktop') + '.png' });
  const hid = await page.evaluate(() => { document.body.classList.add('ingame'); const v = getComputedStyle(document.getElementById('wdBtn')).display; document.body.classList.remove('ingame'); return v; });
  chk(hid === 'none', 'hidden inside machines (body.ingame), like the floor box');
  const B = await dev('bbbb2222'), b = B.page;
  await page.waitForFunction(() => window.__mp.peers.size === 1, null, { timeout: 15000 }).catch(() => {}); await b.waitForFunction(() => window.__mp.peers.has('aaaa1111'), null, { timeout: 15000 }).catch(() => {});
  const on = await page.evaluate(() => window.__mp.state);
  await page.evaluate(() => { localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'tophat', hoodie: 'green', fur: 'silver', shoes: 'blue', glasses: 'shades' })); dispatchEvent(new Event('galacticarcade:look')); });
  await b.waitForFunction(() => { const p = window.__mp.peers.get('aaaa1111'); return p && p.look && p.look.glasses === 'shades'; }, null, { timeout: 1500 }).catch(() => {});
  const r = await b.evaluate(() => { const p = window.__mp.peers.get('aaaa1111'); return p && { look: p.look, name: p.name }; });
  const sent = await page.evaluate(() => ({ ls: window.__mp.lookSent || 0, ev: window.__mpMockLog.sent.filter(e => e === 'look').length }));
  chk(on === 'on' && sent.ls === 1 && sent.ev === 1, "'galacticarcade:look' -> one 'look' broadcast + presence track " + JSON.stringify(sent));
  chk(r && r.name === 'Dave' && r.look.glasses === 'shades' && r.look.hat === 'tophat' && r.look.fur === 'silver' && r.look.hoodie === 'green', 'remote monkey gets the new look within 1.5 s, new fields (glasses, new hat) passed as-is ' + JSON.stringify(r));
  const errs = all.flatMap(o => o.errors); chk(errs.length === 0, 'no page errors ' + errs.join('|'));
  for (const o of all) await o.close(); process.exit(ok ? 0 : 1); })();
