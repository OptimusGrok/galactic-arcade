// UNIQUE NAMES (Dave: "no one can use the same name twice"). Names are claimed in Supabase table player_names through two
// SECURITY DEFINER RPCs (supabase/migrations/20261105_player_names.sql): name_free(p_name,p_owner) and claim_name(p_name,p_owner,p_legacy).
// The owner is a per-device secret (neonarcade.nameKey), never broadcast. Matching = lower(trim(name)).
// ET is reserved for Dave: a device that already had the name ET saved before this update is marked legacy on first load and claims it.
// Fallback: if Supabase is unreachable we fail open but still refuse names of players online right now (mp.js presence, window.__mp.peers).
(function () {
  var URL = window.__namesURL || 'https://kfupqtafhaflzaoqtenf.supabase.co/rest/v1/rpc/', KEY = 'sb_publishable_IAXEXd619Dq0g50CY-UNRQ_IqWDU4-2';
  function g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } function s(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  // t286u NO CURSE-WORD NAMES (Dave). ONE source of truth for the client; mirrored verbatim in SQL public.is_bad_name() (supabase/migrations/20261105_name_profanity.sql).
  // Normalise: lower case; leetspeak 0>o 1>i (also tried as l) 3>e 4>a 5>s 7>t @>a $>s !>i; '*' = wildcard (tries a/e/i/o/u/nothing); tokens split on anything else.
  // ANY = blocked anywhere in the squashed name (also with repeated letters collapsed, for words without double letters) after WL substrings are removed.
  // TOK = blocked only as a whole token, or as the whole squashed name (catches 's h i t'); repeats collapse ('shiiit') but a token shorter than the word ('as') is fine.
  var BAD = {
    ANY: ['fuck', 'fuk', 'fvck', 'phuck', 'cunt', 'nigg', 'niga', 'faggot', 'fagot', 'motherf', 'bitch', 'biatch', 'whore', 'slut', 'wank', 'twat', 'bastard', 'bollock', 'asshole', 'ashole', 'arsehole',
      'dickhead', 'dikhead', 'shithead', 'bullshit', 'cocksuck', 'coksuck', 'dildo', 'jizz', 'retard', 'douche', 'cumshot', 'blowjob', 'handjob'],
    TOK: ['ass', 'asses', 'arse', 'dick', 'dicks', 'cock', 'cocks', 'tit', 'tits', 'titty', 'titties', 'boob', 'boobs', 'shit', 'shits', 'shitty', 'piss', 'pissed', 'crap', 'damn', 'fag', 'fags',
      'cum', 'sex', 'sexy', 'penis', 'vagina', 'pussy', 'prick', 'porn', 'rape', 'rapist', 'spic', 'kike', 'chink', 'hoe', 'hoes', 'anus', 'anal', 'homo', 'tranny', 'dyke', 'coon', 'gook', 'negro'],
    WL: ['scunthorpe', 'fuku', 'swank', 'snigger'] };
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  function col(x) { return x.replace(/(.)\1+/g, '$1'); }
  function cands(t) { var out = [], base = [t]; if (t.indexOf('1') >= 0) base.push(t.replace(/1/g, 'l'));
    base.forEach(function (b) { var list = [b.replace(/[0134578@$!]/g, function (c) { return LEET[c] || ''; }).replace(/\*+/g, '*')];
      for (var n = 0; n < 3; n++) { var nx = []; list.forEach(function (x) { var i = x.indexOf('*'); if (i < 0) nx.push(x); else ['a', 'e', 'i', 'o', 'u', ''].forEach(function (v) { nx.push(x.slice(0, i) + v + x.slice(i + 1)); }); }); list = nx; }
      list.forEach(function (x) { out.push(x.replace(/[^a-z]/g, '')); }); }); return out; }
  function tokBad(c) { var cc = col(c); return BAD.TOK.some(function (w) { return c.length >= w.length && cc === col(w); }); }
  function isBad(name) { var raw = String(name || '').toLowerCase(), toks = raw.split(/[^a-z0-9@$!*]+/).filter(Boolean); if (!toks.length) return false;
    var hit = cands(toks.join('')).some(function (c) { var r = c; BAD.WL.forEach(function (w) { r = r.split(w).join(''); }); var rc = col(r);
      return BAD.ANY.some(function (w) { return r.indexOf(w) >= 0 || (col(w) === w && rc.indexOf(w) >= 0); }) || tokBad(c); });
    return hit || toks.some(function (t) { return cands(t).some(tokBad); }); }
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
  var N = window.__gaNames = { owner: owner, isBad: isBad, BAD: BAD, get legacy() { return legacy; }, last: null,
    // -> Promise<{ free, why: 'ok'|'taken'|'online'|'offline' }>
    check: function (name) { var k = norm(name); if (!k) return Promise.resolve({ free: true, why: 'ok' }); if (isBad(name)) return Promise.resolve({ free: false, why: 'bad' });
      if (online(k)) return Promise.resolve({ free: false, why: 'online' });
      if (k === legacy) return Promise.resolve({ free: true, why: 'ok' });
      return rpc('name_free', { p_name: name, p_owner: owner }).then(function (f) { return typeof f !== 'boolean' ? { free: true, why: 'offline' } : { free: f, why: f ? 'ok' : 'taken' }; },
        function () { return { free: true, why: 'offline' }; }); },
    // called on PLAY: -> Promise<'ok'|'taken'|'bad'|'offline'>
    claim: function (name) { var k = norm(name); if (!k || isBad(name)) return Promise.resolve('bad');
      return rpc('claim_name', { p_name: String(name).trim(), p_owner: owner, p_legacy: k === legacy && k === 'et' }).then(function (r) { N.last = r; return r; }, function () { N.last = 'offline'; return 'offline'; }); } };
  // t286u: a saved name that is now blocked, or whose claim was lost to another device, is cleared -> the start screen asks for a new one (now if
  // blocked, since this runs before player.js reads it; next load if the claim is found lost)
  function clearSaved() { try { var pl = JSON.parse(g('galacticarcade.player') || '{}') || {}; if (pl.name) { pl.name = ''; s('galacticarcade.player', JSON.stringify(pl)); } } catch (e) {} N.cleared = (N.cleared || 0) + 1; }
  var saved = ''; try { saved = (JSON.parse(g('galacticarcade.player') || '{}') || {}).name || ''; } catch (e) {}
  if (saved && isBad(saved)) clearSaved();
  else if (saved && norm(saved) !== legacy && !window.__namesNoLoadCheck) rpc('name_free', { p_name: saved, p_owner: owner }).then(function (f) { if (f === false) clearSaved(); }, function () {});
  if (legacy === 'et') N.claim('ET');   // Dave's device takes ET at once
})();
