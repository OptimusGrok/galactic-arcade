// red energy shield in the doorway: blocks the monkey (3rd + 1st person) and the camera, 10 TICKETS pop-up, UNLOCK for 10 tickets (persists)
// node test/shield.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const { page, errors, close } = await open(PH ? { phone: true } : { w: 1280, h: 720 });
  const ev = (f, a) => page.evaluate(f, a);
  const walkTo = async (fp) => ev(fp => { const A = window.__arcade; A.st.fp = fp; A.monkey.position.set(0.4, 0, -4); for (const k in A.keys) A.keys[k] = false;
    A.st.yaw = 0; A.st.face = Math.PI; A.keys.KeyW = true; for (let i = 0; i < 360; i++) A.step(1 / 60); A.keys.KeyW = false; A.step(1 / 60);
    return { fp: A.st.fp, z: A.monkey.position.z, cz: A.camera.position.z, touches: A.shield.touches }; }, fp);
  const info = await ev(() => { const A = window.__arcade; return { HALF: -(A.Z2 + A.HALL_L) / 2, Z: A.shield.Z, open: A.shield.open, vis: A.shield.group.visible, t: A.play.tickets.total }; });
  console.log(JSON.stringify(info));
  chk(!info.open && info.vis, 'shield is up for a new player');
  // shield from room 1, no monkey
  await ev(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 3); A.step(1 / 60); });
  await ev(() => { window.__camOverride = { pos: [0, 1.7, 2.5], at: [0, 1.4, -8] }; });
  await page.waitForTimeout(1500); await page.screenshot({ path: `shots/shield_room1${sfx}.png` });
  chk(!(await ev(() => document.getElementById('shPop').classList.contains('on'))), 'no pop-up when the monkey is far away');
  await ev(() => { delete window.__camOverride; window.__arcade.st.camInit = false; });
  // third person: walk straight at it
  let r = await walkTo(false); console.log('3rd', JSON.stringify(r));
  chk(r.z > info.Z + 0.25, 'third person: monkey stopped on room 1 side (z ' + r.z.toFixed(2) + ')');
  chk(r.cz > info.Z, 'third person: camera stays on room 1 side');
  chk(r.touches > 0, 'bumping the shield counts a touch (ripple + hum)');
  await page.waitForTimeout(600);
  chk(await ev(() => document.getElementById('shPop').classList.contains('on')), 'pop-up shows at the shield');
  const txt = await ev(() => document.getElementById('shPop').innerText); console.log(JSON.stringify(txt));
  chk(/10 TICKETS/.test(txt) && /TO OPEN THE SHIELD/.test(txt), 'pop-up says 10 TICKETS / to open the shield');
  await ev(() => { const A = window.__arcade; A.st.yaw = 0.5; A.st.pitch = 0.3; A.st.dist = 3.4; A.st.lookT = A.st.t + 1e9; });
  await page.waitForTimeout(1200); await page.screenshot({ path: `shots/shield_popup${sfx}.png` });
  // first person
  r = await walkTo(true); console.log('1st', JSON.stringify(r));
  chk(r.fp && r.z > info.Z + 0.25 && r.cz > info.Z, 'first person: monkey and camera stopped (cam z ' + r.cz.toFixed(2) + ')');
  await ev(() => { window.__arcade.st.fp = false; });
  // walk away: pop-up hides
  await ev(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 2); A.step(1 / 60); }); await page.waitForTimeout(700);
  chk(!(await ev(() => document.getElementById('shPop').classList.contains('on'))), 'pop-up hides after walking off');
  // 9 tickets: unlock fails
  await ev(() => { const A = window.__arcade; A.play.tickets.total = 9; A.monkey.position.set(0, 0, A.shield.Z + 0.6); A.step(1 / 60); }); await page.waitForTimeout(500);
  const b9 = await ev(() => document.getElementById('shBtn').textContent);
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  let s = await ev(() => ({ open: window.__arcade.shield.open, t: window.__arcade.play.tickets.total, fails: window.__arcade.shield.fails }));
  chk(/NEED 10/.test(b9) && !s.open && s.t === 9 && s.fails === 1, '9 tickets: NEED 10, nothing spent, still closed (' + b9 + ')');
  // 10 tickets: unlock works
  await ev(() => { const A = window.__arcade; A.play.tickets.total = 10; A.shield.refresh(); }); await page.waitForTimeout(200);
  const b10 = await ev(() => document.getElementById('shBtn').textContent);
  if (PH) await page.tap('#shBtn'); else await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  s = await ev(() => ({ open: window.__arcade.shield.open, t: window.__arcade.play.tickets.total, hud: document.getElementById('tixN').textContent, ls: localStorage.getItem('neonarcade.tickets') }));
  chk(/UNLOCK/.test(b10) && s.open && s.t === 0 && s.hud === '0' && s.ls === '0', '10 tickets: unlocked, 10 spent, HUD + storage 0 (' + JSON.stringify(s) + ')');
  await page.waitForTimeout(1300);
  chk(!(await ev(() => window.__arcade.shield.group.visible)), 'shield gone after the power-down');
  await ev(() => { const A = window.__arcade; A.play.openView(); }); await page.waitForTimeout(300);
  chk(/🎟 0 TICKETS/.test(await ev(() => document.getElementById('tvCount').textContent)), 'enlarged ticket view shows 0'); await ev(() => window.__arcade.play.closeView());
  r = await walkTo(false); chk(r.z < info.Z - 0.5, 'monkey passes through the doorway (z ' + r.z.toFixed(2) + ')');
  await ev(() => { const A = window.__arcade; A.monkey.position.set(0, 0, 1.5); A.st.yaw = 0.5; A.st.dist = 3.4; A.st.camInit = false; A.step(1 / 60); });
  await page.waitForTimeout(1200); await page.screenshot({ path: `shots/shield_unlocked${sfx}.png` });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  s = await ev(() => ({ open: window.__arcade.shield.open, vis: window.__arcade.shield.group.visible, t: window.__arcade.play.tickets.total }));
  chk(s.open && !s.vis && s.t === 0, 'still open after a reload (' + JSON.stringify(s) + ')');
  r = await walkTo(false); chk(r.z < info.Z - 0.5, 'after reload the monkey still passes');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
