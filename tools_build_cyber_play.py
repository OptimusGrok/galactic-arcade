# Builds cybercity-play/index.html: the playable CYBERCITY for its cabinet, from /workspace/cybercity/cybercity.html (READ ONLY; equals the live page).
# Offline, own storage (every localStorage/sessionStorage key gets the arcade_cyber_ prefix). One credit (10 tickets) = one 15-minute run.
# Tickets drop on battle wins, boss wins, chests, quests and exploring (tools_cyber_arcade.js). Any changed hook exits 2 (tools/hooks.py).
import re, sys, os
here = os.path.dirname(os.path.abspath(__file__)); os.chdir(here)
sys.path.insert(0, 'tools'); from hooks import inject, require, verify, fail
N = 'cyber'
import subprocess
REPO = '/workspace/cybercity'; PIN = '8431b75'   # READ ONLY (RPG); build the pinned commit, note if the working file differs
p = subprocess.run(['git', '-C', REPO, 'show', PIN + ':cybercity.html'], capture_output=True, text=True)
if p.returncode: fail(N, 'source', f'cannot read {PIN}:cybercity.html from {REPO}: {p.stderr.strip()[:120]}')
s = p.stdout
try:
    if open(os.path.join(REPO, 'cybercity.html')).read() != s: sys.stderr.write(f'note [{N}]: {REPO}/cybercity.html differs from {PIN}; building the pinned commit\n')
except OSError: pass
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace("'serviceWorker' in navigator", "false").replace('"serviceWorker" in navigator', 'false')
code = re.sub(r'data:[a-z/+\-]+;base64,[A-Za-z0-9+/=]+', '', s)
urls = [u for u in re.findall(r'https?://[^\s"\'\\)]+', code) if not u.startswith(('http://www.w3.org/',))]
if urls: fail(N, 'offline', f'original now loads {urls[:3]}')
for h, pat in [('demo:Auto', r'A\.enable = function\(\)'), ('demo:startNewGame', r'\nfunction startNewGame\(\)'), ('demo:TitleScene', r'\nfunction TitleScene\(\)'),
               ('demo:setScene', r'\nfunction setScene\('), ('demo:Audio8', r'setMuted'), ('save:saveGame', r'\nfunction saveGame\(\)'), ('anti:Speed', r'Speed\.mode'),
               ('storage:keys', r'"cybercity_autosave"')]:
    require(s, N, h, pat)
# ---- ticket hooks (each anchor must appear exactly once) ----
s = inject(s, N, 'tickets:victory', 'B.phase = "victory";', 'B.phase = "victory"; try { window.__TK && __TK.ev("battle", !!(opts && opts.boss)); } catch (e__) {}')
s = inject(s, N, 'tickets:chest', 'G.flags["chest_" + c.id] = true;', 'G.flags["chest_" + c.id] = true; try { window.__TK && __TK.ev("chest"); } catch (e__) {}')
s = inject(s, N, 'tickets:quest', 'Q.toast("Quest complete: " + q.name);', 'Q.toast("Quest complete: " + q.name); try { window.__TK && __TK.ev("quest"); } catch (e__) {}')
s = inject(s, N, 'tickets:step', 'G.steps++;', 'G.steps++; try { window.__TK && __TK.ev("step"); } catch (e__) {}')
# ---- pause + run timer in the main loop ----
s = inject(s, N, 'pause:frame', 'function frame(ts) {',
  'function frame(ts) { if (window.__CYPAUSE) { last = ts; setTimeout(function () { requestAnimationFrame(frame); }, 200); return; } try { window.__TK && __TK.tick(Math.min(0.25, (ts - last) / 1e3 || 0)); } catch (e__) {}')
# ---- isolated storage: prefix every key used by this frame's realm ----
STORE = ('<script>(function(){var P="arcade_cyber_",S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem,f=function(k){k=String(k);return k.indexOf(P)===0?k:P+k};'
         'S.getItem=function(k){return g.call(this,f(k))};S.setItem=function(k,v){return s.call(this,f(k),v)};S.removeItem=function(k){return r.call(this,f(k))};})();</script>')
# nested Ghost 256 cabinet runs in its own srcdoc realm: rename its keys too
for k in ['ghost256.hi', 'ghost256.mute', 'ghost256.pad']:
    if k not in s: fail(N, 'storage:' + k, 'embedded Ghost 256 key missing')
    s = s.replace(k, 'arcade_cyber_' + k)
GUARD = ('<script>(function(){var OK=function(u){try{return new URL(u,location.href).origin===location.origin}catch(e){return false}};var f0=window.fetch&&window.fetch.bind(window);'
         'window.fetch=function(u,o){return OK(typeof u==="string"?u:u.url)?f0(u,o):Promise.reject(new Error("arcade: off-site request blocked"))};'
         'window.XMLHttpRequest=function(){throw new Error("arcade: XHR disabled")};window.WebSocket=function(){throw new Error("arcade: network disabled")};'
         'window.EventSource=function(){throw new Error("arcade: network disabled")};if(navigator.sendBeacon)navigator.sendBeacon=function(){return false};})();</script>')
if s.count('<head>') < 1: fail(N, 'head', 'no <head>')
s = s.replace('<head>', '<head>' + GUARD + STORE, 1)
# ---- arcade hooks after the boot script ----
j = s.rindex('</body>')
s = s[:j] + '<script>\n' + open('tools_cyber_arcade.js').read() + '\n</script>\n' + s[j:]
verify(s, N, ['window.__TK', 'window.__demo', 'window.__cyber', '__cyberTix', 'arcade_cyber_', '__CYPAUSE', '__TK.ev("battle"', '__TK.ev("chest"', '__TK.ev("quest"', '__TK.ev("step"'])
os.makedirs('cybercity-play', exist_ok=True)
open('cybercity-play/index.html', 'w').write(s)
print('ok', len(s))
