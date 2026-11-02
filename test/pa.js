// PA welcome: plays once ~3 s after START, ducks the music, goes through the mute hook, not replayed after HOME -> START; a reload + START plays again.
// node test/pa.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone';
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  async function session(label) {
    const o = await open(PH ? { phone: true, start: true } : { start: true, w: 1280, h: 720 }); const { page, errors } = o;
    await page.addInitScript(() => {}); await page.waitForTimeout(800);
    const pressStart = async () => { const [x, y] = await page.evaluate(() => { const b = document.getElementById('stStart').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }); if (PH) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    await pressStart();
    await page.waitForTimeout(2200); let p = await page.evaluate(() => ({ ...window.__pa }));
    chk(p.played === 0, label + ': not yet at ~2.2 s after START');
    await page.waitForFunction(() => window.__pa.played > 0, null, { timeout: 8000 }).catch(() => {});
    p = await page.evaluate(() => ({ ...window.__pa, since: window.__pa.at - window.__start.at, music: { t: window.__music.target, room1: window.__music.room1 }, dur: window.__pa.dur }));
    chk(p.played === 1 && p.playing && p.since > 2900 && p.since < 4500 && !p.err, label + ': PA plays once ~3 s after START ' + JSON.stringify({ since: Math.round(p.since), src: p.src, dur: p.dur, err: p.err }));
    await page.waitForTimeout(400); const m = await page.evaluate(() => window.__music.target); chk(m < 0.42 * 0.31, label + ': room music ducked while PA speaks (target ' + m.toFixed(3) + ')');
    await page.evaluate(() => window.__mute.set(true)); const g = await page.evaluate(() => window.__mute.gains.map(x => x.gain.value)); chk(g.length && g.every(v => v === 0), label + ': mute zeroes the master gain the PA goes through'); await page.evaluate(() => window.__mute.set(false));
    if (!PH && label === 'load 1') { await page.evaluate(() => window.__startUI.show()); await page.waitForTimeout(500); await pressStart(); await page.waitForTimeout(5000);
      chk(await page.evaluate(() => window.__pa.played) === 1, label + ': HOME -> START again does not replay');
      await page.evaluate(() => { const A = window.__arcade; A.play.mode = 'walk'; }); await page.waitForTimeout(500); }
    await page.waitForFunction(() => !window.__pa.playing, null, { timeout: 16000 }).catch(() => {}); chk(await page.evaluate(() => !window.__pa.playing), label + ': ends; music back up');
    chk(!errors.length, label + ': no errors ' + errors.slice(0, 3)); await o.close();
  }
  await session('load 1'); if (!PH) await session('load 2 (fresh page)');
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})();
