# Builds ds-play/index.html: the playable DEAD SIGNAL for the VR station, from /workspace/dead-signal-pages/index.html (First Person's published
# build = https://optimusgrok.github.io/dead-signal/; READ ONLY here, as is /workspace/deadsignal). Arcade copy only: own storage keys, no RETRY /
# QUIT / RESTART (the arcade's home button ends the run), silent attract DEMO, gold ticket pickups, one credit (5 tickets) = one run.
import re, sys, os
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'ds'; SRC = '/workspace/dead-signal-pages/index.html'
s = open(SRC).read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
code = re.sub(r'data:[a-z/+\-]+[;,][^\'"\s)]*', '', s)
urls = [u for u in re.findall(r'https?://[^\s"\')<]+', code) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('api:G', r'const G=\{state:'), ('api:startLevel', r'function startLevel\(i,lo\)\{'), ('api:updateItems', r'function updateItems\(\)\{'),
               ('api:killEnemy', r'function killEnemy\(e,dmg,src\)\{'), ('api:finishLevel', r'function finishLevel\('), ('api:newGame', r'function newGame\('),
               ('api:introDone', r'function introDone\('), ('api:pauseGame', r'function pauseGame\('), ('api:resumeGame', r'function resumeGame\('),
               ('api:blockedAt', r'function blockedAt\(x,y,r\)'), ('api:S', r'function S\(size,draw\)'), ('api:addS', r'function addS\(f,noEmis\)'),
               ('api:auVol', r'function auVol\(v\)'), ('api:OPT', r'const OPT=\{'), ('api:boss', r'G\.boss=spawnEnemy'), ('ui:buttons', r'id="bRetry"[\s\S]*id="bDeathQuit"')]:
    require(s, N, h, pat)
keys = sorted(set(re.findall(r"'(deadsignal_[\w]+)'", s)))
if keys != ['deadsignal_opts_v1', 'deadsignal_save_v1']: fail(N, 'storage keys', f'unexpected keys {keys}')
s = s.replace("'deadsignal_save_v1'", "'arcade_ds_save'").replace("'deadsignal_opts_v1'", "'arcade_ds_opts'")
css = ('#obj{left:calc(96px + var(--sl))!important;max-width:calc(100vw - 236px)!important}   /* clear of the arcade home + ticket chips */\n'
       '#bRetry,#bDeathQuit,#bRestart,#bQuit,#bEndCredits{display:none!important}\n'
       'html.dsDemo .menu,html.dsDemo .btn,html.dsDemo button,html.dsDemo #rotate{visibility:hidden!important}\n</style>')
s = inject(s, N, 'frame:css', '</style>', css)
s = inject(s, N, 'tickets:art', '<script>', '<script>' + open('tools_ticket_art.js').read() + '</script>\n<script>')
s = inject(s, N, 'tickets+demo:end', "addEventListener('load',boot);", "addEventListener('load',boot);\n" + open('tools_ds_arcade.js').read() + '\nwindow.__TKON=1;\n')
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__dsA', 'window.__demo', 'TicketArt', "TicketArt.collect('ds')", 'arcade_ds_save', 'arcade_ds_opts'])
os.makedirs('ds-play', exist_ok=True)
open('ds-play/index.html', 'w').write(s)
print('ok', len(s))
