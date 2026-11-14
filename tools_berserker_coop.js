// BERSERKER (arcade copy) t827u/t830u/t834u/t835u: 2-player online co-op through the arcade's existing multiplayer, set up like Strike.
// Host (cabinet slot 0) simulates both Vikings and the world; the guest sends input and draws the host snapshot.
// Guest predicts its own Viking and interpolates player 1 ~110 ms behind. Messages are capped at one per 70 ms.
// A leaving player sends "bye"; 5 s with no input also drops them. An OUT / left player is not drawn.
// The game continues for the remaining player. Each player scores their own kills and pickups.
// Ability activations (Thor, Berserker rage, Odin) show their visuals and play their sounds on both screens.
// t830u: an OUT or left player can REJOIN the same ongoing game at the current wave for 5 arcade tickets.
// t834u: the remote Viking is a real Y-sorted sprite on both screens (not just HUD state); ability FX render for both players.
// t835u: __gaHudPx reports the P1/P2 stats bottom so the arcade can sit X / option buttons under the HUD on an upright phone.
(function () {
  const C = window.__bzCoop = { role: 'solo', slot: 0, p2on: false, locked: false, peerAt: 0, sent: 0, recv: 0, snaps: 0, joins: 0, rejoins: 0, p2color: '#ff6e14', drawn: { p1: 0, p2: 0 }, left: 0, rejoinCost: 5 };
  const I2 = { x: 0, y: 0, A: 0, D: 0, T: 0, R: 0, O: 0, since: 0, tx: null, ty: null, vx: 0, vy: 0 };
  const AB_KEYS = ['rgReady', 'rgT', 'odReady', 'odT', 'odS', 'odN', 'odAcc', 'odHits', 'odSpawned'];
  const P2ab = { rgReady: 0, rgT: 0, odReady: 0, odT: 0, odS: 0, odN: 0, odAcc: 0, odHits: 0, odSpawned: 0 };
  let ravens2 = [], pax2 = [], P2 = null, snap = null, lastIn = 0, lastSt = 0, lastHost = 0;
  C.P2 = () => P2; C.I2 = I2; C.pax2 = () => pax2;

  function mp() { try { return parent !== window && parent.__mp ? parent.__mp : null; } catch (e) { return null; } }
  function myId() { const M = mp(); return M && M.id; }
  function play() { try { return parent !== window && parent.__arcade && parent.__arcade.play ? parent.__arcade.play : null; } catch (e) { return null; } }
  function tickets() { const Ply = play(); return Ply && Ply.tickets ? (Ply.tickets.total | 0) : 0; }
  function slotNow() {
    const M = mp(); if (!M || M.state !== 'on' || !M.slotOf) return null;
    const sl = M.slotOf('berserker', M.id); return sl ? sl.i : null;
  }
  function names() {
    const out = ['P1', 'P2'], M = mp();
    try {
      const L = M && M.cabPlayers ? M.cabPlayers('berserker') : [];
      for (let i = 0; i < L.length && i < 2; i++) {
        if (L[i] === myId()) {
          let n = M.name; try { n = (JSON.parse(localStorage.getItem('galacticarcade.player') || '{}') || {}).name || n; } catch (e) {}
          out[i] = n || out[i];
        } else {
          const p = M.peers.get(L[i]); out[i] = (p && p.name) || out[i];
        }
      }
    } catch (e) {}
    return out;
  }
  function cabN() { const M = mp(); return (M && M.cabCount) ? M.cabCount('berserker') : 1; }
  function bzPeers() {
    const M = mp(), now = performance.now(), out = [];
    if (!M || !M.berserker || !M.berserker.peers) return out;
    try {
      for (const [pid, r] of M.berserker.peers) {
        if (!r || pid === myId() || now - r.at > 4000) continue;
        out.push({ id: pid, s: r.s, st: r.st || (r.s && r.s.typ === 'st' ? r.s : null), at: r.at });
      }
    } catch (e) {}
    return out;
  }
  function recentHostSnap() {
    const L = bzPeers();
    for (let i = 0; i < L.length; i++) {
      const s = (L[i].s && (L[i].s.typ === 'st' || L[i].s.typ === 'host')) ? L[i].s : L[i].st;
      if (s && (s.typ === 'st' || s.typ === 'host') && L[i].at > (C.endAt || 0)) return s;
    }
    return null;
  }
  function peerLive() {
    if (bzPeers().length) { C.peerAt = performance.now(); return true; }
    if (cabN() >= 2) { C.peerAt = performance.now(); return true; }
    if (C.peerAt) return performance.now() - C.peerAt < 4000;
    return !!(C.locked && C.role === 'host');
  }
  function become(role, slot) {
    const prev = C.role;
    C.role = role; C.slot = slot; C.locked = true;
    if (role === 'guest') {
      C.p2on = true;
      if (prev !== 'guest') { try { sendJoinNow(); } catch (e) {} }
    }
  }
  function sendJoinNow() {
    const M = mp(); if (!M || !M.berserker) return;
    const send = M.berserker.sendNow || M.berserker.send;
    try { send.call(M.berserker, { typ: 'join' }); C.joins++; } catch (e) {}
  }
  function sendHostKeep() {
    const M = mp(); if (!M || !M.berserker) return;
    const send = M.berserker.sendNow || M.berserker.send;
    try { send.call(M.berserker, { typ: 'host', state: (typeof G !== 'undefined' && G.state) || 'play' }); } catch (e) {}
  }
  function refreshRole() {
    const M = mp();
    if (C.locked) {
      if (C.role === 'host') {
        const sl = slotNow();
        if (sl === 1 && cabN() >= 2 && recentHostSnap()) { become('guest', 1); return C.role; }
      }
      if (peerLive()) return C.role;
      C.role = 'solo'; C.locked = false; C.p2on = false; C.slot = 0;
      return C.role;
    }
    if (!M || M.state !== 'on') return C.role;
    if (window.__DEMO || performance.now() - (C.endAt || -1e9) < 8000) return C.role;
    const host = recentHostSnap();
    if (host && C.role !== 'host') { become('guest', 1); return C.role; }
    const sl = slotNow();
    if (sl != null && cabN() >= 2) { become(sl === 0 ? 'host' : 'guest', sl); return C.role; }
    return C.role;
  }

  function freshP(x, y) {
    return { x: x, y: y, r: 12, hp: 100, max: 100, spd: 120, face: 0, weapon: 'axe', owned: { axe: 1 }, combo: 0, atkT: 0, atkCd: 0, comboT: 0, heavyT: 0, hit: {}, blocking: false, dashT: 0, dashCd: 0, inv: 1.2, energy: 0, lvl: 1, xp: 0, xpN: 20, gold: 0, kills: 0, time: 0,
      b: { vit: 0, swift: 0, dmg: 0, pierce: 0, energy: 0 }, hurtT: 0, vx: 0, vy: 0, lives: 5, rage: 0, rgFade: 0, hbT: 0, wwT: 0, wwCd: 0, flip: 0, resp: 0, throwCd: 0, throwT: 0, popT: 0 };
  }
  function resetP2() {
    const near = P ? { x: P.x + 40, y: P.y } : { x: WS / 2 + 40, y: WS / 2 };
    P2 = freshP(near.x, near.y);
    for (const k of AB_KEYS) P2ab[k] = 0;
    ravens2 = []; pax2 = [];
    I2.tx = null; I2.vx = 0; I2.vy = 0; I2.since = 0;
    C.P2obj = P2;
  }
  function swapArr(a, b) {
    const tmp = a.splice(0, a.length);
    a.push.apply(a, b.splice(0, b.length));
    b.push.apply(b, tmp);
  }
  function swapAbil() {
    for (let i = 0; i < AB_KEYS.length; i++) { const k = AB_KEYS[i], t = G[k]; G[k] = P2ab[k]; P2ab[k] = t; }
    swapArr(ravens, ravens2);
  }
  function swapP2() {
    const t = P; P = P2; P2 = t;
    swapAbil();
    C.inP2 = !C.inP2;
  }
  function withP2(fn) {
    swapP2();
    try { return fn(); }
    finally {
      swapP2();
      if (C.needSnap) { C.needSnap = false; sendStateNow(); }
    }
  }

  function packPl(s) {
    if (!s) return null;
    return [+s.x.toFixed(1), +s.y.toFixed(1), +(s.hp || 0).toFixed(1), s.max | 0, +(s.face || 0).toFixed(2),
      s.kills | 0, s.gold | 0, s.lives | 0, s.lvl | 0, +(s.energy || 0).toFixed(1),
      +(s.rage || 0).toFixed(2), s.weapon || 'axe', (s.inv > 0 ? 1 : 0), (s.dashT > 0 ? 1 : 0),
      +(s.vx || 0).toFixed(1), +(s.vy || 0).toFixed(1), (s.flip ? 1 : 0), +(s.atkT || 0).toFixed(2)];
  }
  function unpackPl(a, s) {
    if (!a || !s || a.length < 8) return;
    s.x = +a[0]; s.y = +a[1]; s.hp = +a[2]; s.max = a[3] | 0; s.face = +a[4];
    s.kills = a[5] | 0; s.gold = a[6] | 0; s.lives = a[7] | 0; if (a[8] != null) s.lvl = a[8] | 0;
    if (a[9] != null) s.energy = +a[9]; if (a[10] != null) s.rage = +a[10]; if (a[11]) s.weapon = a[11];
    s.inv = a[12] ? Math.max(s.inv || 0, 0.05) : 0; s.dashT = a[13] ? Math.max(s.dashT || 0, 0.05) : 0;
    if (a[14] != null) s.vx = +a[14]; if (a[15] != null) s.vy = +a[15]; s.flip = !!a[16]; if (a[17] != null) s.atkT = +a[17];
  }
  function packArr(list, n, fn) { const out = []; if (!list) return out; for (let i = 0; i < list.length && out.length < n; i++) { const row = fn(list[i]); if (row) out.push(row); } return out; }
  function packWorld() {
    return {
      e: packArr(ens, 50, e => e && e.hp > 0 ? [e.x | 0, e.y | 0, e.type || 'skeleton', +(e.hp).toFixed(1), +(e.face || 0).toFixed(2), e.flash > 0 ? 1 : 0, e.st | 0] : null),
      sh: packArr(shots, 40, s => s && s.l > 0 ? [s.x | 0, s.y | 0, +(s.vx || 0).toFixed(1), +(s.vy || 0).toFixed(1), +(s.r || 5), s.col || '#ff4040', s.ring ? 1 : 0, +(s.rr || 0).toFixed(1)] : null),
      ax: packArr(pax, 20, t => t && t.l > 0 ? [t.x | 0, t.y | 0, +(t.rot || 0).toFixed(2), t.w || 'axe', t.rg ? 1 : 0, 1] : null).concat(packArr(pax2, 20, t => t && t.l > 0 ? [t.x | 0, t.y | 0, +(t.rot || 0).toFixed(2), t.w || 'axe', t.rg ? 1 : 0, 2] : null)),
      bo: packArr(bolts, 20, b => b && b.l > 0 ? [b.x | 0, b.y | 0, +b.l.toFixed(2)] : null),
      rv: packArr(ravens, 30, r => r ? [r.x | 0, r.y | 0, +(r.a || 0).toFixed(2), +(r.ph || 0).toFixed(2), 1] : null).concat(packArr(ravens2, 30, r => r ? [r.x | 0, r.y | 0, +(r.a || 0).toFixed(2), +(r.ph || 0).toFixed(2), 2] : null)),
      hp: packArr(hpd, 6, h => h && !h.got ? [h.x | 0, h.y | 0] : null),
      cn: packArr(coins, 20, c => c && !c.got ? [c.x | 0, c.y | 0, c.v | 0] : null),
      o: (C.p1out ? 1 : 0) | (C.p2out ? 2 : 0),
      stg: G.stage | 0, seq: G.seqI | 0, wk: G.wK | 0, state: G.state, flash: +(G.flash || 0).toFixed(2),
      ab: { r1: G.rgReady ? 1 : 0, o1: G.odReady ? 1 : 0, os1: +(G.odS || 0).toFixed(2), r2: P2ab.rgReady ? 1 : 0, o2: P2ab.odReady ? 1 : 0, os2: +(P2ab.odS || 0).toFixed(2) }
    };
  }

  const outQ = [];
  function sendImp(o) { outQ.push(o); flushQ(); }
  setInterval(() => { if (outQ.length) flushQ(); }, 100);
  function flushQ() { const M = mp(); if (!M || !M.berserker) return false; while (outQ.length) { if (!M.berserker.send(outQ[0])) return false; outQ.shift(); } return true; }

  const SM = C.sm = { pred: null, lastAct: 0, buf: [], off: null, hx: null, hy: null };
  const INTERP_MS = 110;
  function guestPredict(dt) {
    dt = dt || 1 / 60;
    if (!C.p2on || C.p2out || !P2 || P2.hp <= 0) { SM.pred = null; return; }
    if (!SM.pred) SM.pred = { x: P2.x, y: P2.y };
    let mx = I2.x || 0, my = I2.y || 0;
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    const spd = (P2.spd || 120) * (1 + ((P2.b && P2.b.swift) || 0) * 0.1);
    SM.pred.x = cl(SM.pred.x + mx * spd * dt, P2.r, WS - P2.r);
    SM.pred.y = cl(SM.pred.y + my * spd * dt, P2.r, WS - P2.r);
    if (mx || my) { SM.lastAct = performance.now(); P2.face = Math.atan2(my, mx); }
    else if (SM.hx != null && performance.now() - SM.lastAct > 500) {
      const ex = SM.hx - SM.pred.x, ey = SM.hy - SM.pred.y;
      if (Math.abs(ex) + Math.abs(ey) > 80) { SM.pred.x = SM.hx; SM.pred.y = SM.hy; }
      else if (Math.abs(ex) + Math.abs(ey) > 1.5) { SM.pred.x += ex * 0.08; SM.pred.y += ey * 0.08; }
    }
  }
  function guestPose() {
    if (SM.pred && C.p2on && P2 && !C.p2out && P2.hp > 0) { P2.x = SM.pred.x; P2.y = SM.pred.y; }
    const B = SM.buf; if (!B.length || !P) return;
    const rt = performance.now() - INTERP_MS; let p = B[B.length - 1];
    if (rt <= B[0].t) p = B[0];
    else for (let i = B.length - 2; i >= 0; i--) {
      if (B[i].t <= rt) { const a = B[i], c = B[i + 1]; if (rt < c.t && c.t > a.t) { const f = (rt - a.t) / (c.t - a.t); p = { x: a.x + (c.x - a.x) * f, y: a.y + (c.y - a.y) * f, face: c.face, jump: Math.abs(c.x - a.x) + Math.abs(c.y - a.y) > 90 }; if (p.jump) p = c; } else p = c; break; }
    }
    P.x = p.x; P.y = p.y; if (p.face != null) P.face = p.face;
  }
  function followP2() {
    if (I2.tx == null || !P2 || C.p2out) return;
    I2.since = (I2.since || 0) + 1;
    const ahead = Math.min(I2.since, 6), ex = I2.tx + (I2.vx || 0) * ahead, ey = I2.ty + (I2.vy || 0) * ahead;
    const dx = ex - P2.x, dy = ey - P2.y, d = Math.hypot(dx, dy) || 1;
    I2.x = Math.max(-1, Math.min(1, dx / Math.max(24, d)));
    I2.y = Math.max(-1, Math.min(1, dy / Math.max(24, d)));
    if (d < 6) { I2.x = 0; I2.y = 0; }
  }

  function sendInput() {
    const M = mp(); if (!M || !M.berserker || C.gone) return;
    const now = performance.now(); if (now - lastIn < 72) return;
    if (!flushQ()) return;
    let bits = 0; if (I2.A || BT.A) bits |= 1; if (I2.D || BT.D) bits |= 2; if (I2.T || BTL.T || BT.T) bits |= 4; if (I2.R || BTL.R || BT.R) bits |= 8; if (I2.O || BTL.O || BT.O) bits |= 16;
    const o = { typ: 'in', k: bits, x: +((C.role === 'guest' ? (I2.x || J.x) : I2.x) || 0).toFixed(3), y: +((C.role === 'guest' ? (I2.y || J.y) : I2.y) || 0).toFixed(3) };
    if (C.role === 'guest') { const gx = (J && (J.x || J.y)) ? J : I2; o.x = +(gx.x || 0).toFixed(3); o.y = +(gx.y || 0).toFixed(3); I2.x = gx.x; I2.y = gx.y; }
    if (SM.pred) { o.tx = +SM.pred.x.toFixed(1); o.ty = +SM.pred.y.toFixed(1); }
    if (!M.berserker.send(o)) return;
    lastIn = now; I2.T = I2.R = I2.O = I2.A = I2.D = 0; C.sent++;
  }
  function statePld() {
    return Object.assign({ typ: 'st', ht: Math.round(performance.now()), p: packPl(P), q: packPl(P2), p2: C.p2on ? 1 : 0, n: names() }, packWorld());
  }
  function sendStateNow() {
    const M = mp(); if (!M || !M.berserker) return false;
    const send = M.berserker.sendNow || M.berserker.send;
    if (!send.call(M.berserker, statePld())) return false;
    lastSt = performance.now(); C.sent++; return true;
  }
  let wantSt = false, stTimer = 0;
  function sendState() { wantSt = true; trySendState(false); }
  function trySendState(force) {
    const M = mp(); if (!M || !M.berserker) return;
    const now = performance.now();
    const later = () => { if (!stTimer) stTimer = setTimeout(() => { stTimer = 0; if (wantSt) trySendState(false); }, 82); };
    if (!force && now - lastSt < 80) { later(); return; }
    if (!force && !flushQ()) { later(); return; }
    const send = force ? (M.berserker.sendNow || M.berserker.send) : M.berserker.send;
    if (!send.call(M.berserker, statePld())) { later(); return; }
    lastSt = now; wantSt = false; C.sent++;
  }
  function applySnap(s) {
    if (!s || s.typ !== 'st') return;
    if (s === snap) return;
    snap = s; C.snaps++;
    if (!P2) resetP2();
    unpackPl(s.p, P); unpackPl(s.q, P2);
    { const now = performance.now(), ht = Number.isFinite(+s.ht) ? +s.ht : now, off = now - ht;
      SM.off = SM.off == null ? off : Math.min(off, SM.off + 0.5);
      if (P) { SM.buf.push({ t: ht + SM.off, x: P.x, y: P.y, face: P.face }); if (SM.buf.length > 24) SM.buf.shift(); }
      if (P2) { SM.hx = P2.x; SM.hy = P2.y; } }
    if (s.stg != null && s.stg !== G.stage) { try { startStage(s.stg | 0, 1); } catch (e) {} }
    if (s.seq != null) G.seqI = s.seq | 0;
    if (s.wk != null) G.wK = s.wk | 0;
    if (s.flash) G.flash = +s.flash;
    C.p1out = !!((s.o | 0) & 1); C.p2out = !!((s.o | 0) & 2);
    C.visE = s.e || []; C.visSh = s.sh || []; C.visAx = s.ax || []; C.visBo = s.bo || []; C.visRv = s.rv || []; C.visHp = s.hp || []; C.visCn = s.cn || [];
    applyVis();
    if (s.ab) { G.rgReady = !!s.ab.r1; G.odReady = !!s.ab.o1; G.odS = +s.ab.os1 || 0; P2ab.rgReady = !!s.ab.r2; P2ab.odReady = !!s.ab.o2; P2ab.odS = +s.ab.os2 || 0; }
    C.p2on = s.p2 == null ? true : !!s.p2;
    C.peerAt = performance.now();
    guestPose();
    syncRejoinBtn();
  }
  function applyVis() {
    // rebuild lightweight stand-ins so the existing draw path can run on the guest
    if (C.role !== 'guest') return;
    ens = (C.visE || []).map(a => ({ x: +a[0], y: +a[1], type: a[2] || 'skeleton', hp: +a[3] || 1, face: +a[4] || 0, flash: a[5] ? 0.2 : 0, st: a[6] | 0, r: 12, max: +a[3] || 1 }));
    shots = (C.visSh || []).map(a => ({ x: +a[0], y: +a[1], vx: +a[2] || 0, vy: +a[3] || 0, r: +a[4] || 5, col: a[5] || '#ff4040', ring: !!a[6], rr: +a[7] || 0, l: 1 }));
    const A = C.visAx || []; pax = []; pax2 = [];
    for (let i = 0; i < A.length; i++) { const t = { x: +A[i][0], y: +A[i][1], rot: +A[i][2] || 0, w: A[i][3] || 'axe', rg: !!A[i][4], l: 1, vx: 0, vy: 0, spin: 0, hit: new Set() }; (A[i][5] === 2 ? pax2 : pax).push(t); }
    bolts = (C.visBo || []).map(a => ({ x: +a[0], y: +a[1], l: +a[2] || 0.2 }));
    ravens.length = 0; ravens2.length = 0;
    for (const a of (C.visRv || [])) { const r = { x: +a[0], y: +a[1], a: +a[2] || 0, ph: +a[3] || 0 }; (a[4] === 2 ? ravens2 : ravens).push(r); }
    hpd = (C.visHp || []).map(a => ({ x: +a[0], y: +a[1], t: 0 }));
    coins = (C.visCn || []).map(a => ({ x: +a[0], y: +a[1], v: a[2] | 0, t: 1, vx: 0, vy: 0 }));
  }
  function applyIn(s) {
    if (!s) return;
    I2.A = !!(s.k & 1); I2.D = !!(s.k & 2); I2.T = !!(s.k & 4); I2.R = !!(s.k & 8); I2.O = !!(s.k & 16);
    if (Number.isFinite(+s.tx) && Number.isFinite(+s.ty)) {
      const tx = +s.tx, ty = +s.ty, n = Math.max(1, I2.since || 0);
      if (I2.tx != null && n < 30) { I2.vx = (tx - I2.tx) / n; I2.vy = (ty - I2.ty) / n; } else { I2.vx = 0; I2.vy = 0; }
      I2.tx = tx; I2.ty = ty; I2.since = 0;
    } else {
      I2.tx = null;
      I2.x = Number.isFinite(+s.x) ? +s.x : 0; I2.y = Number.isFinite(+s.y) ? +s.y : 0;
    }
  }

  function playFx(pld) {
    const L = pld && (Array.isArray(pld) ? pld : pld.ev); if (!L || !L.length) return;
    C.fxGot = (C.fxGot || 0) + L.length; C.fxLog = (C.fxLog || []).concat(L);
    for (let i = 0; i < L.length; i++) {
      const e = L[i];
      try {
        if (e.typ === 'thor') { S.thor(); shake = Math.max(shake, 18); G.flash = 0.35; }
        else if (e.typ === 'rage') { if (playBIO()) { noise(0.4, 0.25, 500); tone(80, 0.5, 'sawtooth', 0.1, 50); } else S.roar2(); shake = Math.max(shake, 8); }
        else if (e.typ === 'odin') { noise(0.5, 0.06, 900); tone(520, 0.18, 'sawtooth', 0.04, 300); setTimeout(() => tone(440, 0.2, 'sawtooth', 0.035, 260), 140); }
        else if (e.typ === 'sfx' && e.name && S[e.name]) S[e.name]();
      } catch (err) {}
    }
  }
  function emitFx(typ, who) {
    const ev = [{ typ: typ, who: who || (C.inP2 ? 2 : 1) }];
    C.fxSent = (C.fxSent || 0) + 1; C.fxLog = (C.fxLog || []).concat(ev);
    // both screens hear it: host plays locally (the wrapped fn already did); guest gets the packet
    const M = mp();
    if (M && M.berserker) {
      const send = M.berserker.sendNow || M.berserker.send;
      try { send.call(M.berserker, { typ: 'fx', ev: ev }); } catch (e) { sendImp({ typ: 'fx', ev: ev }); }
    } else sendImp({ typ: 'fx', ev: ev });
    if (C.inP2) C.needSnap = true;
    else sendStateNow();
  }

  function onMsg(pld) {
    if (!pld || pld.i === myId()) return;
    C.recv++; C.peerAt = performance.now();
    if ((pld.typ === 'st' || pld.typ === 'host') && C.role === 'host' && pld.i && String(pld.i) < String(myId() || '')) {
      become('guest', 1);
      sendImp({ typ: 'join' }); C.joins++;
    }
    if (pld.typ === 'bye') { onBye(pld); return; }
    if (pld.typ === 'in' && C.role === 'host') { if (!C.p2on && C.leftAt && C.gid === pld.i && !C.wantRejoin) return; applyIn(pld); C.ins = (C.ins || 0) + 1; if (C.p2on) { C.gid = pld.i; C.gAt = performance.now(); } }
    if (pld.typ === 'st' && C.role === 'guest') { applySnap(pld); C.snapAt = performance.now(); }
    if (pld.typ === 'join' && C.role === 'host') { if (!C.p2on) { rejoinP2(pld.i, { fresh: true }); C.leftBye = false; } C.gid = pld.i; C.gAt = performance.now(); C.joins++; }
    if (pld.typ === 'rejoin' && C.role === 'host') { doHostRejoin(pld); }
    if (pld.typ === 'end' && C.role === 'guest') endGuest('host ended');
    if (pld.typ === 'tk' && C.role === 'guest') { try { if (window.TicketArt && TicketArt.collect) TicketArt.collect('berserker'); } catch (e) {} }
    if (pld.typ === 'fx' && C.role === 'guest') playFx(pld);
  }

  const GUEST_SILENT = 5000;
  function sendBye() {
    if (C.role === 'solo' && !C.p2on) return;
    const M = mp(); if (!M || !M.berserker) return;
    C.gone = true;
    try { (M.berserker.sendNow || M.berserker.send)({ typ: 'bye', r: C.role }); C.byeSent = (C.byeSent || 0) + 1; } catch (e) {}
  }
  function dropP2(why) {
    if (!C.p2on) return;
    C.p2on = false; if (P2) { P2.hp = 0; P2.lives = 0; } pax2 = [];
    C.left++; C.lastLeft = why; C.leftAt = performance.now(); C.leftBye = why === 'bye';
    C.p2out = false;
    if (C.p1out && !window.__DEMO) { C.p1out = false; endCoop(); }
    syncRejoinBtn();
  }
  function blockedAt(x, y, r) {
    r = r || 16;
    try {
      const L = (G.stage === 0 && typeof V !== 'undefined' && V && V.colls) ? V.colls : obs;
      if (!L) return false;
      for (let i = 0; i < L.length; i++) {
        const o = L[i]; if (!o) continue;
        if (Math.hypot((o.x || 0) - x, (o.y || 0) - y) < r + (o.r || 20)) return true;
      }
    } catch (e) {}
    return false;
  }
  function placeNear(s, other) {
    const ox = other ? other.x : (s.x || WS / 2), oy = other ? other.y : (s.y || WS / 2);
    const tries = [[40, 0], [-40, 0], [0, 40], [0, -40], [56, 24], [-56, 24], [48, -32], [-48, -32], [80, 0], [-80, 0], [0, 80], [64, 64]];
    for (let i = 0; i < tries.length; i++) {
      const x = cl(ox + tries[i][0], s.r, WS - s.r), y = cl(oy + tries[i][1], s.r, WS - s.r);
      if (!blockedAt(x, y, (s.r || 12) + 10)) { s.x = x; s.y = y; return; }
    }
    s.x = cl(ox + 40, s.r, WS - s.r); s.y = cl(oy, s.r, WS - s.r);
  }
  function revive(s) {
    s.hp = s.max || 100; s.lives = Math.max(5, s.lives | 0); s.inv = 1.5; s.dashT = 0; s.hurtT = 0; s.rage = 0; s.energy = Math.max(s.energy || 0, 0); s.vx = 0; s.vy = 0;
  }
  function rejoinP2(id, opts) {
    opts = opts || {};
    if (!P2 || opts.fresh) resetP2();
    revive(P2); placeNear(P2, P);
    C.p2on = true; C.p2out = false; C.leftAt = 0; C.leftBye = false; C.gid = id || C.gid; C.gAt = performance.now(); C.gone = false;
    syncRejoinBtn();
  }
  function doHostRejoin(pld) {
    const who = pld.who === 1 ? 1 : 2;
    C.rejoins++; C.lastRejoin = who;
    if (who === 1) {
      C.p1out = false; if (P) { revive(P); placeNear(P, P2); }
    } else {
      if (!C.p2on) rejoinP2(pld.i); else { C.p2out = false; revive(P2); placeNear(P2, P); C.gid = pld.i || C.gid; C.gAt = performance.now(); }
    }
    C.gone = false; C.leftAt = 0; C.leftBye = false;
    syncRejoinBtn();
  }
  function onBye(pld) {
    C.byes = (C.byes || 0) + 1;
    if (C.role === 'host' && C.p2on && (!C.gid || pld.i === C.gid)) dropP2('bye');
    else if (C.role === 'guest' && pld.r !== 'guest') endGuest('host left');
  }
  function hostWatch() {
    if (!C.p2on) return;
    const M = mp(), r = M && M.berserker && M.berserker.peers && C.gid ? M.berserker.peers.get(C.gid) : null;
    const last = Math.max(C.gAt || 0, r && r.s && r.s.typ !== 'bye' ? r.at : 0);
    if (last && performance.now() - last > GUEST_SILENT) dropP2('silent');
  }
  addEventListener('pagehide', sendBye);
  { const _rel = window.__gaRelease; window.__gaRelease = function () { sendBye(); if (_rel) return _rel.apply(this, arguments); }; }
  function hookMp() { const M = mp(); if (M && M.berserker) M.berserker.on = onMsg; }

  function localOut() {
    if (C.role === 'guest') return !!(C.p2out || C.gone || (P2 && P2.hp <= 0 && (P2.lives | 0) <= 0));
    if (C.role === 'host') return !!C.p1out;
    return false;
  }
  function otherStillIn() {
    if (C.role === 'guest') return !C.p1out && P && (P.hp > 0 || (P.lives | 0) > 0) && (C.snapAge || 0) < 4000;
    if (C.role === 'host') return !!(C.p2on && !C.p2out && P2 && P2.hp > 0);
    // demo / returning leaver: a live host snapshot of an ongoing game
    const h = recentHostSnap();
    return !!(h && h.typ === 'st' && (h.state === 'play' || h.state === 'intro' || h.state === 'clear'));
  }
  C.canRejoin = function () {
    if (window.__DEMO && C.role === 'solo') {
      const h = recentHostSnap();
      return !!(h && h.typ === 'st' && (h.state === 'play' || h.state === 'intro' || h.state === 'clear'));
    }
    if (C.role === 'solo' && !C.p2on) return false;
    return localOut() && otherStillIn();
  };
  C.rejoin = function () {
    if (!C.canRejoin()) return false;
    C.rejoinTried = (C.rejoinTried || 0) + 1;
    if (C.role === 'host') {
      C.p1out = false; if (P) { revive(P); placeNear(P, P2); }
      syncRejoinBtn(); return true;
    }
    // guest, or a returning leaver still in demo (role may still be solo until we become guest)
    become('guest', 1);
    C.gone = false; C.p2out = false;
    if (!P2) resetP2();
    revive(P2); if (SM) SM.pred = { x: P2.x, y: P2.y };
    sendImp({ typ: 'rejoin', who: 2 });
    C.rejoins++;
    try { if (window.__DEMO) { __D.stop(); window.__DEMO = false; if (window.__bzMute) window.__bzMute(false); } } catch (e) {}
    if (G.state !== 'play') { try { ov(null); showUI(true); } catch (e) {} G.state = 'play'; }
    syncRejoinBtn();
    return true;
  };
  C.tryRejoin = function () {   // iframe self-serve (in-game button): spend 5 tickets via the arcade, then rejoin
    const Ply = play();
    if (!C.canRejoin()) return false;
    if (tickets() < C.rejoinCost) {
      C.rejoinBlocked = (C.rejoinBlocked || 0) + 1;
      try { if (Ply && Ply.toast) Ply.toast('NEED 5 TICKETS · YOU HAVE ' + tickets()); } catch (e) {}
      syncRejoinBtn(); return false;
    }
    if (Ply && Ply.spend) {
      if (!Ply.spend(C.rejoinCost)) { C.rejoinBlocked = (C.rejoinBlocked || 0) + 1; try { if (Ply.toast) Ply.toast('NEED 5 TICKETS · YOU HAVE ' + tickets()); } catch (e) {} syncRejoinBtn(); return false; }
    }
    const ok = C.rejoin();
    if (!ok && Ply && Ply.addTickets) Ply.addTickets(C.rejoinCost);
    return ok;
  };

  // in-game REJOIN button (visible while you are OUT and the other player is still going)
  const rjCss = document.createElement('style');
  rjCss.textContent = '#bzRejoin{position:fixed;left:50%;top:58%;transform:translate(-50%,-50%);z-index:80;display:none;padding:16px 28px;border-radius:14px;border:3px solid #ffc020;background:#1a0e00ee;color:#fff6d0;font:900 22px/1.15 "Courier New",monospace;letter-spacing:.08em;text-align:center;cursor:pointer;text-shadow:0 0 8px #ffb000,0 0 22px #ff9000;box-shadow:0 0 22px #ffb00099,inset 0 0 18px #ffb00055;pointer-events:auto}'
    + '#bzRejoin.on{display:block}#bzRejoin small{display:block;margin-top:6px;font-size:14px;color:#ffe14a;letter-spacing:.12em}'
    + '#bzRejoin.need{border-color:#666;color:#aaa;text-shadow:none;box-shadow:none;filter:grayscale(.7)}#bzRejoin.need small{color:#aaa}'
    + '#bzOutMsg{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:80;display:none;font:900 20px/1 "Courier New",monospace;color:#ff8080;text-shadow:0 0 10px #400;letter-spacing:.1em;pointer-events:none;text-align:center}'
    + '#bzOutMsg.on{display:block}';
  document.head.appendChild(rjCss);
  const bRj = document.createElement('button'); bRj.id = 'bzRejoin'; bRj.type = 'button'; bRj.innerHTML = 'REJOIN<small>5 TICKETS</small>';
  const outMsg = document.createElement('div'); outMsg.id = 'bzOutMsg'; outMsg.textContent = 'YOU ARE OUT';
  document.body.appendChild(outMsg); document.body.appendChild(bRj);
  bRj.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); C.tryRejoin(); });
  function syncRejoinBtn() {
    const can = C.canRejoin(), afford = tickets() >= C.rejoinCost, showOut = localOut() && (C.role === 'host' || C.role === 'guest');
    bRj.classList.toggle('on', !!can && (C.role !== 'solo' || !window.__DEMO)); // parent demo UI covers the returning-leaver case
    bRj.classList.toggle('need', !!can && !afford);
    outMsg.classList.toggle('on', !!showOut);
    C.rejoinShown = !!can;
    C.rejoinNeed = !!can && !afford;
  }

  function endCoop() {
    sendImp({ typ: 'end' }); C.ended = (C.ended || 0) + 1; C.endAt = performance.now();
    C.p2on = false; C.p1out = false; C.p2out = false;
    try { if (typeof die === 'function' && P && P.hp <= 0) { const _ = null; } } catch (e) {}
    G.state = 'dead'; try { showUI(false); music(false); recordSave(); ov('dead'); } catch (e) {}
    syncRejoinBtn();
  }
  function endGuest(why) {
    if (C.role !== 'guest') return;
    C.lastEnd = why; C.ended = (C.ended || 0) + 1; C.endAt = performance.now();
    const kills = P2 ? P2.kills | 0 : 0;
    C.role = 'solo'; C.locked = false; C.p2on = false; C.slot = 0; snap = null;
    SM.pred = null; SM.buf.length = 0; SM.off = null;
    if (P) P.kills = kills;
    try { G.state = 'dead'; showUI(false); music(false); ov('dead'); } catch (e) {}
    syncRejoinBtn();
  }

  const _die = die;
  die = function () {
    if (C.role === 'host' && C.p2on && !window.__DEMO) {
      if (C.inP2) {
        if (P.lives > 1) { P.lives--; try { respawn(); } catch (e) { P.hp = P.max; P.inv = 1.2; } return; }
        C.p2out = true; P.hp = 0; P.lives = 0; P.inv = 999;
        if (C.p1out) endCoop();
        syncRejoinBtn(); return;
      }
      if (P.lives > 1) { P.lives--; try { respawn(); } catch (e) { P.hp = P.max; P.inv = 1.2; } return; }
      C.p1out = true; P.hp = 0; P.lives = 0; P.inv = 999;
      if (C.p2out || !(P2 && P2.hp > 0)) { endCoop(); return; }
      syncRejoinBtn(); return;
    }
    return _die.apply(this, arguments);
  };

  const _thor = thor, _rage = rageOn, _odin = odinOn;
  thor = function () { if (P.energy < 100) return; _thor.apply(this, arguments); emitFx('thor'); };
  rageOn = function () { if (!G.rgReady || P.rage > 0 || G.state !== 'play') return; _rage.apply(this, arguments); emitFx('rage'); };
  odinOn = function () { if (!G.odReady || G.odS > 0 || G.state !== 'play') return; _odin.apply(this, arguments); emitFx('odin'); };

  const _updE = updEnemy;
  updEnemy = function (e, dt) {
    if (!(C.p2on && C.role === 'host' && !C.inP2)) return _updE(e, dt);
    const a = [];
    if (P && P.hp > 0 && !C.p1out) a.push(P);
    if (P2 && P2.hp > 0 && !C.p2out) a.push(P2);
    if (!a.length) return _updE(e, dt);
    let best = a[0], bd = dist(e, best);
    for (let i = 1; i < a.length; i++) { const d = dist(e, a[i]); if (d < bd) { bd = d; best = a[i]; } }
    if (best === P) return _updE(e, dt);
    const saved = P; P = best; try { return _updE(e, dt); } finally { P = saved; }
  };

  function playerTick(dt, inp) {
    // inp is {x,y,A,D,T,R,O} used in place of J / keys for this Viking
    P.time = (P.time || 0) + dt;
    rageUpd(dt); odinUpd(dt);
    let mx = inp.x || 0, my = inp.y || 0;
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    P.blocking = false;
    if (m > 0.15 && P.atkT <= 0) P.face = Math.atan2(my, mx);
    if (inp.A) { BTL.A = 1; attack(false); }
    if (inp.T) { BTL.T = 1; thor(); }
    if (inp.R) { BTL.R = 1; rageOn(); }
    if (inp.O) { BTL.O = 1; odinOn(); }
    if (inp.D && (P.dashCd <= 0 || P.rage > 0)) { P.dashT = P.rage > 0 ? 0.36 : 0.18; P.dashMax = 3 * (1 - Math.min(0.3, (P.b.swift || 0) * 0.08)); P.dashCd = P.rage > 0 ? 0 : P.dashMax; P.dashA = m > 0.15 ? Math.atan2(my, mx) : P.face; try { S.dash(); } catch (e) {} }
    if (m < 0.15 && P.atkT <= 0) { const n = nearest(); if (n && dist(n, P) < 90) P.face = ang(P, n); }
    wwUpd(dt);
    { const n = nearest();
      const had = P.resp > 0; P.resp = (P.resp || 0) - dt; if (had && P.resp <= 0) { P.popT = 0.22; P.popH = P.thH | 0; }
      if (P.emp) { P.emp[0] -= dt; P.emp[1] -= dt; } P.popT = (P.popT || 0) - dt; P.throwT = (P.throwT || 0) - dt;
      const inHand = P.resp <= 0, melee = n && dist(n, P) < WEAPONS[P.weapon].rng + n.r;
      if (!(P.wwT > 0) && melee && inHand && P.atkCd <= 0 && P.dashT <= 0) { P.face = ang(P, n); attack(false); }
      else if (!(P.wwT > 0) && !melee && n && inHand && P.atkT <= 0 && P.dashT <= 0 && (P.throwCd || 0) <= 0 && dist(n, P) < 1.5 * W / SC) {
        const a = ang(P, n), rng = 1.5 * W / SC, sp = 400; P.face = a;
        P.throwCd = Math.max(0.42, 0.56 * (1 - (P.b.swift || 0) * 0.04)) * (P.rage > 0 ? 0.5 : 1);
        P.resp = 0.35 * (P.rage > 0 ? 0.5 : 1); P.throwT = 0.16;
        const hd = P.hand = (P.hand ?? 1) ^ 1; P.emp = P.emp || [0, 0]; P.emp[hd] = P.resp; P.thH = hd;
        const hp = handPos(hd);
        pax.push({ rg: P.rage > 0, hand: hd, x: hp.x + Math.cos(a) * 3, y: hp.y + Math.sin(a) * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: rng / sp, rot: 0, spin: Math.cos(a) < 0 ? -22 : 22, w: P.weapon, pierce: 1 + (P.b.pierce || 0), hit: new Set(), o: 2 });
        try { axeSnd(0); } catch (e) {}
      }
    }
    for (const t of pax) {
      t.l -= dt; t.x += t.vx * dt; t.y += t.vy * dt; t.rot += dt * t.spin;
      for (const e of ens) {
        if (e.hp <= 0 || t.hit.has(e) || Math.hypot(e.x - t.x, e.y - t.y) > e.r + 5) continue;
        t.hit.add(e);
        hurtE(e, 10 * ({ axe: 1, battle: 1.15, hammer: 1.35, rune: 0.95 }[t.w] || 1) * (1 + (P.b.dmg || 0) * 0.15) * (1 + ((P.lvl || 1) - 1) * 0.08) * (1 + (P.b.pierce || 0) * 0.15) * (t.rg ? 2 : 1), Math.atan2(t.vy, t.vx), t.w === 'hammer' ? 90 : 50, false);
        if (--t.pierce <= 0) { t.l = 0; break; }
      }
      for (const b of obs) if (t.l > 0 && Math.hypot(b.x - t.x, b.y - t.y) < b.r) t.l = 0;
    }
    pax = pax.filter(t => t.l > 0);
    const spd = P.spd * (1 + (P.b.swift || 0) * 0.1) * (P.atkT > 0 ? 0.45 : 1) * (P.slowT > 0 ? 0.55 : 1);
    if (P.dashT > 0) { P.x += Math.cos(P.dashA) * 520 * dt; P.y += Math.sin(P.dashA) * 520 * dt; P.dashT -= dt; }
    else {
      const tx = mx * spd, ty = my * spd, k = 1 - Math.exp(-dt / 0.04);
      P.vx += (tx - P.vx) * k; P.vy += (ty - P.vy) * k;
      if (!tx && !ty && Math.hypot(P.vx, P.vy) < 3) P.vx = P.vy = 0;
      P.x += P.vx * dt; P.y += P.vy * dt;
    }
    if (P.atkT > 0) { const w = WEAPONS[P.weapon], full = P.isHeavy ? w.spd * 2.2 : w.spd; P.atkT -= dt; if (!P.hitDone && P.atkT < full * 0.5) { P.hitDone = true; resolveSwing(); } }
    P.atkCd -= dt; P.comboT -= dt; P.dashCd -= dt; P.inv -= dt; P.hurtT -= dt; P.slowT = (P.slowT || 0) - dt; P.throwCd = (P.throwCd || 0) - dt;
    collideObs(P);
    P.x = cl(P.x, P.r, WS - P.r); P.y = cl(P.y, P.r, WS - P.r);
  }
  function stepP2(dt) {
    if (!C.p2on || C.p2out || !P2 || P2.hp <= 0) return;
    followP2();
    const savedPax = pax; pax = pax2;
    withP2(() => playerTick(dt, I2));
    pax2 = pax; pax = savedPax;
    I2.A = I2.D = I2.T = I2.R = I2.O = 0;
  }
  function pickupsP2() {
    if (!C.p2on || C.p2out || !P2 || P2.hp <= 0) return;
    withP2(() => {
      for (const h of hpd) { if (!h.got && dist(h, P) < P.r + 10) { h.got = 1; const v = Math.round(P.max * 0.1); P.hp = Math.min(P.max, P.hp + v); } }
      hpd = hpd.filter(h => !h.got && h.t < 15);
      for (const c of coins) { const d = dist(c, P); if (!c.got && c.t > 0.4 && d < P.r + 6) { c.got = 1; P.gold += c.v; } }
      coins = coins.filter(c => !c.got && c.t < 25);
      const TK = window.__TK; if (TK && TK.list) {
        for (const k of TK.list) {
          if (!k.got && Math.hypot(k.x - P.x, k.y - P.y) < P.r + 11) {
            k.got = 1; TK.got = (TK.got || 0) + 1; TK.run = (TK.run || 0) + 1;
            try { TicketArt.collect('berserker'); } catch (e) {}
            sendImp({ typ: 'tk' });
          }
        }
        TK.list = TK.list.filter(k => !k.got && k.t < TK.LIFE);
      }
    });
  }
  function hazardsP2(dt) {
    if (!C.p2on || C.p2out || !P2 || P2.hp <= 0) return;
    withP2(() => {
      for (const s of shots) {
        if (s.l <= 0) continue;
        if (s.ring) { if (!s.hit2 && Math.abs(dist(s, P) - s.rr) < 14) { s.hit2 = 1; hurtP(s.dm, ang(s, P)); } continue; }
        if (Math.hypot(s.x - P.x, s.y - P.y) < s.r + P.r) { if (!(P.dashT > 0 || P.inv > 0)) { s.l = 0; if (s.slow) P.slowT = 1.5; hurtP(s.dm, Math.atan2(s.vy, s.vx)); } }
      }
    });
  }

  const _update = update;
  update = function (dt) {
    hookMp(); refreshRole();
    if (window.__DEMO) { if (C.role !== 'solo' || C.p2on) { C.role = 'solo'; C.locked = false; C.p2on = false; } return _update(dt); }
    if (C.role === 'guest') {
      const sa = performance.now() - (C.snapAt || C.peerAt || performance.now());
      C.snapAge = sa;
      if (sa > 10000) { endGuest('host silent'); return; }
      const M = mp(), oth = M && M.berserker && M.berserker.others && M.berserker.others()[0];
      const st = (oth && oth.s && oth.s.typ === 'st') ? oth.s : ((oth && oth.st && oth.st.typ === 'st') ? oth.st : recentHostSnap());
      if (st && st.typ === 'st') applySnap(st);
      guestPredict(dt); guestPose();
      sendInput();
      if (G.state !== 'play' && G.state !== 'pause') G.state = 'play';
      const follow = (C.p2out || !P2) ? P : P2;
      if (follow) { const sP = P; P = follow; try { camFollow(dt); } finally { P = sP; } }
      syncRejoinBtn();
      return;
    }
    _update(dt);
    if (C.role === 'host') {
      if (!C.p2on && performance.now() - (C.endAt || -1e9) > 3000) {
        const pr = bzPeers().find(p => p.s && (p.s.typ === 'in' || p.s.typ === 'join' || p.s.typ === 'rejoin') && p.at > (C.endAt || 0) && p.at > (C.leftAt || 0) + 200);
        if (pr && !(C.leftBye && pr.id === C.gid && pr.s && pr.s.typ !== 'join' && pr.s.typ !== 'rejoin')) {
          if (pr.s.typ === 'rejoin') doHostRejoin(pr.s); else { rejoinP2(pr.id, { fresh: pr.s.typ === 'join' }); C.joins++; }
        }
      }
      hostWatch();
      if (C.p1out && P) { P.hp = 0; P.inv = 999; }
      if (C.p2out && P2) { P2.hp = 0; P2.inv = 999; }
      if (C.p2on && !C.p2out) { stepP2(dt); hazardsP2(dt); pickupsP2(); }
      flushQ();
      if (C.p2on || bzPeers().length) sendState();
      else {
        const M = mp(), now = performance.now();
        if (M && M.berserker && now - lastHost > 400) { lastHost = now; M.berserker.send({ typ: 'host' }); }
      }
      if (C.p1out && P2 && P2.hp > 0) { const sP = P; P = P2; try { camFollow(dt); } finally { P = sP; } }
      syncRejoinBtn();
    }
  };

  function p2Live() { return !!(C.p2on && P2 && !C.p2out && P2.hp > 0); }
  function addP2ToList(list) {
    if (!p2Live() || !list || !list.push) return;
    for (let i = 0; i < list.length; i++) if (list[i] && list[i]._p2) return;
    const t = performance.now() / 1000;
    list.push({ y: P2.y, _p2: 1, f: () => {
      cx.save(); cx.shadowColor = C.p2color; cx.shadowBlur = 14;
      withP2(() => _dpw(t));
      cx.restore();
      C.drawn.p2++;
    } });
  }
  const _draw = draw;
  draw = function () {
    const saved = pax;
    if ((C.p2on || C.role === 'guest') && pax2 && pax2.length) pax = saved.concat(pax2);
    // t834u: insert P2 into the Y-sort list at P2.y so a village house cannot bury the remote Viking
    const _sort = Array.prototype.sort;
    Array.prototype.sort = function (cmp) {
      if (this && this.length && this[0] && typeof this[0].f === 'function' && typeof this[0].y === 'number') addP2ToList(this);
      return _sort.apply(this, arguments);
    };
    try { _draw(); } finally { Array.prototype.sort = _sort; pax = saved; }
    if (C.tracing) { const a = P || { x: 0, y: 0 }, b = P2 || { x: 0, y: 0 }; C.trace.push([performance.now(), +a.x.toFixed(2), +a.y.toFixed(2), +b.x.toFixed(2), +b.y.toFixed(2)]); if (C.trace.length > 3000) C.trace.shift(); }
  };
  C.trace = [];
  const _dpw = drawPlayerW;
  drawPlayerW = function (t) {
    const hide1 = C.p1out || (C.role === 'host' && P && P.hp <= 0 && (P.lives | 0) <= 0 && C.p2on);
    if (!hide1) { _dpw(t); C.drawn.p1++; }
    // P2 is drawn from the Y-sort entry (addP2ToList), at the correct layer
  };
  const _drawRageFx = drawRageFx;
  drawRageFx = function (t) {
    _drawRageFx(t);
    if (p2Live() && P2.rage > 0) withP2(() => _drawRageFx(t));
  };
  const _drawWW = drawWW;
  drawWW = function (t) {
    _drawWW(t);
    if (p2Live() && P2.wwT > 0) withP2(() => _drawWW(t));
  };
  const _drawRavens = drawRavens;
  drawRavens = function (t) {
    _drawRavens(t);
    if (ravens2 && ravens2.length) {
      swapArr(ravens, ravens2);
      try { _drawRavens(t); } finally { swapArr(ravens, ravens2); }
    }
  };

  const _hud = hud;
  hud = function () {
    if (C.role === 'solo' && !C.p2on) return _hud();
    const nm = (snap && snap.n) || names();
    const top = 8 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0) + (window.__gaTop || 0);
    const w = Math.min(160, W * 0.36);
    const row = (pl, ab, x, align) => {
      if (!pl) return;
      cx.textAlign = align;
      cx.font = 'bold 11px Georgia';
      cx.fillStyle = align === 'right' ? '#ffb060' : '#80c8ff';
      cx.fillText(String(nm[align === 'right' ? 1 : 0] || ''), x, top + 2);
      bar(align === 'right' ? x - w : x, top + 8, w, 8, Math.max(0, pl.hp) / (pl.max || 100), '#b3121b');
      bar(align === 'right' ? x - w : x, top + 18, w, 5, (pl.energy || 0) / 100, (pl.energy || 0) >= 100 ? '#bfe0ff' : '#4a7ad0', '#0a1020');
      const rg = pl.rage > 0 ? pl.rage / 20 : (ab && ab.rgReady ? 1 : 0);
      bar(align === 'right' ? x - w : x, top + 25, w, 5, rg, pl.rage > 0 ? '#ff7a10' : '#c85a0a', '#2a1404');
      cx.fillStyle = '#e8dcc8'; cx.font = 'bold 11px Georgia';
      cx.fillText('Lv ' + (pl.lvl | 0) + '  ⚔ ' + (pl.kills | 0) + '  ● ' + (pl.gold | 0) + 'g  L' + Math.max(0, pl.lives | 0), x, top + 44);
      if ((pl.lives | 0) <= 0 && pl.hp <= 0) { cx.fillStyle = '#ff6070'; cx.fillText('OUT', x, top + 56); }
    };
    row(P, { rgReady: G.rgReady }, 10, 'left');
    row(P2, { rgReady: P2ab.rgReady }, W - 10, 'right');
    cx.textAlign = 'left';
    cx.fillStyle = '#c9a96e'; cx.font = 'bold 12px Georgia';
    try { const sg = STAGES[G.stage] && STAGES[G.stage].seq[G.seqI]; cx.fillText(STAGES[G.stage].n + (sg ? ' · Wave ' + (G.seqI + 1) + '/10' : ''), 10, top + 70); } catch (e) {}
    const me = C.role === 'guest' ? P2 : P, ab = C.role === 'guest' ? P2ab : { rgReady: G.rgReady, odReady: G.odReady, odS: G.odS };
    try {
      const b = $('bD'), f = me && me.rage > 0 ? 1 : me && me.dashCd > 0 ? 1 - me.dashCd / (me.dashMax || 3) : 1;
      b.style.setProperty('--f', Math.max(0, Math.min(1, f)).toFixed(3));
      $('thor').style.display = me && me.energy >= 100 ? 'flex' : 'none';
      $('bRg').style.display = ab && ab.rgReady && !(me && me.rage > 0) ? 'flex' : 'none';
      const ob = $('bOd'), on = ab && ab.odReady && !(ab.odS > 0); ob.style.display = on ? 'flex' : 'none'; if (on) drawOdinBtn();
    } catch (e) {}
  };

  function afterStart() {
    hookMp();
    const already = recentHostSnap();
    C.p2on = false; snap = null; resetP2(); C.p1out = false; C.p2out = false; C.snapAt = 0;
    C.gone = false; C.leftAt = 0; C.leftBye = false;
    SM.pred = null; SM.buf.length = 0; SM.off = null; SM.hx = null; SM.hy = null;
    const sl = slotNow();
    // typ:'host' (keepalive before any typ:'st') also means a host is already playing — do not start a second host
    if ((already && (already.typ === 'st' || already.typ === 'host')) || (sl != null && sl > 0 && cabN() >= 2)) {
      become('guest', sl != null ? sl : 1);
      if (already && already.typ === 'st') applySnap(already);
    } else {
      become('host', sl != null ? sl : 0);
      sendHostKeep();
    }
    syncRejoinBtn();
  }
  // t834u: intro / warp / clear skip update(), so keep the host/guest handshake and typ:'host' alive
  function coopNetIntro() {
    hookMp(); refreshRole();
    if (window.__DEMO) return;
    if (C.role === 'guest') {
      const M = mp(), oth = M && M.berserker && M.berserker.others && M.berserker.others()[0];
      const st = (oth && oth.s && oth.s.typ === 'st') ? oth.s : ((oth && oth.st && oth.st.typ === 'st') ? oth.st : recentHostSnap());
      if (st && st.typ === 'st') applySnap(st);
      sendInput();
      return;
    }
    if (C.role === 'host') {
      if (!C.p2on) {
        const pr = bzPeers().find(p => p.s && (p.s.typ === 'in' || p.s.typ === 'join' || p.s.typ === 'rejoin') && p.at > (C.endAt || 0));
        if (pr) {
          if (pr.s.typ === 'rejoin') doHostRejoin(pr.s); else { rejoinP2(pr.id, { fresh: pr.s.typ === 'join' }); C.joins++; }
        }
      }
      if (C.p2on || bzPeers().length) sendState();
      else sendHostKeep();
    }
  }
  const _loop = loop;
  loop = function (now) {
    try { if (!window.__DEMO && G && G.state !== 'play' && G.state !== 'pause') coopNetIntro(); } catch (e) {}
    return _loop.apply(this, arguments);
  };
  const _bz = window.__bz && window.__bz.start;
  if (window.__bz) window.__bz.start = function () { const r = _bz && _bz.apply(this, arguments); afterStart(); return r; };
  const _newRun = newRun;
  newRun = function () { const r = _newRun.apply(this, arguments); if (!window.__DEMO) afterStart(); return r; };

  // t835u: bottom of the P1 / P2 stats in CSS px (frame coords) so the arcade sits X under the left stats
  // and the 3 option buttons (#ui: V / fullscreen / options) directly under the right-side P2 stats.
  window.__gaHudPx = function () {
    try {
      const cv = document.getElementById('c') || document.querySelector('canvas'), r = cv.getBoundingClientRect();
      const top = 8 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0) + (window.__gaTop || 0);
      const coop = !(C.role === 'solo' && !C.p2on);
      const bottom = top + (coop ? 72 : 68);
      return r.top + bottom * (r.height / (H || r.height) || 1);
    } catch (e) { return 0; }
  };
  C.worldToScreen = function (x, y) {
    const sx = W / 2 + (x - cam.x) * SC, sy = H / 2 + (y - cam.y) * SC;
    return { x: sx, y: sy, on: sx > 10 && sy > 10 && sx < W - 10 && sy < H - 10 };
  };
  C.sampleAt = function (wx, wy, rad) {
    rad = rad || 18;
    const p = C.worldToScreen(wx, wy), cv = document.getElementById('c');
    if (!cv) return { on: false, hits: 0, max: 0, sx: p.x, sy: p.y };
    const dpr = DPR || 1, ctx = cv.getContext('2d');
    const cx0 = Math.max(0, Math.round(p.x * dpr - rad * dpr)), cy0 = Math.max(0, Math.round(p.y * dpr - rad * dpr));
    const w = Math.min(cv.width - cx0, Math.round(rad * 2 * dpr)), h = Math.min(cv.height - cy0, Math.round(rad * 2 * dpr));
    if (w < 2 || h < 2) return { on: p.on, hits: 0, max: 0, sx: p.x, sy: p.y };
    const data = ctx.getImageData(cx0, cy0, w, h).data;
    let hits = 0, maxv = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 20) continue;
      const v = r + g + b;
      if (v > maxv) maxv = v;
      // not the clear #050608 backdrop (sum 19)
      if (v > 40) hits++;
    }
    return { on: p.on, hits, max: maxv, sx: +p.x.toFixed(1), sy: +p.y.toFixed(1), w, h };
  };
  C.paintOf = function (who) {
    const pl = who === 2 ? P2 : P;
    if (!pl) return { on: false, hits: 0 };
    return Object.assign(C.sampleAt(pl.x, pl.y - 8, 20), { x: +pl.x.toFixed(1), y: +pl.y.toFixed(1) });
  };
  C.hud = () => ({
    role: C.role, slot: C.slot, p2on: C.p2on, locked: !!C.locked, names: names(),
    p1: P ? { x: +P.x.toFixed(2), y: +P.y.toFixed(2), hp: +P.hp.toFixed(1), lives: P.lives | 0, kills: P.kills | 0, gold: P.gold | 0, energy: +(P.energy || 0).toFixed(1), rage: +(P.rage || 0).toFixed(2), alive: P.hp > 0 && !C.p1out, out: !!C.p1out } : null,
    p2: P2 ? { x: +P2.x.toFixed(2), y: +P2.y.toFixed(2), hp: +P2.hp.toFixed(1), lives: P2.lives | 0, kills: P2.kills | 0, gold: P2.gold | 0, energy: +(P2.energy || 0).toFixed(1), rage: +(P2.rage || 0).toFixed(2), alive: P2.hp > 0 && !C.p2out, out: !!C.p2out } : null,
    wave: G.seqI | 0, stage: G.stage | 0, rejoin: { can: !!C.canRejoin(), shown: !!C.rejoinShown, need: !!C.rejoinNeed, cost: C.rejoinCost, blocked: C.rejoinBlocked || 0, n: C.rejoins || 0 }
  });
  C.steps = function (n, dt) { dt = dt || 1 / 60; for (let i = 0; i < (n || 1); i++) { try { if (hitstop > 0) hitstop -= dt; } catch (e) {} update(dt); try { fx(dt); } catch (e) {} draw(); } };
  C.sendState = sendState; C.sendStateNow = sendStateNow; C.sendInput = sendInput; C.applyIn = applyIn; C.applySnap = applySnap;
  C.withP2 = withP2; C.resetP2 = resetP2; C.sendBye = sendBye; C.dropP2 = dropP2;
  C.killP1 = () => { if (!P) return; P.lives = 1; P.hp = 0; P.inv = 0; try { die(); } catch (e) {} };
  C.killP2 = () => { if (!P2) return; withP2(() => { P.lives = 1; P.hp = 0; P.inv = 0; try { die(); } catch (e) {} }); };
  C.forceThor = (who) => { const go = () => { P.energy = 100; thor(); }; if (who === 2) withP2(go); else go(); };
  C.forceRage = (who) => { const go = () => { G.rgReady = 1; P.rage = 0; rageOn(); }; if (who === 2) withP2(go); else go(); };
  C.forceOdin = (who) => { const go = () => { G.odReady = 1; G.odS = 0; odinOn(); }; if (who === 2) withP2(go); else go(); };
  C.giveGold = (who, n) => { if (who === 2 && P2) P2.gold = (P2.gold | 0) + n; else if (P) P.gold = (P.gold | 0) + n; };
  hookMp();
  C.world = () => ({ coins, bolts, ravens, ravens2, pax, pax2, shots, ens, J, G, P, P2 });
  C.killE = (e) => killE(e);
  if (window.__B) window.__B.coop = C;
  C.syncRejoinBtn = syncRejoinBtn;
})();
