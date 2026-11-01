const { open } = require('./lib');
(async () => {
  const { page, errors, close } = await open({ w: 1280, h: 667 });
  const shot = async (pos, at, f) => { await page.evaluate(o => { window.__camOverride = o; }, { pos, at }); await page.waitForTimeout(2500); await page.screenshot({ path: f }); console.log('shot', f); };
  await shot([0, 5.2, 11.3], [0, 2.2, -12], 'shots/hall_room1_doorway.png');
  await shot([0, 1.7, -5.5], [0, 1.4, -17], 'shots/hall_doorway_close.png');
  await shot([0, 1.6, -12.6], [0, 1.4, -17], 'shots/hall_inside.png');
  console.log(errors.length ? 'FAIL errors ' + errors.join('|') : 'PASS no page errors');
  await close(); process.exit(errors.length ? 1 : 0);
})();
