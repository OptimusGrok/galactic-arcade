// Galactic Arcade (formerly Neon Arcade) — walkable 3D arcade room with a playable monkey.
import { setupGrid } from './grid.js';
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
import { stoneWallTex, gothicWindows } from './medieval.js';
import { buildOrcCabinet } from './orccab.js';
import { buildCyberCabinet } from './cybercitycab.js';
import { buildBlasterCabinet } from './blastercab.js';
import { buildPipCabinet } from './pipcab.js';
import { buildClawCabinet, CLAW } from './clawcab.js';
import { buildBBCabinet } from './bbcab.js';
import { buildRockfallCabinet } from './rfcab.js';
import { setupMP } from './mp.js';
import { buildNovaCabinet } from './novacab.js';
import { buildRoadsterCabinet, MR } from './roadstercab.js';
import { buildDeadSignalStation, DS } from './dscab.js';
import { setupPlay } from './play.js';
import { setupShield } from './shield.js';
import { setupGolf } from './golf.js';
import { setupKiosk } from './kiosk.js';
import { setupOpts } from './opts.js';
import { setupTeleport, WX } from './teleport.js';
import { lavaPaths, PATH_HW } from './lavapaths.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches);
// Phone power-save (Dave: cooler-running mode). On by default on touch/mobile. Caps draws at ~30fps
// (physics still uses real dt), clamps pixel ratio, uses a cheaper bloom/reflection budget, and
// throttles far cabinet screen updates. Toggle lives in OPTIONS (neonarcade.powersave).
const PS_KEY = 'neonarcade.powersave';
function readPowerSave() {
  try { const v = localStorage.getItem(PS_KEY); if (v === '0' || v === 'off') return false; if (v === '1' || v === 'on') return true; } catch (e) {}
  return MOBILE;
}
function qualityFor(on) {
  if (on) return { dpr: MOBILE ? 1.25 : 1.5, refl: MOBILE ? 0.22 : 0.35, bloom: 0.28 };
  return MOBILE ? { dpr: 1.5, refl: 0.35, bloom: 0.5 } : { dpr: 2, refl: 0.6, bloom: 0.5 };
}
const PS = window.__powerSave = { on: readPowerSave(), key: PS_KEY, fps: 30, cabNear: 7, cabFar: 14, cabNearMs: 200, cabFarMs: 450, draws: 0, skipped: 0, hiddenSkips: 0, lastDraw: 0 };
let Q = qualityFor(PS.on);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, powerPreference: PS.on ? 'low-power' : 'high-performance' }); renderer.localClippingEnabled = true; if (!/[?&]glcheck/.test(location.search)) renderer.debug.checkShaderErrors = false;   // t295u: no sync getProgramInfoLog per shader (~3.9 s of the start-screen freeze at 4x CPU); ?glcheck turns it back on   // teleporter dissolve
let dpr = Math.min(devicePixelRatio || 1, Q.dpr);
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight, false);   // CSS (100vw x 100dvh) owns the on-screen size; resize() matches the buffer to it
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
// FAST LOAD (t229): windows.js (jungle/beach scenery) is fetched only when a JUNGLE/BEACH window is chosen or after the first frames;
// until then `winds` is a stub that remembers the requested mode (space = nothing to draw).
let winds = { stub: true, want: 'space', set(v) { this.want = v; if (v === 'jungle' || v === 'beach') loadWindows(); }, update() {} }; window.__windows = winds;
let windsP = null;
function loadWindows() { return windsP || (windsP = import('./windows.js').then(m => { const w = m.setupWindows({ THREE, room, room2, Z2, camera, HALF, H, DOOR_W, WX: 80 }); const want = winds.want; winds = w; window.__windows = w; w.set(want); return w; })); }
let wallsMode = 'current', vikTex = null, wallBands = [], spaceWin = null;
// PORTALS walls (t187, Dave: 'a wall of big and small multi colour swirling portals that are moving with the colours changing'):
// one cheap unlit procedural shader - two layers of hashed cells (big + small), each a spiral vortex that turns, drifts, pulses and cycles hue.
// Brightness is capped (no near-white) for the flash test.
const portalU = { uT: { value: 0 } };
const portalMat = new THREE.ShaderMaterial({ uniforms: portalU, vertexShader: 'varying vec2 vW; void main(){ vW = vec2(uv.x * ' + (2 * HALF).toFixed(1) + ', uv.y * ' + H.toFixed(2) + '); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uT; varying vec2 vW;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec3 hue(float h){ return clamp(abs(fract(h + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); }
    vec3 layer(vec2 p, float cell, float seed, inout float m){
      p.x += uT * 0.12 * (seed - 0.5); p.y += sin(uT * 0.21 + seed * 7.0) * 0.18;
      vec2 g = p / cell, id = floor(g), f = fract(g) - 0.5; float r0 = h21(id + seed);
      vec2 c = (vec2(h21(id + seed + 3.1), h21(id + seed + 9.7)) - 0.5) * 0.35; vec2 q = f - c;
      float rad = (0.28 + 0.14 * r0) * (1.0 + 0.06 * sin(uT * 1.3 + r0 * 30.0));
      float r = length(q) / rad; if (r > 1.0 || r0 < 0.18) return vec3(0.0);
      float a = atan(q.y, q.x), dir = r0 > 0.55 ? 1.0 : -1.0;
      float sw = 0.5 + 0.5 * sin(a * 3.0 + dir * (log(r + 0.04) * 9.0 - uT * (1.4 + r0)));
      float rim = smoothstep(1.0, 0.86, r) * smoothstep(0.62, 0.9, r), core = smoothstep(0.35, 0.0, r);
      float k = smoothstep(1.0, 0.7, r) * (0.25 + 0.75 * sw) * (1.0 - core * 0.6) + rim * 0.9;
      vec3 col = hue(r0 + uT * 0.05 + r * 0.35 + a * 0.08) * k * mix(0.35, 1.0, sw) + hue(r0 + 0.5 + uT * 0.05) * rim * 0.4;
      m = max(m, k); return col; }
    void main(){ float m = 0.0; vec3 c = layer(vW, 3.0, 0.0, m) * 0.5; c += layer(vW + 0.7, 1.15, 5.3, m) * 0.34;
      vec3 base = vec3(0.035, 0.015, 0.06) + 0.02 * vec3(sin(vW.x * 0.6 + uT * 0.3) + 1.0, 0.0, 1.0);
      c = min(base + c, vec3(0.55)); gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }` });
portalMat.name = 'portalWalls';
const R2_WIN = 1, R2_WALLS = [0, 2, 3];   // t235: room 2's local wall 1 (world +x, on the right as you walk in) is a window like room 1's east wall
let stoneTex = null, gothWins = null, r2Ready = false, portalHallMat = null;   // r2Ready: room 2 + hallway exist (setWalls runs once before they are built)   // MEDIEVAL walls (t230): built on first pick
function setWalls(mode) {
  wallsMode = mode === 'viking' || mode === 'portals' || mode === 'medieval' ? mode : 'current'; if (mode === 'windows') setWindow('jungle'); const v = wallsMode === 'viking', po = wallsMode === 'portals', md = wallsMode === 'medieval';
  if (md && !stoneTex) { stoneTex = stoneWallTex(THREE, renderer); stoneTex.repeat.set(4, +(H / 6).toFixed(3)); gothWins = gothicWindows(THREE, mergeGeometries, HALF, H); room.add(gothWins); }
  if (md && r2Ready && !room2.getObjectByName('gothicWindows2')) { const g2 = gothicWindows(THREE, mergeGeometries, HALF, H, R2_WALLS, gothWins); g2.name = 'gothicWindows2'; room2.add(g2); }   // t234/t235: room 2 too (shares materials; not on its right-hand window wall)
  if (gothWins) gothWins.visible = md; const g2 = r2Ready && room2.getObjectByName('gothicWindows2'); if (g2) g2.visible = md;
  if (r2Ready) ['Pink', 'Amber', 'Cyan'].forEach(n => { const b = room2.getObjectByName('wallBand' + n); if (b) b.visible = wallsMode === 'current'; });   // room 2's cloned bands follow room 1's
  if (r2Ready) { const hw0 = hall.getObjectByName('hallWallW'), hm = hw0.userData.mat0 || hw0.material; if (!hm.userData.map0) hm.userData.map0 = hm.map;
    if (md && !hm.userData.stone) { hm.userData.stone = stoneTex.clone(); hm.userData.stone.repeat.set(+(HALL_L / 6).toFixed(3), +(DOOR_H / 6).toFixed(3)); hm.userData.stone.needsUpdate = true; }
    hm.map = md ? hm.userData.stone : hm.userData.map0; hm.emissiveMap = md ? hm.userData.stone : null; hm.color.setHex(md ? 0x8a8078 : 0x2a1840); hm.emissive.setHex(md ? 0xffffff : 0); hm.emissiveIntensity = md ? 0.55 : 1; hm.roughness = md ? 0.95 : 0.85; hm.needsUpdate = true; }
  if (v && !vikTex) { vikTex = new THREE.TextureLoader().load('tex/viking_walls.jpg', () => spaceWin && spaceWin.dirty()); vikTex.colorSpace = THREE.SRGBColorSpace; vikTex.wrapS = THREE.RepeatWrapping; vikTex.wrapT = THREE.ClampToEdgeWrapping;
    vikTex.repeat.set(+(2 * HALF / (H * 928 / 576)).toFixed(3), 1); vikTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); }   // one repeat = wall height
  wallMat.map = v ? vikTex : md ? stoneTex : wallTex; wallMat.color.setHex(v ? 0x8a7a70 : md ? 0x8a8078 : 0x2a1840); wallMat.roughness = v || md ? 0.95 : 0.85; wallMat.emissiveMap = v ? vikTex : md ? stoneTex : null; wallMat.emissive.setHex(v || md ? 0xffffff : 0x000000); wallMat.emissiveIntensity = v ? 1.6 : md ? 0.55 : 1; wallBands.forEach(m => { m.visible = !v && !po && !md }); wallMat.needsUpdate = true;   // a little dark so the neon pops
  const tick = po ? () => { portalU.uT.value = performance.now() / 1000; } : () => {};
  for (let i = 0; i < 4; i++) { const w = room.getObjectByName('wall' + i); if (w) { w.material = po ? portalMat : wallMat; w.onBeforeRender = tick; } }
  if (r2Ready) {   // t253: PORTALS in room 2 (same shader + clock; its window wall stays a window) and the hallway (own uv scale, shared uniforms)
    for (const i of R2_WALLS) { const w = room2.getObjectByName('wall' + i); if (w) { w.material = po ? portalMat : wallMat; w.onBeforeRender = tick; } }
    if (po && !portalHallMat) { portalHallMat = portalMat.clone(); portalHallMat.uniforms = portalU; portalHallMat.vertexShader = portalMat.vertexShader.replace((2 * HALF).toFixed(1), HALL_L.toFixed(2)).replace('uv.y * ' + H.toFixed(2), 'uv.y * ' + DOOR_H.toFixed(2)); portalHallMat.name = 'portalWallsHall'; }
    for (const n of ['hallWallW', 'hallWallE']) { const w = hall.getObjectByName(n); if (!w) continue; if (!w.userData.mat0) w.userData.mat0 = w.material; w.material = po ? portalHallMat : w.userData.mat0; w.onBeforeRender = tick; } }
  if (spaceWin) spaceWin.dirty();
  try { localStorage.setItem(WALLS_KEY, wallsMode); } catch (e) {}
  return wallsMode;
}
// WINDOW option (t209): what the big east space window shows, separate from walls: space (default), jungle or beach
const WINDOW_KEY = 'neonarcade.window'; let windowMode = 'space';
function setWindow(mode) { windowMode = mode === 'jungle' || mode === 'beach' ? mode : 'space'; winds.set(windowMode); try { localStorage.setItem(WINDOW_KEY, windowMode); } catch (e) {} return windowMode; }
window.__setWindow = setWindow;
try { const w0 = localStorage.getItem(WINDOW_KEY); if (w0) setWindow(w0); const w = localStorage.getItem(WALLS_KEY); if (w === 'windows') { setWalls('current'); setWindow('jungle'); } else if (w === 'viking' || w === 'portals' || w === 'medieval') setWalls(w); } catch (e) {}
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
wallBands.forEach(m => { m.visible = wallsMode === 'current'; });

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
// Closed LEVEL 2 steel doors across the hallway opening; frame front flush with room 1's north wall. Opening comes later (window.__level2Door).
let l2door = null; import('./level2door.js').then(m => { l2door = m.setupLevel2Door({ THREE, parent: hall, mergeGeometries, x: 0, z: -HALF, width: DOOR_W, doorH: DOOR_H }); if (!warm.done) renderer.compileAsync(l2door.group, camera, scene).catch(() => {}); }).catch(e => console.warn('level2door', e));

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
const berserkerCab = buildBerserkerCabinet(), monkeyCab = buildMonkeyCabinet(), orcCab = buildOrcCabinet(), novaCab = buildNovaCabinet(), cyberCab = buildCyberCabinet(), blasterCab = buildBlasterCabinet(), pipCab = buildPipCabinet(), clawCab = buildClawCabinet(), bbCab = buildBBCabinet(), rockfallCab = buildRockfallCabinet();
const FEATURED = { '0:0': [strikeCab, 'strike'], '0:1': [berserkerCab, 'berserker'], '0:3': [monkeyCab, 'monkey'], '1:4': [ghostCab, 'ghost'], '1:3': [orcCab, 'orc'], '0:4': [novaCab, 'nova'], '1:2': [cyberCab, 'cyber'], '1:1': [blasterCab, 'blaster'], '1:0': [pipCab, 'pip'], '2:4': [bbCab, 'bb'], '2:3': [rockfallCab, 'rockfall'] };   // BURROW BUSTER (#13): south wall slot 2:4 (old blank G, x=-8), the corner neighbour of SUPER PIP QUEST. ROCKFALL RUSH (#14): south wall slot 2:3 (old blank F, x=-4), between blank E and BURROW BUSTER   // NOVA TETHER: north wall slot 4 (x=8), right of MONKEY CROSSING (Dave's pick)
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
function wallTubeGeo(cabList, flatEast, flatW = flatEast ? 3 : -1) {
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
    const yAt = u => w !== flatW && Math.abs(u) < PU ? YP : Y0;
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
const LATE_NUM = { '1:1': 10, '1:0': 11, '2:4': 13, '2:3': 14 };   // games added after DEAD SIGNAL (#9) keep their own fixed number: BLASTER (blank B) = #10, SUPER PIP QUEST (blank A) = #11, BURROW BUSTER (blank G) = #13, ROCKFALL RUSH (blank F) = #14
const DEV = { numbers: localStorage.getItem('neonarcade.dev.numbers') === '1', clip: localStorage.getItem('neonarcade.dev.clip') === '1', badges: [] };
{ // stable order: room 1 walk, north wall left->right then west wall; only cabinets with a game (blanks get no number)
  const order = ['0:0', '0:1', '0:3', '0:4', '1:2', '1:3', '1:4', '1:0', '1:1', '2:0', '2:1', '2:2', '2:3', '2:4'];
  let n = 0;
  for (const key of order) { const F = FEATURED[key]; if (!F || LATE_NUM[key]) continue; n++;
    const cab = F[0]; cab.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(cab), ctr = b.getCenter(new THREE.Vector3());
    badge(String(n), '#ffe000', ctr.x, b.max.y + 0.55, ctr.z, { n, key, game: F[1] }); }
  // blank cabinets: cyan LETTER badges. Room 1 (west, south rows), then room 2 (its 19 instanced slots, slot order)
  let L = 0; const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', letter = k => (k >= 26 ? AB[Math.floor(k / 26) - 1] : '') + AB[k % 26];
  const R1L = { '1:0': 0, '1:1': 1, '2:0': 2, '2:1': 3, '2:2': 4, '2:3': 5, '2:4': 6 };   // room 1 letters stay on their slot: A retired (SUPER PIP QUEST, #11), B retired (BLASTER, #10), C + D (MARS ROADSTER, #8), F retired (ROCKFALL RUSH, #14)
  for (const cab of cabinets) { cab.updateMatrixWorld(true);
    L = R1L[wallNames.indexOf(cab.userData.wall) + ':' + cab.userData.index];
    const b = new THREE.Box3().setFromObject(cab.getObjectByName('body')), ctr = b.getCenter(new THREE.Vector3());
    badge(letter(L), '#00e5ff', ctr.x, b.max.y + 0.55, ctr.z, { letter: letter(L), key: wallNames.indexOf(cab.userData.wall) + ':' + cab.userData.index, room: 1 }); }
  L = 7;
  for (const sl of slots) { const x = -sl.pos.x, z = Z2 - sl.pos.z;   // room 2 = room 1 rotated 180deg about (0, Z2)
    if (sl.w === R2_WIN) { L++; continue; }   // t235: those blank cabinets are gone (window wall); letters of the rest unchanged
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
  const skip = new Set([mirror, floorTop, floorBase1, ...cabinets, ...featured, ...spots, gothWins]);
  for (const ch of room.children) if (!skip.has(ch)) room2.add(ch.clone());
  const plane = new THREE.PlaneGeometry(HALF * 2, HALF * 2);
  const m2 = new Reflector(plane, { textureWidth: Math.round(innerWidth * dpr * Q.refl), textureHeight: Math.round(innerHeight * dpr * Q.refl), color: 0x8a8a96 });
  m2.rotation.x = -Math.PI / 2; m2.name = 'floorMirror2'; room2.add(m2); room2.userData.mirror = m2;
  const base = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ color: 0x05030a, roughness: 0.3, metalness: 0.6 })); base.rotation.x = -Math.PI / 2; base.position.y = -0.002; base.name = 'floorBase2'; room2.add(base); room2.userData.base = base;
  const ft = new THREE.Mesh(plane, floorTop.material); ft.rotation.x = -Math.PI / 2; ft.position.y = 0.004; ft.name = 'floorHex2'; room2.add(ft);
  // instanced blank cabinets: one InstancedMesh per part (neon parts per accent colour)
  const slots2 = slots.filter(sl => sl.w !== R2_WIN);   // t235: no blank cabinets on room 2's window wall
  const tmpl = {}, groups = {};
  for (const sl of slots2) { (groups[sl.accent] ||= []).push(sl); tmpl[sl.accent] ||= makeCabinet(sl.accent); }
  const M = new THREE.Matrix4(), S = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  room2.userData.cabinetCount = slots2.length; room2.userData.instanced = [];
  const shared = ['body', 'sidePanelL', 'sidePanelR', 'screen', 'marquee', 'controlPanel', 'frontPanel'];
  const parts = [...shared.map(n => [n, null]), ...Object.keys(groups).flatMap(a => [['neonEdges', +a], ['neonBase', +a]])];
  const anyT = tmpl[slots[0].accent];
  for (const [name, acc] of parts) {
    const list = acc === null ? slots2 : groups[acc], src = (acc === null ? anyT : tmpl[acc]).getObjectByName(name);
    src.updateMatrix();
    const im = new THREE.InstancedMesh(src.geometry, src.material, list.length); im.name = 'cab2_' + name + (acc === null ? '' : '_' + acc.toString(16));
    list.forEach((sl, k) => { M.compose(sl.pos, q.setFromAxisAngle(up, sl.rotY), one).multiply(S.copy(src.matrix)); im.setMatrixAt(k, M); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); room2.add(im); room2.userData.instanced.push(im);
  }
  // collision: room 1 plinths + one box per cabinet body, mapped into room 2 (x -> -x, z -> Z2 - z)
  const map = b => ({ minX: -b.maxX, maxX: -b.minX, minZ: Z2 - b.maxZ, maxZ: Z2 - b.minZ, kind: b.kind + '2' });
  for (const b of blockers.filter(b => b.kind === 'plinth' && b.wall !== wallNames[R2_WIN])) blockers.push(map(b));
  const bodyBox = new THREE.Box3(); anyT.getObjectByName('body').geometry.computeBoundingBox();
  for (const sl of slots2) { bodyBox.copy(anyT.getObjectByName('body').geometry.boundingBox).applyMatrix4(M.compose(sl.pos, q.setFromAxisAngle(up, sl.rotY), one)); blockers.push(map({ minX: bodyBox.min.x, maxX: bodyBox.max.x, minZ: bodyBox.min.z, maxZ: bodyBox.max.z, kind: 'cabinet' })); }
}
// ---------- DEAD SIGNAL VR STATION (#9): free-standing in the exact middle of room 2, screen to the north, the open front faces the doorway ----------
r2Ready = true; setWalls(wallsMode);   // t234: apply the saved walls to room 2 + hallway now that they exist
const dsCab = buildDeadSignalStation(); dsCab.rotation.y = Math.PI; room2.add(dsCab);   // room2 is rotated PI: net world rotation 0 (local +z = world +z = toward the door)
{ const c = new THREE.Vector3(0, 0, Z2);
  Object.assign(dsCab.userData, { wall: 'room2', index: -1, centre: c, front: new THREE.Vector3(0, 0, Z2 + DS.R + 0.65), name: 'deadsignal' });
  dsCab.name = 'deadSignalStation'; room2.updateMatrixWorld(true); dsCab.userData.updateCable();
  blockers.push({ kind: 'circle', name: 'deadsignal', cx: 0, cz: Z2, r: DS.R + 0.05 });                                  // the round platform
  blockers.push({ minX: -2.45, maxX: 2.45, minZ: Z2 + DS.SCR_Z - 0.45, maxZ: Z2 + DS.SCR_Z + 0.75, kind: 'cabinet', name: 'deadsignalScreen' });   // the curved screen behind it
  playables.push(dsCab);
  const nGames = DEV.badges.filter(b => b.userData.n).length;   // next machine number after room 1's games (= 9)
  badge(String(nGames + 1), '#ffe000', 0, 6.0, Z2 - 1.2, { n: nGames + 1, key: 'r2:centre', game: 'deadsignal' });
  for (const key in LATE_NUM) { const F = FEATURED[key]; if (!F) continue; const cab = F[0]; cab.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(cab), ctr = b.getCenter(new THREE.Vector3());
    badge(String(LATE_NUM[key]), '#ffe000', ctr.x, b.max.y + 0.55, ctr.z, { n: LATE_NUM[key], key, game: F[1] }); }
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
// ---------- t235 room 2: the right-hand wall as you walk in (local wall 1 = world x +HALF, same side as room 1's window) -> the same window ----------
// the space glass reuses room 1's shader (world-space rays, shared clock), so both look onto the same sky; JUNGLE / BEACH share windows.js's one canvas.
{
  const nm = wallNames[R2_WIN];
  room2.getObjectByName('wall' + R2_WIN).visible = false;
  for (const n of ['plinth_' + nm, 'plinthLip_' + nm, 'plinthLip2_' + nm, 'ledge' + R2_WIN]) { const o = room2.getObjectByName(n); if (o) o.visible = false; }
  const keep = [0, 1, 2, 3].filter(i => i !== R2_WIN);
  ['Pink', 'Amber', 'Cyan'].forEach((n, k) => { room2.getObjectByName('wallBand' + n).geometry = mergeGeometries(keep.map(i => [edgeLedge, edgeAmber, edgeCyan][k][i])); });
  room2.getObjectByName('wallNeonRun').geometry = wallTubeGeo([...cabinets, ...featured, ...eastGhostCabs].filter(c => c.userData.wall !== nm), false, R2_WIN);
  const g = spaceWin.glass, m2 = g.material.clone(); m2.uniforms.uT = g.material.uniforms.uT; m2.uniforms.uNear = { value: 0 };   // no monkey-reflection pass on this one
  const g2 = new THREE.Mesh(g.geometry, m2); g2.position.set(-g.position.x, g.position.y, -g.position.z); g2.rotation.y = Math.PI; g2.name = 'spaceWindow'; room2.add(g2);   // same name: windows.js hides both for JUNGLE / BEACH
  for (const f of spaceWin.frame) { const f2 = new THREE.Mesh(f.geometry, f.material); f2.position.set(-f.position.x, f.position.y, -f.position.z); f2.rotation.y = Math.PI; f2.name = 'windowFrame2'; room2.add(f2); }
}
// ---------- room 1 floor option: neon reflective (default) or light-grey ARCADE character carpet (Options > FLOOR) ----------
const FLOOR_KEY = 'neonarcade.floor';
const carpetTex = new THREE.TextureLoader().load('tex/carpet.webp', () => spaceWin && floorMode === 'carpet' && spaceWin.dirty());
carpetTex.colorSpace = THREE.SRGBColorSpace; carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;   // seamless tile (edge-cut figures removed): plain repeat, never mirrored (mirroring put copies head to head)
carpetTex.repeat.set(3, 3); carpetTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
// the carpet covers every walkable floor (Dave: 'when a floor is selected have it cover all floors'): room 1 + hallway (one mesh,
// UVs in metres so the tile keeps room 1's scale), room 2 (carpet2) and the teleporter white room (carpetW, added in carpetWhite()).
const worldUV = g => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (HALF * 2) + 0.5, p.getY(i) / (HALF * 2) + 0.5); return g; };
const carpetGeo = mergeGeometries([worldUV(new THREE.PlaneGeometry(HALF * 2, HALF * 2)), worldUV(new THREE.PlaneGeometry(DOOR_W, HALL_L + 0.02).translate(0, HALF + HALL_L / 2, 0))]);
const carpet = new THREE.Mesh(carpetGeo, new THREE.MeshStandardMaterial({
  map: carpetTex, color: 0xb4b4b4, roughness: 1, metalness: 0, emissive: 0xc8c8c8, emissiveMap: carpetTex, emissiveIntensity: 0.22 }));   // matte light grey (ARCADE); a little self-light keeps the prints readable under the neon
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
// cave paths: one source of truth (lavapaths.js) shared with the lava-fall check in step()
const LAVA = lavaPaths(Z2, WX), LS = LAVA.S, LR = LAVA.R, LD = LAVA.D;
const v4 = a => new THREE.Vector4(a[0], a[1], a[2], a[3] || 0);
lavaU.uS = { value: LS.map(v4) }; lavaU.uR = { value: LR.map(v4) }; lavaU.uD = { value: LD.map(v4) };
const lavaMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
lavaMat.onBeforeCompile = sh => { Object.assign(sh.uniforms, lavaU);
  floorWP(sh, `uniform float uT; uniform vec4 uS[${LS.length}]; uniform vec4 uR[${LR.length}]; uniform vec4 uD[${LD.length}];
    float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float ln(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(lh(i), lh(i + vec2(1, 0)), f.x), mix(lh(i + vec2(0, 1)), lh(i + vec2(1, 1)), f.x), f.y); }
    float lf(vec2 p) { return ln(p) * 0.55 + ln(p * 2.1 + 3.7) * 0.3 + ln(p * 4.3 + 9.1) * 0.15; }`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `vec2 p = vFW.xz; float d = 1e3;
    for (int i = 0; i < ${LS.length}; i++) { vec2 a = uS[i].xy, b = uS[i].zw, ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0); d = min(d, length(p - a - ab * h)); }
    for (int i = 0; i < ${LR.length}; i++) d = min(d, abs(length(p - uR[i].xy) - uR[i].z));
    for (int i = 0; i < ${LD.length}; i++) d = min(d, max(0.0, length(p - uD[i].xy) - uD[i].z));
    d += (lf(p * 1.6) - 0.5) * 0.45;                                                     // rough, irregular rock edges
    float rock = 1.0 - smoothstep(${(PATH_HW - 0.04).toFixed(2)}, ${(PATH_HW + 0.04).toFixed(2)}, d);
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
// COBBLE (t230): medieval cobblestones - world-space Voronoi stones (3x3 cell search), rounded tops, dark gritty joints, worn warm/grey tones
const cobbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.05 });
cobbleMat.onBeforeCompile = sh => { floorWP(sh, `float ch(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec2 ch2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `vec2 cp = vFW.xz * 2.6; vec2 ci = floor(cp), cf = fract(cp); float d1 = 8.0, d2 = 8.0; vec2 cid = vec2(0.0);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)), r = o + 0.15 + 0.7 * ch2(ci + o) - cf; float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; cid = ci + o; } else if (d < d2) d2 = d; }
    float e = sqrt(d2) - sqrt(d1), joint = smoothstep(0.05, 0.16, e), dome = smoothstep(0.0, 0.5, e);
    float h = ch(cid), gr = ch(floor(vFW.xz * 40.0));
    vec3 stn = mix(vec3(0.20, 0.19, 0.18), vec3(0.30, 0.25, 0.19), h) * (0.75 + 0.25 * ch(cid + 3.0));
    stn *= 0.7 + 0.45 * dome; stn *= 0.9 + 0.2 * gr;
    diffuseColor.rgb = mix(vec3(0.03, 0.028, 0.025), stn, joint); float fCb = joint * (0.5 + 0.5 * dome);`)
    .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = diffuseColor.rgb * 0.45 * fCb;')
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(1.0, 0.55, fCb * dome);'); };   // stones a little self-lit (readable under the neon), tops slightly polished by feet
cobbleMat.emissive.setHex(0xffffff);
// ICE (t260): glossy pale-blue ice - world-space Voronoi cracks + frost noise, low roughness for neon sheen; procedural (no texture, same 1 draw call)
const iceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.15 });
iceMat.onBeforeCompile = sh => { floorWP(sh, `float ih(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec2 ih2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
    float in1(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(ih(i), ih(i + vec2(1, 0)), f.x), mix(ih(i + vec2(0, 1)), ih(i + vec2(1, 1)), f.x), f.y); }`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `vec2 cp = vFW.xz * 0.55; vec2 ci = floor(cp), cf = fract(cp); float d1 = 8.0, d2 = 8.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)), r = o + ih2(ci + o) - cf; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    float crack = (1.0 - smoothstep(0.0, 0.012, sqrt(d2) - sqrt(d1))) * (0.35 + 0.65 * in1(vFW.xz * 2.2));
    float fn = in1(vFW.xz * 1.3) * 0.6 + in1(vFW.xz * 4.7) * 0.4, frost = smoothstep(0.55, 0.85, fn);
    vec3 ic = mix(vec3(0.20, 0.45, 0.70), vec3(0.45, 0.72, 0.92), fn);
    ic = mix(ic, vec3(0.85, 0.95, 1.0), frost * 0.45 + crack * 0.6);
    diffuseColor.rgb = ic; float fIce = 0.42 + 0.25 * frost + 0.4 * crack;`)
    .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = diffuseColor.rgb * fIce;')
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(0.08, 0.6, max(frost, crack));'); };
iceMat.emissive.setHex(0xffffff);
const floorMats = { carpet: carpet.material, checkers: checkMat, lava: lavaMat, cobble: cobbleMat, ice: iceMat };
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
// pre-compile the CHECKERS / LAVA shaders a few seconds after load so the first tap on those tiles doesn't stall the phone
setTimeout(() => { try { const m0 = carpet.material, v0 = carpet.visible; carpet.visible = true;
  for (const m of [checkMat, lavaMat, cobbleMat, iceMat]) if (m !== m0) { carpet.material = m; if (renderer.compileAsync) renderer.compileAsync(scene, camera).catch(() => {}); else renderer.compile(scene, camera); }
  carpet.material = m0; carpet.visible = v0; } catch (e) {} }, 4000);

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
  // backpack (matches the HUD backpack icon: charcoal pack, top loop, grey cartoon-monkey face on the front pocket) - never hue-tinted
  const pack = new THREE.Group(); pack.name = 'backpack'; pack.position.set(0, 0.3, -0.27); torso.add(pack);
  const bpD = mk(0x1c1c22, { roughness: 0.85 }), bpM = mk(0x3a3a44, { roughness: 0.8 }), bpS = mk(0x55555f, { roughness: 0.7 });
  const bag = part(pack, new THREE.BoxGeometry(0.4, 0.44, 0.16), bpD, 0, 0, -0.06); bag.name = 'backpackBag';
  part(pack, S(0.2, 18, 10), bpD, 0, 0.2, -0.06, 1, 0.35, 0.4);                                   // rounded top
  const loop = part(pack, new THREE.TorusGeometry(0.05, 0.012, 6, 16, Math.PI), bpS, 0, 0.27, -0.06); loop.name = 'backpackLoop';
  const pkt = part(pack, new THREE.BoxGeometry(0.3, 0.26, 0.05), bpM, 0, -0.06, -0.16); pkt.name = 'backpackPocket';
  const fcv = document.createElement('canvas'); fcv.width = fcv.height = 128; const fx = fcv.getContext('2d');
  fx.fillStyle = '#3a3a44'; fx.fillRect(0, 0, 128, 128); fx.fillStyle = '#9a9aa4'; fx.beginPath(); fx.ellipse(64, 66, 46, 42, 0, 0, 7); fx.fill();
  fx.fillStyle = '#c4c4cc'; fx.beginPath(); fx.ellipse(64, 82, 30, 20, 0, 0, 7); fx.fill();
  for (const sx of [-1, 1]) { fx.fillStyle = '#fff'; fx.beginPath(); fx.arc(64 + sx * 18, 52, 13, 0, 7); fx.fill(); fx.fillStyle = '#111'; fx.beginPath(); fx.arc(64 + sx * 17, 54, 6, 0, 7); fx.fill(); fx.fillStyle = '#555'; fx.beginPath(); fx.arc(64 + sx * 5, 78, 3, 0, 7); fx.fill(); }
  fx.strokeStyle = '#222'; fx.lineWidth = 3; fx.beginPath(); fx.arc(64, 84, 10, 0.3, Math.PI - 0.3); fx.stroke();
  const ftex = new THREE.CanvasTexture(fcv); ftex.colorSpace = THREE.SRGBColorSpace;
  const pface = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.22), new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.8 })); pface.name = 'backpackFace'; pface.position.set(0, -0.06, -0.186); pface.rotation.y = Math.PI; pack.add(pface);
  for (const sd of [-1, 1]) { const strap = part(torso, new THREE.BoxGeometry(0.05, 0.5, 0.03), bpD, 0.13 * sd, 0.32, 0); strap.name = 'backpackStrap';   // shoulder straps over the bomber
    strap.scale.set(1, 1, 1); strap.position.set(0.14 * sd, 0.36, 0.0); strap.rotation.x = 0; const a = part(torso, new THREE.TorusGeometry(0.2, 0.018, 6, 20, Math.PI * 0.9), bpD, 0.15 * sd, 0.42, -0.02); a.rotation.set(0, Math.PI / 2, Math.PI * 0.55); }
  pack.traverse(o => { if (o.isMesh) o.userData.noTint = true; });
  torso.traverse(o => { if (o.isMesh && o.material === bpD) o.userData.noTint = true; });
  // curly brown tail from below the backpack, swayed in the animation loop
  const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(0, 0.02, -0.2); hips.add(tail);
  const tc = [[0, 0, 0], [0.02, -0.12, -0.12], [0.08, -0.12, -0.3], [0.17, 0.02, -0.42], [0.22, 0.2, -0.42], [0.18, 0.33, -0.34], [0.1, 0.32, -0.28], [0.09, 0.24, -0.3], [0.14, 0.22, -0.35]].map(v => new THREE.Vector3(...v));
  const tailM = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tc), 40, 0.028, 8, false), fur); tailM.name = 'tailMesh'; tail.add(tailM);
  part(tail, S(0.03, 8, 6), fur, tc[8].x, tc[8].y, tc[8].z);
  root.userData = { hips, torso, neck, head, legs, arms, phone, pcv, ptex, pack, tail, char: 'monkey' };
  return root;
}

function makeAlien() { // chibi grey alien: huge spherical head (~37% of height), short stocky body, forward-facing robot
  const mk = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o));
  const skin = mk(0x9aa5ab, { roughness: 0.34, metalness: 0.16, emissive: 0x1c2428, emissiveIntensity: 0.1 });
  const skinD = mk(0x7e888e, { roughness: 0.42, metalness: 0.12, emissive: 0x141a1e, emissiveIntensity: 0.08 });
  const gun = mk(0x5a636e, { roughness: 0.48, metalness: 0.28, emissive: 0x141820, emissiveIntensity: 0.08 });
  const gunD = mk(0x3c434c, { roughness: 0.52, metalness: 0.24 });
  const purp = mk(0x6a3a9a, { roughness: 0.42, metalness: 0.22, emissive: 0x2a1055, emissiveIntensity: 0.35 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const lip = mk(0x5a6268, { roughness: 0.48 });
  const glove = mk(0x8b959e, { roughness: 0.5, metalness: 0.12 });
  const cyan = mk(0x3ae8ff, { roughness: 0.22, metalness: 0.35, emissive: 0x14c8e6, emissiveIntensity: 1.15 });
  const cyanG = new THREE.MeshBasicMaterial({ color: 0x48f2ff, toneMapped: false });
  const pink = mk(0xff4f9e, { roughness: 0.6 }), pinkD = mk(0xd93a82, { roughness: 0.6 });
  const CAP = (r, len, cs = 12, rs = 24) => new THREE.CapsuleGeometry(r, len, cs, rs);
  const root = new THREE.Group(); root.name = 'monkey';
  const hips = new THREE.Group(); hips.position.y = 0.8; root.add(hips);
  // chunky pelvis + belt — same suit colour so it reads as one jacket/hip piece
  part(hips, new THREE.SphereGeometry(0.19, 28, 20), gun, 0, 0.02, 0, 1.2, 0.82, 0.98);
  part(hips, CYL(0.2, 0.2, 0.038, 28), gunD, 0, 0.055, 0, 1, 1, 0.9);
  part(hips, new THREE.BoxGeometry(0.052, 0.044, 0.026), gun, 0, 0.055, 0.185);
  part(hips, new THREE.BoxGeometry(0.026, 0.026, 0.012), cyanG, 0, 0.055, 0.202);
  const legs = [];
  for (const sd of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.12 * sd, -0.015, 0); hips.add(leg);
    part(leg, CAP(0.112, 0.22, 12, 26), gun, 0, -0.18, 0);                 // one thick thigh, same radius as shin, buried into the knee
    const knee = new THREE.Group(); knee.position.y = -0.36; leg.add(knee);
    part(knee, CAP(0.112, 0.12, 12, 26), gun, 0, -0.08, 0);                 // matching shin, overlaps the thigh so the straight leg reads as one piece
    const shoe = new THREE.Group(); shoe.position.set(0, -0.34, 0.07); knee.add(shoe);
    part(shoe, S(0.128, 20, 16), gun, 0, 0.055, -0.015, 1.18, 1.05, 1.15); // boot shaft, clearly bigger than the ankle
    const foot = part(shoe, CAP(0.122, 0.13, 8, 20), gun, 0, 0.0, 0.08); foot.rotation.x = Math.PI / 2;
    part(shoe, S(0.128, 18, 14), gun, 0, 0.005, 0.21, 1.22, 0.72, 1.02);   // rounded toe
    part(shoe, new THREE.BoxGeometry(0.28, 0.055, 0.4), gunD, 0, -0.085, 0.08);
    part(shoe, CYL(0.118, 0.118, 0.016, 18), cyanG, 0, 0.1, -0.015);
    legs.push({ leg, knee });
  }
  const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
  // one short rounded jacket (overlaps the belt), not a stack of separate volumes
  part(torso, CAP(0.195, 0.12, 12, 28), gun, 0, 0.13, 0, 1.14, 1, 0.92);
  part(torso, S(0.205, 28, 20), gun, 0, 0.26, 0, 1.16, 0.52, 0.9);
  // purple lining along the zip (front of the jacket) + cyan zipper — not floating side ovals
  part(torso, new THREE.BoxGeometry(0.052, 0.2, 0.018), purp, -0.036, 0.17, 0.172);
  part(torso, new THREE.BoxGeometry(0.052, 0.2, 0.018), purp, 0.036, 0.17, 0.172);
  part(torso, new THREE.BoxGeometry(0.014, 0.24, 0.012), cyanG, 0, 0.17, 0.184);
  part(torso, new THREE.BoxGeometry(0.02, 0.022, 0.016), cyanG, 0, 0.075, 0.19);
  // high open collar, purple inner, gap on +z
  const col = part(torso, new THREE.CylinderGeometry(0.085, 0.125, 0.13, 32, 1, true, 0.7, Math.PI * 2 - 1.4), gun, 0, 0.34, 0.018);
  col.material = col.material.clone(); col.material.side = THREE.DoubleSide;
  const colIn = part(torso, new THREE.CylinderGeometry(0.076, 0.114, 0.12, 32, 1, true, 0.7, Math.PI * 2 - 1.4), purp, 0, 0.34, 0.014);
  colIn.material = colIn.material.clone(); colIn.material.side = THREE.DoubleSide;
  const neck = new THREE.Group(); neck.position.y = 0.34; torso.add(neck);
  part(neck, CAP(0.03, 0.035, 8, 16), skin, 0, 0.012, 0);
  const head = new THREE.Group(); head.position.y = 0.05; neck.add(head);
  // hat-friendly local skull (top ~0.35, cap at 0.215), then scaled up so the head is ~37% of standing height and wider than the shoulders
  const eggPts = [[0.022, 0.008], [0.048, 0.028], [0.095, 0.055], [0.14, 0.09], [0.172, 0.125], [0.186, 0.162], [0.188, 0.2], [0.178, 0.24], [0.155, 0.278], [0.118, 0.312], [0.058, 0.338], [0.001, 0.352]].map(p => new THREE.Vector2(p[0], p[1]));
  const egg = part(head, new THREE.LatheGeometry(eggPts, 64), skin);
  egg.geometry.computeVertexNormals();
  // Rounded almond eyes (same grape and outer-corner tilt as 1dcb401), but completely
  // black and flush: no highlights, unlit black material, every vertex projected onto a
  // thin shell just outside the head lathe so they sit in the face with no bulge.
  const eggR = y => {
    if (y <= eggPts[0].y) return eggPts[0].x;
    if (y >= eggPts[eggPts.length - 1].y) return eggPts[eggPts.length - 1].x;
    for (let i = 0; i < eggPts.length - 1; i++) {
      if (y <= eggPts[i + 1].y) {
        const t = (y - eggPts[i].y) / (eggPts[i + 1].y - eggPts[i].y);
        return eggPts[i].x + t * (eggPts[i + 1].x - eggPts[i].x);
      }
    }
    return eggPts[eggPts.length - 1].x;
  };
  const conformEye = (mesh, pad, thick) => {
    mesh.updateMatrix();
    const mat = mesh.matrix.clone();
    const inv = mat.clone().invert();
    const pos = mesh.geometry.attributes.position;
    const v = new THREE.Vector3(), local = new THREE.Vector3();
    const rGeo = 0.07;
    for (let i = 0; i < pos.count; i++) {
      local.fromBufferAttribute(pos, i);
      const nz = THREE.MathUtils.clamp(local.z / rGeo, -1, 1);
      v.copy(local).applyMatrix4(mat);
      const r = Math.hypot(v.x, v.z);
      if (r < 1e-8) continue;
      const target = eggR(v.y) + pad - (1 - nz) * 0.5 * thick;
      const k = target / r;
      v.x *= k; v.z *= k;
      v.applyMatrix4(inv);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  };
  for (const sd of [-1, 1]) {
    const eye = part(head, S(0.07, 40, 32), eyeM, 0.116 * sd, 0.167, 0.195, 1.42, 0.72, 0.14);
    eye.name = 'alienEye'; eye.rotation.z = 0.36 * sd; eye.rotation.y = -0.18 * sd;
    eye.renderOrder = 1;
    conformEye(eye, 0.003, 0.008);
  }
  part(head, S(0.006, 8, 6), skinD, -0.012, 0.108, 0.156, 0.7, 1.1, 0.4);
  part(head, S(0.006, 8, 6), skinD, 0.012, 0.108, 0.156, 0.7, 1.1, 0.4);
  const mouth = part(head, new THREE.TorusGeometry(0.022, 0.0035, 6, 16, Math.PI * 0.48), lip, 0, 0.072, 0.118);
  mouth.rotation.set(1.05, 0, Math.PI);
  const cap = new THREE.Group(); cap.position.set(0, 0.215, -0.005); cap.rotation.x = -0.08; cap.userData.gaCap = 1; head.add(cap);
  part(cap, new THREE.SphereGeometry(0.188, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), pink, 0, 0, 0, 1, 0.82, 1.03);
  part(cap, new THREE.CylinderGeometry(0.19, 0.19, 0.03, 24, 1, true), pinkD, 0, 0.005, 0, 1, 1, 1.03);
  part(cap, new THREE.CylinderGeometry(0.15, 0.15, 0.014, 22, 1, false, -Math.PI * 0.5, Math.PI), pinkD, 0, -0.005, 0.17, 1, 1, 1.0).rotation.x = 0.1;
  part(cap, S(0.018, 8, 6), pinkD, 0, 0.152, 0);
  head.scale.setScalar(2.18);   // chibi head ~38% of standing height and wider than the shoulders; hats/glasses inherit the scale
  const arms = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.225 * sd, 0.28, 0); torso.add(sh);
    part(sh, S(0.078, 20, 16), gun, 0.01 * sd, 0.01, 0);                   // rounded pad, same colour, not a flat disc
    part(sh, CAP(0.07, 0.14, 12, 24), gun, 0.008 * sd, -0.12, 0);          // short thick upper arm, buried into the elbow
    const el = new THREE.Group(); el.position.set(0.01 * sd, -0.22, 0); sh.add(el);
    part(el, CAP(0.07, 0.1, 12, 24), gun, 0, -0.06, 0);                    // matching forearm radius, overlaps the upper arm
    part(el, CYL(0.072, 0.072, 0.042, 18), cyanG, 0, -0.175, 0);
    part(el, CYL(0.076, 0.076, 0.012, 18), cyan, 0, -0.175, 0);
    const hand = part(el, S(0.05, 16, 14), glove, 0, -0.24, 0.016, 1.1, 0.82, 1.15);
    part(hand, CAP(0.016, 0.03, 6, 10), glove, -0.04 * sd, 0.0, 0.03);    // thumb
    for (let f = 0; f < 4; f++) part(hand, CAP(0.014, 0.036, 6, 10), glove, (f - 1.5) * 0.018, -0.044, 0.014);
    arms.push({ sh, el, hand, sd });
  }
  const phone = new THREE.Group(); phone.name = 'idlePhone'; phone.visible = false;
  const pcv = document.createElement('canvas'); pcv.width = 128; pcv.height = 256; const ptex = new THREE.CanvasTexture(pcv); ptex.colorSpace = THREE.SRGBColorSpace;
  part(phone, new THREE.BoxGeometry(0.075, 0.14, 0.009), mk(0x111116, { roughness: 0.3, metalness: 0.6 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.128), new THREE.MeshBasicMaterial({ map: ptex, color: 0xe0e8f4 })); scr.position.z = 0.0052; phone.add(scr);
  arms[1].el.add(phone); phone.position.set(0.0, -0.28, 0.055); phone.rotation.set(-0.2, 0.75, -2.1);
  const pack = new THREE.Group(); pack.name = 'backpack'; pack.position.set(0, 0.2, -0.2); torso.add(pack);
  // robot: keep ~current size or a touch bigger (r=0.195); visor + eye on +Z so it faces the same way as the alien
  const bot = new THREE.Group(); bot.name = 'alienBot'; bot.position.set(0.64, 0.52, -0.16); bot.userData.baseY = 0.52; torso.add(bot);
  const botShell = mk(0xe8eef4, { roughness: 0.28, metalness: 0.48, emissive: 0x2a3848, emissiveIntensity: 0.18 });
  const botDark = mk(0x10141a, { roughness: 0.22, metalness: 0.45 });
  part(bot, S(0.195, 32, 24), botShell);
  const aura = part(bot, S(0.214, 20, 16), new THREE.MeshBasicMaterial({ color: 0x44e8ff, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  aura.renderOrder = 2;
  part(bot, S(0.16, 24, 18), botDark, 0, 0.014, 0.125, 0.88, 0.8, 0.5);
  part(bot, S(0.088, 24, 18), cyanG, 0, 0.018, 0.188);
  part(bot, S(0.04, 14, 12), new THREE.MeshBasicMaterial({ color: 0xd8ffff, toneMapped: false }), 0, 0.026, 0.228);
  part(bot, new THREE.TorusGeometry(0.09, 0.011, 8, 24), cyanG, 0, 0.018, 0.18);
  for (const sd of [-1, 1]) {
    const ear = part(bot, CYL(0.05, 0.05, 0.03, 16), botShell, 0.182 * sd, 0.016, 0);
    ear.rotation.z = Math.PI / 2;
    const rim = part(bot, new THREE.TorusGeometry(0.05, 0.008, 8, 16), gunD, 0.198 * sd, 0.016, 0);
    rim.rotation.y = Math.PI / 2;
  }
  part(bot, CYL(0.012, 0.01, 0.1, 8), gun, 0, 0.25, 0);
  part(bot, S(0.03, 12, 10), botShell, 0, 0.31, 0);
  const tail = new THREE.Group(); tail.name = 'tail'; tail.visible = false; hips.add(tail);
  root.userData = { hips, torso, neck, head, legs, arms, phone, pcv, ptex, pack, tail, bot, char: 'alien' };
  return root;
}
function setPlayerChar(kind) {
  kind = kind === 'alien' ? 'alien' : 'monkey';
  if ((monkey.userData.char || 'monkey') === kind) return monkey;
  const tag = monkey.getObjectByName('gaNameTag');
  if (tag) monkey.remove(tag);
  while (monkey.children.length) monkey.remove(monkey.children[0]);
  const neu = kind === 'alien' ? makeAlien() : makeMonkey();
  while (neu.children.length) monkey.add(neu.children[0]);
  monkey.userData = neu.userData;
  monkey.userData.char = kind;
  if (tag) monkey.add(tag);
  if (st.fly) st.fly.fxG = null;
  return monkey;
}
function tickBot(u, t) {
  const b = u && u.bot; if (!b) return;
  const y0 = b.userData.baseY != null ? b.userData.baseY : 0.52;
  b.position.x = 0.64 + Math.sin(t * 1.15) * 0.016;
  b.position.y = y0 + Math.sin(t * 2.35) * 0.035;
  b.position.z = -0.16 + Math.cos(t * 1.05) * 0.01;
  b.rotation.y = 0;   // visor stays on the alien's forward (+Z)
  b.rotation.z = Math.sin(t * 1.9) * 0.06;
}

const monkey = makeMonkey(); scene.add(monkey);
// soft rim/fill light that follows the monkey so he reads against the dark room
const monkeyFill = new THREE.PointLight(0xff7ad9, 0.7, 3.5, 1.5); scene.add(monkeyFill);
const monkeyRim = new THREE.PointLight(0x40d0ff, 0.9, 3.5, 1.5); scene.add(monkeyRim);
monkey.position.set(0, 0, 5);

// ---------- input ----------
const keys = {};
const st = { yaw: 0, pitch: 0.28, dist: 4.2, fp: false, vel: new THREE.Vector3(), face: Math.PI, phase: 0, speed: 0, play: 0, t: 0, joy: { x: 0, y: 0, on: false, dist: 0, vmax: 0 },
  fly: { e: 1, air: false, thrust: false, hold: false, vy: 0, show: false, pct: -1, btn: false, fxOn: 0, fxG: null, fx: null } };
monkey.rotation.y = st.face;
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyV') toggleView(); if (e.code === 'KeyF') toggleFs(); if (/Arrow|Space/.test(e.code)) e.preventDefault(); if (e.code === 'Space' && !e.repeat && !jetpackEquipped()) st.jumpReq = st.t; });
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; st.fly.hold = false; joyClear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) joyClear(); });
const cv = renderer.domElement;
let mouseDrag = null;
cv.addEventListener('mousedown', e => { mouseDrag = { x: e.clientX, y: e.clientY }; cv.focus(); });
addEventListener('mouseup', () => mouseDrag = null);
addEventListener('mousemove', e => {
  if (document.pointerLockElement === cv) { look(e.movementX, e.movementY); return; }
  if (!mouseDrag) return; look(e.clientX - mouseDrag.x, e.clientY - mouseDrag.y); mouseDrag = { x: e.clientX, y: e.clientY };
});
cv.addEventListener('dblclick', () => { if (!MOBILE) cv.requestPointerLock?.(); });
// Camera distance (Dave): desktop mouse-wheel zoom still persists. On a phone, hold the ZOOM button beside the backpack to ease in; release returns to the default. Default = PR6 wider cam (7.6 landscape / 4.2 portrait).
const ZOOM_KEY = 'galacticarcade.zoom';
const DIST_PORTRAIT = 4.2, DIST_WIDE = 7.6, DIST_MIN = 2.0, DIST_MAX = DIST_WIDE * 2;   // max ~2× the wider default
function saveZoom() { try { localStorage.setItem(ZOOM_KEY, String(+st.dist.toFixed(3))); } catch (e) {} }
function setDist(d, persist = true) {
  st.dist = THREE.MathUtils.clamp(d, DIST_MIN, DIST_MAX);
  st.distUser = true; st.lookT = st.t;
  if (persist) saveZoom();
  return st.dist;
}
function loadZoom() {
  try {
    const v = parseFloat(localStorage.getItem(ZOOM_KEY));
    if (Number.isFinite(v) && v >= DIST_MIN && v <= DIST_MAX) { st.dist = v; st.distUser = true; return true; }
  } catch (e) {}
  return false;
}
if (!MOBILE) loadZoom();   // desktop wheel zoom may persist; the hold-to-zoom button never writes this key
cv.addEventListener('wheel', e => { setDist(st.dist + e.deltaY * 0.004); e.preventDefault(); }, { passive: false });
function look(dx, dy) { st.lookT = st.t; st.yaw -= dx * 0.005; st.pitch = THREE.MathUtils.clamp(st.pitch + dy * 0.004, -0.6, 1.25); }
function defaultDist() { return (MOBILE && camera.aspect > 1.15) ? DIST_WIDE : DIST_PORTRAIT; }
// touch: the bottom-left stick steers. The thumb stays inside the base; the dotted line and the
// speed follow the real finger, so a drag past the rim still walks faster up to a capped sprint.
// One-finger swipe on the game view (outside the stick and HUD) turns the camera, as it did before pinch-zoom.
const joyEl = document.getElementById('joy'), knob = document.getElementById('knob');
const joyLine = document.getElementById('joyLine'), joyDash = document.getElementById('joyDash');
const JOY_DEAD = 12, JOY_REACH = 176, JOY_GENTLE = 1.05, JOY_SPRINT = 5.2;
const touches = {};
let joyId = null, joyArm = null;
function joyCenter() {
  const r = joyEl.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: Math.min(r.width, r.height) / 2 - 12 };
}
function inJoyZone(x, y) {
  if (!MOBILE) return false;
  const c = joyCenter();
  return Math.hypot(x - c.x, y - c.y) < 210;
}
function joySpeed(dist) {
  if (dist <= JOY_DEAD) return 0;
  const t = Math.min(1, (dist - JOY_DEAD) / (JOY_REACH - JOY_DEAD)), s = t * t * (3 - 2 * t);
  return JOY_GENTLE + (JOY_SPRINT - JOY_GENTLE) * s;
}
function joyFrom(x, y) {
  const c = joyCenter(), dx = x - c.x, dy = y - c.y, dist = Math.hypot(dx, dy);
  st.joy.on = true; st.joy.dist = dist; st.joy.vmax = joySpeed(dist);
  if (dist > 0.5) { st.joy.x = dx / dist; st.joy.y = dy / dist; } else { st.joy.x = 0; st.joy.y = 0; }
  const show = dist > JOY_DEAD, cl = Math.min(c.R, dist);
  knob.style.transform = show ? `translate(${st.joy.x * cl}px,${st.joy.y * cl}px)` : '';
  if (show) {
    joyLine.classList.add('on');
    joyDash.setAttribute('x1', c.x); joyDash.setAttribute('y1', c.y);
    joyDash.setAttribute('x2', x); joyDash.setAttribute('y2', y);
  } else joyLine.classList.remove('on');
}
function joyClear() {
  joyId = null; st.joy.on = false; st.joy.x = 0; st.joy.y = 0; st.joy.dist = 0; st.joy.vmax = 0;
  knob.style.transform = ''; joyLine.classList.remove('on');
}
function syncJoyArm() {
  const startUp = document.getElementById('start') && window.__start && window.__start.shown && !window.__start.dismissed;
  const on = !!(MOBILE && !startUp);
  if (on === joyArm) return;
  joyArm = on; joyEl.classList.toggle('arm', on);
  if (!on) joyClear();
}
cv.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (joyId == null && inJoyZone(t.clientX, t.clientY)) { joyId = t.identifier; touches[t.identifier] = { kind: 'joy', x0: t.clientX, y0: t.clientY }; joyFrom(t.clientX, t.clientY); }
    else touches[t.identifier] = { kind: 'look', x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: e.timeStamp, moved: 0 };
  }
  e.preventDefault();
}, { passive: false });
cv.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    const T = touches[t.identifier]; if (!T) continue;
    if (T.kind === 'joy') joyFrom(t.clientX, t.clientY);
    else {
      T.moved = Math.max(T.moved, Math.hypot(t.clientX - T.x0, t.clientY - T.y0));
      look((t.clientX - T.x) * 1.4, (t.clientY - T.y) * 1.4); T.x = t.clientX; T.y = t.clientY;
    }
  }
  e.preventDefault();
}, { passive: false });
const endTouch = e => {
  for (const t of e.changedTouches) {
    const T = touches[t.identifier]; if (!T) continue;
    if (T.kind === 'joy') {
      const tap = e.type === 'touchend' && Math.hypot(t.clientX - T.x0, t.clientY - T.y0) < 10;
      joyClear();
      if (tap && window.__grid) window.__grid.tapAt(t.clientX, t.clientY);
    } else if (T.kind === 'look' && e.type === 'touchend' && T.moved < 14 && e.timeStamp - T.t0 < 350) {
      if (!(window.__grid && window.__grid.tapAt(t.clientX, t.clientY))) st.jumpReq = st.t;
    }
    delete touches[t.identifier];
  }
};
cv.addEventListener('touchend', endTouch); cv.addEventListener('touchcancel', endTouch);
// Hold-to-zoom button (Dave): sits just left of the backpack. Hold eases the camera in toward
// DIST_MIN over ~0.7 s; let go and it eases back to the normal portrait/landscape default. Never saved.
const ZOOM_HOLD_T = 0.7;
const zoomHold = { on: false, k: 0 };
const zoomCss = document.createElement('style');
zoomCss.textContent = '#bZoom{position:fixed;right:calc(max(4px,env(safe-area-inset-right)) + 108px);bottom:calc(max(4px,env(safe-area-inset-bottom)) + 24px);z-index:24;width:56px;height:56px;border-radius:50%;padding:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:2px solid #00e5ffaa;background:#0a0612ee;color:#dffbff;box-shadow:0 0 12px #00e5ff66,inset 0 0 10px #00e5ff33;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}'
  + '#bZoom.on{display:flex}#bZoom.held,#bZoom:active{border-color:#ffe08a;box-shadow:0 0 16px #ffb00099,inset 0 0 12px #ffb00044;transform:scale(.96)}'
  + '#bZoom svg{width:22px;height:22px;display:block;filter:drop-shadow(0 0 4px #00e5ff)}#bZoom span{font:900 8px/1 "Courier New",monospace;letter-spacing:.08em;color:#dffbff}'
  + 'body.ingame #bZoom{display:none!important}';
document.head.appendChild(zoomCss);
const bZoom = document.createElement('button'); bZoom.id = 'bZoom'; bZoom.type = 'button'; bZoom.title = 'Hold to zoom in'; bZoom.setAttribute('aria-label', 'Hold to zoom in');
bZoom.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#dffbff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2"/><path d="M15.2 15.2L21 21"/><path d="M10.5 7.6v5.8M7.6 10.5h5.8"/></svg><span>ZOOM</span>';
document.body.appendChild(bZoom);
function zoomStopEv(e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }
bZoom.addEventListener('pointerdown', e => { zoomStopEv(e); try { bZoom.setPointerCapture(e.pointerId); } catch (err) {} zoomHold.on = true; bZoom.classList.add('held'); });
bZoom.addEventListener('pointerup', e => { zoomStopEv(e); zoomHold.on = false; bZoom.classList.remove('held'); });
bZoom.addEventListener('pointercancel', () => { zoomHold.on = false; bZoom.classList.remove('held'); });
for (const ev of ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click']) bZoom.addEventListener(ev, zoomStopEv);
function syncZoomBtn() {
  const pack = document.getElementById('bPack'), show = !!(pack && pack.classList.contains('on'));
  bZoom.classList.toggle('on', show);
  if (!show && zoomHold.on) { zoomHold.on = false; bZoom.classList.remove('held'); }
}
function tickZoom(dt) {
  const goal = zoomHold.on ? 1 : 0;
  if (zoomHold.k === goal && !zoomHold.on) return;
  if (zoomHold.k !== goal) {
    const dir = goal > zoomHold.k ? 1 : -1;
    zoomHold.k = THREE.MathUtils.clamp(zoomHold.k + dir * Math.min(Math.max(dt, 0), 0.2) / ZOOM_HOLD_T, 0, 1);
  }
  const home = defaultDist(), e = zoomHold.k * zoomHold.k * (3 - 2 * zoomHold.k);
  st.dist = home + (DIST_MIN - home) * e;
  st.lookT = st.t;   // keep cabinet showcase from fighting the zoom
}
function toggleView() { st.fp = !st.fp; }
function toggleFs() { const d = document; if (!d.fullscreenElement) d.documentElement.requestFullscreen?.().catch(() => {}); else d.exitFullscreen?.(); }
function updateTurn() {
  const el = document.getElementById('turnHint'); if (!el) return;
  const portrait = MOBILE && innerHeight > innerWidth * 1.08;
  el.classList.toggle('on', portrait);
}
function wantWide() {
  if (!MOBILE) { st.orientLock = 'desktop'; updateTurn(); return; }
  st.orientTried = true;
  const root = document.documentElement, fs = root.requestFullscreen || root.webkitRequestFullscreen;
  if (fs && !document.fullscreenElement) Promise.resolve(fs.call(root)).catch(() => {});
  const o = screen.orientation;
  if (o && typeof o.lock === 'function') {
    Promise.resolve(o.lock('landscape')).then(() => { st.orientLock = 'ok'; updateTurn(); }).catch(() => { st.orientLock = 'failed'; updateTurn(); });
  } else { st.orientLock = 'unsupported'; updateTurn(); }
}
window.__wantWide = wantWide;
document.getElementById('bView').onclick = toggleView;
document.getElementById('bFs').onclick = toggleFs;
if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) document.getElementById('bFs').style.display = 'none';

// ---------- post ----------
const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: PS.on ? 0 : (MOBILE ? 2 : 4) });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * Q.bloom, innerHeight * Q.bloom), 0.75, 0.5, 0.4); bloom.highPassUniforms.smoothWidth.value = 0.6;   // soft knee 0.4..1.0 (was a hard cut at 0.85): cyan/amber tubes (lum >= 1) bloom as before, the 70% pink strips (lum ~0.68) keep a weaker halo instead of losing it
composer.addPass(bloom);
composer.addPass(new OutputPass());
// iPad Safari fix: setSize used to write inline px width/height from innerWidth/innerHeight at load, which on iPad can be
// a stale, short height (toolbar not settled, no later 'resize'), so the canvas covered only the top ~70%. Now the CSS
// sizes the canvas and we track its real box via ResizeObserver + resize/orientationchange/visualViewport.
let vw0 = 0, vh0 = 0;
function viewSize() {
  const c = renderer.domElement;
  return [Math.max(1, Math.round(c.clientWidth || innerWidth)), Math.max(1, Math.round(c.clientHeight || innerHeight))];
}
function resize(force) {
  const [W, H] = viewSize();
  if (force !== true && W === vw0 && H === vh0 && renderer.getPixelRatio() === dpr) return;
  vw0 = W; vh0 = H;
  camera.aspect = W / H;
  camera.fov = camera.aspect < 0.85 ? 72 : (MOBILE && camera.aspect > 1.15 ? 70 : 60);
  if (MOBILE && !st.fp && !st.distUser) st.dist = camera.aspect > 1.15 ? DIST_WIDE : DIST_PORTRAIT;
  camera.updateProjectionMatrix();
  updateTurn(); syncJoyArm();
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); composer.setPixelRatio(dpr); composer.setSize(W, H);
  bloom.resolution.set(W * Q.bloom, H * Q.bloom);
  room2.userData.mirror?.getRenderTarget().setSize(Math.round(W * dpr * Q.refl), Math.round(H * dpr * Q.refl));
  mirror.getRenderTarget().setSize(Math.round(W * dpr * Q.refl), Math.round(H * dpr * Q.refl));
}
const resizeSoon = () => { resize(); setTimeout(resize, 120); setTimeout(resize, 600); };
addEventListener('resize', resizeSoon); addEventListener('orientationchange', resizeSoon); addEventListener('pageshow', resizeSoon);
window.visualViewport?.addEventListener('resize', resizeSoon);
if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(renderer.domElement);
resize(true);
function applyQuality() { Q = qualityFor(PS.on); dpr = Math.min(devicePixelRatio || 1, Q.dpr); resize(true); }
function setPowerSave(on) { PS.on = !!on; try { localStorage.setItem(PS_KEY, PS.on ? '1' : '0'); } catch (e) {} applyQuality(); try { if (window.__powerSaveUI) window.__powerSaveUI.sync(); } catch (e) {} return PS.on; }
PS.set = setPowerSave;

// ---------- simulation ----------
const R = 0.3, LIM = HALF - 0.35;
// walkable areas: union of axis boxes (room 1, hallway [, room 2]); clamp to the nearest one
const AREAS = [{ x0: -LIM, x1: LIM, z0: -LIM, z1: LIM }, { x0: -DOOR_W / 2 + (HALF - LIM), x1: DOOR_W / 2 - (HALF - LIM), z0: Z2 + LIM - 0.01, z1: -LIM + 0.01 }, { x0: -LIM, x1: LIM, z0: Z2 - LIM, z1: Z2 + LIM }, { x0: WX - LIM, x1: WX + LIM, z0: -LIM, z1: LIM }];   // last: teleporter white room
function clampAreas(p, areas, pad = 0) {
  let best = null, bd = 1e9;
  for (const a of areas) { const x = THREE.MathUtils.clamp(p.x, a.x0 - pad, a.x1 + pad), z = THREE.MathUtils.clamp(p.z, a.z0 - pad, a.z1 + pad), d = (x - p.x) ** 2 + (z - p.z) ** 2; if (d < bd) { bd = d; best = [x, z]; } if (!d) break; }
  p.x = best[0]; p.z = best[1]; return p;
}
let shield = null, kiosk = null, tp = null, shop = null, golf = null;   // red energy shield in the doorway (shield.js)
const CLIP_AREA = [{ x0: -LIM, x1: LIM, z0: Z2 - LIM, z1: LIM }, { x0: WX - LIM, x1: WX + LIM, z0: -LIM, z1: LIM }];   // noclip: outer building envelope only (both rooms + hallway span)
function collide(p) {
  if (DEV.clip) { clampAreas(p, CLIP_AREA); collideCabs(p); return; }   // walls, doors, shield and plinths off; cabinets stay solid
  if (golf && golf.below) { golf.collideBelow(p, R); return; }   // t275u: down in the mini golf room, golf.js owns the walls
  clampAreas(p, AREAS);
  if (shield) shield.block(p, R);
  if (l2door) l2door.block(p, R);
  if (golf) golf.block(p, R);   // mini golf stairs + shield (golf.js)
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
// ---------- LAVA falls (Dave: 'if the player steps off the path, it falls into the lava then respawns instantly back on the path') ----------
// cosmetic + harmless: a 0.45 s sink with an orange flash and a sizzle, then he stands on the nearest free centre-line point of a cave path.
// JUMP (t187, Dave: 'allow the player to jump by walking and tapping the right side'): 0.56 s arc, 0.8 m high, carries the run-up speed
// (walk 2.4 m/s -> ~1.35 m, run 5.2 m/s -> ~2.9 m). Collision stays on (no hopping walls / cabinets); no double jump; lava only checked on landing.
const JUMP_T = 0.56, JUMP_H = 0.8;
let jumpAC = null;
function thud() { try { const ac = jumpAC = jumpAC || window.__unlockAC || new (window.AudioContext || window.webkitAudioContext)(); if (window.__muted || (window.__mute && window.__mute.on)) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.18); } catch (e) {} }
function canJump() { const S = window.__start, F = window.__floorBtn;
  return !st.jump && !st.fly.air && !st.lavaFall && !st.seated && play.mode === 'walk' && !(tp && tp.locked) && !(shop && shop.open) && !(S && S.shown && !S.dismissed) && !(F && F.open) && !document.body.classList.contains('ingame'); }
const LAVA_FALL = 0.45, lavaFx = document.createElement('div'); lavaFx.id = 'lavaFx'; document.body.appendChild(lavaFx);
let lavaAC = null;
function sizzle() { try { const ac = lavaAC = lavaAC || window.__unlockAC || new (window.AudioContext || window.webkitAudioContext)(); if (window.__muted || (window.__mute && window.__mute.on)) return;
  const n = Math.floor(ac.sampleRate * 0.5), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = b; f.type = 'highpass'; f.frequency.value = 2400; g.gain.value = 0.22;
  src.connect(f).connect(g).connect(ac.destination); src.start(); } catch (e) {} }
function lavaRespawnPoint(x, z) {   // nearest centre-line sample that is not inside a wall, cabinet, the kiosk or a closed shield
  const pts = LAVA.samples().map(p => [p[0], p[1], (p[0] - x) ** 2 + (p[1] - z) ** 2]).filter(p => p[2] < 400).sort((a, b) => a[2] - b[2]), q = new THREE.Vector3();
  for (const p of pts) { q.set(p[0], 0, p[1]); collide(q); if (Math.hypot(q.x - p[0], q.z - p[1]) < 0.01 && LAVA.onPath(q.x, q.z, 0)) return q; }
  return new THREE.Vector3(0, 0, 5); }   // spawn point (always on the path)
function lavaFallStart() { st.lavaFall = { t: 0, x: monkey.position.x, z: monkey.position.z }; st.lavaFalls = (st.lavaFalls || 0) + 1; st.vel.set(0, 0, 0); st.speed = 0;
  lavaFx.classList.remove('on'); void lavaFx.offsetWidth; lavaFx.classList.add('on'); sizzle(); }
function lavaFallStep(dt) { const f = st.lavaFall; f.t += dt; const k = Math.min(1, f.t / LAVA_FALL);
  monkey.position.y = -0.95 * k * k; monkey.rotation.y = st.face;
  if (k >= 1) { const p = lavaRespawnPoint(f.x, f.z); monkey.position.set(p.x, 0, p.z); st.vel.set(0, 0, 0); st.lavaFall = null; st.lastRespawn = [p.x, p.z]; return false; }
  return true; }
// JETPACK. The Accessories back item "jetpack" (player.js, 5 tickets, same id as the cosmetic pack) is the only one.
// Hold the FLY button or Space. WASD and the left-side touch stick still steer. While it is equipped, Space flies instead of jumping;
// a short tap on the right half of the screen still jumps from the ground. Tank size is 1.
//   drain 0.125/s while thrusting           -> 8.0 s of powered flight from full
//   refill 0.16/s on the ground, pack on    -> 6.25 s from empty. Nothing refills in the air, and taking it off does not refill.
//   after empty, thrust waits for 0.08      -> about 0.5 s of ground time, so a tap cannot sip a new hop out of an empty tank
//   climb 3.4 m/s; release or empty eases down at 2.4 m/s. One full tank from the floor reaches the shop dome's safe crown with fuel left to hover.
//   2.05 m of headroom: room ceiling 8.5 -> feet <= 6.45; hallway and its doorways 3.0 -> feet <= 0.95
// Games, pool, menus, the start screen and a teleport put the feet back on the floor. Unequipping in the air just stops thrust and descends.
const FLY = { drain: 0.125, fill: 0.16, min: 0.08, up: 3.4, down: 2.4, body: 2.05 };
const FLY_MENUS = ['tview', 'homeQ', 'gOpt', 'kview', 'poolOv', 'opt'];
const flyStyle = document.createElement('style');
flyStyle.textContent = '#flyHud{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 158px);z-index:25;display:none;flex-direction:column;align-items:center;gap:5px;touch-action:none;user-select:none;-webkit-user-select:none}'
  + '#flyHud.on{display:flex}#flyHud b{font:900 10px/1 "Courier New",monospace;letter-spacing:.14em;color:#ffe0b0;text-shadow:0 0 6px #ff8a1a}'
  + '#flyMeter{width:74px;height:12px;border-radius:6px;border:2px solid #ffb060;background:#140804e6;overflow:hidden;box-shadow:0 0 8px #ff8a1a88}'
  + '#flyMeter i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff3b1a,#ffb020 55%,#ffe080);transform-origin:left center;transform:scaleX(1)}'
  + '#flyMeter.low i{background:#ff3030}#bFly{width:74px;height:74px;border-radius:50%;border:3px solid #ffb020;background:radial-gradient(circle at 50% 42%,#4a2a08f2,#120804f2);color:#fff;font:900 16px/1 "Courier New",monospace;letter-spacing:.06em;text-shadow:0 0 8px #ff8a1a;box-shadow:0 0 14px #ff8a1a99,inset 0 0 12px #ff8a1a44;padding:0;cursor:pointer}'
  + '#bFly.on{border-color:#fff6d0;background:radial-gradient(circle at 50% 42%,#ff9a2acc,#3a1404f2)}'
  + '@media (pointer:fine){#bFly::after{content:"SPACE";display:block;margin-top:4px;font-size:9px;letter-spacing:.12em;color:#ffd098}}'
  + 'body.ingame #flyHud{display:none!important}';
document.head.appendChild(flyStyle);
const flyHudEl = document.createElement('div'); flyHudEl.id = 'flyHud';
flyHudEl.innerHTML = '<b>ENERGY</b><div id="flyMeter" title="Jetpack energy"><i></i></div><button id="bFly" type="button" title="Hold to fly. Space does the same.">FLY</button>';
document.body.appendChild(flyHudEl);
const flyMeterEl = flyHudEl.querySelector('#flyMeter'), flyBarEl = flyMeterEl.firstChild, bFly = flyHudEl.querySelector('#bFly');
const flyStopEv = e => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
bFly.addEventListener('pointerdown', e => { flyStopEv(e); try { bFly.setPointerCapture(e.pointerId); } catch (err) {} st.fly.hold = true; });
bFly.addEventListener('pointerup', e => { flyStopEv(e); st.fly.hold = false; });
bFly.addEventListener('pointercancel', () => { st.fly.hold = false; });
for (const ev of ['touchstart', 'touchend', 'mousedown', 'mouseup']) flyHudEl.addEventListener(ev, e => e.stopPropagation());
addEventListener('galacticarcade:look', () => { st.fly.fxG = null; });
function jetpackEquipped() { const g = window.__gaPlayer; return !!(g && g.p && g.p.back === 'jetpack'); }
function flyBlocked() {
  if (play.mode !== 'walk' || st.seated || st.lavaFall) return true;
  if (tp && tp.locked) return true;
  if (shop && shop.open) return true;
  if (golf && golf.aiming) return true;
  const S = window.__start; if (S && S.shown && !S.dismissed) return true;
  const F = window.__floorBtn; if (F && F.open) return true;
  if (window.__optsOpen || (window.__wardrobe && window.__wardrobe.isOpen) || (window.__inv && window.__inv.open) || (window.__pool && window.__pool.open) || document.body.classList.contains('ingame')) return true;
  if (kiosk && kiosk.mode !== 'walk' && kiosk.mode !== 'pick') return true;
  for (let i = 0; i < FLY_MENUS.length; i++) { const e = document.getElementById(FLY_MENUS[i]); if (e && e.classList.contains('on')) return true; }
  return false;
}
function flyHud(on) { const f = st.fly; if (f.show === on) return; f.show = on; flyHudEl.classList.toggle('on', on); }
function flyMeter(e) { const pct = (e * 100 + 0.5) | 0, f = st.fly; if (pct === f.pct) return; f.pct = pct; flyBarEl.style.transform = 'scaleX(' + (pct * 0.01) + ')'; flyMeterEl.classList.toggle('low', pct <= 18); }
function flyBtn(on) { const f = st.fly; if (f.btn === on) return; f.btn = on; bFly.classList.toggle('on', on); }
function flyFx(on) {
  const f = st.fly; if (!on && !f.fxOn) return;
  let g = f.fxG;
  if (!g || !g.parent) { g = monkey.getObjectByName('gaBk_jetpack'); f.fxG = g || null; f.fx = [];
    if (g) { const ch = g.children; for (let i = 0; i < ch.length; i++) if (ch[i].name === 'gaThruster') f.fx.push(ch[i]); } }
  const fx = f.fx; if (!fx || fx.length < 2) { f.fxOn = 0; return; }
  if (!on) { f.fxOn = 0; for (let i = 0; i < fx.length; i++) { fx[i].visible = false; fx[i].scale.set(1, 1, 1); } return; }
  f.fxOn = 1; const s = 0.78 + Math.sin(st.t * 28) * 0.22, w = 0.88 + Math.sin(st.t * 17) * 0.14;
  for (let i = 0; i < fx.length; i++) { fx[i].visible = true; fx[i].scale.set(w, s, w); }
}
function flyGround() {
  if (!(golf && golf.below)) return 0;
  const y = monkey.position.y; golf.ground(monkey.position); const g = monkey.position.y; monkey.position.y = y; return g;
}
function flyCap(p) {
  let cap = H - FLY.body;
  if (inHallZ(p.z) && Math.abs(p.x) < DOOR_W / 2 + 0.45) cap = DOOR_H - FLY.body;
  else if (shop && shop.domeCap && !(golf && golf.below)) { const c = shop.domeCap(p.x, p.z); if (c != null) cap = c; }   // shop barrel vault only; arcade and hall keep their own caps
  if (golf && golf.below) {
    const hole = p.x >= golf.X0 - 0.15 && p.x <= golf.X1 + 0.05 && p.z >= golf.Z0 && p.z <= golf.Z1;
    if (!hole) cap = Math.min(cap, golf.CEIL - FLY.body);
  }
  return cap;
}
function blockDoorHead(p, pz) {
  if (p.y <= DOOR_H - FLY.body) return;
  if (Math.abs(p.x) > DOOR_W / 2 + R) return;
  const zA = -HALF, zB = -HALF - HALL_L;
  if (pz >= zA - 0.02 && p.z < zA) p.z = zA;
  else if (pz <= zB + 0.02 && p.z > zB) p.z = zB;
  else if (p.z < zA && p.z > zB && (pz >= zA || pz <= zB)) p.z = pz >= (zA + zB) * 0.5 ? zA : zB;
}
function flyCut() {
  const f = st.fly; f.hold = false; f.thrust = false; f.vy = 0;
  if (f.air) { f.air = false; st.jump = null; monkey.position.y = flyGround(); }
  flyHud(false); flyBtn(false); flyFx(0);
}
function flyGuard() { const f = st.fly; if (!f.air && !f.thrust && !f.hold && !f.show) return; if (flyBlocked()) flyCut(); }
function flyIntegrate(dt) {
  const f = st.fly, equipped = jetpackEquipped();
  if (!equipped && !f.air && !f.hold && !f.thrust && !f.show) return false;
  if (flyBlocked()) { flyCut(); return false; }
  if (!equipped && !f.air) { f.thrust = false; f.vy = 0; flyHud(false); flyBtn(false); flyFx(0); return false; }
  const gy = flyGround(), request = equipped && !!(f.hold || keys.Space), canStart = f.air || f.e >= FLY.min;
  if (request && canStart && f.e > 0) f.e = Math.max(0, f.e - FLY.drain * dt);
  const powered = request && canStart && f.e > 0;
  if (powered && st.jump) st.jump = null;
  if (!powered && !f.air) {
    f.thrust = false; f.vy = 0;
    if (!st.jump && monkey.position.y <= gy + 0.02) { if (monkey.position.y < gy) monkey.position.y = gy; if (equipped) f.e = Math.min(1, f.e + FLY.fill * dt); }
    flyHud(equipped); flyMeter(f.e); flyBtn(false); flyFx(0); return false;
  }
  f.vy += ( (powered ? FLY.up : -FLY.down) - f.vy) * (1 - Math.exp(-dt * (powered ? 9 : 5)));
  monkey.position.y += f.vy * dt;
  const cap = flyCap(monkey.position);
  if (monkey.position.y > cap) { monkey.position.y = cap; if (f.vy > 0) f.vy = 0; }
  if (monkey.position.y <= gy) { monkey.position.y = gy; f.vy = 0; f.air = false; f.thrust = false; flyHud(equipped); flyMeter(f.e); flyBtn(false); flyFx(0); return false; }
  f.air = true; f.thrust = powered; flyHud(equipped); flyMeter(f.e); flyBtn(powered); flyFx(powered ? 1 : 0); return true;
}
let nearCab = null;
const ICE_SLIP = 3.2, ICE_COAST = 4.6;   // m/s (run 5.2, walk 2.4)
function step(dt) {
  st.t += dt;
  if (st.lavaFall) { const f = st.fly; if (f.air || f.thrust || f.hold || f.show) { f.air = false; f.thrust = false; f.hold = false; f.vy = 0; flyHud(false); flyBtn(false); flyFx(0); } if (lavaFallStep(dt)) return; }   // LAVA floor: sinking into the lava, then back on the nearest path
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  let mag = Math.min(1, Math.hypot(ix, iz)); if (mag) { ix /= Math.hypot(ix, iz); iz /= Math.hypot(ix, iz) || 1; }
  let run = keys.ShiftLeft || keys.ShiftRight;
  let joyV = null;
  if (st.joy.on) {
    const h = Math.hypot(st.joy.x || 0, st.joy.y || 0);
    if (h > 0.12) { ix = st.joy.x / h; iz = st.joy.y / h; mag = Math.min(1, h); if (st.joy.vmax > 0) joyV = st.joy.vmax; else run = h > 0.85; }
    else { ix = iz = mag = 0; run = false; }
  }
  if (tp && tp.locked) { ix = iz = mag = 0; run = false; if (!shop) loadShop(); }   // teleporting: input locked
  st.inMag = mag; st.lastStep = st.t;
  if (st.jumpReq != null) { const ok = st.t - st.jumpReq < 0.2 && canJump(); st.jumpReq = null;
    if (ok) { st.jump = { t: 0, vx: st.vel.x, vz: st.vel.z }; st.jumps = (st.jumps || 0) + 1; } }
  const sy = Math.sin(st.yaw), cy = Math.cos(st.yaw);
  // camera forward on ground = (-sin yaw, -cos yaw)
  const wx = ix * cy + iz * sy, wz = -ix * sy + iz * cy;
  const n = Math.hypot(wx, wz) || 1;
  const vmax = joyV != null ? joyV : (run ? 5.2 : 2.4) * mag;
  const tv = tmp.set(wx / n * vmax, 0, wz / n * vmax);
  if (st.jump && !st.fly.air) st.vel.set(st.jump.vx, 0, st.jump.vz).lerp(tmp.set(tv.x, 0, tv.z), 0.08);   // mid-air: carry the run-up, only a touch of steering
  else {   // ICE (t260): above ~62% of run speed you lose grip and slide/drift (low friction) until you slow under 1.2 m/s; slow walking stays grippy
    const onIce = floorMode === 'ice' && !st.fly.air && !st.seated && play.mode === 'walk' && !(shop && shop.open) && !(tp && tp.locked);
    if (!onIce) st.iceSlide = false; else { const sp = Math.hypot(st.vel.x, st.vel.z); if (sp > ICE_SLIP) { if (!st.iceSlide) st.iceSlides = (st.iceSlides || 0) + 1; st.iceSlide = true; } else if (sp < 1.2) st.iceSlide = false; }
    st.iceCoast = !!st.iceSlide && mag < 0.01;   // let go at speed: glide ~1 m with legs still (t262)
    st.vel.lerp(tv, 1 - Math.exp(-dt * (st.iceCoast ? ICE_COAST : st.iceSlide ? 2.5 : 10)));
  }
  const px0 = monkey.position.x, pz0 = monkey.position.z;
  monkey.position.addScaledVector(st.vel, dt); collide(monkey.position);
  if (st.iceSlide && dt > 0) { st.vel.x = (monkey.position.x - px0) / dt; st.vel.z = (monkey.position.z - pz0) / dt; }   // a wall / cabinet soaks up the slide instead of pinning you against it
  blockDoorHead(monkey.position, pz0);
  const flyOwns = flyIntegrate(dt);
  if (!flyOwns && st.jump) { const J = st.jump; J.t += dt; J.vx = st.vel.x; J.vz = st.vel.z; const k = Math.min(1, J.t / JUMP_T); monkey.position.y = 4 * JUMP_H * k * (1 - k); st.airMax = Math.max(st.airMax || 0, monkey.position.y);
    if (k >= 1) { monkey.position.y = 0; st.jump = null; st.landT = st.t; st.lands = (st.lands || 0) + 1; thud(); } }
  if (!flyOwns && golf && !st.jump) { if (golf.below) golf.ground(monkey.position); else if (monkey.position.y < 0) monkey.position.y = 0; }   // down the mini golf stairs
  if (!flyOwns && !st.jump && floorMode === 'lava' && !st.seated && !st.lavaFall && !(golf && golf.below) && play.mode === 'walk' && !(tp && tp.locked) && !(shop && shop.open) && !LAVA.onPath(monkey.position.x, monkey.position.z)) lavaFallStart();
  st.speed = Math.hypot(st.vel.x, st.vel.z);
  if (st.speed > 0.15) { const target = Math.atan2(st.vel.x, st.vel.z); let d = target - st.face; d = Math.atan2(Math.sin(d), Math.cos(d)); st.face += d * (1 - Math.exp(-dt * 12)); }
  monkey.rotation.y = st.face;
  // nearest cabinet the monkey faces → play animation
  nearCab = null;
  for (const c of playables) {
    if (c === dsCab) { const u = c.userData, dx = u.centre.x - monkey.position.x, dz = u.centre.z - monkey.position.z, d = Math.hypot(dx, dz);   // walk up to the open front
      if (d < DS.R + 1.25 && -dz > DS.R - 0.2 && Math.abs(dx) < 1.6 && (Math.sin(st.face) * dx + Math.cos(st.face) * dz) / d > 0.6) nearCab = c;
      continue; }
    if (c === roadsterCab) { const u = c.userData, mx = monkey.position.x, mz = monkey.position.z;   // PLAY only beside the car, next to a seat (Dave: 'when the player is at the side of the machine')
      for (const seat of ['L', 'R']) { const s = u.seats[seat].world, sx = Math.sign(s.x - c.position.x) || 1, side = c.position.x + sx * MR.W / 2, out = (mx - side) * sx;
        if (out > -0.05 && out < 1.25 && Math.abs(mz - s.z) < 1.0 && -sx * Math.sin(st.face) > 0.3) { u.seat = seat; u.screen = u.screens[seat === 'L' ? 0 : 1]; nearCab = c; } }
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
    if (golf && golf.below) golf.camClamp(camPos); else {
    camPush(camPos);
    let yTop = inHallZ(camPos.z) ? DOOR_H - 0.25 : H - 1.2;
    if (!(inHallZ(camPos.z)) && shop && shop.domeCam) { const c = shop.domeCam(camPos.x, camPos.z); if (c != null) yTop = c; }
    camPos.y = THREE.MathUtils.clamp(camPos.y, 0.25, yTop); }
    if (!st.camInit || camPos.distanceTo(camera.position) > 6) { camera.position.copy(camPos); st.camInit = true; }   // first frame / teleport
    else camera.position.lerp(camPos, 1 - Math.exp(-dt * 14));
    if (golf && golf.below) golf.camClamp(camera.position); else camPush(camera.position); camera.lookAt(camTarget);
  }
}
function animateMonkey(dt) {
  const coast = !!st.iceCoast && !st.jump, u = monkey.userData, sp = coast ? 0 : st.speed, runK = THREE.MathUtils.clamp((sp - 2.4) / 2.8, 0, 1);
  st.phase += dt * (sp > 0.05 ? 3 + sp * 2.1 : 0);
  const sw = Math.min(1, sp / 2.4), s = Math.sin(st.phase), c = Math.cos(st.phase), t = st.t, P = st.play;
  const amp = (0.55 + runK * 0.35) * sw;
  u.hips.position.y = 0.8 + Math.abs(c) * 0.05 * sw - P * 0.06 + Math.sin(t * 2) * 0.006;
  u.legs[0].leg.rotation.x = s * amp; u.legs[1].leg.rotation.x = -s * amp;
  u.legs[0].knee.rotation.x = Math.max(0, -c) * amp * 1.3 + P * 0.25; u.legs[1].knee.rotation.x = Math.max(0, c) * amp * 1.3 + P * 0.25;
  u.legs[0].leg.rotation.x -= P * 0.2; u.legs[1].leg.rotation.x += P * 0.05;
  if (u.tail) { const k = 0.15 + sw * 0.35 + (st.jump ? 0.4 : 0); u.tail.rotation.z = Math.sin(t * 1.6 + (sp > 0.05 ? st.phase : 0)) * k; u.tail.rotation.x = (st.jump ? -0.35 : 0) + Math.sin(t * 1.1) * 0.06;
    const seat = !!st.seated, gp = window.__gaPlayer, backOn = !!(gp && gp.p && gp.p.back && gp.p.back !== 'none');
    u.pack.visible = !seat && !backOn; u.tail.visible = !seat; }   // a worn back item replaces the backpack; seated in the Roadster tucks pack + tail away
  u.torso.rotation.x = 0.06 + runK * 0.22 + P * 0.38 - (coast ? 0.12 : 0); u.torso.rotation.y = s * 0.1 * sw;
  u.neck.rotation.x = -u.torso.rotation.x * 0.6; u.head.rotation.y = Math.sin(t * 0.7) * 0.15 * (1 - sw);
  for (const a of u.arms) {
    const ph = a.sd > 0 ? s : -s;
    const jitter = Math.sin(t * (a.sd > 0 ? 23 : 17)) * 0.08;
    a.sh.rotation.x = THREE.MathUtils.lerp(ph * amp * 0.9, -1.15 + jitter, P);
    a.sh.rotation.z = THREE.MathUtils.lerp(0.08 * a.sd, 0.18 * a.sd, P);
    a.el.rotation.x = THREE.MathUtils.lerp(-0.3 - runK * 0.8, -0.65 + jitter, P);
  }

  if (st.jump || st.t - (st.landT ?? -9) < 0.18) {   // jump pose: knees tucked, arms up; a short squash on landing
    const k = st.jump ? Math.min(1, st.jump.t / JUMP_T) : 1, tuck = st.jump ? Math.sin(k * Math.PI) : 0, sq = st.jump ? 0 : 1 - (st.t - st.landT) / 0.18;
    u.legs.forEach((l, i) => { l.leg.rotation.x = -0.9 * tuck + (i ? 0.25 : -0.25) * tuck - 0.5 * sq; l.knee.rotation.x = 1.3 * tuck + 0.9 * sq; });
    u.arms.forEach(a => { a.sh.rotation.x = -2.2 * tuck - 0.3 * sq; a.sh.rotation.z = 0.35 * a.sd * tuck; a.el.rotation.x = -0.4 * tuck; });
    u.hips.position.y = 0.8 - 0.12 * sq; u.torso.rotation.x = 0.15 * tuck + 0.25 * sq; }
  idlePose(dt, u, sw);
  if (st.fly.air && !st.jump) {   // hover: knees up, arms out; the pack's own flames lengthen while thrust is on
    const lift = st.fly.thrust ? 1 : 0.65;
    u.hips.position.y = 0.8 + Math.sin(st.t * 8) * 0.02 * lift;
    for (let i = 0; i < u.legs.length; i++) { u.legs[i].leg.rotation.x = 0.5 * lift; u.legs[i].knee.rotation.x = 0.8 * lift; }
    for (let i = 0; i < u.arms.length; i++) { const a = u.arms[i]; a.sh.rotation.x = -0.8 * lift; a.sh.rotation.z = 0.26 * a.sd; a.el.rotation.x = -0.3; }
    u.torso.rotation.x = 0.16 * lift;
  }
  tickBot(u, st.t);
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
  const moving = (st.inMag || 0) > 0.01 || st.speed > 0.15 || busy || st.t - (st.lastStep || 0) > 0.2 || st.fly.air;
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
// t295u start-screen freeze: the two attract-demo iframes (strike-demo ~1.8 s pix + ~1.2 s cityDecor at 4x CPU, ghost-demo) booted on the main
// thread during the start screen's first frames. Load them only once the start screen is gone (or skipped), one per idle slot.
{ const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 300));
  const t = setInterval(() => { const S = window.__start; if (!(window.__skipStart || (S && S.dismissed) || !document.getElementById('start'))) return; clearInterval(t);
    idle(() => { demo.attach(); idle(() => ghostDemo.attach()); }); }, 200); }
const _frus = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
const stats = { frames: 0, cpu: 0, cpuAvg: 0, gapAvg: 16, quality: dpr, draws: 0, skipped: 0 };
let last = performance.now(), slow = 0, fast = 0;
document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); PS.lastDraw = 0; } });
let paused = false, rafOn = true;
// t295u start-screen freeze: the first room render compiled ~100 shader programs in one frame (getProgramParameter/link stalls,
// ~8 s at 4x CPU in swiftshader, a visible freeze on a phone). While the opaque start screen is up, the room is not drawn; its shaders are
// compiled in small slices (one top-level group per idle slot, KHR_parallel_shader_compile when the GPU has it). Play renders either way.
const warm = { done: !!window.__skipStart || !document.getElementById('start'), n: 0, ms: 0 };
if (!warm.done) { const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 400 }) : setTimeout(f, 30));
  const seen = new WeakSet(), list = [], scan = () => { for (const o of scene.children) for (const c of (o.isGroup && o.children.length > 8 ? o.children : [o])) if (!seen.has(c)) { seen.add(c); list.push(c); } };
  scan(); let rescans = 0;
  const next = () => { if (warm.done) return; if (!list.length && rescans < 40) { rescans++; scan(); if (!list.length) return setTimeout(next, 250); }   // shop / window scenery arrive later: compile them too
    const o = list.shift(); if (!o) { warm.done = true; return; } const t = performance.now();
    (o.visible ? renderer.compileAsync(o, camera, scene) : Promise.resolve()).catch(() => {}).then(() => { warm.n++; warm.ms += performance.now() - t; idle(next); }); };
  setTimeout(() => idle(next), 300); }
window.__warm = warm;
function frame(now) {
  syncJoyArm();
  const gap = Math.max(0, Math.min(100, now - last)); last = now;   // rAF time can be a hair before a resume timestamp
  if (paused) { rafOn = false; return; }   // full-screen game running: arcade render loop stopped
  if (document.hidden) { PS.hiddenSkips++; requestAnimationFrame(frame); return; }   // pause GPU work while the tab is in the background
  syncZoomBtn(); tickZoom(gap / 1000);
  const t0 = performance.now();
  { const dtc = Math.min(gap / 1000, 0.05); if (play.update(dtc, kiosk && kiosk.mode !== 'walk' && kiosk.mode !== 'pick' ? null : nearCab) || (kiosk && kiosk.update(dtc))) { flyGuard(); stepClock(dtc); } else step(dtc); }
  shield.update(Math.min(gap / 1000, 0.05));
  if (golf) { golf.update(Math.min(gap / 1000, 0.05)); golf.cam(camera, Math.min(gap / 1000, 0.05)); }   // t275u: putting camera
  bloom.strength = camera.position.x > WX / 2 ? 0.12 : 0.75;   // white room: no glare
  if (window.__camOverride && window.__camOverride.bloom != null) bloom.strength = window.__camOverride.bloom; // screenshots / tests
  if (shop) { const gb = golf && golf.below, gx = monkey.position.x, gz = monkey.position.z; shop.update(Math.min(gap / 1000, 0.05)); if (gb) { monkey.position.x = gx; monkey.position.z = gz; } }   // golf basement: the shop's own prop push-out (east wall obstacles, x<=93.6) must not apply under its floor
  winds.update();
  if (tp && !st.beamed && window.__start && window.__start.dismissed && !(window.__skipStart && !window.__beamTest)) { st.beamed = true; const b = beamSpot(); tp.beamIn(b.x, b.z); }   // t282u: once per session, first Play
  if (tp) tp.update(Math.min(gap / 1000, 0.05), !!document.querySelector('#bPack.on') && !document.querySelector('#inv.on'));
  if (window.__camOverride) { const o = window.__camOverride; camera.position.set(...o.pos); camera.lookAt(...o.at); if (!o.showMonkey) monkey.visible = false; } // screenshots / tests
  const draw = !PS.on || (now - PS.lastDraw) >= (1000 / Math.max(1, PS.fps)) - 0.75;   // power-save: skip GPU frames; movement above already used real dt
  camera.updateMatrixWorld();
  { // run each cabinet screen only when that cabinet is near and in view
    _frus.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    cullRooms(_frus);
    const vis = c => { const sc = c.userData.centre, maxD = PS.on ? PS.cabFar : 18; return (_frus.intersectsSphere(_sph.set(_v.copy(sc).setY(1.2), 1.4)) && camera.position.distanceTo(sc) < maxD) || !!window.__forceDemo; };
    const dts = Math.min(gap / 1000, 0.1);
    if (draw) { tickStrikeDemo(demo, dts, vis(strikeCab)); tickGhostDemo(ghostDemo, dts, vis(ghostCab)); }
    const nearMs = PS.on ? PS.cabNearMs : 120;
    if (now - (frame.attT || 0) > nearMs) { frame.attT = now; for (const c of [berserkerCab, monkeyCab, orcCab, novaCab, cyberCab, blasterCab, pipCab, roadsterCab, clawCab, bbCab, rockfallCab]) {
      if (!(vis(c) && !(c.userData.visit && c.userData.visit.on))) continue;
      if (PS.on && camera.position.distanceTo(c.userData.centre) > PS.cabNear && (now - (c.userData._psTick || 0) < PS.cabFarMs)) continue;
      c.userData._psTick = now; c.userData.tick(now / 1000); } }
    strikeCab.userData.glow.intensity = demo.running ? 1.2 + Math.sin(now * 0.013) * 0.08 + Math.sin(now * 0.031) * 0.06 : 0.6;
    ghostCab.userData.glow.intensity = ghostDemo.running ? 1.1 + Math.sin(now * 0.017) * 0.08 : 0.5;
  }
  if (spaceWin) spaceWin.update(now);
  if (draw && (warm.done || !document.getElementById('start') || (window.__start && window.__start.dismissed))) { composer.render(); PS.lastDraw = now; PS.draws++; stats.draws = PS.draws; }   // t295u: the opaque start screen hides the room; let its shaders compile in slices first
  else if (!draw) { PS.skipped++; stats.skipped = PS.skipped; }
  const cpu = performance.now() - t0;
  stats.frames++; stats.cpu = cpu; stats.cpuAvg += (cpu - stats.cpuAvg) * 0.05; stats.gapAvg += (gap - stats.gapAvg) * 0.05;
  if (!window.__noAdapt) {
    if (stats.gapAvg > 24) { if (++slow > 90 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); resize(); slow = 0; } } else slow = 0;
    if (!PS.on && stats.gapAvg < 14) { if (++fast > 400 && dpr < Math.min(devicePixelRatio || 1, Q.dpr)) { dpr += 0.25; resize(); fast = 0; } } else fast = 0;
    stats.quality = dpr;
  }
  requestAnimationFrame(frame);
}
function stepClock(dt) { st.t += dt; }
function arcadePause(on) { paused = on; if (!on && !rafOn) { rafOn = true; last = performance.now(); requestAnimationFrame(frame); } }
const play = setupPlay({ camera, monkey, dsCab, roadsterCab, strikeCab, ghostCab, berserkerCab, monkeyCab, orcCab, novaCab, cyberCab, blasterCab, pipCab, clawCab, bbCab, rockfallCab, st, pause(on) { paused = on; if (!on && !rafOn) { rafOn = true; last = performance.now(); requestAnimationFrame(frame); } } });
shield = setupShield({ scene, play, st, monkey, HALF, DOOR_W, DOOR_H });
tp = setupTeleport({ scene, monkey, st, HALF, H, Z2 }); window.__tp = tp;
// t282u: open floor spot near the usual spawn (0,0,5) with a small random offset (so simultaneous joiners don't overlap): not on a pad,
// not inside a cabinet/collider (collide() must leave it unmoved), on the path when the floor is lava.
function beamSpot() { const pads = [tp.PAD1, tp.PAD2].filter(Boolean), q = new THREE.Vector3();
  for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, r = i < 29 ? 0.35 + Math.random() * 0.9 : 0; q.set(Math.sin(a) * r, 0, 5 + Math.cos(a) * r);
    if (pads.some(p => Math.hypot(q.x - p.x, q.z - p.z) < tp.R + 1)) continue; const x = q.x, z = q.z; collide(q); if (Math.hypot(q.x - x, q.z - z) > 1e-4) continue;
    return { x, z }; } return { x: 0, z: 5 }; }
window.__beamSpot = beamSpot;
golf = setupGolf({ scene, play, st, monkey, WX, camera }); window.__minigolf = golf;
window.__grid = setupGrid({ THREE, scene, camera, cv, HALF, DOOR_W, HALL_L, Z2 });
// FAST LOAD (t229): the prize shop (shop.js + its ~1.2 MB of murals) is imported after the first room frames, or straight away when the
// teleporter is used; window.__arcade.shopReady resolves once it is set up (same setupShop call as before, Chief's shop.js unchanged).
let shopP = null;
function loadShop() { return shopP || (shopP = import('./shop.js').then(m => { shop = m.setupShop({ scene, tp, play, monkey, camera, st }); AREAS[3] = shop.extraBounds; CAM_AREAS[3] = shop.camBounds; CLIP_AREA[1] = shop.extraBounds; setFloor(floorMode);
  try { if (window.__shop && window.__shop.reloadPrizes) window.__shop.reloadPrizes(); } catch (e) {} return shop; })); }   // white-room carpet now that the shop has sized the floor
kiosk = setupKiosk({ room, camera, monkey, st, play, blockers });
// ---------- CLAW MACHINE (#12, t215/t216): free-standing in room 1 on the 2x2 grid block Dave highlighted: cells i -7..-6, j -1..0 of the
// GRID (one cell = the ticket machine's base, measured from its plinth). Base 1.40 x 1.00 m, its edges on the grid lines; front faces +z.
{ const K = scene.getObjectByName('ticketKiosk'), b = new THREE.Box3(), mb = new THREE.Box3(); K.updateMatrixWorld(true); K.traverse(o => { if (o.isMesh) { mb.setFromObject(o); if (mb.min.y < 0.03) b.union(mb); } });
  const cw = b.max.x - b.min.x, cd = b.max.z - b.min.z, I0 = -7, J0 = -1, x0 = b.min.x + I0 * cw, z0 = b.min.z + J0 * cd;
  const cx = x0 + cw, cz = z0 + cd, sx = (2 * cw) / CLAW.W, sz = (2 * cd) / CLAW.D;   // exactly 2 x 2 cells (scale is 1 when the plinth is 0.70 x 0.50)
  clawCab.scale.set(sx, 1, sz); clawCab.position.set(cx, 0, cz); room.add(clawCab); clawCab.updateMatrixWorld(true);
  Object.assign(clawCab.userData, { wall: 'free', index: -1, name: 'claw', cells: { i0: I0, j0: J0, n: 2 }, centre: new THREE.Vector3(cx, 0, cz), inward: new THREE.Vector3(0, 0, 1), facing: new THREE.Vector3(0, 0, -1),
    front: new THREE.Vector3(cx, 0, z0 + 2 * cd + 0.45), box: { minX: x0, maxX: x0 + 2 * cw, minZ: z0, maxZ: z0 + 2 * cd } });
  blockers.push({ minX: x0, maxX: x0 + 2 * cw, minZ: z0, maxZ: z0 + 2 * cd, kind: 'cabinet', name: 'claw' });
  playables.push(clawCab);
  badge('12', '#ffe000', cx, CLAW.BASE_H + CLAW.GLASS_H + CLAW.TOP_H + 0.55, cz, { n: 12, key: 'r1:claw', game: 'claw' }); }
const opts = setupOpts({ play, kiosk, shield, st, monkey, setFloor, getFloor: () => floorMode, setWalls, getWalls: () => wallsMode, setWindow, getWindow: () => windowMode, HALF, Z2 });
requestAnimationFrame(frame);

// hooks for tests / future art work
window.__arcade = { powerSave: PS, animateMonkey: dt => animateMonkey(dt), get window() { return windowMode; }, setWindow, get jumping() { return !!st.jump; }, canJump, LAVA, lavaRespawnPoint, get spaceWin() { return spaceWin; }, get kiosk() { return kiosk; }, setFloor, get floor() { return floorMode; }, setWalls, get walls() { return wallsMode; }, wallMat, carpet, mirror, shield, room, room2, Z2, hall, DOOR_W, DOOR_H, HALL_L, berserkerCab, monkeyCab, orcCab, cyberCab, novaCab, blasterCab, pipCab, clawCab, bbCab, rockfallCab, roadsterCab, dsCab, play, get paused() { return paused; }, simPause: arcadePause, flyCfg: FLY, jetpackOn: jetpackEquipped, wantWide, joyFrom, joyClear, setDist, loadZoom, saveZoom, defaultDist, zoomHold, tickZoom, zoom: { key: ZOOM_KEY, min: DIST_MIN, max: DIST_MAX, wide: DIST_WIDE, portrait: DIST_PORTRAIT, holdT: ZOOM_HOLD_T }, THREE, scene, camera, renderer, monkey, makeMonkey, makeAlien, setChar: setPlayerChar, tickBot, cabinets, strikeCab, ghostCab, featured, demo, ghostDemo, playables, blockers, st, stats, step, keys, get nearCab() { return nearCab; }, setArt: (i, part, tex, glow) => cabinets[i].userData.setArt(part, tex, glow) };
const mp = setupMP({ scene, camera, monkey, makeMonkey, makeAlien, st, play, getTp: () => tp, HALF, Z2, HALL_L, WX: 80 }); window.__arcade.mp = mp;   // multiplayer step 1: public room, 10 players
// after the first room frames: pull in the shop, then the window scenery, off the critical path
{ const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 200));
  const t = setInterval(() => { if (stats.frames < 2) return; clearInterval(t); idle(() => { loadShop(); idle(() => loadWindows()); }); }, 100);
  window.__arcade.shopReady = { then: (a, b) => loadShop().then(a, b) }; window.__arcade.loadShop = loadShop; window.__arcade.windowsReady = { then: (a, b) => loadWindows().then(a, b) }; }   // AUTOSAVE: restore bought prizes + held plush from this device on load (shop.js reads neonarcade.prizes / .held)
