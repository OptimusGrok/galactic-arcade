# Builds ghost-play/index.html: the playable Ghost 256 for the cabinet. Ghost 256 has no online leaderboard (local BEST only),
# so the play copy may only talk to its own site. One credit = one game: the in-game RETRY is removed (the arcade zooms out instead).
import re
s = open('/workspace/ghost256/index.html').read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
assert not re.search(r"https?://", s)
a = "if(G.state==='over'&&G.overT>0.8){startGame();return true;}"; assert s.count(a) == 1; s = s.replace(a, "")
a = "'TAP OR PRESS SPACE TO RETRY'"; assert s.count(a) == 1; s = s.replace(a, "'INSERT COIN TO PLAY AGAIN'")
a = "if(v===1){M.items[idx]=0;addScore(10);Snd.dot();G.dots++;}"; assert s.count(a) == 1; s = s.replace(a, a + "else if(v===3){M.items[idx]=0;__TK.eat(idx);}")
a = "if(it===1){cx.fillStyle='#ffcfb0';cx.fillRect(px+3,py+3,2,2);}"; assert s.count(a) == 1; s = s.replace(a, a + "else if(it===3)__TK.mark((tx&63)|((ty&63)<<6),px,py);")
a = "    if(trimmed)this.repair();\n  }\n};"; assert s.count(a) == 1; s = s.replace(a, "    if(trimmed)this.repair();\n    if(window.__TK)__TK.area(nx0,ny0,nx1,ny1);\n  }\n};")
# ticket art is a global helper; the ticket logic runs inside the game's closure (it needs G, M, P, cx ...)
a = '<script>\n(function(){'; assert s.count(a) == 1; s = s.replace(a, '<script>' + open('tools_ticket_art.js').read() + '</script>\n' + a)
a = 'window.__ghost={G:G,'; assert s.count(a) == 1; s = s.replace(a, open('tools_ghost_tickets.js').read() + '\n' + a)
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
open('ghost-play/index.html', 'w').write(s)
print('ok', len(s))
