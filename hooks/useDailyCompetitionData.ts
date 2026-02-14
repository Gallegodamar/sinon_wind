import { useEffect, useState } from 'react';
import {
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
  LeaderboardPeriod,
  PeriodLeaderboardEntry,
} from '../appTypes';
import {
  fetchDailyLeaderboard,
  fetchDailyRunsWithAnswersByDate,
  fetchPeriodLeaderboard,
  hasPlayedDailyChallenge,
  resolveActiveChallengeDate,
} from '../lib/supabaseRepo';
import { supabase } from '../supabase';
import {
  formatLocalDate,
  getCurrentMonthRange,
  getCurrentWeekRange,
} from '../lib/dateUtils';

type Params = {
  userId?: string;
  shouldRefresh: boolean;
};

export const useDailyCompetitionData = ({ userId, shouldRefresh }: Params) => {
  const [competitionPeriod, setCompetitionPeriod] =
    useState<LeaderboardPeriod>('daily');
  const [dailyLeaderboard, setDailyLeaderboard] = useState<
    DailyLeaderboardEntry[]
  >([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<
    PeriodLeaderboardEntry[]
  >([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<
    PeriodLeaderboardEntry[]
  >([]);
  const [competitionDate, setCompetitionDate] = useState<string>(
    formatLocalDate(new Date())
  );
  const [dailyRunsByDate, setDailyRunsByDate] = useState<DailyRunWithAnswers[]>(
    []
  );
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [isLoadingCompetition, setIsLoadingCompetition] = useState(false);
  const [competitionError, setCompetitionError] = useState<string | null>(null);
  const [activeChallengeDate, setActiveChallengeDate] = useState<string>(
    formatLocalDate(new Date())
  );

  const refreshCompetitionData = async () => {
    if (!userId) return;
    setIsLoadingCompetition(true);
    setCompetitionError(null);
    try {
      const { error: accessError } = await supabase
        .from('daily_challenge_runs')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      if (accessError) {
        setCompetitionError(
          `Ezin da sailkapena irakurri: ${accessError.message} (${accessError.code ?? 'no_code'})`
        );
      }

      const today = await resolveActiveChallengeDate();
      setActiveChallengeDate(today);
      const effectiveCompetitionDate = competitionDate > today ? today : competitionDate;
      if (competitionDate !== effectiveCompetitionDate) {
        setCompetitionDate(effectiveCompetitionDate);
      }
      const [playedToday, daily, weekly, monthly, runsByDate] = await Promise.all([
        hasPlayedDailyChallenge(userId, today),
        fetchDailyLeaderboard(today),
        fetchPeriodLeaderboard(getCurrentWeekRange()),
        fetchPeriodLeaderboard(getCurrentMonthRange()),
        fetchDailyRunsWithAnswersByDate(effectiveCompetitionDate),
      ]);

      setHasPlayedToday(playedToday);
      setDailyLeaderboard(daily);
      setWeeklyLeaderboard(weekly);
      setMonthlyLeaderboard(monthly);
      setDailyRunsByDate(runsByDate);
    } finally {
      setIsLoadingCompetition(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setHasPlayedToday(false);
      setDailyLeaderboard([]);
      setWeeklyLeaderboard([]);
      setMonthlyLeaderboard([]);
      setDailyRunsByDate([]);
      setCompetitionError(null);
      return;
    }
    if (shouldRefresh) {
      void refreshCompetitionData();
    }
  }, [userId, shouldRefresh, competitionDate]);

  return {
    competitionPeriod,
    setCompetitionPeriod,
    dailyLeaderboard,
    weeklyLeaderboard,
    monthlyLeaderboard,
    competitionDate,
    setCompetitionDate,
    activeChallengeDate,
    dailyRunsByDate,
    hasPlayedToday,
    setHasPlayedToday,
    isLoadingCompetition,
    competitionError,
    refreshCompetitionData,
  };
};
