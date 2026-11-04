# Builds claw-play/index.html: the playable CLAW MACHINE (#12, free-standing in room 1) from Videos' published
# /workspace/claw-machine-pages/index.html (repo OptimusGrok/claw-machine). That folder is READ ONLY: this builder only reads it.
# Arcade copy only: 1 arcade ticket = 1 credit = one drop (no local free credits), own storage key (arcade_clawMachine.collection),
# silent attract DEMO, prizes unchanged (the original pays no tickets, so the copy pays none). Controls unchanged. Rerun on every claw update.
import re, sys, os, hashlib
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'claw'; SRC = '/workspace/claw-machine-pages/index.html'
s = open(SRC).read()
sys.stderr.write(f'note [{N}]: source sha1 {hashlib.sha1(s.encode()).hexdigest()[:12]}\n')
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
urls = [u for u in re.findall(r'https?://[^\s"\')<]+', s) if not u.startswith('http://www.w3.org/')]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('api:drop', r'function drop\(\)\{unlock\(\);if\(C\.st!==\'idle\'\)return;if\(credits<=0\)'), ('api:C', r'const C=\{x:HOME\.x'), ('api:joy', r'let joy=\{id:null'),
               ('api:toys', r'let balls=\[\],toys=\[\]'), ('api:sCoin', r'const sCoin='), ('api:done', r'toy\.done=1')]:
    require(s, N, h, pat)
s = inject(s, N, 'credits:none', 'wins=0,credits=50;', 'wins=0,credits=0;')
s = s.replace('function drop(){', 'let drop=function(){', 1)
s = inject(s, N, 'drop:end', "if(C.target<.9)tgt=null;}", "if(C.target<.9)tgt=null;};")
s = inject(s, N, 'msg:ticket', "say('OUT OF CREDITS')", "say('INSERT A TICKET')")
keys = sorted(set(re.findall(r"localStorage\.\w+\('([^']+)'", s)))
if keys != ['clawMachine.collection']: fail(N, 'storage keys', f'unexpected keys {keys}')
s = s.replace("'clawMachine.collection'", "'arcade_clawMachine.collection'")
if re.search(r"localStorage\.(get|set|remove)Item\('(?!arcade_)", s): fail(N, 'storage keys', 'a non-isolated key remains')
s = inject(s, N, 'arcade:hooks', '\nwindow.__claw={', '\n' + open('tools_claw_arcade.js').read() + '\nwindow.__claw={')
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__clawA', 'window.__demo', 'arcade_clawMachine.collection', 'credits=0;', 'PLAY GUARD'])
os.makedirs('claw-play', exist_ok=True)
open('claw-play/index.html', 'w').write(s)
print('ok', len(s))
