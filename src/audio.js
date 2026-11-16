// All sound is synthesized with the Web Audio API. There are no audio files.
// Audio starts on the first key press or click (browsers require that), and M mutes.
//   footstep(volume)  soft alternating step
//   pop()             partner mode changed
//   creak(tension)    rope creak, 0 = silent, 1 = thread pulled tight. Call it whenever the tension changes.
//   chime()           a door opening
export function createAudio() {
  let ctx = null, master = null, noise = null;
  let creakGain = null, creakOsc = null;
  let muted = false, left = false;

  function start() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    startPad();
    startCreak();
  }

  // A gain that rises to peak and dies away, already connected to the output.
  function envelope(peak, attack, decay, at = ctx.currentTime) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    g.connect(master);
    return g;
  }

  function tone(type, freq, dest, at = ctx.currentTime, length = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(dest);
    o.start(at);
    if (length) o.stop(at + length);
    return o;
  }

  function lowpass(freq, dest) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    f.connect(dest);
    return f;
  }

  // Very quiet warm pad: three soft tones through a low filter, slowly swelling.
  function startPad() {
    const out = ctx.createGain();
    out.gain.value = 0.022;
    out.connect(master);
    const filter = lowpass(480, out);
    for (const freq of [130.81, 196.0, 262.4]) tone('triangle', freq, filter);
    const swell = ctx.createGain();
    swell.gain.value = 0.008;
    swell.connect(out.gain);
    tone('sine', 0.07, swell);
  }

  // The rope creak runs all the time at zero volume; creak() turns it up.
  function startCreak() {
    creakGain = ctx.createGain();
    creakGain.gain.value = 0;
    creakGain.connect(master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 430;
    filter.Q.value = 7;
    filter.connect(creakGain);
    creakOsc = tone('sawtooth', 54, filter);
    const wobble = ctx.createGain(); // slow strain in the fibres
    wobble.gain.value = 160;
    wobble.connect(filter.frequency);
    tone('sine', 0.8, wobble);
  }

  function setMuted(value) {
    muted = value;
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
  }

  window.addEventListener('keydown', (e) => {
    start();
    if (e.code === 'KeyM' && !e.repeat) setMuted(!muted);
  });
  window.addEventListener('pointerdown', start);

  return {
    start,
    setMuted,
    get muted() { return muted; },
    get running() { return !!ctx && ctx.state === 'running'; },

    footstep(volume = 1) {
      if (!ctx) return;
      left = !left;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.connect(lowpass(left ? 520 : 390, envelope(0.11 * volume, 0.004, 0.09)));
      src.start(ctx.currentTime, Math.random() * 0.3, 0.12);
    },

    pop() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const o = tone('sine', 560, envelope(0.14, 0.004, 0.11), t, 0.14);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    },

    creak(tension) {
      if (!ctx) return;
      const k = Math.min(1, Math.max(0, tension));
      creakGain.gain.setTargetAtTime(k * k * 0.09, ctx.currentTime, 0.12);
      creakOsc.frequency.setTargetAtTime(50 + k * 22, ctx.currentTime, 0.12);
    },

    chime() {
      if (!ctx) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const at = ctx.currentTime + i * 0.09;
        tone('sine', freq, envelope(0.11, 0.01, 1.5, at), at, 1.6);
        tone('sine', freq * 2, envelope(0.025, 0.01, 0.8, at), at, 0.9);
      });
    },
  };
}
