// t809u: landscape phone start screen layout. Title big + centred across the top, SELECT PLAYER buttons along the bottom,
// PLAY directly above them, name field + preview usable, nothing overlapping. iPad stays sensible. No screenshots.
// NOSHOTS=1 node test/landscape_start_layout.js
const { open } = require('./lib');
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')); if (!c) ok = false; };
const IPAD_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const measure = () => {
  const R = (e) => { if (!e || e.hidden) return null; const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return null; const r = e.getBoundingClientRect(); return r.width < 2 || r.height < 2 ? null : [r.left, r.top, r.right, r.bottom].map(v => Math.round(v)); };
  const who = document.getElementById('gaWho').closest('.gaBox');
  const b = { title: R(document.getElementById('gaT')), stage: R(document.getElementById('gaStage')), name: R(document.getElementById('gaNm')), input: R(document.getElementById('gaIn')),
    who: R(who), btns: [...document.querySelectorAll('.gaWho')].map(R), go: R(document.getElementById('gaGo')), hint: R(document.getElementById('gaHint')) };
  const ids = ['title', 'stage', 'name', 'who', 'go', 'hint'], ov = [], out = [];
  const hit = (a, c) => a && c && a[0] < c[2] - 1 && c[0] < a[2] - 1 && a[1] < c[3] - 1 && c[1] < a[3] - 1;
  for (let i = 0; i < ids.length; i++) { const a = b[ids[i]]; if (a && (a[0] < -1 || a[1] < -1 || a[2] > innerWidth + 1 || a[3] > innerHeight + 1)) out.push(ids[i]);
    for (let j = i + 1; j < ids.length; j++) if (hit(a, b[ids[j]])) ov.push(ids[i] + '/' + ids[j]); }
  const p = document.getElementById('gaP');
  return { vw: innerWidth, vh: innerHeight, b, ov, out, scroll: p.scrollHeight - p.clientHeight, tfs: parseFloat(getComputedStyle(document.getElementById('gaT')).fontSize) };
};
const waitGo = (pg) => pg.waitForFunction(() => { const g = document.getElementById('gaGo'); return g && !g.hidden && g.getBoundingClientRect().height > 0; }, null, { timeout: 8000 }).catch(() => {}).then(() => pg.waitForTimeout(600));   // PLAY pops in 2 s after the first touch
const errs = (e) => e.filter(x => !/Failed to load resource/.test(x));   // supabase is blocked offline
(async () => {
  const o = await open({ phone: true, start: true, w: 844, h: 390 }), page = o.page;
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 2 && document.getElementById('gaIn'), null, { timeout: 90000 });
  await page.tap('#gaT');
  for (const [w, h] of [[844, 390], [667, 375], [932, 430], [568, 320]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300);
    for (const named of [0, 1]) {
      if (named) { await page.fill('#gaIn', 'NovaPilot'); await waitGo(page); }
      else await page.fill('#gaIn', '');
      const m = await page.evaluate(measure), b = m.b, tag = w + 'x' + h + (named ? ' named' : '');
      const tc = (b.title[0] + b.title[2]) / 2, top = named ? b.go : b.hint;
      chk(b.title && Math.abs(tc - w / 2) < 6 && b.title[1] < 16 && b.title[3] - b.title[1] < 0.2 * h && m.tfs >= Math.min(30, 0.09 * h), tag + ': title big, one line, centred at the top', { t: b.title, fs: m.tfs });
      chk(b.who && b.who[3] >= h - 14 && b.btns.every(r => r && r[3] >= h - 22 && r[3] - r[1] >= 30), tag + ': SELECT PLAYER buttons along the bottom, finger sized', { who: b.who, btns: b.btns });
      chk(top && top[3] <= b.who[1] + 1 && b.who[1] - top[3] <= 14 && Math.abs((top[0] + top[2]) / 2 - (b.who[0] + b.who[2]) / 2) < 8, tag + ': ' + (named ? 'PLAY' : 'hint') + ' directly above the buttons', { top, who: b.who });
      chk(b.stage && b.stage[3] - b.stage[1] >= 0.4 * h && b.input && b.input[3] - b.input[1] >= 24 && b.input[2] - b.input[0] >= 150, tag + ': preview and name field usable', { stage: b.stage, input: b.input });
      chk(!m.ov.length && !m.out.length && m.scroll <= 4, tag + ': no overlaps, all on screen, no scrolling', { ov: m.ov, out: m.out, scroll: m.scroll });
    }
  }
  chk(!errs(o.errors).length, 'phone: no page errors', errs(o.errors)); await o.close();
  for (const [w, h] of [[1180, 820], [820, 1180]]) {
    const q = await open({ phone: true, start: true, w, h, ua: IPAD_UA }), pg = q.page;
    await pg.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 2 && document.getElementById('gaIn'), null, { timeout: 90000 });
    await pg.tap('#gaT'); await pg.fill('#gaIn', 'NovaPilot'); await waitGo(pg);
    const m = await pg.evaluate(measure);
    chk(!m.ov.length && !m.out.length && m.b.go && m.b.title && m.b.btns.every(Boolean) && m.scroll <= 4, 'iPad ' + w + 'x' + h + ': start screen fits with no overlaps, PLAY shown', { ov: m.ov, out: m.out, scroll: m.scroll });
    chk(!errs(q.errors).length, 'iPad ' + w + 'x' + h + ': no page errors', errs(q.errors)); await q.close();
  }
  console.log(ok ? 'ALL PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL', e); process.exit(1); });
