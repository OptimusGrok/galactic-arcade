// ===== GALACTIC ARCADE: GALACTIC GOLF copy hooks (loaded by golf-play/index.html, written by tools_build_golf_play.py; the original is never edited) =====
// First 3 holes only. Every finished hole reports its stroke count to the arcade (window.parent.__golfArcadePay), which pays
// 1 stroke = 5 tickets, 2 = 4, 3 = 3, more = 0. The arcade charges 5 tickets at the shield on the stairs for every visit.
(function () {
  const PAR = (() => { try { return window.parent !== window ? window.parent : null; } catch (e) { return null; } })();
  const pops = [];
  function toast(n) { const d = document.createElement('div'); d.className = 'gaTk'; d.textContent = n > 0 ? '+' + n + ' 🎟' : 'NO TICKETS (4+ SHOTS)'; document.body.appendChild(d); pops.push(d); setTimeout(() => d.remove(), 1800); }
  window.__golfPay = function (strokes, hole) {
    let n = 0; try { if (PAR && PAR.__golfArcadePay) n = PAR.__golfArcadePay(strokes, hole) | 0; else n = strokes === 1 ? 5 : strokes === 2 ? 4 : strokes === 3 ? 3 : 0; } catch (e) {}
    toast(n); const b = document.getElementById('scBody'); if (b) b.textContent += '  ·  ' + (n > 0 ? '+' + n + ' 🎟' : '0 🎟'); return n; };
  window.__golfExit = () => { try { if (PAR && PAR.__golfArcadeExit) PAR.__golfArcadeExit(); } catch (e) {} };
  addEventListener('DOMContentLoaded', () => {
    const css = document.createElement('style');
    css.textContent = '#btnAgain{display:none!important}#gaUp{margin-top:6px}#gaX{position:fixed;left:max(10px,env(safe-area-inset-left));top:max(52px,calc(env(safe-area-inset-top) + 44px));z-index:8;padding:9px 12px;border-radius:12px;border:2px solid #2de8ff;background:rgba(20,8,40,.88);color:#fff;font-weight:900;font-size:13px}' +
      '.gaTk{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:9;font:900 34px/1 system-ui;color:#ffe08a;text-shadow:0 0 14px #ffb000,0 0 3px #fff;pointer-events:none;animation:gaTk 1.8s ease-out forwards}@keyframes gaTk{0%{opacity:0;transform:translate(-50%,-30%) scale(.7)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-90%)}}';
    document.head.appendChild(css);
    const x = document.createElement('button'); x.id = 'gaX'; x.type = 'button'; x.textContent = '⬆ UPSTAIRS'; x.onclick = () => window.__golfExit(); document.body.appendChild(x);
    const ag = document.getElementById('btnAgain'); if (ag) { const u = document.createElement('button'); u.id = 'gaUp'; u.type = 'button'; u.textContent = 'Back upstairs'; u.onclick = () => window.__golfExit(); ag.after(u); }
  });
})();
