// CYBERCITY cabinet (Dave's design, tex/cybercity_cabinet_mockup.jpg): dark purple body with PRINTED circuit art (no neon on the body),
// glowing magenta/cyan CYBERCITY marquee, side art of Nyx before the Vesper City skyline, black ball-top joystick,
// magenta + cyan buttons, coin door with an amber INSERT CREDIT plate and two amber slots. Screen: a Cybercity street/battle attract loop.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const L = new THREE.TextureLoader();
const load = (url, flip) => { const t = L.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
function circuitTex() {   // flat printed ink on dark purple laminate: lit by the room, never emissive
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1c0f30'; g.fillRect(0, 0, 256, 512);
  let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) { let x = r() * 256, y = r() * 512; g.strokeStyle = ['#7a3a9a', '#3e6aa0', '#5a3a96'][i % 3]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { if (j & 1) y += (r() < 0.5 ? -1 : 1) * (20 + r() * 90); else x += (r() < 0.5 ? -1 : 1) * (14 + r() * 70); g.lineTo(x, y); } g.stroke();
    g.beginPath(); g.arc(x, y, 3, 0, 7); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function attract(W, H) {   // street walk -> battle flash loop in Cybercity's palette
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const visit = { on: false };
  const T = 20;
  function draw(t) {
    const ph = t % 12, battle = ph > 7;
    g.fillStyle = '#0a0618'; g.fillRect(0, 0, W, H);
    if (!battle) {
      const off = (t * 18) % T;
      for (let y = 50; y < H; y += T) for (let x = -T; x < W + T; x += T) { g.fillStyle = ((x + y) / T) & 1 ? '#1a1430' : '#151028'; g.fillRect(x - off, y, T - 1, T - 1); }
      for (let i = 0; i < 9; i++) { const bx = ((i * 57 - t * 18) % (W + 60) + W + 60) % (W + 60) - 30, bh = 30 + (i * 37) % 40; g.fillStyle = '#21123c'; g.fillRect(bx, 50, 40, bh);
        g.fillStyle = i & 1 ? '#ff3fd0' : '#3ff0ff'; g.fillRect(bx + 4, 50 + bh - 4, 32, 2); }
      const px = W * 0.42, py = H * 0.62 + Math.abs(Math.sin(t * 8)) * -2;   // Nyx
      g.fillStyle = '#ff4fc8'; g.fillRect(px - 5, py - 18, 10, 7); g.fillStyle = '#2a1640'; g.fillRect(px - 5, py - 11, 10, 11);
      g.fillStyle = '#111'; g.fillRect(px - 4, py, 3, 6 + (Math.sin(t * 10) > 0 ? 2 : 0)); g.fillRect(px + 1, py, 3, 6 + (Math.sin(t * 10) > 0 ? 0 : 2));
    } else {
      g.fillStyle = '#140a28'; g.fillRect(0, 46, W, H - 46);
      for (let i = 0; i < 3; i++) { const ex = W * 0.2 + i * W * 0.12, ey = H * 0.42 + (i % 2) * 22; g.fillStyle = ['#7af0ff', '#ff6a3d', '#9b59ff'][i]; g.fillRect(ex - 8, ey - 8, 16, 16);
        g.fillStyle = '#300'; g.fillRect(ex - 10, ey - 16, 20, 3); g.fillStyle = '#4f4'; g.fillRect(ex - 10, ey - 16, 20 * (1 - ((ph - 7) / 5) * (i + 1) / 3), 3); }
      g.fillStyle = '#ff4fc8'; g.fillRect(W * 0.72, H * 0.45, 12, 18);
      if (Math.floor(t * 6) % 3 === 0) { g.fillStyle = '#fff8'; g.fillRect(W * 0.2 - 12, H * 0.42 - 12, 24, 24); }
      g.fillStyle = '#0d0a22'; g.fillRect(6, H - 62, W - 12, 54); g.strokeStyle = '#7af0ff'; g.strokeRect(6.5, H - 61.5, W - 13, 53); g.beginPath(); g.moveTo(W / 2, H - 58); g.lineTo(W / 2, H - 12); g.stroke();
      g.font = 'bold 13px "Courier New", monospace'; g.fillStyle = '#fff'; g.textAlign = 'left'; ['Fight', 'Hack', 'Auto'].forEach((s, i) => g.fillText((i === 0 ? '\u25B6 ' : '  ') + s, 14, H - 44 + i * 15));
      g.fillText('Nyx  52/52', W / 2 + 10, H - 44);
    }
    g.fillStyle = '#000a'; g.fillRect(0, 0, W, 46); g.textAlign = 'center'; g.font = '900 30px "Courier New", monospace';
    g.fillStyle = '#ff3fd0'; g.fillText('CYBER', W / 2 - 50, 34); g.fillStyle = '#3ff0ff'; g.fillText('CITY', W / 2 + 62, 34);
    if (!visit.on && Math.floor(t * 2) % 2 === 0) { g.font = 'bold 20px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 104, H / 2 - 18, 208, 32); g.fillStyle = '#ffb02a'; g.fillText('INSERT CREDIT', W / 2, H / 2 + 5); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw, visit };
}
export function buildCyberCabinet() {
  const g = new THREE.Group(); g.name = 'cyberCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const circ = circuitTex(), bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: circ, roughness: 0.55, metalness: 0.15 });   // printed art, no emissive
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), bodyMat, 'body');
  const sideMat = flip => new THREE.MeshStandardMaterial({ map: load('tex/cc_side.jpg', flip), roughness: 0.5, metalness: 0.05 });   // printed side art (lit, not glowing)
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.03)); }
  add(mergeGeos(tm), new THREE.MeshStandardMaterial({ color: 0x120a1e, roughness: 0.35, metalness: 0.6 }), 'trim');   // dark satin edge trim, no neon
  const mq = load('tex/cc_marquee.jpg');
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.6, roughness: 0.5 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x08060e, roughness: 0.4, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.84, sw = Math.min(SW - 0.14, sh * 4 / 3);
  const at = attract(Math.round(240 * sw / sh), 240);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ color: 0x1a0e2c, map: circ, roughness: 0.6 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.22); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0x141018, roughness: 0.15, clearcoat: 1 }))); }
  [[0.06, 0.03, 0xff3fd0], [0.0, 0.03, 0xff3fd0], [-0.06, 0.03, 0xff3fd0], [0.06, -0.03, 0x3ff0ff], [0.0, -0.03, 0x3ff0ff], [-0.06, -0.03, 0x3ff0ff]].forEach(([z, x, c], i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.02, 18).translate(0, 0.01, 0), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.2, clearcoat: 1 })); b.position.set(x, 0, z - 0.08); b.name = 'btn' + i; cp.add(b); });
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.34, 0.28), new THREE.MeshStandardMaterial({ color: 0x0e0c12, metalness: 0.7, roughness: 0.45 })));
  { const c = document.createElement('canvas'); c.width = 256; c.height = 48; const x = c.getContext('2d'); x.fillStyle = '#1a0e04'; x.fillRect(0, 0, 256, 48); x.font = 'bold 30px "Courier New", monospace'; x.textAlign = 'center'; x.fillStyle = '#ffb02a'; x.fillText('INSERT CREDIT', 128, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    door.add(new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.045).rotateY(Math.PI / 2).translate(0.009, 0.14, 0), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7 }))); }
  const slot = new THREE.MeshStandardMaterial({ color: 0x402008, emissive: 0xff8a1a, emissiveIntensity: 1.2 });
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.06, 0.04).translate(0.006, 0.06, z), slot));
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.04).translate(0.006, -0.07, z), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.6 })));
  const glow = new THREE.PointLight(0xd070ff, 0.5, 2.4, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, visit: at.visit, aspect: sw / sh };
  return g;
}
