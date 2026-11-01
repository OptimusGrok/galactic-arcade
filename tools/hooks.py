# Shared helpers for the *-play builders: every injection anchor and every original-game symbol the injected
# ticket / credit / demo code relies on is checked by name. A mismatch exits non-zero naming the hook, so a
# copy without tickets can never be written.
import re, sys
class HookError(SystemExit): pass
def fail(game, hook, why):
    sys.stderr.write(f'HOOK BROKEN [{game}] {hook}: {why}\n'); raise HookError(2)
def inject(s, game, hook, anchor, repl):
    n = s.count(anchor)
    if n != 1: fail(game, hook, f'anchor found {n}x (need exactly 1): {anchor[:80]!r}')
    return s.replace(anchor, repl)
def require(s, game, hook, pattern):
    if not re.search(pattern, s): fail(game, hook, f'original no longer has {pattern!r}')
def verify(out, game, markers):
    for m in markers:
        if m not in out: fail(game, 'output:' + m, 'built copy is missing it')
