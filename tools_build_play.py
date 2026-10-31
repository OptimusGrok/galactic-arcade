# Builds strike-play/index.html: the playable Strike for the cabinet. Same live world leaderboard as the standalone build
# (name entry, submit, board); every other off-site request is blocked by the play guard. Audio + own render loop kept.
import re
s = open('/workspace/strike/strike.html').read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace('<button id="bInstall">INSTALL APP</button>', '')
s = s.replace("'serviceWorker' in navigator", "false")
assert "url: 'https://kfupqtafhaflzaoqtenf.supabase.co'" in s
s = s.replace('<head>', '<head>' + open('tools_play_guard.html').read(), 1)
tk = '<script>' + open('tools_ticket_art.js').read() + '\n' + open('tools_strike_tickets.js').read() + '</script>'
assert s.count('</body></html>') == 1; s = s.replace('</body></html>', tk + '</body></html>')
open('strike-play/index.html', 'w').write(s)
print('ok', len(s))
