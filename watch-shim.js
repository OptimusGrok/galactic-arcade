// Watch / demo isolation for arcade play copies (?watch=1 or ?demo=1).
// Memory-only storage, no score/name network posts, early __DEMO so TicketArt never pays out.
// t757u: inside the arcade's play frame the shell's close X (+ ticket pill) sits tight in the top-left corner, so the
// game keeps its top-left HUD below that strip: html.gaCab, CSS var --gaTop and window.__gaTop (CSS px).
(function () {
  try {
    if (window.frameElement && window.frameElement.id === 'game' && window.parent && window.parent.__arcade) {
      window.__gaTop = 46; var de = document.documentElement; de.classList.add('gaCab'); de.style.setProperty('--gaTop', '46px');
      // t762u: --gaLeft = first free x (game CSS px) right of the shell's X / ticket pill / Viking chip in that strip,
      // so a game can put its HUD up in the strip beside them (Rock Fall). Re-measured as the chips change.
      var last = -1, pw = window.parent, fe = window.frameElement;
      var edge = function () { try {
        var pd = pw.document, fr = fe.getBoundingClientRect(), k = (fr.width / (window.innerWidth || fr.width)) || 1, r = 0;
        ['bExit', 'tix', 'vix'].forEach(function (id) { var e = pd.getElementById(id); if (!e) return; var cs = pw.getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden') return; var b = e.getBoundingClientRect(); if (b.width > 0 && b.top < 46) r = Math.max(r, b.right); });
        var v = Math.max(0, Math.ceil((r - fr.left) / k + 8)); if (v !== last) { last = v; window.__gaLeft = v; de.style.setProperty('--gaLeft', v + 'px'); }
      } catch (e) {} };
      edge(); setInterval(edge, 250); window.addEventListener('resize', edge);
    }
  } catch (e) {}
})();
// t762u: every play copy records the WebGL contexts and AudioContexts it creates; window.__gaRelease() frees them all
// (WebGL loseContext, AudioContext.close) when the arcade closes the game. Phones (iOS Safari
// especially) keep a removed iframe's GPU / audio memory until a later GC, so without this every re-entry
// stacks a second full game on top of the first one.
(function () {
  try {
    var gls = [], acs = [], P = window.HTMLCanvasElement && HTMLCanvasElement.prototype, gc = P && P.getContext;
    if (gc) P.getContext = function (type) { var c = gc.apply(this, arguments); try { if (c && /webgl/i.test(String(type)) && gls.indexOf(c) < 0) gls.push(c); } catch (e) {} return c; };
    ['AudioContext', 'webkitAudioContext'].forEach(function (k) { var AC = window[k]; if (typeof AC !== 'function' || typeof Proxy !== 'function') return;
      try { window[k] = new Proxy(AC, { construct: function (t, a, n) { var c = Reflect.construct(t, a, n); acs.push(c); return c; } }); } catch (e) {} });
    window.__gaRes = function () { return { gl: gls.length, glLost: gls.filter(function (g) { try { return g.isContextLost(); } catch (e) { return true; } }).length, ac: acs.length, acOpen: acs.filter(function (a) { return a.state !== 'closed'; }).length }; };
    window.__gaRelease = function () {
      window.__gaReleased = (window.__gaReleased || 0) + 1;
      acs.forEach(function (a) { try { if (a.state !== 'closed') { var p = a.close(); if (p && p.catch) p.catch(function () {}); } } catch (e) {} });
      gls.forEach(function (g) { try { var x = g.getExtension('WEBGL_lose_context'); if (x && !g.isContextLost()) x.loseContext(); } catch (e) {} });
    };
  } catch (e) {}
})();
(function () {
  try {
    var q = String(location.search || '');
    if (q.indexOf('watch=1') < 0 && q.indexOf('demo=1') < 0) return;
  } catch (e) { return; }
  window.__WATCH = 1;
  window.__DEMO = true;
  try { document.documentElement.classList.add('watchMode'); } catch (e) {}

  var mem = Object.create(null);
  var fake = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { for (var k in mem) delete mem[k]; },
    key: function (i) { return Object.keys(mem)[i] || null; }
  };
  Object.defineProperty(fake, 'length', { get: function () { return Object.keys(mem).length; } });
  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return fake; } });
  } catch (e) {
    try { window.localStorage.clear(); } catch (e2) {}
  }
  try {
    var ssmem = Object.create(null);
    var ssfake = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(ssmem, k) ? ssmem[k] : null; },
      setItem: function (k, v) { ssmem[k] = String(v); },
      removeItem: function (k) { delete ssmem[k]; },
      clear: function () { for (var k in ssmem) delete ssmem[k]; },
      key: function (i) { return Object.keys(ssmem)[i] || null; }
    };
    Object.defineProperty(ssfake, 'length', { get: function () { return Object.keys(ssmem).length; } });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get: function () { return ssfake; } });
  } catch (e) {}

  function blocked(u) {
    var s = String(typeof u === 'string' ? u : (u && u.url) || '');
    return /supabase|leaderboard|player_names|rest\/v1|\/score/i.test(s);
  }
  try {
    var ofetch = window.fetch && window.fetch.bind(window);
    if (ofetch) {
      window.fetch = function (u, o) {
        if (blocked(u)) return Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
        return ofetch(u, o);
      };
    }
  } catch (e) {}
  try {
    if (navigator.sendBeacon) navigator.sendBeacon = function () { return false; };
  } catch (e) {}
})();
