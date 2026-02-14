
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WordData, Player, Question, GameStatus, DifficultyLevel } from './types';
import { supabase } from './supabase';
import {
  AuthUser,
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
  GameRun,
  LeaderboardPeriod,
  FailedWordStat,
  PeriodLeaderboardEntry,
} from './appTypes';
import { generatePoolFromData } from './lib/gameLogic';
import {
  fetchAllActiveWords,
  fetchDailyLeaderboard,
  fetchDailyRunsWithAnswersByDate,
  fetchWordsByLevel,
  fetchHistoryByUser,
  fetchFailedWordsByUser,
  fetchPeriodLeaderboard,
  hasPlayedDailyChallenge,
  insertGameAnswer,
  insertGameRun,
  saveDailyChallengeRun,
} from './lib/supabaseRepo';
import { AuthScreen } from './components/screens/AuthScreen';
import { IntermissionScreen } from './components/screens/IntermissionScreen';
import { PlayingScreen } from './components/screens/PlayingScreen';
import { ReviewScreen } from './components/screens/ReviewScreen';
import { useDebouncedWordSearch } from './hooks/useDebouncedWordSearch';

const QUESTIONS_PER_PLAYER = 10;
const DAILY_QUESTIONS = 10;
const FAILED_WORDS_CACHE_TTL_MS = 30_000;
const BASE_POINTS_PER_CORRECT = 10;
type GameMode = 'regular' | 'daily';

type PendingDailyAnswer = {
  questionIndex: number;
  sourceId: string;
  hitza: string;
  chosen: string;
  correct: string;
  isCorrect: boolean;
  responseMs: number;
  points: number;
};

const getTimeBonus = (seconds: number): number => {
  if (seconds < 2) return 5;
  if (seconds < 4) return 3;
  if (seconds <= 7) return 1;
  return 0;
};

const toDateOnly = (date: Date): string => date.toISOString().split('T')[0];

const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.SETUP);
  const [gameMode, setGameMode] = useState<GameMode>('regular');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [numPlayers, setNumPlayers] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  const [currentAnswerBonus, setCurrentAnswerBonus] = useState(0);
  const turnStartTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);

  // Auth, Search & History States
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'bilatu' | 'historia' | 'lehiaketa'>('bilatu');
  const [historySubTab, setHistorySubTab] = useState<'gaur' | 'datuak' | 'hutsak'>('gaur');
  const [failedWordsLevel, setFailedWordsLevel] = useState<DifficultyLevel>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { searchResults, isSearching } = useDebouncedWordSearch(searchTerm);
  const [history, setHistory] = useState<GameRun[]>([]);
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
    toDateOnly(new Date())
  );
  const [dailyRunsByDate, setDailyRunsByDate] = useState<DailyRunWithAnswers[]>(
    []
  );
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [isLoadingCompetition, setIsLoadingCompetition] = useState(false);
  const [failedWordsStats, setFailedWordsStats] = useState<FailedWordStat[]>(
    []
  );
  const [isSaving, setIsSaving] = useState(false);

  // History filtering states
  const [searchDate, setSearchDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [wordsByLevel, setWordsByLevel] = useState<Record<number, WordData[]>>({});
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const levelRequestsRef = useRef<
    Partial<Record<DifficultyLevel, Promise<WordData[]>>>
  >({});
  const failedStatsCacheRef = useRef<{
    userId: string;
    fetchedAt: number;
    data: FailedWordStat[];
  } | null>(null);
  const pendingDailyAnswersRef = useRef<PendingDailyAnswer[]>([]);

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
    if (user && activeTab === 'historia') {
      fetchHistory();
      refreshFailedStats();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user && activeTab === 'lehiaketa') {
      void refreshCompetitionData();
    }
  }, [user, activeTab, competitionDate]);

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
      setIsLoadingWords(true);
      try {
        const words = await fetchWordsFromSupabase(level);
        setWordsByLevel((prev) =>
          prev[level]?.length ? prev : { ...prev, [level]: words }
        );
        return words;
      } finally {
        setIsLoadingWords(false);
        delete levelRequestsRef.current[level];
      }
    })();

    levelRequestsRef.current[level] = request;
    return request;
  }, [fetchWordsFromSupabase, wordsByLevel]);

  const fetchHistory = async () => {
    if (!user) return;
    const rows = await fetchHistoryByUser(user.id);
    setHistory(rows);
  };

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

  const refreshFailedStats = async () => {
    const stats = await fetchMostFailedWords();
    setFailedWordsStats(stats);
  };

  const refreshCompetitionData = async () => {
    if (!user) return;
    setIsLoadingCompetition(true);
    try {
      const today = toDateOnly(new Date());
      const [playedToday, daily, weekly, monthly, runsByDate] = await Promise.all([
        hasPlayedDailyChallenge(user.id, today),
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

  const startNewGame = useCallback(async (isSolo: boolean = false) => {
    setGameMode('regular');
    setIsLoadingWords(true);
    try {
      if (isSolo && user) {
        const displayName = user.email?.split('@')[0].toUpperCase() || 'NI';
        setPlayers([{ id: 0, name: displayName, score: 0, time: 0, correctAnswers: 0 }]);
      }
      const totalNeeded = (isSolo ? 1 : players.length) * QUESTIONS_PER_PLAYER;
      const poolSource = await ensureLevelWords(difficulty);
      if (!poolSource.length) {
        alert("Ez da hitzik aurkitu maila honetan.");
        return;
      }

      let statsMap: Map<string, { wrong: number; attempts: number }> | undefined;
      if (user) {
        const failed = await fetchMostFailedWords();
        statsMap = new Map(
          failed.map((f) => [String(f.source_id), { wrong: f.wrong, attempts: f.attempts }])
        );
      }

      const newPool = generatePoolFromData(totalNeeded, poolSource, statsMap);
      setQuestionPool(newPool);
      pendingDailyAnswersRef.current = [];
      setCurrentPlayerIndex(0);
      setCurrentQuestionIndex(0);
      setStatus(GameStatus.INTERMISSION);
    } finally {
      setIsLoadingWords(false);
    }
  }, [difficulty, ensureLevelWords, players.length, user]);

  const startDailyCompetition = useCallback(async () => {
    if (!user) return;
    const today = toDateOnly(new Date());
    const alreadyPlayed = await hasPlayedDailyChallenge(user.id, today);
    if (alreadyPlayed) {
      setHasPlayedToday(true);
      alert('Gaurko lehiaketa jada jokatu duzu.');
      return;
    }

    setGameMode('daily');
    setIsLoadingWords(true);
    try {
      const allWords = await fetchAllActiveWords();
      if (!allWords.length) {
        alert('Ez dago lehiaketarako hitzik eskuragarri.');
        return;
      }

      const displayName = user.email?.split('@')[0].toUpperCase() || 'NI';
      setPlayers([
        {
          id: 0,
          name: displayName,
          score: 0,
          time: 0,
          correctAnswers: 0,
        },
      ]);

      const pool = generatePoolFromData(DAILY_QUESTIONS, allWords);
      setQuestionPool(pool);
      setCurrentPlayerIndex(0);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      pendingDailyAnswersRef.current = [];
      setStatus(GameStatus.INTERMISSION);
    } finally {
      setIsLoadingWords(false);
    }
  }, [user]);

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

  const startPlayerTurn = () => {
    turnStartTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();
    pendingDailyAnswersRef.current = [];
    setCurrentAnswerBonus(0);
    setStatus(GameStatus.PLAYING);
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
  };

  const handlePlayerNameChange = (id: number, name: string) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
  };

  const handleAnswer = async (answer: string) => {
    if (isAnswered) return;
    const poolIdx = currentPlayerIndex * QUESTIONS_PER_PLAYER + currentQuestionIndex;
    const currentQuestion = questionPool[poolIdx];
    if (!currentQuestion) return;

    const answerTimeSeconds = (Date.now() - questionStartTimeRef.current) / 1000;
    const responseMs = Math.max(1, Math.round(answerTimeSeconds * 1000));
    const isCorrect = answer === currentQuestion.correctAnswer;
    const bonus = isCorrect ? getTimeBonus(answerTimeSeconds) : 0;
    const earnedPoints = isCorrect ? BASE_POINTS_PER_CORRECT + bonus : 0;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    setCurrentAnswerBonus(bonus);

    if (user && gameMode === 'regular') {
      void insertGameAnswer({
        userId: user.id,
        difficulty,
        question: currentQuestion,
        answer,
        isCorrect,
      });
    }

    if (gameMode === 'daily') {
      pendingDailyAnswersRef.current.push({
        questionIndex: currentQuestionIndex,
        sourceId: String(currentQuestion.wordData.id),
        hitza: currentQuestion.wordData.hitza,
        chosen: answer,
        correct: currentQuestion.correctAnswer,
        isCorrect,
        responseMs,
        points: earnedPoints,
      });
    }

    if (isCorrect) {
      setPlayers(prev => prev.map((p, idx) => idx === currentPlayerIndex ? {
        ...p,
        score: p.score + earnedPoints,
        correctAnswers: p.correctAnswers + 1,
      } : p));
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < QUESTIONS_PER_PLAYER - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      questionStartTimeRef.current = Date.now();
      setCurrentAnswerBonus(0);
      setIsAnswered(false);
      setSelectedAnswer(null);
    } else {
      finishPlayerTurn();
    }
  };

  const saveToSupabase = async (player: Player) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (gameMode === 'daily') {
        const today = toDateOnly(new Date());
        const result = await saveDailyChallengeRun({
          userId: user.id,
          playerName: player.name,
          challengeDate: today,
          score: player.score,
          correct: player.correctAnswers,
          wrong: DAILY_QUESTIONS - player.correctAnswers,
          total: DAILY_QUESTIONS,
          timeSeconds: player.time,
          answers: pendingDailyAnswersRef.current,
        });
        if (!result.ok && result.reason === 'already_played') {
          alert('Gaurko lehiaketa jada erregistratuta dago.');
        }
        await refreshCompetitionData();
      } else {
        await insertGameRun({
          userId: user.id,
          difficulty,
          total: QUESTIONS_PER_PLAYER,
          correct: player.correctAnswers,
          wrong: QUESTIONS_PER_PLAYER - player.correctAnswers,
          timeSeconds: player.time,
        });
        await Promise.all([fetchHistory(), refreshFailedStats()]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const finishPlayerTurn = async () => {
    const endTime = Date.now();
    const realSeconds = (endTime - turnStartTimeRef.current) / 1000;
    const updatedPlayers = players.map((p, idx) => idx === currentPlayerIndex ? { ...p, time: realSeconds } : p);
    setPlayers(updatedPlayers);

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      setStatus(GameStatus.INTERMISSION);
    } else {
      if (user && players.length === 1) await saveToSupabase(updatedPlayers[0]);
      setStatus(GameStatus.SUMMARY);
    }
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

  const historyByDateAndLevel = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const statsForDate = (dateStr: string) => {
      const items = history.filter(h => h.played_at.startsWith(dateStr));
      return [1, 2, 3, 4].map(lvl => {
        const lvlItems = items.filter(h => h.difficulty === lvl);
        const totalWords = lvlItems.reduce((acc, h) => acc + h.total, 0);
        const totalCorrect = lvlItems.reduce((acc, h) => acc + h.correct, 0);
        return {
          level: lvl,
          words: totalWords,
          correct: totalCorrect,
          wrong: totalWords - totalCorrect,
          percentage: totalWords > 0 ? (totalCorrect / totalWords) * 100 : 0,
          sessions: lvlItems.length
        };
      }).filter(s => s.sessions > 0);
    };
    return {
      todayItems: history.filter(h => h.played_at.startsWith(todayStr)),
      searchedStats: statsForDate(searchDate),
    };
  }, [history, searchDate]);

  const filteredFailedStats = useMemo(() => {
    return failedWordsStats
      .filter(s => s.level === failedWordsLevel)
      .sort((a, b) => b.wrong_rate - a.wrong_rate)
      .slice(0, 10);
  }, [failedWordsStats, failedWordsLevel]);

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
    const levelColors = { 
        1: 'bg-sky-50 text-sky-600 border-sky-100', 
        2: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
        3: 'bg-amber-50 text-amber-600 border-amber-100', 
        4: 'bg-rose-50 text-rose-600 border-rose-100' 
    };
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-950 safe-pt safe-px overflow-hidden">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-full max-h-[92dvh] mb-4">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <button onClick={() => setStatus(GameStatus.SETUP)} className="text-xs font-black text-slate-400 uppercase">← Hasiera</button>
            <h2 className="text-xl font-black text-indigo-950 uppercase">Arbela</h2>
            <button onClick={handleLogout} className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Irten</button>
          </div>
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 shrink-0">
            <button onClick={() => setActiveTab('bilatu')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${activeTab === 'bilatu' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Bilatu</button>
            <button onClick={() => setActiveTab('historia')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${activeTab === 'historia' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Historia</button>
            <button onClick={() => setActiveTab('lehiaketa')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${activeTab === 'lehiaketa' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Lehiaketa</button>
          </div>

          <div className="grow overflow-hidden flex flex-col">
            {activeTab === 'bilatu' ? (
              <>
                <div className="relative mb-6 shrink-0">
                  <input 
                    type="text" 
                    placeholder="Bilatu hitzak edo sinonimoak..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-4 font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={2} /></svg>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                </div>
                <div className="grow overflow-y-auto custom-scrollbar pr-1 space-y-3">
                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <div className="font-black text-indigo-400 uppercase tracking-widest text-xs">Bilatzen...</div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            {searchTerm.length < 2 ? "Idatzi gutxienez 2 letra bilatzeko" : "Ez da emaitzarik aurkitu"}
                        </p>
                    </div>
                  ) : searchResults.map((word, idx) => (
                    <div key={`${word.id}-${idx}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 transition-all hover:shadow-md group">
                      <div className="flex items-center justify-between">
                        <a 
                          href={`https://hiztegiak.elhuyar.eus/eu/${word.hitza}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-lg font-black text-indigo-950 uppercase flex items-center gap-1 group-hover:text-indigo-600 transition-colors"
                        >
                          {word.hitza} 
                          <svg className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth={2}/></svg>
                        </a>
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black ${levelColors[word.level as DifficultyLevel] || 'bg-slate-50'}`}>L{word.level}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {word.sinonimoak.map((s, i) => (
                          <a 
                            key={i} 
                            href={`https://hiztegiak.elhuyar.eus/eu/${s}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white px-3 py-1 rounded-xl border text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1"
                          >
                            {s}
                            <svg className="h-2 w-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth={2}/></svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : activeTab === 'historia' ? (
              <>
                <div className="flex justify-center gap-4 mb-4 shrink-0">
                  {['gaur', 'datuak', 'hutsak'].map(t => (
                    <button key={t} onClick={() => setHistorySubTab(t as any)} className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${historySubTab === t ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent'}`}>{t}</button>
                  ))}
                </div>
                <div className="grow overflow-y-auto custom-scrollbar pr-1">
                  {historySubTab === 'gaur' && (
                    <div className="space-y-3">
                      {historyByDateAndLevel.todayItems.length === 0 ? <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">Gaurko partidarik gabe</p> : historyByDateAndLevel.todayItems.map(item => (
                        <div key={item.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-slate-400">{new Date(item.played_at).toLocaleTimeString('eu-ES', { hour: '2-digit', minute: '2-digit' })} - L{item.difficulty}</span>
                            <span className="text-indigo-600">{((item.correct / item.total) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-xs font-black">
                            <span className="text-emerald-600">✓ {item.correct}</span><span className="text-rose-500">✕ {item.wrong}</span><span className="text-slate-400">{item.time_seconds.toFixed(0)}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {historySubTab === 'datuak' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eguna</span>
                        <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="text-[11px] font-black bg-slate-100 rounded-lg p-2 text-indigo-600 outline-none" />
                      </div>
                      {historyByDateAndLevel.searchedStats.length === 0 ? <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">Emaitzarik gabe</p> : historyByDateAndLevel.searchedStats.map(stat => (
                        <div key={stat.level} className={`border rounded-3xl p-5 ${levelColors[stat.level as DifficultyLevel]}`}>
                          <div className="flex justify-between items-center mb-3"><span className="text-lg font-black uppercase">L{stat.level} Maila</span><span className="text-2xl font-black">{stat.percentage.toFixed(0)}%</span></div>
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase"><div className="bg-white/40 p-2 rounded-xl">Guztira: {stat.words}</div><div className="bg-white/40 p-2 rounded-xl">✓ {stat.correct}</div><div className="bg-white/40 p-2 rounded-xl">✕ {stat.wrong}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {historySubTab === 'hutsak' && (
                    <div className="space-y-4">
                      <div className="flex justify-center gap-2 mb-2 shrink-0">
                        {[1, 2, 3, 4].map(l => (
                          <button key={l} onClick={() => setFailedWordsLevel(l as DifficultyLevel)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${failedWordsLevel === l ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>L{l}</button>
                        ))}
                      </div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Top 10 Hitz Ahulak (L{failedWordsLevel})</h3>
                      {filteredFailedStats.length === 0 ? <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic px-4">Oraindik ez dago hitz ahulik maila honetan oraindik (intentuak &gt; 1 behar dira)</p> : filteredFailedStats.map((stat, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-2">
                          <div className="flex justify-between items-center"><span className="text-sm font-black text-indigo-950 uppercase">{i + 1}. {stat.hitza}</span><span className="text-xs font-black text-rose-500">{stat.wrong_rate.toFixed(0)}% Huts</span></div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"><div className="bg-rose-500 h-full transition-all duration-700" style={{ width: `${stat.wrong_rate}%` }} /></div>
                          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase"><span>Intentuak: {stat.attempts}</span><span>Hutsak: {stat.wrong}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="grow overflow-y-auto custom-scrollbar pr-1 space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gaurko Lehiaketa</p>
                      <p className="text-sm font-black text-indigo-950 uppercase">10 Sinonimo (maila guztiak)</p>
                    </div>
                    <button
                      onClick={() => void startDailyCompetition()}
                      disabled={isLoadingWords || hasPlayedToday}
                      className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${hasPlayedToday ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white'}`}
                    >
                      {hasPlayedToday ? 'GAUR JOKATUTA' : isLoadingWords ? 'KARGATZEN...' : 'JOLASTU'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setCompetitionPeriod('daily')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${competitionPeriod === 'daily' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>Gaur</button>
                    <button onClick={() => setCompetitionPeriod('weekly')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${competitionPeriod === 'weekly' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>Astea</button>
                    <button onClick={() => setCompetitionPeriod('monthly')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${competitionPeriod === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>Hilabetea</button>
                  </div>

                  {isLoadingCompetition ? (
                    <p className="text-[10px] font-black text-slate-400 uppercase">Kargatzen...</p>
                  ) : competitionPeriod === 'daily' ? (
                    dailyLeaderboard.length === 0 ? (
                      <p className="text-[10px] font-black text-slate-300 uppercase">Oraindik ez dago emaitzarik.</p>
                    ) : (
                      <div className="space-y-2">
                        {dailyLeaderboard.map((entry) => (
                          <div key={entry.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-indigo-950 uppercase">#{entry.rank} {entry.player_name}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase">{entry.correct}/{entry.total} - {entry.time_seconds.toFixed(1)}s</p>
                            </div>
                            <span className="text-lg font-black text-indigo-600">{entry.score}</span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      {(competitionPeriod === 'weekly' ? weeklyLeaderboard : monthlyLeaderboard).length === 0 ? (
                        <p className="text-[10px] font-black text-slate-300 uppercase">Oraindik ez dago emaitzarik.</p>
                      ) : (
                        (competitionPeriod === 'weekly' ? weeklyLeaderboard : monthlyLeaderboard).map((entry) => (
                          <div key={entry.user_id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-indigo-950 uppercase">#{entry.rank} {entry.player_name}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase">{entry.games_played} partida - {entry.total_correct}/{entry.total_questions}</p>
                            </div>
                            <span className="text-lg font-black text-indigo-600">{entry.total_score}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partidak eta Erantzunak</span>
                    <input type="date" value={competitionDate} onChange={e => setCompetitionDate(e.target.value)} className="text-[11px] font-black bg-white border border-slate-200 rounded-lg p-2 text-indigo-600 outline-none" />
                  </div>
                  {dailyRunsByDate.length === 0 ? (
                    <p className="text-[10px] font-black text-slate-300 uppercase">Egun honetarako ez dago partidarik.</p>
                  ) : (
                    <div className="space-y-2">
                      {dailyRunsByDate.map((run) => (
                        <details key={run.id} className="bg-white border border-slate-100 rounded-xl p-3">
                          <summary className="cursor-pointer list-none flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-950 uppercase">{run.player_name}</span>
                            <span className="text-[11px] font-black text-indigo-600">{run.score} pts</span>
                          </summary>
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase">{run.correct}/{run.total} - {run.time_seconds.toFixed(1)}s</p>
                            {run.answers.map((ans) => (
                              <div key={`${run.id}-${ans.question_index}`} className="text-[11px] font-bold text-slate-600 bg-slate-50 rounded-lg px-2 py-1">
                                #{ans.question_index + 1} {ans.hitza}: {ans.chosen} {ans.is_correct ? '✓' : `✗ (${ans.correct})`} [{ans.points} pts]
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 shrink-0 pt-4 border-t border-slate-100">
            {activeTab === 'lehiaketa' ? (
              <button
                onClick={() => void refreshCompetitionData()}
                disabled={isLoadingCompetition}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg uppercase text-xs active:scale-95"
              >
                {isLoadingCompetition ? 'KARGATZEN...' : 'Sailkapena Freskatu'}
              </button>
            ) : (
              <>
                <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase text-center">Maila Aldatu</label>
                  <div className="flex gap-2">{[1, 2, 3, 4].map(d => <button key={d} onClick={() => setDifficulty(d as DifficultyLevel)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${difficulty === d ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>L{d}</button>)}</div>
                </div>
                <button onClick={() => startNewGame(true)} disabled={isLoadingWords} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-lg mt-4 active:scale-95 text-xl uppercase tracking-widest">{isLoadingWords ? "KARGATZEN..." : "BAKARKA JOLASTU"}</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.SETUP) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-950 safe-pt safe-px overflow-hidden">
        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-full max-h-[92dvh] mb-4 border-2 border-white/20 overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
             <div className="w-10"></div>
             <div className="text-center"><h1 className="text-3xl font-black text-indigo-950 tracking-tighter uppercase leading-none">Sinonimoak</h1><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Konfigurazioa</p></div>
             <button onClick={() => setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.AUTH)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-inner"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg></button>
          </div>
          <div className="space-y-4 mb-4 shrink-0">
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><label className="flex justify-between text-xs font-black text-indigo-900 uppercase mb-2">Jokalariak: <span className="text-indigo-600 text-xl">{numPlayers}</span></label><input type="range" min="1" max="10" value={numPlayers} onChange={(e) => setNumPlayers(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" /></div>
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><label className="block text-xs font-black text-indigo-900 uppercase mb-2">Maila</label><div className="grid grid-cols-4 gap-2 h-12">{[1, 2, 3, 4].map(d => <button key={d} onClick={() => setDifficulty(d as DifficultyLevel)} className={`rounded-xl font-black ${difficulty === d ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>{d}</button>)}</div></div>
          </div>
          <div className="grow overflow-y-auto custom-scrollbar p-2 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner mb-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
               {players.map(p => (
                 <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col shadow-sm">
                   <label className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Jokalaria {p.id + 1}</label>
                   <input type="text" value={p.name} onChange={e => handlePlayerNameChange(p.id, e.target.value)} className="p-0 bg-transparent border-none focus:ring-0 font-bold text-slate-800 text-base" />
                 </div>
               ))}
             </div>
          </div>
          <button onClick={() => startNewGame()} disabled={isLoadingWords} className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-lg active:scale-95 transition-all text-xl uppercase tracking-widest shrink-0">{isLoadingWords ? "KARGATZEN..." : "HASI JOKOA"}</button>
        </div>
      </div>
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
    const isSoloLoggedIn = user && players.length === 1;
    const player = players[0];
    const score = player?.score || 0;
    const totalQuestions = gameMode === 'daily' ? DAILY_QUESTIONS : QUESTIONS_PER_PLAYER;
    const percentage = ((player?.correctAnswers || 0) / totalQuestions) * 100;
    const sortedPlayers = [...players].filter(p => p.time > 0).sort((a,b) => b.score === a.score ? a.time - b.time : b.score - a.score);
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center bg-indigo-950 safe-pt safe-px overflow-hidden">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col h-full max-h-[92dvh] border-t-[12px] border-indigo-600 mt-2 mb-6 overflow-hidden">
          <h2 className="text-3xl font-black text-slate-900 uppercase text-center mb-6">{isSoloLoggedIn ? (gameMode === 'daily' ? "Eguneko Lehiaketa" : "Zure Emaitzak") : "Sailkapena"}</h2>
          <div className="grow overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50/50 mb-6 flex flex-col">
            {isSoloLoggedIn ? (
              <div className="h-full flex flex-col items-center justify-center p-4 space-y-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                   <svg className="w-full h-full -rotate-90"><circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-200" /><circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={351.8} strokeDashoffset={351.8 - (351.8 * percentage) / 100} strokeLinecap="round" className="text-indigo-600 transition-all duration-1000" /></svg>
                   <div className="absolute text-center"><span className="text-3xl font-black text-indigo-950">{percentage.toFixed(0)}%</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-center">
                  <div className="bg-white p-4 rounded-3xl border border-emerald-100"><p className="text-[9px] font-black uppercase text-emerald-400">Puntuak</p><p className="text-2xl font-black text-emerald-600">{score}</p></div>
                  <div className="bg-white p-4 rounded-3xl border border-rose-100"><p className="text-[9px] font-black uppercase text-rose-400">Asmatuak</p><p className="text-2xl font-black text-rose-600">{player.correctAnswers}</p></div>
                  <div className="bg-white p-4 rounded-3xl border border-indigo-100 col-span-2"><p className="text-[9px] font-black uppercase text-indigo-400">Denbora Totala</p><p className="text-2xl font-black text-indigo-950">{player.time.toFixed(1)}s</p></div>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto custom-scrollbar grow p-2">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100"><tr><th className="p-3 text-[9px] font-black uppercase">#</th><th className="p-3 text-[9px] font-black uppercase">Nor</th><th className="p-3 text-center text-[9px] font-black uppercase">Pts</th><th className="p-3 text-right text-[9px] font-black uppercase">S.</th></tr></thead>
                  <tbody>{sortedPlayers.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-100 bg-white"><td className="p-3 font-black text-xl">{idx+1}</td><td className="p-3 font-black text-xs uppercase">{p.name}</td><td className="p-3 text-center"><span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-black">{p.score}</span></td><td className="p-3 text-right font-mono text-[10px] text-slate-400">{p.time.toFixed(1)}s</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => {
                if (gameMode === 'daily') {
                  setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.SETUP);
                  return;
                }
                setPlayers(players.map(p => ({...p, score:0, time:0, correctAnswers:0})));
                startNewGame(players.length === 1);
              }} className={`font-black py-4 rounded-2xl shadow-lg uppercase text-xs active:scale-95 ${gameMode === 'daily' ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white'}`}>{gameMode === 'daily' ? "Bihar berriro" : "Berriro"}</button>
              <button onClick={() => setStatus(GameStatus.REVIEW)} className="bg-white text-indigo-600 font-black py-4 rounded-2xl shadow-md uppercase text-xs border border-indigo-100 active:scale-95">Hitzak</button>
            </div>
            <button onClick={() => setStatus(user ? GameStatus.CONTRIBUTE : GameStatus.SETUP)} className="w-full bg-slate-100 text-slate-500 font-black py-3 rounded-xl uppercase text-[10px] active:scale-95">Hasiera</button>
          </div>
        </div>
      </div>
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

