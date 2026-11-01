#!/usr/bin/env python3
"""Rebuild every arcade *-play copy from its ORIGINAL source, test, and optionally publish + verify live.

Rule: originals and their arcade copies always update together. Run this after any change to an original game
(or to the ticket / credit / demo injection code).

  python3 tools/rebuild_all_play.py                 # rebuild all copies + run the tests one at a time
  python3 tools/rebuild_all_play.py --no-tests      # rebuild only (still fails on any broken hook)
  python3 tools/rebuild_all_play.py --only ghost    # one cabinet
  python3 tools/rebuild_all_play.py --publish -m "msg"   # + commit, push, and cmp-verify the live site

Exit codes: 2 = a ticket/credit/demo hook no longer matches its original (the hook is named, nothing is written),
3 = an original source was modified or contains arcade-only code, 4 = a test failed, 5 = push or live verify failed.
"""
import argparse, hashlib, os, random, subprocess, sys, time, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
LIVE = 'https://optimusgrok.github.io/neon-arcade/'
# ---- registry: one entry per playable cabinet (adding BERSERKER later = one entry + its builder) ----
REGISTRY = [
    dict(name='strike', source='/workspace/strike/strike.html', builder='tools_build_play.py', out='strike-play/index.html', tests=['play']),
    dict(name='ghost', source='/workspace/ghost256/index.html', builder='tools_build_ghost_play.py', out='ghost-play/index.html', tests=['ghostplay']),
]
SHARED_TESTS = ['credits', 'tickets']          # cover every cabinet: demo, INSERT TICKET, credits, in-game tickets
PHONE = True                                   # each test also runs with the 'phone' argument
EXTRA_PUBLISH = ['index.html', 'main.js', 'play.js', 'sw.js', 'ticket-art.js', 'berserkcab.js', 'img/start.webp', 'img/start.jpg']
ARCADE_ONLY = ['TicketArt', '__TK', '__neonTicket', '__demo', 'INSERT TICKET']
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
def die(code, msg): print('FAIL:', msg, file=sys.stderr); sys.exit(code)
def run_test(t, arg=None):
    cmd = ['node', f'test/{t}.js'] + ([arg] if arg else []); label = ' '.join(cmd[1:])
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=900); out = p.stdout + p.stderr
    fails = [l for l in out.splitlines() if l.startswith('FAIL')]
    print(f'  {label}: exit {p.returncode}, {sum(l.startswith('PASS') for l in out.splitlines())} pass, {len(fails)} fail')
    for l in fails: print('    ' + l[:200])
    if p.returncode and not fails:
        for l in [l for l in out.splitlines() if not l.lstrip().startswith('at ')][-8:]: print('    | ' + l[:200])
    return p.returncode == 0
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only'); ap.add_argument('--no-tests', action='store_true'); ap.add_argument('--publish', action='store_true'); ap.add_argument('-m', default='Rebuild arcade play copies')
    a = ap.parse_args(); entries = [e for e in REGISTRY if not a.only or e['name'] == a.only]
    if not entries: die(1, 'no registry entry ' + a.only)
    subprocess.run(['cp', 'tools_ticket_art.js', 'ticket-art.js'], check=True)
    before = {e['source']: sha(e['source']) for e in entries}
    for e in entries:
        print(f'build {e["name"]}: {e["source"]} -> {e["out"]}')
        p = subprocess.run([sys.executable, e['builder']], capture_output=True, text=True)
        sys.stdout.write(p.stdout); sys.stderr.write(p.stderr)
        if p.returncode: die(2, f'{e["name"]}: builder failed (see HOOK BROKEN above); {e["out"]} was NOT written')
        out = open(e['out']).read()
        miss = [m for m in ['TicketArt', '__TK', '__demo', '__neonTicket'] if m not in out]
        if miss: die(2, f'{e["name"]}: copy is missing {miss}')
    for e in entries:
        if sha(e['source']) != before[e['source']]: die(3, f'{e["source"]} changed during the build')
        src = open(e['source']).read(); bad = [m for m in ARCADE_ONLY if m in src]
        if bad: die(3, f'original {e["source"]} contains arcade-only code {bad}')
    print('originals untouched, copies carry tickets + credits + demo')
    if not a.no_tests:
        tests = [t for e in entries for t in e['tests']] + SHARED_TESTS; ok = True
        for t in tests:                                   # strictly one at a time
            for arg in ([None, 'phone'] if PHONE else [None]): ok = run_test(t, arg) and ok
        if not ok: die(4, 'tests failed; not publishing')
    if a.publish:
        files = [e['out'] for e in entries] + EXTRA_PUBLISH
        subprocess.run(['git', 'add', '-A'], check=True)
        if subprocess.run(['git', 'diff', '--cached', '--quiet']).returncode:
            subprocess.run(['git', '-c', 'user.name=OptimusGrok', '-c', 'user.email=OptimusGrok@users.noreply.github.com', 'commit', '-q', '-m', a.m], check=True)
        if subprocess.run(['git', '-c', 'credential.helper=', '-c', 'credential.helper=!/usr/local/bin/gh auth git-credential', 'push', '-q', 'origin', 'HEAD']).returncode: die(5, 'push failed')
        print('pushed', subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip())
        for i in range(40):
            bad = []
            for f in files:
                try: live = urllib.request.urlopen(f'{LIVE}{f}?cb={random.randint(0, 1 << 30)}', timeout=20).read()
                except Exception as ex: bad.append(f + ' ' + str(ex)[:40]); continue
                if live != open(f, 'rb').read(): bad.append(f)
            if not bad: print(f'live verified on try {i + 1}: {len(files)} files match'); return
            print(f'  try {i + 1}: waiting on {bad[:3]}'); time.sleep(15)
        die(5, 'live site did not match after 40 tries')
main()
