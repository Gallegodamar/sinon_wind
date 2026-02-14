import { DifficultyLevel, Question, WordData } from '../types';
import { GameAnswerRow, GameRun, FailedWordStat, SearchResultItem } from '../appTypes';
import { supabase } from '../supabase';
import { normalizeSynonyms } from './gameLogic';

export const searchWords = async (term: string): Promise<SearchResultItem[]> => {
  const { data, error } = await supabase
    .from('syn_words')
    .select('source_id, hitza, sinonimoak, level')
    .ilike('search_text', `%${term}%`)
    .eq('active', true)
    .limit(50);

  if (error || !data) return [];

  const rows = data as Array<{
    source_id: string | number;
    hitza: string;
    sinonimoak: unknown;
    level: DifficultyLevel;
  }>;

  return rows.map((r) => ({
    id: r.source_id,
    hitza: r.hitza,
    sinonimoak: normalizeSynonyms(r.sinonimoak),
    level: r.level,
  }));
};

export const fetchWordsByLevel = async (
  level: DifficultyLevel
): Promise<WordData[]> => {
  const { data, error } = await supabase
    .from('syn_words')
    .select('source_id, hitza, sinonimoak')
    .eq('level', level)
    .eq('active', true);

  if (error) return [];

  const rows = (data ?? []) as Array<{
    source_id: string | number;
    hitza: string;
    sinonimoak: unknown;
  }>;

  return rows
    .map((r) => ({
      id: r.source_id,
      hitza: r.hitza,
      sinonimoak: normalizeSynonyms(r.sinonimoak),
    }))
    .filter((w) => w.hitza && w.sinonimoak.length > 0);
};

export const fetchHistoryByUser = async (userId: string): Promise<GameRun[]> => {
  const { data, error } = await supabase
    .from('game_runs')
    .select('id, played_at, difficulty, total, correct, wrong, time_seconds')
    .eq('user_id', userId)
    .order('played_at', { ascending: false });

  if (error || !data) return [];
  return data as GameRun[];
};

export const fetchFailedWordsByUser = async (
  userId: string
): Promise<FailedWordStat[]> => {
  const { data, error } = await supabase
    .from('game_answers')
    .select('source_id, hitza, is_correct, level')
    .eq('user_id', userId);

  if (error) return [];

  const statsMap = new Map<
    string,
    {
      source_id: string | number;
      hitza: string;
      wrong: number;
      attempts: number;
      level: DifficultyLevel;
    }
  >();

  for (const r of (data ?? []) as GameAnswerRow[]) {
    const key = `${r.source_id}_${r.level}`;
    const cur = statsMap.get(key) || {
      source_id: r.source_id,
      hitza: r.hitza,
      wrong: 0,
      attempts: 0,
      level: r.level,
    };
    cur.attempts += 1;
    if (!r.is_correct) cur.wrong += 1;
    statsMap.set(key, cur);
  }

  return Array.from(statsMap.values())
    .map((v) => ({
      ...v,
      wrong_rate: v.attempts > 0 ? (v.wrong / v.attempts) * 100 : 0,
    }))
    .filter((v) => v.attempts > 1);
};

export const insertGameAnswer = async (params: {
  userId: string;
  difficulty: DifficultyLevel;
  question: Question;
  answer: string;
  isCorrect: boolean;
}): Promise<void> => {
  const { userId, difficulty, question, answer, isCorrect } = params;
  await supabase.from('game_answers').insert({
    user_id: userId,
    level: difficulty,
    source_id: question.wordData.id,
    hitza: question.wordData.hitza,
    chosen: answer,
    correct: question.correctAnswer,
    is_correct: isCorrect,
  });
};

export const insertGameRun = async (params: {
  userId: string;
  difficulty: DifficultyLevel;
  total: number;
  correct: number;
  wrong: number;
  timeSeconds: number;
}): Promise<void> => {
  const { userId, difficulty, total, correct, wrong, timeSeconds } = params;
  await supabase.from('game_runs').insert({
    user_id: userId,
    played_at: new Date().toISOString(),
    difficulty,
    total,
    correct,
    wrong,
    time_seconds: timeSeconds,
  });
};
