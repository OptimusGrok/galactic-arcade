// AUTOSAVE (Dave, t194u): everything autosaves on each player's own device: tickets, Viking tickets, cash, bought prizes, the held
// plush, floor + walls, options and machine credits (play.js, neonarcade.credits) all live in localStorage and survive a reload.
// The 5 save slots (Options) stay as manual extra slots. Only per-run cabinet progress (a half-played run) is cleared on a fresh visit.
(function () {
  var RUN = ['arcade_orc_progress', 'arcade_orc_run', 'arcade_berserker_save', 'arcade_mc_tickets', 'arcade_cyber_cybercity_save', 'arcade_cyber_cybercity_autosave'];
  var LS; try { LS = window.localStorage; } catch (e) {}
  var S = window.__sess = { autosave: true, dirty: false, discarded: [], clean: function () { S.dirty = false; } };
  if (!LS) return;
  var seed = window.__sessSeed; if (seed) for (var q in seed) try { LS.setItem(q, String(seed[q])); } catch (e) {}   // test hook
  RUN.forEach(function (k) { if (LS.getItem(k) !== null) LS.removeItem(k); });
})();
