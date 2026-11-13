// MULTIPLAYER step 1 (Dave, t194u / t195u): one public shared room, max 10 players, Supabase Realtime (Strike's project) presence +
// broadcast on 'galactic-arcade-public'. Only position / facing / room / animation (~10 Hz, only when changed, 1 s keepalive),
// emotes and live chat travel; tickets, prizes, floor + walls stay on each device. Offline, blocked or Supabase down -> solo, no errors.
// The 11th player plays solo ('Room full, playing solo'). Chat: 100 chars, 1 message / 2 s, *** word filter, plain text only, not stored.
import * as THREE from 'three';
const SB_URL = 'https://kfupqtafhaflzaoqtenf.supabase.co', SB_KEY = 'sb_publishable_IAXEXd619Dq0g50CY-UNRQ_IqWDU4-2';
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js', LOCAL = 'vendor/supabase.js';
export const PV = 2;   // mp protocol version, sent in presence (t208)
export const CHAN = 'galactic-arcade-public', CAP = 10, MAXLEN = 100, RATE_MS = 2000;
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'asshole', 'bastard', 'slut', 'whore', 'fag', 'nigger', 'nigga', 'retard', 'wank', 'twat', 'cock', 'piss'];
const BADRE = new RegExp('\\b\\w*(' + BAD.join('|') + ')\\w*\\b', 'gi');
export const filterText = s => String(s).replace(BADRE, m => '*'.repeat(Math.max(3, m.length)));
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cleanMsg = s => filterText(String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAXLEN));
const EMO = { wave: '👋', heart: '❤️', laugh: '😂' };
const LSg = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, LSs = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function loadScript(src, ms) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.crossOrigin = 'anonymous';
  const t = setTimeout(() => { s.remove(); rej(new Error('timeout')); }, ms); s.onload = () => { clearTimeout(t); res(); }; s.onerror = () => { clearTimeout(t); s.remove(); rej(new Error('load')); }; document.head.appendChild(s); }); }
async function getLib() {
  if (window.__mpMock) return window.__mpMock;
  if (window.supabase && window.supabase.createClient) return window.supabase;
  try { await loadScript(CDN, 8000); } catch (e) { await loadScript(LOCAL, 8000); }   // CDN first (shared browser cache), our own copy as the fallback
  if (!window.supabase || !window.supabase.createClient) throw new Error('no supabase-js'); return window.supabase;
}
// purchase broadcasts (for Arcade Helper's player-alert watcher): announce('buy', { item, cost }) -> event 'buy', payload { i, n, item, cost }
// on the public channel. No-op (false) when multiplayer is off / not connected; never throws. Clients that don't know an event ignore it.
export function announce(type, payload) { try { const m = window.__mp; return !!(m && m.announce && m.announce(type, payload)); } catch (e) { return false; } }
window.__announce = announce;
export function setupMP({ scene, camera, monkey, makeMonkey, makeAlien, st, play, getTp, HALF, Z2, HALL_L, WX }) {
  const id = window.__mpId || (LSg('neonarcade.mpId') || (() => { const v = Math.random().toString(36).slice(2, 10); LSs('neonarcade.mpId', v); return v; })());
  // name + look come from the start screen (player.js, key galacticarcade.player); neonarcade.mpName is only a fallback for no name yet
  let fallback = LSg('neonarcade.mpName'); if (!fallback) { fallback = 'Monkey' + (100 + Math.floor(Math.random() * 900)); LSs('neonarcade.mpName', fallback); }
  const LOOKS = { hat: ['cap', 'crown', 'helmet', 'none'], hoodie: ['navy', 'red', 'blue', 'green', 'yellow'], fur: ['brown', 'gold', 'silver'], shoes: ['red', 'blue', 'black'] };
  function player() { let o = {}; try { o = JSON.parse(localStorage.getItem('galacticarcade.player') || '{}') || {}; } catch (e) {}
    const n = String(o.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14), look = {}, ok = v => typeof v === 'string' && /^[\w-]{1,24}$/.test(v);
    // known fields keep their defaults; new wardrobe values (new hats, glasses, ...) pass through as-is (short plain tokens only), old clients ignore them
    for (const k in LOOKS) look[k] = LOOKS[k].includes(o[k]) || ok(o[k]) ? o[k] : LOOKS[k][0];
    let extra = 0; for (const k in o) if (!(k in LOOKS) && k !== 'name' && /^\w{1,20}$/.test(k) && extra < 12 && (ok(o[k]) || typeof o[k] === 'number' || typeof o[k] === 'boolean')) { look[k] = o[k]; extra++; }
    return { name: n, look }; }
  let name = player().name || fallback, look = player().look;
  setInterval(() => { const pl = player(), n = pl.name || fallback; if (n !== name || JSON.stringify(pl.look) !== JSON.stringify(look)) { name = n; look = pl.look; track(); } }, 2000);
  // wardrobe (player.js) fires 'galacticarcade:look' on change: re-read and rebroadcast at once (presence track + a 'look' broadcast) so remote monkeys update live
  addEventListener('galacticarcade:look', () => { const pl = player(); name = pl.name || fallback; look = pl.look; track(); if (send('look', { i: id, name, look })) M.lookSent = (M.lookSent || 0) + 1; });
  const hue = parseInt(id.slice(0, 6), 36) % 360;
  const M = window.__mp = { id, get name() { return name; }, state: 'off', reason: '', peers: new Map(), count: 1, full: false, sent: 0, recv: 0, bytes: 0, chatMuted: LSg('neonarcade.mpChatMute') === '1',
    muted: new Set(JSON.parse(LSg('neonarcade.mpMuted') || '[]')), log: [], lastChat: -1e9, emote, chat: sendChat, roomOf, CAP, CHAN, filterText, escapeHtml, cleanMsg };
  // ---------- HUD: player pill (top centre), CHAT button (above the backpack, bottom right), chat panel, name panel ----------
  const css = document.createElement('style'); css.textContent = `
#mpPill{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:23;display:flex;align-items:center;gap:5px;font:700 13px 'Courier New',monospace;color:#bff;background:#0a0612cc;border:1px solid #2ae5ff66;border-radius:14px;padding:4px 10px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}
#mpPill.off{color:#889;border-color:#5566}#mpPill i{font-style:normal}
#mpNote{position:fixed;top:calc(max(8px,env(safe-area-inset-top)) + 34px);left:50%;transform:translateX(-50%);z-index:23;font:700 12px 'Courier New',monospace;color:#ffe08a;background:#0a0612dd;border:1px solid #ffb00066;border-radius:8px;padding:4px 9px;display:none;pointer-events:none}
#mpBar{position:fixed;right:calc(max(4px,env(safe-area-inset-right)) + 32px);bottom:calc(max(4px,env(safe-area-inset-bottom)) + 112px);z-index:24;display:flex;flex-direction:column;gap:6px}
#mpBar button{width:40px;height:40px;border-radius:10px;border:1px solid #ff4f9e66;background:#0a0612cc;color:#fff;font:700 18px sans-serif;padding:0;touch-action:manipulation}
#mpBar #mpChatB{font:700 10px 'Courier New',monospace;color:#bff;border-color:#2ae5ff88}
body.ingame #mpPill,body.ingame #mpBar,body.ingame #mpChat,body.ingame #mpTags,body.ingame #mpNote{display:none!important}
#mpChat{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:calc(max(8px,env(safe-area-inset-bottom)) + var(--mpKb,0px));z-index:25;width:min(300px,calc(100vw - 140px));display:none;flex-direction:column;gap:4px;font:12px 'Courier New',monospace}#mpChat.on{display:flex}#mpLog{max-height:150px;overflow-y:auto;background:#0a0612dd;border:1px solid #2ae5ff44;border-radius:8px;padding:4px 6px;color:#dde}
#mpLog.min{display:none}#mpLog b{color:#ffe08a}#mpChat form{display:flex;gap:4px;margin:0}#mpIn{flex:1;min-width:0;font:14px 'Courier New',monospace;background:#05030a;color:#fff;border:1px solid #2ae5ff88;border-radius:6px;padding:6px}
#mpChat button{font:700 11px 'Courier New',monospace;background:#0a0612;color:#bff;border:1px solid #2ae5ff88;border-radius:6px;padding:4px 6px}
#mpTags{position:fixed;inset:0;pointer-events:none;z-index:22;overflow:hidden}
.mpTag{position:absolute;transform:translate(-50%,-100%);font:700 11px 'Courier New',monospace;color:#fff;background:#000a;border-radius:6px;padding:2px 6px;white-space:nowrap;pointer-events:auto;cursor:pointer}
.mpTag.mute{opacity:.5;text-decoration:line-through}.mpBub{position:absolute;transform:translate(-50%,-100%);max-width:200px;font:13px sans-serif;color:#111;background:#fff;border-radius:10px;padding:4px 8px;white-space:normal;word-break:break-word;pointer-events:none;box-shadow:0 0 8px #fff8}
.mpBub.emo{font-size:26px;background:none;box-shadow:none;padding:0}
#mpName{position:fixed;left:50%;top:calc(max(8px,env(safe-area-inset-top)) + 40px);transform:translateX(-50%);z-index:30;display:none;background:#0a0612f0;border:1px solid #2ae5ff88;border-radius:10px;padding:10px;color:#dde;font:12px 'Courier New',monospace;min-width:230px}
#mpName.on{display:block}#mpName input{font:14px 'Courier New',monospace;width:150px;background:#05030a;color:#fff;border:1px solid #2ae5ff88;border-radius:6px;padding:5px}#mpName button{font:700 11px 'Courier New',monospace;background:#0a0612;color:#bff;border:1px solid #2ae5ff88;border-radius:6px;padding:5px 7px;margin:4px 4px 0 0}`;
  document.head.appendChild(css);
  const el = (tag, attrs, parent) => { const e = document.createElement(tag); Object.assign(e, attrs || {}); (parent || document.body).appendChild(e); return e; };
  const pill = el('div', { id: 'mpPill', title: 'Players in the room' }); pill.innerHTML = '<i>👤</i><span id="mpN">1/10</span>';
  const note = el('div', { id: 'mpNote' });
  const bar = el('div', { id: 'mpBar' });
  // t240: emoji buttons removed (Dave); incoming 'emo' events from older clients still show as bubbles
  const chatB = el('button', { id: 'mpChatB', textContent: 'CHAT', title: 'Chat' }, bar);
  const chatP = el('div', { id: 'mpChat' }); chatP.innerHTML = '<div id="mpLog"></div><div style="display:flex;gap:4px"><button id="mpLogT" type="button">LOG</button><button id="mpMuteAll" type="button"></button><button id="mpClose" type="button">CLOSE</button></div><form id="mpForm"><input id="mpIn" maxlength="100" autocomplete="off" enterkeyhint="send" placeholder="Say something (100 max)"><button>SEND</button></form>';
  const logEl = chatP.querySelector('#mpLog'), inp = chatP.querySelector('#mpIn'), muteAll = chatP.querySelector('#mpMuteAll');
  const tags = el('div', { id: 'mpTags' });
  const nameP = el('div', { id: 'mpName' });
  const stop = e => e.stopPropagation();
  for (const n of [inp, nameP]) { n.addEventListener('keydown', stop); n.addEventListener('keyup', stop); }   // typing never drives the monkey
  for (const n of [pill, bar, chatP, nameP]) for (const ev of ['pointerdown', 'touchstart', 'mousedown']) n.addEventListener(ev, stop, { passive: true });
  const muteLbl = () => { muteAll.textContent = M.chatMuted ? 'CHAT OFF' : 'CHAT ON'; };
  muteLbl(); muteAll.onclick = () => { M.chatMuted = !M.chatMuted; LSs('neonarcade.mpChatMute', M.chatMuted ? '1' : '0'); muteLbl(); renderLog(); if (M.chatMuted) for (const p of M.peers.values()) clearBub(p, 'chat'); };
  chatP.querySelector('#mpLogT').onclick = () => logEl.classList.toggle('min');
  const openChat = on => { chatP.classList.toggle('on', on); if (on) { renderLog(); setTimeout(() => inp.focus({ preventScroll: true }), 30); } else { inp.blur(); } };
  M.openChat = openChat;
  chatB.addEventListener('click', e => { e.stopPropagation(); openChat(!chatP.classList.contains('on')); });
  chatP.querySelector('#mpClose').onclick = () => openChat(false);
  chatP.querySelector('#mpForm').addEventListener('submit', e => { e.preventDefault(); const r = sendChat(inp.value); if (r.ok) inp.value = ''; else if (r.why === 'rate') flash('Slow down: 1 message every 2 s'); });
  // t240: keep the bar just above the phone keyboard (visualViewport shrinks when it opens)
  const vv = window.visualViewport, kbFit = () => { const k = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0; chatP.style.setProperty('--mpKb', k + 'px'); M.kb = k; };
  if (vv) { vv.addEventListener('resize', kbFit); vv.addEventListener('scroll', kbFit); } inp.addEventListener('focus', () => setTimeout(kbFit, 300)); kbFit();
  inp.addEventListener('blur', () => { try { window.scrollTo(0, 0); } catch (e) {} });   // phone keyboard closes: snap the page back so the controls sit where they were
  const nameSet = () => LSg('neonarcade.mpNameSet') === '1';
  function showName(on) { if (!on) { nameP.classList.remove('on'); return; }
    nameP.innerHTML = ''; el('div', { textContent: 'PUBLIC ROOM · ' + (M.state === 'on' ? M.count + '/' + CAP + ' players' : M.full ? 'room full, playing solo' : 'offline, playing solo') }, nameP);
    if (player().name) el('div', { textContent: 'You are ' + name + ' (set on the start screen)', style: 'margin-top:6px' }, nameP); else { const row = el('div', { style: 'margin-top:6px' }, nameP); const ni = el('input', { value: name, maxLength: 14, readOnly: nameSet() }, row); ni.addEventListener('keydown', stop); ni.addEventListener('keyup', stop);
    if (!nameSet()) { const sv = el('button', { textContent: 'SAVE NAME' }, nameP); sv.onclick = () => { const v = cleanMsg(ni.value).replace(/[^\w\- ]/g, '').slice(0, 14).trim(); if (v && !/\*/.test(v)) { name = v; LSs('neonarcade.mpName', v); LSs('neonarcade.mpNameSet', '1'); track(); } showName(false); }; el('div', { textContent: 'You can change your name once.', style: 'opacity:.7;margin-top:4px' }, nameP); } }
    const list = el('div', { style: 'margin-top:6px;max-height:120px;overflow:auto' }, nameP);
    for (const p of M.peers.values()) { const r = el('div', { textContent: (M.muted.has(p.id) ? '🔇 ' : '') + p.name, style: 'cursor:pointer;padding:2px 0' }, list); r.onclick = () => { toggleMute(p.id); showName(true); }; }
    el('button', { textContent: 'CLOSE' }, nameP).onclick = () => showName(false); nameP.classList.add('on'); }
  M.flash = (t, ms) => flash(t, ms);
  M.showName = showName; M.setName = v => { name = fallback = v; LSs('neonarcade.mpName', v); track(); };
  pill.addEventListener('click', e => { e.stopPropagation(); showName(!nameP.classList.contains('on')); });
  let flashT = 0; function flash(t, ms) { note.textContent = t; note.style.display = 'block'; clearTimeout(flashT); if (ms !== 0) flashT = setTimeout(() => { note.style.display = M.full ? 'block' : 'none'; if (M.full) note.textContent = 'Room full, playing solo'; }, ms || 2500); }
  function liveCount() { const now = performance.now(); let n = 1; for (const p of M.peers.values()) if (now - p.last < 12000) n++; return Math.min(CAP, n); }
  function pillTxt() { if (M.state === 'on') M.count = liveCount(); pill.querySelector('#mpN').textContent = (M.state === 'on' ? M.count : 1) + '/' + CAP; pill.classList.toggle('off', M.state !== 'on'); }
  pillTxt();
  // ---------- local state -> wire ----------
  function roomOf(p) { if (p.x > WX / 2) return 'white'; if (p.z > -HALF) return 'room1'; if (p.z < -(HALF + HALL_L)) return 'room2'; return 'hall'; }
  // t233: beaming out ('tpo': walk/charge/dissolve), gone ('tp': flash), beaming in ('tpi'). Older clients only hide on 'tp'.
  function animOf() { const tp = getTp && getTp(); const S = window.__start;
    if (tp && tp.beaming) return 'bin';   // t282u: start beam-in (older clients don't know 'bin' and just show the avatar)
    if (S && S.shown && !S.dismissed && !(tp && tp.beamIns)) return 'pre';   // t282u: still on the start screen before first Play: hidden for others
    if (tp && tp.state !== 'idle') return tp.state === 'remat' ? 'tpi' : tp.state === 'flash' ? 'tp' : 'tpo';
    if (play.mode !== 'walk' && play.cur) return (play.cur.key === 'roadster' || play.cur.key === 'deadsignal' ? 'seat:' : 'play:') + play.cur.key;
    if (window.__neonBricks && window.__neonBricks.playing) return 'nb';   // t781u: playing NEON BRICKS in the window: others see me fade out too (older clients just show me idle)
    if (st.fly && st.fly.air) return st.fly.thrust ? 'fly' : 'glide';   // same position packet; 'fly' is powered exhaust, 'glide' is the unpowered descent pose
    if (st.jump) return 'jump'; return st.speed > 0.15 ? 'walk' : 'idle'; }
  const r2 = v => Math.round(v * 100) / 100;
  // t753u cabinet presence: when I start a machine, remember when (wall clock) so every client orders the two players at a cabinet the same way
  let playKey = '', playSince = 0;
  function myPlay() { const a = animOf(), k = /^play:/.test(a) ? a.slice(5) : ''; if (k !== playKey) { playKey = k; playSince = k ? Date.now() : 0; } return k; }
  function laserSnap() { try { const R = window.__roomFire; return R && R.laserSnap ? R.laserSnap() : undefined; } catch (e) { return undefined; } }
  function snap() { const p = monkey.position, a = animOf(); myPlay(); return { i: id, x: r2(p.x), y: r2(p.y), z: r2(p.z), r: Math.round(monkey.rotation.y * 100) / 100, m: roomOf(p), a, ps: playKey ? playSince : undefined, gb: window.__minigolf && window.__minigolf.ballSnap ? window.__minigolf.ballSnap() : undefined, lz: laserSnap() }; }   // t275u gb; t798u lz: charge / beam
  let ch = null, lib = null, client = null, lastSent = '', lastAt = 0, sendTimer = 0, joinedAt = 0, retry = 0, retryT = 0, joinT = 0, gen = 0;
  function send(event, payload) { if (!ch || M.state !== 'on') return false; try { const r = ch.send({ type: 'broadcast', event, payload }); if (r && r.catch) r.catch(() => {}); } catch (e) { return false; } M.sent++; M.bytes += JSON.stringify(payload).length; return true; }
  function tick() { if (M.state !== 'on') return; const s = snap(), j = JSON.stringify(s), now = performance.now();
    if (j !== lastSent || now - lastAt > 1000) { lastSent = j; lastAt = now; send('st', s); } }
  function track() { if (ch && M.state === 'on') try { const r = ch.track({ id, name, hue, look, at: joinedAt, pv: PV }); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  // ---------- remote monkeys ----------
  // remote look: player.js palette (hoodie / fur / shoes recolour the monkey's original material colours; hat: cap or none);
  // without a look, a hue tint. The backpack is never tinted.
  const PAL = { hoodie: { navy: [0x1d2452, 0x141a3a], red: [0xd42a2a, 0x7a1414], blue: [0x2b62e8, 0x173a8a], green: [0x2fae3a, 0x16601c], yellow: [0xf2c418, 0x9a7a08] },
    fur: { brown: [0x4e2a14, 0xd9a779], gold: [0xb7862a, 0xf3d79a], silver: [0x8d939c, 0xe4e7ec] }, shoes: { red: [0x8a1e2c, 0xf1e8d6], blue: [0x1f4fbf, 0xeaf0ff], black: [0x1a1a1e, 0x4a4a52] } };
  function own(root) { root.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.userData.orig = o.material.color.getHex(); } }); }
  function bodyOf(lk) { return (lk && lk.char === 'alien' && typeof makeAlien === 'function') ? makeAlien() : makeMonkey(); }
  function ensureBody(p, lk) {
    const want = (lk && lk.char === 'alien') ? 'alien' : 'monkey';
    if (p.kind === want) return;
    const vis = p.g.visible, pos = p.g.position.clone(), rot = p.g.rotation.clone(), nm = p.g.name;
    scene.remove(p.g); p.g.traverse(o => { if (o.isMesh && o.material && o.material.dispose) o.material.dispose(); });
    const g = bodyOf(lk); g.name = nm; own(g); g.position.copy(pos); g.rotation.copy(rot); g.visible = vis; scene.add(g);
    p.g = g; p.kind = want; p.thG = null; p.th = []; p.top = topOf(p.g);
  }
  function paint(p, meta) { const lk = meta && meta.look && typeof meta.look === 'object' ? meta.look : null, key = lk ? JSON.stringify(lk) : 'h' + ((meta && meta.hue) || 0); if (p.lookKey === key) return; p.lookKey = key;
    ensureBody(p, lk);
    const map = {}; if (lk) { const H = PAL.hoodie[lk.hoodie] || PAL.hoodie.navy, F = PAL.fur[lk.fur] || PAL.fur.brown, S2 = PAL.shoes[lk.shoes] || PAL.shoes.red;
      map[0x1d2452] = H[0]; map[0x141a3a] = H[1]; map[0x4e2a14] = F[0]; map[0xd9a779] = F[1]; map[0x8a1e2c] = S2[0]; map[0xf1e8d6] = S2[1]; }
    const h = (meta && meta.hue) || 0; let cap = null;
    p.g.traverse(o => { if (!o.isMesh || !o.material || o.material.userData.orig == null) return; const orig = o.material.userData.orig, c = o.material.color; c.setHex(orig);
      if (orig === 0xff4f9e && o.parent && o.parent.isGroup) cap = o.parent; if (o.userData.noTint) return;
      if (lk) { if (map[orig] != null) c.setHex(map[orig]); } else { const hsl = {}; c.getHSL(hsl); if (hsl.s > 0.25) c.setHSL((hsl.h + h / 360) % 1, hsl.s, hsl.l); } });
    if (cap) cap.visible = !lk || lk.hat === 'cap'; p.look = lk;
    // player.js wardrobe (Chief): new hats / glasses etc. on the remote monkey; materials already carry userData.orig (own())
    if (lk) try { if (window.__wardrobe && typeof window.__wardrobe.applyRemote === 'function') window.__wardrobe.applyRemote(p.g, lk); } catch (e) {}
    p.thG = null; p.flameA = ''; p.top = topOf(p.g); }
  M.paint = paint;
  // name tag height: just above the highest VISIBLE part (tallest hat: cowboy / party / halo), so it never covers the face or glasses
  const TB = new THREE.Box3(), GBV = new THREE.Vector3();
  function topOf(g) { g.updateMatrixWorld(true); let top = -1e9; const seen = o => { for (let q = o; q && q !== g; q = q.parent) if (!q.visible) return false; return true; };
    g.traverse(o => { if (o.isMesh && o.geometry && seen(o)) { TB.setFromObject(o); if (TB.max.y > top) top = TB.max.y; } }); return top > -1e8 ? Math.max(1.75, top - g.position.y + 0.12) : 1.75; }
  // t741u laser pistol shots (roomfire.js): cosmetic bolts only, ~3/s max per player, drawn on everyone else's screen; no hits, no PVP
  let zapAt = 0; const zapIn = new Map(), num3 = a => Array.isArray(a) && a.length === 3 && a.every(v => typeof v === 'number' && isFinite(v) && Math.abs(v) < 500);
  M.zap = (o, d, c, k) => { const now = performance.now(); if (now - zapAt < 200 || !num3(o) || !num3(d)) return false; zapAt = now;
    const r = v => Math.round(v * 1000) / 1000, kk = (typeof k === 'number' && isFinite(k)) ? Math.max(0, Math.min(0.999, k)) : 0;
    const ok = send('zap', { i: id, o: o.map(r), d: d.map(r), c: c === 'red' ? 'red' : 'cyan', k: kk }); if (ok) M.zapSent = (M.zapSent || 0) + 1; return ok; };
  function onZap(pl) { if (!pl || !pl.i || pl.i === id || !M.peers.has(pl.i) || !num3(pl.o) || !num3(pl.d)) return; const now = performance.now(); if (now - (zapIn.get(pl.i) || 0) < 150) return; zapIn.set(pl.i, now); M.recv++;
    M.zapRecv = (M.zapRecv || 0) + 1; const kk = (typeof pl.k === 'number' && isFinite(pl.k)) ? Math.max(0, Math.min(0.999, pl.k)) : 0;
    try { if (window.__roomFire) window.__roomFire.spawn(pl.o, pl.d, pl.c === 'red' ? 'red' : 'cyan', true, kk); } catch (e) {} }
  function onLook(pl) { if (!pl || !pl.i || pl.i === id || !pl.look || typeof pl.look !== 'object') return; const p = M.peers.get(pl.i); if (!p) return; M.recv++;
    paint(p, { look: pl.look }); if (pl.name) { p.name = String(pl.name).slice(0, 14); p.tag.textContent = p.name; } }
  function peer(pid, meta) { let p = M.peers.get(pid);
    if (!p) { const g = makeMonkey(); g.name = 'remoteMonkey_' + pid; own(g); scene.add(g); g.visible = false;
      const tag = el('div', { className: 'mpTag' }, tags); tag.addEventListener('click', e => { e.stopPropagation(); toggleMute(pid); });
      p = { id: pid, name: 'Monkey', g, tag, cur: null, tgt: null, a: 'idle', m: 'room1', last: performance.now(), phase: 0, phase0: (parseInt(pid.slice(-3), 36) || 0) % 7, bub: {}, kind: 'monkey' }; M.peers.set(pid, p); }
    if (meta) paint(p, meta); else if (!p.lookKey) paint(p, { hue: 0 }); if (meta && meta.name) p.name = String(meta.name).slice(0, 14); p.tag.textContent = p.name; p.tag.classList.toggle('mute', M.muted.has(pid)); return p; }
  function drop(pid) { const p = M.peers.get(pid); if (!p) return; if (p.ball) { scene.remove(p.ball); p.ball.geometry.dispose(); p.ball.material.dispose(); } scene.remove(p.g); p.g.traverse(o => { if (o.isMesh) o.material.dispose(); }); p.tag.remove(); for (const k in p.bub) p.bub[k].el.remove(); M.peers.delete(pid); skyIn.delete(pid); strikeIn.delete(pid); try { if (window.__roomFire && window.__roomFire.clearPeer) window.__roomFire.clearPeer(pid); } catch (e) {} }
  function toggleMute(pid) { if (M.muted.has(pid)) M.muted.delete(pid); else M.muted.add(pid); LSs('neonarcade.mpMuted', JSON.stringify([...M.muted])); const p = M.peers.get(pid); if (p) { p.tag.classList.toggle('mute', M.muted.has(pid)); if (M.muted.has(pid)) clearBub(p, 'chat'); } renderLog(); }
  M.toggleMute = toggleMute;
  function onState(s) { if (!s || s.i === id || typeof s.x !== 'number') return; M.recv++; const p = peer(s.i); p.last = performance.now();
    p.tgt = { x: s.x, y: s.y || 0, z: s.z, r: s.r || 0 }; if (!p.cur) p.cur = Object.assign({}, p.tgt); p.a = String(s.a || 'idle'); p.m = String(s.m || 'room1');
    p.gb = Array.isArray(s.gb) && s.gb.length === 3 && s.gb.every(Number.isFinite) ? s.gb : null; p.ps = Number.isFinite(s.ps) && s.ps > 0 ? s.ps : undefined;
    p.lz = s.lz && typeof s.lz === 'object' && num3(s.lz.o) && num3(s.lz.d) ? { k: Math.max(0, Math.min(1, +s.lz.k || 0)), b: Math.max(0, +s.lz.b || 0), o: s.lz.o, d: s.lz.d, h: s.lz.h === 'red' ? 'red' : 'cyan' } : null;
    try { if (window.__roomFire && window.__roomFire.syncPeer) window.__roomFire.syncPeer(s.i, p.lz); } catch (e) {} }
  // ---------- t753u: cabinet presence ----------
  // A player inside a machine still stands in front of it for everyone else, in Grok's playing pose (leaning in, one hand
  // circling the stick, the other tapping buttons). Two at one machine stand side by side: the one who started first
  // shifts to their left, the second takes the right; when one leaves the other glides back to the centre. Max 2 per machine.
  // Every client works the slots out itself from the room state ('play:<key>' + start time), so all screens agree.
  const STAND_BACK = 0.42, SIDE = 0.4, CAB_MAX = 2;
  function cabOf(key) { const m = play && play.machines && play.machines[key]; return m && m.cab && m.cab.userData && m.cab.userData.front ? m.cab : null; }
  function atCab(key) { const L = [], now = performance.now();
    if (myPlay() === key) L.push({ id, ps: playSince });
    for (const p of M.peers.values()) if (p.a === 'play:' + key && now - p.last < 10000) L.push({ id: p.id, ps: (Number.isFinite(p.ps) && p.ps > 0) ? p.ps : 9e15 });
    L.sort((a, b) => (a.ps || 9e15) - (b.ps || 9e15) || (a.id < b.id ? -1 : 1)); return L; }
  function slotOf(key, pid) { const cab = cabOf(key); if (!cab) return null; const L = atCab(key).slice(0, CAB_MAX), i = L.findIndex(q => q.id === pid); if (i < 0) return null;
    const f = cab.userData.front, fc = cab.userData.facing || { x: 0, z: -1 }, lx = fc.z, lz = -fc.x, off = L.length === 2 ? (i === 0 ? SIDE : -SIDE) : 0;   // (lx, lz) = the player's left
    return { x: f.x - fc.x * STAND_BACK + lx * off, z: f.z - fc.z * STAND_BACK + lz * off, r: Math.atan2(fc.x, fc.z), i, n: L.length }; }
  M.cabPlayers = key => atCab(key).map(q => q.id); M.cabCount = key => atCab(key).length; M.cabFull = key => atCab(key).filter(q => q.id !== id).length >= CAB_MAX; M.slotOf = slotOf; M.CAB_MAX = CAB_MAX;
  function playPose(p, u, g, t) {   // Grok's cabinet pose (grokvisit.js animatePlay), on the monkey / alien rig
    p.posed = true; g.rotation.x = 0.07; g.rotation.y += Math.sin(t * 1.3 + p.phase0) * 0.04;
    if (u.legs) { u.legs[0].leg.rotation.x = 0; u.legs[1].leg.rotation.x = 0; }
    if (u.arms && u.arms.length > 1) { const S = u.arms[0], B = u.arms[1];
      S.sh.rotation.x = -1.18 + Math.sin(t * 6.2) * 0.08; S.sh.rotation.z = -S.sd * 0.24 + Math.cos(t * 4.8) * 0.07; S.el.rotation.x = -0.45;   // stick hand circles
      B.sh.rotation.x = -1.16 - Math.max(0, Math.sin(t * 14 + p.phase0)) * 0.12; B.sh.rotation.z = -B.sd * 0.24; B.el.rotation.x = -0.5 - Math.max(0, Math.sin(t * 14 + p.phase0)) * 0.12; }   // button hand taps
    if (u.head) u.head.rotation.x = 0.04 + Math.sin(t * 2) * 0.03; }
  function unpose(p, u, g) { p.posed = false; g.rotation.x = 0; if (u.arms) for (const a of u.arms) { a.sh.rotation.z = 0; a.el.rotation.x = 0; } if (u.head) u.head.rotation.x = 0; }
  // ---------- t753u: Sky Tower shared climb relay (the cabinet iframe talks through parent.__mp.sky) ----------
  const skyIn = new Map(); let skyAt = 0;
  const fin = v => typeof v === 'number' && isFinite(v) && Math.abs(v) < 1e5;
  M.sky = { peers: skyIn,
    send(s) { const now = performance.now(); if (now - skyAt < 90 || !s || !fin(s.x) || !fin(s.y) || !fin(s.z)) return false; skyAt = now;
      const ok = send('sky', Object.assign({ i: id }, s)); if (ok) M.skySent = (M.skySent || 0) + 1; return ok; },
    who(pid) { const p = M.peers.get(pid); return p ? { name: p.name, look: p.look || null, a: p.a } : null; },
    rivals() { const now = performance.now(), out = []; for (const [pid, r] of skyIn) { const p = M.peers.get(pid); if (!p || now - r.at > 2500 || p.a !== 'play:skytower') continue; out.push({ id: pid, s: r.s, at: r.at, name: p.name, look: p.look || null }); } return out; } };
  function onSky(pl) { if (!pl || !pl.i || pl.i === id || !M.peers.has(pl.i) || !fin(pl.x) || !fin(pl.y) || !fin(pl.z)) return; M.recv++; M.skyRecv = (M.skyRecv || 0) + 1;
    const s = { x: pl.x, y: pl.y, z: pl.z, r: fin(pl.r) ? pl.r : 0, p: Math.max(1, Math.min(99, pl.p | 0)), h: Math.max(0, Math.min(3, pl.h | 0)), w: pl.w ? 1 : 0, wt: fin(pl.wt) ? pl.wt : 0, f: pl.f ? 1 : 0, a: pl.a ? 1 : 0, c: pl.c === 'alien' ? 'alien' : 'monkey', run: pl.run ? 1 : 0,
      zn: pl.zn | 0, z0: Array.isArray(pl.z0) && (pl.z0.length === 7 || pl.z0.length === 8) && pl.z0.every(v => typeof v === 'number' && isFinite(v)) ? pl.z0 : null,
      ck: fin(pl.ck) ? Math.max(0, Math.min(1, pl.ck)) : 0, bt: fin(pl.bt) ? Math.max(0, pl.bt) : 0, bo: nums(pl.bo, 3), bd: nums(pl.bd, 3),
      cy: fin(pl.cy) ? pl.cy : 0, nt: fin(pl.nt) ? Math.max(0, Math.min(1, pl.nt)) : 0, fc: nums(pl.fc, 6), bm: lists(pl.bm, 4, 6) };   // t754u live cabinet; t798u ck/bt/bo/bd charge+beam
    const old = skyIn.get(pl.i), pd = lists(pl.pd, 10, 7);
    s.pd = pd || (old && old.s.pd) || null;   // platforms come every few packets: keep the last set
    skyIn.set(pl.i, { s, at: performance.now() }); }
  function nums(a, n) { return Array.isArray(a) && a.length === n && a.every(v => typeof v === 'number' && isFinite(v) && Math.abs(v) <= 0xffffff) ? a : null; }   // (brick colours are 24-bit ints)
  function lists(a, max, n) { if (!Array.isArray(a) || !a.length || a.length > max) return null; for (const b of a) if (!nums(b, n)) return null; return a; }
  // t754u: who is playing Sky Tower at its cabinet right now (live climbs to draw on the screen), in slot order
  M.sky.feed = (key) => { const now = performance.now(), out = []; for (const [pid, r] of skyIn) { const p = M.peers.get(pid); if (!p || now - r.at > 2500 || p.a !== 'play:' + key || !r.s.run) continue; const sl = slotOf(key, pid); out.push({ id: pid, name: p.name || 'Player', s: r.s, slot: sl ? sl.i : 0, look: p.look || null }); } return out.sort((a, b) => a.slot - b.slot); };
  // t789u/t790u: Strike 2-player online co-op relay (the cabinet iframe talks through parent.__mp.strike)
  const strikeIn = new Map(); let strikeAt = 0;
  function onStrike(pl) {
    if (!pl || !pl.i || pl.i === id) return;
    M.recv++; M.strikeRecv = (M.strikeRecv || 0) + 1;
    strikeIn.set(pl.i, { s: pl, at: performance.now() });
    try { if (M.strike && M.strike.on) M.strike.on(pl); } catch (e) {}
  }
  M.strike = { peers: strikeIn,
    send(s) { const now = performance.now(); if (now - strikeAt < 70 || !s || typeof s !== 'object') return false; strikeAt = now;
      const ok = send('strike', Object.assign({ i: id }, s)); if (ok) M.strikeSent = (M.strikeSent || 0) + 1; return ok; },
    last(pid) { const r = strikeIn.get(pid); return r && performance.now() - r.at < 2500 ? r.s : null; },
    others() { const now = performance.now(), out = [];
      for (const [pid, r] of strikeIn) {
        if (now - r.at > 2500) continue;
        const p = M.peers.get(pid);
        if (p && p.a && p.a !== 'play:strike') continue;   // t797u: presence lag must not drop a live strike packet
        const sl = p ? slotOf('strike', pid) : null;
        out.push({ id: pid, name: (p && p.name) || 'Player', s: r.s, slot: sl ? sl.i : 1, at: r.at });
      }
      return out.sort((a, b) => a.slot - b.slot); } };

  // every machine: names of the other players at it (for a LIVE badge on cabinets that cannot stream their game)
  M.cabLive = (key) => { const out = []; for (const p of M.peers.values()) if (p.a === 'play:' + key) out.push(p.name || 'Player'); return out; };
  // ---------- bubbles (emotes / chat), chat log ----------
  const me = { g: monkey, bub: {}, id };
  function bubble(p, kind, text, ms) { clearBub(p, kind); const b = el('div', { className: 'mpBub' + (kind === 'emo' ? ' emo' : ''), textContent: text }, tags); p.bub[kind] = { el: b, until: performance.now() + ms }; }
  function clearBub(p, kind) { if (p.bub[kind]) { p.bub[kind].el.remove(); delete p.bub[kind]; } }
  function emote(k) { if (!EMO[k]) return false; bubble(me, 'emo', EMO[k], 2500); send('emo', { i: id, e: k }); return true; }
  function addLog(who, pid, text) { M.log.push({ who, pid, text, at: Date.now() }); if (M.log.length > 20) M.log.shift(); renderLog(); }
  function renderLog() { logEl.textContent = ''; if (M.chatMuted) { el('div', { textContent: 'Chat is off', style: 'opacity:.6' }, logEl); return; }
    for (const l of M.log) { if (M.muted.has(l.pid)) continue; const d = el('div', {}, logEl); el('b', { textContent: l.who + ': ' }, d); d.appendChild(document.createTextNode(l.text)); }
    logEl.scrollTop = logEl.scrollHeight; }
  function announce(type, payload) { try { if (M.state !== 'on' || typeof type !== 'string' || !type) return false; const o = payload || {};
      return send(type, { i: id, n: name, item: String(o.item == null ? '' : o.item).slice(0, 60), cost: Number.isFinite(+o.cost) ? +o.cost : 0 }) !== false; } catch (e) { return false; } }
  M.announce = announce;
  function sendChat(raw) { const now = performance.now(), text = cleanMsg(raw); if (!text) return { ok: false, why: 'empty' };
    if (now - M.lastChat < RATE_MS) return { ok: false, why: 'rate' }; M.lastChat = now;
    bubble(me, 'chat', text, 5000); addLog(name, id, text); send('chat', { i: id, n: name, t: text }); return { ok: true, text }; }
  function onChat(c) { if (!c || c.i === id) return; const p = M.peers.get(c.i); const text = cleanMsg(c.t); if (!text) return;
    if (p && p.lastChat && performance.now() - p.lastChat < RATE_MS * 0.75) return; if (p) p.lastChat = performance.now();   // drop floods from modified clients
    addLog(p ? p.name : String(c.n || 'Monkey').slice(0, 14), c.i, text); if (p && !M.chatMuted && !M.muted.has(c.i)) bubble(p, 'chat', text, 5000); }
  function onEmo(c) { const p = c && M.peers.get(c.i); if (p && EMO[c.e] && !M.muted.has(c.i)) bubble(p, 'emo', EMO[c.e], 2500); }
  // ---------- presence: count, cap, joins / leaves ----------
  function onSync() { if (!ch || M.state !== 'on') return; let st0; try { st0 = ch.presenceState(); } catch (e) { return; }
    const all = []; for (const k in st0) { const m = st0[k] && st0[k][0]; if (m) all.push({ key: k, id: m.id || k, name: m.name, hue: m.hue, look: m.look, at: m.at || 0 }); }
    all.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
    const first = all.slice(0, CAP), mine = first.some(p => p.id === id);
    if (!mine && all.length >= CAP && all.some(p => p.id === id)) { goSolo('full'); return; }
    if (!all.some(p => p.id === id) && all.length >= CAP) { goSolo('full'); return; }
    const keep = new Set(); for (const p of first) if (p.id !== id) { keep.add(p.id); peer(p.id, p); }
    for (const pid of [...M.peers.keys()]) if (!keep.has(pid)) drop(pid);
    pillTxt(); }
  function goSolo(why) { M.full = why === 'full'; leave(); M.state = 'solo'; M.reason = why; pillTxt(); if (M.full) flash('Room full, playing solo', 0); }
  async function join() {
    retryT = 0; if (M.state === 'on' || M.state === 'joining' || M.full || document.hidden) return; M.state = 'joining'; joinT = performance.now(); const g = ++gen;
    try { lib = lib || await getLib(); client = client || lib.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } }); }
    catch (e) { M.state = 'off'; M.reason = 'offline: ' + (e && e.message); pillTxt(); return; }
    joinedAt = joinedAt || Date.now();
    // t211: supabase-js hands back an existing channel with the same topic if removeChannel() has not finished; .on() on it throws
    // "cannot add presence callbacks after subscribe()" and every rejoin then fails forever. Remove leftovers first; if it still throws, rebuild the client.
    try { await Promise.all(client.getChannels().filter(c => c.topic === 'realtime:' + CHAN).map(c => client.removeChannel(c))); } catch (e) {}
    if (g !== gen || M.state !== 'joining') return;   // a leave / newer join happened while we waited: that one owns the seat
    try {
      const mine = ch = client.channel(CHAN, { config: { presence: { key: id }, broadcast: { self: false, ack: false } } });
      M.joins = (M.joins || 0) + 1;
      ch.on('presence', { event: 'sync' }, onSync)
        .on('broadcast', { event: 'st' }, m => onState(m && m.payload)).on('broadcast', { event: 'chat' }, m => onChat(m && m.payload)).on('broadcast', { event: 'emo' }, m => onEmo(m && m.payload))
        .on('broadcast', { event: 'look' }, m => onLook(m && m.payload)).on('broadcast', { event: 'zap' }, m => onZap(m && m.payload)).on('broadcast', { event: 'sky' }, m => onSky(m && m.payload)).on('broadcast', { event: 'strike' }, m => onStrike(m && m.payload))
        .on('broadcast', { event: 'bye' }, m => { if (m && m.payload) drop(m.payload.i); });
      // peek at presence before taking a seat: if 10 are already in, stay solo without counting as an 11th
      ch.subscribe(async status => {
        if (ch !== mine) return;   // t208: a late CLOSED / error from a channel we already removed must not tear down the new one
        if (status === 'SUBSCRIBED') { M.state = 'on'; M.reason = ''; retry = 0; await new Promise(r => setTimeout(r, window.__mpMock ? 50 : 700));
          let n = 0; try { const s0 = ch.presenceState(); n = Object.keys(s0).filter(k => k !== id).length; } catch (e) {}
          if (ch !== mine) return; if (n >= CAP) { goSolo('full'); return; } track(); lastSent = ''; tick(); pillTxt(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { if (M.state === 'solo') return; M.reason = status; leave(); M.state = 'off'; pillTxt();
          clearTimeout(retryT); retryT = setTimeout(join, Math.min(15000, 1000 * Math.pow(2, retry++))); } });
    } catch (e) { M.state = 'off'; M.reason = 'error: ' + (e && e.message); ch = null; pillTxt(); if (/after `subscribe\(\)`/.test(M.reason)) { try { client.removeAllChannels(); } catch (x) {} client = null; } clearTimeout(retryT); retryT = setTimeout(join, Math.min(15000, 1000 * Math.pow(2, retry++))); }
  }
  function leave() { gen++; if (ch) { try { send('bye', { i: id }); } catch (e) {} const c = ch; ch = null; try { c.untrack && c.untrack(); } catch (e) {} try { client.removeChannel(c); } catch (e) {} }
    for (const pid of [...M.peers.keys()]) drop(pid); if (M.state === 'on' || M.state === 'joining') M.state = 'off'; M.count = 1; pillTxt(); }
  M.join = join; M.leave = leave;
  // t208 robustness: leave while hidden / offline, and always come back (visible, online, watchdog), never give up after N retries
  const disabled = () => M.reason === 'disabled';
  const want = () => !disabled() && !M.full && !document.hidden && navigator.onLine !== false;
  function rejoin(why) { if (!want()) return; M.rejoins = (M.rejoins || 0) + 1; M.lastRejoin = why; if (ch || M.state === 'on' || M.state === 'joining') leave(); M.state = 'off'; retry = 0; join(); }
  // t797u: brief hidden blips (upright Strike going fullscreen / orientation lock on a phone) used to leave() at once,
  // drop peers, and clear the other ship. Wait a few seconds so a flicker does not kill co-op; still free the slot if they stay in the background.
  let hideT = 0;
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (M.state === 'on' || M.state === 'joining') { M.paused = true; clearTimeout(hideT); hideT = setTimeout(() => { if (document.hidden && (M.state === 'on' || M.state === 'joining')) leave(); }, 5000); } } else { clearTimeout(hideT); hideT = 0; M.paused = false; if (M.state !== 'on') rejoin('visible'); } });
  addEventListener('online', () => rejoin('online'));
  addEventListener('offline', () => { if (ch) { leave(); M.state = 'off'; M.reason = 'offline'; pillTxt(); } });
  addEventListener('pageshow', e => { if (e.persisted) rejoin('bfcache'); });
  setInterval(() => { if (!want()) return; const now = performance.now();
    if (M.state === 'off' && !retryT) { if (/^offline:|^error:/.test(M.reason) && now - joinT < 30000) return; return rejoin('watchdog-off'); }
    if (M.state === 'joining' && now - joinT > 15000) return rejoin('watchdog-stuck');
    if (M.state !== 'on' || !ch) return;
    if (ch.state && ch.state !== 'joined' && ch.state !== 'joining') return rejoin('watchdog-' + ch.state);
    let st0 = null; try { st0 = ch.presenceState(); } catch (e) {}
    if (st0 && !st0[id]) track();   // our own presence went missing (server restart / socket swap): re-track
  }, window.__mpMock ? 1000 : 4000);
  addEventListener('pagehide', () => leave());
  setInterval(tick, 100); setInterval(pillTxt, 1000);
  // ---------- per frame: interpolate, animate, place tags + bubbles ----------
  const V = new THREE.Vector3(); let lt = performance.now();
  function place(node, obj, h, dy) { V.set(obj.position.x, obj.position.y + h, obj.position.z).project(camera);
    if (V.z > 1 || !obj.visible) { node.style.display = 'none'; return; } node.style.display = 'block'; node.style.left = ((V.x + 1) / 2 * innerWidth).toFixed(1) + 'px'; node.style.top = ((1 - V.y) / 2 * innerHeight - (dy || 0)).toFixed(1) + 'px'; }
  function frame(now) { if (document.hidden) { lt = now; requestAnimationFrame(frame); return; } const dt = Math.min(0.1, (now - lt) / 1000); lt = now; const k = 1 - Math.exp(-dt * 12);
    for (const p of M.peers.values()) {
      if (now - p.last > 10000 && p.cur) { p.g.visible = false; p.tag.style.display = 'none'; continue; }   // went quiet: hide until it speaks again
      if (!p.cur) continue; const slot = /^play:/.test(p.a) ? slotOf(p.a.slice(5), p.id) : null; p.slot = slot;
      if (slot) p.tgt = { x: slot.x, y: 0, z: slot.z, r: slot.r };   // stand in front of the machine they are playing
      const c = p.cur, t = p.tgt, ox = c.x, oz = c.z;
      c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k; let dr = ((t.r - c.r + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; c.r += dr * k;
      if (Math.hypot(t.x - c.x, t.z - c.z) > 6) Object.assign(c, t);   // big jump (respawn / teleport arrival): snap
      const g = p.g; g.position.set(c.x, c.y, c.z); g.rotation.y = c.r;
      if (p.a !== p.fxA) { const was = p.fxA; p.fxA = p.a; p.fxT = now; const T = getTp && getTp(); if (p.a === 'bin' && was !== 'bin') { p.binT = now; M.beamIns = (M.beamIns || 0) + 1; if (T && T.beamAt) try { T.beamAt(t.x, t.z, 1.9); } catch (e) {} }   // t282u: they just pressed Play
        else if (T && T.fxAt && ((p.a === 'tpo' && was !== 'tpo') || p.a === 'tpi')) try { T.fxAt(t.x, t.z, p.a === 'tpo'); } catch (e) {} }   // t233: see them beam out / in
      const fa = (now - (p.fxT || 0)) / 1000, tp = p.a === 'tp' || (p.a === 'tpo' && fa > 2.7) || (p.a === 'tpi' && fa < 0.25), ghost = /^seat:/.test(p.a) || (/^play:/.test(p.a) && !slot); g.visible = !tp && p.a !== 'pre';
      if (p.binT !== undefined) { if (p.s0 === undefined) p.s0 = g.scale.x; const u = Math.min(1, (now - p.binT) / 1500); if (u < 0.12) g.visible = false; const e = 1 - Math.pow(1 - u, 3); g.scale.set(p.s0 * (0.35 + 0.65 * e), p.s0 * e, p.s0 * (0.35 + 0.65 * e)); if (u >= 1) { g.scale.setScalar(p.s0); p.binT = undefined; } }   // t282u: scale/stretch in under the column
      if (ghost !== !!p.ghost) { p.ghost = ghost; g.traverse(o => { if (o.isMesh) { o.material.transparent = ghost; o.material.opacity = ghost ? 0.45 : 1; } }); }
      { const want = p.a === 'nb' ? 0 : 1; if (p.nbF === undefined) p.nbF = 1;   // t781u: a player who starts NEON BRICKS fades out in 0.3 s (name tag goes with them), back in when they stop
        if (p.nbF !== want) { p.nbF = want ? Math.min(1, p.nbF + dt / 0.3) : Math.max(0, p.nbF - dt / 0.3); const op = (p.ghost ? 0.45 : 1) * p.nbF;
          g.traverse(o => { if (o.isMesh && o.material) { o.material.transparent = p.ghost || p.nbF < 1; o.material.opacity = op; } }); }
        if (p.nbF === 0) g.visible = false; if (p.tag) p.tag.style.opacity = p.nbF < 1 ? p.nbF.toFixed(2) : ''; }
      const sp = Math.hypot(c.x - ox, c.z - oz) / Math.max(dt, 1e-3), u = g.userData; p.phase += dt * (sp > 0.1 ? 3 + sp * 2.1 : 0);
      if (u.legs) { const fly = p.a === 'fly' || p.a === 'glide', amp = fly ? 0 : Math.min(1, sp / 2.4) * 0.6, s = Math.sin(p.phase);
        u.legs[0].leg.rotation.x = fly ? 0.45 : s * amp; u.legs[1].leg.rotation.x = fly ? 0.45 : -s * amp;
        if (u.arms) { u.arms[0].sh.rotation.x = fly ? -0.85 : -s * amp * 0.8; u.arms[1].sh.rotation.x = fly ? -0.85 : s * amp * 0.8; } }
      if (slot) playPose(p, u, g, now / 1000); else if (p.posed) unpose(p, u, g);
      if (u.tail) { const tk = 0.15 + Math.min(1, sp / 2.4) * 0.35 + (p.a === 'jump' || p.a === 'fly' || p.a === 'glide' ? 0.4 : 0); u.tail.rotation.z = Math.sin(now / 625 + p.phase) * tk; const seat = /^seat:/.test(p.a), backOn = !!(p.look && p.look.back && p.look.back !== 'none'); u.tail.visible = !seat && !!u.tail.children.length; u.pack.visible = !seat && !backOn; }
      if (u.bot && window.__arcade && window.__arcade.tickBot) window.__arcade.tickBot(u, now / 1000);
      if (p.flameA !== p.a) { p.flameA = p.a; if (!(p.thG && p.thG.parent)) { p.th = []; const pack = p.g.getObjectByName('gaBk_jetpack'); p.thG = pack || null;
        if (pack) { const ch = pack.children; for (let i = 0; i < ch.length; i++) if (ch[i].name === 'gaThruster') p.th.push(ch[i]); } } }
      if (p.th && p.th.length) { const burn = p.a === 'fly'; if (burn) { const sY = 0.78 + Math.sin(now / 36) * 0.22, sW = 0.88 + Math.sin(now / 58) * 0.14; for (let i = 0; i < p.th.length; i++) { p.th[i].visible = true; p.th[i].scale.set(sW, sY, sW); } } else if (p.thOn) { for (let i = 0; i < p.th.length; i++) { p.th[i].visible = false; p.th[i].scale.set(1, 1, 1); } } p.thOn = burn; }
      if (p.gb || p.ball) { if (!p.ball) { p.ball = new THREE.Mesh(new THREE.SphereGeometry(0.071, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x777777 })); p.ball.name = 'mpGolfBall'; scene.add(p.ball); }   // t275u: their mini golf ball
        p.ball.visible = !!p.gb && g.visible; if (p.gb) { if (!p.ball.userData.on) p.ball.position.fromArray(p.gb); else p.ball.position.lerp(GBV.fromArray(p.gb), k); } p.ball.userData.on = !!p.gb; }
      place(p.tag, g, p.top || 1.75); }
    for (const p of [me, ...M.peers.values()]) for (const kd in p.bub) { const b = p.bub[kd]; if (now > b.until) { clearBub(p, kd); continue; } place(b.el, p.g, p.top || 1.75, kd === 'emo' ? 22 : 24); }
    requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  // multiplayer is off in automated test browsers unless a test opts in (keeps the suite off the network)
  const auto = navigator.webdriver && !window.__mpMock && !window.__mpLive;
  if (auto || window.__mpOff) { M.state = 'off'; M.reason = 'disabled'; pillTxt(); } else setTimeout(join, window.__mpMock ? 0 : 1200);
  M.animOf = animOf; M._onState = onState;   // tests (t781u neon_bricks_window: my 'nb' state + a remote player fading out)
  return M;
}
