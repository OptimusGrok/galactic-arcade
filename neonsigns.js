// t773u NEON NAME SIGNS: a glowing neon-tube sign of each machine's game name above that machine (on the wall above the wall cabinets,
// facing into the room; on top of the free-standing claw machine; above DEAD SIGNAL's curved screen). Cheap: ONE canvas atlas texture,
// ONE merged mesh of quads (one draw call, one program, no per-frame work); the warm-up shader slices compile it with the rest of the scene.
export function buildNeonSigns(THREE, mergeGeometries, list, opt = {}) {
  const ROW = 128, CW = 1024, H0 = opt.h || 0.6, MAXW = opt.maxW || 3.4, HALF = opt.HALF, WALL_D = 0.06;
  const c = document.createElement('canvas'); c.width = CW; c.height = THREE.MathUtils.ceilPowerOfTwo(ROW * list.length); const x = c.getContext('2d');
  const font = px => `700 ${px}px "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`;
  const quads = [], info = [];
  list.forEach((e, k) => {
    const y0 = k * ROW, mid = y0 + ROW / 2, col = new THREE.Color(e.color), hex = '#' + col.getHexString();
    const core = '#' + col.clone().lerp(new THREE.Color(0xffffff), 0.4).getHexString();
    let px = 70; x.font = font(px); let tw = x.measureText(e.title).width; if (tw > CW - 60) { px = Math.floor(px * (CW - 60) / tw); x.font = font(px); tw = x.measureText(e.title).width; }
    x.save(); x.beginPath(); x.rect(0, y0, CW, ROW); x.clip();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = x.lineCap = 'round';
    x.shadowColor = hex; x.shadowBlur = 22; x.strokeStyle = hex; x.lineWidth = 10; x.strokeText(e.title, CW / 2, mid); x.shadowBlur = 10; x.strokeText(e.title, CW / 2, mid);   // tube + glow
    x.shadowBlur = 0; x.strokeStyle = core; x.lineWidth = 3.2; x.strokeText(e.title, CW / 2, mid);                                                                         // hot core
    x.restore();
    const pw = Math.min(CW, tw + 70), u0 = (CW - pw) / 2 / CW, u1 = 1 - u0, v1 = 1 - y0 / c.height, v0 = 1 - (y0 + ROW) / c.height;
    let h = H0 * (e.scale || 1), w = h * pw / ROW; if (w > MAXW) { h *= MAXW / w; w = MAXW; }
    // place: wall cabinet -> on the wall above it; free-standing -> on top of it / its given anchor
    const cab = e.cab; cab.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(cab), ctr = b.getCenter(new THREE.Vector3()), n = (e.normal || cab.userData.inward).clone().setY(0).normalize();
    const p = e.at ? e.at.clone() : ctr.clone();
    if (e.wall) { if (Math.abs(n.x) > Math.abs(n.z)) p.x = -Math.sign(n.x) * (HALF - WALL_D); else p.z = -Math.sign(n.z) * (HALF - WALL_D);
      p.y = Math.max(b.max.y + 0.35 + h / 2, opt.minY || 3.2); }
    else if (!e.at) p.y = b.max.y + 0.1 + h / 2;
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    g.rotateY(Math.atan2(n.x, n.z)); g.translate(p.x, p.y, p.z); quads.push(g);
    info.push({ title: e.title, key: e.key, color: hex, pos: p.toArray().map(v => +v.toFixed(3)), w: +w.toFixed(3), h: +h.toFixed(3), normal: n.toArray().map(v => +v.toFixed(3)), top: +(p.y + h / 2).toFixed(3), cabTop: +b.max.y.toFixed(3) });
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = opt.aniso || 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1).multiplyScalar(opt.k || 1.3) });
  mat.name = 'neonSigns';
  const mesh = new THREE.Mesh(mergeGeometries(quads), mat); mesh.name = 'neonSigns'; mesh.renderOrder = 3; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  mesh.userData.signs = info; return mesh;
}
