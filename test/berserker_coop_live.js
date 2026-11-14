// t836u: real two-phone Berserker co-op (no mocked parent.__mp). Two separate browser
// contexts (separate storage), portrait phone + touch, real Supabase relay (__mpLive).
// P2 joins 10–30 s after P1 has started (after intro), and the reverse; also after CONTINUE.
// Instruments typ counts, role, p2on. No screenshots.
// NOSHOTS=1 node test/berserker_coop_live.js
// GA_URL=https://optimusgrok.github.io/galactic-arcade/index.html NOSHOTS=1 node test/berserker_coop_live.js
const { chromium } = require('/workspace/burrow-buster/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.GA_ROOT || path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.css': 'text/css', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
const VIEW = { width: 390, height: 844 };
const DELAY_MS = Number(process.env.JOIN_DELAY_MS || 12000);
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 900) : '')); if (!c) ok = false; };

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
  const tag = Date.now().toString(36);
  const browsers = [];

  async function make(name, id) {
    const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    browsers.push(browser);
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(({ name, id }) => {
      window.__skipStart = 1; window.__noUnloadWarn = 1; window.__noRandomRoom = 1;
      window.__mpLive = true; window.__mpId = id;
      try {
        localStorage.setItem('galacticarcade.player', JSON.stringify({ name, char: name === 'HostP1' ? 'monkey' : 'alien', hoodie: 'navy', suit: 'suitgrey' }));
        localStorage.setItem('neonarcade.mpId', id);
        localStorage.setItem('neonarcade.mpName', name);
        localStorage.setItem('neonarcade.mute', '1');
        localStorage.setItem('neonarcade.tickets', '20');
        localStorage.setItem('neonarcade.vikingTickets', '3');
      } catch (e) {}
    }, { name, id });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
    await page.goto(url, { timeout: 180000 });
    const ready = await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 }).then(() => true).catch(() => false);
    if (!ready) {
      const st = await page.evaluate(() => ({ href: location.href, arcade: !!window.__arcade, frames: window.__arcade && window.__arcade.stats && window.__arcade.stats.frames, body: (document.body && document.body.innerText || '').slice(0, 180), err: window.__lastErr || null }));
      console.log('LOAD FAIL ' + name, JSON.stringify(st), errors.slice(0, 8));
      throw new Error(name + ' arcade did not start');
    }
    return { name, id, page, ctx, browser, errors };
  }

  const p1 = await make('HostP1', 't836a' + tag);
  const p2 = await make('JoinP2', 't836b' + tag);

  async function waitMp(ph) {
    const on = await ph.page.waitForFunction(() => window.__mp && window.__mp.state === 'on', null, { timeout: 40000 }).then(() => true).catch(() => false);
    const st = await ph.page.evaluate(() => window.__mp && { state: window.__mp.state, reason: window.__mp.reason, count: window.__mp.count, id: window.__mp.id });
    chk(on && st && st.state === 'on', ph.name + ' joins the real MP room', st);
    return on;
  }
  await waitMp(p1); await waitMp(p2);

  async function startCab(ph) {
    await ph.page.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.berserker); });
    await ph.page.waitForFunction(() => {
      const P = window.__arcade.play, f = document.getElementById('game');
      return P && P.mode === 'game' && P.sub === 'demo' && f && f.classList.contains('on') && f.contentWindow && f.contentWindow.__B && f.contentWindow.__bzCoop;
    }, null, { timeout: 90000 });
  }
  async function tryPlay(ph) {
    await ph.page.evaluate(() => { const P = window.__arcade.play; P.tickets.total = 20; P.machines.berserker.credits = 1; P.tryPlay(); });
    chk(await ph.page.evaluate(() => window.__arcade.play.sub) === 'play', ph.name + ' starts a credited Berserker game');
    await ph.page.evaluate(() => { try { document.getElementById('game').contentWindow.__B.cheat.inv = true; } catch (e) {} });
  }
  const net = ph => ph.page.evaluate(() => {
    const f = document.getElementById('game'), w = f && f.contentWindow, C = w && w.__bzCoop, M = window.__mp, G = w && w.__B && w.__B.G && w.__B.G();
    const peers = [];
    try {
      const now = performance.now();
      if (M && M.berserker && M.berserker.peers) {
        for (const [pid, r] of M.berserker.peers) peers.push({ id: String(pid).slice(-6), typ: r && r.s && r.s.typ, st: !!(r && r.st), age: r ? Math.round(now - r.at) : null, p2: r && r.s && r.s.p2 });
      }
    } catch (e) {}
    const h = C && C.hud && C.hud();
    return {
      role: C && C.role, slot: C && C.slot, p2on: C && C.p2on, locked: C && C.locked,
      snaps: C && C.snaps, sent: C && C.sent, recv: C && C.recv, joins: C && C.joins, ins: C && C.ins,
      snapAge: C && C.snapAge, typ: C && C.typ, state: G && G.state,
      cabN: M && M.cabCount && M.cabCount('berserker'),
      bzSent: M && M.bzSent, bzRecv: M && M.bzRecv,
      p1: h && h.p1, p2: h && h.p2, peers,
      mp: M && { state: M.state, id: M.id }
    };
  });
  async function waitIntro(ph) {
    await ph.page.waitForFunction(() => {
      const w = document.getElementById('game') && document.getElementById('game').contentWindow;
      return w && w.__B && w.__B.G && w.__B.G().state === 'play';
    }, null, { timeout: 15000 }).catch(() => {});
  }
  async function moved(ph, who, holdMs) {
    const before = await net(ph);
    await ph.page.evaluate(who => {
      const w = document.getElementById('game').contentWindow, C = w.__bzCoop;
      const hold = () => {
        try {
          const J = C && C.world && C.world().J;
          if (J) { J.x = 1; J.y = 0; }
          if (who === 2 && C && C.I2) { C.I2.x = 1; C.I2.y = 0; }
        } catch (e) {}
      };
      hold();
      w.__holdJ = setInterval(hold, 16);
    }, who);
    await ph.page.waitForTimeout(holdMs || 1200);
    const after = await net(ph);
    const a = who === 2 ? (before.p2 || {}) : (before.p1 || {}), b = who === 2 ? (after.p2 || {}) : (after.p1 || {});
    const d = Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0));
    await ph.page.evaluate(() => {
      const w = document.getElementById('game').contentWindow, C = w && w.__bzCoop;
      try { if (w.__holdJ) clearInterval(w.__holdJ); const J = C && C.world && C.world().J; if (J) { J.x = 0; J.y = 0; } if (C && C.I2) { C.I2.x = 0; C.I2.y = 0; } } catch (e) {}
    });
    return { d, before: a, after: b, net: after };
  }
  function coopOk(label, a, b) {
    chk(a.role === 'host' && a.p2on && a.p2 && a.p2.alive, label + ': host has P2 in the game', a);
    chk(b.role === 'guest' && b.p2on && b.snaps > 0 && b.p1 && b.p2, label + ': guest is guest, has snapshots, both Vikings present', b);
    chk(a.role !== b.role, label + ': the two phones are not both host', { a: a.role, b: b.role });
  }

  async function exitCab(ph) {
    await ph.page.evaluate(() => { try { window.__arcade.play.exit('x'); } catch (e) {} });
    await ph.page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 120000 }).catch(() => {});
    await ph.page.waitForTimeout(400);
  }

  // ---- case A: P1 starts, waits out intro + DELAY, then P2 joins ----
  await startCab(p1);
  await tryPlay(p1);
  await waitIntro(p1);
  console.log('P1 after intro', JSON.stringify(await net(p1)).slice(0, 500));
  await p1.page.waitForTimeout(DELAY_MS);
  console.log('P1 after delay, before P2', JSON.stringify(await net(p1)).slice(0, 500));

  await startCab(p2);
  await tryPlay(p2);
  await p1.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && C.role === 'host' && C.p2on; }, null, { timeout: 20000 }).catch(() => {});
  await p2.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && C.role === 'guest' && C.snaps > 0 && C.p2on; }, null, { timeout: 20000 }).catch(() => {});
  await p2.page.waitForTimeout(1500);
  let a = await net(p1), b = await net(p2);
  console.log('A host', JSON.stringify(a).slice(0, 800));
  console.log('A guest', JSON.stringify(b).slice(0, 800));
  coopOk('A P2 joins ' + (DELAY_MS / 1000) + 's after P1', a, b);

  const m1 = await moved(p1, 1, 1400);
  await p2.page.waitForTimeout(400);
  const gAfter = await net(p2);
  const p1Seen = Math.hypot((gAfter.p1 && gAfter.p1.x || 0) - (m1.before.x || 0), (gAfter.p1 && gAfter.p1.y || 0) - (m1.before.y || 0));
  chk(m1.d > 8, 'A host P1 actually moved on the host screen', m1);
  chk(p1Seen > 8 || (gAfter.p1 && Math.hypot((gAfter.p1.x || 0) - (m1.after.x || 0), (gAfter.p1.y || 0) - (m1.after.y || 0)) < 40 && m1.d > 8),
    'A guest screen shows P1 moving (not a frozen snapshot)', { p1Seen, hostMove: m1.d, guestP1: gAfter.p1, hostP1: m1.after });

  const m2 = await moved(p2, 2, 1400);
  await p1.page.waitForTimeout(500);
  a = await net(p1);
  const p2Seen = Math.hypot((a.p2 && a.p2.x || 0) - (m2.before.x || 0), (a.p2 && a.p2.y || 0) - (m2.before.y || 0));
  chk(p2Seen > 6 || (a.p2 && a.p2.alive && m2.d > 6), 'A host screen shows P2 moving after guest input', { p2Seen, guestMove: m2.d, hostP2: a.p2, guestP2: m2.after });

  // CONTINUE on the host, then confirm co-op still runs
  const forced = await p1.page.evaluate(() => {
    const C = document.getElementById('game').contentWindow.__gaContinue;
    try { if (C && C.mark) C.mark(); return C && C.force && C.force(); } catch (e) { return String(e); }
  });
  await p1.page.waitForTimeout(600);
  const shown = await p1.page.waitForFunction(() => {
    const b = document.getElementById('bContinue'), p = window.__arcade.play;
    return p.sub === 'play' && b && b.classList.contains('on');
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const used = shown ? await p1.page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 12; return p.tryContinue(); }) : false;
  await p1.page.waitForTimeout(2000);
  await p2.page.waitForTimeout(500);
  a = await net(p1); b = await net(p2);
  console.log('A after CONTINUE', JSON.stringify({ forced, shown, used, a, b }).slice(0, 900));
  chk(forced === true && used === true, 'A host CONTINUE ran', { forced, shown, used });
  coopOk('A after CONTINUE', a, b);
  chk((b.snapAge == null || b.snapAge < 1500) && a.p1 && b.p1 && a.p1.lives === b.p1.lives,
    'A after CONTINUE the guest has a fresh typ:\'st\' matching the host run', { snapAge: b.snapAge, hostP1: a.p1, guestP1: b.p1, typA: a.typ, typB: b.typ });

  await exitCab(p1); await exitCab(p2);

  // ---- case B: reverse — JoinP2 starts first, HostP1 joins after DELAY ----
  await startCab(p2);
  await tryPlay(p2);
  await waitIntro(p2);
  await p2.page.waitForTimeout(DELAY_MS);
  await startCab(p1);
  await tryPlay(p1);
  // whoever started first should host
  const late = Date.now();
  await p2.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && ((C.role === 'host' && C.p2on) || (C.role === 'guest' && C.snaps > 0)); }, null, { timeout: 20000 }).catch(() => {});
  await p1.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__bzCoop; return C && ((C.role === 'host' && C.p2on) || (C.role === 'guest' && C.snaps > 0)); }, null, { timeout: 20000 }).catch(() => {});
  await p1.page.waitForTimeout(1500);
  a = await net(p1); b = await net(p2);
  console.log('B first-starter (JoinP2) ', JSON.stringify(b).slice(0, 800));
  console.log('B late joiner (HostP1) ', JSON.stringify(a).slice(0, 800));
  const host = b.role === 'host' ? b : a, guest = b.role === 'guest' ? b : a;
  chk(b.role === 'host' && a.role === 'guest', 'B the first starter hosts, the late phone is guest', { first: b.role, late: a.role, ms: Date.now() - late });
  coopOk('B HostP1 joins ' + (DELAY_MS / 1000) + 's after JoinP2', host, guest);

  const realErr = (p1.errors.concat(p2.errors)).filter(e => !/Failed to load resource|net::ERR_FAILED|net::ERR_ABORTED/i.test(e));
  chk(realErr.length === 0, 'no page errors ' + realErr.join(' | '));

  await p1.ctx.close().catch(() => {}); await p2.ctx.close().catch(() => {});
  for (const br of browsers) await br.close().catch(() => {});
  srv.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message + '\n' + e.stack); process.exit(1); });
