// t295u CYBERCITY copy = the whole game as STAGE 1: STAGE 1 badge + rewritten intro, no run timer, no AUTO in battle (command gone,
// Auto-Runner and the dev menu refuse outside the demo), BIG ticket win once per save with a popup, no page errors. node test/cyber_stage1.js
const { open } = require('./lib'); const { helpers } = require('./cabflow');
const SH = '/workspace/ga-cyber/shots/';
(async () => {
  const { page, errors, close } = await open({ phone: true, w: 390, h: 700 }); page.setDefaultTimeout(90000);
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const H = helpers(page, true), W = 'document.getElementById("game").contentWindow', ev = (f, a) => page.evaluate(f, a);
  await ev(() => { localStorage.setItem('neonarcade.tickets', '25'); window.__neonSync(); window.__arcade.play.machines.cyber.credits = 0; });
  await H.goTo('cyberCabinet'); await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 15000 }).catch(() => {});
  await H.press(); await H.zoomToDemo(); await page.waitForTimeout(2500);
  chk(await ev(W => { const w = eval(W); return w.__DEMO && getComputedStyle(w.document.getElementById('cyStage')).display === 'none'; }, W), 'demo: no STAGE badge');
  await ev(() => window.__arcade.play.insertTicket()); await page.tap('#dInsert'); await page.waitForFunction(W => { const w = eval(W); return w.scenes[0] && w.scenes[0].name === 'title'; }, W, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(500);
  const t = await ev(W => { const w = eval(W), s = w.topScene(); return { sc: w.__cyber.scene(), name: s && s.name, badge: getComputedStyle(w.document.getElementById('cyStage')).display, txt: w.document.getElementById('cyStage').textContent, left: w.__TK.left === Infinity, base: w.scenes[0].name }; }, W);
  chk(t.sc === 'play' && t.base === 'title' && t.badge !== 'none' && t.txt === 'STAGE 1' && t.left, 'credit -> title with STAGE 1 badge, no run timer ' + JSON.stringify(t));
  await ev(W => eval(W).startNewGame(), W); await page.waitForFunction(W => { const s = eval(W).topScene(); return s && s.name === 'intro'; }, W, { timeout: 15000 }); await page.waitForTimeout(1800);
  const il = await ev(W => eval(W).INTRO_LINES[0], W);
  chk(/^STAGE 1: VESPER/.test(il), 'intro opens as STAGE 1 ' + il);
  await page.screenshot({ path: SH + 'cyber_stage1_intro_phone.png' });
  await ev(W => eval(W).beginAdventure(), W); await page.waitForTimeout(2500);
  // battle: record the command labels the battle menu draws
  await ev(W => { const w = eval(W); w.__drawn = new Set(); const d = w.drawText; w.drawText = function (c, s) { try { w.__drawn.add(String(s)); } catch (e) {} return d.apply(this, arguments); }; w.startBattle(['slime'], 'gutters', {}); }, W);
  await page.waitForFunction(W => { const w = eval(W); return w.__drawn.has('Fight') && w.__drawn.has('Run'); }, W, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  const b = await ev(W => { const w = eval(W); return { fight: w.__drawn.has('Fight'), run: w.__drawn.has('Run'), auto: w.__drawn.has('Auto') || w.__drawn.has('AUTO') }; }, W);
  chk(b.fight && b.run && !b.auto, 'battle menu has Fight..Run and no AUTO ' + JSON.stringify(b));
  await page.screenshot({ path: SH + 'cyber_battle_noauto_phone.png' });
  for (const k of ['a', 'A', 'Tab', 'F1']) await page.keyboard.press(k);
  const a = await ev(W => { const w = eval(W); w.Auto.enable(); w.Secret.open(); const s = w.topScene(); return { on: w.Auto.on, secret: s && s.name === 'secret' }; }, W);
  chk(!a.on && !a.secret, 'Auto-Runner and the dev menu refuse outside the demo ' + JSON.stringify(a));
  // battle win: +2 tickets (flat, via the session counter) and the whole party fully healed
  const w0 = await ev(W => { const w = eval(W); w.G.party.forEach(m => { m.hp = 1; m.mp = 0; }); w.topScene().enemies.forEach(e => { e.hp = 0; e.alive = false; }); return window.__arcade.play.tickets.total; }, W);
  await page.waitForFunction(([W, t]) => window.__arcade.play.tickets.total >= t + 2, [W, w0], { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
  const wv = await ev(W => { const w = eval(W); return { t: window.__arcade.play.tickets.total, log: w.__TK.log.slice(-3), full: w.G.party.every(m => m.hp === w.CORE.stats(m).mhp && m.mp === w.CORE.stats(m).mmp) }; }, W);
  chk(wv.t === w0 + 2 && wv.full, 'won battle = +2 tickets and party fully restored ' + JSON.stringify(wv));
  await page.screenshot({ path: SH + 'cyber_win2_phone.png' });
  // sound: after a tap the game's AudioContext runs, is unmuted, and the saved mute is not stuck on
  await page.mouse.click(195, 400); await page.waitForTimeout(400);
  const au = await ev(W => { const w = eval(W), A = w.Audio8; let n = 0; const o = A.osc; A.osc = function () { n++; return o.apply(this, arguments); }; try { A.sfx('ok'); } catch (e) {} A.osc = o; return { st: A.ctx && A.ctx.state, muted: A.muted, gain: A.master && A.master.gain.value, saved: w.Store.get('cybercity_mute'), n }; }, W);
  chk(au.st === 'running' && !au.muted && au.gain > 0 && au.saved !== '1' && au.n > 0, 'sound: AudioContext running, unmuted, sfx triggered ' + JSON.stringify(au));
  // big win: a boss milestone pays once per save, un-halved, through the session counter, with the popup
  const t0 = await ev(W => { eval(W).__TK.ev = () => {}; return window.__arcade.play.tickets.total; }, W);   // freeze random drops so only the big win counts
  console.log('t0', t0);
  await ev(W => eval(W).Cov.mark('misc', 'kestrel'), W); await page.waitForTimeout(500);
  const g = await ev(W => { const w = eval(W), el = w.document.getElementById('cyBig'); return { t: window.__arcade.play.tickets.total, ls: +localStorage.getItem('neonarcade.tickets'), on: el.classList.contains('on'), txt: el.textContent, flag: !!w.G.flags.arcBig_kestrel }; }, W);
  chk(g.t === t0 + 30 && g.ls === g.t && g.on && /BIG WIN/.test(g.txt) && /KESTREL/.test(g.txt) && g.flag, 'Kestrel boss = BIG WIN +30 tickets with popup ' + JSON.stringify(g));
  await page.screenshot({ path: SH + 'cyber_bigwin_phone.png' });
  await ev(W => eval(W).Cov.mark('misc', 'kestrel'), W); await page.waitForTimeout(300);
  chk(await ev(() => window.__arcade.play.tickets.total) === t0 + 30, 'the same big win does not pay twice');
  chk(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
