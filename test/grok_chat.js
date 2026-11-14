// t810u: CHAT with Grok + the all-machine tour. Approach -> CHAT button (no overlaps), opening turns Grok to face you and pauses him,
// typed questions get relevant text replies from the offline knowledge base, closing resumes exactly where he was, and one visit
// plays every eligible machine before he returns to the shop (pad), then comes back for another tour. No screenshots.
// NOSHOTS=1 node test/grok_chat.js            (PHONE=0 for desktop only, PHONE=1 phone only; default both)
const { open } = require('./lib');
let ok = true;
const chk = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 700) : '')); if (!c) ok = false; };
const QS = [
  ['hi', /hi|hey|hello/i], ['how do I play sky tower?', /sky tower/i], ['how do i play strike with a friend', /co-op|2-player/i], ['what games are there', /ghost 256.*monkey crossing/i],
  ['tell me a joke', /\?|!/], ['what time is it', /\d:\d\d/], ['what is 12 times 7', /84/], ['how many tickets do i have', /tickets/i], ['what are viking tickets', /berserker/i],
  ['where is the shop', /teleporter|pad/i], ['how do i change my hat', /wardrobe|accessories/i], ['how do I mute the music', /mute/i], ['can i play as an alien', /alien/i],
  ['who are you', /grok/i], ['what are you doing', /play|machine|arcade/i], ['ghots tips', /ghost 256/i], ['how does the claw machine work', /claw/i], ['tetris', /neon bricks/i],
  ['multiplayer?', /10 players|shared/i], ['what is the meaning of life?', /.{20,}/], ['whats the date today', /20\d\d/],
];
async function run(phone) {
  const tag = phone ? 'phone' : 'desktop';
  const o = phone ? await open({ phone: true, w: 844, h: 390 }) : await open({ w: 960, h: 600 });
  const page = o.page;
  await page.waitForFunction(() => window.__shop && window.__grokVisit && window.__grokVisit.ready && window.__grokChat, null, { timeout: 90000 });
  await page.evaluate(() => { const s = document.getElementById('start'); if (s) s.remove(); if (window.__start) window.__start.dismissed = true; });
  // start a visit (fast timings) and step until he is playing his first machine
  const s0 = await page.evaluate(() => {
    const V = window.__grokVisit, Sh = window.__shop; V.fast = true; V.fallAt = 1e9;
    if (V.state !== 'idle' && V.state !== 'done') V.skipTo('done');
    V.start('test'); const n = V.tour.length + 1;
    let g = 0; while (V.state !== 'play' && g++ < 1500) Sh.update(1 / 20);
    return { state: V.state, eligible: V.eligibleCabs().map(c => c.name), tourLen: n, cab: V.cab && V.cab.name };
  });
  chk(s0.state === 'play' && s0.tourLen === s0.eligible.length && s0.eligible.length >= 5, tag + ': visit starts, tour covers every eligible machine', s0);
  // walk the player up to Grok
  const near = await page.evaluate(() => {
    const V = window.__grokVisit, A = window.__arcade, Sh = window.__shop, g = V.grok, inn = V.cab.userData.inward || { x: 0, z: 1 };
    A.monkey.position.set(g.position.x + inn.x * 1.3 + 0.3, A.monkey.position.y, g.position.z + inn.z * 1.3);
    for (let i = 0; i < 4; i++) Sh.update(1 / 30);
    const R = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
    const shown = e => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
    const b = document.getElementById('gcBtn'), on = b.classList.contains('on') && shown(b), br = R(b);
    const others = [...document.querySelectorAll('button, #tix, #vix, #joy, #playUI.on > *')].filter(e => e !== b && shown(e) && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.05)
      .map(e => ({ id: e.id || e.className || e.tagName, r: R(e) })).filter(x => x.r[2] - x.r[0] > 2 && x.r[3] - x.r[1] > 2);
    const hit = others.filter(x => x.r[0] < br[2] - 1 && br[0] < x.r[2] - 1 && x.r[1] < br[3] - 1 && br[1] < x.r[3] - 1).map(x => x.id);
    return { on, br, hit, inView: br[0] >= 0 && br[1] >= 0 && br[2] <= innerWidth && br[3] <= innerHeight, state: V.state, near: V.near };
  });
  chk(near.on && near.inView && !near.hit.length, tag + ': CHAT button shows near Grok, on screen, not over other buttons', near);
  // open
  const before = await page.evaluate(() => { const V = window.__grokVisit; return { state: V.state, tickets: V.tickets, palms: V.palms.L.visible || V.palms.R.visible, facing: +V.facing().toFixed(2) }; });
  if (phone) await page.tap('#gcBtn'); else await page.click('#gcBtn');
  const opened = await page.evaluate(() => {
    const V = window.__grokVisit, Sh = window.__shop, C = window.__grokChat, tk0 = V.tickets;
    for (let i = 0; i < 45; i++) Sh.update(1 / 30);
    const p = document.getElementById('gcP').getBoundingClientRect();
    return { open: C.open, chatting: V.chatting, paused: V.chatPaused, state: V.state, tickets: V.tickets, facing: +V.facing().toFixed(2), palms: V.palms.L.visible || V.palms.R.visible,
      btnHidden: !document.getElementById('gcBtn').classList.contains('on'), panel: [p.left, p.top, p.right, p.bottom].map(Math.round), vw: innerWidth, vh: innerHeight, greet: C.log.length, tk0 };
  });
  chk(opened.open && opened.chatting && opened.paused === before.state && opened.state === before.state, tag + ': CHAT opens and pauses what Grok was doing', { before, opened });
  chk(opened.facing < 0.2 && before.facing > 0.3 && !opened.palms, tag + ': Grok turns to face the player (hands off the controls)', { before: before.facing, after: opened.facing });
  chk(opened.tickets === opened.tk0, tag + ': no tickets tick while chatting (1.5 s of frames)', { atOpen: opened.tk0, after: opened.tickets });
  chk(opened.panel[0] >= 0 && opened.panel[1] >= 0 && opened.panel[2] <= opened.vw && opened.panel[3] <= opened.vh && opened.btnHidden && opened.greet >= 1, tag + ': chat panel on screen with Grok\'s greeting', opened);
  // type a question with Enter
  await page.click('#gcIn'); await page.keyboard.type('how do I play ghost 256'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const typed = await page.evaluate(() => { const C = window.__grokChat, A = window.__arcade, l = C.log; return { last: l[l.length - 1], q: l[l.length - 2], input: C.input.value, keys: Object.keys(A.keys || {}).filter(k => A.keys[k]) }; });
  chk(typed.q && typed.q.who === 'u' && /ghost 256/i.test(typed.q.text) && typed.last.who === 'g' && /maze/i.test(typed.last.text) && typed.input === '' && !typed.keys.length, tag + ': typing + Enter sends; Grok replies in text; keys never reach the game', typed);
  const ans = await page.evaluate((QS) => QS.map(([q]) => window.__grokChat.ask(q)), QS);
  const bad = QS.map(([q, re], i) => ({ q, a: ans[i] })).filter((x, i) => !x.a || x.a.length < 8 || !QS[i][1].test(x.a));
  chk(!bad.length, tag + ': ' + QS.length + ' sample questions all get non-empty, relevant replies', bad);
  const scroll = await page.evaluate(() => { const L = document.getElementById('gcLog'); return { sh: L.scrollHeight, ch: L.clientHeight, st: Math.round(L.scrollTop) }; });
  chk(scroll.sh > scroll.ch && scroll.st + scroll.ch >= scroll.sh - 4, tag + ': reply log scrolls and stays at the newest reply', scroll);
  // close -> resume exactly
  if (phone) await page.tap('#gcX'); else await page.click('#gcX');
  const resumed = await page.evaluate((b) => {
    const V = window.__grokVisit, Sh = window.__shop, C = window.__grokChat;
    for (let i = 0; i < 20; i++) Sh.update(1 / 30);
    const r = { open: C.open, chatting: V.chatting, state: V.state, resumed: V.resumed, palms: V.palms.L.visible || V.palms.R.visible, tk0: V.tickets };
    for (let i = 0; i < 30; i++) Sh.update(1 / 20);
    r.tk1 = V.tickets; r.state1 = V.state; return r;
  }, before);
  chk(!resumed.open && !resumed.chatting && resumed.state === before.state && resumed.resumed >= 1 && resumed.palms === before.palms && (resumed.tk1 > resumed.tk0 || resumed.state1 !== 'play'), tag + ': closing resumes exactly what he was doing (hands back, tickets keep coming)', { before, resumed });
  // Esc closes on desktop; walking away closes too
  if (!phone) {
    const esc = await page.evaluate(async () => { const C = window.__grokChat; C.openChat('visitor'); await new Promise(r => setTimeout(r, 50)); document.getElementById('gcIn').focus(); return C.open; });
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    const esc2 = await page.evaluate(() => { const S = window.__shop; for (let i = 0; i < 20; i++) S.update(1 / 30); return { open: window.__grokChat.open, chatting: window.__grokVisit.chatting }; });
    chk(esc && !esc2.open && !esc2.chatting, tag + ': Esc closes the chat', esc2);
  }
  // the tour: every eligible machine, then back to the pad and away; then another tour later
  const tour = await page.evaluate(() => {
    const V = window.__grokVisit, Sh = window.__shop, A = window.__arcade;
    A.monkey.position.set(0, A.monkey.position.y, 9);   // out of the way
    let g = 0; const seen = []; let last = null;
    const spots = V.eligibleCabs().map(c => { const f = c.userData.front, fc = c.userData.facing; return { x: f.x - fc.x * V.STAND_BACK, z: f.z - fc.z * V.STAND_BACK }; }).concat([{ x: V.pad.x, z: V.pad.z }]);
    let clip = 0, walkPts = 0; const at = [];
    while (V.state !== 'done' && g++ < 30000) { Sh.update(1 / 20); if (V.state === 'play' && V.cab && V.cab.name !== last) { last = V.cab.name; seen.push(last); }
      if (V.state === 'walk' || V.state === 'return') { walkPts++; const x = V.grok.position.x, z = V.grok.position.z; if (!spots.some(p => Math.hypot(x - p.x, z - p.z) < 1.3) && V.pointBlocked(x, z)) { clip++; if (at.length < 6) at.push([+x.toFixed(2), +z.toFixed(2)]); } } }
    const r = { clip, at, walkPts, state: V.state, seen, toured: V.toured.slice(), done: V.machinesDone, eligible: V.eligibleCabs().map(c => c.name), tours: V.tours };
    V.repeatAfter = 1; for (let i = 0; i < 40; i++) Sh.update(1 / 20);
    r.again = V.state; r.tours2 = V.tours;
    V.skipTo('done');
    return r;
  });
  const all = tour.eligible.every(n => tour.seen.includes(n)) && new Set(tour.seen).size === tour.seen.length;
  chk(tour.state === 'done' && all && tour.done === tour.eligible.length, tag + ': Grok plays every machine once before returning to the shop', tour);
  chk(tour.clip === 0 && tour.walkPts > 50, tag + ': the whole tour walks around cabinets and the kiosk, never through them', { clip: tour.clip, at: tour.at, walkPts: tour.walkPts });
  chk(tour.again !== 'done' && tour.tours2 === tour.tours + 1, tag + ': after a rest in the shop he comes back for another tour', { again: tour.again, tours: [tour.tours, tour.tours2] });
  // shop clerk: CHAT sits above SHOP and does not overlap it
  const clerk = await page.evaluate(() => {
    const C = window.__grokChat, sb = document.getElementById('shopBtn'); sb.classList.add('on'); C.setNear('clerk', true);
    const R = e => e.getBoundingClientRect(), a = R(C.btn), b = R(sb);
    const r = { shopCls: C.btn.classList.contains('shop'), on: C.btn.classList.contains('on'), over: a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, above: a.bottom <= b.top, hook: !!C.hooks.clerk };
    C.setNear('clerk', false); sb.classList.remove('on'); return r;
  });
  chk(clerk.shopCls && clerk.on && !clerk.over && clerk.above && clerk.hook, tag + ': shop counter CHAT sits just above SHOP without overlapping', clerk);
  const errs = o.errors.filter(x => !/Failed to load resource/.test(x));
  chk(!errs.length, tag + ': no page errors', errs);
  await o.close();
}
(async () => {
  if (process.env.PHONE !== '0') await run(true);
  if (process.env.PHONE !== '1') await run(false);
  console.log(ok ? 'ALL PASS' : 'FAIL'); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL', e); process.exit(1); });
