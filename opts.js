// In-game OPTIONS (HUD monkey-face button): BACK TO TITLE SCREEN, SAVE / LOAD (5 slots, 'neonarcade.save.1..5'), MUTE.
export function setupOpts({ play, kiosk, shield, st, monkey, setFloor, getFloor, setWalls, getWalls, setWindow, getWindow, HALF, Z2 }) {
  const $ = id => document.getElementById(id), SLOTS = 5, SK = i => 'neonarcade.save.' + i;
  // ---- monkey-face icon (Arcade Kid: brown fur, tan face, pink cap) ----
  function face(c, s) { c.width = c.height = s; const g = c.getContext('2d'), u = s / 64; g.scale(u, u);
    const R = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
    R(11, 36, 8, 9, '#5a3018'); R(53, 36, 8, 9, '#5a3018'); R(11, 36, 5, 6, '#e0ad7e'); R(53, 36, 5, 6, '#e0ad7e');
    R(32, 37, 21, 22, '#5a3018'); R(25, 36, 10, 11, '#e6b483'); R(39, 36, 10, 11, '#e6b483'); R(32, 47, 14, 10, '#e6b483');
    for (const x of [25, 39]) { R(x, 35, 6, 7, '#fff'); R(x + 0.5, 36, 3.6, 4.2, '#7a3f12'); R(x + 0.5, 36, 2, 2.4, '#111'); R(x - 1, 34, 1, 1, '#fff'); }
    R(29, 44, 1.4, 1, '#3a1a10'); R(35, 44, 1.4, 1, '#3a1a10');
    g.strokeStyle = '#3a1a10'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.arc(32, 46, 6.5, 0.25, Math.PI - 0.25); g.stroke();
    g.fillStyle = '#ff4f9e'; g.beginPath(); g.ellipse(32, 23, 21, 15, 0, Math.PI, 0); g.fill(); g.fillStyle = '#d93a82'; g.fillRect(10, 21, 44, 4); g.beginPath(); g.ellipse(32, 25, 16, 4, 0, 0, Math.PI); g.fill(); R(32, 8.5, 2, 2, '#d93a82'); }
  const bOpt = $('bOpt'); face(bOpt.querySelector('canvas'), 56);
  // ---- panel ----
  const op = document.createElement('div'); op.id = 'gOpt'; op.setAttribute('aria-hidden', 'true');
  op.innerHTML = `<div class="opBox"><div class="opHd"><canvas id="opFace"></canvas><b>OPTIONS</b><button id="opX" title="Close (Esc)">✕</button></div>
  <button class="opB" id="opTitle">BACK TO TITLE SCREEN</button>
  <button class="opB" id="opMute">MUTE: <span>OFF</span></button>
  <button class="opB" id="opCool">COOLER PHONE: <span>ON</span></button>
  <div class="opSub">FLOOR / WALLS / WINDOW <small id="opRoomNote"></small></div>
  <div class="opTabs"><button type="button" class="opTab" id="opTabFloor">FLOOR</button><button type="button" class="opTab off" id="opTabWalls">WALLS</button><button type="button" class="opTab off" id="opTabWin">WINDOW</button></div>
  <div id="opFlTiles"></div><div id="opWlTiles"></div><div id="opWnTiles"></div>
  <div class="opSub">SAVE / LOAD <small id="opNote"></small></div><div id="opSlots"></div></div>
  <div id="opQ"><div class="opQb"><div id="opQt"></div><div id="opQn"></div><div class="opQr"><button class="opB" id="opYes">YES</button><button class="opB" id="opNo">NO</button></div></div></div>`;
  document.body.appendChild(op); face($('opFace'), 64);
  // t795u: floor / walls / window tiles (same set as the start-screen picker). Changing a different one while walking costs 1 ticket; re-pick is free. Start-screen #opt stays free.
  const FL = [['neon','img/floor_neon.webp','CURRENT','NEON','opFlNeon'],['carpet','img/floor_carpet.webp','ARCADE','CHARACTER CARPET','opFlCarpet'],['checkers','img/floor_checkers.webp','CHECKERS','BLACK + GOLD','opFlChk'],['lava','img/floor_lava.webp','LAVA','CAVE PATHS','opFlLava'],['cobble','img/floor_cobble.webp','MEDIEVAL','COBBLESTONE','opFlCob'],['ice','img/floor_ice.webp','ICE','SLIPPERY','opFlIce']];
  const WL = [['current','img/walls_current.webp','CURRENT','NEON PANELS','opWlCur'],['viking','img/walls_viking.webp','VIKING','RUNE WALLS','opWlVik'],['portals','img/walls_portals.webp','PORTALS','SWIRLING VORTEX','opWlPor'],['medieval','img/walls_medieval.webp','MEDIEVAL','STONE WALLS','opWlMed']];
  const WN = [['space','img/window_space.webp','SPACE','NEBULA VIEW','opWnSpace'],['jungle','img/window_jungle.webp','JUNGLE','RAINFOREST','opWnJungle'],['beach','img/window_beach.webp','BEACH','SAND + SEA','opWnBeach']];
  function tile(id, key, attr, src, a, b) { return `<button type="button" class="opFl" id="${id}" data-${attr}="${key}"><img loading="lazy" src="${src}" alt="" draggable="false">${a}<span class="now">${b}</span></button>`; }
  $('opFlTiles').innerHTML = FL.map(x => tile(x[4], x[0], 'floor', x[1], x[2], x[3])).join('');
  $('opWlTiles').innerHTML = WL.map(x => tile(x[4], x[0], 'walls', x[1], x[2], x[3])).join('');
  $('opWnTiles').innerHTML = WN.map(x => tile(x[4], x[0], 'win', x[1], x[2], x[3])).join('');
  const slots = $('opSlots');
  for (let i = 1; i <= SLOTS; i++) { const r = document.createElement('div'); r.className = 'opSl'; r.dataset.i = i;
    r.innerHTML = `<div class="opSi"><b>SLOT ${i}</b><span class="opSs"></span></div><button class="opSm sv">SAVE</button><button class="opSm ld">LOAD</button><button class="opSm dl" title="Delete">🗑</button>`; slots.appendChild(r); }
  const O = window.__opts = { open: false, saves: 0, loads: 0 };
  const inGame = () => play.mode !== 'walk';
  const roomOf = z => z > -HALF ? 'ROOM 1' : z < Z2 + HALF ? 'ROOM 2' : 'HALLWAY';
  const read = i => { try { return JSON.parse(localStorage.getItem(SK(i))); } catch (e) { return null; } };
  const fmt = t => { const d = new Date(t); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); };
  function snapshot() { const k = window.__kiosk, cr = {}; for (const [n, m] of Object.entries(play.machines)) cr[n] = m.credits;
    return { v: 1, at: Date.now(), tickets: play.tickets.total, viking: play.viking ? play.viking.total : 0, cash: k ? { bal: k.C.bal, at: k.C.at } : null, kioskPending: k ? k.pending : 0,
      credits: cr, shield: !!(shield && shield.open), floor: getFloor(), walls: getWalls ? getWalls() : 'medieval', window: getWindow ? getWindow() : 'space', music: !window.__music || window.__music.on,
      pos: monkey.position.toArray().map(v => +v.toFixed(3)), face: +st.face.toFixed(4), yaw: +st.yaw.toFixed(4), room: roomOf(monkey.position.z), run: runSnap(), prizes: localStorage.getItem('neonarcade.prizes'), held: localStorage.getItem('neonarcade.held') }; }
  // per-game arcade run progress (same-origin cabinet keys): session-only, kept only by a SAVE slot
  const RUNK = ['arcade_orc_progress', 'arcade_berserker_save', 'arcade_mc_tickets', 'arcade_cyber_cybercity_save', 'arcade_cyber_cybercity_autosave'];
  function runSnap() { const o = {}; for (const k of RUNK) { const v = localStorage.getItem(k); if (v !== null) o[k] = v; } return o; }
  function apply(s) {
    try { for (const k of RUNK) { if (s.run && k in s.run) localStorage.setItem(k, s.run[k]); else localStorage.removeItem(k); } } catch (e) {}
    try { localStorage.setItem('neonarcade.tickets', String(s.tickets)); localStorage.setItem('neonarcade.vikingTickets', String(s.viking || 0)); } catch (e) {}
    try { for (const [k, v] of [['neonarcade.prizes', s.prizes], ['neonarcade.held', s.held]]) { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } } catch (e) {}
    if (window.__shop && window.__shop.reloadPrizes) window.__shop.reloadPrizes(); else if (window.__shop && window.__shop.hold) window.__shop.hold(s.held || null);
    if (window.__neonSync) window.__neonSync(); if (play.viking) play.viking.total = s.viking || 0; if (play.showVix) play.showVix();
    for (const [n, c] of Object.entries(s.credits || {})) if (play.machines[n]) play.machines[n].credits = c;
    if (play.refresh) play.refresh();
    if (shield && shield.setOpen) shield.setOpen(!!s.shield);
    if (s.floor && s.floor !== getFloor()) setFloor(s.floor);
    if (s.walls && setWalls && s.walls !== getWalls()) setWalls(s.walls);
    if (s.window && setWindow && s.window !== getWindow()) setWindow(s.window);
    if (window.__music && window.__music.setOn) window.__music.setOn(s.music !== false);
    const k = window.__kiosk; if (k && s.cash) k.setState({ bal: s.cash.bal, at: s.cash.at, pending: s.kioskPending || 0 });
    if (s.pos) { monkey.position.fromArray(s.pos); monkey.position.y = 0; st.face = s.face || 0; monkey.rotation.y = st.face; if (typeof s.yaw === 'number') st.yaw = s.yaw; if (st.vel) st.vel.set(0, 0, 0); st.camInit = false; } }
  function tickets() { return play.tickets ? play.tickets.total : 0; }
  function roomNote(need) {
    const n = $('opRoomNote'); if (!n) return;
    n.classList.toggle('need', !!need);
    if (inGame()) { n.textContent = 'EXIT THE GAME TO CHANGE FLOOR OR WALLS'; return; }
    n.textContent = need ? 'NEED 1 TICKET · YOU HAVE 0 🎟' : 'CHANGING COSTS 1 🎟 · YOU HAVE ' + tickets() + ' 🎟';
    if (need) { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; }
  }
  function roomSel() {
    op.querySelectorAll('#opFlTiles .opFl').forEach(e => e.classList.toggle('sel', e.dataset.floor === getFloor()));
    op.querySelectorAll('#opWlTiles .opFl').forEach(e => e.classList.toggle('sel', e.dataset.walls === (getWalls ? getWalls() : 'medieval')));
    op.querySelectorAll('#opWnTiles .opFl').forEach(e => e.classList.toggle('sel', e.dataset.win === (getWindow ? getWindow() : 'space')));
  }
  function roomTab(k) {
    op.classList.toggle('wl', k === 'walls'); op.classList.toggle('wn', k === 'window');
    $('opTabFloor').classList.toggle('off', k !== 'floor');
    $('opTabWalls').classList.toggle('off', k !== 'walls');
    $('opTabWin').classList.toggle('off', k !== 'window');
    O.roomTab = k;
  }
  function pickRoom(kind, v) {
    if (!v || inGame()) { roomNote(false); return; }
    const cur = kind === 'floor' ? getFloor() : kind === 'window' ? (getWindow ? getWindow() : 'space') : (getWalls ? getWalls() : 'medieval');
    if (v === cur) return;
    if (tickets() < 1) { if (window.__floorBtn) window.__floorBtn.need++; roomNote(true); return; }
    try { localStorage.setItem('neonarcade.tickets', String(tickets() - 1)); } catch (e) {}
    if (window.__neonSync) window.__neonSync();
    if (window.__floorBtn) window.__floorBtn.spent++;
    if (kind === 'floor') setFloor(v); else if (kind === 'window' && setWindow) setWindow(v); else if (setWalls) setWalls(v);
    roomSel(); roomNote(false);
  }
  O.pickRoom = pickRoom; O.roomTab = 'floor';
  function render() {
    const g = inGame(); $('opNote').textContent = g ? 'EXIT THE GAME TO SAVE OR LOAD' : '';
    op.classList.toggle('walk', !g);
    roomSel(); roomNote(false);
    $('opMute').querySelector('span').textContent = window.__mute && window.__mute.on ? 'ON' : 'OFF'; $('opMute').classList.toggle('sel', !!(window.__mute && window.__mute.on));
    if ($('opCool') && window.__powerSave) { $('opCool').querySelector('span').textContent = window.__powerSave.on ? 'ON' : 'OFF'; $('opCool').classList.toggle('sel', !!window.__powerSave.on); }
    slots.querySelectorAll('.opSl').forEach(r => { const s = read(r.dataset.i);
      r.querySelector('.opSs').textContent = s ? `${fmt(s.at)} · 🎟${s.tickets} · ⚔${s.viking || 0} · $${s.cash ? s.cash.bal : 5} · ${s.room}` : 'EMPTY';
      r.classList.toggle('full', !!s); r.querySelector('.sv').disabled = g; r.querySelector('.ld').disabled = g || !s; r.querySelector('.dl').disabled = !s; }); }
  let qFn = null;
  function ask(t, n, fn) { $('opQt').textContent = t; $('opQn').textContent = n || ''; qFn = fn; $('opQ').classList.add('on'); O.q = t; }
  function qClose() { $('opQ').classList.remove('on'); qFn = null; O.q = null; }
  O.save = i => { if (inGame()) return false; localStorage.setItem(SK(i), JSON.stringify(snapshot())); O.saves++; if (window.__sess) window.__sess.clean(); render(); return true; };
  O.load = i => { const s = read(i); if (!s || inGame()) return false; apply(s); O.loads++; if (window.__sess) window.__sess.clean(); render(); return true; };
  O.del = i => { localStorage.removeItem(SK(i)); render(); };
  O.snapshot = snapshot; O.render = render;
  function show(on) { O.open = window.__optsOpen = on; if (window.__floorBtn) window.__floorBtn.open = !!on; op.classList.toggle('on', on); op.setAttribute('aria-hidden', on ? 'false' : 'true'); if (!on) qClose(); else render();
    try { for (const c in window.__arcade.keys) window.__arcade.keys[c] = false; } catch (e) {} }
  O.show = show;
  const sw = e => e.stopPropagation();
  for (const el of [bOpt, op]) { el.addEventListener('pointerdown', sw); el.addEventListener('touchstart', sw, { passive: true }); }
  const on = (id, fn) => $(id).addEventListener('click', e => { sw(e); fn(); });
  on('bOpt', () => show(!O.open)); on('opX', () => show(false));
  on('opTitle', () => { show(false); play.home.ask(true); });
  on('opMute', () => { window.__mute.set(!window.__mute.on); render(); });
  on('opCool', () => { if (window.__powerSave) window.__powerSave.set(!window.__powerSave.on); render(); });
  on('opTabFloor', () => roomTab('floor')); on('opTabWalls', () => roomTab('walls')); on('opTabWin', () => roomTab('window'));
  op.addEventListener('click', e => {
    const t = e.target && e.target.closest && e.target.closest('.opFl'); if (!t || !op.contains(t)) return; sw(e);
    if (t.dataset.floor) pickRoom('floor', t.dataset.floor);
    else if (t.dataset.walls) pickRoom('walls', t.dataset.walls);
    else if (t.dataset.win) pickRoom('window', t.dataset.win);
  });
  on('opYes', () => { const f = qFn; qClose(); if (f) f(); }); on('opNo', qClose);
  op.addEventListener('click', e => { if (e.target === op) show(false); });
  slots.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sw(e); const i = +b.closest('.opSl').dataset.i, s = read(i);
    if (b.classList.contains('sv')) { if (s) ask('OVERWRITE SLOT ' + i + '?', 'SAVED ' + fmt(s.at), () => O.save(i)); else O.save(i); }
    else if (b.classList.contains('ld')) ask('LOAD SLOT ' + i + '?', 'YOUR CURRENT PROGRESS WILL BE REPLACED.', () => O.load(i));
    else if (b.classList.contains('dl')) ask('DELETE SLOT ' + i + '?', '', () => O.del(i)); });
  addEventListener('keydown', e => { if (!O.open) return; e.stopImmediatePropagation(); if (e.code === 'Escape') { if (O.q) qClose(); else show(false); } }, true);
  return O;
}
