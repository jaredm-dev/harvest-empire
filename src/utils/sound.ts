// Lightweight synthesized SFX using the Web Audio API — no external assets.
// Browser audio requires a user gesture before play; we lazily create the
// AudioContext on the first call.

let ctx: AudioContext | null = null;
// Mute state is persisted to localStorage so the user's preference survives
// page reloads. Default to unmuted on first visit.
let muted = (() => {
  try { return localStorage.getItem('he-muted') === '1'; } catch { return false; }
})();
let lastPlayed: Record<string, number> = {};

const getCtx = (): AudioContext | null => {
  if (muted) return null;
  if (ctx) return ctx;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
};

// Optional throttle so rapid-fire actions don't pile sounds on top of each other.
const canPlay = (key: string, minGapMs: number): boolean => {
  const now = performance.now();
  if (lastPlayed[key] && now - lastPlayed[key] < minGapMs) return false;
  lastPlayed[key] = now;
  return true;
};

// Generic envelope helper
const playTone = (
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  detune = 0,
  attack = 0.005,
  release = 0.05,
) => {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.detune.setValueAtTime(detune, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + attack);
  gain.gain.linearRampToValueAtTime(0, t + duration + release);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + release + 0.02);
};

// Multi-note sequence — for chimes and chords
const playSeq = (
  notes: Array<{ freq: number; at: number; dur: number; type?: OscillatorType; vol?: number }>,
) => {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? 'triangle';
    osc.frequency.setValueAtTime(n.freq, t0 + n.at);
    gain.gain.setValueAtTime(0, t0 + n.at);
    gain.gain.linearRampToValueAtTime(n.vol ?? 0.12, t0 + n.at + 0.008);
    gain.gain.linearRampToValueAtTime(0, t0 + n.at + n.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.dur + 0.02);
  }
};

export const Sound = {
  setMuted(m: boolean) {
    muted = m;
    try { localStorage.setItem('he-muted', m ? '1' : '0'); } catch {}
  },
  isMuted: () => muted,

  // Soft pop for taps / button presses
  click: () => {
    if (!canPlay('click', 40)) return;
    playTone(720, 0.04, 'square', 0.06, 0, 0.001, 0.03);
  },

  // Bright pluck for harvesting
  harvest: () => {
    if (!canPlay('harvest', 30)) return;
    playTone(660, 0.08, 'triangle', 0.14, 0, 0.005, 0.06);
    setTimeout(() => playTone(990, 0.06, 'triangle', 0.08), 50);
  },

  // Coin-jingle for selling / earning
  cash: () => {
    if (!canPlay('cash', 100)) return;
    playSeq([
      { freq: 880, at: 0.00, dur: 0.06, type: 'triangle', vol: 0.13 },
      { freq: 1175,at: 0.06, dur: 0.06, type: 'triangle', vol: 0.13 },
      { freq: 1480,at: 0.12, dur: 0.10, type: 'triangle', vol: 0.13 },
    ]);
  },

  // Three-note rising chime for achievements / missions
  achievement: () => {
    if (!canPlay('achievement', 200)) return;
    playSeq([
      { freq: 523, at: 0.00, dur: 0.12, type: 'sine', vol: 0.16 }, // C5
      { freq: 659, at: 0.10, dur: 0.12, type: 'sine', vol: 0.16 }, // E5
      { freq: 784, at: 0.20, dur: 0.18, type: 'sine', vol: 0.18 }, // G5
      { freq: 1047,at: 0.30, dur: 0.30, type: 'triangle', vol: 0.18 }, // C6
    ]);
  },

  // Soft warning bloop
  warn: () => {
    if (!canPlay('warn', 100)) return;
    playTone(440, 0.08, 'sawtooth', 0.08, 0, 0.003, 0.05);
    setTimeout(() => playTone(330, 0.10, 'sawtooth', 0.08), 80);
  },

  // Huge fanfare for prestige
  fanfare: () => {
    if (!canPlay('fanfare', 500)) return;
    playSeq([
      { freq: 523, at: 0.00, dur: 0.18, type: 'triangle', vol: 0.18 },
      { freq: 659, at: 0.10, dur: 0.18, type: 'triangle', vol: 0.18 },
      { freq: 784, at: 0.20, dur: 0.20, type: 'triangle', vol: 0.18 },
      { freq: 1047,at: 0.35, dur: 0.45, type: 'triangle', vol: 0.2 },
      { freq: 1319,at: 0.50, dur: 0.30, type: 'sine', vol: 0.16 },
    ]);
  },

  // Truck departs — low rumble swoop
  truck: () => {
    if (!canPlay('truck', 200)) return;
    playTone(140, 0.18, 'sawtooth', 0.08, 0, 0.01, 0.1);
  },
};
