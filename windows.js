// t198 WINDOWS walls (Dave): big windows set into room 1's walls with animated scenes outside - a lush jungle (random animals
// wander past, others just chill) and a sandy tropical beach (waves, swaying palms). Weather drifts on a ~4 min cycle:
// sunny -> clouds roll in -> rain -> clearing -> sunset glow -> sunny. Cheap for phones: each scene is one 2D canvas
// (billboard emoji / flat shapes in parallax layers) redrawn ~10x a second only while room 1 is in view; every window
// shows its own slice of the panorama and slides with the camera for a look-through parallax.
export function setupWindows({ THREE, room, camera, HALF, H, DOOR_W, WX }) {
  const W = 1024, Hc = 320, CYCLE = 240;
  const mkScene = () => { const c = document.createElement('canvas'); c.width = W; c.height = Hc; return { c, x: c.getContext('2d') }; };
  const S = { jungle: mkScene(), beach: mkScene() };
  const grp = new THREE.Group(); grp.name = 'roomWindows'; grp.visible = false; room.add(grp);
  const frameM = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 }), sillM = new THREE.MeshStandardMaterial({ color: 0x3e2716, roughness: 0.8 });
  const wins = [];
  // placements: [scene, wall position fn, slice]: west + south walls, and the north wall either side of the doorway (east is the space window)
  const Y0 = 3.3, WH = 4.2, WW = 5.2;
  const spots = [];
  for (const [i, z] of [[0, -7], [1, 0], [2, 7]]) spots.push({ sc: 'jungle', pos: [-HALF + 0.03, Y0 + WH / 2, z], ry: Math.PI / 2, slice: i / 3 });
  for (const [i, x] of [[0, -7], [1, 0], [2, 7]]) spots.push({ sc: 'beach', pos: [x, Y0 + WH / 2, HALF - 0.03], ry: Math.PI, slice: (2 - i) / 3 });
  for (const [i, x] of [[0, -7.2], [1, 7.2]]) spots.push({ sc: i ? 'beach' : 'jungle', pos: [x, Y0 + WH / 2, -HALF + 0.03], ry: 0, slice: 0.2 + i * 0.5, w: 4.2 });
  spots.forEach((s, n) => { const g = new THREE.Group(); g.name = 'window_' + s.sc + '_' + n; g.position.set(...s.pos); g.rotation.y = s.ry; grp.add(g);
    const w = s.w || WW, tex = new THREE.CanvasTexture(S[s.sc].c); tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(0.3 * w / WW, 1); tex.wrapS = THREE.ClampToEdgeWrapping;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, WH), new THREE.MeshBasicMaterial({ map: tex, color: 0xd8d8d8 })); glass.name = 'windowView'; g.add(glass);
    const bar = (bw, bh, x, y, m = frameM, d = 0.14) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, d), m); b.position.set(x, y, d / 2 - 0.02); g.add(b); return b; };
    bar(w + 0.36, 0.2, 0, WH / 2 + 0.08); bar(w + 0.5, 0.18, 0, -WH / 2 - 0.08, sillM, 0.32); bar(0.2, WH + 0.3, -w / 2 - 0.08, 0); bar(0.2, WH + 0.3, w / 2 + 0.08, 0);
    bar(0.07, WH, 0, 0, frameM, 0.06); bar(w, 0.07, 0, WH * 0.12, frameM, 0.06);   // mullions
    wins.push({ g, tex, slice: s.slice, sc: s.sc, base: s.slice * 0.7 }); });
  // ---------- weather ----------
  let t0 = performance.now() / 1000, phaseOverride = null;
  const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function weather(t) { const p = phaseOverride != null ? phaseOverride : ((t - t0) % CYCLE + CYCLE) % CYCLE;   // seconds into the cycle
    const cloud = sm(40, 70, p) * (1 - sm(140, 170, p)), rain = sm(80, 95, p) * (1 - sm(130, 145, p)), sunset = sm(170, 195, p) * (1 - sm(225, 240, p));
    const name = rain > 0.5 ? 'rain' : p >= 130 && p < 172 ? 'clearing' : cloud > 0.5 ? 'clouds' : sunset > 0.5 ? 'sunset' : 'sunny'; return { p, cloud, rain, sunset, name }; }
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const rgb = a => 'rgb(' + a.join(',') + ')';
  function sky(x, w, top, bot) { let T = [64, 150, 230], B = [170, 220, 250]; T = mix(T, [92, 100, 116], w.cloud * 0.85); B = mix(B, [150, 156, 166], w.cloud * 0.85);
    T = mix(T, [70, 50, 120], w.sunset); B = mix(B, [255, 140, 70], w.sunset); const g = x.createLinearGradient(0, top, 0, bot); g.addColorStop(0, rgb(T)); g.addColorStop(1, rgb(B)); x.fillStyle = g; x.fillRect(0, top, W, bot - top);
    // sun (high and yellow, low and orange at sunset, hidden by cloud)
    const sy = 70 + w.sunset * 90, a = (1 - w.cloud * 0.9); if (a > 0.05) { x.globalAlpha = a; x.fillStyle = w.sunset > 0.3 ? '#ffb050' : '#fff2a0'; x.beginPath(); x.arc(760, sy, 30 + w.sunset * 10, 0, 7); x.fill(); x.globalAlpha = 1; } }
  function clouds(x, t, w) { const n = 5 + Math.round(w.cloud * 7); for (let i = 0; i < n; i++) { const cx = ((i * 197 + t * (6 + i % 3 * 3)) % (W + 300)) - 150, cy = 30 + (i * 53) % 90, k = 0.5 + 0.5 * w.cloud;
      x.fillStyle = w.cloud > 0.3 ? `rgba(${120 - w.rain * 40},${124 - w.rain * 40},${134 - w.rain * 40},${0.4 + 0.5 * k})` : `rgba(255,255,255,${0.55 + w.sunset * -0.2})`;
      if (w.sunset > 0.4) x.fillStyle = 'rgba(255,170,150,0.55)';
      for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 30], [58, 2, 24], [-26, 6, 20]]) { x.beginPath(); x.arc(cx + dx, cy + dy, r * (0.8 + k * 0.5), 0, 7); x.fill(); } } }
  function rain(x, t, w) { if (w.rain < 0.02) return; x.strokeStyle = `rgba(200,215,235,${0.55 * w.rain})`; x.lineWidth = 1.5; x.beginPath();
    for (let i = 0; i < 160 * w.rain; i++) { const rx = (i * 61.7 + t * 40) % W, ry = (i * 37.3 + t * 420) % Hc; x.moveTo(rx, ry); x.lineTo(rx - 4, ry + 14); } x.stroke();
    x.fillStyle = `rgba(30,36,50,${0.28 * w.rain})`; x.fillRect(0, 0, W, Hc); }
  function tint(x, w) { if (w.sunset > 0.02) { x.fillStyle = `rgba(255,110,40,${0.16 * w.sunset})`; x.fillRect(0, 0, W, Hc); } }
  const emo = (x, ch, px, py, size, flip, rot) => { x.save(); x.translate(px, py); if (flip) x.scale(-1, 1); if (rot) x.rotate(rot); x.font = size + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 0, 0); x.restore(); };
  // ---------- jungle ----------
  const WALKERS = [{ k: 'tiger', e: '🐅', s: 60, v: 30, y: 262 }, { k: 'elephant', e: '🐘', s: 92, v: 18, y: 250 }, { k: 'monkey', e: '🐒', s: 44, v: 42, y: 270 }, { k: 'giraffe', e: '🦒', s: 110, v: 24, y: 232 },
    { k: 'parrot', e: '🦜', s: 38, v: 70, y: 90, fly: 1 }, { k: 'toucan', draw: 'toucan', s: 40, v: 60, y: 120, fly: 1 }, { k: 'tapir', draw: 'tapir', s: 50, v: 22, y: 270 }, { k: 'rhino', e: '🦏', s: 70, v: 20, y: 260 }, { k: 'leopard', e: '🐆', s: 58, v: 34, y: 266 }, { k: 'peacock', e: '🦚', s: 48, v: 26, y: 268 }];
  const J = { walkers: [], next: 1.5, spawned: [] };
  function spawn(k) { const d = k ? WALKERS.find(a => a.k === k) : WALKERS[Math.floor(Math.random() * WALKERS.length)]; if (!d) return null; const dir = Math.random() < 0.5 ? 1 : -1;
    const a = Object.assign({}, d, { dir, x: dir > 0 ? -80 : W + 80, born: performance.now() / 1000 }); J.walkers.push(a); J.spawned.push(d.k); return a; }
  function toucan(x, px, py, flip, t) { x.save(); x.translate(px, py); if (flip) x.scale(-1, 1); x.fillStyle = '#111'; x.beginPath(); x.ellipse(0, 0, 16, 11, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-9, -4, 6, 0, 7); x.fill();
    x.fillStyle = '#ff9a1a'; x.beginPath(); x.moveTo(-12, -8); x.quadraticCurveTo(-40, -6, -36, 2); x.lineTo(-12, 0); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.ellipse(4, -6 + Math.sin(t * 14) * 8, 12, 4, -0.4, 0, 7); x.fill(); x.restore(); }
  function tapir(x, px, py, flip, t) { x.save(); x.translate(px, py); if (flip) x.scale(-1, 1); x.fillStyle = '#26262c'; x.beginPath(); x.ellipse(0, 0, 30, 15, 0, 0, 7); x.fill(); x.fillStyle = '#e8e8e8'; x.beginPath(); x.ellipse(4, -1, 14, 13, 0, 0, 7); x.fill();
    x.fillStyle = '#26262c'; x.beginPath(); x.ellipse(-30, -4, 11, 9, 0.3, 0, 7); x.fill(); x.fillRect(-46, -2, 10, 5); const s = Math.sin(t * 6) * 4; for (const lx of [-18, -8, 12, 22]) x.fillRect(lx + (lx % 2 ? s : -s) * 0.5, 10, 5, 12); x.restore(); }
  function tree(x, tx, ty, s, col, t, sway) { x.fillStyle = '#3a2614'; x.fillRect(tx - 5 * s, ty - 80 * s, 10 * s, 80 * s); x.fillStyle = col; const sw = Math.sin(t * 0.7 + tx) * sway;
    for (const [dx, dy, r] of [[0, -95, 40], [-30, -80, 32], [30, -78, 30], [-12, -118, 30], [18, -112, 28]]) { x.beginPath(); x.arc(tx + (dx + sw) * s, ty + dy * s, r * s, 0, 7); x.fill(); } }
  function jungle(t, w) { const x = S.jungle.x; sky(x, w, 0, Hc); clouds(x, t, w);
    x.fillStyle = '#2c5a3a'; x.beginPath(); x.moveTo(0, 200); for (let i = 0; i <= W; i += 32) x.lineTo(i, 170 + Math.sin(i * 0.013) * 22 + Math.sin(i * 0.041) * 9); x.lineTo(W, Hc); x.lineTo(0, Hc); x.fill();   // far hills
    for (let i = 0; i < 9; i++) tree(x, 40 + i * 120, 232, 0.8, '#1f6a32', t, 2);
    x.fillStyle = '#3f7a2a'; x.fillRect(0, 250, W, 70); x.fillStyle = '#336a22'; for (let i = 0; i < W; i += 18) { x.beginPath(); x.moveTo(i, 252); x.lineTo(i + 6, 236 + Math.sin(t * 2 + i) * 3); x.lineTo(i + 12, 252); x.fill(); }
    // chilling: sloth hanging from a branch, a monkey sitting on a branch, a lion lying down, a tiger asleep
    x.strokeStyle = '#4a2e16'; x.lineWidth = 9; x.beginPath(); x.moveTo(150, 60); x.lineTo(330, 74); x.moveTo(640, 92); x.lineTo(820, 84); x.stroke();
    emo(x, '🦥', 250 + Math.sin(t * 0.5) * 3, 98, 46, false, Math.PI + Math.sin(t * 0.6) * 0.06);
    emo(x, '🐒', 720, 66 + Math.sin(t * 1.3) * 1.5, 40, true);
    emo(x, '🦁', 470, 286, 52, false, 0); x.fillStyle = '#c98a3a'; x.beginPath(); x.ellipse(510, 296, 34, 12, 0, 0, 7); x.fill();   // lion lying (body stretched out)
    emo(x, '🐅', 900, 292, 50, true, 0); x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '18px sans-serif'; x.fillText('z', 930, 258 - (t * 8 % 16));
    // random wanderers
    const now = performance.now() / 1000; if (now > J.next) { spawn(); J.next = now + 5 + Math.random() * 12; }
    J.walkers = J.walkers.filter(a => { a.x += a.dir * a.v * 0.1; const bob = a.fly ? Math.sin(t * 3 + a.born) * 10 : Math.abs(Math.sin(t * 6)) * -3;
      if (a.draw === 'toucan') toucan(x, a.x, a.y + bob, a.dir > 0, t); else if (a.draw === 'tapir') tapir(x, a.x, a.y + bob, a.dir > 0, t); else emo(x, a.e, a.x, a.y + bob, a.s, a.dir > 0);
      return a.x > -120 && a.x < W + 120; });
    for (let i = 0; i < 6; i++) tree(x, 80 + i * 190, 340, 1.25, '#164e22', t, 5);   // foreground canopy (parallax layer)
    rain(x, t, w); tint(x, w); }
  // ---------- beach ----------
  function palm(x, px, py, s, t) { const sw = Math.sin(t * 0.9 + px) * 10 * s; x.strokeStyle = '#7a5530'; x.lineWidth = 9 * s; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 20 * s, py - 70 * s, px + 14 * s + sw * 0.4, py - 150 * s); x.stroke();
    const tx = px + 14 * s + sw * 0.4, ty = py - 150 * s; x.strokeStyle = '#2f8a3a'; x.lineWidth = 7 * s; x.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6 + Math.sin(t * 1.1 + i) * 0.06; x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + Math.cos(a) * 45 * s + sw, ty + Math.sin(a) * 30 * s - 10 * s, tx + Math.cos(a) * 80 * s + sw, ty + Math.sin(a) * 30 * s + 30 * s); x.stroke(); }
    x.fillStyle = '#5a3a1a'; for (const d of [-6, 6]) { x.beginPath(); x.arc(tx + d * s, ty + 6 * s, 6 * s, 0, 7); x.fill(); } }
  const B = { boat: 0 };
  function beach(t, w) { const x = S.beach.x; sky(x, w, 0, 170); clouds(x, t, w);
    let sea = mix([30, 140, 190], [70, 90, 110], w.cloud * 0.7); sea = mix(sea, [200, 110, 90], w.sunset * 0.5); x.fillStyle = rgb(sea); x.fillRect(0, 170, W, 80);
    x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 2; for (let r = 0; r < 4; r++) { x.beginPath(); for (let i = 0; i <= W; i += 16) x.lineTo(i, 182 + r * 18 + Math.sin(i * 0.03 + t * (1.2 + r * 0.3) + r) * 3); x.stroke(); }
    emo(x, '⛵', ((t * 8) % (W + 200)) - 100, 176, 34, false);
    // shoreline: waves wash in and out over the sand
    const wash = Math.sin(t * 0.8) * 8; x.fillStyle = rgb(mix([236, 212, 160], [180, 170, 150], w.rain * 0.5)); x.beginPath(); x.moveTo(0, 252 + wash); for (let i = 0; i <= W; i += 24) x.lineTo(i, 248 + wash + Math.sin(i * 0.02 + t) * 4); x.lineTo(W, Hc); x.lineTo(0, Hc); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 4; x.beginPath(); for (let i = 0; i <= W; i += 24) x.lineTo(i, 249 + wash + Math.sin(i * 0.02 + t) * 4); x.stroke();
    for (const [px, s] of [[90, 1.1], [380, 0.9], [690, 1.2], [960, 1]]) palm(x, px, 300, s, t);
    emo(x, '🦀', 540 + Math.sin(t * 0.4) * 60, 292, 26, false); emo(x, '⛱️', 820, 270, 48, false); emo(x, '🐚', 260, 300, 20, false);
    rain(x, t, w); tint(x, w); }
  // ---------- per frame ----------
  let last = 0, on = false; const api = { group: grp, wins, S, spawn, J, weather: () => weather(performance.now() / 1000), draws: 0, setPhase(p) { phaseOverride = p; last = 0; }, get on() { return on; } };
  api.set = v => { on = !!v; grp.visible = on; last = 0; };
  api.update = () => { if (!on) return; const now = performance.now();
    const inRoom1 = camera.position.x < WX / 2 && camera.position.z > -HALF - 1; if (!inRoom1) return;
    for (const wn of wins) { const lp = wn.g.worldToLocal(camera.position.clone()); wn.tex.offset.x = Math.min(1 - wn.tex.repeat.x, Math.max(0, wn.base - lp.x * 0.012)); }   // look-through parallax
    if (now - last < 100) return; last = now; const t = now / 1000, w = weather(t); jungle(t, w); beach(t, w); api.draws++;
    for (const wn of wins) wn.tex.needsUpdate = true; };
  return api;
}
