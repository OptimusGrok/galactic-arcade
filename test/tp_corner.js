// t563: the shop's teleporter pad sits in the far-left corner (car mural end of the title wall x Viking end of the left wall); walking onto it
// shows ARCADE and teleports out, coming back lands on it safely facing into the room, then the player can walk. node test/tp_corner.js
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 412, h: 915 }); let ok = true;
  const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const ev = (f, a) => page.evaluate(f, a);
  const cdp = await page.context().newCDPSession(page); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const tapBtn = async () => { const [x, y] = await ev(() => { const b = document.getElementById('tpBtn').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }); await page.touchscreen.tap(x, y); };
  const g = await ev(() => { const t = window.__tp, W = t.whiteRoom.position.x, P = t.PAD2, G = t.pads[1].G.position; return { lx: P.x - W, lz: P.z, gx: G.x - W, gz: G.z, R: t.R }; });
  chk(g.lx < -11 && g.lz > 11 && Math.abs(g.gx - g.lx) < 1e-6 && Math.abs(g.gz - g.lz) < 1e-6 && 14 - Math.max(-g.lx, g.lz) - g.R > 0.5, 'shop pad + glow group in the left/title-wall corner with clearance ' + JSON.stringify(g));
  // t568: nothing glows at the old centre pad spot (shop-local 0,0): no additive/emissive floor mesh covers it (the old 3.6 m cyanGlow halo is gone)
  const og = await ev(() => { const A = window.__arcade, T = A.THREE, W = window.__tp.whiteRoom.position.x, hit = [], b = new T.Box3();
    A.scene.traverse(o => { if (!o.isMesh || !o.visible || !o.material) return; const m = [].concat(o.material)[0]; if (m.blending !== T.AdditiveBlending && !(m.toneMapped === false && m.transparent)) return;
      const pos = o.geometry.attributes.position; if (!pos) return; o.updateWorldMatrix(true, false); const v = new T.Vector3();
      const c = new T.Vector3(); for (let i = 0; i + 3 < pos.count; i += 4) { c.set(0, 0, 0); for (let j = 0; j < 4; j++) c.add(v.fromBufferAttribute(pos, i + j).applyMatrix4(o.matrixWorld)); c.multiplyScalar(0.25);   // each floor glow quad's centre
        if (c.y < 0.3 && Math.hypot(c.x - W, c.z) < 1.5) { hit.push(o.name || o.type); break; } } });
    return { hit, glowName: !!window.__shop.G.getObjectByName('cyanGlow') }; });
  chk(og.hit.length === 0, 'nothing glows on the floor at the old pad spot ' + JSON.stringify(og));
  // go to the shop with the room-1 pad
  await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; A.monkey.position.set(P.x + 0.6, 0, P.z + 0.6); A.st.vel.set(0, 0, 0); });
  await page.waitForFunction(() => !!document.querySelector('#tpBtn.on'), null, { timeout: 20000 }); await ev(() => { window.__tpTimeScale = 3; }); await tapBtn();
  await page.waitForFunction(() => window.__tp.state === 'idle' && window.__tp.where === 2, null, { timeout: 120000 }); await page.waitForTimeout(800);
  let s = await ev(() => { const A = window.__arcade, P = window.__tp.PAD2, p = A.monkey.position; const f = [-Math.sin(A.st.yaw), -Math.cos(A.st.yaw)], toC = [window.__tp.whiteRoom.position.x - p.x, -p.z], n = Math.hypot(...toC);
    return { d: Math.hypot(p.x - P.x, p.z - P.z), facing: (f[0] * toC[0] + f[1] * toC[1]) / n, vis: A.monkey.visible }; });
  chk(s.d < 0.3 && s.facing > 0.8 && s.vis, 'arrives on the corner pad facing into the room ' + JSON.stringify(s));
  await ev(() => { window.__arcade.st.pitch = 0.3; window.__arcade.st.dist = 5; }); await page.waitForTimeout(1500);
  await page.screenshot({ path: '/workspace/galactic-shop/shots/teleporter_arrival.png' });
  // walk off with the joystick (real touches), check movement + not stuck in walls
  const p0 = await ev(() => window.__arcade.monkey.position.clone());
  await T('touchStart', [{ x: 100, y: 700, id: 1 }]); for (let i = 1; i <= 6; i++) await T('touchMove', [{ x: 100, y: 700 - i * 8, id: 1 }]);
  const p1 = await ev(() => { const A = window.__arcade; for (let i = 0; i < 90; i++) A.step(1 / 60); return A.monkey.position.clone(); }); await T('touchEnd', []);
  chk(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1, 'player walks into the room after arriving ' + JSON.stringify([p0, p1].map(p => [p.x.toFixed(2), p.z.toFixed(2)])));
  await ev(() => { const A = window.__arcade, W = window.__tp.whiteRoom.position.x; A.monkey.position.set(W - 6.5, 0, 6.5); A.st.vel.set(0, 0, 0); A.st.yaw = Math.PI * 0.75; A.st.face = A.st.yaw + Math.PI; A.st.pitch = 0.3; A.st.dist = 4.5; A.st.camInit = false; }); await page.waitForTimeout(2000);
  await page.screenshot({ path: '/workspace/galactic-shop/shots/teleporter_corner.png' });   // Dave's angle: looking at the car / Viking corner
  // walk back onto the pad: ARCADE button shows, teleports out to room 1
  await ev(() => { const A = window.__arcade, P = window.__tp.PAD2; A.monkey.position.set(P.x + 0.5, 0, P.z - 0.5); A.st.vel.set(0, 0, 0); });
  await page.waitForFunction(() => !!document.querySelector('#tpBtn.on') && document.getElementById('tpBtn').textContent === 'ARCADE', null, { timeout: 20000 }).catch(() => {});
  chk(await ev(() => document.getElementById('tpBtn').textContent === 'ARCADE' && !!document.querySelector('#tpBtn.on')), 'ARCADE button on the corner pad');
  await tapBtn(); await page.waitForFunction(() => window.__tp.state === 'idle' && window.__tp.where === 1, null, { timeout: 120000 }).catch(() => {}); await page.waitForTimeout(500);
  s = await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; return { where: window.__tp.where, d: Math.hypot(A.monkey.position.x - P.x, A.monkey.position.z - P.z) }; });
  chk(s.where === 1 && s.d < 0.3, 'teleports back to room 1 ' + JSON.stringify(s));
  // and back again: lands safely on the corner pad, not in counter/shelves/walls
  await ev(() => { const A = window.__arcade, P = window.__tp.PAD1; A.monkey.position.set(P.x + 0.6, 0, P.z + 0.6); });
  await page.waitForFunction(() => !!document.querySelector('#tpBtn.on'), null, { timeout: 20000 }); await tapBtn();
  await page.waitForFunction(() => window.__tp.state === 'idle' && window.__tp.where === 2, null, { timeout: 120000 }); await page.waitForTimeout(500);
  s = await ev(() => { const A = window.__arcade, P = window.__tp.PAD2, p = A.monkey.position.clone(), q = p.clone(); window.__shop.pushOut && window.__shop.pushOut(q); return { d: Math.hypot(p.x - P.x, p.z - P.z), pushed: Math.hypot(q.x - p.x, q.z - p.z) }; });
  chk(s.d < 0.3 && s.pushed < 1e-6, 'second arrival lands on the pad, clear of obstacles ' + JSON.stringify(s));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  console.log(ok ? 'ALL OK' : 'SOME FAIL'); await close();
})();
