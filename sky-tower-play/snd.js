// SKY TOWER soundtrack + laser / ticket SFX. Procedural WebAudio only — no files.
// Looping sky-to-space climb score at a moderate volume, brighter near the
// clouds and spacier (sparser notes, longer delay, airier pad) toward the top.
// Starts after the first user gesture (or start()/unlock()), respects parent
// MUTE (destination hook + local gains) and MUSIC (parent.__music.on /
// neonarcade.music). SFX still play when MUSIC is off. Arcade room music
// already silences when play.mode !== 'walk', so we do not duck it further.
// Stops on pagehide and when the parent leaves the cabinet (mode !== 'game').
// t737u (Dave): + a RANDOM BASS line (saw + sine through a plucky low-pass) on its own
// bus so the music high-pass doesn't thin it out. Each 16-step bar follows the chord
// (C, G, Am, F), picks a random rhythm + note choices (root / fifth / octave / third,
// passing note into the next bar), drops in after a random 1-2 bars and takes the odd
// random break. Sparser, longer and softer toward space; a touch deeper at night.
(function (global) {
  const ZapGap = 0.1;
  const MusicVol = 0.26;
  const S = {
    starts: 0, stops: 0, zaps: 0, zapCyan: 0, zapRed: 0, beams: 0, beamsMuted: 0, chimes: 0, whooshes: 0, lastWhoosh: -99,
    playing: false, unlocked: false, wanted: false, space: 0, lastZap: -99,
    night: 0, bassNotes: 0, bassBars: 0, bassRests: 0, bassLog: [], bassPats: []
  };

  let ac = null, master = null, musicG = null, sfxG = null;
  let lp = null, hp = null, delay = null, delayG = null, delayFb = null;
  let padOs = [], padG = null, shimmer = null, shimmerG = null, shimmerF = null;
  let timer = 0, nextT = 0, stepI = 0, noise = null;
  let bassG = null, bassLP = null, bassBar = null, bassEnter = 1;
  const BassVol = 1.0;   // relative to MusicVol (bassG mirrors musicG)

  function muted() {
    try { if (parent !== global && parent.__mute && parent.__mute.on) return true; } catch (e) {}
    try { return localStorage.getItem('neonarcade.mute') === '1'; } catch (e) {}
    return false;
  }
  function musicOn() {
    if (muted()) return false;
    try { if (parent !== global && parent.__music && parent.__music.on === false) return false; } catch (e) {}
    try { if (localStorage.getItem('neonarcade.music') === '0') return false; } catch (e) {}
    return true;
  }
  function visible() {
    try { if (document.hidden) return false; } catch (e) {}
    return true;
  }
  function inCabinet() {
    try {
      if (parent !== global && parent.__arcade && parent.__arcade.play) {
        return parent.__arcade.play.mode === 'game';
      }
    } catch (e) {}
    return true;
  }

  function ensure() {
    if (ac) return ac;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { S.acErr = String(e && e.message || e); ac = null; return null; }   // t762u: a phone that refuses audio just plays silent
    setTimeout(() => { try { decodeVoice(); } catch (e) {} }, 0);
    master = ac.createGain(); master.gain.value = 1;
    musicG = ac.createGain(); musicG.gain.value = 0;
    sfxG = ac.createGain(); sfxG.gain.value = 0.72;
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.7;
    hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80;
    delay = ac.createDelay(1.5); delay.delayTime.value = 0.32;
    delayG = ac.createGain(); delayG.gain.value = 0.18;
    delayFb = ac.createGain(); delayFb.gain.value = 0.28;
    musicG.connect(hp); hp.connect(lp);
    lp.connect(master);
    lp.connect(delay); delay.connect(delayG); delayG.connect(master);
    delay.connect(delayFb); delayFb.connect(delay);
    sfxG.connect(master);
    // bass bus: own gentle low-pass, skips the music high-pass; gain mirrors musicG (MUSIC / MUTE / exit)
    bassG = ac.createGain(); bassG.gain.value = 0;
    bassLP = ac.createBiquadFilter(); bassLP.type = 'lowpass'; bassLP.frequency.value = 900; bassLP.Q.value = 0.5;
    bassLP.connect(bassG); bassG.connect(master);
    master.connect(ac.destination);
    return ac;
  }

  function noiseBuf() {
    if (noise) return noise;
    const n = Math.floor(ac.sampleRate * 0.25);
    noise = ac.createBuffer(1, n, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }

  function env(dest, t, peak, a, decay) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
    g.connect(dest);
    return g;
  }

  function osc(type, freq, t, dur, peak, dest, slide) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    const g = env(dest, t, peak, 0.012, dur);
    o.connect(g);
    o.start(t); o.stop(t + dur + 0.03);
    return o;
  }

  function burst(t, dur, peak, dest, hipass) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf();
    const f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hipass || 1800;
    const g = env(dest, t, peak, 0.005, dur);
    src.connect(f); f.connect(g);
    src.start(t); src.stop(t + dur + 0.02);
  }

  const ARP = [
    523.25, 659.25, 783.99, 659.25,
    587.33, 783.99, 880.00, 783.99,
    659.25, 783.99, 1046.5, 783.99,
    880.00, 659.25, 783.99, 587.33,
    523.25, 659.25, 880.00, 659.25,
    783.99, 1046.5, 880.00, 783.99,
    659.25, 523.25, 587.33, 659.25,
    783.99, 880.00, 783.99, 523.25
  ];
  const BASS = [130.81, 98.00, 110.00, 87.31];
  const CHORD = [
    [261.63, 329.63, 392.00],
    [196.00, 246.94, 293.66],
    [220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63]
  ];
  const STEP = 60 / 100 / 4;

  // ---- random bass ----
  // per chord (same order as CHORD): R root, 5 fifth, O octave, 3 third — all in C major, 55-147 Hz
  const BNOTE = [
    { R: 65.41, 5: 98.00, O: 130.81, 3: 82.41 },   // C
    { R: 98.00, 5: 73.42, O: 146.83, 3: 61.74 },   // G
    { R: 110.0, 5: 82.41, O: 55.00, 3: 65.41 },    // Am
    { R: 87.31, 5: 65.41, O: 130.81, 3: 110.0 },   // F
  ];
  const SCALE = [41.20, 43.65, 49.00, 55.00, 61.74, 65.41, 73.42, 82.41, 87.31, 98.00, 110.0, 123.47, 130.81, 146.83];
  // 16-step rhythms ('-' rest); first ones are the sparse ones used high up
  const BPATS = [
    'R-------5-------', 'R-------R---5---', 'R-----R---5-----', 'R---R---5---R-5-',
    'R--R--5---R---O-', 'R-----R-5-----3-', 'R--5--R---O--5--', 'R-R---5-R---3-5-',
  ];
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function makeBassBar(bar) {
    const sp = S.space, ci = bar % CHORD.length, nn = BNOTE[ci], next = BNOTE[(bar + 1) % CHORD.length];
    S.bassBars++;
    if (bar < bassEnter || (bar % 4 === 3 && Math.random() < 0.18)) { S.bassRests++; return { bar, rest: true, hits: [] }; }   // drop-in / random break
    const pool = sp > 0.7 ? BPATS.slice(0, 2) : sp > 0.4 ? BPATS.slice(0, 5) : BPATS;
    const pat = pick(pool), hits = [];
    for (let k = 0; k < 16; k++) {
      let c = pat[k]; if (c === '-') continue;
      if (c === '5' && Math.random() < 0.25) c = 'O';
      else if (c === 'O' && Math.random() < 0.3) c = '3';
      let f = nn[c];
      if (S.night > 0.6 && c === 'R' && f > 80 && Math.random() < 0.35 * S.night) f *= 0.5;   // a little deeper at night
      hits.push({ k, f, c });
    }
    // passing note into the next bar's root (scale tone one step above/below)
    if (sp < 0.7 && Math.random() < 0.55 && !hits.some(h => h.k >= 14)) {
      const j = SCALE.reduce((b, v, i) => Math.abs(v - next.R) < Math.abs(SCALE[b] - next.R) ? i : b, 0);
      const pj = Math.max(0, Math.min(SCALE.length - 1, j + (Math.random() < 0.5 ? -1 : 1)));
      hits.push({ k: 14 + ((Math.random() * 2) | 0), f: SCALE[pj], c: 'p' });
    }
    hits.sort((a, b) => a.k - b.k);
    for (let i = 0; i < hits.length; i++) hits[i].len = ((i + 1 < hits.length ? hits[i + 1].k : 16) - hits[i].k);
    S.bassPats.push(pat); if (S.bassPats.length > 24) S.bassPats.shift();
    return { bar, rest: false, pat, hits };
  }
  function bassNote(t, f, steps) {
    const sp = S.space, nt = S.night;
    const dur = Math.max(STEP * 0.8, Math.min(steps * STEP * (0.82 + sp * 0.5), 1.6));
    const peak = 0.21 * (1 - sp * 0.3);
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 3.2 - sp * 1.6;
    const top = (760 - sp * 300 - nt * 160), floor = 150 + sp * 30;
    fl.frequency.setValueAtTime(top, t); fl.frequency.exponentialRampToValueAtTime(floor, t + Math.min(dur, 0.35 + sp * 0.4));
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    const dEnd = Math.min(0.14, dur * 0.5), hEnd = Math.max(dEnd + 0.01, dur - 0.07);   // pluck, hold, short release (no clicks)
    g.gain.exponentialRampToValueAtTime(peak * 0.55, t + dEnd);
    g.gain.setValueAtTime(peak * 0.55, t + hEnd);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const saw = ac.createOscillator(); saw.type = 'sawtooth'; saw.frequency.setValueAtTime(f, t);
    const sub = ac.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(f, t);
    const subG = ac.createGain(); subG.gain.value = 0.9 + nt * 0.35;
    saw.connect(fl); fl.connect(g); sub.connect(subG); subG.connect(g); g.connect(bassLP);
    saw.start(t); sub.start(t); saw.stop(t + dur + 0.03); sub.stop(t + dur + 0.03);
    S.bassNotes++; S.bassLog.push(+f.toFixed(2)); if (S.bassLog.length > 64) S.bassLog.shift();
  }
  function scheduleBass(t, i) {
    const bar = (i / 16) | 0, k = i % 16;
    if (k === 0 || !bassBar || bassBar.bar !== bar) bassBar = makeBassBar(bar);
    if (bassBar.rest) return;
    for (const h of bassBar.hits) if (h.k === k) bassNote(t, h.f, h.len);
  }
  function setNight(n) {
    S.night = Math.max(0, Math.min(1, +n || 0));
    if (bassLP && ac) bassLP.frequency.setTargetAtTime(900 - S.night * 220 - S.space * 200, ac.currentTime, 0.6);
  }
  // musicG and the bass bus always move together (MUSIC off / MUTE / exit silence both)
  function musicGain(fn) { [musicG, bassG].forEach((g, j) => { if (g) fn(g.gain, j ? BassVol : 1); }); }

  function setSpace(amt) {
    S.space = Math.max(0, Math.min(1, +amt || 0));
    if (!ac || !lp) return;
    const t = ac.currentTime;
    const sp = S.space;
    lp.frequency.setTargetAtTime(2800 - sp * 900, t, 0.4);
    delay.delayTime.setTargetAtTime(0.28 + sp * 0.22, t, 0.4);
    delayFb.gain.setTargetAtTime(0.24 + sp * 0.22, t, 0.4);
    delayG.gain.setTargetAtTime(0.14 + sp * 0.22, t, 0.4);
    if (shimmerG) shimmerG.gain.setTargetAtTime(0.012 + sp * 0.05, t, 0.5);
    if (padG) padG.gain.setTargetAtTime(0.032 + sp * 0.028, t, 0.5);
    if (hp) hp.frequency.setTargetAtTime(70 + sp * 140, t, 0.5);
    if (bassLP) bassLP.frequency.setTargetAtTime(900 - S.night * 220 - sp * 200, t, 0.6);
  }

  function scheduleNote(t, i) {
    const sp = S.space;
    scheduleBass(t, i);
    const skip = sp > 0.65 ? (i % 4 !== 0) : sp > 0.35 ? (i % 2 !== 0) : false;
    if (!skip) {
      const f = ARP[i % ARP.length];
      const peak = Math.max(0.008, 0.07 - sp * 0.028);
      osc('triangle', f, t, 0.22 + sp * 0.08, peak, musicG, f * (0.995 - sp * 0.02));
      if (sp < 0.85) osc('sine', f * 2, t, 0.12, peak * 0.35, musicG);
    }
    if (i % 8 === 0) {
      const b = BASS[(i / 8 | 0) % BASS.length];
      osc('sine', b, t, 0.62, 0.08 - sp * 0.02, musicG);
      osc('triangle', b * 0.5, t, 0.7, 0.032, musicG);
    }
    if (i % 2 === 0 && sp < 0.75) burst(t, 0.035, 0.02 * (1 - sp), musicG, 4500);
    if (i % 16 === 0 && padOs.length) {
      const ch = CHORD[(i / 16 | 0) % CHORD.length];
      padOs.forEach((o, k) => {
        const freq = ch[k % ch.length] * (k >= ch.length ? 2 : 1);
        try { o.frequency.setTargetAtTime(freq, t, 0.25); } catch (e) {}
      });
    }
  }

  function pump() {
    if (!ac || !S.playing) return;
    if (!inCabinet() || !visible() || !musicOn()) { stop({ keepWant: inCabinet() }); return; }
    const ahead = ac.currentTime + 0.22;
    let guard = 0;
    while (nextT < ahead && guard++ < 16) {
      scheduleNote(nextT, stepI);
      nextT += STEP;
      stepI++;
    }
  }

  function startPads() {
    stopPads();
    padG = ac.createGain();
    padG.gain.value = 0.032 + S.space * 0.028;
    padG.connect(musicG);
    const ch = CHORD[0];
    [ch[0], ch[1], ch[2], ch[0] * 2].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      if (ac.createStereoPanner) {
        const pan = ac.createStereoPanner();
        pan.pan.value = i < 2 ? -0.35 : 0.35;
        o.connect(pan); pan.connect(padG);
      } else {
        o.connect(padG);
      }
      o.start();
      padOs.push(o);
    });
    shimmerG = ac.createGain(); shimmerG.gain.value = 0.012 + S.space * 0.05;
    shimmerF = ac.createBiquadFilter(); shimmerF.type = 'bandpass'; shimmerF.frequency.value = 2400; shimmerF.Q.value = 2.2;
    shimmer = ac.createBufferSource();
    shimmer.buffer = noiseBuf(); shimmer.loop = true;
    shimmer.connect(shimmerF); shimmerF.connect(shimmerG); shimmerG.connect(musicG);
    shimmer.start();
  }

  function stopPads() {
    padOs.forEach(o => { try { o.stop(); o.disconnect(); } catch (e) {} });
    padOs = [];
    if (shimmer) { try { shimmer.stop(); shimmer.disconnect(); } catch (e) {} shimmer = null; }
    if (shimmerF) { try { shimmerF.disconnect(); } catch (e) {} shimmerF = null; }
    if (shimmerG) { try { shimmerG.disconnect(); } catch (e) {} shimmerG = null; }
    if (padG) { try { padG.disconnect(); } catch (e) {} padG = null; }
  }

  function applyGains() {
    if (!ac) return;
    const t = ac.currentTime;
    if (sfxG) sfxG.gain.setTargetAtTime(muted() ? 0 : 0.72, t, 0.05);
    if (voiceG && muted()) voiceG.gain.setTargetAtTime(0, t, 0.03);   // MUTE mid-line silences the TITAN too
    if (musicG && S.playing) {
      const vol = musicOn() && visible() && inCabinet() ? MusicVol * (voiceSrc ? 0.4 : 1) : 0;   // ducked under the TITAN's line
      musicGain((p, k) => p.setTargetAtTime(vol * k, t, 0.12));
    }
  }

  function start() {
    S.wanted = true;
    if (!ensure()) return false;
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    S.unlocked = true;
    if (!inCabinet() || !visible() || !musicOn()) { applyGains(); return false; }
    if (S.playing) { applyGains(); return true; }
    const t = ac.currentTime;
    musicGain((p, k) => { p.cancelScheduledValues(t); p.setValueAtTime(Math.max(0.0001, p.value || 0.0001), t); p.linearRampToValueAtTime(MusicVol * k, t + 0.55); });
    nextT = t + 0.05;
    stepI = 0;
    bassBar = null; bassEnter = 1 + ((Math.random() * 2) | 0);   // bass drops in after a random 1-2 bars
    startPads();
    if (!timer) timer = setInterval(pump, 50);
    S.playing = true;
    S.starts++;
    applyGains();
    return true;
  }

  function stop(opts) {
    const keepWant = !!(opts && opts.keepWant);
    if (!keepWant) S.wanted = false;
    if (!S.playing) {
      if (musicG && ac) {
        const t = ac.currentTime;
        musicGain(p => { p.cancelScheduledValues(t); p.setTargetAtTime(0, t, 0.05); });
      }
      return false;
    }
    S.playing = false;
    S.stops++;
    if (timer) { clearInterval(timer); timer = 0; }
    stopPads();
    if (musicG && ac) {
      const t = ac.currentTime;
      musicGain(p => { p.cancelScheduledValues(t); p.setValueAtTime(Math.max(0.0001, p.value || 0.0001), t); p.linearRampToValueAtTime(0.0001, t + 0.28); });
    }
    return true;
  }

  function unlock() {
    if (!ensure()) return false;
    S.unlocked = true;
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    if (musicOn() && visible() && inCabinet()) start();
    return true;
  }

  function tick(heightAmt) {
    if (typeof heightAmt === 'number') setSpace(heightAmt);
    if (!S.unlocked && !S.wanted) return;
    applyGains();
    const allowed = musicOn() && visible() && inCabinet();
    if (S.wanted && allowed && !S.playing) start();
    else if (S.playing && !allowed) stop({ keepWant: inCabinet() });
  }

  function zap(color) {
    if (!ensure()) return false;
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    S.unlocked = true;
    const now = ac.currentTime;
    if (now - S.lastZap < ZapGap) return false;
    S.lastZap = now;
    const red = color === 'red';
    S.zaps++;
    if (red) S.zapRed++; else S.zapCyan++;
    if (S.wanted === false) S.wanted = true;
    if (musicOn() && visible() && inCabinet() && !S.playing) start();
    applyGains();
    if (red) {
      osc('sine', 780, now, 0.14, 0.16, sfxG, 240);
      osc('triangle', 520, now, 0.16, 0.1, sfxG, 190);
      burst(now, 0.05, 0.045, sfxG, 900);
    } else {
      osc('square', 1680, now, 0.09, 0.11, sfxG, 620);
      osc('triangle', 1240, now, 0.07, 0.06, sfxG, 480);
      burst(now, 0.035, 0.05, sfxG, 2800);
    }
    return true;
  }

  // t751u: the TITAN's eye lasers — a fat, low "BWAAAM" (two detuned saws sweeping down + a noise crack), on the SFX
  // bus so MUTE silences it like every other zap
  function beam() {
    if (muted()) { S.beamsMuted++; return false; }
    if (!ensure()) return false;
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    const now = ac.currentTime;
    S.beams++;
    osc('sawtooth', 330, now, 0.55, 0.11, sfxG, 70);
    osc('sawtooth', 336, now, 0.55, 0.08, sfxG, 72);
    osc('sine', 150, now, 0.6, 0.18, sfxG, 45);
    burst(now, 0.09, 0.07, sfxG, 600);
    return true;
  }
  function chime() {
    if (!ensure()) return false;
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    const t = ac.currentTime;
    S.chimes++;
    applyGains();
    osc('sine', 1318.5, t, 0.18, 0.09, sfxG);
    osc('sine', 1760, t + 0.05, 0.22, 0.08, sfxG);
    osc('triangle', 2093, t + 0.09, 0.16, 0.045, sfxG);
    return true;
  }

  // Wind gust telegraph: filtered-noise swell (~1.9s) peaking as the push arrives. SFX bus, so MUTE silences it.
  function whoosh(amt) {
    if (!ensure()) return false;
    const t = ac.currentTime;
    if (t - S.lastWhoosh < 1.0) return false;
    S.lastWhoosh = t; S.whooshes++;
    applyGains();
    const a = Math.max(0.2, Math.min(1, +amt || 0.7));
    const src = ac.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(1500, t + 1.25); f.frequency.exponentialRampToValueAtTime(500, t + 1.9);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11 * a, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.95);
    src.connect(f); f.connect(g); g.connect(sfxG);
    src.start(t); src.stop(t + 2.0);
    return true;
  }
  // t748u TITAN voice (t760u: the opening line is now "Can you make it to the top?") — a shipped, pre-rendered booming take (../sfx/sky_face_top.mp3, deep voice +
  // sub-octave layer + short hall echo, peak ~-0.4 dB) played once per climb through its own gain. MUTE = silent (counted).
  // t749u: second line "Hey, watch it!" (../sfx/sky_face_hey.mp3, same voice + same chain, matched loudness) when the
  // player shoots the TITAN. Both lines share one voice gain + one source: a line never overlaps another (the
  // "hey" line is refused while any line is still playing — the face's cooldown handles the retry logic).
  // voiceEnv(s) = loudness per 30 ms (0..1) so the face's mouth moves with the words (also when muted).
  const VoiceVol = 0.95;
  const LINES = { show: { url: '../sfx/sky_face_top.mp3' }, hey: { url: '../sfx/sky_face_hey.mp3' } };
  let voiceG = null, voiceSrc = null, voiceLine = '';
  S.voicePlays = 0; S.voiceMuted = 0; S.voiceEnv = null; S.voiceDur = 0; S.voiceErr = '';
  S.voiceEnvs = {}; S.voiceDurs = {}; S.voicePlaysBy = { show: 0, hey: 0 }; S.voiceMutedBy = { show: 0, hey: 0 }; S.voiceBusy = 0;
  for (const k in LINES) { const L = LINES[k]; L.buf = null; L.raw = null; L.pend = 0;
    try { fetch(L.url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('http ' + r.status))).then(b => { L.raw = b; decodeLine(k); }).catch(e => { S.voiceErr = k + ': ' + String(e && e.message || e); }); } catch (e) { S.voiceErr = 'fetch'; } }
  function decodeVoice() { for (const k in LINES) decodeLine(k); }
  function decodeLine(k) {
    const L = LINES[k];
    if (L.buf || !L.raw || L.busy) return;
    const done = buf => { L.buf = buf; L.busy = false; const d = buf.getChannelData(0), n = Math.round(buf.sampleRate * 0.03), env = []; let mx = 0;
      for (let i = 0; i < d.length; i += n) { let q = 0; const e = Math.min(d.length, i + n); for (let j = i; j < e; j++) q += d[j] * d[j]; const v = Math.sqrt(q / Math.max(1, e - i)); env.push(v); if (v > mx) mx = v; }
      S.voiceEnvs[k] = env.map(v => Math.min(1, Math.pow(v / (mx || 1), 0.7) * 1.1)); S.voiceDurs[k] = buf.duration;
      if (k === 'show') { S.voiceEnv = S.voiceEnvs.show; S.voiceDur = buf.duration; }
      if (L.pend && performance.now() - L.pend < (k === 'show' ? 4000 : 600)) { L.pend = 0; voice(k); } };
    const fail = () => { L.busy = false; S.voiceErr = k + ': decode'; };
    try {
      const raw = L.raw.slice(0);
      if (ac) { L.busy = true; const p = ac.decodeAudioData(raw, done, fail); if (p && p.catch) p.catch(() => {}); return; }
      const OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;   // decode early, before the first gesture
      if (OAC) { L.busy = true; const o = new OAC(1, 44100, 44100); const p = o.decodeAudioData(raw, done, fail); if (p && p.catch) p.catch(() => {}); }
    } catch (e) { fail(); }
  }
  function voice(k) {
    k = LINES[k] ? k : 'show';
    const L = LINES[k];
    if (k !== 'show' && voiceSrc) { S.voiceBusy++; return false; }   // never talk over itself
    if (muted()) { S.voiceMuted++; S.voiceMutedBy[k]++; return false; }
    if (!ensure()) return false;
    if (ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    if (!L.buf) { L.pend = performance.now(); decodeLine(k); return false; }   // plays as soon as it is decoded
    if (!voiceG) { voiceG = ac.createGain(); voiceG.connect(master); }
    if (voiceSrc) { try { voiceSrc.stop(); } catch (e) {} }
    const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = L.buf; src.connect(voiceG);
    voiceG.gain.cancelScheduledValues(t); voiceG.gain.setValueAtTime(VoiceVol, t);
    src.start(t); voiceSrc = src; voiceLine = k; src.onended = () => { if (voiceSrc === src) { voiceSrc = null; voiceLine = ''; } applyGains(); }; applyGains();
    S.voicePlays++; S.voicePlaysBy[k]++;
    return true;
  }
  S.voice = voice;
  Object.defineProperty(S, 'voiceReady', { get: () => !!LINES.show.buf });
  Object.defineProperty(S, 'heyReady', { get: () => !!LINES.hey.buf });
  Object.defineProperty(S, 'voiceLine', { get: () => (voiceSrc ? voiceLine : '') });
  Object.defineProperty(S, 'voiceGain', { get: () => (voiceG ? voiceG.gain.value : 0) });
  Object.defineProperty(S, 'voiceOn', { get: () => !!voiceSrc });
  S.whoosh = whoosh;
  S.unlock = unlock;
  S.start = start;
  S.stop = stop;
  S.tick = tick;
  S.zap = zap;
  S.beam = beam;
  S.chime = chime;
  S.setSpace = setSpace;
  S.setNight = setNight;
  S.tap = () => ({ ac, bass: bassG, music: musicG, master });   // read-only nodes for level checks (tests / tuning)
  Object.defineProperty(S, 'bassGain', { get: () => (bassG ? bassG.gain.value : 0) });
  Object.defineProperty(S, 'musicGain', { get: () => (musicG ? musicG.gain.value : 0) });

  function onGesture() { unlock(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
    global.addEventListener(ev, onGesture, { capture: true, passive: true });
  });
  global.addEventListener('pagehide', () => { stop(); });
  global.addEventListener('visibilitychange', () => { tick(); });

  global.__skySnd = S;
})(typeof window !== 'undefined' ? window : globalThis);
