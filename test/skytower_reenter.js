// t762u: Dave — "on the second time I entered Sky Tower the player froze". Enter SKY TOWER from the arcade, start a
// climb, leave with the close X, enter again with a fresh credit: the player must still move (keyboard + joystick),
// fly and fire on EVERY entry. Monkey + alien, face voice on + muted. Real time (rAF), 844x390.
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')); if (!c) ok = false; };
const ROUNDS = +(process.env.REENTER_ROUNDS || 3);
(async () => {
  for (const [ch, mute] of [['monkey', false], ['alien', true]]) {
    const o = await open({ phone: true, w: 844, h: 390 }), page = o.page; page.setDefaultTimeout(60000);
    await page.evaluate(([ch, mute]) => { localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', char: ch, hat: 'none', glasses: 'none', back: 'none', hand: 'none' }));
      localStorage.setItem('neonarcade.mute', mute ? '1' : '0'); }, [ch, mute]);
    await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.play && window.__arcade.play.machines.skytower, null, { timeout: 120000 });
    await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });
    for (let round = 1; round <= ROUNDS; round++) {
      const tag = ch + (mute ? ' (muted)' : ' (voice on)') + ' entry ' + round;
      await page.evaluate(() => { const P = window.__arcade.play; P.start(P.machines.skytower); });
      const inDemo = await page.waitForFunction(() => { const P = window.__arcade.play; return P.mode === 'game' && P.sub === 'demo' && document.getElementById('bExit').style.display === 'block'; }, null, { timeout: 60000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(1200);
      await page.evaluate(() => { const P = window.__arcade.play; P.machines.skytower.credits = 1; P.tryPlay(); });
      const started = await page.waitForFunction(() => { try { const w = document.getElementById('game').contentWindow; return w.__skytower.active(); } catch (e) { return false; } }, null, { timeout: 20000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(1500);
      const snap = () => page.evaluate(() => { const P = window.__arcade.play, f = document.getElementById('game'), w = f && f.contentWindow, A = w && w.__skytower, G = A && A.G;
        if (!A || !A.player) return { noGame: true, mode: P.mode, sub: P.sub };
        const p = A.player.position; return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3), shots: (A.SHOT && A.SHOT.n) || 0, lasers: A.lasers.length, mode: G.mode, run: G.run, hold: G.hold, over: G.over, won: G.won, demo: !!w.__DEMO, scene: A.scene(), sub: P.sub, arcade: P.mode,
          energy: +G.energy.toFixed(2), joy: G.joy.on, focus: document.activeElement && document.activeElement.id, frames: w.__frames || 0 }; });
      const d = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
      // keyboard: walk forward
      const s0 = await snap(); await page.keyboard.down('KeyW'); await page.waitForTimeout(1000); await page.keyboard.up('KeyW'); const s1 = await snap();
      // joystick (pointer drag on the left half)
      await page.mouse.move(110, 300); await page.mouse.down(); await page.mouse.move(110, 250, { steps: 4 }); await page.waitForTimeout(900); const s2 = await snap();
      // the page / Grok's WATCH view taking focus mid-drag must not kill the joystick (the finger is still down)
      await page.evaluate(() => { window.focus(); document.getElementById('game').contentWindow.dispatchEvent(new Event('blur')); }); await page.waitForTimeout(1200); const s2b = await snap();
      await page.mouse.up(); await page.evaluate(() => { const f = document.getElementById('game'); f.focus(); f.contentWindow.focus(); }); await page.waitForTimeout(200);
      // fly: hold Space
      const s3 = await snap(); await page.keyboard.down('Space'); await page.waitForTimeout(700); const s4 = await snap(); await page.keyboard.up('Space');
      // fire
      const f0 = await page.evaluate(() => { const A = document.getElementById('game').contentWindow.__skytower; A.G.cooldown = 0; return A.lasers.length; });
      await page.keyboard.down('KeyF'); await page.waitForTimeout(120); const f1 = await page.evaluate(() => document.getElementById('game').contentWindow.__skytower.lasers.length); await page.keyboard.up('KeyF');
      chk(inDemo && started, tag + ': entered, a credit started a real climb', { inDemo, started, s0 });
      chk(d(s0, s1) > 0.5, tag + ': keyboard W walks the player', { moved: +d(s0, s1).toFixed(2), s0, s1 });
      chk(d(s1, s2) > 0.5, tag + ': joystick drag moves the player', { moved: +d(s1, s2).toFixed(2), s2 });
      chk(s2b.joy && d(s2, s2b) > 4, tag + ': joystick keeps moving the player after a focus change mid-drag', { moved: +d(s2, s2b).toFixed(2), joy: s2b.joy });
      chk(s4.y - s3.y > 0.3, tag + ': FLY (Space) lifts the player', { dy: +(s4.y - s3.y).toFixed(2) });
      chk(f1 > f0, tag + ': FIRE shoots', { f0, f1 });
      // leave with the X
      await page.evaluate(() => { window.__prevGame = document.getElementById('game').contentWindow; });
      const X = await page.locator('#bExit').boundingBox(); await page.touchscreen.tap(X.x + X.width / 2, X.y + X.height / 2);
      const rel = await page.evaluate(() => { try { const w = window.__prevGame; return Object.assign({ released: w.__gaReleased || 0 }, w.__gaRes()); } catch (e) { return { err: e.message }; } });
      chk(rel.released >= 1 && rel.gl >= 1 && rel.glLost === rel.gl && rel.acOpen === 0, tag + ': closing frees the game (WebGL contexts lost, audio closed) right away', rel);
      const out = await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).then(() => true).catch(() => false);
      chk(out, tag + ': close X back to the room', await page.evaluate(() => window.__arcade.play.mode));
      if (!out) break;
      await page.waitForTimeout(800);
    }
    const errs = o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase|reading 'isReady'/i.test(e));
    chk(errs.length === 0, ch + ': no page errors', errs.slice(0, 4));
    await o.close();
  }
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
