// PLAY mode for the STRIKE and GHOST 256 cabinets: PLAY prompt, zoom into the game's DEMO (INSERT CREDIT; 1 ticket = 1 credit; tap to play), zoom through the monkey into the screen,
// then a full-screen playable copy. Credits are tracked per machine; a machine with 0 credits cannot be played.
import * as THREE from 'three';
// rune-marked bronze/silver ticket with a horned Viking helmet (drawn, no image file); cw = CSS width
export function vikingArt(cv, cw) {
  const d = Math.min(3, window.devicePixelRatio || 1), ch = Math.round(cw * 0.62); cv.width = Math.round(cw * d); cv.height = Math.round(ch * d); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); const w = cw, h = ch, r = h * 0.14;
  const path = () => { g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.arc(w, 0, r, Math.PI, Math.PI / 2, true); g.lineTo(w, h / 2 - r * 0.8); g.arc(w, h / 2, r * 0.8, -Math.PI / 2, Math.PI / 2, true); g.lineTo(w, h - r); g.arc(w, h, r, -Math.PI / 2, Math.PI, true);
    g.lineTo(r, h); g.arc(0, h, r, 0, -Math.PI / 2, true); g.lineTo(0, h / 2 + r * 0.8); g.arc(0, h / 2, r * 0.8, Math.PI / 2, -Math.PI / 2, true); g.lineTo(0, r); g.arc(0, 0, r, Math.PI / 2, 0, true); g.closePath(); };
  path(); const bz = g.createLinearGradient(0, 0, w, h); bz.addColorStop(0, '#e9c48a'); bz.addColorStop(0.35, '#a8692e'); bz.addColorStop(0.6, '#d8e0e8'); bz.addColorStop(1, '#7a4a20'); g.fillStyle = bz; g.fill();
  g.save(); path(); g.clip(); g.strokeStyle = 'rgba(40,20,5,.55)'; g.lineWidth = Math.max(1, w * 0.012); g.setLineDash([w * 0.02, w * 0.015]); g.strokeRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84); g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.45, 0); g.lineTo(w * 0.2, h); g.lineTo(0, h); g.fill(); g.restore();
  const cx = w * 0.5, cy = h * 0.5, s = h * 0.3;   // helmet
  g.fillStyle = '#eadfc8'; g.strokeStyle = '#3a2410'; g.lineWidth = Math.max(1, s * 0.06);
  for (const k of [-1, 1]) { g.beginPath(); g.moveTo(cx + k * s * 0.75, cy - s * 0.05); g.quadraticCurveTo(cx + k * s * 1.45, cy - s * 0.3, cx + k * s * 1.25, cy - s * 1.05); g.quadraticCurveTo(cx + k * s * 1.15, cy - s * 0.5, cx + k * s * 0.7, cy - s * 0.35); g.closePath(); g.fill(); g.stroke(); }
  const hg = g.createLinearGradient(cx - s, cy - s, cx + s, cy + s); hg.addColorStop(0, '#f2f4f6'); hg.addColorStop(1, '#7c8590'); g.fillStyle = hg;
  g.beginPath(); g.arc(cx, cy + s * 0.05, s * 0.8, Math.PI, 0); g.lineTo(cx + s * 0.8, cy + s * 0.35); g.lineTo(cx - s * 0.8, cy + s * 0.35); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#b07a3a'; g.fillRect(cx - s * 0.85, cy + s * 0.2, s * 1.7, s * 0.22); g.strokeRect(cx - s * 0.85, cy + s * 0.2, s * 1.7, s * 0.22);
  g.fillRect(cx - s * 0.1, cy + s * 0.2, s * 0.2, s * 0.6); g.strokeRect(cx - s * 0.1, cy + s * 0.2, s * 0.2, s * 0.6);
  g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = `bold ${Math.round(h * 0.12)}px Georgia, serif`; g.fillText('ᚢ ᛁ ᚲ ᛁ ᛜ', cx, h * 0.2);
  g.font = `900 ${Math.round(h * 0.11)}px 'Courier New', monospace`; g.fillText('VIKING TICKET', cx, h * 0.9);
  g.font = `bold ${Math.round(h * 0.13)}px Georgia, serif`; g.fillText('ᛟ', w * 0.14, cy + h * 0.05); g.fillText('ᛟ', w * 0.86, cy + h * 0.05);
  return cv;
}
export function setupPlay(A) {
  const { camera, monkey, st } = A;
  const ui = document.getElementById('playUI'), bPlay = document.getElementById('bPlay'), credit = document.getElementById('credit'), hint = document.getElementById('hint');
  const bExit = document.getElementById('bExit'), over = document.getElementById('over');
  const demoUI = document.getElementById('demoUI'), dInsert = document.getElementById('dInsert'), dCredit = document.getElementById('dCredit'), bTicket = document.getElementById('bTicket');
  const coarse = matchMedia('(pointer:coarse)').matches;
  const MACHINES = {
    strike: { key: 'strike', upright: 1, cab: A.strikeCab, src: 'strike-play/index.html', credits: 0, games: 0, aspect: 9 / 16, cost: 5,
      start(w) { const S = w.STRIKE; S.start(0); S.G.credits = 0; },
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); if (w.__board) w.__board.stop(); }, board(w) { if (w.__board) w.__board.start(); },   // credit loaded: live WORLD TOP 10;: one credit = one game
      scene(w) { const sc = w.STRIKE.G.scene; return sc === 'play' || sc === 'pause' ? 'play' : sc === 'gameover' ? 'over' : sc === 'entry' ? 'entry' : sc === 'scores' ? 'scores' : sc === 'title' ? 'title' : sc; },
      active(w) { return w.STRIKE.G.scene === 'play'; },
      hold(w) { if (w.STRIKE.G.scene !== 'play') return false; w.pauseGame(); return true; }, unhold(w) { if (w.STRIKE.G.scene === 'pause') w.resumeGame(); }, overHold: 0, scoresHold: 6000 },
    ghost: { key: 'ghost', upright: 1, cab: A.ghostCab, src: 'ghost-play/index.html', credits: 0, games: 0, aspect: 152 / 276, cost: 5,
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { const g = w.__ghost; g.G.muted = false; try { g.Snd.setMuted(false); g.Snd.unlock && g.Snd.unlock(); } catch (e) {} g.startGame(); },
      scene(w) { const s = w.__ghost.G.state; return s === 'play' || s === 'dying' || s === 'pause' ? 'play' : s === 'over' ? 'over' : s; },
      active(w) { return w.__ghost.G.state === 'play'; },
      hold(w) { const s = w.__ghost.G.state; if (s !== 'play' && s !== 'dying') return false; w.__ghost.togglePause(); return true; }, unhold(w) { if (w.__ghost.G.state === 'pause') w.__ghost.togglePause(); }, overHold: 4500, scoresHold: 0 },
    monkey: { key: 'monkey', upright: 1, cab: A.monkeyCab, src: 'monkey-play/index.html', credits: 0, games: 0, aspect: 9 / 16, cost: 5,   // t787u: play upright (portrait) like Ghost / Strike / Cybercity
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__HOLD = 0; w.__M.startGame(); },
      scene(w) { return w.__M.state; }, active(w) { return w.__M.state === 'play'; },
      hold(w) { if (w.__M.state !== 'play') return false; w.__HOLD = 1; return true; }, unhold(w) { w.__HOLD = 0; }, overHold: 3500, scoresHold: 0 },
    berserker: { key: 'berserker', cab: A.berserkerCab, src: 'berserker-play/index.html', credits: 0, games: 0, aspect: 9 / 16, cost: 5,   // 5 tickets = 1 credit = the whole run incl. 3 continues
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__bz.start(); },
      scene(w) { const s = w.__B.G().state; return s === 'dead' || s === 'win' ? 'over' : s === 'title' ? 'title' : 'play'; },
      active(w) { return w.__B.G().state === 'play'; },
      hold(w) { if (w.__B.G().state !== 'play') return false; w.togglePause(); return true; }, unhold(w) { if (w.__B.G().state === 'pause') w.togglePause(); }, overHold: 5000, scoresHold: 0 },
    orc: { key: 'orc', cab: A.orcCab, src: 'orc-play/index.html', credits: 0, games: 0, aspect: (A.orcCab && A.orcCab.userData.aspect) || 4 / 3, cost: 5,   // 5 tickets = 1 credit = the whole run
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__orc.start(); },
      scene(w) { if (w.__orcAdv) return 'play'; const s = w.__TD.G.state; return s === 'lost' || s === 'won' ? 'over' : s === 'title' ? 'title' : 'play'; },
      active(w) { return !!w.__TD && w.__TD.G.state === 'play'; },
      hold(w) { if (!w.__TD) return false; const G = w.__TD.G; if (G.state !== 'play' || G.paused) return false; G.paused = true; return true; }, unhold(w) { if (w.__TD) w.__TD.G.paused = false; }, overHold: 5000, scoresHold: 0 },
    cyber: { key: 'cyber', upright: 1, cab: A.cyberCab, src: 'cybercity-play/index.html', credits: 0, games: 0, aspect: (A.cyberCab && A.cyberCab.userData.aspect) || 4 / 3, cost: 5,   // 5 tickets = 1 credit = one 15-minute run
      start(w) { w.__cyber.start(); },
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      scene(w) { const s = w.__cyber.scene(); return s === 'over' ? 'over' : s === 'play' ? 'play' : 'title'; },
      hold(w) { if (!w.__cyber) return false; w.__cyber.pause(true); return true; }, unhold(w) { if (w.__cyber) w.__cyber.pause(false); }, overHold: 5000, scoresHold: 0 },
    blaster: { key: 'blaster', cab: A.blasterCab, src: 'blaster-play/index.html', credits: 0, games: 0, aspect: (A.blasterCab && A.blasterCab.userData.aspect) || 4 / 3, cost: 5,   // BLASTER (#10, blank B): 5 tickets = 1 credit = one run of 3 ships
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__blaster.start(); },
      scene(w) { return w.__blaster.scene(); }, active(w) { return w.__blaster.S.mode === 'play'; },
      hold(w) { return w.__blaster.hold(); }, unhold(w) { w.__blaster.unhold(); }, overHold: 4500, scoresHold: 0 },
    pip: { key: 'pip', cab: A.pipCab, src: 'pip-play/index.html', credits: 0, games: 0, aspect: (A.pipCab && A.pipCab.userData.aspect) || 4 / 3, cost: 5,   // SUPER PIP QUEST (#11, blank A): 5 tickets = 1 credit = one run of 5 lives
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__pip.start(); },
      scene(w) { return w.__pip.scene(); }, active(w) { return w.__pip.active(); },
      hold(w) { return w.__pip.hold(); }, unhold(w) { w.__pip.unhold(); }, overHold: 4500, scoresHold: 0 },
    bb: { key: 'bb', cab: A.bbCab, src: 'bb-play/index.html', credits: 0, games: 0, aspect: (A.bbCab && A.bbCab.userData.aspect) || 4 / 5, cost: 5,   // BURROW BUSTER (#13, slot 2:4): 5 tickets = 1 credit = one game of 3 lives
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__bb.start(); },
      scene(w) { return w.__bb.scene(); }, active(w) { return w.__bb.active(); },
      hold(w) { return w.__bb.hold(); }, unhold(w) { w.__bb.unhold(); }, overHold: 4500, scoresHold: 0 },
    rockfall: { key: 'rockfall', cab: A.rockfallCab, src: 'rockfall-play/index.html', credits: 0, games: 0, aspect: (A.rockfallCab && A.rockfallCab.userData.aspect) || 4 / 3, cost: 5,   // ROCKFALL RUSH (#14, slot 2:3): 5 tickets = 1 credit = one run of 3 lives
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__rockfall.start(); },
      scene(w) { return w.__rockfall.scene(); }, active(w) { return w.__rockfall.active(); },
      hold(w) { return w.__rockfall.hold(); }, unhold(w) { w.__rockfall.unhold(); }, overHold: 4500, scoresHold: 0 },
    skytower: { key: 'skytower', cab: A.skyTowerCab, src: 'sky-tower-play/index.html', credits: 0, games: 0, aspect: (A.skyTowerCab && A.skyTowerCab.userData.aspect) || 16 / 9, cost: 5,   // SKY TOWER (#15, slot 2:2): 5 tickets = 1 credit = one climb of 50 platforms
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__skytower.start(); },
      scene(w) { return w.__skytower.scene(); }, active(w) { return w.__skytower.active(); },
      hold(w) { return w.__skytower.hold(); }, unhold(w) { w.__skytower.unhold(); }, overHold: 4500, scoresHold: 0 },
    nova: { key: 'nova', cab: A.novaCab, src: 'nova-play/index.html', credits: 0, games: 0, aspect: (A.novaCab && A.novaCab.userData.aspect) || 16 / 9, cost: 5,   // 5 tickets = 1 credit = one run
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__nova.start(); },
      scene(w) { const m = w.NV.G.mode; return m === 'over' ? 'over' : m === 'title' ? 'title' : 'play'; },
      active(w) { return w.NV.G.mode === 'play'; },
      hold(w) { const G = w.NV.G; if (G.mode !== 'play') return false; G.mode = 'pause'; return true; }, unhold(w) { const G = w.NV.G; if (G.mode === 'pause') G.mode = 'play'; }, overHold: 4500, scoresHold: 0 },
    claw: { key: 'claw', upright: 1, cab: A.clawCab, src: 'claw-play/index.html', credits: 0, games: 0, aspect: (A.clawCab && A.clawCab.userData.aspect) || 1.4, cost: 1,   // t799u: play upright (portrait) like Monkey Crossing / Ghost / Strike / Cybercity. 1 ticket = 1 credit = one drop
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__clawA.start(); },
      scene(w) { return w.__clawA.scene(); }, active(w) { return w.__clawA.active(); },
      hold(w) { return w.__clawA.hold(); }, unhold(w) { w.__clawA.unhold(); }, overHold: 2500, scoresHold: 0 },
    roadster: { key: 'roadster', cab: A.roadsterCab, src: 'mr-play/index.html', credits: 0, games: 0, aspect: 16 / 9, cost: 5,   // MARS ROADSTER: 5 tickets = 1 credit = one race; two seats, each with its own screen
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__mrA.start(); },
      scene(w) { return w.__mrA.scene(); }, active(w) { return w.__mrA.scene() === 'play'; },
      hold(w) { return w.__mrA.hold(); }, unhold(w) { w.__mrA.unhold(); }, overHold: 5000, scoresHold: 0,
      onExit() { seatMonkey(A.roadsterCab, false); },
      // step-in (Dave: 'animating the player stepping into the seat'): walk to the side panel by the seat, swing a leg over, drop in, sit down
      prep: 1.8, anim(phase, k) { if (phase === 'on') stepIn(A.roadsterCab, k); },
      prepCam() { const u = A.roadsterCab.userData, s = u.seats[u.seat].world, sx = Math.sign(s.x - A.roadsterCab.position.x) || 1; return new THREE.Vector3(s.x + sx * 4.2, 2.5, s.z - 3.6); } },
    // DEAD SIGNAL VR STATION: 5 tickets = 1 credit = one run. Before the zoom the monkey steps onto the platform and puts the headset on (prep),
    // after the zoom out he takes it off, puts it back on the pedestal and steps down (post)
    ds: { key: 'ds', cab: A.dsCab, src: 'ds-play/index.html', credits: 0, games: 0, aspect: 16 / 9, cost: 5,
      demo(w) { w.__demo.start(); }, stopDemo(w) { w.__demo.stop(); },
      start(w) { w.__dsA.start(); },
      scene(w) { return w.__dsA.scene(); }, active(w) { return w.__dsA.scene() === 'play'; },
      hold(w) { return w.__dsA.hold(); }, unhold(w) { w.__dsA.unhold(); }, overHold: 5000, scoresHold: 0,
      prep: 2.6, post: 1.9, anim(phase, k) { A.dsCab.userData.anim(phase, k, monkey, st); } },
  };
  if (!A.dsCab) delete MACHINES.ds;
  if (!A.roadsterCab) delete MACHINES.roadster;
  if (!A.clawCab) delete MACHINES.claw;
  if (!A.rockfallCab) delete MACHINES.rockfall;
  if (!A.skyTowerCab) delete MACHINES.skytower;
  // MARS ROADSTER: sit the monkey in the chosen bucket seat (hands on the wheel) for the zoom, stand him up behind it on the way out
  function seatMonkey(cab, on) { const u = cab.userData, s = u.seats[u.seat], mu = monkey.userData;
    if (on) { monkey.position.set(s.world.x, 0, s.world.z + 0.12); st.face = 0; monkey.rotation.y = 0; st.vel.set(0, 0, 0); st.speed = 0; st.seated = u.seat; if (monkey.userData.pack) monkey.userData.pack.visible = monkey.userData.tail.visible = false;
      mu.hips.position.y = 0.86; mu.legs.forEach(l => { l.leg.rotation.x = -1.5; l.knee.rotation.x = 1.45; }); mu.torso.rotation.set(0.08, 0, 0); mu.neck.rotation.x = 0;
      mu.arms.forEach(a => { a.sh.rotation.x = -1.05; a.sh.rotation.z = 0.32 * a.sd; a.el.rotation.x = -0.55; }); }
    else { monkey.position.set(s.world.x, 0, u.zEnd - 0.55); st.face = 0; monkey.rotation.y = 0; st.seated = null; if (mu.pack) mu.pack.visible = mu.tail.visible = true; mu.hips.position.y = 0.8; mu.legs.forEach(l => { l.leg.rotation.x = 0; l.knee.rotation.x = 0; }); } }
  const SI = {};
  function stepIn(cab, k) { const u = cab.userData, s = u.seats[u.seat].world, mu = monkey.userData, sx = Math.sign(s.x - cab.position.x) || 1;
    if (k === 0 || !SI.p0) { SI.p0 = monkey.position.clone(); SI.f0 = st.face; SI.side = new THREE.Vector3(cab.position.x + sx * (2.5 + 0.3), 0, s.z + 0.12); SI.done = false; }
    st.vel.set(0, 0, 0); st.speed = 0; const ang = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t, faceIn = Math.atan2(-sx, 0), sm = t => t * t * (3 - 2 * t);
    const rest = () => { mu.hips.position.y = 0.8; mu.torso.rotation.set(0, 0, 0); mu.legs.forEach(l => { l.leg.rotation.set(0, 0, 0); l.knee.rotation.x = 0; }); mu.arms.forEach(a => { a.sh.rotation.set(0, 0, 0); a.el.rotation.x = 0; }); };
    if (k < 0.35) { const t = sm(k / 0.35); rest(); monkey.position.lerpVectors(SI.p0, SI.side, t); st.face = ang(SI.f0, faceIn, Math.min(1, t * 1.6));   // walk up to the side
      const w = Math.sin(k / 0.35 * Math.PI * 4) * 0.5; mu.legs.forEach((l, i) => { l.leg.rotation.x = i ? -w : w; l.knee.rotation.x = Math.abs(w) * 0.6; }); mu.arms.forEach((a, i) => { a.sh.rotation.x = i ? w * 0.7 : -w * 0.7; }); }
    else if (k < 0.75) { const t = (k - 0.35) / 0.4, e = sm(t); rest(); st.face = faceIn;   // lift the leg over the side panel and step in
      monkey.position.set(SI.side.x + (s.x - SI.side.x) * e, Math.sin(t * Math.PI) * 0.42, SI.side.z);
      const lead = mu.legs[sx > 0 ? 1 : 0], trail = mu.legs[sx > 0 ? 0 : 1]; lead.leg.rotation.x = -1.35 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * (1 - Math.max(0, t - 0.7) / 0.3 * 0.6); lead.knee.rotation.x = 1.2 * Math.sin(Math.min(1, t * 1.4) * Math.PI);
      trail.leg.rotation.x = t > 0.5 ? -1.1 * Math.sin((t - 0.5) / 0.5 * Math.PI) : 0; trail.knee.rotation.x = t > 0.5 ? 1.1 * Math.sin((t - 0.5) / 0.5 * Math.PI) : 0;
      mu.torso.rotation.x = 0.22 * Math.sin(t * Math.PI); mu.arms.forEach(a => { a.sh.rotation.z = 0.6 * a.sd * Math.sin(t * Math.PI); }); }
    else { const t = sm(Math.min(1, (k - 0.75) / 0.25)); monkey.position.set(s.x, 0, s.z + 0.12 * t); st.face = ang(faceIn, 0, t);   // turn to the wheel and sit down
      mu.hips.position.y = 0.8 + 0.06 * t; mu.legs.forEach(l => { l.leg.rotation.set(-1.5 * t, 0, 0); l.knee.rotation.x = 1.45 * t; }); mu.torso.rotation.set(0.08 * t, 0, 0);
      mu.arms.forEach(a => { a.sh.rotation.x = -1.05 * t; a.sh.rotation.z = 0.32 * a.sd * t; a.el.rotation.x = -0.55 * t; });
      if (k >= 1 && !SI.done) { SI.done = true; SI.p0 = null; seatMonkey(cab, true); } }
    monkey.rotation.y = st.face; P.stepIn = k; }
  const P = { need: 0, sub: null, demoReturns: 0, plays: 0, mode: 'walk', t: 0, frame: null, zooms: 0, coinSfx: 0, blocked: 0, cur: null, machines: MACHINES };
  // AUTOSAVE (t194u): machine credits survive a reload on this device (neonarcade.credits); polled, so every credit change is covered
  { const CK = 'neonarcade.credits'; try { const c = JSON.parse(localStorage.getItem(CK) || '{}'); for (const k in c) if (MACHINES[k] && c[k] > 0) MACHINES[k].credits = c[k] | 0; } catch (e) {}
    let last = ''; const save = () => { const o = {}; for (const k in MACHINES) if (MACHINES[k].credits) o[k] = MACHINES[k].credits; const j = JSON.stringify(o); if (j !== last) { last = j; try { localStorage.setItem(CK, j); } catch (e) {} } };
    P.saveCredits = save; setInterval(save, 1000); addEventListener('pagehide', save); document.addEventListener('visibilitychange', save); }
  const TKEY = 'neonarcade.tickets', tixEl = document.getElementById('tix'), dCost = document.getElementById('dCost');
  function toast(msg) { const d = document.createElement('div'); d.className = 'ntoast'; d.textContent = msg; document.body.appendChild(d); P.lastToast = msg; setTimeout(() => d.remove(), 2200); }
  const T = { total: 0, got: 0 };
  const saveT = () => { try { localStorage.setItem(TKEY, String(T.total)); } catch (e) {} };
  try { const v = localStorage.getItem(TKEY); if (v === null) { T.total = 1; saveT(); } else T.total = Math.max(0, parseInt(v, 10) || 0); } catch (e) { T.total = 1; }   // a new player starts with 1 ticket
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let curve = null, look0 = new THREE.Vector3(), look1 = new THREE.Vector3(), ac = null, near = null, coinLock = 0;
  function coinSound() { P.coinSfx++; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;
    for (const [f, d] of [[988, 0], [1319, 0.08]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.35); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 0.4); } } catch (e) {} }
  const costOf = m => m.cost || 1;
  function refresh() { const m = near || MACHINES.strike;   // the room prompt: always PLAY (zooms into the demo)
    bPlay.textContent = m.key === 'roadster' ? (m.cab.userData.seat === 'R' ? 'RIGHT SEAT' : 'LEFT SEAT') : 'PLAY'; P.seatShown = m.key === 'roadster' ? m.cab.userData.seat : null; credit.textContent = (costOf(m) > 1 ? costOf(m) + ' TICKETS TO PLAY  ·  ' : m.key === 'claw' ? '1 TICKET TO PLAY  ·  ' : '') + 'CREDIT ' + m.credits + '  ·  YOU HAVE ' + T.total + ' 🎟';
    hint.textContent = coarse ? 'TAP TO PLAY' : 'ENTER / E / SPACE'; }
  function demoRefresh() { const m = P.cur; if (!m) return; const c = costOf(m), has = T.total >= c;
    if (window.__cabDemo) { window.__cabDemo.render({ key: m.key, credits: m.credits, cost: c, tickets: T.total, coarse, board: !!m.board }); return; }
    dInsert.textContent = m.credits > 0 ? (coarse ? 'TAP TO PLAY' : 'TAP / ENTER TO PLAY') : 'INSERT CREDIT'; dInsert.classList.toggle('ready', m.credits > 0);
    dCredit.textContent = 'CREDIT ' + m.credits + '  ·  ' + T.total + ' 🎟';
    bTicket.textContent = has ? (c > 1 ? 'INSERT ' + c + ' TICKETS · ' + c + ' 🎟' : 'INSERT TICKET · 1 🎟') : (c > 1 ? 'NEED ' + c + ' TICKETS' : 'NEED A TICKET'); bTicket.classList.toggle('need', !has);
    const dTag = document.getElementById('dTag'); if (dTag) dTag.style.visibility = m.credits > 0 && m.board ? 'hidden' : '';   // the live board is not a demo
    dCost.textContent = c > 1 ? c + ' TICKETS TO PLAY' : m.key === 'claw' ? '1 TICKET TO PLAY' : ''; dCost.style.display = c > 1 || m.key === 'claw' ? '' : 'none'; }
  function buzz() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(110, t + 0.18); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.25); } catch (e) {} }
  const shake = el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  function insertTicket() {   // demo view button: 1 ticket -> 1 credit
    const m = P.cur, now = performance.now();
    if (P.mode !== 'game' || P.sub !== 'demo' || !m || TV.open || now < coinLock) { P.blocked++; return; }
    const c = costOf(m);
    if (T.total < c) { P.need++; demoRefresh(); shake(bTicket); buzz(); toast('NEED ' + c + ' TICKETS · YOU HAVE ' + T.total); return; }
    T.total -= c; saveT(); m.credits += 1; if (m.credits === 1 && m.board && P.frame) try { m.board(P.frame.contentWindow); } catch (e) {} coinLock = now + 350; coinSound(); showTix(); demoRefresh(); bTicket.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], 220); }
  function tryPlay() {   // a tap / click / Enter / Space on the demo screen
    const m = P.cur;
    if (P.mode !== 'game' || P.sub !== 'demo' || !m || TV.open || !P.frame) { P.blocked++; return; }
    if (m.credits < 1) { P.need++; shake(dInsert); buzz(); return; }
    const w = P.frame.contentWindow; m.credits -= 1; m.games++; P.plays++;
    try { m.stopDemo(w); m.start(w); } catch (e) { console.warn('game start', e); }
    P.sub = 'play'; P.over = false; P.goShown = false; clearTimeout(P.holdT); P.holdT = 0; demoUI.classList.remove('on'); try { P.frame.focus(); w.focus(); } catch (e) {} showTix(); }
  function idle(m, w) { if (m.credits > 0 && m.board) m.board(w); else m.demo(w); }   // credit waiting -> machine's board (STRIKE: live high scores), else attract demo
  function toDemo(why) {   // after game over (and the score screens) -> back to the demo, not the room
    const m = P.cur, f = P.frame; if (!m || !f) return; clearTimeout(P.holdT); P.holdT = 0; over.style.display = 'none';
    P.sub = 'demo'; P.over = false; P.goShown = false; P.demoReturns++; P.lastDemo = why;
    try { idle(m, f.contentWindow); } catch (e) { console.warn('demo', e); } demoRefresh(); demoUI.classList.add('on'); }
  function screenInfo(m) { const s = m.cab.userData.screen; s.geometry.computeBoundingBox(); const c = s.geometry.boundingBox.getCenter(new THREE.Vector3()); s.localToWorld(c);
    const sz = s.geometry.boundingBox.getSize(new THREE.Vector3()), h = Math.hypot(sz.x, sz.y) * m.cab.scale.y; return { c, h }; }
  function endPos(m) { // camera spot where the portrait screen fills the view
    const { c, h } = screenInfo(m), w = h * m.aspect, n = m.cab.userData.inward, nrm = new THREE.Vector3(n.x * 0.96, 0.28, n.z * 0.96).normalize();
    const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const dist = Math.min(h / 2 / Math.tan(vf / 2), w / 2 / Math.tan(hf / 2)) * 0.9;
    return { p: c.clone().addScaledVector(nrm, Math.max(0.08, dist)), c }; }
  // the only entry point for a press (button, tap, Enter/E/Space)
  function press() {
    if (TV.open) { P.blocked++; return; }
    const m = near;
    if (P.mode !== 'walk' || !m || !ui.classList.contains('on')) { P.blocked++; return; }
    if (performance.now() < coinLock) { P.blocked++; return; }
    start(m);
  }
  function start(m) {
    if (P.mode !== 'walk') { P.blocked++; return; }
    // t753u: two players max at one machine (they stand side by side); a third waits / watches
    try { const M = window.__mp; if (M && M.state === 'on' && M.cabFull && M.cabFull(m.key)) { P.blocked++; P.fullBlocked = (P.fullBlocked || 0) + 1; if (M.flash) M.flash('2 players max at this machine - wait for a spot', 2500); return; } } catch (e) {}
    P.cur = m; refresh(); ui.classList.remove('on'); if (m.onStart) m.onStart();
    if (m.upright) try { window.__orient && window.__orient(true); } catch (e) {}   // t765u: upright game -> phone back to normal portrait, full screen
    P.zooms++;
    if (m.prep) { P.mode = 'prep'; P.t = 0; P.pcam = null; P.cam0 = camera.position.clone(); P.look0 = monkey.position.clone().setY(1.25); m.anim('on', 0); }   // walk-up + headset on first, then zoomIn()
    else zoomIn(m);
    const f = P.frame = document.createElement('iframe'); f.id = 'game'; f.src = m.src; f.allow = 'autoplay; fullscreen'; f.title = m.cab.name;
    f.addEventListener('load', () => { P.loaded = true; try { f.contentWindow.addEventListener('keydown', ev => { if (TV.open) { ev.stopImmediatePropagation(); ev.preventDefault(); if (ev.code === 'Escape') closeView(); return; } if (ev.code === 'Escape') { ev.stopImmediatePropagation(); ev.preventDefault(); exit('esc'); return; } if (P.sub === 'demo') { ev.stopImmediatePropagation(); ev.preventDefault(); if (/^(Enter|Space|KeyE)$/.test(ev.code) && !ev.repeat) tryPlay(); } }, true); } catch (e) {} });
    P.loaded = false; document.body.appendChild(f);
  }
  function zoomIn(m) { P.mode = 'zoomIn'; P.t = 0;
    const head = monkey.position.clone().setY(monkey.position.y + 1.25), e = endPos(m), mid = head.clone().lerp(e.p, 0.35);
    P.target = e.c; P.end = e.p; curve = new THREE.CatmullRomCurve3([camera.position.clone(), head, mid, e.p]); look0.copy(m.post ? e.c : head); look1.copy(e.c); }
  function launch() {
    const f = P.frame, m = P.cur; P.mode = 'game'; document.body.dataset.cab = m ? m.key : ''; P.over = false; P.goShown = false; clearTimeout(P.holdT); P.holdT = 0; P.scene = null;
    const go = () => { P.sub = 'demo'; try { idle(m, f.contentWindow); } catch (e) { console.warn('demo start', e); } demoRefresh(); demoUI.classList.add('on'); f.classList.add('on'); bExit.style.display = 'block'; f.focus(); try { f.contentWindow.focus(); } catch (e) {}
      A.pause(true); P.poll = setInterval(poll, 200); showTix(); };
    if (P.loaded) go(); else f.addEventListener('load', go, { once: true });
  }
  function poll() { // game over -> its own score / high-score screen -> back out to the arcade
    if (P.mode !== 'game' || P.over || P.sub !== 'play') return; const m = P.cur; let sc; try { sc = m.scene(P.frame.contentWindow); } catch (e) { return; }
    P.scene = sc;
    if (sc === 'over' && !P.goShown) { P.goShown = true; over.style.display = 'flex'; setTimeout(() => over.style.display = 'none', 1500);
      if (m.overHold) P.holdT = setTimeout(() => toDemo('over'), m.overHold); }
    if (sc === 'scores' && !P.holdT) P.holdT = setTimeout(() => toDemo('scores'), m.scoresHold);
    if (sc === 'title') toDemo('title');
  }
  function exit(why) {
    if (P.mode !== 'game') return; clearInterval(P.poll); clearTimeout(P.holdT); P.holdT = 0; over.style.display = 'none';
    P.lastExit = why; P.sub = null; demoUI.classList.remove('on'); P.mode = 'zoomOut'; P.t = 0; bExit.style.display = 'none'; document.body.dataset.cab = '';
    const f = P.frame; f.classList.remove('on');
    try { if (f.contentWindow && f.contentWindow.__skySnd) f.contentWindow.__skySnd.stop(); } catch (e) {}
    try { if (f.contentWindow && f.contentWindow.__gaRelease) f.contentWindow.__gaRelease(); } catch (e) {}   // t762u: free its GPU / canvas / audio now, not at some later GC (phones)
    try { if (TV.open) closeView(); } catch (e) {}
    try { f.contentWindow.document.body.style.display = 'none'; } catch (e) {} setTimeout(() => f.remove(), 500); P.frame = null;
    if (P.cur.onExit) P.cur.onExit();
    if (P.cur.upright || document.body.classList.contains('upright')) try { window.__orient && window.__orient(false); } catch (e) {}
    const m = P.cur, back = monkey.position.clone().setY(monkey.position.y + 1.25), out = back.clone().addScaledVector(m.cab.userData.inward, 2.6).setY(2.1);
    curve = new THREE.CatmullRomCurve3([camera.position.clone(), back.clone().lerp(camera.position, 0.4), back, out]); look0.copy(back); look1.copy(screenInfo(m).c);
    A.pause(false); window.focus(); showTix();
  }
  // ---- tickets: collected inside the games (gold monkey tickets), 1 each; no time-based payout ----
  const tixN = document.getElementById('tixN'), tview = document.getElementById('tview'), tvCv = document.getElementById('tvCv'), tvCount = document.getElementById('tvCount');
  try { TicketArt.toCanvas(document.getElementById('tixIco'), 30, false); const c = TicketArt.toCanvas(document.createElement('canvas'), 80, false); document.documentElement.style.setProperty('--tkimg', 'url(' + c.toDataURL() + ')'); } catch (e) {}
  const showTix = () => { tixN.textContent = String(T.total); if (P.mode === 'walk') refresh(); else demoRefresh(); tixEl.classList.toggle('ingame', P.mode === 'game'); document.body.classList.toggle('ingame', P.mode === 'game'); try { showVix(); } catch (e) {} };
  // ---- enlarged ticket view: tap/click the HUD counter; tap, click, Esc or ✕ closes. Pauses the arcade / game while open ----
  const TV = { open: false, opens: 0, heldGame: false, heldArcade: false };
  function openView(kind) {
    if (TV.open) return; TV.open = true; TV.opens++; TV.kind = kind === 'viking' ? 'viking' : 'gold';
    const side = Math.min(innerWidth, innerHeight), w = Math.round(Math.min(innerWidth * 0.92, side * 0.66));
    if (TV.kind === 'viking') { vikingArt(tvCv, w); tvCount.textContent = 'ᛟ ' + V.total + (V.total === 1 ? ' VIKING TICKET' : ' VIKING TICKETS'); }
    else { TicketArt.toCanvas(tvCv, w, true); tvCount.textContent = '🎟 ' + T.total + (T.total === 1 ? ' TICKET' : ' TICKETS'); }
    tview.classList.toggle('viking', TV.kind === 'viking'); tview.classList.add('on'); tview.setAttribute('aria-hidden', 'false');
    const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false;   // never carry a held key into / out of the view
    TV.heldGame = false; TV.heldArcade = false;
    if (P.mode === 'game' && P.frame) { try { TV.heldGame = P.cur.hold(P.frame.contentWindow); } catch (e) {} }
    else { A.pause(true); TV.heldArcade = true; }
  }
  function closeView() {
    if (!TV.open) return; TV.open = false; tview.classList.remove('on'); tview.setAttribute('aria-hidden', 'true');
    const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false;
    if (TV.heldGame && P.frame) { try { P.cur.unhold(P.frame.contentWindow); } catch (e) {} try { P.frame.focus(); } catch (e) {} }
    if (TV.heldArcade) A.pause(false); TV.heldGame = TV.heldArcade = false;
  }
  const swallow = e => e.stopPropagation();   // keeps the touch away from the joystick / camera drag
  tixEl.addEventListener('pointerdown', swallow); tixEl.addEventListener('touchstart', swallow, { passive: true });
  tixEl.addEventListener('click', e => { swallow(e); openView(); });
  tixEl.addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'Space') { swallow(e); e.stopImmediatePropagation(); openView(); } });
  tview.addEventListener('pointerdown', swallow); tview.addEventListener('touchstart', swallow, { passive: true });
  tview.addEventListener('click', e => { swallow(e); closeView(); });
  addEventListener('keydown', e => { if (!TV.open) return; e.stopImmediatePropagation(); e.preventDefault(); if (e.code === 'Escape') closeView(); }, true);   // Esc closes the view before it can quit a game
  P.view = TV; P.openView = openView; P.closeView = closeView;
  let tac = null;
  function ticketSound() { try { tac = tac || new (window.AudioContext || window.webkitAudioContext)(); const t = tac.currentTime;
    [1568, 2093, 2637].forEach((f, i) => { const o = tac.createOscillator(), g = tac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.09, t + i * 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25); o.connect(g).connect(tac.destination); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.3); }); } catch (e) {} }
  function award(n, game) {   // called by the game iframe when the ship / ghost picks up a ticket
    if (P.mode !== 'game' || P.sub !== 'play' || !P.frame || !P.cur || (game && P.cur.key !== game)) return false;
    n = Math.max(1, Math.min(5, n | 0)); T.total += n; T.got += n; saveT(); showTix(); refresh(); demoRefresh(); ticketSound();   // one pickup = 1..5 tickets (each copy scales its payout to the 5-ticket price)
    const r = tixEl.getBoundingClientRect(), d = document.createElement('div'); d.className = 'tpop'; d.textContent = '+' + n + ' 🎟'; d.style.left = (r.left + 4) + 'px'; d.style.top = (r.bottom + 4) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1500); return true; }
  window.__neonTicket = award;
  // SESSION TICKET API for cabinet copies: n tickets (1..20) for the cabinet that is zoomed in and playing; goes into the session
  // (in memory, kept only by a SAVE slot). Returns how many were added. Never writes storage itself.
  window.__neonSession = { addTickets(n, game) { n = Math.max(0, Math.min(20, n | 0)); let k = 0; while (k < n) { const c = Math.min(5, n - k); if (!award(c, game)) break; k += c; } return k; },
    get tickets() { return T.total; } };
  // ---- VIKING TICKET (from clearing BERSERKER Stage I): its own count, its own HUD chip and enlarged view; does nothing else yet ----
  const VKEY = 'neonarcade.vikingTickets', vixEl = document.getElementById('vix'), vixN = document.getElementById('vixN'), V = { total: 0, got: 0 };
  try { V.total = Math.max(0, parseInt(localStorage.getItem(VKEY), 10) || 0); } catch (e) {}
  const showVix = () => { vixN.textContent = String(V.total); vixEl.style.display = V.total > 0 ? '' : 'none'; vixEl.classList.toggle('ingame', P.mode === 'game'); try { const r = tixEl.getBoundingClientRect(); if (r.width) { vixEl.style.left = (r.right + 6) + 'px'; vixEl.style.top = r.top + 'px'; vixEl.style.minWidth = r.width + 'px'; } } catch (e) {} };   // t796u: Viking chip sits directly to the right of the gold ticket (walk and cabinet)
  addEventListener('resize', () => setTimeout(showVix, 50));
  try { vikingArt(document.getElementById('vixIco'), 30); } catch (e) {}
  function vikingAward(game) {
    if (P.mode !== 'game' || P.sub !== 'play' || !P.frame || !P.cur || P.cur.key !== 'berserker' || (game && game !== 'berserker')) return false;
    V.total++; V.got++; try { localStorage.setItem(VKEY, String(V.total)); } catch (e) {} showVix(); ticketSound(); setTimeout(ticketSound, 180);
    const d = document.createElement('div'); d.className = 'vpop'; const c = document.createElement('canvas'); d.appendChild(c); const t = document.createElement('div'); t.textContent = 'VIKING TICKET!'; d.appendChild(t);
    vikingArt(c, Math.round(Math.min(innerWidth * 0.6, 300))); document.body.appendChild(d); setTimeout(() => d.remove(), 3200); return true; }
  window.__neonViking = vikingAward; P.vikingAward = vikingAward; P.viking = V; P.showVix = () => showVix(); P.refresh = () => refresh();
  vixEl.addEventListener('pointerdown', swallow); vixEl.addEventListener('touchstart', swallow, { passive: true });
  vixEl.addEventListener('click', e => { swallow(e); openView('viking'); });
  showVix();
  window.__neonSync = () => { try { T.total = Math.max(0, parseInt(localStorage.getItem(TKEY), 10) || 0); V.total = Math.max(0, parseInt(localStorage.getItem(VKEY), 10) || 0); } catch (e) {} showTix(); };
  P.award = award;
  P.spend = n => { if (T.total < n) return false; T.total -= n; saveT(); showTix(); if (TV.open) tvCount.textContent = '🎟 ' + T.total + (T.total === 1 ? ' TICKET' : ' TICKETS'); return true; };   // used by shield.js
  P.addTickets = n => { T.total += n; saveT(); showTix(); refresh(); ticketSound(); };
  P.tickets = T; showTix();
  bPlay.addEventListener('click', e => { e.stopPropagation(); press(); });
  ['pointerdown', 'touchstart'].forEach(t => ui.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bExit.addEventListener('click', () => exit('x'));
  // t766u: safety net - an upright game's portrait view never outlives the game (any exit path)
  setInterval(() => { if (P.mode !== 'game' && P.mode !== 'zoomIn' && P.mode !== 'prep' && document.body.classList.contains('upright')) try { window.__orient && window.__orient(false); } catch (e) {} }, 400);
  // HUD home button: confirm, then leave any cabinet game / demo and show the start screen again (credits, tickets, floor kept)
  const homeQ = document.getElementById('homeQ'), homeN = document.getElementById('homeN');
  const homeAsk = on => { homeQ.classList.toggle('on', on); homeQ.setAttribute('aria-hidden', on ? 'false' : 'true'); P.homeAsk = on;
    if (on) { const m = P.cur, inGame = P.mode === 'game' && P.sub === 'play';
      homeN.textContent = inGame ? 'THE CURRENT GAME WILL END.' : (P.mode === 'game' && m && m.credits > 0 ? 'YOUR UNUSED CREDIT STAYS ON THIS MACHINE.' : '');
      if (window.__sess && window.__sess.dirty) homeN.textContent = (homeN.textContent ? homeN.textContent + ' ' : '') + 'UNSAVED PROGRESS - SAVE IN OPTIONS TO KEEP IT.'; } };
  const goHome = () => { homeAsk(false); P.homes = (P.homes || 0) + 1; if (P.mode === 'game') { exit('home'); P.t = 1; } try { if (TV.open) closeView(); } catch (e) {}
    try { for (const c in A.keys) A.keys[c] = false; } catch (e) {} if (window.__startUI && window.__startUI.show) window.__startUI.show(); };
  P.home = { ask: homeAsk, go: goHome };
  for (const [id, fn] of [['homeYes', goHome], ['homeNo', () => homeAsk(false)]]) {
    const b = document.getElementById(id); b.addEventListener('pointerdown', swallow); b.addEventListener('touchstart', swallow, { passive: true }); b.addEventListener('click', e => { swallow(e); fn(); }); }
  homeQ.addEventListener('pointerdown', swallow); homeQ.addEventListener('click', e => { if (e.target === homeQ) homeAsk(false); });
  ['pointerdown', 'touchstart'].forEach(t => demoUI.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  bTicket.addEventListener('click', e => { e.stopPropagation(); insertTicket(); });   // not a screen tap
  demoUI.addEventListener('click', e => { if (e.target === bTicket) return; tryPlay(); });
  addEventListener('keydown', e => { if (TV.open) return; if (/^(Enter|KeyE|Space)$/.test(e.code)) { if (!e.repeat) { if (P.mode === 'game' && P.sub === 'demo') tryPlay(); else press(); } } if (e.code === 'Escape') exit('esc'); });
  // called every arcade frame; returns true when it owns the camera
  P.update = (dt, nearCab) => {
    const m = P.mode === 'walk' && !st.fp ? Object.values(MACHINES).find(k => k.cab === nearCab) : null;
    if (m && (m !== near || (m.key === 'roadster' && P.seatShown !== m.cab.userData.seat))) { near = m; refresh(); } if (!m && P.mode === 'walk') near = null;
    ui.classList.toggle('on', !!m); document.body.classList.toggle('ingame', P.mode === 'game'); { const ck = P.mode === 'game' && P.cur ? P.cur.key : ''; if (document.body.dataset.cab !== ck) { document.body.dataset.cab = ck; try { showVix(); } catch (e) {} } }
    if (P.mode === 'prep' || P.mode === 'post') {   // DEAD SIGNAL: headset on (before the zoom) / off (after it); the camera eases to a 3/4 view of the platform
      const m = P.cur, dur = P.mode === 'prep' ? m.prep : m.post; P.t = Math.min(1, P.t + dt / dur); const k = ease(P.t);
      m.anim(P.mode === 'prep' ? 'on' : 'off', P.t); monkey.visible = true;
      const c = m.cab.userData.centre, head = monkey.position.clone().setY(monkey.position.y + 1.35);
      if (P.mode === 'prep') { const v = m.prepCam ? (P.pcam = P.pcam || m.prepCam()) : new THREE.Vector3(c.x + 1.25, 1.95, c.z + 2.9); camera.position.lerpVectors(P.cam0, v, k); camera.lookAt(P.look0.clone().lerp(head, Math.min(1, k * 1.4))); }
      else { const v = new THREE.Vector3(c.x + 0.6, 2.3, c.z + 5.6); camera.position.lerpVectors(P.cam0, v, k); camera.lookAt(head); }
      if (P.t >= 1) { if (P.mode === 'prep') zoomIn(m); else { m.anim('reset', 1); P.mode = 'walk'; P.cur = null; near = null; monkey.position.y = 0; st.camInit = true; st.lookT = st.t; st.yaw = 0; } }
      return true;
    }
    if (P.mode === 'zoomIn' || P.mode === 'zoomOut') {
      const dur = P.mode === 'zoomIn' ? 1.6 : 1.4; P.t = Math.min(1, P.t + dt / dur); const k = ease(P.t);
      camera.position.copy(curve.getPointAt(k));
      camera.lookAt(P.mode === 'zoomIn' ? look0.clone().lerp(look1, Math.min(1, k * 1.6)) : look1.clone().lerp(look0, Math.min(1, k * 1.5)));
      monkey.visible = camera.position.distanceTo(monkey.position.clone().setY(1.0)) > 0.75 && !(P.mode === 'zoomIn' && k > 0.3) && !(P.mode === 'zoomOut' && k < 0.65);
      if (P.cur && P.cur.post) monkey.visible = P.mode === 'zoomIn' ? k < 0.85 : k > 0.3;   // headset sequence: he stays in shot until the camera is at the visor
      if (P.t >= 1) { if (P.mode === 'zoomIn') launch(); else if (P.cur && P.cur.post) { P.mode = 'post'; P.t = 0; P.cam0 = camera.position.clone(); monkey.visible = true; } else { P.mode = 'walk'; P.cur = null; near = null; monkey.visible = true; st.camInit = true; st.lookT = st.t; } }
      return true;
    }
    return P.mode === 'game';
  };
  Object.defineProperty(P, 'credits', { get: () => MACHINES.strike.credits });   // back-compat for the STRIKE test
  P.press = press; P.start = start; P.exit = exit; P.tryPlay = tryPlay; P.insertTicket = insertTicket; P.toDemo = toDemo; P.near = () => near && near.cab.name;
  return P;
}
