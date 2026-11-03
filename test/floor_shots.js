// screenshots of the CHECKERS and LAVA floors (room 1 + hallway) in normal play camera. node test/floor_shots.js [phone]
const { open } = require('./lib');
const PHONE = process.argv[2] === 'phone', dev = PHONE ? 'phone' : 'desktop';
(async () => {
  const { page, errors, close } = await open(PHONE ? { phone: true, w: 412, h: 860, shieldOpen: true } : { shieldOpen: true });
  for (const f of ['checkers', 'lava']) for (const [k, p, yaw] of [['room1', [3, 6], 0.5], ['hall', [0, -9], 0]]) {
    await page.evaluate(([f, p, yaw]) => { const A = window.__arcade; A.setFloor(f); window.__camOverride = null; A.st.fp = false; A.monkey.position.set(p[0], 0, p[1]); A.st.vel.set(0, 0, 0); A.st.yaw = yaw; A.st.pitch = 0.35; A.st.lookT = A.st.t; }, [f, p, yaw]);
    await page.waitForTimeout(1500); await page.screenshot({ path: `shots/floor_${f}_${k}_${dev}.png` }); }
  if (PHONE) { await page.evaluate(() => { const A = window.__arcade; A.setFloor('carpet'); A.monkey.position.set(3, 0, 6); A.st.vel.set(0, 0, 0); A.st.yaw = 0.5; A.st.pitch = 0.35; A.st.lookT = A.st.t; }); await page.waitForTimeout(2000); await page.screenshot({ path: 'shots/floor_arcade_room1_phone.png' }); }
  console.log(errors.length ? 'FAIL ' + errors.slice(0, 3) : 'PASS shots'); await close(); process.exit(errors.length ? 1 : 0);
})();
