// Screenshot every wardrobe option on the in-game monkey (for the labelled montage); /tmp/ao_<row>_<v>.png
const { open } = require('./lib');
(async () => { const o = await open({ phone: true, w: 412, h: 915 }); const page = o.page;
  await page.waitForFunction(() => window.__gaPlayer && window.__gaPlayer.tag, null, { timeout: 120000 });
  const O = await page.evaluate(() => { const r = {}; for (const k in window.__gaPlayer.opts) r[k] = window.__gaPlayer.opts[k].map(a => a[0]); return r; });
  const base = { hat: 'cap', glasses: 'none', hoodie: 'navy', fur: 'brown', shoes: 'red' };
  const face = async path => { await page.evaluate(() => { const A = window.__arcade; A.st.vel.set(0, 0, 0); A.st.fp = false; A.st.yaw = A.st.face; A.st.dist = 2.6; A.st.pitch = 0.1; A.st.camInit = false; });
    await page.waitForTimeout(2500); await page.evaluate(() => { const A = window.__arcade; A.st.yaw = A.st.face; A.st.dist = 2.6; A.st.pitch = 0.1; }); await page.waitForTimeout(2500); await page.screenshot({ path }); };
  require('fs').writeFileSync('/tmp/ao_opts.json', JSON.stringify(O)); for (const k of Object.keys(O)) for (const v of O[k]) { if (require('fs').existsSync('/tmp/ao_' + k + '_' + v + '.png')) continue; await page.evaluate(([b, k, v]) => { const g = window.__gaPlayer; for (const x in b) g.pick(x, b[x]); g.pick(k, v); }, [base, k, v]); await face('/tmp/ao_' + k + '_' + v + '.png'); }
  require('fs').writeFileSync('/tmp/ao_opts.json', JSON.stringify(O)); console.log('errors', JSON.stringify(o.errors)); await o.close(); })();
