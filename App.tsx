
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
import { useDebouncedWordSearch } from './hooks/useDebouncedWordSearch';
import { useDailyCompetitionData } from './hooks/useDailyCompetitionData';
import { useGameSession } from './hooks/useGameSession';
const FAILED_WORDS_CACHE_TTL_MS = 30_000;
const QUESTIONS_PER_PLAYER = 10;
const DAILY_QUESTIONS = 10;

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.SETUP);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);

  // Auth, Search & History States
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<ContributeTab>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const { searchResults, isSearching } = useDebouncedWordSearch(searchTerm);

  const [wordsByLevel, setWordsByLevel] = useState<Record<number, WordData[]>>({});
  const [isLoadingWordCache, setIsLoadingWordCache] = useState(false);
  const levelRequestsRef = useRef<
    Partial<Record<DifficultyLevel, Promise<WordData[]>>>
  >({});
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
    dailyRunsByDate,
    hasPlayedToday,
    setHasPlayedToday,
    isLoadingCompetition,
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
    if (status === GameStatus.SETUP) {
      setPlayers(Array.from({ length: numPlayers }, (_, i) => ({ 
        id: i, 
        name: `Jokalaria ${i + 1}`, 
        score: 0, 
        time: 0,
        correctAnswers: 0,
      })));
    }
  }, [numPlayers, status]);

  const fetchWordsFromSupabase = useCallback(
    async (level: DifficultyLevel): Promise<WordData[]> => {
      return fetchWordsByLevel(level);
    },
    []
  );

  const ensureLevelWords = useCallback(async (level: DifficultyLevel) => {
    if (wordsByLevel[level]?.length) return wordsByLevel[level];
    const existingRequest = levelRequestsRef.current[level];
    if (existingRequest) return existingRequest;

    const request = (async () => {
        setIsLoadingWordCache(true);
      try {
        const words = await fetchWordsFromSupabase(level);
        setWordsByLevel((prev) =>
          prev[level]?.length ? prev : { ...prev, [level]: words }
        );
        return words;
      } finally {
        setIsLoadingWordCache(false);
        delete levelRequestsRef.current[level];
      }
    })();

    levelRequestsRef.current[level] = request;
    return request;
  }, [fetchWordsFromSupabase, wordsByLevel]);

  const fetchMostFailedWords = async (): Promise<FailedWordStat[]> => {
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
  };

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
    difficulty,
    players,
    setPlayers,
    ensureLevelWords,
    fetchMostFailedWords,
    setStatus,
    setHasPlayedToday,
    refreshCompetitionData,
  });
  const isWordsBusy = isLoadingWords || isLoadingWordCache;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const email = username.includes('@') ? username : `${username}@tuapp.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError("ID edo pasahitz okerra");
    else setStatus(GameStatus.CONTRIBUTE);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setStatus(GameStatus.SETUP);
  };

  // Review logic - show ALL words played in the current game session
  const playedWordData = useMemo(() => {
    const uniqueWords = new Map<string, WordData>();
    questionPool.forEach(q => {
      uniqueWords.set(q.wordData.hitza, q.wordData);
    });
    return Array.from(uniqueWords.values())
      .sort((a, b) => a.hitza.localeCompare(b.hitza));
  }, [questionPool]);

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
        user={user}
        onBack={() => setStatus(GameStatus.SETUP)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        startDailyCompetition={() => void startDailyCompetition()}
        isLoadingWords={isWordsBusy}
        hasPlayedToday={hasPlayedToday}
        isLoadingCompetition={isLoadingCompetition}
        dailyLeaderboard={dailyLeaderboard}
        competitionPeriod={competitionPeriod}
        setCompetitionPeriod={setCompetitionPeriod}
        weeklyLeaderboard={weeklyLeaderboard}
        monthlyLeaderboard={monthlyLeaderboard}
        competitionDate={competitionDate}
        setCompetitionDate={setCompetitionDate}
        dailyRunsByDate={dailyRunsByDate}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        startNewGame={startNewGame}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSearching={isSearching}
        searchResults={searchResults}
      />
    );
  }
  if (status === GameStatus.SETUP) {
    return (
      <SetupScreen
        numPlayers={numPlayers}
        setNumPlayers={setNumPlayers}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        players={players}
        onPlayerNameChange={handlePlayerNameChange}
        onStart={() => void startNewGame()}
        isLoadingWords={isWordsBusy}
        onOpenAuth={() => setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.AUTH)}
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
    const poolIdx = currentPlayerIndex * QUESTIONS_PER_PLAYER + currentQuestionIndex;
    const currentQuestion = questionPool[poolIdx];
    const player = players[currentPlayerIndex];
    if (!currentQuestion) return null;
    return (
      <PlayingScreen
        playerName={player.name}
        currentAnswerBonus={currentAnswerBonus}
        currentQuestionIndex={currentQuestionIndex}
        currentQuestion={currentQuestion}
        isAnswered={isAnswered}
        selectedAnswer={selectedAnswer}
        onAnswer={handleAnswer}
        onNextQuestion={nextQuestion}
        onExit={() => setStatus(GameStatus.SUMMARY)}
      />
    );
  }
  if (status === GameStatus.SUMMARY) {
    return (
      <SummaryScreen
        userExists={Boolean(user)}
        gameMode={gameMode}
        players={players}
        dailyQuestions={DAILY_QUESTIONS}
        questionsPerPlayer={QUESTIONS_PER_PLAYER}
        onPlayAgain={() => {
          if (gameMode === 'daily') {
            setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.SETUP);
            return;
          }
          setPlayers(players.map((p) => ({ ...p, score: 0, time: 0, correctAnswers: 0 })));
          void startNewGame(players.length === 1);
        }}
        onReview={() => setStatus(GameStatus.REVIEW)}
        onHome={() => setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.SETUP)}
      />
    );
  }

  if (status === GameStatus.REVIEW) {
    return (
      <ReviewScreen
        playedWordData={playedWordData}
        onBack={() => setStatus(GameStatus.SUMMARY)}
      />
    );
  }
  return null;
};

export default App;



