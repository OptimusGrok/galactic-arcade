const { chromium } = require('/workspace/burrow-buster/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); }); s.listen(0, () => r(s)); }); }
async function open(opts = {}) {
  const srv = await serve();
  const browser = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(opts.phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: opts.w || 1280, height: opts.h || 720 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${srv.address().port}/index.html`);
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 });
  return { page, errors, close: async () => { await browser.close(); srv.close(); } };
}
module.exports = { open };
