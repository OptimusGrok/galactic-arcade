// t836u/v222: real two-phone Berserker co-op (no mocked parent.__mp). Two separate browser
// processes (separate storage), portrait phone + touch, real Supabase relay (__mpLive).
// P2 joins 10–30 s after P1 has started (after intro), and the reverse; also after CONTINUE.
// Guest / host movement is driven by real pointer events on the on-screen #joy (cabinet path),
// not by poking J. Instruments typ counts, role, p2on, warp, snapAge. No screenshots.
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
    let J = null, I2 = null;
    try { const W = C && C.world && C.world(); J = W && W.J && { x: +W.J.x, y: +W.J.y, id: W.J.id }; I2 = C.I2 && { x: +C.I2.x, y: +C.I2.y }; } catch (e) {}
    const joy = w && w.document && w.document.getElementById('joy');
    const jr = joy && joy.getBoundingClientRect();
    return {
      role: C && C.role, slot: C && C.slot, p2on: C && C.p2on, locked: C && C.locked,
      snaps: C && C.snaps, sent: C && C.sent, recv: C && C.recv, joins: C && C.joins, ins: C && C.ins,
      snapAge: C && C.snapAge, typ: C && C.typ, state: G && G.state, warp: G && +((G.warp || 0).toFixed(2)),
      cabN: M && M.cabCount && M.cabCount('berserker'),
      bzSent: M && M.bzSent, bzRecv: M && M.bzRecv,
      p1: h && h.p1, p2: h && h.p2, peers, J, I2,
      joy: jr && { off: joy.classList.contains('off'), w: Math.round(jr.width), h: Math.round(jr.height), x: Math.round(jr.x), y: Math.round(jr.y) },
      mp: M && { state: M.state, id: M.id }
    };
  });
  async function waitIntro(ph) {
    await ph.page.waitForFunction(() => {
      const w = document.getElementById('game') && document.getElementById('game').contentWindow;
      return w && w.__B && w.__B.G && w.__B.G().state === 'play';
    }, null, { timeout: 15000 }).catch(() => {});
  }
  async function waitPlay(ph) {
    await ph.page.waitForFunction(() => {
      const w = document.getElementById('game') && document.getElementById('game').contentWindow;
      const G = w && w.__B && w.__B.G && w.__B.G();
      return G && G.state === 'play' && !(G.warp > 0.05);
    }, null, { timeout: 12000 }).catch(() => {});
  }
  // Real cabinet path: pointer events on the iframe's #joy, same as a finger on the phone.
  async function holdJoy(ph, dir, holdMs) {
    const start = await ph.page.evaluate(dir => {
      const f = document.getElementById('game'), w = f && f.contentWindow, doc = f && f.contentDocument;
      const joy = doc && doc.getElementById('joy');
      if (!joy) return { ok: false, why: 'no #joy' };
      if (joy.classList.contains('off')) return { ok: false, why: 'joy off', state: w.__B && w.__B.G && w.__B.G().state, warp: w.__B && w.__B.G && w.__B.G().warp };
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const tx = cx + (dir.x || 0) * r.width * 0.42, ty = cy + (dir.y || 0) * r.height * 0.42;
      const fire = (type, x, y) => {
        const ev = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 17, pointerType: 'touch', clientX: x, clientY: y, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1, view: w, isPrimary: true });
        joy.dispatchEvent(ev);
      };
      fire('pointerdown', cx, cy);
      fire('pointermove', tx, ty);
      w.__joyHold = setInterval(() => fire('pointermove', tx, ty), 32);
      const J = w.__bzCoop && w.__bzCoop.world && w.__bzCoop.world().J;
      return { ok: true, J: J && { x: +J.x.toFixed(3), y: +J.y.toFixed(3), id: J.id }, box: { w: Math.round(r.width), h: Math.round(r.height) } };
    }, dir);
    return start;
  }
  async function releaseJoy(ph) {
    await ph.page.evaluate(() => {
      const f = document.getElementById('game'), w = f && f.contentWindow, doc = f && f.contentDocument;
      const joy = doc && doc.getElementById('joy');
      try { if (w.__joyHold) clearInterval(w.__joyHold); w.__joyHold = 0; } catch (e) {}
      if (!joy) return;
      const r = joy.getBoundingClientRect();
      const ev = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 17, pointerType: 'touch', clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, buttons: 0, view: w, isPrimary: true });
      joy.dispatchEvent(ev);
    });
  }
  async function movedTouch(driver, who, observer) {
    const beforeD = await net(driver), beforeO = observer ? await net(observer) : null;
    const held = await holdJoy(driver, { x: 1, y: 0 }, 0);
    await driver.page.waitForTimeout(1600);
    const afterD = await net(driver), afterO = observer ? await net(observer) : null;
    await releaseJoy(driver);
    await driver.page.waitForTimeout(200);
    const pick = (n) => who === 2 ? (n && n.p2) || {} : (n && n.p1) || {};
    const dSelf = Math.hypot((pick(afterD).x || 0) - (pick(beforeD).x || 0), (pick(afterD).y || 0) - (pick(beforeD).y || 0));
    const dObs = afterO ? Math.hypot((pick(afterO).x || 0) - (pick(beforeO).x || 0), (pick(afterO).y || 0) - (pick(beforeO).y || 0)) : null;
    const in0 = (beforeO && beforeO.ins) || (beforeD.ins) || 0;
    const in1 = (afterO && afterO.ins) || (afterD.ins) || 0;
    const typ0 = (driver === observer || !observer) ? (beforeD.typ && beforeD.typ.s_in) : (beforeD.typ && beforeD.typ.s_in);
    const typ1 = afterD.typ && afterD.typ.s_in;
    return { held, dSelf, dObs, in0, in1, typ0, typ1, beforeD, afterD, beforeO, afterO };
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

  await waitPlay(p1); await waitPlay(p2);
  const m1 = await movedTouch(p1, 1, p2);
  chk(m1.held && m1.held.ok, 'A host #joy accepted a real pointer press', m1.held);
  chk(m1.dSelf > 8, 'A host P1 actually moved on the host screen from the on-screen stick', { dSelf: m1.dSelf, J: m1.held && m1.held.J, p1: m1.afterD && m1.afterD.p1 });
  chk(m1.dObs > 8, 'A guest screen shows P1 moving (not a frozen snapshot)', { dObs: m1.dObs, guestP1: m1.afterO && m1.afterO.p1, hostP1: m1.afterD && m1.afterD.p1 });

  const m2 = await movedTouch(p2, 2, p1);
  console.log('A guest stick typ in', JSON.stringify({ held: m2.held, typ0: m2.typ0, typ1: m2.typ1, in0: m2.in0, in1: m2.in1, dSelf: m2.dSelf, dObs: m2.dObs, J: m2.afterD && m2.afterD.J, I2: m2.afterO && m2.afterO.I2 }).slice(0, 800));
  chk(m2.held && m2.held.ok && (m2.held.J && Math.abs(m2.held.J.x) > 0.2), 'A guest #joy accepted a real pointer press and J.x is held right', m2.held);
  chk((m2.typ1 || 0) > (m2.typ0 || 0), 'A guest typ in packets were sent while the stick was held', { typ0: m2.typ0, typ1: m2.typ1, in0: m2.in0, in1: m2.in1 });
  chk(m2.dSelf > 8, 'A guest screen shows P2 moving from the on-screen stick', { dSelf: m2.dSelf, guestP2: m2.afterD && m2.afterD.p2 });
  chk(m2.dObs > 8, 'A host screen shows P2 moving after guest stick input', { dObs: m2.dObs, hostP2: m2.afterO && m2.afterO.p2, hostI2: m2.afterO && m2.afterO.I2, ins: [m2.in0, m2.in1] });

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
  chk(forced === true && used === true, 'A host CONTINUE ran', { forced, shown, used });
  let samples = [];
  for (let i = 0; i < 12; i++) {
    await p2.page.waitForTimeout(200);
    a = await net(p1); b = await net(p2);
    samples.push({ t: (i + 1) * 200, snapAge: b.snapAge, warp: a.warp, st: b.typ && b.typ.r_st, lives: [a.p1 && a.p1.lives, b.p1 && b.p1.lives] });
  }
  const early = samples.find(s => s.t <= 600 && s.snapAge != null && s.snapAge < 800);
  const lateS = samples.filter(s => s.t >= 1600);
  const lateFresh = lateS.length && lateS.every(s => s.snapAge != null && s.snapAge < 800);
  a = await net(p1); b = await net(p2);
  console.log('A after CONTINUE', JSON.stringify({ forced, shown, used, samples, a: { role: a.role, p2on: a.p2on, typ: a.typ, p1: a.p1, warp: a.warp }, b: { role: b.role, p2on: b.p2on, typ: b.typ, snapAge: b.snapAge, p1: b.p1 } }).slice(0, 1200));
  coopOk('A after CONTINUE', a, b);
  chk(early && lateFresh && a.p1 && b.p1 && a.p1.lives === b.p1.lives,
    'A after CONTINUE typ st is fresh during the landing warp and still fresh after it, matching the host run',
    { early, lateS, snapAge: b.snapAge, samples, hostP1: a.p1, guestP1: b.p1 });

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
