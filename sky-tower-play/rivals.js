// SKY TOWER (t753u): two players at the cabinet climb the SAME tower together. Each device runs its own climb (own health,
// energy, FIRE, tickets, TITAN face) and streams its climber through the arcade's room multiplayer (parent.__mp.sky,
// ~10 Hz); here we draw the other climber — monkey or alien in their look colours, jetpack flame, cosmetic laser shots,
// a name tag — and a small "VS" chip with both platform numbers. Race rule: first to the top wins (finish time
// compared); the other can keep climbing and finishes 2nd. Solo (nobody else in the tower / offline) = unchanged.
// Shots never touch the other player (no PVP); the rival is never a target of my face's lasers.
import * as THREE from '../vendor/three.module.js';

export function createRivals(o) {
  const { scene, makeMonkey, makeAlien, player, G, N, banner } = o;
  const R = { avatars: new Map(), sent: 0, place: 0, myWinAt: 0, rivals: [], first: null, winners: new Map(), bolts: [], boltsShown: 0 };
  const mp = () => { try { return parent !== window && parent.__mp && parent.__mp.sky ? parent.__mp : null; } catch (e) { return null; } };
  const chip = document.createElement('div'); chip.id = 'rivalChip';
  chip.style.cssText = 'position:fixed;left:50%;top:calc(max(8px,env(safe-area-inset-top)) + 26px);transform:translateX(-50%);z-index:20;font:800 12px/1.2 "Courier New",monospace;letter-spacing:.06em;color:#bff;background:#06101ccc;border:1px solid #2ae5ff66;border-radius:8px;padding:3px 8px;white-space:nowrap;pointer-events:none;display:none';
  document.body.appendChild(chip);
  const boltGeo = new THREE.BoxGeometry(0.07, 0.07, 0.85), boltM = { cyan: new THREE.MeshBasicMaterial({ color: 0x48f2ff }), red: new THREE.MeshBasicMaterial({ color: 0xff2a33 }) };
  function tagSprite(name) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.font = 'bold 34px Courier New, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; const w = Math.min(250, g.measureText(name).width + 28);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.roundRect ? g.roundRect(128 - w / 2, 8, w, 48, 12) : g.rect(128 - w / 2, 8, w, 48); g.fill(); g.fillStyle = '#ffffff'; g.fillText(name, 128, 33);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true, fog: false })); s.scale.set(1.6, 0.4, 1); s.position.y = 2.25; s.renderOrder = 8; s.name = 'rivalTag'; return s; }
  function paint(root, look) { let map = {}; try { const W = parent.__wardrobe; if (W && W.colorMap) map = W.colorMap(look) || {}; } catch (e) {}
    root.traverse(m => { if (m.isMesh && m.material && m.material.color) { m.material = m.material.clone(); const h = m.material.color.getHex(); if (map[h] != null) m.material.color.setHex(map[h]); } }); }
  function avatar(r) { let a = R.avatars.get(r.id); const key = r.s.c + '|' + JSON.stringify(r.look || {}) + '|' + r.name;
    if (a && a.key !== key) { scene.remove(a.g); R.avatars.delete(r.id); a = null; }
    if (!a) { const g = r.s.c === 'alien' ? makeAlien() : makeMonkey(); g.name = 'rival_' + r.id; paint(g, r.look); const th = []; g.traverse(q => { if (q.name === 'gaThruster') th.push(q); });
      g.add(tagSprite(r.name || 'Player')); g.position.set(r.s.x, r.s.y, r.s.z); scene.add(g);
      a = { g, th, key, cur: { x: r.s.x, y: r.s.y, z: r.s.z, r: r.s.r }, phase: 0, zn: r.s.zn, won: false }; R.avatars.set(r.id, a); }
    return a; }
  function bolt(z, mine) { const [ox, oy, oz, dx, dy, dz, red, k] = z, m = new THREE.Mesh(boltGeo, red ? boltM.red : boltM.cyan);
    m.position.set(ox, oy, oz); m.lookAt(ox + dx, oy + dy, oz + dz);
    if (k > 0) m.scale.set(1 + k * 3, 1 + k * 3, 1 + k * 1.5);
    scene.add(m); R.bolts.push({ m, d: new THREE.Vector3(dx, dy, dz), life: 1.15, k: k || 0 }); R.boltsShown++; }
  const BEAM_LEN = 60, BEAM_COL = { cyan: { a: 0x2f8cff, b: 0x0a3cff }, red: { a: 0xff2a33, b: 0xff4018 } };
  function clearLaser(a) {
    if (a.ball) { scene.remove(a.ball); a.ball = null; }
    if (a.beam) { scene.remove(a.beam.mesh); a.beam = null; }
  }
  function addEnergy(g, len, col) {
    const en = new THREE.Group(); en.name = 'beamEnergy';
    const ringM = new THREE.MeshBasicMaterial({ color: col.a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const rings = [];
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), ringM.clone()); m.rotation.x = Math.PI / 2; m.position.z = (i + 0.5) * (len / 5); en.add(m); rings.push(m); }
    g.add(en); return { rings, len, t: 0 };
  }
  function tickEnergy(beam, dt) {
    const e = beam && beam.energy; if (!e) return;
    e.t += dt; for (let i = 0; i < e.rings.length; i++) { const m = e.rings[i], u = ((e.t * 18 + i * 0.7) % 1); m.position.z = u * e.len; m.material.opacity = 0.35 + 0.45 * Math.sin(e.t * 10 + i); }
  }
  function syncLaser(a, s) {
    const charging = s.ck > 0.02 && !(s.bt > 0), beaming = s.bt > 0, o = s.bo, d = s.bd, col = BEAM_COL[s.bo && s.bd && (s.z0 && s.z0[6] ? 'red' : (a.key && a.key.startsWith('alien') ? 'red' : 'cyan'))] || BEAM_COL.cyan;
    const hue = (s.c === 'alien') ? 'red' : 'cyan';
    const C = BEAM_COL[hue];
    if (!beaming && !charging) { clearLaser(a); return; }
    if (!o || !d) return;
    if (beaming) {
      if (a.ball) a.ball.visible = false;
      if (!a.beam) {
        const g = new THREE.Group(); g.name = 'skyChargeBeamRemote';
        const core = new THREE.MeshBasicMaterial({ color: C.a, toneMapped: false, depthWrite: false });
        const glow = new THREE.MeshBasicMaterial({ color: C.b, transparent: true, opacity: 0.45, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
        [new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, BEAM_LEN, 12, 1, true), core),
         new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, BEAM_LEN, 12, 1, true), glow)]
          .forEach(m => { m.rotation.x = Math.PI / 2; m.position.z = BEAM_LEN / 2; m.renderOrder = 5; g.add(m); });
        scene.add(g); a.beam = { mesh: g, energy: addEnergy(g, BEAM_LEN, C) };
      }
      a.beam.mesh.position.set(o[0], o[1], o[2]); a.beam.mesh.lookAt(o[0] + d[0], o[1] + d[1], o[2] + d[2]);
    } else {
      if (a.beam) { scene.remove(a.beam.mesh); a.beam = null; }
      if (!a.ball) { a.ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false })); a.ball.name = 'skyChargeRemote'; a.ball.renderOrder = 6; scene.add(a.ball); }
      a.ball.visible = true; a.ball.position.set(o[0], o[1], o[2]); a.ball.scale.setScalar(0.45 + s.ck * 2.2);
      a.ball.material.opacity = 0.35 + s.ck * 0.6; a.ball.material.color.setHex(s.ck > 0.7 ? C.a : 0xffe14a);
    }
  }
  const r2 = v => Math.round(v * 100) / 100;
  R.reset = () => { R.place = 0; R.myWinAt = 0; R.first = null; R.winners.clear(); for (const a of R.avatars.values()) a.won = false; };
  R.myWin = () => {   // returns the banner for my finish
    R.myWinAt = Date.now(); if (!R.rivals.length && !R.winners.size) return null;   // solo climb: the normal ending
    const before = [...R.winners.values()].filter(w => !w.wt || w.wt < R.myWinAt).sort((a, b) => a.wt - b.wt);   // they already finished (even if they have left since)
    R.place = before.length + 1;
    return R.place === 1 ? 'YOU WIN THE RACE!\nEARTH BELOW' : (R.place === 2 ? '2ND' : R.place + 'TH') + ' PLACE!\n' + String(before[0].name || 'RIVAL').toUpperCase() + ' WON THE RACE';
  };
  R.update = (dt, shot) => {
    const M = mp(), real = G.mode === 'play' && !window.__DEMO && (G.run || G.won);
    const nowT = performance.now();
    if (M && real && M.state === 'on' && nowT - (R.tryAt || 0) >= 95) { R.tryAt = nowT; const p = player.position;
      const pk = { x: r2(p.x), y: r2(p.y), z: r2(p.z), r: r2(G.face), p: G.platform, h: G.hp, w: G.won ? 1 : 0, wt: R.myWinAt, f: G.thrust ? 1 : 0, a: G.air ? 1 : 0, c: player.userData.char, run: 1, zn: shot.n, z0: shot.v };
      if (G.beam || (G.charging && G.charge > 0.02 && !G.chargeSpent)) {
        try {
          const mz = o.muzzle && o.muzzle(), q = v => Math.round(v * 1000) / 1000;
          pk.ck = G.beam ? 1 : Math.min(1, G.charge / 4); pk.bt = G.beam ? +((G.beamT || 0).toFixed(2)) : 0;
          if (mz && mz.o && mz.dir) { pk.bo = [q(mz.o.x), q(mz.o.y), q(mz.o.z)]; pk.bd = [q(mz.dir.x), q(mz.dir.y), q(mz.dir.z)]; }
        } catch (e) {}
      }
      if (o.live) try { Object.assign(pk, o.live(R.sent % 4 === 0 || G.platform !== R.padP)); } catch (e) {}   // t754u: live cabinet screen data
      if (M.sky.send(pk)) { R.sent++; if (pk.pd) R.padP = G.platform; } }
    const list = M && real ? M.sky.rivals().filter(r => r.s.run) : [];
    R.rivals = list; const seen = new Set();
    for (const r of list) { seen.add(r.id); const a = avatar(r), c = a.cur, s = r.s, k = 1 - Math.exp(-dt * 10), ox = c.x, oz = c.z;
      if (Math.hypot(s.x - c.x, s.y - c.y, s.z - c.z) > 12) { c.x = s.x; c.y = s.y; c.z = s.z; }   // respawn: snap
      c.x += (s.x - c.x) * k; c.y += (s.y - c.y) * k; c.z += (s.z - c.z) * k; let dr = ((s.r - c.r + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; c.r += dr * k;
      const g = a.g, u = g.userData; g.position.set(c.x, c.y, c.z); g.rotation.y = c.r; g.visible = true;
      const sp = Math.hypot(c.x - ox, c.z - oz) / Math.max(dt, 1e-3);
      if (u.legs && u.arms) { if (s.a) { u.legs[0].leg.rotation.x = -0.35; u.legs[1].leg.rotation.x = -0.28; u.arms[1].sh.rotation.x = -0.55; }
        else { a.phase += dt * sp * 5.5; const w = Math.sin(a.phase) * Math.min(1, sp / 2); u.legs[0].leg.rotation.x = w * 0.55; u.legs[1].leg.rotation.x = -w * 0.55; u.arms[1].sh.rotation.x = w * 0.25; } }
      const fl = 0.78 + Math.sin(G.t * 28) * 0.22; for (const t of a.th) { t.visible = !!s.f; if (s.f) t.scale.set(0.9, fl, 0.9); }
      if (s.zn !== a.zn) { a.zn = s.zn; if (s.z0) bolt(s.z0); }
      syncLaser(a, s); if (a.beam) tickEnergy(a.beam, dt);
      if (s.w && !R.winners.has(r.id) && !G.won) R.winners.set(r.id, { name: r.name, wt: s.wt || Date.now() });
      if (s.w && !a.won) { a.won = true; if (!G.won && !R.first) { R.first = r.name; if (banner) banner(String(r.name || 'RIVAL').toUpperCase() + ' REACHED THE TOP FIRST!'); } } }
    for (const [id, a] of R.avatars) if (!seen.has(id)) { clearLaser(a); scene.remove(a.g); R.avatars.delete(id); }
    for (let i = R.bolts.length - 1; i >= 0; i--) { const b = R.bolts[i]; b.m.position.addScaledVector(b.d, 24 * dt); b.life -= dt; if (b.life <= 0) { scene.remove(b.m); R.bolts.splice(i, 1); } }
    if (list.length) { const r = list[0], me = G.platform, them = r.s.p; chip.style.display = 'block';
      chip.textContent = 'RACE · YOU ' + me + '/' + N + '  ' + (r.name || 'RIVAL').slice(0, 12) + ' ' + them + '/' + N + (r.s.w ? ' 🏁' : them > me ? ' ▲' : them < me ? ' ▼' : ''); }
    else chip.style.display = 'none';
  };
  R.remoteLaser = () => {
    const out = [];
    for (const [id, a] of R.avatars) out.push({ id, hasBall: !!(a.ball && a.ball.visible), hasBeam: !!a.beam, ballY: a.ball && a.ball.visible ? a.ball.position.y : null, bolts: R.boltsShown, lastK: (R.bolts[R.bolts.length - 1] && R.bolts[R.bolts.length - 1].k) || 0 });
    return { peers: out, boltsShown: R.boltsShown, boltsLive: R.bolts.length };
  };
  return R;
}
