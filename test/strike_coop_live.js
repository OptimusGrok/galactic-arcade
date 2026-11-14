// t797u: real two-phone Strike co-op (no mocked parent.__mp). Two portrait contexts,
// real Supabase path (__mpLive), P1 starts then P2 joins mid-game. Watches P2 on both
// screens for a minute, checks host/guest lock, in-bounds positions, consumed drag,
// and that a brief cabN flap does not clear P2. No screenshots.
const { chromium } = require('/workspace/burrow-buster/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.GA_ROOT || path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.css': 'text/css', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
const WATCH_MS = Number(process.env.WATCH_MS || 60000);
const VIEW = { width: 390, height: 700 };
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 700) : '')); if (!c) ok = false; };

function serve() {
  return new Promise(r => {
    const s = http.createServer((q, res) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
    });
    s.listen(0, () => r(s));
  });
}

(async () => {
  const srv = await serve();
  const url = process.env.GA_URL || `http://localhost:${srv.address().port}/index.html`;
  const chromeBins = ['/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', '/opt/ungoogled-chromium/chrome'];
  const executablePath = chromeBins.find(f => fs.existsSync(f));
  const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const tag = Date.now().toString(36);
  const ids = { p1: 't797a' + tag, p2: 't797b' + tag };

  async function make(name, id) {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(({ name, id }) => {
      window.__skipStart = 1; window.__noUnloadWarn = 1; window.__noRandomRoom = 1;
      window.__mpLive = true; window.__mpId = id;
      try {
        localStorage.setItem('galacticarcade.player', JSON.stringify({ name, hat: 'cap', hoodie: 'navy', fur: 'brown', shoes: 'red' }));
        localStorage.setItem('neonarcade.mpId', id);
        localStorage.setItem('neonarcade.mpName', name);
        localStorage.setItem('neonarcade.mute', '1');
      } catch (e) {}
    }, { name, id });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url, { timeout: 180000 });
    await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
    return { name, id, page, ctx, errors };
  }

  const p1 = await make('HostP1', ids.p1);
  const p2 = await make('JoinP2', ids.p2);

  async function waitMp(ph) {
    const on = await ph.page.waitForFunction(() => window.__mp && window.__mp.state === 'on', null, { timeout: 25000 }).then(() => true).catch(() => false);
    const st = await ph.page.evaluate(() => window.__mp && { state: window.__mp.state, reason: window.__mp.reason, count: window.__mp.count, id: window.__mp.id });
    chk(on && st && st.state === 'on', ph.name + ' joins the real MP room', st);
    return on;
  }
  await waitMp(p1); await waitMp(p2);

  async function startCab(ph) {
    await ph.page.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.strike); });
    await ph.page.waitForFunction(() => {
      const P = window.__arcade.play, f = document.getElementById('game');
      return P && P.mode === 'game' && P.sub === 'demo' && f && f.classList.contains('on') && f.contentWindow && f.contentWindow.STRIKE && f.contentWindow.__strikeCoop;
    }, null, { timeout: 90000 });
  }
  const hud = ph => ph.page.evaluate(() => {
    const w = document.getElementById('game') && document.getElementById('game').contentWindow;
    const C = w && w.__strikeCoop, M = window.__mp, P = window.__arcade.play;
    const h = C && C.hud && C.hud();
    return {
      hud: h, role: C && C.role, locked: C && C.locked, p2on: C && C.p2on, snaps: C && C.snaps, sent: C && C.sent, recv: C && C.recv,
      mp: M && { state: M.state, cabN: M.cabCount && M.cabCount('strike') },
      play: P && { mode: P.mode, sub: P.sub },
      drag: w && w.STRIKE && w.STRIKE.Input && { x: w.STRIKE.Input.dragX, y: w.STRIKE.Input.dragY }
    };
  });
  const inBounds = (s, loose) => s && Number.isFinite(s.x) && Number.isFinite(s.y) && s.x >= -20 && s.x <= 290 && s.y >= (loose ? -40 : 0) && s.y <= (loose ? 640 : 620);

  await startCab(p1);
  await p1.page.evaluate(() => { const P = window.__arcade.play; P.machines.strike.credits = 1; P.tryPlay(); });
  chk(await p1.page.evaluate(() => window.__arcade.play.sub) === 'play', 'P1 starts a real Strike game first');
  await p1.page.evaluate(() => { const w = document.getElementById('game').contentWindow; if (w.STRIKE && w.STRIKE.G) w.STRIKE.G.god = true; });
  await p1.page.waitForTimeout(800);
  const h1solo = await hud(p1);
  chk(h1solo.role === 'host' && h1solo.locked, 'P1 is locked as host before P2 arrives', h1solo);

  await startCab(p2);
  await p2.page.waitForTimeout(600);
  await p2.page.evaluate(() => { const P = window.__arcade.play; P.machines.strike.credits = 1; P.tryPlay(); });
  chk(await p2.page.evaluate(() => window.__arcade.play.sub) === 'play', 'P2 joins while P1 is already playing');
  await p2.page.evaluate(() => { const w = document.getElementById('game').contentWindow; if (w.STRIKE && w.STRIKE.G) w.STRIKE.G.god = true; });

  await p1.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__strikeCoop; return C && C.role === 'host' && C.p2on && C.locked; }, null, { timeout: 20000 }).catch(() => {});
  await p2.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__strikeCoop; return C && C.role === 'guest' && C.p2on && C.snaps > 0 && C.locked; }, null, { timeout: 20000 }).catch(() => {});
  await p2.page.waitForTimeout(1500); // let P2 finish flying in from below

  let a = await hud(p1), b = await hud(p2);
  chk(a.role === 'host' && a.locked && a.p2on && a.hud && a.hud.p2.alive, 'host keeps P2 on after the join', a);
  chk(b.role === 'guest' && b.locked && b.p2on && b.snaps > 0 && b.hud && b.hud.p2.alive, 'guest is not simulating as host and has snapshots', b);
  chk(a.role !== b.role, 'the two phones are not both host', { a: a.role, b: b.role });
  chk(inBounds(a.hud && a.hud.p2, true) && inBounds(b.hud && b.hud.p2, true), 'P2 is on both screens and in bounds after joining', { a: a.hud && a.hud.p2, b: b.hud && b.hud.p2 });

  // Guest drag must move P2, then stop once consumed (the live bug: leftover dx was resent forever and the ship flew off).
  const x0 = a.hud.p2.x;
  await p2.page.evaluate(() => {
    const I = document.getElementById('game').contentWindow.STRIKE.Input;
    I.dragX = 20; I.dragY = 0; I.keys.right = false; I.keys.left = false; I.keys.up = false; I.keys.down = false;
  });
  await p1.page.waitForTimeout(400);
  a = await hud(p1); b = await hud(p2);
  const x1 = a.hud.p2.x, x1b = b.hud.p2.x;
  chk(x1 > x0 + 8 && x1b > x0 + 8, 'P2 drag from the second phone moves the red ship on both screens', { x0, x1, x1b });
  chk(inBounds(a.hud.p2) && x1 < 250, 'a short drag does not rail P2 off the playfield', a.hud.p2);
  const guestDrag = b.drag;
  chk(guestDrag && Math.abs(guestDrag.x) < 0.2, 'guest consumes drag after sending it', guestDrag);
  await p1.page.waitForTimeout(1000);
  const x2 = (await hud(p1)).hud.p2.x;
  chk(Math.abs(x2 - x1) < 16, 'after drag is consumed, P2 stops instead of sliding off the screen', { x1, x2 });

  // A brief cabN flap (presence lag) must not drop the role lock or hide P2, and snaps must keep flowing.
  const snaps0 = (await hud(p2)).snaps;
  await p1.page.evaluate(() => {
    const M = window.__mp; if (!M || M._cabCount) return;
    const orig = M.cabCount.bind(M); M._cabCount = orig; M.cabCount = key => key === 'strike' ? 1 : orig(key);
  });
  await p1.page.waitForTimeout(2000);
  a = await hud(p1); b = await hud(p2);
  chk(a.role === 'host' && a.p2on && a.locked, 'host keeps P2 when cabN briefly reads 1', a);
  chk(b.role === 'guest' && b.p2on && b.locked, 'guest does not fall back to solo physics on a cabN flap', b);
  chk(b.snaps > snaps0, 'host still sends snapshots during the cabN flap', { snaps0, snaps: b.snaps });
  await p1.page.evaluate(() => { const M = window.__mp; if (M && M._cabCount) { M.cabCount = M._cabCount; delete M._cabCount; } });

  // t802u: P2 fires from the second phone, and the second phone sees both players' shots and both ships move.
  const G_ = (ph, js) => ph.page.evaluate(js => { const w = document.getElementById('game').contentWindow; return (new Function('S', 'C', 'w', js))(w.STRIKE, w.__strikeCoop, w); }, js);
  await G_(p2, "w.eval('Opts.autofire = false'); S.Input.ptrDown = false; S.Input.keys.fire = false; return 1;");
  await G_(p1, 'S.Input.ptrDown = true; return 1;');   // host finger down must fire only P1
  await p1.page.waitForTimeout(2200);
  const offN = await G_(p1, 'return C.shotCount();');
  chk(offN.p2 === 0 && offN.p1 > 0, 'with fire released on the second phone, P2 does not fire; the host finger fires only P1', offN);
  await G_(p1, 'S.Input.ptrDown = false; return 1;');
  await G_(p2, 'S.Input.ptrDown = true; return 1;');   // phones fire by holding a finger down
  await p1.page.waitForTimeout(1200);
  const onN = await G_(p1, 'return C.shotCount();'), visN = await G_(p2, 'return C.visShots();');
  chk(onN.p2 > 0, 'holding a finger on the second phone fires P2 shots on the host', onN);
  chk(visN.p1 > 0 && visN.p2 > 0, 'the second phone sees both P1 and P2 shots', visN);
  a = await hud(p1); b = await hud(p2);
  const near = (p, q, t) => p && q && Math.hypot(p.x - q.x, p.y - q.y) < (t || 12);
  chk(near(a.hud.p1, b.hud.p1) && near(a.hud.p2, b.hud.p2), 'both ships on the second phone match the host', { a: [a.hud.p1, a.hud.p2], b: [b.hud.p1, b.hud.p2] });
  const m0 = b.hud;
  await G_(p1, 'S.Input.dragX = -30; return 1;');
  await G_(p2, 'S.Input.dragY = -30; return 1;');
  await p1.page.waitForTimeout(900);
  a = await hud(p1); b = await hud(p2);
  chk(b.hud.p1.x < m0.p1.x - 10 && b.hud.p2.y < m0.p2.y - 10, 'on the second phone P1 moves (host drag) and P2 moves (guest drag)', { p1x: [m0.p1.x, b.hud.p1.x], p2y: [m0.p2.y, b.hud.p2.y] });
  chk(near(a.hud.p1, b.hud.p1) && near(a.hud.p2, b.hud.p2) && inBounds(b.hud.p2) && inBounds(b.hud.p1), 'after moving, both ships match the host and stay on screen', { a: [a.hud.p1, a.hud.p2], b: [b.hud.p1, b.hud.p2] });

  // t805u: P2's kills score to P2 (shown on the second phone); P2 picks up power-ups and fires the upgraded weapon.
  await G_(p1, "w.eval('Opts.autofire = false'); S.Input.ptrDown = false; S.Input.keys.fire = false; return 1;");
  await G_(p2, 'S.Input.ptrDown = true; return 1;');
  await p1.page.waitForTimeout(1700);
  const sc0 = await G_(p1, 'return { p1: S.G.score, p2: C.G2.score };');
  for (let r = 0; r < 4; r++) {
    await G_(p1, "w.eval('for (let i = 0; i < 2; i++) spawnE(\"fighter\", window.__strikeCoop.pl2.x, window.__strikeCoop.pl2.y - 50 - i * 16, \"lin\")'); return 1;");
    await p1.page.waitForTimeout(500);
  }
  const sc1 = await G_(p1, 'return { p1: S.G.score, p2: C.G2.score };');
  chk(sc1.p2 > sc0.p2 && sc1.p1 === sc0.p1, 'kills by P2’s shots add to P2’s score, not P1’s', { sc0, sc1 });
  await p1.page.waitForTimeout(400);
  const gs = (await hud(p2)).hud, hs = await G_(p1, 'return { p1: S.G.score, p2: C.G2.score };');
  chk(gs.p2.score === hs.p2 && gs.p2.score > sc0.p2, 'the second phone shows P2’s own score on the right', { guest: gs.p2.score, host: hs });
  let wp = null;
  for (let r = 0; r < 8; r++) {
    await G_(p1, "w.eval('dropItem(\"R\", window.__strikeCoop.pl2.x, window.__strikeCoop.pl2.y)'); return 1;");
    await p1.page.waitForTimeout(200);
    wp = await G_(p1, 'return { p1: [S.G.weapon, S.G.wlv], p2: [C.G2.weapon, C.G2.wlv] };');
    if (wp.p2[0] === 'R' && wp.p2[1] >= 2) break;
  }
  chk(wp.p2[0] === 'R' && wp.p2[1] >= 2 && wp.p1[0] === 'V', 'P2 collects power-ups into its own weapon and level (P1 unchanged)', wp);
  await p1.page.waitForTimeout(500);
  const rs = await G_(p1, 'return S.pools.pshots.items.filter(u => u.alive && u.o === 1 && u.k === 1).length;');
  chk(rs > 0, 'P2 fires the upgraded spread weapon', { spreadShots: rs });
  // a real enemy drop can be grabbed in between (eg a laser), so compare with the host's current P2 weapon, settled
  let gw = null, hw = null;
  for (let r = 0; r < 5; r++) { hw = await G_(p1, 'return [C.G2.weapon, C.G2.wlv];'); await p1.page.waitForTimeout(300); gw = (await hud(p2)).hud.p2; if (gw.weapon === hw[0] && gw.wlv === hw[1]) break; }
  chk(gw.weapon === hw[0] && gw.wlv === hw[1] && (hw[0] !== 'R' || hw[1] >= wp.p2[1]), 'the second phone shows P2’s weapon and level', { gw, hw });
  await G_(p1, "w.eval('Opts.autofire = true'); return 1;");

  // t806u: smooth motion over the real relay. P1 (host) and P2 (guest) both move for ~1.5 s; every rendered frame recorded.
  a = await hud(p1);
  const dirA = a.hud.p1.x < 135 ? 'right' : 'left', dirB = a.hud.p2.x < 135 ? 'right' : 'left';
  await G_(p1, `C.trace.length = 0; C.tracing = true; S.Input.keys['${dirA}'] = true; return 1;`);
  await G_(p2, `C.trace.length = 0; C.tracing = true; S.Input.keys['${dirB}'] = true; return 1;`);
  await p1.page.waitForTimeout(1100);
  await G_(p2, `S.Input.keys['${dirB}'] = false; return 1;`); await G_(p1, `S.Input.keys['${dirA}'] = false; return 1;`);
  await p1.page.waitForTimeout(600);
  const trA = await G_(p1, 'C.tracing = false; return C.trace.slice();'), trB = await G_(p2, 'C.tracing = false; return C.trace.slice();');
  const smooth = (tr, ix) => {
    // the moving window: frames between the first and last movement, middle 60%
    const d = []; for (let i = 1; i < tr.length; i++) { const dt = tr[i][0] - tr[i - 1][0]; if (dt <= 0) continue; d.push({ dt, dist: Math.hypot(tr[i][ix] - tr[i - 1][ix], tr[i][ix + 1] - tr[i - 1][ix + 1]) }); }
    let s0 = d.findIndex(e => e.dist > 0.05), s1 = d.length - 1; while (s1 > 0 && d[s1].dist <= 0.05) s1--;
    const mv = s0 >= 0 ? d.slice(s0, s1 + 1) : [], m = mv.slice(Math.floor(mv.length * 0.2), Math.ceil(mv.length * 0.8));
    if (m.length < 5) return { n: m.length, ok: false };
    const v = m.map(e => e.dist / e.dt).sort((p, q) => p - q), med = v[v.length >> 1];
    const stalls = m.filter(e => e.dist < 0.05).length, jumps = m.filter(e => e.dist / e.dt > med * 4 + 0.02).length, total = m.reduce((q, e) => q + e.dist, 0);
    const r = { n: m.length, stallFrac: +(stalls / m.length).toFixed(2), jumpFrac: +(jumps / m.length).toFixed(2), medPxPerMs: +med.toFixed(3), total: +total.toFixed(1) };
    r.ok = r.stallFrac <= 0.2 && r.jumpFrac <= 0.1 && total > 25; return r;
  };
  const sA2 = smooth(trA, 3), sB2 = smooth(trB, 3), sB1 = smooth(trB, 1);
  chk(sA2.ok, 'P2’s ship moves smoothly on the host phone (no stalls or jumps frame to frame)', sA2);
  chk(sB2.ok, 'P2’s own ship moves smoothly on the second phone (predicted locally)', sB2);
  chk(sB1.ok, 'P1’s ship moves smoothly on the second phone (interpolated between snapshots)', sB1);
  a = await hud(p1); b = await hud(p2);
  chk(near(a.hud.p1, b.hud.p1) && near(a.hud.p2, b.hud.p2), 'after the smooth-motion run both ships settle to the same spot on both phones', { a: [a.hud.p1, a.hud.p2], b: [b.hud.p1, b.hud.p2] });

  // Watch a full minute: P2 stays visible and in bounds on both phones, roles stay locked.
  const t0 = Date.now();
  let n = 0, bad = null, lastSnaps = (await hud(p2)).snaps;
  while (Date.now() - t0 < WATCH_MS) {
    // a little guest motion, then release, so we also keep proving drag does not run away
    await p2.page.evaluate(() => {
      const I = document.getElementById('game').contentWindow.STRIKE.Input;
      I.dragX = ((Date.now() / 400) % 2 < 1) ? 6 : -6; I.dragY = 0;
    });
    await p1.page.waitForTimeout(2000);
    a = await hud(p1); b = await hud(p2);
    const vs = await G_(p2, 'return C.visShots();');
    n++;
    const row = { vs, t: Date.now() - t0, a: a.hud, b: b.hud, roles: [a.role, b.role], snaps: b.snaps, cab: [a.mp && a.mp.cabN, b.mp && b.mp.cabN] };
    if (!(a.role === 'host' && b.role === 'guest' && a.p2on && b.p2on && a.locked && b.locked
        && a.hud && a.hud.p2 && a.hud.p2.alive && b.hud && b.hud.p2 && b.hud.p2.alive
        && inBounds(a.hud.p2, true) && inBounds(b.hud.p2, true)
        && inBounds(a.hud.p1, true) && b.snaps > lastSnaps && (vs.p2 > 0 || b.hud.p2.beam || b.hud.p2.plz))) {   // fire = bullets, laser beam or plasma (real drops can switch weapon)
      bad = row; break;
    }
    lastSnaps = b.snaps;
  }
  chk(!bad && n >= Math.floor(WATCH_MS / 2000) - 1, 'P2 stays on both screens, in bounds, firing (seen on the second phone), with stable host/guest roles for ' + (WATCH_MS / 1000) + ' s', bad || { n, secs: WATCH_MS / 1000, last: { a: a.hud, b: b.hud, snaps: lastSnaps } });

  // t813u (1): enemy bullets reach P2's (guest) screen over the real relay, about as many as the host has, and are drawn
  await G_(p1, "w.eval('ebul.clear && ebul.clear()'); for (let i = 0; i < 20; i++) w.eval('eb(' + (30 + i * 10) + ', ' + (50 + (i % 4) * 12) + ', Math.PI / 2, 0.5, ' + (i % 6) + ')'); return 1;");
  await p1.page.waitForTimeout(700);
  const ebH = await G_(p1, 'return S.pools.ebul.items.filter(u => u.alive && u.y > -12 && u.y < 640).length;');
  const ebG = await G_(p2, 'return { n: (C.visB || []).length, drawn: C.drawnB || 0 };');
  chk(ebG.n > 0 && ebH > 0 && Math.abs(ebG.n - ebH) <= Math.max(4, ebH * 0.3) && ebG.drawn > 0, 'enemy bullets show on P2’s (guest) phone over the real relay, roughly matching the host', { host: ebH, guest: ebG });
  // t813u (2): P2 closes the cabinet -> the host removes P2's ship (bye packet, no 10 s ghost)
  await p2.page.evaluate(() => window.__arcade.play.exit('x'));
  const gone = await p1.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__strikeCoop; return C && !C.p2on; }, null, { timeout: 6000 }).then(() => true).catch(() => false);
  const lv = await G_(p1, 'return { p2on: C.p2on, left: C.left, why: C.lastLeft || null, p2alive: C.pl2.alive, d0: C.drawn.p2 };');
  await p1.page.waitForTimeout(600);
  const lv2 = await G_(p1, 'return { p2on: C.p2on, d1: C.drawn.p2 };');
  chk(gone && !lv2.p2on && lv2.d1 === lv.d0, 'P2 leaves (closes the cabinet): the host removes P2’s ship and keeps it gone', { lv, lv2 });

  const errs = p1.errors.concat(p2.errors).filter(e => !/ERR_FAILED|Aborted/.test(e));
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));

  await browser.close(); srv.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
