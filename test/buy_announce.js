// Purchase broadcasts (mocked Supabase Realtime, no network): a successful buy sends event 'buy' with { i, n, item, cost } on the public
// channel; failed / short buys send nothing; a peer that receives 'buy' or an unknown event ignores it without errors; announce() is a
// silent no-op when not connected.   flock /workspace/.browser-test.lock node test/buy_announce.js   (390x700)
const { open } = require('./lib'); const mock = require('./mpmock'); const fs = require('fs');
const CHIEF = /__announce/.test(fs.readFileSync(__dirname + '/../shop.js', 'utf8')) && /__announce/.test(fs.readFileSync(__dirname + '/../player.js', 'utf8'));
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const pages = [], got = { a: [], b: [] };
  async function dev(id) { const o = await open({ phone: true, w: 390, h: 700 }); const p = o.page; p.setDefaultTimeout(60000);
    await p.exposeFunction('__mpRelay', m => { const j = JSON.parse(m); if (j.t === 'b' && j.event !== 'st') got[id[0]].push(j); for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(id => { window.__mpId = id; }, id); await p.addInitScript(mock);
    pages.push(p); await p.reload(); await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && window.__mp.state === 'on', null, { timeout: 90000 }); return o; }
  const A = await dev('aaaa1111'), B = await dev('bbbb2222'), a = A.page, b = B.page;
  const setT = (p, n) => p.evaluate(n => { localStorage.setItem('neonarcade.tickets', String(n)); window.__neonSync(); }, n);
  const buys = () => got.a.filter(m => m.event === 'buy'), last = () => buys().slice(-1)[0], wait = () => a.waitForTimeout(400);
  const name = await a.evaluate(() => window.__mp.name);
  const shape = (m, item, cost) => !!m && m.event === 'buy' && m.payload.i === 'aaaa1111' && m.payload.n === name && m.payload.item === item && m.payload.cost === cost && Object.keys(m.payload).sort().join() === 'cost,i,item,n';
  // golf fee: fail first, then pay
  await setT(a, 3); await a.evaluate(() => window.__minigolf.unlock()); await wait(); chk(buys().length === 0, 'golf shield with 3 tickets: no buy event');
  await setT(a, 12); await a.evaluate(() => window.__minigolf.unlock()); await wait(); chk(shape(last(), 'Mini Golf', 5), 'golf fee sends buy ' + JSON.stringify(last()));
  // hallway shield (10)
  let n0 = buys().length; await setT(a, 4); await a.evaluate(() => { window.__arcade.shield.open = false; window.__arcade.shield.unlock(); }); await wait(); chk(buys().length === n0, 'hallway shield short: no event');
  await setT(a, 20); await a.evaluate(() => { window.__arcade.shield.open = false; window.__arcade.shield.unlock(); }); await wait(); chk(buys().length === n0, 'hallway shield is removed in this build (unlock is free, no spend): no event');
  // kiosk (cash)
  n0 = buys().length; await a.evaluate(() => { window.__kiosk.C.bal = 0; }); await a.evaluate(() => window.__kiosk.buy(0)); await wait(); chk(buys().length === n0, 'kiosk with $0: no event');
  await a.evaluate(() => { window.__kiosk.C.bal = 5; }); await a.evaluate(() => window.__kiosk.buy(1)); await wait(); chk(shape(last(), '60 Tickets', 5), 'kiosk sends buy ' + JSON.stringify(last()));
  if (CHIEF) {
    await a.evaluate(() => window.__arcade.shopReady.then(() => 1));
    const it = await a.evaluate(() => { const s = window.__shop; return s.ITEMS.slice().sort((x, y) => x.price - y.price)[0]; });
    n0 = buys().length; await setT(a, 0); await a.evaluate(id => window.__shop.buy(id), it.id); await wait(); chk(buys().length === n0, 'shop buy with 0 tickets: no event');
    await setT(a, it.price + 5); await a.evaluate(id => window.__shop.buy(id), it.id); await wait(); chk(shape(last(), it.name, it.price), 'shop buy sends buy ' + JSON.stringify(last()));
    await a.evaluate(() => window.__wardrobe.open({ shop: true })); await a.waitForTimeout(800);
    const v = await a.evaluate(() => { const bt = [...document.querySelectorAll('#gaW .gaO.gaNew')].find(x => !x.classList.contains('own')); bt.click(); return bt.dataset.v; });
    await setT(a, 0); await a.evaluate(() => { window.__neonSync(); }); n0 = buys().length; await a.evaluate(() => document.querySelector('#gaWBuyB').click()); await wait(); chk(buys().length === n0, 'wardrobe buy short: no event');
    await setT(a, 50); await a.evaluate(() => { const bt = [...document.querySelectorAll('#gaW .gaO.gaNew')].find(x => !x.classList.contains('own')); bt.click(); bt.click(); }); await a.waitForTimeout(300);
    await a.evaluate(() => { const b = document.querySelector('#gaWBuyB'); b.disabled = false; b.click(); }); await wait();
    chk(!!last() && last().payload.cost > 0 && /\S/.test(last().payload.item) && shape(last(), last().payload.item, last().payload.cost), 'wardrobe buy sends buy ' + JSON.stringify(last()));
  } else console.log('SKIP shop / pool / wardrobe checks: the announce calls are not in Chief\'s shop.js / player.js');
  // receiver side: peer B got them and ignores 'buy' + an unknown event without errors
  await b.evaluate(() => { window.__mpRecv({ t: 'b', event: 'zzz_unknown', payload: { x: 1 } }); window.__mpRecv({ t: 'b', event: 'buy', payload: { i: 'q', n: '<b>x</b>', item: null, cost: 'NaN' } }); });
  await b.waitForTimeout(800); chk(await b.evaluate(() => window.__mp.state === 'on' && window.__arcade.stats.frames > 0), 'peer still fine after buy + unknown events');
  // no-op when not connected
  const off = await a.evaluate(() => { window.__mp.state = 'off'; const r = window.__announce('buy', { item: 'X', cost: 1 }); const r2 = window.__announce(null, null); window.__mp.state = 'on'; return [r, r2]; });
  await wait(); chk(off[0] === false && off[1] === false && !buys().some(m => m.payload.item === 'X'), 'announce() is a silent no-op when not connected');
  for (const [k, o] of [['A', A], ['B', B]]) { const real = o.errors.filter(e => !/Failed to load resource/.test(e)); chk(real.length === 0, 'no page errors on ' + k + ' ' + real.slice(0, 3).join(' | ')); }
  console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await A.close(); await B.close(); process.exit(ok ? 0 : 1); })();
