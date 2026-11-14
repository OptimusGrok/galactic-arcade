// t807u: LONG real-time two-phone Strike co-op run (realistic play). Based on strike_coop_live.js setup.
// t797u: real two-phone Strike co-op (no mocked parent.__mp). Two portrait contexts,
// real Supabase path (__mpLive), P1 starts then P2 joins mid-game. Watches P2 on both
// screens for a minute, checks host/guest lock, in-bounds positions, consumed drag,
// and that a brief cabN flap does not clear P2. No screenshots.
const { chromium } = require('/workspace/burrow-buster/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.GA_ROOT || path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.css': 'text/css', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
const LONG_MS = Number(process.env.LONG_MS || 75000), GOD = process.env.GOD !== '0';
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
  const ids = { p1: 't807a' + tag, p2: 't807b' + tag };

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

  await startCab(p1);
  await p1.page.evaluate(() => { const P = window.__arcade.play; P.machines.strike.credits = 3; P.tryPlay(); });
  await p1.page.evaluate(() => { document.getElementById('game').contentWindow.STRIKE.G.god = true; });
  if (false) await p1.page.evaluate(() => { document.getElementById('game').contentWindow.STRIKE.G.god = true; });
  await p1.page.waitForTimeout(800);
  await startCab(p2);
  await p2.page.waitForTimeout(600);
  await p2.page.evaluate(() => { const P = window.__arcade.play; P.machines.strike.credits = 3; P.tryPlay(); });
  await p2.page.waitForFunction(() => { const C = document.getElementById('game').contentWindow.__strikeCoop; return C && C.role === 'guest' && C.p2on && C.snaps > 0; }, null, { timeout: 20000 }).catch(() => {});
  await p2.page.waitForTimeout(1500);
  const G_ = (ph, js) => ph.page.evaluate(js => { const w = document.getElementById('game').contentWindow; return (new Function('S', 'C', 'w', js))(w.STRIKE, w.__strikeCoop, w); }, js);
  // guest phone: hold a finger down (fire) and wander; host: autofire and wander too
  await G_(p2, 'S.Input.ptrDown = true; return 1;');
  const sample = async () => {
    const g = await G_(p2, `const M = parent.__mp, r = M && M.strike && [...M.strike.peers.values()][0];
      return { role: C.role, p2on: C.p2on, scene: S.G.scene, snapAge: r ? Math.round(performance.now() - r.at) : -1, snaps: C.snaps,
        visE: (C.visE || []).length, visB: (C.visB || []).length, visIt: (C.visIt || []).length, boss: (C.hud() && C.hud().boss) || C.visBs || null, vis: C.visShots(), p1: C.hud().p1, p2: C.hud().p2, mp: M && M.state, reason: M && M.reason,
        recv: M && M.strikeRecv, sent: M && M.strikeSent, q: 0 };`);
    const h = await G_(p1, `const M = parent.__mp; let size = 0; try { size = JSON.stringify(Object.assign({ typ: 'st' }, {})).length; } catch (e) {}
      return { role: C.role, p2on: C.p2on, scene: S.G.scene, stage: S.G.stage, phase: S.G.phase, en: S.pools.enemies.count, ps: S.pools.pshots.count, eb: S.pools.ebul.count, items: S.pools.items.count, boss: C.hud().boss,
        shots: C.shotCount(), p1: C.hud().p1, p2: C.hud().p2, mp: M && M.state, reason: M && M.reason, sent: M && M.strikeSent, recv: M && M.strikeRecv, bytes: M && M.bytes, msent: M && M.sent };`);
    return { g, h };
  };
  // Script (real time): 0-30 s both flying (P1 must stay visible on P2's phone); P2 picks up plasma at ~10 s;
  // at 30 s P1 loses its last life (the live bug: host went GAME OVER -> demo while P2 played); P2 keeps playing to the end,
  // picks up laser at ~38 s and spread at ~52 s; at the end P2 loses its last life and both phones must end cleanly.
  const PHASE1 = Math.min(30000, LONG_MS / 2);
  const t0 = Date.now(); const rows = []; let k = 0, p1killed = false;
  const drops = [[10, 'P'], [38, 'B'], [52, 'R']];   // laser after P1 is out so P1 cannot grab it first
  while (Date.now() - t0 < LONG_MS) {
    k++;
    const el = (Date.now() - t0) / 1000;
    await G_(p2, `const I = S.Input; I.ptrDown = true; I.dragX = ${(k % 4 < 2) ? 10 : -10}; I.dragY = ${(k % 6 < 3) ? -4 : 4}; return 1;`);
    await G_(p1, `const I = S.Input; I.dragX = ${(k % 5 < 2) ? -8 : 8}; return 1;`);
    for (const d of drops) if (!d.done && el >= d[0]) { d.done = 1; for (let j = 0; j < 3; j++) await G_(p1, `w.eval('dropItem("${d[1]}", window.__strikeCoop.pl2.x, window.__strikeCoop.pl2.y)'); return 1;`); }
    if (k % 5 === 0) await G_(p1, "w.eval('dropItem(\"chip\", window.__strikeCoop.pl2.x, window.__strikeCoop.pl2.y - 20)'); return 1;");
    // t831u: leave a visible pickup on screen (away from both ships) and spawn a boss so the guest snapshot can show them
    if (k === 2) await G_(p1, "w.eval('dropItem(\"medal\", 40, 50); dropItem(\"shield\", 200, 40);'); if (C.sendStateNow) C.sendStateNow(); return 1;");
    if (k === 8 && !p1killed) await G_(p1, "if (!S.G.boss) { S.G.phase = 'boss'; w.eval('spawnBoss(\"hawk\", false)'); } if (C.sendStateNow) C.sendStateNow(); return 1;");
    if (!p1killed && Date.now() - t0 >= PHASE1) { p1killed = true; await G_(p1, 'C.killP1(); return 1;'); }
    await p1.page.waitForTimeout(1000);
    const s = await sample(); s.t = Math.round((Date.now() - t0) / 1000); s.phase = p1killed ? 2 : 1; rows.push(s);
    const g = s.g, h = s.h;
    console.log(`t=${s.t}s G[${g.role} sc=${g.scene} age=${g.snapAge} E=${g.visE} S=${g.vis.p1}/${g.vis.p2} p1=${g.p1.alive ? 'A' : 'd'}(${g.p1.x | 0},${g.p1.y | 0}) p2=${g.p2.alive ? 'A' : 'd'} ${g.p2.weapon}${g.p2.wlv} beam=${g.p2.beam ? 1 : 0} plz=${g.p2.plz}] H[${h.role} sc=${h.scene} en=${h.en} sh=${h.shots.p1}/${h.shots.p2} p1=${h.p1.alive ? 'A' : 'd'} L${h.p1.lives} p2=${h.p2.alive ? 'A' : 'd'} L${h.p2.lives} ${h.p2.weapon} beam=${h.p2.beam ? 1 : 0} plz=${h.p2.plz}]`);
  }
  // per-sample checks while both phones are in the co-op game
  const live = rows.filter(r => r.h.scene === 'play' && r.h.role === 'host' && r.g.role === 'guest');
  const fireSeen = r => r.g.vis.p2 > 0 || r.g.p2.beam || r.g.p2.plz > 0;
  const hostFires = r => r.h.shots.p2 > 0 || r.h.p2.beam || r.h.p2.plz > 0;
  const badAge = live.filter(r => r.g.snapAge > 1500);
  const badFire = live.filter(r => r.h.p2.alive && hostFires(r) && !fireSeen(r));
  const badP1 = live.filter(r => r.phase === 1 && r.h.p1.alive && !(r.g.p1.alive && r.g.p1.x >= 0 && r.g.p1.x <= 270 && r.g.p1.y >= 0 && r.g.p1.y <= 640));
  const badE = live.filter(r => r.h.en > 0 && r.g.visE === 0);
  const ph2 = live.filter(r => r.phase === 2);
  chk(live.length >= Math.floor(LONG_MS / 1000) - 8, 'both phones stay in the co-op game for the whole run (' + Math.round(LONG_MS / 1000) + ' s)', { live: live.length, rows: rows.length, last: rows[rows.length - 1] });
  chk(badAge.length === 0, 'host snapshots keep arriving (age < 1.5 s) for the whole run', badAge.slice(0, 3).map(r => ({ t: r.t, age: r.g.snapAge })));
  chk(badFire.length <= 1, 'P2’s fire (shots, laser or plasma) stays visible on the second phone', badFire.slice(0, 3).map(r => ({ t: r.t, g: r.g.vis, w: r.g.p2.weapon, h: r.h.shots })));
  chk(badP1.length <= 1, 'P1’s ship stays visible on the second phone while P1 is alive', badP1.slice(0, 3).map(r => ({ t: r.t, g: r.g.p1, h: r.h.p1 })));
  chk(badE.length <= Math.max(1, live.length * 0.1), 'enemies keep rendering on the second phone', { bad: badE.length, of: live.length });
  chk(rows.some(r => r.g.p2.plz > 0) && rows.some(r => r.g.p2.beam), 'P2’s plasma and laser pickups are drawn on the second phone', { plz: rows.filter(r => r.g.p2.plz > 0).length, beam: rows.filter(r => r.g.p2.beam).length });
  chk(rows.some(r => (r.g.visIt || 0) > 0 || (r.h.items || 0) === 0 && (r.g.visIt || 0) === 0) && rows.some(r => (r.g.visIt || 0) > 0),
    'pickups appear on P2’s (guest) screen during the run', { guest: rows.filter(r => (r.g.visIt || 0) > 0).length, host: rows.filter(r => (r.h.items || 0) > 0).length });
  chk(rows.some(r => r.g.boss && r.g.boss.id && r.g.boss.parts > 0),
    'a boss appears on P2’s (guest) screen (parts and HP)', rows.filter(r => r.g.boss).slice(0, 3).map(r => ({ t: r.t, g: r.g.boss, h: r.h.boss })));
  chk(ph2.length >= 10 && ph2.every(r => !r.h.p1.alive) && ph2.filter(r => r.h.p2.alive).length >= ph2.length - 1, 'after P1’s last life the co-op game keeps going for P2 (P1 sits out)', { n: ph2.length, last: ph2[ph2.length - 1] && { h: ph2[ph2.length - 1].h.scene, g: ph2[ph2.length - 1].g.scene } });
  // both out -> both phones end cleanly (no frozen screen)
  await G_(p1, 'C.killP2(); return 1;');
  await p1.page.waitForTimeout(4000);
  const end = await sample();
  chk(end.h.scene !== 'play' && end.g.role !== 'guest' && end.g.scene !== 'play', 'when both players are out, both phones leave the game cleanly', { host: end.h.scene, guest: [end.g.role, end.g.scene] });
  const errs = p1.errors.concat(p2.errors).filter(e => !/ERR_FAILED|Aborted/.test(e));
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));
  await browser.close(); srv.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
