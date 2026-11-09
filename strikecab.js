// STRIKE cabinet: detailed model + live attract-mode screen driven from a sandboxed, network-free copy of Strike.
import * as THREE from 'three';

const MOBILE = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// ---------- painting helpers ----------
function burst(g, x, y, r, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,250,210,${a})`); gr.addColorStop(0.18, `rgba(255,190,60,${a})`); gr.addColorStop(0.45, `rgba(255,90,20,${a * 0.8})`); gr.addColorStop(1, 'rgba(120,20,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = `rgba(255,170,60,${0.6 * a})`; g.lineWidth = Math.max(1, r / 40);
  for (let i = 0; i < 26; i++) { const an = Math.random() * 7, r0 = r * 0.25, r1 = r * (0.7 + Math.random() * 0.9); g.beginPath(); g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); g.stroke(); }
  for (let i = 0; i < 30; i++) { const an = Math.random() * 7, d = r * Math.random() * 1.2; g.fillStyle = `rgba(255,${120 + Math.random() * 120 | 0},40,${a})`; g.fillRect(x + Math.cos(an) * d, y + Math.sin(an) * d, 2 + Math.random() * 3, 2 + Math.random() * 3); }
}
function streaks(g, w, h, n, ang) {
  for (let i = 0; i < n; i++) {
    const red = Math.random() < 0.55, x = Math.random() * w * 1.4 - w * 0.2, y = Math.random() * h, L = h * (0.2 + Math.random() * 0.5), lw = 1 + Math.random() * (red ? 5 : 4);
    const dx = Math.cos(ang) * L, dy = Math.sin(ang) * L, gr = g.createLinearGradient(x, y, x + dx, y + dy);
    const col = red ? '255,40,40' : '60,120,255'; gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.5, `rgba(${col},.9)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.strokeStyle = gr; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
  }
}
function stars(g, w, h, n) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } }
function rock(g, x, y, r) { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); gr.addColorStop(0, '#7a6a60'); gr.addColorStop(1, '#201814'); g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, rr = r * (0.75 + Math.random() * 0.3); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
// silver fighter jet pointing up (nose at -y), centred at 0,0, length ~ 2*s
function jet(g, x, y, s, rot = 0, flame = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s / 100, s / 100);
  if (flame) { const fg = g.createLinearGradient(0, 70, 0, 70 + 160 * flame); fg.addColorStop(0, 'rgba(255,255,220,1)'); fg.addColorStop(0.2, 'rgba(255,190,60,.95)'); fg.addColorStop(0.6, 'rgba(255,80,20,.6)'); fg.addColorStop(1, 'rgba(255,40,0,0)'); g.fillStyle = fg; g.beginPath(); g.moveTo(-16, 70); g.quadraticCurveTo(0, 70 + 200 * flame, 16, 70); g.fill(); }
  const metal = g.createLinearGradient(-60, 0, 60, 0); metal.addColorStop(0, '#5a6270'); metal.addColorStop(0.35, '#e8eef6'); metal.addColorStop(0.5, '#ffffff'); metal.addColorStop(0.65, '#aab4c4'); metal.addColorStop(1, '#3a4250');
  g.strokeStyle = '#141820'; g.lineWidth = 3;
  // wings
  g.fillStyle = metal; g.beginPath(); g.moveTo(-14, -10); g.lineTo(-92, 40); g.lineTo(-88, 56); g.lineTo(-16, 40); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(14, -10); g.lineTo(92, 40); g.lineTo(88, 56); g.lineTo(16, 40); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#d42020'; g.beginPath(); g.moveTo(-40, 22); g.lineTo(-88, 52); g.lineTo(-86, 44); g.lineTo(-44, 16); g.fill(); g.beginPath(); g.moveTo(40, 22); g.lineTo(88, 52); g.lineTo(86, 44); g.lineTo(44, 16); g.fill();
  // tail fins
  g.fillStyle = metal; g.beginPath(); g.moveTo(-12, 46); g.lineTo(-40, 76); g.lineTo(-12, 68); g.fill(); g.stroke(); g.beginPath(); g.moveTo(12, 46); g.lineTo(40, 76); g.lineTo(12, 68); g.fill(); g.stroke();
  // fuselage
  g.fillStyle = metal; g.beginPath(); g.moveTo(0, -100); g.bezierCurveTo(18, -70, 18, -20, 17, 72); g.lineTo(-17, 72); g.bezierCurveTo(-18, -20, -18, -70, 0, -100); g.fill(); g.stroke();
  g.fillStyle = '#d42020'; g.fillRect(-17, 30, 34, 6);
  const cp = g.createLinearGradient(-8, -60, 8, -30); cp.addColorStop(0, '#9fd8ff'); cp.addColorStop(1, '#10203a'); g.fillStyle = cp; g.beginPath(); g.ellipse(0, -45, 7, 22, 0, 0, 7); g.fill(); g.stroke();
  g.restore();
}
function logo(g, x, y, size, rot = -0.08) {
  g.save(); g.translate(x, y); g.rotate(rot); g.transform(1, 0, -0.22, 1, 0, 0);
  g.font = `900 ${size}px Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.strokeStyle = '#0a0a12'; g.lineWidth = size * 0.16; g.strokeText('STRIKE', 0, 0);
  g.strokeStyle = '#ffffff'; g.lineWidth = size * 0.06; g.strokeText('STRIKE', 0, 0);
  const gr = g.createLinearGradient(0, -size / 2, 0, size / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.38, '#c8ccd8'); gr.addColorStop(0.5, '#ff3a3a'); gr.addColorStop(1, '#8a0010');
  g.fillStyle = gr; g.fillText('STRIKE', 0, 0); g.restore();
}
function spaceBg(g, w, h) {
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#050816'); bg.addColorStop(0.5, '#0d1440'); bg.addColorStop(1, '#05040c');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
}

// ---------- textures ----------
export function sideTexture(flip) {
  return tex(512, 1024, (g, w, h) => {
    g.save(); if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    spaceBg(g, w, h); stars(g, w, h, 300); streaks(g, w, h, 70, -1.2);
    burst(g, w * 0.25, h * 0.56, 120); burst(g, w * 0.8, h * 0.45, 90); burst(g, w * 0.7, h * 0.86, 130); burst(g, w * 0.15, h * 0.2, 60, 0.8);
    rock(g, w * 0.3, h * 0.25, 26); rock(g, w * 0.82, h * 0.18, 18); rock(g, w * 0.18, h * 0.4, 14);
    jet(g, w * 0.58, h * 0.4, 190, 0.38, 1.1);
    g.restore();
    logo(g, w * 0.48, h * 0.78, 128, -0.32);
    // border shading
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  });
}
export function marqueeTexture() {
  return tex(1024, 256, (g, w, h) => {
    spaceBg(g, w, h); stars(g, w, h, 120); streaks(g, w, h, 40, -0.1);
    burst(g, w * 0.5, h * 0.5, 260, 0.9); burst(g, w * 0.12, h * 0.55, 110); burst(g, w * 0.9, h * 0.4, 120);
    jet(g, w * 0.86, h * 0.55, 60, 0.9, 0.8);
    logo(g, w * 0.48, h * 0.52, 150, -0.03);
  });
}
export const PANEL_LAYOUT = { joy: [0.0, 0.26], buttons: [[-0.04, 'FIRE', 0xff2a2a], [-0.16, 'BOMB', 0x22d040], [-0.28, 'HYPER', 0x2a6aff]], starts: [[-0.1, '1P'], [-0.22, '2P']] };
export function panelTexture(wz) {
  return tex(1024, 320, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0c1236'); bg.addColorStop(1, '#04050e'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    stars(g, w, h, 120); streaks(g, w, h, 25, -0.05);
    jet(g, w * 0.42, h * 0.55, 95, -1.45, 0.7);
    g.strokeStyle = '#c0c6d8'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
    g.font = '700 30px "Arial Black", Arial, sans-serif'; g.textAlign = 'center';
    const U = z => (0.5 - z / wz) * w; // z (cabinet local) -> u
    for (const [z, l, c] of PANEL_LAYOUT.buttons) { g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fillText(l, U(z), h * 0.6); }
    g.fillStyle = '#e8e8f0'; g.font = '700 26px Arial, sans-serif';
    for (const [z, l] of PANEL_LAYOUT.starts) g.fillText(l, U(z), h * 0.94);
  });
}

// ---------- geometry ----------
// Side profile, x = depth toward the player (front faces local +X), y = height. Taller screen slope for a portrait monitor.
export const SPROFILE = [[0, 0], [0.86, 0], [0.86, 0.9], [1.04, 1.03], [1.02, 1.1], [0.74, 1.13], [0.56, 1.76], [0.84, 1.79], [0.84, 2.06], [0.02, 2.08]];
export const SW = 0.82;
export const segFrame = (a, b) => { const d = new THREE.Vector2(b[0] - a[0], b[1] - a[1]), L = d.length(); d.normalize(); const n = new THREE.Vector2(d.y, -d.x); return { L, n, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang: Math.atan2(n.y, n.x) }; };
export function segPlane(a, b, w, inset = 0.004, hFrac = 1) {
  const f = segFrame(a, b); const g = new THREE.PlaneGeometry(w, f.L * hFrac).rotateY(Math.PI / 2).rotateZ(f.ang);
  g.translate(f.mid[0] + f.n.x * inset, f.mid[1] + f.n.y * inset, 0); return g;
}
export function bar(a, b, t) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const g = new THREE.BoxGeometry(t, t * 1.6, L + t);
  const m = new THREE.Matrix4().lookAt(a, b, Math.abs(d.y) > 0.99 * L ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)); m.setPosition(a.clone().add(b).multiplyScalar(0.5)); return g.applyMatrix4(m);
}
export function sideGeo(sign) { // profile panel on the +z (sign=1) or -z (sign=-1) side with 0..1 UVs, text readable from outside
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(shape); const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); uv.setXY(i, sign > 0 ? x / 1.04 : 1 - x / 1.04, y / 2.08); }
  if (sign < 0) { const idx = g.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; } g.computeVertexNormals(); }
  g.translate(0, 0, sign * (SW / 2 + 0.004)); return g;
}

export const CRT = {
  uniforms: { map: { value: null }, time: { value: 0 }, bright: { value: 1.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D map; uniform float time; uniform float bright; varying vec2 vUv;
  void main(){
    vec2 c = vUv - 0.5; float r2 = dot(c,c); vec2 uv = 0.5 + c * (1.0 + 0.09 * r2);            // gentle barrel
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }
    vec3 col = texture2D(map, uv).rgb;
    col = pow(col, vec3(2.4));                                                                     // canvas is sRGB
    float scan = 0.82 + 0.18 * sin(uv.y * 960.0 * 3.14159);                                        // scanlines
    float vig = smoothstep(0.75, 0.25, length(c * vec2(1.1, 0.9)));
    vec3 o = col * scan * vig * bright;
    float glass = smoothstep(0.42, 0.0, abs(vUv.y - 0.86 + vUv.x * 0.35)) * 0.035;                 // glass sheen
    o += vec3(0.6, 0.7, 1.0) * glass + vec3(0.0, 0.01, 0.02);
    gl_FragColor = vec4(o, 1.0);
    #include <colorspace_fragment>
  }`,
};

export function buildStrikeCabinet() {
  const g = new THREE.Group(); g.name = 'strikeCabinet';
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
  const shape = new THREE.Shape(SPROFILE.map(([x, y]) => new THREE.Vector2(x, y)));
  const black = new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
  add(new THREE.ExtrudeGeometry(shape, { depth: SW, bevelEnabled: false }).translate(0, 0, -SW / 2), black, 'body');
  // side art (mirrored composition, readable lettering on both sides)
  const sideMat = (flip) => { const t = sideTexture(flip); return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.32 }); };
  add(sideGeo(1), sideMat(false), 'sidePanelL');
  add(sideGeo(-1), sideMat(true), 'sidePanelR');
  // red T-molding along both side profiles + front edge of the top
  const red = new THREE.MeshStandardMaterial({ color: 0xc8101c, roughness: 0.32, metalness: 0.15 });
  const tm = [];
  for (const z of [-SW / 2 - 0.006, SW / 2 + 0.006]) for (let i = 0; i < SPROFILE.length; i++) { const a = SPROFILE[i], b = SPROFILE[(i + 1) % SPROFILE.length]; if (i === SPROFILE.length - 1 || i === 0) continue; tm.push(bar(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(b[0], b[1], z), 0.022)); }
  const tGeo = mergeGeos(tm); add(tGeo, red, 'tMolding');
  // marquee (backlit)
  const mq = marqueeTexture();
  add(segPlane(SPROFILE[7], SPROFILE[8], SW - 0.06, 0.004, 0.86), new THREE.MeshStandardMaterial({ map: mq, emissive: 0xffffff, emissiveMap: mq, emissiveIntensity: 0.55, roughness: 0.2 }), 'marquee');
  // bezel + screen on the slope
  const sf = segFrame(SPROFILE[5], SPROFILE[6]);
  add(segPlane(SPROFILE[5], SPROFILE[6], SW - 0.04, 0.003), new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: 0.35, metalness: 0.3 }), 'bezel');
  const sh = sf.L * 0.95, sw = Math.min(SW - 0.16, sh * 9 / 16 * 1.0);
  const screenGeo = new THREE.PlaneGeometry(sw, sh).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.008, sf.mid[1] + sf.n.y * 0.008, 0);
  // the bezel trim (thin dark-grey frame around the tube)
  const bt = []; const P = (u, v) => new THREE.Vector3(sf.mid[0] + sf.n.x * 0.01 - sf.n.y * 0 + (-sf.n.y) * 0, 0, 0);
  const crt = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(CRT.uniforms), vertexShader: CRT.vertexShader, fragmentShader: CRT.fragmentShader, toneMapped: false });
  const screen = add(screenGeo, crt, 'screen');
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(sw + 0.05, sh + 0.05).rotateY(Math.PI / 2).rotateZ(sf.ang).translate(sf.mid[0] + sf.n.x * 0.006, sf.mid[1] + sf.n.y * 0.006, 0), new THREE.MeshStandardMaterial({ color: 0x22242c, roughness: 0.4, metalness: 0.6 }));
  frame.name = 'bezelFrame'; g.add(frame);
  // control panel with art + 3D controls
  const pf = segFrame(SPROFILE[4], SPROFILE[5]);
  add(segPlane(SPROFILE[4], SPROFILE[5], SW - 0.02, 0.003), (() => { const t = panelTexture(SW - 0.02); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.1, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 }); })(), 'controlPanel');
  const cp = new THREE.Group(); cp.name = 'controls'; cp.position.set(pf.mid[0] + pf.n.x * 0.004, pf.mid[1] + pf.n.y * 0.004, 0); cp.rotation.z = pf.ang - Math.PI / 2; g.add(cp);
  // in cp: +y = panel normal, +x = toward the player... (rotated) -> use along = -x (toward screen)
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd0d4dc, metalness: 1, roughness: 0.25 });
  const stick = new THREE.Group(); stick.name = 'joystick'; stick.position.set(-0.01, 0, PANEL_LAYOUT.joy[1]); cp.add(stick);
  stick.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 20).translate(0, 0.006, 0), new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.5 })));
  stick.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 10).translate(0, 0.05, 0), chrome));
  stick.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14).translate(0, 0.1, 0), new THREE.MeshPhysicalMaterial({ color: 0xe0101a, roughness: 0.15, clearcoat: 1 })));
  const btns = [];
  for (const [z, l, c] of PANEL_LAYOUT.buttons) {
    const b = new THREE.Group(); b.position.set(0.02, 0, z); cp.add(b);
    b.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 20).translate(0, 0.005, 0), new THREE.MeshStandardMaterial({ color: 0x18181e })));
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.018, 20).translate(0, 0.016, 0), new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.2, clearcoat: 1 }));
    top.name = 'btn' + l; b.add(top); btns.push(top);
  }
  for (const [z, l] of PANEL_LAYOUT.starts) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.018, 0.012, 16).translate(0, 0.008, 0), new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.3 }));
    b.position.set(0.085, 0, z); b.name = 'btn' + l; cp.add(b);
  }
  // coin door: two red-lit coin slots
  const door = new THREE.Group(); door.name = 'coinDoor'; door.position.set(0.865, 0.5, 0); g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x15161c, metalness: 0.7, roughness: 0.35 })));
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1a10, emissiveIntensity: 1.6 });
  for (const z of [-0.055, 0.055]) {
    door.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.05).translate(0.004, 0.06, z), new THREE.MeshStandardMaterial({ color: 0x0a0a0c })));
    door.add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.012).translate(0.006, 0.06, z), slotMat));
    door.add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.045, 0.05).translate(0.004, -0.07, z), new THREE.MeshStandardMaterial({ color: 0x050506 })));
  }
  door.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.01, 12).rotateZ(Math.PI / 2).translate(0.01, -0.01, 0.12), chrome));
  // soft screen glow (a real light, not neon)
  const glow = new THREE.PointLight(0x9ab8ff, 1.4, 3.2, 1.6); glow.name = 'screenGlow';
  glow.position.set(sf.mid[0] + sf.n.x * 0.45, sf.mid[1] - 0.15, 0); g.add(glow);
  g.userData = { screen, crt, glow, profile: SPROFILE, width: SW, depth: 1.04 };
  return g;
}
export function mergeGeos(list) { // tiny merge for non-indexed + indexed boxes
  const pos = [], nor = [], idx = []; let off = 0;
  for (const g of list) { const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } for (const i of g.index.array) idx.push(i + off); off += p.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); m.setIndex(idx); return m;
}

// ---------- live attract-mode demo ----------
// Loads strike-demo/index.html (same-origin copy with network, storage and audio removed) into an off-screen iframe.
// The iframe's own requestAnimationFrame is a no-op, so the game only advances when we step it here (~30 fps, paused when not visible).
export function startStrikeDemo(cab) {
  const S = MOBILE ? 1 : 2;
  const f = document.createElement('iframe');
  f.src = 'strike-demo/index.html'; f.title = 'strike demo'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
  f.style.cssText = `position:fixed;left:-${300 * S + 50}px;top:0;width:${270 * S}px;height:${480 * S}px;border:0;pointer-events:none;visibility:hidden`;
  const demo = { ready: false, frames: 0, texture: null, running: false, iframe: f, err: null };
  demo.attach = () => { if (!f.isConnected) document.body.appendChild(f); };   // t295u: main.js attaches it after the start screen (the iframe's boot froze the phone's first frames)
  const blank = document.createElement('canvas'); blank.width = 4; blank.height = 4;
  cab.userData.crt.uniforms.map.value = new THREE.CanvasTexture(blank);
  f.addEventListener('load', () => {
    try {
      const w = f.contentWindow; Object.defineProperty(w, 'devicePixelRatio', { get: () => 1 });
      const SK = w.STRIKE; if (!SK) throw new Error('STRIKE missing');
      w.dispatchEvent(new w.Event('resize'));
      const cv = w.document.getElementById('c');
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
      cab.userData.crt.uniforms.map.value = t; demo.texture = t; demo.w = w; demo.SK = SK; demo.stage = 0;
      SK.Opts.autofire = true; SK.Opts.mute = true; SK.Opts.shake = false;
      newRun(demo, 0); demo.ready = true;
    } catch (e) { demo.err = String(e); console.warn('strike demo', e); }
  });
  return demo;
}
function newRun(d, stage) { d.SK.start(stage, { god: true, weapon: 'R', lv: 3 }); d.stage = stage; d.idle = 0; }
function expertOn() { try { return !!(window.__watchExpert || (window.__grokVisit && (window.__grokVisit.watchOpen || (window.__grokVisit.cab && window.__grokVisit.cab.userData && window.__grokVisit.cab.userData.visit && window.__grokVisit.cab.userData.visit.on)))); } catch (e) { return false; } }
function autopilot(d, expert) {
  const SK = d.SK, pl = SK.pl, I = SK.Input, H = 480;
  const track = expert ? 0.14 : 0.08, dodge = expert ? 110 : 60, limX = expert ? 3.8 : 2.6, limY = expert ? 2.8 : 2;
  let tx = 135 + Math.sin(d.frames * 0.013) * 80, ty = H - 110 + Math.sin(d.frames * 0.021) * 40;
  let best = null, bd = 1e9; for (const e of SK.pools.enemies.items) if (e.alive && e.y > 10 && e.y < pl.y - 30) { const dd = Math.abs(e.x - pl.x) + (pl.y - e.y) * 0.3; if (dd < bd) { bd = dd; best = e; } }
  if (best) tx = best.x + Math.sin(d.frames * (expert ? 0.03 : 0.05)) * (expert ? 4 : 10);
  let ax = 0, ay = 0; for (const b of SK.pools.ebul.items) if (b.alive) { const dx = pl.x - b.x, dy = pl.y - b.y, r2 = dx * dx + dy * dy; if (r2 < (expert ? 2600 : 1600) && dy > -10) { ax += dx / (r2 + 50) * dodge; ay += dy / (r2 + 50) * (expert ? 48 : 30); } }
  const mx = Math.max(-limX, Math.min(limX, (tx - pl.x) * track + ax)), my = Math.max(-limY, Math.min(limY, (ty - pl.y) * (expert ? 0.08 : 0.05) + ay));
  I.botMove = { x: mx, y: my };
}
export function tickStrikeDemo(d, dt, visible) {
  if (!d.ready || !visible) { d.running = false; return; }
  d.running = true; d.acc = (d.acc || 0) + dt;
  const expert = expertOn();
  const interval = expert ? 1 / 40 : 1 / 30; if (d.acc < interval) return; d.acc = Math.min(d.acc - interval, interval);
  try {
    const st = d.SK.state();
    if (st.scene !== 'play') { if (++d.idle > 20) newRun(d, st.scene === 'ending' ? 0 : (d.stage + 1) % 5); }
    else { d.stage = st.stage; d.SK.G.lives = Math.max(d.SK.G.lives, expert ? 5 : 3); if (expert && d.SK.G.score != null) d.SK.G.score += 0; }
    const steps = expert ? 3 : 2;
    for (let i = 0; i < steps; i++) { autopilot(d, expert); d.SK.step(); }
    d.SK.render();
    d.texture.needsUpdate = true; d.frames++;
  } catch (e) { d.err = String(e); d.ready = false; console.warn('strike demo', e); }
}
