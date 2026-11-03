# Builds mr-play/index.html: the playable MARS ROADSTER for its two-seat cabinet, from /workspace/mars-roadster/index.html
# (Chief of Staff's game: READ ONLY here; single offline file = head.part + three.js r149 + game3d.js). Arcade copy only: own storage keys,
# no rotate banner, no RETRY / MENU on the end screen, silent attract DEMO, gold ticket pickups, one credit (5 tickets) = one race.
import re, sys, os
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'roadster'; SRC = '/workspace/mars-roadster/index.html'
s = open(SRC).read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
code = re.sub(r'data:[a-z/+\-]+[;,][^\'"\s)]*', '', s)
urls = [u for u in re.findall(r'https?://[^\s"\')]+', code) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('api:start', r'function start\(\)\{T=build\(route\)'), ('api:step', r'function step\(dt\)\{'), ('api:render', r'function render\(dt\)\{'), ('api:finish', r'function finish\(ok,why\)\{'),
               ('api:K', r'const K=\{l:0'), ('api:st', r"let mode='tt',route=0,st='menu'"), ('api:gaps', r'function gapAt\(z\)'), ('api:CX', r'function CX\(z\)'), ('api:muted', r"let AC=null,muted="),
               ('api:S', r"let S=\{parts:0"), ('api:end', r'applySkin\(\);show\(\);requestAnimationFrame\(loop\);\n</script>')]:
    require(s, N, h, pat)
keys = sorted(set(re.findall(r"'(marsroadster\.[\w.]+)'", s)))
if keys != ['marsroadster.mute', 'marsroadster.save.v1']: fail(N, 'storage keys', f'unexpected keys {keys}')
s = s.replace("'marsroadster.mute'", "'arcade_mr_mute'").replace("'marsroadster.save.v1'", "'arcade_mr_save'")
s = inject(s, N, 'frame:css', '</style>', '#rot,#again,#toMenu,#garB{display:none!important}\n</style>')
s = inject(s, N, 'tickets:art', '<canvas id="c"></canvas>', '<script>' + open('tools_ticket_art.js').read() + '</script>\n<canvas id="c"></canvas>')
a = 'applySkin();show();requestAnimationFrame(loop);\n</script>'
s = inject(s, N, 'tickets+demo:end', a, 'applySkin();show();requestAnimationFrame(loop);\n' + open('tools_mr_arcade.js').read() + '\nwindow.__TKON=1;\n</script>')
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('roadster')", 'arcade_mr_save', 'arcade_mr_mute', 'window.__mrA'])
os.makedirs('mr-play', exist_ok=True)
open('mr-play/index.html', 'w').write(s)
print('ok', len(s))
