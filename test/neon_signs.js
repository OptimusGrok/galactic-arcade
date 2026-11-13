// t773u: no wall shelf (ledge) or stained-glass windows anywhere; a neon name sign above every machine, one draw call, readable, clear of the
// ceiling band / other signs, facing into the room; it is compiled by the warm-up (no new program at entry). node test/neon_signs.js
const { open } = require('./lib');
let ok = true; const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) ok = false; };
(async () => {
  const o = await open({ w: 640, h: 360 }), page = o.page, { errors } = o;
  await page.waitForFunction(() => window.__arcade && window.__neonSigns && window.__arcade.stats.frames > 3, null, { timeout: 120000 });
  const r = await page.evaluate(() => { const A = window.__arcade, S = window.__neonSigns, out = { left: [] };
    for (const m of ['medieval', 'current', 'viking', 'portals']) { A.setWalls(m); [A.room, A.room2, A.hall].forEach(R => R.traverse(o => { if (/^ledge|gothic|wallBand(Pink|Amber)/.test(o.name)) out.left.push(m + ':' + o.name); })); }
    A.setWalls('medieval');
    out.signs = S.userData.signs; out.meshes = 0; window.__arcade.room.parent.traverse(o => { if (o.name === 'neonSigns') out.meshes++; });
    out.map = !!S.material.map && S.material.map.image.width; out.transparent = S.material.transparent; out.depthWrite = S.material.depthWrite;
    out.featured = Object.keys(A.featured || {}).length; return out; });
  chk(r.left.length === 0, 'no wall shelf / ledge bands / stained-glass windows in any walls mode (both rooms + hallway)', r.left);
  const S = r.signs, keys = S.map(s => s.key);
  const want = ['strike', 'berserker', 'monkey', 'ghost', 'orc', 'nova', 'cyber', 'blaster', 'pip', 'bb', 'rockfall', 'skytower', 'roadster', 'claw', 'deadsignal'];
  chk(want.every(k => keys.includes(k)) && S.length === want.length && r.meshes === 1, 'one neon sign per machine (' + S.length + '), all in ONE mesh', keys);
  const T = Object.fromEntries(S.map(s => [s.key, s.title]));
  chk(T.strike === 'STRIKE' && T.ghost === 'GHOST 256' && T.cyber === 'CYBERCITY' && T.rockfall === 'ROCKFALL RUSH' && T.skytower === 'SKY TOWER' && T.monkey === 'MONKEY CROSSING', 'real game titles', T);
  chk(new Set(S.map(s => s.color)).size >= 12, 'a colour per game', S.map(s => s.color));
  const wall = S.filter(s => !['claw', 'deadsignal'].includes(s.key));
  chk(wall.every(s => Math.max(Math.abs(s.pos[0]), Math.abs(s.pos[2])) > 11.9 && Math.max(Math.abs(s.pos[0]), Math.abs(s.pos[2])) < 12), 'wall signs sit flat on the wall', wall.map(s => s.pos));
  chk(wall.every(s => { const n = s.normal, p = s.pos; return (Math.abs(p[0]) > 11.9 ? -Math.sign(p[0]) === n[0] : -Math.sign(p[2]) === n[2]); }), 'each faces out from its wall into the room');
  chk(S.every(s => s.pos[1] - s.h / 2 > s.cabTop + 0.05 || s.key === 'deadsignal') && S.every(s => s.top < 6.0), 'above its machine, below the cyan band (6.2) and ceiling', S.map(s => [s.key, s.cabTop, s.top]));
  chk(S.every(s => s.h >= 0.3 && s.w <= 3.4), 'readable size (letters >= 0.3 m tall rows) and narrower than the 4 m slot', S.map(s => [s.key, s.w, s.h]));
  let overlap = []; for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) { const a = S[i], b = S[j];
    if (Math.abs(a.pos[1] - b.pos[1]) < (a.h + b.h) / 2 && a.normal.join() === b.normal.join() && Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]) < (a.w + b.w) / 2) overlap.push([a.key, b.key]); }
  chk(overlap.length === 0, 'no two signs overlap', overlap);
  chk(r.transparent && !r.depthWrite && r.map === 1024, 'canvas-atlas neon material (transparent, no depth write)', r);
  chk(errors.length === 0, 'no page errors', errors);
  await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
