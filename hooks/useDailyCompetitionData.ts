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

  const refreshCompetitionData = async () => {
    if (!userId) return;
    setIsLoadingCompetition(true);
    try {
      const today = formatLocalDate(new Date());
      const [playedToday, daily, weekly, monthly, runsByDate] = await Promise.all([
        hasPlayedDailyChallenge(userId),
        fetchDailyLeaderboard(today),
        fetchPeriodLeaderboard(getCurrentWeekRange()),
        fetchPeriodLeaderboard(getCurrentMonthRange()),
        fetchDailyRunsWithAnswersByDate(competitionDate),
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
    dailyRunsByDate,
    hasPlayedToday,
    setHasPlayedToday,
    isLoadingCompetition,
    refreshCompetitionData,
  };
};
