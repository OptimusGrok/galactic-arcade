// Shop dome: fly inside the glass barrel to a one-time golden ticket. Phone viewport.
// node test/dome_ticket.js
const { open } = require('./lib');
const fs = require('fs');
const SHOP = '/opt/cursor/artifacts/dome_golden_ticket.png';
const FLY = '/opt/cursor/artifacts/dome_jetpack_ticket.png';
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 420) : '')); if (!c) ok = false; };

(async () => {
  const o = await open({ phone: true, w: 390, h: 844 });
  const page = o.page, { errors } = o;
  await page.evaluate(() => {
    localStorage.setItem('galacticarcade.wardrobeMig', '1');
    localStorage.setItem('galacticarcade.wardrobeOwned', JSON.stringify(['fur:brown', 'shoes:red', 'back:jetpack']));
    localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Jet', hat: 'cap', hoodie: 'navy', fur: 'brown', shoes: 'red', glasses: 'none', back: 'jetpack' }));
    localStorage.setItem('neonarcade.tickets', '40');
    localStorage.removeItem('galacticarcade.domeTicket');
  });
  await page.reload();
  await page.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__shop && window.__shop.dome, null, { timeout: 90000 });
  await page.evaluate(() => window.__arcade.simPause(true));
  await page.waitForTimeout(200);

  const info = await page.evaluate(() => {
    const S = window.__shop, A = window.__arcade, d = S.dome, g = d.mesh;
    const capC = S.domeCap(d.wx, d.z), capA = S.domeCap(0, 5), capH = S.domeCap(0, -14.5);
    let vis = 0; const pack = A.monkey.getObjectByName('gaBk_jetpack');
    if (pack) for (let i = 0; i < pack.children.length; i++) if (pack.children[i].name === 'gaThruster' && pack.children[i].visible) vis++;
    return { crown: d.crown, spring: d.spring, radius: d.radius, y: d.y, capC, capA, capH, shown: g.visible, claimed: d.claimed, t: A.play.tickets.total, flames: vis };
  });
  chk(info.crown === 22.5 && info.spring === 8.5 && info.radius === 14 && info.y === 21.45 && info.y > info.crown - 1.4 && info.y < info.crown - 0.7 && info.capC > 19.8 && info.capC < 20.2 && info.capA == null && info.capH == null && info.shown && !info.claimed && info.t === 40 && info.flames === 0, 'dome crown is 22.5 and the ticket hangs just under the glass', info);

  const miss = await page.evaluate(() => {
    const S = window.__shop, A = window.__arcade, st = A.st, d = S.dome;
    const at = (x, y, z, air, back) => { A.monkey.position.set(x, y, z); st.fly.air = air; st.fly.thrust = false; st.jump = null; window.__gaPlayer.p.back = back; A.keys.Space = false; for (let i = 0; i < 4; i++) S.update(1 / 60); };
    at(d.wx, 0, d.z, false, 'jetpack');
    const ground = A.play.tickets.total;
    at(d.wx, d.y, d.z, false, 'jetpack');
    const stand = A.play.tickets.total;
    at(d.wx, d.y - 1, d.z, true, 'none');
    const bare = A.play.tickets.total;
    at(d.wx + 3.2, d.y - 1, d.z, true, 'jetpack');
    const side = { t: A.play.tickets.total, shown: d.mesh.visible };
    window.__gaPlayer.p.back = 'jetpack';
    return { ground, stand, bare, side };
  });
  chk(miss.ground === 40 && miss.stand === 40 && miss.bare === 40 && miss.side.t === 40 && miss.side.shown, 'ground, standing, no pack, and a near miss do not collect', miss);

  // Ticket under the glass, then a real floor climb stopped short of the pickup so both stay in frame.
  const n0 = await page.evaluate(() => {
    const A = window.__arcade, d = window.__shop.dome, st = A.st;
    A.keys.Space = false; st.fly.hold = false; st.fly.air = false; st.fly.vy = 0; st.vel.set(0, 0, 0);
    A.monkey.visible = false; A.monkey.position.set(d.wx, 0, d.z);
    window.__camOverride = { pos: [d.wx + 0.2, 18.2, d.z + 2.4], at: [d.wx, d.y, d.z], showMonkey: false, bloom: 0.15 };
    A.simPause(false);
    return A.stats.frames;
  });
  await page.waitForFunction(n => window.__arcade.stats.frames > n + 1, n0, { timeout: 20000 });
  await page.screenshot({ path: SHOP });
  await page.evaluate(() => window.__arcade.simPause(true));
  const flown = await page.evaluate(() => {
    const S = window.__shop, A = window.__arcade, st = A.st, d = S.dome;
    A.monkey.visible = true; A.monkey.position.set(d.wx, 0, d.z); st.vel.set(0, 0, 0); st.yaw = 0; st.face = Math.PI; st.jump = null; st.fp = false;
    st.fly.e = 1; st.fly.air = false; st.fly.hold = false; st.fly.vy = 0; A.keys.Space = true; window.__gaPlayer.p.back = 'jetpack';
    let hi = 0, steps = 0;
    for (let i = 0; i < 520; i++) {
      A.step(1 / 60); S.update(1 / 60); steps++;
      if (A.monkey.position.y > hi) hi = A.monkey.position.y;
      if (A.monkey.position.y >= 18.2 && !d.claimed) break;
    }
    let vis = 0; const g = A.monkey.getObjectByName('gaBk_jetpack');
    if (g) for (let i = 0; i < g.children.length; i++) if (g.children[i].name === 'gaThruster' && g.children[i].visible) vis++;
    window.__camOverride = { pos: [d.wx + 2.3, 17.6, d.z + 1.5], at: [d.wx, 20.2, d.z], showMonkey: true, bloom: 0.15 };
    A.simPause(false);
    return { y: +A.monkey.position.y.toFixed(2), hi: +hi.toFixed(2), e: +st.fly.e.toFixed(3), vis, claimed: d.claimed, thrust: st.fly.thrust, steps, crown: d.crown, ticket: d.y };
  });
  await page.waitForFunction(() => {
    const A = window.__arcade, d = window.__shop.dome, g = A.monkey.getObjectByName('gaBk_jetpack');
    let vis = 0; if (g) for (let i = 0; i < g.children.length; i++) if (g.children[i].name === 'gaThruster' && g.children[i].visible) vis++;
    return d.mesh.visible && vis === 2 && A.st.fly.thrust && A.monkey.position.y > 18 && A.monkey.position.y < 19.5;
  }, null, { timeout: 20000 });
  await page.screenshot({ path: FLY });
  chk(flown.ticket === 21.45 && flown.crown - flown.ticket < 1.2 && !flown.claimed && flown.y >= 18 && flown.y < 18.6 && flown.vis === 2 && flown.thrust && flown.e > 0.2, 'crown ticket and a floor climb that still has fuel under it', flown);
  await page.evaluate(() => { window.__arcade.keys.Space = false; window.__arcade.simPause(true); window.__camOverride = null; });

  const climb = await page.evaluate(() => {
    const S = window.__shop, A = window.__arcade, st = A.st, d = S.dome;
    window.__camOverride = null; A.simPause(true);
    A.setFloor('neon'); A.monkey.position.set(d.wx, 0, d.z); st.vel.set(0, 0, 0); st.yaw = 0; st.face = Math.PI; st.jump = null;
    st.fly.e = 1; st.fly.air = false; st.fly.hold = false; A.keys.Space = true; window.__gaPlayer.p.back = 'jetpack';
    let hi = 0, gotAt = null, thrustS = 0;
    for (let i = 0; i < 700; i++) {
      A.step(1 / 60); S.update(1 / 60);
      if (st.fly.thrust) thrustS += 1 / 60;
      if (A.monkey.position.y > hi) hi = A.monkey.position.y;
      if (gotAt == null && d.claimed) gotAt = { y: +A.monkey.position.y.toFixed(2), e: +st.fly.e.toFixed(3), i };
      if (st.fly.e <= 0 && !st.fly.thrust && i > 60) break;
    }
    A.keys.Space = false;
    const cap = S.domeCap(d.wx, d.z);
    for (let i = 0; i < 400 && (st.fly.air || A.monkey.position.y > 0.02); i++) { A.step(1 / 60); S.update(1 / 60); }
    A.monkey.position.set(d.wx, 0, d.z); st.fly.e = 0; st.fly.air = false; st.fly.vy = 0; st.jump = null; A.keys.Space = false;
    let n = 0; while (st.fly.e < 0.999 && n < 500) { A.step(1 / 60); n++; }
    return { hi: +hi.toFixed(2), cap: +cap.toFixed(2), gotAt, thrustS: +thrustS.toFixed(2), fillS: +(n / 60).toFixed(2), eEnd: +st.fly.e.toFixed(3), t: A.play.tickets.total, shown: d.mesh.visible, note: document.getElementById('goldNote').classList.contains('on'), key: localStorage.getItem(d.key), claims: S.domeClaims || 0, drain: A.flyCfg.drain, fill: A.flyCfg.fill };
  });
  chk(climb.hi > 19.8 && climb.hi <= climb.cap + 0.02 && climb.gotAt && climb.gotAt.y > 19 && climb.gotAt.e > 0.05 && climb.thrustS > 7.2 && climb.thrustS < 8.4 && climb.fillS > 5.6 && climb.fillS < 7 && climb.t === 41 && !climb.shown && climb.note && climb.key === '1' && climb.claims === 1, 'one full tank from the floor reaches the crown ticket and adds exactly 1', climb);

  const again = await page.evaluate(() => {
    const S = window.__shop, A = window.__arcade, st = A.st, d = S.dome;
    A.monkey.position.set(d.wx, d.y - 1, d.z); st.fly.air = true; st.fly.e = 1; A.keys.Space = true; window.__gaPlayer.p.back = 'jetpack';
    for (let i = 0; i < 30; i++) { A.step(1 / 60); S.update(1 / 60); }
    A.monkey.position.set(0, 0, 5); st.fly.e = 1; st.fly.air = false; A.keys.Space = true; let hi = 0;
    for (let i = 0; i < 180; i++) { A.step(1 / 60); if (A.monkey.position.y > hi) hi = A.monkey.position.y; }
    A.keys.Space = false;
    A.monkey.position.set(0, 4, -14.5); st.fly.air = true; st.fly.e = 0.5; A.step(1 / 60);
    const hall = +A.monkey.position.y.toFixed(2);
    A.monkey.position.set(d.wx, 1, d.z); st.fly.air = false; st.fly.e = 1; A.keys.Space = true;
    for (let i = 0; i < 25; i++) A.step(1 / 60);
    let vis = 0; const g = A.monkey.getObjectByName('gaBk_jetpack');
    if (g) for (let i = 0; i < g.children.length; i++) if (g.children[i].name === 'gaThruster' && g.children[i].visible) vis++;
    const on = { vis, e: +st.fly.e.toFixed(3), y: +A.monkey.position.y.toFixed(2) };
    A.keys.Space = false; for (let i = 0; i < 6; i++) A.step(1 / 60);
    let off = 0; if (g) for (let i = 0; i < g.children.length; i++) if (g.children[i].name === 'gaThruster' && g.children[i].visible) off++;
    return { t: A.play.tickets.total, hi: +hi.toFixed(2), hall, on, off, air: st.fly.air };
  });
  chk(again.t === 41 && again.hi <= 6.46 && again.hi > 5 && again.hall <= 0.96 && again.on.vis === 2 && again.on.e < 1 && again.off === 0, 'no second ticket; arcade and hall caps unchanged; flames on only while thrusting', again);

  await page.reload();
  await page.waitForFunction(() => window.__shop && window.__shop.dome && window.__arcade.stats.frames > 3, null, { timeout: 90000 });
  const kept = await page.evaluate(() => ({ claimed: window.__shop.dome.claimed, shown: window.__shop.dome.mesh.visible, t: window.__arcade.play.tickets.total, key: localStorage.getItem(window.__shop.dome.key) }));
  chk(kept.claimed && !kept.shown && kept.t === 41 && kept.key === '1', 'reload keeps the ticket claimed and does not pay again', kept);

  chk(fs.existsSync(SHOP) && fs.statSync(SHOP).size > 8000 && fs.existsSync(FLY) && fs.statSync(FLY).size > 8000, 'screenshots written');
  const real = errors.filter(e => !/ERR_FAILED|supabase|favicon|net::/i.test(e));
  chk(real.length === 0, 'no page errors ' + real.join('|'));
  await o.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
