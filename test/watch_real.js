// t702u: Watch loads the real play game (iframe + __demo) for every Grok cabinet; tickets/localStorage isolated.
const { open } = require('./lib');
const fs = require('fs');
const OUT = '/workspace';
const CABS = [
  ['strike', 'strikeCab'],
  ['ghost', 'ghostCab'],
  ['monkey', 'monkeyCab'],
  ['berserker', 'berserkerCab'],
  ['orc', 'orcCab'],
  ['cyber', 'cyberCab'],
  ['blaster', 'blasterCab'],
  ['pip', 'pipCab'],
  ['bb', 'bbCab'],
  ['nova', 'novaCab'],
];
(async () => {
  const { page, close } = await open({ phone: true, w: 844, h: 390 });
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await page.waitForFunction(() => window.__shop && window.__grokVisit && window.__grokVisit.ready && window.__arcade && window.__arcade.play, null, { timeout: 90000 });
  await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });

  const snapKeys = () => page.evaluate(() => {
    const keys = ['neonarcade.tickets', 'neonarcade.credits', 'neonarcade.vikingTickets', 'galacticarcade.player.name'];
    const o = {};
    for (const k of keys) { try { o[k] = localStorage.getItem(k); } catch (e) { o[k] = 'ERR'; } }
    o._tickets = window.__arcade.play.tickets.total;
    o._all = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o._all[k] = localStorage.getItem(k); } } catch (e) {}
    return o;
  });

  const before = await snapKeys();
  console.log('tickets before', before._tickets);

  const table = [];
  const shotCabs = ['nova', 'strike', 'monkey', 'ghost'];

  for (const [key, prop] of CABS) {
    const row = { key, bot: null, ok: false, changing: false, src: '', err: '' };
    try {
      await page.evaluate(({ prop }) => {
        const V = window.__grokVisit, A = window.__arcade;
        if (V.watchOpen) V.closeWatch();
        V.fast = true; V.fallAt = 1e9;
        V.cab = A[prop];
        if (!V.cab) throw new Error('missing cab ' + prop);
        V.skipTo('play');
        for (let i = 0; i < 24; i++) window.__shop.update(1 / 30);
        window.__savedShopUpdate = window.__savedShopUpdate || window.__shop.update;
        window.__shop.update = function () {};
        V.openWatch();
      }, { prop });
      await page.waitForFunction(() => {
        const fr = document.getElementById('gvWatchFrame');
        try {
          const w = fr && fr.contentWindow;
          return !!(w && (w.__WATCH || w.__DEMO || (w.__demo && w.__demo.on) || w.document.querySelector('canvas')));
        } catch (e) { return false; }
      }, null, { timeout: 20000 });

      // sample pixels over ~10s
      const samples = [];
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(2000);
        const s = await page.evaluate(() => {
          const V = window.__grokVisit;
          const fr = document.getElementById('gvWatchFrame');
          let ink = 0, w = 0, h = 0, demo = false, watch = false, mode = '';
          try {
            const win = fr.contentWindow;
            demo = !!(win.__DEMO || (win.__demo && win.__demo.on));
            watch = !!win.__WATCH;
            const cv = win.document.querySelector('canvas');
            if (cv) {
              w = cv.width; h = cv.height;
              const c = document.createElement('canvas'); c.width = 48; c.height = 27;
              const x = c.getContext('2d'); x.drawImage(cv, 0, 0, 48, 27);
              const d = x.getImageData(0, 0, 48, 27).data;
              for (let i = 0; i < d.length; i += 4) ink += d[i] + d[i + 1] + d[i + 2];
            }
            try { mode = (win.G && win.G.mode) || (win.G && win.G.scene) || (win.G && win.G.state) || ''; } catch (e) {}
          } catch (e) {}
          return { ink, w, h, demo, watch, bot: V.watchBot, src: fr && fr.src, mode };
        });
        samples.push(s);
      }
      row.bot = samples[samples.length - 1].bot;
      row.src = samples[samples.length - 1].src;
      row.demo = samples[samples.length - 1].demo;
      row.watch = samples[samples.length - 1].watch;
      row.canvas = samples[samples.length - 1].w > 0;
      const inks = samples.map(s => s.ink);
      row.changing = inks[inks.length - 1] !== inks[0] || new Set(inks).size > 1;
      row.ok = row.canvas && row.watch && /watch=1/.test(row.src || '') && (row.demo || row.bot);
      console.log(key, JSON.stringify({ bot: row.bot, canvas: row.canvas, changing: row.changing, inks, demo: row.demo, watch: row.watch }));
      chk(row.ok, key + ' real watch game');
      chk(row.changing || row.bot === 'smart', key + ' pixels change or smart bot');

      if (shotCabs.includes(key)) {
        await page.screenshot({ path: OUT + '/watch-real-' + key + '-land.png' });
        console.log('shot', key, fs.statSync(OUT + '/watch-real-' + key + '-land.png').size);
      }
      await page.evaluate(() => { const V = window.__grokVisit; V.closeWatch(); window.__shop.update = window.__savedShopUpdate || window.__shop.update; });
    } catch (e) {
      row.err = String(e && e.message || e);
      console.log('ERR', key, row.err);
      chk(false, key + ' watch');
      try { await page.evaluate(() => { const V = window.__grokVisit; if (V.watchOpen) V.closeWatch(); }); } catch (e2) {}
    }
    table.push(row);
  }

  const after = await snapKeys();
  const sameTickets = before._tickets === after._tickets;
  const sameKeys = ['neonarcade.tickets', 'neonarcade.credits', 'neonarcade.vikingTickets'].every(k => before[k] === after[k]);
  // parent localStorage keys for game saves should be unchanged (watch shim uses memory store)
  let saveDrift = [];
  for (const k of Object.keys(after._all || {})) {
    if (k.startsWith('neonarcade.') || k.startsWith('galacticarcade.') || k.startsWith('arcade_')) {
      if ((before._all || {})[k] !== after._all[k]) saveDrift.push(k);
    }
  }
  console.log('isolation', JSON.stringify({ sameTickets, sameKeys, saveDrift: saveDrift.slice(0, 20), beforeT: before._tickets, afterT: after._tickets }));
  chk(sameTickets && sameKeys, 'tickets/credits unchanged after all watches');
  chk(saveDrift.length === 0, 'no arcade localStorage drift from watch');

  // X returns control: open nova, close, ensure no frame src
  await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade;
    V.cab = A.novaCab; V.skipTo('play'); V.openWatch();
  });
  await page.waitForFunction(() => { const fr = document.getElementById('gvWatchFrame'); return fr && fr.style.display !== 'none' && /watch=1/.test(fr.src || ''); }, null, { timeout: 15000 });
  await page.evaluate(() => document.getElementById('gvWatchX').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  const closed = await page.evaluate(() => {
    const fr = document.getElementById('gvWatchFrame');
    return { on: document.getElementById('gvWatchOv').classList.contains('on'), disp: fr && fr.style.display, bot: window.__grokVisit.watchBot };
  });
  console.log('closed', JSON.stringify(closed));
  chk(!closed.on && closed.disp === 'none', 'X destroys/hides watch iframe');

  fs.writeFileSync(OUT + '/watch-real-table.json', JSON.stringify(table, null, 2));
  await close();
  if (!ok) process.exit(1);
  console.log('ALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
