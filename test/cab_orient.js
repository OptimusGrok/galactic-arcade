// Cabinet play/watch should request portrait (upright). Walking should keep landscape.
// Portrait 390x700, then landscape 700x390. Opens STRIKE, GHOST 256, and MONKEY RAPID.
const { open } = require('./lib');

async function runAt(page, label, chk) {
  await page.evaluate(() => {
    const s = document.getElementById('start'); if (s) s.remove();
    if (window.__start) window.__start.dismissed = true;
    window.__gaNoTp = true;
    if (window.__arcade.st) { window.__arcade.st.beamed = true; window.__arcade.st.fp = false; }
    try { if (window.__gaPlayer && window.__gaPlayer.play) window.__gaPlayer.play(1); } catch (e) {}
    window.__orientCalls = [];
    const o = screen.orientation;
    if (!window.__orientWrapped && o && typeof o.lock === 'function') {
      window.__orientWrapped = true;
      const orig = o.lock.bind(o);
      o.lock = function (type) { window.__orientCalls.push(type); return orig(type); };
    }
  });
  await page.waitForSelector('#gvWatchOv', { timeout: 15000 }).catch(() => {});

  const walk = await page.evaluate(() => {
    window.__arcade.wantWide();
    return { want: window.__arcade.st.orientWant, last: (window.__orientCalls || []).slice(-1)[0] || null, hint: document.getElementById('turnHint').classList.contains('on') };
  });
  console.log(label + ' walk', JSON.stringify(walk));
  chk(walk.want === 'landscape' && walk.last === 'landscape', label + ': walking still asks for landscape', walk);

  const openCab = key => page.evaluate(k => {
    const A = window.__arcade, m = A.play.machines[k], cab = m.cab, u = cab.userData;
    A.st.fp = false; A.st.vel.set(0, 0, 0);
    A.monkey.position.set(u.front.x, 0, u.front.z);
    A.play.update(0.05, cab);
    A.play.press();
    let n = 0; while (A.play.mode !== 'game' && n++ < 12) A.play.update(2, cab);
    const game = document.getElementById('game');
    const tr = game ? getComputedStyle(game).transform : '';
    let innerRot = '';
    try { innerRot = game && game.contentDocument ? getComputedStyle(game.contentDocument.body).transform : ''; } catch (e) {}
    return {
      mode: A.play.mode, key: A.play.cur && A.play.cur.key, want: A.st.orientWant,
      last: (window.__orientCalls || []).slice(-1)[0] || null,
      exists: !!game, on: !!(game && game.classList.contains('on')),
      rot: tr, innerRot,
      hint: document.getElementById('turnHint').classList.contains('on'),
      w: game ? +game.getBoundingClientRect().width.toFixed(1) : 0,
      h: game ? +game.getBoundingClientRect().height.toFixed(1) : 0
    };
  }, key);

  const closeCab = () => page.evaluate(() => {
    const A = window.__arcade, cab = A.play.cur && A.play.cur.cab;
    A.play.exit('esc');
    let n = 0; while (A.play.mode !== 'walk' && n++ < 12) A.play.update(2, cab);
    return { mode: A.play.mode, want: A.st.orientWant, last: (window.__orientCalls || []).slice(-1)[0] || null };
  });

  const noSpin = t => !t || t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';

  for (const key of ['strike', 'ghost', 'monkey']) {
    const g = await openCab(key);
    console.log(label + ' ' + key, JSON.stringify(g));
    chk(g.mode === 'game' && g.key === key && g.exists, label + ': ' + key + ' play view opened', g);
    chk(g.want === 'portrait' && g.last === 'portrait', label + ': ' + key + ' asks for upright portrait', g);
    chk(noSpin(g.rot) && noSpin(g.innerRot), label + ': ' + key + ' is not CSS-rotated sideways', g);
    chk(!g.hint, label + ': ' + key + ' hides the rotate-to-landscape hint', g);
    const back = await closeCab();
    console.log(label + ' exit ' + key, JSON.stringify(back));
    chk(back.mode === 'walk' && back.want === 'landscape' && back.last === 'landscape', label + ': leaving ' + key + ' returns to landscape walking', back);
  }

  const watch = await page.evaluate(async () => {
    const ov = document.getElementById('gvWatchOv');
    if (!ov) return { missing: true };
    ov.classList.add('on');
    await Promise.resolve();
    const opened = { want: window.__arcade.st.orientWant, last: (window.__orientCalls || []).slice(-1)[0] || null, on: ov.classList.contains('on') };
    ov.classList.remove('on');
    await Promise.resolve();
    const closed = { want: window.__arcade.st.orientWant, last: (window.__orientCalls || []).slice(-1)[0] || null };
    return { opened, closed };
  });
  console.log(label + ' watch', JSON.stringify(watch));
  if (watch.missing) chk(false, label + ': watch overlay missing');
  else {
    chk(watch.opened.want === 'portrait' && watch.opened.last === 'portrait', label + ': Watch asks for upright portrait', watch);
    chk(watch.closed.want === 'landscape' && watch.closed.last === 'landscape', label + ': closing Watch returns to landscape walking', watch);
  }
}

(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700 });
  let ok = true;
  const chk = (c, m, extra) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra !== undefined ? ' ' + JSON.stringify(extra) : '')); if (!c) ok = false; };

  await runAt(page, 'portrait', chk);
  await page.setViewportSize({ width: 700, height: 390 });
  await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
  await runAt(page, 'landscape', chk);

  const pageErr = errors.filter(e => !/supabase|Failed to load|net::/i.test(e));
  chk(pageErr.length === 0, 'no page errors', pageErr);

  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
