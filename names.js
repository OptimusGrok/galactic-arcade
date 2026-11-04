// UNIQUE NAMES (Dave: "no one can use the same name twice"). Names are claimed in Supabase table player_names through two
// SECURITY DEFINER RPCs (supabase/migrations/20261105_player_names.sql): name_free(p_name,p_owner) and claim_name(p_name,p_owner,p_legacy).
// The owner is a per-device secret (neonarcade.nameKey), never broadcast. Matching = lower(trim(name)).
// ET is reserved for Dave: a device that already had the name ET saved before this update is marked legacy on first load and claims it.
// Fallback: if Supabase is unreachable we fail open but still refuse names of players online right now (mp.js presence, window.__mp.peers).
(function () {
  var URL = window.__namesURL || 'https://kfupqtafhaflzaoqtenf.supabase.co/rest/v1/rpc/', KEY = 'sb_publishable_IAXEXd619Dq0g50CY-UNRQ_IqWDU4-2';
  function g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } function s(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var norm = function (n) { return String(n || '').trim().toLowerCase(); };
  var owner = g('neonarcade.nameKey');
  if (!owner || owner.length < 16) { var a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    owner = [].map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); s('neonarcade.nameKey', owner); }
  if (!g('neonarcade.namesV')) {   // first load with this update: grandfather a saved ET (Dave's device)
    var old = ''; try { old = (JSON.parse(g('galacticarcade.player') || '{}') || {}).name || ''; } catch (e) {}
    if (norm(old) === 'et') s('neonarcade.nameLegacy', 'et'); s('neonarcade.namesV', '1'); }
  var legacy = g('neonarcade.nameLegacy') || '';
  function rpc(fn, body, ms) { var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { c && c.abort(); }, ms || 4000);
    return fetch(URL + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: c && c.signal })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }); }
  function online(k) { var M = window.__mp; if (!M || !M.peers || M.state !== 'on') return false; var hit = false; M.peers.forEach(function (p) { if (norm(p.name) === k) hit = true; }); return hit; }
  var N = window.__gaNames = { owner: owner, get legacy() { return legacy; }, last: null,
    // -> Promise<{ free, why: 'ok'|'taken'|'online'|'offline' }>
    check: function (name) { var k = norm(name); if (!k) return Promise.resolve({ free: true, why: 'ok' });
      if (online(k)) return Promise.resolve({ free: false, why: 'online' });
      if (k === legacy) return Promise.resolve({ free: true, why: 'ok' });
      return rpc('name_free', { p_name: name, p_owner: owner }).then(function (f) { return typeof f !== 'boolean' ? { free: true, why: 'offline' } : { free: f, why: f ? 'ok' : 'taken' }; },
        function () { return { free: true, why: 'offline' }; }); },
    // called on PLAY: -> Promise<'ok'|'taken'|'bad'|'offline'>
    claim: function (name) { var k = norm(name); if (!k) return Promise.resolve('bad');
      return rpc('claim_name', { p_name: String(name).trim(), p_owner: owner, p_legacy: k === legacy && k === 'et' }).then(function (r) { N.last = r; return r; }, function () { N.last = 'offline'; return 'offline'; }); } };
  if (legacy === 'et') N.claim('ET');   // Dave's device takes ET at once
})();
