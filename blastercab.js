// BLASTER cabinet (RPG's mockup, /workspace/blaster/shots/cabinet_mockup.jpg): glossy black body (no neon on the body, only the
// standard wall edge glow), yellow pixel BLASTER marquee with 1984 under it, starfield side art with a green pixel ship and a magenta
// pixel alien, red ball joystick and a red FIRE button, coin door with two red slots. Screen: a cheap attract loop with INSERT CREDIT.
// All art is drawn on canvases here (no image files).
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos } from './strikecab.js';
const canvasTex = (w, h, paint, flip) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flip) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } return t; };
const SHIP = ['....#....', '...###...', '...#.#...', '..#####..', '.###.###.', '#########', '##.#.#.##'];
const ALIEN = ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'];
const FRT = ['......########......', '...##############...', '..##.##.##.##.##.##.', '####################', '##..############..##', '....##..####..##....', '......##....##......'];
const px = (g, rows, x, y, s, col) => { g.fillStyle = col; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') g.fillRect(x + i * s, y + j * s, s, s); }); };
function stars(g, w, h, n) { for (let i = 0; i < n; i++) { const b = Math.random(); g.fillStyle = b > 0.9 ? '#fff' : b > 0.6 ? '#9ab' : '#456'; const s = b > 0.95 ? 3 : 1.5; g.fillRect(Math.random() * w, Math.random() * h, s, s); } }
function sideArt(g, w, h) {   // u = x / 1.04 (front edge at the right), v = y / 2.08 (canvas top = cabinet top)
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#0b0820'); bg.addColorStop(0.5, '#120a2a'); bg.addColorStop(1, '#06040f'); g.fillStyle = bg; g.fillRect(0, 0, w, h); stars(g, w, h, 500);
  for (const [x0, y0, x1, y1, c] of [[w * 0.95, h * 0.12, w * 0.25, h * 0.55, '#ff5a1a'], [w * 1.0, h * 0.3, w * 0.35, h * 0.75, '#ff2a6a'], [w * 0.8, h * 0.05, w * 0.1, h * 0.45, '#ffb02a']]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.strokeStyle = gr; g.lineWidth = 10; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  g.save(); g.translate(w * 0.5, h * 0.36); g.rotate(-0.5); g.shadowColor = '#3f3'; g.shadowBlur = 18; px(g, SHIP, -9 * 13, -7 * 13 / 2, 26, '#2fd23a'); g.restore();
  g.save(); g.shadowColor = '#f3f'; g.shadowBlur = 18; px(g, ALIEN, w * 0.5 - 11 * 11, h * 0.62, 22, '#e528d8'); g.restore();
}
function marqueeArt(g, w, h) {
  g.fillStyle = '#05030c'; g.fillRect(0, 0, w, h); stars(g, w, h, 120);
  for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff2a6a', '#2ae5ff', '#ff5a1a'][i % 3]; g.fillRect(i < 3 ? 14 : w - 150, 30 + (i % 3) * 22, 136, 3); }
  const F = { B: ['1110', '1001', '1110', '1001', '1110'], L: ['1000', '1000', '1000', '1000', '1111'], A: ['0110', '1001', '1111', '1001', '1001'], S: ['0111', '1000', '0110', '0001', '1110'], T: ['1111', '0110', '0110', '0110', '0110'], E: ['1111', '1000', '1110', '1000', '1111'], R: ['1110', '1001', '1110', '1010', '1001'] };
  const word = 'BLASTER', s = 13, cw = 5 * s, x0 = (w - word.length * cw + s) / 2, y0 = 18;
  g.save(); g.shadowColor = '#ffb000'; g.shadowBlur = 16;
  [...word].forEach((ch, k) => F[ch].forEach((r, j) => { for (let i = 0; i < 4; i++) if (r[i] === '1') { g.fillStyle = j < 2 ? '#fff26a' : '#ffc21a'; g.fillRect(x0 + k * cw + i * s + (4 - j) * 2, y0 + j * s, s - 1, s - 1); } }));
  g.restore(); g.font = 'bold 30px "Courier New", monospace'; g.textAlign = 'center'; g.fillStyle = '#bfe9ff'; g.shadowColor = '#2ae5ff'; g.shadowBlur = 8; g.fillText('1984', w / 2, h - 14);
}
function attract(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const st = Array.from({ length: 50 }, () => [Math.random() * W, Math.random() * H]);
  function draw(t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#556'; for (const [x, y] of st) g.fillRect(x, y, 1.5, 1.5);
    g.font = 'bold 13px "Courier New", monospace'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('SCORE ' + (Math.floor(t / 7) * 100 % 2000), 8, 16); g.fillStyle = '#ff5'; g.fillText('HI 1900', W * 0.42, 16); g.fillStyle = '#5f5'; g.fillText('SHIPS 3', W - 70, 16);
    const fx = ((t * 60) % (W + 80)) - 40; px(g, FRT, fx, 34 + 10 * Math.floor(t / 8 % 4), 2, '#f5f');
    const sx = W / 2 + Math.sin(t * 1.4) * W * 0.35; px(g, SHIP, sx, H - 36, 2, '#5f5');
    for (let i = 0; i < 3; i++) { g.fillStyle = '#ff5'; g.fillRect((fx + 20 + i * 70) % W, (t * 50 + i * 60) % (H - 40) + 40, 3, 5); }
    g.fillStyle = '#fff'; g.fillRect(sx + 8, H - 40 - (t * 180 % (H - 60)), 1.5, 6);
    g.fillStyle = '#5f5'; g.fillRect(0, H - 18, W, 1.5); g.fillStyle = '#5ff'; g.fillText('LEVEL 1', 8, H - 5);
    if (Math.floor(t * 2) % 2 === 0) { g.textAlign = 'center'; g.font = 'bold 22px "Courier New", monospace'; g.fillStyle = '#000a'; g.fillRect(W / 2 - 110, H / 2 - 22, 220, 34); g.fillStyle = '#ffe14a'; g.fillText('INSERT CREDIT', W / 2, H / 2 + 2); }
    tex.needsUpdate = true;
  }
  draw(0); return { tex, draw };
}
export function buildBlasterCabinet() {
  const g = new THREE.Group(); g.name = 'blasterCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x060608, roughness: 0.18, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), gloss, 'body');
  const sideMat = flip => { const t = canvasTex(512, 1024, sideArt, flip); return new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28, roughness: 0.25, clearcoat: 0.8 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  const tm = []; for (const z of [-SW / 2 - 0.008, SW / 2 + 0.008]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.03)); }
  add(mergeGeos(tm), gloss, 'trim');   // glossy black edge (no neon on the body)
  const mq = canvasTex(512, 160, marqueeArt);
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.6, roughness: 0.3 }), 'marquee');
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x08060c, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]), sh = sf.L * 0.84, sw = Math.min(SW - 0.14, sh * 4 / 3);
  const at = attract(Math.round(240 * sw / sh), 240);
  add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0),
    new THREE.MeshStandardMaterial({ map: at.tex, emissive: 0xffffff, emissiveMap: at.tex, emissiveIntensity: 0.85, roughness: 0.15 }), 'screen');
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  const pt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#0c0a24'; c.fillRect(0, 0, w, h); stars(c, w, h, 160); c.strokeStyle = '#ff3a3a'; c.lineWidth = 3; c.strokeRect(8, 8, w - 16, h - 16);
    c.save(); c.translate(w / 2, h * 0.72); c.rotate(Math.PI / 2); c.font = 'bold 34px "Courier New", monospace'; c.fillStyle = '#ff4a3a'; c.textAlign = 'center'; c.fillText('FIRE', 0, -44); c.restore(); });
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.4 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  { const s = new THREE.Group(); s.name = 'joystick'; s.position.set(0, 0, 0.2); cp.add(s);
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })));
    s.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
    s.add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 18, 12).translate(0, 0.095, 0), new THREE.MeshPhysicalMaterial({ color: 0xd8101a, roughness: 0.12, clearcoat: 1 }))); }
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.022, 20).translate(0, 0.011, 0), new THREE.MeshPhysicalMaterial({ color: 0xe01818, emissive: 0xe01818, emissiveIntensity: 0.15, roughness: 0.15, clearcoat: 1 }));
    b.position.set(0, 0, -0.1); b.name = 'btnFire'; cp.add(b);
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.016, 16).translate(0, 0.008, 0), new THREE.MeshPhysicalMaterial({ color: 0x101012, roughness: 0.2, clearcoat: 1 })); k.position.set(0, 0, -0.24); k.name = 'btnStart'; cp.add(k); }
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.34, 0.28), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.7, roughness: 0.35 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x400808, emissive: 0xff2a1a, emissiveIntensity: 1.3 });
  for (const z of [-0.05, 0.05]) door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.06, 0.04).translate(0.006, 0.08, z), slot));
  const glow = new THREE.PointLight(0x80a0ff, 0.5, 2.4, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen: g.getObjectByName('screen'), glow, tick: at.draw, aspect: sw / sh };
  return g;
}
