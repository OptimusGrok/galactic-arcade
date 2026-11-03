// PA welcome announcement: ~3 s after the player presses START (first time per page load only), a female PA voice (no chime, t184)
// "Welcome to Galactic Arcade. You can purchase tickets from the ticket machine in the center of the room."
// Not replayed on returning to the start screen, re-entering from a cabinet or loading a save. Goes through the global mute hook
// (mute.js) and ducks the room music (music.js reads __pa.playing).
(function () {
  var DELAY = 3000, P = window.__pa = { played: 0, playing: false, at: 0, src: '' };
  var buf = null, fetching = null;
  function ctx() { var AC = window.AudioContext || window.webkitAudioContext; return window.__unlockAC = window.__unlockAC || new AC(); }
  function pick() { var a = document.createElement('audio'); return a.canPlayType('audio/ogg; codecs="opus"') ? 'audio/pa_welcome.ogg' : 'audio/pa_welcome.m4a'; }
  function load() { if (!fetching) { P.src = pick(); var ac = ctx();
      fetching = fetch(P.src).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (ok, no) { ac.decodeAudioData(b, ok, no); }); })
        .then(function (b) { buf = b; return b; }).catch(function (e) { P.err = String(e); }); }
    return fetching; }
  function play() { var ac = ctx(); if (ac.state === 'suspended') ac.resume();
    var s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = 0.9; s.buffer = buf; s.connect(g); g.connect(ac.destination);
    P.playing = true; P.played++; P.at = performance.now(); P.dur = buf.duration;
    s.onended = function () { P.playing = false; }; s.start(); }
  var dueAt = 0;
  function tick() { if (P.played || P.armed === 'done') return;
    var S = window.__start; if (!S || !S.dismissed) return;
    if (!dueAt) { dueAt = (S.at || performance.now()) + DELAY; load(); }
    var A = window.__arcade; if (performance.now() < dueAt || !buf || document.hidden) return;
    if (A && A.play && A.play.mode !== 'walk') return;   // wait until the monkey is walking in the room
    P.armed = 'done'; play(); }
  setInterval(tick, 150);
})();
