// Galactic Arcade - neat cabinet DEMO overlay (drop-in kit; built by the Chief for Arcade to wire in).
// It restyles Arcade's existing #demoUI in place: the same element ids (#dTag #dInsert #dCredit #dCost #bTicket #bExit) stay,
// so play.js keeps its click handlers and tests. Layout: score+BEST (drawn by the game) top-left, X under it, DEMO pill top-centre,
// ONE ticket counter top-right (#cdTix; #tix / #vix are hidden while the demo shows), one gold panel at the bottom.
// Tickets: read-only. The count comes from play.js (render({tickets})) or, if not given, from localStorage 'neonarcade.tickets'.
// No new storage keys; nothing here ever writes tickets.
(function () {
  var DEF = { cost: 5, accent: '#ffc020', title: '#ffe14a', pill: '#7fe8ff', exitTop: 64, hideInFrame: [] };
  // per machine: exitTop = px from the top safe edge to the X (below the game's own score + BEST); hideInFrame = the game's own
  // in-frame ticket HUD to hide during the demo so only one counter shows (same-origin iframe #game).
  var CFG = {
    monkey: { exitTop: 92, hideInFrame: ['#tk'] },
    strike: { exitTop: 64 }, ghost: { exitTop: 64, accent: '#ffcc33' }, berserker: { exitTop: 92, accent: '#e0a040' }, orc: { exitTop: 64, accent: '#9fd24a', title: '#d8ff7a' },
    cyber: { exitTop: 64, accent: '#ff3fd0', title: '#7ff6ff', panelBottom: 46 }, blaster: { exitTop: 64 }, pip: { exitTop: 64 }, bb: { exitTop: 64 }, rockfall: { exitTop: 64, accent: '#e8b04a', title: '#ffe27a' }, skytower: { exitTop: 64, accent: '#4fc3ff', title: '#ffe14a' }, nova: { exitTop: 64, accent: '#6fb8ff', title: '#bfe4ff' },
    claw: { cost: 1, exitTop: 64, accent: '#ff7ac0' }, roadster: { exitTop: 92, accent: '#ff6a2a' }, ds: { exitTop: 64, accent: '#4cffb0', title: '#b8ffe0' }
  };
  var D = window.__cabDemo = { mounted: false, key: null, cfg: CFG };
  var root, panel, tix, tixN, styleId = 'cdFrameHide';
  D.configure = function (key, o) { CFG[key] = Object.assign({}, CFG[key] || {}, o || {}); };
  D.config = function (key) { return Object.assign({}, DEF, CFG[key] || {}); };
  D.mount = function () {
    if (D.mounted) return true; root = document.getElementById('demoUI'); if (!root) return false;
    var ins = document.getElementById('dInsert'), cr = document.getElementById('dCredit'), cost = document.getElementById('dCost'), bt = document.getElementById('bTicket');
    panel = document.createElement('div'); panel.id = 'cdPanel'; [ins, cr, cost, bt].forEach(function (e) { if (e) panel.appendChild(e); }); root.appendChild(panel);
    tix = document.createElement('div'); tix.id = 'cdTix'; tix.innerHTML = '<span id="cdTixN">0</span><i></i>'; root.appendChild(tix); tixN = tix.firstChild;
    root.classList.add('cd'); D.mounted = true; return true;
  };
  function lsTickets() { try { return Math.max(0, parseInt(localStorage.getItem('neonarcade.tickets'), 10) || 0); } catch (e) { return 0; } }
  function frameHide(sel) { try { var d = document.getElementById('game').contentDocument; if (!d || !d.head) return; var s = d.getElementById(styleId);
    if (!sel.length) { if (s) s.remove(); return; } if (!s) { s = d.createElement('style'); s.id = styleId; d.head.appendChild(s); } s.textContent = sel.join(',') + '{display:none!important}'; } catch (e) {} }
  // s = { key, credits, cost, tickets, coarse, board } ; call from play.js demoRefresh() (replaces its text writes)
  D.render = function (s) {
    if (!D.mounted && !D.mount()) return; var c = D.config(s.key), cost = s.cost || c.cost, t = s.tickets == null ? lsTickets() : s.tickets, has = t >= cost;
    D.key = s.key; root.style.setProperty('--cd-accent', c.accent); root.style.setProperty('--cd-title', c.title); root.style.setProperty('--cd-pill', c.pill);
    document.body.style.setProperty('--cd-exit', c.exitTop + 'px'); root.style.setProperty('--cd-pb', (c.panelBottom || 0) + 'px');   // cyber: keep its MENU / SOUND buttons clear
    var ins = document.getElementById('dInsert'), cr = document.getElementById('dCredit'), co = document.getElementById('dCost'), bt = document.getElementById('bTicket'), tag = document.getElementById('dTag');
    ins.textContent = s.credits > 0 ? (s.coarse ? 'TAP TO PLAY' : 'TAP / ENTER TO PLAY') : 'INSERT CREDIT'; ins.classList.toggle('ready', s.credits > 0);
    cr.textContent = 'CREDIT ' + s.credits;
    co.textContent = cost > 1 ? cost + ' TICKETS TO PLAY' : '1 TICKET TO PLAY'; co.style.display = '';
    bt.textContent = has ? (cost > 1 ? 'INSERT ' + cost + ' TICKETS' : 'INSERT TICKET') : (cost > 1 ? 'NEED ' + cost + ' TICKETS' : 'NEED A TICKET'); bt.classList.toggle('need', !has);
    if (tag) tag.style.visibility = s.credits > 0 && s.board ? 'hidden' : '';
    tixN.textContent = String(t);
  };
  // show(true) when the demo view opens (demoUI.classList.add('on')), show(false) when it closes
  D.show = function (on) { if (!D.mounted) D.mount(); document.body.classList.toggle('cd-demo', !!on); frameHide(on ? D.config(D.key).hideInFrame : []); };
  // keep body.cd-demo in step with #demoUI.on even if a code path forgets show(); cheap (class check every 250 ms)
  setInterval(function () { if (!root) return; var on = root.classList.contains('on'); if (on !== document.body.classList.contains('cd-demo')) D.show(on); }, 250);
})();
