// Galactic Arcade player customisation start screen (ours, like shop.js). Sits on top of Arcade's #start screen without
// touching their code: it hides their START/OPTIONS row, catches its own taps/keys in a window capture listener registered
// BEFORE theirs (so their swallow-everything handler never sees them), and starts the game by sending their own START
// button the same pointerup their handler listens for. One storage key: 'galacticarcade.player'.
(function () {
  var KEY = 'galacticarcade.player', MAXN = 12;
  var HATS = [['cap', '🧢'], ['crown', '👑'], ['helmet', '🪐'], ['none', '✕']];
  var HOOD = [['navy', 0x1d2452, 0x141a3a], ['red', 0xd42a2a, 0x7a1414], ['blue', 0x2b62e8, 0x173a8a], ['green', 0x2fae3a, 0x16601c], ['yellow', 0xf2c418, 0x9a7a08]];
  var FUR = [['brown', 0x4e2a14, 0xd9a779], ['gold', 0xb7862a, 0xf3d79a], ['silver', 0x8d939c, 0xe4e7ec]];
  var SHOE = [['red', 0x8a1e2c, 0xf1e8d6], ['blue', 0x1f4fbf, 0xeaf0ff], ['black', 0x1a1a1e, 0x4a4a52]];
  var OPTS = { hat: HATS, hoodie: HOOD, fur: FUR, shoes: SHOE };
  function load() { var d = { name: '', hat: 'cap', hoodie: 'navy', fur: 'brown', shoes: 'red' }; try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); for (var k in d) if (typeof o[k] === 'string') d[k] = o[k]; } catch (e) {}
    for (var k2 in OPTS) if (!OPTS[k2].some(function (a) { return a[0] === d[k2]; })) d[k2] = OPTS[k2][0][0]; d.name = clean(d.name); return d; }
  function clean(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, MAXN); }
  var P = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function named() { return P.name.trim().length > 0; }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i]; return list[0]; }

  // ---------- 3D look (recolour Arcade's monkey materials + our own hat meshes) ----------
  var mats = null, hatGeo = null;
  function scanMats(root) { var m = { fur: [], tan: [], navy: [], rib: [], maroon: [], cream: [] }, H = { 0x4e2a14: 'fur', 0xd9a779: 'tan', 0x1d2452: 'navy', 0x141a3a: 'rib', 0x8a1e2c: 'maroon', 0xf1e8d6: 'cream' };
    root.traverse(function (o) { if (o.isMesh && o.material && o.material.color) { var k = H[o.material.userData.gaOrig != null ? o.material.userData.gaOrig : o.material.color.getHex()]; if (k && m[k].indexOf(o.material) < 0) { o.material.userData.gaOrig = o.material.userData.gaOrig != null ? o.material.userData.gaOrig : o.material.color.getHex(); m[k].push(o.material); } } }); return m; }
  function capOf(root) { var c = null; root.traverse(function (o) { if (!c && o.isGroup && o.userData.gaCap) c = o; }); if (c) return c;
    root.traverse(function (o) { if (!c && o.isGroup && o.children.some(function (k) { return k.isMesh && k.material && k.material.color && k.material.color.getHex() === 0xff4f9e; })) c = o; }); if (c) c.userData.gaCap = 1; return c; }
  function hatMeshes(T, cap) { var head = cap.parent, h = head.userData.gaHats; if (h) return h; h = head.userData.gaHats = {};
    var gold = new T.MeshStandardMaterial({ color: 0xffc640, metalness: 1, roughness: 0.25, emissive: 0x402800, emissiveIntensity: 0.5 }), gem = new T.MeshStandardMaterial({ color: 0xff2b6a, roughness: 0.2, emissive: 0x500010 });
    var cr = new T.Group(); cr.position.copy(cap.position); cr.position.y += 0.02;
    var band = new T.Mesh(new T.CylinderGeometry(0.15, 0.14, 0.07, 24, 1, true), gold); band.material.side = T.DoubleSide; band.position.y = 0.03; cr.add(band);
    for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2, s = new T.Mesh(new T.ConeGeometry(0.035, 0.09, 4), gold); s.position.set(Math.sin(a) * 0.14, 0.105, Math.cos(a) * 0.14); cr.add(s);
      var b = new T.Mesh(new T.SphereGeometry(0.014, 8, 6), gold); b.position.set(Math.sin(a) * 0.14, 0.155, Math.cos(a) * 0.14); cr.add(b); }
    var g1 = new T.Mesh(new T.SphereGeometry(0.02, 10, 8), gem); g1.position.set(0, 0.03, 0.15); cr.add(g1); head.add(cr); h.crown = cr;
    var hl = new T.Group(); hl.position.set(0, 0.13, 0.0);
    var glass = new T.Mesh(new T.SphereGeometry(0.29, 28, 20), new T.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.28, depthWrite: false })); hl.add(glass);
    var ring = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 10, 28), new T.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.35, metalness: 0.5 })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.19; hl.add(ring);
    head.add(hl); h.helmet = hl; return h; }
  function applyRoot(T, root) { var cap = capOf(root); if (!cap) return; var h = hatMeshes(T, cap); cap.visible = P.hat === 'cap'; h.crown.visible = P.hat === 'crown'; h.helmet.visible = P.hat === 'helmet'; }
  function applyMats() { if (!mats) return; var ho = find(HOOD, P.hoodie), fu = find(FUR, P.fur), sh = find(SHOE, P.shoes);
    mats.navy.forEach(function (m) { m.color.setHex(ho[1]); }); mats.rib.forEach(function (m) { m.color.setHex(ho[2]); });
    mats.fur.forEach(function (m) { m.color.setHex(fu[1]); }); mats.tan.forEach(function (m) { m.color.setHex(fu[2]); });
    mats.maroon.forEach(function (m) { m.color.setHex(sh[1]); }); mats.cream.forEach(function (m) { m.color.setHex(sh[2]); }); }
  var tag = null, tagName = null;
  function applyTag(T, mk) { if (!tag) { var c = document.createElement('canvas'); c.width = 256; c.height = 64; var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
      tag = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); tag.scale.set(0.8, 0.2, 1); tag.position.y = 2.2; tag.name = 'gaNameTag'; tag.renderOrder = 5; mk.add(tag); }
    if (tagName === P.name) return; tagName = P.name; var c2 = tag.material.map.image, g = c2.getContext('2d'); g.clearRect(0, 0, 256, 64); tag.visible = named(); if (!named()) return;
    g.font = '900 34px "Courier New",monospace'; var w = Math.min(248, g.measureText(P.name).width + 30); g.fillStyle = '#0a0418cc'; g.strokeStyle = '#ff3cf0'; g.lineWidth = 3;
    g.beginPath(); if (g.roundRect) g.roundRect(128 - w / 2, 8, w, 48, 14); else g.rect(128 - w / 2, 8, w, 48); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.shadowColor = '#00e5ff'; g.shadowBlur = 8; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.name, 128, 33, 236); tag.material.map.needsUpdate = true; }
  function apply() { var A = window.__arcade; if (!A || !A.monkey) return; var T = A.THREE; if (!mats) mats = scanMats(A.monkey); applyMats(); applyRoot(T, A.monkey); applyTag(T, A.monkey); if (prev.root) applyRoot(T, prev.root); }

  // ---------- preview (own small renderer + a clone of the real monkey sharing its materials) ----------
  var prev = { root: null, r: null, scene: null, cam: null, rot: 0, want: 0, auto: true, drag: null, raf: 0 };
  function buildPrev() { var A = window.__arcade, T = A.THREE, cv = document.getElementById('gaCv'); if (!cv || prev.r) return;
    try { prev.r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); } catch (e) { return; }
    prev.r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); prev.r.outputColorSpace = T.SRGBColorSpace; prev.r.toneMapping = A.renderer.toneMapping; prev.r.toneMappingExposure = A.renderer.toneMappingExposure;
    var s = prev.scene = new T.Scene(); prev.cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    s.add(new T.HemisphereLight(0xcfd8ff, 0x302040, 1.6)); var d = new T.DirectionalLight(0xffffff, 2.2); d.position.set(1.5, 3, 3); s.add(d);
    var r1 = new T.PointLight(0xff3cf0, 3, 6); r1.position.set(-1.6, 1.4, 1); s.add(r1); var r2 = new T.PointLight(0x00e5ff, 3, 6); r2.position.set(1.6, 1.2, 1); s.add(r2);
    var mk = A.monkey, ud = mk.userData, tg = tag; mk.userData = {}; if (tg) mk.remove(tg); var c = mk.clone(true); mk.userData = ud; if (tg) mk.add(tg);
    c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.visible = true; c.traverse(function (o) { o.visible = o.name === 'idlePhone' ? false : o.visible; }); prev.root = c; s.add(c);
    var disc = new T.Mesh(new T.CylinderGeometry(0.62, 0.68, 0.06, 40), new T.MeshStandardMaterial({ color: 0x120a2a, roughness: 0.4, metalness: 0.6, emissive: 0x1a0a40 })); disc.position.y = -0.03; s.add(disc);
    for (var i = 0; i < 3; i++) { var ring = new T.Mesh(new T.TorusGeometry(0.25 + i * 0.17, 0.012, 6, 48), new T.MeshBasicMaterial({ color: i === 1 ? 0xff3cf0 : 0x00e5ff, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; s.add(ring); }
    var beam = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 2.1, 32, 1, true), new T.MeshBasicMaterial({ color: 0x2a6cff, transparent: true, opacity: 0.08, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })); beam.position.y = 1.05; s.add(beam);
    applyRoot(T, c); }
  function frame() { prev.raf = requestAnimationFrame(frame); if (!prev.r || !ov || !ov.isConnected || !S() || S().dismissed) return;
    var cv = prev.r.domElement, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * prev.r.getPixelRatio()) || cv.height !== Math.round(h * prev.r.getPixelRatio())) { prev.r.setSize(w, h, false); }
    prev.cam.aspect = w / h; var fit = Math.max(1, 0.62 / prev.cam.aspect); prev.cam.position.set(0, 1.25, 5.6 * fit); prev.cam.lookAt(0, 1.0, 0); prev.cam.updateProjectionMatrix();
    if (prev.auto && !prev.drag) prev.want += 0.006; prev.rot += (prev.want - prev.rot) * 0.15; prev.root.rotation.y = prev.rot; prev.r.render(prev.scene, prev.cam); }
  function S() { return window.__start; }

  // ---------- DOM ----------
  var css = '#gaP{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;gap:6px;box-sizing:border-box;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;font-family:"Courier New",monospace;color:#fff;touch-action:pan-y;'
    + 'background:radial-gradient(ellipse at 20% 30%,#5a1f8f88,transparent 55%),radial-gradient(ellipse at 85% 45%,#7a2bb066,transparent 50%),radial-gradient(ellipse at 50% 90%,#1d2a8a66,transparent 60%),#070214}'
    + '#gaStars{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1}'
    + '#gaTk{position:absolute;top:max(10px,env(safe-area-inset-top));left:10px;font:900 14px "Courier New",monospace;color:#ffe08a;background:#0a0418cc;border:2px solid #ffb000aa;border-radius:10px;padding:5px 9px;text-shadow:0 0 6px #ffb000}'
    + '#gaT{text-align:center;font:900 clamp(30px,10vw,54px)/0.95 "Arial Black",Impact,sans-serif;letter-spacing:.04em;margin-top:24px;flex:none}#gaT b{display:block;color:#bff8ff;text-shadow:0 0 6px #00e5ff,0 0 18px #00e5ff,0 0 34px #0090ff}#gaT i{display:block;font-style:normal;color:#ffd0fa;text-shadow:0 0 6px #ff3cf0,0 0 18px #ff3cf0,0 0 34px #c000ff}'
    + '#gaStage{position:relative;flex:1 1 auto;min-height:130px;width:100%;max-width:460px}#gaCv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}'
    + '.gaAr{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:64px;border:none;background:none;color:#7fe8ff;font:900 46px/1 Arial;text-shadow:0 0 10px #00c8ff;cursor:pointer;-webkit-tap-highlight-color:transparent}#gaL{left:2px}#gaR{right:2px}'
    + '.gaBox{width:100%;max-width:440px;box-sizing:border-box;border:2px solid #00e5ffaa;border-radius:14px;background:#0a0620d9;box-shadow:0 0 12px #00e5ff55,inset 0 0 12px #00e5ff22;flex:none}'
    + '#gaNm{padding:8px 12px;text-align:center}#gaNm label{display:block;font:900 17px "Courier New",monospace;letter-spacing:.12em;margin-bottom:6px}'
    + '#gaIn{width:100%;box-sizing:border-box;font:700 18px system-ui,sans-serif;color:#fff;background:#05020e;border:2px solid #00e5ff88;border-radius:10px;padding:9px 12px;text-align:center;outline:none;-webkit-user-select:text;user-select:text;touch-action:manipulation}#gaIn:focus{border-color:#ff3cf0;box-shadow:0 0 10px #ff3cf099}'
    + '.gaRow{display:flex;align-items:center;gap:6px;padding:6px 4px}.gaRow .gaA{width:30px;height:40px;border:none;background:none;color:#7fe8ff;font:900 26px/1 Arial;flex:none;cursor:pointer}'
    + '.gaRow span{width:62px;flex:none;font:900 12px/1.1 "Courier New",monospace;text-align:center;letter-spacing:.04em}.gaCh{flex:1;display:flex;gap:6px;justify-content:center}'
    + '.gaO{width:42px;height:38px;border-radius:8px;border:2px solid #ffffff33;background:#151030;font:20px/1 sans-serif;color:#fff;padding:0;cursor:pointer}.gaO.sel{border-color:#ffd98a;box-shadow:0 0 10px #ffb000cc}'
    + '#gaGo{flex:none;font:900 clamp(26px,8vw,38px)/1 "Arial Black",Impact,sans-serif;letter-spacing:.1em;color:#dffbff;padding:12px 54px;border-radius:14px;border:3px solid #00e5ff;background:linear-gradient(#0c1a3aee,#050a1aee);text-shadow:0 0 8px #00e5ff,0 0 20px #00a0ff;box-shadow:0 0 18px #00e5ffaa,inset 0 0 14px #00e5ff44;cursor:pointer;animation:pp 1.6s ease-in-out infinite}'
    + '#gaGo[hidden]{display:none}#gaHint{flex:none;font:700 12px system-ui;color:#ffd0fa;opacity:.85;min-height:48px;display:flex;align-items:center}#gaHint[hidden]{display:none}'
    + '#gaOpt{position:absolute;top:max(10px,env(safe-area-inset-top));right:76px;font:900 11px "Courier New",monospace;letter-spacing:.1em;color:#dffbff;background:#0a0418cc;border:2px solid #00e5ff88;border-radius:10px;padding:7px 9px}'
    + '#start.ga #stBtns{display:none!important}#start.ga #stBox{visibility:hidden}'
    + '@media (max-height:640px){#gaT{font-size:clamp(24px,7vw,40px);margin-top:18px}.gaRow{padding:3px 4px}.gaO{height:32px}#gaNm{padding:5px 10px}}';
  var ov = null;
  function row(k, label) { var h = '<div class="gaRow" data-k="' + k + '"><button class="gaA" data-step="-1" aria-label="previous">‹</button><span>' + label + '</span><div class="gaCh">';
    OPTS[k].forEach(function (o) { var face = k === 'hat' ? o[1] : ''; var bg = k === 'hat' ? '' : 'background:#' + ('00000' + o[1].toString(16)).slice(-6) + ';';
      if (k === 'shoes') bg = 'background:linear-gradient(135deg,#' + ('00000' + o[1].toString(16)).slice(-6) + ' 55%,#' + ('00000' + o[2].toString(16)).slice(-6) + ' 55%);';
      h += '<button class="gaO" data-v="' + o[0] + '" title="' + o[0] + '" style="' + bg + '">' + face + '</button>'; });
    return h + '</div><button class="gaA" data-step="1" aria-label="next">›</button></div>'; }
  function build() { var st = document.getElementById('start'); if (!st || ov) return; var sty = document.createElement('style'); sty.textContent = css; document.head.appendChild(sty);
    ov = document.createElement('div'); ov.id = 'gaP';
    ov.innerHTML = '<canvas id="gaStars"></canvas><div id="gaTk">🎟 <b id="gaTkN">0</b> TICKETS</div><button id="gaOpt">OPTIONS</button><div id="gaT"><b>GALACTIC</b><i>ARCADE</i></div>'
      + '<div id="gaStage"><canvas id="gaCv"></canvas><button class="gaAr" id="gaL" aria-label="rotate left">‹</button><button class="gaAr" id="gaR" aria-label="rotate right">›</button></div>'
      + '<div class="gaBox" id="gaNm"><label for="gaIn">YOUR NAME</label><input id="gaIn" maxlength="' + MAXN + '" placeholder="Enter your name..." autocomplete="nickname" autocapitalize="words" spellcheck="false" enterkeyhint="go"></div>'
      + '<div class="gaBox">' + row('hat', 'HAT') + row('hoodie', 'HOODIE COLOUR') + row('fur', 'FUR COLOUR') + row('shoes', 'SHOES') + '</div>'
      + '<button id="gaGo" hidden>PLAY</button><div id="gaHint">Type your name to play</div>';
    st.appendChild(ov); st.classList.add('ga'); var inp = document.getElementById('gaIn'); inp.value = P.name;
    inp.addEventListener('input', function () { var v = clean(inp.value); if (v !== inp.value) inp.value = v; P.name = v; save(); sync(); apply(); });
    stars(); sync(); tickets(); }
  function stars() { var c = document.getElementById('gaStars'), w = c.width = 400, h = c.height = 800, g = c.getContext('2d'); for (var i = 0; i < 260; i++) { var r = Math.random(); g.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.7) + ')'; g.fillRect(Math.random() * w, Math.random() * h, r < 0.9 ? 1 : 2, r < 0.9 ? 1 : 2); } }
  function tickets() { var n = 0; try { n = Math.max(0, parseInt(localStorage.getItem('neonarcade.tickets'), 10) || 0); } catch (e) {} var e = document.getElementById('gaTkN'); if (e) e.textContent = n.toLocaleString('en'); }
  function sync() { if (!ov) return; [].forEach.call(ov.querySelectorAll('.gaRow'), function (r) { var k = r.dataset.k; [].forEach.call(r.querySelectorAll('.gaO'), function (b) { b.classList.toggle('sel', b.dataset.v === P[k]); }); });
    document.getElementById('gaGo').hidden = !named(); document.getElementById('gaHint').hidden = named(); }
  function pick(k, v) { P[k] = v; save(); sync(); apply(); }
  function step(k, d) { var L = OPTS[k], i = 0; for (var j = 0; j < L.length; j++) if (L[j][0] === P[k]) i = j; pick(k, L[(i + d + L.length) % L.length][0]); }
  function play() { if (!named()) return; P.name = clean(P.name).trim(); save(); apply(); var inp = document.getElementById('gaIn'); if (inp) inp.blur();
    var b = document.getElementById('stStart'); if (!b) return; var ev; try { ev = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }); } catch (e) { ev = new Event('pointerup', { bubbles: true, cancelable: true }); }
    b.dispatchEvent(ev); window.__gaPlayer.started = (window.__gaPlayer.started || 0) + 1; }
  function opts() { var b = document.getElementById('stOpt'); if (!b) return; var ev; try { ev = new PointerEvent('pointerup', { bubbles: true, cancelable: true }); } catch (e) { ev = new Event('pointerup', { bubbles: true }); } b.dispatchEvent(ev); }

  // ---------- input: runs before Arcade's start-screen swallower (registered first, same capture phase) ----------
  var EV = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup', 'dblclick', 'keypress'];
  function live() { var s = S(); return ov && ov.isConnected && s && s.shown && !s.dismissed && !(document.getElementById('opt') || {}).classList.contains('on'); }
  function grab(e) {
    if (!live()) return;
    var t = e.target && e.target.closest ? e.target : null, inP = t && t.closest('#gaP');
    if (e.type === 'keydown' || e.type === 'keyup' || e.type === 'keypress') {
      var typing = t && t.id === 'gaIn';
      if (/^(Enter|NumpadEnter)$/.test(e.code) || e.key === 'Enter') { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); if (e.type === 'keydown' && !e.repeat && named()) play(); return; }
      if (typing) { e.stopImmediatePropagation(); return; }   // let the character land in the box; nothing reaches the game
      return; }
    if (!inP) return;
    e.stopImmediatePropagation();   // ours: Arcade's handler (and the room) never see it; default actions (focus, typing, click) still happen
    var cv = t.closest('#gaCv');
    if (e.type === 'pointerdown' && cv) { prev.drag = { x: e.clientX, r: prev.want }; prev.auto = false; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (e.cancelable) e.preventDefault(); }
    if (e.type === 'pointerup' && prev.drag) prev.drag = null;
    if (e.type === 'touchstart' && cv && e.cancelable) e.preventDefault();
    if (e.type !== 'click') return;
    var b;
    if (t.closest('#gaGo')) play();
    else if (t.closest('#gaOpt')) opts();
    else if (t.closest('#gaL')) { prev.auto = false; prev.want -= Math.PI / 4; }
    else if (t.closest('#gaR')) { prev.auto = false; prev.want += Math.PI / 4; }
    else if ((b = t.closest('.gaO'))) pick(b.closest('.gaRow').dataset.k, b.dataset.v);
    else if ((b = t.closest('.gaA'))) step(b.closest('.gaRow').dataset.k, +b.dataset.step);
  }
  EV.forEach(function (ty) { window.addEventListener(ty, grab, { capture: true, passive: false }); });
  window.addEventListener('pointermove', function (e) { if (prev.drag) { prev.want = prev.drag.r + (e.clientX - prev.drag.x) * 0.012; } });
  window.addEventListener('pointercancel', function () { prev.drag = null; });

  function boot() { build();
    var t0 = setInterval(function () { var A = window.__arcade; if (!A || !A.monkey || !A.THREE) return; clearInterval(t0); apply(); if (ov) { var go = function () { setTimeout(function () { buildPrev(); frame(); }, 150); }; if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); } }, 100);
    var wrap = setInterval(function () { var U = window.__startUI; if (!U || !U.show || U.show.ga) return; clearInterval(wrap); var o = U.show; U.show = function () { var r = o.apply(this, arguments); tickets(); sync(); return r; }; U.show.ga = 1; }, 200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.__gaPlayer = { KEY: KEY, get p() { return P; }, pick: pick, play: play, apply: apply, opts: OPTS, get tag() { return tag; }, get prev() { return prev; } };
})();
