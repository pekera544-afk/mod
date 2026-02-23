const SOUND_CONFIGS = {
  room:         { freqs: [440, 554, 659], dur: 0.12 },
  announcement: { freqs: [330, 440, 550], dur: 0.14 },
  news:         { freqs: [523, 659, 784], dur: 0.12 },
  mention:      { freqs: [880, 1047],     dur: 0.10 },
  friend:       { freqs: [659, 784, 988], dur: 0.12 },
  dm:           { freqs: [784, 988],      dur: 0.10 },
  event:        { freqs: [440, 523, 659], dur: 0.13 },
};

export function playNotifSound(type) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const cfg = SOUND_CONFIGS[type] || SOUND_CONFIGS.room;
    let t = ctx.currentTime + 0.02;
    cfg.freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = t + i * (cfg.dur + 0.02);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + cfg.dur);
      osc.start(start);
      osc.stop(start + cfg.dur + 0.05);
    });
    const totalDur = cfg.freqs.length * (cfg.dur + 0.02) + 0.2;
    setTimeout(() => ctx.close(), totalDur * 1000 + 500);
  } catch {}
}
