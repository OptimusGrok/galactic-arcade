# Builds strike-play/index.html: the playable Strike for the cabinet. Same live world leaderboard as the standalone build
# (name entry, submit, board); every other off-site request is blocked by the play guard. Audio + own render loop kept.
import re, sys
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'strike'
s = open('/workspace/strike/strike.html').read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace('<button id="bInstall">INSTALL APP</button>', '')
s = s.replace("'serviceWorker' in navigator", "false")
require(s, N, 'leaderboard url', r"url: 'https://kfupqtafhaflzaoqtenf\.supabase\.co'")
# symbols the injected ticket / demo code wraps or calls
for h, pat in [('tickets:updPlay', r'function updPlay\('), ('tickets:drawItems', r'function drawItems\('), ('tickets:enemies', r'enemies\.items'), ('tickets:sparks', r'function sparks\('),
               ('demo:newGame', r'function newGame\('), ('demo:saveEntry', r'function saveEntry\('), ('demo:botMove', r'Input\.botMove'), ('credits:gameOver', r'function gameOver\('),
               ('credits:pauseGame', r'function pauseGame\('), ('credits:STRIKE.start', r'window\.STRIKE = \{'),
               ('board:renderScores', r'function renderScores\('), ('board:netFetchTop', r'async function netFetchTop\('), ('board:text', r'function text\('), ('board:clearWorld', r'function clearWorld\(')]:
    require(s, N, h, pat)
s = s.replace('<head>', '<head>' + open('tools_play_guard.html').read(), 1)
tk = '<script>' + open('tools_ticket_art.js').read() + '\n' + open('tools_strike_tickets.js').read() + '\n' + open('tools_strike_demo.js').read() + '</script>'
s = inject(s, N, 'tickets+demo script', '</body></html>', tk + '</body></html>')
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', '__neonTicket', 'window.__board'])
open('strike-play/index.html', 'w').write(s)
print('ok', len(s))
