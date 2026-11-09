// Watch / demo isolation for arcade play copies (?watch=1 or ?demo=1).
// Memory-only storage, no score/name network posts, early __DEMO so TicketArt never pays out.
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
