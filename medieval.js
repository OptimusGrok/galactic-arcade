// t230 MEDIEVAL walls (Dave: 'Add a medieval cobblestone floor and walls with goth windows'):
// castle stone-block wall texture (canvas, procedural). t773u: the gothic stained-glass windows were removed (plain stone walls).
//
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(230);

export function stoneWallTex(THREE, renderer) {
  const W = 1024, Hh = 1024, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#2a2522'; x.fillRect(0, 0, W, Hh);                                   // mortar
  const rows = 12, rh = Hh / rows;
  for (let r = 0; r < rows; r++) { let u = r % 2 ? -rh * 0.9 : 0;
    while (u < W) { const bw = rh * (1.6 + rnd() * 1.4), y0 = r * rh;
      const tone = 70 + rnd() * 50, warm = rnd() * 14, g = x.createLinearGradient(0, y0, 0, y0 + rh);
      g.addColorStop(0, `rgb(${tone + 18 + warm},${tone + 12},${tone + 4})`); g.addColorStop(1, `rgb(${tone - 22 + warm},${tone - 26},${tone - 30})`);
      x.fillStyle = g; const m = 4 + rnd() * 3, rr = 7;
      const draw = ox => { x.beginPath(); x.roundRect(u + m + ox, y0 + m, bw - 2 * m, rh - 2 * m, rr); x.fill(); };
      draw(0); if (u + bw > W) draw(-W); if (u < 0) draw(W);
      u += bw; } }
  const id = x.getImageData(0, 0, W, Hh), d = id.data;                                   // grain, chips, moss/damp
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(id, 0, 0);
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '200,190,170'},${0.05 + rnd() * 0.12})`; x.beginPath(); x.arc(rnd() * W, rnd() * Hh, 1 + rnd() * 5, 0, 7); x.fill(); }
  for (let k = 0; k < 40; k++) { const px = rnd() * W, py = rnd() * Hh; x.strokeStyle = 'rgba(10,8,6,0.5)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py);
    for (let j = 0; j < 4; j++) x.lineTo(px + (rnd() - 0.5) * 40, py + rnd() * 30 * (j + 1)); x.stroke(); }
  for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(40,70,30,${0.05 + rnd() * 0.08})`; x.beginPath(); x.ellipse(rnd() * W, rnd() * Hh, 8 + rnd() * 30, 4 + rnd() * 10, 0, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
