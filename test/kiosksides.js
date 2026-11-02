// Gold ticket decals on both kiosk side panels: two views (from +x and -x), checks the decal faces the viewer and is not mirrored.
// node test/kiosksides.js [phone]
const { open } = require('./lib'); const { execSync } = require('child_process');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const o = await open(PH ? { phone: true, w: 412, h: 860 } : { w: 1280, h: 720 }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForTimeout(1500);
  const n = await page.evaluate(() => window.__arcade.kiosk.K.children.filter(c => c.name === 'kioskSideTicket').length); chk(n === 2, 'two side decals');
  for (const s of [1, -1]) {
    await page.evaluate(s => { const A = window.__arcade; window.__noAdapt = 1; A.st.fp = true; A.st.vel.set(0, 0, 0); const k = new A.THREE.Vector3(); A.kiosk.K.getWorldPosition(k); A.monkey.position.set(k.x + s * 1.9, 0, k.z + 0.5); A.st.face = -s * Math.PI / 2 - s * 0.25; A.st.yaw = s * (Math.PI / 2 - 0.25); A.st.pitch = 0.5; A.st.dist = 2.4; A.st.lookT = -99; }, s);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(s => { const A = window.__arcade, T = A.THREE, cam = A.camera; const m = A.kiosk.K.children.find(c => c.name === 'kioskSideTicket' && Math.sign(c.position.x) === s);
      const w = m.geometry.parameters.width / 2, h = m.geometry.parameters.height / 2; m.updateMatrixWorld(true);
      const pr = (x, y) => { const v = new T.Vector3(x, y, 0).applyMatrix4(m.matrixWorld).project(cam); return [v.x, v.y, v.z]; };
      const n = new T.Vector3(0, 0, 1).transformDirection(m.matrixWorld), to = cam.position.clone().sub(m.getWorldPosition(new T.Vector3()));
      return { L: pr(-w, 0), R: pr(w, 0), T: pr(0, h), B: pr(0, -h), facing: n.dot(to) > 0 }; }, s);
    chk(r.facing && r.L[0] < r.R[0] && r.T[1] > r.B[1] && Math.abs(r.L[0]) < 1 && Math.abs(r.R[0]) < 1, (s > 0 ? 'right(+x)' : 'left(-x)') + ' decal faces the camera, upright, left->right (not mirrored), on screen ' + JSON.stringify(r));
    await page.screenshot({ path: `/tmp/ks_${s > 0 ? 'p' : 'n'}${sfx}.png` });
  }
  execSync(`ffmpeg -v error -y -i /tmp/ks_n${sfx}.png -i /tmp/ks_p${sfx}.png -filter_complex hstack shots/kiosk_sides${sfx}.png`);
  chk(!errors.length, 'no errors ' + errors.slice(0, 3)); await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
