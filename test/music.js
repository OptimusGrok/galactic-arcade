// Room 1 music (Neon Nights): starts after START, gapless loop points, fades in the hallway / room 2, ducks in a cabinet, MUSIC off works,
// fades out on the start screen. Also: the Viking ticket chip sits tight under the gold ticket. node test/music.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const supa = r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  const o = await open(PH ? { phone: true, start: true, w: 412, h: 860, supa } : { start: true, w: 1280, h: 720, supa }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const ev = (f, a) => page.evaluate(f, a);
  const tapEl = async sel => { const b = await page.locator(sel).boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(400); };
  const M = () => ev(() => { const m = window.__music; return { loaded: m.loaded, on: m.on, target: +m.target.toFixed(3), gain: +m.gain.toFixed(3), ls: m.loopStart, le: m.loopEnd, len: m.len, src: m.src, pos: m.pos(), err: m.err }; });
  const at = z => ev(z => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.monkey.position.set(0, 0, z); }, z);
  await page.waitForTimeout(1000);
  await ev(() => { localStorage.setItem('neonarcade.vikingTickets', '2'); localStorage.setItem('neonarcade.tickets', '7'); });
  let m = await M(); chk(!m.loaded && m.target === 0, 'silent on the start screen before START');
  await tapEl('#stStart'); await page.waitForFunction(() => window.__music.loaded || window.__music.err, null, { timeout: 20000 }).catch(() => {});
  await ev(() => window.__neonSync && window.__neonSync()); await at(4); await page.waitForTimeout(2500); m = await M();
  chk(m.loaded && m.target > 0.3 && m.gain > 0.15, 'music starts after START in room 1 ' + JSON.stringify(m));
  chk(Math.abs(m.le - m.ls - 3225600 / 44100) < 1e-6 && m.len >= 3225600 * 0.99, 'exact 32-bar loop points ' + (m.le - m.ls).toFixed(6) + ' s, decoded ' + m.len + ' samples, ' + m.src);
  // loop wraps: jump the context clock offset so position passes the loop end
  await ev(() => { window.__music.t0 -= 72.5; }); await page.waitForTimeout(1200); m = await M(); chk(m.pos < 5 && m.target > 0.3, 'position wraps past the loop end (pos ' + m.pos.toFixed(2) + ' s)');
  await at(-16); await page.waitForTimeout(1500); m = await M(); chk(m.target === 0 && m.gain < 0.1, 'fades out down the hallway ' + JSON.stringify([m.target, m.gain]));
  await at(-30); await page.waitForTimeout(500); m = await M(); chk(m.target === 0, 'room 2 silent');
  await at(4); await page.waitForTimeout(2000); m = await M(); chk(m.target > 0.3 && m.gain > 0.15, 'back up on return to room 1');
  // Viking chip tight under the gold ticket
  const vx = async () => ev(() => { const a = document.getElementById('tix').getBoundingClientRect(), b = document.getElementById('vix').getBoundingClientRect(); return { dx: b.left - a.left, gap: b.top - a.bottom, w: b.width - a.width, shown: b.width > 0 }; });
  let v = await vx(); chk(v.shown && Math.abs(v.dx) < 1 && v.gap >= 2 && v.gap <= 6 && v.w >= -1, 'Viking ticket directly under the gold ticket (room) ' + JSON.stringify(v));
  await page.screenshot({ path: `shots/hud_tickets${sfx}.png`, clip: { x: 0, y: 0, width: 220, height: 120 } });
  // cabinet: music ducks
  await ev(() => { const A = window.__arcade, c = A.playables.find(k => k.name === 'ghostCabinet'), u = c.userData; window.__noAdapt = 1; A.st.fp = false; A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; });
  await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(300);
  if (PH) await tapEl('#bPlay'); else await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__arcade.play.mode === 'game', null, { timeout: 30000 }); await page.waitForTimeout(1500); m = await M();
  chk(m.target === 0 && m.gain < 0.1, 'ducked while zoomed into a cabinet ' + JSON.stringify([m.target, m.gain]));
  v = await vx(); chk(Math.abs(v.dx) < 1 && v.gap >= 2 && v.gap <= 6, 'Viking ticket under the gold ticket in the cabinet view ' + JSON.stringify(v));
  await page.screenshot({ path: `shots/hud_tickets_cab${sfx}.png` });
  await tapEl('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 15000 }).catch(() => {}); await at(4); await page.waitForTimeout(2000);
  m = await M(); chk(m.target > 0.3, 'resumes after leaving the cabinet');
  // home -> start screen fades out; MUSIC off in Options
  await tapEl('#bHome'); await tapEl('#homeYes'); await page.waitForTimeout(1500); m = await M(); chk(m.target === 0 && m.gain < 0.15, 'start screen fades it out');
  await tapEl('#stOpt'); await tapEl('#musBtn'); m = await M();
  chk(!m.on && (await ev(() => localStorage.getItem('neonarcade.music'))) === '0' && (await ev(() => document.getElementById('musSt').textContent)) === 'OFF', 'Options MUSIC: OFF saved');
  await page.screenshot({ path: `shots/options_music${sfx}.png` });
  await tapEl('#optBack'); await tapEl('#stStart'); await page.waitForTimeout(1500); m = await M(); chk(m.target === 0, 'MUSIC off keeps room 1 silent');
  await ev(() => window.__music.setOn(true)); await page.waitForTimeout(1500); m = await M(); chk(m.target > 0.3, 'MUSIC on again plays');
  await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(300); m = await M(); chk(m.target === 0, 'hidden tab: silent');
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
