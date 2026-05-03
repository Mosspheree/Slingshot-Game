export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  condition: (score: number, combo: number, bubbles: number) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_pop',
    title: 'First Blood',
    description: 'Pop your first bubble',
    icon: '🎯',
    unlocked: false,
    condition: (score) => score > 0
  },
  {
    id: 'combo_3',
    title: 'Combo Master',
    description: 'Achieve a 3x combo',
    icon: '🔥',
    unlocked: false,
    condition: (_, combo) => combo >= 3
  },
  {
    id: 'score_1000',
    title: 'High Roller',
    description: 'Score 1,000 points',
    icon: '💰',
    unlocked: false,
    condition: (score) => score >= 1000
  },
  {
    id: 'score_5000',
    title: 'Legendary',
    description: 'Score 5,000 points',
    icon: '👑',
    unlocked: false,
    condition: (score) => score >= 5000
  },
  {
    id: 'bubbles_50',
    title: 'Bubble Buster',
    description: 'Pop 50 bubbles',
    icon: '💣',
    unlocked: false,
    condition: (_, __, bubbles) => bubbles >= 50
  },
  {
    id: 'rainbow_shot',
    title: 'Rainbow Warrior',
    description: 'Use the rainbow power-up',
    icon: '🌈',
    unlocked: false,
    condition: (_, __, ___, usedRainbow) => usedRainbow === true
  }
];

export const checkAchievements = (
  score: number,
  combo: number,
  bubblesPopped: number,
  usedRainbow: boolean,
  unlocked: string[]
): { newAchievements: Achievement[]; allAchievements: Achievement[] } => {
  const newOnes: Achievement[] = [];
  
  const updated = ACHIEVEMENTS.map(a => {
    if (unlocked.includes(a.id)) return { ...a, unlocked: true };
    
    const met = a.condition(score, combo, bubblesPopped, usedRainbow);
    if (met) {
      newOnes.push({ ...a, unlocked: true });
      return { ...a, unlocked: true };
    }
    return { ...a, unlocked: false };
  });
  
  return { newAchievements: newOnes, allAchievements: updated };
};

export const saveAchievements = (ids: string[]) => {
  localStorage.setItem('slingshot-achievements', JSON.stringify(ids));
};

export const getAchievements = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('slingshot-achievements') || '[]');
  } catch {
    return [];
  }
};