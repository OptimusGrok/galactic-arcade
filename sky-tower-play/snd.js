// SKY TOWER soundtrack + laser / ticket SFX. Procedural WebAudio only — no files.
// Looping sky-to-space climb score at a moderate volume, brighter near the
// clouds and spacier (sparser notes, longer delay, airier pad) toward the top.
// Starts after the first user gesture (or start()/unlock()), respects parent
// MUTE (destination hook + local gains) and MUSIC (parent.__music.on /
// neonarcade.music). SFX still play when MUSIC is off. Arcade room music
// already silences when play.mode !== 'walk', so we do not duck it further.
// Stops on pagehide and when the parent leaves the cabinet (mode !== 'game').
(function (global) {
  const ZapGap = 0.1;
  const MusicVol = 0.26;
  const S = {
    starts: 0, stops: 0, zaps: 0, zapCyan: 0, zapRed: 0, chimes: 0, whooshes: 0, lastWhoosh: -99,
    playing: false, unlocked: false, wanted: false, space: 0, lastZap: -99
  };

  let ac = null, master = null, musicG = null, sfxG = null;
  let lp = null, hp = null, delay = null, delayG = null, delayFb = null;
  let padOs = [], padG = null, shimmer = null, shimmerG = null, shimmerF = null;
  let timer = 0, nextT = 0, stepI = 0, noise = null;

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
    ac = new AC();
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
  }

  function scheduleNote(t, i) {
    const sp = S.space;
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
    if (musicG && S.playing) {
      const vol = musicOn() && visible() && inCabinet() ? MusicVol : 0;
      musicG.gain.setTargetAtTime(vol, t, 0.12);
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
    musicG.gain.cancelScheduledValues(t);
    musicG.gain.setValueAtTime(Math.max(0.0001, musicG.gain.value || 0.0001), t);
    musicG.gain.linearRampToValueAtTime(MusicVol, t + 0.55);
    nextT = t + 0.05;
    stepI = 0;
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
        musicG.gain.cancelScheduledValues(t);
        musicG.gain.setTargetAtTime(0, t, 0.05);
      }
      return false;
    }
    S.playing = false;
    S.stops++;
    if (timer) { clearInterval(timer); timer = 0; }
    stopPads();
    if (musicG && ac) {
      const t = ac.currentTime;
      musicG.gain.cancelScheduledValues(t);
      musicG.gain.setValueAtTime(Math.max(0.0001, musicG.gain.value || 0.0001), t);
      musicG.gain.linearRampToValueAtTime(0.0001, t + 0.28);
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
  S.whoosh = whoosh;
  S.unlock = unlock;
  S.start = start;
  S.stop = stop;
  S.tick = tick;
  S.zap = zap;
  S.chime = chime;
  S.setSpace = setSpace;

  function onGesture() { unlock(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
    global.addEventListener(ev, onGesture, { capture: true, passive: true });
  });
  global.addEventListener('pagehide', () => { stop(); });
  global.addEventListener('visibilitychange', () => { tick(); });

  global.__skySnd = S;
})(typeof window !== 'undefined' ? window : globalThis);
