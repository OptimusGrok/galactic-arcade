// t775u: draws the NEON NAME SIGN atlas, each sign styled after its own game's title screen / logo (fonts, colours, motifs).
// Baked OFFLINE (tools/build_neon_atlas.js, Google fonts installed on the build box) into tex/neon_signs.webp + neon_atlas.js,
// so every device shows the same lettering (iPads / PCs don't have these fonts). Runs in a browser page: window.drawNeonAtlas().
window.drawNeonAtlas = function () {
  const CW = 512, W = 1024, H = 1344, c = document.createElement('canvas'); c.width = W; c.height = H; const X = c.getContext('2d');
  const PX_PER_M = 150;   // 128 px cell row = 0.85 m on the wall (t775u: ~25% bigger than v188's 0.6 m signs)
  const glow = (g, col, blur) => { g.shadowColor = col; g.shadowBlur = blur; g.shadowOffsetX = g.shadowOffsetY = 0; };
  const nog = g => { g.shadowBlur = 0; g.shadowColor = 'transparent'; };
  const fit = (g, txt, font, size, maxW) => { let s = size; g.font = font(s); while (g.measureText(txt).width > maxW && s > 8) { s -= 2; g.font = font(s); } return s; };
  const lin = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  // glowing text: soft halo (dim, t775u), optional dark outline, fill
  function neonText(g, txt, x, y, o) {
    g.save(); g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.font = o.font; if (o.spacing) g.letterSpacing = o.spacing + 'px';
    if (o.skew) { g.translate(x, y); g.transform(1, 0, o.skew, 1, 0, 0); x = 0; y = 0; }
    glow(g, o.glow, o.blur ?? 16); g.globalAlpha = o.haloA ?? 0.75; g.fillStyle = o.glow; g.fillText(txt, x, y); g.globalAlpha = 1; nog(g);
    if (o.outline) { g.lineJoin = 'round'; g.lineWidth = o.ow || 6; g.strokeStyle = o.outline; g.strokeText(txt, x, y); }
    g.fillStyle = o.fill; g.fillText(txt, x, y);
    if (o.core) { g.lineWidth = o.cw || 1.5; g.strokeStyle = o.core; g.strokeText(txt, x, y); }
    g.restore();
  }
  const S = {
    strike(g, w, h) {   // vertical sci-fi shmup: chrome-white wide letters, cyan glow, red bar + chevrons
      const f = s => `900 ${s}px Orbitron`; const s = fit(g, 'STRIKE', f, 74, w - 70);
      neonText(g, 'STRIKE', w / 2, h * 0.44, { font: f(s), spacing: 6, glow: '#3fa8ff', blur: 18, fill: lin(g, h * 0.2, h * 0.7, [[0, '#ffffff'], [0.55, '#bfe6ff'], [1, '#5aa8ff']]), outline: '#0a1a3a', ow: 5 });
      glow(g, '#ff2030', 10); g.fillStyle = '#ff3040'; g.fillRect(w * 0.2, h * 0.8, w * 0.6, 6);
      for (const sx of [-1, 1]) { g.beginPath(); const cx = w / 2 + sx * w * 0.36, cy = h * 0.81; g.moveTo(cx, cy - 8); g.lineTo(cx + sx * 16, cy + 3); g.lineTo(cx, cy + 14); g.closePath(); g.fill(); } nog(g); },
    ghost(g, w, h) {    // retro pixel maze game: Press Start 2P, GHOST over 256 like its title screen, a colour per letter, pixel ghosts
      const f = s => `${s}px "Press Start 2P"`, cols = ['#ff3030', '#ff9be8', '#3ff0ff', '#ffa040', '#ffe14a'], cols2 = ['#ff3030', '#3ff0ff', '#ffe14a'];
      const line = (t, cs, y, size) => { g.font = f(size); const tw = g.measureText(t).width; let x = (w - tw) / 2;
        [...t].forEach((ch, i) => { const cw = g.measureText(ch).width; neonText(g, ch, x + cw / 2, y, { font: f(size), glow: cs[i % cs.length], blur: 12, fill: cs[i % cs.length], haloA: 0.6 }); x += cw; }); return tw; };
      const tw = line('GHOST', cols, h * 0.3, 58); line('256', cols2, h * 0.74, 58);
      const px = 6, M = ['..XXXX..', '.XXXXXX.', 'XXWWXWWX', 'XXWBXWBX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'X.XX.XX.'];
      for (const [gx, col] of [[(w - tw) / 2 - 70, '#ff3030'], [(w + tw) / 2 + 22, '#3ff0ff']]) { const gy = h * 0.52 - 24; glow(g, col, 10);
        M.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; g.fillStyle = ch === 'W' ? '#fff' : ch === 'B' ? '#2040ff' : col; g.fillRect(gx + i * px, gy + j * px, px, px); })); nog(g); } },
    cyber(g, w, h) {    // cyberpunk: magenta CYBER + cyan CITY, chromatic split, glitch slices
      const f = s => `900 ${s}px Orbitron`; const s = fit(g, 'CYBERCITY', f, 66, w - 60); g.font = f(s);
      const a = g.measureText('CYBER').width, b = g.measureText('CITY').width, x0 = (w - a - b) / 2, y = h / 2;
      g.globalAlpha = 0.55; neonText(g, 'CYBER', x0 - 3, y, { font: f(s), align: 'left', glow: '#3ff0ff', blur: 0, fill: '#3ff0ff', haloA: 0 }); neonText(g, 'CITY', x0 + a + 3, y, { font: f(s), align: 'left', glow: '#ff3fd0', blur: 0, fill: '#ff3fd0', haloA: 0 }); g.globalAlpha = 1;
      neonText(g, 'CYBER', x0, y, { font: f(s), align: 'left', glow: '#ff3fd0', blur: 16, fill: '#ff6fe0', core: '#ffd0f6' });
      neonText(g, 'CITY', x0 + a, y, { font: f(s), align: 'left', glow: '#3ff0ff', blur: 16, fill: '#6ff6ff', core: '#d8ffff' });
      const im = g.getImageData(0, 0, w, h); for (const [yy, dx] of [[h * 0.38 | 0, 7], [h * 0.6 | 0, -6]]) { const row = g.getImageData(0, yy, w, 5); g.clearRect(0, yy, w, 5); g.putImageData(row, dx, yy); } void im;
      g.fillStyle = '#3ff0ff'; glow(g, '#3ff0ff', 6); g.fillRect(x0, h * 0.84, a + b, 2); nog(g); },
    orc(g, w, h) {      // dark-fantasy: blackletter-ish green with dark outline, axes either side
      const f = s => `${s}px "Metal Mania"`; const s = fit(g, 'ORC ATTACK', f, 76, w - 120);
      neonText(g, 'ORC ATTACK', w / 2, h / 2 + 4, { font: f(s), glow: '#3aff2a', blur: 16, fill: lin(g, h * 0.2, h * 0.8, [[0, '#d8ff8a'], [0.5, '#6ee83a'], [1, '#2a8a12']]), outline: '#0c1a06', ow: 7 });
      for (const sx of [-1, 1]) { const cx = w / 2 + sx * (w / 2 - 40), cy = h / 2; g.save(); g.translate(cx, cy); g.scale(sx, 1); glow(g, '#3aff2a', 8);
        g.fillStyle = '#7a5a30'; g.fillRect(-3, -26, 6, 54); g.fillStyle = '#c8d0c0'; g.beginPath(); g.moveTo(3, -24); g.quadraticCurveTo(26, -14, 24, 6); g.quadraticCurveTo(14, -4, 3, -2); g.closePath(); g.fill(); g.restore(); } nog(g); },
    pip(g, w, h) {      // bright platformer: chunky rounded letters, white outline, coins
      const f = s => `${s}px "Lilita One"`;
      neonText(g, 'SUPER', w / 2, h * 0.24, { font: f(fit(g, 'SUPER', f, 46, w)), spacing: 4, glow: '#ffd21a', blur: 10, fill: '#ffe14a', outline: '#7a3a00', ow: 6 });
      const s = fit(g, 'PIP QUEST', f, 88, w - 110);
      neonText(g, 'PIP QUEST', w / 2, h * 0.64, { font: f(s), glow: '#ff5a3a', blur: 14, fill: lin(g, h * 0.4, h * 0.9, [[0, '#ffb04a'], [1, '#ff3a2a']]), outline: '#ffffff', ow: 7 });
      glow(g, '#ffd21a', 10); for (const cx of [38, w - 38]) { g.fillStyle = '#ffd21a'; g.beginPath(); g.ellipse(cx, h * 0.64, 15, 19, 0, 0, 7); g.fill(); g.fillStyle = '#fff3a0'; g.fillRect(cx - 3, h * 0.64 - 11, 6, 22); } nog(g); },
    berserker(g, w, h) { // viking saga: carved red serif + a Viking axe (t778u; was a gold rune line)
      const f = s => `900 ${s}px "Cinzel Decorative"`; const s = fit(g, 'BERSERKER', f, 70, w - 110);
      neonText(g, 'BERSERKER', w / 2, h * 0.4, { font: f(s), glow: '#ff2000', blur: 16, fill: lin(g, h * 0.15, h * 0.65, [[0, '#ff8a5a'], [0.5, '#ff3a1a'], [1, '#a01008']]), outline: '#2a0400', ow: 5 });
      // t778u: a horizontal 3D-looking Viking bearded axe under the name (shaded steel head, wooden haft, leather wrap), in the sign's red neon glow
      const yH = h * 0.74, ox = w / 2 - 266, X = v => ox + v;
      const head = () => { g.beginPath(); g.moveTo(X(366), yH - 20); g.lineTo(X(398), yH - 20); g.lineTo(X(398), yH + 12);
        g.quadraticCurveTo(X(405), yH + 30, X(414), yH + 50); g.quadraticCurveTo(X(360), yH + 68, X(316), yH + 47); g.quadraticCurveTo(X(352), yH + 32, X(366), yH + 12); g.closePath(); };
      const haft = () => { g.beginPath(); g.roundRect(X(118), yH - 7, 262, 14, 6); };
      // dimmed neon halo of the whole silhouette
      g.save(); glow(g, '#ff2000', 14); g.globalAlpha = 0.6; g.fillStyle = '#ff3a1a'; haft(); g.fill(); head(); g.fill(); g.restore(); nog(g);
      // haft: round wood (light top, dark underside) with grain
      haft(); g.fillStyle = lin(g, yH - 7, yH + 7, [[0, '#e0a868'], [0.35, '#b07838'], [0.75, '#6a3e18'], [1, '#2a1608']]); g.fill();
      g.strokeStyle = 'rgba(40,20,8,0.55)'; g.lineWidth = 1; for (const [a, b, yy] of [[220, 330, -2], [250, 360, 2], [300, 372, -4]]) { g.beginPath(); g.moveTo(X(a), yH + yy); g.lineTo(X(b), yH + yy + 0.5); g.stroke(); }
      // leather wrap near the butt: diagonal bands
      g.save(); g.beginPath(); g.rect(X(138), yH - 8, 70, 16); g.clip();
      g.fillStyle = lin(g, yH - 8, yH + 8, [[0, '#8a5a34'], [0.5, '#5a3218'], [1, '#24120a']]); g.fillRect(X(138), yH - 8, 70, 16);
      g.strokeStyle = '#1a0c04'; g.lineWidth = 2; for (let k = -10; k < 80; k += 9) { g.beginPath(); g.moveTo(X(138 + k), yH + 8); g.lineTo(X(146 + k), yH - 8); g.stroke(); }
      g.strokeStyle = 'rgba(255,200,150,0.35)'; g.lineWidth = 1; for (let k = -10; k < 80; k += 9) { g.beginPath(); g.moveTo(X(140 + k), yH + 6); g.lineTo(X(147 + k), yH - 7); g.stroke(); } g.restore();
      // butt cap
      g.beginPath(); g.ellipse(X(118), yH, 5, 8, 0, 0, 7); g.fillStyle = lin(g, yH - 8, yH + 8, [[0, '#f0f4f8'], [0.5, '#8a96a0'], [1, '#3a4248']]); g.fill();
      glow(g, '#ff2000', 8); g.strokeStyle = 'rgba(255,90,42,0.85)'; g.lineWidth = 1.4; haft(); g.stroke(); nog(g);   // red neon rim (the head covers the socket end)
      // steel head: lit from above, darker toward the beard, bright bevel on the cutting edge
      head(); g.fillStyle = lin(g, yH - 20, yH + 64, [[0, '#f4f8fb'], [0.3, '#c4ccd4'], [0.65, '#7a8692'], [1, '#3a424a']]); g.fill();
      g.save(); head(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(X(368), yH - 20); g.lineTo(X(384), yH - 20); g.lineTo(X(384), yH + 20); g.quadraticCurveTo(X(360), yH + 40, X(330), yH + 46); g.quadraticCurveTo(X(358), yH + 30, X(368), yH + 12); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(20,24,28,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(398), yH + 14); g.quadraticCurveTo(X(370), yH + 44, X(326), yH + 47); g.stroke(); g.restore();   // bevel line
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(413), yH + 49); g.quadraticCurveTo(X(360), yH + 67, X(317), yH + 47); g.stroke();   // honed edge
      g.lineWidth = 2; g.strokeStyle = '#1a1210'; head(); g.stroke();
      // socket band + rivets, and a thin red neon rim on the whole axe
      g.fillStyle = lin(g, yH - 20, yH + 12, [[0, '#9aa4ae'], [1, '#2a3036']]); g.fillRect(X(374), yH - 20, 6, 32);
      g.fillStyle = '#e8eef2'; for (const yy of [-12, 4]) { g.beginPath(); g.arc(X(389), yH + yy, 2.2, 0, 7); g.fill(); }
      glow(g, '#ff2000', 8); g.strokeStyle = 'rgba(255,90,42,0.85)'; g.lineWidth = 1.4; head(); g.stroke(); nog(g); },
    monkey(g, w, h) {   // cartoon jungle: Luckiest Guy, orange MONKEY over yellow CROSSING, brown outline
      const f = s => `${s}px "Luckiest Guy"`;
      neonText(g, 'MONKEY', w / 2, h * 0.3, { font: f(fit(g, 'MONKEY', f, 80, w - 80)), glow: '#ff6a1a', blur: 12, fill: '#ff7a3a', outline: '#3a1a04', ow: 7 });
      neonText(g, 'CROSSING', w / 2, h * 0.72, { font: f(fit(g, 'CROSSING', f, 72, w - 60)), glow: '#ffc81a', blur: 12, fill: '#ffd83a', outline: '#3a1a04', ow: 7 }); },
    nova(g, w, h) {     // space shooter: pink NOVA over hot-orange TETHER, an orbit line
      const f = s => `${s}px "Russo One"`;
      neonText(g, 'NOVA', w / 2, h * 0.3, { font: f(fit(g, 'NOVA', f, 78, w)), spacing: 10, glow: '#ff3fd0', blur: 14, fill: lin(g, h * 0.1, h * 0.5, [[0, '#ffd0f4'], [1, '#ff4fd8']]) });
      neonText(g, 'TETHER', w / 2, h * 0.72, { font: f(fit(g, 'TETHER', f, 78, w - 60)), spacing: 8, glow: '#ff8a1a', blur: 14, fill: lin(g, h * 0.52, h * 0.92, [[0, '#ffe07a'], [1, '#ff6a1a']]) });
      g.strokeStyle = '#3fb8ff'; g.lineWidth = 3; glow(g, '#3fb8ff', 8); g.beginPath(); g.ellipse(w / 2, h * 0.5, w * 0.46, h * 0.1, -0.08, 0, 7); g.stroke(); nog(g);
      g.fillStyle = '#fff'; glow(g, '#bfe8ff', 10); g.beginPath(); g.arc(w / 2 + w * 0.44, h * 0.47, 5, 0, 7); g.fill(); nog(g); },
    blaster(g, w, h) {  // 1984 vector/pixel: cyan pixel letters, (1984) in magenta
      const f = s => `${s}px VT323`;
      neonText(g, 'BLASTER', w / 2, h * 0.38, { font: f(fit(g, 'BLASTER', f, 120, w - 60)), spacing: 6, glow: '#3ff0ff', blur: 14, fill: '#8ffaff', outline: '#063040', ow: 4 });
      neonText(g, '(1984)', w / 2, h * 0.8, { font: f(46), spacing: 4, glow: '#ff3fd0', blur: 10, fill: '#ff8fe8' }); },
    bb(g, w, h) {       // pixel digging game: Press Start 2P, yellow BURROW / red BUSTER
      const f = s => `${s}px "Press Start 2P"`;
      neonText(g, 'BURROW', w / 2, h * 0.3, { font: f(fit(g, 'BURROW', f, 54, w - 80)), glow: '#ffd21a', blur: 10, fill: '#ffe14a', outline: '#3a2400', ow: 5 });
      neonText(g, 'BUSTER', w / 2, h * 0.72, { font: f(fit(g, 'BUSTER', f, 54, w - 80)), glow: '#ff3a1a', blur: 10, fill: '#ff5a3a', outline: '#3a0800', ow: 5 }); },
    rockfall(g, w, h) { // mining: stony gold block letters, falling rocks
      const f = s => `${s}px Bungee`; const s = fit(g, 'ROCKFALL RUSH', f, 64, w - 50);
      neonText(g, 'ROCKFALL RUSH', w / 2, h / 2 + 6, { font: f(s), glow: '#ffa020', blur: 14, fill: lin(g, h * 0.25, h * 0.8, [[0, '#ffe8a0'], [0.5, '#e8b040'], [1, '#a86a18']]), outline: '#2a1a08', ow: 6 });
      g.fillStyle = '#8a7a6a'; glow(g, '#ffa020', 4); for (const [x, y, r] of [[40, 22, 9], [86, 14, 6], [w - 60, 18, 8], [w - 110, 10, 5], [w / 2 + 40, 12, 6]]) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, rr = r * (0.8 + 0.3 * ((k * 7) % 3) / 2); g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } g.fill(); } nog(g); },
    skytower(g, w, h) { // the game's own marquee: Courier bold yellow with a dark-red outline, sky-blue glow, clouds
      const f = s => `700 ${s}px "Courier Prime"`; const s = fit(g, 'SKY TOWER', f, 80, w - 110);
      g.fillStyle = '#ffffff'; glow(g, '#8fe0ff', 10); for (const cx of [44, w - 44]) { for (const [dx, dy, r] of [[-14, 4, 12], [0, -4, 16], [15, 4, 12]]) { g.beginPath(); g.arc(cx + dx, h / 2 + dy, r, 0, 7); g.fill(); } } nog(g);
      neonText(g, 'SKY TOWER', w / 2, h / 2 + 2, { font: f(s), glow: '#5fd0ff', blur: 16, fill: '#ffe14a', outline: '#3a0800', ow: 7 }); },
    roadster(g, w, h) { // racing: italic white-to-orange chrome with speed lines
      const f = s => `${s}px "Racing Sans One"`; const s = fit(g, 'MARS ROADSTER', f, 76, w - 90);
      g.strokeStyle = '#ff8a3a'; glow(g, '#ff6a1a', 8); g.lineWidth = 3; for (const [y, l] of [[0.36, 50], [0.5, 70], [0.64, 40]]) { g.beginPath(); g.moveTo(14, h * y); g.lineTo(14 + l, h * y); g.stroke(); } nog(g);
      neonText(g, 'MARS ROADSTER', w / 2 + 24, h / 2 + 2, { font: f(s), skew: -0.18, glow: '#ff5a1a', blur: 14, fill: lin(g, -h * 0.3, h * 0.3, [[0, '#ffffff'], [0.5, '#ffc08a'], [1, '#ff5a1a']]), outline: '#2a0a00', ow: 5 }); },
    claw(g, w, h) {     // toy-crane: bubbly pink with a yellow rim, stars
      const f = s => `${s}px "Titan One"`; const s = fit(g, 'CLAW MACHINE', f, 66, w - 90);
      neonText(g, 'CLAW MACHINE', w / 2, h / 2 + 2, { font: f(s), glow: '#ff2bd6', blur: 14, fill: '#ff6fe0', outline: '#ffe14a', ow: 5 });
      g.fillStyle = '#ffe14a'; glow(g, '#ffe14a', 8); for (const cx of [26, w - 26]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 - 1.571, r = k % 2 ? 6 : 15; g.lineTo(cx + r * Math.cos(a), h / 2 + r * Math.sin(a)); } g.fill(); } nog(g); },
  };
  const ORDER = [['strike', 1], ['ghost', 1.7], ['cyber', 1], ['orc', 1], ['pip', 2], ['berserker', 1.7], ['monkey', 2], ['nova', 2], ['blaster', 1.6], ['bb', 2], ['rockfall', 1], ['skytower', 1], ['roadster', 1], ['claw', 1]];
  const out = {}; const colY = [0, 0]; if (!document.fonts.check('20px "Press Start 2P"')) throw new Error('fonts missing');
  for (const [key, rows] of ORDER) {
    const ch = Math.round(128 * rows), col = colY[0] <= colY[1] ? 0 : 1, x0 = col * CW, y0 = colY[col]; colY[col] += ch;
    const t = document.createElement('canvas'); t.width = CW; t.height = ch; const g = t.getContext('2d', { willReadFrequently: true }); S[key](g, CW, ch);
    const d = g.getImageData(0, 0, CW, ch).data; let a0 = CW, a1 = -1, b0 = ch, b1 = -1;   // tight box of the visible pixels
    for (let y = 0; y < ch; y++) for (let x = 0; x < CW; x++) if (d[(y * CW + x) * 4 + 3] > 6) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
    a0 = Math.max(0, a0 - 2); a1 = Math.min(CW - 1, a1 + 2); b0 = Math.max(0, b0 - 2); b1 = Math.min(ch - 1, b1 + 2);
    X.drawImage(t, x0, y0);
    out[key] = { x: x0 + a0, y: y0 + b0, w: a1 - a0 + 1, h: b1 - b0 + 1, m: [+((a1 - a0 + 1) / PX_PER_M).toFixed(3), +((b1 - b0 + 1) / PX_PER_M).toFixed(3)] };
  }
  if (Math.max(...colY) > H) throw new Error('atlas overflow ' + colY);
  return { png: c.toDataURL('image/png'), layout: { W, H, signs: out } };
};
