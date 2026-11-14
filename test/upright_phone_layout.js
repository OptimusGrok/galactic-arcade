// t808u: PHONE + upright cabinets (Ghost 256, Strike, Cybercity, Monkey Crossing, Claw Machine) at a portrait phone size:
// the ticket chips (gold + Viking) sit centred at the top, the close X directly under the game's left stats, the 3 option
// buttons (#ui) directly under its right stats; none of them overlap each other or the game's stats. iPad keeps the old
// layout (X tight top-left). No screenshots.
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')); if (!c) ok = false; };
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const seed = () => { try { localStorage.setItem('neonarcade.vikingTickets', '3'); localStorage.setItem('neonarcade.tickets', '40'); } catch (e) {} };
// game stats boxes per cabinet in CSS px at 390 wide (scaled by width): [left, top, right, bottom]; Strike is measured live
const STATS = { ghost: [[0, 101, 390, 130]], monkey: [[0, 55, 110, 122], [300, 60, 390, 112], [315, 90, 378, 131]], cyber: [[120, 4, 270, 30]], claw: [] };
(async () => {
  const W = +(process.env.PW || 390), H = +(process.env.PH || 844);
  const keys = (process.env.KEYS || 'strike,ghost,cyber,monkey,claw,bb').split(',');
  async function run(o, k, ipad) {
    const page = o.page;
    await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(k => { const P = window.__arcade.play; P.start(P.machines[k]); }, k);
    await page.waitForFunction(() => { const P = window.__arcade.play; return P.mode === 'game' && P.sub === 'demo'; }, null, { timeout: 90000 }).catch(() => {});
    await page.evaluate(k => { const P = window.__arcade.play; P.machines[k].credits = 1; P.tryPlay(); }, k);
    await page.waitForTimeout(3000);
    const r = await page.evaluate(() => {
      const R = id => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none') return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      let hud = 0, bb = null; try { const w = document.getElementById('game').contentWindow; hud = w.__gaHudPx ? w.__gaHudPx() : 0;
        if (w.eval && /bb-play/.test(w.location.pathname)) bb = w.eval('({ cols: COLS, rows: ROWS, S, FX, FY, FW, FH, HUDSIDE, iw: innerWidth, ih: innerHeight })'); } catch (e) {}
      return { X: R('bExit'), tix: R('tix'), vix: R('vix'), ui: R('ui'), hud, bb, frame: (b => [b.left, b.top, b.width, b.height].map(Math.round))(document.getElementById('game').getBoundingClientRect()), W: innerWidth, upPhone: document.body.classList.contains('upPhone'), upright: document.body.classList.contains('upright') };
    });
    await page.evaluate(() => window.__arcade.play.exit('x')).catch(() => {});
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => ({ X: document.getElementById('bExit').style.top, tix: document.getElementById('tix').style.left, up: document.body.classList.contains('upPhone') }));
    return { r, after };
  }
  const ov = (a, b) => a && b && a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
  {
    const o = await open({ phone: true, w: W, h: H, init: `(${seed})()` }); o.page.setDefaultTimeout(60000);
    await o.page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });
    for (const k of keys) {
      const { r, after } = await run(o, k), q = r.W / 390, tag = k + ' ' + W + 'x' + H;
      chk(r.upright && r.upPhone, tag + ': upright phone layout is on', { upright: r.upright, upPhone: r.upPhone });
      const tl = r.tix.l, tr = r.vix ? r.vix.r : r.tix.r;
      chk(r.vix && Math.abs((tl + tr) / 2 - r.W / 2) < 3 && r.tix.t < 60 * q && Math.abs(r.vix.t - r.tix.t) < 1, tag + ': gold + Viking ticket chips centred at the top', { tix: r.tix, vix: r.vix });
      chk(r.X.l <= 6 && r.ui.r >= r.W - 8, tag + ': close X on the left, option buttons on the right', { X: r.X, ui: r.ui });
      const els = { X: r.X, tix: r.tix, vix: r.vix, ui: r.ui }, names = Object.keys(els), hits = [];
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (ov(els[names[i]], els[names[j]])) hits.push(names[i] + '/' + names[j]);
      chk(!hits.length, tag + ': X, ticket chips and option buttons do not overlap each other', hits);
      let stats = (STATS[k] || []).map(s => ({ l: s[0] * q, t: s[1] * q, r: s[2] * q, b: s[3] * q }));
      if (k === 'bb') {   // t818u: Burrow Buster upright: full-screen portrait frame, a tall portrait dig field filling the width, HUD across the top
        const b = r.bb || {}, fieldW = (b.FW || 0) * (b.S || 0), fieldH = ((b.FH || 0)) * (b.S || 0);
        chk(r.frame[0] === 0 && r.frame[1] === 0 && r.frame[2] === r.W && b.ih > b.iw, tag + ': game is a full-screen portrait frame', { frame: r.frame, bb: b });
        chk(!b.HUDSIDE && b.rows > b.cols && fieldW >= r.W * 0.95 && fieldH >= b.ih * 0.8 && (b.FY + b.rows * 32) * b.S <= b.ih + 1, tag + ': the dig field lays out in portrait (tall grid, fills the width and most of the height, bottom row on screen)', { b, fieldW, fieldH });
        chk(r.hud > 30 && r.X.t >= r.hud && r.X.t <= r.hud + 12 && r.ui.t >= r.hud && r.ui.t <= r.hud + 12 && r.tix.b <= r.hud - 2, tag + ': tickets above the HUD, X and option buttons directly under the game stats', { hud: r.hud, X: r.X.t, ui: r.ui.t, tixB: r.tix.b });
        stats = [{ l: 0, t: r.hud - 40 * (b.S || 1), r: r.W, b: r.hud }];
      }
      if (k === 'strike') {
        chk(r.hud > 30 && r.X.t >= r.hud && r.X.t <= r.hud + 12 && r.ui.t >= r.hud && r.ui.t <= r.hud + 12, tag + ': X and option buttons sit directly under the P1 / P2 stats', { hud: r.hud, X: r.X.t, ui: r.ui.t });
        stats = [{ l: 0, t: 0, r: 92 * q, b: r.hud }, { l: r.W - 92 * q, t: 0, r: r.W, b: r.hud }];   // P1 stats left, P2 stats right
      }
      const cov = []; for (const n of names) for (const s of stats) if (ov(els[n], s)) cov.push(n);
      chk(!cov.length, tag + ': nothing covers the game stats', { cov, stats });
      chk(!after.up && !after.X && !after.tix, tag + ': leaving the game restores the normal layout', after);
    }
    chk(!o.errors.filter(e => !/ERR_|supabase|Failed to load/i.test(e)).length, 'no page errors (phone)', o.errors.slice(0, 3));
    await o.close();
  }
  if (process.env.NO_IPAD !== '1') {
    const o = await open({ phone: true, w: 820, h: 1180, ua: IPAD_UA, init: `(${seed})()` }); o.page.setDefaultTimeout(60000);
    await o.page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });
    for (const k of (process.env.IPAD_KEYS || 'strike,monkey,bb').split(',')) {
      const { r } = await run(o, k, true), tag = 'iPad ' + k + ' 820x1180';
      chk(!r.upPhone && r.X.l <= 6 && r.X.t <= 6 && r.tix.l < 120, tag + ': iPad layout unchanged (X tight top-left, tickets beside it)', { X: r.X, tix: r.tix, up: r.upPhone });
    }
    await o.close();
  }
  console.log(ok ? 'ALL PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
