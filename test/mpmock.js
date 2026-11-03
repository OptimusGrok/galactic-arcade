// in-page mock of supabase-js realtime (presence + broadcast) for test/multiplayer.js; messages go through a Node relay
// (window.__mpRelay -> other pages' window.__mpRecv), so separate browsers act as separate devices. No network.
module.exports = () => { window.__mpMock = { createClient() { const list = [];   // like supabase-js: channel() hands back an existing channel with the same topic until removeChannel() has finished
  const rm = c => new Promise(r => { c.state = 'closed'; const cb = c._cb; setTimeout(() => cb && cb('CLOSED'), 30); setTimeout(() => { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); r('ok'); }, window.__mpMockRmMs != null ? window.__mpMockRmMs : 200); });
  return { getChannels() { return list.slice(); }, removeChannel: rm, removeAllChannels() { return Promise.all(list.slice().map(rm)); }, channel(name, opts) {
  const old = list.find(c => c.topic === 'realtime:' + name); if (old) return old;
  const key = opts.config.presence.key, H = {}, pres = {}; let mine = null; window.__mpMockLog = { sent: [], name };
  for (let i = 0; i < (window.__mpFake || 0); i++) pres['fake' + i] = [{ id: 'fake' + i, name: 'Fake' + i, hue: 0, at: 1 + i }];
  const fire = (ev, p) => (H[ev] || []).forEach(f => f(p)), relay = m => { if (!window.__mpMockDead && ch.state !== 'closed') window.__mpRelay(JSON.stringify(m)); };
  window.__mpRecv = m => { if (window.__mpMockDead || ch.state === 'closed') return; if (m.t === 'pj') { pres[m.k] = [m.m]; fire('presence'); if (mine && !m.r) relay({ t: 'pj', k: key, m: mine, r: 1 }); }
    else if (m.t === 'pl') { delete pres[m.k]; fire('presence'); } else if (m.t === 'b') fire(m.event, { payload: m.payload }); };
  const ch = { topic: 'realtime:' + name, on(t, f, fn) { if (ch._cb) throw new Error('cannot add `' + t + '` callbacks for ' + ch.topic + ' after `subscribe()`.'); const ev = t === 'presence' ? 'presence' : f.event; (H[ev] = H[ev] || []).push(fn); return ch; },
    state: 'joining', subscribe(cb) { ch._cb = cb; setTimeout(() => { if (window.__mpMockDead) { ch.state = 'errored'; cb('TIMED_OUT'); } else { ch.state = 'joined'; cb('SUBSCRIBED'); } }, 10); return ch; },
    track(meta) { mine = meta; pres[key] = [meta]; relay({ t: 'pj', k: key, m: meta }); fire('presence'); return Promise.resolve('ok'); },
    untrack() { mine = null; delete pres[key]; relay({ t: 'pl', k: key }); fire('presence'); return Promise.resolve('ok'); },
    send({ event, payload }) { window.__mpMockLog.sent.push(event); relay({ t: 'b', event, payload }); return Promise.resolve('ok'); },
    presenceState() { return pres; } };
  // test hook: the socket silently dies (phone sleep / network drop): channel errors, nothing relayed until __mpMockDead is cleared
  window.__mpMockKill = () => { relay({ t: 'pl', k: key }); window.__mpMockDead = 1; ch.state = 'errored'; if (ch._cb) ch._cb('CHANNEL_ERROR'); };
  list.push(ch); return ch; } }; } }; };
