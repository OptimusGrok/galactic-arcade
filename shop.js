// GALACTIC ARCADE PRIZE SHOP (white teleporter room). Self-contained: setupShop({ scene, tp, play, monkey, camera, st })
// Enlarges the white room (24 -> 28 m), adds a white-glass prize wall (Grok plush + monkey plushes on top, cheap toys below,
// one "NAME · N TICKETS" label under every item), a candy stand, a checkout counter with a life-size Grok robot, anime wall art
// (one atlas, one draw call). Near Grok a SHOP button appears -> Grok greets you (recorded clip sfx/grok_hi.mp3 + bubble) and a holographic
// price list of every item opens. Buying spends play.tickets.total (persisted to 'neonarcade.tickets'); prizes -> 'neonarcade.prizes'.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let api_sky = null;
export const SHOP_HALF = 14;
const PK = 'neonarcade.prizes';
export const ITEMS = [
  { id: 'grok', name: 'Grok Robot Plush', price: 1000, cat: 'BIG PRIZE' },
  { id: 'monkeyBrown', name: 'Monkey Plush', price: 250, cat: 'BIG PRIZE' },
  { id: 'monkeyGold', name: 'Golden Monkey Plush', price: 250, cat: 'BIG PRIZE' },
  { id: 'monkeySpace', name: 'Space Monkey Plush', price: 250, cat: 'BIG PRIZE' },
  { id: 'boxBerserker', name: 'Berserker Action Set', price: 100, cat: 'TOYS', box: 0 }, { id: 'boxRoadster', name: 'Roadster Model Kit', price: 100, cat: 'TOYS', box: 1 },
  { id: 'viking', name: 'Mini Viking', price: 100, cat: 'TOYS' }, { id: 'boxNova', name: 'Nova Tether Ship Kit', price: 90, cat: 'TOYS', box: 2 },
  { id: 'roadster', name: 'Mini Roadster', price: 90, cat: 'TOYS' }, { id: 'orc', name: 'Orc Plush', price: 80, cat: 'TOYS' },
  { id: 'teddy', name: 'Teddy Bear', price: 70, cat: 'TOYS' }, { id: 'boxOrc', name: 'Orc Attack Figures', price: 60, cat: 'TOYS', box: 3 },
  { id: 'rocket', name: 'Nova Rocket', price: 60, cat: 'TOYS' }, { id: 'dino', name: 'Dino Plush', price: 60, cat: 'TOYS' },
  { id: 'robot', name: 'Robot Toy', price: 50, cat: 'TOYS' }, { id: 'boxGhost', name: 'Ghost 256 Blocks', price: 45, cat: 'TOYS', box: 4 },
  { id: 'alien', name: 'Alien Plush', price: 40, cat: 'TOYS' }, { id: 'boxMonkey', name: 'Monkey Crossing Puzzle', price: 30, cat: 'TOYS', box: 5 },
  { id: 'ball', name: 'Bouncy Ball', price: 25, cat: 'TOYS' }, { id: 'duck', name: 'Rubber Duck', price: 20, cat: 'TOYS' },
  { id: 'cotton', name: 'Cotton Candy', price: 20, cat: 'LOLLIES' }, { id: 'rainbow', name: 'Rainbow Swirl Pop', price: 15, cat: 'LOLLIES' },
  { id: 'jaw', name: 'Jawbreaker', price: 12, cat: 'LOLLIES' }, { id: 'swirl', name: 'Swirl Pop', price: 10, cat: 'LOLLIES' },
  { id: 'gummy', name: 'Gummy Bears', price: 8, cat: 'LOLLIES' }, { id: 'cherry', name: 'Cherry Pop', price: 5, cat: 'LOLLIES' },
];
const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));

export function setupShop({ scene, tp, play, monkey, camera, st } = {}) {
  const W = tp.whiteRoom, WXp = W.position.x, H0 = 12, K = SHOP_HALF / H0;
  const getMonkey = () => monkey || (window.__arcade && window.__arcade.monkey);
  // ---------- enlarge the white room: stretch the existing floor / ceiling / wall planes ----------
  for (const o of [...W.children]) {
    if (o.isPointLight) { o.distance = 24; o.intensity *= 1.3; continue; }
    if (!o.isMesh || !o.geometry.parameters || o.geometry.type !== 'PlaneGeometry') continue;
    if (Math.abs(Math.abs(o.rotation.x) - Math.PI / 2) < 1e-3) { o.scale.set(K, K, 1); if (o.position.y > 1) o.visible = false; }   // floor / ceiling (flat ceiling hidden: the curved glass roof replaces it)
    else { o.position.x *= K; o.position.z *= K; o.scale.x = K; }                       // walls
  }
  const G = new THREE.Group(); G.name = 'prizeShop'; W.add(G);
  const HS = SHOP_HALF;

  // ---------- helpers: vertex-coloured parts merged into a single mesh ----------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
  function part(list, geo, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = geo.clone(); g.deleteAttribute('uv');
    _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)); g.applyMatrix4(_m);
    _c.set(color); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); list.push(g); return g;
  }
  const SPH = new THREE.SphereGeometry(1, 12, 8), SPHl = new THREE.SphereGeometry(1, 7, 5), BOX = new THREE.BoxGeometry(1, 1, 1),
    CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CON = new THREE.ConeGeometry(1, 1, 8);
  const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05, emissive: 0x2a2a2e });
  const mesh = (list, mat = vcMat, name) => { const m = new THREE.Mesh(mergeGeometries(list), mat); if (name) m.name = name; G.add(m); return m; };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { t, c, g }; };

  // ---------- plush / toy builders (local origin = bottom centre, facing +z) ----------
  function monkeyPlush(L, x, y, z, fur, face, s = 1, pose = 0) {   // seated plush: round head, big ears, muzzle + smile, belly, arms, feet with toes, curled tail, hair tuft
    const p = (geo, c, a, b, d, sx, sy, sz, rx = 0, ry = 0, rz = 0) => part(L, geo, c, x + a * s, y + b * s, z + d * s, sx * s, sy * s, sz * s, rx, ry, rz);
    p(SPH, fur, 0, .16, 0, .15, .16, .14); p(SPH, face, 0, .15, .085, .095, .11, .06);                                       // body + belly
    p(SPH, fur, 0, .4, 0, .16, .155, .15); p(SPH, face, 0, .37, .11, .1, .07, .06); p(SPH, face, -.045, .44, .105, .055, .055, .045); p(SPH, face, .045, .44, .105, .055, .055, .045);
    for (const sd of [-1, 1]) { p(SPH, fur, sd * .165, .43, -.01, .07, .07, .035); p(SPH, face, sd * .17, .43, .012, .045, .045, .02);   // ears + inner ear
      p(SPH, 0x101010, sd * .045, .445, .15, .022, .027, .012); p(SPHl, 0xffffff, sd * .045 + .007, .454, .159, .007, .008, .004);       // eyes + highlight
      p(SPHl, fur, sd * .045, .482, .148, .026, .007, .006, 0, 0, sd * .25);                                                              // brows
      p(SPHl, 0x2a160a, sd * .016, .385, .168, .008, .006, .004);                                                                         // nostrils
      p(SPH, fur, sd * .15, .21 + (sd > 0 ? pose * .05 : 0), .06, .05, .1, .05, 0, 0, sd * (.25 + (sd > 0 ? pose * .6 : 0)));            // arms
      p(SPHl, face, sd * (.17 + (sd > 0 ? pose * .05 : 0)), .12 + (sd > 0 ? pose * .12 : 0), .08, .04, .035, .04);                         // hands
      p(SPH, face, sd * .075, .03, .1, .055, .035, .075); for (let t = -1; t <= 1; t++) p(SPHl, face, sd * .075 + t * .022, .035, .172, .013, .013, .012); }   // feet + toes
    p(SPH, 0x3a1e0e, 0, .352, .163, .035, .01, .01);                                                                                        // smile
    p(SPHl, 0xff8a9a, -.07, .37, .14, .022, .014, .006); p(SPHl, 0xff8a9a, .07, .37, .14, .022, .014, .006);                                // cheeks
    for (let t = 0; t < 3; t++) p(CON, fur, (t - 1) * .025, .57, .02, .018, .05, .018, 0, 0, (1 - t) * .5);                               // hair tuft
    for (let t = 0; t < 6; t++) { const a = t * .55; p(SPHl, fur, .1 + Math.sin(a) * .08, .05 + t * .035, -.13 - Math.cos(a) * .04, .028, .028, .028); }   // curled tail
  }
  function grokBody(L, x, y, z, s, grey = 0xa2a6ae, dark = 0x50545c) {
    const p = (geo, c, a, b, d, sx, sy, sz, rx = 0, ry = 0, rz = 0) => part(L, geo, c, x + a * s, y + b * s, z + d * s, sx * s, sy * s, sz * s, rx, ry, rz);
    p(SPH, grey, 0, .3, 0, .24, .27, .2); p(SPH, dark, 0, .16, 0, .22, .07, .19);
    for (const sd of [-1, 1]) { p(SPH, dark, sd * .26, .45, 0, .085, .085, .085); p(SPH, grey, sd * .3, .3, .02, .06, .14, .06); p(SPH, dark, sd * .33, .15, .04, .065, .06, .065);
      p(SPH, grey, sd * .1, .05, .03, .08, .08, .08); p(SPH, dark, sd * .1, .0, .07, .085, .04, .1); }
  }
  function grokHead(L, x, y, z, s, grey = 0xaeb2ba, dark = 0x5a5e66) {
    const p = (geo, c, a, b, d, sx, sy, sz, rx = 0, ry = 0, rz = 0) => part(L, geo, c, x + a * s, y + b * s, z + d * s, sx * s, sy * s, sz * s, rx, ry, rz);
    p(SPH, grey, 0, 0, 0, .3, .28, .27); p(SPH, 0x07080c, 0, -.01, .08, .24, .21, .21);
    for (const sd of [-1, 1]) { p(SPH, dark, sd * .29, 0, 0, .07, .11, .11); p(SPH, grey, sd * .335, 0, 0, .04, .075, .075); }
  }
  const pFaceTex = canvasTex(256, 192, () => {}); const pDrawFace = (g, blink, talk) => { g.fillStyle = '#05060a'; g.fillRect(0, 0, 256, 192);
    g.fillStyle = '#e9fbff'; g.shadowColor = '#9ff4ff'; g.shadowBlur = 14;
    for (const ex of [80, 176]) { if (blink) g.fillRect(ex - 22, 80, 44, 10); else for (const [dx, dy] of [[-1, -2], [0, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1]]) g.fillRect(ex + dx * 11, 78 + dy * 11, 10, 10); }
    if (talk) { g.fillRect(104, 130, 48, 10 + talk * 12); } else for (const [dx, dy] of [[-3, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 0]]) g.fillRect(128 + dx * 11 - 5, 124 + dy * 11, 10, 10);
    g.shadowBlur = 0; };
  pDrawFace(pFaceTex.g, 0, 0); pFaceTex.t.needsUpdate = true;
  const pFaceMat = new THREE.MeshBasicMaterial({ map: pFaceTex.t, toneMapped: false });
  const chestMat = new THREE.MeshBasicMaterial({ map: canvasTex(256, 96, (g) => { g.fillStyle = '#50545c'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ffffff'; g.font = '900 60px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Grok', 128, 50); }).t });
  const facePlane = (parent, s, y, z) => { const f = new THREE.Mesh(new THREE.CircleGeometry(.2 * s, 24).scale(1.12, .9, 1), pFaceMat); f.position.set(0, y, z); parent.add(f); return f; };
  // ---------- 3D toy builders (local origin = bottom centre, facing +z, ~0.3 m tall at k = 1). v = colour / pose variant ----------
  const SPHm = new THREE.SphereGeometry(1, 10, 7);
  const _V1 = new THREE.Vector3(), _V2 = new THREE.Vector3();
  function toy3(L, kind, x, y, z, k = 1, v = 0, yaw = 0) {
    const T = [], q = (geo, c, a, b, d, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => part(T, geo, c, a, b, d, sx, sy, sz, rx, ry, rz);
    const eye = (a, b, d, r = .011) => { q(SPHl, 0x0a0a0e, a, b, d, r, r * 1.15, r * .6); q(SPHl, 0xffffff, a + r * .35, b + r * .4, d + r * .45, r * .32); };
    const pick = arr => arr[v % arr.length], PI = Math.PI;
    switch (kind) {
      case 'viking': { const tun = pick([0x2a4c9a, 0x9a2a2a, 0x2a7a4a, 0x5a3a8a, 0x8a5a2a]), beard = [0xd2502a, 0xff8a1e, 0xe8c05a, 0x6a3a1a, 0xb83a1a][(v * 3) % 5], skin = 0xf2c8a0, met = 0xb0b8c4, horn = 0xf4ecd8, sh = pick([0xc8302a, 0x2a5ac8, 0xd8a02a, 0x2a8a4a]), pose = v % 2;
        for (const sd of [-1, 1]) { q(CYL, 0x5a3a22, sd * .035, .05, 0, .028, .1, .028); q(SPHm, 0x3a2414, sd * .035, .014, .014, .034, .022, .046); }
        q(SPHm, tun, 0, .145, 0, .078, .085, .068); q(SPHm, 0x8a6a4a, 0, .2, 0, .072, .026, .062);                     // tunic + fur collar
        q(CYL, 0x3a2414, 0, .112, 0, .08, .022, .07); q(BOX, 0xffcc33, 0, .112, .07, .028, .02, .01);                   // belt + buckle
        q(SPHm, tun, -.085, .155, .01, .03, .055, .03, 0, 0, .35); q(SPHl, skin, -.1, .108, .03, .022);
        const ra = .45 + pose * .35; q(SPHm, tun, .088, .165, .01, .03, .055, .03, 0, 0, -ra); const hx = .1 + Math.sin(ra) * .035, hy = .118 + pose * .035; q(SPHl, skin, hx, hy, .03, .022);
        q(CYL, 0x7a5030, hx + .01, hy + .07, .035, .008, .2, .008, 0, 0, -.15 - pose * .2);                              // axe handle
        const ax = hx + .01 + Math.sin(.15 + pose * .2) * .09, ay = hy + .07 + Math.cos(.15 + pose * .2) * .09;
        q(BOX, met, ax + .02, ay, .035, .045, .04, .008, 0, 0, -.15 - pose * .2); q(CON, 0xe6ecf2, ax + .045, ay, .035, .018, .03, .006, 0, 0, -PI / 2);   // axe head + curved blade
        q(CYL, 0x8a929c, -.115, .14, .048, .076, .01, .076, PI / 2); q(CYL, sh, -.115, .14, .054, .07, .012, .07, PI / 2);  // shield rim + face
        q(BOX, 0xf4ecd8, -.115, .14, .061, .018, .13, .003); q(BOX, 0xf4ecd8, -.115, .14, .061, .13, .018, .003); q(SPHl, met, -.115, .14, .064, .02, .02, .012);   // cross + boss
        q(SPHm, skin, 0, .262, 0, .062, .06, .058); q(SPHl, 0xe8a888, 0, .258, .058, .012); eye(-.022, .272, .052); eye(.022, .272, .052);
        for (const sd of [-1, 1]) { q(BOX, beard, sd * .022, .287, .054, .02, .006, .005); q(SPHl, beard, sd * .018, .247, .058, .02, .009, .009, 0, 0, -sd * .3); }
        q(SPHm, beard, 0, .228, .03, .056, .05, .04); q(CON, beard, 0, .185, .035, .04, .06, .03, PI); q(SPHm, beard, 0, .25, -.035, .06, .05, .035);
        q(SPHm, met, 0, .287, 0, .066, .048, .062); q(CYL, 0x8a929c, 0, .279, 0, .068, .012, .064); q(BOX, 0x8a929c, 0, .27, .063, .008, .032, .006);   // helmet, rim, nose guard
        for (const sd of [-1, 1]) { q(CON, horn, sd * .072, .318, 0, .017, .065, .017, 0, 0, -sd * .75); q(CON, horn, sd * .1, .354, 0, .01, .03, .01, 0, 0, -sd * .15); }
        break; }
      case 'orc': { const sk = pick([0x4f8a2e, 0x6ab43a, 0x3a7a4a, 0x7a9a2a]), ar = pick([0x6a4a2a, 0x4a3a2a, 0x7a3a2a]), met = 0x8a8f96;
        for (const sd of [-1, 1]) { q(CYL, 0x4a3424, sd * .04, .05, 0, .032, .1, .032); q(SPHm, sk, sd * .04, .014, .016, .036, .022, .048); }
        q(SPHm, sk, 0, .155, 0, .092, .095, .075); q(BOX, ar, 0, .085, .05, .1, .06, .03); q(CYL, 0x2a1e14, 0, .11, 0, .094, .022, .078); q(BOX, met, 0, .11, .075, .024, .02, .008);
        q(BOX, ar, 0, .18, .065, .12, .03, .01, 0, 0, .5);                                                               // chest strap
        for (const sd of [-1, 1]) { q(SPHm, met, sd * .092, .225, 0, .045, .03, .045); q(SPHm, sk, sd * .108, .155, .01, .036, .065, .036, 0, 0, sd * .25); q(SPHl, sk, sd * .12, .095, .03, .028); }
        q(CON, 0x7a5030, .13, .16, .045, .022, .14, .022, PI); for (let t = 0; t < 3; t++) q(CON, met, .13 + (t - 1) * .02, .2, .065, .006, .02, .006, PI / 2);   // club + spikes
        q(SPHm, sk, 0, .28, 0, .068, .062, .062); q(SPHm, sk, 0, .255, .018, .056, .032, .05);
        for (const sd of [-1, 1]) { q(CON, 0xfff6e0, sd * .022, .262, .062, .008, .024, .008); q(CON, sk, sd * .072, .292, 0, .016, .05, .012, 0, 0, -sd * 1.3);
          q(SPHl, 0xffd21e, sd * .024, .292, .056, .012); q(SPHl, 0x111111, sd * .024, .292, .066, .005); q(BOX, 0x2a4a1a, sd * .024, .307, .058, .024, .007, .006, 0, 0, sd * .35); }
        q(SPHl, sk, 0, .28, .066, .014, .01, .01); break; }
      case 'teddy': { const f = pick([0xb07a44, 0xff9ac8, 0xf4f0e8, 0x7ab4ff, 0xc8a0ff, 0x8a5a2a]), mz = f === 0xf4f0e8 ? 0xffe0c0 : 0xf4dcc0, bow = [0xff3c3c, 0x3c78ff, 0xffd21e, 0x3cc46a][(v >> 1) % 4];
        q(SPH, f, 0, .1, 0, .09, .095, .08); q(SPHm, mz, 0, .095, .05, .06, .065, .04);
        for (const sd of [-1, 1]) { q(SPHm, f, sd * .05, .04, .06, .04, .035, .06); q(SPHl, mz, sd * .05, .04, .118, .028, .028, .01); q(SPHm, f, sd * .085, .13, .02, .03, .06, .03, 0, 0, sd * .5);
          q(SPHm, f, sd * .055, .29, -.01, .03, .03, .02); q(SPHl, mz, sd * .055, .29, .003, .018, .018, .01); eye(sd * .028, .245, .06); }
        q(SPH, f, 0, .23, 0, .075, .07, .068); q(SPHm, mz, 0, .215, .058, .035, .026, .025); q(SPHl, 0x2a1a10, 0, .225, .082, .012, .009, .008); q(SPHl, 0x2a1a10, 0, .2, .08, .012, .003, .003);
        if (v % 2) { q(SPHl, bow, -.02, .168, .07, .02, .013, .008); q(SPHl, bow, .02, .168, .07, .02, .013, .008); q(SPHl, bow, 0, .168, .074, .009); } break; }
      case 'duck': { const c = pick([0xffd21e, 0xff8ad8, 0x6cff4a, 0x1ec8ff, 0xffffff]), hat = pick([0xff3c3c, 0x3c78ff, 0x2a2a3a]);
        q(SPH, c, 0, .075, 0, .1, .075, .085); q(CON, c, 0, .1, -.085, .03, .05, .02, -1.2); for (const sd of [-1, 1]) q(SPHm, c, sd * .085, .085, -.005, .025, .045, .06);
        q(SPH, c, 0, .175, .03, .065, .065, .065); q(SPHm, 0xff7a00, 0, .162, .095, .035, .013, .035); q(SPHm, 0xff7a00, 0, .152, .09, .028, .008, .028);
        eye(-.028, .19, .085, .01); eye(.028, .19, .085, .01);
        if (v % 3 === 1) { q(CYL, hat, 0, .235, .03, .05, .006, .05); q(CYL, hat, 0, .258, .03, .033, .04, .033); } break; }
      case 'ball': { const P = [0xff3c6e, 0x3cb4ff, 0x7cff4a, 0xffb000, 0xa64dff, 0xff7a00], c1 = P[v % 6], c2 = P[(v + 3) % 6];
        q(SPH, c1, 0, .09, 0, .09); q(CYL, c2, 0, .09, 0, .0915, .028, .0915, 0, 0, .3 + v * .4); q(CYL, 0xffffff, 0, .09, 0, .0912, .012, .0912, 1.4, 0, .3 + v * .4); q(SPHl, 0xffffff, -.03, .13, .07, .015, .012, .006); break; }
      case 'roadster': { const b = pick([0xf4f6f8, 0xff3c3c, 0x1ec8ff, 0xffd21e, 0x2a2a3a]);
        q(BOX, b, -.01, .048, 0, .27, .04, .14); q(SPHm, b, .13, .046, 0, .055, .024, .068); q(SPHm, b, -.13, .05, 0, .03, .03, .07); q(SPHm, b, 0, .066, 0, .12, .02, .068);
        q(SPHm, 0x1a2234, -.01, .08, 0, .07, .032, .055); q(SPHl, 0x6a8ab8, .02, .088, .0, .03, .012, .045);                  // cabin glass + sheen
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { q(CYL, 0x111111, sx * .09, .03, sz * .07, .03, .026, .03, PI / 2); q(CYL, 0xc0c6ce, sx * .09, .03, sz * .084, .016, .004, .016, PI / 2); }
        for (const sz of [-1, 1]) { q(SPHl, 0xeaffff, .168, .05, sz * .045, .012, .01, .014); q(SPHl, 0xff2a2a, -.152, .055, sz * .05, .006, .01, .016); q(BOX, 0x2a2a2a, -.14, .075, sz * .055, .006, .03, .006); }
        q(BOX, 0x2a2a2a, -.14, .09, 0, .025, .006, .14); q(SPHl, 0x40e8ff, -.16, .045, 0, .012, .018, .03); break; }
      case 'dino': { const c = pick([0x3cc46a, 0xff8a1e, 0xa64dff, 0x1ec8ff]), sp = pick([0xffd21e, 0xff3c6e, 0x3cffc8]);
        q(SPH, c, 0, .1, 0, .1, .08, .075); q(SPHm, 0xf4f0c0, .01, .09, .04, .07, .055, .04); q(SPHm, c, .075, .18, .015, .04, .06, .04, 0, 0, -.4);
        q(SPH, c, .1, .23, .02, .055, .05, .05); q(SPHm, c, .145, .22, .03, .04, .03, .036); eye(.11, .245, .064, .01); eye(.11, .245, -.024, .01); q(SPHl, 0x111111, .182, .228, .04, .004);
        q(SPHm, 0xffffff, .15, .205, .055, .025, .006, .01);                                                              // grin
        q(CON, c, -.13, .085, 0, .04, .12, .035, 0, 0, PI / 2 + .25); for (const sx of [-1, 1]) for (const sz of [-1, 1]) q(SPHm, c, sx * .05, .03, sz * .045, .03, .04, .032);
        q(SPHl, c, .07, .12, .06, .016, .03, .016, .6); for (let t = 0; t < 5; t++) q(CON, sp, -.08 + t * .035, .175 - Math.abs(t - 2) * .008 + (t > 3 ? .02 : 0), 0, .014, .035, .008); break; }
      case 'robot': { const c1 = pick([0x8aa0b8, 0xff6a3c, 0x3c9aff, 0xffd21e, 0xeaeaea]), dk = 0x2a2e36;
        for (const sd of [-1, 1]) { q(BOX, dk, sd * .033, .045, 0, .03, .08, .04); q(BOX, c1, sd * .033, .01, .008, .045, .02, .06); q(CYL, dk, sd * .075, .13, 0, .012, .08, .012, 0, 0, sd * .15); q(SPHl, c1, sd * .082, .088, 0, .018); q(CYL, dk, sd * .055, .235, 0, .012, .012, .012, 0, 0, PI / 2); }
        q(BOX, c1, 0, .13, 0, .12, .1, .08); q(BOX, dk, 0, .14, .041, .07, .05, .004); [0xff3c3c, 0x3cff6a, 0xffd21e].forEach((cc, i) => q(SPHl, cc, -.02 + i * .02, .13, .045, .007));
        q(CYL, dk, 0, .19, 0, .015, .02, .015); q(BOX, c1, 0, .235, 0, .1, .08, .08); q(BOX, 0x0a1020, 0, .237, .041, .08, .045, .004); for (const sd of [-1, 1]) q(SPHl, 0x6ff6ff, sd * .02, .239, .044, .01, .01, .004);
        q(CYL, 0xcccccc, 0, .29, 0, .003, .03, .003); q(SPHl, 0xff3c3c, 0, .308, 0, .01); break; }
      case 'rocket': { const c1 = pick([0xeeeeee, 0xffd21e, 0x7ab4ff]), c2 = pick([0xff3c3c, 0x3c78ff, 0xa64dff, 0x3cc46a]);
        q(CYL, c1, 0, .16, 0, .04, .2, .04); q(CON, c2, 0, .3, 0, .04, .08, .04); q(CYL, c2, 0, .1, 0, .041, .02, .041); q(SPHl, 0x1ec8ff, 0, .2, .036, .018, .018, .008); q(CYL, 0xb0b8c4, 0, .2, .033, .021, .004, .021, PI / 2);
        for (let i = 0; i < 3; i++) { const a = i * 2.094 + .5; q(BOX, c2, Math.sin(a) * .045, .07, Math.cos(a) * .045, .006, .08, .05, 0, a, 0); }
        q(CON, 0xffa020, 0, .045, 0, .025, .04, .025, PI); q(CYL, 0x5a5e66, 0, .065, 0, .03, .01, .03); break; }
      case 'alien': { const c = pick([0x6cff6c, 0xa64dff, 0x1ec8ff, 0xff7aa8]), ac = pick([0xffd21e, 0xff3cf0, 0xffffff]);
        q(SPH, c, 0, .09, 0, .06, .075, .055); for (const sd of [-1, 1]) { q(SPHm, c, sd * .03, .02, .01, .022, .025, .03); q(SPHm, c, sd * .065, .11 + (sd > 0 && v % 2 ? .03 : 0), .01, .016, .045, .016, 0, 0, sd * (v % 2 && sd > 0 ? 2.2 : .4)); }
        q(SPH, c, 0, .21, 0, .075, .065, .065); for (const sd of [-1, 1]) { q(SPHm, 0x0a0a12, sd * .03, .215, .05, .022, .03, .014, 0, 0, sd * .4); q(SPHl, 0xffffff, sd * .026, .225, .062, .007, .008, .004);
          q(CYL, c, sd * .03, .29, 0, .004, .06, .004, 0, 0, -sd * .3); q(SPHl, ac, sd * .042, .322, 0, .013); }
        q(SPHl, 0x2a0a2a, 0, .182, .06, .012, .005, .004); break; }
    }
    _m.compose(_V1.set(x, y, z), _q.setFromEuler(_e.set(0, yaw, 0)), _V2.set(k, k, k)); for (const g of T) { g.applyMatrix4(_m); L.push(g); }
  }
  // ---------- label atlas: one canvas, every label is "NAME · N TICKETS" ----------
  const LBL = []; const LW = 512, LH = 64, COLS = 4, ROWS = 16; const lab = canvasTex(LW * COLS, LH * ROWS, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); });
  const labelGeos = [], cardGeos = [];
  function label(item, x, y, z, ry = 0, w = 0.78) {
    const i = LBL.length, cx = (i % COLS) * LW, cy = ((i / COLS) | 0) * LH, g = lab.g; LBL.push(item.id);
    { const lg = g.createLinearGradient(0, cy, 0, cy + LH); lg.addColorStop(0, '#1e3378'); lg.addColorStop(1, '#0f1c4a'); g.fillStyle = lg; g.fillRect(cx, cy, LW, LH); } g.strokeStyle = '#8fb4ff'; g.lineWidth = 3; g.strokeRect(cx + 3, cy + 3, LW - 6, LH - 6);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 32; g.font = `800 ${fs}px Arial`;
    const txt = item.name.toUpperCase() + ' - ' + item.price + ' TICKETS'; while (g.measureText(txt).width > LW - 24 && fs > 14) g.font = `800 ${--fs}px Arial`; g.fillText(txt, cx + LW / 2, cy + LH / 2 + 1);
    const pg = new THREE.PlaneGeometry(w, w * LH / LW), uv = pg.attributes.uv; const u0 = cx / (LW * COLS), u1 = (cx + LW) / (LW * COLS), v1 = 1 - cy / (LH * ROWS), v0 = 1 - (cy + LH) / (LH * ROWS);
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0);
    pg.rotateY(ry); pg.translate(x, y, z); labelGeos.push(pg);
    cardGeos.push(new THREE.BoxGeometry(w + 0.03, w * LH / LW + 0.026, 0.01).rotateY(ry).translate(x - Math.sin(ry) * 0.007, y, z - Math.cos(ry) * 0.007));   // dark card behind each label
  }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const basic = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const ledM = basic(0x3d7bff), ledM2 = basic(0xa64dff), ledC = basic(0x40e8ff), litM = basic(0xffffff);
  const ledB = [], ledP = [], ledCy = [], lit = [];
  const setUV = (g, u0, u1, v0, v1) => { const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0)); return g; };
  const mg = geos => mergeGeometries(geos.some(g => !g.index) ? geos.map(g => g.index ? g.toNonIndexed() : g) : geos);
  const add = (geos, mat, name, ro) => { const m = new THREE.Mesh(mg(geos), mat); m.name = name; if (ro) m.renderOrder = ro; G.add(m); return m; };

  // ---------- SHOP SHELL: one big square room - back wall partition (full height), the white room's own flat ceiling + side walls, neon trim only ----------
  const ZW = -3.2, SXW = HS, CH = 8.5, ZF = HS, shell = [];
  part(shell, BOX, 0xf7f8fb, 0, CH / 2, ZW - 0.05, 2 * HS, CH, 0.1);                                        // back wall (full width, floor to ceiling)
  mesh(shell, new THREE.MeshBasicMaterial({ vertexColors: true }), 'shopShell');
  // ---------- CORNICE: white soffit band where the walls meet the vault, flush downlight strips + cyan neon (nothing hangs) ----------
  const cor = [];
  for (const sd of [-1, 1]) { part(cor, BOX, 0xf4f6fa, sd * (SXW - 0.3), CH - 0.18, (ZW + ZF) / 2, 0.6, 0.36, ZF - ZW); lit.push(new THREE.BoxGeometry(0.16, 0.02, ZF - ZW - 1.0).translate(sd * (SXW - 0.38), CH - 0.37, (ZW + ZF) / 2));
    ledCy.push(new THREE.BoxGeometry(0.03, 0.03, ZF - ZW).translate(sd * (SXW - 0.6), CH - 0.02, (ZW + ZF) / 2)); ledP.push(new THREE.BoxGeometry(0.04, 0.04, ZF - ZW).translate(sd * (SXW - 0.03), 0.06, (ZW + ZF) / 2)); }
  for (const zz of [ZW + 0.3, ZF - 0.3]) { part(cor, BOX, 0xf4f6fa, 0, CH - 0.18, zz, 2 * SXW, 0.36, 0.6); ledCy.push(new THREE.BoxGeometry(2 * SXW, 0.03, 0.03).translate(0, CH - 0.02, zz + (zz < 0 ? 0.3 : -0.3))); }
  for (let i = 0; i < 9; i++) { const xx = -SXW + 2 + i * (2 * SXW - 4) / 8; lit.push(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12).translate(xx, CH - 0.37, ZW + 0.3), new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12).translate(xx, CH - 0.37, ZF - 0.3)); }
  mesh(cor, new THREE.MeshBasicMaterial({ vertexColors: true }), 'shopCornice');
  // ---------- CURVED GLASS ROOF: half-circle barrel vault (radius = half the room width) springing from the side-wall tops, front to back.
  // Clear glass onto deep space: dense twinkling stars + soft purple / blue / teal nebula, thin silver curved ribs and straight purlins. Half-disc glass ends close it.
  const VR = SXW, VL = ZF - ZW, VZ = (ZW + ZF) / 2;
  const skyMat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uCap: { value: 0 } }, toneMapped: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vW; varying vec2 vU; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT; uniform float uCap; varying vec3 vW; varying vec2 vU;
      float h31(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * n3(p); p = p * 2.07 + 5.3; a *= .5; } return s; }
      vec3 stars(vec3 d, float cell, float th){ vec3 g = d * cell, id = floor(g), f = fract(g) - .5; float r = h31(id); if (r < th) return vec3(0);
        vec3 o = vec3(h31(id + 3.1), h31(id + 9.7), h31(id + 5.3)) - .5; float dd = length(f - o * .6); float tw = .7 + .3 * sin(uT * (1. + r * 3.) + r * 40.);
        vec3 c = mix(vec3(.72,.84,1.), vec3(1.,.86,.72), h31(id + 1.7)); return c * smoothstep(.12, 0., dd) * tw * (.35 + (r - th) / (1. - th) * 2.); }
      float line(float x, float w){ float f = abs(fract(x + .5) - .5), px = fwidth(x); return 1. - smoothstep(max(w, px * .8), max(w, px * .8) + px * 1.2, f); }
      void main(){ vec3 d = normalize(vW - cameraPosition);
        vec3 col = vec3(.006, .008, .028) + stars(d, 80., .8) * 1.3 + stars(d + 1.7, 180., .86) + stars(d + 4.1, 36., .95) * 2.;
        float n = fbm(d * 2.2 + vec3(2., 5., 1.)), k = fbm(d * 3.4 - 3.), w = fbm(d * 1.3 + 9.);
        float neb = smoothstep(.38, .78, n); vec3 nc = mix(vec3(.5,.18,.78), vec3(.12,.32,.85), smoothstep(.3, .7, k)); nc = mix(nc, vec3(.08,.62,.66), smoothstep(.62, .82, w));
        col += neb * nc * (.75 + .6 * k) + smoothstep(.5, .85, w) * vec3(.06,.12,.4) * .5 + pow(neb, 3.) * vec3(1.,.7,1.) * .12;
        float rib, pur;
        if (uCap < .5) { rib = line(vU.y * 6., .018); pur = line(vU.x * 12., .012); }
        else { vec2 p = vec2(vU.x * 2. - 1., vU.y); float r = length(p), a = atan(p.y, p.x); rib = line(r * 3., .01) * step(r, 1.) * step(.1, r) + step(.985, r); pur = 0.; }
        col += vec3(.55,.75,1.) * .045 * smoothstep(.5, 0., abs(fract(vU.x * 3. + vU.y * .7) - .5));                     // faint glass sheen
        col = mix(col, vec3(.86,.89,.94), max(rib, pur * .85)); gl_FragColor = vec4(col, 1.); }` });
  { const vg = new THREE.CylinderGeometry(VR, VR, VL, 72, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(0, CH, VZ);
    const sk = new THREE.Mesh(vg, skyMat); sk.name = 'shopSkylight'; sk.frustumCulled = false; G.add(sk); api_sky = skyMat;
    const capM = skyMat.clone(); capM.uniforms = { uT: skyMat.uniforms.uT, uCap: { value: 1 } };
    const capG = (zz) => { const c = new THREE.CircleGeometry(VR, 72, 0, Math.PI); const uv = c.attributes.uv, ps = c.attributes.position; for (let q = 0; q < uv.count; q++) uv.setXY(q, ps.getX(q) / (2 * VR) + .5, ps.getY(q) / VR); return c.translate(0, CH, zz); };
    add([capG(ZW + 0.002), capG(ZF - 0.002)], capM, 'shopRoofEnds');
    // silver arch at each end + the spring-line rails
    const rim = [new THREE.TorusGeometry(VR - 0.04, 0.07, 6, 72, Math.PI).translate(0, CH, ZW + 0.06), new THREE.TorusGeometry(VR - 0.04, 0.07, 6, 72, Math.PI).translate(0, CH, ZF - 0.06)];
    for (const sd of [-1, 1]) rim.push(new THREE.BoxGeometry(0.14, 0.1, VL).translate(sd * (VR - 0.07), CH + 0.02, VZ));
    add(rim, new THREE.MeshBasicMaterial({ color: 0xdfe4ec }), 'shopRoofRim'); }
  // ---------- MURALS: painted straight onto the walls, edge to edge, floor to ceiling ----------
  const loadT = f => { const t = new THREE.TextureLoader().load(new URL('./tex/' + f, import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const SW = 9.2, MB = 0.0, MT = CH - 0.06, MHh = MT - MB, xE = SW / 2 + 0.15, TB = 5.08, zm = ZW + 0.012;
  const mat = f => new THREE.MeshBasicMaterial({ map: loadT(f), toneMapped: false });
  add([setUV(new THREE.PlaneGeometry(HS - xE, MHh), 0.38, 1, 0, 1).translate(-(HS + xE) / 2, MB + MHh / 2, zm)], mat('shop_mural_left.jpg'), 'muralLeft');      // back wall left of the shelves
  add([setUV(new THREE.PlaneGeometry(HS - xE, MHh), 0.4, 1, 0, 1).translate((HS + xE) / 2, MB + MHh / 2, zm)], mat('shop_mural_right.jpg'), 'muralRight');     // back wall behind Grok
  add([new THREE.PlaneGeometry(2 * xE, MT - TB).translate(0, (TB + MT) / 2, zm)], mat('shop_mural_top.jpg'), 'muralTop');                                       // above the prize shelves
  add([new THREE.PlaneGeometry(ZF - ZW, MHh).rotateY(Math.PI / 2).translate(-HS + 0.012, MB + MHh / 2, (ZW + ZF) / 2)], mat('shop_mural_side.jpg'), 'muralSide');    // left wall
  add([new THREE.PlaneGeometry(ZF - ZW, MHh).rotateY(-Math.PI / 2).translate(HS - 0.012, MB + MHh / 2, (ZW + ZF) / 2)], mat('shop_mural_side2.jpg'), 'muralSide2'); // right wall
  add([new THREE.PlaneGeometry(2 * HS, MHh).rotateY(Math.PI).translate(0, MB + MHh / 2, ZF - 0.012)], mat('shop_title_wall.jpg'), 'muralTitle');   // title wall (behind the pad): GALACTIC ARCADE + the game characters

  // ---------- PRIZE WALL: 4 bays x 5 white-lacquer shelves, lit back panels, chrome edges, warm LED under every shelf, spotlights on top ----------
  const SD = 0.55, Z0 = ZW + SD / 2 + 0.02, SY = [0.42, 1.2, 1.98, 2.76, 3.54], TOP = 5.0, BAYS = 4, BW = SW / BAYS;
  const frame = [], plushes = [], gp = [], toys = [], cards = [], pools = [];
  const back = canvasTex(64, 256, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#eef2ff'); r.addColorStop(0.5, '#ffffff'); r.addColorStop(1, '#f4f0ff'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  { const bp = new THREE.Mesh(new THREE.PlaneGeometry(SW, TOP), new THREE.MeshBasicMaterial({ map: back.t, toneMapped: false })); bp.position.set(0, TOP / 2, ZW + 0.02); G.add(bp);
    const blu = canvasTex(64, 256, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#9fd8ff'); r.addColorStop(0.6, '#d8f0ff'); r.addColorStop(1, '#eef6ff'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    const gb = new THREE.Mesh(new THREE.PlaneGeometry(SW / BAYS - 0.08, TOP - SY[4]), new THREE.MeshBasicMaterial({ map: blu.t, toneMapped: false })); gb.name = 'grokBayGlow'; gb.position.set(-SW / 2 + SW / BAYS * 1.5, (TOP + SY[4]) / 2, ZW + 0.024); G.add(gb); }
  const UX = Array.from({ length: BAYS + 1 }, (_, i) => -SW / 2 + i * BW);
  for (const ux of UX) { part(frame, BOX, 0xffffff, ux, TOP / 2, Z0, 0.08, TOP, SD); part(frame, BOX, 0xd8dde6, ux, TOP / 2, Z0 + SD / 2 + 0.004, 0.09, TOP, 0.01); ledB.push(new THREE.BoxGeometry(0.03, TOP, 0.02).translate(ux, TOP / 2, Z0 + SD / 2 + 0.014)); }
  part(frame, BOX, 0xffffff, 0, TOP + 0.05, Z0, SW + 0.1, 0.1, SD + 0.04); part(frame, BOX, 0xffffff, 0, SY[0] / 2, Z0, SW, SY[0], SD);
  for (const [i, y] of SY.entries()) { part(frame, BOX, 0xfafbfd, 0, y, Z0, SW, 0.04, SD); part(frame, BOX, 0xc9d0da, 0, y, Z0 + SD / 2 + 0.003, SW, 0.044, 0.008);   // lacquer shelf + chrome lip
    if (i < 4) part(frame, BOX, 0xeef0f6, 0, y + 0.06, Z0 - 0.15, SW, 0.08, 0.2);                                                                   // back riser (second row)
    lit.push(new THREE.BoxGeometry(SW - 0.1, 0.008, 0.025).translate(0, y - 0.024, Z0 + SD / 2 - 0.04));                                             // warm LED under the shelf
    (i % 2 ? ledP : ledB).push(new THREE.BoxGeometry(SW, 0.012, 0.012).translate(0, y + 0.016, Z0 + SD / 2 + 0.012)); }
  ledP.push(new THREE.BoxGeometry(SW, 0.03, 0.02).translate(0, TOP, Z0 + SD / 2 + 0.03));
  for (let b = 0; b < BAYS; b++) for (const j of [0.27, 0.73]) { const x = UX[b] + BW * j; part(frame, CYL, 0xd0d4da, x, TOP - 0.03, Z0 + 0.12, 0.05, 0.05, 0.05); lit.push(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10).translate(x, TOP - 0.06, Z0 + 0.12)); }
  // soft light pools on the back panel (one additive mesh): spotlights above the big prizes + under-shelf glow on every cell
  const poolT = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 40, 4, 64, 64, 64); r.addColorStop(0, 'rgba(255,246,225,.75)'); r.addColorStop(1, 'rgba(255,246,225,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  for (let b = 0; b < BAYS; b++) { const x = (UX[b] + UX[b + 1]) / 2; pools.push(new THREE.PlaneGeometry(BW * 0.95, 1.4).translate(x, SY[4] + 0.75, ZW + 0.03));
    for (let s = 0; s < 4; s++) pools.push(new THREE.PlaneGeometry(BW * 0.9, 0.7).translate(x, SY[s] + 0.42, ZW + 0.03)); }
  add(pools, new THREE.MeshBasicMaterial({ map: poolT.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 'shelfLightPools', 1);
  mesh(frame, new THREE.MeshBasicMaterial({ vertexColors: true }), 'shopShelfFrame');
  const LZ = Z0 + SD / 2 + 0.016, LBW = BW - 0.16;
  // top shelf: big seated monkey plushes + 2 Grok plushes (the silver clerk from Dave's video) in bay 2
  const MON = { monkeyBrown: [0x6e4120, 0xe2b98a], monkeyGold: [0xb87a2a, 0xf4d8a8], monkeySpace: [0x5e50a0, 0xdcd0f6] };
  const TOPROW = [['monkeyBrown', 'monkeyBrown'], ['grok', 'grok'], ['monkeyBrown', 'monkeyGold'], ['monkeySpace', 'monkeyBrown']];
  function grokBust(L, x, y, z, s) { grokPlush(L, x, y, z, s); }
  // seated Grok plush: silver bobblehead helmet, black screen (face plane added separately), charcoal joints, chunky limbs
  function grokPlush(L, x, y, z, s) { const p = (geo, c, a, b, d, sx, sy, sz, rx = 0, ry = 0, rz = 0) => part(L, geo, c, x + a * s, y + b * s, z + d * s, sx * s, sy * s, sz * s, rx, ry, rz);
    const sil = 0xb6babe, chr = 0x2a2a2d;
    for (const sd of [-1, 1]) { p(CYL, chr, sd * .09, .06, .08, .055, .16, .055, Math.PI / 2); p(SPH, sil, sd * .09, .065, .17, .068, .068, .07); p(BOX, chr, sd * .09, .06, .25, .1, .075, .06); }
    p(SPH, sil, 0, .22, 0, .19, .2, .15); p(CYL, chr, 0, .1, 0, .15, .05, .12); p(SPH, 0xc8ccd0, 0, .27, .05, .15, .12, .11);
    for (const sd of [-1, 1]) { p(SPH, sil, sd * .2, .32, 0, .075, .075, .075); p(CYL, sil, sd * .23, .22, .03, .045, .15, .045, 0, 0, sd * .2); p(SPH, chr, sd * .245, .155, .04, .05, .05, .05); p(SPH, chr, sd * .25, .085, .07, .052, .046, .052); }
    p(CYL, chr, 0, .41, 0, .065, .07, .065); grokHead(L, x, y + .6 * s, z, s); }
  TOPROW.forEach((row, b) => row.forEach((id, j) => { const x = UX[b] + BW * (j + 0.5) / row.length, y = SY[4] + 0.02;
    if (id === 'grok') { const s = 1.3, zz = Z0 - 0.1; grokPlush(gp, x, y, zz, s); const f = facePlane(G, s, y + 0.59 * s, zz + 0.3 * s); f.position.x = x; f.name = 'grokPlushFace';
      const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.095), chestMat); ch.position.set(x, y + 0.27 * s, zz + 0.162 * s); G.add(ch); }
    else monkeyPlush(plushes, x, y, Z0 + 0.0, ...MON[id], 2.1, (b + j) % 2);
    }));
  TOPROW.forEach((row, b) => { const x = (UX[b] + UX[b + 1]) / 2, it = row[0] === row[1] ? byId[row[0]] : { id: row.join('+'), name: row.map(i => byId[i].name.replace(' Plush', '')).join(' / ') + ' Plush', price: byId[row[0]].price };
    label(it, x, SY[4] - 0.13, LZ, 0, LBW); });
  // ---------- lower shelves: real 3D toys (two staggered rows, colour + pose variants, one merged mesh) and boxed sets ----------
  const KIND = ['viking', 'boxBerserker', 'orc', 'boxRoadster', 'teddy', 'boxMars', 'boxMars2', 'dino', 'boxOrc', 'robot', 'rocket', 'boxGhost', 'alien', 'boxMonkey', 'ball', 'duck'];
  const CS = 128, AC = 16, atl = canvasTex(CS * AC, CS * AC, (g) => { g.clearRect(0, 0, CS * AC, CS * AC); });
  const pal = ['#ff3c3c', '#ff8a1e', '#ffd21e', '#6cff4a', '#1ec8ff', '#3c78ff', '#a64dff', '#ff3cf0', '#ffffff', '#2a2a3a', '#ff7aa8', '#3cffc8'];
  const P_ = () => pal[(rnd() * pal.length) | 0];
  function drawBox(g, kind, v, x, y) { g.save(); g.translate(x, y); const c1 = P_(), c2 = P_(), c3 = P_();
    const circ = (cx, cy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }, rect = (a, b, w, h, c, r = 8) => { g.fillStyle = c; g.beginPath(); g.roundRect(a, b, w, h, r); g.fill(); };
    const art = BOXC[kind], w = 116, h = 124, bx = 6, by = 2; rect(bx, by, w, h, art[1], 6); const wg = g.createLinearGradient(0, by + 26, 0, by + h - 14); wg.addColorStop(0, '#ffffff'); wg.addColorStop(1, '#dfe8ff'); g.fillStyle = wg; g.beginPath(); g.roundRect(bx + 6, by + 26, w - 12, h - 42, 4); g.fill();
    if (kind === 'boxBerserker') { circ(64, by + 62, 15, '#f2c8a0'); g.fillStyle = '#d2502a'; g.beginPath(); g.moveTo(50, by + 64); g.lineTo(78, by + 64); g.lineTo(64, by + 92); g.fill(); g.fillStyle = '#a0a8b4'; g.beginPath(); g.arc(64, by + 56, 16, Math.PI, 0); g.fill(); g.fillStyle = '#f4ecd8'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64 + s * 14, by + 52); g.lineTo(64 + s * 28, by + 34); g.lineTo(64 + s * 18, by + 58); g.fill(); } rect(48, by + 86, 32, 10, '#2a4c9a', 4); circ(58, by + 62, 2.5, '#111'); circ(70, by + 62, 2.5, '#111'); circ(36, by + 80, 13, '#8a929c'); circ(36, by + 80, 11, '#c8302a'); circ(36, by + 80, 4, '#ccc'); g.fillStyle = '#7a5030'; g.fillRect(90, by + 40, 4, 52); g.fillStyle = '#c0c8d0'; g.beginPath(); g.moveTo(94, by + 40); g.lineTo(108, by + 34); g.lineTo(108, by + 58); g.lineTo(94, by + 52); g.fill(); }
    else if (kind.startsWith('boxMars')) { const sk = g.createLinearGradient(0, by + 26, 0, by + 110); sk.addColorStop(0, '#ff9a5a'); sk.addColorStop(1, '#c8482a'); g.fillStyle = sk; g.beginPath(); g.roundRect(bx + 6, by + 26, w - 12, h - 42, 4); g.fill();
      g.fillStyle = '#8a2a16'; g.beginPath(); g.moveTo(bx + 6, by + 76); for (let i = 0; i <= 8; i++) g.lineTo(bx + 6 + i * (w - 12) / 8, by + 56 + ((i * 37 + v * 11) % 22)); g.lineTo(bx + w - 6, by + 108); g.lineTo(bx + 6, by + 108); g.fill();
      g.fillStyle = '#5a1a0e'; g.fillRect(bx + 6, by + 92, w - 12, 16); circ(96, by + 40, 7, '#ffe8c0');
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.strokeRect(bx + 8, by + 28, w - 16, h - 46); }
    else if (kind === 'boxOrc') { circ(64, by + 60, 20, '#5a9a2e'); g.fillStyle = '#fff6e0'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64 + s * 8, by + 72); g.lineTo(64 + s * 11, by + 62); g.lineTo(64 + s * 5, by + 72); g.fill(); } circ(56, by + 54, 3.5, '#ffd21e'); circ(72, by + 54, 3.5, '#ffd21e'); rect(44, by + 80, 40, 18, '#6a4a2a', 5); g.fillStyle = '#7a5030'; g.fillRect(92, by + 40, 6, 50); circ(95, by + 40, 8, '#8a6a4a'); }
    else if (kind === 'boxGhost') { const gc = ['#ffffff', '#7ad8ff', '#ffe04a', '#ff7ad8'][v % 4]; g.fillStyle = '#1a0a3a'; g.fillRect(bx + 6, by + 26, w - 12, h - 42); g.fillStyle = gc; g.beginPath(); g.arc(64, by + 58, 22, Math.PI, 0); g.lineTo(86, by + 96); for (let i = 0; i < 4; i++) { g.lineTo(80 - i * 11, by + 88); g.lineTo(75 - i * 11, by + 96); } g.lineTo(42, by + 58); g.fill(); circ(56, by + 58, 4, '#1a0a3a'); circ(72, by + 58, 4, '#1a0a3a'); }
    else if (kind === 'boxMonkey') { circ(64, by + 62, 22, '#7a4a24'); for (const s of [-1, 1]) circ(64 + s * 22, by + 58, 8, '#7a4a24'); circ(64, by + 68, 13, '#e2b98a'); circ(57, by + 56, 3.5, '#111'); circ(71, by + 56, 3.5, '#111'); g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.arc(64, by + 70, 6, 0.3, 2.8); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(14, by + 30, 100, 76); }
    else if (kind === 'boxRoadster') { g.fillStyle = '#20263a'; g.fillRect(bx + 6, by + 26, w - 12, h - 42); rect(26, by + 62, 76, 16, '#e8202a', 6); rect(44, by + 52, 34, 14, '#e8202a', 6); rect(50, by + 55, 22, 8, '#9ad8ff', 3); circ(42, by + 80, 7, '#111'); circ(86, by + 80, 7, '#111'); g.fillStyle = '#9aa4b8'; g.font = '700 10px Arial'; g.textAlign = 'center'; g.fillText('MODEL KIT 1:24', 64, by + 100); }
    else { circ(64, by + 56, 16, v % 2 ? c1 : art[1]); rect(64 - 18, by + 70, 36, 26, v % 3 ? c2 : art[1], 6); circ(58, by + 54, 3, '#111'); circ(70, by + 54, 3, '#111'); }
    g.fillStyle = '#fff'; g.font = '900 17px Impact, Arial Black'; g.textAlign = 'center'; g.fillText(art[0], 64, by + 19, w - 10); rect(bx + 8, by + h - 12, w - 16, 7, c3, 3); g.restore(); }
  const BOXC = { boxBerserker: ['BERSERKER', '#c8302a'], boxRoadster: ['ROADSTER', '#ff6a2a'], boxMars: ['MARS ROADSTER', '#b8321e'], boxMars2: ['MARS ROADSTER', '#b8321e'], boxOrc: ['ORC', '#2e8a2a'], boxGhost: ['GHOST', '#6a1a9a'], boxMonkey: ['MONKEY', '#2a8ad8'] };
  KIND.forEach((k, ki) => { if (BOXC[k]) for (let v = 0; v < AC; v++) drawBox(atl.g, k, v, v * CS, ki * CS); }); atl.t.needsUpdate = true;
  const SPAN = { viking: .26, orc: .28, teddy: .24, roadster: .36, dino: .32, robot: .2, rocket: .15, alien: .19, ball: .2, duck: .22 };
  const sprBox = [], mfr = []; let nToys = 0;
  KIND.forEach((id, gi) => { const s = 3 - (gi / 4 | 0), b = gi % 4, it = byId[id], x0 = UX[b] + 0.1, x1 = UX[b + 1] - 0.1, isBox = id.startsWith('box');
    for (let r = 0; r < 2; r++) { const y = SY[s] + 0.02 + (r ? 0.08 : 0), z = Z0 + (r ? -0.15 : 0.08);
      const mars = id.startsWith('boxMars'); if (mars && r) continue;
      if (mars) { const w = (x1 - x0 - 0.04) / 2, h = 0.5; for (let k = 0; k < 2; k++) { const x = x0 + 0.02 + k * w + 0.01, v = (rnd() * AC) | 0, uA = v / AC, vA = 1 - (gi + 1) / AC, ww = w - 0.02;
          const bk = new THREE.BoxGeometry(ww, h, 0.34); const uv = bk.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uA + (0.05 + uv.getX(q) * 0.9) / AC, vA + (0.02 + uv.getY(q) * 0.96) / AC);
          bk.translate(x + ww / 2, y + h / 2, Z0 - 0.06); sprBox.push(bk); part(mfr, BOX, 0x1a1a22, x + ww / 2, y + 0.03, Z0 + 0.14, ww, 0.06, 0.06);
          for (const sd of [0, 1]) part(mfr, BOX, 0xb8321e, x + (sd ? ww - 0.015 : 0.015), y + h * 0.42, Z0 + 0.14, 0.03, h * 0.84, 0.06);
          toy3(toys, 'roadster', x + ww / 2, y + 0.06, Z0 + 0.06, 1.55, 1, -0.35); nToys++; } continue; }
      if (isBox) { let x = x0 + (r ? 0.12 : 0); const vRow = gi; while (x < x1 - 0.12) { const h = 0.46 + rnd() * 0.12 + r * 0.04, w = h * 0.8, v = (rnd() * AC) | 0; if (x + w > x1) break;
          const uA = v / AC, vA = 1 - (vRow + 1) / AC; const bg = new THREE.BoxGeometry(w, h, 0.14); const uv = bg.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uA + (0.05 + uv.getX(q) * 0.9) / AC, vA + (0.02 + uv.getY(q) * 0.96) / AC);
          bg.rotateY((rnd() - 0.5) * 0.25).translate(x + w / 2, y + h / 2, z + (rnd() - 0.5) * 0.03); sprBox.push(bg); x += w + 0.03 + rnd() * 0.03; } continue; }
      const K3 = 1.32, sp = SPAN[id] * K3; let x = x0 + sp / 2 + (r ? sp * 0.5 : 0), v = r * 3 + b;
      while (x < x1 - sp / 2 + 0.01) { toy3(toys, id, x, y, z, K3 * (0.92 + rnd() * 0.12), v++, (rnd() - 0.5) * 0.6 + (id === 'roadster' || id === 'dino' ? -0.5 : 0)); nToys++; x += sp + rnd() * 0.02; } }
    label(it || { id: id, name: 'Mars Roadster Car', price: byId.roadster.price }, (UX[b] + UX[b + 1]) / 2, SY[s] - 0.1, LZ, 0, LBW); });
  add(sprBox, new THREE.MeshStandardMaterial({ map: atl.t, roughness: 0.45, emissive: 0xffffff, emissiveMap: atl.t, emissiveIntensity: 0.22 }), 'shelfBoxes');
  mesh(mfr, new THREE.MeshBasicMaterial({ vertexColors: true }), 'marsBoxFrames');
  const toyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.05, emissive: 0x2e2e32 });
  mesh(toys, toyMat, 'shelfToys');
  mesh(plushes, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0x4a3426 }), 'monkeyPlushes');
  mesh(gp, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2, emissive: 0x3a3c42 }), 'grokPlush');
  const spr = [];

  // ---------- CANDY STAND (left front, angled toward the pad) ----------
  const CXc = -5.0, CZc = -1.95, TH = -1.25, CL = 1.8, cosT = Math.cos(TH), sinT = Math.sin(TH);
  const toW = (lx, lz) => [CXc + lx * cosT + lz * sinT, CZc - lx * sinT + lz * cosT];
  const CG = new THREE.Group(); CG.position.set(CXc, 0, CZc); CG.rotation.y = TH; G.add(CG);
  const cand = [], sweets = [], jars = [], lids = [], pops = [], cLed = [];
  const TIERS = [[0.62, 0.38], [0.2, 0.86], [-0.22, 1.34]], NJ = 4, TD = 0.42;   // [front x of tier centre, tier top y]
  TIERS.forEach(([tx, ty], i) => { part(cand, BOX, i % 2 ? 0xf6f7fa : 0xffffff, tx, ty / 2, 0, TD, ty, CL); cLed.push(new THREE.BoxGeometry(0.03, 0.03, CL).translate(tx + TD / 2 + 0.01, ty - 0.02, 0)); });
  const CANDY = ['cherry', 'gummy', 'jaw', 'cotton', 'swirl', 'rainbow'], CC = { cherry: [0xff1028, 0xff3c50, 0xd0001a], gummy: [0x3cff2a, 0xffe000, 0xff2a2a], jaw: [0x1e8cff, 0xff1ec8, 0xffe01e], cotton: [0xff3cc0, 0x2ab8ff, 0xff8a00], swirl: [0xff2aa0, 0x00d0ff, 0x8a2aff], rainbow: [0xff2a2a, 0xffd200, 0x2a6aff] };
  const ICO = new THREE.IcosahedronGeometry(1, 0);
  TIERS.forEach(([jx, jy], si) => { const r = 0.18, h = 0.4; for (let j = 0; j < NJ; j++) { const z = -CL / 2 + CL * (j + 0.5) / NJ, id = CANDY[(j + si * 2) % 6], c = CC[id];
      jars.push(new THREE.CylinderGeometry(r, r, h, 16, 1, true).translate(jx, jy + h / 2, z)); lids.push(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.06, 14).translate(jx, jy + h + 0.03, z));
      for (let k = 0; k < 22; k++) { const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * r * 0.85; part(sweets, ICO, c[k % 3], jx + Math.cos(a) * rr, jy + 0.05 + rnd() * h * 0.82, z + Math.sin(a) * rr, .075, .07, .075, rnd() * 3, rnd() * 3, 0); }
      const [wx, wz] = toW(jx + r + 0.01, z); label(byId[id], wx, jy + 0.13, wz, TH + Math.PI / 2, 0.42); } });
  const sw = canvasTex(512, 256, (g) => { [['#ff1493', '#ffe600'], ['#ff2a2a', '#ffd200', '#2a6aff', '#3cff2a'], ['#ff0000', '#00c8ff']].forEach((cs, i) => { const cx = 85 + i * 170, cy = 128;
      for (let a = 0; a < 64; a++) { g.strokeStyle = cs[a % cs.length]; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, 6 + a * 1.25, a * 0.6, a * 0.6 + 1.5); g.stroke(); } }); });
  for (let j = 0; j < 7; j++) { const z = -CL / 2 + 0.18 + (CL - 0.36) * j / 6, t = j % 3, R0 = 0.2 + (j % 2) * 0.04, x = -0.22, yb = 1.34 + 0.42;
    part(cand, CYL, 0xffffff, x, yb + 0.25, z, 0.014, 0.5, 0.014);
    const cg = setUV(new THREE.CircleGeometry(R0, 22), 0, 1, 0, 1); const uv = cg.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setX(q, (t + uv.getX(q)) / 3); cg.rotateY(Math.PI / 2); cg.translate(x + 0.02, yb + 0.55 + (j % 2) * 0.1, z); pops.push(cg); }
  const cm = (geos, mat, name, ro) => { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.name = name; if (ro) m.renderOrder = ro; CG.add(m); return m; };
  cm(cand, new THREE.MeshBasicMaterial({ vertexColors: true }), 'candyStand'); cm(sweets, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), 'candySweets');
  cm(pops, new THREE.MeshBasicMaterial({ map: sw.t, side: THREE.DoubleSide, toneMapped: false }), 'swirlPops'); cm(cLed, ledM, 'candyLed');
  cm(jars, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04, depthWrite: false, side: THREE.DoubleSide }), 'candyJars', 2);
  cm(lids, new THREE.MeshBasicMaterial({ color: 0xe4e8ef }), 'jarLids');

  // ---------- CHECKOUT (right front): curved white counter, cyan base glow, till + register, chunky Grok behind ----------
  const QX = 4.45, QZ = -1.95, RO = 1.95, RI = 1.4, A0 = Math.PI * 0.9, A1 = Math.PI * 1.62;
  const ring = (ro, ri, h, a0 = A0, a1 = A1) => { const sh = new THREE.Shape(); sh.absarc(0, 0, ro, a0, a1, false); sh.absarc(0, 0, ri, a1, a0, true);
    return new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 28 }).rotateX(-Math.PI / 2); };
  add([ring(RO, RI, 1.0).translate(QX, 0.04, QZ)], new THREE.MeshStandardMaterial({ color: 0x0e1638, roughness: 0.35, emissive: 0x060a20 }), 'checkoutCounter');
  add([ring(RO + 0.08, RI - 0.05, 0.06).translate(QX, 1.04, QZ)], new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: 0xb0b4bc }), 'checkoutTop');
  { const AL = A1 - A0, CW = 2048, CHh = 256, ft = canvasTex(CW, CHh, (g, w, h) => { g.fillStyle = '#0e1638'; g.fillRect(0, 0, w, h);
      const neon = (c, blur, lw, fn) => { g.save(); g.strokeStyle = c; g.shadowColor = c; g.shadowBlur = blur; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); fn(); g.stroke(); g.restore(); };
      for (const [y, c] of [[10, '#40f0ff'], [22, '#c04dff'], [h - 22, '#c04dff'], [h - 10, '#40f0ff']]) for (let k = 0; k < 2; k++) neon(c, 18, 6, () => { g.moveTo(0, y); g.lineTo(w, y); });
      for (const x of [140, 300, w - 300, w - 140]) for (let k = 0; k < 2; k++) neon(x % 2 ? '#c04dff' : '#40f0ff', 14, 4, () => { g.moveTo(x, 44); g.lineTo(x, h - 44); });
      const bw = 820, bx = (w - bw) / 2; for (let k = 0; k < 2; k++) neon('#b04dff', 22, 7, () => g.roundRect(bx, 50, bw, h - 100, 40));
      g.font = '900 120px Arial Rounded MT Bold, Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.shadowColor = '#40f0ff'; g.shadowBlur = 30; g.lineWidth = 12; g.strokeStyle = '#40e8ff'; g.strokeText('GROK SHOP', w / 2, h / 2 + 4); g.shadowBlur = 0; g.lineWidth = 4; g.strokeStyle = '#e8ffff'; g.strokeText('GROK SHOP', w / 2, h / 2 + 4); g.restore(); });
    const fg = new THREE.CylinderGeometry(RO + 0.006, RO + 0.006, 0.98, 48, 1, true, A0 + Math.PI / 2, AL).translate(QX, 0.53, QZ);
    add([fg], new THREE.MeshBasicMaterial({ map: ft.t, toneMapped: false }), 'grokShopSign');
    const mg2 = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 34, 64, 64, 64); r.addColorStop(0, 'rgba(190,70,255,0)'); r.addColorStop(0.6, 'rgba(190,70,255,.7)'); r.addColorStop(1, 'rgba(190,70,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    add([new THREE.PlaneGeometry(2 * RO + 2.0, 2 * RO + 2.0).rotateX(-Math.PI / 2).translate(QX, 0.006, QZ)], new THREE.MeshBasicMaterial({ map: mg2.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 'magentaGlow', 1); }
  ledCy.push(ring(RO + 0.03, RO - 0.01, 0.04).translate(QX, 0.02, QZ), ring(RO + 0.1, RO + 0.06, 0.025).translate(QX, 1.04, QZ));
  const glowT = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 30, 64, 64, 64); r.addColorStop(0, 'rgba(40,220,255,0)'); r.addColorStop(0.55, 'rgba(40,220,255,.9)'); r.addColorStop(1, 'rgba(40,220,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  const glowM = new THREE.MeshBasicMaterial({ map: glowT.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  { const gl = []; gl.push(new THREE.PlaneGeometry(2 * RO + 1.0, 2 * RO + 1.0).rotateX(-Math.PI / 2).translate(QX, 0.007, QZ), new THREE.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2).translate(0, 0.008, 0)); add(gl, glowM, 'cyanGlow', 1); }
  const cnt = [], at = (a, r) => [QX + Math.cos(a) * r, QZ - Math.sin(a) * r];
  const [tx, tz] = at(Math.PI * 1.02, 1.85), [rx, rz] = at(Math.PI * 1.5, 1.85);
  part(cnt, BOX, 0x22262e, tx, 1.33, tz, 0.4, 0.3, 0.06, -0.35, -0.3, 0); part(cnt, BOX, 0x444a54, tx, 1.12, tz, 0.22, 0.04, 0.22); part(cnt, CYL, 0x444a54, tx, 1.17, tz, 0.03, 0.1, 0.03);
  part(cnt, BOX, 0xc9ced6, rx, 1.22, rz, 0.55, 0.3, 0.5, 0, -0.8, 0); part(cnt, BOX, 0x9aa0a8, rx, 1.42, rz, 0.4, 0.12, 0.3, -0.4, -0.8, 0); part(cnt, BOX, 0x2a2e36, rx + 0.12, 1.45, rz + 0.12, 0.25, 0.18, 0.05, 0, -0.8, 0);
  mesh(cnt, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x303236 }), 'tillRegister');
  const tillS = canvasTex(128, 96, g => { g.fillStyle = '#0c1a3a'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#00e5ff'; g.font = '700 20px Arial'; g.fillText('GROK', 30, 40); g.fillStyle = '#7b5cff'; g.fillRect(14, 56, 100, 16); });
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), new THREE.MeshBasicMaterial({ map: tillS.t, toneMapped: false })); s.position.set(tx, 1.33, tz + 0.035); s.rotation.set(-0.35, -0.3, 0); G.add(s); }
  const GYAW = Math.atan2(0 - QX, 5.0 - QZ);
  // ---- Grok clerk: 3D build of the robot from Dave's video (silver capsule armour, charcoal joints, black face screen) ----
  const grok = new THREE.Group(); grok.name = 'grokClerk'; grok.position.set(QX - 0.15, 0, QZ + 0.1); grok.rotation.y = GYAW; grok.scale.setScalar(0.6); G.add(grok);
  const mSil = new THREE.MeshStandardMaterial({ color: 0xb6babe, roughness: 0.32, metalness: 0.35, emissive: 0x2c2e32 });
  const mChr = new THREE.MeshStandardMaterial({ color: 0x2a2a2d, roughness: 0.85, metalness: 0.1, emissive: 0x0c0c0e });
  const mScr = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.06, metalness: 0.5 });
  const gm = (geo, m, par, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); par.add(o); return o; };
  const gSph = new THREE.SphereGeometry(1, 32, 20), gCyl = new THREE.CylinderGeometry(1, 1, 1, 24), gCap = new THREE.CapsuleGeometry(1, 1, 8, 24);
  const gBox = new THREE.BoxGeometry(1, 1, 1);
  // torso: rounded block chest tapering into a segmented abdomen + recessed hips
  gm(gCap, mSil, grok, 0, 1.5, 0, 0.56, 0.22, 0.38);
  gm(gSph, mSil, grok, 0, 1.68, 0.02, 0.6, 0.3, 0.4);
  for (let k = 0; k < 3; k++) gm(gCyl, k % 2 ? mSil : mChr, grok, 0, 1.08 - k * 0.12, 0, 0.36 - k * 0.03, 0.1, 0.27 - k * 0.02);
  gm(gCap, mSil, grok, 0, 0.66, 0, 0.36, 0.08, 0.26);
  for (const sd of [-1, 1]) { gm(gCyl, mChr, grok, sd * 0.17, 0.42, 0, 0.11, 0.4, 0.11); gm(gCyl, mSil, grok, sd * 0.17, 0.18, 0, 0.13, 0.3, 0.13); gm(gBox, mChr, grok, sd * 0.17, 0.03, 0.05, 0.22, 0.06, 0.34); }
  const chestTex = canvasTex(256, 96, (g) => { g.clearRect(0, 0, 256, 96); g.fillStyle = '#ffffff'; g.shadowColor = '#cfefff'; g.shadowBlur = 10; g.font = '700 58px "Arial Rounded MT Bold",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Grok', 128, 50); });
  { const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: chestTex.t, transparent: true, toneMapped: false })); ch.position.set(0.24, 1.66, 0.405); ch.rotation.y = 0.25; ch.name = 'grokChest'; grok.add(ch); }
  // arms: spherical shoulders, cylinder upper arm, big elbow disc, forearm, dark 4-finger hand
  const arms = [];
  for (const sd of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(sd * 0.68, 1.72, 0); grok.add(sh); gm(gSph, mSil, sh, 0, 0, 0, 0.2, 0.2, 0.2);
    gm(gCyl, mSil, sh, 0, -0.28, 0, 0.1, 0.42, 0.1); const el = new THREE.Group(); el.position.set(0, -0.5, 0); sh.add(el);
    gm(gCyl, mChr, el, 0, 0, 0, 0.12, 0.09, 0.12, 0, 0, Math.PI / 2); gm(gCyl, mSil, el, sd * 0.05, 0, 0, 0.08, 0.02, 0.08, 0, 0, Math.PI / 2);
    gm(gCyl, mSil, el, 0, -0.24, 0, 0.09, 0.38, 0.09); gm(gSph, mChr, el, 0, -0.5, 0, 0.1, 0.11, 0.07);
    for (let f = 0; f < 4; f++) gm(gCap, mChr, el, (f - 1.5) * 0.045, -0.63, 0.02, 0.02, 0.06, 0.02); gm(gCap, mChr, el, -sd * 0.09, -0.55, 0.03, 0.022, 0.04, 0.022, 0, 0, sd * 0.6);
    sh.rotation.set(-0.15, 0, sd * 0.12); el.rotation.x = -1.2; arms.push({ sh, el, sd }); }
  // neck + bobblehead capsule helmet with pivot ear caps and a flat glossy black screen
  gm(gCyl, mChr, grok, 0, 1.97, 0, 0.13, 0.2, 0.13);
  const head = new THREE.Group(); head.position.set(0, 2.42, 0); grok.add(head);
  gm(gSph, mSil, head, 0, 0, 0, 0.66, 0.58, 0.6);
  gm(gSph, mScr, head, 0, -0.02, 0.2, 0.55, 0.44, 0.44).name = 'grokScreen';
  for (const sd of [-1, 1]) { gm(gCyl, mChr, head, sd * 0.64, 0, 0, 0.2, 0.08, 0.2, 0, 0, Math.PI / 2); gm(gCyl, mSil, head, sd * 0.69, 0, 0, 0.13, 0.06, 0.13, 0, 0, Math.PI / 2); gm(gCyl, mChr, head, sd * 0.72, 0, 0, 0.06, 0.03, 0.06, 0, 0, Math.PI / 2); }
  const faceTex = canvasTex(256, 192, () => {});
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const drawFace = (g, blink, talk, happy) => { g.clearRect(0, 0, 256, 192); g.fillStyle = '#f0ffff'; g.strokeStyle = '#f0ffff'; g.shadowColor = '#7ff4ff'; g.shadowBlur = 16; g.lineCap = 'round';
    for (const ex of [82, 174]) { if (happy) { g.lineWidth = 13; g.beginPath(); g.arc(ex, 98, 24, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); }
      else if (blink) rr(g, ex - 22, 82, 44, 9, 4); else rr(g, ex - 23, 50, 46, 70, 18); }
    g.lineWidth = 9;
    if (talk > 0) { g.beginPath(); g.ellipse(128, 140, 22, 6 + talk * 12, 0, 0, Math.PI * 2); g.fill(); }
    else if (happy) { g.beginPath(); g.arc(128, 118, 30, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
    g.shadowBlur = 0; };
  drawFace(faceTex.g, 0, 0, 0); faceTex.t.needsUpdate = true;
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.54), new THREE.MeshBasicMaterial({ map: faceTex.t, transparent: true, toneMapped: false, depthWrite: false })); f.position.set(0, -0.02, 0.645); f.name = 'grokFace'; head.add(f); }

  // ---------- glossy floor (fake reflections of the glowing wall, candy and counter) ----------
  { const fl = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); const X = x => (x + SXW) / (2 * SXW) * w, Zp = z => (z - ZW) / (ZF - ZW) * h;
      let r = g.createLinearGradient(0, 0, 0, Zp(1.2)); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(X(-SW / 2), 0, X(SW / 2) - X(-SW / 2), Zp(1.2));
      for (const [k, ux] of UX.entries()) { r = g.createLinearGradient(0, 0, 0, Zp(0.6)); r.addColorStop(0, k % 2 ? 'rgba(166,77,255,.6)' : 'rgba(61,123,255,.6)'); r.addColorStop(1, 'rgba(61,123,255,0)'); g.fillStyle = r; g.fillRect(X(ux) - 3, 0, 6, Zp(0.6)); }
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${[255, 40, 255, 60][k % 4]},${[60, 200, 40, 120][k % 4]},${[90, 60, 160, 255][k % 4]},.18)`; g.fillRect(X(-5.6 + rnd() * 1.8), Zp(-1.8 + rnd() * 3.6), 10, 26); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * SXW, ZF - ZW), new THREE.MeshBasicMaterial({ map: fl.t, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.004, (ZW + ZF) / 2); m.renderOrder = 1; m.name = 'glossFloor'; G.add(m); }

  add(ledB, ledM, 'shopLedBlue'); add(ledP, ledM2, 'shopLedPurple'); add(ledCy, ledC, 'shopLedCyan'); add(lit, litM, 'ceilingLight');
  lab.t.needsUpdate = true; add(labelGeos, new THREE.MeshBasicMaterial({ map: lab.t, toneMapped: false }), 'priceLabels'); add(cardGeos, new THREE.MeshBasicMaterial({ color: 0x1b1f2e }), 'priceCards');

  // ---------- bounds + obstacles ----------
  const R = 0.3, L = HS - 0.35, KX = 0, KZ = 0;
  const extraBounds = { x0: WXp - L, x1: WXp + L, z0: Z0 + SD / 2 + R, z1: L };
  const camBounds = { x0: WXp - (HS - 0.3), x1: WXp + HS - 0.3, z0: Z0 + SD / 2 + 0.1, z1: HS - 0.3 };
  const cc = [[-0.86, -CL / 2], [0.84, -CL / 2], [0.84, CL / 2], [-0.86, CL / 2]].map(([a, b]) => toW(a, b));
  const OBST = [{ x0: Math.min(...cc.map(c => c[0])), x1: Math.max(...cc.map(c => c[0])), z0: Math.min(...cc.map(c => c[1])), z1: Math.max(...cc.map(c => c[1])) },
    { x0: -SXW - 0.1, x1: -SXW + 0.1, z0: ZW, z1: ZF }, { x0: SXW - 0.1, x1: SXW + 0.1, z0: ZW, z1: ZF }];
  const NP = { x: QX + Math.sin(GYAW) * (RO + 0.55), z: QZ + Math.cos(GYAW) * (RO + 0.55) };
  function pushOut(p) { const lx = p.x - WXp, lz = p.z;
    const dx = lx - QX, dz = lz - QZ, d = Math.hypot(dx, dz); if (d < RO + R) { const k = (RO + R) / (d || 1); p.x = WXp + QX + dx * k; p.z = QZ + dz * k; return; }
    for (const o of OBST) { if (lx > o.x0 - R && lx < o.x1 + R && lz > o.z0 - R && lz < o.z1 + R) {
    const e = [lx - (o.x0 - R), (o.x1 + R) - lx, lz - (o.z0 - R), (o.z1 + R) - lz], m = Math.min(...e);
    if (m === e[0]) p.x = WXp + o.x0 - R; else if (m === e[1]) p.x = WXp + o.x1 + R; else if (m === e[2]) p.z = o.z0 - R; else p.z = o.z1 + R; } } }
  const stats = { items: nToys + sprBox.length + 8 + NJ * 4 + 12, toys: nToys, sprites: spr.length, boxes: sprBox.length, labels: LBL.length };
  // ---------- tickets / prizes ----------
  const T = () => (play && play.tickets) || (window.__arcade && window.__arcade.play && window.__arcade.play.tickets) || null;
  const balance = () => { const t = T(); if (t) return t.total; return parseInt(localStorage.getItem('neonarcade.tickets'), 10) || 0; };
  function spend(n) { const t = T(); const b = balance(); if (b < n) return false; if (t) t.total -= n; try { localStorage.setItem('neonarcade.tickets', String(b - n)); } catch (e) {}
    const el = document.getElementById('tixN'); if (el) el.textContent = String(b - n); return true; }
  const prizes = () => { try { return JSON.parse(localStorage.getItem(PK)) || {}; } catch (e) { return {}; } };
  function addPrize(id) { const p = prizes(); p[id] = (p[id] || 0) + 1; try { localStorage.setItem(PK, JSON.stringify(p)); } catch (e) {} }

  // ---------- voice ----------
  // recorded greeting (Dave's pick: voice 1), preloaded so it starts inside the tap gesture; speechSynthesis only as fallback
  const GREET = "Hi, I'm Grok, what would you like?";
  const greetA = new Audio(new URL('./sfx/grok_hi.mp3', import.meta.url).href); greetA.preload = 'auto'; try { greetA.load(); } catch (e) {}
  let voice = null; const pickVoice = () => { try { const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); voice = vs.find(v => /\bmale\b/i.test(v.name) && !/female/i.test(v.name)) || vs.find(v => /david|daniel|alex|guy|james|george|ryan|mark|tom/i.test(v.name)) || vs[0] || null; } catch (e) {} };
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  const tts = (text) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.lang = (voice && voice.lang) || 'en-US'; u.pitch = 0.95; speechSynthesis.speak(u); } catch (e) {} };
  let talkT = 0, happyT = 0;
  function say(text) { bubble.textContent = text; bubble.classList.add('on'); clearTimeout(say.h); say.h = setTimeout(() => bubble.classList.remove('on'), 3800); talkT = Math.max(1.4, text.length * 0.065); happyT = talkT + 1.2; api.said.push(text);
    if (window.__muted) return;
    if (text === GREET) { api.voice = 'clip'; try { greetA.currentTime = 0; const pr = greetA.play(); if (pr && pr.catch) pr.catch(() => { api.voice = 'tts'; tts(text); }); } catch (e) { api.voice = 'tts'; tts(text); } }
    else tts(text); }
  greetA.addEventListener('playing', () => { talkT = Math.max(talkT, (greetA.duration || 2) - greetA.currentTime); happyT = talkT + 1.2; });

  // ---------- UI: SHOP button, speech bubble, holographic list ----------
  const css = document.createElement('style'); css.textContent =
    '#shopBtn{position:fixed;left:50%;bottom:calc(max(22px,env(safe-area-inset-bottom)) + 6px);transform:translateX(-50%);z-index:24;display:none;min-width:150px;height:58px;padding:0 30px;border-radius:29px;border:3px solid #00e5ff;background:#021a22e8;color:#dffbff;font:900 22px/1 "Courier New",monospace;letter-spacing:.14em;box-shadow:0 0 16px #00e5ffaa,inset 0 0 12px #00e5ff55;text-shadow:0 0 8px #00e5ff;cursor:pointer;touch-action:none}#shopBtn.on{display:block}#shopBtn:active{transform:translateX(-50%) scale(.95)}' +
    '#grokSay{position:fixed;left:50%;top:calc(max(14px,env(safe-area-inset-top)) + 60px);transform:translateX(-50%);z-index:42;display:none;max-width:84vw;padding:12px 18px;border-radius:18px;background:#fff;color:#141824;font:800 17px/1.3 Arial,sans-serif;box-shadow:0 4px 18px #0006;border:3px solid #7b5cff}#grokSay.on{display:block}#grokSay:after{content:"";position:absolute;left:50%;bottom:-14px;border:8px solid transparent;border-top-color:#7b5cff}' +
    '#holo{position:fixed;inset:0;z-index:41;display:none;align-items:center;justify-content:center;background:#00101866;touch-action:none}#holo.on{display:flex}' +
    '#holoP{position:relative;width:min(92vw,460px);max-height:min(74vh,640px);display:flex;flex-direction:column;border-radius:14px;border:2px solid #6ff6ff;background:linear-gradient(#00e5ff2e,#3d7bff22);box-shadow:0 0 30px #00e5ffaa,inset 0 0 24px #00e5ff55;color:#dffcff;font:700 14px "Courier New",monospace;text-shadow:0 0 6px #00e5ff;overflow:hidden;animation:hIn .35s ease-out;backdrop-filter:blur(2px)}' +
    '#holoP:before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#9ff8ff22 0 1px,transparent 1px 4px);animation:hScan 3s linear infinite}@keyframes hScan{to{background-position:0 40px}}@keyframes hIn{from{opacity:0;transform:scaleY(.1)}to{opacity:1;transform:none}}' +
    '#holoHd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #6ff6ff77}#holoHd b{font:900 20px "Courier New",monospace;letter-spacing:.14em}#holoBal{font-size:13px;color:#ffe08a;text-shadow:0 0 6px #ffb000}' +
    '#holoX{width:40px;height:40px;border-radius:50%;border:2px solid #6ff6ff;background:#00222c99;color:#dffcff;font:700 18px sans-serif;cursor:pointer}' +
    '#holoL{overflow-y:auto;padding:4px 12px 12px;-webkit-overflow-scrolling:touch;touch-action:pan-y}.hC{margin:12px 0 4px;font-size:11px;letter-spacing:.3em;color:#9ff8ff99}' +
    '.hR{display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px dashed #6ff6ff33}.hR span{flex:1}.hR i{font-style:normal;color:#ffe08a;min-width:92px;text-align:right}' +
    '.hR button{height:34px;min-width:58px;border-radius:17px;border:2px solid #6ff6ff;background:#00e5ff33;color:#fff;font:900 13px "Courier New",monospace;cursor:pointer}.hR button.no{opacity:.45}.hR em{font-style:normal;font-size:11px;color:#9dffb5}';
  document.head.appendChild(css);
  const btn = document.createElement('button'); btn.id = 'shopBtn'; btn.textContent = 'SHOP'; document.body.appendChild(btn);
  const bubble = document.createElement('div'); bubble.id = 'grokSay'; document.body.appendChild(bubble);
  const holo = document.createElement('div'); holo.id = 'holo'; holo.innerHTML = '<div id="holoP"><div id="holoHd"><div><b>GROK PRIZE SHOP</b><div id="holoBal"></div></div><button id="holoX" aria-label="Close">✕</button></div><div id="holoL"></div></div>'; document.body.appendChild(holo);
  const list = holo.querySelector('#holoL'), bal = holo.querySelector('#holoBal');
  function fill() { const b = balance(), own = prizes(); bal.textContent = '🎟 ' + b + ' TICKETS'; let cat = '', h = '';
    for (const it of ITEMS) { if (it.cat !== cat) { cat = it.cat; h += '<div class="hC">' + cat + '</div>'; }
      h += `<div class="hR"><span>${it.name}${own[it.id] ? ' <em>×' + own[it.id] + '</em>' : ''}</span><i>${it.price} TICKETS</i><button data-id="${it.id}" class="${b < it.price ? 'no' : ''}">BUY</button></div>`; }
    list.innerHTML = h; }
  const stop = e => { e.stopPropagation(); };
  for (const el of [btn, holo]) { el.addEventListener('pointerdown', stop); el.addEventListener('touchstart', stop, { passive: true }); }
  const api = { open: false, near: false, said: [], buys: 0, stats, G, grok, extraBounds, camBounds, ITEMS, balance, openShop, closeShop, buy };
  function openShop() { if (api.open) return; api.open = true; btn.classList.remove('on'); fill(); holo.classList.add('on'); say(GREET);
    const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false; }
  function closeShop() { if (!api.open) return; api.open = false; holo.classList.remove('on'); }
  function buy(id) { const it = byId[id]; if (!it) return false; const b = balance();
    if (b < it.price) { say(`Ah, the ${it.name} is ${it.price} tickets and you've got ${b}. Win a few more games and come back!`); return false; }
    spend(it.price); addPrize(id); api.buys++; setHeld(id); say(`Great choice! Enjoy your ${it.name}!`); fill(); return true; }
  btn.addEventListener('click', e => { e.stopPropagation(); openShop(); });
  holo.addEventListener('click', e => { e.stopPropagation(); const t = e.target; if (t.id === 'holoX' || t === holo) closeShop(); else if (t.dataset && t.dataset.id) buy(t.dataset.id); });
  addEventListener('keydown', e => { if (api.open) { if (e.code === 'Escape' || e.code === 'Backspace') closeShop(); e.stopImmediatePropagation(); return; }
    if (api.near && (e.code === 'KeyE' || e.code === 'Enter') && btn.classList.contains('on')) { openShop(); e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  // prizes row in the existing INVENTORY panel (inventory.js), injected only while it is open
  const inv = document.getElementById('inv');
  if (inv) new MutationObserver(() => { if (!inv.classList.contains('on')) return; const P = document.getElementById('invP'); if (!P) return; let r = document.getElementById('invPz');
    if (!r) { r = document.createElement('div'); r.id = 'invPz'; r.className = 'invR'; r.style.cssText = 'border-color:#00e5ff88;background:#021a22cc;flex-wrap:wrap'; P.appendChild(r); }
    renderChips(); }).observe(inv, { attributes: true, attributeFilter: ['class'] });

  // ---------- HELD PRIZE: the player's monkey carries one bought prize (built with the same shelf builders) ----------
  const HK = 'neonarcade.held';
  const vcStd = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, emissive: 0x303034 });
  const vm = (L, mat = vcStd) => new THREE.Mesh(mergeGeometries(L), mat);
  // kind: 'hug' = both arms around it at the chest, 'hand' = right hand
  function buildHeld(id) {
    const g = new THREE.Group(); g.name = 'heldPrize'; g.userData.id = id; let kind = 'hug';
    if (MON[id]) { const L = []; monkeyPlush(L, 0, 0, 0, ...MON[id], 1.0); g.add(vm(L)); g.userData.size = 0.56; }
    else if (id === 'grok') { const L = [], s = 0.62; grokPlush(L, 0, 0, 0, s); g.add(vm(L));
      const f = facePlane(g, s, 0.59 * s, 0.3 * s); f.name = 'heldGrokFace'; const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.3 * s / 1.35 * 1.0, 0.11 * s / 1.35), chestMat); ch.position.set(0, 0.27 * s, 0.165 * s); g.add(ch); g.userData.size = 0.75; }
    else if (BOXC[id]) { const [txt, col] = BOXC[id]; const tex = canvasTex(256, 320, (c) => { c.fillStyle = col; c.fillRect(0, 0, 256, 320); c.fillStyle = '#ffffffdd'; c.fillRect(18, 70, 220, 220); c.fillStyle = '#fff'; c.font = '900 44px Impact, Arial Black'; c.textAlign = 'center'; c.fillText(txt, 128, 52, 236);
        c.fillStyle = col; c.beginPath(); c.arc(128, 150, 44, 0, 7); c.fill(); c.fillRect(88, 190, 80, 70); c.fillStyle = '#fff'; c.beginPath(); c.arc(112, 145, 9, 0, 7); c.arc(144, 145, 9, 0, 7); c.fill(); }).t;
      const side = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, emissive: col, emissiveIntensity: 0.15 }), face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.1), [side, side, side, side, face, side]); b.position.y = 0.19; g.add(b); g.userData.size = 0.38; }
    else if (CC[id]) { kind = 'hand'; const L = [], c = CC[id];
      if (id === 'jaw') { part(L, CYL, 0xffffff, 0, 0.1, 0, 0.008, 0.2, 0.008); part(L, SPH, c[0], 0, 0.24, 0, 0.06, 0.06, 0.06); part(L, SPH, c[1], 0.02, 0.26, 0.04, 0.03, 0.03, 0.03); }
      else if (id === 'cotton') { part(L, CYL, 0xffffff, 0, 0.1, 0, 0.008, 0.22, 0.008); for (let k = 0; k < 9; k++) part(L, SPH, k % 2 ? c[0] : 0xff8ad8, Math.sin(k * 2.3) * 0.05, 0.26 + Math.cos(k * 1.7) * 0.05, Math.cos(k * 2.9) * 0.04, 0.06, 0.06, 0.06); }
      else if (id === 'gummy') { part(L, BOX, 0xffffff, 0, 0.1, 0, 0.14, 0.2, 0.05); for (let k = 0; k < 8; k++) part(L, SPH, c[k % 3], -0.04 + (k % 3) * 0.04, 0.05 + (k / 3 | 0) * 0.05, 0.027, 0.018, 0.022, 0.012); }
      else { part(L, CYL, 0xffffff, 0, 0.1, 0, 0.008, 0.22, 0.008);
        const t = id === 'rainbow' ? 1 : id === 'cherry' ? 2 : 0, cg = setUV(new THREE.CircleGeometry(0.1, 22), 0, 1, 0, 1), uv = cg.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setX(q, (t + uv.getX(q)) / 3);
        const pop = new THREE.Mesh(cg.translate(0, 0.3, 0.012), new THREE.MeshBasicMaterial({ map: sw.t, side: THREE.DoubleSide, toneMapped: false })); g.add(pop); }
      g.add(vm(L, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))); g.userData.size = 0.3; }
    else { const L = []; toy3(L, id, 0, 0, 0, 1.6, 0, 0); g.add(vm(L)); g.userData.size = 0.45; }
    g.userData.kind = kind; g.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } }); return g;
  }
  const heldId = () => { try { const v = localStorage.getItem(HK); return v && byId[v] && prizes()[v] ? v : null; } catch (e) { return null; } };
  let heldObj = null, heldMount = null;
  function setHeld(id) { if (id && !(byId[id] && prizes()[id])) id = null; try { if (id) localStorage.setItem(HK, id); else localStorage.removeItem(HK); } catch (e) {} syncHeld(); renderChips(); return id; }
  function syncHeld() { const id = heldId(), m = getMonkey(), u = m && m.userData; if (!u || !u.torso) return;
    if (heldObj && heldObj.userData.id === id) return;
    if (heldObj) { heldObj.parent && heldObj.parent.remove(heldObj); heldObj = null; heldMount = null;
      for (const a of u.arms || []) { a.hand.visible = true; a.hand.scale.setScalar(1); a.hand.rotation.x = 0; a.sh.rotation.set(0, 0, 0.08 * a.sd); a.el.rotation.set(0, 0, 0); } }   // back to the normal arm pose (main.js re-poses next frame)
    if (!id) return; heldObj = buildHeld(id);
    if (heldObj.userData.kind === 'hand') { heldMount = u.arms[1].el; heldObj.position.set(0.0, -0.34, 0.07); heldObj.rotation.set(-1.2, 0, 0); }   // right fist, pop held upright
    else { heldMount = u.torso; const big = id === 'grok'; heldObj.position.set(0, big ? 0.12 : 0.1, big ? 0.36 : 0.33); heldObj.rotation.set(0, 0, 0); }   // hugged to the chest
    heldMount.add(heldObj); }
  // arms wrap round the prize (applied after main.js's walk / idle pose; arm swing is replaced by the hug)
  function holdPose(u, dt) { if (!heldObj || !heldObj.visible) return; const hug = heldObj.userData.kind === 'hug', big = heldObj.userData.id === 'grok';
    for (const a of u.arms) { a.hand.visible = true; a.hand.scale.setScalar(1); a.hand.rotation.x = 0;
      if (hug) { a.sh.rotation.set(big ? -0.75 : -0.6, 0, -a.sd * (big ? 0.05 : 0.18)); a.el.rotation.set(big ? -0.7 : -1.25, 0, -a.sd * (big ? 0.75 : 0.55)); }
      else if (a.sd > 0) { a.sh.rotation.set(-0.45, 0, 0.12); a.el.rotation.set(-1.2, 0, 0); } }
    if (u.phone) u.phone.visible = false; }
  // save slots (session.js / opts.js): re-read 'neonarcade.prizes' + 'neonarcade.held' and re-sync the held plush, chips and open price list.
  // Nothing is cached (prizes()/heldId() read localStorage), so this is safe to call any time, repeatedly, even before the monkey exists.
  api.reloadPrizes = () => { try { syncHeld(); } catch (e) {} try { renderChips(); } catch (e) {} try { if (api.open) fill(); } catch (e) {} return heldId(); };
  api.hold = setHeld; Object.defineProperty(api, 'held', { get: heldId }); Object.defineProperty(api, 'heldObj', { get: () => heldObj });
  // INVENTORY: PRIZES chips (tap = hold, tap the held one = put away)
  const css2 = document.createElement('style'); css2.textContent = '#invPz{flex-direction:column;align-items:stretch!important}#invPz .pzT{display:flex;justify-content:space-between;color:#dffbff;font-weight:800}#invPz .pzT small{color:#9ff8ff;font-weight:600}#pzChips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
    '.pzC{min-height:48px;padding:6px 14px;border-radius:24px;border:2px solid #00e5ff88;background:#00222ccc;color:#dffbff;font:800 14px Arial,sans-serif;cursor:pointer;touch-action:manipulation}.pzC.on{border-color:#ffe08a;background:#ffb00044;color:#fff;box-shadow:0 0 12px #ffb000aa}.pzC b{color:#ffe08a;margin-left:6px}';
  document.head.appendChild(css2);
  function renderChips() { const r = document.getElementById('invPz'); if (!r) return; const p = prizes(), h = heldId(), ids = ITEMS.map(i => i.id).filter(id => p[id]);
    r.innerHTML = '<div class="pzT"><span>PRIZES</span><small>' + (ids.length ? 'tap one to hold it · tap again to put away' : 'none yet - visit Grok!') + '</small></div><div id="pzChips">' +
      ids.map(id => `<button class="pzC${id === h ? ' on' : ''}" data-pz="${id}">${id === h ? '✋ ' : ''}${byId[id].name}${p[id] > 1 ? '<b>×' + p[id] + '</b>' : ''}</button>`).join('') + '</div>'; }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-pz]'); if (!b) return; e.stopPropagation(); const id = b.dataset.pz; setHeld(heldId() === id ? null : id); }, true);

  // ---------- per frame ----------
  let wasIn = false, t = 0, blinkT = 2, faceState = '';
  const tmp = new THREE.Vector3();
  api.update = (dt) => {
    t += dt; if (api_sky) api_sky.uniforms.uT.value = t; const m = getMonkey(); if (!m) return;
    syncHeld(); if (heldObj) { const pm = play && play.mode, A = window.__arcade, sStat = A && A.st;
      heldObj.visible = (!pm || pm === 'walk') && !(sStat && (sStat.seated || sStat.fp)) && !(tp && tp.locked) && m.visible; if (m.userData) holdPose(m.userData, dt); }
    const inRoom = m.position.x > WXp / 2;
    if (inRoom && !wasIn && st) { st.pitch = 0.04; st.dist = Math.max(st.dist, 5.0); }   // shop-local camera: level, a bit closer (once per visit)
    wasIn = inRoom; if (!inRoom) { if (btn.classList.contains('on')) btn.classList.remove('on'); if (api.open) closeShop(); return; }
    pushOut(m.position);
    const busy = (tp && tp.locked) || (play && play.mode && play.mode !== 'walk') || !!document.querySelector('#inv.on');
    api.near = !busy && Math.hypot(m.position.x - WXp - NP.x, m.position.z - NP.z) < 1.9;
    btn.classList.toggle('on', api.near && !api.open); if (api.open && !api.near && !busy) closeShop();
    // Grok idle: gentle bob + sway, head turns toward the player, blinks, mouth moves while talking
    grok.position.y = Math.sin(t * 1.6) * 0.015; grok.rotation.z = Math.sin(t * 0.9) * 0.02;
    grok.getWorldPosition(tmp); const want = Math.atan2(m.position.x - tmp.x, m.position.z - tmp.z) - grok.rotation.y - 0 ;
    const yaw = THREE.MathUtils.clamp(((want + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI, -0.7, 0.7);
    head.rotation.y += ((api.near || api.open ? yaw : Math.sin(t * 0.4) * 0.35) - head.rotation.y) * Math.min(1, dt * 4); head.rotation.x = Math.sin(t * 1.1) * 0.04;
    blinkT -= dt; if (blinkT < -0.12) blinkT = 2 + Math.random() * 3; talkT = Math.max(0, talkT - dt); happyT = Math.max(0, happyT - dt);
    const playing = !greetA.paused && !greetA.ended; const talking = talkT > 0 || playing, happy = happyT > 0 || playing || api.open;
    const tk = talking ? [0.15, 0.7, 1, 0.4][Math.floor(t * 11) % 4] : 0;
    // small wave while greeting
    const wv = arms[1]; if (happyT > 0.8 && talking) { wv.sh.rotation.z += (2.4 - wv.sh.rotation.z) * Math.min(1, dt * 6); wv.el.rotation.z = Math.sin(t * 9) * 0.45; wv.el.rotation.x += (-0.3 - wv.el.rotation.x) * Math.min(1, dt * 6); }
    else { wv.sh.rotation.z += (0.12 - wv.sh.rotation.z) * Math.min(1, dt * 4); wv.el.rotation.z *= 0.9; wv.el.rotation.x += (-1.2 - wv.el.rotation.x) * Math.min(1, dt * 4); }
    const fs = (happy ? 'h' : blinkT < 0 ? 'b' : 'o') + tk;
    if (fs !== faceState) { faceState = fs; drawFace(faceTex.g, blinkT < 0, tk, happy); faceTex.t.needsUpdate = true; }
  };
  window.__shop = api;
  return api;
}
