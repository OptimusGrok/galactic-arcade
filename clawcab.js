// CLAW MACHINE cabinet (#12): free-standing in room 1 on the 2x2 grid block Dave highlighted (t215/t216), base exactly 1.40 x 1.00 m
// (2 x 2 ticket-machine cells), front (glass, coin plate, prize chute) facing +z. Glossy black body with no neon on it; only the
// edges glow (thin neon tubes on the corner posts and the top/bottom rims). Glass box with a gantry, a 3-prong claw and a pile of plush
// inside; a '1 TICKET' price plate on the front (Dave: it costs 1 ticket). tick(t): the claw wanders slowly and bobs (attract).
import * as THREE from 'three';
export const CLAW = { W: 1.40, D: 1.00, BASE_H: 0.82, GLASS_H: 0.92, TOP_H: 0.30 };
const canvasTex = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
export function buildClawCabinet() {
  const { W, D, BASE_H, GLASS_H, TOP_H } = CLAW, g = new THREE.Group(); g.name = 'clawCabinet';
  const add = (geo, mat, name, p) => { const m = new THREE.Mesh(geo, mat); m.name = name; if (p) m.position.set(...p); g.add(m); return m; };
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0a0610, roughness: 0.2, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const y0 = BASE_H, y1 = BASE_H + GLASS_H, H = y1 + TOP_H;
  add(new THREE.BoxGeometry(W, BASE_H, D).translate(0, BASE_H / 2, 0), gloss, 'body');
  add(new THREE.BoxGeometry(W, TOP_H, D).translate(0, y1 + TOP_H / 2, 0), gloss, 'top');
  const P = 0.045;   // corner posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(P, GLASS_H, P), gloss, 'post', [sx * (W / 2 - P / 2), y0 + GLASS_H / 2, sz * (D / 2 - P / 2)]);
  // glass (front plane = the 'screen' the PLAY zoom flies into)
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8f0ff, roughness: 0.04, metalness: 0, transmission: 0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const gw = W - 2 * P, gd = D - 2 * P;
  const front = add(new THREE.PlaneGeometry(gw, GLASS_H), glass, 'screen', [0, y0 + GLASS_H / 2, D / 2 - 0.01]);
  add(new THREE.PlaneGeometry(gw, GLASS_H), glass, 'glassBack', [0, y0 + GLASS_H / 2, -D / 2 + 0.01]);
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(gd, GLASS_H).rotateY(Math.PI / 2), glass, 'glassSide', [sx * (W / 2 - 0.01), y0 + GLASS_H / 2, 0]);
  // inside: purple floor, prize chute (front-left), plush pile
  add(new THREE.BoxGeometry(gw, 0.02, gd).translate(0, y0 + 0.01, 0), new THREE.MeshStandardMaterial({ color: 0x3a2380, roughness: 0.6 }), 'clawFloor');
  add(new THREE.BoxGeometry(0.3, 0.16, 0.3).translate(-W / 2 + 0.24, y0 + 0.08, D / 2 - 0.22), new THREE.MeshStandardMaterial({ color: 0xff3fa4, roughness: 0.4, transparent: true, opacity: 0.85 }), 'chute');
  const plush = new THREE.Group(); plush.name = 'plush'; g.add(plush); const cols = [0xb8743a, 0xf4f0ea, 0xffd23a, 0x3dff9a, 0xf0a050, 0xb36bff, 0x3dd6ff, 0xff8ab0, 0x97999b];
  let k = 0; for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 4; iz++) { const x = -0.3 + ix * 0.2 + (iz % 2) * 0.06, z = -0.33 + iz * 0.2; if (x < -0.35 && z > 0.12) continue;
    const c = cols[k++ % cols.length], m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }), r = 0.075 + ((ix * 7 + iz * 3) % 3) * 0.01, b = new THREE.Group(); b.position.set(x, y0 + 0.02 + r, z); b.rotation.y = (ix * 1.7 + iz) % 6;
    b.add(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m)); const hd = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 14, 10), m); hd.position.set(0, r * 1.05, r * 0.15); b.add(hd);
    for (const e of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(r * 0.26, 8, 6), m); ear.position.set(e * r * 0.5, r * 1.6, r * 0.1); b.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1a0f08 })); eye.position.set(e * r * 0.25, r * 1.12, r * 0.7); b.add(eye); }
    plush.add(b); }
  // gantry + claw
  const steel = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.25 });
  for (const sz of [-1, 1]) add(new THREE.BoxGeometry(gw, 0.025, 0.025), steel, 'rail', [0, y1 - 0.04, sz * (gd / 2 - 0.03)]);
  const bridge = new THREE.Group(); bridge.name = 'gantry'; bridge.position.set(0, y1 - 0.04, 0); g.add(bridge);
  bridge.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, gd - 0.04), steel));
  const claw = new THREE.Group(); claw.name = 'claw'; bridge.add(claw);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: 0x222228 })); claw.add(cable);
  const head = new THREE.Group(); claw.add(head);
  head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.07, 16), new THREE.MeshPhysicalMaterial({ color: 0xff3b5c, roughness: 0.2, clearcoat: 1 })));
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3, arm = new THREE.Group(); arm.rotation.y = a; head.add(arm);
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), steel); p1.position.set(0.05, -0.07, 0); p1.rotation.z = 0.45; arm.add(p1);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 6), steel); p2.position.set(0.065, -0.155, 0); p2.rotation.z = -0.5; arm.add(p2); }
  // front: coin plate + '1 TICKET' price plate, PUSH prize door
  const price = canvasTex(512, 160, (c, w, h) => { c.fillStyle = '#12061f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd23a'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12);
    c.font = '900 84px Arial Black, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ffb020'; c.shadowBlur = 18; c.fillStyle = '#ffe14a'; c.fillText('1 TICKET', w / 2, h / 2 + 4); });
  add(new THREE.PlaneGeometry(0.62, 0.194), new THREE.MeshStandardMaterial({ map: price, emissive: 0xffffff, emissiveMap: price, emissiveIntensity: 0.8, roughness: 0.4 }), 'priceTag', [0.2, BASE_H - 0.2, D / 2 + 0.003]);
  add(new THREE.PlaneGeometry(0.34, 0.26), new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.5, metalness: 0.3 }), 'prizeDoor', [-W / 2 + 0.24, BASE_H - 0.3, D / 2 + 0.003]);
  const marq = canvasTex(1024, 220, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0f4f'); gr.addColorStop(1, '#14062a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.font = '900 120px system-ui, Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ff2bd6'; c.shadowBlur = 30; c.fillStyle = '#ff4fe0'; c.fillText('CLAW MACHINE', w / 2, h / 2 + 6); });
  add(new THREE.PlaneGeometry(W - 0.08, TOP_H - 0.06), new THREE.MeshStandardMaterial({ map: marq, emissive: 0xffffff, emissiveMap: marq, emissiveIntensity: 0.9, roughness: 0.3 }), 'marquee', [0, y1 + TOP_H / 2, D / 2 + 0.003]);
  // neon edge glow only (corner verticals, top + bottom rims): one merged tube set
  const neon = new THREE.MeshBasicMaterial({ color: 0xff3fd8, toneMapped: false }), tubes = new THREE.Group(); tubes.name = 'edgeGlow'; g.add(tubes);
  const R = 0.012, ex = W / 2 + R, ez = D / 2 + R, seg = (a, b) => { const v = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, v.length(), 6), neon);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); m.raycast = () => {}; tubes.add(m); };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) seg(new THREE.Vector3(sx * ex, 0.01, sz * ez), new THREE.Vector3(sx * ex, H, sz * ez));
  for (const y of [0.01, H]) { seg(new THREE.Vector3(-ex, y, ez), new THREE.Vector3(ex, y, ez)); seg(new THREE.Vector3(-ex, y, -ez), new THREE.Vector3(ex, y, -ez)); seg(new THREE.Vector3(-ex, y, -ez), new THREE.Vector3(-ex, y, ez)); seg(new THREE.Vector3(ex, y, -ez), new THREE.Vector3(ex, y, ez)); }
  const glow = new THREE.PointLight(0xffc8f0, 0.6, 2.2, 1.6); glow.position.set(0, y1 - 0.1, 0); g.add(glow);
  function tick(t) { const x = Math.sin(t * 0.37) * (gw / 2 - 0.12), z = Math.cos(t * 0.29) * (gd / 2 - 0.12); bridge.position.x = x; claw.position.z = z;
    const drop = 0.22 + 0.08 * Math.sin(t * 0.9); cable.scale.y = drop; head.position.y = -drop; }
  tick(0);
  g.userData = { screen: front, tick, aspect: gw / GLASS_H, footprint: [W, D], height: H };
  return g;
}
