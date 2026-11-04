// t230 MEDIEVAL walls (Dave: 'Add a medieval cobblestone floor and walls with goth windows'):
// castle stone-block wall texture (canvas, procedural) + gothic pointed-arch stained-glass windows with iron tracery and a soft glow,
// mounted high on room 1's north / west / south walls (above the cabinet ledge, below the ceiling strip; the east wall is the space window).
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(230);

export function stoneWallTex(THREE, renderer) {
  const W = 1024, Hh = 1024, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
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

function gothicPath(x, w, h, inset) {   // pointed (equilateral) arch on a rectangle, in canvas coords (top-left 0,0)
  const l = inset, r = w - inset, sp = h * 0.42, b = h - inset, R = r - l;
  x.beginPath(); x.moveTo(l, b); x.lineTo(l, sp); x.arc(r, sp, R, Math.PI, Math.PI + Math.PI / 3, false); x.arc(l, sp, R, -Math.PI / 3, 0, false); x.lineTo(r, b); x.closePath();
}
function windowTex(THREE) {
  const w = 256, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const cols = ['#c0182a', '#1840c8', '#e8a818', '#1c9a48', '#8a28c0', '#e85818', '#18a0c0'];
  x.save(); gothicPath(x, w, h, 18); x.clip();
  for (let yy = 0; yy < h; yy += 22) for (let xx = 0; xx < w; xx += 22) { x.fillStyle = cols[Math.floor(rnd() * cols.length)]; x.fillRect(xx + (yy / 22 % 2) * 11, yy, 22, 22); }
  x.fillStyle = 'rgba(255,240,200,0.18)'; for (let k = 0; k < 400; k++) x.fillRect(rnd() * w, rnd() * h, 3, 3);
  const rg = x.createRadialGradient(w / 2, h * 0.3, 4, w / 2, h * 0.3, 70); rg.addColorStop(0, '#fff2b0'); rg.addColorStop(0.5, '#e8a818'); rg.addColorStop(1, '#c0182a');
  x.fillStyle = rg; x.beginPath(); x.arc(w / 2, h * 0.3, 62, 0, 7); x.fill();                         // rose window
  x.strokeStyle = '#141010'; x.lineWidth = 5; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.beginPath(); x.moveTo(w / 2, h * 0.3); x.lineTo(w / 2 + Math.cos(a) * 62, h * 0.3 + Math.sin(a) * 62); x.stroke(); }
  x.beginPath(); x.arc(w / 2, h * 0.3, 62, 0, 7); x.stroke(); x.beginPath(); x.arc(w / 2, h * 0.3, 22, 0, 7); x.stroke();
  x.lineWidth = 2.5; x.strokeStyle = 'rgba(15,12,12,0.9)';                                          // leading
  for (let yy = 0; yy < h; yy += 22) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); }
  for (let xx = 0; xx < w; xx += 22) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, h); x.stroke(); }
  x.lineWidth = 9; x.strokeStyle = '#1a1614';                                                        // iron tracery: mullion + lancets
  x.beginPath(); x.moveTo(w / 2, h * 0.3 + 62); x.lineTo(w / 2, h); x.stroke();
  x.beginPath(); x.moveTo(18, h * 0.62); x.lineTo(w - 18, h * 0.62); x.stroke();
  x.lineWidth = 6; x.beginPath(); x.arc(w / 2 - 50, h * 0.62 + 10, 50, Math.PI, 0); x.stroke(); x.beginPath(); x.arc(w / 2 + 50, h * 0.62 + 10, 50, Math.PI, 0); x.stroke();
  x.restore();
  x.lineWidth = 20; x.strokeStyle = '#6a625a'; gothicPath(x, w, h, 10); x.stroke();                  // carved stone surround
  x.lineWidth = 4; x.strokeStyle = '#2a2420'; gothicPath(x, w, h, 20); x.stroke(); x.strokeStyle = '#9a9088'; gothicPath(x, w, h, 2); x.lineWidth = 3; x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// one merged mesh (glass + frame in a single alpha-tested plane per window) + an additive glow halo -> 2 draw calls total
export function gothicWindows(THREE, mergeGeometries, HALF, H, walls = [0, 1, 2], share = null) {   // share: an earlier set whose materials to reuse
  const g = new THREE.Group(); g.name = 'gothicWindows'; g.visible = false;
  const ww = 2.1, wh = 4.0, y = 3.95 + wh / 2, xs = [-7.2, 0, 7.2], planes = [], halos = [];
  for (const i of walls) { const a = i * Math.PI / 2, s = Math.sin(a), c = Math.cos(a);
    for (const u of xs) { const p = new THREE.PlaneGeometry(ww, wh), q = new THREE.PlaneGeometry(ww * 1.9, wh * 1.35);
      const m = new THREE.Matrix4().makeRotationY(a).setPosition(-s * (HALF - 0.04) + c * u, y, -c * (HALF - 0.04) - s * u);
      planes.push(p.applyMatrix4(m)); const m2 = new THREE.Matrix4().makeRotationY(a).setPosition(-s * (HALF - 0.06) + c * u, y, -c * (HALF - 0.06) - s * u); halos.push(q.applyMatrix4(m2)); } }
  const sg = share && share.getObjectByName('gothicGlass'), sh = share && share.getObjectByName('gothicGlow');
  const glass = new THREE.Mesh(mergeGeometries(planes), sg ? sg.material : new THREE.MeshBasicMaterial({ map: windowTex(THREE), alphaTest: 0.5, transparent: false, color: 0xd8d0c8 }));
  glass.name = 'gothicGlass'; glass.renderOrder = 2;
  if (sh) { const halo = new THREE.Mesh(mergeGeometries(halos), sh.material); halo.name = 'gothicGlow'; g.add(halo, glass); return g; }
  const hc = document.createElement('canvas'); hc.width = hc.height = 128; const hx = hc.getContext('2d'), rg = hx.createRadialGradient(64, 64, 8, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,180,90,0.32)'); rg.addColorStop(0.5, 'rgba(200,80,160,0.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); hx.fillStyle = rg; hx.fillRect(0, 0, 128, 128);
  const halo = new THREE.Mesh(mergeGeometries(halos), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.name = 'gothicGlow'; g.add(halo, glass); return g;
}
