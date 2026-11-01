# Builds monkey-play/index.html: the playable Monkey Crossing for its cabinet. Local BEST only, no network.
# One credit = one game (Play again removed). The game's own gold ticket pickups feed the arcade's tickets (1 each, never twice).
import re, sys
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'monkey'
s = open('/workspace/monkey-cross/index.html').read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
if re.search(r"https?://", s): fail(N, 'offline', 'original now has a URL')
for h, pat in [('demo:update', r'function update\('), ('demo:tryMove', r'function tryMove\('), ('demo:findLog', r'function findLog\('), ('demo:isTree', r'function isTree\('), ('demo:setMute', r'function setMute\('), ('demo:ss', r'function ss\(')]:
    require(s, N, h, pat)
# own storage keys, isolated from the standalone game
n = s.count("'mc_")
if n != 8: fail(N, 'storage keys', f"expected 8 'mc_ keys, found {n}")
s = s.replace("'mc_", "'arcade_mc_")
a = "r.tkGot=1;runT2++;totalT++;"; s = inject(s, N, 'tickets:pickup', a, a + "TicketArt.collect('monkey');")
a = "if(state==='over'){if(k===' '||k==='Enter')startGame();return}"; s = inject(s, N, 'credits:no key retry', a, "if(state==='over'){return}")
a = "document.getElementById('again').addEventListener('click',function(e){e.stopPropagation();au();startGame();});"; s = inject(s, N, 'credits:no again button', a, "")
s = inject(s, N, 'credits:hide again', '</head>', '<style>#again{display:none!important}</style></head>')
a = '<script>\n'; i = s.index("'use strict';"); j = s.rindex('<script>', 0, i)
s = s[:j] + '<script>' + open('tools_ticket_art.js').read() + '</script>\n' + s[j:]
a = 'window.__M={'; s = inject(s, N, 'demo:closure', a, open('tools_monkey_demo.js').read() + '\nwindow.__TK=1;\n' + a)
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('monkey')", 'arcade_mc_tickets'])
import os; os.makedirs('monkey-play', exist_ok=True)
open('monkey-play/index.html', 'w').write(s)
print('ok', len(s))
