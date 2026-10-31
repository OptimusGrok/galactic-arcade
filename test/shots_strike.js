const { open } = require('./lib');
async function shot(page, name, f, wait = 1800) { await page.evaluate(f); await page.waitForTimeout(wait); await page.screenshot({ path: 'shots/' + name + '.png' }); console.log('shots/' + name + '.png'); }
const place = (ang, dist, pitch, monk) => `(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; window.__forceDemo = 1;
  const m = ${monk}; if (m) { A.monkey.position.set(m[0], 0, m[1]); } else A.monkey.position.set(u.centre.x + u.inward.x * 3.2 + Math.sin(${ang}) * 0, 0, u.centre.z + u.inward.z * 3.2);
  A.st.vel.set(0,0,0); A.st.lookT = 1e9; A.st.yaw = Math.atan2(u.inward.x, u.inward.z) + ${ang}; A.st.pitch = ${pitch}; A.st.dist = ${dist}; A.st.camInit = false; A.monkey.visible = true; })()`;
(async () => {
  let o = await open({ w: 1280, h: 720 });
  await o.page.waitForFunction(() => window.__arcade.demo.ready);
  await o.page.evaluate(() => { const d = window.__arcade.demo; d.SK.steps(1500); });
  // camera-only shots: put the monkey behind the camera (out of frame) by targeting a point in front of the cabinet
  const camShot = (ang, dist) => `(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; A.st.fp = false;
     A.monkey.position.set(u.centre.x + u.inward.x * 2.3, 0, u.centre.z + u.inward.z * 2.3); A.st.vel.set(0,0,0); A.st.lookT = 1e9;
     A.st.yaw = Math.atan2(u.inward.x, u.inward.z) + ${ang}; A.st.pitch = 0.08; A.st.dist = ${dist}; A.st.camInit = false; A.st.face = A.st.yaw + Math.PI; })()`;
  // first person views give clean cabinet shots
  const fp = (ang, d) => `(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; A.st.fp = true; const yaw = Math.atan2(u.inward.x, u.inward.z) + ${ang};
     A.monkey.position.set(u.centre.x + Math.sin(yaw) * ${d}, 0, u.centre.z + Math.cos(yaw) * ${d}); A.st.vel.set(0,0,0); A.st.lookT = 1e9; A.st.yaw = yaw; A.st.pitch = 0.3; })()`;
  await shot(o.page, 'strike_front', fp(0, 2.6));
  await shot(o.page, 'strike_left', fp(-0.95, 2.4));
  await shot(o.page, 'strike_right', fp(0.95, 2.4));
  await shot(o.page, 'strike_playing', `(() => { const A = window.__arcade, u = A.strikeCab.userData; A.st.fp = false; A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(-u.inward.x, -u.inward.z); A.st.vel.set(0,0,0);
     A.st.lookT = 1e9; A.st.yaw = Math.atan2(u.inward.x, u.inward.z) + 0.75; A.st.pitch = 0.18; A.st.dist = 2.6; A.st.camInit = false; })()`, 2500);
  await shot(o.page, 'strike_room', `(() => { const A = window.__arcade; A.st.fp = false; A.monkey.position.set(-3, 0, -3); A.st.face = -2.4; A.st.yaw = Math.PI / 4; A.st.pitch = 0.12; A.st.dist = 4.5; A.st.camInit = false; })()`);
  console.log('errors', o.errors, 'supabase', o.requests.filter(u => /supabase/.test(u)).length); await o.close();
  o = await open({ phone: true });
  await o.page.waitForFunction(() => window.__arcade.demo.ready);
  await o.page.evaluate(() => window.__arcade.demo.SK.steps(1200));
  await shot(o.page, 'strike_phone', `(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(-u.inward.x, -u.inward.z); A.st.vel.set(0,0,0);
     A.st.lookT = 1e9; A.st.yaw = Math.atan2(u.inward.x, u.inward.z) - 0.6; A.st.pitch = 0.2; A.st.dist = 3.2; A.st.camInit = false; })()`, 2500);
  console.log('errors', o.errors); await o.close();
})();
