
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WordData, Player, GameStatus, DifficultyLevel } from './types';
import { supabase } from './supabase';
import {
  AuthUser,
  FailedWordStat,
} from './appTypes';
import {
  fetchWordsByLevel,
  fetchFailedWordsByUser,
} from './lib/supabaseRepo';
import { AuthScreen } from './components/screens/AuthScreen';
import { IntermissionScreen } from './components/screens/IntermissionScreen';
import { PlayingScreen } from './components/screens/PlayingScreen';
import { ReviewScreen } from './components/screens/ReviewScreen';
import { ContributeScreen, ContributeTab } from './components/screens/ContributeScreen';
import { SetupScreen } from './components/screens/SetupScreen';
import { SummaryScreen } from './components/screens/SummaryScreen';
import { UserIdentityBadge } from './components/ui/UserIdentityBadge';
import { AppShell } from './components/layout/AppShell';
import { useDailyCompetitionData } from './hooks/useDailyCompetitionData';
import { useGameSession } from './hooks/useGameSession';
import {
  DAILY_QUESTIONS,
  FAILED_WORDS_CACHE_TTL_MS,
  QUESTIONS_PER_PLAYER,
} from './lib/gameConfig';

const buildSetupPlayers = (count: number, previous: Player[] = []): Player[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    name: previous[index]?.name?.trim() || `Jokalaria ${index + 1}`,
    score: 0,
    time: 0,
    correctAnswers: 0,
  }));

const arePlayersEqual = (left: Player[], right: Player[]): boolean =>
  left.length === right.length &&
  left.every((player, index) => {
    const candidate = right[index];
    return (
      player.id === candidate.id &&
      player.name === candidate.name &&
      player.score === candidate.score &&
      player.time === candidate.time &&
      player.correctAnswers === candidate.correctAnswers
    );
  });

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.SETUP);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState<Player[]>(() => buildSetupPlayers(2));

  // Auth & History States
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<ContributeTab>('home');

  const [wordsByLevel, setWordsByLevel] = useState<Record<number, WordData[]>>({});
  const [isLoadingWordCache, setIsLoadingWordCache] = useState(false);
  const wordsByLevelRef = useRef<Record<number, WordData[]>>({});
  const levelRequestsRef = useRef<
    Partial<Record<DifficultyLevel, Promise<WordData[]>>>
  >({});
  const activeWordRequestsRef = useRef(0);
  const failedStatsCacheRef = useRef<{
    userId: string;
    fetchedAt: number;
    data: FailedWordStat[];
  } | null>(null);
  const {
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
  } = useDailyCompetitionData({
    userId: user?.id,
    shouldRefresh: activeTab === 'home' || activeTab === 'eguneko',
  });
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    wordsByLevelRef.current = wordsByLevel;
  }, [wordsByLevel]);

  useEffect(() => {
    if (status !== GameStatus.SETUP) return;
    setPlayers((previousPlayers) => {
      const nextPlayers = buildSetupPlayers(numPlayers, previousPlayers);
      return arePlayersEqual(previousPlayers, nextPlayers)
        ? previousPlayers
        : nextPlayers;
    });
  }, [numPlayers, status]);

  useEffect(() => {
    if (!user && difficulty !== 1) {
      setDifficulty(1);
    }
  }, [difficulty, user]);

  useEffect(() => {
    if (status !== GameStatus.CONTRIBUTE) return;
    setActiveTab('home');
  }, [status]);

  const fetchWordsFromSupabase = useCallback(
    async (level: DifficultyLevel): Promise<WordData[]> => {
      return fetchWordsByLevel(level);
    },
    []
  );

  const beginWordCacheLoad = useCallback(() => {
    activeWordRequestsRef.current += 1;
    setIsLoadingWordCache(true);
  }, []);

  const endWordCacheLoad = useCallback(() => {
    activeWordRequestsRef.current = Math.max(0, activeWordRequestsRef.current - 1);
    if (activeWordRequestsRef.current === 0) {
      setIsLoadingWordCache(false);
    }
  }, []);

  const ensureLevelWords = useCallback(async (level: DifficultyLevel) => {
    if (Object.prototype.hasOwnProperty.call(wordsByLevelRef.current, level)) {
      return wordsByLevelRef.current[level] ?? [];
    }
    const existingRequest = levelRequestsRef.current[level];
    if (existingRequest) return existingRequest;

    beginWordCacheLoad();
    const request = (async () => {
      try {
        const words = await fetchWordsFromSupabase(level);
        setWordsByLevel((prev) => {
          if (Object.prototype.hasOwnProperty.call(prev, level)) return prev;
          const next = { ...prev, [level]: words };
          wordsByLevelRef.current = next;
          return next;
        });
        return words;
      } finally {
        endWordCacheLoad();
        delete levelRequestsRef.current[level];
      }
    })();

    levelRequestsRef.current[level] = request;
    return request;
  }, [beginWordCacheLoad, endWordCacheLoad, fetchWordsFromSupabase]);

  const fetchMostFailedWords = useCallback(async (): Promise<FailedWordStat[]> => {
    if (!user) return [];
    const now = Date.now();
    if (
      failedStatsCacheRef.current &&
      failedStatsCacheRef.current.userId === user.id &&
      now - failedStatsCacheRef.current.fetchedAt < FAILED_WORDS_CACHE_TTL_MS
    ) {
      return failedStatsCacheRef.current.data;
    }

    const stats = await fetchFailedWordsByUser(user.id);

    failedStatsCacheRef.current = {
      userId: user.id,
      fetchedAt: now,
      data: stats,
    };

    return stats;
  }, [user]);

  const {
    gameMode,
    questionPool,
    currentPlayerIndex,
    currentQuestionIndex,
    selectedAnswer,
    isAnswered,
    currentAnswerBonus,
    isLoadingWords,
    startNewGame,
    startDailyCompetition,
    startPlayerTurn,
    handlePlayerNameChange,
    handleAnswer,
    nextQuestion,
  } = useGameSession({
    user,
    difficulty: user ? difficulty : 1,
    players,
    setPlayers,
    ensureLevelWords,
    fetchMostFailedWords,
    setStatus,
    setHasPlayedToday,
    refreshCompetitionData,
  });
  const isWordsBusy = isLoadingWords || isLoadingWordCache;
  const questionsPerTurn =
    gameMode === 'daily' ? DAILY_QUESTIONS : QUESTIONS_PER_PLAYER;

  const goSetupOrContribute = useCallback(
    () => setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.SETUP),
    [user]
  );
  const openAuthOrContribute = useCallback(
    () => setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.AUTH),
    [user]
  );

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const email = username.includes('@') ? username : `${username}@tuapp.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError("ID edo pasahitz okerra");
    else setStatus(GameStatus.CONTRIBUTE);
  }, [password, username]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setStatus(GameStatus.SETUP);
  }, []);
  const topRightControl = user ? (
    <UserIdentityBadge user={user} onLogout={handleLogout} />
  ) : undefined;

  // Review logic - show ALL words played in the current game session
  const playedWordData = useMemo(() => {
    const uniqueWords = new Map<string, WordData>();
    questionPool.forEach(q => {
      uniqueWords.set(q.wordData.hitza, q.wordData);
    });
    return Array.from(uniqueWords.values())
      .sort((a, b) => a.hitza.localeCompare(b.hitza));
  }, [questionPool]);

  const renderCurrentScreen = () => {
    if (status === GameStatus.AUTH) {
      return (
        <AuthScreen
          username={username}
          password={password}
          authError={authError}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleLogin}
          onBack={() => setStatus(GameStatus.SETUP)}
        />
      );
    }
    if (status === GameStatus.CONTRIBUTE) {
      return (
        <ContributeScreen
          onBack={() => setStatus(GameStatus.SETUP)}
          topRightControl={topRightControl}
          userId={user?.id ?? ''}
          userEmail={user?.email ?? null}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          startDailyCompetition={() => void startDailyCompetition()}
          isLoadingWords={isWordsBusy}
          hasPlayedToday={hasPlayedToday}
          isLoadingCompetition={isLoadingCompetition}
          competitionError={competitionError}
          dailyLeaderboard={dailyLeaderboard}
          competitionPeriod={competitionPeriod}
          setCompetitionPeriod={setCompetitionPeriod}
          weeklyLeaderboard={weeklyLeaderboard}
          monthlyLeaderboard={monthlyLeaderboard}
          competitionDate={competitionDate}
          setCompetitionDate={setCompetitionDate}
          activeChallengeDate={activeChallengeDate}
          dailyRunsByDate={dailyRunsByDate}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          startNewGame={startNewGame}
        />
      );
    }
    if (status === GameStatus.SETUP) {
      return (
        <SetupScreen
          numPlayers={numPlayers}
          setNumPlayers={setNumPlayers}
          difficulty={user ? difficulty : 1}
          setDifficulty={setDifficulty}
          canSelectDifficulty={Boolean(user)}
          players={players}
          onPlayerNameChange={handlePlayerNameChange}
          onStart={() => void startNewGame()}
          isLoadingWords={isWordsBusy}
          onOpenAuth={openAuthOrContribute}
          topRightControl={topRightControl}
        />
      );
    }

    if (status === GameStatus.INTERMISSION) {
      const player = players[currentPlayerIndex];
      return (
        <IntermissionScreen
          playerName={player.name}
          playerNumber={currentPlayerIndex + 1}
          onStart={startPlayerTurn}
        />
      );
    }
    if (status === GameStatus.PLAYING) {
      const poolIdx = currentPlayerIndex * questionsPerTurn + currentQuestionIndex;
      const currentQuestion = questionPool[poolIdx];
      const player = players[currentPlayerIndex];
      if (!currentQuestion || !player) {
        return (
          <AppShell contentClassName="flex items-center justify-center p-6 text-center">
            <div className="surface-card surface-card--muted max-w-md p-6">
              <p className="font-display text-2xl font-semibold text-slate-900">
                Ezin izan da galdera kargatu.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Partida berrabiarazi eta berriro saiatu.
              </p>
              <button
                onClick={goSetupOrContribute}
                className="btn-primary mt-5"
              >
                Hasierara
              </button>
            </div>
          </AppShell>
        );
      }
      return (
        <PlayingScreen
          playerName={player.name}
          currentAnswerBonus={currentAnswerBonus}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={questionsPerTurn}
          currentQuestion={currentQuestion}
          isAnswered={isAnswered}
          selectedAnswer={selectedAnswer}
          onAnswer={handleAnswer}
          onNextQuestion={nextQuestion}
          onExit={() => {
            if (gameMode === 'daily') {
              alert(
                `Eguneko jokoa gordetzeko, amaitu ${DAILY_QUESTIONS} galderak.`
              );
              return;
            }
            setStatus(GameStatus.SUMMARY);
          }}
          topRightControl={topRightControl}
        />
      );
    }
    if (status === GameStatus.SUMMARY) {
      return (
        <SummaryScreen
          userExists={Boolean(user)}
          gameMode={gameMode}
          players={players}
          questionsPerTurn={questionsPerTurn}
          onPlayAgain={() => {
            if (gameMode === 'daily') {
              goSetupOrContribute();
              return;
            }
            setPlayers(players.map((p) => ({ ...p, score: 0, time: 0, correctAnswers: 0 })));
            void startNewGame(players.length === 1);
          }}
          onReview={() => setStatus(GameStatus.REVIEW)}
          onHome={goSetupOrContribute}
          topRightControl={topRightControl}
        />
      );
    }

    if (status === GameStatus.REVIEW) {
      return (
        <ReviewScreen
          playedWordData={playedWordData}
          onBack={() => setStatus(GameStatus.SUMMARY)}
          topRightControl={topRightControl}
        />
      );
    }
    return null;
  };

  return (
    <>{renderCurrentScreen()}</>
  );
};

export default App;



