// ===== GALACTIC ARCADE: DEAD SIGNAL cabinet hooks (injected inside the game's IIFE by tools_build_ds_play.py; the original game is never edited) =====
// 5 tickets = one run. Gold tickets lie on the floor of every level (next to the game's own pickups), some enemies drop one and each cleared
// level pays a bonus: a fair run returns ~15 tickets (about 3 per ticket spent). Each pickup pays 1 ticket via TicketArt.collect('ds').
(function(){
  const PAR = (()=>{ try { return window.parent !== window ? window.parent : null; } catch (e) { return null; } })();
  const DS_A = { perLevel: 6, dropP: 0.12, levelBonus: 2, max: 40, run: 0 };
  // ---- the ticket sprite (the arcade's gold ticket, standing on the floor) ----
  let TSPR = null; const tspr = () => { if (TSPR != null && SPR[TSPR]) return TSPR; try { return TSPR = addS(S(64, (x, e) => { x.save(); x.translate(12, 36); TicketArt.paint(x, 40, 26, false); x.restore();
    e.save(); e.translate(12, 36); e.globalAlpha = 0.85; TicketArt.paint(e, 40, 26, false); e.restore(); })); } catch (err) { return TSPR = null; } };   // made on first use (boot builds the game's sprites first)
  function addTicket(x, y) { const spr = tspr(); if (spr == null || DS_A.run >= DS_A.max) return; G.items.push({ c: '$T', x, y, spr, taken: false, arcadeTix: 1 }); }
  function freeNear(x, y) { for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, r = 0.55 + Math.random() * 0.6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (!blockedAt(px, py, 0.3)) return [px, py]; } return null; }
  function scatter() {   // ~6 per level, next to the level's own items (so they sit on the explored path), else on random open floor
    const base = G.items.filter(it => !it.arcadeTix && !it.taken), out = [];
    for (let i = base.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [base[i], base[j]] = [base[j], base[i]]; }
    for (const it of base) { if (out.length >= DS_A.perLevel) break; const p = freeNear(it.x, it.y); if (p) out.push(p); }
    for (let g = 0; out.length < DS_A.perLevel && g < 400; g++) { const x = 1 + Math.random() * (M.w - 2), y = 1 + Math.random() * (M.h - 2); if (!blockedAt(x, y, 0.35)) out.push([x, y]); }
    for (const p of out) addTicket(p[0], p[1]);
  }
  const pay = () => { if (window.__DEMO) return; DS_A.run++; try { TicketArt.collect('ds'); } catch (e) {} };
  // ---- hooks: rebinding the game's own function declarations inside its IIFE ----
  const _start = startLevel; startLevel = function (i) { const r = _start.apply(this, arguments); try { if (!window.__DEMO) scatter(); } catch (e) {} return r; };
  const _upd = updateItems; updateItems = function (dt) {
    try { for (const it of G.items) if (it.arcadeTix && !it.taken && G.P && Math.hypot(it.x - G.P.x, it.y - G.P.y) < 0.6) { it.taken = true; pay(); } } catch (e) {}
    return _upd.apply(this, arguments); };
  const _kill = killEnemy; killEnemy = function (e) { const r = _kill.apply(this, arguments);
    try { if (!window.__DEMO && e && ((e === G.boss) || Math.random() < DS_A.dropP)) { const n = e === G.boss ? 4 : 1; for (let k = 0; k < n; k++) { const p = freeNear(e.x, e.y) || [e.x, e.y]; addTicket(p[0], p[1]); } } } catch (er) {}
    return r; };
  const _fin = finishLevel; finishLevel = function () { const r = _fin.apply(this, arguments); try { for (let k = 0; k < DS_A.levelBonus; k++) pay(); } catch (e) {} return r; };
  // ---- arcade API for play.js ----
  const quiet = on => { try { auVol(on ? 0 : ((OPT && OPT.vol != null) ? OPT.vol : 0.8)); } catch (e) {} try { AU.setMuted && AU.setMuted(on); } catch (e) {} };
  window.__dsA = {
    start() { window.__DEMO = false; document.documentElement.classList.remove('dsDemo'); quiet(false); DS_A.run = 0; newGame(1); try { introDone(); } catch (e) {} },
    scene() { const s = G.state; return (s === 'play' || s === 'reader' || s === 'intro' || s === 'done') ? 'play' : s === 'paused' ? 'play' : (s === 'dead' || s === 'ending') ? 'over' : 'title'; },
    hold() { if (G.state === 'play') { pauseGame(); return true; } return G.state === 'paused'; },
    unhold() { if (G.state === 'paused') resumeGame(); },
    tickets() { return DS_A.run; }, cfg: DS_A,
  };
  window.__gaContinue = {
    can() { return !window.__DEMO && G.state === 'dead'; },
  force() { if (G.state === 'ending') return false; if (G.P) G.P.dead = true; showScreen('death'); return G.state === 'dead'; },
  mark() { if (G.run) G.run.kills = 7; if (G.P) { G.P.x = G.P.x || 0; } return this.snap(); },
    go() {
      if (!this.can()) return false;
      const P = G.P; if (P) { P.dead = false; P.deadT = 0; if (!(P.hp > 0)) P.hp = 100; }
      showScreen('play');
      return G.state === 'play' && G.P && !G.P.dead;
    },
    snap() { const P = G.P || {}; return { hp: P.hp, dead: !!P.dead, state: G.state, x: P.x, y: P.y, kills: G.run && G.run.kills }; }
  };
  window.__demo = { start() { window.__DEMO = true; document.documentElement.classList.add('dsDemo'); quiet(true); }, stop() { document.documentElement.classList.remove('dsDemo'); } };
  window.__dsTest = { addTicket, scatter, pay, near: () => G.items.filter(it => it.arcadeTix && !it.taken) };
})();
