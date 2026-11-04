// Cabinet kit functional checks on a 412x915 phone: neat DEMO overlay (no overlap, one ticket counter) on 3 machines,
// demo music + proximity crossfade, never two cabinet tracks. Copied into the repo by Arcade (t245).
const { open } = require('./lib'); const { helpers } = require('./cabflow'); const fs = require('fs');
const SHOTS = __dirname + '/../shots/';
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 412, h: 915, shieldOpen: true });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const H = helpers(page, true);
  chk(await page.evaluate(() => !!(window.__cabDemo && window.__cabMusic)), 'kit loaded (__cabDemo, __cabMusic)');
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 132; localStorage.setItem('neonarcade.tickets', '132'); for (const k in p.machines) p.machines[k].credits = 0; });
  const keys0 = await page.evaluate(() => Object.keys(localStorage).sort().join(','));
  page.on('requestfailed', r => { if (!/supabase/i.test(r.url())) console.log('REQFAIL', r.url()); });
  for (const [cab, key] of [['monkeyCabinet', 'monkey'], ['strikeCabinet', 'strike'], ['cyberCabinet', 'cyber']]) {
    const name = await page.evaluate(k => window.__arcade.play.machines[k].cab.name, key);
    await H.goTo(name); await page.waitForTimeout(900);
    const near = await page.evaluate(() => ({ want: window.__cabMusic.want, cur: window.__cabMusic.cur, duck: window.__cabMusic.duck, room: window.__music.target }));
    chk(near.want === key, key + ': walking up selects its loop ' + JSON.stringify(near));
    await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 5 && await page.evaluate(() => window.__arcade.play.mode === 'walk'); i++) { await page.evaluate(n => { const A = window.__arcade, u = A.playables.find(k => k.name === n).userData; A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); }, name); await page.waitForFunction(n => window.__arcade.play.near() === n, name, { timeout: 60000 }).catch(() => {}); await page.evaluate(n => { if (window.__arcade.play.near() === n) window.__arcade.play.press(); }, name); await page.waitForTimeout(800); }
    await H.zoomToDemo().catch(async e => { console.log('DBG', JSON.stringify(await page.evaluate(() => { const p = window.__arcade.play; return { mode: p.mode, sub: p.sub, near: p.near(), blocked: p.blocked, zooms: p.zooms, on: document.getElementById('game').className, fps: window.__arcade.stats }; }))); throw e; }); await page.waitForTimeout(1200);
    const await0 = await page.evaluate(() => window.__arcade.play.tickets.total);
    const L = await page.evaluate(() => {
      const vis = e => { if (!e) return null; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right } : null; };
      const fr = document.getElementById('game'), fd = fr.contentDocument, fo = fr.getBoundingClientRect();
      const inF = sel => { const e = fd && fd.querySelector(sel); const v = e && fr.contentWindow.getComputedStyle(e); if (!e || v.display === 'none' || v.visibility === 'hidden') return null; const r = e.getBoundingClientRect(); return r.width ? { x: fo.x + r.x, y: fo.y + r.y, w: r.width, h: r.height } : null; };
      return { pill: vis(document.getElementById('dTag')), tix: vis(document.getElementById('cdTix')), x: vis(document.getElementById('bExit')), panel: vis(document.getElementById('cdPanel')),
        oldTix: vis(document.getElementById('tix')), vix: vis(document.getElementById('vix')), frameTk: inF('#tk'), score: inF('#score') || inF('#hud') ,
        btn: document.getElementById('bTicket').textContent, cr: document.getElementById('dCredit').textContent, cost: document.getElementById('dCost').textContent, ins: document.getElementById('dInsert').textContent,
        tixN: document.getElementById('cdTixN').textContent, panelIn: [...document.querySelectorAll('#cdPanel > *')].map(e => e.id),
        cur: window.__arcade.play.cur && window.__arcade.play.cur.key, music: { want: window.__cabMusic.want, cur: window.__cabMusic.cur }, vw: innerWidth, vh: innerHeight };
    });
    const ov = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const boxes = { pill: L.pill, tix: L.tix, x: L.x, panel: L.panel }, bad = [];
    for (const a in boxes) for (const b in boxes) if (a < b && ov(boxes[a], boxes[b])) bad.push(a + '/' + b);
    chk(L.pill && L.tix && L.x && L.panel && bad.length === 0, key + ': DEMO pill, ticket counter, X and panel all visible, no overlap ' + (bad.join(' ') || ''));
    chk(L.x.y > 40 && L.x.x < 70 && L.tix.r > L.vw - 30 && Math.abs(L.pill.x + L.pill.w / 2 - L.vw / 2) < 3 && L.panel.b <= L.vh && L.panel.y > L.vh * 0.6, key + ': X top-left under the score, counter top-right, pill centred, panel at the bottom');
    const counters = [L.tix, L.oldTix, L.vix, L.frameTk].filter(Boolean).length;
    chk(counters === 1, key + ': exactly ONE ticket counter visible (' + counters + ')');
    chk(L.panelIn.join() === 'dInsert,dCredit,dCost,bTicket' && L.ins === 'INSERT CREDIT' && L.cr === 'CREDIT 0' && /TICKETS? TO PLAY/.test(L.cost) && /^INSERT \d+ TICKETS$|^INSERT TICKET$/.test(L.btn) && L.tixN === String(await0), key + ': panel text ' + JSON.stringify([L.ins, L.cr, L.cost, L.btn, L.tixN]));
    chk(L.music.want === key && L.cur === key, key + ': demo music is this machine\'s loop ' + JSON.stringify(L.music));
    await page.screenshot({ path: SHOTS + 'demo_' + key + '.png' });
    if (key === 'monkey') { // insert ticket still works through play.js and the counter follows
      await H.insert(); const s = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, n: document.getElementById('cdTixN').textContent, cr: document.getElementById('dCredit').textContent, ins: document.getElementById('dInsert').textContent }));
      chk(s.t === 127 && s.n === '127' && s.cr === 'CREDIT 1', 'INSERT 5 TICKETS still pays through play.js; counter 132 -> 127 ' + JSON.stringify(s));
      await page.screenshot({ path: SHOTS + 'demo_monkey_credit1.png' });
      await page.evaluate(() => { window.__arcade.play.machines.monkey.credits = 0; });
    }
    await page.evaluate(() => window.__arcade.play.exit('test')); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 60000 }).catch(() => console.log('WARN exit not back to walk'));
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({ cd: document.body.classList.contains('cd-demo'), tix: getComputedStyle(document.getElementById('tix')).display }));
    chk(!after.cd && after.tix !== 'none', key + ': leaving the demo restores the normal HUD ' + JSON.stringify(after));
  }
  // proximity crossfade timeline: centre of room -> monkey cabinet -> away
  await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 4); A.st.vel.set(0, 0, 0); });
  await page.waitForFunction(() => window.__cabMusic.cur === null && window.__cabMusic.duck < 0.05, null, { timeout: 8000 }).catch(() => {});
  const far = await page.evaluate(() => ({ cur: window.__cabMusic.cur, duck: window.__cabMusic.duck, room: window.__music.target }));
  chk(far.cur === null && far.duck < 0.05, 'room centre: no cabinet loop, room music not ducked ' + JSON.stringify(far));
  const tl = await page.evaluate(async () => { const A = window.__arcade, C = window.__cabMusic, f = A.play.machines.monkey.cab.userData.front, out = [];
    A.monkey.position.set(f.x, 0, f.z); const t0 = performance.now();
    while (performance.now() - t0 < 2000) { out.push([Math.round(performance.now() - t0), C.cur, +C.duck.toFixed(2), +window.__music.target.toFixed(3)]); await new Promise(r => setTimeout(r, 150)); }
    A.monkey.position.set(0, 0, 4); const t1 = performance.now();
    while (performance.now() - t1 < 1500) { out.push([Math.round(performance.now() - t0), C.cur, +C.duck.toFixed(2), +window.__music.target.toFixed(3)]); await new Promise(r => setTimeout(r, 150)); }
    return { out, maxSources: C.maxSources, loads: C.loads, err: C.err }; });
  console.log('TIMELINE [ms, cabinet, duck, roomTarget]', JSON.stringify(tl.out));
  const inOn = tl.out.find(r => r[1] === 'monkey'), backOff = tl.out.slice(-1)[0];
  chk(!!inOn && tl.out.some(r => r[1] === 'monkey' && r[2] === 1), 'near the cabinet: its loop fades in and the room track ducks to 0');
  chk(backOff[1] === null && backOff[2] === 0, 'walking away: loop fades out, room track comes back');
  chk(tl.maxSources === 1, 'never more than one cabinet source at a time (max ' + tl.maxSources + ')');
  chk(tl.loads <= 4, 'tracks lazy-loaded only for visited machines (' + tl.loads + ' loads)');
  await page.evaluate(() => window.__music.setOn(false)); await page.evaluate(() => { const f = window.__arcade.play.machines.monkey.cab.userData.front; window.__arcade.monkey.position.set(f.x, 0, f.z); }); await page.waitForTimeout(900);
  chk(await page.evaluate(() => window.__cabMusic.want === null && window.__cabMusic.cur === null), 'MUSIC off in Options: no cabinet loop');
  await page.evaluate(() => window.__music.setOn(true));
  const keys1 = await page.evaluate(() => Object.keys(localStorage).sort().join(','));
  const added = keys1.split(',').filter(k => !keys0.split(',').includes(k));
  chk(added.every(k => !/cab|music\.cab|cabinet/i.test(k)), 'kit adds no storage keys (keys added by the arcade itself during the run: ' + (added.join(' ') || 'none') + ')');
  const real = errors.filter(e => !/Failed to load resource/.test(e));
  chk(!real.length, 'no page errors (aborted supabase requests ignored) ' + errors.join(' | '));
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await close(); process.exit(ok ? 0 : 1);
})();
