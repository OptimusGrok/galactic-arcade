// Gold monkey ticket: vector drawing (crisp at any size), shared by the arcade HUD / enlarged view and the game copies.
window.TicketArt = (function () {
  const cache = {};
  function monkey(g, cx, cy, r) {
    const C = (x, y, rr) => { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); };
    const E = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
    const fur = g.createRadialGradient(cx - r * 0.3, cy - r * 0.45, r * 0.1, cx, cy, r * 1.1); fur.addColorStop(0, '#a8662e'); fur.addColorStop(0.6, '#7a4219'); fur.addColorStop(1, '#4a250c');
    // ears
    for (const s of [-1, 1]) { C(cx + s * r * 0.98, cy - r * 0.02, r * 0.34); g.fillStyle = fur; g.fill(); g.lineWidth = r * 0.05; g.strokeStyle = '#3a1c08'; g.stroke();
      C(cx + s * r * 0.98, cy - r * 0.02, r * 0.2); g.fillStyle = '#e9a98a'; g.fill(); C(cx + s * r * 1.01, cy + r * 0.02, r * 0.1); g.fillStyle = '#c97e62'; g.fill(); }
    // tuft on top
    g.fillStyle = '#5a2e10'; g.beginPath(); g.moveTo(cx - r * 0.32, cy - r * 0.86); g.quadraticCurveTo(cx - r * 0.22, cy - r * 1.32, cx - r * 0.04, cy - r * 1.18);
    g.quadraticCurveTo(cx + r * 0.06, cy - r * 1.42, cx + r * 0.2, cy - r * 1.2); g.quadraticCurveTo(cx + r * 0.36, cy - r * 1.3, cx + r * 0.34, cy - r * 0.86); g.closePath(); g.fill();
    // head + fur shading
    C(cx, cy, r); g.fillStyle = fur; g.fill(); g.lineWidth = r * 0.05; g.strokeStyle = '#3a1c08'; g.stroke();
    g.save(); C(cx, cy, r); g.clip(); g.strokeStyle = 'rgba(40,18,4,0.35)'; g.lineWidth = r * 0.035;
    for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.32, x = cx + Math.cos(a) * r * 0.86, y = cy + Math.sin(a) * r * 0.86; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.16, y + Math.sin(a) * r * 0.16); g.stroke(); }
    g.restore();
    // lighter face mask: two eye lobes + muzzle
    const sk = g.createLinearGradient(0, cy - r * 0.6, 0, cy + r * 0.9); sk.addColorStop(0, '#fbdcb0'); sk.addColorStop(1, '#d9a068');
    g.fillStyle = sk; g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.16, r * 0.36, 0, Math.PI * 2); g.arc(cx + r * 0.3, cy - r * 0.16, r * 0.36, 0, Math.PI * 2); g.fill();
    E(cx, cy + r * 0.34, r * 0.62, r * 0.5); g.fill();
    // brows
    g.strokeStyle = '#3a1c08'; g.lineCap = 'round'; g.lineWidth = r * 0.075;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * r * 0.48, cy - r * 0.44); g.quadraticCurveTo(cx + s * r * 0.3, cy - r * 0.56, cx + s * r * 0.12, cy - r * 0.44); g.stroke(); }
    // eyes: whites, pupils, highlights
    for (const s of [-1, 1]) { E(cx + s * r * 0.29, cy - r * 0.16, r * 0.17, r * 0.2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = r * 0.03; g.strokeStyle = '#3a1c08'; g.stroke();
      C(cx + s * r * 0.26, cy - r * 0.13, r * 0.105); g.fillStyle = '#2a1405'; g.fill(); C(cx + s * r * 0.22, cy - r * 0.18, r * 0.04); g.fillStyle = '#fff'; g.fill(); }
    // nostrils + smile
    g.fillStyle = '#5a2c10'; E(cx - r * 0.09, cy + r * 0.2, r * 0.05, r * 0.035); g.fill(); E(cx + r * 0.09, cy + r * 0.2, r * 0.05, r * 0.035); g.fill();
    g.strokeStyle = '#4a200a'; g.lineWidth = r * 0.07; g.beginPath(); g.arc(cx, cy + r * 0.28, r * 0.32, 0.35, Math.PI - 0.35); g.stroke();
    g.fillStyle = 'rgba(230,110,90,0.35)'; E(cx - r * 0.42, cy + r * 0.3, r * 0.1, r * 0.06); g.fill(); E(cx + r * 0.42, cy + r * 0.3, r * 0.1, r * 0.06); g.fill();
  }
  // ticket of width w, height h at 0,0. big: inner border + GALACTIC ARCADE / ADMIT ONE text
  function paint(g, w, h, big) {
    const n = h * 0.16, lw = Math.max(1, w / 60);
    const path = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h / 2 - n); g.arc(w, h / 2, n, -Math.PI / 2, Math.PI / 2, true); g.lineTo(w, h); g.lineTo(0, h); g.lineTo(0, h / 2 + n); g.arc(0, h / 2, n, Math.PI / 2, -Math.PI / 2, true); g.closePath(); };
    const gr = g.createLinearGradient(0, 0, w * 0.3, h); gr.addColorStop(0, '#fff6b8'); gr.addColorStop(0.35, '#ffd23a'); gr.addColorStop(0.7, '#f0a800'); gr.addColorStop(1, '#b87400');
    path(); g.fillStyle = gr; g.fill();
    g.save(); path(); g.clip();   // subtle diagonal shine
    const sh = g.createLinearGradient(w * 0.15, 0, w * 0.45, h); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.45)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h); g.restore();
    path(); g.lineWidth = lw; g.strokeStyle = '#7a4a00'; g.stroke();
    if (big) {
      g.setLineDash([w / 60, w / 90]); g.strokeStyle = 'rgba(122,74,0,0.7)'; g.lineWidth = lw * 0.6; g.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84); g.setLineDash([]);
      g.fillStyle = '#6a3c00'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 ' + Math.round(h * 0.11) + 'px "Courier New", monospace';
      g.fillText('GALACTIC ARCADE', w / 2, h * 0.17, w * 0.78); g.fillText('ADMIT ONE', w / 2, h * 0.84);
      g.font = '900 ' + Math.round(h * 0.09) + 'px "Courier New", monospace'; g.fillText('★', w * 0.17, h / 2); g.fillText('★', w * 0.83, h / 2);
      monkey(g, w / 2, h * 0.52, h * 0.22);
    } else monkey(g, w / 2, h * 0.54, h * 0.3);
  }
  // cached hi-res sprite for a ticket w game-pixels wide
  function sprite(w) {
    if (cache[w]) return cache[w];
    const s = Math.max(8, Math.ceil(64 / w) * 2), h = Math.round(w * 0.66), c = document.createElement('canvas'); c.width = w * s; c.height = h * s;
    const g = c.getContext('2d'); g.scale(s, s); paint(g, w, h, false);
    return (cache[w] = { c, w, h });
  }
  function draw(ctx, x, y, w, t, alpha) {
    const sp = sprite(w), k = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, w * (0.9 + 0.35 * k)); gl.addColorStop(0, 'rgba(255,215,64,' + (0.55 + 0.3 * k) + ')'); gl.addColorStop(1, 'rgba(255,190,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - w * 1.3, y - w * 1.3, w * 2.6, w * 2.6);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(sp.c, x - sp.w / 2, y - sp.h / 2, sp.w, sp.h); ctx.restore();
  }
  // paint onto a DOM canvas of CSS size cw x ch (ticket fills it), at device resolution
  function toCanvas(cv, cw, big) { const d = Math.min(3, window.devicePixelRatio || 1), ch = Math.round(cw * (big ? 0.62 : 0.66));
    cv.width = Math.round(cw * d); cv.height = Math.round(ch * d); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cw, ch); paint(g, cw, ch, big); return cv; }
  // Every machine costs 5 tickets (was strike 1, ghost 1, monkey 1, orc 3, nova 2): one pickup pays 5 / old price tickets so each game's
  // tickets-per-ticket-spent stays what it was. Fractions carry over between pickups (orc 5/3, nova 2.5).
  const PAYX = { strike: 5, ghost: 5, monkey: 5, orc: 5 / 3, nova: 2.5 }, ACC = {};
  function collect(game) { if (window.__DEMO) return; const x = PAYX[game] || 1; ACC[game] = (ACC[game] || 0) + x; const n = Math.floor(ACC[game] + 1e-9); ACC[game] -= n;
    window.__ticketsGot = (window.__ticketsGot || 0) + n; if (!n) return; try { parent !== window && parent.__neonTicket && parent.__neonTicket(n, game); } catch (e) {} }
  collect.PAYX = PAYX;
  return { sprite, draw, paint, toCanvas, monkey, collect };
})();
