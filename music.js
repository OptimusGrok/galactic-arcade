// Room 1 background music: "Neon Nights" (105 BPM, 32-bar seamless loop, 3225600 samples @ 44.1 kHz), decoded with WebAudio and
// looped on exact sample points (encoder padding trimmed). Plays in room 1 only, fades out into the hallway / room 2, while a cabinet
// is zoomed in / played, on the start screen, when the tab is hidden, or when MUSIC is off in Options ('neonarcade.music' = '0').
(function () {
  var N = 3225600, SR = 44100, VOL = 0.42, KEY = 'neonarcade.music';
  var M = window.__music = { loaded: false, playing: false, gain: 0, target: 0, on: true, loopStart: 0, loopEnd: 0, len: 0, src: '' };
  try { M.on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
  var ac = null, g = null, node = null, loading = false;
  function pickSrc() { var a = document.createElement('audio'); return a.canPlayType('audio/ogg; codecs="opus"') ? 'audio/neon_nights.ogg' : 'audio/neon_nights.m4a'; }
  function load() { if (loading) return; loading = true; ac = window.__unlockAC || new (window.AudioContext || window.webkitAudioContext)(); window.__unlockAC = ac;
    g = ac.createGain(); g.gain.value = 0; g.connect(ac.destination); M.src = pickSrc();
    fetch(M.src).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (ok, no) { ac.decodeAudioData(b, ok, no); }); }).then(function (buf) {
      var extra = buf.length - Math.round(N * buf.sampleRate / SR), lead = extra >= 2112 ? 2112 : extra >= 1024 ? 1024 : 0;   // AAC priming if a browser keeps it
      M.len = buf.length; M.loopStart = lead / buf.sampleRate; M.loopEnd = M.loopStart + N / SR;
      node = ac.createBufferSource(); node.buffer = buf; node.loop = true; node.loopStart = M.loopStart; node.loopEnd = M.loopEnd; node.connect(g); node.start(0, M.loopStart);
      M.t0 = ac.currentTime; M.loaded = true; M.playing = true; }).catch(function (e) { M.err = String(e); });
  }
  M.setOn = function (on) { M.on = !!on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} tick(); };
  M.pos = function () { return M.loaded ? ((ac.currentTime - M.t0) % (M.loopEnd - M.loopStart)) : 0; };
  function tick() {
    var S = window.__start, A = window.__arcade, onStart = !!document.getElementById('start') && !(S && S.dismissed);
    if (S && S.dismissed && !loading) load();   // first START (a user gesture already unlocked the context)
    var t = 0;
    if (M.on && !onStart && !document.hidden && A && A.play) {
      var z = A.monkey.position.z, k = Math.max(0, Math.min(1, (z + 12 + 2.5) / 3));   // 1 inside room 1, fades through the doorway, 0 down the hallway
      t = A.play.mode === 'walk' ? VOL * k : 0; }
    M.target = t; M.room1 = t > 0;
    if (g) { if (ac.state === 'suspended' && t > 0) ac.resume(); g.gain.setTargetAtTime(t, ac.currentTime, t > M.gain ? 0.5 : 0.25); M.gain = g.gain.value; }
  }
  setInterval(tick, 120); document.addEventListener('visibilitychange', tick);
})();
