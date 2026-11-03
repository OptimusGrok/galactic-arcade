// t197: Arcade Kid wears the HUD backpack (charcoal, top loop, monkey-face pocket) and a curly brown tail that sways;
// remote monkeys get both, tinted fur but untinted pack; pack/tail dissolve with the teleporter clip. node test/backpack.js [phone]
const { open } = require('./lib'); const PHONE = process.argv[2] === 'phone';
(async () => { let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const o = await open(PHONE ? { phone: true, w: 412, h: 860 } : {}); const p = o.page; p.setDefaultTimeout(60000);
  await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3);
  const r = await p.evaluate(async () => { const m = window.__arcade.monkey, g = n => m.getObjectByName(n);
    const need = ['backpack', 'backpackBag', 'backpackLoop', 'backpackPocket', 'backpackFace', 'tail', 'tailMesh'].filter(n => !g(n));
    const fur = g('tailMesh').material.color.getHexString(), bag = g('backpackBag').material.color.getHexString();
    m.updateMatrixWorld(true); const V = window.THREE ? null : null; const bz = g('backpack').getWorldPosition(g('backpack').position.clone()), mz = m.position.clone();
    const back = Math.cos(m.rotation.y) * (bz.z - mz.z) + Math.sin(m.rotation.y) * (bz.x - mz.x);
    const t0 = g('tail').rotation.z; let t1 = t0; for (let i = 0; i < 50 && Math.abs(t1 - t0) < 0.006; i++) { await new Promise(r => setTimeout(r, 100)); t1 = g('tail').rotation.z; }
    const rm = window.__arcade.makeMonkey ? window.__arcade.makeMonkey() : null;
    return { need, fur, bag, back, sway: Math.abs(t1 - t0), face: !!g('backpackFace').material.map }; });
  chk(r.need.length === 0, 'backpack (bag, top loop, pocket, monkey face) + tail meshes exist ' + r.need);
  chk(r.fur === '4e2a14' && r.bag === '1c1c22' && r.face, 'tail is the brown fur, pack charcoal with the monkey-face texture');
  chk(r.back < -0.1, 'backpack sits on his back (' + r.back.toFixed(2) + ' m behind)');
  chk(r.sway > 0.005, 'tail sways when idle (' + r.sway.toFixed(3) + ' rad)');
  // back-view phone screenshot
  await p.evaluate(() => { const a = window.__arcade; a.st.yaw = a.monkey.rotation.y + Math.PI + 0.7; a.st.lookT = a.st.t; a.st.pitch = 0.2; a.st.dist = 2.6; });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/monkey_backpack_tail' + (PHONE ? '' : '_desktop') + '.png' });
  chk(o.errors.length === 0, 'no page errors ' + o.errors.join('|')); await o.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
