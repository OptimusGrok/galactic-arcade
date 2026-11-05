// LEVEL 2 doors (Dave t303-305u): closed, riveted steel double doors set into the hallway's east wall between room 1 and room 2.
// Cheap: one 512x256 canvas atlas (LEVEL 2 stencil / hazard stripes / keypad screen), ~9 draw calls.
// Opening later: each leaf is its own pivot group at its hinge edge (rotate pivot.rotation.y or slide); window.__level2Door.open()/close() are stubs.
export function setupLevel2Door({ THREE, parent, mergeGeometries, x, z }) {
  const W = 1.1, Hh = 2.55, T = 0.08, FZ = 0.06;   // leaf width/height/thickness, leaf centre in front of the wall
  // ---- atlas ----
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = '#1a2230'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#ffd23a'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#ffd23a'; g.font = 'bold 82px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LEVEL 2', 256, 68);
  g.fillStyle = '#111'; g.fillRect(0, 128, 256, 128); g.fillStyle = '#f5c400';
  for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 32, 256); g.lineTo(i * 32 + 16, 256); g.lineTo(i * 32 + 16 + 128, 128); g.lineTo(i * 32 + 128, 128); g.fill(); }
  g.fillStyle = '#04223a'; g.fillRect(256, 128, 256, 128); g.fillStyle = '#5cc8ff'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText('LEVEL 2', 384, 165); g.font = 'bold 22px monospace'; g.fillText('ACCESS LOCKED', 384, 200); g.fillText('[ * * * * ]', 384, 232);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const uvRect = (geo, u0, v0, u1, v1) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); return geo; };
  // ---- materials ----
  const steel = new THREE.MeshStandardMaterial({ color: 0xa9b2bd, metalness: 0.75, roughness: 0.38, emissive: 0x1c2026 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a525c, metalness: 0.8, roughness: 0.45, emissive: 0x0b0d10 });
  const sign = new THREE.MeshBasicMaterial({ map: tex, color: 0xd8d8d8, toneMapped: true });
  const screen = new THREE.MeshBasicMaterial({ map: tex, color: 0xb0b0b0 });
  const hazard = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.1, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -2 });
  const box = (w, h, d, px, py, pz) => new THREE.BoxGeometry(w, h, d).translate(px, py, pz);
  const cyl = (r, h, px, py, pz) => new THREE.CylinderGeometry(r, r, h, 10).translate(px, py, pz);
  const rivet = (px, py, pz) => new THREE.SphereGeometry(0.018, 6, 4).scale(1, 1, 0.6).translate(px, py, pz);
  const root = new THREE.Group(); root.name = 'level2Door'; root.position.set(x, 0, z); root.rotation.y = -Math.PI / 2;   // local +z faces world -x (into the hallway)
  // ---- leaves (pivot at the hinge edge) ----
  const leaves = [];
  for (const s of [-1, 1]) {   // s=-1 left leaf (hinge at local -x), s=+1 right leaf
    const pivot = new THREE.Group(); pivot.name = 'level2Leaf' + (s < 0 ? 'L' : 'R'); pivot.position.set(s * (W + 0.01), 0, FZ); root.add(pivot);
    const cx = -s * W / 2;   // leaf centre relative to its hinge
    const sg = [box(W, Hh, T, cx, Hh / 2 + 0.02, 0)], dg = [];
    for (const y of [0.55, 1.35, 2.15]) { dg.push(box(W - 0.12, 0.12, 0.05, cx, y, T / 2 + 0.025)); for (const k of [-1, 1]) sg.push(rivet(cx + k * (W / 2 - 0.1), y, T / 2 + 0.055)); }
    for (let i = 0; i < 9; i++) for (const yy of [0.12, Hh - 0.08]) sg.push(rivet(cx - W / 2 + 0.07 + i * (W - 0.14) / 8, yy, T / 2 + 0.01));
    for (let j = 0; j < 12; j++) for (const k of [-1, 1]) sg.push(rivet(cx + k * (W / 2 - 0.05), 0.2 + j * (Hh - 0.4) / 11, T / 2 + 0.01));
    for (const y of [0.4, 1.3, 2.2]) dg.push(cyl(0.045, 0.32, 0, y, 0));   // hinge barrels on the outer edge
    if (s > 0) { dg.push(box(0.1, 0.5, 0.09, -W + 0.05, 1.2, T / 2 + 0.04)); dg.push(cyl(0.03, 0.28, -W + 0.05, 1.2, T / 2 + 0.1)); }   // centre latch
    const ms = new THREE.Mesh(mergeGeometries(sg), steel), md = new THREE.Mesh(mergeGeometries(dg), dark);
    const half = uvRect(new THREE.PlaneGeometry(W - 0.08, 0.36), s < 0 ? 0 : 0.5, 0.5, s < 0 ? 0.5 : 1, 1).translate(cx - s * 0.04, 1.78, T / 2 + 0.005);
    const sm = new THREE.Mesh(half, sign); sm.name = 'level2Sign' + (s < 0 ? 'L' : 'R');
    pivot.add(ms, md, sm); leaves.push(pivot);
  }
  // ---- frame, keypad box, floor stripes ----
  const fg = [];
  fg.push(box(0.16, Hh + 0.22, 0.2, -(W + 0.09), (Hh + 0.22) / 2, 0.06), box(0.16, Hh + 0.22, 0.2, W + 0.09, (Hh + 0.22) / 2, 0.06), box(2 * W + 0.34, 0.2, 0.22, 0, Hh + 0.12, 0.06));
  const KX = W + 0.55;   // keypad + card scanner beside the right leaf
  fg.push(box(0.36, 0.62, 0.07, KX, 1.35, 0.035), box(0.2, 0.26, 0.05, KX, 0.92, 0.03));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fg.push(box(0.06, 0.05, 0.03, KX - 0.08 + c * 0.08, 1.12 + r * 0.07, 0.08));
  const frame = new THREE.Mesh(mergeGeometries(fg), dark); frame.name = 'level2Frame';
  const scr = new THREE.Mesh(uvRect(new THREE.PlaneGeometry(0.28, 0.16), 0.5, 0, 1, 0.5).translate(KX, 1.5, 0.072), screen); scr.name = 'level2Keypad';
  const haz = new THREE.Mesh(uvRect(new THREE.PlaneGeometry(2 * W + 0.4, 0.5), 0, 0, 0.5, 0.5).rotateX(-Math.PI / 2).translate(0, 0.012, 0.42), hazard); haz.name = 'level2Hazard';
  root.add(frame, scr, haz); parent.add(root);
  // ---- collider: the wall line in front of the doors (world x = x - 0.14 .. ) ----
  const face = x - (FZ + T / 2 + 0.06), zMin = z - (W + 0.2), zMax = z + (W + 0.75);
  function block(p, R) { if (p.z > zMin && p.z < zMax && p.x > face - R) p.x = face - R; }
  let isOpen = false;
  const api = window.__level2Door = { group: root, leaves, label: 'LEVEL 2', collider: { x: face, zMin, zMax }, block,
    get open_() { return isOpen; },
    open() { return false; },    // TODO (Dave later): swing leaves[0].rotation.y = -1.6, leaves[1].rotation.y = 1.6 (or slide) and drop the collider
    close() { return false; } };
  return api;
}
