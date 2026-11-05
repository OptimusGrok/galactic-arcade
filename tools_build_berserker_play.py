# Builds berserker-play/: the playable BERSERKER for its cabinet (index.html + the art / audio it loads, copied from the original).
# Arcade copy only: intro video skipped, own storage keys, silent demo, gold monkey tickets, Viking ticket. One credit covers the
# whole run including the 3 continues; Play again / Title buttons are removed (the arcade goes back to its demo instead).
import re, sys, os, shutil
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'berserker'; SRC = '/workspace/berserker/index.html'; DIR = '/workspace/berserker-pages'   # same index.html as the source; this folder has every asset it loads
s = open(SRC).read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
if re.search(r"https?://(?!www\.w3\.org)", s): fail(N, 'offline', 'original now has a URL')
for h, pat in [('tickets:killE', r'function killE\('), ('tickets:hpdUpd', r'function hpdUpd\('), ('tickets:drawHpd', r'function drawHpd\('), ('tickets:hud', r'function hud\('),
               ('tickets:startStage', r'function startStage\('), ('tickets:newRun', r'function newRun\('), ('viking:stageClear', r'function stageClear\('), ('demo:recordSave', r'function recordSave\('),
               ('demo:doContinue', r'function doContinue\('), ('demo:joystick', r'const J=\{'), ('demo:BTL', r'const BTL=\{\}'), ('credits:togglePause', r'function togglePause\(')]:
    require(s, N, h, pat)
n = s.count("'berserker_")
if n < 8: fail(N, 'storage keys', f"expected >= 8 'berserker_ keys, found {n}")
s = s.replace("'berserker_", "'arcade_berserker_")
if re.search(r"localStorage\.(get|set|remove)Item\('(?!arcade_)", s): fail(N, 'storage keys', 'a non-isolated key remains')
a = "if(!introDone){introDone=1;playIntro(newRun)}else newRun()"   # optional: the original dropped the cutscene in 80b4c25 (Play calls newRun() directly)
if a in s: s = inject(s, N, 'intro:skip', a, "introDone=1;newRun()")
else: print('intro:skip anchor absent (original has no cutscene) - skipped')
a = "master.gain.value=.5;"; s = inject(s, N, 'mute:initAudio', a, a + "if(window.__MUTE)master.gain.value=0;")
s = inject(s, N, 'credits:hide retry', '</head>', '<style>#again,#dtitle,#wtitle{display:none!important}</style></head>')
# silent from the very first line (the demo starts muted; the arcade unmutes when a credit starts a game)
i = s.index("let AC,master"); j = s.rindex('<script>', 0, i)
s = s[:j] + '<script>' + open('tools_ticket_art.js').read() + '</script>\n<script>window.__MUTE=true;(function(){const pl=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(window.__MUTE)this.muted=true;return pl.call(this)}})();</script>\n' + s[j:]
a = 'window.__B={'; s = inject(s, N, 'tickets+demo:closure', a, open('tools_berserker_arcade.js').read() + '\n' + a)
g = open('tools_play_guard.html').read().replace("||x.origin==='https://kfupqtafhaflzaoqtenf.supabase.co'", "")
assert 'supabase' not in g
s = s.replace('<head>', '<head>' + g, 1)
verify(s, N, ['window.__TK', 'window.__demo', 'TicketArt', "TicketArt.collect('berserker')", '__neonViking', 'arcade_berserker_save'])
os.makedirs('berserker-play', exist_ok=True)
assets = sorted(set(re.findall(r"[A-Za-z0-9_]+\.(?:webp|jpg|png|mp3|m4a|mp4)", s)) - {'intro.mp4'})
for f in assets:
    if not os.path.exists(os.path.join(DIR, f)): fail(N, 'asset', f + ' missing in the original folder')
    shutil.copyfile(os.path.join(DIR, f), os.path.join('berserker-play', f))
open('berserker-play/index.html', 'w').write(s)
print('ok', len(s), 'assets', assets)
