// Options > Floor on a phone: tap every floor tile with touch (portrait + landscape) and check the floor changed and the tile is fully on screen.
// node test/floor_tap.js [url] [land]   (default: local server)
const { chromium } = require('/workspace/burrow-buster/node_modules/playwright');
const URL0 = process.argv[2] && process.argv[2] !== 'local' ? process.argv[2] : null, L = process.argv[3] === 'land';
(async () => { let srv = null, base = URL0; if (!base) { const http = require('http'), fs = require('fs'), path = require('path'), R = path.resolve(__dirname, '..'); srv = http.createServer((q, r) => { let f = path.join(R, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' }); r.end(d); }); }).listen(0); await new Promise(r => srv.on('listening', r)); base = `http://localhost:${srv.address().port}/`; }
  let fail = 0; const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 const ctx = await b.newContext({ viewport: L ? { width: 844, height: 390 } : { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); p.on('pageerror', e => { console.log('ERR', String(e)); fail++; }); p.on('console', m => m.type()==='error' && console.log('CERR', m.text()));
 await p.goto(base + '?cb=' + Date.now()); await p.waitForSelector('#stOpt'); await p.waitForTimeout(3000);
 await p.tap('#stOpt'); await p.waitForTimeout(800);
 for (const f of ['checkers', 'lava', 'carpet', 'neon']) { const el = p.locator(`#flTiles .flT[data-floor="${f}"]`); const bb = await el.boundingBox();
   const top = bb ? await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) : null; }, [bb.x + bb.width / 2, bb.y + bb.height / 2]) : null;
   let err = ''; try { await p.touchscreen.tap(bb.x + bb.width/2, bb.y + bb.height/2); await p.waitForTimeout(1500); } catch (e) { err = e.message.split('\n')[0]; } await p.waitForTimeout(400);
   const now = await p.evaluate(() => [window.__start && window.__start.floor, localStorage.getItem('neonarcade.floor'), document.querySelector('#flTiles .flT.sel').dataset.floor]);
   const vh = L ? 390 : 844, onScreen = bb && bb.y >= 0 && bb.y + bb.height <= vh;
   const ok = now.every(v => v === f) && onScreen && !err; if (!ok) fail++;
   console.log((ok ? 'PASS ' : 'FAIL ') + f, JSON.stringify(bb), 'top:', top, 'now', now, err); }
 await p.screenshot({ path: __dirname + '/../shots/floor_menu_phone' + (L ? '_land' : '') + '.png' }); await b.close(); if (srv) srv.close(); console.log(fail ? 'FAIL' : 'PASS all tiles'); process.exit(fail ? 1 : 0); })();
