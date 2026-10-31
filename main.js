// Neon Arcade — walkable 3D arcade room with a playable monkey.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildStrikeCabinet, startStrikeDemo, tickStrikeDemo } from './strikecab.js';
import { buildGhostCabinet, startGhostDemo, tickGhostDemo } from './ghostcab.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const Q = MOBILE ? { dpr: 1.5, refl: 0.35, bloom: 0.5 } : { dpr: 2, refl: 0.6, bloom: 0.5 };

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance' });
let dpr = Math.min(devicePixelRatio || 1, Q.dpr);
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.prepend(renderer.domElement);
renderer.domElement.tabIndex = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05030a);
scene.fog = new THREE.FogExp2(0x0b0518, 0.028);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 120);

const HALF = 12, H = 8.5;                   // room is 24 x 24 x 8.5
const neon = (hex, k = 3) => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: false }); return m; };
const C = { pink: 0xff2bd6, mag: 0xff1fa8, cyan: 0x22d8ff, purple: 0x9b4dff, amber: 0xffa53a };

// ---------- procedural textures ----------
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}
const hexTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const r = 32, dx = r * Math.sqrt(3), dy = r * 1.5;
  g.lineWidth = 2;
  for (let row = -1; row < h / dy + 1; row++) for (let col = -1; col < w / dx + 1; col++) {
    const cx = col * dx + (row & 1 ? dx / 2 : 0), cy = row * dy;
    g.strokeStyle = Math.random() < 0.08 ? 'rgba(255,60,220,.55)' : 'rgba(130,80,200,.32)';
    g.beginPath();
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    g.stroke();
  }
}, 14);
const wallTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#120a1c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#0a0612'; g.fillRect(0, 0, 6, h); g.fillRect(0, 0, w, 4);
  g.fillStyle = 'rgba(160,90,255,.05)'; g.fillRect(8, 6, w - 16, h - 12);
});
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(10, 3);

// ---------- room ----------
const room = new THREE.Group(); room.name = 'room'; scene.add(room);
// reflective floor + glossy hex overlay
const mirror = new Reflector(new THREE.PlaneGeometry(HALF * 2, HALF * 2), {
  textureWidth: Math.round(innerWidth * dpr * Q.refl), textureHeight: Math.round(innerHeight * dpr * Q.refl), color: 0x8a8a96,
});
mirror.rotation.x = -Math.PI / 2; mirror.name = 'floorMirror'; room.add(mirror);
const floorTop = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({
  color: 0x0c0814, map: hexTex, emissive: 0x6a2cc0, emissiveMap: hexTex, emissiveIntensity: 0.35,
  roughness: 0.42, metalness: 0.25, transparent: true, opacity: 0.6, depthWrite: false,
}));
floorTop.rotation.x = -Math.PI / 2; floorTop.position.y = 0.004; floorTop.name = 'floorHex'; room.add(floorTop);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a1840, map: wallTex, roughness: 0.85, metalness: 0.1 });
for (let i = 0; i < 4; i++) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, H), wallMat);
  const a = i * Math.PI / 2; w.rotation.y = a;
  w.position.set(-Math.sin(a) * HALF, H / 2, -Math.cos(a) * HALF); w.name = 'wall' + i; room.add(w);
}
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({ color: 0x07050c, roughness: 1 }));
ceil.rotation.x = Math.PI / 2; ceil.position.y = H; room.add(ceil);
// ceiling beam grid (dark industrial)
const beamMat = new THREE.MeshStandardMaterial({ color: 0x120c1a, roughness: 0.9 });
const beams = [];
for (let k = -HALF + 2.5; k < HALF; k += 2.5) {
  beams.push(new THREE.BoxGeometry(HALF * 2, 0.25, 0.18).translate(0, H - 0.4, k));
  beams.push(new THREE.BoxGeometry(0.18, 0.25, HALF * 2).translate(k, H - 0.6, 0));
}
room.add(new THREE.Mesh(mergeGeometries(beams), beamMat));

// neon helpers: thin bars along a polyline
function barGeo(a, b, t = 0.03) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.BoxGeometry(t, t, L + t);
  const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0).cross(d).lengthSq() < 1e-6 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
  m.setPosition(a.clone().add(b).multiplyScalar(0.5)); g.applyMatrix4(m); return g;
}
function polyBars(pts, t, closed) { const gs = []; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) gs.push(barGeo(pts[i], pts[(i + 1) % pts.length], t)); return mergeGeometries(gs); }

// ceiling hex fixtures + light shafts
const shaftMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  uniforms: { col: { value: new THREE.Color(0xff3ad8) } },
  vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader: 'uniform vec3 col;varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){float f=pow(abs(dot(vN,vV)),2.);float a=0.028*pow(vUv.y,2.0)*f;gl_FragColor=vec4(col*a,a);}',
});
const hexes = [
  { x: 0, z: 0, r: 3.6, c: [C.pink, C.cyan, C.pink] },
  { x: -6.5, z: -6.5, r: 2.2, c: [C.purple, C.amber] }, { x: 6.5, z: -6.5, r: 2.2, c: [C.cyan, C.pink] },
  { x: -6.5, z: 6.5, r: 2.2, c: [C.pink, C.purple] }, { x: 6.5, z: 6.5, r: 2.2, c: [C.amber, C.purple] },
];
for (const hx of hexes) {
  hx.c.forEach((col, i) => {
    const r = hx.r * (1 - i * 0.16), y = H - 0.9 - i * 0.12, pts = [];
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; pts.push(new THREE.Vector3(hx.x + r * Math.cos(a), y, hx.z + r * Math.sin(a))); }
    const m = new THREE.Mesh(polyBars(pts, 0.07, true), neon(col, i ? 2.4 : 3.2)); m.name = 'ceilingHex'; room.add(m);
  });
  // dark recessed panel inside the hex
  const panel = new THREE.Mesh(new THREE.CircleGeometry(hx.r * 0.95, 6), new THREE.MeshStandardMaterial({ color: 0x0d0816, roughness: 0.6 }));
  panel.rotation.x = Math.PI / 2; panel.rotation.z = Math.PI / 6; panel.position.set(hx.x, H - 0.7, hx.z); room.add(panel);
  const sm = shaftMat.clone(); sm.uniforms.col.value = new THREE.Color(hx.c[0]);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(hx.r * 0.85, hx.r * 1.35, H - 1, 6, 1, true), sm);
  shaft.position.set(hx.x, (H - 1) / 2, hx.z); shaft.rotation.y = Math.PI / 6; shaft.name = 'lightShaft'; room.add(shaft);
}
// wall neon: ceiling edge strips + soffit ledge above the cabinet rows
const edge = [], edgeAmber = [], edgeCyan = [];
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2, s = Math.sin(a), c = Math.cos(a);
  const P = (u, y, d) => new THREE.Vector3(-s * (HALF - d) + c * u, y, -c * (HALF - d) - s * u);
  edge.push(barGeo(P(-HALF, H - 0.1, 0.1), P(HALF, H - 0.1, 0.1), 0.08));
  edge.push(barGeo(P(-10.2, 3.12, 1.64), P(10.2, 3.12, 1.64), 0.07));
  edgeAmber.push(barGeo(P(-10.2, 3.64, 1.64), P(10.2, 3.64, 1.64), 0.05));
  edgeCyan.push(barGeo(P(-HALF, 6.2, 0.05), P(HALF, 6.2, 0.05), 0.045));
  // ledge body
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x140c20, roughness: 0.7 }));
  ledge.position.copy(P(0, 3.38, 0.8)); ledge.rotation.y = a; room.add(ledge);
}
room.add(new THREE.Mesh(mergeGeometries(edge), neon(C.pink, 3)));
room.add(new THREE.Mesh(mergeGeometries(edgeAmber), neon(C.amber, 2.2)));
room.add(new THREE.Mesh(mergeGeometries(edgeCyan), neon(C.cyan, 1.8)));

// real lights: only a handful
scene.add(new THREE.HemisphereLight(0x3a2060, 0x080410, 0.35));
const lights = [[0, 5.5, 0, C.pink, 22], [0, 2.6, -8.6, C.mag, 14], [0, 2.6, 8.6, C.purple, 14], [-8.6, 2.6, 0, C.cyan, 12], [8.6, 2.6, 0, C.mag, 14], [6, 6, 6, C.amber, 6]];
for (const [x, y, z, c, i] of lights) { const l = new THREE.PointLight(c, i, 22, 1.6); l.position.set(x, y, z); scene.add(l); }

// ---------- modular cabinet ----------
// Side profile (x = depth toward the player, y = height). Front of the cabinet faces local +X.
const PROFILE = [[0, 0], [0.8, 0], [0.8, 0.92], [0.98, 1.06], [0.96, 1.12], [0.72, 1.15], [0.58, 1.66], [0.8, 1.7], [0.8, 1.98], [0.02, 2.0]];
const CW = 0.86;
const shape = new THREE.Shape(PROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: CW, bevelEnabled: false }).translate(0, 0, -CW / 2);
const sideGeo = new THREE.ShapeGeometry(shape);
const segPlane = (a, b, w, inset = 0.004) => { // plane on profile segment a->b, facing outward
  const d = new THREE.Vector2(b[0] - a[0], b[1] - a[1]), L = d.length(); d.normalize();
  const n = new THREE.Vector2(d.y, -d.x); // outward for CCW profile
  const g = new THREE.PlaneGeometry(w, L).rotateY(Math.PI / 2).rotateZ(Math.atan2(n.y, n.x));
  g.translate((a[0] + b[0]) / 2 + n.x * inset, (a[1] + b[1]) / 2 + n.y * inset, 0); return g;
};
const screenGeo = (() => { const g = segPlane(PROFILE[5], PROFILE[6], CW - 0.14, 0.006); g.scale(1, 0.9, 1); const c = new THREE.Vector3(); g.computeBoundingBox(); g.boundingBox.getCenter(c); return g; })();
const marqueeGeo = segPlane(PROFILE[7], PROFILE[8], CW - 0.08);
const panelGeo = segPlane(PROFILE[4], PROFILE[5], CW - 0.06);
const kickGeo = segPlane(PROFILE[1], PROFILE[2], CW - 0.2).scale(1, 0.55, 1).translate(0, -0.1, 0);
const outline = PROFILE.map(([x, y]) => new THREE.Vector3(x, y, 0));
const edgeGeo = (() => {
  const gs = [];
  for (const z of [-CW / 2, CW / 2]) gs.push(polyBars(outline.map(p => p.clone().setZ(z)), 0.03, true));
  // front vertical edge accents on the marquee and around the screen
  for (const i of [7, 8, 5, 6]) gs.push(barGeo(new THREE.Vector3(PROFILE[i][0], PROFILE[i][1], -CW / 2), new THREE.Vector3(PROFILE[i][0], PROFILE[i][1], CW / 2), 0.016));
  return mergeGeometries(gs);
})();
const baseGeo = new THREE.BoxGeometry(0.03, 0.03, CW + 0.04).translate(0.82, 0.03, 0);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1426, roughness: 0.4, metalness: 0.45 });
const blankMat = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.18, metalness: 0.3, emissive: c, emissiveIntensity: e });

function makeCabinet(accent) {
  const g = new THREE.Group(); g.name = 'cabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  add(bodyGeo, bodyMat, 'body');
  const sL = add(sideGeo, blankMat(0x120c1c), 'sidePanelL'); sL.position.z = CW / 2 + 0.003;
  const sR = add(sideGeo, sL.material, 'sidePanelR'); sR.position.z = -CW / 2 - 0.003; sR.scale.z = -1; sR.material = sL.material.clone(); sR.material.side = THREE.BackSide;
  add(screenGeo, blankMat(0x06050b, 0), 'screen');
  add(marqueeGeo, blankMat(0x2a1550, 0.35), 'marquee');
  add(panelGeo, blankMat(0x16101f), 'controlPanel');
  add(kickGeo, blankMat(0x100b18), 'frontPanel');
  add(edgeGeo, neon(accent, 3), 'neonEdges');
  add(baseGeo, neon(accent, 4), 'neonBase');
  // API for adding art later: cabinet.userData.setArt('screen'|'marquee'|'sidePanelL'|..., texture)
  g.userData.setArt = (part, tex, glow = 1) => {
    const m = g.getObjectByName(part); if (!m) return;
    m.material = m.material.clone(); m.material.map = tex; m.material.emissiveMap = tex; m.material.emissive.set(0xffffff); m.material.emissiveIntensity = glow; m.material.color.set(0xffffff); m.material.needsUpdate = true;
  };
  return g;
}

const cabinets = [], blockers = [];
// every wall: 5 evenly spaced slots. The north-west corner ends of the north and west rows hold STRIKE and GHOST 256
const ROWS = [[-8, -4, 0, 4, 8], [-8, -4, 0, 4, 8], [-8, -4, 0, 4, 8], [-8, -4, 0, 4, 8]];
const strikeCab = buildStrikeCabinet(), ghostCab = buildGhostCabinet();
const FEATURED = { '0:0': [strikeCab, 'strike'], '1:4': [ghostCab, 'ghost'] }; // north row corner end (x=-8), west row corner end (z=-8)
const FSCALE = 2.0 / 2.08; // match the blank cabinets' 2.0 m height
const featured = [];
const WALL_GAP = 0.45, PLINTH = 1.45;
const plinthMat = new THREE.MeshStandardMaterial({ color: 0x0b0812, roughness: 0.4, metalness: 0.4 });
const wallNames = ['north', 'west', 'south', 'east'];
for (let w = 0; w < 4; w++) {
  const a = w * Math.PI / 2, s = Math.sin(a), c = Math.cos(a);
  const toWorld = (u, d) => new THREE.Vector3(-s * (HALF - d) + c * u, 0, -c * (HALF - d) - s * u); // d = distance from wall
  const inward = new THREE.Vector3(s, 0, c);
  const rotY = Math.atan2(-inward.z, inward.x);
  // plinth with neon lip (like the reference)
  const ROW = ROWS[w], uc = (ROW[0] + ROW[4]) / 2, hl = (ROW[4] - ROW[0]) / 2 + 1.5;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(hl * 2, 0.09, PLINTH), plinthMat);
  plinth.position.copy(toWorld(uc, PLINTH / 2)).setY(0.045); plinth.rotation.y = a; room.add(plinth);
  const lip = new THREE.Mesh(barGeo(toWorld(uc - hl, PLINTH).setY(0.09), toWorld(uc + hl, PLINTH).setY(0.09), 0.035), neon(C.pink, 3.5)); room.add(lip);
  const lip2 = new THREE.Mesh(barGeo(toWorld(uc - hl, PLINTH + 0.02).setY(0.012), toWorld(uc + hl, PLINTH + 0.02).setY(0.012), 0.02), neon(C.mag, 2)); room.add(lip2);
  const pc = toWorld(uc, PLINTH / 2);
  blockers.push({ minX: pc.x - (Math.abs(c) * hl + Math.abs(s) * PLINTH / 2), maxX: pc.x + (Math.abs(c) * hl + Math.abs(s) * PLINTH / 2), minZ: pc.z - (Math.abs(s) * hl + Math.abs(c) * PLINTH / 2), maxZ: pc.z + (Math.abs(s) * hl + Math.abs(c) * PLINTH / 2), kind: 'plinth' });
  ROW.forEach((u, i) => {
    const F = FEATURED[w + ':' + i];
    if (F) { // featured cabinet replaces the blank in this slot: same wall offset, platform height and facing
      const [cab, name] = F;
      cab.scale.setScalar(FSCALE); cab.position.copy(toWorld(u, WALL_GAP)).setY(0.09); cab.rotation.y = rotY;
      cab.userData.wall = wallNames[w]; cab.userData.index = i;
      Object.assign(cab.userData, { front: toWorld(u, WALL_GAP + 1.42 * FSCALE), facing: inward.clone().negate(), inward: inward.clone(), centre: toWorld(u, WALL_GAP + 0.5) });
      room.add(cab); featured.push(cab);
      blockers.push({ kind: 'obb', name, ox: cab.position.x, oz: cab.position.z, ang: rotY, x0: -0.02, x1: 1.06 * FSCALE, hz: 0.43 * FSCALE, h: 2.0 });
      // soft warm ceiling spot so the art reads (a light, not neon)
      const spot = new THREE.SpotLight(0xffe6d8, 22, 9, 0.45, 0.7, 1.4); spot.name = name + 'Spot';
      spot.position.copy(toWorld(u, WALL_GAP + 2.6)).setY(5.4); spot.target.position.copy(toWorld(u, WALL_GAP + 0.4)).setY(1.0); room.add(spot, spot.target);
      return;
    }
    const accent = (w * 5 + i) % 7 === 3 ? C.cyan : (w * 5 + i) % 5 === 2 ? C.purple : C.pink;
    const cab = makeCabinet(accent);
    cab.position.copy(toWorld(u, WALL_GAP)).setY(0.09); cab.rotation.y = rotY;
    cab.name = `cabinet_${wallNames[w]}_${i}`; cab.userData.wall = wallNames[w]; cab.userData.index = i;
    cab.userData.front = toWorld(u, WALL_GAP + 1.0); cab.userData.facing = inward.clone().negate();
    room.add(cab); cabinets.push(cab);
    const b = new THREE.Box3().setFromObject(cab.getObjectByName('body'));
    blockers.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, kind: 'cabinet' });
  });
}

const playables = [...cabinets, ...featured];
const obbs = blockers.filter(b => b.kind === 'obb');

// ---------- the monkey ----------
const tieDye = canvasTex(512, 512, (g, w, h) => {
  const cols = ['#ffd21f', '#2f7bff', '#ff4fb8', '#8f3dff', '#ffe95a', '#29c3ff'];
  g.fillStyle = '#ffd21f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = cols[i % cols.length];
    gr.addColorStop(0, c); gr.addColorStop(0.6, c + 'aa'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 0.35; g.strokeStyle = '#fff'; g.lineWidth = 6;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w / 2, h / 2, 30 + i * 30, i, i + 4); g.stroke(); }
  g.globalAlpha = 1; // chest graphic: pink star burst with dark outline (front = middle of texture)
  g.save(); g.translate(w * 0.5, h * 0.42); g.fillStyle = '#ff3fae'; g.strokeStyle = '#3b0a3a'; g.lineWidth = 6; g.beginPath();
  for (let i = 0; i < 16; i++) { const r = i % 2 ? 26 : 56, a = i * Math.PI / 8; g.lineTo(r * Math.cos(a), r * Math.sin(a)); }
  g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#2a0a3a'; g.fillRect(-22, -7, 44, 14); g.restore();
});
const denim = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#6f93c4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(40,60,110,.25)' : 'rgba(200,220,255,.18)'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
  for (const [x, y] of [[70, 60], [180, 150], [60, 200]]) { g.fillStyle = '#e8edf5'; for (let k = 0; k < 7; k++) g.fillRect(x - 18 + Math.random() * 6, y - 12 + k * 4, 30 + Math.random() * 10, 2); }
});
const M = {
  fur: new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.95 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xb78a68, roughness: 0.7 }),
  shirt: new THREE.MeshStandardMaterial({ map: tieDye, roughness: 0.85 }),
  jeans: new THREE.MeshStandardMaterial({ map: denim, roughness: 0.9 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc640, metalness: 1, roughness: 0.25, emissive: 0x402800, emissiveIntensity: 0.4 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xcfd6e0, metalness: 1, roughness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 0.3 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xffc81e, roughness: 0.5 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x2c6cff, roughness: 0.5 }),
  red: new THREE.MeshStandardMaterial({ color: 0xff3030, roughness: 0.5 }),
};
function part(parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = false; parent.add(m); return m; }
const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const CYL = (r1, r2, h, s = 16) => new THREE.CylinderGeometry(r1, r2, h, s);

function makeMonkey() {
  const root = new THREE.Group(); root.name = 'monkey';
  const hips = new THREE.Group(); hips.position.y = 0.8; root.add(hips);
  part(hips, CYL(0.2, 0.21, 0.16), M.jeans, 0, 0, 0, 1, 1, 0.8);
  part(hips, CYL(0.205, 0.205, 0.03), M.dark, 0, 0.07, 0, 1, 1, 0.8); // belt
  const legs = [];
  for (const sd of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.1 * sd, -0.04, 0); hips.add(leg);
    part(leg, CYL(0.105, 0.115, 0.42), M.jeans, 0, -0.2, 0);
    const knee = new THREE.Group(); knee.position.y = -0.4; leg.add(knee);
    part(knee, CYL(0.115, 0.125, 0.34), M.jeans, 0, -0.15, 0);
    const shoe = new THREE.Group(); shoe.position.set(0, -0.34, 0.05); knee.add(shoe);
    part(shoe, new THREE.BoxGeometry(0.17, 0.11, 0.3), M.white, 0, 0, 0);
    part(shoe, new THREE.BoxGeometry(0.18, 0.04, 0.32), M.yellow, 0, -0.06, 0);
    part(shoe, new THREE.BoxGeometry(0.182, 0.05, 0.14), M.blue, 0, 0.0, -0.03);
    part(shoe, new THREE.BoxGeometry(0.185, 0.025, 0.08), M.red, 0, 0.03, 0.06);
    part(shoe, S(0.09, 12, 8), M.white, 0, 0.0, 0.13, 0.95, 0.6, 0.6);
    legs.push({ leg, knee });
  }
  // wallet chain
  const wc = new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, 0.05, 0.15), new THREE.Vector3(0.22, -0.15, 0.08), new THREE.Vector3(0.23, -0.2, -0.04), new THREE.Vector3(0.15, 0.03, -0.16)]);
  part(hips, new THREE.TubeGeometry(wc, 24, 0.008, 5), M.silver);
  // torso
  const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
  const shirt = part(torso, CYL(0.25, 0.29, 0.56, 20), M.shirt, 0, 0.26, 0, 1, 1, 0.78); shirt.rotation.y = -Math.PI / 2;
  part(torso, S(0.26), M.shirt, 0, 0.5, 0, 1.15, 0.45, 0.8);
  const neck = new THREE.Group(); neck.position.y = 0.58; torso.add(neck);
  part(neck, CYL(0.07, 0.08, 0.1), M.fur, 0, 0.02, 0);
  const chain = part(neck, new THREE.TorusGeometry(0.15, 0.014, 6, 28), M.gold, 0, -0.06, 0.02, 1, 1.25, 1); chain.rotation.x = Math.PI / 2 + 0.5;
  part(neck, S(0.03, 8, 6), M.gold, 0, -0.2, 0.18);
  // head
  const head = new THREE.Group(); head.position.y = 0.08; neck.add(head);
  part(head, S(0.17), M.fur, 0, 0.14, -0.01, 1, 1.02, 1);
  part(head, S(0.13), M.skin, 0, 0.13, 0.08, 1, 1.05, 0.7);
  part(head, S(0.1), M.skin, 0, 0.06, 0.16, 1.05, 0.78, 0.85);
  part(head, S(0.11), M.fur, 0, 0.22, 0.09, 1.15, 0.3, 0.6); // brow ridge
  for (const sd of [-1, 1]) {
    part(head, S(0.032, 12, 8), M.white, 0.055 * sd, 0.165, 0.175);
    part(head, S(0.02, 10, 8), M.dark, 0.057 * sd, 0.165, 0.198);
    part(head, S(0.065, 14, 10), M.skin, 0.18 * sd, 0.14, -0.01, 0.4, 1, 0.9);
    part(head, S(0.012, 6, 4), M.dark, 0.022 * sd, 0.07, 0.245);
  }
  part(head, new THREE.BoxGeometry(0.1, 0.008, 0.01), M.dark, 0, 0.02, 0.235); // mouth
  // backwards white cap
  const cap = new THREE.Group(); cap.position.set(0, 0.2, -0.01); cap.rotation.x = -0.15; head.add(cap);
  part(cap, new THREE.SphereGeometry(0.182, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.white, 0, 0, 0, 1, 0.85, 1.02);
  part(cap, new THREE.CylinderGeometry(0.15, 0.15, 0.014, 20, 1, false, Math.PI * 0.5, Math.PI), M.white, 0, 0.0, -0.15, 1, 1, 1.05);
  part(cap, S(0.018, 8, 6), M.white, 0, 0.155, 0);
  // arms (long, chimp-like)
  const arms = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.29 * sd, 0.47, 0); torso.add(sh);
    part(sh, CYL(0.1, 0.11, 0.2), M.shirt, 0.02 * sd, -0.06, 0).rotation.z = 0.25 * sd;
    part(sh, CYL(0.06, 0.055, 0.32), M.fur, 0.02 * sd, -0.18, 0);
    const el = new THREE.Group(); el.position.set(0.02 * sd, -0.34, 0); sh.add(el);
    part(el, CYL(0.055, 0.045, 0.3), M.fur, 0, -0.15, 0);
    const hand = part(el, S(0.06, 12, 10), M.skin, 0, -0.33, 0.01, 0.8, 1.1, 1);
    arms.push({ sh, el, hand, sd });
  }
  // curled tail: chain of segments
  const tail = []; let p = hips;
  const tb = new THREE.Group(); tb.position.set(0, -0.05, -0.17); hips.add(tb); p = tb;
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Group(); s.position.y = i ? 0.075 : 0; p.add(s);
    const r = 0.03 - i * 0.0013; part(s, CYL(r * 0.9, r, 0.08, 8), M.fur, 0, 0.04, 0);
    tail.push(s); p = s;
  }
  root.userData = { hips, torso, neck, head, legs, arms, tail };
  return root;
}
const monkey = makeMonkey(); scene.add(monkey);
// soft rim/fill light that follows the monkey so he reads against the dark room
const monkeyFill = new THREE.PointLight(0xff7ad9, 0.7, 3.5, 1.5); scene.add(monkeyFill);
const monkeyRim = new THREE.PointLight(0x40d0ff, 0.9, 3.5, 1.5); scene.add(monkeyRim);
monkey.position.set(0, 0, 5);

// ---------- input ----------
const keys = {};
const st = { yaw: 0, pitch: 0.28, dist: 4.2, fp: false, vel: new THREE.Vector3(), face: Math.PI, phase: 0, speed: 0, play: 0, t: 0, joy: { x: 0, y: 0, on: false } };
monkey.rotation.y = st.face;
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyV') toggleView(); if (e.code === 'KeyF') toggleFs(); if (/Arrow|Space/.test(e.code)) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const cv = renderer.domElement;
let mouseDrag = null;
cv.addEventListener('mousedown', e => { mouseDrag = { x: e.clientX, y: e.clientY }; cv.focus(); });
addEventListener('mouseup', () => mouseDrag = null);
addEventListener('mousemove', e => {
  if (document.pointerLockElement === cv) { look(e.movementX, e.movementY); return; }
  if (!mouseDrag) return; look(e.clientX - mouseDrag.x, e.clientY - mouseDrag.y); mouseDrag = { x: e.clientX, y: e.clientY };
});
cv.addEventListener('dblclick', () => { if (!MOBILE) cv.requestPointerLock?.(); });
cv.addEventListener('wheel', e => { st.lookT = st.t; st.dist = THREE.MathUtils.clamp(st.dist + e.deltaY * 0.004, 1.6, 10); e.preventDefault(); }, { passive: false });
function look(dx, dy) { st.lookT = st.t; st.yaw -= dx * 0.005; st.pitch = THREE.MathUtils.clamp(st.pitch + dy * 0.004, -0.6, 1.25); }
// touch: left half = floating joystick, right half = look
const joyEl = document.getElementById('joy'), knob = document.getElementById('knob');
const touches = {};
cv.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth / 2 && !st.joy.on) { touches[t.identifier] = { kind: 'joy', x0: t.clientX, y0: t.clientY }; st.joy.on = true; joyEl.style.display = 'block'; joyEl.style.left = t.clientX + 'px'; joyEl.style.top = t.clientY + 'px'; }
    else touches[t.identifier] = { kind: 'look', x: t.clientX, y: t.clientY };
  }
  e.preventDefault();
}, { passive: false });
cv.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    const T = touches[t.identifier]; if (!T) continue;
    if (T.kind === 'joy') {
      let dx = t.clientX - T.x0, dy = t.clientY - T.y0; const L = Math.hypot(dx, dy), R = 45;
      if (L > R) { dx *= R / L; dy *= R / L; }
      st.joy.x = dx / R; st.joy.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`;
    } else { look((t.clientX - T.x) * 1.4, (t.clientY - T.y) * 1.4); T.x = t.clientX; T.y = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
const endTouch = e => {
  for (const t of e.changedTouches) {
    const T = touches[t.identifier]; if (!T) continue;
    if (T.kind === 'joy') { st.joy = { x: 0, y: 0, on: false }; joyEl.style.display = 'none'; knob.style.transform = ''; }
    delete touches[t.identifier];
  }
};
cv.addEventListener('touchend', endTouch); cv.addEventListener('touchcancel', endTouch);
function toggleView() { st.fp = !st.fp; }
function toggleFs() { const d = document; if (!d.fullscreenElement) d.documentElement.requestFullscreen?.().catch(() => {}); else d.exitFullscreen?.(); }
document.getElementById('bView').onclick = toggleView;
document.getElementById('bFs').onclick = toggleFs;
if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) document.getElementById('bFs').style.display = 'none';

// ---------- post ----------
const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: MOBILE ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * Q.bloom, innerHeight * Q.bloom), 0.75, 0.5, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 72 : 60; camera.updateProjectionMatrix();
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight); composer.setPixelRatio(dpr); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth * Q.bloom, innerHeight * Q.bloom);
  mirror.getRenderTarget().setSize(Math.round(innerWidth * dpr * Q.refl), Math.round(innerHeight * dpr * Q.refl));
}
addEventListener('resize', resize); resize();

// ---------- simulation ----------
const R = 0.3, LIM = HALF - 0.35;
function collide(p) {
  p.x = THREE.MathUtils.clamp(p.x, -LIM, LIM); p.z = THREE.MathUtils.clamp(p.z, -LIM, LIM);
  for (const b of blockers) {
    if (b.kind === 'obb') { // to local (x along cabinet depth, z across)
      const c = Math.cos(b.ang), sn = Math.sin(b.ang), rx = p.x - b.ox, rz = p.z - b.oz;
      const lx = c * rx - sn * rz, lz = sn * rx + c * rz;
      const qx = THREE.MathUtils.clamp(lx, b.x0, b.x1), qz = THREE.MathUtils.clamp(lz, -b.hz, b.hz);
      let dx = lx - qx, dz = lz - qz, d2 = dx * dx + dz * dz, nx = lx, nz = lz;
      if (d2 < R * R) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = qx + dx / d * R; nz = qz + dz / d * R; }
        else { const o = [lx - b.x0, b.x1 - lx, lz + b.hz, b.hz - lz], m = Math.min(...o); if (m === o[0]) nx = b.x0 - R; else if (m === o[1]) nx = b.x1 + R; else if (m === o[2]) nz = -b.hz - R; else nz = b.hz + R; }
        p.x = b.ox + c * nx + sn * nz; p.z = b.oz - sn * nx + c * nz;
      }
      continue;
    }
    const cx = THREE.MathUtils.clamp(p.x, b.minX, b.maxX), cz = THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < R * R) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
      else { // centre inside box: push out along the shallowest axis
        const o = [p.x - b.minX + R, b.maxX - p.x + R, p.z - b.minZ + R, b.maxZ - p.z + R], m = Math.min(...o);
        if (m === o[0]) p.x = b.minX - R; else if (m === o[1]) p.x = b.maxX + R; else if (m === o[2]) p.z = b.minZ - R; else p.z = b.maxZ + R;
      }
    }
  }
}
// furthest clear distance along dir from the target (walls with margin, and the STRIKE cabinet's box)
const _cp = new THREE.Vector3();
function camPush(q) { // keep the camera inside the walls and outside the STRIKE cabinet (continuous push-out, no ray snapping)
  const m = HALF - 0.3; q.x = THREE.MathUtils.clamp(q.x, -m, m); q.z = THREE.MathUtils.clamp(q.z, -m, m);
  for (const b of obbs) {
  if (q.y > b.h + 0.2) continue;
  const c = Math.cos(b.ang), sn = Math.sin(b.ang), rx = q.x - b.ox, rz = q.z - b.oz; let lx = c * rx - sn * rz, lz = sn * rx + c * rz;
  const x0 = b.x0 - 0.2, x1 = b.x1 + 0.2, hz = b.hz + 0.2;
  if (lx > x0 && lx < x1 && Math.abs(lz) < hz) {
    const o = [lx - x0, x1 - lx, lz + hz, hz - lz], mn = Math.min(...o);
    if (mn === o[1]) lx = x1; else if (mn === o[0]) lx = x0; else if (mn === o[2]) lz = -hz; else lz = hz;
    q.x = b.ox + c * lx + sn * lz; q.z = b.oz - sn * lx + c * lz;
    q.x = THREE.MathUtils.clamp(q.x, -m, m); q.z = THREE.MathUtils.clamp(q.z, -m, m);
  }
  }
  return q;
}
// when the monkey walks up to the STRIKE cabinet, ease the camera round to a three-quarter view (unless the player is steering the camera)
function showcase(dt) {
  let u = null, d = 1e9, dx = 0, dz = 0;
  for (const c of featured) { const ex = monkey.position.x - c.userData.front.x, ez = monkey.position.z - c.userData.front.z, ed = Math.hypot(ex, ez); if (ed < d) { d = ed; u = c.userData; dx = ex; dz = ez; } }
  st.showK = (st.showK || 0) + (((d < 2.8) && st.t - (st.lookT ?? -9) > 1.6 ? 1 : 0) - (st.showK || 0)) * (1 - Math.exp(-dt * 2.5));
  if (st.showK < 0.01) return;
  const base = Math.atan2(u.inward.x, u.inward.z); // camera offset direction that looks straight at the front
  const side = Math.sign((dx * u.inward.z - dz * u.inward.x) || 1); // which side of the cabinet the monkey is on
  const wantYaw = base + side * 0.62; let dy = Math.atan2(Math.sin(wantYaw - st.yaw), Math.cos(wantYaw - st.yaw));
  const k = (1 - Math.exp(-dt * 1.6)) * st.showK;
  st.yaw += dy * k; st.pitch += (0.22 - st.pitch) * k; st.dist += (3.4 - st.dist) * k;
}
const tmp = new THREE.Vector3(), camTarget = new THREE.Vector3(), camPos = new THREE.Vector3();
let nearCab = null;
function step(dt) {
  st.t += dt;
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  let mag = Math.min(1, Math.hypot(ix, iz)); if (mag) { ix /= Math.hypot(ix, iz); iz /= Math.hypot(ix, iz) || 1; }
  let run = keys.ShiftLeft || keys.ShiftRight;
  if (st.joy.on && Math.hypot(st.joy.x, st.joy.y) > 0.12) { ix = st.joy.x; iz = st.joy.y; mag = Math.min(1, Math.hypot(ix, iz)); run = mag > 0.85; }
  const sy = Math.sin(st.yaw), cy = Math.cos(st.yaw);
  // camera forward on ground = (-sin yaw, -cos yaw)
  const wx = ix * cy + iz * sy, wz = -ix * sy + iz * cy;
  const n = Math.hypot(wx, wz) || 1;
  const vmax = (run ? 5.2 : 2.4) * mag;
  const tv = tmp.set(wx / n * vmax, 0, wz / n * vmax);
  st.vel.lerp(tv, 1 - Math.exp(-dt * 10));
  monkey.position.addScaledVector(st.vel, dt); collide(monkey.position);
  st.speed = Math.hypot(st.vel.x, st.vel.z);
  if (st.speed > 0.15) { const target = Math.atan2(st.vel.x, st.vel.z); let d = target - st.face; d = Math.atan2(Math.sin(d), Math.cos(d)); st.face += d * (1 - Math.exp(-dt * 12)); }
  monkey.rotation.y = st.face;
  // nearest cabinet the monkey faces → play animation
  nearCab = null;
  for (const c of playables) {
    const f = c.userData.front, dx = c.position.x - monkey.position.x, dz = c.position.z - monkey.position.z;
    if (Math.hypot(monkey.position.x - f.x, monkey.position.z - f.z) < 0.9) { const dd = Math.hypot(dx, dz); if ((Math.sin(st.face) * dx + Math.cos(st.face) * dz) / dd > 0.75) nearCab = c; }
  }
  st.play += ((nearCab && st.speed < 0.4 ? 1 : 0) - st.play) * (1 - Math.exp(-dt * 6));
  animateMonkey(dt);
  monkeyFill.position.set(monkey.position.x + Math.sin(st.yaw) * 1.2, 1.9, monkey.position.z + Math.cos(st.yaw) * 1.2);
  monkeyRim.position.set(monkey.position.x - Math.sin(st.yaw) * 1.0, 1.6, monkey.position.z - Math.cos(st.yaw) * 1.0);
  // camera
  camTarget.set(monkey.position.x, monkey.position.y + (st.fp ? 1.42 : 1.25), monkey.position.z);
  if (st.fp) {
    camera.position.copy(camTarget).add(tmp.set(-Math.sin(st.yaw) * 0.25, 0, -Math.cos(st.yaw) * 0.25));
    camera.lookAt(camera.position.x - Math.sin(st.yaw) * Math.cos(st.pitch), camera.position.y - Math.sin(st.pitch - 0.28), camera.position.z - Math.cos(st.yaw) * Math.cos(st.pitch));
    monkey.visible = false;
  } else {
    monkey.visible = true;
    showcase(dt);
    const dir = tmp.set(Math.sin(st.yaw) * Math.cos(st.pitch), Math.sin(st.pitch), Math.cos(st.yaw) * Math.cos(st.pitch));
    camPos.copy(dir).multiplyScalar(st.dist).add(camTarget);
    camPush(camPos);
    camPos.y = THREE.MathUtils.clamp(camPos.y, 0.25, H - 1.2);
    if (!st.camInit || camPos.distanceTo(camera.position) > 6) { camera.position.copy(camPos); st.camInit = true; }   // first frame / teleport
    else camera.position.lerp(camPos, 1 - Math.exp(-dt * 14));
    camPush(camera.position); camera.lookAt(camTarget);
  }
}
function animateMonkey(dt) {
  const u = monkey.userData, sp = st.speed, runK = THREE.MathUtils.clamp((sp - 2.4) / 2.8, 0, 1);
  st.phase += dt * (sp > 0.05 ? 3 + sp * 2.1 : 0);
  const sw = Math.min(1, sp / 2.4), s = Math.sin(st.phase), c = Math.cos(st.phase), t = st.t, P = st.play;
  const amp = (0.55 + runK * 0.35) * sw;
  u.hips.position.y = 0.8 + Math.abs(c) * 0.05 * sw - P * 0.06 + Math.sin(t * 2) * 0.006;
  u.legs[0].leg.rotation.x = s * amp; u.legs[1].leg.rotation.x = -s * amp;
  u.legs[0].knee.rotation.x = Math.max(0, -c) * amp * 1.3 + P * 0.25; u.legs[1].knee.rotation.x = Math.max(0, c) * amp * 1.3 + P * 0.25;
  u.legs[0].leg.rotation.x -= P * 0.2; u.legs[1].leg.rotation.x += P * 0.05;
  u.torso.rotation.x = 0.06 + runK * 0.22 + P * 0.38; u.torso.rotation.y = s * 0.1 * sw;
  u.neck.rotation.x = -u.torso.rotation.x * 0.6; u.head.rotation.y = Math.sin(t * 0.7) * 0.15 * (1 - sw);
  for (const a of u.arms) {
    const ph = a.sd > 0 ? s : -s;
    const jitter = Math.sin(t * (a.sd > 0 ? 23 : 17)) * 0.08;
    a.sh.rotation.x = THREE.MathUtils.lerp(ph * amp * 0.9, -1.15 + jitter, P);
    a.sh.rotation.z = THREE.MathUtils.lerp(0.08 * a.sd, 0.18 * a.sd, P);
    a.el.rotation.x = THREE.MathUtils.lerp(-0.3 - runK * 0.8, -0.65 + jitter, P);
  }
  u.tail.forEach((g, i) => {
    const base = i === 0 ? 2.1 : i < 7 ? -0.12 : -0.42; // out backwards, then curl up
    g.rotation.x = base + Math.sin(t * 2.2 + i * 0.5) * 0.04 * (1 + sw * 2);
    g.rotation.z = Math.sin(t * 1.6 - i * 0.35) * (0.05 + sw * 0.07);
  });
}

// ---------- loop + adaptive quality ----------
const demo = startStrikeDemo(strikeCab), ghostDemo = startGhostDemo(ghostCab), _v = new THREE.Vector3();
const _frus = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
const stats = { frames: 0, cpu: 0, cpuAvg: 0, gapAvg: 16, quality: dpr };
let last = performance.now(), slow = 0, fast = 0;
function frame(now) {
  const gap = Math.min(100, now - last); last = now;
  const t0 = performance.now();
  step(Math.min(gap / 1000, 0.05));
  { // run each cabinet screen only when that cabinet is near and in view
    _frus.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const vis = c => { const sc = c.userData.centre; return (_frus.intersectsSphere(_sph.set(_v.copy(sc).setY(1.2), 1.4)) && camera.position.distanceTo(sc) < 18) || !!window.__forceDemo; };
    const dts = Math.min(gap / 1000, 0.1);
    tickStrikeDemo(demo, dts, vis(strikeCab)); tickGhostDemo(ghostDemo, dts, vis(ghostCab));
    strikeCab.userData.glow.intensity = demo.running ? 1.2 + Math.sin(now * 0.013) * 0.08 + Math.sin(now * 0.031) * 0.06 : 0.6;
    ghostCab.userData.glow.intensity = ghostDemo.running ? 1.1 + Math.sin(now * 0.017) * 0.08 : 0.5;
  }
  composer.render();
  const cpu = performance.now() - t0;
  stats.frames++; stats.cpu = cpu; stats.cpuAvg += (cpu - stats.cpuAvg) * 0.05; stats.gapAvg += (gap - stats.gapAvg) * 0.05;
  if (!window.__noAdapt) {
    if (stats.gapAvg > 24) { if (++slow > 90 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); resize(); slow = 0; } } else slow = 0;
    if (stats.gapAvg < 14) { if (++fast > 400 && dpr < Math.min(devicePixelRatio || 1, Q.dpr)) { dpr += 0.25; resize(); fast = 0; } } else fast = 0;
    stats.quality = dpr;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// hooks for tests / future art work
window.__arcade = { THREE, scene, camera, renderer, monkey, cabinets, strikeCab, ghostCab, featured, demo, ghostDemo, playables, blockers, st, stats, step, keys, get nearCab() { return nearCab; }, setArt: (i, part, tex, glow) => cabinets[i].userData.setArt(part, tex, glow) };
