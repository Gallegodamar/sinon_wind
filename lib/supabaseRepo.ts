import { DifficultyLevel, Question, WordData } from '../types';
import {
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
  GameAnswerRow,
  GameRun,
  FailedWordStat,
  PeriodLeaderboardEntry,
  SearchResultItem,
} from '../appTypes';
import { supabase } from '../supabase';
import { normalizeSynonyms } from './gameLogic';
import { getLocalDayUtcRange } from './dateUtils';

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

export const fetchAllActiveWords = async (): Promise<WordData[]> => {
  const { data, error } = await supabase
    .from('syn_words')
    .select('source_id, hitza, sinonimoak')
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

type DailyRunRow = {
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
};

type DailyAnswerRow = {
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

const sortLeaderboardRows = <T extends { score: number; time_seconds: number }>(
  rows: T[]
): T[] =>
  [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time_seconds - b.time_seconds;
  });

export const hasPlayedDailyChallenge = async (
  userId: string
): Promise<boolean> => {
  const { startIso, endIso } = getLocalDayUtcRange();
  const { data, error } = await supabase
    .from('daily_challenge_runs')
    .select('id')
    .eq('user_id', userId)
    .gte('played_at', startIso)
    .lt('played_at', endIso)
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
};

export const saveDailyChallengeRun = async (params: {
  userId: string;
  playerName: string;
  challengeDate: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  timeSeconds: number;
  answers: Array<{
    questionIndex: number;
    sourceId: string;
    hitza: string;
    chosen: string;
    correct: string;
    isCorrect: boolean;
    responseMs: number;
    points: number;
  }>;
}): Promise<{ ok: boolean; reason?: 'already_played' | 'error' }> => {
  const {
    userId,
    playerName,
    challengeDate,
    score,
    correct,
    wrong,
    total,
    timeSeconds,
    answers,
  } = params;

  const { data: runData, error: runError } = await supabase
    .from('daily_challenge_runs')
    .insert({
      user_id: userId,
      player_name: playerName,
      challenge_date: challengeDate,
      played_at: new Date().toISOString(),
      score,
      correct,
      wrong,
      total,
      time_seconds: timeSeconds,
    })
    .select('id')
    .single();

  if (runError) {
    const errorCode = (runError as { code?: string }).code;
    if (errorCode === '23505') return { ok: false, reason: 'already_played' };
    return { ok: false, reason: 'error' };
  }

  const runId = (runData as { id: string }).id;
  if (answers.length === 0) return { ok: true };

  const answerRows = answers.map((a) => ({
    run_id: runId,
    question_index: a.questionIndex,
    source_id: a.sourceId,
    hitza: a.hitza,
    chosen: a.chosen,
    correct: a.correct,
    is_correct: a.isCorrect,
    response_ms: a.responseMs,
    points: a.points,
  }));

  const { error: answersError } = await supabase
    .from('daily_challenge_answers')
    .insert(answerRows);

  if (answersError) return { ok: false, reason: 'error' };
  return { ok: true };
};

export const fetchDailyLeaderboard = async (
  challengeDate: string
): Promise<DailyLeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('daily_challenge_runs')
    .select(
      'id, user_id, player_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
    )
    .eq('challenge_date', challengeDate);

  if (error || !data) return [];
  const sorted = sortLeaderboardRows(data as DailyRunRow[]);
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
};

export const fetchPeriodLeaderboard = async (params: {
  startIso: string;
  endIso: string;
}): Promise<PeriodLeaderboardEntry[]> => {
  const { startIso, endIso } = params;
  const { data, error } = await supabase
    .from('daily_challenge_runs')
    .select(
      'user_id, player_name, score, correct, total, time_seconds, played_at'
    )
    .gte('played_at', startIso)
    .lt('played_at', endIso);

  if (error || !data) return [];

  const agg = new Map<
    string,
    {
      user_id: string;
      player_name: string;
      games_played: number;
      total_score: number;
      total_correct: number;
      total_questions: number;
      total_time_seconds: number;
    }
  >();

  for (const row of data as Array<{
    user_id: string;
    player_name: string;
    score: number;
    correct: number;
    total: number;
    time_seconds: number;
  }>) {
    const cur = agg.get(row.user_id) || {
      user_id: row.user_id,
      player_name: row.player_name,
      games_played: 0,
      total_score: 0,
      total_correct: 0,
      total_questions: 0,
      total_time_seconds: 0,
    };
    cur.games_played += 1;
    cur.total_score += row.score;
    cur.total_correct += row.correct;
    cur.total_questions += row.total;
    cur.total_time_seconds += row.time_seconds;
    cur.player_name = row.player_name || cur.player_name;
    agg.set(row.user_id, cur);
  }

  const sorted = Array.from(agg.values()).sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return a.total_time_seconds - b.total_time_seconds;
  });

  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
};

export const fetchDailyRunsWithAnswersByDate = async (
  challengeDate: string
): Promise<DailyRunWithAnswers[]> => {
  const { data: runsData, error: runsError } = await supabase
    .from('daily_challenge_runs')
    .select(
      'id, user_id, player_name, challenge_date, played_at, score, correct, wrong, total, time_seconds'
    )
    .eq('challenge_date', challengeDate);

  if (runsError || !runsData) return [];

  const runs = sortLeaderboardRows(runsData as DailyRunRow[]);
  if (runs.length === 0) return [];

  const runIds = runs.map((r) => r.id);
  const { data: answersData, error: answersError } = await supabase
    .from('daily_challenge_answers')
    .select(
      'run_id, question_index, source_id, hitza, chosen, correct, is_correct, response_ms, points'
    )
    .in('run_id', runIds)
    .order('question_index', { ascending: true });

  if (answersError) {
    return runs.map((run) => ({ ...run, answers: [] }));
  }

  const answersByRun = new Map<string, DailyAnswerRow[]>();
  for (const answer of (answersData ?? []) as DailyAnswerRow[]) {
    const list = answersByRun.get(answer.run_id) || [];
    list.push(answer);
    answersByRun.set(answer.run_id, list);
  }

  return runs.map((run) => ({
    ...run,
    answers: answersByRun.get(run.id) || [],
  }));
};
