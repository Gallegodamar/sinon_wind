
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WordData, Player, Question, GameStatus, DifficultyLevel } from './types';
import { supabase } from './supabase';
import {
  AuthUser,
  DailyLeaderboardEntry,
  DailyRunWithAnswers,
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
import { ContributeScreen, ContributeTab } from './components/screens/ContributeScreen';
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
  
  const [activeTab, setActiveTab] = useState<ContributeTab>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const { searchResults, isSearching } = useDebouncedWordSearch(searchTerm);
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
  const [isSaving, setIsSaving] = useState(false);

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
    if (user && (activeTab === 'home' || activeTab === 'eguneko')) {
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
        isLoadingWords={isLoadingWords}
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



