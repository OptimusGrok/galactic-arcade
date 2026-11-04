// teleporter fx (t233) after t236 (shop and back only, no WARP TO menu): 1 s charge-up rings, light column + sparkles, free,
// go('room2') still goes to the SHOP, remote fxAt hook, no doorway shield. node test/teleport_fx.js
const { open } = require('./lib');
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open({ phone: true, w: 412, h: 860 }); const { page, errors } = o; const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; window.__noAdapt = 1; A.monkey.position.set(P.x + 0.6, 0, P.z + 0.6); A.st.vel.set(0, 0, 0); A.st.face = 0.7; A.st.yaw = 0.7 + Math.PI + 0.3; A.st.pitch = 0.3; A.st.dist = 4.5; A.st.camInit = false; });
  await page.waitForFunction(() => document.querySelector('#tpBtn.on'), null, { timeout: 20000 }); await page.waitForTimeout(800);
  chk(await ev(() => !document.getElementById('tpMenu') && document.getElementById('tpBtn').textContent === 'SHOP'), 'only the SHOP button on the pad, no WARP TO menu');
  chk(await ev(() => window.__tp.pads[0].charge.every(r => !r.visible)), 'pad looks unchanged at rest (charge rings hidden)');
  chk(await ev(() => { const s = window.__arcade.shield; return !s || (s.open && !s.group.visible && !s.pop.classList.contains('on')); }), 'doorway energy shield gone (open, invisible, no ticket pop-up)');
  await page.screenshot({ path: 'shots/tp_simple_phone.png' });
  const t0 = await ev(() => window.__arcade.play.tickets.total);
  const [x, y] = await ev(() => { const b = document.getElementById('tpBtn').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  await ev(() => { window.__tpTimeScale = 1; }); await page.touchscreen.tap(x, y);
  chk(await ev(() => window.__tp.locked && window.__tp.dest === 'shop'), 'tapping SHOP starts the warp');
  await page.waitForFunction(() => window.__tp.state === 'charge' && window.__tp.t > 0.5, null, { timeout: 30000 });
  await ev(() => { window.__tpTimeScale = 0.001; }); await page.waitForTimeout(400);
  const c = await ev(() => window.__tp.pads[0].charge.filter(r => r.visible).length);
  chk(c >= 2 && c < 5, 'charge-up: rings light one by one (' + c + ' of 5)');
  await ev(() => { window.__tpTimeScale = 1; }); await page.waitForFunction(() => window.__tp.state === 'demat' && window.__tp.t > 0.6, null, { timeout: 30000 });
  await ev(() => { window.__tpTimeScale = 0.001; }); await page.waitForTimeout(400);
  chk(await ev(() => window.__tp.pads[0].charge.every(r => r.visible)), 'all 5 rings lit while dissolving');
  await page.screenshot({ path: 'shots/tp_warp_phone.png' });
  await ev(() => { window.__tpTimeScale = 3; });
  await page.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 60000 });
  chk(await ev(() => window.__tp.where === 2 && window.__tp.pads.every(p => p.charge.every(r => !r.visible))), 'arrives in the shop, rings off');
  await ev(() => { window.__tpTimeScale = 4; window.__tp.go('island'); });
  await page.waitForFunction(() => window.__tp.state === 'idle' && window.__tp.where === 1, null, { timeout: 60000 });
  chk(await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; return Math.hypot(A.monkey.position.x - P.x, A.monkey.position.z - P.z) < 0.05; }), 'from the shop always back to the arcade pad');
  await ev(() => { window.__tp.go('room2'); }); await page.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 60000 });
  chk(await ev(() => window.__tp.where === 2), "go('room2') still goes to the SHOP (no other destinations)");
  chk(await ev(() => window.__arcade.play.tickets.total) === t0, 'teleporting is free (tickets unchanged ' + t0 + ')');
  chk(await ev(() => { window.__tp.fxAt(0, 2, true); return true; }), 'fxAt (other players beaming) runs');
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
