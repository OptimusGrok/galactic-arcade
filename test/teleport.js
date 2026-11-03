// teleporter: SHOP button near the pad only, sequence to the white room, ARCADE back. node test/teleport.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open(PH ? { phone: true, w: 412, h: 860 } : { w: 1280, h: 720 }); const { page, errors } = o;
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => window.__tp && window.__arcade, null, { timeout: 20000 }); await page.waitForTimeout(1500);
  const btnOn = () => ev(() => !!document.querySelector('#tpBtn.on'));
  await ev(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 3); A.st.vel.set(0, 0, 0); }); await page.waitForTimeout(600);
  chk(!(await btnOn()), 'no SHOP button away from the pad');
  await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; A.monkey.position.set(P.x + 0.7, 0, P.z + 0.7); A.st.vel.set(0, 0, 0); A.st.face = Math.PI * 0.25; A.st.yaw = Math.PI * 0.25 + 0.35; A.st.pitch = 0.25; A.st.camInit = false; window.__noAdapt = 1; window.__tpTimeScale = 3; });
  await page.waitForTimeout(1200);
  chk(await btnOn() && await ev(() => document.getElementById('tpBtn').textContent === 'SHOP'), 'SHOP button appears near the pad');
  await page.screenshot({ path: `shots/tp_pad${sfx}.png` });
  const r = await ev(() => { const b = document.getElementById('tpBtn').getBoundingClientRect(), p = document.getElementById('bPack').getBoundingClientRect(); return { b: [b.left, b.top, b.width, b.height], clear: b.right < p.left || b.bottom < p.top, W: innerWidth }; });
  chk(r.b[2] >= 120 && r.b[3] >= 50 && r.clear && Math.abs(r.b[0] + r.b[2] / 2 - r.W / 2) < 2, 'button bottom centre, big, clear of the backpack ' + JSON.stringify(r));
  const tapBtn = async () => { const [x, y] = await ev(() => { const b = document.getElementById('tpBtn').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }); if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  await tapBtn(); await page.waitForTimeout(100);
  chk(await ev(() => window.__tp.locked), 'pressing SHOP starts the sequence (input locked)');
  await ev(() => { window.__arcade.keys.KeyS = true; }); await page.waitForTimeout(400); await ev(() => { window.__arcade.keys.KeyS = false; });
  await page.waitForFunction(() => window.__tp.state === 'demat' && window.__tp.t > 0.75, null, { timeout: 20000 });
  await ev(() => { window.__tpTimeScale = 0.02; }); await page.waitForTimeout(300); await page.screenshot({ path: `shots/tp_dissolve${sfx}.png` }); await ev(() => { window.__tpTimeScale = 3; });
  let s = await ev(() => { const A = window.__arcade, t = window.__tp; return { d: Math.min(...[t.PAD1, t.PAD2].map(P => Math.hypot(A.monkey.position.x - P.x, A.monkey.position.z - P.z))) }; });
  chk(s.d < 0.05, 'auto-walked to the pad centre, S key ignored while locked ' + s.d.toFixed(3));
  await page.waitForFunction(() => window.__tp.state === 'remat' && window.__tp.t > 0.6, null, { timeout: 20000 });
  await ev(() => { window.__tpTimeScale = 0.02; }); await page.waitForTimeout(300); await page.screenshot({ path: `shots/tp_reassemble${sfx}.png` }); await ev(() => { window.__tpTimeScale = 3; });
  await page.waitForFunction(() => window.__tp.state === 'idle', null, { timeout: 20000 }); await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/tp_whiteroom${sfx}.png` });
  s = await ev(() => { const A = window.__arcade, t = window.__tp; return { where: t.where, x: A.monkey.position.x, z: A.monkey.position.z, vis: A.monkey.visible, wr: t.whiteRoom.visible, room: A.room.visible, btn: document.getElementById('tpBtn').textContent, on: !!document.querySelector('#tpBtn.on') }; });
  const window_P2 = await ev(() => ({ x: window.__tp.PAD2.x, z: window.__tp.PAD2.z }));   // t563: shop pad is in the corner now
  chk(s.where === 2 && Math.abs(s.x - window_P2.x) < 0.05 && Math.abs(s.z - window_P2.z) < 0.05 && s.vis && s.wr && !s.room, 'ends on the white-room (shop) pad ' + JSON.stringify(s));
  chk(s.on && s.btn === 'ARCADE', 'ARCADE button shown on the white-room pad');
  chk(await ev(() => !!document.querySelector('#bPack.on') && !!document.getElementById('tixN')), 'backpack / tickets still there');
  await ev(() => { const A = window.__arcade; A.keys.KeyW = true; for (let i = 0; i < 90; i++) A.step(1 / 60); A.keys.KeyW = false; });   // t563: arrival faces into the room from the corner pad, so walk forward
  s = await ev(() => ({ x: window.__arcade.monkey.position.x, z: window.__arcade.monkey.position.z }));
  chk(Math.hypot(s.x - window_P2.x, s.z - window_P2.z) > 1 && s.x > 80 - 14 && s.x < 94 && Math.abs(s.z) < 14, 'can walk in the white room, stays inside ' + s.x.toFixed(2) + ',' + s.z.toFixed(2));
  await ev(() => { const A = window.__arcade; A.monkey.position.set(window.__tp.PAD2.x + 1.2, 0, window.__tp.PAD2.z); }); await page.waitForFunction(() => !!document.querySelector('#tpBtn.on'), null, { timeout: 20000 });
  await tapBtn(); await page.waitForFunction(() => window.__tp.state === 'idle' && window.__tp.where === 1, null, { timeout: 120000 }); await page.waitForTimeout(500);
  s = await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; return { d: Math.hypot(A.monkey.position.x - P.x, A.monkey.position.z - P.z), room: A.room.visible, wr: window.__tp.whiteRoom.visible, btn: document.getElementById('tpBtn').textContent }; });
  chk(s.d < 0.05 && s.room && !s.wr && s.btn === 'SHOP', 'ARCADE returns to room 1 pad ' + JSON.stringify(s));
  chk(!errors.length, 'no page errors ' + errors.slice(0, 2).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
