// Arcade-copy only: gold glowing ticket with a little monkey face, and the hand-off of a collected ticket to the arcade.
window.TicketArt = (function () {
  const cache = {};
  function sprite(w) {   // w = ticket width in game pixels; drawn at 4x for crispness
    if (cache[w]) return cache[w];
    const s = 4, h = Math.round(w * 0.66), c = document.createElement('canvas'); c.width = w * s; c.height = h * s; const g = c.getContext('2d'); g.scale(s, s);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.5, '#ffc928'); gr.addColorStop(1, '#d08a00');
    g.fillStyle = gr; g.beginPath(); const n = h * 0.22;   // ticket with notched ends
    g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h / 2 - n); g.arc(w, h / 2, n, -Math.PI / 2, Math.PI / 2, true); g.lineTo(w, h); g.lineTo(0, h); g.lineTo(0, h / 2 + n); g.arc(0, h / 2, n, Math.PI / 2, -Math.PI / 2, true); g.closePath(); g.fill();
    g.strokeStyle = '#7a4a00'; g.lineWidth = Math.max(0.35, w / 40); g.stroke();
    const cx = w / 2, cy = h / 2, r = h * 0.36;   // monkey face
    g.fillStyle = '#6b3a1a'; g.beginPath(); g.arc(cx - r * 0.95, cy - r * 0.1, r * 0.38, 0, 7); g.arc(cx + r * 0.95, cy - r * 0.1, r * 0.38, 0, 7); g.fill();
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = '#f2c28e'; g.beginPath(); g.ellipse(cx, cy + r * 0.22, r * 0.66, r * 0.55, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.2, r * 0.3, 0, 7); g.arc(cx + r * 0.3, cy - r * 0.2, r * 0.3, 0, 7); g.fill();
    g.fillStyle = '#1a0d05'; g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.18, r * 0.13, 0, 7); g.arc(cx + r * 0.3, cy - r * 0.18, r * 0.13, 0, 7); g.fill();
    g.strokeStyle = '#1a0d05'; g.lineWidth = r * 0.1; g.beginPath(); g.arc(cx, cy + r * 0.22, r * 0.28, 0.3, Math.PI - 0.3); g.stroke();
    return (cache[w] = { c, w, h });
  }
  // draw centred at x,y with a pulsing gold glow
  function draw(ctx, x, y, w, t, alpha) {
    const sp = sprite(w), k = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, w * (0.9 + 0.35 * k)); gl.addColorStop(0, 'rgba(255,215,64,' + (0.55 + 0.3 * k) + ')'); gl.addColorStop(1, 'rgba(255,190,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - w * 1.3, y - w * 1.3, w * 2.6, w * 2.6);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(sp.c, x - sp.w / 2, y - sp.h / 2, sp.w, sp.h); ctx.restore();
  }
  function collect(game) { window.__ticketsGot = (window.__ticketsGot || 0) + 1; try { parent !== window && parent.__neonTicket && parent.__neonTicket(1, game); } catch (e) {} }
  return { sprite, draw, collect };
})();
