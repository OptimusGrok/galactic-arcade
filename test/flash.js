// White-flash regression (Dave: 'when the player turns the camera will sometimes show a white flash from the neon reflecting').
// Orbit the camera 360deg at four spots x two pitches and measure the near-white fraction (min(r,g,b) > 235, HUD row skipped)
// of every frame. Before the fix the hallway peaked at ~5.6% (pink wall tube filling the screen) against a ~0.03% median.
const { open } = require('./lib');
const PHONE = process.argv[2] === 'phone', MAX = 1.0, JUMP = 0.8;
(async () => {
  const { page, errors, close } = await open(PHONE ? { phone: true, w: 412, h: 860, shieldOpen: true } : { shieldOpen: true });
  await page.evaluate(() => { window.__nearWhite = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
    const src = window.__arcade.renderer ? window.__arcade.renderer.domElement : document.querySelector('canvas'), w = 320, h = Math.round(320 * src.height / src.width);
    const c = window.__nwc ||= document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0, w, h);
    const y0 = Math.round(h * 0.08), d = g.getImageData(0, y0, w, h - y0).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.min(d[i], d[i + 1], d[i + 2]) > 235) n++;
    res(100 * n / (d.length / 4)); }))); });
  const spots = { room1: [2, 2], room1w: [-9, -6], hall: [0, -14.5], room2: [5, -23] }; let worst = 0, worstAt = '', fail = 0;
  for (const [k, p, pitch] of [['hall', spots.hall, 0.15], ['hall', spots.hall, 0.7], ['room1w', spots.room1w, 0.15], ['room1', spots.room1, 0.15], ['room2', spots.room2, 0.15]]) {
    let prev = null;
    for (let i = 0; i <= 12; i++) {
      const v = await page.evaluate(async ([p, yaw, pitch, first]) => { const A = window.__arcade; window.__camOverride = null; A.st.fp = false;
        A.monkey.position.set(p[0], 0, p[1]); A.st.vel.set(0, 0, 0); A.st.yaw = yaw; A.st.pitch = pitch; A.st.lookT = A.st.t;
        await new Promise(r => setTimeout(r, first ? 900 : 160)); return window.__nearWhite(); }, [p, i / 12 * Math.PI * 2, pitch, i === 0]);
      if (v > worst) { worst = v; worstAt = `${k} pitch ${pitch} yaw ${i * 30}`; }
      if (v > MAX || (prev !== null && v - prev > JUMP)) { fail++; console.log(`FLASH ${k} p${pitch} yaw ${i * 30}: ${v.toFixed(3)}% (prev ${prev === null ? '-' : prev.toFixed(3)})`); }
      prev = v; } }
  console.log(`${PHONE ? 'phone' : 'desktop'} worst near-white ${worst.toFixed(3)}% at ${worstAt}`);
  if (errors.length) { console.log('page errors', errors.slice(0, 3)); fail++; }
  await close(); console.log(fail ? `FAIL (${fail})` : 'PASS'); process.exit(fail ? 1 : 0);
})();
