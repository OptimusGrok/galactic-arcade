// DEAD SIGNAL VR STATION (machine #9, the middle of room 2). Matches First Person's art (deadsignal/art/dead_signal_vr.jpg) and the approved
// arcade mockups: round dark platform with a yellow/black hazard rim and a pink/blue LED ring, two curved black handrails, a central pedestal with the
// VR headset and two controllers, a large curved screen with the Dead Signal attract image, an overhead blue ring rig with a cable to the headset,
// the DEAD SIGNAL (white-blue / red) sign with a VR badge and a little purple fog at the base. Only the platform LED ring and the rig ring glow
// (the station's standard edge glow); the body itself is matte black metal.
// Local frame: origin = platform centre on the floor, +z = the front (the side you walk up to), the screen stands at -z.
import * as THREE from 'three';
export const DS = { R: 2.05, TOP: 0.32, SCR_Z: -2.5 };
const black = (r = 0.45, m = 0.6) => new THREE.MeshStandardMaterial({ color: 0x111116, roughness: r, metalness: m });
const glow = (hex, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: false });
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = rep; } return t; }
function signTex() {
  return canvasTex(1024, 300, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.font = '900 150px "Arial Black", Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    const y = 120, dw = g.measureText('DEAD ').width, sw = g.measureText('SIGNAL').width, x0 = (w - dw - sw) / 2;
    for (const [txt, x, c1, c2] of [['DEAD', x0, '#c8e6ff', '#2f8cff'], ['SIGNAL', x0 + dw, '#ff5a6a', '#ff1030']]) {
      g.shadowColor = c2; g.shadowBlur = 34; g.fillStyle = c2; g.fillText(txt, x, y); g.shadowBlur = 12; g.fillStyle = c1; g.fillText(txt, x, y); g.shadowBlur = 0;
      g.fillStyle = 'rgba(0,0,0,.28)'; for (let k = 0; k < 9; k++) g.fillRect(x, y - 60 + k * 15, txt === 'DEAD' ? dw - 30 : sw, 3); }   // scan-line glitch bands
    const bx = x0 + dw + sw - 190, by = 205, bw = 190, bh = 80;   // VR badge, under the end of SIGNAL
    g.shadowColor = '#ff2a8a'; g.shadowBlur = 18; g.strokeStyle = '#ff4fa8'; g.lineWidth = 7; g.fillStyle = 'rgba(10,8,30,.92)';
    g.beginPath(); g.roundRect(bx, by, bw, bh, 18); g.fill(); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = '#d8f0ff'; g.font = '900 62px "Arial Black", Arial'; g.textAlign = 'center'; g.fillText('VR', bx + bw / 2, by + bh / 2 + 3); });
}
const hazardTex = () => canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#121212'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8b81a';
  for (let x = -h; x < w + h; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 32, h); g.lineTo(x + 32 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); }, 26);
const deckTex = () => canvasTex(512, 512, (g, w) => { const c = w / 2; g.fillStyle = '#17161f'; g.fillRect(0, 0, w, w);
  for (let r = 40; r < c; r += 26) { g.strokeStyle = r % 52 ? 'rgba(120,120,150,.18)' : 'rgba(0,0,0,.6)'; g.lineWidth = r % 52 ? 2 : 5; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); }
  for (let a = 0; a < 16; a++) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(c + Math.cos(a * Math.PI / 8) * 70, c + Math.sin(a * Math.PI / 8) * 70); g.lineTo(c + Math.cos(a * Math.PI / 8) * c, c + Math.sin(a * Math.PI / 8) * c); g.stroke(); } });
const fogTex = () => canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(190,160,255,.55)'); gr.addColorStop(0.6, 'rgba(150,110,230,.18)'); gr.addColorStop(1, 'rgba(120,90,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
export function buildDeadSignalStation() {
  const g = new THREE.Group(); g.name = 'deadSignalStation';
  const add = (geo, mat, name, x = 0, y = 0, z = 0, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (name) m.name = name; parent.add(m); return m; };
  const metal = black(0.5, 0.55), matte = black(0.8, 0.2), gloss = black(0.22, 0.75);
  // ---- platform ----
  add(new THREE.CylinderGeometry(DS.R, DS.R + 0.05, DS.TOP, 72), metal, 'platform', 0, DS.TOP / 2, 0);
  add(new THREE.CylinderGeometry(DS.R + 0.03, DS.R + 0.065, 0.17, 72, 1, true), (() => { const t = hazardTex(); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.6, metalness: 0.2 }); })(), 'hazardRim', 0, 0.115, 0);
  { const d = add(new THREE.CircleGeometry(DS.R - 0.02, 72), new THREE.MeshStandardMaterial({ map: deckTex(), roughness: 0.55, metalness: 0.5 }), 'deck', 0, DS.TOP + 0.002, 0); d.rotation.x = -Math.PI / 2; }
  const ledP = add(new THREE.TorusGeometry(DS.R - 0.06, 0.022, 8, 96), glow(0xff2a9a, 1.9), 'ledRingPink', 0, DS.TOP + 0.01, 0); ledP.rotation.x = Math.PI / 2;
  const ledB = add(new THREE.TorusGeometry(1.05, 0.018, 8, 80), glow(0x2a8cff, 1.9), 'ledRingBlue', 0, DS.TOP + 0.008, 0); ledB.rotation.x = Math.PI / 2;
  // ---- two curved black handrails (open at the front and the back) ----
  const RR = 1.72, RY = 1.05;
  for (const sd of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 24; i++) { const a = (sd < 0 ? Math.PI : 0) + (i / 24 - 0.5) * 1.75; pts.push(new THREE.Vector3(Math.cos(a) * RR, RY, -Math.sin(a) * RR)); }
    const first = pts[0].clone(), lastP = pts[pts.length - 1].clone();
    pts.unshift(first.clone().multiplyScalar(0.93).setY(RY - 0.16)); pts.push(lastP.clone().multiplyScalar(0.93).setY(RY - 0.16));   // ends curl down
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.06, 10), gloss, 'rail' + (sd < 0 ? 'L' : 'R'));
    for (const t of [0.12, 0.5, 0.88]) { const a = (sd < 0 ? Math.PI : 0) + (t - 0.5) * 1.75; add(new THREE.CylinderGeometry(0.035, 0.045, RY - DS.TOP, 10), metal, null, Math.cos(a) * RR, (RY + DS.TOP) / 2, -Math.sin(a) * RR); }
  }
  // ---- pedestal ----
  add(new THREE.CylinderGeometry(0.55, 0.6, 0.07, 40), metal, 'pedBase', 0, DS.TOP + 0.035, 0);
  add(new THREE.CylinderGeometry(0.17, 0.21, 0.6, 24), matte, 'pedColumn', 0, DS.TOP + 0.37, 0);
  add(new THREE.BoxGeometry(0.06, 0.03, 0.01), glow(0x3aa8ff, 2), null, 0, DS.TOP + 0.42, 0.2);
  add(new THREE.CylinderGeometry(0.5, 0.42, 0.1, 40), metal, 'pedTop', 0, 1.0, 0);
  const pr = add(new THREE.TorusGeometry(0.49, 0.014, 6, 60), glow(0x3aa8ff, 1.8), 'pedRing', 0, 1.0, 0); pr.rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.09, 0.12, 0.06, 20), matte, 'headsetStand', 0, 1.08, 0);
  const PED_Y = 1.05;
  // ---- VR headset: black shell, glossy visor, two blue lens lights, strap ----
  const hs = new THREE.Group(); hs.name = 'headset'; g.add(hs);
  add(new THREE.BoxGeometry(0.25, 0.13, 0.11), matte, 'hsBody', 0, 0, 0, hs);
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.12, metalness: 0.8, emissive: 0x2a6cff, emissiveIntensity: 0 });
  add(new THREE.BoxGeometry(0.255, 0.12, 0.025), visorMat, 'hsVisor', 0, 0, 0.065, hs);
  const lens = glow(0x58b8ff, 1.6); for (const sx of [-1, 1]) add(new THREE.CircleGeometry(0.016, 14), lens, 'hsLens', sx * 0.07, 0.01, 0.079, hs);
  { const st = add(new THREE.TorusGeometry(0.145, 0.018, 6, 30), matte, 'hsStrap', 0, 0.005, -0.08, hs); st.scale.set(1, 1, 1); st.rotation.x = Math.PI / 2; }
  add(new THREE.BoxGeometry(0.06, 0.05, 0.14), matte, null, 0, 0.075, -0.06, hs);   // top strap
  const visorProxy = add(new THREE.PlaneGeometry(0.24, 0.135), new THREE.MeshBasicMaterial({ visible: false }), 'visorProxy', 0, 0, 0.08, hs);
  hs.userData.home = new THREE.Vector3(0, PED_Y + 0.07 + 0.065, 0.02);
  hs.position.copy(hs.userData.home);
  // ---- two controllers ----
  for (const sx of [-1, 1]) { const c = new THREE.Group(); c.name = 'controller'; c.position.set(sx * 0.3, PED_Y + 0.02, 0.06); g.add(c);
    add(new THREE.CylinderGeometry(0.026, 0.03, 0.15, 12), matte, null, 0, 0.075, 0, c);
    const ring = add(new THREE.TorusGeometry(0.055, 0.011, 6, 20), matte, null, 0, 0.17, 0, c); ring.rotation.x = 1.2;
    add(new THREE.CircleGeometry(0.008, 8), lens, null, 0, 0.13, 0.028, c); }
  // ---- large curved screen with the Dead Signal attract image ----
  const SR = 4.2, SH = 2.45, SY0 = 0.8, TH = 1.12, cz = DS.SCR_Z + SR;
  const scrTex = new THREE.TextureLoader().load('tex/ds_screen.jpg'); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8; scrTex.wrapS = THREE.RepeatWrapping; scrTex.repeat.x = -1; scrTex.offset.x = 1;
  const scr = add(new THREE.CylinderGeometry(SR, SR, SH, 48, 1, true, Math.PI - TH / 2, TH), new THREE.MeshStandardMaterial({ map: scrTex, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: 0.85, roughness: 0.3, side: THREE.BackSide }), 'screen', 0, SY0 + SH / 2, cz);
  add(new THREE.CylinderGeometry(SR + 0.06, SR + 0.06, SH + 0.24, 48, 1, true, Math.PI - TH / 2 - 0.02, TH + 0.04), new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide }), 'screenBack', 0, SY0 + SH / 2, cz);
  for (const sy of [SY0 - 0.06, SY0 + SH + 0.06]) { const pts = []; for (let i = 0; i <= 30; i++) { const a = Math.PI - TH / 2 - 0.02 + (TH + 0.04) * i / 30; pts.push(new THREE.Vector3(Math.sin(a) * (SR - 0.03), sy, cz + Math.cos(a) * (SR - 0.03))); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 8), metal, 'screenFrame'); }
  for (const sd of [-1, 1]) { const a = Math.PI + sd * (TH / 2 + 0.02); add(new THREE.BoxGeometry(0.2, SH + 0.5, 0.2), metal, 'screenPost', Math.sin(a) * (SR - 0.02), (SY0 + SH / 2 + 0.05), cz + Math.cos(a) * (SR - 0.02)).rotation.y = a; }
  add(new THREE.BoxGeometry(2.6, SY0 - 0.06, 0.5), matte, 'screenFoot', 0, (SY0 - 0.06) / 2, DS.SCR_Z - 0.2);
  // ---- DEAD SIGNAL sign with the VR badge ----
  const sign = add(new THREE.PlaneGeometry(4.6, 1.35), new THREE.MeshBasicMaterial({ map: signTex(), transparent: true, depthWrite: false, color: new THREE.Color(1.0, 1.0, 1.0), fog: false }), 'sign', 0, SY0 + SH + 1.05, DS.SCR_Z - 0.1);
  sign.renderOrder = 2;
  // ---- overhead circular ring rig with a cable down to the headset ----
  const RIG = new THREE.Vector3(0, 3.6, -0.05);
  { const r = add(new THREE.TorusGeometry(1.45, 0.07, 10, 72), metal, 'rigRing', RIG.x, RIG.y, RIG.z); r.rotation.x = Math.PI / 2;
    const rb = add(new THREE.TorusGeometry(1.38, 0.022, 6, 72), glow(0x2a8cff, 2.2), 'rigGlow', RIG.x, RIG.y - 0.05, RIG.z); rb.rotation.x = Math.PI / 2;
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + 0.5, p = new THREE.Vector3(Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45);
      add(new THREE.CylinderGeometry(0.018, 0.018, 8.5 - RIG.y, 6), metal, null, RIG.x + p.x, (8.5 + RIG.y) / 2, RIG.z + p.z);   // hangers to the ceiling
      const sp = add(new THREE.CylinderGeometry(0.02, 0.02, 1.45, 6), metal, null, RIG.x + p.x / 2, RIG.y, RIG.z + p.z / 2); sp.rotation.set(Math.PI / 2, 0, 0); sp.lookAt(RIG.x, RIG.y, RIG.z); sp.rotateX(Math.PI / 2); }
    add(new THREE.CylinderGeometry(0.12, 0.1, 0.25, 16), metal, 'rigHub', RIG.x, RIG.y, RIG.z);
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 10), metal, 'rigDrop', RIG.x, RIG.y - 0.42, RIG.z); }
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.5 });
  const cable = add(new THREE.BufferGeometry(), cableMat, 'cable');
  const tipW = new THREE.Vector3(), hsW = new THREE.Vector3(), tmp = new THREE.Vector3();
  function updateCable() { g.updateMatrixWorld(true); tipW.set(RIG.x, RIG.y - 0.72, RIG.z); hs.localToWorld(hsW.set(0, 0.02, -0.12)); g.worldToLocal(hsW);
    const mid = tipW.clone().lerp(hsW, 0.5); mid.y -= 0.35 + 0.15 * Math.min(1, tipW.distanceTo(hsW) / 3); mid.z -= 0.15;
    cable.geometry.dispose(); cable.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(tipW.clone(), mid, hsW.clone()), 24, 0.014, 6); }
  // ---- light purple fog at the base (a few soft sprites) ----
  { const ft = fogTex(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + 0.3, r = DS.R + 0.15 + (k % 3) * 0.2;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, transparent: true, depthWrite: false, opacity: 0.32, fog: false }));
      s.position.set(Math.cos(a) * r, 0.25 + (k % 2) * 0.12, Math.sin(a) * r); s.scale.set(2.4, 0.9, 1); s.name = 'fog'; g.add(s); } }
  // soft key light from above the front (a light, not neon) + a little blue spill from the screen
  const key = new THREE.SpotLight(0xe8e0ff, 30, 12, 0.6, 0.7, 1.4); key.name = 'dsSpot'; key.position.set(0, 6.6, 3.4); key.target.position.set(0, 0.9, -0.3); g.add(key, key.target);
  // ---- headset sequence (driven by play.js): put it on before the zoom, take it off and put it back on the way out ----
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, cl = (a, b, t) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const S = { p0: null, f0: 0, stand: null, exit: null, on: false };
  const angTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const lerpAng = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
  const headEye = new THREE.Vector3(), pedW = new THREE.Vector3(), q = new THREE.Quaternion();
  function eyeWorld(monkey) { monkey.updateMatrixWorld(true); return monkey.userData.head.localToWorld(headEye.set(0, 0.168, 0.205)); }
  function pose(mu, reach, lift, walk) {   // reach: arms out to the pedestal, lift: hands at the face, walk: leg swing phase
    mu.arms.forEach(a => { const sx = -1.25 * reach * (1 - lift) - 2.25 * lift, el = -0.35 * reach * (1 - lift) - 1.35 * lift;
      a.sh.rotation.set(sx, 0, (0.12 * reach * (1 - lift) + 0.42 * lift) * -a.sd); a.el.rotation.set(el, 0, 0); });
    mu.legs.forEach((l, i) => { const s = Math.sin(walk) * (i ? 1 : -1) * 0.5; l.leg.rotation.x = s; l.knee.rotation.x = Math.max(0, -s) * 0.8; });
    mu.hips.position.y = 0.8; mu.torso.rotation.set(0.05 + 0.1 * reach * (1 - lift), 0, 0); mu.neck.rotation.x = 0; mu.head.rotation.set(0, 0, 0); mu.phone.visible = false; }
  function placeHeadset(world, faceAng, tilt) { g.attach(hs); hs.position.copy(g.worldToLocal(world.clone())); g.getWorldQuaternion(q).invert(); hs.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, faceAng, 0, 'YXZ'))); }
  g.userData = { aspect: 16 / 9, screen: visorProxy, headset: hs, visorMat, cable, updateCable, RIG, PED_Y, inward: new THREE.Vector3(0, 0, 1), facing: new THREE.Vector3(0, 0, -1), seq: S,
    // phase 'on': k 0..1 over the walk-up + headset-on (before the zoom); 'off': k 0..1 after the zoom out; 'reset': back to the pedestal at once
    anim(phase, k, monkey, st) {
      const mu = monkey.userData, c = g.userData.centre, gw = c;
      if (phase === 'reset') { g.attach(hs); hs.position.copy(hs.userData.home); hs.quaternion.identity(); visorMat.emissiveIntensity = 0; S.on = false; updateCable(); return; }
      if (!S.stand) { S.stand = new THREE.Vector3(c.x - 0.6, DS.TOP, c.z + 0.34); S.exit = new THREE.Vector3(c.x - 0.3, 0, c.z + DS.R + 0.55); }
      hs.parent === g && g.localToWorld(pedW.copy(hs.userData.home)) || g.localToWorld(pedW.copy(hs.userData.home));
      const toPed = angTo(S.stand, gw), toCam = Math.atan2(0.55, 1);   // finally he looks out over the front (3/4 to the camera)
      if (phase === 'on') {
        if (k === 0 || !S.p0) { S.p0 = monkey.position.clone(); S.f0 = st.face; g.attach(hs); hs.position.copy(hs.userData.home); hs.quaternion.identity(); visorMat.emissiveIntensity = 0; }
        const kw = ease(cl(0, 0.34, k)), kr = ease(cl(0.3, 0.48, k)), kl = ease(cl(0.48, 0.8, k)), kg = cl(0.8, 1, k);
        monkey.position.lerpVectors(S.p0, S.stand, kw); monkey.position.y = DS.TOP * ease(cl(0.18, 0.34, k));
        const walkF = angTo(S.p0, S.stand); let f = k < 0.3 ? lerpAng(S.f0, walkF, cl(0, 0.08, k)) : lerpAng(walkF, toPed, cl(0.3, 0.42, k)); if (kl > 0) f = lerpAng(toPed, toCam, kl);
        st.face = f; monkey.rotation.y = f; pose(mu, kr * (1 - kg * 0.3), kl * (1 - kg * 0.35), k < 0.34 ? k * 60 : 0);
        if (kl > 0 && kl < 1) placeHeadset(pedW.clone().lerp(eyeWorld(monkey).clone(), kl).setY(pedW.y + (eyeWorld(monkey).y - pedW.y) * kl + Math.sin(kl * Math.PI) * 0.12), lerpAng(0, f, kl), 0);
        if (kl >= 1 && !S.on) { mu.head.attach(hs); hs.position.set(0, 0.168, 0.2 + 0.03); hs.rotation.set(0, 0, 0); S.on = true; }
        visorMat.emissiveIntensity = 2.2 * kg; g.userData.inward.set(Math.sin(f), 0, Math.cos(f));
        updateCable(); return;
      }
      if (phase === 'off') {
        const ko = ease(cl(0, 0.42, k)), kd = ease(cl(0.42, 0.56, k)), kw = ease(cl(0.56, 1, k));
        if (S.on && ko > 0) { S.on = false; }
        const eye = eyeWorld(monkey).clone();
        if (!S.on) placeHeadset(eye.clone().lerp(pedW, ko).setY(eye.y + (pedW.y - eye.y) * ko + Math.sin(ko * Math.PI) * 0.12), lerpAng(st.face, 0, ko), 0);
        if (ko >= 1) { g.attach(hs); hs.position.copy(hs.userData.home); hs.quaternion.identity(); }
        visorMat.emissiveIntensity = 2.2 * (1 - cl(0, 0.15, k));
        const f = kw > 0 ? lerpAng(toPed, angTo(S.stand, S.exit), Math.min(1, kw * 3)) : lerpAng(toCam, toPed, cl(0, 0.2, k));
        if (kw > 0) { monkey.position.lerpVectors(S.stand, S.exit, kw); monkey.position.y = DS.TOP * (1 - ease(cl(0.5, 0.8, kw))); }
        st.face = f; monkey.rotation.y = f; pose(mu, (1 - kd) * (ko < 1 ? 1 : 0.6) * (1 - kw), (1 - ko) * 0.9, kw > 0 ? kw * 50 : 0);
        updateCable(); return;
      }
    } };
  updateCable();
  return g;
}
