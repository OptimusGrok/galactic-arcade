// Galactic Arcade (formerly Neon Arcade) — walkable 3D arcade room with a playable monkey.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildStrikeCabinet, startStrikeDemo, tickStrikeDemo } from './strikecab.js';
import { buildGhostCabinet, startGhostDemo, tickGhostDemo } from './ghostcab.js';
import { buildBerserkerCabinet } from './berserkcab.js';
import { buildMonkeyCabinet } from './monkeycab.js';
import { setupSpaceWindow } from './spacewin.js';
import { buildOrcCabinet } from './orccab.js';
import { buildCyberCabinet } from './cybercitycab.js';
import { buildNovaCabinet } from './novacab.js';
import { buildRoadsterCabinet, MR } from './roadstercab.js';
import { buildDeadSignalStation, DS } from './dscab.js';
import { setupPlay } from './play.js';
import { setupShield } from './shield.js';
import { setupKiosk } from './kiosk.js';
import { setupOpts } from './opts.js';
import { setupTeleport, WX } from './teleport.js';
import { setupShop } from './shop.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const Q = MOBILE ? { dpr: 1.5, refl: 0.35, bloom: 0.5 } : { dpr: 2, refl: 0.6, bloom: 0.5 };

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: 'high-performance' }); renderer.localClippingEnabled = true;   // teleporter dissolve
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
const DOOR_W = 3.2, DOOR_H = 3.0, HALL_L = 5, Z2 = -(2 * HALF + HALL_L);   // room 2 centre (rotated 180deg, its doorway faces ours)   // doorway in the north wall (x=0) + hallway to room 2
// Neon tubes are over-bright (colour x k) so bloom gives the glow. Seen from very close (camera swinging against a wall or into the
// hallway) a tube filled the screen at k x colour and ACES + bloom turned it into a white flash. nearGlare() fades a tube's brightness
// down to ~1.3x its colour (still coloured, never white) when it is within ~1 m of the camera.
function nearGlare(m, k) { const nk = Math.min(1, 1.3 / Math.max(k, 1e-3)); m.userData.nearK = nk;
  m.onBeforeCompile = sh => { sh.uniforms.nearK = { value: nk };
    sh.vertexShader = 'varying float vNG;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vNG = -mvPosition.z;');
    sh.fragmentShader = 'uniform float nearK;\nvarying float vNG;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * mix( nearK, 1.0, smoothstep( 0.3, 1.1, vNG ) ), opacity );'); };
  m.customProgramCacheKey = () => 'nearGlare'; return m; }
const neon = (hex, k = 3) => nearGlare(new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: false }), k);
const PINK_K = 0.7;   // Dave: 'make the pink neon strips a bit less bright' - pink/magenta strip tubes at 70% (other colours unchanged)
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
const floorGeo = mergeGeometries([new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.PlaneGeometry(DOOR_W, HALL_L + 0.02).translate(0, HALF + HALL_L / 2, 0)]); // room + hallway (plane is rotated -90deg about x: +y -> -z)
const mirror = new Reflector(floorGeo, {
  textureWidth: Math.round(innerWidth * dpr * Q.refl), textureHeight: Math.round(innerHeight * dpr * Q.refl), color: 0x8a8a96,
});
mirror.rotation.x = -Math.PI / 2; mirror.name = 'floorMirror'; room.add(mirror);
const floorTop = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
  color: 0x0c0814, map: hexTex, emissive: 0x6a2cc0, emissiveMap: hexTex, emissiveIntensity: 0.35,
  roughness: 0.42, metalness: 0.25, transparent: true, opacity: 0.6, depthWrite: false,
}));
const floorBase1 = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x05030a, roughness: 0.3, metalness: 0.6 })); floorBase1.rotation.x = -Math.PI / 2; floorBase1.position.y = -0.002; floorBase1.visible = false; floorBase1.name = 'floorBase1'; room.add(floorBase1);
floorTop.rotation.x = -Math.PI / 2; floorTop.position.y = 0.004; floorTop.name = 'floorHex'; room.add(floorTop);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a1840, map: wallTex, roughness: 0.85, metalness: 0.1 });
for (let i = 0; i < 4; i++) {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, H), wallMat);
  const a = i * Math.PI / 2; w.rotation.y = a;
  w.position.set(-Math.sin(a) * HALF, H / 2, -Math.cos(a) * HALF); w.name = 'wall' + i; room.add(w);
  if (i === 0) { // north wall: doorway cut out (two side panels + lintel), replaces the full plane
    w.geometry = mergeGeometries([
      new THREE.PlaneGeometry(HALF - DOOR_W / 2, H).translate(-(HALF + DOOR_W / 2) / 2, 0, 0),
      new THREE.PlaneGeometry(HALF - DOOR_W / 2, H).translate((HALF + DOOR_W / 2) / 2, 0, 0),
      new THREE.PlaneGeometry(DOOR_W, H - DOOR_H).translate(0, DOOR_H / 2, 0)]);
  }
}
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({ color: 0x07050c, roughness: 1 }));
// wall UVs in wall space (the doorway wall is 3 merged panels: give them one continuous mapping)
for (let i = 0; i < 4; i++) { const g = room.getObjectByName('wall' + i).geometry, P = g.attributes.position, U = g.attributes.uv;
  for (let k = 0; k < P.count; k++) U.setXY(k, (P.getX(k) + HALF) / (2 * HALF), (P.getY(k) + H / 2) / H); U.needsUpdate = true; }
// ---------- room 1 walls option: current (default) or Viking rune panels (Options > WALLS) ----------
const WALLS_KEY = 'neonarcade.walls';
let wallsMode = 'current', vikTex = null, wallBands = [], spaceWin = null;
function setWalls(mode) {
  wallsMode = mode === 'viking' ? 'viking' : 'current'; const v = wallsMode === 'viking';
  if (v && !vikTex) { vikTex = new THREE.TextureLoader().load('tex/viking_walls.jpg', () => spaceWin && spaceWin.dirty()); vikTex.colorSpace = THREE.SRGBColorSpace; vikTex.wrapS = THREE.RepeatWrapping; vikTex.wrapT = THREE.ClampToEdgeWrapping;
    vikTex.repeat.set(+(2 * HALF / (H * 928 / 576)).toFixed(3), 1); vikTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); }   // one repeat = wall height
  wallMat.map = v ? vikTex : wallTex; wallMat.color.setHex(v ? 0x8a7a70 : 0x2a1840); wallMat.roughness = v ? 0.95 : 0.85; wallMat.emissiveMap = v ? vikTex : null; wallMat.emissive.setHex(v ? 0xffffff : 0x000000); wallMat.emissiveIntensity = v ? 1.6 : 1; wallBands.forEach(m => { m.visible = !v; }); wallMat.needsUpdate = true;   // a little dark so the neon pops
  if (spaceWin) spaceWin.dirty();
  try { localStorage.setItem(WALLS_KEY, wallsMode); } catch (e) {}
  return wallsMode;
}
try { if (localStorage.getItem(WALLS_KEY) === 'viking') setWalls('viking'); } catch (e) {}
window.__setWalls = setWalls;
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
const edge = [], edgeLedge = [], edgeAmber = [], edgeCyan = [], bandsNoEast = [[], [], []], ledges = [];
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2, s = Math.sin(a), c = Math.cos(a);
  const P = (u, y, d) => new THREE.Vector3(-s * (HALF - d) + c * u, y, -c * (HALF - d) - s * u);
  edge.push(barGeo(P(-HALF, H - 0.1, 0.1), P(HALF, H - 0.1, 0.1), 0.08));
  edgeLedge.push(barGeo(P(-10.2, 3.12, 1.64), P(10.2, 3.12, 1.64), 0.07));
  edgeAmber.push(barGeo(P(-10.2, 3.64, 1.64), P(10.2, 3.64, 1.64), 0.05));
  edgeCyan.push(barGeo(P(-HALF, 6.2, 0.05), P(HALF, 6.2, 0.05), 0.045));
  if (i !== 3) [edgeLedge, edgeAmber, edgeCyan].forEach((L, k) => bandsNoEast[k].push(L[L.length - 1]));   // room 1's east wall becomes the space window
  // ledge body
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x140c20, roughness: 0.7 }));
  ledge.position.copy(P(0, 3.38, 0.8)); ledge.rotation.y = a; ledge.name = 'ledge' + i; ledges.push(ledge); room.add(ledge);
}
room.add(new THREE.Mesh(mergeGeometries(edge), neon(C.pink, 3 * PINK_K)));
wallBands = [new THREE.Mesh(mergeGeometries(edgeLedge), neon(C.pink, 3 * PINK_K)), new THREE.Mesh(mergeGeometries(edgeAmber), neon(C.amber, 2.2)), new THREE.Mesh(mergeGeometries(edgeCyan), neon(C.cyan, 1.8))];
wallBands.forEach((m, k) => { m.name = 'wallBand' + ['Pink', 'Amber', 'Cyan'][k]; room.add(m); });   // the 3 coloured horizontal wall bands (hidden with Viking walls)
wallBands.forEach(m => { m.visible = wallsMode !== 'viking'; });

// ---------- hallway north of the doorway (z = -HALF .. -HALF-HALL_L) ----------
const hall = new THREE.Group(); hall.name = 'hallway'; scene.add(hall);
{
  const z0 = -HALF, z1 = -HALF - HALL_L, zm = (z0 + z1) / 2, hw = DOOR_W / 2;
  const hwMat = wallMat.clone(); hwMat.map = wallTex.clone(); hwMat.map.repeat.set(2.2, 1.2); hwMat.map.needsUpdate = true;
  const side = new THREE.PlaneGeometry(HALL_L, DOOR_H);
  const L = new THREE.Mesh(side, hwMat); L.rotation.y = Math.PI / 2; L.position.set(-hw, DOOR_H / 2, zm); L.name = 'hallWallW';
  const Rw = new THREE.Mesh(side, hwMat); Rw.rotation.y = -Math.PI / 2; Rw.position.set(hw, DOOR_H / 2, zm); Rw.name = 'hallWallE';
  const top = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, HALL_L), ceil.material); top.rotation.x = Math.PI / 2; top.position.set(0, DOOR_H, zm); top.name = 'hallCeiling';
  hall.add(L, Rw, top);
  // continuous neon strips: bottom (pink, like the plinth lips) and top (pink edge + cyan, like the room's wall strips) on both walls
  const bot = [], topP = [], topC = [];
  for (const sx of [-1, 1]) {
    const x = sx * (hw - 0.03);
    bot.push(barGeo(new THREE.Vector3(x, 0.09, z0 + 0.02), new THREE.Vector3(x, 0.09, z1), 0.05));
    topP.push(barGeo(new THREE.Vector3(x, DOOR_H - 0.06, z0 + 0.02), new THREE.Vector3(x, DOOR_H - 0.06, z1), 0.06));
    topC.push(barGeo(new THREE.Vector3(x, DOOR_H - 0.28, z0 + 0.02), new THREE.Vector3(x, DOOR_H - 0.28, z1), 0.035));
  }
  // door frame trim on the room side (pink), same bar style
  topP.push(polyBars([new THREE.Vector3(-hw, 0.0, z0 + 0.03), new THREE.Vector3(-hw, DOOR_H, z0 + 0.03), new THREE.Vector3(hw, DOOR_H, z0 + 0.03), new THREE.Vector3(hw, 0.0, z0 + 0.03)], 0.06, false));
  const nb = new THREE.Mesh(mergeGeometries(bot), neon(C.pink, 3.5 * PINK_K)); nb.name = 'hallNeonBottom';
  const nt = new THREE.Mesh(mergeGeometries(topP), neon(C.pink, 3 * PINK_K)); nt.name = 'hallNeonTop';
  const nc = new THREE.Mesh(mergeGeometries(topC), neon(C.cyan, 1.8)); nc.name = 'hallNeonTopCyan';
  hall.add(nb, nt, nc);
}

// real lights: only a handful
scene.add(new THREE.HemisphereLight(0x3a2060, 0x080410, 0.35));
const lights = [[0, 5.5, 0, C.pink, 22], [0, 2.6, -8.6, C.mag, 14 * PINK_K], [0, 2.6, 8.6, C.purple, 14], [-8.6, 2.6, 0, C.cyan, 12], [8.6, 2.6, 0, C.mag, 14 * PINK_K], [6, 6, 6, C.amber, 6]];
const roomLights = [];
for (const [x, y, z, c, i] of lights) { const l = new THREE.PointLight(c, i, 22, 1.6); l.position.set(x, y, z); l.userData.p1 = [x, y, z]; scene.add(l); roomLights.push(l); }

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

const cabinets = [], blockers = [], slots = [], spots = [], eastGhostCabs = [];
// every wall: 5 evenly spaced slots. The north-west corner ends of the north and west rows hold STRIKE and GHOST 256
const ROWS = [[-8, -4, 0, 4, 8], [-8, -4, 0, 4, 8], [-8, -4, 0, 4, 8], [-8, -4, 0, 4, 8]];
const strikeCab = buildStrikeCabinet(), ghostCab = buildGhostCabinet();
const berserkerCab = buildBerserkerCabinet(), monkeyCab = buildMonkeyCabinet(), orcCab = buildOrcCabinet(), novaCab = buildNovaCabinet(), cyberCab = buildCyberCabinet();
const FEATURED = { '0:0': [strikeCab, 'strike'], '0:1': [berserkerCab, 'berserker'], '0:3': [monkeyCab, 'monkey'], '1:4': [ghostCab, 'ghost'], '1:3': [orcCab, 'orc'], '0:4': [novaCab, 'nova'], '1:2': [cyberCab, 'cyber'] };   // NOVA TETHER: north wall slot 4 (x=8), right of MONKEY CROSSING (Dave's pick)
   // ORC ATTACK: west wall slot 3 (z=-4), immediately left of GHOST 256 as you face it // north row corner end (x=-8), west row corner end (z=-8)
// MARS ROADSTER: two-seat driving cabinet, 2 slots wide (south wall C + D = 2:0 x=8 and 2:1 x=4) and 4 cabinets long, into the room
const roadsterCab = buildRoadsterCabinet(); FEATURED['2:0'] = [roadsterCab, 'roadster'];
const ROADSTER_SLOTS = new Set(['2:0', '2:1']);
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
  // the north row is split at the doorway: two plinth runs that end neatly at the door jambs
  const runs = w === 0 ? [[uc - hl, -DOOR_W / 2], [DOOR_W / 2, uc + hl]] : [[uc - hl, uc + hl]];
  for (const [u0, u1] of runs) {
    const um = (u0 + u1) / 2, hh = (u1 - u0) / 2;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(hh * 2, 0.09, PLINTH), plinthMat);
    plinth.position.copy(toWorld(um, PLINTH / 2)).setY(0.045); plinth.rotation.y = a; plinth.name = 'plinth_' + wallNames[w]; room.add(plinth);
    const lipG = [barGeo(toWorld(u0, PLINTH).setY(0.09), toWorld(u1, PLINTH).setY(0.09), 0.035)];
    if (w === 0) lipG.push(barGeo(toWorld(u0 < 0 ? u1 : u0, PLINTH).setY(0.09), toWorld(u0 < 0 ? u1 : u0, 0).setY(0.09), 0.035)); // return along the door edge
    { const lp = new THREE.Mesh(mergeGeometries(lipG), neon(C.pink, 3.5 * PINK_K)); lp.name = 'plinthLip_' + wallNames[w]; room.add(lp); }
    const lip2 = new THREE.Mesh(barGeo(toWorld(u0, PLINTH + 0.02).setY(0.012), toWorld(u1, PLINTH + 0.02).setY(0.012), 0.02), neon(C.mag, 2 * PINK_K)); lip2.name = 'plinthLip2_' + wallNames[w]; room.add(lip2);
    const pc = toWorld(um, PLINTH / 2);
    blockers.push({ minX: pc.x - (Math.abs(c) * hh + Math.abs(s) * PLINTH / 2), maxX: pc.x + (Math.abs(c) * hh + Math.abs(s) * PLINTH / 2), minZ: pc.z - (Math.abs(s) * hh + Math.abs(c) * PLINTH / 2), maxZ: pc.z + (Math.abs(s) * hh + Math.abs(c) * PLINTH / 2), kind: 'plinth', wall: wallNames[w] });
  }
  ROW.forEach((u, i) => {
    if (w === 0 && i === 2) return; // removed: the doorway to the hallway is here
    slots.push({ w, i, pos: toWorld(u, WALL_GAP).setY(0.09), rotY, accent: (w * 5 + i) % 7 === 3 ? C.cyan : (w * 5 + i) % 5 === 2 ? C.purple : C.pink });
    if (ROADSTER_SLOTS.has(w + ':' + i)) { if (i !== 0) return;   // one machine over both slots
      const x0 = toWorld((ROW[0] + ROW[1]) / 2, WALL_GAP);         // (6, 0, 11.55): the wall end of the cabinet, centred between C and D
      roadsterCab.position.set(x0.x, 0, x0.z); roadsterCab.rotation.y = Math.PI;   // local +z -> world -z (into the room)
      const zEnd = x0.z - MR.DEP;
      Object.assign(roadsterCab.userData, { wall: 'south', index: 0, slots: ['2:0', '2:1'], inward: inward.clone(), facing: inward.clone().negate(), front: new THREE.Vector3(x0.x, 0, zEnd - 0.4), centre: new THREE.Vector3(x0.x, 0, x0.z - MR.DEP / 2), zEnd, seat: 'L' });
      const S = roadsterCab.userData.seats; for (const k in S) S[k].world = roadsterCab.localToWorld(S[k].local.clone());
      room.add(roadsterCab); featured.push(roadsterCab); roadsterCab.updateMatrixWorld(true);
      blockers.push({ minX: x0.x - MR.W / 2, maxX: x0.x + MR.W / 2, minZ: zEnd, maxZ: x0.z + 0.05, kind: 'cabinet', name: 'roadster' });
      const spot = new THREE.SpotLight(0xffe6d8, 26, 11, 0.55, 0.7, 1.4); spot.name = 'roadsterSpot';
      spot.position.set(x0.x, 5.6, zEnd - 1.2); spot.target.position.set(x0.x, 1.2, x0.z - 1.4); room.add(spot, spot.target); spots.push(spot, spot.target);
      return;
    }
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
      spot.position.copy(toWorld(u, WALL_GAP + 2.6)).setY(5.4); spot.target.position.copy(toWorld(u, WALL_GAP + 0.4)).setY(1.0); room.add(spot, spot.target); spots.push(spot, spot.target);
      return;
    }
    const accent = (w * 5 + i) % 7 === 3 ? C.cyan : (w * 5 + i) % 5 === 2 ? C.purple : C.pink;
    const cab = makeCabinet(accent);
    cab.position.copy(toWorld(u, WALL_GAP)).setY(0.09); cab.rotation.y = rotY;
    if (w === 3) { cab.userData.wall = 'east'; eastGhostCabs.push(cab); return; }   // room 1's east wall is the space window: no blank cabinets (kept only to shape room 2's cloned neon)
    cab.name = `cabinet_${wallNames[w]}_${i}`; cab.userData.wall = wallNames[w]; cab.userData.index = i;
    cab.userData.front = toWorld(u, WALL_GAP + 1.0); cab.userData.facing = inward.clone().negate();
    room.add(cab); cabinets.push(cab);
    cab.updateMatrixWorld(true); // (was stale: every blank cabinet's box sat at the origin)
    const b = new THREE.Box3().setFromObject(cab.getObjectByName('body'));
    blockers.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, kind: 'cabinet' });
  });
}


// ---------- room 1: pink neon tube tight along the base of all 4 walls, outlining every cabinet against the wall (up the back edge, over the top, down) and framing the doorway ----------
function wallTubeGeo(cabList, flatEast) {
  const D = 0.04, T = 0.035, Y0 = 0.03, YP = 0.09 + 0.03, RISE = 0.06, segs = [];
  const PU = (ROWS[0][4] - ROWS[0][0]) / 2 + 1.5;   // plinth half-length along each wall
  for (let w = 0; w < 4; w++) {
    const a = w * Math.PI / 2, s = Math.sin(a), c = Math.cos(a);
    const P = (u, y) => new THREE.Vector3(-s * (HALF - D) + c * u, y, -c * (HALF - D) - s * u);
    const toU = v => c * v.x - s * v.z;
    // cabinet silhouettes on this wall (u range + top)
    const outl = [];
    for (const cab of cabList) { if (cab.userData.wall !== wallNames[w]) continue; cab.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(cab), us = [toU(b.min), toU(b.max), toU(new THREE.Vector3(b.min.x, 0, b.max.z)), toU(new THREE.Vector3(b.max.x, 0, b.min.z))];
      outl.push([Math.min(...us) - RISE, Math.max(...us) + RISE, b.max.y + RISE]); }
    outl.sort((p, q) => p[0] - q[0]);
    // floor run broken into pieces: corners, plinth ends (step up onto the plinth), cabinets (go round), doorway (frame)
    const E = HALF - D, door = w === 0 ? [-DOOR_W / 2 - 0.05, DOOR_W / 2 + 0.05] : null;
    const yAt = u => !(flatEast && w === 3) && Math.abs(u) < PU ? YP : Y0;
    let pts = [], cur = -E; const flush = () => { for (let i = 0; i + 1 < pts.length; i++) segs.push(barGeo(pts[i], pts[i + 1], T)); pts = []; };
    const go = u => { // along the floor from cur to u, stepping at the plinth ends
      for (const e of [-PU, PU]) if (e > cur && e < u) { pts.push(P(e, yAt(e - 1e-3)), P(e, yAt(e + 1e-3))); }
      pts.push(P(u, yAt(u - 1e-4))); cur = u; };
    pts.push(P(cur, yAt(cur)));
    const stops = outl.map(o => ['cab', ...o]); if (door) stops.push(['door', door[0], door[1], DOOR_H + 0.05]); stops.sort((p, q) => p[1] - q[1]);
    for (const [kind, u0, u1, top] of stops) {
      go(u0);
      if (kind === 'cab') { pts.push(P(u0, top), P(u1, top), P(u1, yAt(u1))); cur = u1; }
      else { pts.push(P(u0, top), P(u1, top)); flush(); pts.push(P(u1, top), P(u1, yAt(u1 + 1e-3))); cur = u1; }
    }
    go(E); flush();
  }
  return mergeGeometries(segs);
}
const wn = new THREE.Mesh(wallTubeGeo([...cabinets, ...featured, ...eastGhostCabs], false), neon(C.pink, 3.5 * PINK_K)); wn.name = 'wallNeonRun'; room.add(wn);
const playables = [...cabinets, ...featured];   // (+ dsCab, pushed once room 2 exists)
// ---------- dev toggles (hidden ticket menu): NUMBERS badges over game cabinets, CLIPPING (walk through walls/doors) ----------
const DEV = { numbers: localStorage.getItem('neonarcade.dev.numbers') === '1', clip: localStorage.getItem('neonarcade.dev.clip') === '1', badges: [] };
{ // stable order: room 1 walk, north wall left->right then west wall; only cabinets with a game (blanks get no number)
  const order = ['0:0', '0:1', '0:3', '0:4', '1:2', '1:3', '1:4', '1:0', '1:1', '2:0', '2:1', '2:2', '2:3', '2:4'];
  let n = 0;
  for (const key of order) { const F = FEATURED[key]; if (!F) continue; n++;
    const cab = F[0]; cab.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(cab), ctr = b.getCenter(new THREE.Vector3());
    badge(String(n), '#ffe000', ctr.x, b.max.y + 0.55, ctr.z, { n, key, game: F[1] }); }
  // blank cabinets: cyan LETTER badges. Room 1 (west, south rows), then room 2 (its 19 instanced slots, slot order)
  let L = 0; const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', letter = k => (k >= 26 ? AB[Math.floor(k / 26) - 1] : '') + AB[k % 26];
  for (const cab of cabinets) { cab.updateMatrixWorld(true);
    if (cab.userData.wall === 'south' && cab.userData.index === 2) L += 2;   // C and D retired (MARS ROADSTER, #8); letters stay stable
    const b = new THREE.Box3().setFromObject(cab.getObjectByName('body')), ctr = b.getCenter(new THREE.Vector3());
    badge(letter(L), '#00e5ff', ctr.x, b.max.y + 0.55, ctr.z, { letter: letter(L), key: wallNames.indexOf(cab.userData.wall) + ':' + cab.userData.index, room: 1 }); L++; }
  for (const sl of slots) { const x = -sl.pos.x, z = Z2 - sl.pos.z;   // room 2 = room 1 rotated 180deg about (0, Z2)
    badge(letter(L), '#00e5ff', x, 2.65, z, { letter: letter(L), key: 'r2:' + sl.w + ':' + sl.i, room: 2 }); L++; }
}
function badge(txt, col, x, y, z, ud) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = col; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#000'; g.stroke();
  g.fillStyle = '#000'; g.font = '900 ' + (txt.length > 1 ? 60 : 78) + 'px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 68);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true })); sp.renderOrder = 999;
  sp.position.set(x, y, z); sp.scale.setScalar(1.4); sp.name = 'machineBadge_' + txt; sp.userData = ud;
  sp.visible = DEV.numbers; scene.add(sp); DEV.badges.push(sp); return sp;
}

DEV.set = (k, v) => { DEV[k] = !!v; localStorage.setItem('neonarcade.dev.' + (k === 'clip' ? 'clip' : 'numbers'), v ? '1' : '0'); if (k === 'numbers') DEV.badges.forEach(b => b.visible = !!v); };
window.__dev = DEV;
const obbs = blockers.filter(b => b.kind === 'obb');

// ---------- room 2: identical shell, rotated 180deg north of the hallway, 19 blank cabinets (instanced) ----------
const room2 = new THREE.Group(); room2.name = 'room2'; room2.position.set(0, 0, Z2); room2.rotation.y = Math.PI; scene.add(room2);
{
  const skip = new Set([mirror, floorTop, floorBase1, ...cabinets, ...featured, ...spots]);
  for (const ch of room.children) if (!skip.has(ch)) room2.add(ch.clone());
  const plane = new THREE.PlaneGeometry(HALF * 2, HALF * 2);
  const m2 = new Reflector(plane, { textureWidth: Math.round(innerWidth * dpr * Q.refl), textureHeight: Math.round(innerHeight * dpr * Q.refl), color: 0x8a8a96 });
  m2.rotation.x = -Math.PI / 2; m2.name = 'floorMirror2'; room2.add(m2); room2.userData.mirror = m2;
  const base = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ color: 0x05030a, roughness: 0.3, metalness: 0.6 })); base.rotation.x = -Math.PI / 2; base.position.y = -0.002; base.name = 'floorBase2'; room2.add(base); room2.userData.base = base;
  const ft = new THREE.Mesh(plane, floorTop.material); ft.rotation.x = -Math.PI / 2; ft.position.y = 0.004; ft.name = 'floorHex2'; room2.add(ft);
  // instanced blank cabinets: one InstancedMesh per part (neon parts per accent colour)
  const tmpl = {}, groups = {};
  for (const sl of slots) { (groups[sl.accent] ||= []).push(sl); tmpl[sl.accent] ||= makeCabinet(sl.accent); }
  const M = new THREE.Matrix4(), S = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  room2.userData.cabinetCount = slots.length; room2.userData.instanced = [];
  const shared = ['body', 'sidePanelL', 'sidePanelR', 'screen', 'marquee', 'controlPanel', 'frontPanel'];
  const parts = [...shared.map(n => [n, null]), ...Object.keys(groups).flatMap(a => [['neonEdges', +a], ['neonBase', +a]])];
  const anyT = tmpl[slots[0].accent];
  for (const [name, acc] of parts) {
    const list = acc === null ? slots : groups[acc], src = (acc === null ? anyT : tmpl[acc]).getObjectByName(name);
    src.updateMatrix();
    const im = new THREE.InstancedMesh(src.geometry, src.material, list.length); im.name = 'cab2_' + name + (acc === null ? '' : '_' + acc.toString(16));
    list.forEach((sl, k) => { M.compose(sl.pos, q.setFromAxisAngle(up, sl.rotY), one).multiply(S.copy(src.matrix)); im.setMatrixAt(k, M); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); room2.add(im); room2.userData.instanced.push(im);
  }
  // collision: room 1 plinths + one box per cabinet body, mapped into room 2 (x -> -x, z -> Z2 - z)
  const map = b => ({ minX: -b.maxX, maxX: -b.minX, minZ: Z2 - b.maxZ, maxZ: Z2 - b.minZ, kind: b.kind + '2' });
  for (const b of blockers.filter(b => b.kind === 'plinth')) blockers.push(map(b));
  const bodyBox = new THREE.Box3(); anyT.getObjectByName('body').geometry.computeBoundingBox();
  for (const sl of slots) { bodyBox.copy(anyT.getObjectByName('body').geometry.boundingBox).applyMatrix4(M.compose(sl.pos, q.setFromAxisAngle(up, sl.rotY), one)); blockers.push(map({ minX: bodyBox.min.x, maxX: bodyBox.max.x, minZ: bodyBox.min.z, maxZ: bodyBox.max.z, kind: 'cabinet' })); }
}
// ---------- DEAD SIGNAL VR STATION (#9): free-standing in the exact middle of room 2, screen to the north, the open front faces the doorway ----------
const dsCab = buildDeadSignalStation(); dsCab.rotation.y = Math.PI; room2.add(dsCab);   // room2 is rotated PI: net world rotation 0 (local +z = world +z = toward the door)
{ const c = new THREE.Vector3(0, 0, Z2);
  Object.assign(dsCab.userData, { wall: 'room2', index: -1, centre: c, front: new THREE.Vector3(0, 0, Z2 + DS.R + 0.65), name: 'deadsignal' });
  dsCab.name = 'deadSignalStation'; room2.updateMatrixWorld(true); dsCab.userData.updateCable();
  blockers.push({ kind: 'circle', name: 'deadsignal', cx: 0, cz: Z2, r: DS.R + 0.05 });                                  // the round platform
  blockers.push({ minX: -2.45, maxX: 2.45, minZ: Z2 + DS.SCR_Z - 0.45, maxZ: Z2 + DS.SCR_Z + 0.75, kind: 'cabinet', name: 'deadsignalScreen' });   // the curved screen behind it
  playables.push(dsCab);
  const nGames = DEV.badges.filter(b => b.userData.n).length;   // next machine number after room 1's games (= 9)
  badge(String(nGames + 1), '#ffe000', 0, 6.0, Z2 - 1.2, { n: nGames + 1, key: 'r2:centre', game: 'deadsignal' });
}
// ---------- room 1 east wall -> space window (after room 2 cloned the shell, so room 2 keeps its wall, plinth and cabinets) ----------
{
  room.getObjectByName('wall3').visible = false;
  for (const n of ['plinth_east', 'plinthLip_east', 'plinthLip2_east', 'ledge3']) room.getObjectByName(n).visible = false;
  for (let i = blockers.length - 1; i >= 0; i--) if (blockers[i].kind === 'plinth' && blockers[i].wall === 'east') blockers.splice(i, 1);
  wallBands.forEach((m, k) => { m.geometry = mergeGeometries(bandsNoEast[k]); });   // the coloured bands stop at the glass
  wn.geometry = wallTubeGeo([...cabinets, ...featured], true);                       // pink tube runs flat along the bottom of the glass
  spaceWin = setupSpaceWindow({ scene, room, renderer, HALF, H, isMobile: MOBILE, getMonkey: () => monkey, getCamera: () => camera });
}
// ---------- room 1 floor option: neon reflective (default) or cream character carpet (Options > FLOOR) ----------
const FLOOR_KEY = 'neonarcade.floor';
const carpetTex = new THREE.TextureLoader().load('tex/carpet.webp', () => spaceWin && floorMode === 'carpet' && spaceWin.dirty());
carpetTex.colorSpace = THREE.SRGBColorSpace; carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;   // seamless tile (edge-cut figures removed): plain repeat, never mirrored (mirroring put copies head to head)
carpetTex.repeat.set(3, 3); carpetTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
// the carpet covers every walkable floor (Dave: 'when a floor is selected have it cover all floors'): room 1 + hallway (one mesh,
// UVs in metres so the tile keeps room 1's scale), room 2 (carpet2) and the teleporter white room (carpetW, added in carpetWhite()).
const worldUV = g => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (HALF * 2) + 0.5, p.getY(i) / (HALF * 2) + 0.5); return g; };
const carpetGeo = mergeGeometries([worldUV(new THREE.PlaneGeometry(HALF * 2, HALF * 2)), worldUV(new THREE.PlaneGeometry(DOOR_W, HALL_L + 0.02).translate(0, HALF + HALL_L / 2, 0))]);
const carpet = new THREE.Mesh(carpetGeo, new THREE.MeshStandardMaterial({
  map: carpetTex, color: 0xe8ded0, roughness: 1, metalness: 0, emissive: 0xfff0dc, emissiveMap: carpetTex, emissiveIntensity: 0.3 }));   // matte; a little self-light keeps cream warm under the neon
carpet.rotation.x = -Math.PI / 2; carpet.position.y = 0.005; carpet.name = 'carpet1'; carpet.visible = false; room.add(carpet);
const carpet2 = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), carpet.material); carpet2.rotation.x = -Math.PI / 2; carpet2.position.y = 0.005; carpet2.name = 'carpet2'; carpet2.visible = false; room2.add(carpet2);
let carpetW = null;
function carpetWhite() {   // white room floor plane lives in teleport.js (shop.js only scales it); the carpet rides on it as a child so it follows the shop's size
  if (carpetW || !tp) return carpetW; const fl = tp.whiteRoom.children.find(o => o.isMesh && o.geometry.type === 'PlaneGeometry' && o.rotation.x < -1.5 && Math.abs(o.position.y) < 1e-3); if (!fl) return null;
  const t = carpetTex.clone(); t.repeat.set(3 * fl.scale.x, 3 * fl.scale.y); t.needsUpdate = true;
  const m = floorMats.carpet.clone(); m.map = m.emissiveMap = t;
  carpetW = new THREE.Mesh(fl.geometry, m); carpetW.position.z = 0.005; carpetW.name = 'carpetW'; carpetW.userData.carpetMat = m; carpetW.visible = false; fl.add(carpetW); return carpetW; }
// ---------- CHECKERS (black + gold 1 m checkerboard, slight gloss) and LAVA ('floor is lava' with cave-rock paths) ----------
// both tile by WORLD x/z in the shader, so one material covers room 1 + hallway, room 2 and the white room at the same scale.
const floorWP = (sh, head) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFW;').replace('#include <project_vertex>', '#include <project_vertex>\nvFW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFW;\n' + head); };
const checkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.2 });
checkMat.onBeforeCompile = sh => { floorWP(sh, '');
  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `vec2 cq = floor(vFW.xz + 0.5); float ck = mod(cq.x + cq.y, 2.0);
    vec2 fe = abs(fract(vFW.xz + 0.5) - 0.5); float gr = smoothstep(0.485, 0.5, max(fe.x, fe.y));
    diffuseColor.rgb = mix(vec3(0.015, 0.013, 0.012), vec3(0.26, 0.15, 0.02), ck) * (1.0 - 0.55 * gr); float fCk = ck * (1.0 - gr);`)
    .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = vec3(0.40, 0.22, 0.025) * fCk;'); };   // gold is self-lit so the pink neon doesn't turn it pink
checkMat.emissive.setHex(0xffffff);
const lavaU = { uT: { value: 0 } };
// cave paths (world x, z): capsule segments [x1, z1, x2, z2] and rings [cx, cz, r]; half width 0.8 m
const LS = [], LR = [], rect = (cx, cz, h) => LS.push([cx - h, cz - h, cx + h, cz - h], [cx + h, cz - h, cx + h, cz + h], [cx + h, cz + h, cx - h, cz + h], [cx - h, cz + h, cx - h, cz - h]);
rect(0, 0, 9.9); rect(0, Z2, 9.9); rect(WX, 0, 9.9);                                  // along the cabinet fronts of each room
LS.push([0, 9.9, 0, 1.9], [0, -1.9, 0, Z2 + 2.7], [0, Z2 - 2.7, 0, Z2 - 9.9], [-9.9, Z2, -2.7, Z2], [2.7, Z2, 9.9, Z2],   // doorways, hallway centre, room 2 spokes
  [-9.9, -9.9, -10.75 + 1.2, -10.75 + 1.2], [WX - 9.9, 0, WX - 1.8, 0], [WX + 1.8, 0, WX + 9.9, 0], [WX, 1.8, WX, 9.9], [WX, -1.8, WX, -9.9]);
LR.push([0, 0, 1.9], [-10.75, -10.75, 1.75], [0, Z2, 2.7], [WX, 0, 1.8]);                 // round the kiosk, teleporter pads, Dead Signal station
const v4 = a => new THREE.Vector4(a[0], a[1], a[2], a[3] || 0);
lavaU.uS = { value: LS.map(v4) }; lavaU.uR = { value: LR.map(v4) };
const lavaMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
lavaMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, lavaU);
  floorWP(sh, `uniform float uT; uniform vec4 uS[${LS.length}]; uniform vec4 uR[${LR.length}];
    float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float ln(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(lh(i), lh(i + vec2(1, 0)), f.x), mix(lh(i + vec2(0, 1)), lh(i + vec2(1, 1)), f.x), f.y); }
    float lf(vec2 p) { return ln(p) * 0.55 + ln(p * 2.1 + 3.7) * 0.3 + ln(p * 4.3 + 9.1) * 0.15; }`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `vec2 p = vFW.xz; float d = 1e3;
    for (int i = 0; i < ${LS.length}; i++) { vec2 a = uS[i].xy, b = uS[i].zw, ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0); d = min(d, length(p - a - ab * h)); }
    for (int i = 0; i < ${LR.length}; i++) d = min(d, abs(length(p - uR[i].xy) - uR[i].z));
    d += (lf(p * 1.6) - 0.5) * 0.45;                                                     // rough, irregular rock edges
    float rock = 1.0 - smoothstep(0.9, 0.98, d);
    float fl = lf(p * 0.7 + vec2(uT * 0.05, uT * 0.03)) + 0.5 * lf(p * 1.9 - vec2(uT * 0.08, -uT * 0.04));
    float crust = smoothstep(0.62, 0.78, lf(p * 2.3 + vec2(0.0, uT * 0.02)));            // dark cooled crust cracks floating on the lava
    float pulse = 0.88 + 0.12 * sin(uT * 1.3 + fl * 4.0);
    vec3 lava = mix(vec3(0.32, 0.03, 0.005), vec3(0.88, 0.32, 0.03), smoothstep(0.7, 1.3, fl)) * pulse;
    lava = mix(lava, vec3(0.05, 0.02, 0.015), crust * 0.9);
    float rn = lf(p * 3.0), rs = lf(p * 9.0);
    vec3 stone = vec3(0.075, 0.065, 0.06) * (0.55 + 0.7 * rn) * (0.7 + 0.5 * rs);
    stone *= 0.75 + 0.35 * smoothstep(0.95, 0.5, d);                                       // edges sink toward the lava: raised look
    stone += vec3(0.5, 0.12, 0.02) * smoothstep(0.7, 0.96, d) * 0.3;                       // heat glow on the rim
    diffuseColor.rgb = mix(lava, stone, rock);`); };
const floorMats = { carpet: carpet.material, checkers: checkMat, lava: lavaMat };
for (const m of [carpet, carpet2]) m.onBeforeRender = () => { lavaU.uT.value = performance.now() / 1000 % 1000; };
// with the carpet on, the reflector / hex overlay only cover the hallway (room 1 no longer pays for a mirror pass there)
let floorMode = 'neon';
function setFloor(mode) {
  floorMode = floorMats[mode] ? mode : 'neon'; const c = floorMode !== 'neon';
  if (c) carpet.material = carpet2.material = floorMats[floorMode];
  carpet.visible = carpet2.visible = c; floorTop.visible = room2.getObjectByName('floorHex2').visible = !c;   // mirrors/bases are hidden per frame in cullRooms
  const cw = carpetWhite(); if (cw) { cw.visible = c; if (c) cw.material = floorMode === 'carpet' ? cw.userData.carpetMat : floorMats[floorMode]; cw.onBeforeRender = carpet.onBeforeRender; }
  if (c) mirror.visible = floorBase1.visible = room2.userData.mirror.visible = room2.userData.base.visible = false;   // right away (cullRooms keeps them off every frame)
  if (spaceWin) spaceWin.dirty();
  try { localStorage.setItem(FLOOR_KEY, floorMode); } catch (e) {}
  return floorMode;
}
try { const f = localStorage.getItem(FLOOR_KEY); if (floorMats[f]) setFloor(f); } catch (e) {}
window.__setFloor = setFloor;   // the start screen's Options menu calls this

// which room is the camera in, and can it see the other one through a doorway?
const doorBox1 = new THREE.Box3(new THREE.Vector3(-DOOR_W / 2, 0, -HALF - 0.05), new THREE.Vector3(DOOR_W / 2, DOOR_H, -HALF + 0.05));
const doorBox2 = new THREE.Box3(new THREE.Vector3(-DOOR_W / 2, 0, -HALF - HALL_L - 0.05), new THREE.Vector3(DOOR_W / 2, DOOR_H, -HALF - HALL_L + 0.05));
let lightsIn = 1;
// the floor reflection skips the far room (it is only a slit through the doorway): saves a second draw of it in the mirror pass
const skipFar = (m, far) => { const orig = m.onBeforeRender; m.onBeforeRender = function (...args) { const v = far.visible; far.visible = false; try { orig.apply(this, args); } finally { far.visible = v; } }; };
skipFar(mirror, room2); skipFar(room2.userData.mirror, room);
function cullRooms(fr) {
  const inW = camera.position.x > WX / 2; if (tp) tp.whiteRoom.visible = inW;
  hall.visible = !inW;
  if (inW) { room.visible = room2.visible = false; mirror.visible = false; room2.userData.mirror.visible = false; return; }
  const z = camera.position.z, in1 = z > -HALF, in2 = z < -HALF - HALL_L;
  room.visible = !in2 || fr.intersectsBox(doorBox2);
  room2.visible = !in1 || fr.intersectsBox(doorBox1);
  const deep = !in1; room2.userData.mirror.visible = deep; room2.userData.base.visible = !deep; // far room seen through the door: no second reflector pass
  mirror.visible = !in2; floorBase1.visible = in2;
  if (floorMode !== 'neon') mirror.visible = floorBase1.visible = room2.userData.mirror.visible = room2.userData.base.visible = false;   // carpet everywhere: no reflector passes
  const want = monkey.position.z < -HALF - HALL_L / 2 ? 2 : 1; // the 6 room lights follow the monkey (constant light count: no shader recompiles)
  if (want !== lightsIn) { lightsIn = want; for (const l of roomLights) { const [x, y, zz] = l.userData.p1; if (want === 1) l.position.set(x, y, zz); else l.position.set(-x, y, Z2 - zz); } }
}

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

function makeMonkey() { // "Arcade Kid": cartoon monkey, no tail, pink cap, tie-dye tee, open navy bomber, headphones, gold ticket pin, jeans, plain high-tops
  const mk = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o));
  const fur = mk(0x4e2a14, { roughness: 0.95, emissive: 0x100804 }), tan = mk(0xd9a779, { roughness: 0.7, emissive: 0x2a1a0c }), navy = mk(0x1d2452, { roughness: 0.75 }), navyD = mk(0x1d2452, { roughness: 0.75, side: THREE.DoubleSide });
  const rib = mk(0x141a3a, { roughness: 0.9 }), pink = mk(0xff4f9e, { roughness: 0.6 }), pinkD = mk(0xd93a82, { roughness: 0.6 }), cream = mk(0xf1e8d6, { roughness: 0.6 }), maroon = mk(0x8a1e2c, { roughness: 0.55 }), hp = mk(0x18181f, { roughness: 0.35 }), iris = mk(0x8a4c1a, { roughness: 0.3, emissive: 0x2a1404 }), lip = mk(0x3a1a10, { roughness: 0.5 });
  const root = new THREE.Group(); root.name = 'monkey';
  const hips = new THREE.Group(); hips.position.y = 0.8; root.add(hips);
  part(hips, CYL(0.2, 0.21, 0.16, 20), M.jeans, 0, 0, 0, 1, 1, 0.8);
  part(hips, CYL(0.205, 0.205, 0.03, 20), M.dark, 0, 0.07, 0, 1, 1, 0.8);
  const legs = [];
  for (const sd of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.1 * sd, -0.04, 0); hips.add(leg);
    part(leg, CYL(0.11, 0.115, 0.42, 14), M.jeans, 0, -0.2, 0);
    const knee = new THREE.Group(); knee.position.y = -0.4; leg.add(knee);
    part(knee, CYL(0.115, 0.13, 0.3, 14), M.jeans, 0, -0.14, 0);
    part(knee, CYL(0.13, 0.13, 0.05, 14), M.jeans, 0, -0.27, 0, 1.03, 1, 1.03); // cuff
    const shoe = new THREE.Group(); shoe.position.set(0, -0.34, 0.04); knee.add(shoe);
    part(shoe, CYL(0.095, 0.1, 0.14, 14), cream, 0, 0.04, -0.03);          // high-top ankle
    part(shoe, CYL(0.1, 0.1, 0.025, 14), maroon, 0, 0.11, -0.03);          // collar
    part(shoe, new THREE.BoxGeometry(0.17, 0.1, 0.26), cream, 0, -0.01, 0.02);
    part(shoe, S(0.088, 14, 10), maroon, 0, -0.01, 0.13, 0.98, 0.6, 0.75);  // toe box
    part(shoe, new THREE.BoxGeometry(0.185, 0.045, 0.34), M.white, 0, -0.065, 0.03); // sole
    part(shoe, new THREE.BoxGeometry(0.176, 0.06, 0.09), maroon, 0, 0.0, -0.09);    // heel panel
    for (let i = 0; i < 3; i++) part(shoe, new THREE.BoxGeometry(0.08, 0.012, 0.015), M.white, 0, 0.055 - i * 0.025 + 0.01, 0.06 + i * 0.03).rotation.x = -0.5; // laces
    legs.push({ leg, knee });
  }
  const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
  const shirt = part(torso, CYL(0.24, 0.27, 0.56, 22), M.shirt, 0, 0.26, 0, 1, 1, 0.76); shirt.rotation.y = -Math.PI / 2;
  part(torso, S(0.25), M.shirt, 0, 0.5, 0, 1.12, 0.42, 0.78);
  // open bomber: body shell with a gap at the front, ribbed hem, collar, zip edges
  const gap = 0.42;
  part(torso, new THREE.CylinderGeometry(0.265, 0.29, 0.5, 26, 1, true, gap, Math.PI * 2 - gap * 2), navyD, 0, 0.29, 0, 1, 1, 1.06);
  part(torso, new THREE.CylinderGeometry(0.29, 0.28, 0.07, 26, 1, true, gap, Math.PI * 2 - gap * 2), rib, 0, 0.03, 0, 1.01, 1, 1.07);
  part(torso, new THREE.SphereGeometry(0.27, 26, 10, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 0, Math.PI / 2), navyD, 0, 0.53, 0, 1.12, 0.42, 1.06);
  const col = part(torso, new THREE.TorusGeometry(0.15, 0.03, 8, 24, Math.PI * 1.5), rib, 0, 0.61, -0.01, 1.05, 1, 1.1); col.rotation.set(Math.PI / 2, 0, Math.PI * 0.75);
  for (const sd of [-1, 1]) { const zx = Math.sin(gap) * 0.27 * sd, zz = Math.cos(gap) * 0.27 * 1.06; part(torso, new THREE.BoxGeometry(0.014, 0.5, 0.014), M.gold, zx, 0.29, zz + 0.012); }
  // front welt pockets on the bomber (hands go in here when idle)
  for (const sd of [-1, 1]) { const pk = part(torso, new THREE.BoxGeometry(0.15, 0.03, 0.03), rib, 0.19 * sd, 0.15, 0.255); pk.rotation.set(-0.15, -0.62 * sd, -0.35 * sd); pk.name = 'pocket'; }
  // gold monkey-ticket pin on the left chest
  const pin = new THREE.Group(); pin.position.set(0.2, 0.42, 0.25); pin.rotation.y = 0.55; torso.add(pin);
  part(pin, new THREE.BoxGeometry(0.075, 0.05, 0.01), M.gold); part(pin, S(0.017, 10, 8), fur, 0, 0.003, 0.008, 1, 1, 0.5); part(pin, S(0.011, 8, 6), tan, 0, -0.001, 0.014, 1, 0.8, 0.4);
  for (const sx of [-1, 1]) part(pin, S(0.008, 6, 4), tan, sx * 0.018, 0.012, 0.008, 1, 1, 0.4);
  const neck = new THREE.Group(); neck.position.y = 0.58; torso.add(neck);
  part(neck, CYL(0.075, 0.085, 0.12), fur, 0, 0.02, 0);
  // headphones resting around the neck
  const band = part(neck, new THREE.TorusGeometry(0.13, 0.018, 8, 26, Math.PI * 1.15), hp, 0, -0.02, -0.03, 1, 1, 1); band.rotation.set(Math.PI / 2 - 0.25, 0, Math.PI * 0.95);
  for (const sd of [-1, 1]) { const cup = part(neck, CYL(0.055, 0.055, 0.04, 18), hp, 0.115 * sd, -0.02, 0.07, 1, 1, 1); cup.rotation.set(0.3, 0, Math.PI / 2 + 0.35 * sd); const ring = part(cup, new THREE.TorusGeometry(0.05, 0.008, 6, 18), pink, 0, 0.021 * -sd, 0); ring.rotation.x = Math.PI / 2; }
  // head
  const head = new THREE.Group(); head.position.y = 0.08; neck.add(head);
  part(head, S(0.18, 28, 20), fur, 0, 0.15, -0.01, 1, 1.02, 0.98);
  part(head, S(0.11, 24, 16), tan, 0.045, 0.16, 0.095, 0.75, 0.9, 0.75);   // heart-shaped face mask (two lobes)
  part(head, S(0.11, 24, 16), tan, -0.045, 0.16, 0.095, 0.75, 0.9, 0.75);
  part(head, S(0.11, 24, 16), tan, 0, 0.07, 0.13, 1.1, 0.8, 0.85);         // muzzle
  part(head, S(0.05, 16, 10), fur, 0, 0.215, 0.165, 2.7, 0.4, 0.6);         // brow
  for (const sd of [-1, 1]) {
    part(head, S(0.046, 16, 12), M.white, 0.06 * sd, 0.165, 0.175, 1, 1.15, 0.7);
    part(head, S(0.03, 14, 10), iris, 0.058 * sd, 0.163, 0.2, 1, 1.1, 0.6);
    part(head, S(0.017, 10, 8), M.dark, 0.057 * sd, 0.163, 0.214, 1, 1.1, 0.5);
    part(head, S(0.007, 6, 4), M.white, 0.048 * sd, 0.178, 0.222);
    part(head, S(0.07, 16, 12), fur, 0.185 * sd, 0.15, 0, 0.45, 1, 0.9);   // ear
    part(head, S(0.05, 14, 10), tan, 0.2 * sd, 0.15, 0.01, 0.3, 0.85, 0.75);
    part(head, S(0.011, 6, 4), lip, 0.022 * sd, 0.1, 0.225);                 // nostril
  }
  const smile = part(head, new THREE.TorusGeometry(0.055, 0.008, 6, 20, Math.PI * 0.8), lip, 0, 0.065, 0.214); smile.rotation.set(-0.35, 0, Math.PI + Math.PI * 0.1);
  for (const sd of [-1, 1]) part(head, S(0.01, 6, 4), lip, 0.05 * sd, 0.058, 0.205);
  // pink baseball cap, brim forward
  const cap = new THREE.Group(); cap.position.set(0, 0.215, -0.005); cap.rotation.x = -0.08; head.add(cap);
  part(cap, new THREE.SphereGeometry(0.188, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), pink, 0, 0, 0, 1, 0.82, 1.03);
  part(cap, new THREE.CylinderGeometry(0.19, 0.19, 0.03, 24, 1, true), pinkD, 0, 0.005, 0, 1, 1, 1.03);
  part(cap, new THREE.CylinderGeometry(0.15, 0.15, 0.014, 22, 1, false, -Math.PI * 0.5, Math.PI), pinkD, 0, -0.005, 0.17, 1, 1, 1.0).rotation.x = 0.1;
  part(cap, S(0.018, 8, 6), pinkD, 0, 0.152, 0);
  // arms: navy bomber sleeves with ribbed cuffs, tan hands
  const arms = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.29 * sd, 0.47, 0); torso.add(sh);
    part(sh, S(0.105, 16, 12), navy, 0.01 * sd, -0.02, 0);
    part(sh, CYL(0.09, 0.08, 0.34, 14), navy, 0.02 * sd, -0.17, 0);
    const el = new THREE.Group(); el.position.set(0.02 * sd, -0.34, 0); sh.add(el);
    part(el, S(0.08, 12, 10), navy, 0, 0, 0);
    part(el, CYL(0.078, 0.068, 0.24, 14), navy, 0, -0.12, 0);
    part(el, CYL(0.066, 0.06, 0.05, 14), rib, 0, -0.26, 0);
    const hand = part(el, S(0.058, 14, 10), tan, 0, -0.32, 0.01, 0.8, 1.05, 1);
    part(hand, S(0.022, 8, 6), tan, -0.035 * sd, 0.01, 0.035, 1, 1.6, 1);   // thumb
    for (let f = 0; f < 3; f++) part(hand, CYL(0.013, 0.012, 0.06, 6), tan, (f - 1) * 0.024, -0.06, 0.012);
    arms.push({ sh, el, hand, sd });
  }
  // idle prop: a small phone with a glowing generic dark feed (placeholder posts, no real content), held in the right hand
  const phone = new THREE.Group(); phone.name = 'idlePhone'; phone.visible = false;
  const pcv = document.createElement('canvas'); pcv.width = 128; pcv.height = 256; const ptex = new THREE.CanvasTexture(pcv); ptex.colorSpace = THREE.SRGBColorSpace;
  part(phone, new THREE.BoxGeometry(0.075, 0.14, 0.009), mk(0x111116, { roughness: 0.3, metalness: 0.6 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.128), new THREE.MeshBasicMaterial({ map: ptex, color: 0xe0e8f4 })); scr.position.z = 0.0052; phone.add(scr);
  arms[1].el.add(phone); phone.position.set(0.0, -0.36, 0.06); phone.rotation.set(-0.2, 0.75, -2.1);   // screen tipped up toward his eyes (angled a little outward, as people hold them), top pointing away
  root.userData = { hips, torso, neck, head, legs, arms, phone, pcv, ptex };
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
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * Q.bloom, innerHeight * Q.bloom), 0.75, 0.5, 0.4); bloom.highPassUniforms.smoothWidth.value = 0.6;   // soft knee 0.4..1.0 (was a hard cut at 0.85): cyan/amber tubes (lum >= 1) bloom as before, the 70% pink strips (lum ~0.68) keep a weaker halo instead of losing it
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 72 : 60; camera.updateProjectionMatrix();
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight); composer.setPixelRatio(dpr); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth * Q.bloom, innerHeight * Q.bloom);
  room2.userData.mirror?.getRenderTarget().setSize(Math.round(innerWidth * dpr * Q.refl), Math.round(innerHeight * dpr * Q.refl));
  mirror.getRenderTarget().setSize(Math.round(innerWidth * dpr * Q.refl), Math.round(innerHeight * dpr * Q.refl));
}
addEventListener('resize', resize); resize();

// ---------- simulation ----------
const R = 0.3, LIM = HALF - 0.35;
// walkable areas: union of axis boxes (room 1, hallway [, room 2]); clamp to the nearest one
const AREAS = [{ x0: -LIM, x1: LIM, z0: -LIM, z1: LIM }, { x0: -DOOR_W / 2 + (HALF - LIM), x1: DOOR_W / 2 - (HALF - LIM), z0: Z2 + LIM - 0.01, z1: -LIM + 0.01 }, { x0: -LIM, x1: LIM, z0: Z2 - LIM, z1: Z2 + LIM }, { x0: WX - LIM, x1: WX + LIM, z0: -LIM, z1: LIM }];   // last: teleporter white room
function clampAreas(p, areas, pad = 0) {
  let best = null, bd = 1e9;
  for (const a of areas) { const x = THREE.MathUtils.clamp(p.x, a.x0 - pad, a.x1 + pad), z = THREE.MathUtils.clamp(p.z, a.z0 - pad, a.z1 + pad), d = (x - p.x) ** 2 + (z - p.z) ** 2; if (d < bd) { bd = d; best = [x, z]; } if (!d) break; }
  p.x = best[0]; p.z = best[1]; return p;
}
let shield = null, kiosk = null, tp = null, shop = null;   // red energy shield in the doorway (shield.js)
const CLIP_AREA = [{ x0: -LIM, x1: LIM, z0: Z2 - LIM, z1: LIM }, { x0: WX - LIM, x1: WX + LIM, z0: -LIM, z1: LIM }];   // noclip: outer building envelope only (both rooms + hallway span)
function collide(p) {
  if (DEV.clip) { clampAreas(p, CLIP_AREA); collideCabs(p); return; }   // walls, doors, shield and plinths off; cabinets stay solid
  clampAreas(p, AREAS);
  if (shield) shield.block(p, R);
  collideCabs(p, false);
}
function collideCabs(p, onlyCabs = true) {
  for (const b of blockers) {
    if (onlyCabs && /plinth/.test(b.kind)) continue;
    if (b.kind === 'circle') { const dx = p.x - b.cx, dz = p.z - b.cz, d = Math.hypot(dx, dz), rr = b.r + R; if (d < rr) { const k = d > 1e-6 ? rr / d : 0; if (k) { p.x = b.cx + dx * k; p.z = b.cz + dz * k; } else p.z = b.cz + rr; } continue; }
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
const CAM_AREAS = [{ x0: -(HALF - 0.3), x1: HALF - 0.3, z0: -(HALF - 0.3), z1: HALF - 0.3 }, { x0: -DOOR_W / 2 + 0.5, x1: DOOR_W / 2 - 0.5, z0: -HALF - HALL_L - 0.35, z1: -HALF + 0.35 }, { x0: -(HALF - 0.3), x1: HALF - 0.3, z0: Z2 - (HALF - 0.3), z1: Z2 + HALF - 0.3 }, { x0: WX - (HALF - 0.3), x1: WX + HALF - 0.3, z0: -(HALF - 0.3), z1: HALF - 0.3 }];
const inHallZ = z => z < -HALF + 0.3 && z > -HALF - HALL_L - 0.3;
function camClamp(q) { clampAreas(q, CAM_AREAS); if (inHallZ(q.z)) q.y = Math.min(q.y, DOOR_H - 0.25); return q; }
function camPush(q) { if (DEV.clip) { clampAreas(q, [{ x0: -HALF + 0.3, x1: HALF - 0.3, z0: Z2 - HALF + 0.3, z1: HALF - 0.3 }, CAM_AREAS[3]]); return q; } // keep the camera inside the walls and outside the STRIKE cabinet (continuous push-out, no ray snapping)
  camClamp(q);
  for (const b of obbs) {
  if (q.y > b.h + 0.2) continue;
  const c = Math.cos(b.ang), sn = Math.sin(b.ang), rx = q.x - b.ox, rz = q.z - b.oz; let lx = c * rx - sn * rz, lz = sn * rx + c * rz;
  const x0 = b.x0 - 0.2, x1 = b.x1 + 0.2, hz = b.hz + 0.2;
  if (lx > x0 && lx < x1 && Math.abs(lz) < hz) {
    const o = [lx - x0, x1 - lx, lz + hz, hz - lz], mn = Math.min(...o);
    if (mn === o[1]) lx = x1; else if (mn === o[0]) lx = x0; else if (mn === o[2]) lz = -hz; else lz = hz;
    q.x = b.ox + c * lx + sn * lz; q.z = b.oz - sn * lx + c * lz;
    camClamp(q);
  }
  }
  if (shield) shield.camBlock(q);
  if (q.y < 1.4) { const dx = q.x, dz = q.z - Z2, d = Math.hypot(dx, dz), rr = DS.R + 0.25; if (d < rr && d > 1e-6) { q.x = dx * rr / d; q.z = Z2 + dz * rr / d; } }   // DEAD SIGNAL platform + rails
  return q;
}
// when the monkey walks up to the STRIKE cabinet, ease the camera round to a three-quarter view (unless the player is steering the camera)
function showcase(dt) {
  if (tp && (tp.locked || tp.near < tp.R + 0.6)) { st.showK = 0; return; }   // on the teleporter pad: no cabinet showcase swing
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
  if (tp && tp.locked) { ix = iz = mag = 0; run = false; }   // teleporting: input locked
  st.inMag = mag; st.lastStep = st.t;
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
    if (c === dsCab) { const u = c.userData, dx = u.centre.x - monkey.position.x, dz = u.centre.z - monkey.position.z, d = Math.hypot(dx, dz);   // walk up to the open front
      if (d < DS.R + 1.25 && -dz > DS.R - 0.2 && Math.abs(dx) < 1.6 && (Math.sin(st.face) * dx + Math.cos(st.face) * dz) / d > 0.6) nearCab = c;
      continue; }
    if (c === roadsterCab) { const u = c.userData, mx = monkey.position.x, mz = monkey.position.z;   // pick the nearest seat at the open end
      if (Math.abs(mx - c.position.x) < MR.W / 2 - 0.1 && mz < u.zEnd + 0.05 && mz > u.zEnd - 1.3 && Math.cos(st.face) > 0.5) {
        const seat = Math.abs(mx - u.seats.L.world.x) < Math.abs(mx - u.seats.R.world.x) ? 'L' : 'R';
        u.seat = seat; u.screen = u.screens[seat === 'L' ? 0 : 1]; nearCab = c; }
      continue; }
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
    if (shield) shield.camBlock(camera.position);
    camera.lookAt(camera.position.x - Math.sin(st.yaw) * Math.cos(st.pitch), camera.position.y - Math.sin(st.pitch - 0.28), camera.position.z - Math.cos(st.yaw) * Math.cos(st.pitch));
    monkey.visible = false;
  } else {
    monkey.visible = true;
    showcase(dt);
    const dir = tmp.set(Math.sin(st.yaw) * Math.cos(st.pitch), Math.sin(st.pitch), Math.cos(st.yaw) * Math.cos(st.pitch));
    camPos.copy(dir).multiplyScalar(st.dist).add(camTarget);
    camPush(camPos);
    camPos.y = THREE.MathUtils.clamp(camPos.y, 0.25, inHallZ(camPos.z) ? DOOR_H - 0.25 : H - 1.2);
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

  idlePose(dt, u, sw);
}

// ---------- idle: 5 s still -> hands in jacket pockets (+ breathing); 10 s -> phone out, scrolling a generic dark feed ----------
const idle = { t: 0, wP: 0, wF: 0, state: 'none', scroll: 0, flick: 0, nextFlick: 0, drawn: -1, moves: 0 };
window.__neonPlayer = { get idleState() { return idle.state; }, get idleT() { return idle.t; }, get wPocket() { return idle.wP; }, get wPhone() { return idle.wF; }, idle };
function drawFeed(u) {   // placeholder X-style feed: grey/white blocks only, no real posts or people
  const g = u.pcv.getContext('2d'), W = 128, Hc = 256; g.fillStyle = '#000'; g.fillRect(0, 0, W, Hc);
  const off = idle.scroll % 96;
  for (let i = -1; i < 5; i++) { const y = 30 + i * 96 - off, k = (Math.floor(idle.scroll / 96) + i) & 3;
    g.fillStyle = '#3a3f47'; g.beginPath(); g.arc(14, y + 10, 7, 0, 7); g.fill();
    g.fillStyle = '#e7e9ea'; g.fillRect(26, y + 5, 44, 5); g.fillStyle = '#71767b'; g.fillRect(74, y + 5, 26, 5);
    g.fillStyle = '#d0d3d6'; g.fillRect(26, y + 16, 92, 4); g.fillRect(26, y + 24, 78 - k * 8, 4);
    if (k % 2 === 0) { const gr = g.createLinearGradient(26, y + 34, 118, y + 78); gr.addColorStop(0, ['#1d3b5c', '#4a2a5c'][k >> 1]); gr.addColorStop(1, ['#3d7ab8', '#c65a8a'][k >> 1]); g.fillStyle = gr; g.fillRect(26, y + 34, 92, 46); }
    else { g.fillStyle = '#c4c7ca'; g.fillRect(26, y + 32, 86, 4); g.fillRect(26, y + 40, 60, 4); }
    g.fillStyle = '#2f3336'; g.fillRect(0, y + 88, W, 1); }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, 22); g.fillStyle = '#2f3336'; g.fillRect(0, 22, W, 1);
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'butt'; g.beginPath(); g.moveTo(57, 5); g.lineTo(71, 18); g.moveTo(71, 5); g.lineTo(57, 18); g.stroke();   // X mark
  u.ptex.needsUpdate = true; }
function idlePose(dt, u, sw) {
  const L = THREE.MathUtils.lerp, busy = st.play > 0.3 || (window.__inv && window.__inv.open) || window.__optsOpen || document.getElementById('start') && !(window.__start && window.__start.dismissed);
  const moving = (st.inMag || 0) > 0.01 || st.speed > 0.15 || busy || st.t - (st.lastStep || 0) > 0.2;
  if (moving) { if (idle.t > 0.5) idle.moves++; idle.t = 0; } else idle.t += dt * (window.__idleTimeScale || 1);   // tests may speed the idle clock up (slow software GL)
  idle.state = idle.t >= 10 ? 'phone' : idle.t >= 5 ? 'pockets' : 'none';
  const wantP = idle.state === 'none' ? 0 : 1, wantF = idle.state === 'phone' ? 1 : 0, rate = moving ? 12 : 2.4;
  idle.wP += (wantP - idle.wP) * (1 - Math.exp(-dt * rate)); idle.wF += (wantF - idle.wF) * (1 - Math.exp(-dt * (moving ? 14 : 3)));
  if (idle.wP < 0.002 && idle.wF < 0.002) { u.phone.visible = false; u.torso.scale.set(1, 1, 1); u.head.rotation.x = 0; for (const a of u.arms) { a.hand.scale.setScalar(1); a.hand.visible = true; a.sh.rotation.y = 0; a.el.rotation.z = 0; a.hand.rotation.x = 0; } return; }
  const wP = idle.wP, wF = idle.wF, br = Math.sin(st.t * 1.6);
  u.torso.scale.set(1 + br * 0.012 * wP, 1, 1 + br * 0.018 * wP); u.hips.position.y += br * 0.004 * wP;   // breathing
  for (const a of u.arms) {
    const ph = a.sd > 0 && wF > 0;   // right arm (sd=+1) takes the phone
    // pockets: upper arm a little back + out, forearm forward-in so the hand tucks into the jacket's front pocket
    // pockets (solved so the hand lands in the jacket's front pocket, torso-local (±0.19, 0.1, 0.22)); the hand is hidden inside it
    let sx = 0.25, sy = -0.6 * a.sd, sz = 0.22 * a.sd, ex = -1.6, hs = 0;
    if (ph) { sx = L(sx, -0.8, wF); sy = L(sy, -0.9, wF); sz = L(sz, 0.2, wF); ex = L(ex, -1.8, wF); hs = L(0, 1, Math.min(1, wF * 1.6)); }   // phone hand at the chest
    a.sh.rotation.x = L(a.sh.rotation.x, sx, wP); a.sh.rotation.z = L(a.sh.rotation.z, sz, wP); a.sh.rotation.y = L(0, sy, wP);
    a.el.rotation.x = L(a.el.rotation.x, ex, wP); a.el.rotation.z = 0; const k = L(1, hs, Math.min(1, wP * 1.4)); a.hand.scale.setScalar(Math.max(0.001, k)); a.hand.visible = k > 0.02;
  }
  u.neck.rotation.x = L(u.neck.rotation.x, u.neck.rotation.x + 0.35, wF); u.head.rotation.x = L(0, 0.12, wF); u.head.rotation.y = L(u.head.rotation.y, -0.12, wF);
  u.phone.visible = wF > 0.35;
  if (u.phone.visible) {   // thumb flicks: quick scroll bursts every ~1.6-2.6 s
    if (st.t > idle.nextFlick) { idle.flick = 1; idle.nextFlick = st.t + 1.6 + ((st.t * 7.13) % 1); }
    idle.scroll += dt * (6 + idle.flick * 150); idle.flick *= Math.exp(-dt * 4);
    u.arms[1].hand.rotation.x = -idle.flick * 0.35;
    const fr = Math.floor(st.t * 12); if (fr !== idle.drawn) { idle.drawn = fr; drawFeed(u); }
  } else u.arms[1].hand.rotation.x = 0;
}

// ---------- loop + adaptive quality ----------
const demo = startStrikeDemo(strikeCab), ghostDemo = startGhostDemo(ghostCab), _v = new THREE.Vector3();
const _frus = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
const stats = { frames: 0, cpu: 0, cpuAvg: 0, gapAvg: 16, quality: dpr };
let last = performance.now(), slow = 0, fast = 0;
let paused = false, rafOn = true;
function frame(now) {
  const gap = Math.max(0, Math.min(100, now - last)); last = now;   // rAF time can be a hair before a resume timestamp
  if (paused) { rafOn = false; return; }   // full-screen game running: arcade render loop stopped
  const t0 = performance.now();
  { const dtc = Math.min(gap / 1000, 0.05); if (play.update(dtc, kiosk && kiosk.mode !== 'walk' && kiosk.mode !== 'pick' ? null : nearCab) || (kiosk && kiosk.update(dtc))) stepClock(dtc); else step(dtc); }
  shield.update(Math.min(gap / 1000, 0.05));
  bloom.strength = camera.position.x > WX / 2 ? 0.12 : 0.75;   // white room: no glare
  if (shop) shop.update(Math.min(gap / 1000, 0.05));
  if (tp) tp.update(Math.min(gap / 1000, 0.05), !!document.querySelector('#bPack.on') && !document.querySelector('#inv.on'));
  if (window.__camOverride) { const o = window.__camOverride; camera.position.set(...o.pos); camera.lookAt(...o.at); if (!o.showMonkey) monkey.visible = false; } // screenshots / tests
  camera.updateMatrixWorld();
  { // run each cabinet screen only when that cabinet is near and in view
    _frus.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    cullRooms(_frus);
    const vis = c => { const sc = c.userData.centre; return (_frus.intersectsSphere(_sph.set(_v.copy(sc).setY(1.2), 1.4)) && camera.position.distanceTo(sc) < 18) || !!window.__forceDemo; };
    const dts = Math.min(gap / 1000, 0.1);
    tickStrikeDemo(demo, dts, vis(strikeCab)); tickGhostDemo(ghostDemo, dts, vis(ghostCab));
    if (now - (frame.attT || 0) > 120) { frame.attT = now; for (const c of [berserkerCab, monkeyCab, orcCab, novaCab, cyberCab, roadsterCab]) if (vis(c)) c.userData.tick(now / 1000); }
    strikeCab.userData.glow.intensity = demo.running ? 1.2 + Math.sin(now * 0.013) * 0.08 + Math.sin(now * 0.031) * 0.06 : 0.6;
    ghostCab.userData.glow.intensity = ghostDemo.running ? 1.1 + Math.sin(now * 0.017) * 0.08 : 0.5;
  }
  if (spaceWin) spaceWin.update(now);
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
function stepClock(dt) { st.t += dt; }
const play = setupPlay({ camera, monkey, dsCab, roadsterCab, strikeCab, ghostCab, berserkerCab, monkeyCab, orcCab, novaCab, cyberCab, st, pause(on) { paused = on; if (!on && !rafOn) { rafOn = true; last = performance.now(); requestAnimationFrame(frame); } } });
shield = setupShield({ scene, play, st, monkey, HALF, DOOR_W, DOOR_H });
tp = setupTeleport({ scene, monkey, st, HALF, H }); window.__tp = tp;
shop = setupShop({ scene, tp, play, monkey, camera, st }); AREAS[3] = shop.extraBounds; CAM_AREAS[3] = shop.camBounds; CLIP_AREA[1] = shop.extraBounds; setFloor(floorMode);   // white-room carpet now that the shop has sized the floor
kiosk = setupKiosk({ room, camera, monkey, st, play, blockers });
const opts = setupOpts({ play, kiosk, shield, st, monkey, setFloor, getFloor: () => floorMode, setWalls, getWalls: () => wallsMode, HALF, Z2 });
requestAnimationFrame(frame);

// hooks for tests / future art work
window.__arcade = { get spaceWin() { return spaceWin; }, get kiosk() { return kiosk; }, setFloor, get floor() { return floorMode; }, setWalls, get walls() { return wallsMode; }, wallMat, carpet, mirror, shield, room, room2, Z2, hall, DOOR_W, DOOR_H, HALL_L, berserkerCab, monkeyCab, orcCab, cyberCab, novaCab, roadsterCab, dsCab, play, get paused() { return paused; }, THREE, scene, camera, renderer, monkey, cabinets, strikeCab, ghostCab, featured, demo, ghostDemo, playables, blockers, st, stats, step, keys, get nearCab() { return nearCab; }, setArt: (i, part, tex, glow) => cabinets[i].userData.setArt(part, tex, glow) };
