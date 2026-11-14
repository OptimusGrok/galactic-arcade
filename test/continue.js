// v219: 5-ticket CONTINUE on arcade-copy lose / game-over. Resumes the same point with a fresh life.
// Blocked under 5 tickets, deducts on use. Skip claw, cyber, skytower (and golf/pool, which are not ticket cabinets).
// NOSHOTS=1 node test/continue.js
const { open } = require('./lib');
const { helpers } = require('./cabflow');

const GAMES = [
  { key: 'strike', cab: 'strikeCabinet', keep: s => s.score === 12345, fresh: s => s.lives >= 1 && s.scene === 'play' },
  { key: 'ghost', cab: 'ghostCabinet', keep: s => s.score === 12345, fresh: s => s.lives >= 1 && s.state === 'play' },
  { key: 'monkey', cab: 'monkeyCabinet', keep: s => s.score === 17, fresh: s => s.state === 'play' && !s.dead },
  { key: 'berserker', cab: 'berserkerCabinet', keep: s => s.kills === 42, fresh: s => s.lives >= 1 && (s.state === 'play' || s.state === 'intro' || s.state === 'warp') },
  { key: 'orc', cab: 'orcCabinet', keep: s => s.gold === 250 && s.kills === 18, fresh: s => s.state === 'play' && s.lives > 0 },
  { key: 'blaster', cab: 'blasterCabinet', keep: s => s.score === 12345 && s.level === 3, fresh: s => s.lives >= 1 && s.mode === 'play' },
  { key: 'pip', cab: 'pipCabinet', keep: s => s.score === 12345 && s.coins === 9, fresh: s => s.lives >= 1 && s.kind === 'level' },
  { key: 'bb', cab: 'bbCabinet', keep: s => s.score === 12345 && s.round >= 2, fresh: s => s.lives >= 1 && (s.mode === 'ready' || s.mode === 'play') },
  { key: 'rockfall', cab: 'rockfallCabinet', keep: s => s.score === 12345, fresh: s => s.lives >= 1 && s.mode === 'play' },
  { key: 'nova', cab: 'novaCabinet', keep: s => s.score === 12345, fresh: s => s.lives >= 1 && s.mode === 'play' },
  { key: 'roadster', cab: 'roadsterCabinet', keep: s => s.score === 88 && s.cpIdx >= 1, fresh: s => s.st === 'play' },
  { key: 'ds', cab: 'deadSignalStation', keep: s => s.kills === 7, fresh: s => s.state === 'play' && !s.dead && s.hp > 0 },
];
const SKIPS = [
  { key: 'claw', cab: 'clawCabinet' },
  { key: 'cyber', cab: 'cyberCabinet' },
  { key: 'skytower', cab: 'skyTowerCabinet' },
];

(async () => {
  const { page, errors, close } = await open({ w: 390, h: 844, shieldOpen: true });
  page.setDefaultTimeout(60000);
  let ok = true;
  const chk = (c, m, extra) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (extra != null ? ' ' + JSON.stringify(extra) : '')); if (!c) ok = false; };
  const H = helpers(page, false);

  const hook = `(() => { const f = document.getElementById('game'); return f && f.contentWindow && f.contentWindow.__gaContinue; })()`;
  const call = (meth) => page.evaluate((m) => {
    const w = document.getElementById('game').contentWindow;
    const C = w && w.__gaContinue;
    if (!C) return null;
    try { return C[m] ? C[m]() : null; } catch (e) { return { err: String(e) }; }
  }, meth);
  const btn = () => page.evaluate(() => {
    const b = document.getElementById('bContinue'), p = window.__arcade.play;
    const cs = b && getComputedStyle(b);
    return { on: !!(b && b.classList.contains('on')), need: !!(b && b.classList.contains('need')),
      shown: !!(b && cs && cs.display !== 'none'), text: b && b.textContent, tickets: p.tickets.total,
      toast: p.lastToast, sub: p.sub, scene: p.scene, continues: p.continues || 0, last: p.lastContinue };
  });

  const SRC = {
    strike: 'strike-play', ghost: 'ghost-play', monkey: 'monkey-play', berserker: 'berserker-play',
    orc: 'orc-play', blaster: 'blaster-play', pip: 'pip-play', bb: 'bb-play', rockfall: 'rockfall-play',
    nova: 'nova-play', roadster: 'mr-play', ds: 'ds-play', claw: 'claw-play', cyber: 'cybercity-play',
    skytower: 'sky-tower-play'
  };

  async function exitCab() {
    for (let i = 0; i < 4; i++) {
      const st = await page.evaluate(() => { const p = window.__arcade.play, f = document.getElementById('game'); return { mode: p.mode, sub: p.sub, has: !!f }; });
      if (st.mode === 'walk' && !st.has) return true;
      if (st.mode === 'game' || st.mode === 'zoomIn' || st.mode === 'prep' || st.mode === 'zoomOut' || st.mode === 'post') {
        if (st.mode === 'game' || st.mode === 'zoomIn' || st.mode === 'prep') {
          await page.evaluate(() => { try { window.__arcade.play.exit('x'); } catch (e) {} });
        }
      }
      const ok = await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 120000 }).then(() => true).catch(() => false);
      if (ok) { await page.waitForTimeout(300); return true; }
    }
    const stuck = await page.evaluate(() => { const p = window.__arcade.play, f = document.getElementById('game'); return { mode: p.mode, sub: p.sub, src: f && f.src, lastExit: p.lastExit }; });
    console.log('WARN exit stuck ' + JSON.stringify(stuck));
    return false;
  }

  async function startCab(cab, key) {
    await exitCab();
    if (cab === 'deadSignalStation') {
      await page.evaluate(() => {
        const A = window.__arcade;
        A.st.fp = false; A.st.vel.set(0, 0, 0);
        A.monkey.position.set(0.2, 0, (A.Z2 || -29) + 2.05 + 0.75);
        A.st.face = Math.PI; A.st.yaw = 0; A.st.lookT = -99; A.step(1 / 60);
      });
    } else if (cab === 'roadsterCabinet') {
      await page.evaluate(() => {
        const A = window.__arcade, c = A.roadsterCab, s = c.userData.seats.L.world, sx = Math.sign(s.x - c.position.x) || 1;
        A.st.fp = false; A.st.vel.set(0, 0, 0);
        A.monkey.position.set(c.position.x + sx * 2.95, 0, s.z);
        A.st.face = sx > 0 ? -Math.PI / 2 : Math.PI / 2; A.st.yaw = A.st.face; A.st.lookT = -99;
      });
    } else {
      await H.goTo(cab);
    }

    const want = SRC[key];
    let last = {};
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.waitForFunction(c => window.__arcade.play.mode === 'walk' && window.__arcade.play.near() === c && document.getElementById('playUI').classList.contains('on'), cab, { timeout: 20000 }).catch(() => {});
      const ui = await H.ui();
      if (!ui.on || ui.near !== cab) {
        last = { err: 'no prompt', ui, attempt };
        if (cab === 'deadSignalStation' || cab === 'roadsterCabinet') {
          // re-place and try again
          if (cab === 'deadSignalStation') await page.evaluate(() => {
            const A = window.__arcade; A.st.fp = false; A.st.vel.set(0, 0, 0);
            A.monkey.position.set(0.2, 0, (A.Z2 || -29) + 2.05 + 0.75);
            A.st.face = Math.PI; A.st.yaw = 0; A.st.lookT = -99; A.step(1 / 60);
          });
          else await page.evaluate(() => {
            const A = window.__arcade, c = A.roadsterCab, s = c.userData.seats.L.world, sx = Math.sign(s.x - c.position.x) || 1;
            A.st.fp = false; A.st.vel.set(0, 0, 0);
            A.monkey.position.set(c.position.x + sx * 2.95, 0, s.z);
            A.st.face = sx > 0 ? -Math.PI / 2 : Math.PI / 2; A.st.yaw = A.st.face; A.st.lookT = -99;
          });
        } else {
          await H.goTo(cab);
        }
        await page.waitForTimeout(400);
        continue;
      }
      await H.press();
      const zoomed = await page.waitForFunction((w) => {
        const p = window.__arcade.play, f = document.getElementById('game');
        return p.mode === 'game' && p.sub === 'demo' && f && f.classList.contains('on') && f.src && f.src.includes(w);
      }, want, { timeout: 40000 }).then(() => true).catch(() => false);
      if (!zoomed) {
        last = { err: 'zoom', attempt, mode: await page.evaluate(() => ({ m: window.__arcade.play.mode, s: window.__arcade.play.sub, near: window.__arcade.play.near(), src: (document.getElementById('game') || {}).src })) };
        console.log('WARN startCab zoom ' + key + ' ' + JSON.stringify(last));
        await exitCab();
        if (cab === 'deadSignalStation' || cab === 'roadsterCabinet') {
          if (cab === 'deadSignalStation') await page.evaluate(() => {
            const A = window.__arcade; A.st.fp = false; A.st.vel.set(0, 0, 0);
            A.monkey.position.set(0.2, 0, (A.Z2 || -29) + 2.05 + 0.75);
            A.st.face = Math.PI; A.st.yaw = 0; A.st.lookT = -99; A.step(1 / 60);
          });
          else await page.evaluate(() => {
            const A = window.__arcade, c = A.roadsterCab, s = c.userData.seats.L.world, sx = Math.sign(s.x - c.position.x) || 1;
            A.st.fp = false; A.st.vel.set(0, 0, 0);
            A.monkey.position.set(c.position.x + sx * 2.95, 0, s.z);
            A.st.face = sx > 0 ? -Math.PI / 2 : Math.PI / 2; A.st.yaw = A.st.face; A.st.lookT = -99;
          });
        } else await H.goTo(cab);
        continue;
      }
      await page.waitForTimeout(800);
      await page.evaluate(k => {
        const p = window.__arcade.play, m = p.machines[k];
        p.tickets.total = 20; try { localStorage.setItem('neonarcade.tickets', '20'); } catch (e) {}
        if (m) m.credits = 1;
      }, key);
      await page.evaluate(() => window.__arcade.play.tryPlay());
      const playing = await page.waitForFunction((w) => {
        const p = window.__arcade.play, f = document.getElementById('game');
        try { return p.sub === 'play' && f && f.src && f.src.includes(w) && f.contentWindow && f.contentWindow.document && f.contentWindow.document.readyState === 'complete'; } catch (e) { return false; }
      }, want, { timeout: 20000 }).then(() => true).catch(() => false);
      const src = await page.evaluate(() => { const f = document.getElementById('game'); return f && f.src; });
      const sub = await page.evaluate(() => window.__arcade.play.sub);
      if (playing && src && src.includes(want)) return { sub, src, attempt };
      last = { err: 'tryPlay', attempt, sub, src };
      console.log('WARN startCab tryPlay ' + key + ' ' + JSON.stringify(last));
      await exitCab();
      await H.goTo(cab).catch(() => {});
    }
    return last.err ? last : { err: 'start failed', last };
  }


  chk(await page.evaluate(() => !!document.getElementById('bContinue')), 'parent has a CONTINUE (5 tickets) button');
  chk(await page.evaluate(() => window.__arcade.play.continueCost === 5), 'CONTINUE costs 5 tickets');

  for (const g of GAMES) {
    const st = await startCab(g.cab, g.key);
    chk(st.sub === 'play' && st.src && st.src.includes('-play'), g.key + ': credited game is running', st);
    const has = await page.evaluate(() => !!(document.getElementById('game') && document.getElementById('game').contentWindow.__gaContinue));
    chk(has, g.key + ': arcade copy exposes __gaContinue');
    const forced = await call('force');
    chk(forced === true || (forced && forced !== false && !forced.err), g.key + ': forced a lose / game-over', forced);
    const marked = await call('mark');
    chk(marked && !marked.err, g.key + ': marked progress', marked);
    await page.waitForFunction(() => {
      const b = document.getElementById('bContinue'), p = window.__arcade.play;
      return p.sub === 'play' && b && b.classList.contains('on');
    }, null, { timeout: 8000 }).catch(() => {});
    let b = await btn();
    chk(b.on && /CONTINUE/i.test(b.text || '') && /5 TICKETS/i.test(b.text || ''), g.key + ': CONTINUE (5 tickets) is shown on lose', b);

    await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 4; try { localStorage.setItem('neonarcade.tickets', '4'); } catch (e) {} p.lastToast = ''; });
    await page.waitForTimeout(250);
    const blocked = await page.evaluate(() => window.__arcade.play.tryContinue());
    b = await btn();
    chk(blocked === false && b.tickets === 4 && /NEED 5 TICKETS/.test(b.toast || ''), g.key + ': blocked under 5 tickets, nothing deducted', { blocked, b });

    await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 12; try { localStorage.setItem('neonarcade.tickets', '12'); } catch (e) {} p.lastToast = ''; });
    await page.waitForTimeout(200);
    const used = await page.evaluate(() => window.__arcade.play.tryContinue());
    b = await btn();
    const after = await call('snap');
    chk(used === true && b.tickets === 7, g.key + ': 12 tickets -> deduct 5, leave 7', { used, b, after });
    chk(b.on === false, g.key + ': button hides after a successful continue', b);
    chk(after && g.keep(after), g.key + ': same point (score / progress kept)', after);
    chk(after && g.fresh(after), g.key + ': resumed with a fresh life', after);
    chk(b.last === g.key && b.continues >= 1 && b.sub === 'play', g.key + ': still in the same credited game', b);

    await exitCab();
  }

  // skip: no CONTINUE on claw / cyber / skytower
  for (const g of SKIPS) {
    const st = await startCab(g.cab, g.key);
    chk(st.sub === 'play' || st.err === 'no prompt', g.key + ': opened (skip target)', st);
    const has = await page.evaluate(() => !!(document.getElementById('game') && document.getElementById('game').contentWindow && document.getElementById('game').contentWindow.__gaContinue));
    chk(!has, g.key + ': no __gaContinue hook');
    await page.waitForTimeout(400);
    const b = await btn();
    chk(!b.on, g.key + ': CONTINUE button stays hidden', b);
    await exitCab();
  }

  chk(!(await page.evaluate(() => { const M = window.__arcade.play.machines; return !!(M.claw && M.claw.cont) || !!(M.cyber && M.cyber.cont) || !!(M.skytower && M.skytower.cont); })), 'claw, cyber and skytower are not flagged for CONTINUE');
  chk(await page.evaluate(() => !window.__arcade.play.machines.golf && !window.__arcade.play.machines.pool), 'golf and pool are not ticket cabinets');

  const real = errors.filter(e => !/Failed to load resource|net::ERR_FAILED|net::ERR_ABORTED|Error: net::ERR/i.test(e));
  chk(real.length === 0, 'no page errors ' + real.join(' | '));
  await close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message + '\n' + e.stack); process.exit(1); });
