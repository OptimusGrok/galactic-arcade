// t773u NEON NAME SIGNS: a glowing sign of each machine's game name above that machine (on the wall above the wall cabinets, facing into the room;
// on top of the free-standing claw machine; above DEAD SIGNAL's curved screen).
// t775u: each sign is styled after its own game's title screen (fonts, colours, motifs), a bit dimmer and ~25% bigger.
// t782u: dimmer still, and the lettering is sharper and thinner (less glow bloom in the atlas + a lower mesh gain). The lettering is baked
// offline into ONE atlas (tex/neon_signs.webp, rects in neon_atlas.js; rebuild with node tools/build_neon_atlas.js) so every device shows the
// same fonts. Still ONE merged mesh of quads (one draw call, one program, no per-frame work), compiled by the warm-up; the atlas is uploaded
// to the GPU as soon as it loads (initTexture), on the start screen, not at the first room frame.
// t826u / v216: a neon character/icon image sits just above each name sign (one extra canvas atlas + one merged mesh, no per-frame work).
import { NEON_ATLAS } from './neon_atlas.js';

function neonStroke(g, draw, col, w, glow) {
  g.save();
  g.shadowColor = glow || col; g.shadowBlur = 18; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
  draw(g); g.shadowBlur = 0; g.globalAlpha = 0.95; draw(g); g.restore();
}

function drawIcon(g, key, S) {
  const C = {
    strike: '#ff3b3b', ghost: '#b46bff', cyber: '#ff3fd0', orc: '#4dff5a', pip: '#ff7ad9',
    berserker: '#ff6a1a', monkey: '#ffd23a', nova: '#3fb8ff', blaster: '#fff03a', bb: '#ffb02e',
    rockfall: '#ff8a2a', skytower: '#5fe0ff', roadster: '#ff4a2a', claw: '#ff2bd6'
  }[key] || '#3ff3ff';
  g.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2;
  const path = fn => neonStroke(g, ctx => { ctx.beginPath(); fn(ctx); ctx.stroke(); }, C, 6, C);
  const fillp = fn => neonStroke(g, ctx => { ctx.beginPath(); fn(ctx); ctx.fill(); ctx.stroke(); }, C, 3, C);
  if (key === 'strike') {
    fillp(c => { c.moveTo(cx, cy - 70); c.lineTo(cx + 54, cy + 18); c.lineTo(cx + 18, cy + 8); c.lineTo(cx + 28, cy + 64); c.lineTo(cx, cy + 22); c.lineTo(cx - 28, cy + 64); c.lineTo(cx - 18, cy + 8); c.lineTo(cx - 54, cy + 18); c.closePath(); });
  } else if (key === 'ghost') {
    fillp(c => { c.arc(cx, cy - 10, 58, Math.PI, 0, false); c.lineTo(cx + 58, cy + 62); c.lineTo(cx + 36, cy + 42); c.lineTo(cx + 16, cy + 62); c.lineTo(cx, cy + 42); c.lineTo(cx - 16, cy + 62); c.lineTo(cx - 36, cy + 42); c.lineTo(cx - 58, cy + 62); c.closePath(); });
    g.fillStyle = '#0a0618'; g.beginPath(); g.arc(cx - 20, cy - 8, 10, 0, 7); g.arc(cx + 20, cy - 8, 10, 0, 7); g.fill();
  } else if (key === 'cyber') {
    path(c => { c.rect(cx - 70, cy + 20, 36, 50); c.rect(cx - 28, cy - 10, 32, 80); c.rect(cx + 12, cy - 50, 28, 120); c.rect(cx + 48, cy + 8, 24, 62); });
    path(c => { c.moveTo(cx - 80, cy + 72); c.lineTo(cx + 80, cy + 72); c.moveTo(cx - 40, cy + 4); c.lineTo(cx + 8, cy + 4); });
  } else if (key === 'orc') {
    fillp(c => { c.ellipse(cx, cy + 4, 62, 58, 0, 0, 7); });
    path(c => { c.moveTo(cx - 22, cy + 28); c.lineTo(cx - 18, cy + 78); c.lineTo(cx - 6, cy + 30); c.moveTo(cx + 22, cy + 28); c.lineTo(cx + 18, cy + 78); c.lineTo(cx + 6, cy + 30); });
    g.fillStyle = '#0a0618'; g.beginPath(); g.arc(cx - 22, cy - 4, 8, 0, 7); g.arc(cx + 22, cy - 4, 8, 0, 7); g.fill();
  } else if (key === 'pip') {
    fillp(c => { c.arc(cx, cy - 8, 52, 0.15 * Math.PI, 0.85 * Math.PI, true); c.lineTo(cx - 36, cy + 70); c.lineTo(cx + 36, cy + 70); c.closePath(); });
    path(c => { c.arc(cx, cy - 4, 22, 0, 7); c.moveTo(cx - 10, cy + 40); c.lineTo(cx + 10, cy + 40); });
  } else if (key === 'berserker') {
    path(c => { c.moveTo(cx - 16, cy + 78); c.lineTo(cx - 16, cy - 8); c.lineTo(cx - 8, cy - 8); c.lineTo(cx - 8, cy + 78); c.closePath(); c.moveTo(cx - 70, cy - 8); c.lineTo(cx + 8, cy - 50); c.lineTo(cx + 22, cy - 20); c.lineTo(cx - 36, cy + 18); c.closePath(); });
  } else if (key === 'monkey') {
    fillp(c => { c.arc(cx, cy + 6, 58, 0, 7); c.moveTo(cx - 70, cy - 8); c.arc(cx - 58, cy - 10, 22, 0, 7); c.moveTo(cx + 70, cy - 8); c.arc(cx + 58, cy - 10, 22, 0, 7); });
    g.fillStyle = '#0a0618'; g.beginPath(); g.arc(cx - 20, cy, 8, 0, 7); g.arc(cx + 20, cy, 8, 0, 7); g.fill();
    path(c => { c.arc(cx, cy + 22, 16, 0.15 * Math.PI, 0.85 * Math.PI); });
  } else if (key === 'nova') {
    fillp(c => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 28 : 72; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); });
  } else if (key === 'blaster') {
    path(c => { c.moveTo(cx - 70, cy + 18); c.lineTo(cx + 20, cy - 8); c.lineTo(cx + 28, cy + 10); c.lineTo(cx - 54, cy + 40); c.closePath(); c.moveTo(cx + 16, cy - 18); c.lineTo(cx + 78, cy - 36); c.moveTo(cx + 28, cy + 0); c.lineTo(cx + 78, cy - 8); c.moveTo(cx - 40, cy + 36); c.lineTo(cx - 22, cy + 70); });
  } else if (key === 'bb') {
    path(c => { c.ellipse(cx, cy + 18, 36, 50, 0, 0, 7); c.moveTo(cx - 16, cy - 32); c.lineTo(cx - 8, cy - 70); c.lineTo(cx + 8, cy - 70); c.lineTo(cx + 16, cy - 32); c.moveTo(cx - 50, cy + 40); c.quadraticCurveTo(cx - 70, cy + 80, cx - 20, cy + 70); c.moveTo(cx + 50, cy + 40); c.quadraticCurveTo(cx + 70, cy + 80, cx + 20, cy + 70); });
  } else if (key === 'rockfall') {
    fillp(c => { c.moveTo(cx - 20, cy - 70); c.lineTo(cx + 16, cy - 54); c.lineTo(cx + 8, cy - 20); c.lineTo(cx - 24, cy - 30); c.closePath(); c.moveTo(cx - 64, cy + 10); c.lineTo(cx - 10, cy - 8); c.lineTo(cx + 20, cy + 24); c.lineTo(cx - 30, cy + 50); c.closePath(); c.moveTo(cx + 8, cy + 8); c.lineTo(cx + 70, cy - 4); c.lineTo(cx + 62, cy + 54); c.lineTo(cx + 4, cy + 62); c.closePath(); });
  } else if (key === 'skytower') {
    path(c => { c.moveTo(cx, cy - 78); c.lineTo(cx + 16, cy - 20); c.lineTo(cx + 8, cy - 20); c.lineTo(cx + 36, cy + 78); c.lineTo(cx - 36, cy + 78); c.lineTo(cx - 8, cy - 20); c.lineTo(cx - 16, cy - 20); c.closePath(); c.moveTo(cx - 22, cy + 20); c.lineTo(cx + 22, cy + 20); c.moveTo(cx - 28, cy + 50); c.lineTo(cx + 28, cy + 50); });
  } else if (key === 'roadster') {
    path(c => { c.moveTo(cx - 78, cy + 8); c.lineTo(cx - 40, cy + 8); c.lineTo(cx - 20, cy - 28); c.lineTo(cx + 36, cy - 28); c.lineTo(cx + 62, cy + 8); c.lineTo(cx + 78, cy + 8); c.lineTo(cx + 78, cy + 28); c.lineTo(cx - 78, cy + 28); c.closePath(); c.arc(cx - 36, cy + 32, 16, 0, 7); c.moveTo(cx + 52, cy + 32); c.arc(cx + 36, cy + 32, 16, 0, 7); });
  } else if (key === 'claw') {
    path(c => { c.moveTo(cx, cy - 78); c.lineTo(cx, cy - 20); c.moveTo(cx, cy - 20); c.lineTo(cx - 48, cy + 50); c.lineTo(cx - 20, cy + 70); c.moveTo(cx, cy - 20); c.lineTo(cx + 48, cy + 50); c.lineTo(cx + 20, cy + 70); c.moveTo(cx - 16, cy - 8); c.lineTo(cx + 16, cy - 8); });
  }
}

function makeIconAtlas() {
  const keys = ['strike', 'ghost', 'cyber', 'orc', 'pip', 'berserker', 'monkey', 'nova', 'blaster', 'bb', 'rockfall', 'skytower', 'roadster', 'claw'];
  const S = 256, COLS = 4, W = S * COLS, H = S * 4;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rects = {};
  keys.forEach((key, i) => {
    const x = (i % COLS) * S, y = Math.floor(i / COLS) * S;
    const t = document.createElement('canvas'); t.width = S; t.height = S;
    drawIcon(t.getContext('2d'), key, S);
    g.drawImage(t, x, y);
    rects[key] = { x: x + 12, y: y + 12, w: S - 24, h: S - 24 };
  });
  return { cv, rects, W, H };
}

export function buildNeonSigns(THREE, mergeGeometries, list, opt = {}) {
  const A = NEON_ATLAS, MAXW = opt.maxW || 3.7, HALF = opt.HALF, WALL_D = 0.06;
  const quads = [], info = [], iconQuads = [], iconInfo = [];
  const atlas = makeIconAtlas();
  const ICON = 0.52, ICON_GAP = 0.08, ICON_MAX_TOP = 6.05;
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
    const top = p.y + h / 2, bottom = p.y - h / 2;
    info.push({ title: e.title, key: e.key, color: '#' + new THREE.Color(e.color).getHexString(), pos: p.toArray().map(v => +v.toFixed(3)), w: +w.toFixed(3), h: +h.toFixed(3), normal: n.toArray().map(v => +v.toFixed(3)), bottom: +bottom.toFixed(3), top: +top.toFixed(3), cabTop: +b.max.y.toFixed(3) });
    const ir = atlas.rects[e.key];
    if (ir) {
      let ih = ICON, iw = ICON; const room = ICON_MAX_TOP - top - ICON_GAP;
      if (room < ih) ih = iw = Math.max(0.28, room);
      const ip = p.clone(); ip.y = top + ICON_GAP + ih / 2;
      const iu0 = ir.x / atlas.W, iu1 = (ir.x + ir.w) / atlas.W, iv1 = 1 - ir.y / atlas.H, iv0 = 1 - (ir.y + ir.h) / atlas.H;
      const ig = new THREE.PlaneGeometry(iw, ih), iuv = ig.attributes.uv;
      for (let i = 0; i < iuv.count; i++) iuv.setXY(i, iuv.getX(i) ? iu1 : iu0, iuv.getY(i) ? iv1 : iv0);
      ig.rotateY(Math.atan2(n.x, n.z)); ig.translate(ip.x, ip.y, ip.z); iconQuads.push(ig);
      iconInfo.push({ key: e.key, pos: ip.toArray().map(v => +v.toFixed(3)), w: +iw.toFixed(3), h: +ih.toFixed(3), bottom: +(ip.y - ih / 2).toFixed(3), top: +(ip.y + ih / 2).toFixed(3), signTop: +top.toFixed(3) });
    }
  }
  const tex = new THREE.TextureLoader().load(opt.src || 'tex/neon_signs.webp', t => { try { if (opt.renderer) opt.renderer.initTexture(t); } catch (err) {} if (opt.onLoad) opt.onLoad(t); });
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = opt.aniso || 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1).multiplyScalar(opt.k || 0.55) });   // t782u: 0.55 (t775u: 0.85, v188: 1.3), dimmer + the atlas itself is sharper / thinner
  mat.name = 'neonSigns';
  const mesh = new THREE.Mesh(mergeGeometries(quads), mat); mesh.name = 'neonSigns'; mesh.renderOrder = 3; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  mesh.userData.signs = info; mesh.userData.k = mat.color.r;
  if (iconQuads.length) {
    const itex = new THREE.CanvasTexture(atlas.cv); itex.colorSpace = THREE.SRGBColorSpace; itex.anisotropy = opt.aniso || 4;
    try { if (opt.renderer) opt.renderer.initTexture(itex); } catch (err) {}
    const imat = new THREE.MeshBasicMaterial({ map: itex, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1).multiplyScalar(opt.k || 0.55) });
    imat.name = 'neonIcons';
    const icons = new THREE.Mesh(mergeGeometries(iconQuads), imat); icons.name = 'neonIcons'; icons.renderOrder = 3; icons.matrixAutoUpdate = false; icons.updateMatrix();
    icons.userData.icons = iconInfo; mesh.add(icons); mesh.userData.icons = iconInfo;
    if (typeof window !== 'undefined') window.__neonIcons = icons;
  }
  return mesh;
}
