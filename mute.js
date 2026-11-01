// Global MUTE ('neonarcade.mute' = '1'): every AudioNode that connects to a destination goes through a per-context master gain,
// in this window and in every same-origin iframe (the cabinet games). <audio>/<video> elements get .muted too.
(function () {
  var KEY = 'neonarcade.mute', muted = false; try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  var gains = [];
  function hook(win) {
    try { if (!win || win.__muteHooked || !win.AudioNode) return; win.__muteHooked = 1; } catch (e) { return; }
    var AN = win.AudioNode, orig = AN.prototype.connect, map = new WeakMap();
    AN.prototype.connect = function (dest) {
      if (dest && win.AudioDestinationNode && dest instanceof win.AudioDestinationNode) {
        var g = map.get(dest); if (!g) { g = dest.context.createGain(); orig.call(g, dest); map.set(dest, g); gains.push(g); }
        g.gain.value = muted ? 0 : 1; var a = Array.prototype.slice.call(arguments); a[0] = g; orig.apply(this, a); return dest;
      }
      return orig.apply(this, arguments);
    };
    try { var MP = win.HTMLMediaElement.prototype, op = MP.play; MP.play = function () { if (muted) this.muted = true; return op.apply(this, arguments); }; } catch (e) {}
  }
  function apply() {
    gains.forEach(function (g) { try { g.gain.value = muted ? 0 : 1; } catch (e) {} });
    var wins = [window]; document.querySelectorAll('iframe').forEach(function (f) { try { wins.push(f.contentWindow); } catch (e) {} });
    wins.forEach(function (w) { try { w.document.querySelectorAll('audio,video').forEach(function (m) { m.muted = muted; }); } catch (e) {} });
  }
  function watchFrame(f) { if (f.__mw) return; f.__mw = 1; var h = function () { try { hook(f.contentWindow); } catch (e) {} apply(); }; f.addEventListener('load', h); h(); }
  hook(window);
  new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.tagName === 'IFRAME') watchFrame(n); else if (n.querySelectorAll) n.querySelectorAll('iframe').forEach(watchFrame); }); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
  window.__mute = { get on() { return muted; }, set: function (on) { muted = !!on; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {} apply(); }, get gains() { return gains; } };
})();
