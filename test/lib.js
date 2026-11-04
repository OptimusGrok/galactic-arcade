const { chromium } = require('/workspace/burrow-buster/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.GA_ROOT || path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.css': 'text/css', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }); s.listen(0, () => r(s)); }); }
async function open(opts = {}) {
  const srv = await serve();
  const browser = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(opts.phone ? { viewport: { width: opts.w || 390, height: opts.h || 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: opts.w || 1280, height: opts.h || 720 } });
  const page = await ctx.newPage(); const errors = [], requests = [];
  ctx.on('request', r => requests.push(r.url()));
  await ctx.route(/supabase/i, opts.supa || (r => r.abort()));
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (!opts.start) await page.addInitScript(() => { window.__skipStart = 1; });   // only test/start.js sees the start screen
  if (!opts.unloadWarn) await page.addInitScript(() => { window.__noUnloadWarn = 1; });   // tests reload freely; test/nosave.js checks the warning
  if (opts.shieldOpen) await page.addInitScript(() => { window.__sessSeed = Object.assign(window.__sessSeed || {}, { 'neonarcade.shieldOpen': '1' }); });   // hallway tests walk through the doorway
  await page.goto(`http://localhost:${srv.address().port}/index.html`, { timeout: 180000 });
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  await page.evaluate(() => Promise.all([window.__arcade.shopReady, window.__arcade.windowsReady].filter(Boolean).map(p => Promise.resolve(p))));   // t229: shop.js / windows.js load after the first frames
  return { page, errors, requests, close: async () => { await browser.close(); srv.close(); } };
}
// player.js start screen: type a name in #gaIn, tap PLAY (#gaGo); resolves once the start screen is gone
async function play(page, ph, name = 'Tester') { const tap = async sel => { const b = await page.locator(sel).first().boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (ph) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  await page.waitForSelector('#gaIn'); await tap('#gaIn'); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.keyboard.type(name);
  await page.waitForSelector('#gaGo:not([hidden])', { timeout: 20000 }); await tap('#gaGo');
  await page.waitForFunction(() => !document.getElementById('start'), null, { timeout: 8000 }).catch(() => {}); }
module.exports = { open, play };
