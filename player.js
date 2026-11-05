// Galactic Arcade player customisation start screen (ours, like shop.js). Sits on top of Arcade's #start screen without
// touching their code: it hides their START/OPTIONS row, catches its own taps/keys in a window capture listener registered
// BEFORE theirs (so their swallow-everything handler never sees them), and starts the game by sending their own START
// button the same pointerup their handler listens for. One storage key: 'galacticarcade.player'.
(function () {
  var KEY = 'galacticarcade.player', MAXN = 12;
  // hats: 'cap' = Arcade's real pink cap (0xff4f9e, brim 0xd93a82; the old 🧢 emoji drew it blue), 'capblue' = a blue copy
  var HATS = [['cap', '<svg viewBox="0 0 40 30" width="32" height="24"><path d="M6 22a14 14 0 0 1 28 0z" fill="#ff4f9e"/><path d="M30 20q8 0 9 3l-9 1z" fill="#d93a82"/><rect x="5" y="20" width="26" height="4" rx="2" fill="#d93a82"/><circle cx="20" cy="8" r="2" fill="#d93a82"/></svg>'], ['capblue', '<svg viewBox="0 0 40 30" width="32" height="24"><path d="M6 22a14 14 0 0 1 28 0z" fill="#2b7bff"/><path d="M30 20q8 0 9 3l-9 1z" fill="#1a4fc0"/><rect x="5" y="20" width="26" height="4" rx="2" fill="#1a4fc0"/><circle cx="20" cy="8" r="2" fill="#1a4fc0"/></svg>'], ['crown', '👑'], ['helmet', '🪐'], ['beanie', '🧶'], ['cowboy', '🤠'], ['party', '🥳'], ['pirate', '🏴\u200d☠️'], ['halo', '😇'], ['headphones', '🎧'], ['none', '✕']];
  var HOOD = [['navy', 0x1d2452, 0x141a3a], ['red', 0xd42a2a, 0x7a1414], ['blue', 0x2b62e8, 0x173a8a], ['green', 0x2fae3a, 0x16601c], ['yellow', 0xf2c418, 0x9a7a08],
    ['purple', 0x7a2bd6, 0x46137f], ['pink', 0xff5fb4, 0xb02a72], ['orange', 0xff7a1a, 0xa8460a], ['teal', 0x13b8a8, 0x0a6b62], ['black', 0x202026, 0x0c0c10], ['white', 0xe8eaf0, 0xa9adb8]];
  var FUR = [['brown', 0x4e2a14, 0xd9a779], ['gold', 0xb7862a, 0xf3d79a], ['silver', 0x8d939c, 0xe4e7ec], ['black', 0x1c1a1c, 0x8a7a70], ['white', 0xeeeae2, 0xffe0cf], ['ginger', 0xc4561c, 0xf6c08a], ['pink', 0xe86aa8, 0xffd0e4], ['blue', 0x3a6ad8, 0xc8dcff]];
  var SHOE = [['red', 0x8a1e2c, 0xf1e8d6], ['blue', 0x1f4fbf, 0xeaf0ff], ['black', 0x1a1a1e, 0x4a4a52], ['white', 0xf2f2f4, 0xd03040], ['green', 0x1f9a3a, 0xe8ffe8], ['pink', 0xff5fb4, 0xffffff], ['gold', 0xd9a51c, 0x2a1a08], ['purple', 0x6a24c4, 0x00e5ff]];
  var GLAS = [['none', '✕'], ['shades', '<svg viewBox="0 0 40 20" width="34" height="17"><path d="M2 5h36" stroke="#ccc" stroke-width="2"/><ellipse cx="11" cy="10" rx="9" ry="6" fill="#111" stroke="#ccc" stroke-width="1.5"/><ellipse cx="29" cy="10" rx="9" ry="6" fill="#111" stroke="#ccc" stroke-width="1.5"/></svg>'], ['round', '<svg viewBox="0 0 40 20" width="34" height="17"><circle cx="11" cy="10" r="7" fill="#cfeeff44" stroke="#ffc640" stroke-width="2.2"/><circle cx="29" cy="10" r="7" fill="#cfeeff44" stroke="#ffc640" stroke-width="2.2"/><path d="M18 9h4" stroke="#ffc640" stroke-width="2"/></svg>'], ['visor', '<svg viewBox="0 0 40 20" width="34" height="17"><rect x="2" y="4" width="36" height="12" rx="6" fill="#00e5ff" stroke="#fff" stroke-width="1.5"/></svg>']];
  var BACK = [['none', '✕']];
  // shop-only items (t606u): bought for tickets in the in-game wardrobe (shop's wardrobe corner), never listed on the start screen.
  // Each entry: [id, icon(, hex1, hex2 for hoodies)]; price per row in PRICE. Ownership: 'galacticarcade.wardrobeOwned' = ["hat:tophat", ...].
  var NEW = { hat: [['tophat', '🎩'], ['wizard', '🧙'], ['viking', '🛡️'], ['chef', '👨\u200d🍳'], ['bunny', '🐰'], ['propeller', '🚁']],
    glasses: [['monocle', '🧐'], ['heart', '💗'], ['star', '⭐'], ['3d', '<b style="font:900 13px Arial"><span style="color:#ff3030">3</span><span style="color:#30c8ff">D</span></b>'], ['mustache', '🥸'], ['mask', '🥷']],
    back: [['jetpack', '🚀'], ['cape', '🦸'], ['wings', '🪽'], ['batwings', '🦇']],
    hoodie: [['galaxy', 0x2a1470, 0x160a40], ['lime', 0x86e02a, 0x4a8a10], ['maroon', 0x6e1430, 0x3c0818], ['sky', 0x6cc8ff, 0x2a7ab8]] };
  var PRICE = { hat: 5, glasses: 5, back: 5, hoodie: 5 }, OKEY = 'galacticarcade.wardrobeOwned', MIGKEY = 'galacticarcade.wardrobeMig';
  var BASE = { hat: HATS, glasses: GLAS, hoodie: HOOD, fur: FUR, shoes: SHOE }, OPTS = {};
  var START = { hat: [HATS[0], HATS[1]], hoodie: [HOOD[0], HOOD[1], HOOD[3]] };   // + Dave: red (pink 'cap') or blue cap   // t: Dave "start screen only 3 hoodie colours, no other items" (navy default, red, green)
  var START_IDS = {}; for (var sk in START) { START_IDS[sk] = {}; START[sk].forEach(function (a) { START_IDS[sk][a[0]] = 1; }); }
  for (var bk in BASE) OPTS[bk] = BASE[bk].concat(NEW[bk] || []); OPTS.back = BACK.concat(NEW.back);
  var HATS_ALL = OPTS.hat, GLAS_ALL = OPTS.glasses, HOOD_ALL = OPTS.hoodie;
  function isNew(k, v) { return !!(NEW[k] && NEW[k].some(function (a) { return a[0] === v; })); }
  function isStart(k, v) { return !!(START_IDS[k] && START_IDS[k][v]); }
  function isFree(k, v) { return v === 'none' || isStart(k, v); }
  function priceOf(k, v) { if (isFree(k, v)) return 0; if (isNew(k, v)) return PRICE[k]; return 1; }   /* Dave: start opts free; NEW items 5 each; other base items 1 ticket */
  function owned() { try { var a = JSON.parse(localStorage.getItem(OKEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function has(k, v) { return isFree(k, v) || owned().indexOf(k + ':' + v) >= 0; }
  function migrateOwned(d) { try { var o = owned(), ch = 0, add = function (k, v) { if (!v || isFree(k, v)) return; var id = k + ':' + v; if (o.indexOf(id) < 0) { o.push(id); ch = 1; } };
    if (localStorage.getItem(MIGKEY) !== '1') { ['hat', 'hoodie', 'fur', 'shoes', 'glasses', 'back'].forEach(function (k) { add(k, d[k]); }); localStorage.setItem(MIGKEY, '1'); ch = 1; }
    add('fur', 'brown'); add('shoes', 'red');   /* base monkey always owned */
    if (ch) localStorage.setItem(OKEY, JSON.stringify(o)); } catch (e) {} }
  function load() { var d = { name: '', hat: 'cap', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'none', back: 'none' }; try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); for (var k in d) if (typeof o[k] === 'string') d[k] = o[k]; } catch (e) {}
    migrateOwned(d); for (var k2 in OPTS) if (!OPTS[k2].some(function (a) { return a[0] === d[k2]; }) || !has(k2, d[k2])) d[k2] = OPTS[k2][0][0]; d.name = clean(d.name); return d; }
  function clean(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, MAXN); }
  var P = load();
  // first paint: hide Arcade's start art/buttons before the body is even parsed, and give #start our starry backdrop
  try { var es = document.createElement('style'); es.id = 'gaEarly'; es.textContent = '#stBg,#stBox,#stBtns{visibility:hidden!important;opacity:0!important}#start{background:radial-gradient(ellipse at 20% 30%,#5a1f8f88,transparent 55%),radial-gradient(ellipse at 85% 45%,#7a2bb066,transparent 50%),radial-gradient(ellipse at 50% 90%,#1d2a8a66,transparent 60%),#070214!important}';
    (document.head || document.documentElement).appendChild(es); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function named() { return P.name.trim().length > 0; }
  var touchAt = 0, goT = 0;   // PLAY appears only 2 s after the first touch/key on the start screen (and only with a name)
  function goOK() { return touchAt > 0 && Date.now() - touchAt >= 2000; }
  function touched() { if (touchAt) return; touchAt = Date.now(); clearTimeout(goT); goT = setTimeout(sync, 2010); }
  function untouch() { touchAt = 0; clearTimeout(goT); sync(); }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i]; return list[0]; }

  // ---------- 3D look (recolour Arcade's monkey materials + our own hat meshes) ----------
  var mats = null, hatGeo = null;
  function scanMats(root) { var m = { fur: [], tan: [], navy: [], rib: [], maroon: [], cream: [] }, H = { 0x4e2a14: 'fur', 0xd9a779: 'tan', 0x1d2452: 'navy', 0x141a3a: 'rib', 0x8a1e2c: 'maroon', 0xf1e8d6: 'cream' };
    root.traverse(function (o) { if (o.isMesh && o.material && o.material.color) { var k = H[o.material.userData.gaOrig != null ? o.material.userData.gaOrig : o.material.color.getHex()]; if (k && m[k].indexOf(o.material) < 0) { o.material.userData.gaOrig = o.material.userData.gaOrig != null ? o.material.userData.gaOrig : o.material.color.getHex(); m[k].push(o.material); } } }); return m; }
  function capOf(root) { var c = null; root.traverse(function (o) { if (!c && o.isGroup && o.userData.gaCap) c = o; }); if (c) return c;
    root.traverse(function (o) { if (!c && o.isGroup && o.children.some(function (k) { return k.isMesh && k.material && k.material.color && k.material.color.getHex() === 0xff4f9e; })) c = o; }); if (c) c.userData.gaCap = 1; return c; }
  function hatMeshes(T, cap) { var head = cap.parent, h = head.userData.gaHats; if (h && h.crown && h.crown.parent === head) return h;
    head.children.filter(function (o) { return /^ga/.test(o.name); }).forEach(function (o) { head.remove(o); }); h = head.userData.gaHats = {};   // a clone() copies hat refs + meshes: rebuild its own
    var gold = new T.MeshStandardMaterial({ color: 0xffc640, metalness: 1, roughness: 0.25, emissive: 0x402800, emissiveIntensity: 0.5 }), gem = new T.MeshStandardMaterial({ color: 0xff2b6a, roughness: 0.2, emissive: 0x500010 });
    // crown: sits ON the head (head sphere top is ~0.33 above the head node), not inside it
    var cr = new T.Group(); cr.position.set(0, 0.315, -0.005); cr.name = 'gaCrown';
    var band = new T.Mesh(new T.CylinderGeometry(0.135, 0.125, 0.075, 28, 1, true), gold); band.material.side = T.DoubleSide; band.position.y = 0.035; cr.add(band);
    var rim = new T.Mesh(new T.TorusGeometry(0.128, 0.012, 6, 28), gold); rim.rotation.x = Math.PI / 2; cr.add(rim);
    for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2, sp = new T.Mesh(new T.ConeGeometry(0.034, 0.1, 4), gold); sp.position.set(Math.sin(a) * 0.13, 0.12, Math.cos(a) * 0.13); cr.add(sp);
      var bl = new T.Mesh(new T.SphereGeometry(0.016, 8, 6), gold); bl.position.set(Math.sin(a) * 0.13, 0.175, Math.cos(a) * 0.13); cr.add(bl); }
    var g1 = new T.Mesh(new T.SphereGeometry(0.024, 10, 8), gem); g1.position.set(0, 0.04, 0.135); cr.add(g1); head.add(cr); h.crown = cr;
    // space helmet: big glass bubble round the whole head + solid white collar, rim and antenna so it reads at a distance
    var white = new T.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.35, metalness: 0.3 });
    var hl = new T.Group(); hl.position.set(0, 0.15, 0.01); hl.name = 'gaHelmet';
    var glass = new T.Mesh(new T.SphereGeometry(0.31, 32, 22), new T.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, emissive: 0x0a2a44, depthWrite: false, side: T.DoubleSide })); glass.renderOrder = 3; hl.add(glass);
    var col = new T.Mesh(new T.TorusGeometry(0.2, 0.045, 10, 32), white); col.rotation.x = Math.PI / 2; col.position.y = -0.24; hl.add(col);
    var vr = new T.Mesh(new T.TorusGeometry(0.31, 0.018, 8, 40), white); hl.add(vr);   // outline ring round the bubble, facing front
    var an = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.12, 6), white); an.position.set(0.12, 0.33, 0); an.rotation.z = -0.35; hl.add(an);
    var tip = new T.Mesh(new T.SphereGeometry(0.025, 10, 8), new T.MeshBasicMaterial({ color: 0xff3cf0, toneMapped: false })); tip.position.set(0.145, 0.39, 0); hl.add(tip);
    head.add(hl); h.helmet = hl; moreHats(T, head, h);
    var cb = cap.clone(true); cb.name = 'gaHat_capblue'; delete cb.userData.gaCap; cb.traverse(function (o) { if (o.isMesh && o.material) { var hx = o.material.color.getHex(); o.material = o.material.clone(); o.material.userData = {}; o.material.color.setHex(hx === 0xd93a82 ? 0x1a4fc0 : 0x2b7bff); } });
    head.add(cb); h.capblue = cb; newItems(T, head, h); return h; }
  // head space: skull centre y 0.15 r 0.18 (top ~0.333), face +z, eyes y 0.165 z ~0.22, ears x +-0.2. Every hat sits ON/above the skull top.
  function std(T, c, o) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o || {})); }
  function add(g, geo, m, x, y, z, sx, sy, sz) { var e = new g.T.Mesh(geo, m); e.position.set(x || 0, y || 0, z || 0); if (sx) e.scale.set(sx, sy, sz); g.add(e); return e; }
  function grp(T, head, name, y) { var g = new T.Group(); g.name = name; g.position.y = y || 0; g.T = T; head.add(g); return g; }
  function moreHats(T, head, h) { var HALF = Math.PI / 2, g, m;
    g = h.beanie = grp(T, head, 'gaHat_beanie'); var knit = std(T, 0x16c2b2, { roughness: 0.95 }), knit2 = std(T, 0xff7a1a, { roughness: 0.95 });
    add(g, new T.SphereGeometry(0.198, 26, 12, 0, Math.PI * 2, 0, HALF), knit, 0, 0.2, -0.005, 1, 1.0, 1.04);
    m = add(g, new T.CylinderGeometry(0.203, 0.203, 0.065, 26, 1, true), knit2, 0, 0.215, -0.005, 1, 1, 1.04); m.material.side = T.DoubleSide;
    add(g, new T.SphereGeometry(0.055, 12, 10), knit2, 0, 0.41, -0.005);
    g = h.cowboy = grp(T, head, 'gaHat_cowboy'); var lea = std(T, 0x8b5a2b, { roughness: 0.7 }), bnd = std(T, 0x2a1608);
    add(g, new T.CylinderGeometry(0.34, 0.34, 0.02, 36), lea, 0, 0.29, 0, 1, 1, 0.9);
    add(g, new T.CylinderGeometry(0.125, 0.155, 0.18, 26), lea, 0, 0.385, 0);
    add(g, new T.CylinderGeometry(0.152, 0.158, 0.04, 26, 1, true), bnd, 0, 0.32, 0, 1.01, 1, 1.01);
    add(g, new T.SphereGeometry(0.13, 20, 8, 0, Math.PI * 2, 0, HALF), lea, 0, 0.47, 0, 0.97, 0.22, 1);
    g = h.party = grp(T, head, 'gaHat_party'); g.rotation.z = -0.14; var pm = std(T, 0xff3cf0, { emissive: 0x400030 }), py = std(T, 0xffe14a, { emissive: 0x302000 });
    add(g, new T.ConeGeometry(0.115, 0.32, 26), pm, 0, 0.45, 0);
    [0.35, 0.45, 0.55].forEach(function (y) { var r = 0.115 * (0.61 - y) / 0.32; m = add(g, new T.TorusGeometry(r + 0.004, 0.011, 6, 24), py, 0, y, 0); m.rotation.x = HALF; });
    add(g, new T.SphereGeometry(0.04, 12, 10), py, 0, 0.62, 0);
    g = h.pirate = grp(T, head, 'gaHat_pirate', 0.29); var blk = std(T, 0x15151a, { roughness: 0.5 }), wh = std(T, 0xf4f4f0), gd = std(T, 0xffc640, { metalness: 1, roughness: 0.3, emissive: 0x402800 });
    add(g, new T.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, HALF), blk, 0, -0.01, 0, 1, 0.85, 1);
    add(g, new T.SphereGeometry(0.2, 28, 14), blk, 0, 0.09, 0, 1.6, 0.62, 0.5);
    m = add(g, new T.TorusGeometry(0.2, 0.009, 6, 40), gd, 0, 0.09, 0.0, 1.6, 0.62, 1);
    add(g, new T.SphereGeometry(0.034, 12, 10), wh, 0, 0.12, 0.1, 1, 1, 0.5);
    [-0.7, 0.7].forEach(function (a) { m = add(g, new T.BoxGeometry(0.1, 0.014, 0.01), wh, 0, 0.075, 0.1); m.rotation.z = a; });
    g = h.halo = grp(T, head, 'gaHat_halo', 0.47); g.rotation.x = -0.12;
    m = add(g, new T.TorusGeometry(0.15, 0.022, 12, 44), new T.MeshBasicMaterial({ color: 0xffe680, toneMapped: false })); m.rotation.x = HALF;
    m = add(g, new T.TorusGeometry(0.15, 0.05, 10, 44), new T.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.25, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); m.rotation.x = HALF;
    g = h.headphones = grp(T, head, 'gaHat_headphones'); var dk = std(T, 0x202028, { roughness: 0.35, metalness: 0.4 }), glow = new T.MeshBasicMaterial({ color: 0xff3cf0, toneMapped: false });
    add(g, new T.TorusGeometry(0.222, 0.02, 8, 36, Math.PI), dk, 0, 0.15, 0);
    [-1, 1].forEach(function (sd) { m = add(g, new T.CylinderGeometry(0.078, 0.078, 0.055, 22), dk, 0.232 * sd, 0.15, 0); m.rotation.z = HALF;
      m = add(g, new T.TorusGeometry(0.062, 0.011, 6, 22), glow, 0.262 * sd, 0.15, 0); m.rotation.y = HALF; });
    // glasses (their own row)
    var G = h.gl = {}, arms = function (g, mat) { [-1, 1].forEach(function (sd) { add(g, new T.BoxGeometry(0.012, 0.012, 0.2), mat, 0.158 * sd, 0.18, 0.14); }); };
    g = G.shades = grp(T, head, 'gaGl_shades'); var ln = std(T, 0x07070c, { metalness: 0.7, roughness: 0.08, emissive: 0x1a0016 }), fr = std(T, 0x111114);
    [-1, 1].forEach(function (sd) { m = add(g, new T.CylinderGeometry(0.052, 0.052, 0.014, 26), ln, 0.068 * sd, 0.172, 0.245, 1.2, 1, 0.82); m.rotation.x = HALF; });
    add(g, new T.BoxGeometry(0.05, 0.013, 0.012), fr, 0, 0.19, 0.245); add(g, new T.BoxGeometry(0.29, 0.014, 0.012), fr, 0, 0.205, 0.243); arms(g, fr);
    g = G.round = grp(T, head, 'gaGl_round'); var rim = std(T, 0xd4a017, { metalness: 0.9, roughness: 0.3 }), gl = new T.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
    [-1, 1].forEach(function (sd) { add(g, new T.TorusGeometry(0.046, 0.008, 8, 28), rim, 0.066 * sd, 0.17, 0.245); add(g, new T.CircleGeometry(0.044, 24), gl, 0.066 * sd, 0.17, 0.244); });
    add(g, new T.BoxGeometry(0.04, 0.009, 0.009), rim, 0, 0.18, 0.247); arms(g, rim);
    g = G.visor = grp(T, head, 'gaGl_visor'); var vz = new T.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x0090b0, emissiveIntensity: 0.9, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.3, side: T.DoubleSide }), wt = std(T, 0xf2f4f8, { metalness: 0.3 });
    add(g, new T.CylinderGeometry(0.255, 0.255, 0.08, 32, 1, true, -0.95, 1.9), vz, 0, 0.17, -0.01);
    [-0.045, 0.045].forEach(function (y) { add(g, new T.CylinderGeometry(0.258, 0.258, 0.012, 32, 1, true, -0.95, 1.9), wt, 0, 0.17 + y, -0.01).material.side = T.DoubleSide; });
    [-1, 1].forEach(function (sd) { add(g, new T.SphereGeometry(0.034, 12, 10), wt, Math.sin(0.95) * 0.255 * sd, 0.17, Math.cos(0.95) * 0.255 - 0.01); });
    add(g, new T.CylinderGeometry(0.212, 0.212, 0.03, 28, 1, true, 0.95, Math.PI * 2 - 1.9), fr, 0, 0.17, -0.01).material.side = T.DoubleSide; }
  // ---------- shop-only items: low-poly (few segments, shared materials) ----------
  function newItems(T, head, h) { var HALF = Math.PI / 2, g, m, G = h.gl;
    var blk = std(T, 0x16161c, { roughness: 0.5 }), red = std(T, 0xc81e2a), wh = std(T, 0xf4f4f0, { roughness: 0.7 }), gd = std(T, 0xffc640, { metalness: 1, roughness: 0.3, emissive: 0x402800 });
    g = h.tophat = grp(T, head, 'gaHat_tophat'); add(g, new T.CylinderGeometry(0.27, 0.27, 0.02, 20), blk, 0, 0.3, 0); add(g, new T.CylinderGeometry(0.15, 0.15, 0.26, 20), blk, 0, 0.43, 0);
    add(g, new T.CylinderGeometry(0.153, 0.153, 0.045, 20, 1, true), red, 0, 0.33, 0);
    g = h.wizard = grp(T, head, 'gaHat_wizard'); g.rotation.z = 0.12; var wz = std(T, 0x3a2bb8, { emissive: 0x0a0630 }), ws = new T.MeshBasicMaterial({ color: 0xffe14a, toneMapped: false });
    add(g, new T.CylinderGeometry(0.31, 0.31, 0.018, 20), wz, 0, 0.29, 0); add(g, new T.ConeGeometry(0.17, 0.46, 16), wz, 0, 0.52, 0);
    [[0.08, 0.45, 0.12], [-0.06, 0.6, 0.08], [0.03, 0.36, 0.16]].forEach(function (q) { add(g, new T.OctahedronGeometry(0.03), ws, q[0], q[1], q[2]); });
    g = h.viking = grp(T, head, 'gaHat_viking'); var st = std(T, 0x9aa3ad, { metalness: 0.8, roughness: 0.35 }), hn = std(T, 0xf0e6cc, { roughness: 0.6 });
    add(g, new T.SphereGeometry(0.2, 18, 9, 0, Math.PI * 2, 0, HALF), st, 0, 0.21, 0, 1, 0.95, 1.04); m = add(g, new T.TorusGeometry(0.2, 0.018, 6, 20), gd, 0, 0.22, 0); m.rotation.x = HALF;
    [-1, 1].forEach(function (sd) { m = add(g, new T.ConeGeometry(0.045, 0.22, 8), hn, 0.23 * sd, 0.36, 0); m.rotation.z = -0.9 * sd; });
    g = h.chef = grp(T, head, 'gaHat_chef'); add(g, new T.CylinderGeometry(0.17, 0.165, 0.14, 18), wh, 0, 0.36, 0);
    [[0, 0.5, 0, 0.13], [0.1, 0.47, 0.05, 0.1], [-0.1, 0.47, 0.05, 0.1], [0, 0.47, -0.1, 0.1]].forEach(function (q) { add(g, new T.SphereGeometry(q[3], 12, 8), wh, q[0], q[1], q[2]); });
    g = h.bunny = grp(T, head, 'gaHat_bunny'); var bw = std(T, 0xf6f0f4, { roughness: 0.9 }), bp = std(T, 0xff9cc8, { roughness: 0.9 });
    add(g, new T.TorusGeometry(0.2, 0.014, 6, 20, Math.PI), std(T, 0xff5fb4), 0, 0.15, 0);
    [-1, 1].forEach(function (sd) { var e = new T.Group(); e.position.set(0.09 * sd, 0.32, 0); e.rotation.z = -0.22 * sd; g.add(e); e.T = T;
      add(e, new T.SphereGeometry(0.06, 10, 8), bw, 0, 0.17, 0, 0.75, 2.6, 0.45); add(e, new T.SphereGeometry(0.035, 8, 6), bp, 0, 0.17, 0.02, 0.75, 2.6, 0.4); });
    g = h.propeller = grp(T, head, 'gaHat_propeller'); var pb = std(T, 0x2b62e8), py = std(T, 0xf2c418), pr = std(T, 0xd42a2a);
    add(g, new T.SphereGeometry(0.192, 18, 9, 0, Math.PI * 2, 0, HALF), pb, 0, 0.2, -0.005, 1, 0.95, 1.04); add(g, new T.CylinderGeometry(0.012, 0.012, 0.09, 6), py, 0, 0.42, 0);
    m = add(g, new T.BoxGeometry(0.34, 0.008, 0.05), pr, 0, 0.465, 0); m.rotation.y = 0.5; m.name = 'gaProp';
    // glasses & face (same slot as the glasses row)
    var arms = function (g, mat) { [-1, 1].forEach(function (sd) { add(g, new T.BoxGeometry(0.012, 0.012, 0.2), mat, 0.158 * sd, 0.18, 0.14); }); };
    g = G.monocle = grp(T, head, 'gaGl_monocle'); add(g, new T.TorusGeometry(0.05, 0.009, 6, 20), gd, 0.068, 0.17, 0.245); add(g, new T.CircleGeometry(0.048, 16), new T.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.35, depthWrite: false }), 0.068, 0.17, 0.244);
    m = add(g, new T.CylinderGeometry(0.003, 0.003, 0.2, 4), gd, 0.11, 0.07, 0.24); m.rotation.z = 0.3;
    var heartGeo = (function () { var sh = new T.Shape(); sh.moveTo(0, -0.04); sh.bezierCurveTo(-0.06, 0, -0.05, 0.05, 0, 0.025); sh.bezierCurveTo(0.05, 0.05, 0.06, 0, 0, -0.04); return new T.ShapeGeometry(sh, 4); })();
    var starGeo = (function () { var sh = new T.Shape(); for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2, r = i % 2 ? 0.022 : 0.052; sh[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r); } return new T.ShapeGeometry(sh); })();
    g = G.heart = grp(T, head, 'gaGl_heart'); var hm = std(T, 0xff2b8a, { emissive: 0x500020, side: T.DoubleSide }); [-1, 1].forEach(function (sd) { add(g, heartGeo, hm, 0.068 * sd, 0.172, 0.248, 1.25, 1.25, 1); }); add(g, new T.BoxGeometry(0.05, 0.01, 0.01), hm, 0, 0.19, 0.247); arms(g, hm);
    g = G.star = grp(T, head, 'gaGl_star'); var sm = std(T, 0xffd21a, { emissive: 0x504000, side: T.DoubleSide }); [-1, 1].forEach(function (sd) { add(g, starGeo, sm, 0.07 * sd, 0.172, 0.248, 1.15, 1.15, 1); }); add(g, new T.BoxGeometry(0.05, 0.01, 0.01), sm, 0, 0.19, 0.247); arms(g, sm);
    g = G['3d'] = grp(T, head, 'gaGl_3d'); var fw = std(T, 0xf4f4f0); add(g, new T.BoxGeometry(0.3, 0.085, 0.012), fw, 0, 0.172, 0.243);
    add(g, new T.PlaneGeometry(0.1, 0.06), new T.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85 }), -0.068, 0.172, 0.25); add(g, new T.PlaneGeometry(0.1, 0.06), new T.MeshBasicMaterial({ color: 0x20c0ff, transparent: true, opacity: 0.85 }), 0.068, 0.172, 0.25); arms(g, fw);
    g = G.mustache = grp(T, head, 'gaGl_mustache'); var mu = std(T, 0x2a160a, { roughness: 0.9 }); [-1, 1].forEach(function (sd) { m = add(g, new T.SphereGeometry(0.045, 10, 6), mu, 0.045 * sd, 0.085, 0.27, 1.3, 0.45, 0.6); m.rotation.z = 0.35 * sd; });
    g = G.mask = grp(T, head, 'gaGl_mask'); var mk = std(T, 0x18181e, { roughness: 0.8, side: T.DoubleSide }); add(g, new T.CylinderGeometry(0.205, 0.205, 0.065, 20, 1, true), mk, 0, 0.17, 0);
    [-1, 1].forEach(function (sd) { m = add(g, new T.BoxGeometry(0.03, 0.12, 0.01), mk, 0.05 * sd, 0.15, -0.21); m.rotation.z = 0.4 * sd; });
    // backs & extras: on the torso (head.parent.parent), behind the shoulders (-z)
    var torso = head.parent && head.parent.parent || head; torso.children.filter(function (o) { return /^gaBk/.test(o.name); }).forEach(function (o) { torso.remove(o); });
    var B = {}; Object.defineProperty(h, 'bk', { value: B, enumerable: false, configurable: true }); var bg = function (n) { var q = new T.Group(); q.name = 'gaBk_' + n; q.T = T; q.position.set(0, 0.3, -0.2); torso.add(q); return q; };
    g = B.jetpack = bg('jetpack'); var jm = std(T, 0xb8c0cc, { metalness: 0.7, roughness: 0.35 }), jr = std(T, 0xd42a2a), fl = new T.MeshBasicMaterial({ color: 0xff8a1a, transparent: true, opacity: 0.85, toneMapped: false });
    [-1, 1].forEach(function (sd) { add(g, new T.CylinderGeometry(0.07, 0.07, 0.3, 10), jm, 0.08 * sd, 0, -0.05); add(g, new T.ConeGeometry(0.07, 0.08, 10), jr, 0.08 * sd, 0.19, -0.05);
      m = add(g, new T.ConeGeometry(0.05, 0.16, 8), fl, 0.08 * sd, -0.24, -0.05); m.rotation.x = Math.PI; m.name = 'gaFlame'; });
    add(g, new T.BoxGeometry(0.14, 0.2, 0.05), std(T, 0x303038), 0, 0, 0);
    g = B.cape = bg('cape'); var cp = std(T, 0xd42a2a, { side: T.DoubleSide, roughness: 0.7 }); m = add(g, new T.PlaneGeometry(0.56, 0.95, 1, 3), cp, 0, -0.42, -0.06); m.rotation.x = 0.12;
    add(g, new T.BoxGeometry(0.4, 0.04, 0.04), gd, 0, 0.04, 0.02);
    var wingGeo = (function () { var sh = new T.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.15, 0.25, 0.4, 0.3, 0.45, 0.18); sh.bezierCurveTo(0.38, 0.1, 0.42, -0.02, 0.32, -0.08); sh.bezierCurveTo(0.25, -0.2, 0.1, -0.15, 0, 0); return new T.ShapeGeometry(sh, 6); })();
    var batGeo = (function () { var sh = new T.Shape(); sh.moveTo(0, 0.05); sh.lineTo(0.2, 0.22); sh.lineTo(0.46, 0.18); sh.lineTo(0.4, 0.02); sh.lineTo(0.32, -0.08); sh.lineTo(0.22, 0.0); sh.lineTo(0.14, -0.1); sh.lineTo(0.06, -0.02); sh.lineTo(0, -0.05); return new T.ShapeGeometry(sh); })();
    [['wings', wingGeo, std(T, 0xf8f8ff, { side: T.DoubleSide, emissive: 0x303040 })], ['batwings', batGeo, std(T, 0x2a1838, { side: T.DoubleSide, roughness: 0.6 })]].forEach(function (w) {
      g = B[w[0]] = bg(w[0]); [-1, 1].forEach(function (sd) { m = add(g, w[1], w[2], 0.06 * sd, 0.05, -0.04, 1.5 * sd, 1.5, 1); m.rotation.y = -0.45 * sd; }); });
  }
  var HAT3D = ['capblue', 'crown', 'helmet', 'beanie', 'cowboy', 'party', 'pirate', 'halo', 'headphones'].concat(NEW.hat.map(function (a) { return a[0]; }));
  function applyRoot(T, root, lk) { lk = lk || P; var cap = capOf(root); if (!cap) return; var h = hatMeshes(T, cap); cap.visible = lk.hat === 'cap';
    HAT3D.forEach(function (k) { h[k].visible = lk.hat === k; }); for (var g in h.gl) h.gl[g].visible = lk.glasses === g; for (var b in h.bk) h.bk[b].visible = lk.back === b;
    var bp = cap.parent.parent && cap.parent.parent.parent && cap.parent.parent.parent.getObjectByName('backpack'); if (bp) bp.visible = !lk.back || lk.back === 'none'; }   // Dave: a back item replaces Arcade's backpack (straps stay)
  // for Arcade's mp.js (optional): dress any monkey root (e.g. a remote one whose materials keep userData.orig) in a look object
  function dress(root, lk) { var A = window.__arcade; if (!A || !root || !lk) return; var T = A.THREE, map = {}, ho = find(HOOD_ALL, lk.hoodie), fu = find(FUR, lk.fur), sh = find(SHOE, lk.shoes);
    map[0x1d2452] = ho[1]; map[0x141a3a] = ho[2]; map[0x4e2a14] = fu[1]; map[0xd9a779] = fu[2]; map[0x8a1e2c] = sh[1]; map[0xf1e8d6] = sh[2];
    root.traverse(function (o) { if (!o.isMesh || !o.material || !o.material.color) return; var u = o.material.userData, or = u.orig != null ? u.orig : u.gaOrig; if (or != null && map[or] != null) o.material.color.setHex(map[or]); });
    applyRoot(T, root, { hat: find(HATS_ALL, lk.hat)[0], glasses: find(GLAS_ALL, lk.glasses)[0], back: find(OPTS.back, lk.back)[0] }); }
  function applyMats(L) { if (!mats) return; L = L || P; var ho = find(HOOD_ALL, L.hoodie), fu = find(FUR, L.fur), sh = find(SHOE, L.shoes);
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
  // phones drop a second WebGL context under memory pressure (the game's renderer is heavy): the canvas then freezes on its
  // last frame, so hat picks never appear. On loss, swap in a fresh canvas + renderer and keep drawing the same scene.
  function mkR(cv) { var A = window.__arcade, T = A.THREE; try { prev.r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: false, powerPreference: 'low-power' }); } catch (e) { prev.r = null; return false; }
    prev.r.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); prev.r.outputColorSpace = T.SRGBColorSpace; prev.r.toneMapping = A.renderer.toneMapping; prev.r.toneMappingExposure = A.renderer.toneMappingExposure;
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); prev.lost = (prev.lost || 0) + 1; setTimeout(function () { if (prev.r && prev.r.domElement === cv) remake(); }, 300); }, { once: true });
    return true; }
  function remake() { var old = prev.r && prev.r.domElement, n = document.createElement('canvas'); n.id = (old && old.id) || 'gaCv'; try { prev.r.dispose(); } catch (e) {} prev.r = null;
    if (old && old.parentNode) old.parentNode.replaceChild(n, old); if (mkR(n)) { prev.remakes = (prev.remakes || 0) + 1; prev.hat = null; } }
  function buildPrev() { var cv = ov && ov.querySelector('#gaCv'); if (!cv || !ov.isConnected || prev.r) return; buildScene(); attach(cv); }
  // the preview canvas that should be drawing now: the wardrobe's when it is open, else the start screen's while that is up
  function want() { if (W.el && W.el.isConnected && W.open) return W.el.querySelector('#gaWCv'); if (ov && ov.isConnected && S() && !S().dismissed) return ov.querySelector('#gaCv'); return null; }
  // free the preview's WebGL context AND swap its canvas for a fresh one: a canvas whose context was lost stays lost forever
  // (getContext returns the dead context), which gave a white preview on the 2nd wardrobe open / start-screen return.
  function freeR() { var r = prev.r; if (!r) return; prev.r = null; var old = r.domElement; try { r.dispose(); r.forceContextLoss(); } catch (e) {}
    if (old && old.parentNode) { var n = document.createElement('canvas'); n.id = old.id; old.parentNode.replaceChild(n, old); } prev.frees = (prev.frees || 0) + 1; }
  function attach(cv) { if (prev.r && prev.r.domElement === cv) return; freeR(); if (!cv.isConnected) return; if (mkR(cv)) prev.hat = null; }
  function buildScene() { var A = window.__arcade, T = A.THREE; if (prev.scene) return;
    var s = prev.scene = new T.Scene(); prev.cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    s.add(new T.HemisphereLight(0xcfd8ff, 0x302040, 1.6)); var d = new T.DirectionalLight(0xffffff, 2.2); d.position.set(1.5, 3, 3); s.add(d);
    var r1 = new T.PointLight(0xff3cf0, 3, 6); r1.position.set(-1.6, 1.4, 1); s.add(r1); var r2 = new T.PointLight(0x00e5ff, 3, 6); r2.position.set(1.6, 1.2, 1); s.add(r2);
    var mk = A.monkey, ud = mk.userData, tg = tag; mk.userData = {}; if (tg) mk.remove(tg); var c = mk.clone(true); mk.userData = ud; if (tg) mk.add(tg);
    var junk = []; c.traverse(function (o) { if (/^ga/.test(o.name)) junk.push(o); delete o.userData.gaHats; }); junk.forEach(function (o) { o.parent.remove(o); });   // userData is JSON-copied by clone(): drop the copied hat refs so the preview builds its own
    c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.visible = true; c.traverse(function (o) { o.visible = o.name === 'idlePhone' ? false : o.visible; }); prev.root = c; s.add(c);
    var disc = new T.Mesh(new T.CylinderGeometry(0.62, 0.68, 0.06, 40), new T.MeshStandardMaterial({ color: 0x120a2a, roughness: 0.4, metalness: 0.6, emissive: 0x1a0a40 })); disc.position.y = -0.03; s.add(disc);
    for (var i = 0; i < 3; i++) { var ring = new T.Mesh(new T.TorusGeometry(0.25 + i * 0.17, 0.012, 6, 48), new T.MeshBasicMaterial({ color: i === 1 ? 0xff3cf0 : 0x00e5ff, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; s.add(ring); }
    var beam = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 2.1, 32, 1, true), new T.MeshBasicMaterial({ color: 0x2a6cff, transparent: true, opacity: 0.08, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })); beam.position.y = 1.05; s.add(beam);
    applyRoot(T, c); }
  function frame() { prev.raf = requestAnimationFrame(frame); var wc = want(); if (!wc || !prev.scene) return; if (!prev.r || prev.r.domElement !== wc) attach(wc); if (!prev.r) return; if (prev.r.getContext().isContextLost()) { if (!prev.lostAt) prev.lostAt = performance.now(); if (performance.now() - prev.lostAt > 600) { prev.lostAt = 0; remake(); } return; } prev.lostAt = 0;
    var cv = prev.r.domElement, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * prev.r.getPixelRatio()) || cv.height !== Math.round(h * prev.r.getPixelRatio())) { prev.r.setSize(w, h, false); }
    prev.cam.aspect = w / h; var fit = Math.max(1, 0.62 / prev.cam.aspect); prev.cam.position.set(0, 1.3, 4.9 * fit); prev.cam.lookAt(0, 1.02, 0); prev.cam.updateProjectionMatrix();
    var PL = pLook(); if (wc.id === 'gaCv') { PL = Object.assign({}, PL, { glasses: 'none', hat: stHat ? PL.hat : 'none' }); }   // Dave: no hat until a cap is tapped   // Dave: no eyewear on the start screen (saved glasses kept for the game)
    var pk = PL.hat + PL.glasses + PL.back + PL.hoodie + wc.id; if (prev.hat !== pk) { prev.hat = pk; applyRoot(window.__arcade.THREE, prev.root, PL); if (W.try) applyMats(PL); }   // the preview always wears the chosen hat, however the pick or load happened
    if (prev.auto && !prev.drag) prev.want += 0.006; prev.rot += (prev.want - prev.rot) * 0.15; prev.root.rotation.y = prev.rot;
    var now = performance.now(), dt = Math.min(0.25, prev.lt ? (now - prev.lt) / 1000 : 0.016); prev.lt = now;
    if (!TP.seen && wc.id === 'gaCv') { TP.seen = true; TP.gone = false; tpStart('in'); }   // first paint of the start screen: beam in
    tpRender(tpStep(dt)); }
  // ---------- start-screen teleport (same look as teleport.js: cyan swirl column, rising sparkles, feet-up dissolve, flash, zap/vwoom) ----------
  // beams IN when the start screen is first painted (and on every return to it); on PLAY it beams OUT, then the game starts.
  // Clipping is the preview renderer's own (global) plane, so the real monkey's shared materials are never touched.
  var TP = { st: 'idle', t: 0, ins: 0, outs: 0, seen: false, cb: null, H: 2, fx: null };
  function ac1() { if (window.__muted || (window.__mute && window.__mute.on)) return null; var ac = MU.ac || window.__unlockAC; return ac && ac.state === 'running' ? ac : null; }   // never opens audio before a gesture
  function sZapIn() { try { var ac = ac1(); if (!ac) return; var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.setValueAtTime(2200, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.28);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.34); } catch (e) {} }
  function sVwoom(D) { try { var ac = ac1(); if (!ac) return; var t = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(420, t + D); o2.frequency.setValueAtTime(140, t); o2.frequency.exponentialRampToValueAtTime(1100, t + D);
    f.type = 'lowpass'; f.Q.value = 8; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3200, t + D);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.3); g.gain.setValueAtTime(0.09, t + D - 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + D + 0.1);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(ac.destination); [o, o2].forEach(function (x) { x.start(t); x.stop(t + D + 0.15); }); } catch (e) {} }
  function tpBuild() { if (TP.fx) return TP.fx; var T = window.__arcade.THREE, s = prev.scene;
    var k = document.createElement('canvas'); k.width = 128; k.height = 128; var q = k.getContext('2d');
    for (var i = 0; i < 14; i++) { var x = i * 128 / 14 + Math.random() * 4; q.strokeStyle = 'rgba(' + (i % 2 ? '190,255,255' : '80,235,255') + ',' + (0.35 + Math.random() * 0.5) + ')'; q.lineWidth = 2 + Math.random() * 4;
      q.beginPath(); q.moveTo(x, 128); q.lineTo(x + 64, 0); q.stroke(); q.beginPath(); q.moveTo(x - 128, 128); q.lineTo(x - 64, 0); q.stroke(); }
    var fd = q.createLinearGradient(0, 0, 0, 128); fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(0.55, 'rgba(0,0,0,0.25)'); fd.addColorStop(1, 'rgba(0,0,0,0)'); q.globalCompositeOperation = 'destination-out'; q.fillStyle = fd; q.fillRect(0, 0, 128, 128);
    var tx = new T.CanvasTexture(k); tx.wrapS = T.RepeatWrapping; tx.repeat.set(2, 1);
    var sw = new T.Mesh(new T.CylinderGeometry(0.6, 0.72, 2.3, 32, 1, true), new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    sw.position.y = 1.15; sw.visible = false; s.add(sw);
    var N = matchMedia('(pointer:coarse)').matches ? 70 : 140, pos = new Float32Array(N * 3), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    var pts = new T.Points(g, new T.PointsMaterial({ color: 0x9ff8ff, size: 0.05, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); pts.visible = false; pts.frustumCulled = false; s.add(pts);
    var rg = [0.25, 0.4, 0.55, 0.7].map(function (r) { var m = new T.Mesh(new T.TorusGeometry(r, 0.018, 6, 48), new T.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); m.rotation.x = Math.PI / 2; m.position.y = 0.02; m.visible = false; s.add(m); return m; });   // charge-up rings (teleport.js pad grooves)
    var P2 = []; for (var j = 0; j < N; j++) P2.push({ x: 0, y: -9, z: 0, vy: 0, l: 0, t: 1 });
    var bx = new T.Box3().setFromObject(prev.root); TP.H = Math.max(1, bx.max.y) + 0.1;
    return (TP.fx = { rg: rg, sw: sw, tx: tx, pts: pts, pos: pos, P: P2, pi: 0, plane: new T.Plane(new T.Vector3(0, 1, 0), 100) }); }
  function tpEmit(n, h) { var F = TP.fx; for (var k = 0; k < n; k++) { var o = F.P[F.pi = (F.pi + 1) % F.P.length], a = Math.random() * 6.283, r = 0.15 + Math.random() * 0.5;
      o.x = Math.cos(a) * r; o.z = Math.sin(a) * r; o.y = h + (Math.random() - 0.5) * 0.15; o.vy = 0.6 + Math.random() * 1.2; o.l = 0.6 + Math.random() * 0.5; o.t = 0; } }
  function tpStart(kind, cb) { if (!prev.scene) { if (cb) cb(); return; } tpBuild(); TP.st = kind; TP.t = 0; TP.cb = cb || null; if (kind === 'in') { TP.ins++; sZapIn(); } else { TP.outs++; sVwoom(1.1); } }
  // advance one frame; returns the clip plane for the monkey pass (or null = no clipping)
  function tpStep(dt) { var F = TP.fx; if (!F) return null; F.tx.offset.x = (F.tx.offset.x + dt * 0.9) % 1; var H = TP.H, pl = null, on = TP.st !== 'idle';
    if (on) { TP.t += dt; var t = TP.t;
      if (TP.st === 'in') { var D = 1.4, f = Math.min(1, t / D), h = -0.05 + f * H; F.plane.normal.set(0, -1, 0); F.plane.constant = h; pl = F.plane;   // reassembles feet-up
        F.sw.material.opacity = Math.min(1, t * 3, (D + 0.5 - t) * 2) * 0.85; if (f < 1) tpEmit(Math.round(dt * 120), h);
        if (t >= D + 0.5) { TP.st = 'idle'; pl = null; } }
      else { var C = 0.3, D2 = 0.8, f2 = Math.max(0, Math.min(1, (t - C) / D2)), h2 = -0.05 + f2 * H; F.plane.normal.set(0, 1, 0); F.plane.constant = -h2; pl = F.plane;   // dissolves feet-up
        F.sw.material.opacity = Math.min(1, t * 3) * 0.85; tpEmit(Math.round(dt * 140), h2);
        if (t >= C + D2 + 0.1) { TP.st = 'idle'; var cb = TP.cb; TP.cb = null; if (cb) cb(); pl = F.plane; F.plane.constant = -99; } } }
    var rk = TP.st === 'out' ? 1 : TP.st === 'in' ? Math.max(0, Math.min(1, (1.9 - TP.t) * 2)) : 0;
    F.rg.forEach(function (m, j) { var o = rk * Math.min(1, Math.max(0, ((TP.st === 'out' ? TP.t : TP.t + 1) - j * 0.07) / 0.08)); m.visible = o > 0.01; m.material.opacity = o * (0.75 + 0.25 * Math.sin(TP.t * 30 + j)); });
    F.sw.visible = on && F.sw.material.opacity > 0.01; F.sw.rotation.y += dt * 2.2;
    var any = false, p = F.pos; for (var i = 0; i < F.P.length; i++) { var o = F.P[i]; if (o.t < o.l) { o.t += dt; o.y += o.vy * dt; any = true; } else o.y = -9; p[i * 3] = o.x; p[i * 3 + 1] = o.y; p[i * 3 + 2] = o.z; }
    F.pts.geometry.attributes.position.needsUpdate = true; F.pts.visible = any; return pl; }
  // monkey hidden after beaming out until the start screen shows again
  function tpRender(pl) { var r = prev.r; if (TP.gone && !pl) pl = TP.fx && TP.fx.plane;
    if (!pl) { r.render(prev.scene, prev.cam); return; }
    r.clippingPlanes = [pl]; var F = TP.fx, a = F.sw.visible, b = F.pts.visible; F.sw.visible = F.pts.visible = false; var keep = []; prev.scene.children.forEach(function (o) { if (o !== prev.root && o.visible && !o.isLight) { keep.push(o); o.visible = false; } });
    r.render(prev.scene, prev.cam); r.clippingPlanes = []; keep.forEach(function (o) { o.visible = true; }); prev.root.visible = false; F.sw.visible = a; F.pts.visible = b;
    var ac = r.autoClear; r.autoClear = false; r.render(prev.scene, prev.cam); r.autoClear = ac; prev.root.visible = true; }
  function S() { return window.__start; }

  // ---------- DOM ----------
  var css = '#gaP{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;gap:6px;box-sizing:border-box;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;font-family:"Courier New",monospace;color:#fff;touch-action:pan-y;'
    + 'background:radial-gradient(ellipse at 20% 30%,#5a1f8f88,transparent 55%),radial-gradient(ellipse at 85% 45%,#7a2bb066,transparent 50%),radial-gradient(ellipse at 50% 90%,#1d2a8a66,transparent 60%),#070214}'
    + '#gaStars{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1}'
    + '#gaT{text-align:center;font:900 clamp(30px,10vw,54px)/0.95 "Arial Black",Impact,sans-serif;letter-spacing:.04em;margin-top:24px;flex:none}#gaT b{display:block;color:#bff8ff;text-shadow:0 0 6px #00e5ff,0 0 18px #00e5ff,0 0 34px #0090ff}#gaT i{display:block;font-style:normal;color:#ffd0fa;text-shadow:0 0 6px #ff3cf0,0 0 18px #ff3cf0,0 0 34px #c000ff}'
    + '#gaStage{position:relative;flex:1 1 auto;min-height:130px;width:100%;max-width:460px}#gaCv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}'
    + '.gaAr{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:64px;border:none;background:none;color:#7fe8ff;font:900 46px/1 Arial;text-shadow:0 0 10px #00c8ff;cursor:pointer;-webkit-tap-highlight-color:transparent}#gaL{left:2px}#gaR{right:2px}'
    + '.gaBox{width:100%;max-width:440px;box-sizing:border-box;border:2px solid #00e5ffaa;border-radius:14px;background:#0a0620d9;box-shadow:0 0 12px #00e5ff55,inset 0 0 12px #00e5ff22;flex:none}'
    + '#gaNm{padding:8px 12px;text-align:center}#gaNm label{display:block;font:900 17px "Courier New",monospace;letter-spacing:.12em;margin-bottom:6px}'
    + '#gaIn{width:100%;box-sizing:border-box;font:700 18px system-ui,sans-serif;color:#fff;background:#05020e;border:2px solid #00e5ff88;border-radius:10px;padding:9px 12px;text-align:center;outline:none;-webkit-user-select:text;user-select:text;touch-action:manipulation}#gaIn:focus{border-color:#ff3cf0;box-shadow:0 0 10px #ff3cf099}'
    + '.gaRow{display:flex;align-items:center;gap:6px;padding:6px 4px}.gaRow .gaA{width:30px;height:40px;border:none;background:none;color:#7fe8ff;font:900 26px/1 Arial;flex:none;cursor:pointer}'
    + '.gaRow span{width:62px;flex:none;font:900 12px/1.1 "Courier New",monospace;text-align:center;letter-spacing:.04em}.gaCh{flex:1;display:flex;gap:6px;justify-content:safe center;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;touch-action:pan-x;scroll-snap-type:x proximity;padding:2px}.gaCh::-webkit-scrollbar{display:none}.gaCh .gaO{flex:none;scroll-snap-align:center}'
    + '.gaO{width:42px;height:38px;border-radius:8px;border:2px solid #ffffff33;background:#151030;font:20px/1 sans-serif;color:#fff;padding:0;cursor:pointer}.gaO.sel{border-color:#ffd98a;box-shadow:0 0 10px #ffb000cc}'
    + '#gaGo{flex:none;font:900 clamp(26px,8vw,38px)/1 "Arial Black",Impact,sans-serif;letter-spacing:.1em;color:#dffbff;padding:12px 54px;border-radius:14px;border:3px solid #00e5ff;background:linear-gradient(#0c1a3aee,#050a1aee);text-shadow:0 0 8px #00e5ff,0 0 20px #00a0ff;box-shadow:0 0 18px #00e5ffaa,inset 0 0 14px #00e5ff44;cursor:pointer;animation:pp 1.6s ease-in-out infinite}'
    + '#gaHint.gaTaken{color:#ff5a7a;font-weight:900}#gaGo[hidden]{display:none}#gaGo:not([hidden]){animation:gaPop .45s cubic-bezier(.2,1.6,.4,1) both}@keyframes gaPop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}#gaHint{flex:none;font:700 12px system-ui;color:#ffd0fa;opacity:.85;min-height:48px;display:flex;align-items:center}#gaHint[hidden]{display:none}'
    + '#start.ga #stBtns{display:none!important}#start.ga #stBox{visibility:hidden}'
    + '#gaW{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:6px;box-sizing:border-box;padding:max(10px,env(safe-area-inset-top)) 10px max(12px,env(safe-area-inset-bottom));font-family:"Courier New",monospace;color:#fff;touch-action:pan-y;overflow-y:auto;'
    + 'background:radial-gradient(ellipse at 20% 30%,#5a1f8fcc,transparent 55%),radial-gradient(ellipse at 85% 45%,#7a2bb0aa,transparent 50%),radial-gradient(ellipse at 50% 90%,#1d2a8aaa,transparent 60%),#070214f2}#gaW[hidden]{display:none}'
    + '#gaWT{flex:none;margin-top:14px;font:900 clamp(26px,8.5vw,44px)/1 "Arial Black",Impact,sans-serif;letter-spacing:.08em;color:#ffd0fa;text-shadow:0 0 6px #ff3cf0,0 0 18px #ff3cf0,0 0 34px #c000ff}'
    + '#gaWStage{position:relative;flex:1 1 auto;min-height:150px;width:100%;max-width:460px}#gaWCv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}'
    + '#gaWDone{flex:none;font:900 clamp(22px,7vw,32px)/1 "Arial Black",Impact,sans-serif;letter-spacing:.1em;color:#dffbff;padding:12px 48px;border-radius:14px;border:3px solid #00e5ff;background:linear-gradient(#0c1a3aee,#050a1aee);text-shadow:0 0 8px #00e5ff;box-shadow:0 0 18px #00e5ffaa;cursor:pointer}'
    + '#gaWX{position:absolute;top:max(10px,env(safe-area-inset-top));right:10px;width:44px;height:44px;border-radius:50%;border:2px solid #ff3cf0aa;background:#0a0620d9;color:#ffd0fa;font:900 22px/1 Arial;cursor:pointer}'
    + '.gaO{position:relative}.gaLk{position:absolute;right:-3px;bottom:-5px;font:900 9px/1 Arial;font-style:normal;color:#ffd98a;background:#2a0a3a;border:1px solid #ffd98a;border-radius:6px;padding:1px 2px;pointer-events:none}.gaO.own .gaLk{display:none}.gaO.gaNew:not(.own){opacity:.8}.gaO.try{border-color:#ff3cf0;box-shadow:0 0 10px #ff3cf0}#gaW.gaSt .gaNew,#gaW.gaSt .gaRow[data-k=back]{display:none}'
    + '#gaWBuy{flex:none;display:flex;align-items:center;gap:10px;padding:8px 12px;border:2px solid #ffd98a;border-radius:12px;background:#1a0a2ad9;font:900 14px "Courier New",monospace}#gaWBuy[hidden]{display:none}'
    + '#gaWBuyB{font:900 16px "Arial Black",Arial;padding:9px 16px;border-radius:10px;border:2px solid #ffd98a;background:#3a1a00;color:#ffe9a8;cursor:pointer}#gaWBuyB:disabled{opacity:.55;border-color:#888;color:#bbb;background:#222;cursor:default}'
    + '@media (max-height:640px){#gaT{font-size:clamp(24px,7vw,40px);margin-top:18px}.gaRow{padding:3px 4px}.gaO{height:32px}#gaNm{padding:5px 10px}}';
  var ov = null, stHat = false;   // start screen: cap picked this visit?
  function row(k, label, shop, list) { var h = '<div class="gaRow" data-k="' + k + '"><button class="gaA" data-step="-1" aria-label="previous">‹</button><span>' + label + '</span><div class="gaCh">';
    (list || (shop ? OPTS : START)[k]).forEach(function (o) { var ic = typeof o[1] === 'string', face = ic ? o[1] : ''; var bg = ic ? '' : 'background:#' + ('00000' + o[1].toString(16)).slice(-6) + ';';
      var need = shop && priceOf(k, o[0]) > 0; if (need) face += '<i class="gaLk">🔒' + priceOf(k, o[0]) + '</i>';
      if (k === 'shoes') bg = 'background:linear-gradient(135deg,#' + ('00000' + o[1].toString(16)).slice(-6) + ' 55%,#' + ('00000' + o[2].toString(16)).slice(-6) + ' 55%);';
      h += '<button class="gaO' + (need ? ' gaNew' : '') + '" data-v="' + o[0] + '" title="' + o[0] + '" style="' + bg + '">' + face + '</button>'; });
    return h + '</div><button class="gaA" data-step="1" aria-label="next">›</button></div>'; }
  function rows(shop) { if (!shop) return row('hat', 'HAT') + row('hoodie', 'HOODIE COLOUR'); return row('hat', 'HAT', shop) + row('glasses', shop ? 'GLASSES & FACE' : 'GLASSES', shop) + (shop ? row('back', 'BACK', shop) : '') + row('hoodie', 'HOODIE COLOUR', shop) + row('fur', 'FUR COLOUR', shop) + row('shoes', 'SHOES', shop); }
  function rowsLimited() { /* room 1 WARDROBE HUD: start opts + owned only, no locked/for-sale */ var h = '', add = function (k, label) {
      var L; if (k === 'hat' || k === 'hoodie') L = OPTS[k].filter(function (o) { return isStart(k, o[0]) || (o[0] !== 'none' && has(k, o[0])); });
      else { L = OPTS[k].filter(function (o) { return has(k, o[0]); }); if (!L.some(function (o) { return o[0] !== 'none'; })) return; }
      h += row(k, label, false, L); };
    add('hat', 'HAT'); add('hoodie', 'HOODIE COLOUR'); add('glasses', 'GLASSES & FACE'); add('back', 'BACK'); add('fur', 'FUR COLOUR'); add('shoes', 'SHOES'); return h; }
  function addCss() { if (document.getElementById('gaCss')) return; var sty = document.createElement('style'); sty.id = 'gaCss'; sty.textContent = css; document.head.appendChild(sty); }
  function build() { var st = document.getElementById('start'); if (!st || ov) return; addCss();
    ov = document.createElement('div'); ov.id = 'gaP';
    ov.innerHTML = '<canvas id="gaStars"></canvas><div id="gaT"><b>GALACTIC</b><i>ARCADE</i></div>'
      + '<div id="gaStage"><canvas id="gaCv"></canvas><button class="gaAr" id="gaL" aria-label="rotate left">‹</button><button class="gaAr" id="gaR" aria-label="rotate right">›</button></div>'
      + '<div class="gaBox" id="gaNm"><label for="gaIn">YOUR NAME</label><input id="gaIn" maxlength="' + MAXN + '" placeholder="Enter your name..." autocomplete="nickname" autocapitalize="words" spellcheck="false" enterkeyhint="go"></div>'
      + '<div class="gaBox">' + rows() + '</div>'
      + '<button id="gaGo" hidden>PLAY</button><div id="gaHint">Type your name to play</div>';
    st.appendChild(ov); st.classList.add('ga'); var inp = ov.querySelector('#gaIn'); inp.value = P.name;
    inp.addEventListener('input', function () { var v = clean(inp.value); if (v !== inp.value) inp.value = v; P.name = v; save(); sync(); apply(); nameCheck(); });
    nameCheck(1);
    stars(); sync(); tickets(); requestAnimationFrame(function () { sync(true); }); addEventListener('load', function () { sync(true); }, { once: true }); }
  function stars() { var c = ov.querySelector('#gaStars'), w = c.width = 400, h = c.height = 800, g = c.getContext('2d'); for (var i = 0; i < 260; i++) { var r = Math.random(); g.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.7) + ')'; g.fillRect(Math.random() * w, Math.random() * h, r < 0.9 ? 1 : 2, r < 0.9 ? 1 : 2); } }
  function tickets() { var n = 0; try { n = Math.max(0, parseInt(localStorage.getItem('neonarcade.tickets'), 10) || 0); } catch (e) {} var e = ov && ov.querySelector('#gaTkN'); if (e) e.textContent = n.toLocaleString('en'); }
  function syncRows(root, scroll) { [].forEach.call(root.querySelectorAll('.gaRow'), function (r) { var k = r.dataset.k; [].forEach.call(r.querySelectorAll('.gaO'), function (b) { var on = b.dataset.v === P[k] && !(root === ov && k === 'hat' && !stHat); b.classList.toggle('sel', on);
      if (b.classList.contains('gaNew')) { b.classList.toggle('own', has(k, b.dataset.v)); b.classList.toggle('try', !!(W.try && W.try.k === k && W.try.v === b.dataset.v)); }
      if (on && scroll) { var ch = b.parentNode; if (ch.scrollWidth > ch.clientWidth) { var br = b.getBoundingClientRect(), cr = ch.getBoundingClientRect(); ch.scrollLeft += (br.left + br.width / 2) - (cr.left + cr.width / 2); } } }); }); }
  function sync(scroll) { if (W.el) syncRows(W.el, scroll); if (!ov) return; syncRows(ov, scroll);
    var free = !named() || nmFree === clean(P.name).trim().toLowerCase(), hint = ov.querySelector('#gaHint');   // unique names (names.js): PLAY waits for a free name
    ov.querySelector('#gaGo').hidden = !(named() && goOK() && free); hint.hidden = named() && (free || nmBusy); hint.textContent = named() ? (nmWhy === 'bad' ? 'Pick a different name' : 'Name taken') : 'Type your name to play'; hint.classList.toggle('gaTaken', named() && !free); }
  // unique names: debounced check as the user types; nmFree = the lower(trim) name last confirmed free
  var nmFree = null, nmBusy = true, nmT = 0, nmSeq = 0, nmWhy = '';   /* t286u: nmWhy 'bad' = blocked word (names.js isBad) */
  function nameCheck(now) { var Nm = window.__gaNames, k = clean(P.name).trim().toLowerCase(); clearTimeout(nmT); if (!Nm) { nmFree = k; sync(); return; } nmBusy = true; if (nmFree !== k) nmFree = null; sync();
    nmT = setTimeout(function () { var q = ++nmSeq; Nm.check(P.name).then(function (r) { if (q !== nmSeq) return; nmBusy = false; nmWhy = r.why; nmFree = r.free ? k : null; sync(); }); }, now ? 0 : 350); }
  function look() { return { name: P.name, hat: P.hat, hoodie: P.hoodie, fur: P.fur, shoes: P.shoes, glasses: P.glasses, back: P.back }; }
  function pLook() { if (!W.try || !W.open) return P; var L = Object.assign({}, P); L[W.try.k] = W.try.v; return L; }
  function pick(k, v) { if (!OPTS[k] || !OPTS[k].some(function (a) { return a[0] === v; }) || !has(k, v)) return; if (W.try) { W.try = null; buyUI(); } P[k] = v; save(); sync(true); apply();
    try { window.dispatchEvent(new CustomEvent('galacticarcade:look', { detail: look() })); } catch (e) {} }

  // ---------- in-game wardrobe (window.__wardrobe.open/close): same rows, live turntable, applies + saves at once ----------
  var W = { el: null, open: false, opens: 0, try: null, buys: 0, shop: false };
  // ---------- tickets (Arcade's 'neonarcade.tickets'; same spend as shop.js: play.tickets.total + storage + the #tixN HUD chip) ----------
  function tk() { var A = window.__arcade; return (A && A.play && A.play.tickets) || null; }
  function balance() { var t = tk(); if (t) return t.total; return parseInt(localStorage.getItem('neonarcade.tickets'), 10) || 0; }
  function spend(n) { var t = tk(), b = balance(); if (b < n) return false; if (t) t.total -= n; try { localStorage.setItem('neonarcade.tickets', String(b - n)); } catch (e) {}
    var el = document.getElementById('tixN'); if (el) el.textContent = String(b - n); try { var A = window.__arcade; if (A.play.refresh) A.play.refresh(); } catch (e) {} return true; }
  function nameOf(v) { return ({ tophat: 'TOP HAT', wizard: 'WIZARD HAT', viking: 'VIKING HELMET', chef: 'CHEF HAT', bunny: 'BUNNY EARS', propeller: 'PROPELLER CAP', monocle: 'MONOCLE', heart: 'HEART GLASSES', star: 'STAR GLASSES', '3d': '3D GLASSES', mustache: 'MUSTACHE', mask: 'NINJA MASK', jetpack: 'JETPACK', cape: 'HERO CAPE', wings: 'ANGEL WINGS', batwings: 'BAT WINGS' })[v] || (v.toUpperCase() + ' HOODIE'); }
  function tryOn(k, v) { W.try = { k: k, v: v }; prev.hat = null; buyUI(); sync(); }
  function buyUI() { if (!W.el) return; var bx = W.el.querySelector('#gaWBuy'); if (!W.try) { bx.hidden = true; apply(); return; } var p = priceOf(W.try.k, W.try.v), b = balance(), btn = W.el.querySelector('#gaWBuyB');
    bx.hidden = false; W.el.querySelector('#gaWBuyT').textContent = nameOf(W.try.v) + ' · 🎟 ' + b; btn.disabled = b < p; btn.textContent = b < p ? 'Need ' + p + ' tickets' : 'BUY ' + p + ' 🎟'; }
  function buy() { var t = W.try; if (!t) return false; var p = priceOf(t.k, t.v); if (!spend(p)) { buyUI(); return false; } if (p > 0) { try { window.__announce && window.__announce('buy', { item: nameOf(t.v), cost: p }); } catch (e) {} } var o = owned(); if (o.indexOf(t.k + ':' + t.v) < 0) o.push(t.k + ':' + t.v);
    try { localStorage.setItem(OKEY, JSON.stringify(o)); } catch (e) {} W.buys++; W.try = null; buyUI(); pick(t.k, t.v); return true; }
  function wBuild() { if (W.el) return; addCss(); var d = W.el = document.createElement('div'); d.id = 'gaW'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Wardrobe');
    d.innerHTML = '<div id="gaWT">WARDROBE</div><button id="gaWX" aria-label="close">✕</button>'
      + '<div id="gaWStage"><canvas id="gaWCv"></canvas><button class="gaAr" id="gaWL" aria-label="rotate left">‹</button><button class="gaAr" id="gaWR" aria-label="rotate right">›</button></div>'
      + '<div class="gaBox" id="gaWBox"></div><div id="gaWBuy" hidden><span id="gaWBuyT"></span><button id="gaWBuyB"></button></div><button id="gaWDone">DONE</button>';
    (document.body || document.documentElement).appendChild(d); }
  function wFill() { if (!W.el) return; W.el.querySelector('#gaWBox').innerHTML = W.shop ? rows(1) : rowsLimited(); W.el.querySelector('#gaWT').textContent = W.shop ? 'ACCESSORIES' : 'WARDROBE'; }
  function wOpen(opts) { var A = window.__arcade; W.shop = !!(opts && opts.shop); wBuild(); wFill(); if (!W.el.isConnected) document.body.appendChild(W.el); W.el.hidden = false; W.el.classList.toggle('gaSt', onStart()); W.open = true; W.at = performance.now(); W.opens++; prev.auto = true; TP.gone = false; if (TP.st === 'out') { TP.st = 'idle'; TP.cb = null; } W.try = null; buyUI();
    if (A && A.monkey && A.THREE) { apply(); buildScene(); } sync(true); if (!prev.raf) frame(); return true; }
  function wClose() { if (!W.el || !W.open) return false; W.open = false; W.el.hidden = true; prev.drag = null; if (W.try) { W.try = null; apply(); prev.hat = null; }
    if (prev.r && prev.r.domElement.id === 'gaWCv') freeR();   // free the 2nd WebGL context for the game
    return true; }
  window.__wardrobe = { open: wOpen, close: wClose, applyRemote: function (root, lk) { dress(root, lk); }, get isOpen() { return W.open; }, get el() { return W.el; } };
  function step(k, d, shop) { var L; if (W.open && !W.shop) L = OPTS[k].filter(function (a) { return isStart(k, a[0]) || has(k, a[0]); });
    else if (shop && !onStart()) L = OPTS[k].filter(function (a) { return has(k, a[0]); });
    else if (shop) L = BASE[k].filter(function (a) { return has(k, a[0]); });
    else L = START[k].filter(function (a) { return has(k, a[0]); });
    var i = 0; for (var j = 0; j < L.length; j++) if (L[j][0] === P[k]) i = j; pick(k, L[(i + d + L.length) % L.length][0]); }
  function play(fast) { if (!named() || !goOK() || TP.st === 'out' || nmFree !== clean(P.name).trim().toLowerCase()) return; if (window.__gaNames) window.__gaNames.claim(P.name); musicStop(); P.name = clean(P.name).trim(); save(); apply(); var inp = document.getElementById('gaIn'); if (inp) inp.blur();
    var cv = ov && ov.querySelector('#gaCv'); if (prev.r && cv && prev.r.domElement === cv && cv.clientWidth && !fast && !window.__gaNoTp) { var done = 0, fin = function () { if (done++) return; TP.gone = true; go2(); }; tpStart('out', fin); setTimeout(function () { if (!done) { TP.st = 'idle'; TP.cb = null; fin(); } }, 2600); return; } go2(); }
  function go2() { var b = document.getElementById('stStart'); if (!b) return; if (!stHat && P.hat !== 'none') { P.hat = 'none'; save(); apply(); } /* Dave: no cap picked = start hatless */ var ev; try { ev = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' }); } catch (e) { ev = new Event('pointerup', { bubbles: true, cancelable: true }); }
    b.dispatchEvent(ev); window.__gaPlayer.started = (window.__gaPlayer.started || 0) + 1; }
  function opts() { var b = document.getElementById('stOpt'); if (!b) return; var ev; try { ev = new PointerEvent('pointerup', { bubbles: true, cancelable: true }); } catch (e) { ev = new Event('pointerup', { bubbles: true }); } b.dispatchEvent(ev); }


  // ---------- start-screen music: "funky" loop (108 BPM, 16 bars = 1568000 samples @ 44.1 kHz), WebAudio, after the first gesture ----------
  // Respects Arcade's MUSIC switch (window.__music.on, read only). Fades out on PLAY / when the start screen goes, so it never plays in-game.
  var MU = { N: 1568000, SR: 44100, VOL: 0.42, url: 'audio/start_funky.mp3', buf: null, loading: false, src: null, g: null, ac: null, playing: false, starts: 0, stops: 0 };
  function onStart() { var s = S(); return !!(ov && ov.isConnected && s && s.shown && !s.dismissed); }
  function musicWanted() { return onStart() && !document.hidden && !(window.__music && window.__music.on === false); }
  function musicGo() {
    if (!musicWanted() || MU.playing) return;
    try { var ac = MU.ac = MU.ac || window.__unlockAC || new (window.AudioContext || window.webkitAudioContext)(); window.__unlockAC = ac; if (ac.state === 'suspended') ac.resume(); } catch (e) { return; }
    if (!MU.buf) { if (MU.loading) return; MU.loading = true;
      fetch(MU.url).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (ok, no) { MU.ac.decodeAudioData(b, ok, no); }); })
        .then(function (buf) { MU.buf = buf; var n = Math.round(MU.N * buf.sampleRate / MU.SR), extra = buf.length - n; MU.lead = extra > 1000 ? Math.round(1105 * buf.sampleRate / MU.SR) : 0;   // LAME delay if the decoder kept it
          MU.loopStart = MU.lead / buf.sampleRate; MU.loopEnd = MU.loopStart + n / buf.sampleRate; MU.len = buf.length; MU.loading = false; musicGo(); })
        .catch(function (e) { MU.err = String(e); MU.loading = false; });
      return; }
    try { var ac2 = MU.ac, g = MU.g = ac2.createGain(), src = MU.src = ac2.createBufferSource(); g.gain.setValueAtTime(0, ac2.currentTime); g.gain.linearRampToValueAtTime(MU.VOL, ac2.currentTime + 0.8); g.connect(ac2.destination);
      src.buffer = MU.buf; src.loop = true; src.loopStart = MU.loopStart; src.loopEnd = MU.loopEnd; src.connect(g); src.start(0, MU.loopStart); MU.playing = true; MU.starts++; } catch (e) { MU.err = String(e); }
  }
  function musicStop(fade) { if (!MU.playing) return; MU.playing = false; MU.stops++; var ac = MU.ac, g = MU.g, src = MU.src, f = fade == null ? 0.6 : fade; MU.src = MU.g = null;
    try { g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(g.gain.value, ac.currentTime); g.gain.linearRampToValueAtTime(0, ac.currentTime + f); src.stop(ac.currentTime + f + 0.05); setTimeout(function () { try { g.disconnect(); } catch (e) {} }, (f + 0.2) * 1000); } catch (e) {} }
  setInterval(function () { if (MU.playing && !musicWanted()) musicStop(); }, 150);
  document.addEventListener('visibilitychange', function () { if (document.hidden) musicStop(0.2); });
  // ---------- input: runs before Arcade's start-screen swallower (registered first, same capture phase) ----------
  var EV = ['pointermove', 'touchmove', 'wheel', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'keyup', 'dblclick', 'keypress'];
  function live() { var s = S(); return ov && ov.isConnected && s && s.shown && !s.dismissed && !(document.getElementById('opt') || {}).classList.contains('on'); }
  function grab(e) {
    if (/^(pointerdown|touchstart|keydown|mousedown)$/.test(e.type) && onStart()) { touched(); musicGo(); }   // first gesture unlocks audio (Android autoplay)
    if (W.open) return wGrab(e);
    if (/move|wheel/.test(e.type)) return;
    if (!live()) return;
    var t = e.target && e.target.closest ? e.target : null, inP = t && t.closest('#gaP');
    if (e.type === 'keydown' || e.type === 'keyup' || e.type === 'keypress') {
      var typing = t && t.id === 'gaIn';
      if (/^(Enter|NumpadEnter)$/.test(e.code) || e.key === 'Enter') { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); if (e.type === 'keydown' && !e.repeat && named() && goOK()) play(1); return; }
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
    else if (t.closest('#gaL')) { prev.auto = false; prev.want -= Math.PI / 4; }
    else if (t.closest('#gaR')) { prev.auto = false; prev.want += Math.PI / 4; }
    else if ((b = t.closest('.gaO'))) { var k0 = b.closest('.gaRow').dataset.k; if (k0 === 'hat') { var off = stHat && P.hat === b.dataset.v; stHat = true; prev.hat = null; pick('hat', off ? 'none' : b.dataset.v); } else pick(k0, b.dataset.v); }   // tap selected cap again = off
    else if ((b = t.closest('.gaA'))) { if (b.closest('.gaRow').dataset.k === 'hat') { stHat = true; prev.hat = null; } step(b.closest('.gaRow').dataset.k, +b.dataset.step); }
  }
  function wGrab(e) { var t = e.target && e.target.closest ? e.target : null; e.stopImmediatePropagation();   // while the wardrobe is open nothing reaches the game
    if (/^key/.test(e.type)) { if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Enter')) { if (e.cancelable) e.preventDefault(); wClose(); } return; }
    if (e.type === 'pointermove') { if (prev.drag) prev.want = prev.drag.r + (e.clientX - prev.drag.x) * 0.012; return; }
    if (!t) return; var cv = t.closest('#gaWCv');
    if (e.type === 'pointerdown' && cv) { prev.drag = { x: e.clientX, r: prev.want }; prev.auto = false; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (e.cancelable) e.preventDefault(); }
    if (e.type === 'pointerup' && prev.drag) prev.drag = null;
    if (e.type === 'touchstart' && cv && e.cancelable) e.preventDefault();
    if (e.type !== 'click') return; var b;
    if (performance.now() - (W.at || 0) < 500) return;   // the tap that opened us (its compat click lands on the panel after pointerup: hit DONE and closed at once)
    if (t.closest('#gaWBuyB')) buy();
    else if (t.closest('#gaWDone') || t.closest('#gaWX')) wClose();
    else if (t.closest('#gaWL')) { prev.auto = false; prev.want -= Math.PI / 4; }
    else if (t.closest('#gaWR')) { prev.auto = false; prev.want += Math.PI / 4; }
    else if ((b = t.closest('.gaO'))) { var k = b.closest('.gaRow').dataset.k; if (!W.shop && k === 'hat' && isStart('hat', b.dataset.v)) { var off = P.hat === b.dataset.v; prev.hat = null; pick('hat', off ? 'none' : b.dataset.v); }
      else if (has(k, b.dataset.v)) pick(k, b.dataset.v); else tryOn(k, b.dataset.v); }
    else if ((b = t.closest('.gaA'))) step(b.closest('.gaRow').dataset.k, +b.dataset.step, W.shop); }
  EV.forEach(function (ty) { window.addEventListener(ty, grab, { capture: true, passive: false }); });
  window.addEventListener('pointermove', function (e) { if (prev.drag) { prev.want = prev.drag.r + (e.clientX - prev.drag.x) * 0.012; } });
  window.addEventListener('pointercancel', function () { prev.drag = null; });

  function boot() { build();
    var t0 = setInterval(function () { var A = window.__arcade; if (!A || !A.monkey || !A.THREE) return; clearInterval(t0); apply(); if (ov) { var go = function () { setTimeout(function () { buildPrev(); frame(); }, 150); }; if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); } }, 100);
    var wrap = setInterval(function () { var U = window.__startUI; if (!U || !U.show || U.show.ga) return; clearInterval(wrap); var o = U.show; U.show = function () { untouch(); stHat = false; TP.seen = false; TP.st = 'idle'; TP.cb = null; var r = o.apply(this, arguments); tickets(); sync(); return r; }; U.show.ga = 1; }, 200); }
  var booted = false; function boot1() { if (booted) return; booted = true; boot(); }
  if (document.readyState === 'loading') { var mo = new MutationObserver(function () { if (document.getElementById('start')) { mo.disconnect(); boot1(); } }); mo.observe(document.documentElement, { childList: true, subtree: true }); document.addEventListener('DOMContentLoaded', boot1); } else boot1();   // build ours the moment #start is parsed
  window.__gaPlayer = { KEY: KEY, get p() { return P; }, pick: pick, play: play, apply: apply, opts: BASE, allOpts: OPTS, priceOf: priceOf, isStart: isStart, isFree: isFree, get tag() { return tag; }, get prev() { return prev; }, music: MU, dress: dress, look: look, glasses: GLAS, wardrobe: W, tp: TP, NEW: NEW, PRICE: PRICE, owned: owned, has: has, buy: buy, tryOn: tryOn, balance: balance };
})();
