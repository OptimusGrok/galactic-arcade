# Builds pip-play/index.html: the playable SUPER PIP QUEST for blank cabinet A (slot 1:0, machine #11), from Side Scroller Platform's
# built single file /workspace/platformer/game.html (repo OptimusGrok/super-pip-quest). That folder is READ ONLY: this builder only reads it.
# Arcade copy only: own storage keys (arcade_spq_*), silent attract DEMO, gold monkey tickets per level cleared (+ world-clear bonus),
# one credit (5 tickets) = one run of 5 lives, no free restart on GAME OVER. Game controls are unchanged. Rerun on every Pip update.
import re, sys, os, hashlib
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'pip'; SRC = '/workspace/platformer/game.html'
s = open(SRC).read()
sys.stderr.write(f'note [{N}]: source sha1 {hashlib.sha1(s.encode()).hexdigest()[:12]}\n')
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
urls = [u for u in re.findall(r'https?://[^\s"\')<]+', s) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('api:App', r'const App = \{'), ('api:step', r'  step\(\) \{\n    this\.frame\+\+; const inp = Input\.poll\(\)'), ('api:newGame', r'  newGame\(\) \{'), ('api:continueGame', r'  continueGame\(\) \{'),
               ('api:saveGame', r'  saveGame\(\) \{'), ('api:toMap', r'  toMap\(sel\) \{'), ('api:startLevel', r'  startLevel\(i, fromCk\) \{'), ('api:afterDeath', r'  afterDeath\(i, ck\) \{'),
               ('tickets:levelCleared', r'  levelCleared\(i\) \{'), ('api:freshGame', r'function freshGame\(\)'), ('api:loadSave', r'function loadSave\(\)'), ('api:NLEV', r'const NLEV = 18'),
               ('api:gameover', r"this\.kind = 'gameover'"), ('api:SND', r'const SND = \(\(\) =>'), ('api:Input', r'const Input = \(\(\) =>'), ('api:die', r'this\.app\.afterDeath\(this\.idx'), ('api:cleared', r'this\.app\.levelCleared\(this\.idx\)')]:
    require(s, N, h, pat)
s = inject(s, N, 'arcade:no-fullscreen', 'if (TC.fsTried) return;', 'return; /* arcade copy: never go fullscreen, the arcade frame + its ticket counter / exit stay on top */ if (TC.fsTried) return;')
keys = sorted(set(re.findall(r"'(spq_\w+)'", s)))
if keys != ['spq_audio', 'spq_guide', 'spq_save_v1']: fail(N, 'storage keys', f'unexpected keys {keys}')
for k in keys: s = s.replace("'" + k + "'", "'arcade_" + k + "'")
if re.search(r"localStorage\.(get|set|remove)Item\('(?!arcade_)", s): fail(N, 'storage keys', 'a non-isolated key remains')
s = inject(s, N, 'tickets:art', '<script>\n', '<script>' + open('tools_ticket_art.js').read() + '</script>\n<script>\n')
a = 'window.SPQ = { App, DBG,'
i = s.find(a); 
if i < 0 or s.count(a) != 1: fail(N, 'tickets+demo:end', 'SPQ export not found once')
e = s.index('\n', i) + 1
s = s[:e] + open('tools_pip_arcade.js').read() + '\n' + s[e:]
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('pip')", 'arcade_spq_save_v1', 'arcade_spq_audio', 'window.__pip'])
os.makedirs('pip-play', exist_ok=True)
open('pip-play/index.html', 'w').write(s)
print('ok', len(s))
