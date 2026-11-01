// screenshots of the Arcade Kid avatar: from behind, facing the camera, face close-up. node test/avatar_shots.js [phone]
const { open } = require('./lib'); const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => { const o = await open(PH ? { phone: true, w: 412, h: 860 } : { w: 1280, h: 720 }); const p = o.page; await p.waitForTimeout(1500);
  const set = (yaw, dist, pitch) => p.evaluate(([y, d, pi]) => { const A = window.__arcade; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(0, 0, 4); A.st.face = Math.PI; A.st.yaw = y; A.st.dist = d; A.st.pitch = pi; A.st.lookT = A.st.t + 1e9; }, [yaw, dist, pitch]);
  await set(0, 4, 0.25); await p.waitForTimeout(2500); await p.screenshot({ path: `shots/avatar_back${sfx}.png` });
  await set(Math.PI, 3.2, 0.12); await p.waitForTimeout(3000); await p.screenshot({ path: `shots/avatar_front${sfx}.png` });
  await p.evaluate(() => { const A = window.__arcade, h = A.monkey.userData.head.getWorldPosition(new A.THREE.Vector3()), f = new A.THREE.Vector3(0, 0, 1).applyQuaternion(A.monkey.quaternion); window.__camOverride = { showMonkey: true, pos: [h.x + f.x * 0.75, h.y + 0.2, h.z + f.z * 0.75], at: [h.x, h.y + 0.15, h.z] }; });
  await p.waitForTimeout(1200); await p.screenshot({ path: `shots/avatar_face${sfx}.png` });
  console.log('errors', o.errors.length); await o.close(); })();
