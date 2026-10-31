const { open } = require('./lib');
const setup = (s) => ({ ...s });
async function shot(page, name, f) { await page.evaluate(f); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/' + name + '.png' }); console.log('shots/' + name + '.png'); }
(async () => {
  let o = await open({ w: 1280, h: 720 });
  await o.page.evaluate(() => window.__noAdapt = 1);
  await shot(o.page, 'wide', () => { const A = window.__arcade; A.monkey.position.set(-3, 0, 6); A.st.face = Math.PI * 0.85; A.st.yaw = -0.5; A.st.pitch = 0.1; A.st.dist = 6; A.st.vel.set(0,0,0); });
  await shot(o.page, 'cabinet', () => { const A = window.__arcade; A.monkey.position.set(-9.75, 0, 0.1); A.st.face = -Math.PI / 2; A.st.yaw = 0.95; A.st.pitch = 0.05; A.st.dist = 2.8; for (let i = 0; i < 90; i++) A.step(1/60); });
  await shot(o.page, 'run', () => { const A = window.__arcade; A.monkey.position.set(0, 0, 4); A.st.yaw = 0.9; A.st.pitch = 0.15; A.st.dist = 3.5; A.keys.KeyA = true; A.keys.ShiftLeft = true; for (let i = 0; i < 40; i++) A.step(1/60); });
  console.log('errors', o.errors); await o.close();
  o = await open({ phone: true });
  await o.page.evaluate(() => window.__noAdapt = 1);
  await shot(o.page, 'phone_portrait', () => { const A = window.__arcade; A.monkey.position.set(-8.5, 0, 3); A.st.face = -2.2; A.st.yaw = -0.4; A.st.pitch = 0.12; A.st.dist = 4; });
  console.log('errors', o.errors); await o.close();
})();
