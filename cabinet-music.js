// Galactic Arcade - cabinet music (drop-in kit; built by the Chief for Arcade to wire in).
// ONE player for both cases, so demo music and proximity music can never double up:
//   * walk mode: the nearest cabinet within RADIUS of the monkey plays its loop; the room track ducks (via __cabMusic.duck)
//   * cabinet DEMO view (play.mode 'game', sub 'demo'): that cabinet's loop plays (the game copies' demos are silent)
//   * playing a game, zooming, start screen, tab hidden, MUSIC off (window.__music.on === false): silent
// Crossfade: WebAudio linear ramps of FADE s. Only one cabinet source exists at a time (the old one fades out and is stopped
// before the next fades in). Tracks are fetched + decoded on first need (lazy) and kept in a small cache (MAX_CACHE).
// Room music hook: music.js multiplies its target by (1 - window.__cabMusic.duck)  (see INTEGRATION.md).
(function () {
  var VOL = 0.38, FADE = 0.6, RADIUS = 2.8, HYST = 0.5, MAX_CACHE = 3, BASE = '';
  // t771u: strike = the game's own stage-1 track (HC 's1', 155 bpm), rendered offline from strike-play's engine: one pass of its
  // 48-bar loop (after the intro), seamless. The other loops are kit compositions (cabinet-kit/audio/gen.py), not the games' music.
  // exact loop lengths (samples) let us skip mp3 encoder padding like music.js does; berserker reuses its own title music
  var TRACKS = {
    strike: { src: 'audio/cab_strike.mp3', samples: 1638813, rate: 22050 }, monkey: { src: 'audio/cab_monkey.mp3', samples: 358780, rate: 22050 },
    nova: { src: 'audio/cab_nova.mp3', samples: 441000, rate: 22050 }, cyber: { src: 'audio/cab_cyber.mp3', samples: 341419, rate: 22050 },
    orc: { src: 'audio/cab_orc.mp3', samples: 320727, rate: 22050 }, ghost: { src: 'audio/cab_ghost.mp3', samples: 302400, rate: 22050 },
    roadster: { src: 'audio/cab_roadster.mp3', samples: 294000, rate: 22050 }, ds: { src: 'audio/cab_ds.mp3', samples: 504000, rate: 22050 },
    blaster: { src: 'audio/cab_blaster.mp3', samples: 264600, rate: 22050 }, pip: { src: 'audio/cab_pip.mp3', samples: 330750, rate: 22050 },
    claw: { src: 'audio/cab_claw.mp3', samples: 384873, rate: 22050 }, bb: { src: 'audio/cab_bb.mp3', samples: 352800, rate: 22050 },
    berserker: { src: 'audio/cab_berserker.mp3', vol: 0.3 }
  };
  var C = window.__cabMusic = { tracks: TRACKS, want: null, cur: null, duck: 0, fades: 0, loads: 0, starts: 0, maxSources: 0, radius: RADIUS, err: null };
  var ac = null, out = null, node = null, ng = null, curKey = null, cache = {}, order = [], pending = {}, pos = null, lastNear = null, live = 0;
  function ctx() { if (!ac) { ac = window.__unlockAC || new (window.AudioContext || window.webkitAudioContext)(); window.__unlockAC = ac; out = ac.createGain(); out.gain.value = 1; out.connect(ac.destination); } return ac; }
  function load(k) {
    if (cache[k]) return Promise.resolve(cache[k]); if (pending[k]) return pending[k]; var t = TRACKS[k]; if (!t) return Promise.reject('no track ' + k);
    C.loads++;
    return pending[k] = fetch(BASE + t.src).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (ok, no) { ctx().decodeAudioData(b, ok, no); }); })
      .then(function (buf) { delete pending[k]; cache[k] = buf; order.push(k); while (order.length > MAX_CACHE) { var o = order.shift(); if (o !== curKey && o !== C.want) delete cache[o]; else order.push(o); if (order.length <= MAX_CACHE) break; } return buf; })
      .catch(function (e) { delete pending[k]; C.err = String(e); throw e; });
  }
  function fadeOut() { if (!node) return; var n = node, g = ng, t = ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + FADE);
    C.fades++; setTimeout(function () { try { n.stop(); } catch (e) {} n.disconnect(); g.disconnect(); live--; }, FADE * 1000 + 30); node = null; ng = null; curKey = null; C.cur = null; }
  function fadeIn(k, buf) {
    var t = TRACKS[k], a = ctx(), n = a.createBufferSource(), g = a.createGain(); n.buffer = buf; n.loop = true;
    if (t.samples) { var len = t.samples * buf.sampleRate / t.rate, extra = buf.length - len, lead = extra >= 1105 ? Math.min(extra, 1105) : 0;   // 529+576 (mp3 priming)
      n.loopStart = lead / buf.sampleRate; n.loopEnd = n.loopStart + len / buf.sampleRate; }
    g.gain.value = 0; n.connect(g); g.connect(out); n.start(0, n.loopStart || 0); var now = a.currentTime; g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(t.vol || VOL, now + FADE);
    node = n; ng = g; curKey = k; C.cur = k; C.starts++; C.fades++; live++; C.maxSources = Math.max(C.maxSources, live);
  }
  var busyUntil = 0;
  function apply(k) {
    if (k === curKey) return; var now = performance.now();
    if (node) { fadeOut(); busyUntil = now + FADE * 1000 + 40; }
    if (!k) return;
    load(k).then(function (buf) { var wait = Math.max(0, busyUntil - performance.now());
      setTimeout(function () { if (C.want === k && !node) { if (ac.state === 'suspended') ac.resume(); fadeIn(k, buf); } }, wait); }).catch(function () {});
  }
  // cabinet positions (stand-in-front point) per play.js machine key; cabinets never move, so this is built once
  function positions(A) {
    if (pos) return pos; var P = A.play, M = P && P.machines; if (!M) return null; pos = [];
    for (var k in M) { var c = M[k].cab; if (!c || !TRACKS[k]) continue; var u = c.userData || {}, p = u.front ? { x: u.front.x, z: u.front.z } : (function () { var v = new A.THREE.Vector3(); c.getWorldPosition(v); return { x: v.x, z: v.z }; })();
      pos.push({ k: k, x: p.x, z: p.z }); if (k === 'roadster' && u.frontR) pos.push({ k: k, x: u.frontR.x, z: u.frontR.z }); }
    return pos;
  }
  C.setPositions = function (list) { pos = list; };   // [{k,x,z}] override (tests / other rooms)
  C.nearest = function (x, z) { var best = null, bd = Infinity; (pos || []).forEach(function (p) { var d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p.k; } });
    var r = RADIUS + (best && best === lastNear ? HYST : 0); return bd <= r ? best : null; };
  function wanted() {
    var A = window.__arcade, S = window.__start, M = window.__music;
    if (!A || !A.play || document.hidden || (M && M.on === false) || (document.getElementById('start') && !(S && S.dismissed))) return null;
    var P = A.play;
    if (P.mode === 'game') return P.sub === 'demo' && P.cur && TRACKS[P.cur.key] ? P.cur.key : null;
    if (P.mode !== 'walk' || !positions(A)) return null;
    var m = A.monkey.position, k = C.nearest(m.x, m.z); lastNear = k; return k;
  }
  function tick() {
    var k = null; try { k = wanted(); } catch (e) { C.err = String(e); }
    C.want = k; apply(k);
    // duck the room track while a cabinet loop is (or is about to be) playing in walk mode; in game mode music.js is already at 0
    var target = k ? 1 : 0; C.duck += (target - C.duck) * 0.5; if (C.duck < 0.01) C.duck = 0; if (C.duck > 0.99) C.duck = 1;
  }
  C.tick = tick; setInterval(tick, 120); document.addEventListener('visibilitychange', tick);
})();
