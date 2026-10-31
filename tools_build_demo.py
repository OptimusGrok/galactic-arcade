# Builds strike-demo/index.html: an offline, network-free, silent attract-mode copy of Strike for the cabinet screen.
import re
s = open('/workspace/strike/strike.html').read()
s = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', s)
s = s.replace('<button id="bInstall">INSTALL APP</button>', '')
s = re.sub(r"url: 'https://[^']*'", "url: ''", s)
s = re.sub(r"key: 'sb_[^']*'", "key: ''", s)
s = s.replace('localStorage', '__memLS')
s = s.replace("'serviceWorker' in navigator", "false")
assert 'supabase' not in s and 'sb_publishable' not in s and 'localStorage' not in s
guard = open('tools_demo_guard.html').read()
s = s.replace('<head>', '<head>' + guard, 1)
open('strike-demo/index.html', 'w').write(s)
print('ok', len(s))
