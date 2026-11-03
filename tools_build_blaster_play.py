# Builds blaster-play/index.html: the playable BLASTER (1984 tribute) for blank cabinet B (slot 1:1, machine #10), from RPG's
# published single-file game /workspace/blaster/index.html (repo OptimusGrok/blaster @ 5ad4285). That folder is RPG's and READ ONLY:
# this builder only reads it. Arcade copy only: own storage keys (arcade_blaster_*), silent attract DEMO, gold monkey tickets per
# freighter destroyed, one credit (5 tickets) = one run, no free restart on GAME OVER. Game controls are unchanged.
import re, sys, os, hashlib
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'blaster'; SRC = '/workspace/blaster/index.html'
s = open(SRC).read()
sys.stderr.write(f'note [{N}]: source sha1 {hashlib.sha1(s.encode()).hexdigest()[:12]}\n')
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
urls = [u for u in re.findall(r'https?://[^\s"\')]+', s) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('api:start', r'function start\(\)\{'), ('api:step', r'function step\(\)\{'), ('api:hitShip', r'function hitShip\(\)\{'), ('api:S', r'var S=\{mode:'),
               ('api:K', r'var K=\{l:0,r:0,f:0\}'), ('api:beep', r'function beep\(f,d,type,slide\)'), ('api:sl', r'function sl\(\)'), ('api:cv', r"cv=document\.getElementById\('c'\)"),
               ('tickets:win', r"S\.mode='win'"), ('loop', r'while\(acc>=1000/60\)\{step\(\)')]:
    require(s, N, h, pat)
keys = sorted(set(re.findall(r"'(blaster_\w+)'", s)))
if keys != ['blaster_hi', 'blaster_snd']: fail(N, 'storage keys', f'unexpected keys {keys}')
for k in keys: s = s.replace("'" + k + "'", "'arcade_" + k + "'")
if re.search(r"localStorage\.(get|set|remove)Item\('(?!arcade_)", s): fail(N, 'storage keys', 'a non-isolated key remains')
s = inject(s, N, 'tickets:art', '<script>\n', '<script>' + open('tools_ticket_art.js').read() + '</script>\n<script>\n')
a = 'window.__B={S:S,K:K,start:start,step:step,newFreighter:newFreighter};'
s = inject(s, N, 'tickets+demo:end', a, open('tools_blaster_arcade.js').read() + '\n' + a)
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('blaster')", 'arcade_blaster_hi', 'arcade_blaster_snd', 'window.__blaster'])
os.makedirs('blaster-play', exist_ok=True)
open('blaster-play/index.html', 'w').write(s)
print('ok', len(s))
