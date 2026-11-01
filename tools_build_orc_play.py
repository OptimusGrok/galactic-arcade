# Builds orc-play/index.html: the playable ORC ATTACK for its cabinet, from the published build /workspace/orc-attack-pages (READ ONLY).
# Same-origin and offline. One credit (3 tickets) = one run (Level 1, the Lava Cave; no retry / next-level / endless buttons).
# Gold tickets drop from kills (rising with the wave), bursts on elite / boss kills and wave clears; each is banked in the arcade at once.
import re, sys, os
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'orc'
s = open('/workspace/orc-attack-pages/index.html').read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
code = re.sub(r'data:[a-z/+\-]+;base64,[A-Za-z0-9+/=]+', '', s)
urls = [u for u in re.findall(r'https?://[^\s"\')]+', code) if not u.startswith(('http://www.w3.org/', 'https://discourse.threejs.org/'))]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('tickets:kill', r'function kill\(e\)'), ('tickets:waves', r'function updateWaves\(dt\)'), ('tickets:isBoss', r'function isBoss\('), ('demo:begin', r'function begin\(endless\)'),
               ('demo:startWave', r'function startWave\(\)'), ('demo:saveBest', r'function saveBest\('), ('demo:recordWin', r'function recordWin\('), ('demo:autoBuild', r'autoBuild\(\)\{'),
               ('demo:fitCam', r'function fitCam\('), ('demo:AU', r'setMuted,isMuted'), ('advance:noAdvance', r'window\.__noAdvance'), ('hold:G', r'const G=\{state:')]:
    require(s, N, h, pat)
# own storage keys, isolated from the standalone game
keys = sorted(set(re.findall(r"'(cs\.\w+|orcattack\.\w+)'", s)))
if keys != ['cs.best', 'cs.muted', 'orcattack.best', 'orcattack.progress']: fail(N, 'storage keys', f'unexpected keys {keys}')
for k in keys: s = s.replace("'" + k + "'", "'arcade_orc_" + k.split('.')[1] + ("_cs" if k.startswith('cs.') else "") + "'")
# lighter on phones (the cabinet game shares the device with nothing else, but keep FPS up)
s = inject(s, N, 'perf:dpr', 'const DPR=Math.min(window.devicePixelRatio||1,IS_TOUCH?1.5:1.75);', 'const DPR=Math.min(window.devicePixelRatio||1,IS_TOUCH?1.0:1.5);')
# TicketArt before the game script; arcade hooks appended at the end of the game script (same scope as G, kill, ...)
a = '<script>// ---- 00_audio.js'; s = inject(s, N, 'tickets:art', a, '<script>' + open('tools_ticket_art.js').read() + '</script>\n' + a)
a = "$('bClearYes').onclick="; i = s.index(a); j = s.index('</script>', i)
s = s[:j] + '\n' + open('tools_orc_arcade.js').read() + '\nwindow.__TK=1;\n' + s[j:]
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('orc')", 'arcade_orc_best', 'window.__orc'])
os.makedirs('orc-play', exist_ok=True)
open('orc-play/index.html', 'w').write(s)
print('ok', len(s))
