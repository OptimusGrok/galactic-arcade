# Builds ghost-demo/index.html: sandboxed, network-free, silent attract copy of Ghost 256 driven by the host page.
import re
s = open('/workspace/ghost256/index.html').read()
s = re.sub(r'<link [^>]*>', '', s)
s = s.replace('window.localStorage', 'window.__memLS').replace("'serviceWorker' in navigator", 'false')
assert 'localStorage' not in s and not re.search(r'https?://', s), re.findall(r'https?://\S+', s)[:3]
guard = open('tools_demo_guard.html').read()
s = s.replace('<head>', '<head>' + guard + '<style>#bar,#pad{display:none!important}</style>', 1)
bot = open('/tmp/ghostbot.js').read()
s = s.replace('</body>', '<script>\n// autopilot (from ghost256/test/run.js)\n' + bot + '\n</script>\n</body>')
open('ghost-demo/index.html', 'w').write(s); print('ok', len(s))
