# Builds bb-play/index.html: the playable BURROW BUSTER for machine #13 (room 1 south wall slot 2:4, the old blank G next to SUPER PIP QUEST),
# from Tower Defence's single file /workspace/burrow-buster/index.html (live https://optimusgrok.github.io/burrow-buster/). That folder is
# READ ONLY: this builder only reads it; the original never gets tickets. Arcade copy only: own storage keys (arcade_bb_*), silent attract
# DEMO, 1 gold monkey ticket per round cleared (+3 on every 5th round, max 40 a game), one credit (5 tickets) = one game of 3 lives,
# no free restart on GAME OVER, no service worker, no fullscreen/install buttons. Game controls are unchanged. Rerun on every update.
import re, sys, os, hashlib
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'bb'; SRC = '/workspace/burrow-buster/index.html'
s = open(SRC).read()
sys.stderr.write(f'note [{N}]: source sha1 {hashlib.sha1(s.encode()).hexdigest()[:12]}\n')
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false")
urls = [u for u in re.findall(r'https?://[^\s"\')<]+', s) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('api:startGame', r'function startGame\(o\)'), ('api:update', r'function update\(\)\{G\.frame\+\+'), ('api:afterDeath', r'function afterDeath\(\)'),
               ('api:clear', r"case 'clear':if\(G\.modeT>=150\)\{G\.round\+\+"), ('api:Audio.ok', r'ok\(\)\{return this\.ac'), ('api:In', r'const In=\{keys'),
               ('api:audioUnlock', r'function audioUnlock\(\)'), ('api:BB', r'const BB=\{manual')]:
    require(s, N, h, pat)
s = inject(s, N, 'arcade:no-blur-pause', "addEventListener('blur',()=>{In.keys=[];In.pump=false;In.tdir=null;if(G.mode==='play')G.mode='pause';});",
           "addEventListener('blur',()=>{In.keys=[];In.pump=false;In.tdir=null;});/* arcade copy: the arcade's HOLD pauses instead */")
s = inject(s, N, 'demo:no-hi', 'localStorage.setItem(HI_KEY,hiScore);return;}', 'if(!window.__DEMO)localStorage.setItem(HI_KEY,hiScore);return;}')
keys = {'burrowBusterMute': 'arcade_bb_mute', 'burrowBusterHi': 'arcade_bb_hi'}
found = sorted(set(re.findall(r"'(burrowBuster\w*)'", s)))
if found != sorted(keys): fail(N, 'storage keys', f'unexpected keys {found}')
for k, v in keys.items(): s = s.replace("'" + k + "'", "'" + v + "'")
if re.search(r"localStorage\.(get|set|remove)Item\('(?!arcade_)", s): fail(N, 'storage keys', 'a non-isolated key remains')
s = inject(s, N, 'tickets:art', '<script>\n', '<script>' + open('tools_ticket_art.js').read() + '</script>\n<script>\n')
s = inject(s, N, 'tickets+demo', 'window.BB=BB;\n', 'window.BB=BB;\n' + open('tools_bb_arcade.js').read() + '\n')
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('bb')", 'arcade_bb_hi', 'arcade_bb_mute', 'window.__bb'])
os.makedirs('bb-play', exist_ok=True)
open('bb-play/index.html', 'w').write(s)
print('ok', len(s))
