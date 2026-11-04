// t220 back from the shop: the monkey lands on the room-1 pad facing into room 1, camera low + close straight behind him
// (Dave's ref/shop_return_view_t220.jpg), and the view holds until he moves. node test/shopreturn.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone';
(async () => { const o = await open(PH ? { phone: true, w: 412, h: 750 } : {}), page = o.page; let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.evaluate(() => { const A = window.__arcade, tp = window.__tp; A.setFloor && A.setFloor('carpet'); try { window.__startUI.pickWin('beach'); } catch (e) {}
    window.__tpTimeScale = 4; A.monkey.position.set(tp.PAD1.x, 0, tp.PAD1.z); A.st.yaw = 2.5; A.st.pitch = 0.6; A.st.dist = 5; tp.go(); });
  await page.waitForFunction(() => window.__tp.where === 2 && window.__tp.state === 'idle', null, { timeout: 90000 });
  const w = await page.evaluate(() => window.__tp.arrivals || 0);
  chk(w === 0, 'going TO the shop does not use the arcade arrival view');
  await page.evaluate(() => window.__tp.go());
  await page.waitForFunction(() => window.__tp.where === 1 && window.__tp.state === 'idle', null, { timeout: 90000 });
  const pose = () => page.evaluate(() => { const A = window.__arcade, st = A.st, m = A.monkey, c = A.camera.position, tp = window.__tp, R = tp.ARRIVE;
    const d = Math.hypot(c.x - m.position.x, c.z - m.position.z), back = Math.atan2(c.x - m.position.x, c.z - m.position.z);
    return { pad: Math.hypot(m.position.x - tp.PAD1.x, m.position.z - tp.PAD1.z), face: m.rotation.y, R, yaw: st.yaw, pitch: st.pitch, dist: st.dist, camY: c.y, camD: d, behind: Math.abs(Math.atan2(Math.sin(back - m.rotation.y - Math.PI), Math.cos(back - m.rotation.y - Math.PI))), n: tp.arrivals }; });
  const a = await pose();
  chk(a.n === 1 && a.pad < 0.05, 'back in room 1, standing on the pad ' + a.pad.toFixed(3));
  chk(Math.abs(a.face - 0.70) < 0.02, 'facing into room 1 (face 0.70 rad, toward the claw machine / cabinets) ' + a.face.toFixed(3));
  chk(Math.abs(a.yaw - (0.70 + Math.PI)) < 0.02 && Math.abs(a.pitch - 0.18) < 0.02 && Math.abs(a.dist - 2.6) < 0.02, 'camera yaw / pitch / dist = behind, low, close ' + JSON.stringify([a.yaw, a.pitch, a.dist]));
  chk(a.behind < 0.3 && a.camY < 2.0 && a.camD < 2.8, 'camera behind him (' + a.behind.toFixed(2) + ' rad, the corner walls pull it in), low (y ' + a.camY.toFixed(2) + ') and close (' + a.camD.toFixed(2) + ' m)');
  await page.waitForTimeout(2500); const b = await pose();
  chk(Math.abs(b.yaw - a.yaw) < 0.01 && Math.abs(b.pitch - a.pitch) < 0.01 && Math.abs(b.dist - a.dist) < 0.01 && Math.abs(b.face - a.face) < 0.01, 'view holds (no follow-camera snap) 2.5 s later');
  const tpb = await page.evaluate(() => document.getElementById('tpBtn').classList.contains('on') && document.getElementById('tpBtn').textContent);
  chk(tpb === 'SHOP', 'SHOP button showing below him');
  await page.screenshot({ path: 'shots/shop_return_' + (PH ? 'phone' : 'desktop') + '.png' });
  chk(o.errors.length === 0, 'no page errors ' + o.errors.join('|'));
  await o.close(); process.exit(ok ? 0 : 1); })();
