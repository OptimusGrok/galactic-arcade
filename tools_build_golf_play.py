# Builds golf-play/: the GALACTIC GOLF mini golf for the stairs behind the GROK SHOP counter, from Arcade Helper's published build
# /workspace/galactic-golf-pages (READ ONLY here, as is /workspace/galactic-golf). Arcade copy only: first 3 holes, own best-score key,
# no Play again (every visit costs 5 tickets at the shield), each finished hole reports its strokes to the arcade for the ticket payout.
import os, re, sys, shutil
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'golf'; SRC = '/workspace/galactic-golf-pages'; OUT = 'golf-play'; HOLES = 3
idx = open(SRC + '/index.html').read(); g = open(SRC + '/src/game.js').read()
for h, pat in [('api:showScorecard', r"function showScorecard\(last\) \{\n  phase = 'scored';"), ('api:nextHole', r'if \(holeIndex >= 8\) \{ showFinal\(\); return; \}'),
               ('api:final', r'for \(let i = 0; i < 9; i\+\+\)'), ('api:bestKey', r"const BEST_KEY = 'galacticgolf\.best';"), ('ui:btnAgain', r'id="btnAgain"')]:
    require(g + idx, N, h, pat)
code = re.sub(r'data:[a-z/+\-]+[;,][^\'"\s)]*', '', idx + g)
urls = [u for u in re.findall(r'https?://[^\s"\')<`]+', code) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
g = inject(g, N, 'bestKey', "const BEST_KEY = 'galacticgolf.best';", "const BEST_KEY = 'arcade_golf_best'; const GOLF_N = %d;   // arcade copy: first %d holes" % (HOLES, HOLES))
g = inject(g, N, 'pay', "function showScorecard(last) {\n  phase = 'scored';", "function showScorecard(last) {\n  phase = 'scored'; try { if (window.__golfPay) window.__golfPay(last, holeIndex + 1); } catch (e) {}")
g = inject(g, N, 'holes', 'if (holeIndex >= 8) { showFinal(); return; }', 'if (holeIndex >= GOLF_N - 1) { showFinal(); return; }')
g = inject(g, N, 'final', 'for (let i = 0; i < 9; i++)', 'for (let i = 0; i < GOLF_N; i++)')
g = inject(g, N, 'par', 'const totalPar = HOLE_META.reduce(', 'const totalPar = HOLE_META.slice(0, GOLF_N).reduce(')
g = inject(g, N, 'goto', 'goto(i) {', 'goto(i) { i = Math.max(0, Math.min(GOLF_N - 1, i | 0));')
g = inject(g, N, 'api', 'window.__golf = {', 'window.__golf = {\n  get holes() { return GOLF_N; },')
idx = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', idx)
idx = inject(idx, N, 'arcade:js', '</head>', '<script src="./arcade.js"></script>\n</head>')
verify(g, N, ['GOLF_N', '__golfPay', 'arcade_golf_best']); verify(idx, N, ['arcade.js'])
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT + '/src'); os.makedirs(OUT + '/vendor')
for f in os.listdir(SRC + '/src'):
    if f != 'game.js': shutil.copy(SRC + '/src/' + f, OUT + '/src/' + f)
for f in os.listdir(SRC + '/vendor'): shutil.copy(SRC + '/vendor/' + f, OUT + '/vendor/' + f)
open(OUT + '/src/game.js', 'w').write(g); open(OUT + '/index.html', 'w').write(idx); shutil.copy('tools_golf_arcade.js', OUT + '/arcade.js')
print('ok', sorted(os.listdir(OUT + '/src')))
