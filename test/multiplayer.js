// MULTIPLAYER step 1 + chat with a mocked Supabase Realtime (no network): two devices see each other, a remote monkey moves,
// emotes, chat delivery / bubble / 100-char cap / rate limit / *** filter / HTML stays text / mute, the 10-player cap (11th solo),
// offline + Supabase-down fallback with no errors, tickets not shared. node test/multiplayer.js [phone]
const { open } = require('./lib'); const mock = require('./mpmock');
const PHONE = process.argv[2] === 'phone';
(async () => {
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const sfx = PHONE ? '_phone' : '', O = PHONE ? { phone: true, w: 412, h: 860 } : {};
  const pages = [];
  async function dev(id, init) { const o = await open(O); const p = o.page; p.setDefaultTimeout(60000);
    await p.exposeFunction('__mpRelay', m => { for (const q of pages) if (q !== p) q.evaluate(x => window.__mpRecv && window.__mpRecv(JSON.parse(x)), m).catch(() => {}); });
    await p.addInitScript(([id, fake]) => { window.__mpId = id; if (fake) window.__mpFake = fake; }, [id, init || 0]); await p.addInitScript(mock);
    pages.push(p); await p.reload(); await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp && /on|solo/.test(window.__mp.state), null, { timeout: 60000 });
    return o; }
  const A = await dev('aaaa1111'), B = await dev('bbbb2222'); const a = A.page, b = B.page;
  await a.waitForFunction(() => window.__mp.peers.size === 1, null, { timeout: 10000 }).catch(() => {});
  await b.waitForFunction(() => window.__mp.peers.size === 1, null, { timeout: 10000 }).catch(() => {});
  const s0 = await Promise.all([a, b].map(p => p.evaluate(() => ({ st: window.__mp.state, n: window.__mp.count, peers: [...window.__mp.peers.keys()], pill: document.getElementById('mpN').textContent, name: localStorage.getItem('neonarcade.mpName') }))));
  chk(s0[0].peers[0] === 'bbbb2222' && s0[1].peers[0] === 'aaaa1111' && s0[0].pill === '2/10' && s0[1].pill === '2/10', 'two peers see each other, HUD pill 2/10 ' + JSON.stringify(s0));
  chk(/^Monkey\d{3}$/.test(s0[0].name), 'default name MonkeyNNN stored in neonarcade.mpName (' + s0[0].name + ')');
  // start-screen name + look (player.js galacticarcade.player) drive the tag and the remote monkey's colours
  await a.evaluate(() => localStorage.setItem('galacticarcade.player', JSON.stringify({ name: 'Dave', hat: 'none', hoodie: 'red', fur: 'gold', shoes: 'black' })));
  await b.waitForFunction(() => { const p = window.__mp.peers.get('aaaa1111'); return p && p.name === 'Dave' && p.look && p.look.fur === 'gold'; }, null, { timeout: 15000 }).catch(() => {});
  const lk = await b.evaluate(() => { const p = window.__mp.peers.get('aaaa1111'), r = { name: p.name, tag: p.tag.textContent, cols: {}, cap: null };
    p.g.traverse(o => { if (o.isMesh && o.material && o.material.userData.orig != null) { const k = o.material.userData.orig.toString(16); r.cols[k] = o.material.color.getHex().toString(16); if (o.material.userData.orig === 0xff4f9e) r.cap = o.parent.visible; } }); return r; });
  chk(lk.name === 'Dave' && lk.tag === 'Dave' && lk.cols['4e2a14'] === 'b7862a' && lk.cols['1d2452'] === 'd42a2a' && lk.cols['8a1e2c'] === '1a1a1e' && lk.cap === false, 'remote tag uses galacticarcade.player name and look (gold fur, red hoodie, black shoes, no cap) ' + JSON.stringify({ n: lk.name, t: lk.tag, f: lk.cols['4e2a14'], h: lk.cols['1d2452'], cap: lk.cap }));
  // B walks: A's copy of B follows smoothly
  const pa = await a.evaluate(() => { const m = window.__arcade.monkey; return [m.position.x, m.position.z, m.rotation.y]; });
  await b.evaluate(pa => { const m = window.__arcade.monkey, f = pa[2]; m.position.set(pa[0] + Math.sin(f + Math.PI) * 2.2, 0, pa[1] + Math.cos(f + Math.PI) * 2.2); m.rotation.y = f; }, pa);
  await a.waitForFunction(() => { const p = window.__mp.peers.get('bbbb2222'); return p && p.cur && Math.abs(p.cur.x - p.tgt.x) < 0.05 && p.g.visible; }, null, { timeout: 20000 }).catch(() => {});
  const r1 = await a.evaluate(() => { const p = window.__mp.peers.get('bbbb2222'); return { x: p.g.position.x, tx: p.tgt.x, vis: p.g.visible, m: p.m }; });
  await b.evaluate(() => { window.__arcade.monkey.position.x += 1.5; });
  await a.waitForFunction(x => Math.abs(window.__mp.peers.get('bbbb2222').tgt.x - x - 1.5) < 0.05, r1.tx, { timeout: 10000 }).catch(() => {});
  const mid = await a.evaluate(() => new Promise(res => { const xs = []; const f = () => { xs.push(window.__mp.peers.get('bbbb2222').g.position.x); if (xs.length < 6) requestAnimationFrame(f); else res(xs); }; requestAnimationFrame(f); }));
  await a.waitForFunction(() => { const p = window.__mp.peers.get('bbbb2222'); return Math.abs(p.g.position.x - p.tgt.x) < 0.05; }, null, { timeout: 20000 }).catch(() => {});
  const r2 = await a.evaluate(() => { const p = window.__mp.peers.get('bbbb2222'); return { x: p.g.position.x, tx: p.tgt.x }; });
  const between = mid.some(x => x > r1.x + 0.02 && x < r2.tx - 0.02);
  chk(r1.vis && r1.m === 'room1' && between && Math.abs(r2.x - r2.tx) < 0.05 && Math.abs(r2.tx - r1.tx - 1.5) < 0.05, 'remote monkey moves and glides (in-between frames ' + mid.map(x => x.toFixed(2)).join(',') + ' -> ' + r2.x.toFixed(2) + '), room1');
  const tag = await a.evaluate(() => { const t = window.__mp.peers.get('bbbb2222').tag; return { txt: t.textContent, d: t.style.display }; });
  const rb = await a.evaluate(() => { const g = window.__mp.peers.get('bbbb2222').g, x = n => g.getObjectByName(n); return { ok: !!(x('backpack') && x('backpackFace') && x('tailMesh')), bag: x('backpackBag').material.color.getHexString(), tail: x('tailMesh').material === window.__arcade.monkey.getObjectByName('tailMesh').material }; });
  chk(rb.ok && rb.bag === '1c1c22' && !rb.tail, 'remote monkey wears the backpack (untinted ' + rb.bag + ') and tail (own tinted fur)');
  const bn = await b.evaluate(() => window.__mp.name);
  chk(tag.txt === bn && tag.d === 'block', 'floating name tag shows ' + JSON.stringify(tag));
  // teleporting hides the remote; playing a machine ghosts it
  const bp0 = await b.evaluate(() => { const m = window.__arcade.monkey; const r = [m.position.x, m.position.z]; window.__tp.go(); return r; }); const hid = await a.waitForFunction(() => !window.__mp.peers.get('bbbb2222').g.visible, null, { timeout: 15000 }).then(() => false, () => true);
  await b.waitForTimeout(1500); await b.evaluate(() => { window.__tp.__s = window.__tp.state; window.__tp.state = 'idle'; window.__tp.where = 1; window.__tp.cut = 0; }); await b.evaluate(bp => window.__arcade.monkey.position.set(bp[0], 0, bp[1]), bp0); const back = await a.waitForFunction(() => window.__mp.peers.get('bbbb2222').g.visible, null, { timeout: 15000 }).then(() => true, () => false);
  chk(hid === false && back, 'a teleporting player is hidden, back when idle');
  // t240 HUD: no emoji buttons, CHAT right above the backpack, chat bar bottom-left with LOG / CHAT ON / CLOSE on top of the input
  const hud = await a.evaluate(() => { const R = s => document.querySelector(s) && document.querySelector(s).getBoundingClientRect(); const c = R('#mpChatB'), p = R('#bPack');
    window.__mp.openChat(true); const ch = R('#mpChat'), row = R('#mpLogT'), f = R('#mpForm'); window.__mp.openChat(false);
    return { emo: document.querySelectorAll('[id^=mpE_]').length, above: !!(c && p && c.bottom <= p.top + 2 && c.left >= p.left && c.right <= p.right), left: ch.left < 20 && ch.bottom > innerHeight - 40, rowTop: row.bottom <= f.top + 1, clear: ch.right <= p.left }; });
  chk(hud.emo === 0 && hud.above && hud.left && hud.rowTop && hud.clear, 't240 HUD: emoji buttons gone, CHAT above the backpack, chat bar bottom-left, LOG row on top ' + JSON.stringify(hud));
  // emote (old clients can still send) + chat
  await b.evaluate(() => window.__mp.emote('wave')); await a.waitForTimeout(300);
  chk(await a.evaluate(() => { const p = window.__mp.peers.get('bbbb2222'); return !!p.bub.emo && p.bub.emo.el.textContent === '👋'; }), 'emote (wave) shows as a bubble over the sender on the other device');
  if (PHONE) await b.tap('#mpChatB'); else await b.click('#mpChatB');
  await b.waitForTimeout(300); await b.fill('#mpIn', 'hi from B'); const kz = await b.evaluate(() => window.__arcade.monkey.position.z);
  await b.keyboard.press('KeyW'); await b.keyboard.press('Enter'); await a.waitForTimeout(400);
  const c1 = await a.evaluate(() => { const p = window.__mp.peers.get('bbbb2222'); return { bub: p.bub.chat && p.bub.chat.el.textContent, log: window.__mp.log.map(l => l.text), logTxt: document.getElementById('mpLog').textContent }; });
  chk(/^hi from B/.test(c1.bub) && c1.log.some(t => /^hi from B/.test(t)), 'chat typed in the CHAT box is delivered: bubble over the sender + chat log ' + JSON.stringify(c1));
  chk(Math.abs(await b.evaluate(() => window.__arcade.monkey.position.z) - kz) < 0.01, 'typing in the chat box does not move the monkey');
  await b.waitForTimeout(1000); await b.screenshot({ path: 'shots/mp_chat_b' + sfx + '.png' });
  const ex = await b.evaluate(async () => { const M = window.__mp; M.lastChat = -1e9; const r1 = M.chat('x'.repeat(150)); const r2 = M.chat('second too soon'); await new Promise(r => setTimeout(r, 2100)); M.lastChat = -1e9; const r3 = M.chat('what the fuck <img src=x onerror=alert(1)> http://evil.com'); return [r1.text.length, r2.why, r3.text]; });
  await a.waitForTimeout(400);
  const ax = await a.evaluate(() => ({ last: window.__mp.log.slice(-1)[0].text, imgs: document.querySelectorAll('#mpTags img, #mpLog img, #mpLog a, .mpBub a').length, html: window.__mp.peers.get('bbbb2222').bub.chat.el.innerHTML, n: window.__mp.log.length }));
  chk(ex[0] === 100, '100-character cap (150 typed -> ' + ex[0] + ')');
  chk(ex[1] === 'rate', 'rate limit: a 2nd message within 2 s is refused');
  chk(/what the \*{4} /.test(ex[2]) && /what the \*{4} /.test(ax.last), 'profanity masked with ***: ' + ax.last);
  chk(ax.imgs === 0 && /&lt;img/.test(ax.html) && !/<a /.test(ax.html), 'HTML stays plain text, no links made clickable ' + ax.html.slice(0, 60));
  await a.evaluate(() => window.__mp.peers.get('bbbb2222').tag.click()); await a.waitForTimeout(1600); await b.evaluate(() => { window.__mp.lastChat = -1e9; window.__mp.chat('muted one'); }); await a.waitForTimeout(400);
  const mu = await a.evaluate(() => ({ bub: window.__mp.peers.get('bbbb2222').bub.chat ? window.__mp.peers.get('bbbb2222').bub.chat.el.textContent : null, log: document.getElementById('mpLog').textContent.includes('muted one'), cls: window.__mp.peers.get('bbbb2222').tag.className }));
  chk(mu.bub === null && !mu.log && /mute/.test(mu.cls), 'tap a name tag to mute that player: no bubble, hidden from the log ' + JSON.stringify(mu));
  await a.evaluate(() => window.__mp.toggleMute('bbbb2222'));
  await a.evaluate(() => document.getElementById('mpMuteAll').click()); await a.waitForTimeout(1600); await b.evaluate(() => { window.__mp.lastChat = -1e9; window.__mp.chat('all muted'); }); await a.waitForTimeout(400);
  const ma = await a.evaluate(() => ({ bub: !!window.__mp.peers.get('bbbb2222').bub.chat, log: document.getElementById('mpLog').textContent }));
  chk(!ma.bub && ma.log === 'Chat is off', 'CHAT OFF hides all chat ' + JSON.stringify(ma));
  await a.evaluate(() => document.getElementById('mpMuteAll').click());
  // screenshots: A sees B with name tag + pill; chat bubble shot
  await a.waitForTimeout(1600); await b.evaluate(() => { window.__mp.lastChat = -1e9; window.__mp.chat('Hey! Race you to BLASTER'); }); await a.waitForTimeout(700);
  await a.screenshot({ path: 'shots/mp_chat' + sfx + '.png' });
  await a.waitForTimeout(5200); await a.evaluate(() => window.__mp.openChat(false)); await a.waitForTimeout(300);
  await a.screenshot({ path: 'shots/mp_two_players' + sfx + '.png' });
  // tickets are not shared
  const tk = await a.evaluate(() => { localStorage.setItem('neonarcade.tickets', '77'); window.__neonSync(); return window.__arcade.play.tickets.total; }); await b.waitForTimeout(600);
  const tb = await b.evaluate(() => ({ t: window.__arcade.play.tickets.total, sent: [...new Set(window.__mpMockLog.sent)] }));
  chk(tk === 77 && tb.t !== 77 && tb.sent.every(e => ['st', 'chat', 'emo', 'bye'].includes(e)), 'tickets are not shared (A 77, B ' + tb.t + '); only st/chat/emo/bye go on the wire ' + tb.sent);
  const bw = await a.evaluate(async () => { const s0 = window.__mp.sent; await new Promise(r => setTimeout(r, 2000)); return window.__mp.sent - s0; });
  chk(bw <= 4, 'standing still sends only a keepalive (~1/s): ' + bw + ' in 2 s');
  // tab hidden -> leaves the room (peer gone on the other side), back -> rejoins
  await b.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await a.waitForTimeout(500);
  const gone = await a.evaluate(() => window.__mp.peers.size);
  await b.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await a.waitForTimeout(800);
  chk(gone === 0 && await a.evaluate(() => window.__mp.peers.size) === 1, 'tab hidden -> leaves (peer gone), visible again -> rejoins');
  // t208 robustness: every interruption must end with both players seeing each other again within a few seconds
  const seen = async (x, pid) => x.waitForFunction(pid => { const p = window.__mp.peers.get(pid); return window.__mp.state === 'on' && window.__mp.peers.size === 1 && p && p.cur && performance.now() - p.last < 3000 && p.g.visible && document.getElementById('mpN').textContent === '2/10'; }, pid, { timeout: 8000 }).then(() => true, () => false);
  const backAgain = async (label, t0) => { const ok1 = await seen(a, 'bbbb2222'), ok2 = await seen(b, 'aaaa1111'); const st = await Promise.all([a, b].map(x => x.evaluate(() => ({ st: window.__mp.state, why: window.__mp.reason, n: document.getElementById('mpN').textContent, peers: window.__mp.peers.size, re: window.__mp.lastRejoin })))); chk(ok1 && ok2, label + ' -> both see each other again in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s ' + JSON.stringify(st)); };
  const vis = (x, h) => x.evaluate(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await vis(b, true); await a.waitForTimeout(30000); let t0 = Date.now(); await vis(b, false); await backAgain('backgrounded 30 s, then back', t0);
  await vis(b, true); await vis(b, false); await vis(b, true); t0 = Date.now(); await vis(b, false); await backAgain('quick hide/show x2 (late CLOSED from the old channel must not kill the new one)', t0);
  await b.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); dispatchEvent(new Event('offline')); }); await a.waitForTimeout(3000);
  t0 = Date.now(); await b.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }); dispatchEvent(new Event('online')); }); await backAgain('offline 3 s, then online', t0);
  await b.evaluate(() => window.__mpMockKill()); await a.waitForTimeout(3000); t0 = Date.now(); await b.evaluate(() => { window.__mpMockDead = 0; }); await backAgain('socket died silently (phone sleep, no events), watchdog rejoins', t0);
  for (let i = 1; i <= 3; i++) { await b.reload(); await b.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3 && window.__mp, null, { timeout: 60000 }); t0 = Date.now(); await backAgain('reload #' + i + ' (one entry per device, no ghost)', t0); }
  chk(await a.evaluate(() => [...window.__mp.peers.keys()].join()) === 'bbbb2222', 'after reloads A still has exactly one B');
  const errs = [...A.errors, ...B.errors]; chk(errs.length === 0, 'no page errors (two peers) ' + errs.join(' | '));
  chk([...A.requests, ...B.requests].filter(u => !u.startsWith('http://localhost')).length === 0, 'zero off-site requests (mocked)');
  await A.close(); await B.close(); pages.length = 0;
  // the 11th: 9 others + one more already present -> playing solo
  const F = await dev('cccc3333', 10); const f = F.page; await f.waitForFunction(() => window.__mp.state === 'solo', null, { timeout: 8000 }).catch(() => {});
  const fs = await f.evaluate(() => ({ st: window.__mp.state, full: window.__mp.full, note: document.getElementById('mpNote').textContent, vis: getComputedStyle(document.getElementById('mpNote')).display, peers: window.__mp.peers.size }));
  chk(fs.st === 'solo' && fs.full && fs.note === 'Room full, playing solo' && fs.vis === 'block' && fs.peers === 0, '10 already present: the 11th plays solo with a "Room full, playing solo" note ' + JSON.stringify(fs));
  await F.close(); pages.length = 0;
  const G = await dev('dddd4444', 9); const gs = await G.page.evaluate(() => ({ st: window.__mp.state, n: document.getElementById('mpN').textContent }));
  chk(gs.st === 'on' && gs.n === '10/10', '9 present: the 10th joins (10/10) ' + JSON.stringify(gs)); await G.close();
  // offline: Supabase down (createClient throws) and CDN + local copy both blocked -> solo, game fine, no errors
  for (const mode of ['down', 'blocked']) { const o = await open(O); const p = o.page;
    if (mode === 'down') await p.addInitScript(() => { window.__mpMock = { createClient() { throw new Error('supabase down'); } }; });
    else { await p.addInitScript(() => { window.__mpLive = 1; }); await p.route(/jsdelivr|vendor\/supabase/, r => r.abort()); }
    await p.reload(); await p.waitForFunction(() => window.__arcade && window.__arcade.stats.frames > 3, null, { timeout: 60000 }); await p.waitForTimeout(3500);
    const s = await p.evaluate(() => ({ st: window.__mp.state, why: window.__mp.reason, pill: document.getElementById('mpN').textContent, off: document.getElementById('mpPill').classList.contains('off'), f: window.__arcade.stats.frames, chat: window.__mp.chat('solo hi').ok }));
    const e = o.errors.filter(x => !/Failed to load resource/.test(x));
    chk(s.st === 'off' && s.off && s.pill === '1/10' && s.f > 3 && s.chat && e.length === 0, 'offline fallback (' + mode + '): multiplayer simply off, game runs, no errors ' + JSON.stringify(s) + e.join('|'));
    await o.close(); }
  process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL exception ' + e.message); process.exit(1); });
