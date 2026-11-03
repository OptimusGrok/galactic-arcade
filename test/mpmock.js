// in-page mock of supabase-js realtime (presence + broadcast) for test/multiplayer.js; messages go through a Node relay
// (window.__mpRelay -> other pages' window.__mpRecv), so separate browsers act as separate devices. No network.
module.exports = () => { window.__mpMock = { createClient() { return { removeChannel() {}, channel(name, opts) {
  const key = opts.config.presence.key, H = {}, pres = {}; let mine = null; window.__mpMockLog = { sent: [], name };
  for (let i = 0; i < (window.__mpFake || 0); i++) pres['fake' + i] = [{ id: 'fake' + i, name: 'Fake' + i, hue: 0, at: 1 + i }];
  const fire = (ev, p) => (H[ev] || []).forEach(f => f(p)), relay = m => window.__mpRelay(JSON.stringify(m));
  window.__mpRecv = m => { if (m.t === 'pj') { pres[m.k] = [m.m]; fire('presence'); if (mine && !m.r) relay({ t: 'pj', k: key, m: mine, r: 1 }); }
    else if (m.t === 'pl') { delete pres[m.k]; fire('presence'); } else if (m.t === 'b') fire(m.event, { payload: m.payload }); };
  const ch = { on(t, f, fn) { const ev = t === 'presence' ? 'presence' : f.event; (H[ev] = H[ev] || []).push(fn); return ch; },
    subscribe(cb) { setTimeout(() => cb('SUBSCRIBED'), 10); return ch; },
    track(meta) { mine = meta; pres[key] = [meta]; relay({ t: 'pj', k: key, m: meta }); fire('presence'); return Promise.resolve('ok'); },
    untrack() { mine = null; delete pres[key]; relay({ t: 'pl', k: key }); fire('presence'); return Promise.resolve('ok'); },
    send({ event, payload }) { window.__mpMockLog.sent.push(event); relay({ t: 'b', event, payload }); return Promise.resolve('ok'); },
    presenceState() { return pres; } };
  return ch; } }; } }; };
