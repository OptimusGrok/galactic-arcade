// t214 dev GRID (hidden TICKETS menu): a thin glowing grid lying on every floor (room 1, hallway, room 2, the white room), one cell =
// the ticket machine's base (plinth) footprint, aligned so the machine sits exactly on one cell. Tap a cell (not a drag) to toggle it green.
// Persisted per device: neonarcade.grid ('1' = on), neonarcade.gridCells (JSON list of "i,j"). One LineSegments for all floors + one for outlines.
export function setupGrid({ THREE, scene, camera, cv, HALF, DOOR_W, HALL_L, Z2 }) {
  const KEY = 'neonarcade.grid', CK = 'neonarcade.gridCells', Y = 0.014;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const G = { on: LS(KEY) === '1', cell: null, origin: null, rects: [], cells: new Set(), taps: 0, built: false };
  try { (JSON.parse(LS(CK) || '[]') || []).forEach(k => G.cells.add(k)); } catch (e) {}
  const root = new THREE.Group(); root.name = 'devGrid'; root.visible = false; scene.add(root);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x22ff66, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x66ff99, transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
  let lines = null, fills = null, edges = null;
  function measure() {   // the ticket machine's base: union of its meshes that touch the floor (the plinth), in world XZ
    const K = scene.getObjectByName('ticketKiosk'); if (!K) return false; K.updateMatrixWorld(true);
    const b = new THREE.Box3(), mb = new THREE.Box3(); K.traverse(o => { if (o.isMesh) { mb.setFromObject(o); if (mb.min.y < 0.03) b.union(mb); } });
    if (b.isEmpty()) return false;
    G.cell = [b.max.x - b.min.x, b.max.z - b.min.z]; G.origin = [b.min.x, b.min.z]; G.base = { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z }; return true; }
  function floors() {   // axis-aligned floor rectangles in world XZ
    const R = [{ n: 'room1', minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF }, { n: 'hallway', minX: -DOOR_W / 2, maxX: DOOR_W / 2, minZ: -HALF - HALL_L, maxZ: -HALF },
      { n: 'room2', minX: -HALF, maxX: HALF, minZ: Z2 - HALF, maxZ: Z2 + HALF }];
    const W = scene.getObjectByName('whiteRoom'); if (W) { const fl = W.children.find(o => o.isMesh && o.geometry.type === 'PlaneGeometry' && o.rotation.x < -1.5 && Math.abs(o.position.y) < 1e-3);
      if (fl) { const b = new THREE.Box3().setFromObject(fl); R.push({ n: 'white', minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z }); } }
    return R; }
  function build() { if (!measure()) return false; G.rects = floors(); const [cw, cd] = G.cell, [ox, oz] = G.origin, P = [];
    for (const r of G.rects) { const y = Y;
      for (let k = Math.ceil((r.minX - ox) / cw); ox + k * cw <= r.maxX + 1e-6; k++) { const x = ox + k * cw; P.push(x, y, r.minZ, x, y, r.maxZ); }
      for (let k = Math.ceil((r.minZ - oz) / cd); oz + k * cd <= r.maxZ + 1e-6; k++) { const z = oz + k * cd; P.push(r.minX, y, z, r.maxX, y, z); }
      P.push(r.minX, y, r.minZ, r.maxX, y, r.minZ, r.maxX, y, r.minZ, r.maxX, y, r.maxZ, r.maxX, y, r.maxZ, r.minX, y, r.maxZ, r.minX, y, r.maxZ, r.minX, y, r.minZ); }
    if (lines) { root.remove(lines); lines.geometry.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lines = new THREE.LineSegments(g, lineMat); lines.name = 'gridLines'; lines.raycast = () => {}; lines.renderOrder = 2; root.add(lines);
    G.lines = P.length / 6; G.built = true; paint(); return true; }
  function cellRect(i, j) { const [cw, cd] = G.cell, [ox, oz] = G.origin; return [ox + i * cw, oz + j * cd, ox + (i + 1) * cw, oz + (j + 1) * cd]; }
  function paint() {   // green fills (one merged mesh) + glowing outlines (one LineSegments), clipped to the floor they lie on
    for (const o of [fills, edges]) if (o) { root.remove(o); o.geometry.dispose(); } fills = edges = null; if (!G.cells.size || !G.built) return;
    const F = [], E = [], y = Y + 0.002;
    for (const k of G.cells) { const [i, j] = k.split(',').map(Number); let [x0, z0, x1, z1] = cellRect(i, j); const r = G.rects.find(r => (x0 + x1) / 2 > r.minX && (x0 + x1) / 2 < r.maxX && (z0 + z1) / 2 > r.minZ && (z0 + z1) / 2 < r.maxZ); if (!r) continue;
      x0 = Math.max(x0, r.minX); x1 = Math.min(x1, r.maxX); z0 = Math.max(z0, r.minZ); z1 = Math.min(z1, r.maxZ);
      F.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1); E.push(x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0); }
    if (!F.length) return;
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(F, 3)); fills = new THREE.Mesh(fg, fillMat); fills.name = 'gridFills'; fills.raycast = () => {}; fills.renderOrder = 3; root.add(fills);
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(E, 3)); edges = new THREE.LineSegments(eg, edgeMat); edges.name = 'gridEdges'; edges.raycast = () => {}; edges.renderOrder = 4; root.add(edges); }
  function save() { LS(CK, JSON.stringify([...G.cells])); }
  function set(on) { G.on = !!on; LS(KEY, G.on ? '1' : '0'); if (G.on && !G.built) build(); root.visible = G.on && G.built; }
  // ---- taps: raycast the scene; only a tap whose first visible hit is a floor (or nothing but the floor plane) toggles a cell ----
  const glow = o => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return !!m && ((m.transparent && m.depthWrite === false) || m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.3)); };   // light shafts / halos: see-through
  const rc = new THREE.Raycaster(), nd = new THREE.Vector2(), vis = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  function cellAt(cx, cy) { const r = cv.getBoundingClientRect(); nd.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); rc.setFromCamera(nd, camera);
    const hit = rc.intersectObjects(scene.children, true).find(h => vis(h.object) && !(h.object.isSprite) && h.object.type !== 'Points' && !h.object.isLine && !glow(h.object));
    if (!hit || hit.point.y > 0.05 || (hit.face && Math.abs(hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y) < 0.7)) return null;   // a machine, wall or anything standing on the floor: not ours
    const p = hit.point; if (!G.rects.some(r => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ)) return null;
    return [Math.floor((p.x - G.origin[0]) / G.cell[0]), Math.floor((p.z - G.origin[1]) / G.cell[1])]; }
  function tapAt(cx, cy) { if (!G.on || !G.built || (window.__start && !window.__start.dismissed)) return false; const c = cellAt(cx, cy); if (!c) return false;
    const k = c.join(','); if (G.cells.has(k)) G.cells.delete(k); else G.cells.add(k); G.taps++; G.last = k; save(); paint(); return true; }
  // desktop mouse: a click without a drag (touch taps come from main.js's touch handler so a tap never also jumps)
  let md = null; cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) md = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  cv.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse' || !md) return; const m = md; md = null; if (Math.hypot(e.clientX - m.x, e.clientY - m.y) < 6 && e.timeStamp - m.t < 400) tapAt(e.clientX, e.clientY); });
  const api = Object.assign(G, { set, tapAt, build, clear() { G.cells.clear(); save(); paint(); }, get count() { return G.cells.size; }, group: root, cellAt });
  if (G.on) { set(true); if (!G.built) setTimeout(() => set(G.on), 500); }
  addEventListener('load', () => setTimeout(() => { if (G.on) build(); }, 800));   // the white room's floor is sized by shop.js after load
  return api; }
