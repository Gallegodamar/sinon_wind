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

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export type DailyLeaderboardEntry = {
  id: string;
  user_id: string;
  player_name: string;
  challenge_date: string;
  played_at: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  time_seconds: number;
  rank: number;
};

export type PeriodLeaderboardEntry = {
  user_id: string;
  player_name: string;
  games_played: number;
  total_score: number;
  total_correct: number;
  total_questions: number;
  total_time_seconds: number;
  rank: number;
};

export type DailyAnswerLog = {
  run_id: string;
  question_index: number;
  source_id: string;
  hitza: string;
  chosen: string;
  correct: string;
  is_correct: boolean;
  response_ms: number;
  points: number;
};

export type DailyRunWithAnswers = {
  id: string;
  user_id: string;
  player_name: string;
  challenge_date: string;
  played_at: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  time_seconds: number;
  answers: DailyAnswerLog[];
};
