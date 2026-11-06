// LEVEL 2 doors: closed riveted steel double doors across the hallway opening at room 1.
// Frame front face is flush with room 1's north interior wall (the z passed in, world z = -HALF).
// The slab extends into the hallway (negative z) and overlaps both side walls, so the opening is
// sealed with no side gap and nothing of the frame sits out in room 1.
// Leaves, rivets, centre latch, hinge barrels, keypad and the floor hazard threshold are the original
// pieces. Each leaf is still its own hinge pivot; window.__level2Door.open()/close() stay inert.
// Cheap: one 512x256 canvas atlas (LEVEL 2 stencil / hazard stripes / keypad screen), 9 draw calls.
export function setupLevel2Door({ THREE, parent, mergeGeometries, x = 0, z, width = 3.2, doorH = 3 }) {
  const HW = width / 2, jamb = 0.14, leafGap = -0.02, frameD = 0.2;   // leaves overlap 2 cm so the closed pair does not leak at the meeting stile
  const W = HW - jamb - leafGap / 2;                 // leaf width; hinge on the outer edge, leaves overlap at centre
  const Hh = 2.55, T = 0.08, pivotZ = -T / 2 - 0.06; // leaf front (pivotZ + T/2) is 6 cm behind the frame face
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
  // local +z faces world +z (into room 1). local z = 0 is the frame front, on the wall plane.
  const root = new THREE.Group(); root.name = 'level2Door'; root.position.set(x, 0, z); root.rotation.y = 0;
  // ---- leaves (pivot at the hinge edge) ----
  const leaves = [];
  for (const s of [-1, 1]) {   // s=-1 left leaf (hinge at local -x), s=+1 right leaf
    const pivot = new THREE.Group(); pivot.name = 'level2Leaf' + (s < 0 ? 'L' : 'R'); pivot.position.set(s * (HW - jamb), 0, pivotZ); root.add(pivot);
    const cx = -s * W / 2;   // leaf centre relative to its hinge
    const sg = [box(W, Hh, T, cx, Hh / 2 + 0.02, 0)], dg = [];
    for (const y of [0.55, 1.35, 2.15]) { dg.push(box(W - 0.12, 0.12, 0.05, cx, y, T / 2 + 0.025)); for (const k of [-1, 1]) sg.push(rivet(cx + k * (W / 2 - 0.1), y, T / 2 + 0.055)); }
    for (let i = 0; i < 9; i++) for (const yy of [0.12, Hh - 0.08]) sg.push(rivet(cx - W / 2 + 0.07 + i * (W - 0.14) / 8, yy, T / 2 + 0.01));
    for (let j = 0; j < 12; j++) for (const k of [-1, 1]) sg.push(rivet(cx + k * (W / 2 - 0.05), 0.2 + j * (Hh - 0.4) / 11, T / 2 + 0.01));
    for (const y of [0.4, 1.3, 2.2]) dg.push(cyl(0.045, 0.32, 0, y, 0));   // hinge barrels on the outer edge
    if (s > 0) { dg.push(box(0.1, 0.5, 0.09, -W + 0.05, 1.2, T / 2 + 0.04)); dg.push(cyl(0.03, 0.28, -W + 0.05, 1.2, T / 2 + 0.1)); }   // centre latch
    const ms = new THREE.Mesh(mergeGeometries(sg), steel), md = new THREE.Mesh(mergeGeometries(dg), dark);
    if (s > 0) ms.position.z = -0.004;   // right leaf sits a hair behind the left so the overlap does not flicker
    const half = uvRect(new THREE.PlaneGeometry(W - 0.08, 0.36), s < 0 ? 0 : 0.5, 0.5, s < 0 ? 0.5 : 1, 1).translate(cx - s * 0.04, 1.78, T / 2 + 0.005);
    const sm = new THREE.Mesh(half, sign); sm.name = 'level2Sign' + (s < 0 ? 'L' : 'R');
    pivot.add(ms, md, sm); leaves.push(pivot);
  }
  // ---- frame fills the opening (posts overlap each side wall by 2 cm); header meets the doorway head ----
  const postW = jamb + 0.02, postX = HW - jamb / 2 + 0.01, headH = doorH - (Hh + 0.02) + 0.06;
  const fg = [];
  fg.push(box(postW, doorH, frameD, -postX, doorH / 2, -frameD / 2), box(postW, doorH, frameD, postX, doorH / 2, -frameD / 2));
  fg.push(box(width + 0.04, headH, 0.22, 0, doorH - headH / 2, -0.11));
  // keypad + card scanner on the east hallway wall, just inside the corridor, facing west (same parts as before)
  const pad = new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(HW + 0.02, 0, -0.55);
  const bake = geo => geo.applyMatrix4(pad);
  fg.push(bake(box(0.36, 0.62, 0.07, 0, 1.35, 0.035)), bake(box(0.2, 0.26, 0.05, 0, 0.92, 0.03)));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fg.push(bake(box(0.06, 0.05, 0.03, -0.08 + c * 0.08, 1.12 + r * 0.07, 0.08)));
  const frame = new THREE.Mesh(mergeGeometries(fg), dark); frame.name = 'level2Frame';
  const scr = new THREE.Mesh(bake(uvRect(new THREE.PlaneGeometry(0.28, 0.16), 0.5, 0, 1, 0.5).translate(0, 1.5, 0.072)), screen); scr.name = 'level2Keypad';
  // hazard threshold on the floor in front of the face (room 1 side), across the opening
  const haz = new THREE.Mesh(uvRect(new THREE.PlaneGeometry(width, 0.5), 0, 0, 0.5, 0.5).rotateX(-Math.PI / 2).translate(0, 0.012, 0.30), hazard); haz.name = 'level2Hazard';
  root.add(frame, scr, haz); parent.add(root);
  // ---- collider: thin slab across the whole opening. Pushes along z only, from either side. ----
  const xMin = x - HW, xMax = x + HW, zFront = z, zBack = z - frameD;
  let isOpen = false;
  function block(p, R) {
    if (isOpen) return;
    if (p.x <= xMin || p.x >= xMax) return;
    if (p.z <= zBack - R || p.z >= zFront + R) return;
    p.z = p.z < (zBack + zFront) * 0.5 ? zBack - R : zFront + R;
  }
  const api = window.__level2Door = { group: root, leaves, label: 'LEVEL 2', collider: { xMin, xMax, zFront, zBack },
    align: { wallZ: z, frameFrontZ: zFront, leafFrontZ: z + pivotZ + T / 2, x0: xMin, x1: xMax, zBack, zFront, width, doorH }, block,
    get open_() { return isOpen; },
    open() { return false; },    // TODO (Dave later): swing the hinge pivots and drop the collider. Not enabled.
    close() { return false; } };
  return api;
}
