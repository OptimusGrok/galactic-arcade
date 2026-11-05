// t286u: no curse-word names. names.js isBad() (leetspeak, spacing, repeats, '*' wildcard; whole-token vs anywhere tiers + whitelist),
// start box hides PLAY with 'Pick a different name', a saved blocked name is cleared on load, and the real Supabase RPCs reject bad names
// (read-only name_free + a claim_name that is refused before any write; throwaway owner key, nothing stored). 390x700 phone.
const { open } = require('./lib');
const BLOCK = ['fuck', 'f*ck', 'f**k', 'F.U.C.K', 'sh1t', 's h i t', 'shiiit', '$hit', 'a s s', 'Ass', 'b1tch', 'c u n t', 'motherfucker', 'dickhead', 'assh0le', 'pr1ck', 'c0ck', 'Shi7'];
const ALLOW = ['Scunthorpe', 'Cassie', 'Dickson', 'Classic', 'Assassin', 'ET', 'Hancock', 'Matsushita', 'Grape', 'Peniston', 'Shitake', 'Nigel', 'Sussex', 'Therapist', 'Titan', 'As', 'Julie', 'Bob'];
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const db = new Map([['et', '__reserved__']]);
  const supa = async r => { const u = r.request().url(), m = /rpc\/(claim_name|name_free)/.exec(u); if (!m) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    const b = JSON.parse(r.request().postData() || '{}'), k = String(b.p_name || '').trim().toLowerCase(), cur = db.get(k);
    const out = m[1] === 'name_free' ? (!cur || cur === b.p_owner) : (cur && cur !== b.p_owner ? 'taken' : (db.set(k, b.p_owner), 'ok'));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) }); };
  const o = await open({ phone: true, start: true, w: 390, h: 700, supa }); const page = o.page; page.setDefaultTimeout(120000);
  try {
    const u = await page.evaluate(([B, A]) => ({ b: B.filter(n => !window.__gaNames.isBad(n)), a: A.filter(n => window.__gaNames.isBad(n)) }), [BLOCK, ALLOW]);
    chk(!u.b.length, 'all blocked variants caught (leet, spacing, dots, repeats, wildcard) ' + u.b.join());
    chk(!u.a.length, 'ordinary names allowed (Scunthorpe, Cassie, Dickson, Classic, Assassin, ET...) ' + u.a.join());
    const tap = async sel => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
    const type = async n => { await page.waitForSelector('#gaIn'); await tap('#gaIn'); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); if (n) await page.keyboard.type(n); await page.waitForTimeout(2000); };
    const ui = () => page.evaluate(() => ({ go: !document.getElementById('gaGo').hidden, hint: document.getElementById('gaHint').hidden ? '' : document.getElementById('gaHint').textContent }));
    await page.waitForTimeout(1500);
    await type('sh1t'); let s = await ui(); chk(!s.go && s.hint === 'Pick a different name', 'blocked name hides PLAY + "Pick a different name" ' + JSON.stringify(s));
    await page.screenshot({ path: '/workspace/ga-names/shots/name_blocked_phone.png' });
    await type('F.U.C.K'); s = await ui(); chk(!s.go && s.hint === 'Pick a different name', 'dotted variant blocked ' + JSON.stringify(s));
    await type('Cassie'); s = await ui(); chk(s.go && !s.hint, 'Cassie allowed: PLAY shows ' + JSON.stringify(s));
    chk(await page.evaluate(() => window.__gaNames.claim('b1tch')) === 'bad', 'client claim() refuses a blocked name');
    // saved blocked name -> cleared on load, start box asks again
    await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}'); p.name = 'sh1t'; localStorage.setItem('galacticarcade.player', JSON.stringify(p)); });
    await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 }); await page.waitForTimeout(1500);
    const c = await page.evaluate(() => ({ n: (JSON.parse(localStorage.getItem('galacticarcade.player') || '{}')).name, cl: window.__gaNames.cleared, inp: (document.getElementById('gaIn') || {}).value }));
    chk(!c.n && c.cl === 1 && !c.inp, 'a saved blocked name is cleared on load and the start box asks again ' + JSON.stringify(c));
  } catch (e) { chk(false, 'exception ' + e.stack); }
  await o.close();
  // real server (read-only / refused-before-write): throwaway owner key, nothing is stored
  try { const URL = 'https://kfupqtafhaflzaoqtenf.supabase.co/rest/v1/rpc/', KEY = 'sb_publishable_IAXEXd619Dq0g50CY-UNRQ_IqWDU4-2', own = 'test_throwaway_' + Date.now();
    const rpc = (fn, b) => fetch(URL + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
    const f1 = await rpc('name_free', { p_name: 's h i t', p_owner: own }), f2 = await rpc('name_free', { p_name: 'Scunthorpe', p_owner: own }), c1 = await rpc('claim_name', { p_name: 'f*ck', p_owner: own, p_legacy: false });
    chk(f1 === false && f2 === true && c1 === 'bad', 'server: name_free false for a bad name, true for Scunthorpe; claim_name returns bad ' + JSON.stringify([f1, f2, c1]));
  } catch (e) { chk(false, 'server check ' + e); }
  const errs = o.errors.filter(x => !/supabase|Failed to load resource|net::/i.test(x)); chk(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1); })();
