// STRIKE cabinet: a loaded credit shows the LIVE world top 10 (real GET from Supabase; every write is aborted), and the board after game over.
// node test/strikeboard.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone', sfx = PH ? '_phone' : '';
(async () => {
  const supa = [];
  const route = async r => { const q = r.request(); supa.push(q.method() + ' ' + q.url());
    if (q.method() === 'GET' && /kfupqtafhaflzaoqtenf\.supabase\.co\/rest\/v1\/scores\?/.test(q.url())) return r.continue();   // read-only live board
    return r.abort(); };   // never post
  const o = await open(PH ? { phone: true, w: 412, h: 860, supa: route } : { w: 1280, h: 720, supa: route }); const { page, errors } = o;
  let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const W = s => page.evaluate(s => document.getElementById('game').contentWindow.eval(s), s);
  await page.evaluate(() => { const p = window.__arcade.play; p.tickets.total = 3; });
  await page.evaluate(() => { const A = window.__arcade, u = A.strikeCab.userData; window.__noAdapt = 1; A.st.fp = false; A.st.vel.set(0, 0, 0); A.monkey.position.set(u.front.x, 0, u.front.z); A.st.face = Math.atan2(u.facing.x, u.facing.z); A.st.lookT = -99; });
  await page.waitForFunction(() => document.getElementById('playUI').classList.contains('on'), null, { timeout: 15000 }); await page.waitForTimeout(400); await page.evaluate(() => window.__arcade.play.press());
  await page.waitForFunction(() => window.__arcade.play.mode === 'game' && document.getElementById('game').classList.contains('on'), null, { timeout: 40000 }); await page.waitForTimeout(1500);
  let s = await W("({ sc: G.scene, demo: !!window.__DEMO, b: __board.on })"); chk(s.sc === 'play' && s.demo && !s.b, 'no credit: attract demo runs ' + JSON.stringify(s));
  await page.evaluate(() => document.getElementById('bTicket').click()); await page.waitForTimeout(500);
  await page.waitForFunction(() => document.getElementById('game').contentWindow.eval("NET.state === 'online' && NET.board && NET.board.length > 0"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  s = await W("({ sc: G.scene, demo: !!window.__DEMO, b: __board.on, st: NET.state, n: (NET.board||[]).length, top: NET.board && NET.board[0] })");
  console.log('live board', JSON.stringify(s));
  chk(s.sc === 'scores' && !s.demo && s.b, 'credit loaded: STRIKE shows the board scene');
  chk(s.st === 'online' && s.n >= 1 && s.top && s.top.n === 'ETM', 'board is the LIVE world top 10 (ETM #1, ' + s.n + ' rows)');
  await page.waitForTimeout(2500);
  chk(await W("G.scene === 'scores'"), 'board stays up while the credit waits');
  await page.screenshot({ path: `shots/strike_board_credit${sfx}.png` });
  await page.evaluate(() => window.__arcade.play.tryPlay()); await page.waitForTimeout(600);
  s = await W("({ sc: G.scene, b: __board.on })"); chk(s.sc === 'play' && !s.b, 'tap to play starts the game from the board');
  await W("G.score = 0; gameOver();");
  await page.waitForFunction(() => document.getElementById('game').contentWindow.STRIKE.G.scene === 'scores', null, { timeout: 20000 }).catch(() => {});
  s = await W("({ sc: G.scene, t: (NET.board||[]).length })"); chk(s.sc === 'scores' && s.t > 0, 'after game over the world top 10 is shown');
  await page.screenshot({ path: `shots/strike_board_over${sfx}.png` });
  await page.waitForFunction(() => window.__arcade.play.sub === 'demo', null, { timeout: 20000 }); await page.waitForTimeout(800);
  s = await W("({ sc: G.scene, demo: !!window.__DEMO })"); chk(s.demo && s.sc === 'play', 'no credit left: back to the attract demo');
  await page.evaluate(() => document.getElementById('bTicket').click()); await page.waitForTimeout(800);
  chk(await W("G.scene === 'scores' && __board.on"), 'next ticket: board again');
  chk(supa.every(u => u.startsWith('GET ')), 'no writes to the leaderboard (' + supa.length + ' GETs)');
  chk(errors.filter(e => !/ERR_FAILED/.test(e)).length === 0, 'no page errors ' + errors.join(' | '));
  await o.close(); process.exit(ok ? 0 : 1);
})();
