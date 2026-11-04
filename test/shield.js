// t236: the doorway energy shield (and its 10-ticket UNLOCK) is removed: new player walks straight through to the hallway,
// no pop-up, tickets unchanged, a saved 'shield closed' flag does not bring it back. node test/shield.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone';
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const { page, errors, close } = await open(PH ? { phone: true } : { w: 1280, h: 720 }); const ev = (f, a) => page.evaluate(f, a);
  const r = await ev(() => { const A = window.__arcade, t0 = A.play.tickets.total; A.monkey.position.set(0.4, 0, -4); A.st.yaw = 0; A.st.face = Math.PI; A.keys.KeyW = true; let pop = false;
    for (let i = 0; i < 360; i++) { A.step(1 / 60); A.shield.update(1 / 60); pop = pop || A.shield.pop.classList.contains('on'); } A.keys.KeyW = false;
    A.shield.setOpen(false); return { z: A.monkey.position.z, Z: A.shield.Z, vis: A.shield.group.visible, open: A.shield.open, pop, dt: A.play.tickets.total - t0 }; });
  chk(r.z < r.Z - 0.5, 'walks through the doorway (z ' + r.z.toFixed(2) + ' past ' + r.Z.toFixed(2) + ')');
  chk(!r.pop && r.dt === 0, 'no 10-ticket pop-up, no tickets spent');
  chk(r.open && !r.vis, 'shield stays gone even if a save says closed');
  chk(!errors.length, 'no page errors ' + errors.join('|'));
  await close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
})();
