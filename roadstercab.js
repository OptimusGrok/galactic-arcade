// MARS ROADSTER two-seat driving cabinet (Dave's reference mars_roadster_cabinet_dave.jpg): black body, chrome edge trim, tall hood with the
// MARS ROADSTER marquee, two 16:9 screens, two dashboards with steering wheel + shifter, two black bucket seats with white inserts on red
// MARS seat pods, flying-roadster side art. No neon on the body (the room's wall tube outlines it like every cabinet).
// Local frame: x across (-W/2..W/2), y up, z from the wall end (0) out to the seats (DEP). Rotated PI so local +z points into the room.
import * as THREE from 'three';
export const MR = { W: 5.0, DEP: 4.0, HT: 3.1 };
const L = new THREE.TextureLoader();
const load = (u, flip) => { const t = L.load(u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
function marqueeTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 140; const g = c.getContext('2d'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const bg = new Image(); const draw = () => {
    const gr = g.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, '#d0603a'); gr.addColorStop(1, '#6a2412'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 140);
    if (bg.complete && bg.naturalWidth) g.drawImage(bg, 0, 40, 1024, 220, 0, 0, 1024, 140);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 1024, 140);
    g.save(); g.translate(512, 78); g.transform(1, 0, -0.18, 1, 0, 0); g.font = '900 78px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = '#2a0a04'; g.strokeText('MARS ROADSTER', 0, 0);
    const tg = g.createLinearGradient(0, -36, 0, 36); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#ffe2c8'); tg.addColorStop(0.52, '#ff8a3a'); tg.addColorStop(1, '#c43a12'); g.fillStyle = tg; g.fillText('MARS ROADSTER', 0, 0);
    g.restore(); g.fillStyle = '#e8eef4'; g.beginPath(); g.moveTo(300, 120); g.lineTo(724, 120); g.lineTo(512, 134); g.closePath(); g.fill(); t.needsUpdate = true; };
  bg.onload = draw; bg.src = 'tex/mr_marquee_bg.jpg'; draw(); return t;
}
function podTex() { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#9a1a14'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#d8dde2'; g.fillRect(0, 0, 256, 5); g.fillRect(0, 59, 256, 5);
  g.fillStyle = '#111'; g.fillRect(10, 14, 92, 36); g.fillStyle = '#fff'; g.font = '900 26px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MARS', 56, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function attract(W, H, seed) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  function draw(t) { t += seed;
    const sk = g.createLinearGradient(0, 0, 0, H * 0.5); sk.addColorStop(0, '#5a3a4a'); sk.addColorStop(1, '#e0a070'); g.fillStyle = sk; g.fillRect(0, 0, W, H * 0.5);
    g.fillStyle = '#9a5038'; g.beginPath(); g.moveTo(0, H * 0.5); for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.5 - 10 - 14 * Math.abs(Math.sin(x * 0.013 + 1)) - (x > W * 0.6 && x < W * 0.8 ? 26 : 0)); g.lineTo(W, H * 0.5); g.fill();
    const gd = g.createLinearGradient(0, H * 0.5, 0, H); gd.addColorStop(0, '#b05a36'); gd.addColorStop(1, '#6a2a16'); g.fillStyle = gd; g.fillRect(0, H * 0.5, W, H * 0.5);
    const cx = W / 2 + Math.sin(t * 0.7) * W * 0.06; g.fillStyle = '#7a3a24'; g.beginPath(); g.moveTo(cx - 6, H * 0.5); g.lineTo(cx + 6, H * 0.5); g.lineTo(W * 0.5 + W * 0.42, H); g.lineTo(W * 0.5 - W * 0.42, H); g.fill();
    g.fillStyle = '#f0d0a0'; for (let i = 0; i < 8; i++) { const k = ((i / 8 + t * 0.9) % 1), y = H * 0.5 + k * k * H * 0.5, w = 2 + k * 10; g.fillRect(cx + (W / 2 - cx) * k - w / 2, y, w, 3 + k * 10); }
    const jy = H * 0.72 - Math.max(0, Math.sin(t * 1.1)) * H * 0.18, jx = W / 2 + Math.sin(t * 0.7 + 0.5) * W * 0.05;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(jx, H * 0.86, 46, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#f4f4f2'; g.beginPath(); g.moveTo(jx - 44, jy + 14); g.lineTo(jx - 40, jy - 4); g.lineTo(jx - 22, jy - 16); g.lineTo(jx + 22, jy - 16); g.lineTo(jx + 40, jy - 4); g.lineTo(jx + 44, jy + 14); g.fill();
    g.fillStyle = '#20242a'; g.fillRect(jx - 20, jy - 13, 40, 9); g.fillStyle = '#e03020'; g.fillRect(jx - 40, jy + 2, 14, 4); g.fillRect(jx + 26, jy + 2, 14, 4); g.fillStyle = '#111'; g.fillRect(jx - 44, jy + 12, 16, 10); g.fillRect(jx + 28, jy + 12, 16, 10);
    if (jy < H * 0.7) { g.fillStyle = 'rgba(160,220,255,.8)'; g.fillRect(jx - 30, jy + 16, 6, 18 + Math.random() * 8); g.fillRect(jx + 24, jy + 16, 6, 18 + Math.random() * 8); }
    g.fillStyle = '#0008'; g.fillRect(0, 0, W, 20); g.font = 'bold 13px Arial'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText((((t * 61) % 300) | 0) + ' KM/H', 8, 15); g.textAlign = 'right'; g.fillStyle = '#ffd24a'; g.fillText('BEST 137.06', W - 8, 15);
    g.textAlign = 'center'; g.font = 'italic 900 26px Arial'; g.fillStyle = '#300'; g.fillText('MARS ROADSTER', W / 2 + 2, H * 0.24 + 2); g.fillStyle = '#fff'; g.fillText('MARS ROADSTER', W / 2, H * 0.24);
    if (Math.floor(t * 2) % 2 === 0) { g.font = 'bold 17px Arial'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 90, H - 34, 180, 26); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H - 15); }
    tex.needsUpdate = true; }
  draw(0); return { tex, draw };
}
export function buildRoadsterCabinet() {
  const { W, DEP, HT } = MR, g = new THREE.Group(); g.name = 'roadsterCabinet';
  const add = (geo, mat, name, p = g) => { const m = new THREE.Mesh(geo, mat); if (name) m.name = name; p.add(m); return m; };
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const black = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.45, metalness: 0.5 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, roughness: 0.25, metalness: 0.3, clearcoat: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.22, metalness: 1 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.55, metalness: 0.1 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d6d2, roughness: 0.7 });
  // floor deck + wall-end hood (back box, lower console, marquee bridge)
  add(box(W, 0.16, DEP, 0, 0.08, DEP / 2), black, 'body');
  add(box(W - 0.12, 2.75, 0.7, 0, 0.16 + 1.375, 0.35), new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.8, metalness: 0.1 }), 'hood');   // matte: no hot spot from the screen glow
  add(box(W - 0.12, 0.95, 0.85, 0, 0.16 + 0.475, 0.7 + 0.425), black, 'console');
  add(box(W - 0.12, 0.62, 1.05, 0, HT - 0.31, 0.525), gloss, 'marqueeBox');
  const mq = marqueeTex(); add(new THREE.PlaneGeometry(W - 0.2, 0.56).translate(0, HT - 0.31, 1.052), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.55, roughness: 0.5 }), 'marquee');
  add(box(0.08, 0.6, 1.06, 0, 2.86 - 0.31 + 0.24, 0.53).scale(1, 1, 1), chrome, null).visible = false;
  // two screens (16:9) in a recessed bezel, a chrome divider between them
  const SW = 1.62, SH = SW * 9 / 16, SY = 1.78, screens = [], ticks = [];
  for (const sx of [-1, 1]) { const x = sx * 1.22;
    add(box(SW + 0.12, SH + 0.12, 0.04, x, SY, 0.72), new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.3 }), null);
    const at = attract(Math.round(240 * 16 / 9), 240, sx > 0 ? 3.7 : 0);
    const s = add(new THREE.PlaneGeometry(SW, SH), new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), sx < 0 ? 'screenL' : 'screenR');
    s.position.set(x, SY, 0.745); screens.push(s); ticks.push(at.draw); }
  add(box(0.06, SH + 0.2, 0.06, 0, SY, 0.75), black, 'divider');
  // per seat: dashboard, steering column + wheel, shifter, pedals, seat pod and bucket seat
  const seats = {}, podT = podTex();
  for (const sx of [-1, 1]) { const x = sx * 1.22, side = sx < 0 ? 'L' : 'R';
    const dash = add(box(1.5, 0.22, 0.55, x, 1.16, 1.4), gloss, 'dash' + side); dash.rotation.x = 0; 
    add(box(1.5, 0.05, 0.05, x, 1.28, 1.66), chrome, null);
    for (const gx of [-0.25, 0.25]) add(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 20).rotateX(Math.PI / 2 - 0.5).translate(x + gx, 1.24, 1.5), new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0x3a7aff, emissiveIntensity: 0.6 }), null);
    const wheel = new THREE.Group(); wheel.name = 'wheel' + side; wheel.position.set(x, 1.22, 1.82); wheel.rotation.x = -0.45; g.add(wheel);
    add(new THREE.TorusGeometry(0.18, 0.025, 10, 32), leather, null, wheel);
    add(new THREE.BoxGeometry(0.32, 0.035, 0.03), chrome, null, wheel); add(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16).rotateX(Math.PI / 2), black, null, wheel);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 10).rotateX(Math.PI / 2 - 0.45).translate(x, 1.17, 1.65), black, null);
    const sh = x + sx * -0.48; add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8).translate(sh, 1.0, 1.9), chrome, null); add(new THREE.SphereGeometry(0.035, 12, 8).translate(sh, 1.12, 1.9), black, 'shifter' + side);
    add(box(0.22, 0.06, 0.4, sh, 0.9, 1.9), gloss, null);
    for (const px of [-0.12, 0.1]) add(box(0.1, 0.03, 0.18, x + px, 0.3, 1.62).rotateX(0), chrome, null);
    // seat pod (red MARS sides, chrome lip) + bucket seat
    add(box(1.25, 0.34, 1.7, x, 0.16 + 0.17, 3.05), black, 'pod' + side);
    const pm = new THREE.MeshStandardMaterial({ map: podT, roughness: 0.5 });
    add(new THREE.PlaneGeometry(1.25, 0.32).translate(x, 0.33, 3.902), pm, null);
    for (const ex of [-1, 1]) add(new THREE.PlaneGeometry(1.7, 0.32).rotateY(ex * Math.PI / 2).translate(x + ex * 0.627, 0.33, 3.05), pm, null);
    add(box(1.27, 0.03, 1.72, x, 0.515, 3.05), chrome, null);
    const seat = new THREE.Group(); seat.name = 'seat' + side; seat.position.set(x, 0.53, 3.0); g.add(seat);
    add(box(0.62, 0.16, 0.6, 0, 0.12, 0), leather, null, seat);
    for (const bx of [-1, 1]) add(box(0.09, 0.22, 0.6, bx * 0.3, 0.2, 0), leather, null, seat);   // bolsters
    const back = new THREE.Group(); back.position.set(0, 0.2, 0.32); back.rotation.x = -0.22; seat.add(back);
    add(box(0.64, 1.05, 0.16, 0, 0.52, 0), leather, null, back);
    for (const ix of [-0.09, 0.09]) add(box(0.07, 0.78, 0.02, ix, 0.5, -0.085), white, null, back);   // twin white racing stripes on the front of the backrest (like the reference)
    for (const bx of [-1, 1]) add(box(0.1, 0.8, 0.2, bx * 0.3, 0.45, -0.02), leather, null, back);
    add(box(0.4, 0.2, 0.14, 0, 1.0, 0.01), leather, null, back);
    seats[side] = { x, local: new THREE.Vector3(x, 0.53, 3.0) };
  }
  // side panels: tall at the wall end, sloping down to the seats; flying-roadster art outside, chrome edge along the profile
  const PR = [[0, 0.16], [DEP, 0.16], [DEP, 0.55], [2.0, 0.62], [1.55, 1.3], [1.25, 2.75], [0.95, HT], [0, HT]];
  const shape = new THREE.Shape(PR.map(([z, y]) => new THREE.Vector2(z, y)));
  for (const sx of [-1, 1]) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(sx * W / 2 + (sx > 0 ? 0.06 : 0), 0, 0);
    add(geo, gloss, 'sidePanel' + (sx < 0 ? 'L' : 'R'));
    const art = new THREE.ShapeGeometry(shape); const uv = art.attributes.uv, P = art.attributes.position;
    for (let i = 0; i < P.count; i++) uv.setXY(i, 1 - P.getX(i) / DEP, (P.getY(i) - 0.16) / (HT - 0.16));
    art.rotateY(sx < 0 ? -Math.PI / 2 : Math.PI / 2); if (sx > 0) art.scale(1, 1, -1);
    art.translate(sx * (W / 2 + 0.065), 0, 0);
    const t = load('tex/mr_side.jpg', sx > 0);
    add(art, new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3, roughness: 0.6, side: THREE.DoubleSide }), 'sideArt' + (sx < 0 ? 'L' : 'R'));
    const bars = []; for (let i = 1; i < PR.length; i++) { const a = new THREE.Vector3(sx * (W / 2 + 0.07), PR[i - 1][1], PR[i - 1][0]), b = new THREE.Vector3(sx * (W / 2 + 0.07), PR[i][1], PR[i][0]);
      const d = b.clone().sub(a), Lh = d.length(); const bg = new THREE.CylinderGeometry(0.025, 0.025, Lh, 8); bg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); bg.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); bars.push(bg); }
    for (const bg of bars) add(bg, chrome, 'trim');
  }
  const glow = new THREE.PointLight(0xff9a60, 0.7, 4, 1.6); glow.name = 'screenGlow'; glow.position.set(0, 1.7, 1.6); g.add(glow);
  g.userData = { screens, seats, glow, tick: t => ticks.forEach(f => f(t)), aspect: 16 / 9, screenH: SH, screen: screens[0] };
  return g;
}
