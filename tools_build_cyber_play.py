# Builds cybercity-play/index.html: the playable CYBERCITY for its cabinet, from /workspace/cybercity/cybercity.html (READ ONLY; equals the live page).
# Offline, own storage (every localStorage/sessionStorage key gets the arcade_cyber_ prefix). One credit = the whole game as STAGE 1 (t295u: no run timer, no battle AUTO, big ticket wins for bosses / endings).
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
s = inject(s, N, 'tickets:victory', 'B.phase = "victory";', 'B.phase = "victory"; try { window.__TK && __TK.ev("battle", !!(opts && opts.boss), alive(B.party).length === B.party.length); } catch (e__) {} try { if (!window.__DEMO) { healParty(); G.party.forEach(function (m__) { ["status","poison","sts","ailments"].forEach(function (k__) { if (Array.isArray(m__[k__])) m__[k__] = []; else if (m__[k__] === true) m__[k__] = false; }); }); B.party.forEach(function (u__) { u__.slow = false; u__.poison = false; }); } } catch (e__) {}')
# ---- t295u (Dave): no AUTO in battle (the attract demo uses the game's own field Auto-Runner, not this command) ----
s = inject(s, N, 'noauto:cmds', '"Defend", "Run", "Auto"];', '"Defend", "Run"];')
s = inject(s, N, 'noauto:pick', '} else if (c === "Auto") {', '} else if (c === "Auto" && window.__DEMO) {')
# ---- t295u: STAGE 1 story text (before/after in /workspace/ga-cyber/story.md); every anchor must exist exactly once ----
STORY = [
 ('intro', '''var INTRO_LINES = [
  "Vesper City, 2187. Forty million souls live under one permanent storm.",
  "Helix Dynamics owns the grid, the water, the drones... and the free Mercy Chip in every slum child's skull.",
  "Nyx Okoro runs packages through the Gutters. Her little brother Teo has been asleep for eleven days.",
  "Tonight a Helix voice made her a deal: find the rogue AI called LANTERN, and Teo wakes up.",
  "So three runners step out into the rain..."
];''', '''var INTRO_LINES = [
  "STAGE 1: VESPER. The year is 2187. Forty million people, one storm that never stops.",
  "Helix Dynamics owns the grid, the water, the drones, and the free Mercy Chip in every Gutters kid's skull.",
  "Nyx Okoro runs packages for a living. Her brother Teo hasn't woken up in eleven days.",
  "Tonight a Helix voice offered her a deal: find the rogue AI called LANTERN, and Teo opens his eyes.",
  "Nobody makes Helix an offer back. Three runners step into the rain anyway."
];'''),
 ('bulwark', '"Nyx: Good. Then she doesn\'t know that we know."', '"Nyx: Good. Let her think we\'re the delivery. We\'re the bomb."'),
 ('kestrel', '"LANTERN (comm): The summit lift is yours. Mara is waiting. Whatever you need to do before you go up, do it now. After this, there is no road back down."',
             '"LANTERN (comm): The summit lift is yours. Mara is waiting at the top. Finish what you need down here. Past that lift, there is no road back."'),
 ('end:true', '''She laughs: Saffron's laugh, and her own. Nobody in Vesper has heard it before."]''',
  '''She laughs: Saffron's laugh, and her own. Nobody in Vesper has heard it before."],
    ["night", "Far above the storm, in a Helix boardroom that orbits the world, a red light blinks on. Someone noticed Vesper woke up. STAGE 1 COMPLETE."]'''),
 ('end:good', '''She smiles and does not know why."]''',
  '''She smiles and does not know why."],
    ["night", "Far above the storm, a Helix boardroom logs the blackout. Vesper has cost them a city. They will want it back. STAGE 1 COMPLETE."]'''),
 ('credits', '"THANK YOU FOR PLAYING"];', '"THANK YOU FOR PLAYING", "", "STAGE 1 COMPLETE", "STAGE 2: COMING SOON"];'),
 ('endcard', 'drawText(ctx, "Thank you for playing CYBERCITY", 20, 174, "#7af0ff");', 'drawText(ctx, "Stage 1 complete. Stage 2 is coming.", 20, 174, "#7af0ff");'),
]
for k, a, b in STORY: s = inject(s, N, 'story:' + k, a, b)
_c = '"The array is open. Everything Chorus holds is waiting on a single choice."'
if s.count(_c) != 2: fail(N, 'story:chorus', 'array line count changed')
s = s.replace(_c, '"The array is open. Four hundred thousand minds, waiting on one choice."')
s = inject(s, N, 'story:badend', '''["window", "In all of dark Vesper, one Gutters window is still lit \\u2014 then it goes out. Dr Ayala's clinic light dies. Teo's room is dark."]''',
  '''["window", "In all of dark Vesper, one Gutters window is still lit \\u2014 then it goes out. Dr Ayala's clinic light dies. Teo's room is dark."],
    ["window", "Somewhere above the storm, Helix marks Vesper: PILOT SUCCESSFUL. The other cities are next. STAGE 1 COMPLETE."]''')
if s.count('drawTextBig(ctx, "THE END", 128 - 63,') != 2: fail(N, 'story:theend', 'THE END banner count changed')
s = s.replace('drawTextBig(ctx, "THE END", 128 - 63,', 'drawTextBig(ctx, "STAGE 1 CLEAR", 128 - 117,')
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
