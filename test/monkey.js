// the monkey has no tail (Dave, 2026-10-31); everything else on it is still there
const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ w: 1280, h: 720 }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const r = await page.evaluate(() => { const A = window.__arcade, u = A.monkey.userData; let n = 0, below = 0; A.monkey.updateMatrixWorld(true);
    const b = new A.THREE.Box3(), v = new A.THREE.Vector3(); A.monkey.traverse(o => { if (o.isMesh) n++; });
    // nothing hanging behind the hips: no mesh centre more than 0.2 m behind the hip joint (the tail stuck out ~0.5 m)
    const hp = u.hips.getWorldPosition(new A.THREE.Vector3()), back = new A.THREE.Vector3(0, 0, -1).applyQuaternion(A.monkey.quaternion); let behind = 0;
    A.monkey.traverse(o => { if (o.isMesh) { o.getWorldPosition(v); if (v.clone().sub(hp).dot(back) > 0.2) behind++; } });
    return { keys: Object.keys(u), meshes: n, behind, hasLegs: u.legs.length, hasArms: u.arms.length, head: !!u.head }; });
  console.log(JSON.stringify(r));
  chk(!r.keys.includes('tail'), 'no tail bones in the rig'); chk(r.behind === 0, 'no mesh sticking out behind the hips'); chk(r.hasLegs === 2 && r.hasArms === 2 && r.head, 'legs, arms and head still there');
  await page.mouse.click(640, 360); await page.keyboard.down('KeyW'); await page.waitForTimeout(500); await page.keyboard.up('KeyW');
  console.log(await page.evaluate(() => JSON.stringify({ yaw: window.__arcade.st.yaw, ov: !!window.__camOverride, p: window.__arcade.monkey.position })));
  await page.waitForTimeout(1200); await page.screenshot({ path: 'shots/monkey_back.png' });
  await page.evaluate(() => { const A = window.__arcade; A.st.yaw += Math.PI * 0.25; A.st.lookT = A.st.t + 1e9; });
  await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/monkey_threequarter.png' });
  for (let i = 0; i < 30; i++) await page.evaluate(() => window.__arcade.step(1 / 60));
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})();
