// GHOST 256 cabinet: model (no neon, plain plum trim) + live attract-mode screen from a sandboxed copy of Ghost 256.
import * as THREE from 'three';
import { SPROFILE, SW, segFrame, segPlane, bar, sideGeo, mergeGeos, CRT } from './strikecab.js';

const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
function tex(w, h, draw, nearest) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (nearest) t.magFilter = THREE.NearestFilter; return t;
}
const GHOST = ['....####....', '..########..', '.##########.', '###WW###WW##', '##WWPP##WWPP', '##WWPP##WWPP', '###WW###WW##', '############', '############', '############', '##.###..###.##'.slice(1, 13), '#...##..##...#'.slice(1, 13)];
function ghost(g, x, y, px, col) {
  GHOST.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; g.fillStyle = ch === 'W' ? '#ffffff' : ch === 'P' ? '#2030c0' : col; g.fillRect(x + i * px, y + j * px, px, px); } });
}
function glitch(g, w, h, y0, n) {
  for (let i = 0; i < n; i++) { const y = y0 + Math.random() * (h - y0), L = 20 + Math.random() * w * 0.6, x = Math.random() * w - 20; const r = Math.random();
    g.fillStyle = r < 0.6 ? `rgba(255,40,200,${0.4 + Math.random() * 0.5})` : r < 0.8 ? 'rgba(40,220,255,.6)' : 'rgba(110,60,255,.6)'; g.fillRect(x, y, L, 2 + Math.random() * 7); }
}
function pixelText(g, text, x, y, size, col, ox) { // crisp blocky text via a tiny canvas scaled up with nearest-neighbour
  const c = document.createElement('canvas'), cx = c.getContext('2d'); cx.font = 'bold 10px monospace'; const w = Math.ceil(cx.measureText(text).width) + 2;
  c.width = w; c.height = 12; cx.font = 'bold 10px monospace'; cx.textBaseline = 'top';
  const draw = (fill, dx) => { cx.clearRect(0, 0, w, 12); cx.fillStyle = fill; cx.fillText(text, 1, 1); g.drawImage(c, x - w * size / 2 + dx, y, w * size, 12 * size); };
  if (ox) { draw('#ff2040', -ox); draw('#20e0ff', ox); } draw(col, 0);
}
export function ghostSideTexture(flip) {
  return tex(512, 1024, (g, w, h) => {
    g.fillStyle = '#0b0910'; g.fillRect(0, 0, w, h);
    g.save(); if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    glitch(g, w, h, h * 0.52, 160);
    ghost(g, w * 0.22, h * 0.14, 11, '#ffc81e'); ghost(g, w * 0.3, h * 0.33, 11, '#22d8e8'); ghost(g, w * 0.4, h * 0.53, 11, '#ff6a1a');
    g.restore();
  }, true);
}
export function ghostMarqueeTexture() {
  return tex(512, 160, (g, w, h) => {
    g.fillStyle = '#0d0a14'; g.fillRect(0, 0, w, h); glitch(g, w, h, 0, 40);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, w, h);
    pixelText(g, 'GHOST', w / 2, 8, 6, '#ffd21f', 3); pixelText(g, '256', w / 2, 82, 6, '#ffffff', 3);
  });
}
const BTN = [[-0.02, 0xff3fae], [-0.11, 0x22d8e8], [-0.2, 0xff7a1a], [-0.29, 0xf0f0f0]];
export function buildGhostCabinet() {
  const g = new THREE.Group(); g.name = 'ghostCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), new THREE.MeshPhysicalMaterial({ color: 0x060509, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }), 'body');
  const sideMat = flip => { const t = ghostSideTexture(flip); return new THREE.MeshPhysicalMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3, roughness: 0.3, clearcoat: 0.8 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL'); add(sideGeo(-1), sideMat(true), 'sidePanelR');
  // plain, non-glowing plum trim (no neon)
  const tm = []; for (const z of [-SW / 2 - 0.006, SW / 2 + 0.006]) for (let i = 1; i < SPROFILE.length - 1; i++) { const a = SPROFILE[i], b = SPROFILE[i + 1]; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.02)); }
  add(mergeGeos(tm), new THREE.MeshStandardMaterial({ color: 0x3a1236, roughness: 0.35, metalness: 0.2 }), 'trim');
  const mq = ghostMarqueeTexture();
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.55, roughness: 0.2 }), 'marquee');
  const sf = segFrame(SPROFILE[5], SPROFILE[6]);
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x0b0a10, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sh = sf.L * 0.92, sw = Math.min(SW - 0.14, sh * 152 / 276);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(sw + 0.05, sh + 0.05).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.006, sf.mid[1] + sf.n.y * 0.006, 0), new THREE.MeshStandardMaterial({ color: 0x1c1a22, roughness: 0.4, metalness: 0.6 }));
  frame.name = 'bezelFrame'; g.add(frame);
  const crt = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(CRT.uniforms), vertexShader: CRT.vertexShader, fragmentShader: CRT.fragmentShader.replace('960.0', '276.0'), toneMapped: false });
  const screen = add(new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0), crt, 'screen');
  // control panel
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  const pt = tex(512, 160, (c, w, h) => { c.fillStyle = '#0c0a12'; c.fillRect(0, 0, w, h); glitch(c, w, h, h * 0.6, 14); c.strokeStyle = '#3a1236'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12); });
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.4 }), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  const stick = new THREE.Group(); stick.name = 'joystick'; stick.position.set(0, 0, 0.26); cp.add(stick);
  stick.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 20).translate(0, 0.006, 0), new THREE.MeshStandardMaterial({ color: 0x111116 })));
  stick.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.05, 0), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.8, roughness: 0.3 })));
  stick.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14).translate(0, 0.1, 0), new THREE.MeshPhysicalMaterial({ color: 0xe0101a, roughness: 0.15, clearcoat: 1 })));
  BTN.forEach(([z, c], i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.02, 20).translate(0, 0.01, 0), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.2, roughness: 0.2, clearcoat: 1 })); b.position.set(0.02, 0, z); b.name = 'btn' + i; cp.add(b); });
  // coin door with two orange slots
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x15141a, metalness: 0.7, roughness: 0.35 })));
  const slot = new THREE.MeshStandardMaterial({ color: 0x401800, emissive: 0xff7a10, emissiveIntensity: 1.5 });
  for (const z of [-0.055, 0.055]) { door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.012).translate(0.006, 0.06, z), slot)); door.add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.045, 0.05).translate(0.004, -0.07, z), new THREE.MeshStandardMaterial({ color: 0x050506 }))); }
  const glow = new THREE.PointLight(0xa0a8ff, 1.2, 3.0, 1.6); glow.name = 'screenGlow'; glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen, crt, glow };
  return g;
}
export function startGhostDemo(cab) {
  const f = document.createElement('iframe'); f.src = 'ghost-demo/index.html'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.title = 'ghost demo';
  f.style.cssText = 'position:fixed;left:-700px;top:0;width:304px;height:600px;border:0;pointer-events:none;visibility:hidden';
  document.body.appendChild(f);
  const d = { ready: false, frames: 0, running: false, err: null, iframe: f };
  const blank = document.createElement('canvas'); blank.width = 4; blank.height = 4; cab.userData.crt.uniforms.map.value = new THREE.CanvasTexture(blank);
  f.addEventListener('load', () => {
    try { const w = f.contentWindow, gh = w.__ghost; if (!gh || !w.__bot) throw new Error('ghost hooks missing');
      const t = new THREE.CanvasTexture(w.document.getElementById('c')); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false;
      cab.userData.crt.uniforms.map.value = t; Object.assign(d, { w, gh, texture: t, seed: 1 }); gh.Snd.muted = true; gh.G.muted = true;
      gh.startGame(d.seed); d.ready = true;
    } catch (e) { d.err = String(e); console.warn('ghost demo', e); }
  });
  return d;
}
export function tickGhostDemo(d, dt, visible) {
  if (!d.ready || !visible) { d.running = false; return; }
  d.running = true; d.acc = (d.acc || 0) + dt; if (d.acc < 1 / 30) return; d.acc = Math.min(d.acc - 1 / 30, 1 / 30);
  try { const G = d.gh.G;
    if (G.state === 'over' || G.state === 'title') { if (++d.idle > 45) { d.idle = 0; d.gh.startGame(++d.seed); } } else d.idle = 0;
    for (let i = 0; i < 2; i++) { d.w.__bot(); d.gh.step(1); }
    d.gh.render(); d.texture.needsUpdate = true; d.frames++;
  } catch (e) { d.err = String(e); d.ready = false; console.warn('ghost demo', e); }
}
