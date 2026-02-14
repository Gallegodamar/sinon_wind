import { Question, WordData } from '../types';

export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const getWordType = (word: string): string => {
  const normalized = word.toLowerCase().trim();
  if (
    normalized.endsWith('tu') ||
    normalized.endsWith('du') ||
    normalized.endsWith('ten') ||
    normalized.endsWith('tzen')
  ) {
    return 'verb';
  }
  if (normalized.endsWith('ak') || normalized.endsWith('ek')) return 'plural';
  if (
    normalized.endsWith('era') ||
    normalized.endsWith('ura') ||
    normalized.endsWith('tasun')
  ) {
    return 'abstract';
  }
  return 'other';
};

export const normalizeSynonyms = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
};

export const generatePoolFromData = (
  needed: number,
  poolSource: WordData[],
  statsMap?: Map<string, { wrong: number; attempts: number }>
): Question[] => {
  if (poolSource.length === 0 || needed <= 0) return [];

  const pickWeighted = () => {
    if (!statsMap || statsMap.size === 0) {
      return poolSource[Math.floor(Math.random() * poolSource.length)];
    }
    const weights = poolSource.map((w) => {
      const s = statsMap.get(String(w.id));
      const wrong = s?.wrong ?? 0;
      const attempts = s?.attempts ?? 0;
      const weight = 1 + wrong * 3 + (attempts > 0 ? (wrong / attempts) * 5 : 0);
      return Math.max(1, weight);
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < poolSource.length; i++) {
      r -= weights[i];
      if (r <= 0) return poolSource[i];
    }
    return poolSource[poolSource.length - 1];
  };

  const uniqueStart = shuffleArray(poolSource).slice(
    0,
    Math.min(needed, poolSource.length)
  );

  const gameData: WordData[] = [...uniqueStart];
  while (gameData.length < needed) {
    gameData.push(pickWeighted());
  }

  const allWordsInPool = poolSource.flatMap((d) => [d.hitza, ...d.sinonimoak]);

  return gameData.map((data): Question => {
    const correctAnswer =
      data.sinonimoak[Math.floor(Math.random() * data.sinonimoak.length)];
    const targetType = getWordType(data.hitza);
    const distractorsPool = allWordsInPool.filter(
      (w) => w !== data.hitza && !data.sinonimoak.includes(w)
    );
    const sameTypeDistractors = distractorsPool.filter(
      (w) => getWordType(w) === targetType
    );
    const shuffledDistractors = shuffleArray(
      Array.from(
        new Set(
          sameTypeDistractors.length >= 10
            ? sameTypeDistractors
            : distractorsPool
        )
      )
    ).slice(0, 3);
    const options = shuffleArray([correctAnswer, ...shuffledDistractors]);
    return { wordData: data, correctAnswer, options };
  });
};
