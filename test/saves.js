// In-game OPTIONS (after the player.js start screen: name + PLAY): monkey button, 5 save slots (save, overwrite confirm, load restores, delete), greyed in a game, MUTE silences, back to title. node test/saves.js [phone]
const { open, play } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const o = await open(PH ? { phone: true, start: true, w: 412, h: 860, supa } : { start: true, w: 1280, h: 720, supa }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const ev = (f, a) => page.evaluate(f, a);
  const tapEl = async sel => { const b = await page.locator(sel).first().boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(350); };
  const S = () => ev(() => { const A = window.__arcade, P = A.play, k = window.__kiosk; return { open: window.__opts.open, q: window.__opts.q, t: P.tickets.total, v: P.viking.total, bal: k.C.bal, pend: k.pending, gc: P.machines.ghost.credits, sh: A.shield.open, floor: A.floor, mus: window.__music.on, z: +A.monkey.position.z.toFixed(2), x: +A.monkey.position.x.toFixed(2), slots: [...document.querySelectorAll('.opSs')].map(e => e.textContent), mute: window.__mute.on }; });
  await page.waitForTimeout(1200);
  await ev(() => { for (let i = 1; i <= 5; i++) localStorage.removeItem('neonarcade.save.' + i); localStorage.setItem('neonarcade.tickets', '42'); localStorage.setItem('neonarcade.vikingTickets', '3'); window.__neonSync(); window.__arcade.setFloor('carpet'); });
  await play(page, PH, 'Astro'); await page.waitForTimeout(800);
  const hb = await ev(() => { const r = document.getElementById('bOpt').getBoundingClientRect(), f = document.getElementById('bFs').getBoundingClientRect(), c = document.querySelector('#bOpt canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let pink = 0, brown = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 200 && d[i + 1] < 110 && d[i + 2] > 120) pink++; if (d[i] > 70 && d[i] < 110 && d[i + 1] > 35 && d[i + 1] < 60 && d[i + 2] < 40) brown++; } return { nextTo: Math.abs(r.top - f.top) < 2 && r.left > f.left && Math.abs(r.width - f.width) < 2, home: !!document.getElementById('bHome'), pink, brown }; });
  chk(hb.nextTo && !hb.home && hb.pink > 50 && hb.brown > 50, 'HUD: ⌂ replaced by the monkey-face OPTIONS button (same size, pink cap + brown fur) ' + JSON.stringify(hb));
  await page.screenshot({ path: `shots/opts_hud${sfx}.png`, clip: { x: (PH ? 412 : 1280) - 180, y: 0, width: 180, height: 90 } });
  await tapEl('#bOpt'); let s = await S(); chk(s.open && s.slots.length === 5 && s.slots.every(x => x === 'EMPTY'), 'panel opens with 5 EMPTY slots');
  await page.screenshot({ path: `shots/opts_panel${sfx}.png` });
  await page.keyboard.press('KeyW'); s = await S(); chk(s.open, 'keys do not leak to the arcade while open');
  // state A -> slot 1
  await ev(() => { const A = window.__arcade; A.monkey.position.set(2, 0, 6); A.st.face = 1; window.__kiosk.setState({ bal: 3, at: Date.now() - 6e5, pending: 10 }); A.play.machines.ghost.credits = 2; });
  await tapEl('.opSl:nth-child(1) .sv'); s = await S(); chk(/🎟42 · ⚔3 · \$3 · ROOM 1/.test(s.slots[0]) && !s.q, 'SAVE slot 1 (no confirm when empty): ' + s.slots[0]);
  // change everything
  await ev(() => { const A = window.__arcade; localStorage.setItem('neonarcade.tickets', '7'); localStorage.setItem('neonarcade.vikingTickets', '0'); window.__neonSync(); A.play.viking.total = 0; A.monkey.position.set(-3, 0, -2); window.__kiosk.setState({ bal: 5, at: Date.now(), pending: 0 }); A.play.machines.ghost.credits = 0; A.shield.setOpen(true); A.setFloor('neon'); window.__music.setOn(false); });
  await tapEl('.opSl:nth-child(2) .sv'); s = await S(); chk(/🎟7 · ⚔0 · \$5/.test(s.slots[1]), 'SAVE slot 2 with the changed state');
  await tapEl('.opSl:nth-child(2) .sv'); s = await S(); chk(/OVERWRITE SLOT 2/.test(s.q || ''), 'overwrite asks to confirm'); await tapEl('#opNo'); chk(!(await S()).q, 'NO cancels');
  for (const i of [3, 4]) await tapEl(`.opSl:nth-child(${i}) .sv`);
  s = await S(); chk(s.slots.filter(x => x !== 'EMPTY').length === 4 && s.slots[4] === 'EMPTY', '4 slots filled, slot 5 empty');
  await page.screenshot({ path: `shots/opts_slots${sfx}.png` });
  await ev(() => { localStorage.setItem('neonarcade.prizes', '{"grok":1}'); window.__shop && window.__shop.hold('grok'); });
  await tapEl('.opSl:nth-child(1) .ld'); s = await S(); chk(/LOAD SLOT 1/.test(s.q || ''), 'load asks to confirm'); await tapEl('#opYes'); await page.waitForTimeout(300);
  s = await S(); chk(s.t === 42 && s.v === 3 && s.bal === 3 && s.pend === 10 && s.gc === 2 && !s.sh && s.floor === 'carpet' && s.mus && s.x === 2 && s.z === 6, 'LOAD slot 1 restores tickets, Viking, cash, kiosk tickets, credits, shield, floor, music, position ' + JSON.stringify(s));
  chk((await ev(() => [localStorage.getItem('neonarcade.tickets'), localStorage.getItem('neonarcade.shieldOpen'), localStorage.getItem('neonarcade.music')])).join() === '42,0,1', 'restored values saved to storage');
  const pz = await ev(() => [localStorage.getItem('neonarcade.prizes'), window.__shop && window.__shop.held]); chk(!pz[0] && !pz[1], 'LOAD of a slot with no prizes clears unsaved prizes + held plush ' + JSON.stringify(pz));
  await tapEl('.opSl:nth-child(4) .dl'); await tapEl('#opYes'); s = await S(); chk(s.slots[3] === 'EMPTY', 'DELETE empties slot 4');
  // mute
  await tapEl('#opMute'); s = await S(); const g = await ev(() => window.__mute.gains.map(x => x.gain.value)); chk(s.mute && g.every(v => v === 0), 'MUTE on: every audio master gain at 0 ' + JSON.stringify(g));
  await page.keyboard.press('Escape'); s = await S(); chk(!s.open, 'Esc closes the panel');
  // in a cabinet game: save/load greyed, mute reaches the game iframe
  await ev(() => { const A = window.__arcade, c = A.playables.find(k => k.name === 'ghostCabinet'), u = c.userData; window.__noAdapt = 1; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; });
  await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(400);
  if (PH) await tapEl('#bPlay'); else await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__arcade.play.mode === 'game' && window.__arcade.play.sub === 'demo', null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500);
  const fr = await ev(() => { const f = document.getElementById('game'); return { hooked: !!(f && f.contentWindow.__muteHooked) }; });
  await tapEl('#bOpt'); const gs = await ev(() => ({ note: document.getElementById('opNote').textContent, sv: [...document.querySelectorAll('.opSl .sv')].every(b => b.disabled), ld: [...document.querySelectorAll('.opSl .ld')].every(b => b.disabled) }));
  chk(/EXIT THE GAME/.test(gs.note) && gs.sv && gs.ld, 'in a cabinet: save/load greyed with the note');
  chk(fr.hooked, 'cabinet game iframe audio goes through the mute');
  await page.screenshot({ path: `shots/opts_ingame${sfx}.png` });
  await tapEl('#opMute'); chk(!(await S()).mute, 'MUTE off again'); 
  await tapEl('#opTitle'); chk(await ev(() => document.getElementById('homeQ').classList.contains('on')), 'BACK TO TITLE SCREEN opens the confirm');
  await tapEl('#homeYes'); await page.waitForFunction(() => !!document.getElementById('start') && window.__arcade.play.mode === 'walk', null, { timeout: 40000 }).catch(() => {});
  await page.waitForFunction(() => !document.getElementById('game'), null, { timeout: 5000 }).catch(() => {});   // iframe is removed 0.5 s after the fade
  const ti = await ev(() => ({ st: !!document.getElementById('start'), game: !!document.getElementById('game'), mode: window.__arcade.play.mode, sh: window.__start.shown, dis: window.__start.dismissed }));
  chk(ti.st && ti.sh && !ti.dis && !ti.game, 'YES: back on the title screen ' + JSON.stringify(ti));
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
