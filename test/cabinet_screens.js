// t755u: every cabinet shows ITS OWN game - attract screen (canvas text drawn on that cabinet's own screen texture),
// Grok's WATCH view (the iframe it opens) - and WATCH never opens another machine's game when you stand at a different
// cabinet (the Rock Fall -> Monkey Crossing bug). 844x390.
const { open } = require('./lib');
const fs = require('fs'), path = require('path');
const SHOT = process.env.CAB_SHOT || '';
(async () => {
  const o = await open({ phone: true, w: 844, h: 390 }), page = o.page; page.setDefaultTimeout(60000);
  let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 700) : '')); if (!c) ok = false; };
  await page.addInitScript(() => { const M = new WeakMap(); window.__cvT = c => [...(M.get(c) || [])]; window.__cvReset = c => M.delete(c);
    for (const k of ['fillText', 'strokeText']) { const f = CanvasRenderingContext2D.prototype[k]; CanvasRenderingContext2D.prototype[k] = function (t, ...a) { let s = M.get(this.canvas); if (!s) M.set(this.canvas, s = new Set()); if (s.size < 80) s.add(String(t)); return f.call(this, t, ...a); }; } });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__grokVisit && window.__arcade.play, null, { timeout: 90000 });
  await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; window.__forceDemo = true; });
  await page.waitForTimeout(4000);
  // what each machine's own game is called (its page <title>)
  const machines = await page.evaluate(() => Object.values(window.__arcade.play.machines).map(m => ({ key: m.key, cab: m.cab && m.cab.name, src: m.src })));
  const root = path.join(__dirname, '..'); for (const m of machines) { const h = fs.readFileSync(path.join(root, m.src.split('?')[0]), 'utf8'); m.title = (h.match(/<title>([^<]*)/) || [])[1] || ''; }
  console.log('MAP ' + machines.map(m => `${m.key}:${m.cab}->${m.src} "${m.title}"`).join(' | '));
  chk(new Set(machines.map(m => m.cab)).size === machines.length && new Set(machines.map(m => m.src)).size === machines.length, 'every machine has its own cabinet and its own game page', machines.length);
  // attract screens: words drawn on each canvas screen (game titles, upper case)
  const TITLES = { monkey: ['MONKEY', 'CROSSING'], berserker: ['BERSERKER'], orc: ['ORC ATTACK'], cyber: ['CYBER'], blaster: ['SHIPS'], pip: ['SUPER PIP QUEST'], bb: ['HI-SCORE'], rockfall: ['ROCKFALL RUSH'], skytower: ['SKY TOWER'], nova: ['NOVA TETHER'] };
  const OWN = { monkey: /MONKEY|CROSSING/, berserker: /BERSERKER/, orc: /ORC ATTACK/, cyber: /^CYBER$|^CITY$/, pip: /PIP QUEST/, rockfall: /ROCKFALL/, skytower: /SKY TOWER/, nova: /NOVA TETHER/ };
  const scr = await page.evaluate(() => { const out = {}; for (const m of Object.values(window.__arcade.play.machines)) { const s = m.cab.getObjectByName('screen'), mat = s && s.material, map = mat && (mat.map || mat.emissiveMap), img = map && map.image;
    out[m.key] = { tex: map ? map.uuid : null, canvas: !!(img && img.getContext), txt: img && img.getContext ? window.__cvT(img) : [] }; } return out; });
  const texs = Object.values(scr).filter(v => v.tex).map(v => v.tex);
  chk(new Set(texs).size === texs.length, 'no two cabinets share a screen texture', texs.length);
  const bad = [];
  for (const [k, want] of Object.entries(TITLES)) { const t = scr[k].txt.join(' | '); if (!want.every(w => t.includes(w))) bad.push(k + ' missing ' + want + ' in ' + t);
    for (const [k2, re] of Object.entries(OWN)) if (k2 !== k && scr[k].txt.some(x => re.test(x))) bad.push(k + ' shows ' + k2 + ': ' + t); }
  chk(!bad.length, 'every canvas attract screen draws its own game and no other game', bad.length ? bad : Object.keys(TITLES));
  chk(scr.rockfall.txt.some(x => /ROCKFALL RUSH/.test(x)) && !scr.rockfall.txt.some(x => /MONKEY|CROSSING/.test(x)), 'Rock Fall cabinet screen is ROCKFALL RUSH, not Monkey Crossing', scr.rockfall.txt);
  // Grok WATCH: each machine opens its own game
  const wbad = [], wl = [];
  for (const m of machines) {
    const r = await page.evaluate(async (k) => { const G = window.__grokVisit, P = window.__arcade.play, mm = P.machines[k]; G.closeWatch(); G.cab = mm.cab; G.skipTo('play');
      const f = mm.cab.userData.front, face = mm.cab.userData.facing || { x: 0, z: 1 }; const A = window.__arcade; A.monkey.position.set(f.x - face.x * 0.3, 0, f.z - face.z * 0.3); A.st.face = Math.atan2(face.x, face.z);
      { const t1 = performance.now(); while (performance.now() - t1 < 8000 && P.near() && P.near() !== mm.cab.name) { await new Promise(r => setTimeout(r, 200)); A.monkey.position.set(f.x - face.x * 0.3, 0, f.z - face.z * 0.3); A.st.face = Math.atan2(face.x, face.z); } } const nearAt = P.near(); G.openWatch(); const t0 = performance.now(); let title = null, href = null;
      while (performance.now() - t0 < 12000) { await new Promise(r => setTimeout(r, 250)); try { const d = G.watchFrame.contentDocument; if (d && d.readyState === 'complete' && d.title) { title = d.title; href = G.watchFrame.contentWindow.location.pathname; break; } } catch (e) {} }
      const out = { open: G.watchOpen, title, href, nearAt }; G.closeWatch(); return out; }, m.key);
    wl.push(m.key + '=' + r.title); if (!r.open || r.title !== m.title || !r.href.endsWith(m.src.split('?')[0])) wbad.push({ key: m.key, want: m.title, got: r });
  }
  chk(!wbad.length, 'WATCH (Grok playing) opens each cabinet\'s own game', wbad.length ? wbad : wl);
  // the bug: Grok plays Monkey Crossing, you stand at Rock Fall -> no WATCH for Monkey Crossing there
  const bug = await page.evaluate(async () => { const G = window.__grokVisit, P = window.__arcade.play, A = window.__arcade, mc = P.machines.monkey.cab, rf = P.machines.rockfall.cab;
    G.closeWatch(); G.cab = mc; G.skipTo('play'); const f = rf.userData.front, fc = rf.userData.facing || { x: 0, z: 1 }; A.monkey.position.set(f.x - fc.x * 0.3, 0, f.z - fc.z * 0.3); A.st.face = Math.atan2(fc.x, fc.z);
    { const t1 = performance.now(); while (performance.now() - t1 < 8000 && P.near() !== 'rockfallCabinet') await new Promise(r => setTimeout(r, 200)); } await new Promise(r => setTimeout(r, 800)); const near = P.near(), btn = document.getElementById('gvWatch').classList.contains('on'), pl = document.getElementById('playUI') && document.getElementById('playUI').classList.contains('on');
    G.openWatch(); const opened = G.watchOpen; G.closeWatch();
    // Grok at Rock Fall, you at Rock Fall: WATCH is offered and opens Rockfall Rush
    G.cab = rf; G.skipTo('play'); await new Promise(r => setTimeout(r, 1500)); const btn2 = document.getElementById('gvWatch').classList.contains('on');
    G.openWatch(); let title = null; const t0 = performance.now(); while (performance.now() - t0 < 12000) { await new Promise(r => setTimeout(r, 250)); try { const d = G.watchFrame.contentDocument; if (d && d.readyState === 'complete' && d.title) { title = d.title; break; } } catch (e) {} }
    return { near, playUI: pl, btn, opened, btn2, title, wrong: G.watchWrongCab || 0 }; });
  chk(bug.near === 'rockfallCabinet' && bug.playUI && !bug.btn && !bug.opened, 'at Rock Fall while Grok plays Monkey Crossing: no WATCH, Monkey Crossing is NOT opened', bug);
  chk(bug.btn2 && bug.title === 'Rockfall Rush' && bug.title !== 'Monkey Crossing', 'at Rock Fall while Grok plays Rock Fall: WATCH shows Rockfall Rush', bug);
  if (SHOT) { await page.waitForTimeout(2500); await page.screenshot({ path: SHOT }); }
  await page.evaluate(() => window.__grokVisit.closeWatch());
  const errs = o.errors.filter(e => !/net::ERR_FAILED|Failed to load resource|supabase/i.test(e));
  chk(errs.length === 0, 'no page errors', errs.slice(0, 4));
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await o.close(); process.exit(ok ? 0 : 1);
})();
