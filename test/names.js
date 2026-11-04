// Unique names (names.js + player.js start box): Supabase RPCs stubbed in-process (no real table writes). node test/names.js  (phone 412x915)
const { open } = require('./lib');
(async () => {
  const db = new Map([['et', '__reserved__'], ['zara', 'someoneelse_0000000']]), calls = []; let down = false;
  const supa = async r => { const u = r.request().url(); if (down) return r.abort();
    const m = /rpc\/(claim_name|name_free)/.exec(u); if (!m) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    const b = JSON.parse(r.request().postData() || '{}'), k = String(b.p_name || '').trim().toLowerCase(), cur = db.get(k); calls.push([m[1], k, !!b.p_legacy]); let out;
    if (m[1] === 'name_free') out = !cur || cur === b.p_owner;
    else if (cur && cur !== b.p_owner && !(cur === '__reserved__' && k === 'et' && b.p_legacy)) out = 'taken';
    else { for (const [kk, o] of db) if (o === b.p_owner) db.delete(kk); db.set(k, b.p_owner); out = 'ok'; }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) }); };
  const o = await open({ phone: true, start: true, w: 412, h: 915, supa }); const { page, errors } = o; page.setDefaultTimeout(120000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const tap = async sel => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  const type = async n => { await page.waitForSelector('#gaIn'); await tap('#gaIn'); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); if (n) await page.keyboard.type(n); await page.waitForTimeout(2600); };
  const ui = () => page.evaluate(() => ({ go: !document.getElementById('gaGo').hidden, hint: document.getElementById('gaHint').hidden ? '' : document.getElementById('gaHint').textContent }));
  await page.waitForTimeout(1500);
  await type('Zara'); let u = await ui(); chk(!u.go && u.hint === 'Name taken', 'a taken name hides PLAY and shows "Name taken" ' + JSON.stringify(u));
  await page.screenshot({ path: 'shots/names_taken_phone.png' });
  await type('zARA'); u = await ui(); chk(!u.go && u.hint === 'Name taken', 'matching is case-insensitive (zARA) ' + JSON.stringify(u));
  await type('ET'); u = await ui(); chk(!u.go && u.hint === 'Name taken', 'ET is reserved for a brand-new player ' + JSON.stringify(u));
  await type('Bob'); u = await ui(); chk(u.go && !u.hint, 'a free name shows PLAY ' + JSON.stringify(u));
  await tap('#gaGo'); await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1500);
  chk(db.get('bob') === await page.evaluate(() => window.__gaNames.owner), 'PLAY claims the name for this device (owner = neonarcade.nameKey)');
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 }); await page.waitForTimeout(1500);
  await type('BOB'); u = await ui(); chk(u.go, 'the same owner can reuse their name (BOB after reload) ' + JSON.stringify(u));
  await type('Zed'); await tap('#gaGo'); await page.waitForTimeout(2500); chk(db.get('zed') && !db.has('bob'), 'renaming releases the old name ' + JSON.stringify([...db.keys()]));
  // grandfathered ET: a device that had ET saved before this update
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'ET', hat: 'cap' })); });
  await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 }); await page.waitForTimeout(2500);
  const lg = await page.evaluate(() => [window.__gaNames.legacy, window.__gaNames.owner]);
  chk(lg[0] === 'et' && db.get('et') === lg[1] && calls.some(c => c[0] === 'claim_name' && c[1] === 'et' && c[2]), 'grandfathered ET (saved before the update) claims ET on first load ' + JSON.stringify(lg));
  await type('ET'); u = await ui(); chk(u.go, 'Dave\'s device can play as ET ' + JSON.stringify(u));
  // a newcomer after that: still taken
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 120000 }); await page.waitForTimeout(1500);
  await type('et'); u = await ui(); chk(!u.go && u.hint === 'Name taken', 'a newcomer typing et after Dave claimed it: taken ' + JSON.stringify(u));
  // offline: Supabase unreachable -> fail open, but players online right now still count
  down = true; await type('Zara'); u = await ui(); chk(u.go, 'Supabase unreachable: fail open (Zara playable) ' + JSON.stringify(u));
  await page.evaluate(() => { window.__mp = Object.assign(window.__mp || {}, { state: 'on', peers: new Map([['p1', { name: 'Kim' }]]) }); });
  await type('kIM'); u = await ui(); chk(!u.go && u.hint === 'Name taken', 'offline fallback: a name online right now (mp presence) is taken ' + JSON.stringify(u));
  await page.screenshot({ path: 'shots/names_online_taken_phone.png' });
  chk(!errors.filter(e => !/net::ERR_FAILED|Failed to load resource/.test(e)).length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await o.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1); })();
