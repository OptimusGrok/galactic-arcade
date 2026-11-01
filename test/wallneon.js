// room 1 pink neon wall-base run + cabinet outlines exists, is merged (1 mesh), hugs the walls, and doesn't clip into cabinets/kiosk. node test/wallneon.js [phone]
const { open } = require('./lib'); const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => { const o = await open(PH ? { phone: true, w: 412, h: 860 } : { w: 1280, h: 720 }); const p = o.page; let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const A = window.__arcade, T = A.THREE, m = A.room.getObjectByName('wallNeonRun'); if (!m) return null;
    const pos = m.geometry.attributes.position, v = new T.Vector3(); let maxD = 0, top = 0, inCab = 0; const boxes = [...A.cabinets, ...A.featured].map(c => new T.Box3().setFromObject(c.getObjectByName('body') || c).expandByScalar(-0.03));
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); const d = 12 - Math.max(Math.abs(v.x), Math.abs(v.z)); maxD = Math.max(maxD, d); top = Math.max(top, v.y); if (boxes.some(b => b.containsPoint(v))) inCab++; }
    return { verts: pos.count, maxD: +maxD.toFixed(3), top: +top.toFixed(2), inCab, col: m.material.color.getHexString() }; });
  console.log(JSON.stringify(r));
  chk(r && r.verts > 100, 'one merged wallNeonRun mesh in room 1'); chk(r && r.maxD < 0.08, 'every vertex within 8 cm of a wall'); chk(r && r.top > 2 && r.top < 3.3, 'rises over the cabinets / frames the doorway (top ' + (r && r.top) + ')'); chk(r && r.inCab === 0, 'no vertex inside a cabinet body');
  const shot = async (name, pos, at, floor) => { await p.evaluate(([pos, at, f]) => { window.__arcade.setFloor(f); window.__camOverride = { pos, at, showMonkey: true }; }, [pos, at, floor]); await p.waitForTimeout(1500); await p.screenshot({ path: `shots/${name}${sfx}.png` }); };
  await shot('wallneon_wide', [0, 4.5, 11], [0, 1, -6], 'neon'); await shot('wallneon_low', [1.8, 0.7, -8.3], [6, 1.0, -12], 'carpet'); await shot('wallneon_wide_carpet', [0, 4.5, 11], [0, 1, -6], 'carpet');
  chk(!o.errors.length, 'no page errors'); await o.close(); process.exit(ok ? 0 : 1); })();
