// In-game OPTIONS (HUD monkey-face button): BACK TO TITLE SCREEN, SAVE / LOAD (5 slots, 'neonarcade.save.1..5'), MUTE.
export function setupOpts({ play, kiosk, shield, st, monkey, setFloor, getFloor, setWalls, getWalls, HALF, Z2 }) {
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
  <div class="opSub">SAVE / LOAD <small id="opNote"></small></div><div id="opSlots"></div></div>
  <div id="opQ"><div class="opQb"><div id="opQt"></div><div id="opQn"></div><div class="opQr"><button class="opB" id="opYes">YES</button><button class="opB" id="opNo">NO</button></div></div></div>`;
  document.body.appendChild(op); face($('opFace'), 64);
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
      credits: cr, shield: !!(shield && shield.open), floor: getFloor(), walls: getWalls ? getWalls() : 'current', music: !window.__music || window.__music.on,
      pos: monkey.position.toArray().map(v => +v.toFixed(3)), face: +st.face.toFixed(4), yaw: +st.yaw.toFixed(4), room: roomOf(monkey.position.z) }; }
  function apply(s) {
    try { localStorage.setItem('neonarcade.tickets', String(s.tickets)); localStorage.setItem('neonarcade.vikingTickets', String(s.viking || 0)); } catch (e) {}
    if (window.__neonSync) window.__neonSync(); if (play.viking) play.viking.total = s.viking || 0; if (play.showVix) play.showVix();
    for (const [n, c] of Object.entries(s.credits || {})) if (play.machines[n]) play.machines[n].credits = c;
    if (play.refresh) play.refresh();
    if (shield && shield.setOpen) shield.setOpen(!!s.shield);
    if (s.floor && s.floor !== getFloor()) setFloor(s.floor);
    if (s.walls && setWalls && s.walls !== getWalls()) setWalls(s.walls);
    if (window.__music && window.__music.setOn) window.__music.setOn(s.music !== false);
    const k = window.__kiosk; if (k && s.cash) k.setState({ bal: s.cash.bal, at: s.cash.at, pending: s.kioskPending || 0 });
    if (s.pos) { monkey.position.fromArray(s.pos); monkey.position.y = 0; st.face = s.face || 0; monkey.rotation.y = st.face; if (typeof s.yaw === 'number') st.yaw = s.yaw; if (st.vel) st.vel.set(0, 0, 0); st.camInit = false; } }
  function render() {
    const g = inGame(); $('opNote').textContent = g ? 'EXIT THE GAME TO SAVE OR LOAD' : '';
    $('opMute').querySelector('span').textContent = window.__mute && window.__mute.on ? 'ON' : 'OFF'; $('opMute').classList.toggle('sel', !!(window.__mute && window.__mute.on));
    slots.querySelectorAll('.opSl').forEach(r => { const s = read(r.dataset.i);
      r.querySelector('.opSs').textContent = s ? `${fmt(s.at)} · 🎟${s.tickets} · ⚔${s.viking || 0} · $${s.cash ? s.cash.bal : 5} · ${s.room}` : 'EMPTY';
      r.classList.toggle('full', !!s); r.querySelector('.sv').disabled = g; r.querySelector('.ld').disabled = g || !s; r.querySelector('.dl').disabled = !s; }); }
  let qFn = null;
  function ask(t, n, fn) { $('opQt').textContent = t; $('opQn').textContent = n || ''; qFn = fn; $('opQ').classList.add('on'); O.q = t; }
  function qClose() { $('opQ').classList.remove('on'); qFn = null; O.q = null; }
  O.save = i => { if (inGame()) return false; localStorage.setItem(SK(i), JSON.stringify(snapshot())); O.saves++; render(); return true; };
  O.load = i => { const s = read(i); if (!s || inGame()) return false; apply(s); O.loads++; render(); return true; };
  O.del = i => { localStorage.removeItem(SK(i)); render(); };
  O.snapshot = snapshot; O.render = render;
  function show(on) { O.open = window.__optsOpen = on; op.classList.toggle('on', on); op.setAttribute('aria-hidden', on ? 'false' : 'true'); if (!on) qClose(); else render();
    try { for (const c in window.__arcade.keys) window.__arcade.keys[c] = false; } catch (e) {} }
  O.show = show;
  const sw = e => e.stopPropagation();
  for (const el of [bOpt, op]) { el.addEventListener('pointerdown', sw); el.addEventListener('touchstart', sw, { passive: true }); }
  const on = (id, fn) => $(id).addEventListener('click', e => { sw(e); fn(); });
  on('bOpt', () => show(!O.open)); on('opX', () => show(false));
  on('opTitle', () => { show(false); play.home.ask(true); });
  on('opMute', () => { window.__mute.set(!window.__mute.on); render(); });
  on('opYes', () => { const f = qFn; qClose(); if (f) f(); }); on('opNo', qClose);
  op.addEventListener('click', e => { if (e.target === op) show(false); });
  slots.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; sw(e); const i = +b.closest('.opSl').dataset.i, s = read(i);
    if (b.classList.contains('sv')) { if (s) ask('OVERWRITE SLOT ' + i + '?', 'SAVED ' + fmt(s.at), () => O.save(i)); else O.save(i); }
    else if (b.classList.contains('ld')) ask('LOAD SLOT ' + i + '?', 'YOUR CURRENT PROGRESS WILL BE REPLACED.', () => O.load(i));
    else if (b.classList.contains('dl')) ask('DELETE SLOT ' + i + '?', '', () => O.del(i)); });
  addEventListener('keydown', e => { if (!O.open) return; e.stopImmediatePropagation(); if (e.code === 'Escape') { if (O.q) qClose(); else show(false); } }, true);
  return O;
}
