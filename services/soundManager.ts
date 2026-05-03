export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  value: number;
  color: string;
  scale: number;
  opacity: number;
  createdAt: number;
}

export interface ComboState {
  count: number;
  multiplier: number;
  lastScore: number;
  lastPopTime: number;
}

export interface SoundManager {
  playPop: (color: string) => void;
  playShoot: () => void;
  playCombo: (comboCount: number) => void;
  playGameOver: () => void;
  init: () => void;
}

export const createSoundManager = (): SoundManager => {
  let audioCtx: AudioContext | null = null;
  let initialized = false;

  const init = () => {
    if (initialized) return;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      initialized = true;
    } catch (e) {
      console.warn('Audio not supported');
    }
  };

  const playTone = (freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  };

  const playPop = (color: string) => {
    init();
    const colors: Record<string, number> = {
      red: 200,
      blue: 280,
      green: 350,
      yellow: 420,
      purple: 500,
      orange: 600
    };
    playTone(colors[color] || 300, 0.15, 'sine', 0.12);
    setTimeout(() => playTone((colors[color] || 300) * 1.5, 0.1, 'sine', 0.05), 30);
  };

  const playShoot = () => {
    init();
    playTone(150, 0.2, 'sawtooth', 0.08);
    playTone(200, 0.15, 'sine', 0.05);
  };

  const playCombo = (comboCount: number) => {
    init();
    const baseFreq = 300 + (comboCount * 50);
    for (let i = 0; i < Math.min(comboCount, 5); i++) {
      setTimeout(() => playTone(baseFreq + (i * 100), 0.2, 'square', 0.1 - (i * 0.015)), i * 80);
    }
  };

  const playGameOver = () => {
    init();
    playTone(400, 0.3, 'sine', 0.15);
    setTimeout(() => playTone(300, 0.3, 'sine', 0.15), 150);
    setTimeout(() => playTone(200, 0.5, 'sine', 0.15), 300);
  };

  return { playPop, playShoot, playCombo, playGameOver, init };
};

export const soundManager = createSoundManager();

export const createScorePopup = (x: number, y: number, points: number, color: string, isCombo: boolean = false): ScorePopup => {
  const multiplier = isCombo ? Math.min(points / 100, 4) : 1;
  return {
    id: `popup-${Date.now()}-${Math.random()}`,
    x,
    y,
    text: isCombo ? 'COMBO!' : `+${points}`,
    value: points,
    color,
    scale: 1 + (multiplier * 0.3),
    opacity: 1,
    createdAt: Date.now()
  };
};

export const updateScorePopups = (popups: ScorePopup[], deltaTime: number): ScorePopup[] => {
  const now = Date.now();
  return popups
    .map(p => ({
      ...p,
      y: p.y - (80 * deltaTime),
      scale: p.scale * 0.98,
      opacity: Math.max(0, 1 - (now - p.createdAt) / 1500)
    }))
    .filter(p => p.opacity > 0);
};

export const COMBO_THRESHOLD_MS = 2000;

export const checkCombo = (currentScore: number, state: ComboState): ComboState => {
  const now = Date.now();
  const timeSinceLastPop = now - state.lastPopTime;
  
  if (timeSinceLastPop < COMBO_THRESHOLD_MS && currentScore > 0) {
    const newCount = state.count + 1;
    return {
      count: newCount,
      multiplier: Math.min(1 + (newCount * 0.25), 3),
      lastScore: currentScore,
      lastPopTime: now
    };
  }
  
  return {
    count: currentScore > 0 ? 1 : 0,
    multiplier: 1,
    lastScore: currentScore,
    lastPopTime: now
  };
};

export const saveHighScore = (score: number): boolean => {
  const scores = getHighScores();
  if (scores.length < 10 || score > scores[scores.length - 1].score) {
    scores.push({ score, date: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('slingshot-highscores', JSON.stringify(scores.slice(0, 10)));
    return true;
  }
  return false;
};

export const getHighScores = (): { score: number; date: string }[] => {
  try {
    const stored = localStorage.getItem('slingshot-highscores');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};