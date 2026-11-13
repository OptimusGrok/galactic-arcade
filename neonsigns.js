// t773u NEON NAME SIGNS: a glowing sign of each machine's game name above that machine (on the wall above the wall cabinets, facing into the room;
// on top of the free-standing claw machine; above DEAD SIGNAL's curved screen).
// t775u: each sign is styled after its own game's title screen (fonts, colours, motifs), a bit dimmer and ~25% bigger. The lettering is baked
// offline into ONE atlas (tex/neon_signs.webp, rects in neon_atlas.js; rebuild with node tools/build_neon_atlas.js) so every device shows the
// same fonts. Still ONE merged mesh of quads (one draw call, one program, no per-frame work), compiled by the warm-up; the atlas is uploaded
// to the GPU as soon as it loads (initTexture), on the start screen, not at the first room frame.
import { NEON_ATLAS } from './neon_atlas.js';
export function buildNeonSigns(THREE, mergeGeometries, list, opt = {}) {
  const A = NEON_ATLAS, MAXW = opt.maxW || 3.7, HALF = opt.HALF, WALL_D = 0.06;
  const quads = [], info = [];
  for (const e of list) {
    const r = A.signs[e.key]; if (!r) continue;
    let w = r.m[0] * (e.scale || 1), h = r.m[1] * (e.scale || 1); if (w > MAXW) { h *= MAXW / w; w = MAXW; }
    const u0 = r.x / A.W, u1 = (r.x + r.w) / A.W, v1 = 1 - r.y / A.H, v0 = 1 - (r.y + r.h) / A.H;
    // place: wall cabinet -> on the wall above it; free-standing -> on top of it / its given anchor
    const cab = e.cab; cab.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(cab), ctr = b.getCenter(new THREE.Vector3()), n = (e.normal || cab.userData.inward).clone().setY(0).normalize();
    const p = e.at ? e.at.clone() : ctr.clone();
    if (e.wall) { if (Math.abs(n.x) > Math.abs(n.z)) p.x = -Math.sign(n.x) * (HALF - WALL_D); else p.z = -Math.sign(n.z) * (HALF - WALL_D);
      p.y = Math.max(b.max.y + 0.3 + h / 2, opt.minY || 3.3); }
    else if (!e.at) p.y = b.max.y + 0.08 + h / 2;
    else p.y += h / 2;
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    g.rotateY(Math.atan2(n.x, n.z)); g.translate(p.x, p.y, p.z); quads.push(g);
    info.push({ title: e.title, key: e.key, color: '#' + new THREE.Color(e.color).getHexString(), pos: p.toArray().map(v => +v.toFixed(3)), w: +w.toFixed(3), h: +h.toFixed(3), normal: n.toArray().map(v => +v.toFixed(3)), bottom: +(p.y - h / 2).toFixed(3), top: +(p.y + h / 2).toFixed(3), cabTop: +b.max.y.toFixed(3) });
  }
  const tex = new THREE.TextureLoader().load(opt.src || 'tex/neon_signs.webp', t => { try { if (opt.renderer) opt.renderer.initTexture(t); } catch (err) {} if (opt.onLoad) opt.onLoad(t); });
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = opt.aniso || 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1).multiplyScalar(opt.k || 0.85) });   // t775u: 0.85 (v188: 1.3), ~35% dimmer
  mat.name = 'neonSigns';
  const mesh = new THREE.Mesh(mergeGeometries(quads), mat); mesh.name = 'neonSigns'; mesh.renderOrder = 3; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  mesh.userData.signs = info; mesh.userData.k = mat.color.r; return mesh;
}
