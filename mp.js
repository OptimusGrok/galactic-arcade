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
export function setupMP({ scene, camera, monkey, makeMonkey, st, play, getTp, HALF, Z2, HALL_L, WX }) {
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
  // ---------- HUD: player pill (top centre), emote + CHAT buttons (right, under the cash), chat panel, name panel ----------
  const css = document.createElement('style'); css.textContent = `
#mpPill{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:23;display:flex;align-items:center;gap:5px;font:700 13px 'Courier New',monospace;color:#bff;background:#0a0612cc;border:1px solid #2ae5ff66;border-radius:14px;padding:4px 10px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}
#mpPill.off{color:#889;border-color:#5566}#mpPill i{font-style:normal}
#mpNote{position:fixed;top:calc(max(8px,env(safe-area-inset-top)) + 34px);left:50%;transform:translateX(-50%);z-index:23;font:700 12px 'Courier New',monospace;color:#ffe08a;background:#0a0612dd;border:1px solid #ffb00066;border-radius:8px;padding:4px 9px;display:none;pointer-events:none}
#mpBar{position:fixed;right:max(8px,env(safe-area-inset-right));top:calc(max(8px,env(safe-area-inset-top)) + 96px);z-index:23;display:flex;flex-direction:column;gap:6px}
#mpBar button{width:40px;height:40px;border-radius:10px;border:1px solid #ff4f9e66;background:#0a0612cc;color:#fff;font:700 18px sans-serif;padding:0;touch-action:manipulation}
#mpBar #mpChatB{font:700 10px 'Courier New',monospace;color:#bff;border-color:#2ae5ff88}
body.ingame #mpPill,body.ingame #mpBar,body.ingame #mpChat,body.ingame #mpTags,body.ingame #mpNote{display:none!important}
#mpChat{position:fixed;right:calc(max(8px,env(safe-area-inset-right)) + 48px);top:calc(max(8px,env(safe-area-inset-top)) + 96px);z-index:24;width:min(300px,64vw);display:none;flex-direction:column;gap:4px;font:12px 'Courier New',monospace}
#mpChat.on{display:flex}#mpLog{max-height:150px;overflow-y:auto;background:#0a0612dd;border:1px solid #2ae5ff44;border-radius:8px;padding:4px 6px;color:#dde}
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
  for (const k in EMO) { const b = el('button', { id: 'mpE_' + k, title: k, textContent: EMO[k] }, bar); b.addEventListener('click', e => { e.stopPropagation(); emote(k); }); }
  const chatB = el('button', { id: 'mpChatB', textContent: 'CHAT', title: 'Chat' }, bar);
  const chatP = el('div', { id: 'mpChat' }); chatP.innerHTML = '<div id="mpLog"></div><form id="mpForm"><input id="mpIn" maxlength="100" autocomplete="off" enterkeyhint="send" placeholder="Say something (100 max)"><button>SEND</button></form><div style="display:flex;gap:4px"><button id="mpLogT" type="button">LOG</button><button id="mpMuteAll" type="button"></button><button id="mpClose" type="button">CLOSE</button></div>';
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
  inp.addEventListener('blur', () => { try { window.scrollTo(0, 0); } catch (e) {} });   // phone keyboard closes: snap the page back so the controls sit where they were
  const nameSet = () => LSg('neonarcade.mpNameSet') === '1';
  function showName(on) { if (!on) { nameP.classList.remove('on'); return; }
    nameP.innerHTML = ''; el('div', { textContent: 'PUBLIC ROOM · ' + (M.state === 'on' ? M.count + '/' + CAP + ' players' : M.full ? 'room full, playing solo' : 'offline, playing solo') }, nameP);
    if (player().name) el('div', { textContent: 'You are ' + name + ' (set on the start screen)', style: 'margin-top:6px' }, nameP); else { const row = el('div', { style: 'margin-top:6px' }, nameP); const ni = el('input', { value: name, maxLength: 14, readOnly: nameSet() }, row); ni.addEventListener('keydown', stop); ni.addEventListener('keyup', stop);
    if (!nameSet()) { const sv = el('button', { textContent: 'SAVE NAME' }, nameP); sv.onclick = () => { const v = cleanMsg(ni.value).replace(/[^\w\- ]/g, '').slice(0, 14).trim(); if (v && !/\*/.test(v)) { name = v; LSs('neonarcade.mpName', v); LSs('neonarcade.mpNameSet', '1'); track(); } showName(false); }; el('div', { textContent: 'You can change your name once.', style: 'opacity:.7;margin-top:4px' }, nameP); } }
    const list = el('div', { style: 'margin-top:6px;max-height:120px;overflow:auto' }, nameP);
    for (const p of M.peers.values()) { const r = el('div', { textContent: (M.muted.has(p.id) ? '🔇 ' : '') + p.name, style: 'cursor:pointer;padding:2px 0' }, list); r.onclick = () => { toggleMute(p.id); showName(true); }; }
    el('button', { textContent: 'CLOSE' }, nameP).onclick = () => showName(false); nameP.classList.add('on'); }
  M.showName = showName; M.setName = v => { name = fallback = v; LSs('neonarcade.mpName', v); track(); };
  pill.addEventListener('click', e => { e.stopPropagation(); showName(!nameP.classList.contains('on')); });
  let flashT = 0; function flash(t, ms) { note.textContent = t; note.style.display = 'block'; clearTimeout(flashT); if (ms !== 0) flashT = setTimeout(() => { note.style.display = M.full ? 'block' : 'none'; if (M.full) note.textContent = 'Room full, playing solo'; }, ms || 2500); }
  function liveCount() { const now = performance.now(); let n = 1; for (const p of M.peers.values()) if (now - p.last < 12000) n++; return Math.min(CAP, n); }
  function pillTxt() { if (M.state === 'on') M.count = liveCount(); pill.querySelector('#mpN').textContent = (M.state === 'on' ? M.count : 1) + '/' + CAP; pill.classList.toggle('off', M.state !== 'on'); }
  pillTxt();
  // ---------- local state -> wire ----------
  function roomOf(p) { if (p.x > WX / 2) return 'white'; if (p.z > -HALF) return 'room1'; if (p.z < -(HALF + HALL_L)) return 'room2'; return 'hall'; }
  function animOf() { const tp = getTp && getTp(); if (tp && tp.state !== 'idle') return 'tp';
    if (play.mode !== 'walk' && play.cur) return (play.cur.key === 'roadster' || play.cur.key === 'deadsignal' ? 'seat:' : 'play:') + play.cur.key;
    if (st.jump) return 'jump'; return st.speed > 0.15 ? 'walk' : 'idle'; }
  const r2 = v => Math.round(v * 100) / 100;
  function snap() { const p = monkey.position; return { i: id, x: r2(p.x), y: r2(p.y), z: r2(p.z), r: Math.round(monkey.rotation.y * 100) / 100, m: roomOf(p), a: animOf() }; }
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
  function paint(p, meta) { const lk = meta && meta.look && typeof meta.look === 'object' ? meta.look : null, key = lk ? JSON.stringify(lk) : 'h' + ((meta && meta.hue) || 0); if (p.lookKey === key) return; p.lookKey = key;
    const map = {}; if (lk) { const H = PAL.hoodie[lk.hoodie] || PAL.hoodie.navy, F = PAL.fur[lk.fur] || PAL.fur.brown, S2 = PAL.shoes[lk.shoes] || PAL.shoes.red;
      map[0x1d2452] = H[0]; map[0x141a3a] = H[1]; map[0x4e2a14] = F[0]; map[0xd9a779] = F[1]; map[0x8a1e2c] = S2[0]; map[0xf1e8d6] = S2[1]; }
    const h = (meta && meta.hue) || 0; let cap = null;
    p.g.traverse(o => { if (!o.isMesh || !o.material || o.material.userData.orig == null) return; const orig = o.material.userData.orig, c = o.material.color; c.setHex(orig);
      if (orig === 0xff4f9e && o.parent && o.parent.isGroup) cap = o.parent; if (o.userData.noTint) return;
      if (lk) { if (map[orig] != null) c.setHex(map[orig]); } else { const hsl = {}; c.getHSL(hsl); if (hsl.s > 0.25) c.setHSL((hsl.h + h / 360) % 1, hsl.s, hsl.l); } });
    if (cap) cap.visible = !lk || lk.hat === 'cap'; p.look = lk;
    // player.js wardrobe (Chief): new hats / glasses etc. on the remote monkey; materials already carry userData.orig (own())
    if (lk) try { if (window.__wardrobe && typeof window.__wardrobe.applyRemote === 'function') window.__wardrobe.applyRemote(p.g, lk); } catch (e) {}
    p.top = topOf(p.g); }
  M.paint = paint;
  // name tag height: just above the highest VISIBLE part (tallest hat: cowboy / party / halo), so it never covers the face or glasses
  const TB = new THREE.Box3();
  function topOf(g) { g.updateMatrixWorld(true); let top = -1e9; const seen = o => { for (let q = o; q && q !== g; q = q.parent) if (!q.visible) return false; return true; };
    g.traverse(o => { if (o.isMesh && o.geometry && seen(o)) { TB.setFromObject(o); if (TB.max.y > top) top = TB.max.y; } }); return top > -1e8 ? Math.max(1.75, top - g.position.y + 0.12) : 1.75; }
  function onLook(pl) { if (!pl || !pl.i || pl.i === id || !pl.look || typeof pl.look !== 'object') return; const p = M.peers.get(pl.i); if (!p) return; M.recv++;
    paint(p, { look: pl.look }); if (pl.name) { p.name = String(pl.name).slice(0, 14); p.tag.textContent = p.name; } }
  function peer(pid, meta) { let p = M.peers.get(pid);
    if (!p) { const g = makeMonkey(); g.name = 'remoteMonkey_' + pid; own(g); scene.add(g); g.visible = false;
      const tag = el('div', { className: 'mpTag' }, tags); tag.addEventListener('click', e => { e.stopPropagation(); toggleMute(pid); });
      p = { id: pid, name: 'Monkey', g, tag, cur: null, tgt: null, a: 'idle', m: 'room1', last: performance.now(), phase: 0, bub: {} }; M.peers.set(pid, p); }
    if (meta) paint(p, meta); else if (!p.lookKey) paint(p, { hue: 0 }); if (meta && meta.name) p.name = String(meta.name).slice(0, 14); p.tag.textContent = p.name; p.tag.classList.toggle('mute', M.muted.has(pid)); return p; }
  function drop(pid) { const p = M.peers.get(pid); if (!p) return; scene.remove(p.g); p.g.traverse(o => { if (o.isMesh) o.material.dispose(); }); p.tag.remove(); for (const k in p.bub) p.bub[k].el.remove(); M.peers.delete(pid); }
  function toggleMute(pid) { if (M.muted.has(pid)) M.muted.delete(pid); else M.muted.add(pid); LSs('neonarcade.mpMuted', JSON.stringify([...M.muted])); const p = M.peers.get(pid); if (p) { p.tag.classList.toggle('mute', M.muted.has(pid)); if (M.muted.has(pid)) clearBub(p, 'chat'); } renderLog(); }
  M.toggleMute = toggleMute;
  function onState(s) { if (!s || s.i === id || typeof s.x !== 'number') return; M.recv++; const p = peer(s.i); p.last = performance.now();
    p.tgt = { x: s.x, y: s.y || 0, z: s.z, r: s.r || 0 }; if (!p.cur) p.cur = Object.assign({}, p.tgt); p.a = String(s.a || 'idle'); p.m = String(s.m || 'room1'); }
  // ---------- bubbles (emotes / chat), chat log ----------
  const me = { g: monkey, bub: {}, id };
  function bubble(p, kind, text, ms) { clearBub(p, kind); const b = el('div', { className: 'mpBub' + (kind === 'emo' ? ' emo' : ''), textContent: text }, tags); p.bub[kind] = { el: b, until: performance.now() + ms }; }
  function clearBub(p, kind) { if (p.bub[kind]) { p.bub[kind].el.remove(); delete p.bub[kind]; } }
  function emote(k) { if (!EMO[k]) return false; bubble(me, 'emo', EMO[k], 2500); send('emo', { i: id, e: k }); return true; }
  function addLog(who, pid, text) { M.log.push({ who, pid, text, at: Date.now() }); if (M.log.length > 20) M.log.shift(); renderLog(); }
  function renderLog() { logEl.textContent = ''; if (M.chatMuted) { el('div', { textContent: 'Chat is off', style: 'opacity:.6' }, logEl); return; }
    for (const l of M.log) { if (M.muted.has(l.pid)) continue; const d = el('div', {}, logEl); el('b', { textContent: l.who + ': ' }, d); d.appendChild(document.createTextNode(l.text)); }
    logEl.scrollTop = logEl.scrollHeight; }
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
        .on('broadcast', { event: 'look' }, m => onLook(m && m.payload))
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (M.state === 'on' || M.state === 'joining') { leave(); M.paused = true; } } else { M.paused = false; if (M.state !== 'on') rejoin('visible'); } });
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
  function frame(now) { const dt = Math.min(0.1, (now - lt) / 1000); lt = now; const k = 1 - Math.exp(-dt * 12);
    for (const p of M.peers.values()) {
      if (now - p.last > 10000 && p.cur) { p.g.visible = false; p.tag.style.display = 'none'; continue; }   // went quiet: hide until it speaks again
      if (!p.cur) continue; const c = p.cur, t = p.tgt, ox = c.x, oz = c.z;
      c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k; let dr = ((t.r - c.r + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; c.r += dr * k;
      if (Math.hypot(t.x - c.x, t.z - c.z) > 6) Object.assign(c, t);   // big jump (respawn / teleport arrival): snap
      const g = p.g; g.position.set(c.x, c.y, c.z); g.rotation.y = c.r;
      const tp = p.a === 'tp', ghost = /^(play|seat):/.test(p.a); g.visible = !tp;
      if (ghost !== !!p.ghost) { p.ghost = ghost; g.traverse(o => { if (o.isMesh) { o.material.transparent = ghost; o.material.opacity = ghost ? 0.45 : 1; } }); }
      const sp = Math.hypot(c.x - ox, c.z - oz) / Math.max(dt, 1e-3), u = g.userData; p.phase += dt * (sp > 0.1 ? 3 + sp * 2.1 : 0);
      if (u.legs) { const amp = Math.min(1, sp / 2.4) * 0.6, s = Math.sin(p.phase); u.legs[0].leg.rotation.x = s * amp; u.legs[1].leg.rotation.x = -s * amp;
        if (u.arms) { u.arms[0].sh.rotation.x = -s * amp * 0.8; u.arms[1].sh.rotation.x = s * amp * 0.8; if (p.a === 'emo') {} } }
      if (u.tail) { const tk = 0.15 + Math.min(1, sp / 2.4) * 0.35 + (p.a === 'jump' ? 0.4 : 0); u.tail.rotation.z = Math.sin(now / 625 + p.phase) * tk; const seat = /^seat:/.test(p.a); u.tail.visible = u.pack.visible = !seat; }
      place(p.tag, g, p.top || 1.75); }
    for (const p of [me, ...M.peers.values()]) for (const kd in p.bub) { const b = p.bub[kd]; if (now > b.until) { clearBub(p, kd); continue; } place(b.el, p.g, p.top || 1.75, kd === 'emo' ? 22 : 24); }
    requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  // multiplayer is off in automated test browsers unless a test opts in (keeps the suite off the network)
  const auto = navigator.webdriver && !window.__mpMock && !window.__mpLive;
  if (auto || window.__mpOff) { M.state = 'off'; M.reason = 'disabled'; pillTxt(); } else setTimeout(join, window.__mpMock ? 0 : 1200);
  return M;
}
