// NO AUTO-SAVE: game progress lives in memory for the session and only reaches storage through SAVE (Options, 5 slots).
// A reload / new visit starts fresh (1 ticket, $5, defaults) unless a slot is LOADed. Settings, save slots, high scores persist.
(function () {
  var PROG = { 'neonarcade.tickets': 1, 'neonarcade.vikingTickets': 1, 'neonarcade.cash': 1, 'neonarcade.kioskPending': 1, 'neonarcade.shieldOpen': 1 };
  // per-run progress the cabinet copies keep (same origin): cleared on every fresh visit so a new session starts fresh
  var RUN = ['arcade_orc_progress', 'arcade_orc_run', 'arcade_berserker_save', 'arcade_mc_tickets', 'arcade_cyber_cybercity_save', 'arcade_cyber_cybercity_autosave'];
  var P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem, LS; try { LS = window.localStorage; } catch (e) {}
  var M = {}, S = window.__sess = { mem: M, dirty: false, quiet: true, discarded: [] };
  addEventListener('load', function () { setTimeout(function () { S.quiet = false; }, 1500); });
  // discard any old auto-saved progress (everyone starts fresh; the save slots are untouched)
  if (LS) for (var k in PROG) { if (g.call(LS, k) !== null) { S.discarded.push(k); r.call(LS, k); } }
  var seed = window.__sessSeed; if (seed) for (var q in seed) if (PROG[q]) M[q] = String(seed[q]);   // test hook
  if (LS) RUN.forEach(function (k) { if (g.call(LS, k) !== null) r.call(LS, k); });
  P.getItem = function (k) { if (this === LS && PROG[k]) return k in M ? M[k] : null; return g.apply(this, arguments); };
  P.setItem = function (k, v) { if (this === LS && PROG[k]) { v = String(v); if (M[k] !== v) { M[k] = v; if (!S.quiet) S.dirty = true; } return; } return s.apply(this, arguments); };
  P.removeItem = function (k) { if (this === LS && PROG[k]) { delete M[k]; return; } return r.apply(this, arguments); };
  S.clean = function () { S.dirty = false; };
  addEventListener('beforeunload', function (e) { if (S.dirty && !window.__noUnloadWarn) { e.preventDefault(); e.returnValue = ''; return ''; } });
})();
