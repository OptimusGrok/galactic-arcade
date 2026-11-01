# Neon Arcade tools

## Rebuild the playable arcade copies — `tools/rebuild_all_play.py`

Rule: **an original game and its arcade copy always update together.** After changing an original
(`/workspace/strike/strike.html`, `/workspace/ghost256/index.html`) or the injected arcade code, run:

```
python3 tools/rebuild_all_play.py                       # rebuild every *-play copy, then run the tests one at a time
python3 tools/rebuild_all_play.py --no-tests            # rebuild only
python3 tools/rebuild_all_play.py --only strike         # one cabinet
python3 tools/rebuild_all_play.py --publish -m "msg"    # rebuild + tests + commit + push + cmp-verify the live site
```

* **Registry** – `REGISTRY` at the top of the script: `name`, original `source`, `builder`, `out` copy, `tests`.
  Adding a cabinet (e.g. BERSERKER) = write `tools_build_berserker_play.py` and add one entry.
* **Builders** (`tools_build_play.py`, `tools_build_ghost_play.py`) read the original and write ONLY the copy.
  Tickets (`tools_*_tickets.js`, `tools_ticket_art.js`), demo/attract (`tools_*_demo.js`) and the credit rules
  exist only in the copy; the original is hashed before/after and checked for arcade-only code.
* **Hooks** – every anchor string and every original function the injected code wraps goes through
  `tools/hooks.py` (`inject` / `require` / `verify`). If one stops matching, the build stops with
  `HOOK BROKEN [game] hook-name: …` and exit code 2, and the copy is not written — a copy without tickets can't ship.
* **Tests** – each entry's own test plus `credits` and `tickets`, desktop then phone, strictly one at a time.
  The Strike leaderboard is stubbed in every test (never the live board).
* Exit codes: 2 hook broken · 3 original modified · 4 test failed · 5 push / live verify failed.
