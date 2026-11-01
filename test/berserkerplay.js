// BERSERKER cabinet: PLAY prompt shows 5 TICKETS TO PLAY, silent DEMO (intro video skipped), refused with < 5 tickets (message),
// 5 tickets = 1 credit for the whole run (continues free), gold arcade tickets bank on pickup, Viking ticket for clearing Stage I,
// isolated storage, game over (after continues) -> back to the DEMO.
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const PHONE = process.argv[2] === 'phone';
(async () => {
  const { page, errors, requests, close } = await open(PHONE ? { phone: true, w: 412, h: 860 } : {});
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', H = helpers(page, PHONE), W = 'document.getElementById("game").contentWindow';
  const gw = fn => page.evaluate(new Function('return (' + fn + ')(' + W + ')'));
  await page.evaluate(() => { for (const k of ['berserker_save', 'berserker_zoom', 'neonarcade.vikingTickets']) localStorage.removeItem(k); const p = window.__arcade.play; p.tickets.total = 4; localStorage.setItem('neonarcade.tickets', '4'); p.machines.berserker.credits = 0; p.viking.total = 0; });
  await H.goTo('berserkerCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
  const p0 = await H.ui(); chk(p0.on && p0.txt === 'PLAY' && /5 TICKETS TO PLAY/.test(p0.cr) && p0.near === 'berserkerCabinet', 'PLAY prompt at BERSERKER shows 5 TICKETS TO PLAY ' + JSON.stringify(p0));
  await page.screenshot({ path: 'shots/berserker_cab_cost' + sfx + '.png' });
  await H.press(); await H.zoomToDemo();
  const d = await gw(w => ({ src: w.location.pathname, demo: w.__DEMO, st: w.__B.G().state, mute: w.__MUTE, intro: !!w.document.getElementById('intro'), vids: [...w.document.querySelectorAll('video')].filter(v => !v.paused && !v.muted).length }));
  const dui = await page.evaluate(() => ({ ins: document.getElementById('dInsert').textContent, cost: document.getElementById('dCost').textContent, btn: document.getElementById('bTicket').textContent }));
  chk(/berserker-play/.test(d.src) && d.demo && !d.intro, 'zoom lands in the BERSERKER DEMO, no intro video ' + JSON.stringify(d));
  chk(dui.ins === 'INSERT CREDIT' && dui.cost === '5 TICKETS TO PLAY' && dui.btn === 'NEED 5 TICKETS', 'DEMO shows INSERT CREDIT + 5 TICKETS TO PLAY ' + JSON.stringify(dui));
  await page.waitForTimeout(3000);
  const d2 = await gw(w => ({ mute: w.__MUTE, kills: w.__B.P() && w.__B.P().kills, st: w.__B.G().state, vids: [...w.document.querySelectorAll('video,audio')].filter(v => !v.paused && !v.muted).length }));
  chk(d2.mute && d2.vids === 0, 'DEMO is silent ' + JSON.stringify(d2));
  await page.screenshot({ path: 'shots/berserker_demo' + sfx + '.png' });
  // refused with fewer than 5 tickets
  await H.insert(); await page.evaluate(() => window.__arcade.play.tryPlay()); await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, cr: window.__arcade.play.machines.berserker.credits, toast: window.__arcade.play.lastToast, sub: window.__arcade.play.sub, el: !!document.querySelector('.ntoast') }));
  chk(r.t === 4 && r.cr === 0 && r.sub === 'demo' && /NEED 5 TICKETS/.test(r.toast) && r.el, 'with 4 tickets: refused with a message, nothing deducted ' + JSON.stringify(r));
  await page.screenshot({ path: 'shots/berserker_refused' + sfx + '.png' });
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 7; localStorage.setItem('neonarcade.tickets', '7'); }); await page.waitForTimeout(2200);
  await H.insert(); const c = await page.evaluate(() => ({ cr: window.__arcade.play.machines.berserker.credits, t: window.__arcade.play.tickets.total, ls: localStorage.getItem('neonarcade.tickets') }));
  chk(c.cr === 1 && c.t === 2 && c.ls === '2', 'INSERT 5 TICKETS: 7 -> 2 tickets, CREDIT 1 ' + JSON.stringify(c));
  if (PHONE) await page.tap('#dInsert'); else await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
  const g = await gw(w => ({ st: w.__B.G().state, demo: w.__DEMO, mute: w.__MUTE, lives: w.__B.P().lives, conts: w.__B.G().conts, intro: !!w.document.getElementById('intro') }));
  const gp = await page.evaluate(() => ({ cr: window.__arcade.play.machines.berserker.credits, sub: window.__arcade.play.sub }));
  chk(g.st === 'play' && !g.demo && !g.mute && !g.intro && g.lives === 5 && g.conts === 3 && gp.cr === 0 && gp.sub === 'play', 'credit starts a real run: 5 lives, 3 continues, audio on, no intro ' + JSON.stringify({ g, gp }));
  await page.waitForFunction(() => document.getElementById('game').contentWindow.__B.G().warp <= 0, null, { timeout: 8000 }).catch(() => {});
  // controls
  const x0 = await gw(w => w.__B.P().x);
  if (PHONE) { const b = await page.evaluate(() => { const r = document.getElementById('game').contentWindow.document.getElementById('joy').getBoundingClientRect(), f = document.getElementById('game').getBoundingClientRect(); return { x: f.left + r.left + r.width / 2, y: f.top + r.top + r.height / 2 }; });
    await page.evaluate(b => { const w = document.getElementById('game').contentWindow, jo = w.document.getElementById('joy'), r = jo.getBoundingClientRect(); const ev = (t, x) => jo.dispatchEvent(new w.PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: r.top + r.height / 2, bubbles: true }));
      ev('pointerdown', r.left + r.width / 2); ev('pointermove', r.right); window.__jo = () => ev('pointerup', r.right); }, b); await page.waitForTimeout(700); await page.evaluate(() => window.__jo()); }
  else { await page.keyboard.down('KeyD'); await page.waitForTimeout(700); await page.keyboard.up('KeyD'); }
  const x1 = await gw(w => w.__B.P().x); chk(x1 > x0 + 10, (PHONE ? 'joystick' : 'D key') + ' moves the Viking right (' + x0.toFixed(0) + ' -> ' + x1.toFixed(0) + ')');
  // ticket banking: three tickets right by the Viking
  await gw(w => { w.__TK.list = []; return 1; }); await page.waitForTimeout(200);
  const t0 = await page.evaluate(() => window.__arcade.play.tickets.total);
  await gw(w => { const P = w.__B.P(); w.__TK.list = []; w.__TK.run = 0; w.__TK.put(P.x + 40, P.y, [0, 1], 3); return 1; });
  await page.waitForTimeout(400); await page.screenshot({ path: 'shots/berserker_tickets' + sfx + '.png' });
  await gw(w => { const P = w.__B.P(); for (const k of w.__TK.list) { k.x = P.x; k.y = P.y; } return 1; }); await page.waitForTimeout(500);
  const tb = await page.evaluate(() => ({ t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets'), run: document.getElementById('game').contentWindow.__TK.run }));
  chk(tb.t === t0 + 3 && tb.ls === t0 + 3 && tb.run === 3, 'walking over 3 gold tickets banks +3 into neonarcade.tickets ' + JSON.stringify(tb));
  await page.screenshot({ path: 'shots/berserker_pickup' + sfx + '.png' });
  // waves release tickets
  const wv = await gw(w => { const n0 = w.__TK.placed, G = w.__B.G(); w.__TK.seq = 4; G.seqI = 5; return n0; }); await page.waitForTimeout(400);
  const wv2 = await gw(w => w.__TK.placed); chk(wv2 - wv >= 2, 'a new wave releases tickets (wave 6: +' + (wv2 - wv) + ')');
  // Viking ticket: force a Stage I clear
  await gw(w => { const G = w.__B.G(); G.seqI = 99; for (const e of w.__B.ens()) e.hp = 0; return 1; });
  await page.waitForFunction(() => window.__arcade.play.viking.total === 1, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
  const vk = await page.evaluate(() => ({ v: window.__arcade.play.viking.total, ls: localStorage.getItem('neonarcade.vikingTickets'), pop: !!document.querySelector('.vpop'), hud: getComputedStyle(document.getElementById('vix')).display, n: document.getElementById('vixN').textContent, st: document.getElementById('game').contentWindow.__B.G().state }));
  await page.screenshot({ path: 'shots/berserker_viking_popup' + sfx + '.png' });
  chk(vk.v === 1 && vk.ls === '1' && vk.pop && vk.hud !== 'none' && vk.n === '1', 'clearing Stage I awards one VIKING TICKET (pop-up, saved, HUD chip) ' + JSON.stringify(vk));
  await page.waitForTimeout(3300);
  await page.evaluate(() => window.__arcade.play.openView('viking')); await page.waitForTimeout(500);
  const vv = await page.evaluate(() => ({ open: window.__arcade.play.view.open, kind: window.__arcade.play.view.kind, txt: document.getElementById('tvCount').textContent }));
  chk(vv.open && vv.kind === 'viking' && /VIKING TICKET/.test(vv.txt), 'Viking chip opens its enlarged view ' + JSON.stringify(vv));
  await page.screenshot({ path: 'shots/berserker_viking_view' + sfx + '.png' });
  await page.evaluate(() => window.__arcade.play.closeView()); await page.waitForTimeout(300);
  // continues are free: lose all 5 lives -> continue screen, continue, credits untouched
  const iso = await page.evaluate(() => ({ a: localStorage.getItem('arcade_berserker_save'), o: localStorage.getItem('berserker_save') }));
  chk(iso.a !== null && iso.o === null, 'the copy saves under arcade_berserker_* only ' + JSON.stringify(iso));
  await gw(w => { const G = w.__B.G(), P = w.__B.P(); if (G.state !== 'play') { w.document.getElementById('next') && w.document.getElementById('next').click(); } return 1; }); await page.waitForTimeout(2500);
  const kill = () => gw(w => { const P = w.__B.P(), G = w.__B.G(); G.warp = 0; P.inv = 0; P.dashT = 0; P.lives = 1; const e = w.__B.ens()[0]; P.hp = 1; G.state = 'play'; return 1; });
  const hurt = () => gw(w => { const P = w.__B.P(); P.hp = 0.0001; P.inv = 0; w.__B.G().warp = 0; return 1; });
  const tc = await page.evaluate(() => window.__arcade.play.tickets.total);
  await kill(); await page.evaluate(new Function(W + '.eval("hurtP(999,0)")')); await page.waitForTimeout(500);
  const ct = await gw(w => ({ st: w.__B.G().state, conts: w.__B.G().conts }));
  chk(ct.st === 'cont' && ct.conts === 3, 'out of lives -> CONTINUE screen ' + JSON.stringify(ct));
  await gw(w => { w.document.getElementById('cgo').click(); return 1; }); await page.waitForTimeout(800);
  const c2 = await page.evaluate(() => ({ st: document.getElementById('game').contentWindow.__B.G().state, conts: document.getElementById('game').contentWindow.__B.G().conts, sub: window.__arcade.play.sub, t: window.__arcade.play.tickets.total }));
  chk(c2.st === 'play' && c2.conts === 2 && c2.sub === 'play' && c2.t >= tc, 'continue is free: same credit, no tickets taken ' + JSON.stringify(c2));
  await gw(w => { w.__B.G().conts = 0; return 1; }); await kill(); await page.evaluate(new Function(W + '.eval("hurtP(999,0)")')); await page.waitForTimeout(700);
  const ov = await page.evaluate(() => ({ st: document.getElementById('game').contentWindow.__B.G().state, go: window.__arcade.play.goShown, again: getComputedStyle(document.getElementById('game').contentWindow.document.getElementById('again')).display }));
  chk(ov.st === 'dead' && ov.go && ov.again === 'none', 'continues used up -> GAME OVER, no free Play again ' + JSON.stringify(ov));
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 15000 });
  const back = await gw(w => ({ demo: w.__DEMO, mute: w.__MUTE, ins: w.parent.document.getElementById('dInsert').textContent }));
  chk(back.demo && back.mute && back.ins === 'INSERT CREDIT', 'game over returns to the silent DEMO ' + JSON.stringify(back));
  if (PHONE) await page.tap('#bExit'); else await page.click('#bExit'); await page.waitForFunction(() => window.__arcade.play.mode === 'walk', null, { timeout: 30000 }).catch(async () => console.log('mode', JSON.stringify(await page.evaluate(() => ({ m: window.__arcade.play.mode, s: window.__arcade.play.sub, x: getComputedStyle(document.getElementById('bExit')).display })))));
  await page.waitForTimeout(800);
  const hud = await page.evaluate(() => ({ vix: getComputedStyle(document.getElementById('vix')).display, n: document.getElementById('vixN').textContent, gone: !document.getElementById('game') }));
  chk(hud.vix !== 'none' && hud.n === '1' && hud.gone, 'back in the room: Viking ticket chip next to the gold tickets; game iframe gone ' + JSON.stringify(hud));
  await page.screenshot({ path: 'shots/berserker_hud_viking' + sfx + '.png' });
  chk(requests.filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests');
  chk(errors.length === 0, 'no page errors ' + errors.join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
