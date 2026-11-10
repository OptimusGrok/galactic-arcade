# Builds rockfall-play/index.html: the playable ROCKFALL RUSH for machine #14 (room 1 south wall slot 2:3, the old blank F
# between blank E at the south-wall centre and BURROW BUSTER), from RPG's single file /workspace/boulder-dig/index.html
# (live https://optimusgrok.github.io/boulder-dig/, repo OptimusGrok/boulder-dig). That folder is READ ONLY: this builder
# only reads it; the original never gets tickets. Arcade copy only: own storage keys (arcade_rockfall_*), silent attract
# DEMO, 1 gold monkey ticket per 5 diamonds collected + 10 for reaching the open exit (max 40 a credit), one credit
# (5 tickets) = one run of 3 lives, no free restart on GAME OVER / CAVE CLEARED, no fullscreen. Game controls are the
# original's (swipe anywhere / arrows). Rerun on every Rockfall update.
import re, sys, os, hashlib
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'rockfall'; SRC = '/workspace/boulder-dig/index.html'
s = open(SRC).read()
sys.stderr.write(f'note [{N}]: source sha1 {hashlib.sha1(s.encode()).hexdigest()[:12]}\n')
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
urls = [u for u in re.findall(r'https?://[^\s"\')<]+', s) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('api:newGame', r'function newGame\(\)\{S\.score=0;S\.lives=3;resetCave\(\);S\.mode=\'play\';hideOv\(\);\}'),
               ('api:startOrContinue', r"function startOrContinue\(\)\{if\(S\.mode==='title'\|\|S\.mode==='over'\|\|S\.mode==='win'\)"),
               ('api:win', r"function win\(\)\{S\.won=true;S\.mode='win';"),
               ('api:saveHi', r'function saveHi\(\)\{if\(S\.score>S\.hi\)\{S\.hi=S\.score;localStorage\.setItem\('),
               ('api:step', r'function step\(\)\{'),
               ('api:diamond', r'else if\(k===G\)\{S\.got\+\+;'),
               ('api:beep', r'function beep\(f,d,v=\.08,f2\)\{if\(!snd\)return;'),
               ('api:tryFS', r'function tryFS\(\)\{if\(fsTried\)return;'),
               ('api:restartBtn', r"\$\('br'\)\.onclick=\(\)=>\{newGame\(\);\}"),
               ('api:NEED', r'const NEED=75,TIME=300,TPS=8;'),
               ('api:resetCave', r'function resetCave\(\)\{'),
               ('api:G', r'window\.__G=\{get S\(\)\{return S\}')]:
    require(s, N, h, pat)
s = inject(s, N, 'arcade:no-fullscreen', 'function tryFS(){if(fsTried)return;',
           'function tryFS(){return;/* arcade copy: never go fullscreen, the arcade frame + its ticket counter / exit stay on top */if(fsTried)return;')
keys = sorted(set(re.findall(r"'(rockfall_\w+)'", s)))
if keys != ['rockfall_hi', 'rockfall_snd']: fail(N, 'storage keys', f'unexpected keys {keys}')
for k in keys: s = s.replace("'" + k + "'", "'arcade_" + k + "'")
if re.search(r"localStorage\.(get|set|remove)Item\('(?!arcade_)", s): fail(N, 'storage keys', 'a non-isolated key remains')
s = inject(s, N, 'tickets:art', '<script>\n', '<script>' + open('tools_ticket_art.js').read() + '</script>\n<script>\n')
s = inject(s, N, 'tickets+demo', 'window.__G={get S(){return S}',
           open('tools_rockfall_arcade.js').read() + '\nwindow.__G={get S(){return S}')
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head><script src="../watch-shim.js"></script>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('rockfall')", 'arcade_rockfall_hi', 'arcade_rockfall_snd', 'window.__rockfall', 'watch-shim.js'])
os.makedirs('rockfall-play', exist_ok=True)
open('rockfall-play/index.html', 'w').write(s)
print('ok', len(s))
