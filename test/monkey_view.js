// t786u: Monkey Crossing play view is the original arcade one: a full-screen iframe, not an
// upright/portrait lock (that is only Ghost 256 / Strike / Cybercity) and not a rotated/sideways
// frame. No screenshots.
const { open } = require('./lib'); const { helpers } = require('./cabflow');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 420) : '')); if (!c) ok = false; };
(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page, { errors } = o;
  page.setDefaultTimeout(60000);
  const H = helpers(page, true);
  const mode = await page.evaluate(() => {
    const m = window.__arcade.play.machines.monkey, g = window.__arcade.play.machines.ghost, s = window.__arcade.play.machines.strike;
    return { monkeyUpright: !!m.upright, ghostUpright: !!g.upright, strikeUpright: !!s.upright, aspect: m.aspect, src: m.src };
  });
  chk(!mode.monkeyUpright && mode.ghostUpright && mode.strikeUpright, 'Monkey Crossing is not flagged upright (Ghost/Strike are)', mode);
  chk(Math.abs(mode.aspect - 9 / 16) < 1e-6 && /monkey-play/.test(mode.src), 'cabinet aspect is still the original 9:16 portrait screen', mode);

  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 20; localStorage.setItem('neonarcade.tickets', '20'); p.machines.monkey.credits = 1; });
  await H.goTo('monkeyCabinet');
  await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  await H.press();
  await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game'), null, { timeout: 150000 });
  await page.waitForFunction(() => { const f = document.getElementById('game'); return f && f.classList.contains('on') && f.contentWindow && f.contentWindow.__M; }, null, { timeout: 60000 });

  const demo = await page.evaluate(() => {
    const f = document.getElementById('game'), st = f.contentWindow.getComputedStyle(f.contentWindow.document.body);
    const rot = (el) => { const s = getComputedStyle(el); return { t: s.transform, tr: el.style.transform || '', r: el.style.rotate || '' }; };
    return {
      sub: window.__arcade.play.sub,
      upright: document.body.classList.contains('upright'),
      hint: document.getElementById('turnHint') && document.getElementById('turnHint').classList.contains('on'),
      frame: rot(f),
      body: rot(document.body),
      inner: rot(f.contentWindow.document.body),
      html: rot(f.contentWindow.document.documentElement),
      box: f.getBoundingClientRect(),
      vw: innerWidth, vh: innerHeight,
      gameW: f.contentWindow.innerWidth, gameH: f.contentWindow.innerHeight,
      state: f.contentWindow.__M.state
    };
  });
  chk(!demo.upright && !demo.hint, 'while Monkey Crossing is open the arcade stays in the normal landscape view (no upright lock, no turn-sideways hint)', demo);
  const noRot = (r) => (!r.t || r.t === 'none') && !r.tr && !r.r;
  chk(noRot(demo.frame) && noRot(demo.body) && noRot(demo.inner) && noRot(demo.html), 'the play iframe and game are not rotated/sideways', { frame: demo.frame, body: demo.body, inner: demo.inner, html: demo.html });
  chk(demo.box.width >= demo.vw - 2 && demo.box.height >= demo.vh - 2 && demo.box.left <= 1 && demo.box.top <= 1, 'play view is the original full-screen iframe', demo.box);
  chk(demo.gameW >= 800 && demo.gameH <= 430 && demo.gameW > demo.gameH, 'the game itself is the landscape full-screen view (not a portrait/upright frame)', { w: demo.gameW, h: demo.gameH, state: demo.state });

  // start a credit so we also see the playing (not only DEMO) view
  await H.insert().catch(() => {});
  await page.evaluate(() => { const w = document.getElementById('game').contentWindow; if (w && w.__M && w.__M.state !== 'play') w.__M.startGame(); });
  await page.waitForTimeout(300);
  const play = await page.evaluate(() => {
    const f = document.getElementById('game');
    return {
      sub: window.__arcade.play.sub,
      upright: document.body.classList.contains('upright'),
      state: f.contentWindow.__M.state,
      t: getComputedStyle(f).transform,
      gameW: f.contentWindow.innerWidth, gameH: f.contentWindow.innerHeight
    };
  });
  chk(!play.upright && play.state === 'play' && (!play.t || play.t === 'none') && play.gameW > play.gameH,
    'while actually playing, the view stays the original full-screen landscape (not upright or sideways)', play);

  const bad = errors.filter(e => !/supabase|AbortError|Failed to load|AudioContext/i.test(e));
  chk(bad.length === 0, 'no page errors', bad.slice(0, 4));
  await o.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
