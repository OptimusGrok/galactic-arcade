# Builds nova-play/index.html: the playable NOVA TETHER for its cabinet, from the published original at commit bde4704 (finger-drag
# version) in /workspace/nova-tether-pages. That repo belongs to Chief of Staff and is READ ONLY here: this builder only reads it
# (git show), never writes. Arcade copy only: own storage keys, no fullscreen / orientation lock inside the cabinet frame,
# silent attract DEMO, gold monkey tickets, one credit (2 tickets) = one run, no free restart on GAME OVER (the arcade returns to its demo).
import re, sys, os, subprocess
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'nova'; REPO = '/workspace/nova-tether-pages'; PIN = 'bde4704'
p = subprocess.run(['git', '-C', REPO, 'show', PIN + ':index.html'], capture_output=True, text=True)
if p.returncode: fail(N, 'source', f'cannot read {PIN}:index.html from {REPO}: {p.stderr.strip()[:120]}')
s = p.stdout
try:
    if open(os.path.join(REPO, 'index.html')).read() != s: sys.stderr.write(f'note [{N}]: {REPO}/index.html differs from {PIN}; building the pinned commit\n')
except OSError: pass
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
code = re.sub(r'data:[a-z/+\-]+[;,][^\'"\s)]*', '', s)
urls = [u for u in re.findall(r'https?://[^\s"\')]+', code) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('tickets:damageEnemy', r'function damageEnemy\(e, d, force\) \{'), ('tickets:dead', r'if \(e\.hp <= 0 && !e\.dead\) \{ e\.dead = 1;'),
               ('tickets:stageClear', r"function stageClear\(\) \{ G\.mode = 'clear';"), ('tickets:bossKills', r'G\.bossKills\+\+'), ('tickets:ETYPES', r'const ETYPES = \{'),
               ('tickets:step', r'function step\(\) \{'), ('tickets:render', r'function render\(\) \{'), ('tickets:addScore', r'function addScore\(n\) \{'),
               ('hud:text', r'function text\(s, x, y, size, col'), ('hud:SC', r'ctx\.setTransform\(SC, 0, 0, SC, 0, 0\)'), ('hud:chip-space', r"ctx\.fillRect\(6, 6, 220, 26\)"),
               ('demo:modes', r"G\.mode === 'over'"), ('demo:newGame', r'function newGame\(\) \{'), ('demo:god', r'if \(NV\.god\) return;'), ('demo:Input', r'const Input = \{ up:0, down:0, left:0, right:0, fire:false'),
               ('demo:Audio', r"const Audio = \{"), ('demo:Music.sync', r'sync\(\) \{'), ('demo:updMuteBtn', r'function updMuteBtn\(\)'), ('demo:clamp', r'const clamp ='),
               ('touch:drag', r'const T = \{ el: document\.getElementById\(.touch.\), stickId: null'), ('touch:start', r"document\.addEventListener\('touchstart'"),
               ('hold:pause', r"if \(G\.mode === 'pause'\) \{ if \(sp\) G\.mode = 'play';"), ('api:NV', r'const NV = window\.NV = \{'), ('api:G', r'G, P, F, enemies, ebullets, bosses')]:
    require(s, N, h, pat)
# own storage keys, isolated from the standalone game
keys = sorted(set(re.findall(r"'(novaTether\w+)'", s)))
if keys != ['novaTetherHi', 'novaTetherMute2']: fail(N, 'storage keys', f'unexpected keys {keys}')
s = s.replace("'novaTetherHi'", "'arcade_nova_hi'").replace("'novaTetherMute2'", "'arcade_nova_mute'")
if re.search(r"localStorage\.(get|set|remove)Item\('(?!arcade_)", s): fail(N, 'storage keys', 'a non-isolated key remains')
# inside the cabinet frame: no fullscreen / orientation lock on first tap, no fullscreen buttons, no rotate banner
s = inject(s, N, 'frame:fs', 'let fsTried = false;', 'let fsTried = true;   // arcade: never go fullscreen from inside the cabinet frame')
s = inject(s, N, 'frame:css', '</style>', '  #bFs,#fsDesk,#rotate{display:none!important}\n</style>')
# TicketArt before the game script; the arcade hooks at the very end of the game script (same scope as G, step, damageEnemy, ...)
s = inject(s, N, 'tickets:art', '<script>\n', '<script>' + open('tools_ticket_art.js').read() + '</script>\n<script>\n')
a = 'buildBossArt(); BG.init(); F.x = P.x + 40; F.y = P.y; seed = 12345;\nrequestAnimationFrame(frame);\n'
s = inject(s, N, 'tickets+demo:end', a, a + open('tools_nova_arcade.js').read() + '\n')
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('nova')", 'arcade_nova_hi', 'arcade_nova_mute', 'window.__nova', 'let fsTried = true'])
os.makedirs('nova-play', exist_ok=True)
open('nova-play/index.html', 'w').write(s)
print('ok', len(s))
