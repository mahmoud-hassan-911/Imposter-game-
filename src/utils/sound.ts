// Simple Web Audio API synthesizer for game sounds
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  try {
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
};

export const playClick = () => playTone(600, 'sine', 0.1, 0.05);

export const playSuccess = () => {
  playTone(400, 'sine', 0.1, 0.1);
  setTimeout(() => playTone(600, 'sine', 0.2, 0.1), 100);
  setTimeout(() => playTone(800, 'sine', 0.3, 0.1), 200);
};

export const playFail = () => {
  playTone(300, 'sawtooth', 0.3, 0.1);
  setTimeout(() => playTone(200, 'sawtooth', 0.4, 0.1), 200);
};

export const playReveal = () => {
  playTone(500, 'triangle', 0.3, 0.1);
};
