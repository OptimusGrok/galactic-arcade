# Builds ghost-play/index.html: the playable Ghost 256 for the cabinet. Ghost 256 has no online leaderboard (local BEST only),
# so the play copy may only talk to its own site. One credit = one game: the in-game RETRY is removed (the arcade zooms out instead).
import re, sys
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'ghost'
s = open('/workspace/ghost256/index.html').read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
if re.search(r"https?://", s): fail(N, 'offline', 'original now has a URL')
for h, pat in [('demo:saveHi', r'function saveHi\('), ('demo:decidePlayer', r'function decidePlayer\('), ('demo:update', r'function update\('), ('demo:startGame', r'function startGame\('),
               ('tickets:playStep', r'function playStep\('), ('tickets:drawEnemies', r'function drawEnemies\('), ('tickets:onPlayerTile', r'function onPlayerTile\('), ('credits:togglePause', r'function togglePause\(')]:
    require(s, N, h, pat)
a = "if(G.state==='over'&&G.overT>0.8){startGame();return true;}"; s = inject(s, N, 'credits:no free retry', a, "")
a = "'TAP OR PRESS SPACE TO RETRY'"; s = inject(s, N, 'credits:retry text', a, "'INSERT TICKET TO PLAY AGAIN'")
a = "if(v===1){M.items[idx]=0;addScore(10);Snd.dot();G.dots++;}"; s = inject(s, N, 'tickets:eat', a, a + "else if(v===3){M.items[idx]=0;__TK.eat(idx);}")
a = "if(it===1){cx.fillStyle='#ffcfb0';cx.fillRect(px+3,py+3,2,2);}"; s = inject(s, N, 'tickets:draw', a, a + "else if(it===3)__TK.mark((tx&63)|((ty&63)<<6),px,py);")
a = "    if(trimmed)this.repair();\n  }\n};"; s = inject(s, N, 'tickets:new maze area', a, "    if(trimmed)this.repair();\n    if(window.__TK)__TK.area(nx0,ny0,nx1,ny1);\n  }\n};")
# ticket art is a global helper; the ticket logic runs inside the game's closure (it needs G, M, P, cx ...)
a = '<script>\n(function(){'; s = inject(s, N, 'tickets:art script', a, '<script>' + open('tools_ticket_art.js').read() + '</script>\n' + a)
a = 'window.__ghost={G:G,'; s = inject(s, N, 'tickets+demo:closure', a, open('tools_ghost_tickets.js').read() + '\n' + open('tools_ghost_demo.js').read() + '\n' + a)
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', '__TK.eat', '__TK.area'])
open('ghost-play/index.html', 'w').write(s)
print('ok', len(s))
