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
  chk(x1 > x0 + 8 && x1b > x0 + 8, 'P2 drag from the second phone moves the orange ship on both screens', { x0, x1, x1b });
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
    n++;
    const row = { t: Date.now() - t0, a: a.hud, b: b.hud, roles: [a.role, b.role], snaps: b.snaps, cab: [a.mp && a.mp.cabN, b.mp && b.mp.cabN] };
    if (!(a.role === 'host' && b.role === 'guest' && a.p2on && b.p2on && a.locked && b.locked
        && a.hud && a.hud.p2 && a.hud.p2.alive && b.hud && b.hud.p2 && b.hud.p2.alive
        && inBounds(a.hud.p2, true) && inBounds(b.hud.p2, true)
        && inBounds(a.hud.p1, true) && b.snaps > lastSnaps)) {
      bad = row; break;
    }
    lastSnaps = b.snaps;
  }
  chk(!bad && n >= Math.floor(WATCH_MS / 2000) - 1, 'P2 stays on both screens, in bounds, with stable host/guest roles for a full minute', bad || { n, secs: WATCH_MS / 1000, last: { a: a.hud, b: b.hud, snaps: lastSnaps } });

  const errs = p1.errors.concat(p2.errors).filter(e => !/ERR_FAILED|Aborted/.test(e));
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));

  await browser.close(); srv.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
