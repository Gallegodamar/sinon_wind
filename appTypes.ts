import { DifficultyLevel, WordData } from './types';

export type AuthUser = {
  id: string;
  email?: string | null;
};

export type SearchResultItem = WordData & { level: DifficultyLevel };

export type GameRun = {
  id: string;
  played_at: string;
  difficulty: DifficultyLevel;
  total: number;
  correct: number;
  wrong: number;
  time_seconds: number;
};

export type GameAnswerRow = {
  source_id: string | number;
  hitza: string;
  is_correct: boolean;
  level: DifficultyLevel;
};

export type FailedWordStat = {
  source_id: string | number;
  hitza: string;
  wrong: number;
  attempts: number;
  level: DifficultyLevel;
  wrong_rate: number;
};
