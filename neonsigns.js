// t773u NEON NAME SIGNS: a glowing sign of each machine's game name above that machine (on the wall above the wall cabinets, facing into the room;
// on top of the free-standing claw machine; above DEAD SIGNAL's curved screen).
// t775u: each sign is styled after its own game's title screen (fonts, colours, motifs), a bit dimmer and ~25% bigger.
// t782u: dimmer still, and the lettering is sharper and thinner (less glow bloom in the atlas + a lower mesh gain). The lettering is baked
// offline into ONE atlas (tex/neon_signs.webp, rects in neon_atlas.js; rebuild with node tools/build_neon_atlas.js) so every device shows the
// same fonts. Still ONE merged mesh of quads (one draw call, one program, no per-frame work), compiled by the warm-up; the atlas is uploaded
// to the GPU as soon as it loads (initTexture), on the start screen, not at the first room frame.
// t826u / v216: a neon character/icon image sits just above each name sign (one extra canvas atlas + one merged mesh, no per-frame work).
import { NEON_ATLAS } from './neon_atlas.js';

function neonStroke(g, draw, col, w, glow) {
  g.save();
  g.shadowColor = glow || col; g.shadowBlur = 18; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
  draw(g); g.shadowBlur = 0; g.globalAlpha = 0.95; draw(g); g.restore();
}

function drawIcon(g, key, S) {
  const C = {
    strike: '#ff3b3b', ghost: '#b46bff', cyber: '#ff3fd0', orc: '#4dff5a', pip: '#ff7ad9',
    berserker: '#ff6a1a', monkey: '#ffd23a', nova: '#3fb8ff', blaster: '#fff03a', bb: '#ffb02e',
    rockfall: '#ff8a2a', skytower: '#5fe0ff', roadster: '#ff4a2a', claw: '#ff2bd6'
  }[key] || '#3ff3ff';
  g.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2;
  const path = fn => neonStroke(g, ctx => { ctx.beginPath(); fn(ctx); ctx.stroke(); }, C, 6, C);
  const fillp = fn => neonStroke(g, ctx => { ctx.beginPath(); fn(ctx); ctx.fill(); ctx.stroke(); }, C, 3, C);
  if (key === 'strike') {
    fillp(c => { c.moveTo(cx, cy - 70); c.lineTo(cx + 54, cy + 18); c.lineTo(cx + 18, cy + 8); c.lineTo(cx + 28, cy + 64); c.lineTo(cx, cy + 22); c.lineTo(cx - 28, cy + 64); c.lineTo(cx - 18, cy + 8); c.lineTo(cx - 54, cy + 18); c.closePath(); });
  } else if (key === 'ghost') {
    fillp(c => { c.arc(cx, cy - 10, 58, Math.PI, 0, false); c.lineTo(cx + 58, cy + 62); c.lineTo(cx + 36, cy + 42); c.lineTo(cx + 16, cy + 62); c.lineTo(cx, cy + 42); c.lineTo(cx - 16, cy + 62); c.lineTo(cx - 36, cy + 42); c.lineTo(cx - 58, cy + 62); c.closePath(); });
    g.fillStyle = '#0a0618'; g.beginPath(); g.arc(cx - 20, cy - 8, 10, 0, 7); g.arc(cx + 20, cy - 8, 10, 0, 7); g.fill();
  } else if (key === 'cyber') {
    path(c => { c.rect(cx - 70, cy + 20, 36, 50); c.rect(cx - 28, cy - 10, 32, 80); c.rect(cx + 12, cy - 50, 28, 120); c.rect(cx + 48, cy + 8, 24, 62); });
    path(c => { c.moveTo(cx - 80, cy + 72); c.lineTo(cx + 80, cy + 72); c.moveTo(cx - 40, cy + 4); c.lineTo(cx + 8, cy + 4); });
  } else if (key === 'orc') {
    fillp(c => { c.ellipse(cx, cy + 4, 62, 58, 0, 0, 7); });
    path(c => { c.moveTo(cx - 22, cy + 28); c.lineTo(cx - 18, cy + 78); c.lineTo(cx - 6, cy + 30); c.moveTo(cx + 22, cy + 28); c.lineTo(cx + 18, cy + 78); c.lineTo(cx + 6, cy + 30); });
    g.fillStyle = '#0a0618'; g.beginPath(); g.arc(cx - 22, cy - 4, 8, 0, 7); g.arc(cx + 22, cy - 4, 8, 0, 7); g.fill();
  } else if (key === 'pip') {
    fillp(c => { c.arc(cx, cy - 8, 52, 0.15 * Math.PI, 0.85 * Math.PI, true); c.lineTo(cx - 36, cy + 70); c.lineTo(cx + 36, cy + 70); c.closePath(); });
    path(c => { c.arc(cx, cy - 4, 22, 0, 7); c.moveTo(cx - 10, cy + 40); c.lineTo(cx + 10, cy + 40); });
  } else if (key === 'berserker') {
    // t843u / v225: more Viking detail, ~45% less neon glow (blur / alpha / colour) so the lines stay sharp
    const steel = '#b8c4d0', gold = '#d4b032', fur = '#d0661c', wood = '#c08040';
    const ember = '#c42816', wrap = '#a06030', skin = '#c47a52', edge = '#d4dee8', mail = '#8e98a4', braid = '#f09840';
    // local dim neon — do not change neonStroke(), which the other icons still use at blur 18
    const glow = (col, w, blur, a0, fn, mode) => {
      g.save();
      g.shadowColor = col; g.shadowBlur = blur; g.strokeStyle = col; g.fillStyle = col;
      g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha = a0;
      g.beginPath(); fn(g); if (mode === 'fill') { g.fill(); g.stroke(); } else g.stroke();
      g.shadowBlur = 0; g.globalAlpha = Math.min(0.9, a0 + 0.38);
      g.beginPath(); fn(g); if (mode === 'fill') { g.fill(); g.stroke(); } else g.stroke();
      g.restore();
    };
    const stroke = (col, w, fn) => glow(col, w, 9, 0.5, fn, 'stroke');
    const fillc = (col, w, fn) => glow(col, w, 8, 0.45, fn, 'fill');
    const fine = (col, w, fn) => glow(col, w, 4, 0.4, fn, 'stroke');
    const vx = cx - 16; // shift the figure left so the raised axe stays inside the 12 px atlas crop
    // tunic + broad shoulders
    fillc(ember, 2.5, c => {
      c.moveTo(vx - 66, cy + 22);
      c.quadraticCurveTo(vx - 80, cy + 10, vx - 58, cy + 6);
      c.lineTo(vx - 24, cy + 22);
      c.lineTo(vx + 10, cy + 22);
      c.lineTo(vx + 28, cy + 8);
      c.quadraticCurveTo(vx + 54, cy + 12, vx + 62, cy + 28);
      c.lineTo(vx + 46, cy + 86);
      c.lineTo(vx - 42, cy + 86);
      c.closePath();
    });
    // chainmail on the chest (rows of rings), clipped to the tunic
    g.save();
    g.beginPath();
    g.moveTo(vx - 36, cy + 26); g.lineTo(vx + 30, cy + 26); g.lineTo(vx + 34, cy + 68); g.lineTo(vx - 32, cy + 68); g.closePath();
    g.clip();
    fine(mail, 1.4, c => {
      for (let row = 0, y = cy + 30; y < cy + 66; y += 5, row++) {
        for (let x = vx - 34 + (row % 2) * 3; x < vx + 34; x += 6) c.moveTo(x + 2.4, y), c.arc(x, y, 2.4, 0.15 * Math.PI, 0.85 * Math.PI);
      }
    });
    g.restore();
    // leather folds at the sides
    fine('#8a2414', 1.8, c => {
      c.moveTo(vx - 48, cy + 28); c.quadraticCurveTo(vx - 40, cy + 50, vx - 38, cy + 80);
      c.moveTo(vx + 40, cy + 30); c.quadraticCurveTo(vx + 36, cy + 52, vx + 34, cy + 80);
    });
    // right arm reaching for the haft
    fillc(ember, 2.5, c => {
      c.moveTo(vx + 28, cy + 14);
      c.quadraticCurveTo(vx + 58, cy + 10, vx + 66, cy + 36);
      c.quadraticCurveTo(vx + 58, cy + 48, vx + 36, cy + 40);
      c.closePath();
    });
    fine('#8a2414', 1.6, c => { c.moveTo(vx + 34, cy + 20); c.quadraticCurveTo(vx + 50, cy + 24, vx + 58, cy + 36); });
    // fur cloak over the shoulders, with tuft strokes
    fillc(fur, 2.5, c => {
      c.moveTo(vx - 62, cy + 10);
      c.quadraticCurveTo(vx - 70, cy + 28, vx - 54, cy + 44);
      c.quadraticCurveTo(vx - 28, cy + 30, vx, cy + 26);
      c.quadraticCurveTo(vx + 22, cy + 30, vx + 40, cy + 18);
      c.quadraticCurveTo(vx + 28, cy + 6, vx, cy + 12);
      c.quadraticCurveTo(vx - 26, cy + 4, vx - 62, cy + 10);
      c.closePath();
    });
    fine(braid, 1.7, c => {
      for (const [x0, y0, dx, dy] of [
        [vx - 58, cy + 16, -10, 10], [vx - 50, cy + 22, -8, 12], [vx - 40, cy + 18, -7, 11],
        [vx - 28, cy + 16, -4, 10], [vx - 14, cy + 18, 0, 9], [vx, cy + 16, 2, 8],
        [vx + 12, cy + 16, 4, 9], [vx + 24, cy + 14, 6, 9], [vx + 34, cy + 12, 7, 8],
        [vx - 54, cy + 30, -8, 8], [vx + 30, cy + 22, 6, 8]
      ]) { c.moveTo(x0, y0); c.lineTo(x0 + dx, y0 + dy); }
    });
    // gold belt sitting on the tunic, below the beard, with a buckle pin
    stroke(gold, 5, c => { c.moveTo(vx - 32, cy + 70); c.lineTo(vx + 32, cy + 70); });
    fillc(gold, 1.8, c => { c.rect(vx - 6, cy + 64, 12, 14); });
    fine('#8a6a18', 1.6, c => { c.moveTo(vx, cy + 66); c.lineTo(vx, cy + 76); });
    // forked beard with braided strands (ends above the belt)
    fillc(fur, 2.4, c => {
      c.moveTo(vx - 28, cy + 6);
      c.quadraticCurveTo(vx - 38, cy + 30, vx - 26, cy + 50);
      c.lineTo(vx - 22, cy + 66);
      c.lineTo(vx - 8, cy + 46);
      c.lineTo(vx, cy + 54);
      c.lineTo(vx + 8, cy + 46);
      c.lineTo(vx + 22, cy + 66);
      c.lineTo(vx + 26, cy + 50);
      c.quadraticCurveTo(vx + 38, cy + 30, vx + 28, cy + 6);
      c.quadraticCurveTo(vx, cy + 20, vx - 28, cy + 6);
      c.closePath();
    });
    fine(braid, 1.6, c => {
      // left braid
      c.moveTo(vx - 16, cy + 12); c.quadraticCurveTo(vx - 22, cy + 34, vx - 18, cy + 58);
      c.moveTo(vx - 10, cy + 14); c.quadraticCurveTo(vx - 16, cy + 36, vx - 14, cy + 52);
      // right braid
      c.moveTo(vx + 16, cy + 12); c.quadraticCurveTo(vx + 22, cy + 34, vx + 18, cy + 58);
      c.moveTo(vx + 10, cy + 14); c.quadraticCurveTo(vx + 16, cy + 36, vx + 14, cy + 52);
      // middle notch
      c.moveTo(vx - 2, cy + 18); c.quadraticCurveTo(vx, cy + 36, vx, cy + 48);
      c.moveTo(vx + 2, cy + 18); c.quadraticCurveTo(vx, cy + 36, vx, cy + 48);
      // cross-ties on the braids
      for (const [x, y] of [[vx - 18, cy + 28], [vx - 19, cy + 40], [vx - 18, cy + 52], [vx + 18, cy + 28], [vx + 19, cy + 40], [vx + 18, cy + 52]]) {
        c.moveTo(x - 4, y); c.lineTo(x + 4, y + 1);
      }
    });
    // moustache strands
    stroke(fur, 3.5, c => {
      c.moveTo(vx - 18, cy + 2); c.quadraticCurveTo(vx - 8, cy + 10, vx - 2, cy + 6);
      c.moveTo(vx + 18, cy + 2); c.quadraticCurveTo(vx + 8, cy + 10, vx + 2, cy + 6);
    });
    // open face below the helmet rim
    fillc(skin, 2.2, c => { c.ellipse(vx, cy - 8, 24, 20, 0, 0, 7); });
    // helmet dome sits on the brow, leaving the eyes and beard clear
    fillc(steel, 2.4, c => {
      c.moveTo(vx - 42, cy - 18);
      c.quadraticCurveTo(vx - 46, cy - 74, vx, cy - 86);
      c.quadraticCurveTo(vx + 46, cy - 74, vx + 42, cy - 18);
      c.closePath();
    });
    // dome engraving
    fine('#8a96a2', 1.6, c => {
      c.moveTo(vx - 28, cy - 28); c.quadraticCurveTo(vx, cy - 70, vx + 28, cy - 28);
      c.moveTo(vx - 22, cy - 24); c.quadraticCurveTo(vx, cy - 58, vx + 22, cy - 24);
    });
    // brow rim, cheek guards and nose guard
    stroke(gold, 5, c => {
      c.moveTo(vx - 44, cy - 20); c.quadraticCurveTo(vx, cy - 10, vx + 44, cy - 20);
    });
    fillc(steel, 2.2, c => {
      c.moveTo(vx - 42, cy - 20); c.lineTo(vx - 46, cy + 10); c.lineTo(vx - 32, cy + 6); c.lineTo(vx - 30, cy - 16); c.closePath();
    });
    fillc(steel, 2.2, c => {
      c.moveTo(vx + 42, cy - 20); c.lineTo(vx + 46, cy + 10); c.lineTo(vx + 32, cy + 6); c.lineTo(vx + 30, cy - 16); c.closePath();
    });
    // rivets along the rim and cheek guards
    fillc(gold, 1.2, c => {
      for (const [x, y] of [
        [vx - 34, cy - 16], [vx - 18, cy - 13], [vx, cy - 12], [vx + 18, cy - 13], [vx + 34, cy - 16],
        [vx - 40, cy - 6], [vx - 38, cy + 4], [vx + 40, cy - 6], [vx + 38, cy + 4]
      ]) c.moveTo(x + 2.2, y), c.arc(x, y, 2.2, 0, 7);
    });
    stroke(gold, 5, c => { c.moveTo(vx, cy - 78); c.lineTo(vx, cy + 2); });
    // brows + eyes drawn after the helmet so they sit in the open face under the rim
    stroke('#6a2a12', 2.6, c => {
      c.moveTo(vx - 18, cy - 17); c.quadraticCurveTo(vx - 11, cy - 21, vx - 4, cy - 16);
      c.moveTo(vx + 18, cy - 17); c.quadraticCurveTo(vx + 11, cy - 21, vx + 4, cy - 16);
    });
    g.fillStyle = '#14080c';
    g.beginPath(); g.ellipse(vx - 11, cy - 11, 5.5, 4.5, -0.15, 0, 7); g.ellipse(vx + 11, cy - 11, 5.5, 4.5, 0.15, 0, 7); g.fill();
    g.fillStyle = '#e8dcc8';
    g.beginPath(); g.arc(vx - 9.5, cy - 12.5, 1.7, 0, 7); g.arc(vx + 12.5, cy - 12.5, 1.7, 0, 7); g.fill();
    // horned helmet: horns curve up and slightly out, with a ridge on each
    fillc(gold, 2.4, c => {
      c.moveTo(vx - 30, cy - 58);
      c.quadraticCurveTo(vx - 78, cy - 58, vx - 32, cy - 102);
      c.quadraticCurveTo(vx - 46, cy - 74, vx - 16, cy - 62);
      c.closePath();
    });
    fillc(gold, 2.4, c => {
      c.moveTo(vx + 30, cy - 58);
      c.quadraticCurveTo(vx + 72, cy - 58, vx + 32, cy - 102);
      c.quadraticCurveTo(vx + 42, cy - 74, vx + 16, cy - 62);
      c.closePath();
    });
    fine('#8a6a18', 1.5, c => {
      c.moveTo(vx - 28, cy - 64); c.quadraticCurveTo(vx - 58, cy - 64, vx - 34, cy - 94);
      c.moveTo(vx + 28, cy - 64); c.quadraticCurveTo(vx + 54, cy - 64, vx + 34, cy - 94);
    });
    // wooden haft from the right hand up to the blade
    stroke(wood, 9, c => { c.moveTo(vx + 52, cy + 42); c.lineTo(vx + 78, cy - 36); });
    // leather bindings along the haft
    stroke(wrap, 4.5, c => {
      const ax1 = vx + 52, ay1 = cy + 42, ax2 = vx + 78, ay2 = cy - 36;
      for (const t of [0.18, 0.30, 0.42, 0.70]) {
        const x = ax1 + (ax2 - ax1) * t, y = ay1 + (ay2 - ay1) * t;
        const dx = (ax2 - ax1) * 0.04, dy = (ay2 - ay1) * 0.04;
        c.moveTo(x - dy * 3 - dx, y + dx * 3 - dy); c.lineTo(x + dy * 3 + dx, y - dx * 3 + dy);
      }
    });
    // hand gripping the haft — palm + fingers wrapping the wood
    fillc(skin, 1.8, c => { c.arc(vx + 54, cy + 40, 8, 0, 7); });
    stroke(skin, 3.2, c => {
      c.moveTo(vx + 48, cy + 36); c.quadraticCurveTo(vx + 46, cy + 30, vx + 52, cy + 28);
      c.moveTo(vx + 52, cy + 34); c.quadraticCurveTo(vx + 50, cy + 26, vx + 56, cy + 24);
      c.moveTo(vx + 56, cy + 34); c.quadraticCurveTo(vx + 56, cy + 26, vx + 62, cy + 26);
      c.moveTo(vx + 58, cy + 38); c.quadraticCurveTo(vx + 62, cy + 34, vx + 66, cy + 36);
    });
    // bearded axe head: socket on the haft, cutting edge curving into a downward beard
    // rightmost point is vx+76+44 = cx+106 = 234, inside the 12 px crop
    const hx = vx + 76, hy = cy - 42;
    fillc(steel, 2.4, c => {
      c.moveTo(hx - 14, hy - 10);
      c.lineTo(hx + 4, hy - 18);
      c.lineTo(hx + 12, hy - 4);
      c.quadraticCurveTo(hx + 44, hy - 8, hx + 44, hy + 10);
      c.quadraticCurveTo(hx + 30, hy + 44, hx - 2, hy + 34);
      c.quadraticCurveTo(hx + 16, hy + 16, hx + 4, hy + 8);
      c.lineTo(hx - 12, hy + 12);
      c.closePath();
    });
    // socket band + rivets
    stroke('#7a848e', 3.2, c => { c.moveTo(hx - 8, hy - 12); c.lineTo(hx - 6, hy + 10); });
    fillc('#c8d0d8', 1, c => { c.arc(hx - 7, hy - 4, 1.6, 0, 7); c.moveTo(hx - 5, hy + 4); c.arc(hx - 7, hy + 4, 1.6, 0, 7); });
    // blade ridge and cutting-edge highlight
    fine('#9aa4ae', 1.6, c => {
      c.moveTo(hx + 6, hy - 2); c.quadraticCurveTo(hx + 24, hy + 4, hx + 16, hy + 24);
    });
    stroke(edge, 2.6, c => {
      c.moveTo(hx + 12, hy - 4);
      c.quadraticCurveTo(hx + 44, hy - 8, hx + 44, hy + 10);
      c.quadraticCurveTo(hx + 30, hy + 44, hx - 2, hy + 34);
    });
  } else if (key === 'monkey') {
    fillp(c => { c.arc(cx, cy + 6, 58, 0, 7); c.moveTo(cx - 70, cy - 8); c.arc(cx - 58, cy - 10, 22, 0, 7); c.moveTo(cx + 70, cy - 8); c.arc(cx + 58, cy - 10, 22, 0, 7); });
    g.fillStyle = '#0a0618'; g.beginPath(); g.arc(cx - 20, cy, 8, 0, 7); g.arc(cx + 20, cy, 8, 0, 7); g.fill();
    path(c => { c.arc(cx, cy + 22, 16, 0.15 * Math.PI, 0.85 * Math.PI); });
  } else if (key === 'nova') {
    fillp(c => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 28 : 72; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); });
  } else if (key === 'blaster') {
    path(c => { c.moveTo(cx - 70, cy + 18); c.lineTo(cx + 20, cy - 8); c.lineTo(cx + 28, cy + 10); c.lineTo(cx - 54, cy + 40); c.closePath(); c.moveTo(cx + 16, cy - 18); c.lineTo(cx + 78, cy - 36); c.moveTo(cx + 28, cy + 0); c.lineTo(cx + 78, cy - 8); c.moveTo(cx - 40, cy + 36); c.lineTo(cx - 22, cy + 70); });
  } else if (key === 'bb') {
    path(c => { c.ellipse(cx, cy + 18, 36, 50, 0, 0, 7); c.moveTo(cx - 16, cy - 32); c.lineTo(cx - 8, cy - 70); c.lineTo(cx + 8, cy - 70); c.lineTo(cx + 16, cy - 32); c.moveTo(cx - 50, cy + 40); c.quadraticCurveTo(cx - 70, cy + 80, cx - 20, cy + 70); c.moveTo(cx + 50, cy + 40); c.quadraticCurveTo(cx + 70, cy + 80, cx + 20, cy + 70); });
  } else if (key === 'rockfall') {
    fillp(c => { c.moveTo(cx - 20, cy - 70); c.lineTo(cx + 16, cy - 54); c.lineTo(cx + 8, cy - 20); c.lineTo(cx - 24, cy - 30); c.closePath(); c.moveTo(cx - 64, cy + 10); c.lineTo(cx - 10, cy - 8); c.lineTo(cx + 20, cy + 24); c.lineTo(cx - 30, cy + 50); c.closePath(); c.moveTo(cx + 8, cy + 8); c.lineTo(cx + 70, cy - 4); c.lineTo(cx + 62, cy + 54); c.lineTo(cx + 4, cy + 62); c.closePath(); });
  } else if (key === 'skytower') {
    path(c => { c.moveTo(cx, cy - 78); c.lineTo(cx + 16, cy - 20); c.lineTo(cx + 8, cy - 20); c.lineTo(cx + 36, cy + 78); c.lineTo(cx - 36, cy + 78); c.lineTo(cx - 8, cy - 20); c.lineTo(cx - 16, cy - 20); c.closePath(); c.moveTo(cx - 22, cy + 20); c.lineTo(cx + 22, cy + 20); c.moveTo(cx - 28, cy + 50); c.lineTo(cx + 28, cy + 50); });
  } else if (key === 'roadster') {
    path(c => { c.moveTo(cx - 78, cy + 8); c.lineTo(cx - 40, cy + 8); c.lineTo(cx - 20, cy - 28); c.lineTo(cx + 36, cy - 28); c.lineTo(cx + 62, cy + 8); c.lineTo(cx + 78, cy + 8); c.lineTo(cx + 78, cy + 28); c.lineTo(cx - 78, cy + 28); c.closePath(); c.arc(cx - 36, cy + 32, 16, 0, 7); c.moveTo(cx + 52, cy + 32); c.arc(cx + 36, cy + 32, 16, 0, 7); });
  } else if (key === 'claw') {
    path(c => { c.moveTo(cx, cy - 78); c.lineTo(cx, cy - 20); c.moveTo(cx, cy - 20); c.lineTo(cx - 48, cy + 50); c.lineTo(cx - 20, cy + 70); c.moveTo(cx, cy - 20); c.lineTo(cx + 48, cy + 50); c.lineTo(cx + 20, cy + 70); c.moveTo(cx - 16, cy - 8); c.lineTo(cx + 16, cy - 8); });
  }
}

function makeIconAtlas() {
  const keys = ['strike', 'ghost', 'cyber', 'orc', 'pip', 'berserker', 'monkey', 'nova', 'blaster', 'bb', 'rockfall', 'skytower', 'roadster', 'claw'];
  const S = 256, COLS = 4, W = S * COLS, H = S * 4;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rects = {};
  keys.forEach((key, i) => {
    const x = (i % COLS) * S, y = Math.floor(i / COLS) * S;
    const t = document.createElement('canvas'); t.width = S; t.height = S;
    drawIcon(t.getContext('2d'), key, S);
    g.drawImage(t, x, y);
    rects[key] = { x: x + 12, y: y + 12, w: S - 24, h: S - 24 };
  });
  return { cv, rects, W, H };
}

export function buildNeonSigns(THREE, mergeGeometries, list, opt = {}) {
  const A = NEON_ATLAS, MAXW = opt.maxW || 3.7, HALF = opt.HALF, WALL_D = 0.06;
  const quads = [], info = [], iconQuads = [], iconInfo = [];
  const atlas = makeIconAtlas();
  // t840u / v223: icons are much bigger and fill the space up to just under the cyan ceiling band (y=6.2, small gap).
  // Kept centred on the sign; width shrinks if needed so neighbours and the east/west window planes stay clear.
  const ICON_GAP = 0.08, ICON_CEIL_GAP = 0.15, ICON_MAX_TOP = 6.2 - ICON_CEIL_GAP, ICON_MIN = 0.28, ICON_SIDE_GAP = 0.16, ICON_WIN_MARGIN = 0.2;
  const iconPending = [];
  for (const e of list) {
    const r = A.signs[e.key]; if (!r) continue;
    let w = r.m[0] * (e.scale || 1), h = r.m[1] * (e.scale || 1); if (w > MAXW) { h *= MAXW / w; w = MAXW; }
    const u0 = r.x / A.W, u1 = (r.x + r.w) / A.W, v1 = 1 - r.y / A.H, v0 = 1 - (r.y + r.h) / A.H;
    // place: wall cabinet -> on the wall above it; free-standing -> on top of it / its given anchor
    const cab = e.cab; cab.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(cab), ctr = b.getCenter(new THREE.Vector3()), n = (e.normal || cab.userData.inward).clone().setY(0).normalize();
    const p = e.at ? e.at.clone() : ctr.clone();
    if (e.wall) { if (Math.abs(n.x) > Math.abs(n.z)) p.x = -Math.sign(n.x) * (HALF - WALL_D); else p.z = -Math.sign(n.z) * (HALF - WALL_D);
      p.y = Math.max(b.max.y + 0.3 + h / 2, opt.minY || 3.3); }
    else if (!e.at) p.y = b.max.y + 0.08 + h / 2;
    else p.y += h / 2;
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    g.rotateY(Math.atan2(n.x, n.z)); g.translate(p.x, p.y, p.z); quads.push(g);
    const top = p.y + h / 2, bottom = p.y - h / 2;
    info.push({ title: e.title, key: e.key, color: '#' + new THREE.Color(e.color).getHexString(), pos: p.toArray().map(v => +v.toFixed(3)), w: +w.toFixed(3), h: +h.toFixed(3), normal: n.toArray().map(v => +v.toFixed(3)), bottom: +bottom.toFixed(3), top: +top.toFixed(3), cabTop: +b.max.y.toFixed(3) });
    const ir = atlas.rects[e.key];
    if (ir) {
      // grow the icon so its top nearly touches the ceiling band, sitting just above the name sign
      let ih = ICON_MAX_TOP - top - ICON_GAP;
      if (ih < ICON_MIN) ih = Math.max(0.12, ICON_MAX_TOP - top - 0.04);
      const ip = p.clone(); ip.y = Math.min(ICON_MAX_TOP - ih / 2, top + ICON_GAP + ih / 2);
      iconPending.push({ e, ir, p, n, top, ih, iw: ih, ip });
    }
  }
  for (let i = 0; i < iconPending.length; i++) {
    const A = iconPending[i];
    let maxHalf = A.ih / 2;
    for (let j = 0; j < iconPending.length; j++) {
      if (i === j) continue;
      const B = iconPending[j];
      if (A.n.dot(B.n) < 0.9) continue;
      const along = Math.hypot(A.p.x - B.p.x, A.p.z - B.p.z);
      if (along < 0.05) continue;
      maxHalf = Math.min(maxHalf, along / 2 - ICON_SIDE_GAP);
    }
    A.iw = Math.max(ICON_MIN, Math.min(A.ih, maxHalf * 2));
    // stay clear of the window walls (room 1 east glass at x=+HALF, and the matching room-2 window)
    const alongX = Math.abs(A.n.z) > Math.abs(A.n.x);
    const coord = alongX ? A.p.x : A.p.z;
    const maxW = 2 * (Math.max(0.01, (HALF || 12) - ICON_WIN_MARGIN - Math.abs(coord)));
    if (maxW < A.iw) A.iw = Math.max(ICON_MIN, maxW);
    A.ip.y = Math.min(ICON_MAX_TOP - A.ih / 2, A.top + ICON_GAP + A.ih / 2);
    const ir = A.ir, iw = A.iw, ih = A.ih, ip = A.ip, n = A.n, top = A.top;
    const iu0 = ir.x / atlas.W, iu1 = (ir.x + ir.w) / atlas.W, iv1 = 1 - ir.y / atlas.H, iv0 = 1 - (ir.y + ir.h) / atlas.H;
    const ig = new THREE.PlaneGeometry(iw, ih), iuv = ig.attributes.uv;
    for (let k = 0; k < iuv.count; k++) iuv.setXY(k, iuv.getX(k) ? iu1 : iu0, iuv.getY(k) ? iv1 : iv0);
    ig.rotateY(Math.atan2(n.x, n.z)); ig.translate(ip.x, ip.y, ip.z); iconQuads.push(ig);
    iconInfo.push({ key: A.e.key, pos: ip.toArray().map(v => +v.toFixed(3)), w: +iw.toFixed(3), h: +ih.toFixed(3), bottom: +(ip.y - ih / 2).toFixed(3), top: +(ip.y + ih / 2).toFixed(3), signTop: +top.toFixed(3) });
  }
  const tex = new THREE.TextureLoader().load(opt.src || 'tex/neon_signs.webp', t => { try { if (opt.renderer) opt.renderer.initTexture(t); } catch (err) {} if (opt.onLoad) opt.onLoad(t); });
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = opt.aniso || 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1).multiplyScalar(opt.k || 0.55) });   // t782u: 0.55 (t775u: 0.85, v188: 1.3), dimmer + the atlas itself is sharper / thinner
  mat.name = 'neonSigns';
  const mesh = new THREE.Mesh(mergeGeometries(quads), mat); mesh.name = 'neonSigns'; mesh.renderOrder = 3; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  mesh.userData.signs = info; mesh.userData.k = mat.color.r;
  if (iconQuads.length) {
    const itex = new THREE.CanvasTexture(atlas.cv); itex.colorSpace = THREE.SRGBColorSpace; itex.anisotropy = opt.aniso || 4;
    try { if (opt.renderer) opt.renderer.initTexture(itex); } catch (err) {}
    const imat = new THREE.MeshBasicMaterial({ map: itex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1).multiplyScalar(opt.k || 0.55) });
    imat.name = 'neonIcons';
    const icons = new THREE.Mesh(mergeGeometries(iconQuads), imat); icons.name = 'neonIcons'; icons.renderOrder = 3; icons.matrixAutoUpdate = false; icons.updateMatrix();
    icons.userData.icons = iconInfo; mesh.add(icons); mesh.userData.icons = iconInfo;
    if (typeof window !== 'undefined') window.__neonIcons = icons;
  }
  return mesh;
}
