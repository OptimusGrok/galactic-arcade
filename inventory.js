// BACKPACK + INVENTORY: a small round backpack button bottom-right during walk-around play (hidden in cabinet games, where the
// game's own FIRE / FORCE / wave buttons live, and on the start screen / overlays). Tap (or I) opens the INVENTORY panel:
// gold tickets, Viking tickets, cash ($ balance + refill countdown below $5). Values live-update. Touches never reach the walk canvas.
(function () {
  var st = document.createElement('style');
  st.textContent =
    '#bPack{position:fixed;right:calc(max(4px,env(safe-area-inset-right)));bottom:calc(max(4px,env(safe-area-inset-bottom)));z-index:24;width:104px;height:104px;border-radius:50%;padding:0;' +
    'border:0;background:none;box-shadow:none;outline:none;-webkit-tap-highlight-color:transparent;display:none;align-items:center;justify-content:center;cursor:pointer;touch-action:none}' +
    '#bPack.on{display:flex}#bPack:active{transform:scale(.93)}#bPack canvas{width:100px;height:100px;pointer-events:none;filter:drop-shadow(0 2px 4px #000c)}' +
    '#inv{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:#05010cb8;touch-action:none}#inv.on{display:flex}' +
    '#invP{width:min(92vw,420px);border-radius:18px;border:3px solid #00e5ff;background:linear-gradient(#140626f4,#08020ff4);box-shadow:0 0 26px #00e5ff77,inset 0 0 18px #ff3cf022;padding:16px 18px 18px;color:#fff;font:700 14px "Courier New",monospace}' +
    '#invHd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}#invHd b{display:flex;align-items:center;gap:10px;font:900 clamp(20px,4.6vmin,28px)/1 "Courier New",monospace;letter-spacing:.14em;color:#dffbff;text-shadow:0 0 10px #00e5ff}' +
    '#invHd canvas{width:34px;height:34px}#invX{width:42px;height:42px;border-radius:50%;border:2px solid #ff3cf0aa;background:#120208;color:#ffd0fa;font:700 20px sans-serif;cursor:pointer}' +
    '.invR{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-top:8px;border-radius:12px;border:2px solid #ffb00088;background:#1e1404cc}' +
    '.invR canvas{width:56px;height:28px;flex:none}.invR .l{flex:1;letter-spacing:.1em;color:#ffe9b0;font-size:13px}.invR .n{font:900 24px "Courier New",monospace;color:#ffe08a;text-shadow:0 0 8px #ffb000}' +
    '#invV{border-color:#b8c4d488;background:#12161ccc}#invV .n{color:#e8eef8;text-shadow:0 0 8px #9fb4d0}#invV .l{color:#dfe6f0}' +
    '#invC{border-color:#3cff7a88;background:#04180ccc}#invC .n{color:#9dffb5;text-shadow:0 0 8px #3cff7a}#invC .l{color:#c8ffd6}#invC small{display:block;font-size:11px;color:#7fdc98;letter-spacing:.06em;margin-top:3px}' +
    '#invP{max-height:calc(100dvh - 20px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;box-sizing:border-box}#invP.noShop #invPz{display:none}' +
    '#invMy{display:block;border-color:#ff3cf088;background:#1a0420cc}#invMy .pzH{display:flex;justify-content:space-between;align-items:baseline;letter-spacing:.12em;color:#ffd0fa;font-size:13px}#invMy .pzH small{font-size:10px;color:#d79ad0;letter-spacing:.04em}' +
    '#invMyL{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.myC{display:flex;align-items:center;gap:6px;padding:5px 8px 5px 5px;border-radius:10px;border:2px solid var(--c,#ff3cf0aa);background:#0d0212;font:700 11px "Courier New",monospace;color:#fff;max-width:100%}' +
    '.myC i{font-style:normal;font-size:20px;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;background:var(--c,#ff3cf0)33;flex:none}.myC b{color:#ffe08a}.myE{color:#d7b8e0;font-size:12px;margin-top:6px;letter-spacing:.06em}' +
    '.invCoin{width:28px!important;height:28px!important;border-radius:50%;background:radial-gradient(#9dffb5,#1d8f45);color:#04180c;font:900 17px/28px sans-serif;text-align:center;flex:none}';
  document.head.appendChild(st);
  // original icon: black backpack, grey cartoon monkey face on the front pocket (big white eyes), (side ear removed)
  function drawPack(c, px) {
    var d = 2; c.width = c.height = px * d; var g = c.getContext('2d'); g.scale(px * d / 100, px * d / 100);
    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    g.lineWidth = 5; g.strokeStyle = '#1b1b1f'; g.beginPath(); g.arc(50, 18, 11, Math.PI, 0); g.stroke();             // top handle
    g.fillStyle = '#111115'; rr(16, 18, 66, 76, 22); g.fill(); g.strokeStyle = '#3a3a44'; g.lineWidth = 2.5; g.stroke();     // bag body
    g.fillStyle = '#1d1d24'; rr(22, 46, 54, 44, 16); g.fill(); g.strokeStyle = '#4a4a55'; g.lineWidth = 2; g.stroke();       // front pocket
    g.strokeStyle = '#55555f'; g.lineWidth = 1.6; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(24, 40); g.quadraticCurveTo(49, 34, 74, 40); g.stroke(); g.setLineDash([]);   // zip
    g.fillStyle = '#9a9ca3'; g.beginPath(); g.ellipse(49, 66, 21, 19, 0, 0, 7); g.fill();                                  // monkey head
    g.fillStyle = '#c4c6cc'; g.beginPath(); g.ellipse(49, 74, 13, 9, 0, 0, 7); g.fill();                                    // muzzle
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(41, 61, 7.5, 8.5, 0, 0, 7); g.ellipse(57, 61, 7.5, 8.5, 0, 0, 7); g.fill();   // big white eyes
    g.fillStyle = '#111'; g.beginPath(); g.arc(42.5, 62.5, 3.4, 0, 7); g.arc(55.5, 62.5, 3.4, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(43.6, 61.2, 1.1, 0, 7); g.arc(56.6, 61.2, 1.1, 0, 7); g.fill();
    g.fillStyle = '#4a4a52'; g.beginPath(); g.ellipse(46, 72, 1.6, 1.2, 0, 0, 7); g.ellipse(52, 72, 1.6, 1.2, 0, 0, 7); g.fill();   // nostrils
    g.strokeStyle = '#4a4a52'; g.lineWidth = 1.8; g.beginPath(); g.arc(49, 75, 5, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();      // smile
    return c; }
  var b = document.createElement('button'); b.id = 'bPack'; b.title = 'Backpack (I)'; b.setAttribute('aria-label', 'Backpack: inventory'); b.appendChild(drawPack(document.createElement('canvas'), 100));
  var inv = document.createElement('div'); inv.id = 'inv'; inv.setAttribute('aria-hidden', 'true'); inv.setAttribute('role', 'dialog'); inv.setAttribute('aria-label', 'Inventory');
  inv.innerHTML = '<div id="invP"><div id="invHd"><b><canvas id="invIco"></canvas>INVENTORY</b><button id="invX" title="Close">\u2715</button></div>' +
    '<div class="invR" id="invG"><canvas></canvas><div class="l">GOLD TICKETS</div><div class="n" id="invGn">0</div></div>' +
    '<div class="invR" id="invV"><canvas></canvas><div class="l">VIKING TICKETS</div><div class="n" id="invVn">0</div></div>' +
    '<div class="invR" id="invC"><div class="invCoin">$</div><div class="l">CASH<small id="invCr"></small></div><div class="n" id="invCn">$0</div></div><div class="invR" id="invMy"></div></div>';
  document.body.appendChild(b); document.body.appendChild(inv);
  drawPack(document.getElementById('invIco'), 34);
  try { TicketArt.toCanvas(document.querySelector('#invG canvas'), 56, false); } catch (e) {}
  var I = window.__inv = { open: false, opens: 0, shown: false, why: '' };
  function vikArt() { var src = document.querySelector('#vix canvas, #vixIco'); var c = document.querySelector('#invV canvas'); if (I.vk || !src || !src.width) return; I.vk = 1; c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); }
  function swallow(e) { e.stopPropagation(); if (e.cancelable && e.type !== 'touchstart') e.preventDefault(); }
  [b, inv].forEach(function (el) { ['pointerdown', 'mousedown', 'pointerup'].forEach(function (t) { el.addEventListener(t, swallow); }); el.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true }); });
  function A() { return window.__arcade || {}; }
  function vals() { var a = A(), p = a.play || {}, k = window.__kiosk, now = window.__kioskNow ? window.__kioskNow() : Date.now(); var v = { gold: p.tickets ? p.tickets.total : 0, viking: p.viking ? p.viking.total : 0, cash: k ? k.C.bal : 0, refill: '' };
    if (k && v.cash < 5) { var left = Math.max(0, k.C.at + 36e5 - now); v.refill = '+$' + (5 - v.cash) + ' in ' + Math.max(0, Math.floor((left - 1) / 6e4)) + 'm'; }
    return v; }
  function fill() { var v = vals(); I.vals = v; document.getElementById('invGn').textContent = v.gold; document.getElementById('invVn').textContent = v.viking; document.getElementById('invV').style.display = v.viking > 0 ? '' : 'none';   // Viking row only once one is won
    document.getElementById('invCn').textContent = '$' + v.cash; document.getElementById('invCr').textContent = v.refill; vikArt(); try { fillMy(); } catch (e) {} }
  // t284u PRIZES: GROK SHOP prizes are drawn by shop.js itself (#invPz, tap to hold); this adds the rest, read from their own sources of truth:
  // wardrobe items bought (player.js owned(), 'galacticarcade.wardrobeOwned'; free start items + the base brown fur / red shoes excluded) and
  // plushes WON in the claw machine ('arcade_clawMachine.collection'). Display-only. 'No prizes yet' when there is nothing at all.
  var WN = { tophat: 'TOP HAT', wizard: 'WIZARD HAT', viking: 'VIKING HELMET', chef: 'CHEF HAT', bunny: 'BUNNY EARS', propeller: 'PROPELLER CAP', monocle: 'MONOCLE', heart: 'HEART GLASSES', star: 'STAR GLASSES', '3d': '3D GLASSES', mustache: 'MUSTACHE', mask: 'NINJA MASK', jetpack: 'JETPACK', cape: 'HERO CAPE', wings: 'ANGEL WINGS', batwings: 'BAT WINGS' };
  var WE = { hat: '\uD83C\uDFA9', glasses: '\uD83D\uDD76\uFE0F', back: '\uD83C\uDF92', hoodie: '\uD83E\uDDE5', fur: '\uD83D\uDC12', shoes: '\uD83D\uDC5F' }, WC = { hat: '#ffb020', glasses: '#3dd6ff', back: '#3dff9a', hoodie: '#ff3cf0', fur: '#c08a5a', shoes: '#ff5a5a' };
  var CLAW = { bear: ['TEDDY BEAR', '\uD83E\uDDF8', '#b8c4d6'], bunny: ['BUNNY', '\uD83D\uDC30', '#b8c4d6'], duck: ['DUCKY', '\uD83E\uDD86', '#b8c4d6'], frog: ['FROG', '\uD83D\uDC38', '#b8c4d6'], cat: ['KITTY', '\uD83D\uDC31', '#3dff9a'], octopus: ['OCTOPUS', '\uD83D\uDC19', '#3dff9a'],
    penguin: ['PENGUIN', '\uD83D\uDC27', '#3dd6ff'], alien: ['ALIEN', '\uD83D\uDC7D', '#3dd6ff'], monkey: ['MONKEY', '\uD83D\uDC35', '#ffb020'], grok: ['GROK', '\uD83E\uDD16', '#ffb020'] };
  function J(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function myPrizes() { var out = [], gp = window.__gaPlayer, o = gp && gp.owned ? gp.owned() : J('galacticarcade.wardrobeOwned', []);
    (Array.isArray(o) ? o : []).forEach(function (id) { var i = String(id).indexOf(':'), k = id.slice(0, i), v = id.slice(i + 1); if (!v || v === 'none' || id === 'fur:brown' || id === 'shoes:red') return;
      if (gp && gp.isFree && gp.isFree(k, v)) return; out.push({ src: 'wardrobe', id: id, name: WN[v] || (v.toUpperCase() + (k === 'hoodie' ? ' HOODIE' : k === 'fur' ? ' FUR' : k === 'shoes' ? ' SHOES' : '')), ic: WE[k] || '\u2728', c: WC[k], n: 1 }); });
    var cl = J('arcade_clawMachine.collection', {}); Object.keys(CLAW).forEach(function (k) { var n = cl[k] | 0; if (n > 0) out.push({ src: 'claw', id: 'claw:' + k, name: CLAW[k][0] + ' PLUSH', ic: CLAW[k][1], c: CLAW[k][2], n: n }); });
    return out; }
  function shopCount() { var p = J('neonarcade.prizes', {}), n = 0; for (var k in p) if ((p[k] | 0) > 0) n++; return n; }
  function fillMy() { var P = document.getElementById('invP'), el = document.getElementById('invMy'); if (!P || !el) return; if (P.lastElementChild !== el) P.appendChild(el);   // after shop.js's #invPz
    var L = myPrizes(), sc = shopCount(); P.classList.toggle('noShop', !sc); I.prizes = { shop: sc, mine: L.map(function (x) { return x.id + (x.n > 1 ? 'x' + x.n : ''); }) };
    var key = sc + '|' + I.prizes.mine.join(); if (el.dataset.k === key) return; el.dataset.k = key; var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
    if (!L.length) { el.style.display = sc ? 'none' : ''; el.innerHTML = '<div class="pzH"><span>PRIZES</span></div><div class="myE">No prizes yet</div>'; return; }
    el.style.display = ''; el.innerHTML = '<div class="pzH"><span>' + (sc ? 'MORE PRIZES' : 'PRIZES') + '</span><small>wardrobe buys \u00B7 claw wins</small></div><div id="invMyL">' +
      L.map(function (x) { return '<span class="myC" data-my="' + esc(x.id) + '" style="--c:' + (x.c || '#ff3cf0') + '"><i>' + x.ic + '</i>' + esc(x.name) + (x.n > 1 ? ' <b>\u00D7' + x.n + '</b>' : '') + '</span>'; }).join('') + '</div>'; }
  I.fillMy = fillMy;
  function canShow() { var a = A(), p = a.play, s = window.__start; if (!p) return 'loading'; if (s && s.shown && !s.dismissed) return 'start'; if (p.mode !== 'walk') return 'game';
    var tv = document.getElementById('tview'); if (tv && tv.classList.contains('on')) return 'ticketview'; var hq = document.getElementById('homeQ'); if (hq && hq.classList.contains('on')) return 'home'; var op = document.getElementById('opt'); if ((op && op.classList.contains('on')) || window.__optsOpen) return 'options';
    if (window.__kiosk && window.__kiosk.mode && window.__kiosk.mode !== 'walk') return 'kiosk'; return ''; }
  function setOpen(on) { if (on && canShow()) return; I.open = on; inv.classList.toggle('on', on); inv.setAttribute('aria-hidden', on ? 'false' : 'true'); if (on) { I.opens++; fill(); } }
  I.setOpen = setOpen; I.fill = fill; I.vals = vals;
  b.addEventListener('click', function (e) { swallow(e); setOpen(!I.open); });
  document.getElementById('invX').addEventListener('click', function (e) { swallow(e); setOpen(false); });
  inv.addEventListener('click', function (e) { if (e.target === inv) setOpen(false); });
  addEventListener('keydown', function (e) { var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA') return;
    if (e.code === 'KeyI' && !e.repeat) { if (I.open) setOpen(false); else if (!canShow()) setOpen(true); e.stopImmediatePropagation(); return; }
    if (I.open && (e.code === 'Escape' || e.code === 'Backspace')) { setOpen(false); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (I.open && /Arrow|Key[WASD]|Space|Enter|KeyE/.test(e.code)) e.stopImmediatePropagation(); }, true);
  setInterval(function () { var why = canShow(); I.why = why; I.shown = !why; b.classList.toggle('on', I.shown); if (why && I.open) setOpen(false); if (I.open) fill(); }, 250);
})();
