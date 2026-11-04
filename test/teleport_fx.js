// t233 teleporter upgrade: WARP TO menu (SHOP / ROOM 2 / LAVA ISLAND) on the room-1 pad, 1 s charge-up (pad rings light one by one),
// swirling light column + sparkles, safe arrival on the lava island (lava floor) and in room 2, remote fxAt hook. node test/teleport_fx.js
const { open } = require('./lib');
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open({ phone: true, w: 412, h: 860 }); const { page, errors } = o; const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; A.setFloor && A.setFloor('lava'); window.__noAdapt = 1; A.monkey.position.set(P.x + 0.6, 0, P.z + 0.6); A.st.vel.set(0, 0, 0); A.st.face = 0.7; A.st.yaw = 0.7 + Math.PI + 0.3; A.st.pitch = 0.3; A.st.dist = 4.5; A.st.camInit = false; });
  await page.waitForFunction(() => document.querySelector('#tpMenu.on') && document.querySelector('#tpBtn.on'), null, { timeout: 20000 });
  const m = await ev(() => ({ b: [...document.querySelectorAll('#tpMenu button')].map(b => b.textContent), s: document.getElementById('tpBtn').textContent, ov: (() => { const a = document.getElementById('tpMenu').getBoundingClientRect(), b = document.getElementById('tpBtn').getBoundingClientRect(); return a.bottom <= b.top + 1; })() }));
  chk(m.s === 'SHOP' && m.b.includes('ROOM 2') && m.b.includes('LAVA ISLAND') && m.ov, 'WARP TO menu: SHOP / ROOM 2 / LAVA ISLAND, stacked above SHOP ' + JSON.stringify(m));
  chk(await ev(() => window.__tp.pads[0].charge.every(r => !r.visible)), 'pad looks unchanged at rest (charge rings hidden)');
  await page.screenshot({ path: 'shots/tp_menu_phone.png' });
  const [x, y] = await ev(() => { const b = document.querySelector('#tpMenu button[data-d="island"]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  await ev(() => { window.__tpTimeScale = 1; }); await page.touchscreen.tap(x, y);
  chk(await ev(() => window.__tp.locked && window.__tp.dest === 'island' && !document.querySelector('#tpMenu.on')), 'tapping LAVA ISLAND starts the warp, menu hides');
  await page.waitForFunction(() => window.__tp.state === 'charge' && window.__tp.t > 0.5, null, { timeout: 30000 });
  await ev(() => { window.__tpTimeScale = 0.001; }); await page.waitForTimeout(400);
  const c = await ev(() => { const t = window.__tp; return { lit: t.pads[0].charge.filter(r => r.visible).length, tt: t.t }; });
  chk(c.lit >= 2 && c.lit < 5, 'charge-up: rings light one by one (' + c.lit + ' of 5 at t=' + c.tt.toFixed(2) + ')');
  await ev(() => { window.__tpTimeScale = 1; }); await page.waitForFunction(() => window.__tp.state === 'demat' && window.__tp.t > 0.6, null, { timeout: 30000 });
  await ev(() => { window.__tpTimeScale = 0.001; }); await page.waitForTimeout(400);
  chk(await ev(() => window.__tp.pads[0].charge.every(r => r.visible)), 'all 5 rings lit while dissolving');
  await page.screenshot({ path: 'shots/tp_warp_phone.png' });
  await ev(() => { window.__tpTimeScale = 3; });
  await page.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 60000 }); await page.waitForTimeout(1500);
  const s = await ev(() => { const A = window.__arcade, t = window.__tp; return { x: A.monkey.position.x, z: A.monkey.position.z, where: t.where, fall: !!A.st.lavaFall, falls: A.st.lavaFalls || 0 }; });
  chk(Math.abs(s.x - -3.25) < 0.05 && Math.abs(s.z - 4.5) < 0.05 && s.where === 1 && !s.fall && !s.falls, 'arrives safely on the lava island, no lava fall ' + JSON.stringify(s));
  chk(await ev(() => window.__tp.pads.every(p => p.charge.every(r => !r.visible))), 'charge rings off again after the warp');
  await page.screenshot({ path: 'shots/tp_island_phone.png' });
  // room 2
  await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; A.setFloor && A.setFloor('neon'); A.monkey.position.set(P.x, 0, P.z); window.__tpTimeScale = 4; window.__tp.go('room2'); });
  await page.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 60000 }); await page.waitForTimeout(600);
  const r = await ev(() => { const A = window.__arcade, t = window.__tp; for (let i = 0; i < 10; i++) A.step(1 / 60); return { x: A.monkey.position.x, z: A.monkey.position.z, ex: t.ROOM2.x, ez: t.ROOM2.z, where: t.where }; });
  chk(Math.hypot(r.x - r.ex, r.z - r.ez) < 0.1 && r.where === 1, 'ROOM 2 warp lands in room 2 ' + JSON.stringify(r));
  // remote beam hook (mp.js) works anywhere
  chk(await ev(() => { window.__tp.fxAt(0, 2, true); return true; }), 'fxAt (other players beaming) runs');
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
