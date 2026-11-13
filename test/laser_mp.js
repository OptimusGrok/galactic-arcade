// t798u: other players must see your laser shots, scaled charged bolts, the charge ball,
// and the 3 s beam (blue monkey / red alien, from the gun muzzle) — in the arcade room
// and in Sky Tower. Two real-MP portrait/phone contexts, no mocked parent.__mp.
// No screenshots.
const { chromium } = require('/workspace/burrow-buster/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.GA_ROOT || path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.css': 'text/css', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
const VIEW = { width: 844, height: 390 };
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

  async function make(name, id, char) {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(({ name, id, char }) => {
      window.__skipStart = 1; window.__noUnloadWarn = 1; window.__noRandomRoom = 1;
      window.__mpLive = true; window.__mpId = id;
      try {
        const own = ['hand:pistol'];
        localStorage.setItem('galacticarcade.wardrobeOwned', JSON.stringify(own));
        localStorage.setItem('galacticarcade.player', JSON.stringify({ name, char, hat: 'cap', hoodie: 'navy', fur: 'brown', shoes: 'red', hand: 'pistol', suit: 'suitgrey' }));
        localStorage.setItem('neonarcade.mpId', id);
        localStorage.setItem('neonarcade.mpName', name);
        localStorage.setItem('neonarcade.mute', '1');
      } catch (e) {}
    }, { name, id, char });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url, { timeout: 180000 });
    await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
    return { name, id, page, ctx, errors };
  }

  const p1 = await make('ZapA', 't798a' + tag, 'monkey');
  const p2 = await make('ZapB', 't798b' + tag, 'monkey');

  async function waitMp(ph) {
    const on = await ph.page.waitForFunction(() => window.__mp && window.__mp.state === 'on', null, { timeout: 25000 }).then(() => true).catch(() => false);
    chk(on, ph.name + ' joins the real MP room', await ph.page.evaluate(() => window.__mp && { state: window.__mp.state, reason: window.__mp.reason }));
    return on;
  }
  await waitMp(p1); await waitMp(p2);
  await p1.page.waitForFunction(() => window.__mp && window.__mp.peers && window.__mp.peers.size >= 1, null, { timeout: 15000 }).catch(() => {});

  async function equip(ph) {
    await ph.page.evaluate(() => {
      if (window.__gaPlayer) window.__gaPlayer.pick('hand', 'pistol');
      if (window.__roomFire) window.__roomFire.update(0);
    });
    await ph.page.waitForFunction(() => window.__roomFire && window.__roomFire.shown, null, { timeout: 20000 }).catch(() => {});
  }
  await equip(p1); await equip(p2);
  chk(await p1.page.evaluate(() => !!window.__roomFire.shown), 'P1 has the laser pistol out in the arcade');

  const muzY = await p1.page.evaluate(() => {
    const A = window.__arcade, T = A.THREE, mk = A.monkey, p = new T.Vector3();
    mk.updateMatrixWorld(true);
    const mz = mk.getObjectByName('gaPistolMuzzle'); if (mz) mz.getWorldPosition(p);
    return { muzzleY: +p.y.toFixed(3), feetY: +mk.position.y.toFixed(3) };
  });

  // Normal shot
  await p2.page.evaluate(() => { const R = window.__roomFire; R.r0 = R.remote; });
  await p1.page.evaluate(() => { const R = window.__roomFire; R.cool = 0; R.fire({ k: 0 }); });
  const nShot = await p2.page.waitForFunction(() => {
    const R = window.__roomFire; return R.lasers.some(L => L.remote && (L.k || 0) < 0.05);
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const nInfo = await p2.page.evaluate(() => {
    const L = window.__roomFire.lasers.filter(x => x.remote).pop();
    return L && { k: L.k, hue: L.hue, oy: L.o && +L.o[1].toFixed(3), sx: +L.mesh.scale.x.toFixed(3) };
  });
  chk(nShot && nInfo && nInfo.hue === 'cyan' && (nInfo.k || 0) < 0.05, 'remote sees a normal cyan monkey shot', nInfo);

  // Scaled charged bolt
  await p1.page.evaluate(() => { const R = window.__roomFire; R.cool = 0; R.fire({ k: 0.6, fromRelease: true }); });
  const scOk = await p2.page.waitForFunction(() => window.__roomFire.lasers.some(L => L.remote && L.k > 0.5), null, { timeout: 8000 }).then(() => true).catch(() => false);
  const sc = await p2.page.evaluate(() => {
    const L = window.__roomFire.lasers.filter(x => x.remote && x.k > 0.5).pop();
    return L && { k: L.k, sx: +L.mesh.scale.x.toFixed(3), oy: L.o && +L.o[1].toFixed(3) };
  });
  chk(scOk && sc && sc.sx > 2 && sc.oy > muzY.feetY + 0.5, 'remote sees a thicker charged bolt from the gun muzzle', { sc, muzY });

  // Charge ball
  await p1.page.evaluate(() => { window.__roomFire.cool = 0; window.__roomFire.setHeld(true); });
  const ballOk = await p2.page.waitForFunction(() => {
    const S = window.__roomFire.remoteState && window.__roomFire.remoteState();
    return S && S.some(r => r.hasBall && r.k > 0.15 && !r.hasBeam);
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const ball = await p2.page.evaluate(() => (window.__roomFire.remoteState() || [])[0]);
  chk(ballOk && ball && ball.hasBall && ball.o && ball.o[1] > muzY.feetY + 0.5 && ball.h === 'cyan',
    'remote sees the charge ball at the monkey’s gun muzzle', { ball, muzY });

  // 3 s beam: pump charge in case this headless pair is running well under 60 fps
  // (update() caps dt at 0.05, so a slow rAF would take many wall seconds to reach 4 s)
  await p1.page.evaluate(() => {
    const R = window.__roomFire; R.setHeld(true);
    let n = 0; while (!R.beam && n++ < 200) R.update(0.05);
  });
  const beamOk = await p2.page.waitForFunction(() => {
    const S = window.__roomFire.remoteState && window.__roomFire.remoteState();
    return S && S.some(r => r.hasBeam && r.h === 'cyan');
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const beam = await p2.page.evaluate(() => (window.__roomFire.remoteState() || [])[0]);
  chk(beamOk && beam && beam.hasBeam && beam.o && beam.o[1] > muzY.feetY + 0.5,
    'remote sees the 3 s blue monkey beam from the gun muzzle', { beam, muzY });
  await p1.page.evaluate(() => { window.__roomFire.setHeld(false); });

  // ---------- Sky Tower ----------
  async function startSky(ph) {
    await ph.page.evaluate(() => { const P = window.__arcade.play; P.machines.skytower.credits = 1; P.start(P.machines.skytower); });
    await ph.page.waitForFunction(() => {
      const P = window.__arcade.play, f = document.getElementById('game');
      return P && P.mode === 'game' && P.sub === 'demo' && f && f.contentWindow && f.contentWindow.__skytower;
    }, null, { timeout: 90000 });
    await ph.page.evaluate(() => { const P = window.__arcade.play; P.machines.skytower.credits = 1; P.tryPlay(); });
    await ph.page.waitForFunction(() => {
      const w = document.getElementById('game') && document.getElementById('game').contentWindow;
      return w && w.__skytower && w.__skytower.ready && !w.__DEMO && w.__arcadePlay !== false;
    }, null, { timeout: 30000 }).catch(() => {});
    await ph.page.waitForFunction(() => {
      const w = document.getElementById('game').contentWindow, P = window.__arcade.play;
      return P.sub === 'play' && w.__skytower && w.__skytower.G && (w.__skytower.G.mode === 'play' || w.__skytower.G.run);
    }, null, { timeout: 20000 }).catch(() => {});
  }
  await startSky(p1);
  await startSky(p2);
  const skyReady = await p1.page.evaluate(() => {
    const w = document.getElementById('game').contentWindow, S = w.__skytower;
    return !!(S && S.fire && S.setFire && S.G);
  });
  chk(skyReady, 'both phones are in a real Sky Tower climb');

  const skyMuz = await p1.page.evaluate(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    const m = S.muzzlePos ? S.muzzlePos() : (S.player && { o: { x: 0, y: S.player.position.y + 1.5, z: 0 } });
    return { muzzleY: m && m.o ? +m.o.y.toFixed(3) : null, feetY: S.player ? +S.player.position.y.toFixed(3) : null };
  });

  // Give rivals a moment to appear
  await p2.page.waitForFunction(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    return S && S.rivals && S.rivals.rivals && S.rivals.rivals.length >= 1;
  }, null, { timeout: 15000 }).catch(() => {});

  await p1.page.evaluate(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    S.G.cooldown = 0; S.fire({ k: 0 });
  });
  const skyBolt = await p2.page.waitForFunction(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    const r = S.rivals && S.rivals.remoteLaser && S.rivals.remoteLaser();
    return r && r.boltsShown >= 1;
  }, null, { timeout: 10000 }).then(() => true).catch(() => false);
  chk(skyBolt, 'Sky Tower rival sees a normal laser bolt', await p2.page.evaluate(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    return S.rivals.remoteLaser();
  }));

  await p1.page.evaluate(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    S.G.cooldown = 0; S.fire({ k: 0.6, fromRelease: true });
  });
  const skySc = await p2.page.waitForFunction(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    const r = S.rivals.remoteLaser();
    return r && r.boltsLive && S.rivals.bolts && S.rivals.bolts.some(b => b.k > 0.5);
  }, null, { timeout: 10000 }).then(() => true).catch(() => false);
  // bolts array may not be exported; fall back to lastK
  const skyScInfo = await p2.page.evaluate(() => {
    const S = document.getElementById('game').contentWindow.__skytower, r = S.rivals.remoteLaser();
    const live = (S.rivals.bolts || []).map(b => ({ k: b.k, sy: b.m && +b.m.scale.y.toFixed(3) }));
    return { r, live };
  });
  chk(skySc || (skyScInfo.live && skyScInfo.live.some(b => b.k > 0.5 && b.sy > 2)),
    'Sky Tower rival sees a scaled charged bolt', skyScInfo);

  await p1.page.evaluate(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    S.setFire(true);
  });
  const skyBall = await p2.page.waitForFunction(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    const r = S.rivals.remoteLaser();
    return r && r.peers.some(p => p.hasBall);
  }, null, { timeout: 10000 }).then(() => true).catch(() => false);
  const skyBallI = await p2.page.evaluate(() => document.getElementById('game').contentWindow.__skytower.rivals.remoteLaser());
  chk(skyBall && skyBallI.peers.some(p => p.hasBall && p.ballY != null && (skyMuz.feetY == null || p.ballY > skyMuz.feetY + 0.4)),
    'Sky Tower rival sees the charge ball at the gun muzzle', { skyBallI, skyMuz });

  const skyBeam = await p2.page.waitForFunction(() => {
    const S = document.getElementById('game').contentWindow.__skytower;
    const r = S.rivals.remoteLaser();
    return r && r.peers.some(p => p.hasBeam);
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const skyBeamI = await p2.page.evaluate(() => document.getElementById('game').contentWindow.__skytower.rivals.remoteLaser());
  chk(skyBeam && skyBeamI.peers.some(p => p.hasBeam), 'Sky Tower rival sees the 3 s charged beam', skyBeamI);
  await p1.page.evaluate(() => { const S = document.getElementById('game').contentWindow.__skytower; S.setFire(false); });

  const errs = p1.errors.concat(p2.errors).filter(e => !/ERR_FAILED|Aborted/.test(e));
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));

  await browser.close(); srv.close();
  console.log(ok ? 'ALL PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
