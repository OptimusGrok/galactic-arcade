// CYBERCITY cabinet: west wall slot 2 (z=0), left of ORC ATTACK; no body neon; PLAY prompt; muted DEMO never drops tickets;
// 10 tickets = 1 credit = one 15-minute run; drops go through the parent session API (__neonSession) onto the one gold counter;
// no in-game ticket counter; pause on hold; no network; isolated arcade_cyber_* storage; payout measured. node test/cyberplay.js [phone] [measureSecs]
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone', MEAS = +(process.argv[3] || 90);
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  page.setDefaultTimeout(90000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const slot = await page.evaluate(() => { const A = window.__arcade, c = A.cyberCab; const west = A.playables.filter(k => k.userData.wall === 'west').map(k => [k.name, k.userData.index, +k.position.z.toFixed(2)]);
    const bad = []; c.traverse(o => { if (o.isMesh && (/body|trim|side/i.test(o.name)) && o.material.emissive && o.material.emissive.getHex()) bad.push(o.name); });
    return { wall: c.userData.wall, idx: c.userData.index, z: +c.position.z.toFixed(2), west, bad }; });
  const oi = slot.west.find(n => n[0] === 'orcCabinet');
  chk(slot.wall === 'west' && slot.idx === 2 && oi && oi[1] === 3 && slot.z === 0, 'CYBERCITY on the west wall slot 2 (z=0), left of ORC ATTACK ' + JSON.stringify(slot.west));
  chk(slot.bad.length === 0, 'no neon on the cabinet body ' + slot.bad);
  await page.evaluate(() => { localStorage.setItem('neonarcade.tickets', '25'); window.__neonSync(); window.__arcade.play.machines.cyber.credits = 0; });
  await H.goTo('cyberCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 15000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.near === 'cyberCabinet' && /5 TICKETS TO PLAY/.test(p0.cr), 'PLAY prompt with 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await page.evaluate(() => { window.__camOverride = null; }); await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/cyber_cab' + sfx + '.png' });
  await H.press(); await H.zoomToDemo(); await page.waitForTimeout(6000);
  const d = await page.evaluate(W => { const w = eval(W); return { demo: w.__DEMO, got: w.__TK.got, ins: document.getElementById('dInsert').textContent, cost: document.getElementById('dCost').textContent, muted: w.Audio8 ? w.Audio8.muted : null }; }, W);
  chk(d.demo && d.got === 0 && d.ins === 'INSERT CREDIT' && d.cost === '5 TICKETS TO PLAY' && d.muted !== false, 'zoom lands in the muted DEMO, no tickets ' + JSON.stringify(d));
  await page.screenshot({ path: 'shots/cyber_demo' + sfx + '.png' });
  await page.evaluate(() => window.__arcade.play.insertTicket());
  const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.cyber.credits, t: window.__arcade.play.tickets.total }));
  chk(c.cr === 1 && c.t === 20, 'INSERT 5 TICKETS -> CREDIT 1 (25 -> 20) ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  const g = await page.evaluate(W => { const w = eval(W); return { sc: w.__cyber.scene(), demo: w.__DEMO, cr: window.__arcade.play.machines.cyber.credits, sub: window.__arcade.play.sub }; }, W);
  chk(g.sc === 'play' && !g.demo && g.cr === 0 && g.sub === 'play', 'credit starts a run ' + JSON.stringify(g));
  await page.evaluate(W => { const b = eval(W).document.getElementById('btnStart'); if (b) b.click(); }, W); await page.waitForTimeout(3000);
  // drop through real hooks (fixed RNG) -> parent session via the adapter; one counter in the HUD
  const before = await page.evaluate(() => window.__arcade.play.tickets.total);
  const r = await page.evaluate(W => { const w = eval(W), R = w.Math.random; w.Math.random = () => 0.1; w.__TK.ev('battle', false); w.__TK.ev('chest'); w.Math.random = R; return w.__cyber.state(); }, W);
  await page.waitForTimeout(500);
  const h = await page.evaluate(W => { const w = eval(W), ch = w.document.getElementById('cyChip'); return { t: window.__arcade.play.tickets.total, hud: document.getElementById('tixN').textContent, ls: localStorage.getItem('neonarcade.tickets'), chipTxt: ch ? ch.textContent : '', inner: Object.keys(w.localStorage).filter(k => /neonarcade/.test(k)) }; }, W);
  chk(r.got === 2 && h.t === before + 2 && h.hud === String(h.t) && h.ls === String(h.t), 'battle + chest drops (4 at the old 10-ticket rate, x0.5 for the 5-ticket price) reach the session counter (+2) ' + JSON.stringify([r.log, h]));
  chk(!/\d+\s*\u00b7/.test(h.chipTxt) && /\d:\d\d/.test(h.chipTxt) && h.inner.length === 0, 'game shows only its run timer (no second ticket counter), writes no neonarcade keys ' + JSON.stringify(h.chipTxt));
  await page.screenshot({ path: 'shots/cyber_ticket' + sfx + '.png' });
  // pause on hold
  await page.evaluate(() => { const p = window.__arcade.play; p.machines.cyber.hold(document.getElementById('game').contentWindow); });
  const t0 = await page.evaluate(W => eval(W).__TK.left, W); await page.waitForTimeout(1500); const t1 = await page.evaluate(W => eval(W).__TK.left, W);
  await page.evaluate(() => window.__arcade.play.machines.cyber.unhold(document.getElementById('game').contentWindow));
  chk(t0 === t1, 'hold pauses the sim and the run timer');
  // PAYOUT: let the game's own autoplay play the run for MEAS s at normal speed, record the hook events, replay them through the drop rules
  const m = await page.evaluate(async ([W, S]) => { const w = eval(W), ev = []; const o = w.__TK.ev; w.__TK.ev = (k, a) => { ev.push([k, !!a]); return o(k, a); };
    w.Auto.enable(); await new Promise(r => setTimeout(r, S * 1000)); try { w.Auto.cancel('test'); } catch (e) {} w.__TK.ev = o;
    const P = w.__TK.P; let sim = []; for (let trial = 0; trial < 400; trial++) { let n = 0, acc = 0; const R = Math.random;
      for (const [k, a] of ev) { if (k === 'battle') { if (a) n += P.boss; else if (R() < P.battle) n += R() < .5 ? 2 : 1; } else if (k === 'chest') { if (R() < P.chest) n += R() < .35 ? 2 : 1; } else if (k === 'quest') n += P.quest + (R() < P.questExtra ? 1 : 0); else if (k === 'step') { if (++acc >= P.walkEvery) { acc = 0; if (R() < P.walk) n += R() < .5 ? 2 : 1; } } }
      sim.push(n); }
    const mean = sim.reduce((a, b) => a + b, 0) / sim.length, cnt = {}; ev.forEach(([k, a]) => { const kk = k + (a ? ':boss' : ''); cnt[kk] = (cnt[kk] || 0) + 1; });
    return { secs: S, events: cnt, perWindow: +mean.toFixed(2), per15min: +((mean * 900 / S + P.runBonus) * w.__TK.PAYX).toFixed(1), raw10: +(mean * 900 / S + P.runBonus).toFixed(1) }; }, [W, MEAS]);
  console.log('PAYOUT ' + JSON.stringify(m) + ' -> about ' + m.per15min + ' tickets per 5 spent (ratio ' + (m.per15min / 5).toFixed(2) + ' per ticket)');
  chk(m.per15min >= 7.5 && m.per15min <= 17.5, 'payout scaled to the 5-ticket price, same ratio: ~' + m.per15min + ' tickets per 5-ticket run');
  chk(m.events.step > 0, 'autoplay drove the real hooks during the measurement');
  chk(!requests.some(u => !u.startsWith('http://localhost') && !u.startsWith('data:') && !u.startsWith('blob:')), 'no network calls ' + requests.filter(u => !u.startsWith('http://localhost')).slice(0, 3));
  const keys = await page.evaluate(W => Object.keys(eval(W).localStorage).filter(k => /^cybercity|^ghost256/.test(k)), W); chk(keys.length === 0, 'cabinet storage isolated (arcade_cyber_*) ' + keys);
  if (PHONE) await page.tap('#bExit'); else await page.evaluate(() => document.getElementById('bExit').click());
  await page.waitForFunction(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game'), null, { timeout: 30000 }).catch(() => {});
  chk(await page.evaluate(() => window.__arcade.play.mode === 'walk' && !document.getElementById('game')), 'leaving the cabinet unloads the game (nothing runs when not zoomed in)');
  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
