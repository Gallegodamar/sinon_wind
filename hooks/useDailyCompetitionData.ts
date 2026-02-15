import { useCallback, useEffect, useRef, useState } from 'react';
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
  const competitionDateRef = useRef(competitionDate);
  const refreshRequestIdRef = useRef(0);

  useEffect(() => {
    competitionDateRef.current = competitionDate;
  }, [competitionDate]);

  const refreshCompetitionData = useCallback(async () => {
    if (!userId) return;
    const requestId = ++refreshRequestIdRef.current;
    setIsLoadingCompetition(true);
    setCompetitionError(null);
    try {
      const today = await resolveActiveChallengeDate();
      if (requestId !== refreshRequestIdRef.current) return;
      setActiveChallengeDate(today);
      const requestedCompetitionDate = competitionDateRef.current;
      const effectiveCompetitionDate =
        requestedCompetitionDate > today ? today : requestedCompetitionDate;
      if (requestedCompetitionDate !== effectiveCompetitionDate) {
        competitionDateRef.current = effectiveCompetitionDate;
        setCompetitionDate(effectiveCompetitionDate);
      }

      const weeklyPromise = fetchPeriodLeaderboard(getCurrentWeekRange());
      const monthlyPromise = fetchPeriodLeaderboard(getCurrentMonthRange());
      const runsByDatePromise =
        fetchDailyRunsWithAnswersByDate(effectiveCompetitionDate);

      const [playedToday, daily] = await Promise.all([
        hasPlayedDailyChallenge(userId, today),
        fetchDailyLeaderboard(today),
      ]);
      if (requestId !== refreshRequestIdRef.current) return;

      setHasPlayedToday(playedToday);
      setDailyLeaderboard(daily);
      setIsLoadingCompetition(false);

      const [weekly, monthly, runsByDate] = await Promise.all([
        weeklyPromise,
        monthlyPromise,
        runsByDatePromise,
      ]);
      if (requestId !== refreshRequestIdRef.current) return;

      setWeeklyLeaderboard(weekly);
      setMonthlyLeaderboard(monthly);
      setDailyRunsByDate(runsByDate);
    } catch (error) {
      if (requestId !== refreshRequestIdRef.current) return;
      const errorMessage =
        error instanceof Error ? error.message : 'Errore ezezaguna';
      setCompetitionError(`Ezin izan da sailkapena kargatu: ${errorMessage}`);
    } finally {
      if (requestId === refreshRequestIdRef.current) {
        setIsLoadingCompetition(false);
      }
    }
  }, [userId]);

  useEffect(() => () => {
    refreshRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    if (!userId) {
      refreshRequestIdRef.current += 1;
      setHasPlayedToday(false);
      setDailyLeaderboard([]);
      setWeeklyLeaderboard([]);
      setMonthlyLeaderboard([]);
      setDailyRunsByDate([]);
      setIsLoadingCompetition(false);
      setCompetitionError(null);
      return;
    }
    if (shouldRefresh) {
      void refreshCompetitionData();
    }
  }, [competitionDate, refreshCompetitionData, shouldRefresh, userId]);

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
